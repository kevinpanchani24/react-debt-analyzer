const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');

const requireDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, error: 'Database not connected yet.' });
    return false;
  }
  return true;
};

const validateId = (id, res) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, error: 'Invalid analysis ID.' });
    return false;
  }
  return true;
};

/** GET /api/reports/:id/summary */
const getSummary = async (req, res, next) => {
  try {
    if (!requireDb(res) || !validateId(req.params.id, res)) return;
    const a = await Analysis.findById(req.params.id,
      'repoUrl repoName status rcdiScore maintainabilityScore grade gradeLabel ' +
      'categoryScores dimensionScores totalFiles totalLoc totalComponents ' +
      'totalFunctions issueCount rpsRanking completedAt createdAt error'
    ).lean();
    if (!a) return res.status(404).json({ success: false, error: 'Analysis not found.' });
    res.json({ success: true, data: a });
  } catch (err) { next(err); }
};

/** GET /api/reports/:id/issues */
const getIssues = async (req, res, next) => {
  try {
    if (!requireDb(res) || !validateId(req.params.id, res)) return;
    const { severity, category, file } = req.query;
    const a = await Analysis.findById(req.params.id, 'allIssues status').lean();
    if (!a) return res.status(404).json({ success: false, error: 'Analysis not found.' });

    let issues = a.allIssues || [];
    if (severity) issues = issues.filter(i => i.severity === severity);
    if (category) issues = issues.filter(i => i.category === category);
    if (file) issues = issues.filter(i => i.file?.includes(file));

    const ord = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => (ord[a.severity] ?? 4) - (ord[b.severity] ?? 4));
    res.json({ success: true, data: issues, total: issues.length });
  } catch (err) { next(err); }
};

/** GET /api/reports/:id/files */
const getFileBreakdown = async (req, res, next) => {
  try {
    if (!requireDb(res) || !validateId(req.params.id, res)) return;
    const a = await Analysis.findById(req.params.id, 'fileResults status').lean();
    if (!a) return res.status(404).json({ success: false, error: 'Analysis not found.' });

    const files = (a.fileResults || [])
      .map(f => ({
        filePath: f.filePath,
        loc: f.loc,
        componentCount: f.componentCount,
        functionCount: f.functionCount,
        issueCount: (f.issues || []).length,
        rcdiScore: f.rcdiScore ?? 100,
        maintainabilityScore: f.rcdiScore ?? 100,
      }))
      .sort((a, b) => a.rcdiScore - b.rcdiScore);

    res.json({ success: true, data: files });
  } catch (err) { next(err); }
};

/** GET /api/reports/:id/rcdi — full RCDI breakdown with per-component data */
const getRcdiBreakdown = async (req, res, next) => {
  try {
    if (!requireDb(res) || !validateId(req.params.id, res)) return;
    const a = await Analysis.findById(req.params.id,
      'rcdiScore grade gradeLabel dimensionScores categoryScores fileResults rpsRanking'
    ).lean();
    if (!a) return res.status(404).json({ success: false, error: 'Analysis not found.' });

    const allComponents = (a.fileResults || []).flatMap(f =>
      (f.components || []).map(c => ({
        name: c.name,
        filePath: f.filePath,
        loc: c.loc,
        rcdi: c.rcdi,
        fanIn: c.fanIn,
        hookCount: c.hookCount,
        isMemoised: c.isMemoised,
        rpsScore: c.rpsScore,
        dimensions: c.dimensions,
      }))
    ).sort((a, b) => (a.rcdi ?? 100) - (b.rcdi ?? 100));

    res.json({
      success: true,
      data: {
        projectRcdi: a.rcdiScore,
        grade: a.grade,
        gradeLabel: a.gradeLabel,
        dimensionScores: a.dimensionScores,
        categoryScores: a.categoryScores,
        rpsRanking: a.rpsRanking || [],
        components: allComponents,
      },
    });
  } catch (err) { next(err); }
};

/** GET /api/reports/:id/rps — rerender propagation score ranking */
const getRpsRanking = async (req, res, next) => {
  try {
    if (!requireDb(res) || !validateId(req.params.id, res)) return;
    const a = await Analysis.findById(req.params.id, 'rpsRanking').lean();
    if (!a) return res.status(404).json({ success: false, error: 'Analysis not found.' });
    res.json({ success: true, data: a.rpsRanking || [] });
  } catch (err) { next(err); }
};

/** GET /api/reports/:id/comparison */
const getComparison = async (req, res, next) => {
  try {
    if (!requireDb(res) || !validateId(req.params.id, res)) return;
    const a = await Analysis.findById(req.params.id,
      'allIssues issueCount eslintResults rcdiScore dimensionScores categoryScores'
    ).lean();
    if (!a) return res.status(404).json({ success: false, error: 'Analysis not found.' });

    const byCategory = {};
    (a.allIssues || []).forEach(i => {
      byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        custom: {
          totalIssues: (a.allIssues || []).length,
          issuesBySeverity: a.issueCount || {},
          issuesByCategory: byCategory,
          rcdiScore: a.rcdiScore,
          dimensionScores: a.dimensionScores,
          categoryScores: a.categoryScores,
        },
        eslint: a.eslintResults
          ? { totalIssues: Object.values(a.eslintResults).reduce((s, v) => s + (v || 0), 0), breakdown: a.eslintResults }
          : null,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getSummary, getIssues, getFileBreakdown, getRcdiBreakdown, getRpsRanking, getComparison };

/** GET /api/reports/:id/history — commit history timeline */
const getCommitHistory = async (req, res, next) => {
  try {
    if (!requireDb(res) || !validateId(req.params.id, res)) return;
    const a = await Analysis.findById(req.params.id,
      'commitHistory commitHistoryStatus commitHistoryError repoUrl'
    ).lean();
    if (!a) return res.status(404).json({ success: false, error: 'Analysis not found.' });
    res.json({
      success: true,
      data: {
        status: a.commitHistoryStatus || 'none',
        error: a.commitHistoryError || null,
        repoUrl: a.repoUrl,
        entries: a.commitHistory || [],
      },
    });
  } catch (err) { next(err); }
};

/** POST /api/reports/:id/history/build — trigger commit history build */
const buildCommitHistoryEndpoint = async (req, res, next) => {
  try {
    if (!requireDb(res) || !validateId(req.params.id, res)) return;
    const a = await Analysis.findById(req.params.id, 'repoUrl commitHistoryStatus').lean();
    if (!a) return res.status(404).json({ success: false, error: 'Analysis not found.' });

    if (a.commitHistoryStatus === 'building') {
      return res.json({ success: true, message: 'Already building.' });
    }

    // Mark as building immediately
    await Analysis.findByIdAndUpdate(req.params.id, {
      commitHistoryStatus: 'building',
      commitHistoryError: null,
      commitHistory: [],
    });

    // Fire-and-forget background build
    const { buildCommitHistory } = require('../services/commitHistoryService');
    const Analysis2 = require('../models/Analysis');

    const { maxPoints = 20, fromDate = null, toDate = null } = req.body || {};
    buildCommitHistory(a.repoUrl, maxPoints, fromDate, toDate)
      .then(async (entries) => {
        await Analysis2.findByIdAndUpdate(req.params.id, {
          commitHistory: entries,
          commitHistoryStatus: 'completed',
        });
        console.log(`[CommitHistory] Saved ${entries.length} entries for ${req.params.id}`);
      })
      .catch(async (err) => {
        console.error(`[CommitHistory] Failed for ${req.params.id}:`, err.message);
        await Analysis2.findByIdAndUpdate(req.params.id, {
          commitHistoryStatus: 'failed',
          commitHistoryError: err.message,
        });
      });

    res.json({ success: true, message: 'Commit history build started.' });
  } catch (err) { next(err); }
};

// Append to exports
const existing = module.exports;
module.exports = { ...existing, getCommitHistory, buildCommitHistoryEndpoint };
