const axios = require('axios');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');

// Cashfree Configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENVIRONMENT = process.env.CASHFREE_ENVIRONMENT || 'production'; // 'sandbox' or 'production'

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

        // Get merchant info from apiKeyAuth middleware
        const merchantId = req.merchantId;
        const merchantName = req.merchantName;

        console.log('\n' + '='.repeat(80));
        console.log('📤 Cashfree Payment Link Creation Request');
        console.log('='.repeat(80));
        console.log('   Merchant:', merchantName, `(${merchantId})`);
        console.log('   Payment data will be passed to Next.js checkout page');
        
        // Check if Cashfree is enabled in settings
        const settings = await Settings.getSettings();
        if (!settings.paymentGateways.cashfree.enabled) {
            console.error('❌ Cashfree is not enabled in payment gateway settings');
            return res.status(403).json({
                success: false,
                error: 'Cashfree payment gateway is not enabled. Please contact administrator to enable it.',
                details: {
                    description: 'Cashfree gateway is disabled',
                    code: 'GATEWAY_DISABLED',
                    hint: 'The administrator needs to enable Cashfree in the payment gateway settings from the admin dashboard.'
                }
            });
        }

        // Validate input
        if (!amount || !customer_name || !customer_email || !customer_phone) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: amount, customer_name, customer_email, customer_phone'
            });
        }

        // Validate phone (remove any non-digits first)
        const cleanPhone = customer_phone.replace(/\D/g, '');
        if (!/^[0-9]{10}$/.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number. Must be 10 digits.'
            });
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        // Validate amount
        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Generate unique transaction ID and order ID
        transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Get merchant's configured URLs or use provided ones
        const merchant = await User.findById(merchantId);

        // Priority: API provided URL > Merchant configured URL > Default URL
        const finalCallbackUrl = callback_url ||
            merchant?.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        const finalFailureUrl = failure_url ||
            merchant?.failureUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed`;

        // Cashfree callback URL
        const backendBaseUrl = (process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
        const cashfreeCallbackUrl = `${backendBaseUrl}/api/cashfree/callback?transaction_id=${transactionId}`;

        console.log('   Transaction ID:', transactionId);
        console.log('   Order ID:', orderId);
        console.log('   Amount: ₹', amountValue);
        console.log('   Callback URL:', cashfreeCallbackUrl);
        console.log('   Success URL:', finalCallbackUrl);
        console.log('   Failure URL:', finalFailureUrl);

        // Don't call Cashfree API here - just prepare payment data for frontend
        // The Next.js checkout page will handle Cashfree API calls directly
        console.log('\n📋 Payment data prepared for Next.js checkout page');
        console.log('   Order ID:', orderId);
        console.log('   Amount: ₹', amountValue);
        console.log('   Customer:', customer_name, `(${customer_email})`);
        console.log('   Phone:', cleanPhone);
        
        // Payment URL will be generated by Next.js checkout page after creating session
        const paymentUrl = `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-pending`;

        // Calculate commission
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
            expectedSettlementDate: expectedSettlement
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
        if (description) checkoutUrl.searchParams.set('description', description);
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
            environment: responseEnvironment, // Include environment for frontend
            gateway_used: 'cashfree',
            gateway_name: 'Cashfree',
            // Next.js checkout URL - this is the payment link for Cashfree
            payment_url: checkoutUrl.toString(),
            paymentLink: checkoutUrl.toString(),
            // Payment details to pass to Next.js checkout page
            payment_data: {
                amount: amountValue,
                currency: 'INR',
                customer_name: customer_name,
                customer_email: customer_email,
                customer_phone: cleanPhone,
                description: description || `Payment for ${merchantName}`,
                order_id: orderId,
                transaction_id: transactionId,
                merchant_id: merchantId.toString(),
                merchant_name: merchantName
            },
            message: 'Payment link created successfully. Share this URL with customer. Gateway: Cashfree.',
            note: 'Round-robin rotation: Payment gateways alternate between enabled gateways. Next payment will use a different gateway.',
            gateway_message: 'Payment link created using Cashfree gateway (round-robin)',
            rotation_mode: 'round-robin',
            rotation_enabled: true,
            current_active_gateway: 'cashfree',
            next_active_gateway: 'cashfree',
            last_used_gateway_index: -1,
            enabled_gateways_count: 1,
            enabled_gateways: ['cashfree']
        };

        console.log('\n' + '='.repeat(80));
        console.log('✅ CASHFREE PAYMENT LINK CREATED SUCCESSFULLY');
        console.log('='.repeat(80));
        console.log('   Transaction ID:', transactionId);
        console.log('   Order ID:', orderId);
        console.log('   Amount:', amountValue, 'INR');
        console.log('   Merchant:', merchantName, '(' + merchantId + ')');
        console.log('   Customer:', customer_name, '(' + customer_email + ')');
        console.log('   Environment:', responseEnvironment);
        console.log('   Gateway: Cashfree');
        console.log('\n   Next.js Checkout URL:');
        console.log('   ' + checkoutUrl.toString());
        console.log('='.repeat(80) + '\n');

        // Return payment data for Next.js checkout page to handle Cashfree integration
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

        res.status(500).json({
            success: false,
            error: 'Failed to create payment link',
            detail: error.response?.data?.message || error.message,
            message: 'An error occurred while creating the payment link. Please try again or contact support.'
        });
    }
};

// ============ CASHFREE CALLBACK HANDLER ============
/**
 * Handle Cashfree payment callback/webhook
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

        // Extract payment status from payload
        const orderStatus = payload.order_status || payload.status;
        const paymentStatus = payload.payment_status || payload.paymentStatus;
        const cfOrderId = payload.cf_order_id || payload.order_id || orderIdFromQuery || transaction.cashfreeOrderId || transaction.orderId;
        const paymentMessage = payload.payment_message || payload.message || '';

        console.log('\n📊 Payment Status Analysis:');
        console.log('   Order Status:', orderStatus);
        console.log('   Payment Status:', paymentStatus);
        console.log('   CF Order ID:', cfOrderId);
        console.log('   Payment Message:', paymentMessage);
        console.log('   Transaction Status (current):', transaction.status);

                // Verify payment status with Cashfree API
        if (cfOrderId) {
            try {
                console.log('\n🔍 Verifying payment status with Cashfree API...');
                
                // Construct the correct endpoint URL for order status
                const cleanBaseUrl = CASHFREE_BASE_URL.replace(/\/pg\/?$/, '').replace(/\/$/, '');
                const statusEndpointUrl = `${cleanBaseUrl}/pg/orders/${cfOrderId}`;
                console.log('   Status Check Endpoint URL:', statusEndpointUrl);
                
                const statusResponse = await axios.get(
                    statusEndpointUrl,
                    {
                        headers: {
                            'x-api-version': CASHFREE_API_VERSION,
                            'x-client-id': CASHFREE_APP_ID,
                            'x-client-secret': CASHFREE_SECRET_KEY
                        },
                        timeout: 30000
                    }
                );

                const orderData = statusResponse.data;
                console.log('   Cashfree Order Status:', orderData.order_status);
                console.log('   Payment Status:', orderData.payment_status);

                // Update transaction based on Cashfree response
                if (orderData.order_status === 'PAID' || orderData.payment_status === 'SUCCESS') {
                    if (transaction.status !== 'paid') {
                        console.log('\n✅ PAYMENT SUCCESSFUL - Updating transaction...');
                        
                        const paidAt = new Date(orderData.payment_time || Date.now());
                        const expectedSettlement = calculateExpectedSettlementDate(paidAt);
                        const commissionData = calculatePayinCommission(transaction.amount);

                        const update = {
                            status: 'paid',
                            paidAt: paidAt,
                            paymentMethod: orderData.payment_method || 'unknown',
                            cashfreeOrderId: cfOrderId,
                            cashfreePaymentId: orderData.cf_payment_id || transaction.cashfreePaymentId,
                            updatedAt: new Date(),
                            acquirerData: {
                                utr: orderData.payment_utr || null,
                                bank_transaction_id: orderData.payment_utr || null,
                                payment_method: orderData.payment_method || null
                            },
                            settlementStatus: 'unsettled',
                            expectedSettlementDate: expectedSettlement,
                            commission: commissionData.commission,
                            netAmount: parseFloat((transaction.amount - commissionData.commission).toFixed(2)),
                            webhookData: orderData
                        };

                        const updatedTransaction = await Transaction.findOneAndUpdate(
                            { _id: transaction._id },
                            update,
                            { new: true }
                        ).populate('merchantId');

                        // Send webhook if enabled
                        if (updatedTransaction && updatedTransaction.merchantId && updatedTransaction.merchantId.webhookEnabled) {
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
                        }

                        console.log('✅ Transaction updated successfully');
                    } else {
                        console.log('ℹ️ Transaction already marked as paid');
                    }

                    // Return success response - no redirect (callback page will close tab)
                    console.log('   ✅ Payment confirmed, returning success response');
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Payment confirmed and transaction updated',
                        transaction_id: transactionIdForLogging,
                        status: 'paid'
                    });
                } else if (orderData.order_status === 'ACTIVE' || orderData.payment_status === 'PENDING') {
                    console.log('ℹ️ Payment is still pending');
                    // Return pending response - callback page will close tab
                    return res.status(200).json({ 
                        success: true, 
                        message: 'Payment is still pending',
                        transaction_id: transactionIdForLogging,
                        status: 'pending'
                    });
                } else {
                    // Payment failed
                    console.log('\n❌ PAYMENT FAILED');
                    if (transaction.status !== 'failed') {
                        await Transaction.findOneAndUpdate(
                            { _id: transaction._id },
                            {
                                status: 'failed',
                                failureReason: paymentMessage || orderData.payment_message || 'Payment failed',
                                updatedAt: new Date(),
                                webhookData: orderData
                            }
                        );
                        console.log('✅ Transaction status updated to "failed"');
                    }

                    // Return failure response - callback page will close tab
                    console.log('   ❌ Payment failed, returning failure response');
                    return res.status(200).json({ 
                        success: false, 
                        message: paymentMessage || 'Payment failed',
                        transaction_id: transactionIdForLogging,
                        status: 'failed'
                    });
                }
            } catch (apiError) {
                console.error('❌ Error verifying payment with Cashfree API:', apiError.message);
                // Continue with callback data if API verification fails
            }
        }

        // If no API verification, respond with 200 for webhook
        return res.status(200).json({ success: true, message: 'Callback received' });

    } catch (error) {
        console.error('❌ Cashfree Callback Handler Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Callback processing error',
            error: error.message || 'callback_error'
        });
    }
};

