const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const Posting = require('../models/Posting');
const User = require('../models/User');
const { runLedgerSeed } = require('../data/ledgerSeed');

const EPSILON = 1e-6;

function ledgerLog(message, meta = {}) {
  const ts = new Date().toISOString();
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  console.log(`📒 [LEDGER] ${ts} ${message}${extra}`);
}

function assertBalanced(postings) {
  let sumDr = 0;
  let sumCr = 0;
  for (const p of postings) {
    const amt = Number(p.amount);
    if (p.side === 'dr') sumDr += amt;
    else sumCr += amt;
  }
  if (Math.abs(sumDr - sumCr) > EPSILON) {
    throw new Error(`Journal not balanced: Dr=${sumDr.toFixed(2)} vs Cr=${sumCr.toFixed(2)}`);
  }
}

/** GET /api/ledger/overview – summary for dashboard */
async function overview(req, res) {
  ledgerLog('GET /api/ledger/overview', { path: req.path });
  try {
    await runLedgerSeed();
    const [accountCount, journalCount, postingCount] = await Promise.all([
      Account.countDocuments(),
      JournalEntry.countDocuments(),
      Posting.countDocuments(),
    ]);
    const balanced = await checkAllJournalsBalanced();
    ledgerLog('Ledger overview served', { accountCount, journalCount, postingCount, allBalanced: balanced });
    res.json({
      success: true,
      data: {
        accountCount,
        journalCount,
        postingCount,
        allBalanced: balanced,
        invariants: {
          doubleEntry: true,
          tenantScoped: true,
          immutability: 'posted journals are immutable',
        },
      },
    });
  } catch (e) {
    ledgerLog('Ledger overview failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

async function checkAllJournalsBalanced() {
  const journals = await JournalEntry.find({ isPosted: true })
    .select('_id')
    .lean();
  for (const j of journals) {
    const postings = await Posting.find({ journalEntryId: j._id }).lean();
    let sumDr = 0, sumCr = 0;
    for (const p of postings) {
      if (p.side === 'dr') sumDr += p.amount;
      else sumCr += p.amount;
    }
    if (Math.abs(sumDr - sumCr) > EPSILON) return false;
  }
  return true;
}

/** GET /api/ledger/accounts – tenant-scoped accounts */
async function accounts(req, res) {
  ledgerLog('GET /api/ledger/accounts', { path: req.path, tenantId: req.query.tenantId });
  try {
    await runLedgerSeed();
    const { tenantId } = req.query;
    const filter = {};
    if (tenantId) filter.tenantId = tenantId;
    const list = await Account.find(filter)
      .sort({ tenantId: 1, code: 1 })
      .populate('tenantId', 'name email businessName')
      .lean();
    ledgerLog('Ledger accounts served', { count: list.length });
    res.json({ success: true, data: { accounts: list } });
  } catch (e) {
    ledgerLog('Ledger accounts failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

/** GET /api/ledger/journal – tenant-scoped journal entries */
async function journal(req, res) {
  ledgerLog('GET /api/ledger/journal', { path: req.path, tenantId: req.query.tenantId });
  try {
    await runLedgerSeed();
    const { tenantId, limit = 50 } = req.query;
    const filter = {};
    if (tenantId) filter.tenantId = tenantId;
    const list = await JournalEntry.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 50)
      .populate('tenantId', 'name businessName')
      .lean();
    ledgerLog('Ledger journal list served', { count: list.length });
    res.json({ success: true, data: { entries: list } });
  } catch (e) {
    ledgerLog('Ledger journal list failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

/** GET /api/ledger/journal/:id – single journal with postings */
async function journalById(req, res) {
  const { id } = req.params;
  ledgerLog('GET /api/ledger/journal/:id', { id });
  try {
    const entry = await JournalEntry.findById(id)
      .populate('tenantId', 'name businessName')
      .lean();
    if (!entry) {
      ledgerLog('Journal entry not found', { id });
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    const postings = await Posting.find({ journalEntryId: id })
      .populate('accountId', 'code name type')
      .sort({ _id: 1 })
      .lean();
    let sumDr = 0, sumCr = 0;
    for (const p of postings) {
      if (p.side === 'dr') sumDr += p.amount;
      else sumCr += p.amount;
    }
    const balanced = Math.abs(sumDr - sumCr) <= EPSILON;
    ledgerLog('Ledger journal detail served', { id: entry.externalId, type: entry.type, balanced });
    res.json({
      success: true,
      data: {
        ...entry,
        postings,
        totalDr: sumDr,
        totalCr: sumCr,
        balanced,
      },
    });
  } catch (e) {
    ledgerLog('Ledger journal by id failed', { id, error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

/** POST /api/ledger/journal – create journal + postings. Enforce Dr = Cr. */
async function createJournal(req, res) {
  ledgerLog('POST /api/ledger/journal', { type: req.body?.type, tenantId: req.body?.tenantId });
  try {
    const { tenantId, type, orderId, txnId, reference, memo, postings: raw } = req.body;
    if (!tenantId || !type || !Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'tenantId, type, and postings[] are required',
      });
    }
    const tenant = await User.findById(tenantId).select('_id');
    if (!tenant) {
      return res.status(400).json({ success: false, error: 'Tenant not found' });
    }

    const postings = raw.map((p) => ({
      accountId: p.accountId,
      side: p.side === 'dr' || p.side === 'cr' ? p.side : null,
      amount: parseFloat(String(p.amount).replace(/,/g, ''), 10),
      ref: p.ref || '',
    }));
    if (postings.some((p) => !p.side || Number.isNaN(p.amount) || p.amount < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Each posting must have side (dr|cr), non‑negative amount, and valid accountId',
      });
    }

    assertBalanced(postings);

    const accountIds = [...new Set(postings.map((p) => p.accountId))];
    const accounts = await Account.find({
      _id: { $in: accountIds },
      tenantId,
    }).lean();
    if (accounts.length !== accountIds.length) {
      return res.status(400).json({
        success: false,
        error: 'All accounts must exist and belong to the same tenant',
      });
    }

    const externalId = `JE_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const session = await require('mongoose').startSession();
    session.startTransaction();
    try {
      const entry = new JournalEntry({
        tenantId,
        externalId,
        type,
        orderId: orderId || undefined,
        txnId: txnId || undefined,
        reference: reference || undefined,
        memo: memo || undefined,
        isPosted: true,
        postedAt: new Date(),
      });
      await entry.save({ session });

      for (const p of postings) {
        const po = new Posting({
          journalEntryId: entry._id,
          accountId: p.accountId,
          side: p.side,
          amount: p.amount,
          ref: p.ref,
        });
        await po.save({ session });
      }
      await session.commitTransaction();

      const created = await JournalEntry.findById(entry._id)
        .populate('tenantId', 'name businessName')
        .lean();
      const createdPostings = await Posting.find({ journalEntryId: entry._id })
        .populate('accountId', 'code name type')
        .lean();
      ledgerLog('Journal created', { externalId, type, tenantId, postingsCount: createdPostings.length });
      res.status(201).json({
        success: true,
        data: {
          ...created,
          postings: createdPostings,
          balanced: true,
        },
      });
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  } catch (e) {
    if (e.message && e.message.includes('not balanced')) {
      ledgerLog('Journal create rejected (not balanced)', { error: e.message });
      return res.status(400).json({ success: false, error: e.message });
    }
    ledgerLog('Journal create failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  overview,
  accounts,
  journal,
  journalById,
  createJournal,
};
