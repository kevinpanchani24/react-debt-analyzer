const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

// POST /api/analysis - submit a new repository for analysis
router.post('/', analysisController.submitAnalysis);

// GET /api/analysis/:id - get analysis status and results
router.get('/:id', analysisController.getAnalysis);

// GET /api/analysis - list recent analyses
router.get('/', analysisController.listAnalyses);

// DELETE /api/analysis/:id - delete an analysis
router.delete('/:id', analysisController.deleteAnalysis);

module.exports = router;
