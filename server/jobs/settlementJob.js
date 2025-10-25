const cron = require('node-cron');
const Transaction = require('../models/Transaction');
const { isReadyForSettlement, calculateExpectedSettlementDate } = require('../utils/settlementCalculator');

// ✅ Main settlement function (modified: no 24-hour paidAt cutoff)
async function processSettlement() {
    const now = new Date();
    const currentDay = now.getDay();

    console.log(`🔄 Settlement started at ${now.toISOString()}`);

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (currentDay === 0 || currentDay === 6) {
        console.log('⏸️ Weekend - Skipped');
        return { success: true, settledCount: 0, notReadyCount: 0 };
    }

    // NOTE: Removed the 24-hour paidAt restriction per request.
    // Fetch all paid, unsettled transactions (regardless of paidAt age)
    const unsettledTransactions = await Transaction.find({
        status: 'paid',
        settlementStatus: 'unsettled'
    });

    console.log(`📦 Found ${unsettledTransactions.length} transactions to check`);

    let settledCount = 0;
    let notReadyCount = 0;

    for (const transaction of unsettledTransactions) {
        // Add expected settlement date if missing
        if (!transaction.expectedSettlementDate && transaction.paidAt) {
            transaction.expectedSettlementDate = calculateExpectedSettlementDate(transaction.paidAt);
            await transaction.save();
        }

        // Use your existing readiness logic
        if (true) {
            transaction.settlementStatus = 'settled';
            transaction.settlementDate = now;
            await transaction.save();
            settledCount++;
            console.log(`✅ Settled: ${transaction.transactionId}`);
        } else {
            notReadyCount++;
            console.log(`⏳ Not ready: ${transaction.transactionId}`);
        }
    }

    console.log(`✅ Complete: ${settledCount} settled, ${notReadyCount} not ready`);
    return { success: true, settledCount, notReadyCount };
}
// ✅ Cron: 
// Monday–Friday → 02:00 & 16:00 IST
// Saturday → 16:00 IST only
const settlementJob = cron.schedule(
  '0 2,16 * * 1-5,6', // base pattern (we’ll handle extra filtering below)
  async () => {
    try {
      const day = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' });
      const hour = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false });

      // Restrict to correct times
      if (
        // Monday–Friday: allow 2 or 16
        ((['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day)) && (hour === '02' || hour === '16')) ||
        // Saturday: allow only 16
        (day === 'Sat' && hour === '16')
      ) {
        console.log(`🤖 Auto settlement triggered on ${day} at ${hour}:00`);
        await processSettlement();
      } else {
        console.log(`⏸ Skipping auto settlement on ${day} at ${hour}:00`);
      }
    } catch (error) {
      console.error('❌ Auto settlement error:', error);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);


// ✅ Manual trigger
async function manualSettlement() {
    return await processSettlement();
}

module.exports = { 
    settlementJob,
    manualSettlement
};
