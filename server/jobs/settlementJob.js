const cron = require('node-cron');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { isReadyForSettlement, calculateExpectedSettlementDate } = require('../utils/settlementCalculator');

let settlementJob = null;

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
            transaction.expectedSettlementDate = await calculateExpectedSettlementDate(transaction.paidAt);
            await transaction.save();
        }

        // Use your existing readiness logic
        const isReady = await isReadyForSettlement(transaction.paidAt, transaction.expectedSettlementDate);
        if (isReady) {
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

// ✅ Initialize settlement job with cron schedule from settings
async function initializeSettlementJob() {
    try {
        // Stop existing job if running
        if (settlementJob) {
            settlementJob.stop();
            settlementJob = null;
        }

        // Get cron schedule from settings
        const settings = await Settings.getSettings();
        const cronSchedule = settings.settlement?.cronSchedule || '*/15 * * * 1-6';
        
        console.log(`🔄 Initializing settlement job with cron schedule: ${cronSchedule}`);

        // Create new job with dynamic schedule
        settlementJob = cron.schedule(
            cronSchedule,
            async () => {
                try {
                    const now = new Date();
                    const day = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' });
                    const hour = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false });
                    const minute = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', minute: '2-digit' });

                    // Double-check it's a weekday (Monday-Saturday) if schedule includes weekdays
                    if (cronSchedule.includes('1-6') || cronSchedule.includes('MON-SAT')) {
                        if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(day)) {
                            console.log(`🤖 Auto settlement triggered on ${day} at ${hour}:${minute} IST`);
                            await processSettlement();
                        } else {
                            console.log(`⏸ Skipping auto settlement on ${day} (Sunday)`);
                        }
                    } else if (cronSchedule.includes('1-5') || cronSchedule.includes('MON-FRI')) {
                        // Legacy support for Mon-Fri schedules
                        if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day)) {
                            console.log(`🤖 Auto settlement triggered on ${day} at ${hour}:${minute} IST`);
                            await processSettlement();
                        } else {
                            console.log(`⏸ Skipping auto settlement on ${day} (weekend)`);
                        }
                    } else {
                        // If schedule doesn't restrict weekdays, run anyway
                        console.log(`🤖 Auto settlement triggered on ${day} at ${hour}:${minute} IST`);
                        await processSettlement();
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

        console.log(`✅ Settlement job initialized and started`);
        return settlementJob;
    } catch (error) {
        console.error('❌ Error initializing settlement job:', error);
        throw error;
    }
}

// ✅ Restart settlement job (call this when cron schedule is updated)
async function restartSettlementJob() {
    console.log('🔄 Restarting settlement job with updated schedule...');
    await initializeSettlementJob();
}


// ✅ Manual trigger
async function manualSettlement() {
    return await processSettlement();
}

module.exports = { 
    settlementJob: () => settlementJob, // Return getter function
    initializeSettlementJob,
    restartSettlementJob,
    manualSettlement
};
