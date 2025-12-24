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
        enabled: { type: Boolean, default: true }, // Whether round-robin is enabled
        lastUsedGatewayIndex: { type: Number, default: -1 }, // Index of last used gateway in enabled gateways array
        // Custom rotation counts per gateway (e.g., { paytm: 3, easebuzz: 2 })
        // If set, each gateway will be used N times before moving to next
        customCounts: {
            type: Map,
            of: Number,
            default: new Map()
        },
        // Current rotation state for custom counts
        currentRotationState: {
            currentGateway: { type: String, default: null }, // Current gateway in rotation
            countUsed: { type: Number, default: 0 }, // How many times current gateway has been used
            rotationCycle: { type: Number, default: 0 } // Current rotation cycle number
        }
    },
    
    // Settlement settings
    settlement: {
        settlementDays: { type: Number, default: 1 }, // T+N days (default T+1)
        settlementHour: { type: Number, default: 16 }, // Hour of settlement (0-23, default 16 = 4 PM)
        settlementMinute: { type: Number, default: 0 }, // Minute of settlement (0-59, default 0)
        cutoffHour: { type: Number, default: 16 }, // Payment cutoff hour (0-23, default 16 = 4 PM)
        cutoffMinute: { type: Number, default: 0 }, // Payment cutoff minute (0-59, default 0)
        skipWeekends: { type: Boolean, default: true }, // Whether to skip weekends
        cronSchedule: { type: String, default: '*/15 * * * 1-6' }, // Cron expression for settlement job (default: every 15 minutes, Mon-Sat)
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
                enabled: true,
                lastUsedGatewayIndex: -1,
                customCounts: new Map(),
                currentRotationState: {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                }
            },
            settlement: {
                settlementDays: 1,
                settlementHour: 16,
                settlementMinute: 0,
                cutoffHour: 16,
                cutoffMinute: 0,
                skipWeekends: true,
                cronSchedule: '*/15 * * * 1-6'
            }
        });
    } else {
        // Initialize round-robin rotation if not set
        if (!settings.roundRobinRotation) {
            settings.roundRobinRotation = {
                enabled: true,
                lastUsedGatewayIndex: -1,
                customCounts: new Map(),
                currentRotationState: {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                }
            };
            await settings.save();
        } else {
            // Initialize missing fields
            if (settings.roundRobinRotation.enabled === undefined) {
                settings.roundRobinRotation.enabled = true;
            }
            if (settings.roundRobinRotation.lastUsedGatewayIndex === undefined || settings.roundRobinRotation.lastUsedGatewayIndex === null) {
                settings.roundRobinRotation.lastUsedGatewayIndex = -1;
            }
            if (!settings.roundRobinRotation.customCounts) {
                settings.roundRobinRotation.customCounts = new Map();
            }
            if (!settings.roundRobinRotation.currentRotationState) {
                settings.roundRobinRotation.currentRotationState = {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                };
            }
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
            enabled: true,
            lastUsedGatewayIndex: -1,
            customCounts: new Map(),
            currentRotationState: {
                currentGateway: null,
                countUsed: 0,
                rotationCycle: 0
            }
        };
    }

    // If round-robin is disabled, return the first enabled gateway
    if (this.roundRobinRotation.enabled === false) {
        const sortedEnabledGateways = [...enabledGateways].sort();
        return sortedEnabledGateways[0];
    }

    // Sort enabled gateways for consistent order
    const sortedEnabledGateways = [...enabledGateways].sort();
    
    // If only one gateway is enabled, always return it
    if (sortedEnabledGateways.length === 1) {
        return sortedEnabledGateways[0];
    }

    // Check if custom counts are configured
    const customCounts = this.roundRobinRotation.customCounts;
    const hasCustomCounts = customCounts && customCounts.size > 0;
    
    // Filter custom counts to only include enabled gateways
    const enabledCustomCounts = new Map();
    if (hasCustomCounts) {
        sortedEnabledGateways.forEach(gateway => {
            const count = customCounts.get(gateway);
            if (count && count > 0) {
                enabledCustomCounts.set(gateway, count);
            }
        });
    }

    // If custom counts are configured and valid, use custom rotation logic
    if (enabledCustomCounts.size > 0) {
        return this.getNextGatewayCustomRotation(sortedEnabledGateways, enabledCustomCounts);
    }

    // Default round-robin logic (alternating)
    // Get last used index
    let lastIndex = this.roundRobinRotation.lastUsedGatewayIndex;
    if (lastIndex === undefined || lastIndex === null) {
        lastIndex = -1;
    }
    
    console.log(`📋 Round-robin calculation (default alternating):`);
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

// Get next gateway using custom rotation counts
SettingsSchema.methods.getNextGatewayCustomRotation = function(sortedEnabledGateways, customCounts) {
    // Initialize rotation state if not set
    if (!this.roundRobinRotation.currentRotationState) {
        this.roundRobinRotation.currentRotationState = {
            currentGateway: null,
            countUsed: 0,
            rotationCycle: 0
        };
    }

    const state = this.roundRobinRotation.currentRotationState;
    let currentGateway = state.currentGateway;
    let countUsed = state.countUsed || 0;
    let rotationCycle = state.rotationCycle || 0;

    // If no current gateway or count reached, move to next gateway
    if (!currentGateway || !customCounts.has(currentGateway) || countUsed >= customCounts.get(currentGateway)) {
        // Find next gateway in sorted order
        const currentIndex = currentGateway ? sortedEnabledGateways.indexOf(currentGateway) : -1;
        const nextIndex = (currentIndex + 1) % sortedEnabledGateways.length;
        currentGateway = sortedEnabledGateways[nextIndex];
        countUsed = 0;
        
        // If we've cycled back to the first gateway, increment rotation cycle
        if (nextIndex === 0 && currentGateway !== null) {
            rotationCycle = (rotationCycle || 0) + 1;
        }
    }

    // Increment count used for current gateway
    countUsed += 1;
    
    // Update rotation state
    state.currentGateway = currentGateway;
    state.countUsed = countUsed;
    state.rotationCycle = rotationCycle;

    const gatewayCount = customCounts.get(currentGateway);
    console.log(`📋 Custom rotation calculation:`);
    console.log(`   Enabled gateways: ${sortedEnabledGateways.join(', ')}`);
    console.log(`   Custom counts: ${Array.from(customCounts.entries()).map(([g, c]) => `${g}:${c}`).join(', ')}`);
    console.log(`   Current gateway: ${currentGateway} (${countUsed}/${gatewayCount})`);
    console.log(`   Rotation cycle: ${rotationCycle}`);
    
    // Mark as modified
    this.markModified('roundRobinRotation');
    
    return currentGateway;
};

// Get current active gateway (for display purposes)
SettingsSchema.methods.getCurrentActiveGateway = function() {
    const enabledGateways = this.getEnabledGateways();
    if (enabledGateways.length === 0) {
        return null;
    }

    // If round-robin is disabled, return first enabled gateway
    if (this.roundRobinRotation?.enabled === false) {
        const sortedEnabledGateways = [...enabledGateways].sort();
        return sortedEnabledGateways[0];
    }

    // Check for custom rotation
    const customCounts = this.roundRobinRotation?.customCounts;
    if (customCounts && customCounts.size > 0) {
        const sortedEnabledGateways = [...enabledGateways].sort();
        const enabledCustomCounts = new Map();
        sortedEnabledGateways.forEach(gateway => {
            const count = customCounts.get(gateway);
            if (count && count > 0) {
                enabledCustomCounts.set(gateway, count);
            }
        });
        
        if (enabledCustomCounts.size > 0) {
            const state = this.roundRobinRotation?.currentRotationState;
            if (state && state.currentGateway && enabledCustomCounts.has(state.currentGateway)) {
                return state.currentGateway;
            }
            // Return first gateway with custom count
            return sortedEnabledGateways.find(g => enabledCustomCounts.has(g)) || sortedEnabledGateways[0];
        }
    }

    // Default round-robin logic
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

