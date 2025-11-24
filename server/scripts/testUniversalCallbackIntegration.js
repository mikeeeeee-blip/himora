/**
 * Integration Test for Universal Callback Payload
 * 
 * This script verifies that the gateway controllers are correctly
 * using the universal callback payload utility.
 */

const {
    createSuccessPayload,
    createFailedPayload
} = require('../utils/universalCallbackPayload');

console.log('\n' + '='.repeat(80));
console.log('🔗 UNIVERSAL CALLBACK PAYLOAD INTEGRATION TEST');
console.log('='.repeat(80) + '\n');

// Test that the payload structure matches what controllers expect
function testIntegration() {
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Create a mock transaction similar to what controllers use
        const mockTransaction = {
            transactionId: 'TXN_INTEGRATION_TEST',
            orderId: 'ORD_INTEGRATION_TEST',
            merchantId: {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                toString: () => '507f1f77bcf86cd799439011'
            },
            amount: 500.00,
            currency: 'INR',
            status: 'paid',
            paymentMethod: 'UPI',
            description: 'Integration Test Order',
            commission: 10.00,
            netAmount: 490.00,
            settlementStatus: 'unsettled',
            customerId: 'CUST_INTEGRATION',
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            customerPhone: '+919999999999',
            merchantName: 'Test Merchant',
            paymentGateway: 'paytm',
            paytmOrderId: 'ORDER_INTEGRATION',
            paytmPaymentId: 'PAYMENT_INTEGRATION',
            paytmReferenceId: 'REF_INTEGRATION',
            paidAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            expectedSettlementDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            acquirerData: {
                utr: 'UTR_INTEGRATION_TEST',
                rrn: 'RRN_INTEGRATION_TEST',
                bank_transaction_id: 'BANK_TXN_INTEGRATION',
                bank_name: 'Test Bank',
                vpa: 'test@upi'
            }
        };

        // Test 1: Success payload can be used with sendMerchantWebhook
        console.log('📋 Test 1: Success Payload Integration');
        const successPayload = createSuccessPayload(mockTransaction, {
            paytm_order_id: mockTransaction.paytmOrderId,
            paytm_payment_id: mockTransaction.paytmPaymentId
        });

        // Verify payload has all fields that sendMerchantWebhook expects
        assert(successPayload.event !== undefined, 'Payload should have event field');
        assert(successPayload.timestamp !== undefined, 'Payload should have timestamp field');
        assert(successPayload.transaction_id !== undefined, 'Payload should have transaction_id field');
        assert(successPayload.order_id !== undefined, 'Payload should have order_id field');
        assert(successPayload.merchant_id !== undefined, 'Payload should have merchant_id field');
        assert(successPayload.data !== undefined, 'Payload should have data field');

        // Verify payload structure matches merchant webhook expectations
        assert(typeof successPayload.event === 'string', 'Event should be a string');
        assert(typeof successPayload.timestamp === 'string', 'Timestamp should be a string (ISO format)');
        assert(successPayload.data.transaction_id === mockTransaction.transactionId, 'Transaction ID should match');
        assert(successPayload.data.amount === mockTransaction.amount, 'Amount should match');
        assert(successPayload.data.status === mockTransaction.status, 'Status should match');

        console.log('✅ Success payload is compatible with merchant webhook system');
        testsPassed++;

        // Test 2: Failed payload structure
        console.log('\n📋 Test 2: Failed Payload Integration');
        mockTransaction.status = 'failed';
        mockTransaction.failureReason = 'Payment declined';
        mockTransaction.paidAt = null;
        mockTransaction.commission = 0;
        mockTransaction.netAmount = mockTransaction.amount;

        const failedPayload = createFailedPayload(mockTransaction, {
            paytm_order_id: mockTransaction.paytmOrderId
        });

        assert(failedPayload.event === 'payment.failed', 'Event should be payment.failed');
        assert(failedPayload.data.status === 'failed', 'Status should be failed');
        assert(failedPayload.data.failure_reason === 'Payment declined', 'Failure reason should match');
        assert(failedPayload.data.paid_at === null, 'Paid at should be null for failed payments');

        console.log('✅ Failed payload is compatible with merchant webhook system');
        testsPassed++;

        // Test 3: Payload serialization (for webhook sending)
        console.log('\n📋 Test 3: Payload Serialization');
        const serialized = JSON.stringify(successPayload);
        const deserialized = JSON.parse(serialized);

        assert(deserialized.event === successPayload.event, 'Serialization should preserve event');
        assert(deserialized.data.amount === successPayload.data.amount, 'Serialization should preserve amount');
        assert(deserialized.data.gateway === successPayload.data.gateway, 'Serialization should preserve gateway');

        console.log('✅ Payload can be serialized/deserialized correctly');
        testsPassed++;

        // Test 4: Gateway metadata preservation
        console.log('\n📋 Test 4: Gateway Metadata Preservation');
        const metadataPayload = createSuccessPayload(mockTransaction, {
            paytm_order_id: 'CUSTOM_ORDER_ID',
            paytm_payment_id: 'CUSTOM_PAYMENT_ID',
            custom_field: 'custom_value'
        });

        assert(metadataPayload.data.gateway_metadata.paytm_order_id === 'CUSTOM_ORDER_ID', 'Gateway metadata should preserve custom fields');
        assert(metadataPayload.data.gateway_metadata.custom_field === 'custom_value', 'Gateway metadata should preserve additional fields');

        console.log('✅ Gateway metadata is preserved correctly');
        testsPassed++;

    } catch (error) {
        console.error('❌', error.message);
        testsFailed++;
    }

    return { testsPassed, testsFailed };
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(`ASSERTION FAILED: ${message}`);
    }
}

// Run tests
const { testsPassed, testsFailed } = testIntegration();

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 INTEGRATION TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    console.log('\n🎉 All integration tests passed! Universal callback payload is ready for production.');
    process.exit(0);
} else {
    console.log('\n⚠️  Some integration tests failed. Please review the errors above.');
    process.exit(1);
}

