/**
 * Ledger JournalEntry – immutable once posted.
 * Tenant-scoped. No updates/deletes after isPosted = true.
 */

const mongoose = require('mongoose');

const JournalEntrySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  externalId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['capture', 'partial_refund', 'dispute_reversal', 'adjustment', 'other'],
    required: true,
  },
  orderId: { type: String, trim: true },
  txnId: { type: String, trim: true },
  reference: { type: String, trim: true },
  memo: { type: String, trim: true },
  isPosted: {
    type: Boolean,
    default: false,
  },
  postedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

JournalEntrySchema.index({ tenantId: 1, createdAt: -1 });
JournalEntrySchema.index({ tenantId: 1, type: 1 });

// Immutability: reject updates when isPosted
JournalEntrySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isModified('isPosted') && this.isPosted) {
    this.postedAt = this.postedAt || new Date();
  }
  if (!this.isNew && this.isPosted) {
    return next(new Error('Cannot modify posted journal entry. Use adjustment entries instead.'));
  }
  next();
});

JournalEntrySchema.pre('deleteOne', { document: true, query: false }, function (next) {
  if (this.isPosted) {
    next(new Error('Cannot delete posted journal entry.'));
    return;
  }
  next();
});

module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
