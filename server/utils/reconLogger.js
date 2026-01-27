/**
 * In-memory reconciliation activity logger.
 * Logs are written to console and stored for GET /api/recon/logs.
 */

const MAX_LOGS = 400;
const logs = [];

function ts() {
  return new Date().toISOString();
}

function push(level, message, meta = {}) {
  const entry = {
    time: ts(),
    level,
    message,
    ...meta,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📋';
  console.log(`${prefix} [RECON] ${entry.time} ${message}`, Object.keys(meta).length ? meta : '');
  return entry;
}

function info(message, meta) {
  return push('info', message, meta);
}

function warn(message, meta) {
  return push('warn', message, meta);
}

function error(message, meta) {
  return push('error', message, meta);
}

function getLogs(limit = 50) {
  return logs.slice(-limit).reverse();
}

function debug(message, meta) {
  return push('info', message, { ...meta, _debug: true });
}

module.exports = {
  info,
  warn,
  error,
  debug,
  getLogs,
};
