/**
 * Universal Callback Payload Utility
 * 
 * This utility normalizes webhook payloads from different payment gateways
 * into a consistent, documented format that merchants can rely on.
 * 
 * All payment gateways (Easebuzz, Paytm, Razorpay, PhonePe, etc.) will
 * send webhooks in this unified format to merchants.
 */

/**
 * Normalize a transaction object into a universal callback payload
 * 
 * @param {Object} transaction - Transaction document from database
 * @param {String} event - Event type ('payment.success', 'payment.failed', 'payment.pending', 'payment.cancelled')
 * @param {Object} gatewaySpecificData - Optional gateway-specific data to include
 * @returns {Object} Universal callback payload
 */
function createUniversalCallbackPayload(transaction, event, gatewaySpecificData = {}) {
    if (!transaction) {
        throw new Error('Transaction is required');
    }

    if (!event) {
        throw new Error('Event type is required');
    }

    // Base payload structure
    const payload = {
        // Event metadata
        event: event,
        timestamp: new Date().toISOString(),
        
        // Transaction identifiers
        transaction_id: transaction.transactionId,
        order_id: transaction.orderId || null,
        merchant_id: transaction.merchantId?._id?.toString() || transaction.merchantId?.toString() || null,
        
        // Payment details
        data: {
            // Core transaction information
            transaction_id: transaction.transactionId,
            order_id: transaction.orderId || null,
            amount: transaction.amount,
            currency: transaction.currency || 'INR',
            status: transaction.status,
            payment_method: transaction.paymentMethod || null,
            
            // Timestamps
            paid_at: transaction.paidAt ? transaction.paidAt.toISOString() : null,
            created_at: transaction.createdAt ? transaction.createdAt.toISOString() : null,
            updated_at: transaction.updatedAt ? transaction.updatedAt.toISOString() : null,
            
            // Financial details
            commission: transaction.commission || 0,
            net_amount: transaction.netAmount || transaction.amount,
            
            // Settlement information
            settlement_status: transaction.settlementStatus || null,
            expected_settlement_date: transaction.expectedSettlementDate ? transaction.expectedSettlementDate.toISOString() : null,
            
            // Payment gateway identifiers (normalized)
            gateway: transaction.paymentGateway || transaction.gateway || null,
            gateway_order_id: getGatewayOrderId(transaction),
            gateway_payment_id: getGatewayPaymentId(transaction),
            gateway_reference_id: getGatewayReferenceId(transaction),
            
            // Acquirer/Bank information (normalized)
            acquirer: {
                utr: transaction.acquirerData?.utr || null,
                rrn: transaction.acquirerData?.rrn || null,
                bank_transaction_id: transaction.acquirerData?.bank_transaction_id || null,
                bank_name: transaction.acquirerData?.bank_name || null,
                vpa: transaction.acquirerData?.vpa || null
            },
            
            // Customer information
            customer: {
                customer_id: transaction.customerId || null,
                name: transaction.customerName || null,
                email: transaction.customerEmail || null,
                phone: transaction.customerPhone || null
            },
            
            // Merchant information
            merchant: {
                merchant_id: transaction.merchantId?._id?.toString() || transaction.merchantId?.toString() || null,
                merchant_name: transaction.merchantName || null
            },
            
            // Transaction description
            description: transaction.description || null,
            
            // Failure information (only for failed payments)
            failure_reason: transaction.failureReason || null,
            
            // Gateway-specific data (optional, for advanced use cases)
            gateway_metadata: gatewaySpecificData
        }
    };

    return payload;
}

/**
 * Extract gateway order ID from transaction (normalized across all gateways)
 */
function getGatewayOrderId(transaction) {
    if (!transaction) return null;
    
    return transaction.easebuzzOrderId || 
           transaction.paytmOrderId || 
           transaction.razorpayOrderId || 
           transaction.razorpayPaymentLinkId || // Razorpay uses payment link ID as order identifier
           transaction.phonepeOrderId || 
           transaction.orderId || 
           null;
}

/**
 * Extract gateway payment ID from transaction (normalized across all gateways)
 */
function getGatewayPaymentId(transaction) {
    if (!transaction) return null;
    
    return transaction.easebuzzPaymentId || 
           transaction.paytmPaymentId || 
           transaction.razorpayPaymentId || 
           transaction.phonepePaymentId || 
           null;
}

/**
 * Extract gateway reference ID from transaction (normalized across all gateways)
 */
function getGatewayReferenceId(transaction) {
    if (!transaction) return null;
    
    return transaction.easebuzzReferenceId || 
           transaction.paytmReferenceId || 
           transaction.razorpayReferenceId || 
           transaction.phonepeReferenceId || 
           null;
}

/**
 * Create a success payload
 */
function createSuccessPayload(transaction, gatewaySpecificData = {}) {
    return createUniversalCallbackPayload(transaction, 'payment.success', gatewaySpecificData);
}

/**
 * Create a failed payload
 */
function createFailedPayload(transaction, gatewaySpecificData = {}) {
    return createUniversalCallbackPayload(transaction, 'payment.failed', gatewaySpecificData);
}

/**
 * Create a pending payload
 */
function createPendingPayload(transaction, gatewaySpecificData = {}) {
    return createUniversalCallbackPayload(transaction, 'payment.pending', gatewaySpecificData);
}

/**
 * Create a cancelled payload
 */
function createCancelledPayload(transaction, gatewaySpecificData = {}) {
    return createUniversalCallbackPayload(transaction, 'payment.cancelled', gatewaySpecificData);
}

module.exports = {
    createUniversalCallbackPayload,
    createSuccessPayload,
    createFailedPayload,
    createPendingPayload,
    createCancelledPayload,
    getGatewayOrderId,
    getGatewayPaymentId,
    getGatewayReferenceId
};

