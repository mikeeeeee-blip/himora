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
    
    // Time-based rotation settings
    timeBasedRotation: {
        enabled: { type: Boolean, default: false },
        activeGateway: { type: String, default: null }, // Currently active gateway
        rotationStartTime: { type: Date, default: null }, // When current gateway became active
        gatewayIntervals: {
            paytm: { type: Number, default: 10 }, // 10 minutes
            easebuzz: { type: Number, default: 5 }, // 5 minutes
            razorpay: { type: Number, default: 10 }, // Default 10 minutes
            phonepe: { type: Number, default: 10 }, // Default 10 minutes
            sabpaisa: { type: Number, default: 10 }, // Default 10 minutes
            cashfree: { type: Number, default: 10 } // Default 10 minutes
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

// Get current active gateway based on time-based rotation
SettingsSchema.methods.getActiveGatewayByTime = function() {
    if (!this.timeBasedRotation || !this.timeBasedRotation.enabled) {
        return null;
    }

    const enabledGateways = this.getEnabledGateways();
    if (enabledGateways.length === 0) {
        return null;
    }

    // If only one gateway is enabled, always return it
    if (enabledGateways.length === 1) {
        return enabledGateways[0];
    }

    const now = new Date();
    let currentTime = this.timeBasedRotation.rotationStartTime 
        ? new Date(this.timeBasedRotation.rotationStartTime).getTime()
        : now.getTime();
    
    let activeGateway = this.timeBasedRotation.activeGateway || enabledGateways[0];
    const intervals = this.timeBasedRotation.gatewayIntervals || {};
    
    // Calculate total cycle time (sum of intervals for enabled gateways)
    const enabledIntervals = enabledGateways.map(gw => ({
        name: gw,
        interval: (intervals[gw] || 10) * 60 * 1000 // Convert minutes to milliseconds
    }));
    
    const totalCycleTime = enabledIntervals.reduce((sum, gw) => sum + gw.interval, 0);
    
    // Calculate elapsed time since rotation started
    const elapsedTime = now.getTime() - currentTime;
    
    // Handle negative elapsed time (clock adjustments, etc.)
    if (elapsedTime < 0) {
        currentTime = now.getTime();
        activeGateway = enabledGateways[0];
        this.timeBasedRotation.rotationStartTime = now;
        this.timeBasedRotation.activeGateway = activeGateway;
        return activeGateway;
    }
    
    // Calculate how many full cycles have passed
    const cyclesPassed = Math.floor(elapsedTime / totalCycleTime);
    const timeInCurrentCycle = elapsedTime % totalCycleTime;
    
    // Find which gateway should be active in current cycle
    let accumulatedTime = 0;
    for (const gw of enabledIntervals) {
        if (timeInCurrentCycle < accumulatedTime + gw.interval) {
            activeGateway = gw.name;
            break;
        }
        accumulatedTime += gw.interval;
    }
    
    // Update rotation start time if gateway changed
    if (activeGateway !== this.timeBasedRotation.activeGateway || cyclesPassed > 0) {
        // Calculate new start time for current gateway
        const gatewayIndex = enabledIntervals.findIndex(gw => gw.name === activeGateway);
        const timeOffset = enabledIntervals.slice(0, gatewayIndex).reduce((sum, gw) => sum + gw.interval, 0);
        const newStartTime = new Date(now.getTime() - (timeInCurrentCycle - timeOffset));
        
        this.timeBasedRotation.activeGateway = activeGateway;
        this.timeBasedRotation.rotationStartTime = newStartTime;
    }
    
    return activeGateway;
};

// Get remaining time for current active gateway
SettingsSchema.methods.getRemainingTimeForActiveGateway = function() {
    if (!this.timeBasedRotation || !this.timeBasedRotation.enabled) {
        return null;
    }

    const enabledGateways = this.getEnabledGateways();
    if (enabledGateways.length === 0) {
        return null;
    }

    const activeGateway = this.getActiveGatewayByTime();
    if (!activeGateway) {
        return null;
    }

    const intervals = this.timeBasedRotation.gatewayIntervals || {};
    const gatewayInterval = (intervals[activeGateway] || 10) * 60 * 1000; // Convert to milliseconds
    
    const now = new Date();
    let startTime = this.timeBasedRotation.rotationStartTime 
        ? new Date(this.timeBasedRotation.rotationStartTime).getTime()
        : now.getTime();
    
    // If only one gateway, use a simple countdown
    if (enabledGateways.length === 1) {
        const elapsedTime = now.getTime() - startTime;
        const remainingTime = Math.max(0, gatewayInterval - (elapsedTime % gatewayInterval));
        return Math.ceil(remainingTime / 1000); // Return in seconds
    }
    
    // For multiple gateways, calculate based on cycle position
    const enabledIntervals = enabledGateways.map(gw => ({
        name: gw,
        interval: (intervals[gw] || 10) * 60 * 1000
    }));
    
    const totalCycleTime = enabledIntervals.reduce((sum, gw) => sum + gw.interval, 0);
    const elapsedTime = now.getTime() - startTime;
    
    if (elapsedTime < 0) {
        return gatewayInterval / 1000; // Return full interval in seconds
    }
    
    const timeInCurrentCycle = elapsedTime % totalCycleTime;
    const gatewayIndex = enabledIntervals.findIndex(gw => gw.name === activeGateway);
    const timeOffset = enabledIntervals.slice(0, gatewayIndex).reduce((sum, gw) => sum + gw.interval, 0);
    const timeInCurrentGateway = timeInCurrentCycle - timeOffset;
    const remainingTime = Math.max(0, gatewayInterval - timeInCurrentGateway);
    
    return Math.ceil(remainingTime / 1000); // Return in seconds
};

module.exports = mongoose.model('Settings', SettingsSchema);

