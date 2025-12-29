const crypto = require('crypto');
const axios = require('axios');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');

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
const PAYU_S2S_API_URL = `${PAYU_BASE_URL}/merchant/postservice?form=2`; // S2S API endpoint

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
        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const referenceId = `REF_${Date.now()}`;

        // Get merchant's configured URLs or use provided ones
        const merchant = await User.findById(merchantId);
        const finalCallbackUrl = callback_url ||
            merchant?.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        // PayU callback URL - points to our callback handler
        const payuCallbackUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/payu/callback?transaction_id=${transactionId}`;

        // Prepare PayU payment parameters for S2S UPI Intent
        // Important: Amount must be formatted correctly (2 decimal places)
        const amountFormatted = parseFloat(amount).toFixed(2);
        
        // Clean and prepare parameters - PayU is very strict about format
        const productInfo = (description || `Payment for ${merchantName}`).trim().substring(0, 100);
        const firstName = (customer_name.split(' ')[0] || customer_name).trim().substring(0, 60);
        const email = customer_email.trim();

        // Get client IP and user agent from request
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        // Prepare S2S UPI Intent parameters as per PayU documentation
        // Reference: https://docs.payu.in/docs/upi-intent-server-to-server
        const s2sParams = {
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
            txn_s2s_flow: '4', // Required for S2S UPI Intent
            s2s_client_ip: clientIp,
            s2s_device_info: userAgent.substring(0, 255), // Max 255 chars
            upiAppName: 'genericintent' // Will be selected by user on checkout page
        };

        // Generate S2S hash (includes additional S2S fields)
        const hashParams = {
            txnid: s2sParams.txnid,
            amount: s2sParams.amount,
            productinfo: s2sParams.productinfo,
            firstname: s2sParams.firstname,
            email: s2sParams.email,
            txn_s2s_flow: s2sParams.txn_s2s_flow,
            s2s_client_ip: s2sParams.s2s_client_ip,
            s2s_device_info: s2sParams.s2s_device_info,
            upiAppName: s2sParams.upiAppName
        };
        
        const hash = generatePayUS2SHash(hashParams);
        s2sParams.hash = hash;

        // Call PayU S2S API to initiate UPI Intent payment
        let s2sResponse;
        try {
            const formData = new URLSearchParams();
            Object.keys(s2sParams).forEach(key => {
                if (s2sParams[key] !== undefined && s2sParams[key] !== null) {
                    formData.append(key, String(s2sParams[key]));
                }
            });

            const apiResponse = await axios.post(PAYU_S2S_API_URL, formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            // Parse response - PayU S2S returns form-encoded or JSON
            let responseData = apiResponse.data;
            if (typeof responseData === 'string') {
                // Try to parse as JSON first
                try {
                    responseData = JSON.parse(responseData);
                } catch (e) {
                    // If not JSON, parse as form-encoded
                    const params = new URLSearchParams(responseData);
                    responseData = {};
                    for (const [key, value] of params.entries()) {
                        responseData[key] = value;
                    }
                }
            }

            s2sResponse = responseData;

            // Check for errors in response
            if (responseData.status === 'failure' || responseData.status === 'error' || responseData.error || responseData.errorCode) {
                const errorMsg = responseData.error || responseData.message || responseData.errorMessage || 'PayU S2S API returned an error';
                throw new Error(errorMsg);
            }

        } catch (apiError) {
            console.error('❌ PayU S2S API Error:', apiError.response?.data || apiError.message);
            console.error('❌ Full error:', JSON.stringify(apiError.response?.data || apiError.message, null, 2));
            
            // Even if S2S fails, create transaction and show custom checkout
            // We'll use a generic approach for UPI deep links
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
                description: description || `Payment for ${merchantName}`,
                status: 'created',
                paymentGateway: 'payu',
                payuOrderId: orderId,
                payuReferenceId: referenceId,
                callbackUrl: finalCallbackUrl,
                successUrl: success_url,
                failureUrl: failure_url,
                // Store fallback UPI Intent data (will use orderId as reference)
                payuIntentData: {
                    merchantVPA: null, // Will be set by PayU when user selects
                    merchantName: merchantName,
                    referenceId: orderId, // Use orderId as fallback reference
                    useFormBased: true // Flag to use form-based fallback
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await transaction.save();

            const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
            const checkoutPageUrl = `${baseUrl}/api/payu/checkout/${transactionId}`;

            // Even if S2S fails, return checkout page URL
            // The checkout page will handle form-based payment
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
                // UPI deep links not available (S2S failed)
                upi_deep_link: null,
                phonepe_deep_link: null,
                gpay_deep_link: null,
                gpay_intent: null,
                paytm_deep_link: null,
                bhim_deep_link: null,
                cred_deep_link: null,
                amazonpay_deep_link: null,
                note: 'S2S API call failed, using form-based payment with custom checkout',
                message: 'Payment link created successfully. Share this URL with customer.'
            });
            return;
        }

        // Extract IntentURIData from response
        // PayU returns: merchantVPA, merchantName, referenceId, IntentURIData
        const merchantVPA = s2sResponse.merchantVPA || s2sResponse.merchant_vpa || s2sResponse.vpa || s2sResponse.merchantVpa;
        const merchantVpaName = s2sResponse.merchantName || s2sResponse.merchant_name || merchantName;
        const payuReferenceId = s2sResponse.referenceId || s2sResponse.reference_id || referenceId;
        const intentURIData = s2sResponse.IntentURIData || s2sResponse.intent_uri_data || s2sResponse.intentUriData || s2sResponse.intentURIData;

        // Generate UPI deep links that directly open UPI apps
        const upiAmountFormatted = parseFloat(amount).toFixed(2);
        const upiParams = {
            pa: merchantVPA,
            pn: merchantVpaName,
            tr: payuReferenceId,
            am: upiAmountFormatted,
            cu: 'INR'
        };
        
        // Build query string for UPI deep link
        const upiQuery = Object.keys(upiParams)
            .map(key => `${key}=${encodeURIComponent(upiParams[key])}`)
            .join('&');
        
        // Generate UPI deep links for different apps
        const upiDeepLinks = {
            generic: `upi://pay?${upiQuery}`,
            phonepe: `phonepe://pay?${upiQuery}`,
            googlepay: `tez://pay?${upiQuery}`,
            gpay_intent: `intent://pay?${upiQuery}#Intent;package=com.google.android.apps.nbu.paisa.user;scheme=upi;end`,
            paytm: `paytmmp://pay?${upiQuery}`,
            bhim: `bhim://pay?${upiQuery}`,
            cred: `credpay://pay?${upiQuery}`,
            amazonpay: `amazonpay://pay?${upiQuery}`
        };

        // Save transaction to database
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
            description: description || `Payment for ${merchantName}`,
            status: 'created',
            paymentGateway: 'payu',
            payuOrderId: orderId,
            payuReferenceId: payuReferenceId,
            callbackUrl: finalCallbackUrl,
            successUrl: success_url,
            failureUrl: failure_url,
            // Store UPI Intent data
            payuIntentData: {
                merchantVPA: merchantVPA,
                merchantName: merchantVpaName,
                referenceId: payuReferenceId,
                intentURIData: intentURIData
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await transaction.save();

        // Create checkout page URL with UPI Intent data
        const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
        const checkoutPageUrl = `${baseUrl}/api/payu/checkout/${transactionId}`;

        // Return response with UPI deep links (similar to Razorpay/PhonePe)
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
            reference_id: payuReferenceId,
            callback_url: finalCallbackUrl,
            // UPI Deep Links - directly open UPI apps
            upi_deep_link: upiDeepLinks.generic,
            phonepe_deep_link: upiDeepLinks.phonepe,
            gpay_deep_link: upiDeepLinks.googlepay,
            gpay_intent: upiDeepLinks.gpay_intent,
            paytm_deep_link: upiDeepLinks.paytm,
            bhim_deep_link: upiDeepLinks.bhim,
            cred_deep_link: upiDeepLinks.cred,
            amazonpay_deep_link: upiDeepLinks.amazonpay,
            // UPI Intent data for reference
            upi_intent: {
                merchant_vpa: merchantVPA,
                merchant_name: merchantVpaName,
                reference_id: payuReferenceId,
                amount: upiAmountFormatted
            },
            message: 'Payment link created successfully. Use UPI deep links to directly open UPI apps.'
        });

    } catch (error) {
        console.error('❌ Create PayU Payment Link Error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            error: error.response?.data || error.error,
            statusCode: error.response?.status || error.statusCode,
            stack: error.stack
        });

        res.status(error.response?.status || error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to create payment link',
            details: error.response?.data || { message: error.message }
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

// ============ PAYU CHECKOUT PAGE ============
/**
 * PayU Checkout Page - Auto-submits form to PayU
 * PayU requires POST form submission, not GET with query parameters
 */
exports.getPayuCheckoutPage = async (req, res) => {
    try {
        const { transactionId } = req.params;

        // Find transaction

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

        // Check if we have UPI Intent data from S2S
        const intentData = transaction.payuIntentData;
        
        // Always show custom checkout page - either with S2S data or form-based
        if (intentData && intentData.referenceId) {
            // If we have merchantVPA from S2S, use it; otherwise use form-based approach
            const hasMerchantVPA = intentData.merchantVPA && !intentData.useFormBased;
            
            if (hasMerchantVPA) {
            // S2S UPI Intent flow - show UPI app selection with direct deep links
            const merchantVPA = intentData.merchantVPA;
            const merchantName = intentData.merchantName || transaction.merchantName;
            const referenceId = intentData.referenceId;
            const amount = transaction.amount.toFixed(2);
            
            // Build UPI deep link URL as per NPCI guidelines
            // Format: upi://pay?pa=merchantVPA&pn=merchantName&tr=referenceId&am=amount
            const upiParams = {
                pa: merchantVPA,
                pn: merchantName,
                tr: referenceId,
                am: amount,
                cu: 'INR'
            };
            
            // Build query string for UPI deep link
            const upiQuery = Object.keys(upiParams)
                .map(key => `${key}=${encodeURIComponent(upiParams[key])}`)
                .join('&');
            
            const upiDeepLink = `upi://pay?${upiQuery}`;
            
            // UPI App specific deep links - these directly open the respective UPI apps
            const upiApps = {
                phonepe: `phonepe://pay?${upiQuery}`,
                googlepay: `tez://pay?${upiQuery}`,
                paytm: `paytmmp://pay?${upiQuery}`,
                bhim: `bhim://pay?${upiQuery}`,
                cred: `credpay://pay?${upiQuery}`,
                amazonpay: `amazonpay://pay?${upiQuery}`,
                whatsapp: `whatsapp://pay?${upiQuery}`,
                generic: upiDeepLink
            };
            
            // Android Intent URL for Google Pay (more reliable on Android)
            const gpayIntent = `intent://pay?${upiQuery}#Intent;package=com.google.android.apps.nbu.paisa.user;scheme=upi;end`;

            // Create custom checkout page with UPI app selection
            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pay with UPI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px 30px;
            text-align: center;
        }
        .amount {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
            margin: 20px 0;
        }
        .merchant {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .upi-apps {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 30px;
        }
        .upi-btn {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            text-decoration: none;
            color: #333;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        .upi-btn:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .upi-icon {
            font-size: 32px;
            margin-bottom: 5px;
        }
        .info {
            background: #e7f3ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: left;
            font-size: 14px;
            color: #555;
        }
        @media (max-width: 480px) {
            .upi-apps {
                grid-template-columns: 1fr;
            }
            .amount {
                font-size: 36px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 style="color: #333; margin-bottom: 10px;">Pay with UPI</h1>
        <div class="amount">₹${amount}</div>
        <div class="merchant">${escapeHtml(merchantName)}</div>
        <p style="color: #666; margin-bottom: 20px;">Choose your UPI app to pay</p>
        
        <div class="upi-apps">
            <a href="${upiApps.phonepe}" class="upi-btn" onclick="openUPIApp('phonepe', '${upiApps.phonepe}'); return false;">
                <div class="upi-icon">📱</div>
                <span>PhonePe</span>
            </a>
            <a href="${gpayIntent}" class="upi-btn" onclick="openUPIApp('googlepay', '${gpayIntent}', '${upiApps.googlepay}'); return false;">
                <div class="upi-icon">💳</div>
                <span>Google Pay</span>
            </a>
            <a href="${upiApps.paytm}" class="upi-btn" onclick="openUPIApp('paytm', '${upiApps.paytm}'); return false;">
                <div class="upi-icon">💵</div>
                <span>Paytm</span>
            </a>
            <a href="${upiApps.bhim}" class="upi-btn" onclick="openUPIApp('bhim', '${upiApps.bhim}'); return false;">
                <div class="upi-icon">🏦</div>
                <span>BHIM</span>
            </a>
            <a href="${upiApps.cred}" class="upi-btn" onclick="openUPIApp('cred', '${upiApps.cred}'); return false;">
                <div class="upi-icon">💎</div>
                <span>CRED</span>
            </a>
            <a href="${upiApps.generic}" class="upi-btn" onclick="openUPIApp('generic', '${upiApps.generic}'); return false;">
                <div class="upi-icon">🔗</div>
                <span>Any UPI App</span>
            </a>
        </div>
        
        <div class="info">
            <strong>💡 How to pay:</strong><br>
            1. Click on your preferred UPI app button<br>
            2. Your UPI app will open directly<br>
            3. Complete the payment in the app<br>
            4. You'll be redirected automatically after payment
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px; text-align: left; font-size: 12px;">
            <strong>📋 UPI Intent Link:</strong>
            <div style="word-break: break-all; margin-top: 5px; font-family: monospace; color: #666;">
                ${upiDeepLink}
            </div>
        </div>
    </div>
    
    <script>
        // Function to open UPI app with fallback
        function openUPIApp(appName, primaryUrl, fallbackUrl) {
            console.log('Opening UPI app:', appName);
            
            // Try to open the primary URL
            try {
                // For Android devices, try intent URL first if available
                if (primaryUrl && primaryUrl.startsWith('intent://')) {
                    window.location.href = primaryUrl;
                    return;
                }
                
                // For other URLs, try direct navigation
                if (primaryUrl) {
                    window.location.href = primaryUrl;
                    
                    // Fallback after 2 seconds if app doesn't open
                    setTimeout(function() {
                        if (fallbackUrl && fallbackUrl !== primaryUrl) {
                            console.log('Trying fallback URL for', appName);
                            window.location.href = fallbackUrl;
                        } else {
                            // Try generic UPI intent
                            window.location.href = '${upiApps.generic}';
                        }
                    }, 2000);
                    return;
                }
            } catch (e) {
                console.error('Error opening UPI app:', e);
            }
            
            // Final fallback to generic UPI intent
            if (fallbackUrl) {
                window.location.href = fallbackUrl;
            } else {
                window.location.href = '${upiApps.generic}';
            }
        }
        
        // Auto-detect mobile and show appropriate message
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) {
            console.log('Desktop detected - UPI apps may not open directly');
        }
    </script>
</body>
</html>`;

            return res.send(html);
            } else {
                // S2S failed but we still show custom checkout with form-based payment
                // Show UPI app selection that will submit form to PayU
                const amount = transaction.amount.toFixed(2);
                const merchantName = transaction.merchantName;
                
                // Build form parameters
                const amountFormatted = transaction.amount.toFixed(2);
                const productInfo = (transaction.description || `Payment for ${merchantName}`).trim().substring(0, 100);
                const firstName = (transaction.customerName.split(' ')[0] || transaction.customerName).trim().substring(0, 60);
                const email = transaction.customerEmail.trim();
                
                const payuParams = {
                    key: PAYU_KEY.trim(),
                    txnid: transaction.payuOrderId || transaction.orderId,
                    amount: amountFormatted,
                    productinfo: productInfo,
                    firstname: firstName,
                    email: email,
                    phone: transaction.customerPhone.trim(),
                    surl: (transaction.successUrl || transaction.callbackUrl || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`).trim(),
                    furl: (transaction.failureUrl || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed`).trim(),
                    curl: `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/payu/callback?transaction_id=${transactionId}`.trim(),
                    service_provider: 'payu_paisa',
                    pg: 'UPI'
                };
                
                const hashParams = {
                    txnid: payuParams.txnid,
                    amount: payuParams.amount,
                    productinfo: payuParams.productinfo,
                    firstname: payuParams.firstname,
                    email: payuParams.email
                };
                
                payuParams.hash = generatePayUHash(hashParams);
                
                // Build hidden form
                const formInputs = Object.keys(payuParams).map(key => {
                    const value = payuParams[key] || '';
                    return `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" id="form_${key}" />`;
                }).join('\n        ');

                // Show custom checkout with form submission option
                const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pay with UPI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px 30px;
            text-align: center;
        }
        .amount {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
            margin: 20px 0;
        }
        .merchant {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .upi-apps {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 30px;
        }
        .upi-btn {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            text-decoration: none;
            color: #333;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }
        .upi-btn:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .upi-icon {
            font-size: 32px;
            margin-bottom: 5px;
        }
        .info {
            background: #e7f3ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: left;
            font-size: 14px;
            color: #555;
        }
        .intent-link {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 8px;
            margin: 10px 0;
            word-break: break-all;
            font-size: 12px;
            font-family: monospace;
            color: #333;
        }
        @media (max-width: 480px) {
            .upi-apps {
                grid-template-columns: 1fr;
            }
            .amount {
                font-size: 36px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 style="color: #333; margin-bottom: 10px;">Pay with UPI</h1>
        <div class="amount">₹${amount}</div>
        <div class="merchant">${escapeHtml(merchantName)}</div>
        <p style="color: #666; margin-bottom: 20px;">Choose your UPI app to pay</p>
        
        <form id="payuForm" method="POST" action="${PAYU_PAYMENT_URL}" style="display:none;">
            ${formInputs}
        </form>
        
        <div class="upi-apps">
            <a href="phonepe://pay" class="upi-btn" onclick="submitForm('phonepe'); return false;">
                <div class="upi-icon">📱</div>
                <span>PhonePe</span>
            </a>
            <a href="tez://pay" class="upi-btn" onclick="submitForm('googlepay'); return false;">
                <div class="upi-icon">💳</div>
                <span>Google Pay</span>
            </a>
            <a href="paytmmp://pay" class="upi-btn" onclick="submitForm('paytm'); return false;">
                <div class="upi-icon">💵</div>
                <span>Paytm</span>
            </a>
            <a href="bhim://pay" class="upi-btn" onclick="submitForm('bhim'); return false;">
                <div class="upi-icon">🏦</div>
                <span>BHIM</span>
            </a>
            <a href="credpay://pay" class="upi-btn" onclick="submitForm('cred'); return false;">
                <div class="upi-icon">💎</div>
                <span>CRED</span>
            </a>
            <a href="#" class="upi-btn" onclick="submitForm('any'); return false;">
                <div class="upi-icon">🔗</div>
                <span>Any UPI App</span>
            </a>
        </div>
        
        <div class="info">
            <strong>💡 How to pay:</strong><br>
            1. Click on your preferred UPI app<br>
            2. You'll be redirected to PayU payment page<br>
            3. Complete the payment there
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; text-align: left;">
            <strong>📋 Intent Link (for reference):</strong>
            <div class="intent-link">Form will submit to: ${PAYU_PAYMENT_URL}</div>
            <div class="intent-link">Transaction ID: ${transactionId}</div>
            <div class="intent-link">Order ID: ${transaction.payuOrderId || transaction.orderId}</div>
        </div>
    </div>
    
    <script>
        function submitForm(appName) {
            console.log('Submitting form for app:', appName);
            document.getElementById('payuForm').submit();
        }
    </script>
</body>
</html>`;

                return res.send(html);
            }
        } else {
            // No intent data at all - use form-based payment
            const amountFormatted = transaction.amount.toFixed(2);
            const productInfo = (transaction.description || `Payment for ${transaction.merchantName}`).trim().substring(0, 100);
            const firstName = (transaction.customerName.split(' ')[0] || transaction.customerName).trim().substring(0, 60);
            const email = transaction.customerEmail.trim();
            
            const payuParams = {
                key: PAYU_KEY.trim(),
                txnid: transaction.payuOrderId || transaction.orderId,
                amount: amountFormatted,
                productinfo: productInfo,
                firstname: firstName,
                email: email,
                phone: transaction.customerPhone.trim(),
                surl: (transaction.successUrl || transaction.callbackUrl || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`).trim(),
                furl: (transaction.failureUrl || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed`).trim(),
                curl: `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/payu/callback?transaction_id=${transactionId}`.trim(),
                service_provider: 'payu_paisa',
                pg: 'UPI'
            };
            
            const hashParams = {
                txnid: payuParams.txnid,
                amount: payuParams.amount,
                productinfo: payuParams.productinfo,
                firstname: payuParams.firstname,
                email: payuParams.email
            };
            
            payuParams.hash = generatePayUHash(hashParams);
            
            const formInputs = Object.keys(payuParams).map(key => {
                const value = payuParams[key] || '';
                return `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`;
            }).join('\n        ');

            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to PayU...</title>
</head>
<body>
    <form id="payuForm" method="POST" action="${PAYU_PAYMENT_URL}">
        ${formInputs}
    </form>
    <script>
        (function() {
            var form = document.getElementById('payuForm');
            if (form) {
                form.submit();
            }
        })();
    </script>
    <noscript>
        <meta http-equiv="refresh" content="0">
        <p>Please enable JavaScript to continue.</p>
    </noscript>
</body>
</html>`;

            return res.send(html);
        }

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

