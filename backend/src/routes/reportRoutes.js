const express = require('express');
const router = express.Router();
const rc = require('../controllers/reportController');

router.get('/:id/summary', rc.getSummary);
router.get('/:id/issues', rc.getIssues);
router.get('/:id/files', rc.getFileBreakdown);
router.get('/:id/rcdi', rc.getRcdiBreakdown);
router.get('/:id/rps', rc.getRpsRanking);
router.get('/:id/comparison', rc.getComparison);
router.get('/:id/history', rc.getCommitHistory);         // NEW
router.post('/:id/history/build', rc.buildCommitHistoryEndpoint); // NEW

module.exports = router;
