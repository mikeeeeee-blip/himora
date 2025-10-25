/**
 * Return UTC Date objects that correspond to start/end of the given date in IST (Asia/Kolkata).
 * If no date is provided, today (server time) is used.
 *
 * Example for IST 2025-10-25:
 *  start -> 2025-10-24T18:30:00.000Z
 *  end   -> 2025-10-25T18:29:59.999Z
 */
export function getIstDayRange(date = new Date()) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30

  // Get UTC milliseconds for the given Date
  const nowUtcMs = date.getTime();

  // Compute corresponding IST millisecond timestamp
  const nowIstMs = nowUtcMs + IST_OFFSET_MS;
  const nowIst = new Date(nowIstMs);

  // Extract IST year/month/day (use UTC getters on the IST Date object,
  // because nowIst is already shifted to IST epoch milliseconds)
  const year = nowIst.getUTCFullYear();
  const month = nowIst.getUTCMonth(); // 0-based
  const day = nowIst.getUTCDate();

  // Compute UTC instants that correspond to IST midnight and IST end-of-day
  const startUtcMs = Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS;
  const endUtcMs = Date.UTC(year, month, day, 23, 59, 59, 999) - IST_OFFSET_MS;

  return {
    start: new Date(startUtcMs),
    end: new Date(endUtcMs)
  };
}
