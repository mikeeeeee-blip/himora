/**
 * Ledger Account – chart of accounts per tenant.
 * Tenant-scoped: each account belongs to one tenant (merchant).
 */

const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

AccountSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Account', AccountSchema);
