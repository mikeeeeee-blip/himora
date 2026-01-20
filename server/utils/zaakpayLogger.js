/**
 * Zaakpay Transaction Flow Logger
 *
 * Use this for traceable, easy-to-grep logs across:
 *   LINK_CREATE → CHECKOUT (fetch + redirect) → CALLBACK → COMMISSION
 *
 * All logs use prefix [ZP] and optional [ZP:STEP]. To trace one payment:
 *   grep "TXN_ZP_123"   or   grep "ORDER_ZP_abc"
 *
 * Steps:
 *   LINK_CREATE   - Payment link created (server)
 *   TXN_FETCH     - Transaction fetched for checkout (server)
 *   CHECKOUT      - Checkout page / redirect to Zaakpay (krishi-shaktisewa)
 *   CALLBACK      - Zaakpay callback received and processed (server + krishi-shaktisewa)
 *   COMMISSION    - Commission calculated and applied (server, inside CALLBACK)
 *   REDIRECT      - Redirect to success/failure (krishi-shaktisewa)
 */

const PREFIX = '[ZP]';

function ts() {
  return new Date().toISOString();
}

function kv(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return Object.entries(obj)
    .filter(([_, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' ');
}

function tag(stepName) {
  return stepName ? `[ZP:${stepName}]` : PREFIX;
}

/**
 * Log with step tag. Example:
 *   zplog.step('LINK_CREATE', 'TXN_ZP_123', 'link created', { orderId: 'ORDER_ZP_xy', amount: 100 })
 *   => [ZP:LINK_CREATE] 2025-01-15T10:00:00.000Z txnId=TXN_ZP_123 orderId=ORDER_ZP_xy amount=100 | link created
 */
function step(stepName, txnId, message, data = {}) {
  const parts = [ts(), `txnId=${txnId || '-'}`];
  const extra = kv(data);
  if (extra) parts.push(extra);
  const msg = `${tag(stepName)} ${parts.join(' ')} | ${message || ''}`;
  console.log(msg);
  return msg;
}

/**
 * Log without step (generic Zaakpay log).
 */
function log(message, data = {}) {
  const extra = kv(data);
  const msg = `${PREFIX} ${ts()} | ${message}${extra ? ' | ' + extra : ''}`;
  console.log(msg);
  return msg;
}

/**
 * Log error. Still uses [ZP] prefix so it's grep-able.
 */
function err(message, errObj = null, data = {}) {
  const parts = [ts()];
  const extra = kv(data);
  if (extra) parts.push(extra);
  let msg = `${PREFIX} [ERROR] ${parts.join(' ')} | ${message}`;
  if (errObj && errObj.message) msg += ` | error=${errObj.message}`;
  console.error(msg);
  if (errObj && errObj.stack) console.error(errObj.stack);
  return msg;
}

/**
 * Log a separator for a "phase" (e.g. start of callback) to make logs easier to read.
 */
function phase(stepName, txnId, title, data = {}) {
  const extra = kv(data);
  const line = `${tag(stepName)} ========== ${title} ========== txnId=${txnId || '-'} ${extra}`;
  console.log(line);
  return line;
}

const zplog = {
  step,
  log,
  err,
  phase,
  PREFIX,
  tag
};

module.exports = zplog;
