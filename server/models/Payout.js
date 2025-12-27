const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
    payoutId: { type: String, required: true, unique: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    merchantName: String,

    amount: { type: Number, required: true },
    commission: { type: Number, required: true },
    commissionType: { type: String, enum: ['flat', 'percentage'] }, // ✅ NEW
    commissionBreakdown: { type: Object }, // ✅ NEW: Stores detailed breakdown
    netAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    transferMode: { type: String, enum: ['bank_transfer', 'upi', 'crypto'], required: true },
    beneficiaryDetails: {
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
        bankName: String,
        branchName: String,
        upiId: String,
        // Crypto payout details
        walletAddress: String,
        networkName: String, // e.g., 'Ethereum', 'Bitcoin', 'Polygon', 'BSC'
        currencyName: String  // e.g., 'USDT', 'USDC', 'BTC', 'ETH'
    },

    status: {
        type: String,
        enum: ['requested', 'rejected', 'pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'requested'
    },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedByName: String,
    requestedAt: Date,

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedByName: String,
    approvedAt: Date,

    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedByName: String,
    processedAt: Date,

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedByName: String,
    rejectedAt: Date,
    rejectionReason: String,
    // Payout.js
    commissionType: {
        type: String,
        enum: ['free', 'tier1', 'tier2', 'percentage', 'flat'], // ✅ ADD 'flat'
        default: 'tier1'
    },
    description: { type: String }
    ,
    commissionBreakdown: {
        type: Object,
        default: {}
    }
    ,
    adminNotes: String,
    utr: String,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// ✅ Add indexes for faster queries (especially for balance API)
PayoutSchema.index({ merchantId: 1, status: 1 }); // For payout aggregations
PayoutSchema.index({ merchantId: 1, createdAt: 1, updatedAt: 1 }); // For date range queries
PayoutSchema.index({ merchantId: 1, status: 1, createdAt: 1, updatedAt: 1 }); // For week/month aggregations

module.exports = mongoose.model('Payout', PayoutSchema);
