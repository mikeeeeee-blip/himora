const Payout = require('../models/Payout');

let payoutStatusJobInterval = null;

// ✅ Function to move 'requested' payouts to 'processing' after 30 seconds
async function processPayoutStatusTransition() {
    try {
        const now = new Date();
        const thirtySecondsAgo = new Date(now.getTime() - 30000); // 30 seconds ago

        // Find all payouts that are 'requested' and were created more than 30 seconds ago
        const payoutsToUpdate = await Payout.find({
            status: 'requested',
            requestedAt: { $lte: thirtySecondsAgo }
        });

        if (payoutsToUpdate.length === 0) {
            return { success: true, updatedCount: 0 };
        }

        // Update all matching payouts to 'processing' status
        const updateResult = await Payout.updateMany(
            {
                status: 'requested',
                requestedAt: { $lte: thirtySecondsAgo }
            },
            {
                $set: {
                    status: 'processing',
                    updatedAt: new Date()
                }
            }
        );

        return {
            success: true,
            updatedCount: updateResult.modifiedCount,
            payoutIds: payoutsToUpdate.map(p => p.payoutId)
        };
    } catch (error) {
        console.error('❌ Error processing payout status transition:', error);
        return { success: false, error: error.message };
    }
}

// ✅ Initialize payout status transition job (runs every 10 seconds to check for 30-second old payouts)
function initializePayoutStatusJob() {
    try {
        // Clear any existing interval
        if (payoutStatusJobInterval) {
            clearInterval(payoutStatusJobInterval);
        }

        // Run every 10 seconds to catch payouts that have been 'requested' for 30+ seconds
        payoutStatusJobInterval = setInterval(async () => {
            try {
                const result = await processPayoutStatusTransition();
                if (result.updatedCount > 0) {
                    console.log(`✅ Moved ${result.updatedCount} payout(s) from 'requested' to 'processing'`);
                }
            } catch (error) {
                console.error('❌ Payout status transition job error:', error);
            }
        }, 10000); // Every 10 seconds

        if (!payoutStatusJobInterval) {
            throw new Error('Failed to create payout status transition job');
        }

        console.log('✅ Payout status transition job initialized (checks every 10 seconds for 30+ second old payouts)');
        return payoutStatusJobInterval;
    } catch (error) {
        console.error('❌ Failed to initialize payout status transition job:', error);
        throw error;
    }
}

// ✅ Stop the payout status job
function stopPayoutStatusJob() {
    if (payoutStatusJobInterval) {
        clearInterval(payoutStatusJobInterval);
        payoutStatusJobInterval = null;
        console.log('⏸️ Payout status transition job stopped');
    }
}

// ✅ Restart the payout status job
function restartPayoutStatusJob() {
    stopPayoutStatusJob();
    return initializePayoutStatusJob();
}

module.exports = {
    initializePayoutStatusJob,
    stopPayoutStatusJob,
    restartPayoutStatusJob,
    processPayoutStatusTransition
};

