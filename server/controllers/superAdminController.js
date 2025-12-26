const Payout = require('../models/Payout');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { calculatePayinCommission } = require('../utils/commissionCalculator');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { sendMerchantWebhook, sendPayoutWebhook } = require('./merchantWebhookController');
const mongoose = require('mongoose');
const COMMISSION_RATE = 0.038; // 3.8%

// Helper function to validate cron expression (simple validation)
function validateCronExpression(cronExpression) {
    if (!cronExpression || typeof cronExpression !== 'string') {
        return false;
    }
    
    // Basic validation: should have 5 parts separated by spaces
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) {
        return false;
    }
    
    // Check if it matches the expected pattern: */{number} * * * 1-6
    const minutePattern = /^\*\/(\d+)$/;
    if (!minutePattern.test(parts[0])) {
        return false;
    }
    
    // Check weekday is 1-6 (Monday to Saturday)
    if (parts[4] !== '1-6') {
        return false;
    }
    
    return true;
}

// ============ GET ALL PAYOUTS (SuperAdmin) ============
exports.getAllPayouts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            merchantId,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log(`📋 SuperAdmin ${req.user.name} fetching all payouts - Page ${page}`);

        // Build query
        let query = {};

        // Filter by status
        if (status) {
            if (status.includes(',')) {
                query.status = { $in: status.split(',') };
            } else {
                query.status = status;
            }
        }

        // Filter by merchant
        if (merchantId) {
            query.merchantId = merchantId;
        }

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const sd = new Date(startDate);
                // Set to beginning of day (00:00:00.000)
                sd.setHours(0, 0, 0, 0);
                query.createdAt.$gte = sd;
            }
            if (endDate) {
                const ed = new Date(endDate);
                // Set to end of day (23:59:59.999) to include the entire day
                ed.setHours(23, 59, 59, 999);
                query.createdAt.$lte = ed;
            }
        }

        // Get total count
        const totalCount = await Payout.countDocuments(query);

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Get payouts
        const payouts = await Payout.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('merchantId', 'name email')
            .populate('requestedBy', 'name email')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email')
            .lean();

        // Calculate summary
        const allPayouts = await Payout.find({});
        const totalRequested = allPayouts.reduce((sum, p) => sum + p.amount, 0);
        const totalCompleted = allPayouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.netAmount, 0);
        const totalPending = allPayouts.filter(p => ['requested', 'pending', 'processing'].includes(p.status)).reduce((sum, p) => sum + p.netAmount, 0);

        res.json({
            success: true,
            payouts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit),
                hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
                hasPrevPage: parseInt(page) > 1
            },
            summary: {
                total_payout_requests: allPayouts.length,
                requested_payouts: allPayouts.filter(p => p.status === 'requested').length,
                pending_payouts: allPayouts.filter(p => ['pending', 'processing'].includes(p.status)).length,
                completed_payouts: allPayouts.filter(p => p.status === 'completed').length,
                failed_payouts: allPayouts.filter(p => p.status === 'failed').length,
                rejected_payouts: allPayouts.filter(p => p.status === 'rejected').length,
                cancelled_payouts: allPayouts.filter(p => p.status === 'cancelled').length,
                total_amount_requested: totalRequested.toFixed(2),
                total_completed: totalCompleted.toFixed(2),
                total_pending: totalPending.toFixed(2)
            }
        });

        console.log(`✅ Returned ${payouts.length} payouts to SuperAdmin`);

    } catch (error) {
        console.error('❌ Get All Payouts Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payouts'
        });
    }
};
// ============ APPROVE PAYOUT ============
exports.approvePayout = async (req, res) => {
    try {
        const { payoutId } = req.params;
        const { notes } = req.body;

        console.log(`✅ SuperAdmin ${req.user.name} approving payout: ${payoutId}`);

        const payout = await Payout.findOne({ payoutId });

        if (!payout) {
            return res.status(404).json({
                success: false,
                error: 'Payout request not found'
            });
        }

        if (payout.status !== 'requested') {
            return res.status(400).json({
                success: false,
                error: `Cannot approve payout with status: ${payout.status}. Only 'requested' payouts can be approved.`,
                currentStatus: payout.status
            });
        }

        // ✅ Update payout to 'pending' status (approved, waiting for processing)
        payout.status = 'pending';
        payout.approvedBy = req.user._id;
        payout.approvedByName = req.user.name;
        payout.approvedAt = new Date();
        payout.adminNotes = notes || '';

        await payout.save();

        // ✅ DO NOT update transaction status to 'paid' yet - only update to 'requested'
        // Transactions should only be marked 'paid' after actual bank transfer is completed
        await Transaction.updateMany(
            { payoutId: payout._id },
            { 
                $set: { 
                    payoutStatus: 'paid' // Keep as 'requested', not 'paid'
                }
            }
        );

        console.log(`✅ Payout ${payoutId} approved and ready for processing`);

        res.json({
            success: true,
            message: 'Payout approved successfully. Ready for processing.',
            payout: {
                payoutId: payout.payoutId,
                amount: payout.amount,
                netAmount: payout.netAmount,
                status: payout.status,
                approvedBy: payout.approvedByName,
                approvedAt: payout.approvedAt,
                transferMode: payout.transferMode,
                beneficiaryDetails: payout.beneficiaryDetails
            }
        });

    } catch (error) {
        console.error('❌ Approve Payout Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve payout'
        });
    }
};

// ============ DELETE PAYOUT ============
exports.deletePayout = async (req, res) => {
    try {
        const { payoutId } = req.params;
        const { reason } = req.query; // Get reason from query params since DELETE doesn't support body

        console.log(`🗑️ SuperAdmin ${req.user.name} deleting payout: ${payoutId}`);

        const payout = await Payout.findOne({ payoutId });

        if (!payout) {
            return res.status(404).json({
                success: false,
                error: 'Payout request not found'
            });
        }

        // ✅ Can only delete payouts that are not completed
        // Allow deletion of: requested, pending, processing, rejected, failed, cancelled
        if (payout.status === 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete a completed payout. Completed payouts cannot be deleted.',
                currentStatus: payout.status
            });
        }

        // ✅ Rollback Free Payout if applicable
        if (payout.commissionType === 'free') {
            const merchant = await User.findById(payout.merchantId);
            if (merchant) {
                merchant.freePayoutsUnder500 += 1;
                await merchant.save();
                console.log(`✅ Restored 1 free payout to merchant ${merchant.name}`);
            }
        }

        // ✅ Rollback associated transactions
        await Transaction.updateMany(
            { payoutId: payout._id },
            {
                $set: {
                    payoutStatus: 'unpaid',
                    payoutId: null
                }
            }
        );

        // ✅ Delete the payout
        await Payout.deleteOne({ payoutId });

        console.log(`✅ Payout ${payoutId} deleted successfully by ${req.user.name}`);

        res.json({
            success: true,
            message: 'Payout deleted successfully',
            payout: {
                payoutId: payout.payoutId,
                deletedAt: new Date(),
                deletedBy: req.user.name,
                reason: reason || 'Deleted by superadmin'
            }
        });

    } catch (error) {
        console.error('❌ Delete Payout Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete payout',
            detail: error.message
        });
    }
};

// ============ REJECT PAYOUT ============
exports.rejectPayout = async (req, res) => {
    try {
        const { payoutId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required'
            });
        }

        console.log(`❌ SuperAdmin ${req.user.name} rejecting payout: ${payoutId}`);

        const payout = await Payout.findOne({ payoutId });

        if (!payout) {
            return res.status(404).json({
                success: false,
                error: 'Payout request not found'
            });
        }

        // ✅ Can reject 'requested', 'pending', or 'processing' payouts, but not completed ones
        if (!['requested', 'pending', 'processing'].includes(payout.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot reject payout with status: ${payout.status}. Can only reject 'requested', 'pending', or 'processing' payouts.`,
                currentStatus: payout.status
            });
        }

        // --- Rollback Free Payout --- 
        if (payout.commissionType === 'free') {
            const merchant = await User.findById(payout.merchantId);
            if (merchant) {
                merchant.freePayoutsUnder500 += 1;
                await merchant.save();
                console.log(`✅ Restored 1 free payout to merchant ${merchant.name}`);
            }
        }

        // Store previous status before updating
        const previousStatus = payout.status;
        
        // Update payout
        payout.status = 'rejected';
        payout.rejectedBy = req.user._id;
        payout.rejectedByName = req.user.name;
        payout.rejectedAt = new Date();
        payout.rejectionReason = reason;
        
        // If payout was previously approved, clear approval fields
        if (previousStatus === 'pending' || previousStatus === 'processing') {
            payout.approvedBy = null;
            payout.approvedByName = null;
            payout.approvedAt = null;
            payout.approvalNotes = null;
            console.log(`🔄 Clearing approval fields for payout ${payoutId} (was ${previousStatus})`);
        }

        await payout.save();

        // ✅ Rollback associated transactions
        const updateResult = await Transaction.updateMany(
            { payoutId: payout._id },
            { 
                $set: { 
                    payoutStatus: 'unpaid',
                    payoutId: null
                }
            }
        );

        console.log(`✅ Payout ${payoutId} rejected. ${updateResult.modifiedCount} transactions rolled back.`);

        res.json({
            success: true,
            message: 'Payout rejected successfully. Transactions are now available for new payout requests.',
            payout: {
                payoutId: payout.payoutId,
                amount: payout.amount,
                status: payout.status,
                rejectedBy: payout.rejectedByName,
                rejectedAt: payout.rejectedAt,
                reason: payout.rejectionReason
            },
            transactions_rolled_back: updateResult.modifiedCount
        });

    } catch (error) {
        console.error('❌ Reject Payout Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject payout'
        });
    }
};

// ============ PROCESS PAYOUT (Mark as completed with UTR) ============
exports.processPayout = async (req, res) => {
    try {
        const { payoutId } = req.params;
        const { utr, transactionHash, notes } = req.body;

        const payout = await Payout.findOne({ payoutId });

        if (!payout) {
            return res.status(404).json({
                success: false,
                error: 'Payout request not found'
            });
        }

        // For crypto payouts, accept transactionHash; for others, accept UTR
        const transactionRef = payout.transferMode === 'crypto' 
            ? (transactionHash || utr)
            : utr;

        if (!transactionRef || transactionRef.trim().length === 0) {
            const fieldName = payout.transferMode === 'crypto' ? 'Transaction Hash' : 'UTR/Transaction reference';
            return res.status(400).json({
                success: false,
                error: `${fieldName} is required`
            });
        }

        console.log(`💰 SuperAdmin ${req.user.name} processing payout: ${payoutId} with ${payout.transferMode === 'crypto' ? 'Transaction Hash' : 'UTR'}: ${transactionRef}`);

        // ✅ Can only process 'pending' payouts (already approved)
        if (payout.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cannot process payout with status: ${payout.status}. Payout must be in 'pending' (approved) status first.`,
                currentStatus: payout.status,
                hint: payout.status === 'requested' ? 'Please approve the payout first' : null
            });
        }

        // ✅ Check for duplicate UTR
        // const existingPayout = await Payout.findOne({ 
        //     utr: utr.trim(), 
        //     _id: { $ne: payout._id },
        //     status: 'completed'
        // });

        // if (existingPayout) {
        //     return res.status(400).json({
        //         success: false,
        //         error: `UTR ${utr} is already used for another payout: ${existingPayout.payoutId}`,
        //         duplicatePayoutId: existingPayout.payoutId
        //     });
        // }

        // ✅ Update payout as completed
        payout.status = 'completed';
        payout.processedBy = req.user._id;
        payout.processedByName = req.user.name;
        payout.processedAt = new Date();
        payout.completedAt = new Date();
        // Store transaction hash for crypto, UTR for bank/UPI
        payout.utr = transactionRef.trim();
        if (notes) {
            payout.adminNotes = notes;
        }

        await payout.save();
        const updatedPayout = await Payout.findOne({ payoutId });

        // console.log("new payout amount ",updatedPayout)

        // ✅ NOW update transactions to 'paid' status (actual money transferred)
        const updateResult = await Transaction.updateMany(
            { payoutId: payout._id },
            { 
                $set: { 
                    payoutStatus: 'paid' // Mark as paid only after UTR is confirmed
                }
                
            },
                 { new: true }
        );
        // console.log("updated transsaction " , updateResult)


        console.log(`✅ Payout ${payoutId} completed. ${updateResult.modifiedCount} transactions marked as paid.`);

        // send payout webhook to merchant 
        const webhookPayload = {
            event: 'payout.completed',
            timestamp: new Date().toISOString(),
            payout: {
                payout_id: updatedPayout.payoutId,
                status: updatedPayout.status,
                amount: updatedPayout.amount,
                net_amount: updatedPayout.netAmount,
                commission: updatedPayout.commission,
                transfer_mode: updatedPayout.transferMode,
                utr: updatedPayout.utr,
                transaction_hash: updatedPayout.transferMode === 'crypto' ? updatedPayout.utr : null,
                beneficiary_details: updatedPayout.beneficiaryDetails,
                processed_at: updatedPayout.processedAt,
                completed_at: updatedPayout.completedAt
            }
        }

        console.log("sending the payout webhook payload ", webhookPayload)
        const merchant = await User.findById(updatedPayout.merchantId)

        if (updatedPayout.merchantId) {
            await sendPayoutWebhook(merchant, webhookPayload);
        }



        res.json({
            success: true,
            message: 'Payout processed and completed successfully. Funds transferred to merchant.',
            payout: {
                payoutId: payout.payoutId,
                status: payout.status,
                amount: payout.amount,
                netAmount: payout.netAmount,
                utr: payout.utr,
                processedBy: payout.processedByName,
                completedAt: payout.completedAt,
                transferMode: payout.transferMode
            },
            transactions_updated: updateResult.modifiedCount
        });

    } catch (error) {
        console.error('❌ Process Payout Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process payout'
        });
    }
};

// ============ GET ALL TRANSACTIONS (All Merchants) ============
exports.getAllTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            merchantId,
            status,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log(`📊 SuperAdmin fetching all transactions - Page ${page}`);

        // Build query
        let query = {};

        // Filter by merchant
        if (merchantId) {
            query.merchantId = merchantId;
        }

        // Filter by status
        if (status) {
            if (status.includes(',')) {
                query.status = { $in: status.split(',') };
            } else {
                query.status = status;
            }
        }

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                const sd = new Date(startDate);
                // Set to beginning of day (00:00:00.000)
                sd.setHours(0, 0, 0, 0);
                query.createdAt.$gte = sd;
            }
            if (endDate) {
                const ed = new Date(endDate);
                // Set to end of day (23:59:59.999) to include the entire day
                ed.setHours(23, 59, 59, 999);
                query.createdAt.$lte = ed;
            }
        }

        // Amount range filter
        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = parseFloat(minAmount);
            if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
        }

        // Search filter
        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { transactionId: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } },
                { customerPhone: { $regex: search, $options: 'i' } },
                { merchantName: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count
        const totalCount = await Transaction.countDocuments(query);

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Get transactions with pagination
        const transactions = await Transaction.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('merchantId', 'name email')
            .select('-webhookData')
            .lean();

        res.json({
            success: true,
            transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit),
                hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
                hasPrevPage: parseInt(page) > 1
            }
        });

        console.log(`✅ Returned ${transactions.length} transactions to SuperAdmin`);

    } catch (error) {
        console.error('❌ Get All Transactions Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions'
        });
    }
};

// ============ GET MERCHANT ANALYTICS (Summary Stats Only) ============
exports.getMerchantAnalytics = async (req, res) => {
    try {
        const { merchantId } = req.params;
        const {
            status,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            search
        } = req.query;

        console.log(`📊 SuperAdmin fetching merchant analytics for merchant: ${merchantId || 'all'}`);

        // Build query (same as getAllTransactions)
        let query = {};
        let payoutQuery = {};

        if (merchantId) {
            // Convert to ObjectId if it's a valid ObjectId string
            try {
                query.merchantId = mongoose.Types.ObjectId.isValid(merchantId) 
                    ? new mongoose.Types.ObjectId(merchantId) 
                    : merchantId;
                payoutQuery.merchantId = query.merchantId;
            } catch (error) {
                query.merchantId = merchantId;
                payoutQuery.merchantId = merchantId;
            }
        }

        if (status) {
            if (status.includes(',')) {
                query.status = { $in: status.split(',') };
            } else {
                query.status = status;
            }
        }

        if (startDate || endDate) {
            query.createdAt = {};
            payoutQuery.requestedAt = {};
            if (startDate) {
                const sd = new Date(startDate);
                sd.setHours(0, 0, 0, 0);
                query.createdAt.$gte = sd;
                payoutQuery.requestedAt.$gte = sd;
            }
            if (endDate) {
                const ed = new Date(endDate);
                ed.setHours(23, 59, 59, 999);
                query.createdAt.$lte = ed;
                payoutQuery.requestedAt.$lte = ed;
            }
        }

        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = parseFloat(minAmount);
            if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
        }

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { transactionId: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } },
                { customerPhone: { $regex: search, $options: 'i' } },
                { merchantName: { $regex: search, $options: 'i' } }
            ];
        }

        // Use aggregation for efficient summary calculation
        const analytics = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total_transactions: { $sum: 1 },
                    successful_transactions: {
                        $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
                    },
                    failed_transactions: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                    },
                    pending_transactions: {
                        $sum: { $cond: [{ $in: ['$status', ['pending', 'created']] }, 1, 0] }
                    },
                    total_revenue: {
                        $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] }
                    },
                    total_refunded: {
                        $sum: { $ifNull: ['$refundAmount', 0] }
                    },
                    total_commission: {
                        $sum: { $ifNull: ['$commission', 0] }
                    },
                    net_revenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'paid'] },
                                { $subtract: ['$amount', { $ifNull: ['$refundAmount', 0] }] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const stats = analytics[0] || {
            total_transactions: 0,
            successful_transactions: 0,
            failed_transactions: 0,
            pending_transactions: 0,
            total_revenue: 0,
            total_refunded: 0,
            total_commission: 0,
            net_revenue: 0
        };

        // Calculate success rate and average
        const successRate = stats.total_transactions > 0
            ? ((stats.successful_transactions / stats.total_transactions) * 100).toFixed(2)
            : '0.00';
        
        const averageTransactionValue = stats.total_transactions > 0
            ? (stats.total_revenue / stats.total_transactions).toFixed(2)
            : '0.00';

        // Get payout analytics
        const payoutAnalytics = await Payout.aggregate([
            { $match: payoutQuery },
            {
                $group: {
                    _id: null,
                    total_payouts: { $sum: 1 },
                    completed_payouts: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    pending_payouts: {
                        $sum: { $cond: [{ $in: ['$status', ['requested', 'pending', 'processing']] }, 1, 0] }
                    },
                    total_completed_amount: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$netAmount', '$amount'] }, 0] }
                    },
                    total_pending_amount: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['requested', 'pending', 'processing']] },
                                { $ifNull: ['$netAmount', '$amount'] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const payoutStats = payoutAnalytics[0] || {
            total_payouts: 0,
            completed_payouts: 0,
            pending_payouts: 0,
            total_completed_amount: 0,
            total_pending_amount: 0
        };

        res.json({
            success: true,
            analytics: {
                total_transactions: stats.total_transactions,
                successful_transactions: stats.successful_transactions,
                failed_transactions: stats.failed_transactions,
                pending_transactions: stats.pending_transactions,
                total_revenue: parseFloat(stats.total_revenue.toFixed(2)),
                total_refunded: parseFloat(stats.total_refunded.toFixed(2)),
                net_revenue: parseFloat(stats.net_revenue.toFixed(2)),
                total_commission: parseFloat(stats.total_commission.toFixed(2)),
                success_rate: parseFloat(successRate),
                average_transaction_value: parseFloat(averageTransactionValue),
                // Payout analytics
                total_payouts: payoutStats.total_payouts,
                completed_payouts: payoutStats.completed_payouts,
                pending_payouts: payoutStats.pending_payouts,
                total_completed_amount: parseFloat(payoutStats.total_completed_amount.toFixed(2)),
                total_pending_amount: parseFloat(payoutStats.total_pending_amount.toFixed(2))
            }
        });

        console.log(`✅ Returned analytics for merchant: ${merchantId || 'all'}`);

    } catch (error) {
        console.error('❌ Get Merchant Analytics Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch merchant analytics'
        });
    }
};

exports.settleTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;

        const transaction = await Transaction.findOne({ transactionId });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        transaction.settlementStatus = 'settled';
        transaction.settlementDate = new Date();
        await transaction.save();

        res.json({
            success: true,
            message: 'Transaction settled successfully',
            transaction: transaction
        });
    }
    catch (error) {
        console.error('❌ Settle Transaction Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to settle transaction'
        });
    }
};

// ============ UPDATE TRANSACTION STATUS (SUPER ADMIN) ============
/**
 * Updates a transaction's status (Super Admin only)
 * Super Admin can update any transaction's status
 * 
 * PUT /api/payments/admin/transactions/:transactionId/status
 * Headers: x-auth-token (JWT token - Super Admin)
 * Body: { status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'expired' | 'created' }
 */
exports.updateTransactionStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['created', 'pending', 'paid', 'failed', 'cancelled', 'refunded', 'partial_refund', 'expired'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Find the transaction
        const transaction = await Transaction.findOne({ transactionId }).populate('merchantId');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Prepare update operation
        const updateOperation = {
            $set: {
                status: status,
                updatedAt: new Date()
            }
        };

        // If setting to 'paid', recalculate commission and sync all data
        if (status === 'paid') {
            const paidAt = transaction.paidAt || new Date();
            
            // Calculate commission using the commission calculator
            const commissionData = calculatePayinCommission(transaction.amount);
            
            // Calculate expected settlement date
            const expectedSettlement = await calculateExpectedSettlementDate(paidAt);
            
            // Update all relevant fields
            updateOperation.$set.paidAt = paidAt;
            updateOperation.$set.commission = commissionData.commission;
            updateOperation.$set.netAmount = parseFloat((transaction.amount - commissionData.commission).toFixed(2));
            updateOperation.$set.settlementStatus = 'unsettled';
            updateOperation.$set.expectedSettlementDate = expectedSettlement;
            
            console.log(`💰 Commission recalculated for transaction ${transactionId}:`);
            console.log(`   Amount: ₹${transaction.amount}`);
            console.log(`   Commission: ₹${commissionData.commission}`);
            console.log(`   Net Amount: ₹${updateOperation.$set.netAmount}`);
            console.log(`   Expected Settlement: ${expectedSettlement.toISOString()}`);
        }

        // If changing from 'paid' to another status, remove paidAt and reset commission-related fields
        if (transaction.status === 'paid' && status !== 'paid') {
            updateOperation.$unset = { 
                paidAt: "",
                commission: "",
                netAmount: "",
                settlementStatus: "",
                expectedSettlementDate: "",
                settlementDate: ""
            };
        }

        const updatedTransaction = await Transaction.findOneAndUpdate(
            { transactionId: transactionId },
            updateOperation,
            { new: true }
        ).populate('merchantId', 'name email');

        console.log(`✅ Super Admin updated transaction ${transactionId} status from '${transaction.status}' to '${status}'`);

        res.json({
            success: true,
            message: `Transaction status updated successfully${status === 'paid' ? ' - Commission recalculated and data synced' : ''}`,
            transaction: {
                transactionId: updatedTransaction.transactionId,
                orderId: updatedTransaction.orderId,
                status: updatedTransaction.status,
                amount: updatedTransaction.amount,
                currency: updatedTransaction.currency,
                merchantName: updatedTransaction.merchantName,
                customerName: updatedTransaction.customerName,
                paidAt: updatedTransaction.paidAt,
                commission: updatedTransaction.commission,
                netAmount: updatedTransaction.netAmount,
                settlementStatus: updatedTransaction.settlementStatus,
                expectedSettlementDate: updatedTransaction.expectedSettlementDate,
                updatedAt: updatedTransaction.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Update Transaction Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update transaction status',
            details: error.message
        });
    }
};

// ============ DELETE TRANSACTION (SUPER ADMIN) ============
/**
 * Deletes a transaction (Super Admin only)
 * 
 * DELETE /api/payments/admin/transactions/:transactionId
 * Headers: x-auth-token (JWT token - Super Admin)
 */
exports.deleteTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;

        // Find the transaction
        const transaction = await Transaction.findOne({ transactionId });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Check if transaction is settled or part of a payout
        if (transaction.settlementStatus === 'settled') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete a settled transaction. Please contact support if this is necessary.'
            });
        }

        // Delete the transaction
        await Transaction.deleteOne({ transactionId });

        console.log(`🗑️ Super Admin deleted transaction ${transactionId}`);

        res.json({
            success: true,
            message: 'Transaction deleted successfully',
            transactionId: transactionId
        });

    } catch (error) {
        console.error('❌ Delete Transaction Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete transaction',
            details: error.message
        });
    }
};


 // controllers/superadminController.js

// ============ GET DASHBOARD STATISTICS ============
exports.getDashboardStats = async (req, res) => {
    try {
        console.log(`📊 SuperAdmin ${req.user.name} fetching dashboard statistics`);

        const { startDate, endDate } = req.query;

        // Build date filter for transactions and payouts
        let transactionDateFilter = {};
        let payoutDateFilter = {};

        if (startDate || endDate) {
            transactionDateFilter.createdAt = {};
            payoutDateFilter.createdAt = {};
            
            if (startDate) {
                const sd = new Date(startDate);
                sd.setHours(0, 0, 0, 0);
                transactionDateFilter.createdAt.$gte = sd;
                payoutDateFilter.createdAt.$gte = sd;
            }
            if (endDate) {
                const ed = new Date(endDate);
                ed.setHours(23, 59, 59, 999);
                transactionDateFilter.createdAt.$lte = ed;
                payoutDateFilter.createdAt.$lte = ed;
            }
        }

        // Get merchants count (optimized)
        const [merchantsCount, activeMerchantsCount, inactiveMerchantsCount] = await Promise.all([
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'admin', status: 'active' }),
            User.countDocuments({ role: 'admin', status: 'inactive' })
        ]);

        // Get merchants for new_this_week calculation
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newMerchantsThisWeek = await User.countDocuments({
            role: 'admin',
            createdAt: { $gte: oneWeekAgo }
        });

        // Use aggregation for efficient transaction stats
        const transactionStats = await Transaction.aggregate([
            { $match: transactionDateFilter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                    failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $in: ['$status', ['pending', 'created']] }, 1, 0] } },
                    settled: { $sum: { $cond: [{ $eq: ['$settlementStatus', 'settled'] }, 1, 0] } },
                    unsettled: { $sum: { $cond: [{ $eq: ['$settlementStatus', 'unsettled'] }, 1, 0] } },
                    total_revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
                    total_refunded: { $sum: { $ifNull: ['$refundAmount', 0] } },
                    total_commission: { $sum: { $ifNull: ['$commission', 0] } },
                    available_for_payout: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$status', 'paid'] },
                                        { $eq: ['$settlementStatus', 'settled'] },
                                        { $ifNull: ['$availableForPayout', false] },
                                        { $ne: [{ $ifNull: ['$settledInPayout', false] }, true] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    in_payouts: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$status', 'paid'] },
                                        { $eq: ['$settlementStatus', 'settled'] },
                                        { $ifNull: ['$settledInPayout', false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    available_balance: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$status', 'paid'] },
                                        { $eq: ['$settlementStatus', 'settled'] },
                                        { $ifNull: ['$availableForPayout', false] },
                                        { $ne: [{ $ifNull: ['$settledInPayout', false] }, true] }
                                    ]
                                },
                                { $ifNull: ['$netAmount', { $subtract: ['$amount', { $ifNull: ['$commission', 0] }] }] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const txStats = transactionStats[0] || {
            total: 0, paid: 0, failed: 0, pending: 0, settled: 0, unsettled: 0,
            total_revenue: 0, total_refunded: 0, total_commission: 0,
            available_for_payout: 0, in_payouts: 0, available_balance: 0
        };

        // Use aggregation for payout stats
        const payoutStats = await Payout.aggregate([
            { $match: payoutDateFilter },
            {
                $group: {
                    _id: null,
                    total_requests: { $sum: 1 },
                    requested: { $sum: { $cond: [{ $eq: ['$status', 'requested'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $in: ['$status', ['pending', 'processing']] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                    failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    total_amount_requested: { $sum: { $ifNull: ['$amount', 0] } },
                    total_completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$netAmount', '$amount'] }, 0] }
                    },
                    total_pending: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['requested', 'pending', 'processing']] },
                                { $ifNull: ['$netAmount', '$amount'] },
                                0
                            ]
                        }
                    },
                    total_commission: { $sum: { $ifNull: ['$commission', 0] } }
                }
            }
        ]);

        const pStats = payoutStats[0] || {
            total_requests: 0, requested: 0, pending: 0, completed: 0, rejected: 0, failed: 0,
            total_amount_requested: 0, total_completed: 0, total_pending: 0, total_commission: 0
        };

        // Calculate ALL-TIME commission totals using aggregation (without date filters)
        const allTimePayinStats = await Transaction.aggregate([
            { $match: { status: 'paid' } },
            {
                $group: {
                    _id: null,
                    total_commission: { $sum: { $ifNull: ['$commission', 0] } }
                }
            }
        ]);
        const allTimePayinCommission = allTimePayinStats[0]?.total_commission || 0;

        const allTimePayoutStats = await Payout.aggregate([
            {
                $group: {
                    _id: null,
                    total_commission: { $sum: { $ifNull: ['$commission', 0] } }
                }
            }
        ]);
        const allTimePayoutCommission = allTimePayoutStats[0]?.total_commission || 0;

        // Today's stats (using IST) - use aggregation
        const { getIstDayRange } = require('../utils/getIstDayRange');
        const { start: todayStart, end: todayEnd } = getIstDayRange();
        
        const todayTransactionFilter = { ...transactionDateFilter };
        if (todayTransactionFilter.createdAt) {
            todayTransactionFilter.createdAt.$gte = new Date(Math.max(
                todayTransactionFilter.createdAt.$gte?.getTime() || 0,
                todayStart.getTime()
            ));
            todayTransactionFilter.createdAt.$lte = new Date(Math.min(
                todayTransactionFilter.createdAt.$lte?.getTime() || Infinity,
                todayEnd.getTime()
            ));
        } else {
            todayTransactionFilter.createdAt = { $gte: todayStart, $lte: todayEnd };
        }

        const todayStats = await Transaction.aggregate([
            { $match: todayTransactionFilter },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
                    commission: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, { $ifNull: ['$commission', 0] }, 0] } }
                }
            }
        ]);
        const todayTx = todayStats[0] || { count: 0, revenue: 0, commission: 0 };

        const todayPayoutFilter = { ...payoutDateFilter };
        if (todayPayoutFilter.createdAt) {
            todayPayoutFilter.createdAt.$gte = new Date(Math.max(
                todayPayoutFilter.createdAt.$gte?.getTime() || 0,
                todayStart.getTime()
            ));
            todayPayoutFilter.createdAt.$lte = new Date(Math.min(
                todayPayoutFilter.createdAt.$lte?.getTime() || Infinity,
                todayEnd.getTime()
            ));
        } else {
            todayPayoutFilter.createdAt = { $gte: todayStart, $lte: todayEnd };
        }

        const todayPayoutStats = await Payout.aggregate([
            { $match: todayPayoutFilter },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    commission: { $sum: { $ifNull: ['$commission', 0] } },
                    amount: { $sum: { $ifNull: ['$amount', 0] } }
                }
            }
        ]);
        const todayP = todayPayoutStats[0] || { count: 0, commission: 0, amount: 0 };

        // This week stats - use aggregation
        const weekStart = new Date(Math.max(oneWeekAgo.getTime(), transactionDateFilter.createdAt?.$gte?.getTime() || oneWeekAgo.getTime()));
        const weekFilter = { ...transactionDateFilter };
        if (weekFilter.createdAt) {
            weekFilter.createdAt.$gte = weekStart;
        } else {
            weekFilter.createdAt = { $gte: weekStart };
        }

        const weekStats = await Transaction.aggregate([
            { $match: weekFilter },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } }
                }
            }
        ]);
        const weekTx = weekStats[0] || { count: 0, revenue: 0 };

        // Response
        res.json({
            success: true,
            stats: {
                merchants: {
                    total: merchantsCount,
                    active: activeMerchantsCount,
                    inactive: inactiveMerchantsCount,
                    new_this_week: newMerchantsThisWeek
                },
                
                transactions: {
                    total: txStats.total,
                    paid: txStats.paid,
                    pending: txStats.pending,
                    failed: txStats.failed,
                    settled: txStats.settled,
                    unsettled: txStats.unsettled,
                    today: todayTx.count,
                    this_week: weekTx.count,
                    success_rate: txStats.total > 0 
                        ? ((txStats.paid / txStats.total) * 100).toFixed(2) 
                        : 0
                },
                
                revenue: {
                    total: txStats.total_revenue.toFixed(2),
                    commission_earned: txStats.total_commission.toFixed(2),
                    net_revenue: (txStats.total_revenue - txStats.total_commission).toFixed(2),
                    refunded: txStats.total_refunded.toFixed(2),
                    today: todayTx.revenue.toFixed(2),
                    this_week: weekTx.revenue.toFixed(2),
                    average_transaction: txStats.paid > 0 
                        ? (txStats.total_revenue / txStats.paid).toFixed(2) 
                        : 0
                },
                
                payouts: {
                    total_requests: pStats.total_requests,
                    requested: pStats.requested,
                    pending: pStats.pending,
                    completed: pStats.completed,
                    rejected: pStats.rejected,
                    failed: pStats.failed,
                    total_amount_requested: pStats.total_amount_requested.toFixed(2),
                    total_completed: pStats.total_completed.toFixed(2),
                    total_pending: pStats.total_pending.toFixed(2),
                    commission_earned: pStats.total_commission.toFixed(2),
                    today: todayP.count
                },
                
                settlement: {
                    settled_transactions: txStats.settled,
                    unsettled_transactions: txStats.unsettled,
                    available_for_payout: txStats.available_for_payout,
                    in_payouts: txStats.in_payouts,
                    available_balance: txStats.available_balance.toFixed(2)
                },
                
                platform: {
                    total_commission_earned: (txStats.total_commission + pStats.total_commission).toFixed(2),
                    payin_commission: txStats.total_commission.toFixed(2),
                    payout_commission: pStats.total_commission.toFixed(2),
                    net_platform_revenue: (txStats.total_commission + pStats.total_commission - pStats.total_completed).toFixed(2),
                    today_payin_commission: todayTx.commission.toFixed(2),
                    today_payout_commission: todayP.commission.toFixed(2),
                    today_total_commission: (todayTx.commission + todayP.commission).toFixed(2)
                },
                
                commission: {
                    today_payin: todayTx.commission.toFixed(2),
                    today_payout: todayP.commission.toFixed(2),
                    today_total: (todayTx.commission + todayP.commission).toFixed(2),
                    // Filtered period commission
                    filtered_payin: txStats.total_commission.toFixed(2),
                    filtered_payout: pStats.total_commission.toFixed(2),
                    filtered_total: (txStats.total_commission + pStats.total_commission).toFixed(2),
                    // All-time commission (always calculated without date filters)
                    total_payin: allTimePayinCommission.toFixed(2),
                    total_payout: allTimePayoutCommission.toFixed(2),
                    total_all: (allTimePayinCommission + allTimePayoutCommission).toFixed(2)
                }
            },
            timestamp: new Date()
        });

        console.log(`✅ Dashboard stats sent to SuperAdmin`);

    } catch (error) {
        console.error('❌ Get Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard statistics'
        });
    }
};

// ============ GET ALL MERCHANTS WITH COMPREHENSIVE DATA ============
exports.getAllMerchantsData = async (req, res) => {
    try {
        console.log(`📊 SuperAdmin ${req.user.name} fetching all merchants comprehensive data`);

        const { 
            merchantId, 
            status: merchantStatus,
            includeInactive = 'false',
            startDate,
            endDate
        } = req.query;

        // Build date filter for transactions and payouts
        let transactionDateFilter = {};
        let payoutDateFilter = {};

        if (startDate || endDate) {
            transactionDateFilter.createdAt = {};
            payoutDateFilter.createdAt = {};
            
            if (startDate) {
                const sd = new Date(startDate);
                sd.setHours(0, 0, 0, 0);
                transactionDateFilter.createdAt.$gte = sd;
                payoutDateFilter.createdAt.$gte = sd;
            }
            if (endDate) {
                const ed = new Date(endDate);
                ed.setHours(23, 59, 59, 999);
                transactionDateFilter.createdAt.$lte = ed;
                payoutDateFilter.createdAt.$lte = ed;
            }
        }

        // Build merchant query
        let merchantQuery = { role: 'admin' };
        if (merchantId) {
            merchantQuery._id = new mongoose.Types.ObjectId(merchantId);
        }
        if (merchantStatus) {
            merchantQuery.status = merchantStatus;
        }
        if (includeInactive !== 'true') {
            merchantQuery.status = merchantQuery.status || 'active';
        }

        // Get all merchants
        const merchants = await User.find(merchantQuery).lean();

        if (!merchants || merchants.length === 0) {
            return res.json({
                success: true,
                merchants: [],
                summary: {
                    total_merchants: 0,
                    active_merchants: 0,
                    inactive_merchants: 0
                }
            });
        }

        // Get merchant IDs for aggregation
        const merchantIds = merchants.map(m => m._id);

        // ========== TRANSACTION AGGREGATIONS ==========
        // Overall transaction stats with date filter
        const transactionMatch = { merchantId: { $in: merchantIds } };
        if (Object.keys(transactionDateFilter).length > 0) {
            Object.assign(transactionMatch, transactionDateFilter);
        }
        
        const transactionStats = await Transaction.aggregate([
            { $match: transactionMatch },
            {
                $group: {
                    _id: '$merchantId',
                    // Counts by status
                    total_transactions: { $sum: 1 },
                    paid_count: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                    failed_count: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    pending_count: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    created_count: { $sum: { $cond: [{ $eq: ['$status', 'created'] }, 1, 0] } },
                    cancelled_count: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    refunded_count: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
                    partial_refund_count: { $sum: { $cond: [{ $eq: ['$status', 'partial_refund'] }, 1, 0] } },
                    
                    // Settlement counts
                    settled_count: { $sum: { $cond: [{ $eq: ['$settlementStatus', 'settled'] }, 1, 0] } },
                    unsettled_count: { $sum: { $cond: [{ $eq: ['$settlementStatus', 'unsettled'] }, 1, 0] } },
                    on_hold_count: { $sum: { $cond: [{ $eq: ['$settlementStatus', 'on_hold'] }, 1, 0] } },
                    
                    // Amounts
                    total_revenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
                    total_refunded: { $sum: { $ifNull: ['$refundAmount', 0] } },
                    total_commission: { $sum: { $ifNull: ['$commission', 0] } },
                    settled_revenue: { 
                        $sum: { 
                            $cond: [
                                { $and: [
                                    { $eq: ['$status', 'paid'] },
                                    { $eq: ['$settlementStatus', 'settled'] }
                                ]}, 
                                '$amount', 
                                0
                            ] 
                        } 
                    },
                    unsettled_revenue: { 
                        $sum: { 
                            $cond: [
                                { $and: [
                                    { $eq: ['$status', 'paid'] },
                                    { $eq: ['$settlementStatus', 'unsettled'] }
                                ]}, 
                                '$amount', 
                                0
                            ] 
                        } 
                    },
                    settled_commission: { 
                        $sum: { 
                            $cond: [
                                { $and: [
                                    { $eq: ['$status', 'paid'] },
                                    { $eq: ['$settlementStatus', 'settled'] }
                                ]}, 
                                { $ifNull: ['$commission', 0] }, 
                                0
                            ] 
                        } 
                    },
                    unsettled_commission: { 
                        $sum: { 
                            $cond: [
                                { $and: [
                                    { $eq: ['$status', 'paid'] },
                                    { $eq: ['$settlementStatus', 'unsettled'] }
                                ]}, 
                                { $ifNull: ['$commission', 0] }, 
                                0
                            ] 
                        } 
                    },
                    settled_refunded: {
                        $sum: {
                            $cond: [
                                { $eq: ['$settlementStatus', 'settled'] },
                                { $ifNull: ['$refundAmount', 0] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Payment gateway breakdown
        const gatewayStats = await Transaction.aggregate([
            { $match: { merchantId: { $in: merchantIds }, status: 'paid' } },
            {
                $group: {
                    _id: { merchantId: '$merchantId', gateway: '$paymentGateway' },
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' },
                    commission: { $sum: { $ifNull: ['$commission', 0] } }
                }
            },
            {
                $group: {
                    _id: '$_id.merchantId',
                    gateways: {
                        $push: {
                            gateway: '$_id.gateway',
                            count: '$count',
                            amount: '$amount',
                            commission: '$commission'
                        }
                    }
                }
            }
        ]);

        // Payment method breakdown
        const methodStats = await Transaction.aggregate([
            { $match: { merchantId: { $in: merchantIds }, status: 'paid' } },
            {
                $group: {
                    _id: { merchantId: '$merchantId', method: '$paymentMethod' },
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.merchantId',
                    methods: {
                        $push: {
                            method: '$_id.method',
                            count: '$count',
                            amount: '$amount'
                        }
                    }
                }
            }
        ]);

        // Today's stats (IST)
        const today = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const todayStart = new Date(new Date(today.getTime() + istOffset).setHours(0, 0, 0, 0) - istOffset);
        const todayEnd = new Date(new Date(today.getTime() + istOffset).setHours(23, 59, 59, 999) - istOffset);

        const todayStats = await Transaction.aggregate([
            {
                $match: {
                    merchantId: { $in: merchantIds },
                    status: 'paid',
                    $or: [
                        { createdAt: { $gte: todayStart, $lte: todayEnd } },
                        { updatedAt: { $gte: todayStart, $lte: todayEnd } }
                    ]
                }
            },
            {
                $group: {
                    _id: '$merchantId',
                    today_count: { $sum: 1 },
                    today_revenue: { $sum: '$amount' },
                    today_commission: { $sum: { $ifNull: ['$commission', 0] } }
                }
            }
        ]);

        // This week stats
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekStats = await Transaction.aggregate([
            {
                $match: {
                    merchantId: { $in: merchantIds },
                    status: 'paid',
                    createdAt: { $gte: oneWeekAgo }
                }
            },
            {
                $group: {
                    _id: '$merchantId',
                    week_count: { $sum: 1 },
                    week_revenue: { $sum: '$amount' },
                    week_commission: { $sum: { $ifNull: ['$commission', 0] } }
                }
            }
        ]);

        // This month stats
        const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const monthStats = await Transaction.aggregate([
            {
                $match: {
                    merchantId: { $in: merchantIds },
                    status: 'paid',
                    createdAt: { $gte: oneMonthAgo }
                }
            },
            {
                $group: {
                    _id: '$merchantId',
                    month_count: { $sum: 1 },
                    month_revenue: { $sum: '$amount' },
                    month_commission: { $sum: { $ifNull: ['$commission', 0] } }
                }
            }
        ]);

        // ========== PAYOUT AGGREGATIONS ==========
        const payoutMatch = { merchantId: { $in: merchantIds } };
        if (Object.keys(payoutDateFilter).length > 0) {
            Object.assign(payoutMatch, payoutDateFilter);
        }
        
        const payoutStats = await Payout.aggregate([
            { $match: payoutMatch },
            {
                $group: {
                    _id: '$merchantId',
                    total_payouts: { $sum: 1 },
                    requested_count: { $sum: { $cond: [{ $eq: ['$status', 'requested'] }, 1, 0] } },
                    pending_count: { $sum: { $cond: [{ $in: ['$status', ['pending', 'processing']] }, 1, 0] } },
                    completed_count: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    rejected_count: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                    failed_count: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    cancelled_count: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    
                    total_payout_amount_requested: { $sum: '$amount' },
                    total_payout_commission: { $sum: { $ifNull: ['$commission', 0] } },
                    total_payout_completed: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$netAmount', 0] }, 0]
                        }
                    },
                    total_payout_pending: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['requested', 'pending', 'processing']] },
                                { $ifNull: ['$netAmount', 0] },
                                0
                            ]
                        }
                    },
                    total_payout_rejected: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'rejected'] }, { $ifNull: ['$netAmount', 0] }, 0]
                        }
                    }
                }
            }
        ]);

        // Payout commission breakdown by type
        const payoutCommissionBreakdown = await Payout.aggregate([
            { $match: { merchantId: { $in: merchantIds } } },
            {
                $group: {
                    _id: { merchantId: '$merchantId', commissionType: '$commissionType' },
                    count: { $sum: 1 },
                    total_commission: { $sum: { $ifNull: ['$commission', 0] } },
                    total_amount: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.merchantId',
                    commission_types: {
                        $push: {
                            type: '$_id.commissionType',
                            count: '$count',
                            total_commission: '$total_commission',
                            total_amount: '$total_amount'
                        }
                    }
                }
            }
        ]);

        // ========== CREATE MERCHANT DATA MAPS ==========
        const transactionMap = {};
        transactionStats.forEach(stat => {
            transactionMap[stat._id.toString()] = stat;
        });

        const gatewayMap = {};
        gatewayStats.forEach(stat => {
            gatewayMap[stat._id.toString()] = stat.gateways;
        });

        const methodMap = {};
        methodStats.forEach(stat => {
            methodMap[stat._id.toString()] = stat.methods;
        });

        const todayMap = {};
        todayStats.forEach(stat => {
            todayMap[stat._id.toString()] = stat;
        });

        const weekMap = {};
        weekStats.forEach(stat => {
            weekMap[stat._id.toString()] = stat;
        });

        const monthMap = {};
        monthStats.forEach(stat => {
            monthMap[stat._id.toString()] = stat;
        });

        const payoutMap = {};
        payoutStats.forEach(stat => {
            payoutMap[stat._id.toString()] = stat;
        });

        const payoutCommissionMap = {};
        payoutCommissionBreakdown.forEach(stat => {
            payoutCommissionMap[stat._id.toString()] = stat.commission_types;
        });

        // ========== BUILD MERCHANT DOCUMENTS ==========
        const merchantsData = merchants.map(merchant => {
            const merchantIdStr = merchant._id.toString();
            const txnStat = transactionMap[merchantIdStr] || {};
            const payoutStat = payoutMap[merchantIdStr] || {};
            const todayStat = todayMap[merchantIdStr] || {};
            const weekStat = weekMap[merchantIdStr] || {};
            const monthStat = monthMap[merchantIdStr] || {};

            // Calculate balance information
            const settledRevenue = parseFloat((txnStat.settled_revenue || 0).toFixed(2));
            const settledCommission = parseFloat((txnStat.settled_commission || 0).toFixed(2));
            const settledRefunded = parseFloat((txnStat.settled_refunded || 0).toFixed(2));
            
            const settledNetRevenue = settledRevenue - settledRefunded - settledCommission;
            
            const totalPaidOut = parseFloat((payoutStat.total_payout_completed || 0).toFixed(2));
            const totalPendingPayout = parseFloat((payoutStat.total_payout_pending || 0).toFixed(2));
            const blockedBalance = parseFloat((merchant.blockedBalance || 0).toFixed(2));
            
            const availableBalance = Math.max(0, parseFloat((settledNetRevenue - totalPaidOut - totalPendingPayout - blockedBalance).toFixed(2)));

            // Calculate success rate
            const totalTxn = txnStat.total_transactions || 0;
            const paidTxn = txnStat.paid_count || 0;
            const successRate = totalTxn > 0 ? parseFloat(((paidTxn / totalTxn) * 100).toFixed(2)) : 0;

            // Average transaction value
            const avgTransactionValue = paidTxn > 0 
                ? parseFloat(((txnStat.total_revenue || 0) / paidTxn).toFixed(2))
                : 0;

            // Build merchant document
            return {
                merchant_id: merchant._id.toString(),
                merchant_info: {
                    name: merchant.name,
                    email: merchant.email,
                    business_name: merchant.businessName || merchant.name,
                    business_details: merchant.businessDetails || {},
                    status: merchant.status || 'active',
                    role: merchant.role,
                    api_key_created_at: merchant.apiKeyCreatedAt || null,
                    webhook_enabled: merchant.webhookEnabled || false,
                    webhook_url: merchant.webhookUrl || null,
                    commission_rate: merchant.commissionRate || 2.5,
                    minimum_payout_amount: merchant.minimumPayoutAmount || 100,
                    free_payouts_remaining: merchant.freePayoutsUnder500 || 0,
                    created_at: merchant.createdAt,
                    updated_at: merchant.updatedAt,
                    last_login_at: merchant.lastLoginAt || null
                },

                transaction_summary: {
                    total_transactions: txnStat.total_transactions || 0,
                    by_status: {
                        paid: txnStat.paid_count || 0,
                        failed: txnStat.failed_count || 0,
                        pending: txnStat.pending_count || 0,
                        created: txnStat.created_count || 0,
                        cancelled: txnStat.cancelled_count || 0,
                        refunded: txnStat.refunded_count || 0,
                        partial_refund: txnStat.partial_refund_count || 0
                    },
                    by_settlement: {
                        settled: txnStat.settled_count || 0,
                        unsettled: txnStat.unsettled_count || 0,
                        on_hold: txnStat.on_hold_count || 0
                    },
                    success_rate: successRate,
                    average_transaction_value: avgTransactionValue
                },

                revenue_summary: {
                    total_revenue: parseFloat((txnStat.total_revenue || 0).toFixed(2)),
                    total_refunded: parseFloat((txnStat.total_refunded || 0).toFixed(2)),
                    net_revenue: parseFloat(((txnStat.total_revenue || 0) - (txnStat.total_refunded || 0)).toFixed(2)),
                    
                    settled_revenue: settledRevenue,
                    unsettled_revenue: parseFloat((txnStat.unsettled_revenue || 0).toFixed(2)),
                    
                    total_commission_paid: parseFloat((txnStat.total_commission || 0).toFixed(2)),
                    settled_commission: settledCommission,
                    unsettled_commission: parseFloat((txnStat.unsettled_commission || 0).toFixed(2)),
                    
                    settled_net_revenue: settledNetRevenue,
                    unsettled_net_revenue: parseFloat(((txnStat.unsettled_revenue || 0) - (txnStat.unsettled_commission || 0)).toFixed(2))
                },

                payout_summary: {
                    total_payouts: payoutStat.total_payouts || 0,
                    by_status: {
                        requested: payoutStat.requested_count || 0,
                        pending: payoutStat.pending_count || 0,
                        completed: payoutStat.completed_count || 0,
                        rejected: payoutStat.rejected_count || 0,
                        failed: payoutStat.failed_count || 0,
                        cancelled: payoutStat.cancelled_count || 0
                    },
                    total_amount_requested: parseFloat((payoutStat.total_payout_amount_requested || 0).toFixed(2)),
                    total_commission_charged: parseFloat((payoutStat.total_payout_commission || 0).toFixed(2)),
                    total_completed: totalPaidOut,
                    total_pending: totalPendingPayout,
                    total_rejected: parseFloat((payoutStat.total_payout_rejected || 0).toFixed(2)),
                    commission_breakdown: payoutCommissionMap[merchantIdStr] || []
                },

                balance_information: {
                    settled_revenue: settledRevenue,
                    settled_refunded: settledRefunded,
                    settled_commission: settledCommission,
                    settled_net_revenue: settledNetRevenue,
                    total_paid_out: totalPaidOut,
                    pending_payouts: totalPendingPayout,
                    blocked_balance: blockedBalance,
                    available_balance: availableBalance,
                    can_request_payout: availableBalance > 0,
                    minimum_payout_amount: merchant.minimumPayoutAmount || 100
                },

                time_based_stats: {
                    today: {
                        transactions: todayStat.today_count || 0,
                        revenue: parseFloat((todayStat.today_revenue || 0).toFixed(2)),
                        commission: parseFloat((todayStat.today_commission || 0).toFixed(2)),
                        net_revenue: parseFloat(((todayStat.today_revenue || 0) - (todayStat.today_commission || 0)).toFixed(2))
                    },
                    this_week: {
                        transactions: weekStat.week_count || 0,
                        revenue: parseFloat((weekStat.week_revenue || 0).toFixed(2)),
                        commission: parseFloat((weekStat.week_commission || 0).toFixed(2)),
                        net_revenue: parseFloat(((weekStat.week_revenue || 0) - (weekStat.week_commission || 0)).toFixed(2))
                    },
                    this_month: {
                        transactions: monthStat.month_count || 0,
                        revenue: parseFloat((monthStat.month_revenue || 0).toFixed(2)),
                        commission: parseFloat((monthStat.month_commission || 0).toFixed(2)),
                        net_revenue: parseFloat(((monthStat.month_revenue || 0) - (monthStat.month_commission || 0)).toFixed(2))
                    }
                },

                payment_gateway_breakdown: gatewayMap[merchantIdStr] || [],
                payment_method_breakdown: methodMap[merchantIdStr] || [],

                platform_earnings: {
                    total_payin_commission: parseFloat((txnStat.total_commission || 0).toFixed(2)),
                    total_payout_commission: parseFloat((payoutStat.total_payout_commission || 0).toFixed(2)),
                    total_platform_commission: parseFloat(((txnStat.total_commission || 0) + (payoutStat.total_payout_commission || 0)).toFixed(2))
                }
            };
        });

        // Calculate platform-wide summary
        const platformSummary = {
            total_merchants: merchants.length,
            active_merchants: merchants.filter(m => m.status === 'active').length,
            inactive_merchants: merchants.filter(m => m.status === 'inactive').length,
            total_revenue: merchantsData.reduce((sum, m) => sum + m.revenue_summary.total_revenue, 0).toFixed(2),
            total_commission: merchantsData.reduce((sum, m) => sum + m.platform_earnings.total_platform_commission, 0).toFixed(2),
            total_payouts_completed: merchantsData.reduce((sum, m) => sum + m.payout_summary.total_completed, 0).toFixed(2)
        };

        res.json({
            success: true,
            merchants: merchantsData,
            summary: platformSummary,
            timestamp: new Date().toISOString(),
            count: merchantsData.length
        });

        console.log(`✅ Returned comprehensive data for ${merchantsData.length} merchants to SuperAdmin`);

    } catch (error) {
        console.error('❌ Get All Merchants Data Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch merchants comprehensive data',
            detail: error.message
        });
    }
};

// ============ GET SETTLEMENT SETTINGS ============
exports.getSettlementSettings = async (req, res) => {
    try {
        console.log(`⚙️ ${req.user.role === 'superAdmin' ? 'SuperAdmin' : 'Sub-SuperAdmin'} ${req.user.name} fetching settlement settings`);

        const settings = await Settings.getSettings();
        // Ensure settlementMinutes is set to 20 if not present or if it's still 25 (old default)
        if (!settings.settlement) {
            settings.settlement = {
                settlementDays: 1,
                settlementMinutes: 20,
                settlementHour: 16,
                settlementMinute: 0,
                cutoffHour: 16,
                cutoffMinute: 0,
                skipWeekends: false,
                cronSchedule: '*/15 * * * 1-6'
            };
            await settings.save();
        } else if (settings.settlement.settlementMinutes === undefined || settings.settlement.settlementMinutes === null || settings.settlement.settlementMinutes === 25) {
            // Update to 20 if it's missing or still set to old default of 25
            settings.settlement.settlementMinutes = 20;
            settings.markModified('settlement');
            await settings.save();
        }
        
        const settlementSettings = settings.settlement;

        res.json({
            success: true,
            settlement: settlementSettings,
            updated_at: settings.updatedAt,
            updated_by: settings.updatedBy
        });

    } catch (error) {
        console.error('❌ Get Settlement Settings Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settlement settings',
            detail: error.message
        });
    }
};

// ============ UPDATE SETTLEMENT SETTINGS ============
exports.updateSettlementSettings = async (req, res) => {
    try {
        const { settlement } = req.body;

        console.log(`⚙️ ${req.user.role === 'superAdmin' ? 'SuperAdmin' : 'Sub-SuperAdmin'} ${req.user.name} updating settlement settings`);
        console.log('   Settlement settings:', settlement);

        if (!settlement || typeof settlement !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid settlement data. Must be an object.'
            });
        }

        // Get current settings
        const settings = await Settings.getSettings();

        // Initialize settlement if not exists
        if (!settings.settlement) {
            settings.settlement = {
                settlementDays: 1,
                settlementMinutes: 20,
                settlementHour: 16,
                settlementMinute: 0,
                cutoffHour: 16,
                cutoffMinute: 0,
                skipWeekends: false
            };
        }

        // Validate and update settlement settings
        // NEW: Settlement minutes (time-based settlement)
        if (typeof settlement.settlementMinutes === 'number' && settlement.settlementMinutes >= 1 && settlement.settlementMinutes <= 1440) {
            settings.settlement.settlementMinutes = settlement.settlementMinutes;
        }
        
        // Legacy: Settlement days (for backward compatibility)
        if (typeof settlement.settlementDays === 'number' && settlement.settlementDays >= 0) {
            settings.settlement.settlementDays = settlement.settlementDays;
        }

        if (typeof settlement.settlementHour === 'number' && settlement.settlementHour >= 0 && settlement.settlementHour <= 23) {
            settings.settlement.settlementHour = settlement.settlementHour;
        }

        if (typeof settlement.settlementMinute === 'number' && settlement.settlementMinute >= 0 && settlement.settlementMinute <= 59) {
            settings.settlement.settlementMinute = settlement.settlementMinute;
        }

        if (typeof settlement.cutoffHour === 'number' && settlement.cutoffHour >= 0 && settlement.cutoffHour <= 23) {
            settings.settlement.cutoffHour = settlement.cutoffHour;
        }

        if (typeof settlement.cutoffMinute === 'number' && settlement.cutoffMinute >= 0 && settlement.cutoffMinute <= 59) {
            settings.settlement.cutoffMinute = settlement.cutoffMinute;
        }

        if (typeof settlement.skipWeekends === 'boolean') {
            settings.settlement.skipWeekends = settlement.skipWeekends;
        }

        if (typeof settlement.cronSchedule === 'string' && settlement.cronSchedule.trim()) {
            // Validate cron expression (simple validation)
            const cronSchedule = settlement.cronSchedule.trim();
            if (!validateCronExpression(cronSchedule)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid cron expression. Expected format: "*/{minutes} * * * 1-6" (e.g., "*/15 * * * 1-6")',
                    detail: 'Cron expression must match pattern: */{number} * * * 1-6'
                });
            }
            settings.settlement.cronSchedule = cronSchedule;
        }

        // Update metadata
        settings.updatedBy = req.user._id;
        settings.updatedAt = new Date();

        // Mark settlement as modified
        settings.markModified('settlement');

        await settings.save();

        // Restart settlement job if cron schedule changed
        const { restartSettlementJob } = require('../jobs/settlementJob');
        try {
            await restartSettlementJob();
            console.log('✅ Settlement job restarted with new schedule');
        } catch (jobError) {
            console.error('⚠️ Warning: Failed to restart settlement job:', jobError.message);
            // Don't fail the request if job restart fails
        }

        console.log('✅ Settlement settings updated successfully');

        res.json({
            success: true,
            message: 'Settlement settings updated successfully',
            settlement: settings.settlement,
            updated_at: settings.updatedAt,
            updated_by: settings.updatedBy
        });

    } catch (error) {
        console.error('❌ Update Settlement Settings Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update settlement settings',
            detail: error.message
        });
    }
};

// ============ GET PAYMENT GATEWAY SETTINGS ============
exports.getPaymentGatewaySettings = async (req, res) => {
    try {
        console.log(`⚙️ SuperAdmin ${req.user.name} fetching payment gateway settings`);

        const settings = await Settings.getSettings();
        const enabledGateways = settings.getEnabledGateways();
        
        // Use round-robin rotation
        const activeGateway = settings.getCurrentActiveGateway();
        const lastUsedIndex = settings.roundRobinRotation?.lastUsedGatewayIndex ?? -1;

        // Convert Map to object for JSON response
        const customCountsObj = {};
        if (settings.roundRobinRotation?.customCounts) {
            settings.roundRobinRotation.customCounts.forEach((value, key) => {
                customCountsObj[key] = value;
            });
        }

        res.json({
            success: true,
            payment_gateways: settings.paymentGateways,
            enabled_gateways: enabledGateways,
            rotation_mode: 'round-robin',
            round_robin_rotation: {
                enabled: settings.roundRobinRotation?.enabled !== false, // Default to true
                current_active_gateway: activeGateway,
                last_used_gateway_index: lastUsedIndex,
                enabled_gateways: enabledGateways,
                custom_counts: customCountsObj,
                current_rotation_state: settings.roundRobinRotation?.currentRotationState || {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                }
            },
            updated_at: settings.updatedAt,
            updated_by: settings.updatedBy
        });

    } catch (error) {
        console.error('❌ Get Payment Gateway Settings Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment gateway settings',
            detail: error.message
        });
    }
};

// ============ UPDATE PAYMENT GATEWAY SETTINGS ============
exports.updatePaymentGatewaySettings = async (req, res) => {
    try {
        const { payment_gateways, round_robin_enabled, custom_counts } = req.body;

        console.log(`⚙️ SuperAdmin ${req.user.name} updating payment gateway settings`);
        console.log('   Round-robin enabled:', round_robin_enabled);
        console.log('   Custom counts:', custom_counts);

        if (!payment_gateways || typeof payment_gateways !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment_gateways data. Must be an object.'
            });
        }

        // Get current settings
        const settings = await Settings.getSettings();

        // Validate and update each gateway
        const validGateways = ['razorpay', 'paytm', 'phonepe', 'easebuzz', 'sabpaisa', 'cashfree'];

        for (const gateway of validGateways) {
            if (payment_gateways[gateway]) {
                const gatewayConfig = payment_gateways[gateway];
                
                if (typeof gatewayConfig.enabled === 'boolean') {
                    const wasEnabled = settings.paymentGateways[gateway].enabled;
                    settings.paymentGateways[gateway].enabled = gatewayConfig.enabled;
                    
                    // Clear isDefault when disabling (for backward compatibility)
                    if (!gatewayConfig.enabled) {
                        settings.paymentGateways[gateway].isDefault = false;
                        
                        // Edge case: Clear custom count if gateway is disabled
                        if (settings.roundRobinRotation?.customCounts && settings.roundRobinRotation.customCounts.has(gateway)) {
                            settings.roundRobinRotation.customCounts.delete(gateway);
                        }
                    }
                }
                
                // Keep isDefault for backward compatibility but don't use it for selection
                if (typeof gatewayConfig.isDefault === 'boolean') {
                    settings.paymentGateways[gateway].isDefault = gatewayConfig.isDefault;
                    // Unset other defaults if this one is set
                    if (gatewayConfig.isDefault && gatewayConfig.enabled) {
                        for (const otherGateway of validGateways) {
                            if (otherGateway !== gateway) {
                                settings.paymentGateways[otherGateway].isDefault = false;
                            }
                        }
                    }
                }
            }
        }

        // Initialize round-robin rotation if not set
        if (!settings.roundRobinRotation) {
            settings.roundRobinRotation = {
                enabled: true,
                lastUsedGatewayIndex: -1,
                customCounts: new Map(),
                currentRotationState: {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                }
            };
        }
        
        // Update round-robin enabled status
        if (typeof round_robin_enabled === 'boolean') {
            settings.roundRobinRotation.enabled = round_robin_enabled;
        }
        
        // Initialize rotation if not started
        if (settings.roundRobinRotation.lastUsedGatewayIndex === undefined || settings.roundRobinRotation.lastUsedGatewayIndex === null) {
            settings.roundRobinRotation.lastUsedGatewayIndex = -1;
        }

        // Update custom counts
        if (custom_counts && typeof custom_counts === 'object') {
            const enabledGateways = settings.getEnabledGateways();
            const newCustomCounts = new Map();
            
            // Only set counts for enabled gateways
            for (const [gateway, count] of Object.entries(custom_counts)) {
                if (validGateways.includes(gateway) && enabledGateways.includes(gateway)) {
                    const numCount = parseInt(count);
                    if (!isNaN(numCount) && numCount > 0) {
                        newCustomCounts.set(gateway, numCount);
                    }
                }
            }
            
            // Edge case: If all custom counts are cleared, reset to default round-robin
            if (newCustomCounts.size === 0) {
                settings.roundRobinRotation.customCounts = new Map();
                // Reset rotation state to default round-robin
                settings.roundRobinRotation.currentRotationState = {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                };
            } else {
                settings.roundRobinRotation.customCounts = newCustomCounts;
                
                // Edge case: If current gateway in rotation state is disabled or not in custom counts, reset
                const currentState = settings.roundRobinRotation.currentRotationState;
                if (currentState && currentState.currentGateway) {
                    if (!enabledGateways.includes(currentState.currentGateway) || !newCustomCounts.has(currentState.currentGateway)) {
                        settings.roundRobinRotation.currentRotationState = {
                            currentGateway: null,
                            countUsed: 0,
                            rotationCycle: 0
                        };
                    }
                }
            }
        } else {
            // If custom_counts is not provided but was previously set, clear it
            if (settings.roundRobinRotation.customCounts && settings.roundRobinRotation.customCounts.size > 0) {
                settings.roundRobinRotation.customCounts = new Map();
                settings.roundRobinRotation.currentRotationState = {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                };
            }
        }
        
        // Ensure at least one gateway is enabled (get enabled gateways once)
        const enabledGateways = settings.getEnabledGateways();
        if (enabledGateways.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one payment gateway must be enabled'
            });
        }
        
        // Edge case: If only one gateway is enabled, reset rotation state
        if (enabledGateways.length === 1) {
            settings.roundRobinRotation.currentRotationState = {
                currentGateway: null,
                countUsed: 0,
                rotationCycle: 0
            };
            settings.roundRobinRotation.lastUsedGatewayIndex = -1;
        }

        // Update metadata
        settings.updatedBy = req.user.id;
        settings.updatedAt = new Date();

        // Mark as modified
        settings.markModified('roundRobinRotation');
        if (settings.roundRobinRotation.customCounts) {
            settings.markModified('roundRobinRotation.customCounts');
        }

        await settings.save();

        // Use round-robin rotation
        const activeGateway = settings.getCurrentActiveGateway();
        const lastUsedIndex = settings.roundRobinRotation?.lastUsedGatewayIndex ?? -1;

        // Convert Map to object for JSON response
        const customCountsObj = {};
        if (settings.roundRobinRotation?.customCounts) {
            settings.roundRobinRotation.customCounts.forEach((value, key) => {
                customCountsObj[key] = value;
            });
        }

        const rotationMode = settings.roundRobinRotation.enabled 
            ? (customCountsObj && Object.keys(customCountsObj).length > 0 ? 'custom-rotation' : 'round-robin')
            : 'disabled';

        console.log(`✅ Payment gateway settings updated. Rotation mode: ${rotationMode}. Enabled: ${enabledGateways.join(', ')}`);

        res.json({
            success: true,
            message: `Payment gateway settings updated successfully. Rotation mode: ${rotationMode}.`,
            payment_gateways: settings.paymentGateways,
            enabled_gateways: enabledGateways,
            rotation_mode: rotationMode,
            round_robin_rotation: {
                enabled: settings.roundRobinRotation.enabled !== false,
                current_active_gateway: activeGateway,
                last_used_gateway_index: lastUsedIndex,
                enabled_gateways: enabledGateways,
                custom_counts: customCountsObj,
                current_rotation_state: settings.roundRobinRotation?.currentRotationState || {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                }
            },
            updated_at: settings.updatedAt,
            updated_by: req.user.name
        });

    } catch (error) {
        console.error('❌ Update Payment Gateway Settings Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update payment gateway settings',
            detail: error.message
        });
    }
};

// ============ BLOCK/UNBLOCK MERCHANT FUNDS ============
exports.blockMerchantFunds = async (req, res) => {
    try {
        const { merchantId } = req.params;
        const { amount, action } = req.body; // action: 'block' or 'unblock'

        console.log(`🔒 SuperAdmin ${req.user.name} ${action}ing funds for merchant ${merchantId}`);

        if (!merchantId || !mongoose.Types.ObjectId.isValid(merchantId)) {
            return res.status(400).json({
                success: false,
                error: 'Valid merchantId is required'
            });
        }

        if (!action || !['block', 'unblock'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Action must be either "block" or "unblock"'
            });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be a positive number'
            });
        }

        // Find merchant
        const merchant = await User.findById(merchantId);
        if (!merchant) {
            return res.status(404).json({
                success: false,
                error: 'Merchant not found'
            });
        }

        if (merchant.role !== 'admin') {
            return res.status(400).json({
                success: false,
                error: 'User is not a merchant'
            });
        }

        const currentBlocked = merchant.blockedBalance || 0;
        let newBlockedBalance = 0;

        if (action === 'block') {
            newBlockedBalance = parseFloat((currentBlocked + amount).toFixed(2));
        } else if (action === 'unblock') {
            if (amount > currentBlocked) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot unblock ₹${amount}. Only ₹${currentBlocked} is currently blocked.`
                });
            }
            newBlockedBalance = parseFloat((currentBlocked - amount).toFixed(2));
        }

        // Update merchant
        merchant.blockedBalance = newBlockedBalance;
        await merchant.save();

        console.log(`✅ Merchant ${merchant.email} - ${action}ed ₹${amount}. New blocked balance: ₹${newBlockedBalance}`);

        res.json({
            success: true,
            message: `Successfully ${action}ed ₹${amount} for merchant ${merchant.email}`,
            merchant: {
                merchantId: merchant._id,
                email: merchant.email,
                name: merchant.name,
                blockedBalance: newBlockedBalance,
                previousBlockedBalance: currentBlocked
            }
        });

    } catch (error) {
        console.error('❌ Block/Unblock Merchant Funds Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to block/unblock merchant funds',
            detail: error.message
        });
    }
};
