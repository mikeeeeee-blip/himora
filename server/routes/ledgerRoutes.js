const express = require('express');
const router = express.Router();
const auth = require('../middleware/superAdminAuth');
const {
  overview,
  accounts,
  journal,
  journalById,
  createJournal,
} = require('../controllers/ledgerController');

router.get('/overview', auth, overview);
router.get('/accounts', auth, accounts);
router.get('/journal', auth, journal);
router.get('/journal/:id', auth, journalById);
router.post('/journal', auth, createJournal);

module.exports = router;
