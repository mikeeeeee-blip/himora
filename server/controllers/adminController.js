const crypto = require('crypto');
const Payout = require('../models/Payout');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { calculatePayinCommission, calculatePayoutCommission } = require('../utils/commissionCalculator');
const { getSettlementStatusMessage } = require('../utils/settlementCalculator');
const mongoose = require('mongoose');
const { todayRevenueAndCommission } = require('../utils/todayRevenueAndCommission');
const { getIstDayRange } = require('../utils/getIstDayRange');
const ExcelJS = require('exceljs');
// Helper: parse comma-separated list into array, trim and ignore empties
function parseList(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  return value
    .toString()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}


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
        // Todays payin data 
        const totalPaidOut = completedPayoutAgg[0]?.totalPaidOut || 0;
        const totalPending = pendingPayoutAgg[0]?.totalPending || 0;
        // todays pauout data 
        // Get total payout commission for today (completed payouts created or updated today)
        const { start: todayStart, end: todayEnd } = getIstDayRange();
        const todayPayoutCommissionAgg = await Payout.aggregate([
            { 
                $match: { 
                    merchantId: merchantObjectId, 
                    status: 'completed',
                    $or: [
                        { createdAt: { $gte: todayStart, $lte: todayEnd } },
                        { updatedAt: { $gte: todayStart, $lte: todayEnd } }
                    ]
                } 
            },
            {
                $group: {
                    _id: null,
                    totalTodaysPayoutCommission: { $sum: { $ifNull: ['$commission', 0] } }
                }
            }
        ]);
        const totalTodaysPayoutCommission = todayPayoutCommissionAgg[0]?.totalTodaysPayoutCommission || 0;
        
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
                totalTodaysPayoutCommission : parseFloat(totalTodaysPayoutCommission.toFixed(2)),
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
    const merchantId = req.merchantId
    if (merchantId) query.merchantId = new mongoose.Types.ObjectId(merchantId);
    if (payoutId) query.payoutId = payoutId;
    if (status) query.status = status;

    // Amount filter (filter by netAmount - amount after commission, consistent with getPayoutReport)
    if (minAmount || maxAmount) {
      query.netAmount = {};
      const minA = parseFloat(minAmount);
      const maxA = parseFloat(maxAmount);
      if (minAmount && !isNaN(minA)) query.netAmount.$gte = minA;
      if (maxAmount && !isNaN(maxA)) query.netAmount.$lte = maxA;
      if (Object.keys(query.netAmount).length === 0) delete query.netAmount;
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

/**
 * GET /api/reports/transactions
 * Query params supported (all optional):
 *  - startDate (ISO date)
 *  - endDate (ISO date)
 *  - status (single or comma-separated)
 *  - paymentMethod (single or comma-separated)
 *  - minAmount, maxAmount
 *  - transactionId
 *  - orderId
 *  - customerEmail
 *  - customerPhone
 *  - payoutStatus
 *  - settlementStatus
 *  - paymentGateway (gateway)
 *  - q  -> free-text search across customerName, customerEmail, customerPhone, merchantName, description
 *  - limit -> optional numeric cap for query (default: no cap; but Excel streaming means memory use depends on row count)
 *  - sortBy -> e.g. createdAt:desc or amount:asc  (format: field:asc|desc)
 *
 * Response: streamed Excel .xlsx file attachment
 */
exports.getTransactionReport = async (req, res) => {
  try {
    // merchantId must always be applied
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId missing from request' });
    }

    const q = req.query || {};
    const query = { merchantId: new mongoose.Types.ObjectId(merchantId) };

    // Date range
    if (q.startDate || q.endDate) {
      query.createdAt = {};
      if (q.startDate) {
        const sd = new Date(q.startDate);
        if (!isNaN(sd)) query.createdAt.$gte = sd;
      }
      if (q.endDate) {
        const ed = new Date(q.endDate);
        if (!isNaN(ed)) {
          // include the entire endDate day if user passed a date without time? 
          query.createdAt.$lte = ed;
        }
      }
      // if createdAt ended up empty (both dates invalid), remove it
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    // Status (supports comma-separated)
    const statuses = parseList(q.status);
    if (statuses && statuses.length) {
      query.status = { $in: statuses };
    }

    // Payment method
    const methods = parseList(q.paymentMethod);
    if (methods && methods.length) query.paymentMethod = { $in: methods };

    // Amount range
    if (q.minAmount || q.maxAmount) {
      query.amount = {};
      const minA = Number(q.minAmount);
      const maxA = Number(q.maxAmount);
      if (!Number.isNaN(minA)) query.amount.$gte = minA;
      if (!Number.isNaN(maxA)) query.amount.$lte = maxA;
      if (Object.keys(query.amount).length === 0) delete query.amount;
    }

    // Direct equals filters
    if (q.transactionId) query.transactionId = q.transactionId;
    if (q.orderId) query.orderId = q.orderId;
    if (q.customerEmail) query.customerEmail = q.customerEmail;
    if (q.customerPhone) query.customerPhone = q.customerPhone;
    if (q.payoutStatus) query.payoutStatus = q.payoutStatus;
    if (q.settlementStatus) query.settlementStatus = q.settlementStatus;
    if (q.paymentGateway) query.paymentGateway = q.paymentGateway;

    // Free-text search across common fields (q)
    if (q.q) {
      const re = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); // escape user input
      query.$or = [
        { customerName: re },
        { customerEmail: re },
        { customerPhone: re },
        { merchantName: re },
        { description: re },
        { 'acquirerData.utr': re },
        { transactionId: re },
        { orderId: re },
      ];
    }

    // Sorting
    let sort = { createdAt: -1 }; // default recent first
    if (q.sortBy) {
      // expect e.g. 'createdAt:desc' or 'amount:asc'
      const [field, dir] = q.sortBy.split(':').map((s) => s.trim());
      if (field) sort = { [field]: dir === 'asc' ? 1 : -1 };
    }

    // Limit (optional)
    let limit = null;
    if (q.limit) {
      const l = parseInt(q.limit, 10);
      if (!Number.isNaN(l) && l > 0) limit = l;
    }

    // Projection - pick fields to include in the Excel. Add or remove fields as needed
    const projection = {
      transactionId: 1,
      orderId: 1,
      merchantId: 1,
      merchantName: 1,
      customerId: 1,
      customerName: 1,
      customerEmail: 1,
      customerPhone: 1,
      amount: 1,
      commission: 1,
      netAmount: 1,
      currency: 1,
      status: 1,
      paymentMethod: 1,
      paymentGateway: 1,
      acquirerData: 1,
      settlementStatus: 1,
      settlementDate: 1,
      payoutId: 1,
      payoutStatus: 1,
      paidAt: 1,
      refundAmount: 1,
      refundedAt: 1,
      failureReason: 1,
      failureCode: 1,
      description: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    // Query the DB as a cursor to stream results
    let cursor = Transaction.find(query, projection).sort(sort).cursor();

    // Apply limit by taking only first N rows from cursor if specified
    if (limit) {
      // convert to limited cursor by wrapping manual counter
      const originalCursor = cursor;
      let count = 0;
      cursor = {
        async next() {
          if (count >= limit) return null;
          const doc = await originalCursor.next();
          if (doc) count += 1;
          return doc;
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };
    }

    // Create streaming Excel workbook
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res, // write directly to response
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Transactions');

    // Define worksheet columns (friendly header / key name)
    worksheet.columns = [
      { header: 'Transaction ID', key: 'transactionId', width: 30 },
      { header: 'Order ID', key: 'orderId', width: 25 },
      { header: 'Merchant ID', key: 'merchantId', width: 24 },
      { header: 'Merchant Name', key: 'merchantName', width: 30 },
      { header: 'Customer ID', key: 'customerId', width: 24 },
      { header: 'Customer Name', key: 'customerName', width: 30 },
      { header: 'Customer Email', key: 'customerEmail', width: 30 },
      { header: 'Customer Phone', key: 'customerPhone', width: 18 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Commission', key: 'commission', width: 12 },
      { header: 'Net Amount', key: 'netAmount', width: 12 },
      { header: 'Currency', key: 'currency', width: 8 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Payment Gateway', key: 'paymentGateway', width: 15 },
      { header: 'UTR', key: 'utr', width: 25 },
      { header: 'RRN', key: 'rrn', width: 25 },
      { header: 'Bank Txn ID', key: 'bank_transaction_id', width: 25 },
      { header: 'Card Last4', key: 'card_last4', width: 8 },
      { header: 'Bank Name', key: 'bank_name', width: 20 },
      { header: 'Settlement Status', key: 'settlementStatus', width: 15 },
      { header: 'Settlement Date', key: 'settlementDate', width: 20 },
      { header: 'Payout ID', key: 'payoutId', width: 24 },
      { header: 'Payout Status', key: 'payoutStatus', width: 15 },
      { header: 'Paid At', key: 'paidAt', width: 20 },
      { header: 'Refund Amount', key: 'refundAmount', width: 12 },
      { header: 'Refunded At', key: 'refundedAt', width: 20 },
      { header: 'Failure Reason', key: 'failureReason', width: 40 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];

    // set response headers BEFORE writing stream
    const filename = `transactions_report_${merchantId}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // iterate cursor and add rows
    for await (const doc of cursor) {
      // normalize fields safely
      worksheet.addRow({
        transactionId: doc.transactionId,
        orderId: doc.orderId,
        merchantId: String(doc.merchantId),
        merchantName: doc.merchantName,
        customerId: doc.customerId,
        customerName: doc.customerName,
        customerEmail: doc.customerEmail,
        customerPhone: doc.customerPhone,
        amount: doc.amount,
        commission: doc.commission,
        netAmount: doc.netAmount,
        currency: doc.currency,
        status: doc.status,
        paymentMethod: doc.paymentMethod,
        paymentGateway: doc.paymentGateway,
        utr: doc.acquirerData?.utr,
        rrn: doc.acquirerData?.rrn,
        bank_transaction_id: doc.acquirerData?.bank_transaction_id,
        card_last4: doc.acquirerData?.card_last4,
        bank_name: doc.acquirerData?.bank_name,
        settlementStatus: doc.settlementStatus,
        settlementDate: doc.settlementDate ? doc.settlementDate.toISOString() : '',
        payoutId: doc.payoutId ? String(doc.payoutId) : '',
        payoutStatus: doc.payoutStatus,
        paidAt: doc.paidAt ? doc.paidAt.toISOString() : '',
        refundAmount: doc.refundAmount,
        refundedAt: doc.refundedAt ? doc.refundedAt.toISOString() : '',
        failureReason: doc.failureReason,
        description: doc.description,
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : '',
        updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : '',
      }).commit(); // commit each row for streaming
    }

    // finalize worksheet and workbook
    worksheet.commit();
    await workbook.commit(); // this will end the response stream gracefully
    // NOTE: no res.send after streaming; workbook.commit() flushes stream
  } catch (err) {
    console.error('Error generating transaction report:', err);
    // If headers already sent, cannot send JSON; attempt to end response
    if (res.headersSent) {
      return res.end();
    }
    return res.status(500).json({ error: 'Failed to generate report', detail: err.message });
  }
};

/**
 * GET /api/payments/merchant/payout/report
 * Query params supported (all optional):
 *  - startDate (ISO date)
 *  - endDate (ISO date)
 *  - status (single or comma-separated)
 *  - transferMode (bank_transfer|upi)
 *  - minAmount, maxAmount
 *  - payoutId
 *  - description
 *  - beneficiaryName
 *  - q  -> free-text search across payoutId, merchantName, description, adminNotes, beneficiaryName
 *  - limit -> optional numeric cap for query (default: no cap)
 *  - sortBy -> e.g. createdAt:desc or amount:asc  (format: field:asc|desc)
 *
 * Response: streamed Excel .xlsx file attachment
 * NOTE: Only returns payouts for the authenticated merchant (req.merchantId)
 */
exports.getPayoutReport = async (req, res) => {
  try {
    // merchantId must always be applied - ensures only merchant's payouts are returned
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId missing from request' });
    }

    const q = req.query || {};
    const query = { merchantId: new mongoose.Types.ObjectId(merchantId) }; // ✅ SECURITY: Only this merchant's payouts

    // Date range
    if (q.startDate || q.endDate) {
      query.createdAt = {};
      if (q.startDate) {
        const sd = new Date(q.startDate);
        if (!isNaN(sd)) query.createdAt.$gte = sd;
      }
      if (q.endDate) {
        const ed = new Date(q.endDate);
        if (!isNaN(ed)) {
          // include the entire endDate day
          query.createdAt.$lte = ed;
        }
      }
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    // Status (supports comma-separated)
    const statuses = parseList(q.status);
    if (statuses && statuses.length) {
      query.status = { $in: statuses };
    }

    // Transfer mode
    if (q.transferMode) {
      query.transferMode = q.transferMode;
    }

    // Amount range
    if (q.minAmount || q.maxAmount) {
      query.netAmount = {};
      const minA = Number(q.minAmount);
      const maxA = Number(q.maxAmount);
      if (!Number.isNaN(minA)) query.netAmount.$gte = minA;
      if (!Number.isNaN(maxA)) query.netAmount.$lte = maxA;
      if (Object.keys(query.netAmount).length === 0) delete query.netAmount;
    }

    // Direct equals filters
    if (q.payoutId) query.payoutId = q.payoutId;
    if (q.description) query.description = { $regex: q.description, $options: 'i' };
    if (q.beneficiaryName) query['beneficiaryDetails.accountHolderName'] = { $regex: q.beneficiaryName, $options: 'i' };

    // Free-text search across common fields (q)
    if (q.q) {
      const re = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); // escape user input
      query.$or = [
        { payoutId: re },
        { merchantName: re },
        { description: re },
        { adminNotes: re },
        { 'beneficiaryDetails.accountHolderName': re },
        { 'beneficiaryDetails.upiId': re },
        { utr: re },
      ];
    }

    // Sorting
    let sort = { createdAt: -1 }; // default recent first
    if (q.sortBy) {
      // expect e.g. 'createdAt:desc' or 'amount:asc'
      const [field, dir] = q.sortBy.split(':').map((s) => s.trim());
      if (field) sort = { [field]: dir === 'asc' ? 1 : -1 };
    }

    // Limit (optional)
    let limit = null;
    if (q.limit) {
      const l = parseInt(q.limit, 10);
      if (!Number.isNaN(l) && l > 0) limit = l;
    }

    // Projection - pick fields to include in the Excel
    const projection = {
      payoutId: 1,
      merchantId: 1,
      merchantName: 1,
      amount: 1,
      commission: 1,
      commissionType: 1,
      commissionBreakdown: 1,
      netAmount: 1,
      currency: 1,
      transferMode: 1,
      beneficiaryDetails: 1,
      status: 1,
      description: 1,
      adminNotes: 1,
      utr: 1,
      requestedBy: 1,
      requestedByName: 1,
      requestedAt: 1,
      approvedBy: 1,
      approvedByName: 1,
      approvedAt: 1,
      processedBy: 1,
      processedByName: 1,
      processedAt: 1,
      rejectedBy: 1,
      rejectedByName: 1,
      rejectedAt: 1,
      rejectionReason: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    // Query the DB as a cursor to stream results
    let cursor = Payout.find(query, projection).sort(sort).cursor();

    // Apply limit by taking only first N rows from cursor if specified
    if (limit) {
      const originalCursor = cursor;
      let count = 0;
      cursor = {
        async next() {
          if (count >= limit) return null;
          const doc = await originalCursor.next();
          if (doc) count += 1;
          return doc;
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };
    }

    // Create streaming Excel workbook
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res, // write directly to response
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Payouts');

    // Define worksheet columns
    worksheet.columns = [
      { header: 'Payout ID', key: 'payoutId', width: 30 },
      { header: 'Merchant ID', key: 'merchantId', width: 24 },
      { header: 'Merchant Name', key: 'merchantName', width: 30 },
      { header: 'Amount (Gross)', key: 'amount', width: 15 },
      { header: 'Commission', key: 'commission', width: 12 },
      { header: 'Commission Type', key: 'commissionType', width: 15 },
      { header: 'Net Amount', key: 'netAmount', width: 15 },
      { header: 'Currency', key: 'currency', width: 8 },
      { header: 'Transfer Mode', key: 'transferMode', width: 15 },
      { header: 'Beneficiary Name', key: 'beneficiaryName', width: 30 },
      { header: 'Account Number', key: 'accountNumber', width: 20 },
      { header: 'IFSC Code', key: 'ifscCode', width: 12 },
      { header: 'Bank Name', key: 'bankName', width: 25 },
      { header: 'Branch Name', key: 'branchName', width: 25 },
      { header: 'UPI ID', key: 'upiId', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Admin Notes', key: 'adminNotes', width: 40 },
      { header: 'UTR', key: 'utr', width: 25 },
      { header: 'Requested By', key: 'requestedByName', width: 25 },
      { header: 'Requested At', key: 'requestedAt', width: 20 },
      { header: 'Approved By', key: 'approvedByName', width: 25 },
      { header: 'Approved At', key: 'approvedAt', width: 20 },
      { header: 'Processed By', key: 'processedByName', width: 25 },
      { header: 'Processed At', key: 'processedAt', width: 20 },
      { header: 'Rejected By', key: 'rejectedByName', width: 25 },
      { header: 'Rejected At', key: 'rejectedAt', width: 20 },
      { header: 'Rejection Reason', key: 'rejectionReason', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },
    ];

    // set response headers BEFORE writing stream
    const filename = `payouts_report_${merchantId}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // iterate cursor and add rows
    for await (const doc of cursor) {
      // normalize fields safely
      worksheet.addRow({
        payoutId: doc.payoutId,
        merchantId: String(doc.merchantId),
        merchantName: doc.merchantName,
        amount: doc.amount,
        commission: doc.commission || 0,
        commissionType: doc.commissionType || '',
        netAmount: doc.netAmount,
        currency: doc.currency || 'INR',
        transferMode: doc.transferMode === 'bank_transfer' ? 'Bank Transfer' : 'UPI',
        beneficiaryName: doc.beneficiaryDetails?.accountHolderName || '',
        accountNumber: doc.beneficiaryDetails?.accountNumber || '',
        ifscCode: doc.beneficiaryDetails?.ifscCode || '',
        bankName: doc.beneficiaryDetails?.bankName || '',
        branchName: doc.beneficiaryDetails?.branchName || '',
        upiId: doc.beneficiaryDetails?.upiId || '',
        status: doc.status,
        description: doc.description || '',
        adminNotes: doc.adminNotes || '',
        utr: doc.utr || '',
        requestedByName: doc.requestedByName || '',
        requestedAt: doc.requestedAt ? doc.requestedAt.toISOString() : '',
        approvedByName: doc.approvedByName || '',
        approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : '',
        processedByName: doc.processedByName || '',
        processedAt: doc.processedAt ? doc.processedAt.toISOString() : '',
        rejectedByName: doc.rejectedByName || '',
        rejectedAt: doc.rejectedAt ? doc.rejectedAt.toISOString() : '',
        rejectionReason: doc.rejectionReason || '',
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : '',
        updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : '',
      }).commit(); // commit each row for streaming
    }

    // finalize worksheet and workbook
    worksheet.commit();
    await workbook.commit(); // this will end the response stream gracefully
  } catch (err) {
    console.error('Error generating payout report:', err);
    // If headers already sent, cannot send JSON; attempt to end response
    if (res.headersSent) {
      return res.end();
    }
    return res.status(500).json({ error: 'Failed to generate payout report', detail: err.message });
  }
};

// GET /api/payments/merchant/report/combined
// Query params: transaction filters prefixed with t_*, payout filters prefixed with p_*
exports.getCombinedReport = async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId missing from request' });
    }

    // Helpers
    const parseList = (value) => {
      if (!value) return null;
      if (Array.isArray(value)) return value;
      return value.toString().split(',').map((s) => s.trim()).filter(Boolean);
    };

    // Build Transactions query from t_* params
    const tq = req.query || {};
    const tQuery = { merchantId: new mongoose.Types.ObjectId(merchantId) };

    // Date range
    if (tq.t_startDate || tq.t_endDate) {
      tQuery.createdAt = {};
      const sd = tq.t_startDate && new Date(tq.t_startDate);
      const ed = tq.t_endDate && new Date(tq.t_endDate);
      if (sd && !isNaN(sd)) tQuery.createdAt.$gte = sd;
      if (ed && !isNaN(ed)) tQuery.createdAt.$lte = ed;
      if (Object.keys(tQuery.createdAt).length === 0) delete tQuery.createdAt;
    }
    if (tq.t_status) {
      const statuses = parseList(tq.t_status);
      if (statuses) tQuery.status = { $in: statuses };
    }
    if (tq.t_paymentMethod) tQuery.paymentMethod = tq.t_paymentMethod;
    if (tq.t_paymentGateway) tQuery.paymentGateway = tq.t_paymentGateway;
    if (tq.t_minAmount || tq.t_maxAmount) {
      tQuery.amount = {};
      const minA = Number(tq.t_minAmount);
      const maxA = Number(tq.t_maxAmount);
      if (!Number.isNaN(minA)) tQuery.amount.$gte = minA;
      if (!Number.isNaN(maxA)) tQuery.amount.$lte = maxA;
      if (Object.keys(tQuery.amount).length === 0) delete tQuery.amount;
    }
    if (tq.t_q) {
      const re = new RegExp(tq.t_q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      tQuery.$or = [
        { customerName: re },
        { customerEmail: re },
        { customerPhone: re },
        { merchantName: re },
        { description: re },
        { 'acquirerData.utr': re },
        { transactionId: re },
        { orderId: re },
      ];
    }
    if (tq.t_settlementStatus) tQuery.settlementStatus = tq.t_settlementStatus;
    let tSort = { createdAt: -1 };
    if (tq.t_sortBy) {
      const [field, dir] = String(tq.t_sortBy).split(':');
      if (field) tSort = { [field]: dir === 'asc' ? 1 : -1 };
    }

    // Build Payouts query from p_* params
    const pq = req.query || {};
    const pQuery = { merchantId: new mongoose.Types.ObjectId(merchantId) };
    if (pq.p_startDate || pq.p_endDate) {
      pQuery.createdAt = {};
      const sd = pq.p_startDate && new Date(pq.p_startDate);
      const ed = pq.p_endDate && new Date(pq.p_endDate);
      if (sd && !isNaN(sd)) pQuery.createdAt.$gte = sd;
      if (ed && !isNaN(ed)) pQuery.createdAt.$lte = ed;
      if (Object.keys(pQuery.createdAt).length === 0) delete pQuery.createdAt;
    }
    if (pq.p_status) {
      const statuses = parseList(pq.p_status);
      if (statuses) pQuery.status = { $in: statuses };
    }
    if (pq.p_transferMode) pQuery.transferMode = pq.p_transferMode;
    if (pq.p_minAmount || pq.p_maxAmount) {
      pQuery.netAmount = {};
      const minA = Number(pq.p_minAmount);
      const maxA = Number(pq.p_maxAmount);
      if (!Number.isNaN(minA)) pQuery.netAmount.$gte = minA;
      if (!Number.isNaN(maxA)) pQuery.netAmount.$lte = maxA;
      if (Object.keys(pQuery.netAmount).length === 0) delete pQuery.netAmount;
    }
    if (pq.p_q) {
      const re = new RegExp(pq.p_q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      pQuery.$or = [
        { payoutId: re },
        { merchantName: re },
        { description: re },
        { adminNotes: re },
        { 'beneficiaryDetails.accountHolderName': re },
        { 'beneficiaryDetails.upiId': re },
        { utr: re },
      ];
    }
    let pSort = { createdAt: -1 };
    if (pq.p_sortBy) {
      const [field, dir] = String(pq.p_sortBy).split(':');
      if (field) pSort = { [field]: dir === 'asc' ? 1 : -1 };
    }

    // Set headers BEFORE starting the stream
    const filename = `combined_report_${merchantId}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Excel streaming workbook (writes directly to res)
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    // Sheet 1: Transactions
    const tSheet = workbook.addWorksheet('Transactions');
    tSheet.columns = [
      { header: 'Transaction ID', key: 'transactionId', width: 30 },
      { header: 'Order ID', key: 'orderId', width: 25 },
      { header: 'Customer Name', key: 'customerName', width: 28 },
      { header: 'Customer Email', key: 'customerEmail', width: 30 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Commission', key: 'commission', width: 12 },
      { header: 'Net Amount', key: 'netAmount', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Payment Method', key: 'paymentMethod', width: 16 },
      { header: 'Gateway', key: 'paymentGateway', width: 14 },
      { header: 'Settlement Status', key: 'settlementStatus', width: 16 },
      { header: 'Paid At', key: 'paidAt', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    const tCursor = Transaction.find(tQuery).sort(tSort).cursor();
    for await (const doc of tCursor) {
      tSheet.addRow({
        transactionId: doc.transactionId,
        orderId: doc.orderId,
        customerName: doc.customerName || '',
        customerEmail: doc.customerEmail || '',
        amount: doc.amount || 0,
        commission: doc.commission || 0,
        netAmount: doc.netAmount || 0,
        status: doc.status || '',
        paymentMethod: doc.paymentMethod || '',
        paymentGateway: doc.paymentGateway || '',
        settlementStatus: doc.settlementStatus || '',
        paidAt: doc.paidAt ? doc.paidAt.toISOString() : '',
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : '',
      }).commit();
    }
    tSheet.commit();

    // Sheet 2: Payouts
    const pSheet = workbook.addWorksheet('Payouts');
    pSheet.columns = [
      { header: 'Payout ID', key: 'payoutId', width: 30 },
      { header: 'Amount (Gross)', key: 'amount', width: 15 },
      { header: 'Commission', key: 'commission', width: 12 },
      { header: 'Net Amount', key: 'netAmount', width: 15 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Transfer Mode', key: 'transferMode', width: 16 },
      { header: 'Beneficiary', key: 'beneficiaryName', width: 26 },
      { header: 'Requested At', key: 'requestedAt', width: 20 },
      { header: 'Processed At', key: 'processedAt', width: 20 },
      { header: 'Completed At', key: 'completedAt', width: 20 },
      { header: 'UTR', key: 'utr', width: 26 },
    ];

    const pCursor = Payout.find(pQuery).sort(pSort).cursor();
    for await (const doc of pCursor) {
      pSheet.addRow({
        payoutId: doc.payoutId,
        amount: doc.amount || 0,
        commission: doc.commission || 0,
        netAmount: doc.netAmount || 0,
        status: doc.status || '',
        transferMode: doc.transferMode === 'bank_transfer' ? 'Bank Transfer' : (doc.transferMode || ''),
        beneficiaryName: doc.beneficiaryDetails?.accountHolderName || '',
        requestedAt: doc.requestedAt ? doc.requestedAt.toISOString() : '',
        processedAt: doc.processedAt ? doc.processedAt.toISOString() : '',
        completedAt: doc.completedAt ? doc.completedAt.toISOString() : '',
        utr: doc.utr || '',
      }).commit();
    }
    pSheet.commit();

    await workbook.commit();
  } catch (err) {
    console.error('Error generating combined report:', err);
    if (res.headersSent) return res.end();
    return res.status(500).json({ error: 'Failed to generate combined report', detail: err.message });
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
// ============ GET MY PAYOUTS (Improved) ============
exports.getMyPayouts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      description = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 20);

    console.log(`📋 Admin ${req.user.name} fetching their payouts - Page ${pageNum}`);

    // Base query for listing (applies merchant, optional status, optional description)
    const listQuery = { merchantId: req.merchantId };

    if (status) {
      if (status.includes(",")) {
        listQuery.status = { $in: status.split(",").map(s => s.trim()) };
      } else {
        listQuery.status = status;
      }
    }

    // Add description text search if provided (case-insensitive substring match)
    if (description && description.trim().length) {
      // assuming payouts have a `description` field; adjust fields if you want to search others
      listQuery.description = { $regex: description.trim(), $options: "i" };
    }

    // total count for pagination (respects filters)
    const totalCount = await Payout.countDocuments(listQuery);

    // sorting object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // fetch paginated list
    const payouts = await Payout.find(listQuery)
      .sort(sort)
      .limit(pageLimit)
      .skip((pageNum - 1) * pageLimit)
      .populate("processedBy", "name email")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .select("-beneficiaryDetails.accountNumber")
      .lean();

    // mask account numbers if present (we still selected without accountNumber, but keep this safe)
    const maskedPayouts = payouts.map(payout => {
      if (payout.beneficiaryDetails && payout.beneficiaryDetails.accountNumber) {
        const accNum = String(payout.beneficiaryDetails.accountNumber);
        payout.beneficiaryDetails.accountNumber = "XXXX" + accNum.slice(-4);
      }
      return payout;
    });

    // === Compute merchant-wide summary using aggregation (fast, no full-document fetch) ===
    const summaryAgg = await Payout.aggregate([
      { $match: { merchantId: req.merchantId } },
      {
        $group: {
          _id: null,
          totalRequestedAmount: { $sum: { $ifNull: ["$amount", 0] } },
          totalCompletedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, { $ifNull: ["$netAmount", 0] }, 0],
            },
          },
          totalPendingAmount: {
            $sum: {
              $cond: [
                { $in: ["$status", ["requested", "pending", "processing"]] },
                { $ifNull: ["$netAmount", 0] },
                0,
              ],
            },
          },
          totalCommission: { $sum: { $ifNull: ["$commission", 0] } },

          countAll: { $sum: 1 },
          countRequested: {
            $sum: { $cond: [{ $eq: ["$status", "requested"] }, 1, 0] },
          },
          countPending: {
            $sum: { $cond: [{ $in: ["$status", ["pending", "processing"]] }, 1, 0] },
          },
          countCompleted: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          countFailed: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
          countCancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]);

    const agg = (summaryAgg && summaryAgg[0]) || {
      totalRequestedAmount: 0,
      totalCompletedAmount: 0,
      totalPendingAmount: 0,
      totalCommission: 0,
      countAll: 0,
      countRequested: 0,
      countPending: 0,
      countCompleted: 0,
      countFailed: 0,
      countCancelled: 0,
    };

    // Response
    res.json({
      success: true,
      payouts: maskedPayouts,
      pagination: {
        currentPage: pageNum,
        totalPages: pageLimit > 0 ? Math.ceil(totalCount / pageLimit) : 0,
        totalCount,
        limit: pageLimit,
        hasNextPage: pageNum < (pageLimit > 0 ? Math.ceil(totalCount / pageLimit) : 0),
        hasPrevPage: pageNum > 1,
      },
      summary: {
        total_payout_requests: agg.countAll,
        requested_payouts: agg.countRequested,
        pending_payouts: agg.countPending,
        completed_payouts: agg.countCompleted,
        failed_payouts: agg.countFailed,
        cancelled_payouts: agg.countCancelled,
        total_amount_requested: Number(agg.totalRequestedAmount || 0).toFixed(2),
        total_completed: Number(agg.totalCompletedAmount || 0).toFixed(2),
        total_pending: Number(agg.totalPendingAmount || 0).toFixed(2),
        total_commission_paid: Number(agg.totalCommission || 0).toFixed(2),
      },
      merchant_info: {
        merchantId: req.merchantId,
        merchantName: req.merchantName,
        merchantEmail: req.user.email,
      },
    });

    console.log(`✅ Returned ${maskedPayouts.length} payouts to admin ${req.user.name}`);
  } catch (error) {
    console.error("❌ Get My Payouts Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payout history",
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
