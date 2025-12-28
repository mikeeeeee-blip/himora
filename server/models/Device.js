const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['admin', 'superAdmin'],
        required: true,
        index: true
    },
    pushToken: {
        type: String,
        required: true,
        unique: true,
        sparse: true
    },
    platform: {
        type: String,
        enum: ['android', 'ios', 'web'],
        default: 'android'
    },
    deviceId: {
        type: String,
        default: null
    },
    appVersion: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUsedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient queries
DeviceSchema.index({ userId: 1, role: 1 });
DeviceSchema.index({ pushToken: 1 });

// Update updatedAt on save
DeviceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Device', DeviceSchema);

