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

    try {
    // NOTE: Removed the 24-hour paidAt restriction per request.
    // Fetch all paid, unsettled transactions (regardless of paidAt age)
    const unsettledTransactions = await Transaction.find({
        status: 'paid',
        settlementStatus: 'unsettled'
        }).populate('merchantId', 'name email');

    console.log(`📦 Found ${unsettledTransactions.length} transactions to check`);

        if (unsettledTransactions.length === 0) {
            console.log('✅ No transactions to settle');
            return { success: true, settledCount: 0, notReadyCount: 0 };
        }

    let settledCount = 0;
    let notReadyCount = 0;
        let errorCount = 0;

        // Get current settlement settings once for all transactions
        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();
        const currentSettlementMinutes = settings.settlement?.settlementMinutes || 20;

    for (const transaction of unsettledTransactions) {
            try {
                // Recalculate expected settlement date to ensure it matches current settings
                // This handles cases where settings were changed after transaction was created
                if (transaction.paidAt) {
                    const newExpectedDate = await calculateExpectedSettlementDate(transaction.paidAt);
                    // Only update if it's different (to avoid unnecessary saves)
                    if (!transaction.expectedSettlementDate || 
                        Math.abs(transaction.expectedSettlementDate.getTime() - newExpectedDate.getTime()) > 60000) { // More than 1 minute difference
                        transaction.expectedSettlementDate = newExpectedDate;
            await transaction.save();
                    }
                }

                // Ensure we have both paidAt and expectedSettlementDate
                if (!transaction.paidAt) {
                    console.warn(`⚠️ Transaction ${transaction.transactionId} has no paidAt date, skipping`);
                    notReadyCount++;
                    continue;
                }

                if (!transaction.expectedSettlementDate) {
                    console.warn(`⚠️ Transaction ${transaction.transactionId} has no expectedSettlementDate, skipping`);
                    notReadyCount++;
                    continue;
        }

        // Use your existing readiness logic
                const isReady = await isReadyForSettlement(transaction.paidAt, transaction.expectedSettlementDate);
                
                // Calculate time until settlement for logging
                const timeUntilSettlement = transaction.expectedSettlementDate.getTime() - now.getTime();
                const hoursUntil = Math.ceil(timeUntilSettlement / (1000 * 60 * 60));
                const daysUntil = Math.ceil(timeUntilSettlement / (1000 * 60 * 60 * 24));
                
                if (isReady) {
                    // Mark transaction as settled - this automatically moves it to Available Wallet Balance
                    // The balance API calculates available balance from all transactions with settlementStatus: 'settled'
            transaction.settlementStatus = 'settled';
            transaction.settlementDate = now;
                    
                    // Ensure netAmount is set (should already be set when transaction was marked as paid)
                    if (!transaction.netAmount && transaction.amount && transaction.commission !== undefined) {
                        transaction.netAmount = parseFloat((transaction.amount - transaction.commission).toFixed(2));
                    }
                    
            await transaction.save();
            settledCount++;
                    const netAmount = transaction.netAmount || (transaction.amount - (transaction.commission || 0));
                    console.log(`✅ Settled: ${transaction.transactionId} (Amount: ₹${transaction.amount}, Net: ₹${netAmount.toFixed(2)}) - Now available in wallet balance`);
        } else {
            notReadyCount++;
                    // Log detailed information about why transaction is not ready
                    const paymentDate = new Date(transaction.paidAt);
                    const timeSincePayment = now.getTime() - paymentDate.getTime();
                    const minutesSincePayment = timeSincePayment / (1000 * 60);
                    
                    // Use current settlement minutes from settings (already fetched above)
                    const settlementMinutes = currentSettlementMinutes;
                    
                    if (settlementMinutes && settlementMinutes > 0) {
                        const minutesRemaining = Math.max(0, settlementMinutes - minutesSincePayment);
                        if (minutesRemaining > 0) {
                            if (minutesRemaining < 60) {
                                console.log(`⏳ Not ready: ${transaction.transactionId} - Settles in ${Math.ceil(minutesRemaining)} minute${Math.ceil(minutesRemaining) > 1 ? 's' : ''} (${Math.ceil(minutesSincePayment)}/${settlementMinutes} minutes elapsed)`);
                            } else {
                                const hoursRemaining = Math.floor(minutesRemaining / 60);
                                const minsRemaining = Math.ceil(minutesRemaining % 60);
                                console.log(`⏳ Not ready: ${transaction.transactionId} - Settles in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} ${minsRemaining > 0 ? `${minsRemaining} minute${minsRemaining > 1 ? 's' : ''}` : ''}`);
                            }
                        }
                    } else {
                        // Legacy date-based logging
                        const settlementDateStr = transaction.expectedSettlementDate.toLocaleString('en-IN', { 
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'short',
                            timeStyle: 'short'
                        });
                        
                        if (timeUntilSettlement > 0) {
                            if (daysUntil > 0) {
                                console.log(`⏳ Not ready: ${transaction.transactionId} - Settles on ${settlementDateStr} (${daysUntil} day${daysUntil > 1 ? 's' : ''} remaining)`);
                            } else if (hoursUntil > 0) {
                                console.log(`⏳ Not ready: ${transaction.transactionId} - Settles on ${settlementDateStr} (${hoursUntil} hour${hoursUntil > 1 ? 's' : ''} remaining)`);
                            } else {
                                const minutesUntil = Math.ceil(timeUntilSettlement / (1000 * 60));
                                console.log(`⏳ Not ready: ${transaction.transactionId} - Settles on ${settlementDateStr} (${minutesUntil} minute${minutesUntil > 1 ? 's' : ''} remaining)`);
                            }
                        }
                    }
                }
            } catch (txnError) {
                errorCount++;
                console.error(`❌ Error processing transaction ${transaction.transactionId}:`, txnError.message);
            }
        }

        console.log(`✅ Settlement complete: ${settledCount} settled, ${notReadyCount} not ready, ${errorCount} errors`);
        
        // Get summary of next settlement times for not-ready transactions
        let nextSettlementInfo = null;
        if (notReadyCount > 0) {
            const nextSettlement = await Transaction.findOne({
                status: 'paid',
                settlementStatus: 'unsettled',
                merchantId: { $in: unsettledTransactions.map(t => t.merchantId) }
            })
            .sort({ expectedSettlementDate: 1 })
            .select('transactionId expectedSettlementDate paidAt amount');
            
            if (nextSettlement) {
                const timeUntil = nextSettlement.expectedSettlementDate.getTime() - now.getTime();
                const hoursUntil = Math.ceil(timeUntil / (1000 * 60 * 60));
                const daysUntil = Math.ceil(timeUntil / (1000 * 60 * 60 * 24));
                
                nextSettlementInfo = {
                    nextSettlementDate: nextSettlement.expectedSettlementDate.toISOString(),
                    hoursUntil: hoursUntil,
                    daysUntil: daysUntil,
                    transactionId: nextSettlement.transactionId
                };
            }
        }
        
        return { 
            success: true, 
            settledCount, 
            notReadyCount, 
            errorCount,
            nextSettlementInfo,
            message: notReadyCount > 0 
                ? `${notReadyCount} transactions are not ready yet. They will be settled when their expected settlement time is reached.`
                : `All eligible transactions have been settled.`
        };
    } catch (error) {
        console.error('❌ Settlement process error:', error);
        throw error;
    }
}

// ✅ Initialize settlement job with cron schedule from settings
async function initializeSettlementJob() {
    try {
        // Stop existing job if running
        if (settlementJob) {
            console.log('🛑 Stopping existing settlement job...');
            settlementJob.stop();
            settlementJob = null;
        }

        // Get cron schedule from settings
        const settings = await Settings.getSettings();
        const cronSchedule = settings.settlement?.cronSchedule || '*/15 * * * 1-6';
        
        console.log(`🔄 Initializing settlement job with cron schedule: ${cronSchedule}`);

        // Validate cron schedule (if validate method exists)
        if (typeof cron.validate === 'function') {
            if (!cron.validate(cronSchedule)) {
                console.error(`❌ Invalid cron schedule: ${cronSchedule}`);
                throw new Error(`Invalid cron schedule: ${cronSchedule}`);
            }
        } else {
            // Fallback: try to create a test schedule to validate
            try {
                const testSchedule = cron.schedule(cronSchedule, () => {}, { scheduled: false });
                if (testSchedule) {
                    testSchedule.stop();
                }
            } catch (scheduleError) {
                console.error(`❌ Invalid cron schedule: ${cronSchedule}`, scheduleError.message);
                throw new Error(`Invalid cron schedule: ${cronSchedule}`);
            }
        }

        // Create new job with dynamic schedule
        settlementJob = cron.schedule(
            cronSchedule,
  async () => {
    try {
      const now = new Date();
      const day = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' });
      const hour = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false });
      const minute = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', minute: '2-digit' });

                    console.log(`🤖 Settlement job triggered on ${day} at ${hour}:${minute} IST`);

                    // Double-check it's a weekday (Monday-Saturday) if schedule includes weekdays
                    if (cronSchedule.includes('1-6') || cronSchedule.includes('MON-SAT')) {
                        if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(day)) {
                            await processSettlement();
                        } else {
                            console.log(`⏸ Skipping auto settlement on ${day} (Sunday)`);
                        }
                    } else if (cronSchedule.includes('1-5') || cronSchedule.includes('MON-FRI')) {
                        // Legacy support for Mon-Fri schedules
      if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day)) {
        await processSettlement();
      } else {
        console.log(`⏸ Skipping auto settlement on ${day} (weekend)`);
                        }
                    } else {
                        // If schedule doesn't restrict weekdays, run anyway
                        await processSettlement();
      }
    } catch (error) {
      console.error('❌ Auto settlement error:', error);
                    console.error('Stack trace:', error.stack);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

        if (!settlementJob) {
            throw new Error('Failed to create settlement job');
        }

        console.log(`✅ Settlement job initialized and started with schedule: ${cronSchedule}`);
        return settlementJob;
    } catch (error) {
        console.error('❌ Error initializing settlement job:', error);
        console.error('Stack trace:', error.stack);
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
