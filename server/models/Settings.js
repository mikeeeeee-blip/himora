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
    
    // Transaction-count-based rotation settings (always active)
    timeBasedRotation: {
        activeGateway: { type: String, default: null }, // Currently active gateway
        transactionCount: { type: Number, default: 0 }, // Transaction count for current gateway
        gatewayIntervals: {
            paytm: { type: Number, default: 10 }, // 10 transactions
            easebuzz: { type: Number, default: 5 }, // 5 transactions
            razorpay: { type: Number, default: 10 }, // Default 10 transactions
            phonepe: { type: Number, default: 10 }, // Default 10 transactions
            sabpaisa: { type: Number, default: 10 }, // Default 10 transactions
            cashfree: { type: Number, default: 10 } // Default 10 transactions
        }
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
            },
            timeBasedRotation: {
                activeGateway: 'paytm',
                transactionCount: 0,
                gatewayIntervals: {
                    paytm: 10,
                    easebuzz: 5,
                    razorpay: 10,
                    phonepe: 10,
                    sabpaisa: 10,
                    cashfree: 10
                }
            }
        });
    } else {
        // Initialize transaction-count-based rotation if not set
        if (!settings.timeBasedRotation) {
            const enabledGateways = settings.getEnabledGateways();
            settings.timeBasedRotation = {
                activeGateway: enabledGateways.length > 0 ? enabledGateways[0] : null,
                transactionCount: 0,
                gatewayIntervals: {
                    paytm: 10,
                    easebuzz: 5,
                    razorpay: 10,
                    phonepe: 10,
                    sabpaisa: 10,
                    cashfree: 10
                }
            };
            await settings.save();
        } else if (settings.timeBasedRotation.transactionCount === undefined || settings.timeBasedRotation.transactionCount === null) {
            // Initialize transaction count if missing
            const enabledGateways = settings.getEnabledGateways();
            if (enabledGateways.length > 0) {
                settings.timeBasedRotation.activeGateway = enabledGateways[0];
                settings.timeBasedRotation.transactionCount = 0;
                await settings.save();
            }
        }
    }
    return settings;
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

// Get current active gateway based on transaction-count-based rotation (always active)
SettingsSchema.methods.getActiveGatewayByTime = function() {
    const enabledGateways = this.getEnabledGateways();
    if (enabledGateways.length === 0) {
        return null;
    }

    // Initialize transaction-count-based rotation if not set
    if (!this.timeBasedRotation) {
        this.timeBasedRotation = {
            activeGateway: null,
            transactionCount: 0,
            gatewayIntervals: {
                paytm: 10,
                easebuzz: 5,
                razorpay: 10,
                phonepe: 10,
                sabpaisa: 10,
                cashfree: 10
            }
        };
    }

    const intervals = this.timeBasedRotation.gatewayIntervals || {};
    
    // If only one gateway is enabled, always return it
    if (enabledGateways.length === 1) {
        const singleGateway = enabledGateways[0];
        // Initialize if needed
        if (!this.timeBasedRotation.activeGateway || this.timeBasedRotation.transactionCount === undefined || this.timeBasedRotation.transactionCount === null) {
            this.timeBasedRotation.activeGateway = singleGateway;
            this.timeBasedRotation.transactionCount = 0;
        }
        return singleGateway;
    }

    // Multiple gateways - use transaction-count-based rotation
    // Sort enabled gateways for consistent order
    const sortedEnabledGateways = [...enabledGateways].sort();
    
    // Initialize if not set
    if (!this.timeBasedRotation.activeGateway || this.timeBasedRotation.transactionCount === undefined || this.timeBasedRotation.transactionCount === null) {
        this.timeBasedRotation.activeGateway = sortedEnabledGateways[0];
        this.timeBasedRotation.transactionCount = 0;
        return sortedEnabledGateways[0];
    }

    // Get current active gateway and its transaction count
    let currentActiveGateway = this.timeBasedRotation.activeGateway;
    let transactionCount = this.timeBasedRotation.transactionCount || 0;
    
    // Verify current active gateway is still enabled
    if (!sortedEnabledGateways.includes(currentActiveGateway)) {
        // Current gateway was disabled, switch to first enabled
        currentActiveGateway = sortedEnabledGateways[0];
        transactionCount = 0;
        this.timeBasedRotation.activeGateway = currentActiveGateway;
        this.timeBasedRotation.transactionCount = 0;
        return currentActiveGateway;
    }

    // Get transaction limit for current active gateway
    const currentGatewayLimit = intervals[currentActiveGateway] || 10;
    
    // Check if current gateway's transaction limit has been reached
    if (transactionCount >= currentGatewayLimit) {
        // Current gateway limit reached, switch to next gateway
        const currentIndex = sortedEnabledGateways.indexOf(currentActiveGateway);
        const nextIndex = (currentIndex + 1) % sortedEnabledGateways.length;
        const nextGateway = sortedEnabledGateways[nextIndex];
        
        // Update to next gateway and reset transaction count
        this.timeBasedRotation.activeGateway = nextGateway;
        this.timeBasedRotation.transactionCount = 0;
        
        console.log(`🔄 Gateway rotation: ${currentActiveGateway} → ${nextGateway}`);
        console.log(`   ${currentActiveGateway} processed ${transactionCount} transactions (limit: ${currentGatewayLimit})`);
        
        return nextGateway;
    }
    
    // Current gateway is still active (transaction limit not reached)
    return currentActiveGateway;
};

// Increment transaction count for current active gateway
SettingsSchema.methods.incrementTransactionCount = function() {
    if (!this.timeBasedRotation) {
        this.timeBasedRotation = {
            activeGateway: null,
            transactionCount: 0,
            gatewayIntervals: {
                paytm: 10,
                easebuzz: 5,
                razorpay: 10,
                phonepe: 10,
                sabpaisa: 10,
                cashfree: 10
            }
        };
    }
    
    // Get current active gateway (this may trigger rotation if limit reached)
    const activeGateway = this.getActiveGatewayByTime();
    
    // Increment transaction count for current gateway
    this.timeBasedRotation.transactionCount = (this.timeBasedRotation.transactionCount || 0) + 1;
    
    return activeGateway;
};

// Get remaining transaction count for current active gateway
SettingsSchema.methods.getRemainingTimeForActiveGateway = function() {
    const enabledGateways = this.getEnabledGateways();
    if (enabledGateways.length === 0) {
        return null;
    }

    // Get current active gateway (this will update if needed)
    const activeGateway = this.getActiveGatewayByTime();
    if (!activeGateway) {
        return null;
    }

    // Initialize if not set
    if (!this.timeBasedRotation) {
        this.timeBasedRotation = {
            activeGateway: null,
            transactionCount: 0,
            gatewayIntervals: {
                paytm: 10,
                easebuzz: 5,
                razorpay: 10,
                phonepe: 10,
                sabpaisa: 10,
                cashfree: 10
            }
        };
    }

    const intervals = this.timeBasedRotation.gatewayIntervals || {};
    const gatewayLimit = intervals[activeGateway] || 10;
    const currentCount = this.timeBasedRotation.transactionCount || 0;
    
    // Calculate remaining transactions before rotation
    const remainingTransactions = Math.max(0, gatewayLimit - currentCount);
    
    // Return as "remaining transactions" (we'll use this field for transaction count)
    return remainingTransactions;
};

module.exports = mongoose.model('Settings', SettingsSchema);

