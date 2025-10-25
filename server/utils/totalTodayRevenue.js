const mongoose = require('mongoose');
const Transaction = require('../models/Transaction'); // adjust path
const { getIstDayRange } = require('./getIstDayRange');
const COMMISSION_RATE = 0.0; // not used here but shown earlier

async function totalTodayRevenueForMerchant(merchantObjectId) {
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
        totalTodayRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  const row = agg[0] || { totalTodayRevenue: 0, transactionCount: 0 };
  return {
    totalTodayRevenue: parseFloat((row.totalTodayRevenue || 0).toFixed(2)),
    transactionCount: row.transactionCount || 0
  };
}
