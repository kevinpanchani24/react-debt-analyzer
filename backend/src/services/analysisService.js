const Analysis = require('../models/Analysis');
const { cloneRepository, removeRepository } = require('./gitService');
const { scanFiles, readFile, relativePath } = require('../utils/fileScanner');
const { analyzeFile } = require('../analyzers/fileAnalyzer');
const { buildImportGraph } = require('../analyzers/importGraphBuilder');
const {
  computeComponentRCDI, computeProjectRCDI, computeRPS, getGrade,
} = require('../analyzers/rcdiEngine');

/**
 * Full RCDI v2 analysis pipeline:
 * 1. Clone repository
 * 2. Scan JS/JSX files
 * 3. Parse + analyse each file (rules + component metrics)
 * 4. Build import graph → fan-in per file
 * 5. Re-score each component with real CI (fan-in) and RPS
 * 6. Compute project RCDI + dimension averages + RPS ranking
 * 7. Persist to MongoDB
 * 8. Clean up temp clone
 */
const runAnalysis = async (analysisId, repoUrl) => {
  let clonePath = null;

  try {
    // ── 1. Clone ──────────────────────────────────────────────────────────────
    await Analysis.findByIdAndUpdate(analysisId, { status: 'cloning' });
    console.log(`[Analysis ${analysisId}] Cloning ${repoUrl}...`);
    clonePath = await cloneRepository(repoUrl);

    // ── 2. Scan ───────────────────────────────────────────────────────────────
    await Analysis.findByIdAndUpdate(analysisId, { status: 'analyzing' });
    const filePaths = await scanFiles(clonePath);
    console.log(`[Analysis ${analysisId}] Found ${filePaths.length} JS/JSX files.`);

    if (filePaths.length === 0) {
      await Analysis.findByIdAndUpdate(analysisId, {
        status: 'failed',
        error: 'No JavaScript or JSX files found in repository.',
      });
      return;
    }

    // ── 3. Analyse each file ──────────────────────────────────────────────────
    const fileResults = [];
    let totalLoc = 0;

    for (const absPath of filePaths) {
      try {
        const relPath = relativePath(absPath, clonePath);
        const { content, loc } = await readFile(absPath);
        totalLoc += loc;
        fileResults.push(analyzeFile(content, relPath, loc));
      } catch (err) {
        console.warn(`[Analysis ${analysisId}] Skip ${absPath}:`, err.message);
      }
    }

    // ── 4. Build import graph ─────────────────────────────────────────────────
    console.log(`[Analysis ${analysisId}] Building import graph...`);
    const { fanIn } = await buildImportGraph(filePaths, clonePath);

    // ── 5. Update fanIn + recompute RCDI / RPS with real coupling data ────────
    for (const fr of fileResults) {
      const fi = fanIn[fr.filePath] || 0;
      for (const comp of fr.components || []) {
        comp.fanIn = fi;
        const { rcdi, dimensions } = computeComponentRCDI(comp);
        const { rpsScore, rpsRaw } = computeRPS(comp.hookCount, comp.fanIn, comp.isMemoised);
        comp.rcdi = rcdi;
        comp.dimensions = dimensions;
        comp.rpsScore = rpsScore;
        comp.rpsRaw = rpsRaw;
      }
      // Recompute file-level RCDI with updated component scores
      if ((fr.components || []).length > 0) {
        const totalW = fr.components.reduce((s, c) => s + Math.max(c.loc, 1), 0);
        const wSum = fr.components.reduce((s, c) => s + c.rcdi * Math.max(c.loc, 1), 0);
        fr.rcdiScore = Math.round(wSum / totalW);
        fr.maintainabilityScore = fr.rcdiScore;
      }
    }

    // ── 6. Project-level metrics ──────────────────────────────────────────────
    const allComponents = fileResults.flatMap(f => f.components || []);
    const projectRCDI = computeProjectRCDI(
      allComponents.map(c => ({ rcdi: c.rcdi, loc: c.loc }))
    );
    const grade = getGrade(projectRCDI);

    // Five dimension scores — LOC-weighted averages across all components
    const dimKeys = ['SC', 'StC', 'CI', 'PD', 'CC'];
    const totalCW = allComponents.reduce((s, c) => s + Math.max(c.loc, 1), 0);
    const dimensionScores = {};
    for (const d of dimKeys) {
      dimensionScores[d] = totalCW > 0
        ? Math.round(
          allComponents.reduce(
            (s, c) => s + (c.dimensions?.[d] ?? 100) * Math.max(c.loc, 1), 0
          ) / totalCW
        )
        : 100;
    }

    // Human-readable category names for radar chart (keeps old dashboard working too)
    const categoryScores = {
      'Structural Complexity': dimensionScores.SC,
      'State Complexity': dimensionScores.StC,
      'Coupling Index': dimensionScores.CI,
      'Prop Depth': dimensionScores.PD,
      'Component Cohesion': dimensionScores.CC,
    };

    // RPS top-10 highest rerender-risk components
    const rpsRanking = allComponents
      .filter(c => c.rpsRaw > 0)
      .sort((a, b) => b.rpsRaw - a.rpsRaw)
      .slice(0, 10)
      .map(c => ({
        name: c.name, filePath: c.filePath,
        hookCount: c.hookCount, fanIn: c.fanIn,
        isMemoised: c.isMemoised, rpsRaw: c.rpsRaw, rpsScore: c.rpsScore,
      }));

    // Issue counts
    const allIssues = fileResults.flatMap(f => f.issues || []);
    const issueCount = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const i of allIssues) {
      if (issueCount[i.severity] !== undefined) issueCount[i.severity]++;
    }

    // ── 7. Persist ────────────────────────────────────────────────────────────
    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'completed',
      totalFiles: fileResults.length,
      totalLoc,
      totalComponents: fileResults.reduce((s, f) => s + (f.componentCount || 0), 0),
      totalFunctions: fileResults.reduce((s, f) => s + (f.functionCount || 0), 0),
      issueCount,
      rcdiScore: projectRCDI,
      maintainabilityScore: projectRCDI,
      grade: grade.grade,
      gradeLabel: grade.label,
      dimensionScores,
      categoryScores,
      rpsRanking,
      fileResults: fileResults.map(f => ({
        filePath: f.filePath,
        loc: f.loc,
        componentCount: f.componentCount,
        functionCount: f.functionCount,
        issues: f.issues,
        rcdiScore: f.rcdiScore,
        maintainabilityScore: f.rcdiScore,
        components: f.components,
        parseError: f.parseError,
      })),
      allIssues,
      completedAt: new Date(),
    });

    console.log(
      `[Analysis ${analysisId}] Done. RCDI:${projectRCDI}(${grade.grade}), ` +
      `Issues:${allIssues.length}, Components:${allComponents.length}`
    );
  } catch (err) {
    console.error(`[Analysis ${analysisId}] Fatal:`, err.message);
    await Analysis.findByIdAndUpdate(analysisId, { status: 'failed', error: err.message });
  } finally {
    if (clonePath) await removeRepository(clonePath);
  }
};

module.exports = { runAnalysis };
