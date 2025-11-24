/**
 * Test script for Universal Callback Payload
 * 
 * This script tests the universal callback payload utility to ensure:
 * 1. All payload structures are correct
 * 2. All gateways produce consistent payloads
 * 3. Required fields are present
 * 4. Gateway-specific metadata is included
 */

const {
    createSuccessPayload,
    createFailedPayload,
    createPendingPayload,
    createCancelledPayload,
    getGatewayOrderId,
    getGatewayPaymentId,
    getGatewayReferenceId
} = require('../utils/universalCallbackPayload');

// Mock transaction data for different gateways
function createMockTransaction(gateway = 'paytm') {
    const baseTransaction = {
        transactionId: 'TXN_TEST_1234567890',
        orderId: 'ORD_TEST_1234567890',
        merchantId: {
            _id: { toString: () => '507f1f77bcf86cd799439011' },
            toString: () => '507f1f77bcf86cd799439011'
        },
        amount: 1000.00,
        currency: 'INR',
        status: 'paid',
        paymentMethod: 'UPI',
        description: 'Test Order #12345',
        commission: 20.00,
        netAmount: 980.00,
        settlementStatus: 'unsettled',
        customerId: 'CUST_1234567890',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+919876543210',
        merchantName: 'Test Merchant',
        paidAt: new Date('2024-01-15T10:30:00.000Z'),
        createdAt: new Date('2024-01-15T10:25:00.000Z'),
        updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        expectedSettlementDate: new Date('2024-01-17T10:30:00.000Z'),
        acquirerData: {
            utr: 'UTR1234567890123456',
            rrn: 'RRN1234567890123456',
            bank_transaction_id: 'BANK_TXN_1234567890',
            bank_name: 'HDFC Bank',
            vpa: 'merchant@upi'
        },
        paymentGateway: gateway
    };

    // Add gateway-specific fields
    switch (gateway) {
        case 'paytm':
            baseTransaction.paytmOrderId = 'ORDER_PAYTM_1234567890';
            baseTransaction.paytmPaymentId = 'PAYMENT_PAYTM_1234567890';
            baseTransaction.paytmReferenceId = 'REF_PAYTM_1234567890';
            break;
        case 'easebuzz':
            baseTransaction.easebuzzOrderId = 'ORDER_EASEBUZZ_1234567890';
            baseTransaction.easebuzzPaymentId = 'PAYMENT_EASEBUZZ_1234567890';
            baseTransaction.easebuzzReferenceId = 'REF_EASEBUZZ_1234567890';
            break;
        case 'razorpay':
            baseTransaction.razorpayPaymentLinkId = 'plink_1234567890';
            baseTransaction.razorpayPaymentId = 'pay_1234567890';
            baseTransaction.razorpayReferenceId = 'ref_1234567890';
            break;
        case 'phonepe':
            baseTransaction.phonepeOrderId = 'ORDER_PHONEPE_1234567890';
            baseTransaction.phonepePaymentId = 'PAYMENT_PHONEPE_1234567890';
            baseTransaction.phonepeReferenceId = 'REF_PHONEPE_1234567890';
            break;
    }

    return baseTransaction;
}

// Test helper functions
function assert(condition, message) {
    if (!condition) {
        throw new Error(`❌ ASSERTION FAILED: ${message}`);
    }
}

function testSuccess(message) {
    console.log(`✅ ${message}`);
}

// Test suite
console.log('\n' + '='.repeat(80));
console.log('🧪 UNIVERSAL CALLBACK PAYLOAD TEST SUITE');
console.log('='.repeat(80) + '\n');

let testsPassed = 0;
let testsFailed = 0;

try {
    // Test 1: Success Payload Structure
    console.log('📋 Test 1: Success Payload Structure');
    const paytmTransaction = createMockTransaction('paytm');
    const successPayload = createSuccessPayload(paytmTransaction, {
        paytm_order_id: paytmTransaction.paytmOrderId,
        paytm_payment_id: paytmTransaction.paytmPaymentId
    });

    assert(successPayload.event === 'payment.success', 'Event should be payment.success');
    assert(successPayload.transaction_id === 'TXN_TEST_1234567890', 'Transaction ID should match');
    assert(successPayload.order_id === 'ORD_TEST_1234567890', 'Order ID should match');
    assert(successPayload.merchant_id === '507f1f77bcf86cd799439011', 'Merchant ID should match');
    assert(typeof successPayload.timestamp === 'string', 'Timestamp should be a string');
    assert(successPayload.data !== undefined, 'Data object should exist');
    assert(successPayload.data.amount === 1000.00, 'Amount should match');
    assert(successPayload.data.status === 'paid', 'Status should be paid');
    assert(successPayload.data.commission === 20.00, 'Commission should match');
    assert(successPayload.data.net_amount === 980.00, 'Net amount should match');
    assert(successPayload.data.gateway === 'paytm', 'Gateway should be paytm');
    assert(successPayload.data.gateway_order_id === 'ORDER_PAYTM_1234567890', 'Gateway order ID should match');
    assert(successPayload.data.gateway_payment_id === 'PAYMENT_PAYTM_1234567890', 'Gateway payment ID should match');
    assert(successPayload.data.acquirer.utr === 'UTR1234567890123456', 'UTR should match');
    assert(successPayload.data.customer.name === 'John Doe', 'Customer name should match');
    assert(successPayload.data.merchant.merchant_name === 'Test Merchant', 'Merchant name should match');
    assert(successPayload.data.gateway_metadata.paytm_order_id === 'ORDER_PAYTM_1234567890', 'Gateway metadata should include paytm_order_id');

    testSuccess('Success payload structure is correct');
    testsPassed++;

} catch (error) {
    console.error(error.message);
    testsFailed++;
}

try {
    // Test 2: Failed Payload Structure
    console.log('\n📋 Test 2: Failed Payload Structure');
    const easebuzzTransaction = createMockTransaction('easebuzz');
    easebuzzTransaction.status = 'failed';
    easebuzzTransaction.failureReason = 'Payment declined by bank';
    easebuzzTransaction.paidAt = null;
    easebuzzTransaction.commission = 0;
    easebuzzTransaction.netAmount = easebuzzTransaction.amount;
    easebuzzTransaction.expectedSettlementDate = null;
    easebuzzTransaction.settlementStatus = null;

    const failedPayload = createFailedPayload(easebuzzTransaction, {
        easebuzz_order_id: easebuzzTransaction.easebuzzOrderId
    });

    assert(failedPayload.event === 'payment.failed', 'Event should be payment.failed');
    assert(failedPayload.data.status === 'failed', 'Status should be failed');
    assert(failedPayload.data.failure_reason === 'Payment declined by bank', 'Failure reason should match');
    assert(failedPayload.data.paid_at === null, 'Paid at should be null for failed payments');
    assert(failedPayload.data.commission === 0, 'Commission should be 0 for failed payments');
    assert(failedPayload.data.gateway === 'easebuzz', 'Gateway should be easebuzz');
    assert(failedPayload.data.gateway_order_id === 'ORDER_EASEBUZZ_1234567890', 'Gateway order ID should match');

    testSuccess('Failed payload structure is correct');
    testsPassed++;

} catch (error) {
    console.error(error.message);
    testsFailed++;
}

try {
    // Test 3: Pending Payload Structure
    console.log('\n📋 Test 3: Pending Payload Structure');
    const razorpayTransaction = createMockTransaction('razorpay');
    razorpayTransaction.status = 'pending';
    razorpayTransaction.paidAt = null;
    razorpayTransaction.commission = 0;
    razorpayTransaction.netAmount = razorpayTransaction.amount;
    razorpayTransaction.expectedSettlementDate = null;
    razorpayTransaction.settlementStatus = null;

    const pendingPayload = createPendingPayload(razorpayTransaction, {
        razorpay_payment_link_id: razorpayTransaction.razorpayPaymentLinkId
    });

    assert(pendingPayload.event === 'payment.pending', 'Event should be payment.pending');
    assert(pendingPayload.data.status === 'pending', 'Status should be pending');
    assert(pendingPayload.data.gateway === 'razorpay', 'Gateway should be razorpay');
    assert(pendingPayload.data.gateway_order_id === 'plink_1234567890', 'Gateway order ID should match');

    testSuccess('Pending payload structure is correct');
    testsPassed++;

} catch (error) {
    console.error(error.message);
    testsFailed++;
}

try {
    // Test 4: Cancelled Payload Structure
    console.log('\n📋 Test 4: Cancelled Payload Structure');
    const phonepeTransaction = createMockTransaction('phonepe');
    phonepeTransaction.status = 'cancelled';
    phonepeTransaction.failureReason = 'Payment cancelled by user';
    phonepeTransaction.paidAt = null;
    phonepeTransaction.commission = 0;
    phonepeTransaction.netAmount = phonepeTransaction.amount;
    phonepeTransaction.expectedSettlementDate = null;
    phonepeTransaction.settlementStatus = null;

    const cancelledPayload = createCancelledPayload(phonepeTransaction, {
        phonepe_reference_id: phonepeTransaction.phonepeReferenceId,
        cancellation_reason: 'Payment cancelled by user'
    });

    assert(cancelledPayload.event === 'payment.cancelled', 'Event should be payment.cancelled');
    assert(cancelledPayload.data.status === 'cancelled', 'Status should be cancelled');
    assert(cancelledPayload.data.gateway === 'phonepe', 'Gateway should be phonepe');
    assert(cancelledPayload.data.gateway_metadata.cancellation_reason === 'Payment cancelled by user', 'Cancellation reason should be in metadata');

    testSuccess('Cancelled payload structure is correct');
    testsPassed++;

} catch (error) {
    console.error(error.message);
    testsFailed++;
}

try {
    // Test 5: Gateway ID Extraction
    console.log('\n📋 Test 5: Gateway ID Extraction Functions');
    const paytmTx = createMockTransaction('paytm');
    const easebuzzTx = createMockTransaction('easebuzz');
    const razorpayTx = createMockTransaction('razorpay');
    const phonepeTx = createMockTransaction('phonepe');

    assert(getGatewayOrderId(paytmTx) === 'ORDER_PAYTM_1234567890', 'Paytm order ID extraction should work');
    assert(getGatewayOrderId(easebuzzTx) === 'ORDER_EASEBUZZ_1234567890', 'Easebuzz order ID extraction should work');
    assert(getGatewayPaymentId(paytmTx) === 'PAYMENT_PAYTM_1234567890', 'Paytm payment ID extraction should work');
    assert(getGatewayPaymentId(easebuzzTx) === 'PAYMENT_EASEBUZZ_1234567890', 'Easebuzz payment ID extraction should work');
    assert(getGatewayReferenceId(paytmTx) === 'REF_PAYTM_1234567890', 'Paytm reference ID extraction should work');
    assert(getGatewayReferenceId(easebuzzTx) === 'REF_EASEBUZZ_1234567890', 'Easebuzz reference ID extraction should work');

    testSuccess('Gateway ID extraction functions work correctly');
    testsPassed++;

} catch (error) {
    console.error(error.message);
    testsFailed++;
}

try {
    // Test 6: Consistency Across Gateways
    console.log('\n📋 Test 6: Consistency Across Gateways');
    const gateways = ['paytm', 'easebuzz', 'razorpay', 'phonepe'];
    const payloads = [];

    gateways.forEach(gateway => {
        const tx = createMockTransaction(gateway);
        const payload = createSuccessPayload(tx, {});
        payloads.push({ gateway, payload });
    });

    // All payloads should have the same structure
    payloads.forEach(({ gateway, payload }) => {
        assert(payload.event === 'payment.success', `${gateway}: Event should be payment.success`);
        assert(payload.data.transaction_id !== undefined, `${gateway}: Transaction ID should exist`);
        assert(payload.data.amount !== undefined, `${gateway}: Amount should exist`);
        assert(payload.data.gateway === gateway, `${gateway}: Gateway field should match`);
        assert(payload.data.gateway_order_id !== undefined, `${gateway}: Gateway order ID should exist`);
        assert(payload.data.acquirer !== undefined, `${gateway}: Acquirer object should exist`);
        assert(payload.data.customer !== undefined, `${gateway}: Customer object should exist`);
        assert(payload.data.merchant !== undefined, `${gateway}: Merchant object should exist`);
    });

    testSuccess('All gateways produce consistent payload structures');
    testsPassed++;

} catch (error) {
    console.error(error.message);
    testsFailed++;
}

try {
    // Test 7: Required Fields Presence
    console.log('\n📋 Test 7: Required Fields Presence');
    const tx = createMockTransaction('paytm');
    const payload = createSuccessPayload(tx, {});

    const requiredFields = [
        'event',
        'timestamp',
        'transaction_id',
        'order_id',
        'merchant_id',
        'data.transaction_id',
        'data.order_id',
        'data.amount',
        'data.currency',
        'data.status',
        'data.gateway',
        'data.gateway_order_id',
        'data.gateway_payment_id',
        'data.acquirer',
        'data.customer',
        'data.merchant'
    ];

    requiredFields.forEach(field => {
        const keys = field.split('.');
        let value = payload;
        keys.forEach(key => {
            value = value[key];
        });
        assert(value !== undefined && value !== null, `Required field ${field} should be present`);
    });

    testSuccess('All required fields are present');
    testsPassed++;

} catch (error) {
    console.error(error.message);
    testsFailed++;
}

try {
    // Test 8: Null Handling
    console.log('\n📋 Test 8: Null Value Handling');
    const tx = createMockTransaction('paytm');
    tx.acquirerData = null;
    tx.customerId = null;
    tx.customerName = null;
    tx.customerEmail = null;
    tx.customerPhone = null;

    const payload = createSuccessPayload(tx, {});

    assert(payload.data.acquirer.utr === null, 'UTR should be null when acquirerData is null');
    assert(payload.data.customer.customer_id === null, 'Customer ID should be null when not provided');
    assert(payload.data.customer.name === null, 'Customer name should be null when not provided');

    testSuccess('Null values are handled correctly');
    testsPassed++;

} catch (error) {
    console.error(error.message);
    testsFailed++;
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Universal callback payload implementation is working correctly.');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
}

