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
        console.log('   Environment:', CASHFREE_ENVIRONMENT);
        console.log('   Base URL (configured):', CASHFREE_BASE_URL);
        console.log('   API Version:', CASHFREE_API_VERSION);
        
        // Verify credentials are set
        if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
            console.error('   ❌ CRITICAL: Cashfree credentials are missing!');
            console.error('      CASHFREE_APP_ID:', CASHFREE_APP_ID ? 'SET' : 'NOT SET');
            console.error('      CASHFREE_SECRET_KEY:', CASHFREE_SECRET_KEY ? 'SET' : 'NOT SET');
        } else {
            console.log('   ✅ Credentials configured');
            console.log('      App ID length:', CASHFREE_APP_ID.length);
            console.log('      Secret Key length:', CASHFREE_SECRET_KEY.length);
        }

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

        // Validate credentials
        if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
            console.error('❌ Cashfree credentials not configured');
            return res.status(500).json({
                success: false,
                error: 'Cashfree credentials not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in environment variables.',
                details: {
                    description: 'Cashfree credentials not configured',
                    code: 'CONFIGURATION_ERROR'
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

        // Validate phone
        if (!/^[0-9]{10}$/.test(customer_phone)) {
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

        // Generate unique transaction ID
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

        // Prepare Cashfree order payload
        const orderPayload = {
            order_id: orderId,
            order_amount: amountValue,
            order_currency: 'INR',
            order_note: description || `Payment for ${merchantName}`,
            customer_details: {
                customer_id: `CUST_${customer_phone}_${Date.now()}`,
                customer_name: customer_name,
                customer_email: customer_email,
                customer_phone: `+91${customer_phone}`
            },
            order_meta: {
                return_url: finalCallbackUrl,
                notify_url: cashfreeCallbackUrl,
                // Cashfree payment method codes: cc,dc,ppc,ccc,emi,paypal,upi,nb,app,paylater,applepay
                // nb = netbanking, app = wallet
                payment_methods: 'cc,dc,upi,nb,app,paylater,emi', // All payment methods
                return_params: {
                    transaction_id: transactionId
                }
            }
        };

        console.log('\n📤 Creating Cashfree Order...');
        console.log('   Order Payload:', JSON.stringify(orderPayload, null, 2));

        // Construct the correct endpoint URL
        // Cashfree API endpoint format: https://api.cashfree.com/pg/orders
        // Ensure base URL doesn't have /pg, then add /pg/orders
        const cleanBaseUrl = CASHFREE_BASE_URL.replace(/\/pg\/?$/, '').replace(/\/$/, '');
        const endpointUrl = `${cleanBaseUrl}/pg/orders`;
        
        console.log('   Clean Base URL:', cleanBaseUrl);
        console.log('   Full API Endpoint URL:', endpointUrl);
        console.log('   Request Method: POST');
        console.log('   API Version Header:', CASHFREE_API_VERSION);
        console.log('   Client ID:', CASHFREE_APP_ID ? `${CASHFREE_APP_ID.substring(0, 8)}...${CASHFREE_APP_ID.substring(CASHFREE_APP_ID.length - 4)}` : 'NOT SET');
        console.log('   Client Secret:', CASHFREE_SECRET_KEY ? '***SET***' : 'NOT SET');

        // Create order with Cashfree
        const cashfreeResponse = await axios.post(
            endpointUrl,
            orderPayload,
            {
                headers: {
                    'x-api-version': CASHFREE_API_VERSION,
                    'x-client-id': CASHFREE_APP_ID,
                    'x-client-secret': CASHFREE_SECRET_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000, // 30 second timeout
                validateStatus: function (status) {
                    return status < 500; // Don't throw for 4xx errors, handle them manually
                }
            }
        );
        
        // Check for error status
        if (cashfreeResponse.status !== 200 && cashfreeResponse.status !== 201) {
            console.error('   ❌ Cashfree API returned error status:', cashfreeResponse.status);
            console.error('   Response data:', JSON.stringify(cashfreeResponse.data, null, 2));
            
            const errorCode = cashfreeResponse.data?.code || '';
            const errorMessage = cashfreeResponse.data?.message || JSON.stringify(cashfreeResponse.data);
            
            // Provide user-friendly error messages for common account configuration issues
            let userFriendlyMessage = errorMessage;
            let troubleshootingSteps = '';
            
            if (errorCode === 'request_failed' || errorMessage.includes('not enabled')) {
                troubleshootingSteps = `
TROUBLESHOOTING STEPS:
1. Verify API access is enabled in Cashfree Dashboard:
   - Login to https://merchant.cashfree.com
   - Go to Developers > API Settings
   - Ensure "Payment Gateway API" is enabled
   
2. Check if you're using correct environment credentials:
   - Production: Use production App ID and Secret Key
   - Test/Sandbox: Use sandbox credentials and set CASHFREE_ENVIRONMENT=sandbox
   
3. Verify IP Whitelisting:
   - Check if your server IP needs to be whitelisted in Cashfree dashboard
   - Settings > Security > IP Whitelisting
   
4. Contact Cashfree Support:
   - Fill out support form: https://merchant.cashfree.com/merchants/landing?env=prod&raise_issue=1
   - Request: "Enable Payment Gateway API access for order creation"
   - Mention you can create payment links via web portal but API returns this error
`;
                userFriendlyMessage = `Cashfree account configuration issue: ${errorMessage}.${troubleshootingSteps}`;
            }
            
            throw new Error(`Cashfree API error (${cashfreeResponse.status}): ${userFriendlyMessage}`);
        }

        console.log('✅ Cashfree Order Created');
        console.log('   Full API Response:', JSON.stringify(cashfreeResponse.data, null, 2));

        const paymentSessionId = cashfreeResponse.data?.payment_session_id;
        const cfOrderId = cashfreeResponse.data?.cf_order_id || orderId;
        
        // Check all possible fields for payment URL in response
        const directPaymentUrl = cashfreeResponse.data?.payment_link || 
                                 cashfreeResponse.data?.link_url ||
                                 cashfreeResponse.data?.payment_url ||
                                 cashfreeResponse.data?.checkout_url ||
                                 cashfreeResponse.data?.url;

        if (!paymentSessionId) {
            console.error('   ❌ Payment Session ID missing in response');
            console.error('   Available fields:', Object.keys(cashfreeResponse.data || {}));
            throw new Error('Payment session ID not received from Cashfree');
        }

        console.log('\n📋 Order Details from Cashfree:');
        console.log('   Payment Session ID:', paymentSessionId);
        console.log('   Payment Session ID length:', paymentSessionId.length);
        console.log('   CF Order ID:', cfOrderId);
        console.log('   Our Order ID:', orderId);
        console.log('   Direct Payment URL from API:', directPaymentUrl || 'Not provided in response');

        // Initialize paymentUrl - will be set from various sources
        let paymentUrl;
        
        // Priority 1: Use direct payment URL from API response if available
        if (directPaymentUrl) {
            paymentUrl = directPaymentUrl;
            console.log('   ✅ Using direct payment URL from Cashfree API response');
        } else {
            // Priority 2: Try to get checkout URL from sessions endpoint
            try {
                console.log('\n🔍 Attempting to fetch session details from Cashfree...');
                // Extract session ID from payment_session_id (remove "session_" prefix if present)
                const sessionId = paymentSessionId.startsWith('session_') 
                    ? paymentSessionId.substring(8) // Remove "session_" prefix
                    : paymentSessionId;
                
                const sessionsEndpointUrl = `${cleanBaseUrl}/pg/orders/sessions/${sessionId}`;
                console.log('   Sessions Endpoint URL:', sessionsEndpointUrl);
                const sessionResponse = await axios.get(sessionsEndpointUrl, {
                    headers: {
                        'x-api-version': CASHFREE_API_VERSION,
                        'x-client-id': CASHFREE_APP_ID,
                        'x-client-secret': CASHFREE_SECRET_KEY,
                        'Accept': 'application/json'
                    },
                    timeout: 10000,
                    validateStatus: (status) => status < 500 // Don't throw for 4xx
                });
                
                if (sessionResponse.status === 200 && sessionResponse.data) {
                    const sessionData = sessionResponse.data;
                    console.log('   ✅ Session details retrieved successfully');
                    
                    // Check if session data contains a checkout URL
                    const sessionCheckoutUrl = sessionData.checkout_url || sessionData.payment_url || sessionData.url;
                    if (sessionCheckoutUrl) {
                        paymentUrl = sessionCheckoutUrl;
                        console.log('   ✅ Using checkout URL from session data');
                    }
                } else {
                    console.log('   ℹ️ Sessions endpoint returned:', sessionResponse.status, sessionResponse.data?.message || 'No session data');
                }
            } catch (sessionError) {
                console.log('   ℹ️ Could not fetch session details (non-critical):', sessionError.response?.status || sessionError.message);
                // Don't fail the whole process if session fetch fails
            }
            
            // Priority 3: Construct payment URL using standard format (fallback)
            if (!paymentUrl) {
                paymentUrl = `https://payments.cashfree.com/order/#/checkout?order_token=${paymentSessionId}`;
                console.log('   ✅ Constructed payment URL using payment_session_id as order_token');
            }
        }
        
        console.log('\n🔗 Final Payment URL:');
        console.log('   Full URL:', paymentUrl);
        console.log('   URL Length:', paymentUrl.length);
        console.log('   Contains order_token:', paymentUrl.includes('order_token'));
        console.log('   Contains payment_session_id:', paymentUrl.includes(paymentSessionId));

        // Calculate commission
        const commissionData = calculatePayinCommission(amountValue);
        const expectedSettlement = calculateExpectedSettlementDate(new Date());

        // Save transaction to database
        const transaction = new Transaction({
            transactionId: transactionId,
            orderId: orderId,
            merchantId: merchantId,
            merchantName: merchantName,
            customerId: orderPayload.customer_details.customer_id,
            customerName: customer_name,
            customerEmail: customer_email,
            customerPhone: customer_phone,
            amount: amountValue,
            currency: 'INR',
            description: description || `Payment for ${merchantName}`,
            status: 'created',
            paymentGateway: 'cashfree',
            cashfreeOrderToken: paymentSessionId, // Store original session ID
            cashfreePaymentId: paymentSessionId,
            cashfreeOrderId: cfOrderId,
            successUrl: finalCallbackUrl,
            failureUrl: finalFailureUrl,
            callbackUrl: cashfreeCallbackUrl,
            commission: commissionData.commission,
            netAmount: parseFloat((amountValue - commissionData.commission).toFixed(2)),
            settlementStatus: 'unsettled',
            expectedSettlementDate: expectedSettlement
        });

        await transaction.save();
        console.log('✅ Transaction saved to database');

        // Return response with additional troubleshooting information
        res.json({
            success: true,
            transaction_id: transactionId,
            payment_link_id: cfOrderId,
            payment_url: paymentUrl,
            checkout_page: paymentUrl,
            order_id: orderId,
            order_amount: amountValue,
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            callback_url: finalCallbackUrl,
            payment_session_id: paymentSessionId,
            cf_order_id: cfOrderId,
            message: 'Payment link created successfully. Share this URL with customer.',
            troubleshooting_note: 'If the payment URL shows "Bad URL" error, this may indicate a Cashfree account configuration issue. Please contact Cashfree support at https://merchant.cashfree.com/merchants/landing?env=prod&raise_issue=1 with your CF Order ID and mention that checkout page returns "Bad URL" error.'
        });

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
        const { transaction_id } = req.query;
        const payload = req.body || req.query;

        console.log('\n' + '='.repeat(80));
        console.log('🔔 CASHFREE CALLBACK RECEIVED');
        console.log('='.repeat(80));
        console.log('   Method:', req.method);
        console.log('   Transaction ID (query):', transaction_id);
        console.log('   Payload:', JSON.stringify(payload, null, 2));

        if (!transaction_id) {
            console.warn('❌ Missing transaction_id in callback');
            const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/payment-failed?error=missing_transaction_id`);
        }

        // Find transaction
        const transaction = await Transaction.findOne({ transactionId: transaction_id }).populate('merchantId');

        if (!transaction) {
            console.warn('⚠️ Transaction not found for transactionId:', transaction_id);
            const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/payment-failed?error=transaction_not_found`);
        }

        // Extract payment status from payload
        const orderStatus = payload.order_status || payload.status;
        const paymentStatus = payload.payment_status || payload.paymentStatus;
        const cfOrderId = payload.cf_order_id || payload.order_id || transaction.cashfreeOrderId;
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
                            { transactionId: transaction_id },
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

                    // Redirect to success URL
                    const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
                    const redirectUrl = transaction.successUrl || 
                        transaction.callbackUrl ||
                        `${frontendUrl}/payment-success?transaction_id=${transaction_id}`;
                    
                    console.log('   ✅ Redirecting to SUCCESS:', redirectUrl);
                    return res.redirect(redirectUrl);
                } else if (orderData.order_status === 'ACTIVE' || orderData.payment_status === 'PENDING') {
                    console.log('ℹ️ Payment is still pending');
                    // Redirect to pending page or show pending status
                    const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
                    return res.redirect(`${frontendUrl}/payment-pending?transaction_id=${transaction_id}`);
                } else {
                    // Payment failed
                    console.log('\n❌ PAYMENT FAILED');
                    if (transaction.status !== 'failed') {
                        await Transaction.findOneAndUpdate(
                            { transactionId: transaction_id },
                            {
                                status: 'failed',
                                failureReason: paymentMessage || orderData.payment_message || 'Payment failed',
                                updatedAt: new Date(),
                                webhookData: orderData
                            }
                        );
                        console.log('✅ Transaction status updated to "failed"');
                    }

                    const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
                    const redirectUrl = transaction.failureUrl ||
                        `${frontendUrl}/payment-failed?transaction_id=${transaction_id}&error=${encodeURIComponent(paymentMessage || 'Payment failed')}`;
                    
                    console.log('   ❌ Redirecting to FAILURE:', redirectUrl);
                    return res.redirect(redirectUrl);
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
        const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
        return res.redirect(`${frontendUrl}/payment-failed?error=callback_error`);
    }
};

