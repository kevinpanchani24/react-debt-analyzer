const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const analysisService = require('../services/analysisService');

/**
 * Returns 503 if MongoDB is not yet connected.
 * Prevents cryptic errors when the server starts before DB is ready.
 */
const requireDb = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      error: 'Database not connected yet. Please wait a moment and try again.',
    });
    return false;
  }
  return true;
};

/**
 * POST /api/analysis
 * Accepts a GitHub repo URL, creates an Analysis record, kicks off async analysis.
 */
const submitAnalysis = async (req, res, next) => {
  try {
    if (!requireDb(res)) return;

    const { repoUrl } = req.body;

    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'repoUrl is required.' });
    }

    const trimmed = repoUrl.trim();

    // Accept github.com URLs with or without .git suffix, with optional www
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+(\.git)?\/?$/;
    if (!githubPattern.test(trimmed)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GitHub repository URL. Expected format: https://github.com/owner/repo',
      });
    }

    // Normalise: strip trailing slash and .git
    const normalised = trimmed.replace(/\.git$/, '').replace(/\/$/, '');
    const repoName = normalised.split('/').pop();

    const analysis = await Analysis.create({
      repoUrl: normalised,
      repoName,
      status: 'pending',
    });

    // Fire-and-forget — analysis runs in background
    analysisService.runAnalysis(analysis._id.toString(), normalised).catch((err) => {
      console.error(`[Analysis ${analysis._id}] Unhandled failure:`, err.message);
    });

    res.status(202).json({
      success: true,
      message: 'Analysis started.',
      analysisId: analysis._id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analysis/:id
 */
const getAnalysis = async (req, res, next) => {
  try {
    if (!requireDb(res)) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid analysis ID.' });
    }

    const analysis = await Analysis.findById(req.params.id).lean();
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found.' });
    }
    res.json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analysis
 */
const listAnalyses = async (req, res, next) => {
  try {
    if (!requireDb(res)) return;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [analyses, total] = await Promise.all([
      Analysis.find(
        {},
        'repoUrl repoName status maintainabilityScore totalFiles totalLoc issueCount createdAt completedAt'
      )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Analysis.countDocuments(),
    ]);

    res.json({ success: true, data: analyses, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/analysis/:id
 */
const deleteAnalysis = async (req, res, next) => {
  try {
    if (!requireDb(res)) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid analysis ID.' });
    }

    const analysis = await Analysis.findByIdAndDelete(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found.' });
    }
    res.json({ success: true, message: 'Analysis deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitAnalysis, getAnalysis, listAnalyses, deleteAnalysis };
