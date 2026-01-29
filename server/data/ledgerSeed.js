/**
 * Seed default accounts and sample journal entries for ledger demo.
 * Idempotent: skips if already present.
 */

const mongoose = require('mongoose');
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const Posting = require('../models/Posting');
const User = require('../models/User');

let seeded = false;

const DEFAULT_ACCOUNTS = [
  { code: 'gateway_receivable', name: 'Gateway Receivable', type: 'asset' },
  { code: 'revenue', name: 'Revenue', type: 'revenue' },
  { code: 'commission_income', name: 'Commission Income', type: 'revenue' },
];

async function getDemoTenant() {
  let u = await User.findOne({ role: 'admin' }).select('_id name businessName').lean();
  if (!u) u = await User.findOne().select('_id name businessName').lean();
  return u;
}

async function ensureAccounts(tenantId) {
  for (const a of DEFAULT_ACCOUNTS) {
    const exists = await Account.findOne({ tenantId, code: a.code });
    if (!exists) {
      await Account.create({
        tenantId,
        code: a.code,
        name: a.name,
        type: a.type,
        currency: 'INR',
      });
    }
  }
}

async function ensureSampleJournals(tenantId) {
  const accountMap = {};
  const accounts = await Account.find({ tenantId }).lean();
  for (const a of accounts) accountMap[a.code] = a._id;

  const samples = [
    {
      externalId: 'JE_001',
      type: 'capture',
      orderId: 'ORD_001',
      txnId: 'TXN_001',
      entries: [
        { account: 'gateway_receivable', side: 'dr', amount: 1000, ref: 'pay_cf_001' },
        { account: 'revenue', side: 'cr', amount: 955.16, ref: 'ORD_001' },
        { account: 'commission_income', side: 'cr', amount: 44.84, ref: 'ORD_001' },
      ],
    },
    {
      externalId: 'JE_002',
      type: 'partial_refund',
      orderId: 'ORD_001',
      txnId: 'TXN_001',
      entries: [
        { account: 'revenue', side: 'dr', amount: 400, ref: 'ORD_001' },
        { account: 'gateway_receivable', side: 'cr', amount: 400, ref: 'rfd_001' },
      ],
    },
    {
      externalId: 'JE_003',
      type: 'dispute_reversal',
      orderId: 'ORD_002',
      txnId: 'TXN_002',
      entries: [
        { account: 'revenue', side: 'dr', amount: 2387.9, ref: 'ORD_002' },
        { account: 'commission_income', side: 'dr', amount: 112.1, ref: 'ORD_002' },
        { account: 'gateway_receivable', side: 'cr', amount: 2500, ref: 'pay_cf_002' },
      ],
    },
  ];

  for (const s of samples) {
    const exists = await JournalEntry.findOne({ externalId: s.externalId });
    if (exists) continue;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const entry = await JournalEntry.create(
        [{
          tenantId,
          externalId: s.externalId,
          type: s.type,
          orderId: s.orderId,
          txnId: s.txnId,
          isPosted: true,
          postedAt: new Date(),
        }],
        { session },
      );
      const je = entry[0];

      for (const e of s.entries) {
        await Posting.create(
          [{
            journalEntryId: je._id,
            accountId: accountMap[e.account],
            side: e.side,
            amount: e.amount,
            ref: e.ref,
          }],
          { session },
        );
      }
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

async function runLedgerSeed() {
  if (seeded) return;
  if (mongoose.connection.readyState !== 1) return;

  try {
    const tenant = await getDemoTenant();
    if (!tenant) return;

    await ensureAccounts(tenant._id);
    await ensureSampleJournals(tenant._id);
    seeded = true;
  } catch (e) {
    console.error('Ledger seed error:', e);
  }
}

module.exports = { runLedgerSeed };
