/**
 * Ledger Posting – line item for a journal entry.
 * Enforces Dr = Cr at journal level (via service), not per-posting.
 */

const mongoose = require('mongoose');

const PostingSchema = new mongoose.Schema({
  journalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    required: true,
    index: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  side: {
    type: String,
    enum: ['dr', 'cr'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  ref: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('Posting', PostingSchema);
