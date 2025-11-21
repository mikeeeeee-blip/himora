const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // Platform-wide settings
    paymentGateways: {
        razorpay: {
            enabled: { type: Boolean, default: false },
            isDefault: { type: Boolean, default: false }
        },
        paytm: {
            enabled: { type: Boolean, default: false },
            isDefault: { type: Boolean, default: false }
        },
        phonepe: {
            enabled: { type: Boolean, default: false },
            isDefault: { type: Boolean, default: false }
        },
        easebuzz: {
            enabled: { type: Boolean, default: false },
            isDefault: { type: Boolean, default: false }
        },
        sabpaisa: {
            enabled: { type: Boolean, default: false },
            isDefault: { type: Boolean, default: false }
        },
        cashfree: {
            enabled: { type: Boolean, default: false },
            isDefault: { type: Boolean, default: false }
        }
    },
    
    // Rotation counter for load balancing when multiple gateways are enabled
    rotationCounter: {
        type: Number,
        default: 0
    },
    
    // Metadata
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        // Create default settings with Paytm as default (or first enabled gateway)
        settings = await this.create({
            paymentGateways: {
                paytm: { enabled: true, isDefault: true },
                razorpay: { enabled: false, isDefault: false },
                phonepe: { enabled: false, isDefault: false },
                easebuzz: { enabled: false, isDefault: false },
                sabpaisa: { enabled: false, isDefault: false },
                cashfree: { enabled: false, isDefault: false }
            }
        });
    }
    return settings;
};

// Get the default payment gateway
SettingsSchema.methods.getDefaultGateway = function() {
    const gateways = this.paymentGateways;
    for (const [key, value] of Object.entries(gateways)) {
        if (value.enabled && value.isDefault) {
            return key;
        }
    }
    // If no default, return first enabled gateway
    for (const [key, value] of Object.entries(gateways)) {
        if (value.enabled) {
            return key;
        }
    }
    return null; // No gateway enabled
};

// Get enabled gateways list
SettingsSchema.methods.getEnabledGateways = function() {
    const enabled = [];
    for (const [key, value] of Object.entries(this.paymentGateways)) {
        if (value.enabled) {
            enabled.push(key);
        }
    }
    return enabled;
};

module.exports = mongoose.model('Settings', SettingsSchema);

