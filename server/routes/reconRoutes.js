const express = require('express');
const router = express.Router();
const reconController = require('../controllers/reconController');
const reconLogger = require('../utils/reconLogger');

reconLogger.info('Recon routes registered', { base: '/api/recon', routes: ['overview', 'runs', 'journal', 'exceptions', 'logs'] });

router.get('/overview', reconController.overview);
router.get('/runs', reconController.runs);
router.get('/runs/:runId', reconController.runById);
router.get('/journal', reconController.journal);
router.get('/journal/:id', reconController.journalById);
router.get('/exceptions', reconController.exceptions);
router.get('/exceptions/:id', reconController.exceptionById);
router.get('/logs', reconController.logs);

module.exports = router;
