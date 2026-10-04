const path = require('path');
const fs = require('fs-extra');
const simpleGit = require('simple-git');
const { v4: uuidv4 } = require('uuid');
const { BASE_DIR } = require('./gitService');
const { scanFiles, readFile, relativePath } = require('../utils/fileScanner');
const { analyzeFile } = require('../analyzers/fileAnalyzer');
const { buildImportGraph } = require('../analyzers/importGraphBuilder');
const {
  computeComponentRCDI, computeRPS,
  computeProjectRCDI, getGrade,
} = require('../analyzers/rcdiEngine');

/**
 * Commit History Service — NO TIME LIMIT
 * Works on repos of ANY age (1 year, 5 years, 10 years).
 *
 * Uses raw `git log` via exec instead of simple-git's .log() wrapper,
 * because simple-git's .log() does not reliably pass --first-parent
 * and custom --format strings, causing it to silently return 0 results.
 */
const buildCommitHistory = async (
  repoUrl,
  maxPoints = 20,
  fromDate = null,
  toDate = null
) => {
  const workDir = path.join(BASE_DIR, `history-${uuidv4()}`);

  try {
    await fs.ensureDir(BASE_DIR);
    console.log(`[CommitHistory] Cloning ${repoUrl}...`);

    // Full clone — needed to access all historical commits
    const git = simpleGit({ timeout: { block: 300000 } });
    await git.clone(repoUrl, workDir, ['--no-single-branch']);

    const repoGit = simpleGit(workDir);

    // ── Get raw commit log via exec (reliable for custom formats) ──────────
    // Build the git log command arguments
    const gitLogArgs = [
      'log',
      '--first-parent',          // main branch only, skip merge noise
      '--format=%H|||%aI|||%s',  // hash, ISO date, subject — pipe-delimited
    ];

    // Optional date range
    if (fromDate) gitLogArgs.push(`--after=${fromDate}`);
    if (toDate) gitLogArgs.push(`--before=${toDate}`);

    let rawLog = '';
    try {
      rawLog = await repoGit.raw(gitLogArgs);
    } catch (err) {
      console.warn('[CommitHistory] git log failed, trying without --first-parent:', err.message);
      // Fallback: remove --first-parent (some repos fail with it)
      const fallbackArgs = gitLogArgs.filter(a => a !== '--first-parent');
      rawLog = await repoGit.raw(fallbackArgs);
    }

    // Parse the raw output
    const allCommits = rawLog
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes('|||'))
      .map(line => {
        const parts = line.split('|||');
        return {
          hash: (parts[0] || '').trim(),
          date: (parts[1] || '').trim(),
          message: (parts[2] || '').trim().slice(0, 80),
        };
      })
      .filter(c => c.hash.length === 40); // valid SHA1 hashes only

    console.log(`[CommitHistory] Total commits found: ${allCommits.length}`);

    if (allCommits.length === 0) {
      console.warn('[CommitHistory] No commits returned. Repo may be empty or date range too narrow.');
      return [];
    }

    // allCommits is newest-first from git log — reverse for chronological order
    const chronological = [...allCommits].reverse();

    // ── Smart sampling across the FULL history ─────────────────────────────
    let sampled = [];

    if (chronological.length <= maxPoints) {
      // Small repo — use all commits
      sampled = chronological;
    } else {
      // Always include first (oldest) and last (newest)
      // Pick maxPoints-2 evenly spaced commits in between
      const inner = maxPoints - 2;
      const step = (chronological.length - 1) / (inner + 1);

      const picks = new Set([0, chronological.length - 1]);
      for (let i = 1; i <= inner; i++) {
        picks.add(Math.round(i * step));
      }

      sampled = [...picks].sort((a, b) => a - b).map(i => chronological[i]);
    }

    console.log(`[CommitHistory] Sampling ${sampled.length} commits...`);
    if (sampled.length > 0) {
      console.log(`[CommitHistory] Range: ${sampled[0].date?.slice(0, 10)} → ${sampled[sampled.length - 1].date?.slice(0, 10)}`);
    }

    // ── Analyse each sampled commit ────────────────────────────────────────
    const history = [];

    for (let idx = 0; idx < sampled.length; idx++) {
      const commit = sampled[idx];
      console.log(
        `[CommitHistory] [${idx + 1}/${sampled.length}] ` +
        `${commit.hash.slice(0, 8)} (${commit.date?.slice(0, 10)})...`
      );

      try {
        // Checkout this specific commit
        await repoGit.raw(['checkout', commit.hash, '--force']);

        const filePaths = await scanFiles(workDir);
        if (filePaths.length === 0) {
          console.log(`[CommitHistory]   → No JS/JSX files at this commit, skipping`);
          continue;
        }

        const fileResults = [];
        let totalLoc = 0;

        for (const fp of filePaths) {
          try {
            const rel = relativePath(fp, workDir);
            const { content, loc } = await readFile(fp);
            totalLoc += loc;
            fileResults.push(analyzeFile(content, rel, loc));
          } catch { /* skip unreadable files */ }
        }

        // Import graph for CI dimension
        const { fanIn } = await buildImportGraph(filePaths, workDir);

        // Recompute RCDI with real coupling data
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
        }

        const allComponents = fileResults.flatMap(f => f.components || []);
        const projectRCDI = computeProjectRCDI(
          allComponents.map(c => ({ rcdi: c.rcdi, loc: c.loc }))
        );

        // Five dimension averages (LOC-weighted)
        const dimKeys = ['SC', 'StC', 'CI', 'PD', 'CC'];
        const totalW = allComponents.reduce((s, c) => s + Math.max(c.loc, 1), 0);
        const dimensionScores = {};
        for (const d of dimKeys) {
          dimensionScores[d] = totalW > 0
            ? Math.round(
              allComponents.reduce(
                (s, c) => s + (c.dimensions?.[d] ?? 100) * Math.max(c.loc, 1), 0
              ) / totalW
            )
            : 100;
        }

        const allIssues = fileResults.flatMap(f => f.issues || []);
        const grade = getGrade(projectRCDI);

        history.push({
          commitHash: commit.hash.slice(0, 8),
          fullHash: commit.hash,
          date: commit.date,
          message: commit.message,
          rcdiScore: projectRCDI,
          grade: grade.grade,
          totalFiles: fileResults.length,
          totalLoc,
          totalComponents: allComponents.length,
          totalIssues: allIssues.length,
          dimensionScores,
        });

        console.log(`[CommitHistory]   → RCDI:${projectRCDI} (${grade.grade}) Files:${fileResults.length}`);

      } catch (commitErr) {
        console.warn(`[CommitHistory]   → Skipped ${commit.hash.slice(0, 8)}: ${commitErr.message}`);
      }
    }

    console.log(`[CommitHistory] Complete — ${history.length} data points collected.`);
    return history;

  } finally {
    try { await fs.remove(workDir); } catch { /* ignore */ }
  }
};

module.exports = { buildCommitHistory };
