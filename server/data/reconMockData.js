/**
 * Reconciliation mock data (server-side).
 * Used by /api/recon endpoints. Data is static but served dynamically.
 */

const metrics = {
  totalReconciled: { value: '1,247', change: '+12', trend: 'up' },
  exceptions: { value: '3', change: '-2', trend: 'down' },
  matchRate: { value: '99.76%', change: '+0.12%', trend: 'up' },
  totalAmount: { value: '₹12,45,890', change: '+₹1,24,500', trend: 'up' },
};

const recentRecons = [
  { id: 'RECON_20260127_001', date: '2026-01-27 14:30', status: 'completed', matched: 1247, exceptions: 0, amount: '₹12,45,890' },
  { id: 'RECON_20260127_002', date: '2026-01-27 12:15', status: 'completed', matched: 1156, exceptions: 1, amount: '₹11,23,450' },
  { id: 'RECON_20260127_003', date: '2026-01-27 10:00', status: 'completed', matched: 1098, exceptions: 2, amount: '₹10,87,230' },
  { id: 'RECON_20260126_045', date: '2026-01-26 18:45', status: 'completed', matched: 1345, exceptions: 0, amount: '₹13,45,670' },
  { id: 'RECON_20260126_044', date: '2026-01-26 16:30', status: 'completed', matched: 1123, exceptions: 1, amount: '₹11,12,340' },
];

const exceptionQueue = [
  { id: 'EX_001', type: 'AMOUNT_MISMATCH', entity: 'TXN_003', amount: '₹750.00', delta: '₹4.50', status: 'resolved', resolvedAt: '2026-01-27 14:32' },
  { id: 'EX_002', type: 'TIMING_DIFF', entity: 'TXN_124', amount: '₹2,500.00', delta: '0', status: 'pending', resolvedAt: null },
  { id: 'EX_003', type: 'MISSING_REF', entity: 'TXN_567', amount: '₹890.00', delta: '0', status: 'investigating', resolvedAt: null },
];

const journalEntries = [
  {
    id: 'JE_001',
    date: '2026-01-20',
    type: 'capture',
    orderId: 'ORD_001',
    txnId: 'TXN_001',
    entries: [
      { account: 'gateway_receivable', dr: '1,000.00', cr: '—', ref: 'pay_cf_001' },
      { account: 'revenue', dr: '—', cr: '955.16', ref: 'ORD_001' },
      { account: 'commission_income', dr: '—', cr: '44.84', ref: 'ORD_001' },
    ],
    balanced: true,
  },
  {
    id: 'JE_002',
    date: '2026-01-21',
    type: 'partial_refund',
    orderId: 'ORD_001',
    txnId: 'TXN_001',
    entries: [
      { account: 'revenue', dr: '400.00', cr: '—', ref: 'ORD_001' },
      { account: 'gateway_receivable', dr: '—', cr: '400.00', ref: 'rfd_001' },
    ],
    balanced: true,
  },
  {
    id: 'JE_003',
    date: '2026-01-22',
    type: 'dispute_reversal',
    orderId: 'ORD_002',
    txnId: 'TXN_002',
    entries: [
      { account: 'revenue', dr: '2,387.90', cr: '—', ref: 'ORD_002' },
      { account: 'commission_income', dr: '112.10', cr: '—', ref: 'ORD_002' },
      { account: 'gateway_receivable', dr: '—', cr: '2,500.00', ref: 'pay_cf_002' },
    ],
    balanced: true,
  },
  {
    id: 'JE_004',
    date: '2026-01-23',
    type: 'capture',
    orderId: 'ORD_003',
    txnId: 'TXN_003',
    entries: [
      { account: 'gateway_receivable', dr: '750.00', cr: '—', ref: 'pay_cf_003' },
      { account: 'revenue', dr: '—', cr: '716.37', ref: 'ORD_003' },
      { account: 'commission_income', dr: '—', cr: '33.63', ref: 'ORD_003' },
    ],
    balanced: true,
  },
  {
    id: 'JE_005',
    date: '2026-01-24',
    type: 'capture',
    orderId: 'ORD_004',
    txnId: 'TXN_004',
    entries: [
      { account: 'gateway_receivable', dr: '5,000.00', cr: '—', ref: 'pay_cf_004' },
      { account: 'revenue', dr: '—', cr: '4,775.80', ref: 'ORD_004' },
      { account: 'commission_income', dr: '—', cr: '224.20', ref: 'ORD_004' },
    ],
    balanced: true,
  },
];

const matchedItems = [
  { ledgerId: 'TXN_001', orderId: 'ORD_001', amount: '1,000.00', gatewayRef: 'pay_cf_001', bankRef: 'BK_TXN_1001', status: 'matched' },
  { ledgerId: 'TXN_002', orderId: 'ORD_002', amount: '2,500.00', gatewayRef: 'pay_cf_002', bankRef: 'BK_TXN_1002', status: 'matched' },
  { ledgerId: 'TXN_003', orderId: 'ORD_003', amount: '750.00', gatewayRef: 'pay_cf_003', bankRef: 'BK_TXN_1003', status: 'matched' },
  { ledgerId: 'TXN_004', orderId: 'ORD_004', amount: '5,000.00', gatewayRef: 'pay_cf_004', bankRef: 'BK_TXN_1004', status: 'matched' },
  { ledgerId: 'rfd_001', orderId: 'ORD_001', amount: '−400.00', gatewayRef: 'rfd_001', bankRef: 'BK_REF_2001', status: 'matched' },
  { ledgerId: 'TXN_005', orderId: 'ORD_005', amount: '1,250.00', gatewayRef: 'pay_cf_005', bankRef: 'BK_TXN_1005', status: 'matched' },
  { ledgerId: 'TXN_006', orderId: 'ORD_006', amount: '890.00', gatewayRef: 'pay_cf_006', bankRef: 'BK_TXN_1006', status: 'matched' },
  { ledgerId: 'TXN_007', orderId: 'ORD_007', amount: '3,200.00', gatewayRef: 'pay_cf_007', bankRef: 'BK_TXN_1007', status: 'matched' },
];

const runDetail = {
  id: 'RECON_20260127_001',
  runDate: '2026-01-27 14:30:00',
  ledgerRange: '2026-01-20 → 2026-01-22',
  bankFile: 'SETTLEMENT_BANK_20260127.csv',
  status: 'Completed',
  matchedItems,
  exception: {
    id: 'RECON_EX_001',
    entity: 'TXN_003 / ORD_003 ↔ BK_TXN_1003',
    amountDiscrepancy: '750.00 (ledger) Δ 4.50 745.50 (bank)',
    type: 'AMOUNT_MISMATCH',
    description: 'Gateway fee/tax deducted at settlement',
  },
  resolutionPath: [
    { step: 1, action: 'Flag', desc: 'Exception RECON_EX_001 created; item excluded from matched tally.' },
    { step: 2, action: 'Investigate', desc: 'Gateway dashboard & logs reviewed: ₹4.50 difference identified as gateway fee/tax.' },
    { step: 3, action: 'Adjustment', desc: 'Posted adjustment: Dr gateway_fee_adjustment 4.50, Cr gateway_receivable 4.50. Linked to TXN_003, RECON_EX_001.' },
    { step: 4, action: 'Backfill', desc: 'Resolution stored: exception_id=RECON_EX_001, resolution=ADJUSTMENT, adjustment_ref=ADJ_003, resolved_at=2026-01-27T14:32:01Z.' },
    { step: 5, action: 'Re-run', desc: 'Next reconciliation run will treat TXN_003 as matched (after adjustment).' },
  ],
  summary: {
    matched: 8,
    exceptions: 1,
    exceptionType: 'AMOUNT_MISMATCH',
    resolution: 'ADJUSTMENT (RECON_EX_001 → ADJ_003)',
    unmatchedBank: 0,
    unmatchedLedger: 0,
  },
};

function getRunById(runId) {
  const r = recentRecons.find((x) => x.id === runId);
  if (!r) return null;
  return {
    ...r,
    detail: runId === 'RECON_20260127_001' ? runDetail : { ...runDetail, id: runId, runDate: r.date },
  };
}

function getJournalById(id) {
  return journalEntries.find((j) => j.id === id) || null;
}

function getExceptionById(id) {
  return exceptionQueue.find((e) => e.id === id) || null;
}

module.exports = {
  metrics,
  recentRecons,
  exceptionQueue,
  journalEntries,
  matchedItems,
  runDetail,
  getRunById,
  getJournalById,
  getExceptionById,
};
