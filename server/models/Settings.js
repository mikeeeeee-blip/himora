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
    
    // Round-robin rotation settings (alternating between enabled gateways)
    roundRobinRotation: {
        lastUsedGatewayIndex: { type: Number, default: -1 } // Index of last used gateway in enabled gateways array
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
            roundRobinRotation: {
                lastUsedGatewayIndex: -1
            }
        });
    } else {
        // Initialize round-robin rotation if not set
        if (!settings.roundRobinRotation) {
            settings.roundRobinRotation = {
                lastUsedGatewayIndex: -1
            };
            await settings.save();
        } else if (settings.roundRobinRotation.lastUsedGatewayIndex === undefined || settings.roundRobinRotation.lastUsedGatewayIndex === null) {
            // Initialize last used gateway index if missing
            settings.roundRobinRotation.lastUsedGatewayIndex = -1;
            await settings.save();
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

// Get next gateway using round-robin/alternating logic
SettingsSchema.methods.getNextGatewayRoundRobin = function() {
    const enabledGateways = this.getEnabledGateways();
    if (enabledGateways.length === 0) {
        return null;
    }

    // Initialize round-robin rotation if not set
    if (!this.roundRobinRotation) {
        this.roundRobinRotation = {
            lastUsedGatewayIndex: -1
        };
    }

    // Sort enabled gateways for consistent order
    const sortedEnabledGateways = [...enabledGateways].sort();
    
    // If only one gateway is enabled, always return it
    if (sortedEnabledGateways.length === 1) {
        return sortedEnabledGateways[0];
    }

    // Get last used index
    let lastIndex = this.roundRobinRotation.lastUsedGatewayIndex;
    if (lastIndex === undefined || lastIndex === null) {
        lastIndex = -1;
    }
    
    console.log(`📋 Round-robin calculation:`);
    console.log(`   Enabled gateways (sorted): ${sortedEnabledGateways.join(', ')}`);
    console.log(`   Current lastUsedGatewayIndex: ${lastIndex}`);
    
    // Calculate next index (round-robin)
    const nextIndex = (lastIndex + 1) % sortedEnabledGateways.length;
    const nextGateway = sortedEnabledGateways[nextIndex];
    
    // Update last used index
    this.roundRobinRotation.lastUsedGatewayIndex = nextIndex;
    
    console.log(`🔄 Round-robin gateway selection: ${nextGateway} (index: ${nextIndex}/${sortedEnabledGateways.length - 1})`);
    console.log(`   Index progression: ${lastIndex} → ${nextIndex}`);
    
    // Mark the field as modified to ensure it's saved
    this.markModified('roundRobinRotation');
    
    return nextGateway;
};

// Get current active gateway (for display purposes)
SettingsSchema.methods.getCurrentActiveGateway = function() {
    const enabledGateways = this.getEnabledGateways();
    if (enabledGateways.length === 0) {
        return null;
    }

    if (!this.roundRobinRotation || this.roundRobinRotation.lastUsedGatewayIndex === undefined || this.roundRobinRotation.lastUsedGatewayIndex === null) {
        const sortedEnabledGateways = [...enabledGateways].sort();
        return sortedEnabledGateways[0];
    }

    const sortedEnabledGateways = [...enabledGateways].sort();
    const lastIndex = this.roundRobinRotation.lastUsedGatewayIndex;
    
    // Return the gateway that will be used next (which is the one after last used)
    if (lastIndex === -1) {
        return sortedEnabledGateways[0];
    }
    
    const nextIndex = (lastIndex + 1) % sortedEnabledGateways.length;
    return sortedEnabledGateways[nextIndex];
};

module.exports = mongoose.model('Settings', SettingsSchema);

