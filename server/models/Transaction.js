const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true,
    },
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    merchantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    
    // Razorpay Fields
    razorpayPaymentLinkId: String,
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpayReferenceId: String,
    
    // Paytm Fields
    paytmOrderId: String,
    paytmPaymentId: String,
    paytmPaymentUrl: String, // Store Paytm payment URL for checkout page
    paytmReferenceId: String,
 
    // Easebuzz Fields
    easebuzzOrderId: String,
    easebuzzPaymentId: String,
    easebuzzReferenceId: String,
    
    // SabPaisa Fields
    sabpaisaClientTxnId: String,
    sabpaisaPaymentId: String,
    sabpaisaReferenceId: String,
    
    // Cashfree Fields
    cashfreeOrderToken: String,
    cashfreePaymentId: String,
    cashfreeOrderId: String,
    cashfreeEnvironment: String, // 'sandbox' or 'production' - stored when transaction is created
    
    // PayU Fields
    payuOrderId: String,
    payuPaymentId: String,
    payuReferenceId: String,
    payuIntentData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }, // Stores UPI Intent data from S2S API
    
    // Payment Gateway
    paymentGateway: String, // 'razorpay', 'paytm', 'phonepe', 'cashfree', 'easebuzz', 'sabpaisa', or 'payu'
    
    // URLs
    callbackUrl: String,
    successUrl: String,
    failureUrl: String,

    // Merchant
    merchantName: {
        type: String,
        required: true,
    },
    
    // Customer Details
    customerId: {
        type: String,
        required: true,
    },
    customerName: {
        type: String,
        required: true,
    },
    customerEmail: {
        type: String,
        required: true,
    },
    customerPhone: {
        type: String,
        required: true,
    },
    
    // Payment Details
    amount: {
        type: Number,
        required: true,
        min: 1,
    },
    commission : {
        type : Number,
        required : false
    },
    netAmount : {
        type : Number,
        required : false
    },
    currency: {
        type: String,
        default: 'INR',
    },
    description: {
        type: String,
        default: '',
    },
    
    // Status
    status: {
        type: String,
        enum: ['created', 'pending', 'paid', 'failed', 'cancelled', 'refunded', 'partial_refund', 'expired'],
        default: 'created',
    },
    
    // Payment Method
    paymentMethod: String, // 'upi', 'card', 'netbanking', 'wallet'
    
    // ✅ ACQUIRER DATA - Bank/Payment Details
    acquirerData: {
        utr: String, // UTR for UPI/NEFT/RTGS
        rrn: String, // Retrieval Reference Number (UPI)
        bank_transaction_id: String, // Bank's transaction ID
        auth_code: String, // Card authorization code
        card_last4: String, // Last 4 digits of card
        card_network: String, // Visa, Mastercard, etc.
        bank_name: String, // Bank name
        vpa: String // UPI VPA (e.g., user@paytm)
    },
    
    // Settlement Info
    settlementStatus: {
        type: String,
        enum: ['unsettled', 'settled', 'on_hold'],
        default: 'unsettled'
    },
    settlementDate: {
        type: Date,
        default: null
    },

    // Payout Info
    payoutId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payout',
        default: null
    },
    payoutStatus: {
        type: String,
        enum: ['unpaid', 'requested', 'paid'],
        default: 'unpaid'
    },
   expectedSettlementDate: {
    type: Date,
    default: null // ✅ Will be calculated properly when payment is marked as 'paid'
}
,// User.js (Admin schema)


    
    // Timestamps
    paidAt: Date,
    
    // Failure Data
    failureReason: String,
    failureCode: String,
    
    // Webhook Data
    webhookData: Object,
    
    // Refund Data
    refundAmount: {
        type: Number,
        default: 0,
    },
    refundReason: String,
    refundedAt: Date,
    refundId: String,
    deepLinks: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

TransactionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Indexes for fast queries
// Note: orderId and transactionId already have unique indexes from schema definition
TransactionSchema.index({ merchantId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ 'acquirerData.utr': 1 }); // ✅ Index for UTR search
TransactionSchema.index({ razorpayPaymentId: 1 });
TransactionSchema.index({ paytmOrderId: 1 });
TransactionSchema.index({ paytmPaymentId: 1 });
TransactionSchema.index({ easebuzzOrderId: 1 });
TransactionSchema.index({ payuOrderId: 1 });
TransactionSchema.index({ payuPaymentId: 1 });
TransactionSchema.index({ easebuzzPaymentId: 1 });
TransactionSchema.index({ sabpaisaClientTxnId: 1 });
TransactionSchema.index({ sabpaisaPaymentId: 1 });
TransactionSchema.index({ cashfreeOrderId: 1 });
TransactionSchema.index({ cashfreePaymentId: 1 });
TransactionSchema.index({ cashfreeOrderToken: 1 });
TransactionSchema.index({ customerEmail: 1 });
TransactionSchema.index({ customerPhone: 1 });

// ✅ Compound indexes for balance API optimization
TransactionSchema.index({ merchantId: 1, status: 1, settlementStatus: 1 }); // For balance aggregations
TransactionSchema.index({ merchantId: 1, status: 1, settlementStatus: 1, expectedSettlementDate: 1 }); // For next settlement query
TransactionSchema.index({ merchantId: 1, updatedAt: 1 }); // For date range queries
TransactionSchema.index({ merchantId: 1, status: 1, createdAt: 1, updatedAt: 1 }); // For week/month aggregations

// ✅ Indexes for transactions API optimization
TransactionSchema.index({ merchantId: 1, createdAt: -1 }); // For default sorting (already exists, but ensure it's there)
TransactionSchema.index({ merchantId: 1, status: 1, createdAt: -1 }); // For status-filtered queries with sorting
TransactionSchema.index({ merchantId: 1, paymentGateway: 1, createdAt: -1 }); // For gateway-filtered queries
TransactionSchema.index({ merchantId: 1, paymentMethod: 1, createdAt: -1 }); // For payment method-filtered queries
TransactionSchema.index({ merchantId: 1, status: 1, paymentGateway: 1, createdAt: -1 }); // For combined filters

// ✅ Indexes for search transactions API optimization
TransactionSchema.index({ merchantId: 1, settlementStatus: 1, createdAt: -1 }); // For settlement status filter
TransactionSchema.index({ merchantId: 1, payoutStatus: 1, createdAt: -1 }); // For payout status filter
TransactionSchema.index({ merchantId: 1, amount: 1, createdAt: -1 }); // For amount range queries
TransactionSchema.index({ merchantId: 1, transactionId: 1 }); // For transactionId search (exact match)
TransactionSchema.index({ merchantId: 1, orderId: 1 }); // For orderId search (exact match)

module.exports = mongoose.model('Transaction', TransactionSchema);
