const Payout = require('../models/Payout');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { calculatePayinCommission } = require('../utils/commissionCalculator');
const { sendMerchantWebhook, sendPayoutWebhook } = require('./merchantWebhookController');
const mongoose = require('mongoose');
const COMMISSION_RATE = 0.038; // 3.8%

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
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
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
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
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

        // Calculate platform-wide statistics
        const allTransactions = await Transaction.find({});
        const successfulTransactions = allTransactions.filter(t => t.status === 'paid');
        const totalRevenue = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalRefunded = allTransactions.reduce((sum, t) => sum + (t.refundAmount || 0), 0);
        
        // Calculate commission (default 2.5%)
        const totalCommission = totalRevenue * 0.025;
        const netRevenue = totalRevenue - totalRefunded;

        // Merchant-wise breakdown
        const merchantStats = {};
        allTransactions.forEach(t => {
            if (!merchantStats[t.merchantId]) {
                merchantStats[t.merchantId] = {
                    merchantId: t.merchantId,
                    merchantName: t.merchantName,
                    totalTransactions: 0,
                    successfulTransactions: 0,
                    totalVolume: 0,
                    commission: 0
                };
            }
            merchantStats[t.merchantId].totalTransactions++;
            if (t.status === 'paid') {
                merchantStats[t.merchantId].successfulTransactions++;
                merchantStats[t.merchantId].totalVolume += t.amount;
                merchantStats[t.merchantId].commission += t.amount * 0.025;
            }
        });

        const topMerchants = Object.values(merchantStats)
            .sort((a, b) => b.totalVolume - a.totalVolume)
            .slice(0, 10);

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
            },
            summary: {
                total_transactions: allTransactions.length,
                successful_transactions: successfulTransactions.length,
                failed_transactions: allTransactions.filter(t => t.status === 'failed').length,
                pending_transactions: allTransactions.filter(t => t.status === 'pending' || t.status === 'created').length,
                total_revenue: totalRevenue.toFixed(2),
                total_refunded: totalRefunded.toFixed(2),
                net_revenue: netRevenue.toFixed(2),
                total_commission_earned: totalCommission.toFixed(2),
                success_rate: allTransactions.length > 0 ? 
                    ((successfulTransactions.length / allTransactions.length) * 100).toFixed(2) : 0,
                average_transaction_value: allTransactions.length > 0 ? 
                    (totalRevenue / allTransactions.length).toFixed(2) : 0
            },
            merchant_stats: {
                total_merchants: Object.keys(merchantStats).length,
                top_merchants: topMerchants
            },
            filters_applied: {
                merchantId: merchantId || null,
                status: status || null,
                dateRange: startDate && endDate ? `${startDate} to ${endDate}` : null,
                amountRange: minAmount || maxAmount ? `${minAmount || 0} to ${maxAmount || '∞'}` : null,
                search: search || null
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

        // If setting to 'paid', also set paidAt
        if (status === 'paid' && !transaction.paidAt) {
            updateOperation.$set.paidAt = new Date();
        }

        // If changing from 'paid' to another status, remove paidAt
        if (transaction.status === 'paid' && status !== 'paid') {
            updateOperation.$unset = { paidAt: "" };
        }

        const updatedTransaction = await Transaction.findOneAndUpdate(
            { transactionId: transactionId },
            updateOperation,
            { new: true }
        ).populate('merchantId', 'name email');

        console.log(`✅ Super Admin updated transaction ${transactionId} status from '${transaction.status}' to '${status}'`);

        res.json({
            success: true,
            message: `Transaction status updated successfully`,
            transaction: {
                transactionId: updatedTransaction.transactionId,
                orderId: updatedTransaction.orderId,
                status: updatedTransaction.status,
                amount: updatedTransaction.amount,
                currency: updatedTransaction.currency,
                merchantName: updatedTransaction.merchantName,
                customerName: updatedTransaction.customerName,
                paidAt: updatedTransaction.paidAt,
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


 // controllers/superadminController.js

// ============ GET DASHBOARD STATISTICS ============
exports.getDashboardStats = async (req, res) => {
    try {
        console.log(`📊 SuperAdmin ${req.user.name} fetching dashboard statistics`);

        // Get all merchants
        const merchants = await User.find({ role: 'admin' });
        const activeMerchants = merchants.filter(m => m.status === 'active');
        const inactiveMerchants = merchants.filter(m => m.status === 'inactive');

        // Get all transactions
        const allTransactions = await Transaction.find({});
        const paidTransactions = allTransactions.filter(t => t.status === 'paid');
        const settledTransactions = allTransactions.filter(t => t.settlementStatus === 'settled');
        const unsettledTransactions = allTransactions.filter(t => t.settlementStatus === 'unsettled');
        const failedTransactions = allTransactions.filter(t => t.status === 'failed');
        const pendingTransactions = allTransactions.filter(t => t.status === 'pending' || t.status === 'created');

        // Calculate revenue
        const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalRefunded = allTransactions.reduce((sum, t) => sum + (t.refundAmount || 0), 0);
        
        // Calculate commission
        let totalPayinCommission = 0;
        paidTransactions.forEach(t => {
            const commissionInfo = calculatePayinCommission(t.amount);
            totalPayinCommission += commissionInfo.commission;
        });

        // Get all payouts
        const allPayouts = await Payout.find({});
        const requestedPayouts = allPayouts.filter(p => p.status === 'requested');
        const pendingPayouts = allPayouts.filter(p => p.status === 'pending' || p.status === 'processing');
        const completedPayouts = allPayouts.filter(p => p.status === 'completed');
        const rejectedPayouts = allPayouts.filter(p => p.status === 'rejected');
        const failedPayouts = allPayouts.filter(p => p.status === 'failed');

        // Calculate payout amounts
        const totalPayoutRequested = allPayouts.reduce((sum, p) => sum + p.amount, 0);
        const totalPayoutCompleted = completedPayouts.reduce((sum, p) => sum + p.netAmount, 0);
        const totalPayoutPending = pendingPayouts.reduce((sum, p) => sum + p.netAmount, 0);
        const totalPayoutCommission = allPayouts.reduce((sum, p) => sum + p.commission, 0);

        // Settlement info
        const availableForPayout = settledTransactions.filter(t => t.availableForPayout && !t.settledInPayout);
        const inPayouts = settledTransactions.filter(t => t.settledInPayout);

        let totalAvailableBalance = 0;
        availableForPayout.forEach(t => {
            const commissionInfo = calculatePayinCommission(t.amount);
            totalAvailableBalance += (t.amount - commissionInfo.commission);
        });

        // Today's stats (using IST)
        const { getIstDayRange } = require('../utils/getIstDayRange');
        const { start: todayStart, end: todayEnd } = getIstDayRange();
        
        const todayTransactions = allTransactions.filter(t => {
            const tDate = new Date(t.createdAt);
            return tDate >= todayStart && tDate <= todayEnd;
        });
        const todayPaidTransactions = todayTransactions.filter(t => t.status === 'paid');
        const todayRevenue = todayPaidTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate today's payin commission
        let todayPayinCommission = 0;
        todayPaidTransactions.forEach(t => {
            const commissionInfo = calculatePayinCommission(t.amount);
            todayPayinCommission += commissionInfo.commission;
        });
        
        const todayPayouts = allPayouts.filter(p => {
            const pDate = new Date(p.createdAt);
            return pDate >= todayStart && pDate <= todayEnd;
        });
        
        // Calculate today's payout commission
        const todayPayoutCommission = todayPayouts.reduce((sum, p) => sum + (p.commission || 0), 0);
        const todayPayoutAmount = todayPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

        // This week stats
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weekTransactions = allTransactions.filter(t => new Date(t.createdAt) >= oneWeekAgo);
        const weekRevenue = weekTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);

        // Response
        res.json({
            success: true,
            stats: {
                merchants: {
                    total: merchants.length,
                    active: activeMerchants.length,
                    inactive: inactiveMerchants.length,
                    new_this_week: merchants.filter(m => new Date(m.createdAt) >= oneWeekAgo).length
                },
                
                transactions: {
                    total: allTransactions.length,
                    paid: paidTransactions.length,
                    pending: pendingTransactions.length,
                    failed: failedTransactions.length,
                    settled: settledTransactions.length,
                    unsettled: unsettledTransactions.length,
                    today: todayTransactions.length,
                    this_week: weekTransactions.length,
                    success_rate: allTransactions.length > 0 
                        ? ((paidTransactions.length / allTransactions.length) * 100).toFixed(2) 
                        : 0
                },
                
                revenue: {
                    total: totalRevenue.toFixed(2),
                    commission_earned: totalPayinCommission.toFixed(2),
                    net_revenue: (totalRevenue - totalPayinCommission).toFixed(2),
                    refunded: totalRefunded.toFixed(2),
                    today: todayRevenue.toFixed(2),
                    this_week: weekRevenue.toFixed(2),
                    average_transaction: paidTransactions.length > 0 
                        ? (totalRevenue / paidTransactions.length).toFixed(2) 
                        : 0
                },
                
                payouts: {
                    total_requests: allPayouts.length,
                    requested: requestedPayouts.length,
                    pending: pendingPayouts.length,
                    completed: completedPayouts.length,
                    rejected: rejectedPayouts.length,
                    failed: failedPayouts.length,
                    total_amount_requested: totalPayoutRequested.toFixed(2),
                    total_completed: totalPayoutCompleted.toFixed(2),
                    total_pending: totalPayoutPending.toFixed(2),
                    commission_earned: totalPayoutCommission.toFixed(2),
                    today: todayPayouts.length
                },
                
                settlement: {
                    settled_transactions: settledTransactions.length,
                    unsettled_transactions: unsettledTransactions.length,
                    available_for_payout: availableForPayout.length,
                    in_payouts: inPayouts.length,
                    available_balance: totalAvailableBalance.toFixed(2)
                },
                
                platform: {
                    total_commission_earned: (totalPayinCommission + totalPayoutCommission).toFixed(2),
                    payin_commission: totalPayinCommission.toFixed(2),
                    payout_commission: totalPayoutCommission.toFixed(2),
                    net_platform_revenue: (totalPayinCommission + totalPayoutCommission - totalPayoutCompleted).toFixed(2),
                    today_payin_commission: todayPayinCommission.toFixed(2),
                    today_payout_commission: todayPayoutCommission.toFixed(2),
                    today_total_commission: (todayPayinCommission + todayPayoutCommission).toFixed(2)
                },
                
                commission: {
                    today_payin: todayPayinCommission.toFixed(2),
                    today_payout: todayPayoutCommission.toFixed(2),
                    today_total: (todayPayinCommission + todayPayoutCommission).toFixed(2),
                    total_payin: totalPayinCommission.toFixed(2),
                    total_payout: totalPayoutCommission.toFixed(2),
                    total_all: (totalPayinCommission + totalPayoutCommission).toFixed(2)
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
            includeInactive = 'false'
        } = req.query;

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
        // Overall transaction stats
        const transactionStats = await Transaction.aggregate([
            { $match: { merchantId: { $in: merchantIds } } },
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
        const payoutStats = await Payout.aggregate([
            { $match: { merchantId: { $in: merchantIds } } },
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
            
            const availableBalance = Math.max(0, parseFloat((settledNetRevenue - totalPaidOut - totalPendingPayout).toFixed(2)));

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

// ============ GET PAYMENT GATEWAY SETTINGS ============
exports.getPaymentGatewaySettings = async (req, res) => {
    try {
        console.log(`⚙️ SuperAdmin ${req.user.name} fetching payment gateway settings`);

        const settings = await Settings.getSettings();
        const defaultGateway = settings.getDefaultGateway();
        const enabledGateways = settings.getEnabledGateways();

        res.json({
            success: true,
            payment_gateways: settings.paymentGateways,
            default_gateway: defaultGateway,
            enabled_gateways: enabledGateways,
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
        const { payment_gateways } = req.body;

        console.log(`⚙️ SuperAdmin ${req.user.name} updating payment gateway settings`);

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
        let hasDefault = false;

        for (const gateway of validGateways) {
            if (payment_gateways[gateway]) {
                const gatewayConfig = payment_gateways[gateway];
                
                if (typeof gatewayConfig.enabled === 'boolean') {
                    settings.paymentGateways[gateway].enabled = gatewayConfig.enabled;
                }
                
                if (typeof gatewayConfig.isDefault === 'boolean') {
                    settings.paymentGateways[gateway].isDefault = gatewayConfig.isDefault;
                    if (gatewayConfig.isDefault && gatewayConfig.enabled) {
                        hasDefault = true;
                        // Unset other defaults
                        for (const otherGateway of validGateways) {
                            if (otherGateway !== gateway) {
                                settings.paymentGateways[otherGateway].isDefault = false;
                            }
                        }
                    }
                }
            }
        }

        // Ensure at least one gateway is enabled and set as default
        const enabledGateways = settings.getEnabledGateways();
        if (enabledGateways.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one payment gateway must be enabled'
            });
        }

        // If no default is set, set the first enabled gateway as default
        if (!hasDefault) {
            const firstEnabled = enabledGateways[0];
            settings.paymentGateways[firstEnabled].isDefault = true;
            console.log(`⚠️ No default gateway specified, setting ${firstEnabled} as default`);
        }

        // Update metadata
        settings.updatedBy = req.user.id;
        settings.updatedAt = new Date();

        await settings.save();

        const defaultGateway = settings.getDefaultGateway();

        console.log(`✅ Payment gateway settings updated. Default: ${defaultGateway}, Enabled: ${enabledGateways.join(', ')}`);

        res.json({
            success: true,
            message: 'Payment gateway settings updated successfully',
            payment_gateways: settings.paymentGateways,
            default_gateway: defaultGateway,
            enabled_gateways: enabledGateways,
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
