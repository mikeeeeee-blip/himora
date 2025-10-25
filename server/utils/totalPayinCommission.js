const mongoose = require('mongoose');
const Transaction = require('../models/Transaction'); // adjust path
const { getIstDayRange } = require('./getIstDayRange');
const COMMISSION_RATE = 0.0; // not used here but shown earlier

async function totalPayinCommissionForMerchant(merchantObjectId) {
  const { start, end } = getIstDayRange();

  const agg = await Transaction.aggregate([
    {
      $match: {
        merchantId: mongoose.Types.ObjectId(merchantObjectId),
        status: 'paid',
        $or: [
          { createdAt: { $gte: start, $lte: end } },
          { updatedAt: { $gte: start, $lte: end } }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalPayinCommission: { $sum: { $ifNull: ['$commission', 0] } },
        commissionCount: { $sum: { $cond: [{ $gt: ['$commission', 0] }, 1, 0] } },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  const row = agg[0] || { totalPayinCommission: 0, commissionCount: 0, transactionCount: 0 };
  return {
    totalPayinCommission: parseFloat((row.totalPayinCommission || 0).toFixed(2)),
    commissionCount: row.commissionCount || 0,
    transactionCount: row.transactionCount || 0
  };
}
