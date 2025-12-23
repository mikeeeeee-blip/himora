const axios = require('axios');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');

// Cashfree Configuration - Support both sandbox and production credentials
// Check both CASHFREE_ENV and CASHFREE_ENVIRONMENT for compatibility
const CASHFREE_ENVIRONMENT = (process.env.CASHFREE_ENV || process.env.CASHFREE_ENVIRONMENT || 'production').toLowerCase(); // 'sandbox' or 'production'

// Use TEST_ prefixed credentials when in SANDBOX mode, otherwise use production credentials
const CASHFREE_APP_ID = CASHFREE_ENVIRONMENT === 'sandbox' 
    ? (process.env.TEST_CASHFREE_APP_ID || process.env.CASHFREE_APP_ID)
    : process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = CASHFREE_ENVIRONMENT === 'sandbox'
    ? (process.env.TEST_CASHFREE_SECRET_KEY || process.env.CASHFREE_SECRET_KEY)
    : process.env.CASHFREE_SECRET_KEY;

// Cashfree API base URLs - remove /pg if included in env var
let baseUrl = process.env.CASHFREE_BASE_URL || '';
if (!baseUrl) {
    // Default base URLs based on environment
    baseUrl = CASHFREE_ENVIRONMENT === 'sandbox' 
        ? 'https://sandbox.cashfree.com' 
        : 'https://api.cashfree.com';
} else {
    // Remove trailing /pg if present (to avoid double /pg in endpoint)
    baseUrl = baseUrl.replace(/\/pg\/?$/, '');
}

const CASHFREE_BASE_URL = baseUrl;
const CASHFREE_API_VERSION = '2023-08-01';

// Helper function to clean session ID (removes accidental suffixes)
function cleanSessionId(sessionId) {
    if (!sessionId) return null;
    // Remove common accidental suffixes
    return sessionId.replace(/payment+$/i, '').trim();
}

// Note: Cashfree session creation is now handled by Next.js checkout page directly
// No need for NEXTJS_API_URL anymore

// ============ CREATE CASHFREE PAYMENT LINK ============
exports.createCashfreePaymentLink = async (req, res) => {
    let transactionId = null;
    try {
        // Get merchant info from apiKeyAuth middleware (sets req.merchantId and req.merchantName)
        const merchantId = req.merchantId || req.user?._id;
        const merchantName = req.merchantName || req.user?.name;
        
        if (!merchantId || !merchantName) {
            return res.status(401).json({
                success: false,
                error: 'Merchant authentication required. Please provide a valid API key in x-api-key header.'
            });
        }

        const {
            amount,
            customer_name,
            customer_email,
            customer_phone,
            description,
            callback_url,
            success_url,
            failure_url
        } = req.body;

        // Validate required fields
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        if (!customer_name || !customer_email || !customer_phone) {
            return res.status(400).json({
                success: false,
                error: 'Customer details are required'
            });
        }

        // Clean phone number
        const cleanPhone = customer_phone.replace(/\D/g, '');

        // Generate transaction and order IDs
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        transactionId = `TXN_${timestamp}_${randomSuffix}`;
        const orderId = `ORDER_${timestamp}_${randomSuffix}`;

        const amountValue = parseFloat(amount);

        // Build callback URLs
        const backendBaseUrl = (process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5001').replace(/\/$/, '');
        const cashfreeCallbackUrl = `${backendBaseUrl}/api/cashfree/callback?transaction_id=${encodeURIComponent(transactionId)}`;
        const cashfreeWebhookUrl = `${backendBaseUrl}/api/payments/webhook`;

        // Use provided URLs or defaults
        const finalCallbackUrl = callback_url || success_url || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;
        const finalFailureUrl = failure_url || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed`;

        // Calculate commission and settlement
        const commissionData = calculatePayinCommission(amountValue);
        const expectedSettlement = calculateExpectedSettlementDate(new Date());

        // Save transaction to database (status: 'created' - will be updated when payment is initiated)
        const transaction = new Transaction({
            transactionId: transactionId,
            orderId: orderId,
            merchantId: merchantId,
            merchantName: merchantName,
            customerId: `CUST_${cleanPhone}_${Date.now()}`,
            customerName: customer_name,
            customerEmail: customer_email,
            customerPhone: cleanPhone,
            amount: amountValue,
            currency: 'INR',
            description: description || `Payment for ${merchantName}`,
            status: 'created',
            paymentGateway: 'cashfree',
            successUrl: finalCallbackUrl,
            failureUrl: finalFailureUrl,
            callbackUrl: cashfreeCallbackUrl,
            commission: commissionData.commission,
            netAmount: parseFloat((amountValue - commissionData.commission).toFixed(2)),
            settlementStatus: 'unsettled',
            expectedSettlementDate: expectedSettlement,
            // Store the environment used for this transaction so callback can use correct credentials
            cashfreeEnvironment: CASHFREE_ENVIRONMENT
        });

        await transaction.save();
        console.log('✅ Transaction saved to database (status: created)');

        // Determine environment from CASHFREE_ENVIRONMENT or default to production
        const responseEnvironment = CASHFREE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';

        // Construct checkout URL - always use NEXTJS_API_URL environment variable
        const checkoutBaseUrl = process.env.NEXTJS_API_URL || 'https://www.shaktisewafoudation.in';
        const checkoutUrl = new URL(`${checkoutBaseUrl}/checkout`);
        checkoutUrl.searchParams.set('amount', amountValue);
        checkoutUrl.searchParams.set('customer_name', customer_name);
        checkoutUrl.searchParams.set('customer_email', customer_email);
        checkoutUrl.searchParams.set('customer_phone', cleanPhone);
        checkoutUrl.searchParams.set('order_id', orderId);
        checkoutUrl.searchParams.set('transaction_id', transactionId);
        checkoutUrl.searchParams.set('merchant_id', merchantId.toString());
        checkoutUrl.searchParams.set('merchant_name', merchantName);
        checkoutUrl.searchParams.set('description', description || 'Product purchase');
        checkoutUrl.searchParams.set('environment', responseEnvironment);

        const responseData = {
            success: true,
            transaction_id: transactionId,
            order_id: orderId,
            order_amount: amountValue,
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            callback_url: finalCallbackUrl,
            failure_url: finalFailureUrl,
            webhook_url: cashfreeWebhookUrl,
            environment: responseEnvironment,
            gateway_used: 'cashfree',
            gateway_name: 'Cashfree',
            payment_data: {
                amount: amountValue,
                currency: 'INR',
                customer_name: customer_name,
                customer_email: customer_email,
                customer_phone: cleanPhone,
                description: description || 'Product purchase',
                order_id: orderId,
                transaction_id: transactionId,
                merchant_id: merchantId.toString(),
                merchant_name: merchantName
            },
            message: 'Payment data prepared. Redirect to checkout page to proceed with payment. Gateway: Cashfree.',
            payment_url: checkoutUrl.toString(),
            paymentLink: checkoutUrl.toString()
        };

        res.json(responseData);

    } catch (error) {
        console.error('\n❌ Cashfree Payment Link Creation Error:');
        console.error('   Transaction ID:', transactionId || 'N/A');
        console.error('   Error Type:', error.constructor.name);
        console.error('   Error Message:', error.message);
        
        if (error.response) {
            console.error('   Cashfree API Response Status:', error.response.status);
            console.error('   Cashfree API Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        
        console.error('   Stack Trace:', error.stack);
        console.error('='.repeat(80) + '\n');

        // If transaction was created, mark it as failed
        if (transactionId) {
            try {
                await Transaction.findOneAndUpdate(
                    { transactionId: transactionId },
                    {
                        status: 'failed',
                        failureReason: error.message || 'Payment link creation failed'
                    }
                );
            } catch (dbError) {
                console.error('   Failed to update transaction status:', dbError.message);
            }
        }

        return res.status(500).json({
            success: false,
            error: 'Failed to create payment link',
            detail: error.response?.data?.message || error.message,
        });
    }
};

// ============ CASHFREE WEBHOOK HANDLER ============
/**
 * Handle Cashfree payment webhook
 * Processes webhook notifications from Cashfree
 */
exports.handleCashfreeWebhook = async (req, res) => {
    try {
        const payload = req.body || {};

        console.log('\n' + '='.repeat(80));
        console.log('🔔 CASHFREE WEBHOOK RECEIVED');
        console.log('='.repeat(80));
        console.log('   Method:', req.method);
        console.log('   Headers:', JSON.stringify(req.headers, null, 2));
        console.log('   Payload:', JSON.stringify(payload, null, 2));

        // Extract payment information from webhook payload
        const orderId = payload.orderId || payload.order_id || payload.data?.order?.order_id;
        const paymentId = payload.paymentId || payload.payment_id || payload.data?.payment?.payment_id;
        const paymentStatus = payload.paymentStatus || payload.payment_status || payload.data?.payment?.payment_status;
        const orderAmount = payload.orderAmount || payload.order_amount || payload.data?.order?.order_amount;

        console.log('\n📊 Webhook Data Extraction:');
        console.log('   Order ID:', orderId);
        console.log('   Payment ID:', paymentId);
        console.log('   Payment Status:', paymentStatus);
        console.log('   Order Amount:', orderAmount);

        if (!orderId) {
            console.warn('⚠️ Missing orderId in webhook payload');
            return res.status(400).json({
                success: false,
                error: 'Missing orderId in webhook payload'
            });
        }

        // Find transaction by order ID
        let transaction = await Transaction.findOne({ orderId: orderId }).populate('merchantId');

        if (!transaction) {
            console.warn('⚠️ Transaction not found for orderId:', orderId);
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
                orderId: orderId
            });
        }

        console.log('✅ Transaction found:', transaction.transactionId);
        console.log('   Current Status:', transaction.status);
        console.log('   Payment Status from webhook:', paymentStatus);

        // Normalize payment status - handle different case variations
        const normalizedPaymentStatus = paymentStatus ? String(paymentStatus).toUpperCase().trim() : null;
        console.log('   Normalized Payment Status:', normalizedPaymentStatus);

        // Process payment based on status
        if (normalizedPaymentStatus === 'SUCCESS' && transaction.status !== 'paid') {
            console.log('   ✅ PAYMENT SUCCESSFUL - Updating transaction...');
            
            const paidAt = new Date();
            const expectedSettlement = calculateExpectedSettlementDate(paidAt);
            const commissionData = calculatePayinCommission(transaction.amount);
            
            const update = {
                status: 'paid',
                paidAt: paidAt,
                cashfreeOrderId: orderId,
                cashfreePaymentId: paymentId || transaction.cashfreePaymentId,
                updatedAt: new Date(),
                settlementStatus: 'unsettled',
                expectedSettlementDate: expectedSettlement,
                commission: commissionData.commission,
                netAmount: parseFloat((transaction.amount - commissionData.commission).toFixed(2)),
                webhookData: payload
            };
            
            const updatedTransaction = await Transaction.findOneAndUpdate(
                { _id: transaction._id },
                update,
                { new: true }
            ).populate('merchantId');
            
            // Send webhook to merchant if enabled
            if (updatedTransaction && updatedTransaction.merchantId && updatedTransaction.merchantId.webhookEnabled) {
                try {
                    const webhookPayload = {
                        event: 'payment.success',
                        timestamp: new Date().toISOString(),
                        transaction_id: updatedTransaction.transactionId,
                        order_id: updatedTransaction.orderId,
                        merchant_id: updatedTransaction.merchantId._id.toString(),
                        data: {
                            transaction_id: updatedTransaction.transactionId,
                            order_id: updatedTransaction.orderId,
                            cashfree_order_id: updatedTransaction.cashfreeOrderId,
                            cashfree_payment_id: updatedTransaction.cashfreePaymentId,
                            amount: updatedTransaction.amount,
                            currency: updatedTransaction.currency,
                            status: updatedTransaction.status,
                            payment_method: updatedTransaction.paymentMethod,
                            paid_at: updatedTransaction.paidAt.toISOString(),
                            settlement_status: updatedTransaction.settlementStatus,
                            expected_settlement_date: updatedTransaction.expectedSettlementDate.toISOString(),
                            customer: {
                                customer_id: updatedTransaction.customerId,
                                name: updatedTransaction.customerName,
                                email: updatedTransaction.customerEmail,
                                phone: updatedTransaction.customerPhone
                            },
                            merchant: {
                                merchant_id: updatedTransaction.merchantId._id.toString(),
                                merchant_name: updatedTransaction.merchantName
                            },
                            description: updatedTransaction.description,
                            created_at: updatedTransaction.createdAt.toISOString(),
                            updated_at: updatedTransaction.updatedAt.toISOString()
                        }
                    };
                    
                    await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
                    console.log('✅ Webhook sent to merchant');
                } catch (webhookError) {
                    console.error('⚠️ Failed to send webhook to merchant:', webhookError.message);
                }
            }
            
            console.log('✅ Transaction updated successfully to "paid"');
            return res.status(200).json({
                success: true,
                message: 'Webhook processed successfully',
                transaction_id: transaction.transactionId,
                status: 'paid'
            });
        } else if (normalizedPaymentStatus === 'FAILED' && transaction.status !== 'failed') {
            console.log('   ❌ PAYMENT FAILED - Updating transaction...');
            
            await Transaction.findOneAndUpdate(
                { _id: transaction._id },
                {
                    status: 'failed',
                    failureReason: payload.paymentMessage || payload.message || 'Payment failed',
                    updatedAt: new Date(),
                    webhookData: payload
                }
            );
            
            console.log('✅ Transaction updated to "failed"');
            return res.status(200).json({
                success: true,
                message: 'Webhook processed successfully',
                transaction_id: transaction.transactionId,
                status: 'failed'
            });
        } else {
            console.log('   ℹ️ Transaction already has status:', transaction.status);
            return res.status(200).json({
                success: true,
                message: 'Webhook received but transaction already processed',
                transaction_id: transaction.transactionId,
                status: transaction.status
            });
        }

    } catch (error) {
        console.error('❌ Cashfree Webhook Handler Error:', error);
        console.error('   Stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Webhook processing error',
            error: error.message || 'webhook_error'
        });
    }
};

// ============ CASHFREE CALLBACK HANDLER ============
/**
 * Handle Cashfree payment callback/webhook
 * Determines payment status based on success/failure URL, NO API verification
 */
exports.handleCashfreeCallback = async (req, res) => {
    try {
        const payload = req.body || req.query;
        const { transaction_id } = req.query;

        console.log('\n' + '='.repeat(80));
        console.log('🔔 CASHFREE CALLBACK RECEIVED');
        console.log('='.repeat(80));
        console.log('   Method:', req.method);
        console.log('   Transaction ID (query):', transaction_id);
        console.log('   Transaction ID (payload):', payload.transaction_id);
        console.log('   Payload:', JSON.stringify(payload, null, 2));
        console.log('   Request URL:', req.url);
        console.log('   Referer:', req.headers.referer || 'none');

        // Extract transaction_id or order_id from query or payload
        const transactionIdFromQuery = transaction_id || payload.transaction_id || req.query.transaction_id;
        const orderIdFromQuery = payload.order_id || req.query.order_id;
        
        let transaction;
        
        // Try to find transaction by transaction_id first, then by order_id
        if (transactionIdFromQuery) {
            transaction = await Transaction.findOne({ transactionId: transactionIdFromQuery }).populate('merchantId');
        }
        
        if (!transaction && orderIdFromQuery) {
            transaction = await Transaction.findOne({ orderId: orderIdFromQuery }).populate('merchantId');
        }
        
        if (!transaction) {
            console.warn('⚠️ Transaction not found for transactionId:', transactionIdFromQuery, 'or orderId:', orderIdFromQuery);
            return res.status(404).json({ 
                success: false, 
                message: 'Transaction not found',
                error: 'transaction_not_found',
                transaction_id: transactionIdFromQuery,
                order_id: orderIdFromQuery
            });
        }
        
        const transactionIdForLogging = transactionIdFromQuery || transaction.transactionId;
        const cfOrderId = payload.cf_order_id || payload.order_id || orderIdFromQuery || transaction.cashfreeOrderId || transaction.orderId;
        const paymentMessage = payload.payment_message || payload.message || '';
        
        // Get the request URL to determine if this is from success or failure URL
        const requestUrl = req.url || '';
        const referer = req.headers.referer || '';
        const fullUrl = referer || requestUrl;
        
        console.log('\n📊 Payment Status Analysis:');
        console.log('   CF Order ID:', cfOrderId);
        console.log('   Transaction Status (current):', transaction.status);
        console.log('   Request URL:', requestUrl);
        console.log('   Referer:', referer);
        console.log('   Transaction Success URL:', transaction.successUrl || 'not set');
        console.log('   Transaction Failure URL:', transaction.failureUrl || 'not set');
        
        // Determine payment status based on URL
        // Check if URL contains success/failure indicators or matches stored URLs
        const successUrlPattern = transaction.successUrl ? new URL(transaction.successUrl).pathname : '';
        const failureUrlPattern = transaction.failureUrl ? new URL(transaction.failureUrl).pathname : '';
        
        const isFromSuccessUrl = 
            fullUrl.includes('/payment-success') || 
            fullUrl.includes('success') ||
            (successUrlPattern && (requestUrl.includes(successUrlPattern) || referer.includes(successUrlPattern)));
            
        const isFromFailureUrl = 
            fullUrl.includes('/payment-failed') || 
            fullUrl.includes('failed') || 
            fullUrl.includes('failure') ||
            (failureUrlPattern && (requestUrl.includes(failureUrlPattern) || referer.includes(failureUrlPattern)));
        
        console.log('   Is from Success URL:', isFromSuccessUrl);
        console.log('   Is from Failure URL:', isFromFailureUrl);
        
        // Process payment based on URL
        if (isFromSuccessUrl && transaction.status !== 'paid') {
            // Payment successful - mark as paid
            console.log('   ✅ PAYMENT SUCCESSFUL - Updating transaction...');
            
            const paidAt = new Date();
            const expectedSettlement = calculateExpectedSettlementDate(paidAt);
            const commissionData = calculatePayinCommission(transaction.amount);
            
            const update = {
                status: 'paid',
                paidAt: paidAt,
                paymentMethod: payload.payment_method || 'unknown',
                cashfreeOrderId: cfOrderId,
                updatedAt: new Date(),
                acquirerData: {
                    utr: payload.payment_utr || null,
                    bank_transaction_id: payload.payment_utr || null,
                    payment_method: payload.payment_method || null
                },
                settlementStatus: 'unsettled',
                expectedSettlementDate: expectedSettlement,
                commission: commissionData.commission,
                netAmount: parseFloat((transaction.amount - commissionData.commission).toFixed(2)),
                webhookData: {
                    ...payload,
                    callback_source: 'success_url',
                    callback_timestamp: new Date().toISOString()
                }
            };
            
            const updatedTransaction = await Transaction.findOneAndUpdate(
                { _id: transaction._id },
                update,
                { new: true }
            ).populate('merchantId');
            
            // Send webhook to merchant if enabled
            if (updatedTransaction && updatedTransaction.merchantId && updatedTransaction.merchantId.webhookEnabled) {
                try {
                    const webhookPayload = {
                        event: 'payment.success',
                        timestamp: new Date().toISOString(),
                        transaction_id: updatedTransaction.transactionId,
                        order_id: updatedTransaction.orderId,
                        merchant_id: updatedTransaction.merchantId._id.toString(),
                        data: {
                            transaction_id: updatedTransaction.transactionId,
                            order_id: updatedTransaction.orderId,
                            cashfree_order_id: updatedTransaction.cashfreeOrderId,
                            cashfree_payment_id: updatedTransaction.cashfreePaymentId,
                            amount: updatedTransaction.amount,
                            currency: updatedTransaction.currency,
                            status: updatedTransaction.status,
                            payment_method: updatedTransaction.paymentMethod,
                            paid_at: updatedTransaction.paidAt.toISOString(),
                            settlement_status: updatedTransaction.settlementStatus,
                            expected_settlement_date: updatedTransaction.expectedSettlementDate.toISOString(),
                            acquirer_data: updatedTransaction.acquirerData,
                            customer: {
                                customer_id: updatedTransaction.customerId,
                                name: updatedTransaction.customerName,
                                email: updatedTransaction.customerEmail,
                                phone: updatedTransaction.customerPhone
                            },
                            merchant: {
                                merchant_id: updatedTransaction.merchantId._id.toString(),
                                merchant_name: updatedTransaction.merchantName
                            },
                            description: updatedTransaction.description,
                            created_at: updatedTransaction.createdAt.toISOString(),
                            updated_at: updatedTransaction.updatedAt.toISOString()
                        }
                    };
                    
                    await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
                    console.log('✅ Webhook sent to merchant');
                } catch (webhookError) {
                    console.error('⚠️ Failed to send webhook to merchant:', webhookError.message);
                }
            }
            
            console.log('✅ Transaction updated successfully to "paid"');
            return res.status(200).json({ 
                success: true, 
                message: 'Payment confirmed and transaction updated',
                transaction_id: transactionIdForLogging,
                status: 'paid'
            });
        } else if (isFromFailureUrl && transaction.status !== 'failed') {
            // Payment failed - mark as failed
            console.log('   ❌ PAYMENT FAILED - Updating transaction...');
            
            await Transaction.findOneAndUpdate(
                { _id: transaction._id },
                {
                    status: 'failed',
                    failureReason: paymentMessage || payload.error || 'Payment failed',
                    updatedAt: new Date(),
                    webhookData: {
                        ...payload,
                        callback_source: 'failure_url',
                        callback_timestamp: new Date().toISOString()
                    }
                }
            );
            
            console.log('✅ Transaction updated to "failed"');
            return res.status(200).json({ 
                success: false, 
                message: paymentMessage || 'Payment failed',
                transaction_id: transactionIdForLogging,
                status: 'failed'
            });
        } else {
            // URL doesn't clearly indicate success or failure, or transaction already has final status
            if (transaction.status === 'paid') {
                console.log('   ℹ️ Transaction already marked as paid');
                return res.status(200).json({ 
                    success: true, 
                    message: 'Payment already confirmed',
                    transaction_id: transactionIdForLogging,
                    status: 'paid'
                });
            } else if (transaction.status === 'failed') {
                console.log('   ℹ️ Transaction already marked as failed');
                return res.status(200).json({ 
                    success: false, 
                    message: 'Payment already marked as failed',
                    transaction_id: transactionIdForLogging,
                    status: 'failed'
                });
            } else {
                // Ambiguous callback - default to success (Cashfree typically redirects to success URL after payment)
                console.log('   ⚠️ Callback URL is ambiguous, defaulting to success (optimistic update)');
                
                const paidAt = new Date();
                const expectedSettlement = calculateExpectedSettlementDate(paidAt);
                const commissionData = calculatePayinCommission(transaction.amount);
                
                const update = {
                    status: 'paid',
                    paidAt: paidAt,
                    paymentMethod: payload.payment_method || 'unknown',
                    cashfreeOrderId: cfOrderId,
                    updatedAt: new Date(),
                    settlementStatus: 'unsettled',
                    expectedSettlementDate: expectedSettlement,
                    commission: commissionData.commission,
                    netAmount: parseFloat((transaction.amount - commissionData.commission).toFixed(2)),
                    webhookData: {
                        ...payload,
                        callback_source: 'ambiguous_url_default_success',
                        callback_timestamp: new Date().toISOString()
                    }
                };
                
                await Transaction.findOneAndUpdate(
                    { _id: transaction._id },
                    update
                );
                
                console.log('   ✅ Transaction marked as paid (optimistic update)');
                return res.status(200).json({ 
                    success: true, 
                    message: 'Payment confirmed (optimistic update)',
                    transaction_id: transactionIdForLogging,
                    status: 'paid'
                });
            }
        }

    } catch (error) {
        console.error('❌ Cashfree Callback Handler Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Callback processing error',
            error: error.message || 'callback_error'
        });
    }
};
