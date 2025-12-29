const crypto = require('crypto');
const axios = require('axios');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');
const { generatePayUCheckoutHTML, generatePayUCheckoutHTMLWithForm, formatCountdown } = require('./payuCheckoutTemplate');

// PayU Configuration
const PAYU_KEY = process.env.PAYU_KEY;
const PAYU_SALT = process.env.PAYU_SALT;
const PAYU_CLIENT_ID = process.env.PAYU_CLIENT_ID;
const PAYU_CLIENT_SECRET = process.env.PAYU_CLIENT_SECRET;
const PAYU_ENVIRONMENT = process.env.PAYU_ENVIRONMENT || 'production'; // 'sandbox' or 'production'

// PayU API URLs
const PAYU_BASE_URL = PAYU_ENVIRONMENT === 'sandbox'
    ? 'https://sandboxsecure.payu.in'
    : 'https://secure.payu.in';

const PAYU_PAYMENT_URL = `${PAYU_BASE_URL}/_payment`;
// PayU S2S API endpoint for UPI Intent
// Reference: https://docs.payu.in/docs/upi-intent-server-to-server
const PAYU_S2S_API_URL = `${PAYU_BASE_URL}/merchant/postservice?form=2`;

// PayU Generate UPI Intent API
// Reference: https://docs.payu.in/v2/reference/v2-generate-upi-intent-api
// Note: UPI Intent API might not be available in test/sandbox mode
// Endpoints to try (in order of preference)
const PAYU_INTENT_API_ENDPOINTS = PAYU_ENVIRONMENT === 'sandbox'
    ? [
        'https://test.payu.in/info/v1/intent',
        'http://test.payu.in/info/v1/intent',
        'https://info.payu.in/info/v1/intent',  // Try production endpoint as fallback
        'https://info.payu.in/v1/intent'
      ]
    : [
        'https://info.payu.in/info/v1/intent',  // Try with /info/ path first
        'https://info.payu.in/v1/intent',        // Original endpoint
        'https://secure.payu.in/info/v1/intent', // Alternative endpoint
        'https://secure.payu.in/v1/intent'       // Another alternative
      ];

// PayU Merchant ID (mid) - required for Intent API
// If not set, will try to extract from PAYU_KEY or use default
const PAYU_MERCHANT_ID = process.env.PAYU_MERCHANT_ID || process.env.PAYU_MID || '2';

// Configuration loaded

// Note: PayU India primarily uses form-based payment submission with hash verification
// The CLIENT_ID and CLIENT_SECRET may be used for Payment Links API if available
// For now, we use the standard form-based approach which is more widely supported

// ============ GENERATE PAYU HASH (Standard) ============
/**
 * Generate PayU hash for payment verification
 * Hash format: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt)
 * 
 * Important: All fields must be trimmed and empty udf fields should be empty strings
 * PayU is very strict about hash format - even a single character difference will cause failure
 */
function generatePayUHash(params) {
    // Ensure all values are strings and trimmed
    const key = String(PAYU_KEY || '').trim();
    const txnid = String(params.txnid || '').trim();
    const amount = String(params.amount || '').trim();
    const productinfo = String(params.productinfo || '').trim();
    const firstname = String(params.firstname || '').trim();
    const email = String(params.email || '').trim();
    const udf1 = String(params.udf1 || '').trim();
    const udf2 = String(params.udf2 || '').trim();
    const udf3 = String(params.udf3 || '').trim();
    const udf4 = String(params.udf4 || '').trim();
    const udf5 = String(params.udf5 || '').trim();
    const udf6 = String(params.udf6 || '').trim();
    const udf7 = String(params.udf7 || '').trim();
    const udf8 = String(params.udf8 || '').trim();
    const udf9 = String(params.udf9 || '').trim();
    const udf10 = String(params.udf10 || '').trim();
    const salt = String(PAYU_SALT || '').trim();

    // Build hash string exactly as PayU expects
    // Format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = [
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
        udf6,
        udf7,
        udf8,
        udf9,
        udf10,
        salt
    ].join('|');

    // Generate SHA512 hash
    const hash = crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');

    return hash;
}

// ============ GENERATE PAYU S2S HASH ============
/**
 * Generate PayU hash for S2S UPI Intent
 * Hash format for S2S: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|txn_s2s_flow|s2s_client_ip|s2s_device_info|upiAppName|salt)
 */
function generatePayUS2SHash(params) {
    const key = String(PAYU_KEY || '').trim();
    const txnid = String(params.txnid || '').trim();
    const amount = String(params.amount || '').trim();
    const productinfo = String(params.productinfo || '').trim();
    const firstname = String(params.firstname || '').trim();
    const email = String(params.email || '').trim();
    const udf1 = String(params.udf1 || '').trim();
    const udf2 = String(params.udf2 || '').trim();
    const udf3 = String(params.udf3 || '').trim();
    const udf4 = String(params.udf4 || '').trim();
    const udf5 = String(params.udf5 || '').trim();
    const udf6 = String(params.udf6 || '').trim();
    const udf7 = String(params.udf7 || '').trim();
    const udf8 = String(params.udf8 || '').trim();
    const udf9 = String(params.udf9 || '').trim();
    const udf10 = String(params.udf10 || '').trim();
    const txn_s2s_flow = String(params.txn_s2s_flow || '4').trim();
    const s2s_client_ip = String(params.s2s_client_ip || '').trim();
    const s2s_device_info = String(params.s2s_device_info || '').trim();
    const upiAppName = String(params.upiAppName || 'genericintent').trim();
    const salt = String(PAYU_SALT || '').trim();

    const hashString = [
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
        udf6,
        udf7,
        udf8,
        udf9,
        udf10,
        txn_s2s_flow,
        s2s_client_ip,
        s2s_device_info,
        upiAppName,
        salt
    ].join('|');

    return crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
}

// ============ CREATE PAYU PAYMENT LINK ============
exports.createPayuPaymentLink = async (req, res) => {
    let transactionId = null;
    let orderId = null;
    
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


        // Check if PayU is enabled in settings
        const settings = await Settings.getSettings();
        if (!settings.paymentGateways.payu?.enabled) {
            console.error('❌ PayU is not enabled in payment gateway settings');
            return res.status(403).json({
                success: false,
                error: 'PayU payment gateway is not enabled. Please contact administrator to enable it.',
                details: {
                    description: 'PayU gateway is disabled',
                    code: 'GATEWAY_DISABLED',
                    hint: 'The administrator needs to enable PayU in the payment gateway settings from the admin dashboard.'
                }
            });
        }

        // Validate credentials
        if (!PAYU_KEY || !PAYU_SALT) {
            console.error('❌ PayU credentials not configured');
            return res.status(500).json({
                success: false,
                error: 'PayU credentials not configured. Please set PAYU_KEY and PAYU_SALT in environment variables.'
            });
        }

        // Warn if environment might be mismatched
        if (PAYU_ENVIRONMENT === 'production' && PAYU_KEY.includes('test')) {
            console.warn('⚠️ WARNING: Production environment detected but key appears to be test key');
        }
        if (PAYU_ENVIRONMENT === 'sandbox' && !PAYU_KEY.includes('test') && !PAYU_BASE_URL.includes('sandbox')) {
            console.warn('⚠️ WARNING: Sandbox environment but key/URL might be production');
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
        if (parseFloat(amount) < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Generate unique IDs
        transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const referenceId = `REF_${Date.now()}`;

        // Get merchant's configured URLs or use provided ones
        const merchant = await User.findById(merchantId);
        const finalCallbackUrl = callback_url ||
            merchant?.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        // PayU callback URL - points to our callback handler
        const payuCallbackUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/payu/callback?transaction_id=${transactionId}`;

        // Prepare amount for PayU Generate UPI Intent API
        // Important: Amount must be formatted correctly (2 decimal places)
        const amountFormatted = parseFloat(amount).toFixed(2);
        
        // Generate PayU UPI Intent using Generate UPI Intent API - REQUIRED, NO FALLBACK
        // Reference: https://docs.payu.in/v2/reference/v2-generate-upi-intent-api
        const expiryTime = 900; // 15 minutes in seconds
        const refUrl = finalCallbackUrl;
        
        console.log('🔄 Generating PayU UPI Intent for order:', orderId);
        console.log('   Amount:', amountFormatted);
        console.log('   Expiry Time:', expiryTime, 'seconds');
        console.log('   Reference URL:', refUrl);
        
        // This will throw an error if Intent API fails - NO FALLBACK
        const intentData = await generatePayUUPIIntent(
            orderId,
            amountFormatted,
            expiryTime,
            refUrl,
            '01' // category
        );
        
        if (!intentData || !intentData.intentUri) {
            throw new Error('PayU Intent API returned invalid response: missing intentUri');
        }
        
        console.log('✅ PayU UPI Intent generated successfully');
        console.log('   Intent URI:', intentData.intentUri);
        console.log('   Intent URL:', intentData.intentUrl);
        
        // Extract UPI parameters from PayU Intent API response
        const intentUri = intentData.intentUri;
        const queryString = intentUri.split('?')[1] || '';
        
        // Parse query string to extract reference ID
        const urlParams = {};
        if (queryString) {
            queryString.split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key && value) {
                    urlParams[key] = decodeURIComponent(value);
                }
            });
        }
        
        // Build UPI deep links from PayU's intentUri
        const upiQuery = queryString; // Use the query string from PayU's intentUri directly
        const upiDeepLinks = {
            generic: intentUri,  // Use PayU's intentUri directly
            phonepe: `phonepe://pay?${upiQuery}`,
            googlepay: `tez://pay?${upiQuery}`,
            gpay_intent: `intent://pay?${upiQuery}#Intent;package=com.google.android.apps.nbu.paisa.user;scheme=upi;end`,
            paytm: `paytmmp://pay?${upiQuery}`,
            bhim: `bhim://pay?${upiQuery}`,
            cred: `credpay://pay?${upiQuery}`,
            amazonpay: `amazonpay://pay?${upiQuery}`
        };
        
        // Extract reference ID from intentUri (tr parameter)
        const payuReferenceId = urlParams.tr || orderId;

        // Save transaction to database
        const transactionData = {
            transactionId: transactionId,
            orderId: orderId,
            merchantId: merchantId,
            merchantName: merchantName,
            customerId: `CUST_${customer_phone}_${Date.now()}`,
            customerName: customer_name,
            customerEmail: customer_email,
            customerPhone: customer_phone,
            amount: parseFloat(amount),
            currency: 'INR',
            description: description || `Payment for ${merchantName}`,
            status: 'created',
            paymentGateway: 'payu',
            payuOrderId: orderId,
            payuReferenceId: payuReferenceId,
            callbackUrl: finalCallbackUrl,
            successUrl: success_url,
            failureUrl: failure_url,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Store UPI Intent data from PayU Intent API (REQUIRED)
        transactionData.payuIntentData = {
            intentId: intentData.intentId,
            intentUri: intentData.intentUri,
            intentUrl: intentData.intentUrl,
            intentUrlWithQR: intentData.intentUrlWithQR,
            transactionId: intentData.transactionId,
            expiryTime: intentData.expiryTime,
            referenceId: payuReferenceId,
            intentApiAvailable: true
        };
        
        const transaction = new Transaction(transactionData);

        await transaction.save();

        // Create checkout page URL - this will use the modern checkout page with PayU Intent API
        const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
        const checkoutPageUrl = `${baseUrl}/api/payu/checkout/${transactionId}`;

        // Build response with Intent API data (REQUIRED)
        const response = {
            success: true,
            transaction_id: transactionId,
            payment_link_id: orderId,
            payment_url: checkoutPageUrl,
            checkout_page: checkoutPageUrl,
            order_id: orderId,
            order_amount: parseFloat(amount),
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            reference_id: payuReferenceId,
            callback_url: finalCallbackUrl,
            // UPI Deep Links from PayU Intent API
            upi_deep_link: upiDeepLinks.generic,
            phonepe_deep_link: upiDeepLinks.phonepe,
            gpay_deep_link: upiDeepLinks.googlepay,
            gpay_intent: upiDeepLinks.gpay_intent,
            paytm_deep_link: upiDeepLinks.paytm,
            bhim_deep_link: upiDeepLinks.bhim,
            cred_deep_link: upiDeepLinks.cred,
            amazonpay_deep_link: upiDeepLinks.amazonpay,
            // UPI Intent data from PayU API
            upi_intent: {
                intent_id: intentData.intentId,
                intent_uri: intentData.intentUri,
                intent_url: intentData.intentUrl,
                intent_url_with_qr: intentData.intentUrlWithQR,
                reference_id: payuReferenceId,
                amount: amountFormatted,
                expiry_time: intentData.expiryTime,
                bank_accounts: intentData.bankAccounts || []
            },
            message: 'Payment link created successfully using PayU Generate UPI Intent API. Use the checkout_page URL to access the modern payment interface with UPI deep links.'
        };
        
        res.json(response);

    } catch (error) {
        console.error('❌ Create PayU Payment Link Error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            error: error.response?.data || error.error,
            statusCode: error.response?.status || error.statusCode,
            errorCode: error.errorCode,
            isAccountRestriction: error.isAccountRestriction,
            stack: error.stack
        });

        // Handle specific PayU account restriction errors
        if (error.isAccountRestriction && error.errorCode === 'E2016') {
            return res.status(403).json({
                success: false,
                error: 'PayU UPI Intent feature is disabled',
                message: error.message || 'The Generate UPI Intent API feature is not enabled for your PayU merchant account.',
                details: {
                    description: 'PayU UPI Intent API feature is disabled at account level',
                    code: 'E2016',
                    payu_message: error.payuMessage || 'Payment option is disabled. Please contact your account manager.',
                    solution: 'Contact your PayU account manager to enable the Generate UPI Intent API feature for your merchant account.',
                    documentation: 'https://docs.payu.in/v2/reference/v2-generate-upi-intent-api',
                    troubleshooting: [
                        '1. Contact your PayU account manager',
                        '2. Request to enable the "Generate UPI Intent API" feature',
                        '3. Verify your PayU merchant account has UPI Intent permissions',
                        '4. Check if your account type supports this feature'
                    ]
                },
                transaction_id: transactionId,
                order_id: orderId || 'N/A'
            });
        }

        // Handle other errors
        const statusCode = error.response?.status || error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to create payment link',
            details: {
                description: error.response?.data?.message || error.message,
                code: error.errorCode || 'PAYU_API_ERROR',
                payu_response: error.response?.data || {},
                status_code: statusCode
            },
            transaction_id: transactionId,
            order_id: orderId || 'N/A'
        });
    }
};

// ============ CREATE PAYU FORM-BASED PAYMENT (Fallback) ============
/**
 * Fallback to form-based payment if S2S fails
 */
async function createPayuFormBasedPayment(req, res, data) {
    const {
        transactionId,
        orderId,
        referenceId,
        merchantId,
        merchantName,
        customer_name,
        customer_email,
        customer_phone,
        amount,
        amountFormatted,
        productInfo,
        firstName,
        email,
        finalCallbackUrl,
        success_url,
        failure_url,
        payuCallbackUrl
    } = data;

    // Standard form-based parameters
    const payuParams = {
        key: PAYU_KEY.trim(),
        txnid: orderId,
        amount: amountFormatted,
        productinfo: productInfo,
        firstname: firstName,
        email: email,
        phone: customer_phone.trim(),
        surl: (success_url || finalCallbackUrl).trim(),
        furl: (failure_url || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed`).trim(),
        curl: payuCallbackUrl.trim(),
        service_provider: 'payu_paisa',
        pg: 'UPI'
    };

    // Generate hash
    const hashParams = {
        txnid: payuParams.txnid,
        amount: payuParams.amount,
        productinfo: payuParams.productinfo,
        firstname: payuParams.firstname,
        email: payuParams.email
    };
    
    const hash = generatePayUHash(hashParams);
    payuParams.hash = hash;

    // Save transaction
    const transaction = new Transaction({
        transactionId: transactionId,
        orderId: orderId,
        merchantId: merchantId,
        merchantName: merchantName,
        customerId: `CUST_${customer_phone}_${Date.now()}`,
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        amount: parseFloat(amount),
        currency: 'INR',
        description: productInfo,
        status: 'created',
        paymentGateway: 'payu',
        payuOrderId: orderId,
        payuReferenceId: referenceId,
        callbackUrl: finalCallbackUrl,
        successUrl: success_url,
        failureUrl: failure_url,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    await transaction.save();

    const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
    const checkoutPageUrl = `${baseUrl}/api/payu/checkout/${transactionId}`;

    res.json({
        success: true,
        transaction_id: transactionId,
        payment_link_id: orderId,
        payment_url: checkoutPageUrl,
        checkout_page: checkoutPageUrl,
        order_id: orderId,
        order_amount: parseFloat(amount),
        order_currency: 'INR',
        merchant_id: merchantId.toString(),
        merchant_name: merchantName,
        reference_id: referenceId,
        callback_url: finalCallbackUrl,
        message: 'Payment link created successfully (form-based fallback). Share this URL with customer.'
    });
}

// ============ PAYU CALLBACK HANDLER ============
/**
 * Handle PayU payment callback (POST request after payment)
 */
exports.handlePayuCallback = async (req, res) => {
    try {
        const { transaction_id } = req.query;
        const payuResponse = req.method === 'POST' ? req.body : req.query;

        console.log('🔔 PayU Callback received');
        console.log('   Transaction ID:', transaction_id);
        console.log('   PayU Response:', JSON.stringify(payuResponse, null, 2));

        if (!transaction_id) {
            console.warn('❌ Missing transaction_id in callback');
            return res.redirect(`${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed?error=missing_transaction_id`);
        }

        // Find transaction
        const transaction = await Transaction.findOne({ transactionId: transaction_id }).populate('merchantId');

        if (!transaction) {
            console.warn('⚠️ Transaction not found for transactionId:', transaction_id);
            return res.redirect(`${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed?error=transaction_not_found`);
        }

        // Verify hash
        const receivedHash = payuResponse.hash;
        const calculatedHash = generatePayUHash(payuResponse);

        if (receivedHash !== calculatedHash) {
            console.warn('❌ Invalid PayU hash in callback');
            // Still process but log warning
        }

        // Check payment status
        const status = payuResponse.status;
        const txnid = payuResponse.txnid || payuResponse.txnid;
        const amount = payuResponse.amount ? parseFloat(payuResponse.amount) : transaction.amount;

        if (status === 'success' || payuResponse.pg_type === 'success') {
            // Payment successful
            if (transaction.status !== 'paid') {
                const paidAt = new Date();
                const expectedSettlement = await calculateExpectedSettlementDate(paidAt);
                const commissionData = calculatePayinCommission(amount);

                const update = {
                    status: 'paid',
                    paidAt,
                    paymentMethod: payuResponse.payment_mode || 'UPI',
                    payuPaymentId: txnid,
                    updatedAt: new Date(),
                    acquirerData: {
                        utr: payuResponse.bank_ref_num || null,
                        rrn: payuResponse.bank_ref_num || null,
                        bank_transaction_id: payuResponse.bank_ref_num || null,
                        bank_name: payuResponse.bankcode || null
                    },
                    settlementStatus: 'unsettled',
                    expectedSettlementDate: expectedSettlement,
                    commission: commissionData.commission,
                    netAmount: parseFloat((amount - commissionData.commission).toFixed(2)),
                    webhookData: payuResponse
                };

                const updatedTransaction = await Transaction.findOneAndUpdate(
                    { transactionId: transaction_id },
                    update,
                    { new: true }
                ).populate('merchantId');

                if (updatedTransaction && updatedTransaction.merchantId.webhookEnabled) {
                    const webhookPayload = {
                        event: 'payment.success',
                        timestamp: new Date().toISOString(),
                        transaction_id: updatedTransaction.transactionId,
                        order_id: updatedTransaction.orderId,
                        merchant_id: updatedTransaction.merchantId._id.toString(),
                        data: {
                            transaction_id: updatedTransaction.transactionId,
                            order_id: updatedTransaction.orderId,
                            payu_order_id: updatedTransaction.payuOrderId,
                            payu_payment_id: updatedTransaction.payuPaymentId,
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
                }

                console.log('✅ Transaction updated via callback:', transaction_id);
            }

            const redirectUrl = transaction.successUrl ||
                              transaction.callbackUrl ||
                              `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success?transaction_id=${transaction_id}`;
            return res.redirect(redirectUrl);
        } else {
            // Payment failed
            const failureReason = payuResponse.error || payuResponse.error_Message || 'Payment failed';
            
            if (transaction.status !== 'failed') {
                await Transaction.findOneAndUpdate(
                    { transactionId: transaction_id },
                    {
                        status: 'failed',
                        failureReason: failureReason,
                        payuPaymentId: txnid,
                        updatedAt: new Date(),
                        webhookData: payuResponse
                    }
                );
            }

            const redirectUrl = transaction.failureUrl ||
                              `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed?transaction_id=${transaction_id}&error=${encodeURIComponent(failureReason)}`;
            return res.redirect(redirectUrl);
        }

    } catch (error) {
        console.error('❌ PayU Callback Handler Error:', error);
        return res.redirect(`${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed?error=callback_error`);
    }
};

// ============ PAYU WEBHOOK HANDLER ============
/**
 * Handle PayU webhook events
 */
exports.handlePayuWebhook = async (req, res) => {
    try {
        console.log('🔔 PayU Webhook received');
        
        const payload = req.body || {};
        
        if (!payload || Object.keys(payload).length === 0) {
            console.warn('❌ Webhook received with empty payload');
            return res.status(400).json({
                success: false,
                error: 'Empty webhook payload'
            });
        }

        // Verify hash if present
        if (payload.hash) {
            const receivedHash = payload.hash;
            const calculatedHash = generatePayUHash(payload);
            
            if (receivedHash !== calculatedHash) {
                console.warn('❌ Invalid PayU webhook hash');
                return res.status(401).json({
                    success: false,
                    error: 'Invalid hash'
                });
            }
            console.log('✅ PayU webhook hash verified');
        }

        // Extract transaction details
        const orderId = payload.txnid || payload.orderId;
        const status = payload.status;
        
        if (!orderId) {
            console.warn('❌ Missing order ID in webhook payload');
            return res.status(400).json({
                success: false,
                error: 'Missing order ID'
            });
        }

        // Find transaction
        const transaction = await Transaction.findOne({
            $or: [
                { payuOrderId: orderId },
                { orderId: orderId }
            ]
        }).populate('merchantId');

        if (!transaction) {
            console.warn('⚠️ Transaction not found for orderId:', orderId);
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Handle payment status
        if (status === 'success' || payload.pg_type === 'success') {
            await handlePayuPaymentSuccess(transaction, payload);
        } else {
            await handlePayuPaymentFailed(transaction, payload);
        }

        return res.status(200).json({
            success: true,
            message: 'Webhook processed'
        });

    } catch (error) {
        console.error('❌ PayU Webhook Handler Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Webhook processing failed'
        });
    }
};

// ============ PAYU WEBHOOK HANDLERS ============

/**
 * Handle successful PayU payment
 */
async function handlePayuPaymentSuccess(transaction, payload) {
    try {
        console.log('💡 handlePayuPaymentSuccess triggered');

        if (transaction.status === 'paid') {
            console.log('⚠️ Transaction already marked as paid, skipping update');
            return;
        }

        const amount = payload.amount ? parseFloat(payload.amount) : transaction.amount;
        const paidAt = new Date();
        const expectedSettlement = await calculateExpectedSettlementDate(paidAt);
        const commissionData = calculatePayinCommission(amount);

        const update = {
            $set: {
                status: 'paid',
                paidAt,
                paymentMethod: payload.payment_mode || 'UPI',
                payuPaymentId: payload.txnid || payload.orderId,
                updatedAt: new Date(),
                acquirerData: {
                    utr: payload.bank_ref_num || null,
                    rrn: payload.bank_ref_num || null,
                    bank_transaction_id: payload.bank_ref_num || null,
                    bank_name: payload.bankcode || null
                },
                settlementStatus: 'unsettled',
                expectedSettlementDate: expectedSettlement,
                webhookData: payload,
                commission: commissionData.commission,
                netAmount: parseFloat((amount - commissionData.commission).toFixed(2))
            }
        };

        const updatedTransaction = await Transaction.findOneAndUpdate(
            {
                _id: transaction._id,
                status: { $ne: 'paid' }
            },
            update,
            { new: true, upsert: false }
        ).populate('merchantId');

        if (!updatedTransaction) {
            console.warn('⚠️ Failed to update transaction');
            return;
        }

        console.log(`💾 Transaction updated: ${updatedTransaction.transactionId}`);

        // Send merchant webhook if enabled
        if (updatedTransaction.merchantId.webhookEnabled) {
            const webhookPayload = {
                event: 'payment.success',
                timestamp: new Date().toISOString(),
                transaction_id: updatedTransaction.transactionId,
                order_id: updatedTransaction.orderId,
                merchant_id: updatedTransaction.merchantId._id.toString(),
                data: {
                    transaction_id: updatedTransaction.transactionId,
                    order_id: updatedTransaction.orderId,
                    payu_order_id: updatedTransaction.payuOrderId,
                    payu_payment_id: updatedTransaction.payuPaymentId,
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
        }

        console.log('✅ PayU payment webhook processed successfully');

    } catch (error) {
        console.error('❌ handlePayuPaymentSuccess error:', error.stack || error.message);
    }
}

/**
 * Handle failed PayU payment
 */
async function handlePayuPaymentFailed(transaction, payload) {
    try {
        console.log('💡 handlePayuPaymentFailed triggered');

        const failureReason = payload.error || payload.error_Message || 'Payment failed';

        const update = {
            $set: {
                status: 'failed',
                failureReason: failureReason,
                payuPaymentId: payload.txnid || payload.orderId,
                updatedAt: new Date(),
                webhookData: payload
            }
        };

        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: transaction._id },
            update,
            { new: true }
        ).populate('merchantId');

        if (!updatedTransaction) {
            console.warn('⚠️ Failed to update transaction');
            return;
        }

        console.log('❌ PayU Transaction marked as FAILED:', updatedTransaction.transactionId);

        // Send merchant webhook if enabled
        if (updatedTransaction.merchantId.webhookEnabled) {
            const webhookPayload = {
                event: 'payment.failed',
                timestamp: new Date().toISOString(),
                transaction_id: updatedTransaction.transactionId,
                order_id: updatedTransaction.orderId,
                merchant_id: updatedTransaction.merchantId._id.toString(),
                data: {
                    transaction_id: updatedTransaction.transactionId,
                    order_id: updatedTransaction.orderId,
                    payu_order_id: updatedTransaction.payuOrderId,
                    status: updatedTransaction.status,
                    failure_reason: updatedTransaction.failureReason,
                    created_at: updatedTransaction.createdAt.toISOString(),
                    updated_at: updatedTransaction.updatedAt.toISOString()
                }
            };

            await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
        }

    } catch (error) {
        console.error('❌ handlePayuPaymentFailed error:', error.message);
    }
}

// ============ GENERATE PAYU UPI INTENT ============
/**
 * Generate PayU UPI Intent using PayU Generate UPI Intent API
 * Reference: https://docs.payu.in/v2/reference/v2-generate-upi-intent-api
 * 
 * @param {string} transactionId - Unique transaction identifier
 * @param {string} transactionAmount - Amount in format "XX.XX"
 * @param {number} expiryTime - Expiry time in seconds
 * @param {string} refUrl - Optional reference URL
 * @param {string} category - Optional category code
 * @returns {Promise<Object>} PayU Intent response with intentUri, intentUrl, etc.
 */
async function generatePayUUPIIntent(transactionId, transactionAmount, expiryTime = 900, refUrl = null, category = null) {
    // Use the endpoints array defined at the top
    const endpointsToTry = PAYU_INTENT_API_ENDPOINTS;
    
    let lastError = null;
    
    // Try different authentication methods
    const authMethods = [];
    
    // Method 1: Try PAYU_SALT (standard PayU secret)
    if (PAYU_SALT) {
        authMethods.push({ secret: PAYU_SALT, name: 'PAYU_SALT' });
    }
    
    // Method 2: Try PAYU_CLIENT_SECRET (if different from SALT)
    if (PAYU_CLIENT_SECRET && PAYU_CLIENT_SECRET !== PAYU_SALT) {
        authMethods.push({ secret: PAYU_CLIENT_SECRET, name: 'PAYU_CLIENT_SECRET' });
    }
    
    if (authMethods.length === 0) {
        throw new Error('PayU merchant secret not configured. Please set PAYU_SALT or PAYU_CLIENT_SECRET in environment variables.');
    }
    
    // Try different mid values
    const midValues = [
        PAYU_MERCHANT_ID,  // User configured
        PAYU_KEY,          // Try using PAYU_KEY as mid
        '2'                // Default fallback
    ].filter((v, i, arr) => v && arr.indexOf(v) === i); // Remove duplicates
    
    for (const endpoint of endpointsToTry) {
        for (const authMethod of authMethods) {
            for (const midValue of midValues) {
                try {
                    if (endpoint === endpointsToTry[0] && authMethod === authMethods[0] && midValue === midValues[0]) {
                        console.log(`🔄 Trying PayU Intent API endpoint: ${endpoint}`);
                    }
                    
                    // Prepare request body
                    const requestBody = {
                        transactionId: transactionId,
                        transactionAmount: String(transactionAmount),
                        expiryTime: String(expiryTime)
                    };
                    
                    if (refUrl) {
                        requestBody.refUrl = refUrl;
                    }
                    if (category) {
                        requestBody.category = category;
                    }
                    
                    const bodyData = JSON.stringify(requestBody);
                    
                    // Generate date header (RFC 7231 format)
                    const date = new Date().toUTCString();
                    
                    // Generate authorization header
                    // Hash format: sha512(Body data + '|' + date + '|' + merchant_secret)
                    const hashString = bodyData + '|' + date + '|' + authMethod.secret;
                    const hash = crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
                    
                    const authorization = `hmac username="${PAYU_KEY}", algorithm="sha512", headers="date", signature="${hash}"`;
                    
                    // Prepare headers - PayU Intent API requires 'mid' header
                    const headers = {
                        'Content-Type': 'application/json',
                        'date': date,
                        'authorization': authorization,
                        'mid': String(midValue)  // Merchant ID header
                    };
                    
                    // Log authentication method on first attempt
                    if (endpoint === endpointsToTry[0] && authMethod === authMethods[0] && midValue === midValues[0]) {
                        console.log(`   Trying authentication: ${authMethod.name}, mid: ${midValue}`);
                        console.log(`   Request Body:`, requestBody);
                    }
                    
                    // Make API request
                    const response = await axios.post(endpoint, bodyData, {
                        headers: headers,
                        timeout: 30000,
                        validateStatus: function (status) {
                            return status >= 200 && status < 600;
                        }
                    });
                    
                    // Check response
                    if (response.status === 404) {
                        console.warn(`   ⚠️ Endpoint returned 404: ${endpoint}`);
                        lastError = new Error(`PayU Intent API endpoint not found: ${endpoint}`);
                        lastError.response = response;
                        break; // Try next endpoint
                    }
                    
                    if (response.status === 401) {
                        // Authentication failed - try next auth method
                        if (authMethod === authMethods[authMethods.length - 1] && midValue === midValues[midValues.length - 1]) {
                            // Last auth method and mid value - try next endpoint
                            console.warn(`   ⚠️ Authentication failed (401) with ${authMethod.name}, mid: ${midValue}`);
                            lastError = new Error(`PayU Intent API authentication failed: ${JSON.stringify(response.data)}`);
                            lastError.response = response;
                            break; // Try next endpoint
                        }
                        continue; // Try next auth method or mid value
                    }
                    
                    const responseData = response.data || {};
                    
                    // Check for errors in response data first (even if status is 200)
                    if (responseData.status === 0 || responseData.status === 'failure' || responseData.error || response.status !== 200) {
                        // Handle specific error code E2016: Payment option disabled
                        if (responseData.errorCode === 'E2016' || (response.status === 400 && responseData.errorCode === 'E2016')) {
                            const error = new Error(`PayU UPI Intent feature is disabled for your merchant account. Please contact your PayU account manager to enable the Generate UPI Intent API feature.`);
                            error.response = response;
                            error.errorCode = 'E2016';
                            error.isAccountRestriction = true;
                            error.payuMessage = responseData.message || 'Payment option is disabled. Please contact your account manager.';
                            throw error;
                        }
                        
                        // Handle other errors
                        if (response.status !== 200) {
                            const error = new Error(`PayU Intent API returned status ${response.status}: ${responseData.message || JSON.stringify(responseData)}`);
                            error.response = response;
                            error.errorCode = responseData.errorCode;
                            throw error;
                        }
                        
                        const error = new Error(responseData.message || responseData.error || 'PayU Intent API returned an error');
                        error.response = response;
                        error.errorCode = responseData.errorCode;
                        throw error;
                    }
                    
                    // Success - return intent data
                    console.log(`✅ PayU Intent API success!`);
                    console.log(`   Endpoint: ${endpoint}`);
                    console.log(`   Auth method: ${authMethod.name}`);
                    console.log(`   Mid: ${midValue}`);
                    return {
                        success: true,
                        intentId: responseData.result?.intentId,
                        intentUri: responseData.result?.intentUri,
                        intentUrl: responseData.result?.intentUrl,
                        intentUrlWithQR: responseData.result?.intentUrlWithQR,
                        transactionId: responseData.result?.transactionId,
                        expiryTime: responseData.result?.expiryTime,
                        bankAccounts: responseData.result?.bankAccounts || []
                    };
                    
                } catch (error) {
                    // Only log if it's not a 401 (we'll try other auth methods)
                    if (error.response?.status !== 401) {
                        console.error(`❌ PayU Intent API Error:`, error.message);
                        if (error.response) {
                            console.error(`   Status: ${error.response.status}`);
                            console.error(`   Response:`, error.response.data);
                        }
                    }
                    lastError = error;
                    
                    // If it's not a 401 or 404, don't try other methods
                    if (error.response?.status !== 401 && error.response?.status !== 404) {
                        throw error;
                    }
                }
            }
        }
    }
    
    // All endpoints and auth methods failed
    console.error('❌ All PayU Intent API authentication methods failed');
    console.error('   Tried endpoints:', endpointsToTry);
    console.error('   Tried auth methods:', authMethods.map(m => m.name));
    console.error('   Tried mid values:', midValues);
    console.error('   Last error:', lastError?.message);
    console.error('   Last response status:', lastError?.response?.status);
    console.error('   Last response data:', lastError?.response?.data);
    
    const errorMessage = lastError?.message || 'PayU Intent API authentication failed';
    const detailedError = new Error(`${errorMessage}. Tried ${endpointsToTry.length} endpoint(s), ${authMethods.length} auth method(s), and ${midValues.length} mid value(s). Please verify: 1) PAYU_SALT or PAYU_CLIENT_SECRET is correct, 2) PAYU_KEY is correct, 3) PAYU_MERCHANT_ID is set correctly, 4) Your PayU account has the Generate UPI Intent API feature enabled. Contact PayU support if the issue persists.`);
    detailedError.endpointsTried = endpointsToTry;
    detailedError.authMethodsTried = authMethods.map(m => m.name);
    detailedError.midValuesTried = midValues;
    detailedError.lastResponse = lastError?.response?.data;
    detailedError.lastStatus = lastError?.response?.status;
    throw detailedError;
}

// ============ PAYU CHECKOUT PAGE ============
/**
 * PayU Checkout Page - Modern UI similar to Cashfree checkout
 * Uses PayU Generate UPI Intent API to create payment options
 */
exports.getPayuCheckoutPage = async (req, res) => {
    try {
        const { transactionId } = req.params;

        // Find transaction
        const transaction = await Transaction.findOne({ transactionId: transactionId });

        if (!transaction) {
            console.warn('❌ Transaction not found:', transactionId);
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payment Link Not Found</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #d32f2f; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Payment Link Not Found</h1>
                    <p>The payment link you're looking for doesn't exist or has expired.</p>
                </body>
                </html>
            `);
        }

        if (transaction.status !== 'created' && transaction.status !== 'pending') {
            console.warn('⚠️ Transaction already processed:', transaction.status);
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payment Already Processed</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .info { color: #1976d2; }
                    </style>
                </head>
                <body>
                    <h1 class="info">Payment Already Processed</h1>
                    <p>This payment link has already been used. Status: ${transaction.status}</p>
                </body>
                </html>
            `);
        }

        // Escape HTML helper
        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        // Get or generate PayU UPI Intent - REQUIRED, NO FALLBACK
        let intentData = null;
        const storedIntentData = transaction.payuIntentData;
        
        if (storedIntentData && storedIntentData.intentUri) {
            // Use stored intent data
            console.log('✅ Using stored PayU UPI Intent data from transaction');
            intentData = {
                intentId: storedIntentData.intentId,
                intentUri: storedIntentData.intentUri,
                intentUrl: storedIntentData.intentUrl,
                intentUrlWithQR: storedIntentData.intentUrlWithQR,
                transactionId: storedIntentData.transactionId,
                expiryTime: storedIntentData.expiryTime || 900
            };
        } else {
            // Generate new PayU UPI Intent using Generate UPI Intent API - REQUIRED
            const amountFormatted = transaction.amount.toFixed(2);
            const expiryTime = 900; // 15 minutes in seconds
            const refUrl = transaction.callbackUrl || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;
            
            console.log('🔄 Generating new PayU UPI Intent for transaction:', transactionId);
            console.log('   This is REQUIRED - no fallback available');
            
            // This will throw an error if Intent API fails - NO FALLBACK
            intentData = await generatePayUUPIIntent(
                transaction.payuOrderId || transaction.orderId,
                amountFormatted,
                expiryTime,
                refUrl,
                '01' // category
            );
            
            if (!intentData || !intentData.intentUri) {
                throw new Error('PayU Intent API returned invalid response: missing intentUri');
            }
            
            console.log('✅ PayU UPI Intent generated successfully');
            console.log('   Intent URI:', intentData.intentUri);
            console.log('   Intent URL:', intentData.intentUrl);
            
            // Update transaction with new intent data
            transaction.payuIntentData = {
                intentId: intentData.intentId,
                intentUri: intentData.intentUri,
                intentUrl: intentData.intentUrl,
                intentUrlWithQR: intentData.intentUrlWithQR,
                transactionId: intentData.transactionId,
                expiryTime: intentData.expiryTime,
                referenceId: transaction.payuReferenceId,
                intentApiAvailable: true
            };
            await transaction.save();
        }

        // Use PayU Intent API data (REQUIRED - no fallback)
        if (!intentData || !intentData.intentUri) {
            throw new Error('PayU UPI Intent data is required but not available');
        }
        
        // Parse intentUri to extract UPI parameters
        // Use the intentUri directly from PayU API response
        // Format: upi://pay?pa=payumoney@hdfcbank&pn=PayUMoney&tr=0fd9829f68&am=190.00&cu=INR&mc=5411&tn=Payment%20to%20Merchant
        const intentUri = intentData.intentUri;
        
        // Extract query string from intentUri for building app-specific deep links
        const queryString = intentUri.split('?')[1] || '';
        
        // Build UPI deep links for different apps using the query string from PayU intentUri
        // Reference: https://docs.payu.in/v2/reference/v2-generate-upi-intent-api
        const upiApps = {
            // Generic UPI - use PayU's intentUri directly
            generic: intentUri,
            // PhonePe deep link
            phonepe: `phonepe://pay?${queryString}`,
            // Google Pay deep link (tez://)
            googlepay: `tez://pay?${queryString}`,
            // Paytm deep link
            paytm: `paytmmp://pay?${queryString}`,
            // BHIM UPI deep link
            bhim: `bhim://pay?${queryString}`,
            // CRED deep link
            cred: `credpay://pay?${queryString}`,
            // Amazon Pay deep link
            amazonpay: `amazonpay://pay?${queryString}`
        };
        
        // Android Intent URL for Google Pay (for better Android support)
        // Format: intent://pay?{query}#Intent;package=com.google.android.apps.nbu.paisa.user;scheme=upi;end
        const gpayIntent = `intent://pay?${queryString}#Intent;package=com.google.android.apps.nbu.paisa.user;scheme=upi;end`;
        
        // Calculate countdown timer from PayU response (expiryTime in seconds)
        const countdownSeconds = intentData.expiryTime || 900;
        
        console.log('✅ Using PayU Intent API data:');
        console.log('   Intent URI:', intentUri);
        console.log('   Intent URL:', intentData.intentUrl);
        console.log('   UPI Apps:', Object.keys(upiApps));
        console.log('   Countdown:', countdownSeconds, 'seconds');
        
        // Generate checkout page using template with PayU Intent API data (REQUIRED)
        const html = generatePayUCheckoutHTML(transaction, intentData, upiApps, gpayIntent, countdownSeconds);
        
        return res.send(html);

    } catch (error) {
        console.error('❌ PayU Checkout Page Error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Error</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #d32f2f; }
                </style>
            </head>
            <body>
                <h1 class="error">Payment Error</h1>
                <p>An error occurred while processing your payment request.</p>
                <p>${error.message}</p>
            </body>
            </html>
        `);
    }
};

