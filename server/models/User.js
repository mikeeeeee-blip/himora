const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // Basic Info
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    
    // Role
    role: {
        type: String,
        enum: ['admin', 'superAdmin', 'subSuperAdmin'],
        default: 'admin',
    },
    
    // Access Controls (for subSuperAdmin role)
    accessControls: {
        // Dashboard access
        canViewDashboard: { type: Boolean, default: true },
        
        // Transaction management
        canViewTransactions: { type: Boolean, default: true },
        canManageTransactions: { type: Boolean, default: true },
        canSettleTransactions: { type: Boolean, default: true },
        
        // Payout management
        canViewPayouts: { type: Boolean, default: true },
        canApprovePayouts: { type: Boolean, default: true },
        canRejectPayouts: { type: Boolean, default: true },
        canProcessPayouts: { type: Boolean, default: true },
        
        // Merchant management
        canViewMerchants: { type: Boolean, default: true },
        canManageMerchants: { type: Boolean, default: true },
        canDeleteMerchants: { type: Boolean, default: false },
        canBlockMerchantFunds: { type: Boolean, default: true },
        canChangeMerchantPassword: { type: Boolean, default: true },
        
        // Admin management (sub-superadmin can manage admins)
        canViewAdmins: { type: Boolean, default: true },
        canCreateAdmins: { type: Boolean, default: true },
        canEditAdmins: { type: Boolean, default: true },
        canDeleteAdmins: { type: Boolean, default: true },
        
        // Settings
        canViewSettings: { type: Boolean, default: true },
        canManageSettings: { type: Boolean, default: false },
        
        // Sub-superadmin management (only superAdmin can manage sub-superadmins)
        canManageSubSuperAdmins: { type: Boolean, default: false },
    },
    
    // Created by (for subSuperAdmin - tracks which superAdmin created them)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    
    // Business Details
    businessName: {
        type: String,
        default: function() { return this.name; }
    },
    businessDetails: {
        displayName: String,
        description: String,
        website: String,
        supportEmail: String,
        supportPhone: String,
        address: String,
        gstin: String
    },
    freePayoutsUnder500: {
    type: Number,
    default: 5, // 5 free payouts for amounts under ₹500
    min: 0
},
    // Blocked Balance (funds that cannot be used for payout)
    blockedBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    // API Key
    apiKey: {
        type: String,
        unique: true,
        sparse: true,
    },
    apiKeyCreatedAt: {
        type: Date,
    },
    
    // ✅ WEBHOOK CONFIGURATION (MISSING IN YOUR CODE)
    webhookUrl: {
        type: String,
        default: null
    },
    webhookSecret: {
        type: String,
        default: null
    },
    webhookEnabled: {
        type: Boolean,
        default: false
    },
    webhookEvents: {
        type: [String],
        default: ['payment.success', 'payment.failed', 'payment.pending']
    },
    webhookRetries: {
        type: Number,
        default: 3
    },
    payoutWebhookUrl: {
        type: String,
        default: null
    },
    payoutWebhookSecret: {
        type: String,
        default: null
    },
    payoutWebhookEnabled: {
        type: Boolean,
        default: false
    },
    payoutWebhookEvents: {
        type: [String],
        default: ['payment.success', 'payment.failed', 'payment.pending']
    },
    payoutWebhookRetries: {
        type: Number,
        default: 3
    },
    
    // ✅ CALLBACK URLs (MISSING IN YOUR CODE)
    successUrl: {
        type: String,
        default: null
    },
    failureUrl: {
        type: String,
        default: null
    },
    
    // ✅ COMMISSION & PAYOUT SETTINGS (OPTIONAL BUT RECOMMENDED)
    commissionRate: {
        type: Number,
        default: 2.5 // 2.5% commission
    },
    minimumPayoutAmount: {
        type: Number,
        default: 100 // Minimum ₹100
    },
    
    // ✅ STATUS & TIMESTAMPS
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastLoginAt: {
        type: Date
    }
});

// ✅ ADD INDEX FOR FASTER QUERIES
// Note: email and apiKey already have unique indexes from schema definition
// Only add non-unique indexes here if needed for compound queries

// ✅ UPDATE updatedAt ON SAVE
UserSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', UserSchema);
