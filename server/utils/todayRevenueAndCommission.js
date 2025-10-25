import { getIstDayRange } from './getIstDayRange.js';

import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';

export async function todayRevenueAndCommission(merchantObjectId) {
  const { start, end } = getIstDayRange();
  console.log({start} , {end})
  const agg = await Transaction.aggregate([
    {
      $match: {
        merchantId: new mongoose.Types.ObjectId(merchantObjectId),
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
        totalPayinCommission: { $sum: { $ifNull: ['$commission', 0] } },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  const row = agg[0] || { totalTodayRevenue: 0, totalPayinCommission: 0, transactionCount: 0 };
  return {
    totalTodayRevenue: parseFloat(row.totalTodayRevenue.toFixed(2)),
    totalPayinCommission: parseFloat(row.totalPayinCommission.toFixed(2)),
    transactionCount: row.transactionCount
  };
}
