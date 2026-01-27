const reconLogger = require('../utils/reconLogger');
const {
  metrics,
  recentRecons,
  exceptionQueue,
  journalEntries,
  getRunById,
  getJournalById,
  getExceptionById,
  runDetail,
} = require('../data/reconMockData');

let reconLogsSeeded = false;

function seedReconLogs() {
  if (reconLogsSeeded) return;
  reconLogsSeeded = true;
  reconLogger.info('Reconciliation run started', { runId: 'RECON_20260127_001', ledgerRange: '2026-01-27', bankFile: 'bank_stmt_20260127.csv' });
  reconLogger.info('Matched ledger ↔ bank', { runId: 'RECON_20260127_001', count: 1247, amount: '₹12,45,890' });
  reconLogger.warn('Exception raised', { runId: 'RECON_20260127_002', id: 'EX_001', type: 'AMOUNT_MISMATCH', entity: 'TXN_003', delta: '₹4.50' });
  reconLogger.info('Exception resolved via adjustment', { id: 'EX_001', action: 'manual_adjustment', resolvedAt: '2026-01-27T14:32:01.000Z' });
  reconLogger.info('Journal posted', { id: 'JE_001', type: 'capture', orderId: 'ORD_001', txnId: 'TXN_001', balanced: true });
  reconLogger.info('Journal posted', { id: 'JE_002', type: 'partial_refund', orderId: 'ORD_001', txnId: 'TXN_001', balanced: true });
  reconLogger.info('Reconciliation run completed', { runId: 'RECON_20260127_001', matched: 1247, exceptions: 0, matchRate: '100%' });
  reconLogger.info('Recon module ready', { endpoints: ['/overview', '/runs', '/journal', '/exceptions', '/logs'] });
}

function overview(req, res) {
  seedReconLogs();
  reconLogger.info('GET /api/recon/overview', { path: req.path });
  try {
    const runCount = recentRecons?.length ?? 0;
    const exceptionCount = exceptionQueue?.length ?? 0;
    reconLogger.info('Recon overview served', {
      metrics: metrics?.matchRate?.value ?? '—',
      runCount,
      exceptionCount,
      totalReconciled: metrics?.totalReconciled?.value ?? '—',
    });
    res.json({
      success: true,
      data: {
        metrics,
        recentRecons,
        exceptionQueue,
      },
    });
  } catch (e) {
    reconLogger.error('overview failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

function runs(req, res) {
  reconLogger.info('GET /api/recon/runs', { path: req.path });
  try {
    const runs = recentRecons ?? [];
    reconLogger.info('Recon runs list served', {
      count: runs.length,
      runIds: runs.slice(0, 5).map((r) => r.id),
    });
    res.json({ success: true, data: { runs } });
  } catch (e) {
    reconLogger.error('runs list failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

function runById(req, res) {
  const { runId } = req.params;
  reconLogger.info(`GET /api/recon/runs/${runId}`, { runId });
  try {
    const run = getRunById(runId);
    if (!run) {
      reconLogger.warn(`Run not found: ${runId}`, { runId });
      return res.status(404).json({ success: false, error: 'Run not found' });
    }
    const detail = run.detail || {
      ...runDetail,
      id: runId,
      runDate: run.date,
      matchedItems: [],
      exception: null,
      resolutionPath: [],
      summary: { matched: run.matched, exceptions: run.exceptions },
    };
    const matched = detail.matchedItems?.length ?? 0;
    const hasException = !!detail.exception;
    const resolutionSteps = detail.resolutionPath?.length ?? 0;
    reconLogger.info('Recon run detail served', {
      runId,
      matched,
      hasException,
      resolutionSteps,
      status: detail.status ?? run.status,
    });
    res.json({ success: true, data: detail });
  } catch (e) {
    reconLogger.error('run by id failed', { runId, error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

function journal(req, res) {
  reconLogger.info('GET /api/recon/journal', { path: req.path });
  try {
    const entries = journalEntries ?? [];
    const types = [...new Set(entries.map((e) => e.type))];
    reconLogger.info('Recon journal list served', {
      entryCount: entries.length,
      types,
      entryIds: entries.slice(0, 5).map((e) => e.id),
    });
    res.json({ success: true, data: { entries } });
  } catch (e) {
    reconLogger.error('journal list failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

function journalById(req, res) {
  const { id } = req.params;
  reconLogger.info(`GET /api/recon/journal/${id}`, { id });
  try {
    const entry = getJournalById(id);
    if (!entry) {
      reconLogger.warn(`Journal entry not found: ${id}`, { id });
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    const lineCount = entry.entries?.length ?? 0;
    reconLogger.info('Recon journal entry served', {
      id,
      type: entry.type,
      orderId: entry.orderId,
      txnId: entry.txnId,
      lineCount,
      balanced: entry.balanced,
    });
    res.json({ success: true, data: entry });
  } catch (e) {
    reconLogger.error('journal by id failed', { id, error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

function exceptions(req, res) {
  reconLogger.info('GET /api/recon/exceptions', { path: req.path });
  try {
    const exceptions = exceptionQueue ?? [];
    const unresolved = exceptions.filter((ex) => ex.status !== 'resolved');
    reconLogger.info('Recon exceptions list served', {
      count: exceptions.length,
      unresolved: unresolved.length,
      exceptionIds: exceptions.slice(0, 5).map((ex) => ex.id),
    });
    res.json({ success: true, data: { exceptions } });
  } catch (e) {
    reconLogger.error('exceptions list failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

function exceptionById(req, res) {
  const { id } = req.params;
  reconLogger.info(`GET /api/recon/exceptions/${id}`, { id });
  try {
    const ex = getExceptionById(id);
    if (!ex) {
      reconLogger.warn(`Exception not found: ${id}`, { id });
      return res.status(404).json({ success: false, error: 'Exception not found' });
    }
    reconLogger.info('Recon exception detail served', {
      id,
      type: ex.type,
      status: ex.status,
      entity: ex.entity,
      amount: ex.amount,
    });
    res.json({ success: true, data: ex });
  } catch (e) {
    reconLogger.error('exception by id failed', { id, error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

function logs(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 150);
  reconLogger.info('GET /api/recon/logs', { path: req.path, limit });
  try {
    const entries = reconLogger.getLogs(limit);
    reconLogger.info('Recon logs fetched', { requested: limit, returned: entries.length });
    res.json({ success: true, data: { logs: entries } });
  } catch (e) {
    reconLogger.error('logs fetch failed', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  overview,
  runs,
  runById,
  journal,
  journalById,
  exceptions,
  exceptionById,
  logs,
};
