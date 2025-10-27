const crypto = require('crypto');
const Payout = require('../models/Payout');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { calculatePayinCommission, calculatePayoutCommission } = require('../utils/commissionCalculator');
const { getSettlementStatusMessage } = require('../utils/settlementCalculator');
const mongoose = require('mongoose');
const { todayRevenueAndCommission } = require('../utils/todayRevenueAndCommission');
const { getIstDayRange } = require('../utils/getIstDayRange');

// ============ GET MY BALANCE (Updated with T+1 settlement tracking) ============

// Use commission percentage/gst rate as needed (here: 3.8% + 18% GST)

const COMMISSION_RATE = 0.038; // 3.8%

exports.getMyBalance = async (req, res) => {
    try {
        const merchantObjectId =  new mongoose.Types.ObjectId(req.merchantId);

        // Aggregate settled transactions
        const settledAgg = await Transaction.aggregate([
            { $match: { merchantId: merchantObjectId, status: 'paid', settlementStatus: 'settled' } },
            {
                $group: {
                    _id: null,
                    settledRevenue: { $sum: '$amount' },
                    settledRefunded: { $sum: { $ifNull: ['$refundAmount', 0] } },
                    settledCount: { $sum: 1 }
                }
            }
        ]);
        const settled = settledAgg[0] || { settledRevenue: 0, settledRefunded: 0, settledCount: 0 };
        const settledCommission = settled.settledRevenue * COMMISSION_RATE;

        // Aggregate unsettled transactions
        const unsettledAgg = await Transaction.aggregate([
            { $match: { merchantId: merchantObjectId, status: 'paid', settlementStatus: 'unsettled' } },
            {
                $group: {
                    _id: null,
                    unsettledRevenue: { $sum: '$amount' },
                    unsettledCount: { $sum: 1 }
                }
            }
        ]);
        const unsettled = unsettledAgg[0] || { unsettledRevenue: 0, unsettledCount: 0 };
        const unsettledCommission = unsettled.unsettledRevenue * COMMISSION_RATE;

        // Get next settlement info
        const nextUnsettledTransaction = await Transaction.findOne({
            merchantId: merchantObjectId,
            status: 'paid',
            settlementStatus: 'unsettled'
        }).sort({ expectedSettlementDate: 1 });

        // totalTodayRevenue 
        // get all paid transactions that are created or updated today only and then calculate the amount and then 
        // totalPayinCommission 
        // get all transattion that are created and updated for today only and calculate them by the commission feild 
          
         const  { totalTodayRevenue , totalPayinCommission , transactionCount} = await todayRevenueAndCommission(merchantObjectId)

        // Aggregate payouts
        const completedPayoutAgg = await Payout.aggregate([
            { $match: { merchantId: merchantObjectId, status: 'completed' } },
            { $group: { _id: null, totalPaidOut: { $sum: '$netAmount' }, count: { $sum: 1 } } }
        ]);
        const pendingPayoutAgg = await Payout.aggregate([
            { $match: { merchantId: merchantObjectId, status: { $in: ['requested', 'pending', 'processing'] } } },
            { $group: { _id: null, totalPending: { $sum: '$netAmount' }, count: { $sum: 1 } } }
        ]);
        const totalPaidOut = completedPayoutAgg[0]?.totalPaidOut || 0;
        const totalPending = pendingPayoutAgg[0]?.totalPending || 0;

        // Calculations
        const settledNetRevenue = settled.settledRevenue - settled.settledRefunded - settledCommission;
        const availableBalance = settledNetRevenue - totalPaidOut - totalPending;

        const totalRevenue = settled.settledRevenue + unsettled.unsettledRevenue;
        const totalCommission = settledCommission + unsettledCommission;
        const totalRefunded = settled.settledRefunded; // rarely unsettled refunds

        // Max payout logic
        let maxPayoutGrossAmount = availableBalance;
        if (availableBalance > 0) {
            if (availableBalance > 1000) {
                // For payout above ₹1000 (1.77% fee): gross = available/netPct
                maxPayoutGrossAmount = availableBalance / 0.9823;
            } else if (availableBalance > 500) {
                maxPayoutGrossAmount = Math.min(availableBalance + 35.40, 1000);
            }
        }

        // Settlement status message
        const nextSettlementText = nextUnsettledTransaction
            ? getSettlementStatusMessage(nextUnsettledTransaction.paidAt, nextUnsettledTransaction.expectedSettlementDate)
            : 'No pending settlements';
        const nextSettlementStatus = nextUnsettledTransaction?.settlementStatus || null;

        res.json({
            success: true,
            merchant: {
                merchantId: req.merchantId,
                merchantName: req.merchantName,
                merchantEmail: req.user.email,
                freePayoutsRemaining: req.user.freePayoutsUnder500 || 0
            },
            balance: {
                settled_revenue: settled.settledRevenue.toFixed(2) , 
                settled_commission: settledCommission.toFixed(2),
                settled_net_revenue: settledNetRevenue.toFixed(2),
                available_balance:  (availableBalance.toFixed(2)),
                totalTodayRevenue : totalTodayRevenue,
                totalPayinCommission : totalPayinCommission,
                unsettled_revenue: unsettled.unsettledRevenue.toFixed(2) ,
                unsettled_commission: unsettledCommission.toFixed(2),
                unsettled_net_revenue: (unsettled.unsettledRevenue - unsettledCommission).toFixed(2),

                total_revenue: totalRevenue.toFixed(2),
                total_refunded: totalRefunded.toFixed(2),
                total_commission: totalCommission.toFixed(2),
                commission_deducted: totalCommission.toFixed(2),
                net_revenue: (settledNetRevenue + unsettled.unsettledRevenue - unsettledCommission).toFixed(2),
                total_paid_out: totalPaidOut.toFixed(2),
                pending_payouts: totalPending.toFixed(2),

                commission_structure: {
                    payin: '3.8%',
                    payout_500_to_1000: '₹30 ',
                    payout_above_1000: '(1.77%)'
                }
            },
            settlement_info: {
                settled_transactions: settled.settledCount,
                unsettled_transactions: unsettled.unsettledCount,
                next_settlement: nextSettlementText,
                next_settlement_date: nextUnsettledTransaction?.expectedSettlementDate?.toISOString() || null,
                next_settlement_status: nextSettlementStatus,
                settlement_policy: 'T+1 settlement (24 hours after payment)',
                weekend_policy2 : "On Saturday, payouts are available from 4 PM to 6 PM. Settlement times are at 4 PM and 2 AM.",
                settlement_policy2 : "T0 Settlement (Weekend policy)",
                weekend_policy: 'Saturday and Sunday are off. Weekend payments settle on Monday.',
                settlement_examples: {
                    'Monday payment': 'Settles Tuesday (24 hours)',
                    'Tuesday payment': 'Settles Wednesday (24 hours)',
                    'Wednesday payment': 'Settles Thursday (24 hours)',
                    'Thursday payment': 'Settles Friday (24 hours)',
                    'Friday payment': 'Settles Monday (skip weekend)',
                    'Saturday payment': 'Settles Monday (skip Sunday)',
                    'Sunday payment': 'Settles Monday (24+ hours)'
                }
            },
            transaction_summary: {
                total_transactions: settled.settledCount + unsettled.unsettledCount,
                settled_transactions: settled.settledCount,
                unsettled_transactions: unsettled.unsettledCount,
                total_payouts_completed: completedPayoutAgg[0]?.count || 0,
                pending_payout_requests: pendingPayoutAgg[0]?.count || 0,
                avg_commission_per_transaction:
                    (settled.settledCount + unsettled.unsettledCount) > 0
                        ? (totalCommission / (settled.settledCount + unsettled.unsettledCount)).toFixed(2)
                        : '0.00'
            },
            payout_eligibility: {
                can_request_payout: availableBalance > 0,
                minimum_payout_amount: 0,
                maximum_payout_amount: maxPayoutGrossAmount.toFixed(2),
                available_for_payout: availableBalance.toFixed(2),
                reason: availableBalance <= 0
                    ? 'No settled balance available. Wait for T+1 settlement (24 hours after payment).'
                    : availableBalance < 500
                        ? `Available balance is ₹${availableBalance.toFixed(2)} (after commission)`
                        : 'Eligible for payout'
            }
        });

        console.log(`✅ Balance returned to ${req.user.name}:`);
        console.log(`   - Available: ₹${availableBalance.toFixed(2)}`);
        console.log(`   - Settled: ${settled.settledCount} transactions`);
        console.log(`   - Unsettled: ${unsettled.unsettledCount} transactions`);
        console.log(`   - Next settlement: ${nextSettlementText}`);
    } catch (error) {
        console.error('❌ Get My Balance Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch balance' });
    }
};
  
exports.searchTransactions = async (req, res) => {
  try {
    const {
      // merchantId,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      description,
      transactionId,
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      status,
      paymentGateway,
      paymentMethod,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search // global search string
    } = req.query;

    const query = {};

    // TODO :  get the merchant id from middleware 
    const merchantId = req.merchantId
    if (merchantId) query.merchantId = new mongoose.Types.ObjectId(merchantId);
    console.table(query.merchantId)
    if (status) query.status = status;
    if (paymentGateway) query.paymentGateway = paymentGateway;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    // Amount filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    // Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Specific attribute search
    if (description) query.description = { $regex: description, $options: 'i' };
    if (transactionId) query.transactionId = transactionId;
    if (orderId) query.orderId = orderId;
    if (customerName) query.customerName = { $regex: customerName, $options: 'i' };
    if (customerEmail) query.customerEmail = { $regex: customerEmail, $options: 'i' };
    if (customerPhone) query.customerPhone = customerPhone; // or regex for partial match

    // Global text search
    if (search) {
      query.$or = [
// add the realmid to fetch only user raltive transaction 
        { transactionId: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting and pagination
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const totalCount = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
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

  } catch (error) {
    console.error('❌ Search Transactions Error:', error);
    res.status(500).json({ success: false, error: 'Failed to search transactions' });
  }
};


exports.searchPayouts = async (req, res) => {
  try {
    const {
      merchantId,
      payoutId,
      minAmount,
      maxAmount,
      status,
      startDate,
      endDate,
      description,
      beneficiaryName,
      notes,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      search // global search string
    } = req.query;

    const query = {};

    if (merchantId) query.merchantId = mongoose.Types.ObjectId(merchantId);
    if (payoutId) query.payoutId = payoutId;
    if (status) query.status = status;

    // Amount filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    // Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Specific attribute search
    if (description) query.description = { $regex: description, $options: 'i' };
    if (notes) query.adminNotes = { $regex: notes, $options: 'i' };
    if (beneficiaryName) query['beneficiaryDetails.accountHolderName'] = { $regex: beneficiaryName, $options: 'i' };

    // Global text search
    if (search) {
      query.$or = [
        { payoutId: { $regex: search, $options: 'i' } },
        { merchantName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { adminNotes: { $regex: search, $options: 'i' } },
        { 'beneficiaryDetails.accountHolderName': { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting and pagination
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const totalCount = await Payout.countDocuments(query);

    const payouts = await Payout.find(query)
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

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
      }
    });

  } catch (error) {
    console.error('❌ Search Payouts Error:', error);
    res.status(500).json({ success: false, error: 'Failed to search payouts' });
  }
};


exports.getTransactionById = async (req, res) => {
    try {
        const { transactionId } = req.params;

        // Fetch transaction (optionally add merchantId match for extra safety)
        const txn = await Transaction.findOne({
            transactionId: transactionId, // or _id: transactionId
            // merchantId: req.merchantId,  // Optionally restrict to only merchant's txns
        });

        if (!txn) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            transaction: txn
        });
    } catch (error) {
        console.error('Error fetching transaction by ID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction'
        });
    }
};



// Assumes: calculatePayoutCommission(amount, merchant) is a synchronous pure function
// and User, Transaction, Payout, crypto are in scope.
exports.requestPayout = async (req, res) => {
  try {
    const { amount: rawAmount, transferMode, beneficiaryDetails, notes, description } = req.body;

    console.log('--- REQUEST PAYOUT START ---');
    console.log('Request user:', { id: req.user._id, name: req.user.name, merchantId: req.merchantId });
    console.log('Raw request body amount:', rawAmount);
    console.log('transferMode:', transferMode);
    console.log('beneficiaryDetails (partial):', beneficiaryDetails && {
      accountHolderName: beneficiaryDetails.accountHolderName,
      upiId: beneficiaryDetails.upiId,
      accountNumber: beneficiaryDetails.accountNumber,
      ifscCode: beneficiaryDetails.ifscCode
    });

    if (!transferMode || !beneficiaryDetails) {
      console.log('Validation failed: missing transferMode or beneficiaryDetails');
      return res.status(400).json({ success: false, error: 'transferMode and beneficiaryDetails are required' });
    }

    // --- Normalize and validate amount ---
    const parsedAmount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : rawAmount;
    const amountIsValidNumber = typeof parsedAmount === 'number' && !isNaN(parsedAmount) && parsedAmount > 0;
    console.log('Parsed amount:', parsedAmount, 'Valid number:', amountIsValidNumber);

    // fetch settled transactions to compute available balance
    const settledTransactions = await Transaction.find({
      merchantId: req.merchantId,
      status: 'paid',
      settlementStatus: 'settled'
    });
    console.log('Settled transactions count:', Array.isArray(settledTransactions) ? settledTransactions.length : 0);

    if (!settledTransactions || settledTransactions.length === 0) {
      console.log('No settled transactions found');
      return res.status(400).json({ success: false, error: 'No settled balance available for payout' });
    }

    const totalSettledAmount = settledTransactions.reduce((sum, t) => sum + t.amount, 0);
    console.log('Total settled amount:', totalSettledAmount);

    // include previously reserved payouts (gross amounts) to compute available
    const completedPayouts = await Payout.find({
      merchantId: req.merchantId,
      status: { $in: ['requested', 'processing', 'completed'] }
    });
    console.log('Completed/reserved payouts count:', Array.isArray(completedPayouts) ? completedPayouts.length : 0);

    const totalReservedGross = completedPayouts.reduce((sum, p) => sum + (p.grossAmount || p.amount || 0), 0);
    console.log('Total reserved (gross) from payouts:', totalReservedGross);

    const availableBalance = parseFloat((totalSettledAmount - totalReservedGross).toFixed(2));
    console.log('Computed availableBalance:', availableBalance);
    if (availableBalance <= 0) {
      console.log('Available balance <= 0');
      return res.status(400).json({ success: false, error: 'No balance available for payout', availableBalance: 0 });
    }

    // Final requested net amount: use provided amount if valid, otherwise full available
    const finalAmount = amountIsValidNumber ? parsedAmount : availableBalance;
    console.log('Final net amount to process:', finalAmount);

    if (finalAmount <= 0) {
      console.log('Final amount <= 0');
      return res.status(400).json({ success: false, error: 'Requested amount must be greater than 0' });
    }
    if (finalAmount > availableBalance) {
      console.log('Requested amount exceeds available balance');
      return res.status(400).json({
        success: false,
        error: `Requested amount ₹${finalAmount} exceeds available balance ₹${availableBalance}`,
        availableBalance
      });
    }

    console.log(`Payout requested: ₹${finalAmount} out of ₹${availableBalance} available`);

    // fetch merchant
    const merchant = await User.findById(req.merchantId);
    console.log('Merchant fetched:', merchant ? {
      id: merchant._id,
      name: merchant.name,
      freePayoutsUnder500: merchant.freePayoutsUnder500
    } : 'merchant not found');

    if (!merchant) {
      console.log('Merchant not found in DB');
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    // calculate commission (pure function)
    let payoutCommissionInfo;
    try {
      payoutCommissionInfo = calculatePayoutCommission(finalAmount, merchant);
    } catch (err) {
      console.error('Error in calculatePayoutCommission:', err.message);
      return res.status(500).json({ success: false, error: 'Commission calculation failed' });
    }

    let { commission: payoutCommission, commissionType, breakdown: commissionBreakdown, netAmount } = payoutCommissionInfo;
    console.log('Initial commission calculation:', {
      payoutCommission,
      commissionType,
      breakdown: commissionBreakdown,
      netAmount
    });

    // If commissionType === 'free', try atomic decrement of merchant.freePayoutsUnder500
    if (commissionType === 'free') {
      console.log('CommissionType is free -> attempting atomic decrement on merchant.freePayoutsUnder500');
      const updatedMerchant = await User.findOneAndUpdate(
        { _id: merchant._id, freePayoutsUnder500: { $gt: 0 } },   // only decrement if > 0
        { $inc: { freePayoutsUnder500: -1 } },
        { new: true }
      );

      console.log('Result of findOneAndUpdate (decrement attempt):', updatedMerchant ? {
        id: updatedMerchant._id,
        freePayoutsUnder500: updatedMerchant.freePayoutsUnder500
      } : null);

      if (!updatedMerchant) {
        console.log('No updatedMerchant: free payout not available (concurrency or none left). Recomputing commission with free=0');
        payoutCommissionInfo = calculatePayoutCommission(finalAmount, { ...merchant.toObject(), freePayoutsUnder500: 0 });
        payoutCommission = payoutCommissionInfo.commission;
        commissionType = payoutCommissionInfo.commissionType;
        commissionBreakdown = payoutCommissionInfo.breakdown;
        netAmount = payoutCommissionInfo.netAmount;
        console.log('Recomputed commission (after failed decrement):', {
          payoutCommission,
          commissionType,
          commissionBreakdown,
          netAmount
        });
      } else {
        // updatedMerchant confirmed decrement
        console.log('Atomic decrement succeeded. Updated merchant freePayoutsUnder500:', updatedMerchant.freePayoutsUnder500);
        merchant.freePayoutsUnder500 = updatedMerchant.freePayoutsUnder500;
      }
    } else {
      console.log('CommissionType is not free; skipping decrement.');
    }

    // Total debit from merchant = gross amount = net (finalAmount) + commission
    const grossAmount = parseFloat((finalAmount + payoutCommission).toFixed(2));
    console.log('Computed grossAmount (net + commission):', grossAmount);

    if (grossAmount > availableBalance) {
      console.log('Insufficient available balance to cover gross amount');
      return res.status(400).json({
        success: false,
        error: `Insufficient available balance to cover amount + commission. Required ₹${grossAmount}, Available ₹${availableBalance}`,
        required: grossAmount,
        availableBalance
      });
    }

    if (netAmount <= 0) {
      console.log('netAmount <= 0, aborting');
      return res.status(400).json({ success: false, error: `Net payout must be positive. Computed net amount: ₹${netAmount}` });
    }

    // Create payout with explicit fields
    const payoutId = `PAYOUT_REQ_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const payout = new Payout({
      payoutId,
      merchantId: req.merchantId,
      merchantName: req.merchantName,
      amount: grossAmount,                  // amount requested (gross)
      commission: payoutCommission,         // commission amount
      commissionType,
      commissionBreakdown,
      netAmount: finalAmount, // amount that will be delivered to beneficiary
      description: notes || '',
      currency: 'INR',
      transferMode,
      beneficiaryDetails,
      status: 'requested',
      adminNotes: notes || '',
      requestedBy: req.user._id,
      requestedByName: req.user.name,
      requestedAt: new Date()
    });

    console.log('Payout document to save (preview):', {
      payoutId,
      merchantId: req.merchantId,
      grossAmount,
      commission: payoutCommission,
      commissionType,
      netAmount: finalAmount,
      beneficiaryDetails: beneficiaryDetails && (beneficiaryDetails.upiId ? { upiId: beneficiaryDetails.upiId } : { accountNumber: beneficiaryDetails.accountNumber })
    });

    await payout.save();

    const remaining_balance = parseFloat((availableBalance - grossAmount).toFixed(2));

    console.log(`Payout saved: ${payoutId} gross ₹${grossAmount} net ₹${finalAmount} commission ₹${payoutCommission}`);
    console.log('Remaining balance after reservation:', remaining_balance);
    console.log('--- REQUEST PAYOUT END ---');

    return res.json({
      success: true,
      payout: {
        payoutId,
        amount: finalAmount,          // net requested
        actualAmount: grossAmount,    // gross debited
        commission: payoutCommission,
        commissionType,
        commissionBreakdown,
        netAmount: finalAmount,
        status: 'requested',
        requestedAt: payout.requestedAt,
        remaining_balance
      },
      message: `Payout request of ₹${finalAmount} submitted successfully`
    });
  } catch (error) {
    console.error('Request Payout Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create payout request' });
  }
};




// ============ GET MY PAYOUTS (Unchanged) ============
exports.getMyPayouts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,


            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log(`📋 Admin ${req.user.name} fetching their payouts - Page ${page}`);

        let query = { merchantId: req.merchantId };

        if (status) {
            if (status.includes(',')) {
                query.status = { $in: status.split(',') };
            } else {
                query.status = status;
            }
        }



        const totalCount = await Payout.countDocuments(query);

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const payouts = await Payout.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('processedBy', 'name email')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email')
            .select('-beneficiaryDetails.accountNumber')
            .lean();

        const maskedPayouts = payouts.map(payout => {
            if (payout.beneficiaryDetails?.accountNumber) {
                const accNum = payout.beneficiaryDetails.accountNumber;
                payout.beneficiaryDetails.accountNumber = 'XXXX' + accNum.slice(-4);
            }
            return payout;
        });

        const allMyPayouts = await Payout.find({ merchantId: req.merchantId });
        const totalRequested = allMyPayouts.reduce((sum, p) => sum + p.amount, 0);
        const totalCompleted = allMyPayouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.netAmount, 0);
        const totalPending = allMyPayouts.filter(p => p.status === 'requested' || p.status === 'pending' || p.status === 'processing').reduce((sum, p) => sum + p.netAmount, 0);
        const totalCommission = allMyPayouts.reduce((sum, p) => sum + p.commission, 0);

        res.json({
            success: true,
            payouts: maskedPayouts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                limit: parseInt(limit),
                hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
                hasPrevPage: parseInt(page) > 1
            },
            summary: {
                total_payout_requests: allMyPayouts.length,
                requested_payouts: allMyPayouts.filter(p => p.status === 'requested').length,
                pending_payouts: allMyPayouts.filter(p => p.status === 'pending' || p.status === 'processing').length,
                completed_payouts: allMyPayouts.filter(p => p.status === 'completed').length,
                failed_payouts: allMyPayouts.filter(p => p.status === 'failed').length,
                cancelled_payouts: allMyPayouts.filter(p => p.status === 'cancelled').length,
                total_amount_requested: totalRequested.toFixed(2),
                total_completed: totalCompleted.toFixed(2),
                total_pending: totalPending.toFixed(2),
                total_commission_paid: totalCommission.toFixed(2)
            },
            merchant_info: {
                merchantId: req.merchantId,
                merchantName: req.merchantName,
                merchantEmail: req.user.email
            }
        });

        console.log(`✅ Returned ${maskedPayouts.length} payouts to admin ${req.user.name}`);

    } catch (error) {
        console.error('❌ Get My Payouts Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payout history'
        });
    }
};

// ============ CANCEL PAYOUT REQUEST (Unchanged) ============
exports.cancelPayoutRequest = async (req, res) => {
    try {
        const { payoutId } = req.params;
        const { reason } = req.body;

        console.log(`❌ Admin ${req.user.name} cancelling payout: ${payoutId}`);

        const payout = await Payout.findOne({
            payoutId,
            merchantId: req.merchantId
        });

        if (!payout) {
            return res.status(404).json({
                success: false,
                error: 'Payout request not found'
            });
        }

        if (payout.status !== 'requested') {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel payout with status: ${payout.status}. Only 'requested' payouts can be cancelled.`
            });
        }

        // --- Rollback Free Payout --- 
        if (payout.commissionType === 'free') {
            const merchant = await User.findById(payout.merchantId);
            if (merchant) {
                merchant.freePayoutsUnder500 += 1;
                await merchant.save();
            }
        }

        payout.status = 'cancelled';
        payout.rejectedBy = req.user._id;
        payout.rejectedByName = req.user.name;
        payout.rejectedAt = new Date();
        payout.rejectionReason = reason || 'Cancelled by merchant';

        await payout.save();

        // Rollback associated transactions
        await Transaction.updateMany({
            payoutId: payout._id
        }, {
            $set: {
                payoutStatus: 'unpaid',
                payoutId: null
            }
        });

        res.json({
            success: true,
            message: 'Payout request cancelled successfully',
            payout: {
                payoutId: payout.payoutId,
                status: payout.status,
                cancelledAt: payout.rejectedAt,
                reason: payout.rejectionReason
            }
        });

    } catch (error) {
        console.error('❌ Cancel Payout Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel payout request'
        });
    }
};
// Get payout status by payoutId
exports.getPayoutStatusById = async (req, res) => {
    try {
        const payoutId = req.params.payoutId;

        const payout = await Payout.findOne({ payoutId }).lean();

        if (!payout) {
            return res.status(404).json({
                success: false,
                error: 'Payout not found'
            });
        }

        res.json({
            success: true,
            payoutId: payout.payoutId,
            status: payout.status,
            amount: payout.amount,
            netAmount: payout.netAmount,
            requestedAt: payout.requestedAt,
            approvedAt: payout.approvedAt,
            completedAt: payout.completedAt,
            rejectionReason: payout.rejectionReason,
            utr: payout.utr,
            adminNotes: payout.adminNotes
        });
    } catch (error) {
        console.error('Get Payout Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payout status'
        });
    }
};
