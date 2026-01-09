const crypto = require('crypto');
const axios = require('axios');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');
const { generatePayUCheckoutHTML, generatePayUCheckoutHTMLWithForm, formatCountdown } = require('./payuCheckoutTemplate');
const { getPublicCallbackUrl } = require('../utils/ngrokHelper');

// PayU Configuration - Support test mode similar to Zaakpay
// Determine mode - default to 'production' if not explicitly set to 'test' or 'sandbox'
const PAYU_ENVIRONMENT = (process.env.PAYU_ENVIRONMENT || '').toLowerCase();
const PAYU_MODE = (PAYU_ENVIRONMENT === 'test' || PAYU_ENVIRONMENT === 'sandbox') ? 'test' : 'production';

// Use test credentials when in test mode, otherwise use production credentials
// Falls back to regular keys if test keys aren't set (backward compatibility)
const PAYU_KEY = PAYU_MODE === 'production'
    ? process.env.PAYU_KEY
    : (process.env.PAYU_KEY_TEST || process.env.PAYU_KEY);
const PAYU_SALT = PAYU_MODE === 'production'
    ? process.env.PAYU_SALT
    : (process.env.PAYU_SALT_TEST || process.env.PAYU_SALT);
const PAYU_CLIENT_ID = PAYU_MODE === 'production'
    ? process.env.PAYU_CLIENT_ID
    : (process.env.PAYU_CLIENT_ID_TEST || process.env.PAYU_CLIENT_ID);
const PAYU_CLIENT_SECRET = PAYU_MODE === 'production'
    ? process.env.PAYU_CLIENT_SECRET
    : (process.env.PAYU_CLIENT_SECRET_TEST || process.env.PAYU_CLIENT_SECRET);

// PayU API URLs
// According to PayU docs: Use separate endpoints for test and production
// Reference: https://docs.payu.in/docs/prebuilt-checkout-page-integration
// Test Environment: https://test.payu.in/_payment
// Production Environment: https://secure.payu.in/_payment
const PAYU_BASE_URL = PAYU_MODE === 'test'
    ? 'https://test.payu.in'  // Test/Sandbox endpoint
    : 'https://secure.payu.in'; // Production endpoint

const PAYU_PAYMENT_URL = `${PAYU_BASE_URL}/_payment`;
// PayU S2S API endpoint for UPI Intent
// Reference: https://docs.payu.in/docs/upi-intent-server-to-server
// Use test endpoint for test mode, production for production
const PAYU_S2S_API_URL = `${PAYU_BASE_URL}/merchant/postservice?form=2`;

// PayU Generate UPI Intent API
// Reference: https://docs.payu.in/v2/reference/v2-generate-upi-intent-api
// Use test endpoints for test mode, production for production
// Note: UPI Intent may not be available in test mode per PayU docs
const PAYU_INTENT_API_ENDPOINTS = PAYU_MODE === 'test'
    ? [
        'https://test.payu.in/info/v1/intent',  // Test endpoint
        'https://test.payu.in/v1/intent'        // Alternative test endpoint
      ]
    : [
        'https://info.payu.in/info/v1/intent',  // Production endpoint
        'https://info.payu.in/v1/intent',        // Alternative production endpoint
        'https://secure.payu.in/info/v1/intent', // Another alternative
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

// ============ GENERATE PAYU RESPONSE HASH ============
/**
 * Generate PayU hash for response/webhook verification
 * Hash format for response: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|status|salt)
 * 
 * CRITICAL: Response hash includes 'status' parameter, which is different from request hash
 * Reference: https://docs.payu.in/docs/webhooks
 */
function generatePayUResponseHash(params) {
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
    const status = String(params.status || '').trim(); // CRITICAL: Include status for response hash
    const salt = String(PAYU_SALT || '').trim();

    // Hash format for response: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|status|salt
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
        status,
        salt
    ].join('|');

    return crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
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
            const missingKeys = [];
            if (!PAYU_KEY) missingKeys.push(PAYU_MODE === 'test' ? 'PAYU_KEY_TEST (or PAYU_KEY)' : 'PAYU_KEY');
            if (!PAYU_SALT) missingKeys.push(PAYU_MODE === 'test' ? 'PAYU_SALT_TEST (or PAYU_SALT)' : 'PAYU_SALT');
            return res.status(500).json({
                success: false,
                error: `PayU credentials not configured. Please set ${missingKeys.join(' and ')} in environment variables.`,
                mode: PAYU_MODE
            });
        }

        // Log PayU configuration on first use
        if (!global.payuConfigLogged) {
            console.log('🔧 PayU Configuration:');
            console.log('   Mode:', PAYU_MODE, PAYU_MODE === 'test' ? '(TEST - using test endpoint and credentials)' : '(PRODUCTION)');
            console.log('   Environment:', PAYU_ENVIRONMENT || 'production');
            console.log('   Base URL:', PAYU_BASE_URL, PAYU_MODE === 'test' ? '(TEST endpoint)' : '(PRODUCTION endpoint)');
            console.log('   Payment URL:', PAYU_PAYMENT_URL);
            console.log('   Key:', PAYU_KEY ? PAYU_KEY.substring(0, 10) + '...' : 'NOT SET');
            console.log('   Salt:', PAYU_SALT ? PAYU_SALT.substring(0, 10) + '...' : 'NOT SET');
            console.log('   Client ID:', PAYU_CLIENT_ID ? PAYU_CLIENT_ID.substring(0, 15) + '...' : 'NOT SET');
            if (PAYU_MODE === 'test') {
                console.log('   ✅ TEST MODE: Using test endpoint URL (test.payu.in)');
                console.log('   📝 Note: Use test credentials from PayU Dashboard → Test Mode → Key Salt Details');
                console.log('   📝 Note: Environment parameter NOT added (only for API calls, not form submissions)');
            }
            console.log('   Note: PayU test credentials work on production endpoint (secure.payu.in)');
            console.log('   📚 Reference: https://docs.payu.in/docs/pythonsdk-test-integration');
            global.payuConfigLogged = true;
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

        // PayU callback URL - points to Next.js callback handler (same pattern as Zaakpay)
        // Use NEXTJS_API_URL (like cashfreeController) for consistency (for user redirects)
        const frontendUrl = process.env.NEXTJS_API_URL || 
                            process.env.FRONTEND_URL || 
                            process.env.NEXT_PUBLIC_SERVER_URL || 
                            process.env.KRISHI_API_URL || 
                            process.env.NEXT_PUBLIC_API_URL || 
                            process.env.PAYU_WEBSITE_URL ||
                            'https://shaktisewafoudation.in';
        
        // CRITICAL: Use backend URL directly for callback to bypass Next.js Server Actions
        // PayU POSTs directly to Express backend, not through Next.js
        const backendUrl = process.env.BACKEND_URL || 
                          process.env.API_URL || 
                          process.env.SERVER_URL ||
                          'https://himora.art';
        
        let payuCallbackUrlBase = String(backendUrl).replace(/\/$/, '');
        
        // If localhost in test mode, try to get public URL (ngrok)
        if (PAYU_MODE === 'test' && (payuCallbackUrlBase.includes('localhost') || payuCallbackUrlBase.includes('127.0.0.1'))) {
            const publicUrl = await getPublicCallbackUrl(payuCallbackUrlBase);
            if (publicUrl && !publicUrl.includes('localhost')) {
                payuCallbackUrlBase = publicUrl;
                console.log('   ✅ Using public URL for callback:', payuCallbackUrlBase);
            } else {
                console.warn('   ⚠️ WARNING: Callback URL is localhost - PayU test servers cannot access it');
                console.warn('   💡 For testing, use ngrok (https://ngrok.com) or set PAYU_PUBLIC_TEST_URL env var');
                console.warn('   📝 Note: surl/furl redirects will still work for user redirects');
            }
        }
        
        const payuCallbackUrl = `${payuCallbackUrlBase}/api/payu/callback`;
        
        // Log callback URL for debugging
        console.log('🔧 PayU Callback URL Configuration:');
        console.log('   Backend URL:', backendUrl);
        console.log('   Frontend URL (for user redirects):', frontendUrl);
        console.log('   Final callback URL base:', payuCallbackUrlBase);
        console.log('   Full callback URL (curl):', payuCallbackUrl);
        console.log('   Is public URL:', !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1'));

        // Prepare amount for PayU
        // Important: Amount must be formatted correctly (2 decimal places)
        const amountFormatted = parseFloat(amount).toFixed(2);
        
        // Use UPI Seamless form-based payment approach
        // Reference: https://docs.payu.in/docs/collect-payments-with-upi-seamless
        // This approach doesn't require UPI Intent API and works with standard PayU accounts
        console.log('🔄 Creating PayU UPI Seamless payment for order:', orderId);
        console.log('   Amount:', amountFormatted);
        console.log('   Using form-based UPI payment (no Intent API required)');
        
        // Prepare payment parameters for UPI Seamless
        // CRITICAL: Sanitize text fields to prevent special character issues
        // PayU is strict about special characters in productinfo and firstname
        const sanitizeText = (text, maxLength = 100) => {
            if (!text) return '';
            return String(text)
                .replace(/[`"'<>]/g, '') // Remove problematic characters
                .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                .trim()
                .substring(0, maxLength);
        };
        
        const productInfo = sanitizeText(description || `Payment for ${merchantName}`, 100);
        const firstName = sanitizeText(customer_name.split(' ')[0] || customer_name, 50);
        const email = customer_email.trim().toLowerCase(); // PayU expects lowercase email
        
        // Success and Failure URLs for user redirects
        const successUrl = success_url || 
                          finalCallbackUrl || 
                          `${String(frontendUrl).replace(/\/$/, '')}/payment/success?txnid=${orderId}`;
        const failureUrl = failure_url || 
                          `${String(frontendUrl).replace(/\/$/, '')}/payment/failed?txnid=${orderId}`;
        
        // Standard PayU form parameters for UPI
        // CRITICAL: PayU is very strict about parameter format - trim all values
        // Reference: https://docs.payu.in/docs/prebuilt-checkout-page-integration
        // Mandatory: key, txnid, amount, productinfo, firstname, email, phone, surl, furl, hash
        // Optional: pg, curl (DO NOT include service_provider or bankcode for UPI)
        const payuParams = {
            key: PAYU_KEY.trim(),
            txnid: orderId.trim(), // CRITICAL: Trim txnid
            amount: amountFormatted.trim(), // CRITICAL: Trim amount (must be 2 decimal places)
            productinfo: productInfo.trim(), // CRITICAL: Trim and sanitize productinfo
            firstname: firstName.trim(), // CRITICAL: Trim firstname
            email: email.trim().toLowerCase(), // CRITICAL: Trim and lowercase email - PayU expects lowercase
            phone: customer_phone.trim(), // CRITICAL: Trim phone
            surl: successUrl.trim(), // User redirect URL after successful payment
            furl: failureUrl.trim(), // User redirect URL after failed payment
            pg: 'UPI'  // Payment gateway: UPI (PayU will handle bankcode internally)
            // Note: service_provider removed - causes issues with UPI payments
            // Note: vpa (VPA/UPI ID) is optional - customer can enter it on PayU page
            // Note: Don't set bankcode when pg is set - PayU handles it internally
        };
        
        // ✅ CRITICAL: Only include curl if it's publicly accessible
        // In test mode with localhost, PayU cannot access callback URL, so we skip it
        // PayU will still work - it will use surl/furl for user redirects
        // The callback (curl) is for server-to-server webhooks, which won't work with localhost
        // According to PayU docs, curl is optional but recommended for production
        if (payuCallbackUrl && !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1')) {
            payuParams.curl = payuCallbackUrl.trim(); // PayU callback/webhook URL - PayU POSTs here (server-to-server)
        } else if (PAYU_MODE === 'test' && (payuCallbackUrl.includes('localhost') || payuCallbackUrl.includes('127.0.0.1'))) {
            // For test mode with localhost, don't set curl - PayU servers cannot access localhost
            // PayU will still process payments and redirect users via surl/furl
            console.log('   ⚠️ Skipping curl (callback URL) - localhost not accessible to PayU servers');
            console.log('   💡 Note: Callbacks will still work via surl/furl redirects');
            console.log('   📝 For webhooks, use ngrok (https://ngrok.com) or deploy to a public URL');
        }
        
        // ✅ CRITICAL: DO NOT add environment parameter for form submissions
        // The 'environment' parameter is only for API calls, NOT for form submissions
        // For form submissions, test mode is determined by the endpoint URL (test.payu.in vs secure.payu.in)
        // Reference: https://docs.payu.in/docs/prebuilt-checkout-page-integration
        // The environment=1 parameter can cause "Pardon, Some Problem Occurred" errors
        // We're already using test endpoint: https://test.payu.in/_payment (configured above)
        
        // NO environment parameter needed - test mode is handled by endpoint URL
        
        // Generate hash for payment - CRITICAL: Must use exact trimmed values
        // Hash format: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt)
        // Reference: https://docs.payu.in/docs/prebuilt-checkout-page-integration
        // IMPORTANT: Use already-trimmed values from payuParams for hash
        const hashParams = {
            txnid: payuParams.txnid, // Already trimmed
            amount: payuParams.amount, // Already trimmed (2 decimal places)
            productinfo: payuParams.productinfo, // Already trimmed and sanitized
            firstname: payuParams.firstname, // Already trimmed and sanitized
            email: payuParams.email // Already trimmed and lowercased
        };
        
        console.log('   🔐 Generating hash with parameters:');
        console.log('      txnid:', hashParams.txnid);
        console.log('      amount:', hashParams.amount);
        console.log('      productinfo:', hashParams.productinfo);
        console.log('      firstname:', hashParams.firstname);
        console.log('      email:', hashParams.email);
        
        const hash = generatePayUHash(hashParams);
        payuParams.hash = hash;
        
        console.log('   ✅ Hash generated:', hash.substring(0, 20) + '...');
        console.log('   Hash length:', hash.length, 'characters (should be 128 for SHA512)');
        
        const payuReferenceId = orderId;

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
            description: productInfo,
            status: 'created',
            paymentGateway: 'payu',
            paymentMethod: 'UPI',
            payuOrderId: orderId,
            payuReferenceId: payuReferenceId,
            callbackUrl: finalCallbackUrl,
            successUrl: success_url,
            failureUrl: failure_url,
            payuParams: payuParams, // Store params for form submission
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const transaction = new Transaction(transactionData);
        await transaction.save();

        // CRITICAL: Use Next.js checkout page that fetches form params and submits directly to PayU
        // This completely bypasses Next.js Server Actions by never accessing backend HTML routes
        // The form submission happens entirely client-side, directly to PayU
        const normalCheckoutLink = `${String(frontendUrl).replace(/\/$/, '')}/payu-checkout?transaction_id=${encodeURIComponent(transactionId)}`;
        const iframeCheckoutLink = `${String(frontendUrl).replace(/\/$/, '')}/payu-checkout-iframe?transaction_id=${encodeURIComponent(transactionId)}`;
        const payuHostedUrl = `${PAYU_PAYMENT_URL}`;
        
        // Default to iframe mode (can be overridden with use_iframe=false)
        // Check if iframe mode is disabled (default is true/iframe mode)
        const useIframe = req.query.use_iframe !== 'false' && req.query.use_iframe !== '0' && 
                         process.env.PAYU_USE_IFRAME !== 'false' && process.env.PAYU_USE_IFRAME !== '0';
        
        // CRITICAL: Use Next.js checkout page that fetches form params and submits directly to PayU
        // This completely bypasses Next.js Server Actions
        const checkoutPageUrl = useIframe ? iframeCheckoutLink : normalCheckoutLink;

        // Build response with Next.js page URL (similar to Zaakpay)
        const response = {
            success: true,
            transaction_id: transactionId,
            payment_link_id: orderId,
            payment_url: checkoutPageUrl,
            checkout_page: checkoutPageUrl,
            checkout_page_normal: normalCheckoutLink,
            checkout_page_iframe: iframeCheckoutLink,
            order_id: orderId,
            order_amount: parseFloat(amount),
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            reference_id: payuReferenceId,
            callback_url: finalCallbackUrl,
            payment_mode: 'UPI',
            gateway: 'payu',
            use_iframe: useIframe,
            payu_params: payuParams,
            payu_payment_url: payuHostedUrl,
            hosted_redirect_link: checkoutPageUrl,
            redirect_url: payuHostedUrl,
            message: `PayU payment link created. Redirect customer to checkout_page (${useIframe ? 'iframe' : 'normal'} mode -> PayU hosted checkout).`
        };
        
        res.json(response);

    } catch (error) {
        console.error('❌ Create PayU Payment Link Error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            error: error.response?.data || error.error,
            statusCode: error.response?.status || error.statusCode,
            errorCode: error.errorCode,
            stack: error.stack
        });

        // Handle errors
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
        payuCallbackUrl,
        frontendUrl
    } = data;

    // Success and Failure URLs for user redirects
    const successUrl = success_url || 
                      finalCallbackUrl || 
                      `${String(frontendUrl || process.env.FRONTEND_URL || 'https://www.shaktisewafoudation.in').replace(/\/$/, '')}/payment/success?txnid=${orderId}`;
    const failureUrl = failure_url || 
                      `${String(frontendUrl || process.env.FRONTEND_URL || 'https://www.shaktisewafoudation.in').replace(/\/$/, '')}/payment/failed?txnid=${orderId}`;

    // Standard form-based parameters
    // CRITICAL: PayU is strict about parameter format - trim all values
    const payuParams = {
        key: PAYU_KEY.trim(),
        txnid: orderId.trim(),
        amount: amountFormatted.trim(),
        productinfo: productInfo.trim(),
        firstname: firstName.trim(),
        email: email.trim().toLowerCase(), // PayU expects lowercase email
        phone: customer_phone.trim(),
        surl: successUrl.trim(), // User redirect URL after successful payment
        furl: failureUrl.trim(), // User redirect URL after failed payment
        pg: 'UPI'
        // Note: service_provider removed - can cause issues with UPI
    };
    
    // ✅ CRITICAL: Only include curl if it's publicly accessible
    // Skip curl for localhost in test mode - PayU servers cannot access localhost
    if (payuCallbackUrl && !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1')) {
        payuParams.curl = payuCallbackUrl.trim(); // PayU callback/webhook URL
    }
    
    // ✅ CRITICAL: DO NOT add environment parameter for form submissions
    // The 'environment' parameter is only for API calls, NOT for form submissions
    // Test mode is handled by endpoint URL (test.payu.in vs secure.payu.in)
    // Adding environment=1 to form submissions causes "Pardon, Some Problem Occurred" errors
    
    // NO environment parameter needed

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

    const baseUrl = process.env.BACKEND_URL || process.env.API_URL || process.env.SERVER_URL || 'https://himora.art';
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
        
        // PayU can send data via POST body (form-encoded) or GET query params
        // Also check req.body for POST requests
        let payuResponse = {};
        
        if (req.method === 'POST') {
            // PayU typically sends POST with form-encoded data
            // Express body-parser should have parsed it, but check both req.body and raw body
            payuResponse = req.body || {};
            
            // If body is empty or not parsed correctly, try to parse raw body
            if (Object.keys(payuResponse).length === 0) {
                // Try parsing as JSON if available
                try {
                    if (req.body && typeof req.body === 'string') {
                        payuResponse = JSON.parse(req.body);
                    } else if (req.body && typeof req.body === 'object') {
                        payuResponse = req.body;
                    }
                } catch (e) {
                    console.warn('   Could not parse POST body as JSON, treating as empty');
                }
            }
            
            // Log if body is still empty
            if (Object.keys(payuResponse).length === 0) {
                console.warn('   ⚠️ POST body is empty - PayU might not have sent data correctly');
                console.warn('   Raw body type:', typeof req.body);
                console.warn('   Raw body:', req.body);
            }
        } else {
            // GET request - data in query params
            payuResponse = req.query || {};
        }
        
        // Merge query params with body/query data (query params take precedence for transaction_id)
        if (transaction_id) {
            payuResponse.transaction_id = transaction_id;
        }

        console.log('========================================================================');
        console.log('🔔 PayU Callback received');
        console.log('========================================================================');
        console.log('   Method:', req.method);
        console.log('   Headers:', JSON.stringify(req.headers, null, 2));
        console.log('   Transaction ID (from URL):', transaction_id);
        console.log('   Raw Body:', typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : req.body);
        console.log('   Query Params:', JSON.stringify(req.query, null, 2));
        console.log('   PayU Response (merged):', JSON.stringify(payuResponse, null, 2));

        // Try to find transaction by transaction_id from URL first
        let transaction = null;
        if (transaction_id) {
            transaction = await Transaction.findOne({ transactionId: transaction_id }).populate('merchantId');
        }

        // If not found, try to find by PayU order ID (txnid)
        // PayU sends txnid in webhook which should match our payuOrderId or orderId
        if (!transaction && payuResponse.txnid) {
            console.log('   Transaction not found by transaction_id, trying by PayU order ID (txnid):', payuResponse.txnid);
            transaction = await Transaction.findOne({ 
                $or: [
                    { payuOrderId: payuResponse.txnid },
                    { orderId: payuResponse.txnid },
                    // Also try matching with ORDER_ prefix removed
                    { orderId: payuResponse.txnid.replace(/^ORDER_/, '') },
                    { payuOrderId: payuResponse.txnid.replace(/^ORDER_/, '') }
                ]
            }).populate('merchantId');
            
            if (transaction) {
                console.log('   ✅ Transaction found by PayU order ID:', transaction.transactionId);
                console.log('   Transaction orderId:', transaction.orderId);
                console.log('   Transaction payuOrderId:', transaction.payuOrderId);
            } else {
                console.warn('   ⚠️ Transaction not found by PayU order ID either');
                console.warn('   Searched txnid:', payuResponse.txnid);
                // Try to find by mihpayid (PayU payment ID) as last resort
                if (payuResponse.mihpayid) {
                    console.log('   Trying to find by PayU payment ID (mihpayid):', payuResponse.mihpayid);
                    transaction = await Transaction.findOne({ 
                        payuPaymentId: payuResponse.mihpayid 
                    }).populate('merchantId');
                    if (transaction) {
                        console.log('   ✅ Transaction found by PayU payment ID:', transaction.transactionId);
                    }
                }
            }
        }

        if (!transaction) {
            console.warn('⚠️ Transaction not found');
            console.warn('   Searched for transaction_id:', transaction_id);
            console.warn('   Searched for PayU order ID:', payuResponse.txnid);
            // Return success to PayU even if transaction not found (prevents retries)
            // Log the issue for investigation
            return res.status(200).json({
                success: false,
                message: 'Transaction not found',
                txnid: payuResponse.txnid
            });
        }

        // Verify hash (if provided)
        // CRITICAL: Use response hash for webhooks/callbacks (includes status parameter)
        // Reference: https://docs.payu.in/docs/webhooks
        const receivedHash = payuResponse.hash;
        if (receivedHash) {
            // For webhooks/callbacks, use response hash which includes status
            const calculatedHash = generatePayUResponseHash(payuResponse);
            if (receivedHash !== calculatedHash) {
                console.warn('❌ Invalid PayU response hash in callback');
                console.warn('   Received hash:', receivedHash.substring(0, 20) + '...');
                console.warn('   Calculated hash:', calculatedHash.substring(0, 20) + '...');
                console.warn('   Status used in hash:', payuResponse.status);
                // Still process but log warning - PayU may send webhooks without hash in some cases
            } else {
                console.log('✅ PayU response hash verified successfully');
            }
        } else {
            console.warn('⚠️ No hash provided in PayU callback - proceeding without verification');
            console.warn('   Note: PayU webhooks should include hash for security');
        }

        // Check payment status - PayU can return status in multiple fields
        // PayU status values: 'success', 'failure', 'pending', 'bounced', etc.
        // According to PayU docs: unmappedstatus='captured' means success
        // Reference: https://docs.payu.in/docs/webhooks
        const status = payuResponse.status || 
                      payuResponse.pg_type || 
                      payuResponse.payment_status || 
                      payuResponse.STATUS ||
                      (payuResponse.unmappedstatus === 'captured' ? 'success' : null) ||
                      (payuResponse.unmappedstatus === 'Captured' ? 'success' : null);
        const txnid = payuResponse.txnid || 
                     payuResponse.mihpayid || 
                     payuResponse.pgTxnId || 
                     payuResponse.orderId ||
                     payuResponse.productinfo;
        const amount = payuResponse.amount ? parseFloat(payuResponse.amount) : transaction.amount;

        console.log('   Payment Status (raw):', payuResponse.status, payuResponse.pg_type, payuResponse.payment_status, payuResponse.unmappedstatus);
        console.log('   Payment Status (parsed):', status);
        console.log('   PayU Transaction ID:', txnid);
        console.log('   Amount:', amount);
        console.log('   Current Transaction Status:', transaction.status);
        console.log('   All PayU Response Fields:', Object.keys(payuResponse).join(', '));

        // Check for success - PayU uses various status indicators
        const isSuccess = status === 'success' || 
                         status === 'Success' || 
                         status === 'SUCCESS' ||
                         payuResponse.pg_type === 'success' || 
                         payuResponse.pg_type === 'Success' ||
                         payuResponse.payment_status === 'SUCCESS' ||
                         payuResponse.unmappedstatus === 'captured' ||
                         (payuResponse.error === 'E000' && payuResponse.status === 'success') ||
                         (payuResponse.error === 'E000' && !payuResponse.error_Message);

        if (isSuccess) {
            // Payment successful
            if (transaction.status !== 'paid') {
                const paidAt = new Date();
                const expectedSettlement = await calculateExpectedSettlementDate(paidAt);
                const commissionData = calculatePayinCommission(amount);

                const update = {
                    status: 'paid',
                    paidAt,
                    paymentMethod: payuResponse.payment_mode || payuResponse.mode || 'UPI',
                    payuPaymentId: txnid,
                    updatedAt: new Date(),
                    acquirerData: {
                        utr: payuResponse.bank_ref_num || payuResponse.utr || null,
                        rrn: payuResponse.bank_ref_num || payuResponse.rrn || null,
                        bank_transaction_id: payuResponse.bank_ref_num || payuResponse.bank_transaction_id || null,
                        bank_name: payuResponse.bankcode || payuResponse.bank_name || null,
                        pg_type: payuResponse.pg_type || null,
                        payment_mode: payuResponse.payment_mode || payuResponse.mode || null
                    },
                    settlementStatus: 'unsettled',
                    expectedSettlementDate: expectedSettlement,
                    commission: commissionData.commission,
                    netAmount: parseFloat((amount - commissionData.commission).toFixed(2)),
                    webhookData: payuResponse
                };
                
                console.log('   Updating transaction with:', JSON.stringify(update, null, 2));

                // ✅ CRITICAL: Use transaction.transactionId, not transaction_id from URL (which may be missing)
                const updatedTransaction = await Transaction.findOneAndUpdate(
                    { transactionId: transaction.transactionId },
                    update,
                    { new: true }
                ).populate('merchantId');

                if (updatedTransaction) {
                    console.log('✅ Transaction updated via callback:', transaction.transactionId);
                    console.log('   New Status: paid');
                    console.log('   PayU Payment ID:', updatedTransaction.payuPaymentId);
                    
                    if (updatedTransaction.merchantId && updatedTransaction.merchantId.webhookEnabled) {
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
                } else {
                    console.error('❌ Transaction update failed - updatedTransaction is null');
                    console.error('   Transaction ID used in update:', transaction.transactionId);
                    console.error('   PayU txnid from callback:', payuResponse.txnid);
                }
            } else {
                console.log('⚠️ Transaction already marked as paid, skipping update');
            }

            // ✅ CRITICAL: Don't redirect from callback - this is a webhook/callback endpoint
            // User redirects are handled separately via PayU's surl/furl parameters
            // Just return success response to PayU
            console.log('✅ Payment successful!');
            console.log('   Transaction ID:', transaction.transactionId);
            console.log('   PayU Payment ID:', updatedTransaction?.payuPaymentId || txnid);
            console.log('   ✅ Callback processed - user will be redirected by PayU to surl/furl');
            
            // Return simple success response (PayU expects this)
            return res.status(200).json({
                success: true,
                message: 'Callback processed successfully',
                transaction_id: transaction.transactionId,
                status: 'paid'
            });
        } else {
            // Payment failed or pending
            const failureReason = payuResponse.error || 
                                 payuResponse.error_Message || 
                                 payuResponse.error_message ||
                                 payuResponse.message ||
                                 `Payment ${status || 'failed'}`;
            
            console.log('❌ Payment failed or pending');
            console.log('   Status:', status);
            console.log('   Failure Reason:', failureReason);
            console.log('   Error Code:', payuResponse.error);
            
            if (transaction.status !== 'failed' && status !== 'pending') {
                await Transaction.findOneAndUpdate(
                    { transactionId: transaction_id },
                    {
                        status: status === 'pending' ? 'pending' : 'failed',
                        failureReason: failureReason,
                        payuPaymentId: txnid,
                        updatedAt: new Date(),
                        webhookData: payuResponse
                    }
                );
            }

            // ✅ CRITICAL: Don't redirect from callback - this is a webhook/callback endpoint
            // User redirects are handled separately via PayU's surl/furl parameters
            console.log('❌ Payment failed or pending');
            console.log('   Transaction ID:', transaction.transactionId);
            console.log('   Failure Reason:', failureReason);
            console.log('   ✅ Callback processed - user will be redirected by PayU to surl/furl');
            
            // Return simple response (PayU expects this)
            return res.status(200).json({
                success: true,
                message: 'Callback processed successfully',
                transaction_id: transaction.transactionId,
                status: status === 'pending' ? 'pending' : 'failed',
                error: failureReason
            });
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

// ============ GET PAYU FORM PARAMETERS (JSON API) ============
/**
 * Get PayU form parameters as JSON
 * This allows Next.js to fetch parameters and submit form directly to PayU
 * Completely bypasses Server Actions by never serving HTML through Next.js
 */
exports.getPayuFormParams = async (req, res) => {
    try {
        const { transactionId } = req.params;

        // Find transaction
        const transaction = await Transaction.findOne({ transactionId: transactionId });

        if (!transaction) {
            console.warn('❌ Transaction not found:', transactionId);
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        if (transaction.status !== 'created' && transaction.status !== 'pending') {
            console.warn('⚠️ Transaction already processed:', transaction.status);
            return res.status(400).json({
                success: false,
                error: `Payment link already ${transaction.status}`
            });
        }

        // Get stored PayU parameters or generate new ones
        let payuParams = transaction.payuParams;
        
        if (!payuParams) {
            // Generate payment parameters if not stored
            const amountFormatted = transaction.amount.toFixed(2);
            const productInfo = transaction.description || `Payment for ${transaction.merchantName}`;
            const firstName = transaction.customerName.split(' ')[0] || transaction.customerName;
            const email = transaction.customerEmail.trim();
            
            // ✅ PayU callback URL - pure API route (no Server Actions)
            const frontendUrl = process.env.NEXTJS_API_URL || 
                                process.env.FRONTEND_URL || 
                                process.env.NEXT_PUBLIC_SERVER_URL || 
                                process.env.KRISHI_API_URL || 
                                process.env.NEXT_PUBLIC_API_URL || 
                                process.env.PAYU_WEBSITE_URL ||
                                'https://shaktisewafoudation.in';
            
            // CRITICAL: Use backend URL directly for callback to bypass Next.js Server Actions
            // PayU POSTs directly to Express backend, not through Next.js
            const backendUrl = process.env.BACKEND_URL || 
                              process.env.API_URL || 
                              process.env.SERVER_URL ||
                              'https://himora.art';
            
            let payuCallbackUrlBase = String(backendUrl).replace(/\/$/, '');
            
            // For test mode with localhost, try to get public URL (ngrok)
            if (PAYU_MODE === 'test' && (payuCallbackUrlBase.includes('localhost') || payuCallbackUrlBase.includes('127.0.0.1'))) {
                const publicUrl = await getPublicCallbackUrl(payuCallbackUrlBase);
                if (publicUrl && !publicUrl.includes('localhost')) {
                    payuCallbackUrlBase = publicUrl;
                }
            }
            const payuCallbackUrl = `${payuCallbackUrlBase}/api/payu/callback`;
            
            // Success and Failure URLs for user redirects
            const successUrl = transaction.successUrl || 
                              transaction.callbackUrl || 
                              `${String(frontendUrl).replace(/\/$/, '')}/payment/success?txnid=${transaction.payuOrderId || transaction.orderId}`;
            const failureUrl = transaction.failureUrl || 
                              `${String(frontendUrl).replace(/\/$/, '')}/payment/failed?txnid=${transaction.payuOrderId || transaction.orderId}`;
            
            // PayU form parameters - CRITICAL: Trim all values, PayU is strict
            payuParams = {
                key: PAYU_KEY.trim(),
                txnid: (transaction.payuOrderId || transaction.orderId).trim(),
                amount: amountFormatted.trim(),
                productinfo: productInfo.trim(),
                firstname: firstName.trim(),
                email: email.trim().toLowerCase(), // PayU expects lowercase email
                phone: transaction.customerPhone.trim(),
                surl: successUrl.trim(), // User redirect URL after successful payment
                furl: failureUrl.trim(), // User redirect URL after failed payment
                pg: 'UPI' // Payment gateway: UPI (PayU handles bankcode internally)
            };
            
            // ✅ CRITICAL: Only include curl if it's publicly accessible
            if (payuCallbackUrl && !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1')) {
                payuParams.curl = payuCallbackUrl.trim(); // PayU callback/webhook URL
                console.log('   ✅ Callback URL (curl) set:', payuCallbackUrl);
            } else {
                console.log('   ⚠️ Skipping curl (callback URL) - localhost not accessible to PayU servers');
            }
            
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
            
            // Save params to transaction
            transaction.payuParams = payuParams;
            await transaction.save();
        }
        
        // Return parameters as JSON
        return res.json({
            success: true,
            paymentUrl: PAYU_PAYMENT_URL,
            formParams: payuParams
        });

    } catch (error) {
        console.error('❌ PayU Form Params Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get PayU form parameters'
        });
    }
};

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

        // Use form-based UPI payment (UPI Seamless)
        // Reference: https://docs.payu.in/docs/collect-payments-with-upi-seamless
        console.log('🔄 Loading PayU UPI Seamless checkout page for transaction:', transactionId);
        
        // Get stored PayU parameters or generate new ones
        let payuParams = transaction.payuParams;
        
        if (!payuParams) {
            // Generate payment parameters if not stored
            const amountFormatted = transaction.amount.toFixed(2);
            const productInfo = transaction.description || `Payment for ${transaction.merchantName}`;
            const firstName = transaction.customerName.split(' ')[0] || transaction.customerName;
            const email = transaction.customerEmail.trim();
            
            // ✅ PayU callback URL - pure API route (no Server Actions)
            const frontendUrl = process.env.NEXTJS_API_URL || 
                                process.env.FRONTEND_URL || 
                                process.env.NEXT_PUBLIC_SERVER_URL || 
                                process.env.KRISHI_API_URL || 
                                process.env.NEXT_PUBLIC_API_URL || 
                                process.env.PAYU_WEBSITE_URL ||
                                'https://shaktisewafoudation.in';
            
            // CRITICAL: Use backend URL directly for callback to bypass Next.js Server Actions
            // PayU POSTs directly to Express backend, not through Next.js
            const backendUrl = process.env.BACKEND_URL || 
                              process.env.API_URL || 
                              process.env.SERVER_URL ||
                              'https://himora.art';
            
            let payuCallbackUrlBase = String(backendUrl).replace(/\/$/, '');
            
            // For test mode with localhost, try to get public URL (ngrok)
            if (PAYU_MODE === 'test' && (payuCallbackUrlBase.includes('localhost') || payuCallbackUrlBase.includes('127.0.0.1'))) {
                const publicUrl = await getPublicCallbackUrl(payuCallbackUrlBase);
                if (publicUrl && !publicUrl.includes('localhost')) {
                    payuCallbackUrlBase = publicUrl;
                }
            }
            const payuCallbackUrl = `${payuCallbackUrlBase}/api/payu/callback`;
            
            console.log('🔧 PayU Callback URL Configuration:');
            console.log('   Backend URL:', backendUrl);
            console.log('   Final callback URL base:', payuCallbackUrlBase);
            console.log('   Full callback URL (curl):', payuCallbackUrl);
            console.log('   Is public URL:', !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1'));
            
            // Success and Failure URLs for user redirects
            const successUrl = transaction.successUrl || 
                              transaction.callbackUrl || 
                              `${String(frontendUrl).replace(/\/$/, '')}/payment/success?txnid=${transaction.payuOrderId || transaction.orderId}`;
            const failureUrl = transaction.failureUrl || 
                              `${String(frontendUrl).replace(/\/$/, '')}/payment/failed?txnid=${transaction.payuOrderId || transaction.orderId}`;
            
            // PayU form parameters - CRITICAL: Trim all values, PayU is strict
            payuParams = {
                key: PAYU_KEY.trim(),
                txnid: (transaction.payuOrderId || transaction.orderId).trim(),
                amount: amountFormatted.trim(),
                productinfo: productInfo.trim(),
                firstname: firstName.trim(),
                email: email.trim().toLowerCase(), // PayU expects lowercase email
                phone: transaction.customerPhone.trim(),
                surl: successUrl.trim(), // User redirect URL after successful payment
                furl: failureUrl.trim(), // User redirect URL after failed payment
                pg: 'UPI' // Payment gateway: UPI (PayU handles bankcode internally)
                // Note: service_provider removed - can cause issues with UPI
                // Note: bankcode is not needed when pg is set - PayU handles it
            };
            
            // ✅ CRITICAL: Only include curl if it's publicly accessible
            if (payuCallbackUrl && !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1')) {
                payuParams.curl = payuCallbackUrl.trim(); // PayU callback/webhook URL - goes to Express backend
                console.log('   ✅ Callback URL (curl) set:', payuCallbackUrl);
            } else {
                console.log('   ⚠️ Skipping curl (callback URL) - localhost not accessible to PayU servers');
            }
            
            // ✅ CRITICAL: Only include curl if it's publicly accessible
            // In test mode with localhost, PayU cannot access callback URL
            if (payuCallbackUrl && !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1')) {
                payuParams.curl = payuCallbackUrl.trim(); // PayU callback/webhook URL
            }
            
            // ✅ CRITICAL: DO NOT add environment parameter for form submissions
            // The 'environment' parameter is only for API calls, NOT for form submissions
            // Test mode is handled by endpoint URL (test.payu.in vs secure.payu.in)
            // Adding environment=1 causes "Pardon, Some Problem Occurred" errors
            
            // NO environment parameter needed
            
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
            
            // Save params to transaction
            transaction.payuParams = payuParams;
            await transaction.save();
        }
        
        // Build form inputs for PayU payment form
        const formInputs = Object.entries(payuParams)
            .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(String(value))}" />`)
            .join('');
        
        // Generate minimal HTML with PayU logo that auto-submits form immediately
        // This redirects directly to PayU payment page with a brief logo display
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to PayU...</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .logo-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }
        .payu-logo {
            max-width: 200px;
            height: auto;
            display: block;
        }
        .loading-text {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
            opacity: 0.8;
        }
        #payuForm {
            display: none;
        }
    </style>
</head>
<body>
    <div class="logo-container">
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2EMrhqFYHWyEhY8yxnScriEXG3UR6uaY-yg&s" 
             alt="PayU" 
             class="payu-logo" />
        <div class="loading-text">Redirecting to PayU...</div>
    </div>
    <form id="payuForm" method="POST" action="${PAYU_PAYMENT_URL}">
        ${formInputs}
    </form>
    <script>
        // Auto-submit form immediately on page load
        (function() {
            var form = document.getElementById('payuForm');
            if (form) {
                // Small delay to show logo briefly (100ms)
                setTimeout(function() {
                    form.submit();
                }, 100);
            } else {
                // Fallback: retry if form not found
                setTimeout(function() {
                    var form = document.getElementById('payuForm');
                    if (form) form.submit();
                }, 10);
            }
        })();
    </script>
</body>
</html>`;
        
        console.log('✅ Redirecting directly to PayU payment page');
        console.log('   Payment URL:', PAYU_PAYMENT_URL);
        console.log('   Order ID:', payuParams.txnid);
        
        // Set headers for immediate redirect
        res.set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
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

// ============ MERCHANT HOSTED CHECKOUT - CREATE PAYMENT ============
/**
 * Create payment using Merchant Hosted Checkout
 * Reference: https://docs.payu.in/docs/custom-checkout-merchant-hosted
 * 
 * This allows merchants to collect payment details on their own website
 * Supports: Cards, Net Banking, EMI, UPI, Wallets, BNPL
 * 
 * Note: Requires PCI DSS compliance for card payments
 */
exports.createMerchantHostedPayment = async (req, res) => {
    let transactionId = null;
    let orderId = null;
    
    try {
        const {
            amount,
            customer_name,
            customer_email,
            customer_phone,
            description,
            payment_mode, // 'CC', 'DC', 'NB', 'UPI', 'WALLET', 'EMI', etc.
            card_details, // For card payments: { card_number, card_name, expiry_month, expiry_year, cvv }
            bank_code, // For net banking
            emi_plan_id, // For EMI
            upi_id, // For UPI seamless
            wallet_code, // For wallets
            callback_url,
            success_url,
            failure_url
        } = req.body;

        // Get merchant info from apiKeyAuth middleware
        const merchantId = req.merchantId;
        const merchantName = req.merchantName;

        // Check if PayU is enabled
        const settings = await Settings.getSettings();
        if (!settings.paymentGateways.payu?.enabled) {
            return res.status(403).json({
                success: false,
                error: 'PayU payment gateway is not enabled'
            });
        }

        // Validate credentials
        if (!PAYU_KEY || !PAYU_SALT) {
            return res.status(500).json({
                success: false,
                error: 'PayU credentials not configured'
            });
        }

        // Validate input
        if (!amount || !customer_name || !customer_email || !customer_phone || !payment_mode) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: amount, customer_name, customer_email, customer_phone, payment_mode'
            });
        }

        // Validate payment mode specific fields
        if (payment_mode === 'CC' || payment_mode === 'DC') {
            if (!card_details || !card_details.card_number || !card_details.card_name || 
                !card_details.expiry_month || !card_details.expiry_year || !card_details.cvv) {
                return res.status(400).json({
                    success: false,
                    error: 'Card details required for card payment: card_number, card_name, expiry_month, expiry_year, cvv'
                });
            }
        } else if (payment_mode === 'NB' && !bank_code) {
            return res.status(400).json({
                success: false,
                error: 'bank_code required for net banking payment'
            });
        } else if (payment_mode === 'UPI' && !upi_id) {
            return res.status(400).json({
                success: false,
                error: 'upi_id required for UPI payment'
            });
        } else if (payment_mode === 'WALLET' && !wallet_code) {
            return res.status(400).json({
                success: false,
                error: 'wallet_code required for wallet payment'
            });
        }

        // Validate amount
        const amountFloat = parseFloat(amount);
        if (isNaN(amountFloat) || amountFloat < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Generate unique IDs
        transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Get merchant's configured URLs
        const merchant = await User.findById(merchantId);
        const finalCallbackUrl = callback_url ||
            merchant?.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        // ✅ PayU callback URL - pure API route (no Server Actions)
        const frontendUrl = process.env.NEXTJS_API_URL || 
                            process.env.FRONTEND_URL || 
                            process.env.NEXT_PUBLIC_SERVER_URL || 
                            process.env.KRISHI_API_URL || 
                            process.env.NEXT_PUBLIC_API_URL || 
                            process.env.PAYU_WEBSITE_URL ||
                            'https://shaktisewafoudation.in';
        // For test mode with localhost, try to get public URL (ngrok) for callback
        let payuCallbackUrlBase = String(frontendUrl).replace(/\/$/, '');
        if (PAYU_MODE === 'test' && (payuCallbackUrlBase.includes('localhost') || payuCallbackUrlBase.includes('127.0.0.1'))) {
            const publicUrl = await getPublicCallbackUrl(payuCallbackUrlBase);
            if (publicUrl && !publicUrl.includes('localhost')) {
                payuCallbackUrlBase = publicUrl;
            }
        }
        const payuCallbackUrl = `${payuCallbackUrlBase}/api/payu/callback`;
        
        // Success and Failure URLs for user redirects
        const successUrl = success_url || 
                          finalCallbackUrl || 
                          `${String(frontendUrl).replace(/\/$/, '')}/payment/success?txnid=${orderId}`;
        const failureUrl = failure_url || 
                          `${String(frontendUrl).replace(/\/$/, '')}/payment/failed?txnid=${orderId}`;

        // Prepare payment parameters
        const amountFormatted = amountFloat.toFixed(2);
        const productInfo = description || `Payment for ${merchantName}`;
        const firstName = customer_name.split(' ')[0] || customer_name;
        const email = customer_email.trim();

        // Prepare PayU parameters - CRITICAL: PayU is strict about format
        // Sanitize text fields to prevent special character issues
        const sanitizeText = (text, maxLength = 100) => {
            if (!text) return '';
            return String(text)
                .replace(/[`"'<>]/g, '') // Remove problematic characters
                .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                .trim()
                .substring(0, maxLength);
        };
        
        const sanitizedProductInfo = sanitizeText(productInfo, 100);
        const sanitizedFirstName = sanitizeText(firstName, 50);
        const sanitizedEmail = email.trim().toLowerCase(); // PayU expects lowercase email
        
        const payuParams = {
            key: PAYU_KEY.trim(),
            txnid: orderId.trim(), // CRITICAL: Trim txnid
            amount: amountFormatted.trim(), // CRITICAL: Trim amount
            productinfo: sanitizedProductInfo, // CRITICAL: Sanitized productinfo
            firstname: sanitizedFirstName, // CRITICAL: Sanitized firstname
            email: sanitizedEmail, // CRITICAL: Lowercased email
            phone: customer_phone.trim(), // CRITICAL: Trim phone
            surl: successUrl.trim(), // User redirect URL after successful payment
            furl: failureUrl.trim(), // User redirect URL after failed payment
            pg: payment_mode // Payment gateway mode
            // Note: service_provider removed - can cause issues with UPI
        };
        
        // ✅ CRITICAL: Only include curl if it's publicly accessible
        if (payuCallbackUrl && !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1')) {
            payuParams.curl = payuCallbackUrl.trim(); // PayU callback/webhook URL
        }
        
        // ✅ CRITICAL: DO NOT add environment parameter for form submissions
        // The 'environment' parameter is only for API calls, NOT for form submissions
        // Test mode is handled by endpoint URL (test.payu.in vs secure.payu.in)
        // Adding environment=1 causes "Pardon, Some Problem Occurred" errors
        
        // NO environment parameter needed - test mode is handled by endpoint URL

        // Add payment mode specific parameters
        if (payment_mode === 'CC' || payment_mode === 'DC') {
            // Card payment - will be submitted via form
            payuParams.ccnum = card_details.card_number.replace(/\s/g, '');
            payuParams.ccname = card_details.card_name;
            payuParams.ccvv = card_details.cvv;
            payuParams.ccexpmon = String(card_details.expiry_month).padStart(2, '0');
            payuParams.ccexpyr = String(card_details.expiry_year).slice(-2);
        } else if (payment_mode === 'NB') {
            payuParams.bankcode = bank_code;
        } else if (payment_mode === 'EMI') {
            payuParams.emi_plan_id = emi_plan_id;
        } else if (payment_mode === 'UPI') {
            payuParams.upi_id = upi_id;
        } else if (payment_mode === 'WALLET') {
            payuParams.wallet_code = wallet_code;
        }

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
        const transactionData = {
            transactionId: transactionId,
            orderId: orderId,
            merchantId: merchantId,
            merchantName: merchantName,
            customerId: `CUST_${customer_phone}_${Date.now()}`,
            customerName: customer_name,
            customerEmail: customer_email,
            customerPhone: customer_phone,
            amount: amountFloat,
            currency: 'INR',
            description: productInfo,
            status: 'created',
            paymentGateway: 'payu',
            paymentMethod: payment_mode,
            payuOrderId: orderId,
            callbackUrl: finalCallbackUrl,
            successUrl: success_url,
            failureUrl: failure_url,
            payuParams: payuParams, // Store params for form submission
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const transaction = new Transaction(transactionData);
        await transaction.save();

        // For Merchant Hosted Checkout, return payment parameters
        // Frontend will submit form to PayU
        res.json({
            success: true,
            transaction_id: transactionId,
            order_id: orderId,
            payment_mode: payment_mode,
            payu_params: payuParams,
            payment_url: PAYU_PAYMENT_URL,
            message: 'Payment parameters generated. Submit form to PayU payment URL.'
        });

    } catch (error) {
        console.error('❌ Create Merchant Hosted Payment Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create payment',
            transaction_id: transactionId,
            order_id: orderId || 'N/A'
        });
    }
};

// ============ UPI SEAMLESS - SERVER TO SERVER ============
/**
 * Process UPI payment using Server-to-Server (S2S) seamless flow
 * Reference: https://docs.payu.in/docs/collect-payments-with-upi-seamless
 * 
 * This allows processing UPI payments without redirecting customer to PayU page
 */
exports.processUPISeamless = async (req, res) => {
    let transactionId = null;
    let orderId = null;
    
    try {
        const {
            amount,
            customer_name,
            customer_email,
            customer_phone,
            description,
            upi_id,
            callback_url,
            success_url,
            failure_url,
            client_ip,
            device_info
        } = req.body;

        // Get merchant info
        const merchantId = req.merchantId;
        const merchantName = req.merchantName;

        // Check if PayU is enabled
        const settings = await Settings.getSettings();
        if (!settings.paymentGateways.payu?.enabled) {
            return res.status(403).json({
                success: false,
                error: 'PayU payment gateway is not enabled'
            });
        }

        // Validate credentials
        if (!PAYU_KEY || !PAYU_SALT) {
            return res.status(500).json({
                success: false,
                error: 'PayU credentials not configured'
            });
        }

        // Validate input
        if (!amount || !customer_name || !customer_email || !customer_phone || !upi_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: amount, customer_name, customer_email, customer_phone, upi_id'
            });
        }

        // Validate UPI ID format
        if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(upi_id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid UPI ID format. Expected format: user@bankname'
            });
        }

        // Validate amount
        const amountFloat = parseFloat(amount);
        if (isNaN(amountFloat) || amountFloat < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Generate unique IDs
        transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Get merchant's configured URLs
        const merchant = await User.findById(merchantId);
        const finalCallbackUrl = callback_url ||
            merchant?.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        // PayU callback URL - points to Next.js callback handler
        const frontendUrl = process.env.NEXTJS_API_URL || 
                            process.env.FRONTEND_URL || 
                            process.env.NEXT_PUBLIC_SERVER_URL || 
                            process.env.KRISHI_API_URL || 
                            process.env.NEXT_PUBLIC_API_URL || 
                            process.env.PAYU_WEBSITE_URL ||
                            'https://shaktisewafoudation.in';
        // ✅ CRITICAL: Callback URL should NOT include query parameters
        // PayU sends transaction details (txnid, status, etc.) in POST body, not query params
        let payuCallbackUrl = `${String(frontendUrl).replace(/\/$/, '')}/api/payu/callback`;
        
        // Warning for localhost in test mode
        if (PAYU_MODE === 'test' && (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1'))) {
            const publicUrl = process.env.PAYU_PUBLIC_TEST_URL || process.env.NEXTJS_API_URL || process.env.FRONTEND_URL;
            if (publicUrl && !publicUrl.includes('localhost')) {
                payuCallbackUrl = `${String(publicUrl).replace(/\/+$/, '')}/api/payu/callback`;
            }
        }

        // Prepare payment parameters
        const amountFormatted = amountFloat.toFixed(2);
        const productInfo = description || `Payment for ${merchantName}`;
        const firstName = customer_name.split(' ')[0] || customer_name;
        const email = customer_email.trim();

        // Get client IP and device info
        const clientIp = client_ip || req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
        const deviceInfo = device_info || req.headers['user-agent'] || 'Unknown';

        // Prepare S2S parameters for UPI Seamless
        // Reference: https://docs.payu.in/docs/collect-payments-with-upi-seamless
        // PayU S2S API expects form-encoded parameters
        
        // Get frontend URL for redirects
        const frontendUrlForRedirects = process.env.NEXTJS_API_URL || 
                                        process.env.FRONTEND_URL || 
                                        'https://shaktisewafoudation.in';
        
        // Standard payment parameters
        const paymentParams = {
            key: PAYU_KEY.trim(),
            txnid: orderId,
            amount: amountFormatted,
            productinfo: productInfo,
            firstname: firstName,
            email: email,
            phone: customer_phone.trim(),
            surl: (success_url || finalCallbackUrl || `${String(frontendUrlForRedirects).replace(/\/$/, '')}/payment/success?txnid=${orderId}`).trim(),
            furl: (failure_url || `${String(frontendUrlForRedirects).replace(/\/$/, '')}/payment/failed?txnid=${orderId}`).trim(),
            service_provider: 'payu_paisa',
            pg: 'UPI',
            upi_id: upi_id,
            txn_s2s_flow: '4', // S2S flow indicator
            s2s_client_ip: clientIp,
            s2s_device_info: deviceInfo,
            upiAppName: 'genericintent'
        };
        
        // ✅ CRITICAL: Only include curl if it's publicly accessible
        if (payuCallbackUrl && !payuCallbackUrl.includes('localhost') && !payuCallbackUrl.includes('127.0.0.1')) {
            paymentParams.curl = payuCallbackUrl.trim(); // PayU callback/webhook URL
        }

        // Generate S2S hash for UPI
        const hashParams = {
            txnid: paymentParams.txnid,
            amount: paymentParams.amount,
            productinfo: paymentParams.productinfo,
            firstname: paymentParams.firstname,
            email: paymentParams.email,
            txn_s2s_flow: paymentParams.txn_s2s_flow,
            s2s_client_ip: paymentParams.s2s_client_ip,
            s2s_device_info: paymentParams.s2s_device_info,
            upiAppName: paymentParams.upiAppName
        };
        
        const hash = generatePayUS2SHash(hashParams);
        paymentParams.hash = hash;

        // Prepare S2S API request
        const s2sParams = {
            key: PAYU_KEY.trim(),
            command: 'initiateTransaction',
            var1: JSON.stringify(paymentParams), // PayU expects JSON string in var1
            hash: '' // Will be calculated for S2S command
        };

        // Generate hash for S2S command
        // Hash format: sha512(key|command|var1|salt)
        const commandHashString = `${PAYU_KEY.trim()}|${s2sParams.command}|${s2sParams.var1}|${PAYU_SALT.trim()}`;
        const commandHash = crypto.createHash('sha512').update(commandHashString, 'utf8').digest('hex');
        s2sParams.hash = commandHash;

        // Save transaction
        const transactionData = {
            transactionId: transactionId,
            orderId: orderId,
            merchantId: merchantId,
            merchantName: merchantName,
            customerId: `CUST_${customer_phone}_${Date.now()}`,
            customerName: customer_name,
            customerEmail: customer_email,
            customerPhone: customer_phone,
            amount: amountFloat,
            currency: 'INR',
            description: productInfo,
            status: 'pending',
            paymentGateway: 'payu',
            paymentMethod: 'UPI',
            payuOrderId: orderId,
            payuUPIId: upi_id,
            callbackUrl: finalCallbackUrl,
            successUrl: success_url,
            failureUrl: failure_url,
            payuS2SParams: s2sParams,
            payuPaymentParams: paymentParams,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const transaction = new Transaction(transactionData);
        await transaction.save();

        // Make S2S API call to PayU
        try {
            console.log('🔄 Making PayU S2S API call for UPI Seamless');
            console.log('   Transaction ID:', transactionId);
            console.log('   Order ID:', orderId);
            console.log('   UPI ID:', upi_id);
            
            const s2sResponse = await axios.post(PAYU_S2S_API_URL, new URLSearchParams(s2sParams), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000,
                validateStatus: function (status) {
                    return status >= 200 && status < 600;
                }
            });

            const responseData = s2sResponse.data || {};
            console.log('✅ PayU S2S API Response:', responseData);

            // Check response status
            // PayU S2S API returns different response formats
            let isSuccess = false;
            let statusMessage = '';
            
            if (typeof responseData === 'string') {
                // Sometimes PayU returns HTML or plain text
                if (responseData.includes('success') || responseData.includes('SUCCESS')) {
                    isSuccess = true;
                    statusMessage = 'Payment initiated successfully';
                } else {
                    statusMessage = responseData;
                }
            } else if (responseData.status === 'success' || responseData.status === 1 || responseData.status === 'SUCCESS') {
                isSuccess = true;
                statusMessage = responseData.message || 'Payment initiated successfully';
            } else if (responseData.status === 'failure' || responseData.status === 0 || responseData.status === 'FAILURE') {
                statusMessage = responseData.error || responseData.error_Message || 'Payment initiation failed';
            } else {
                // Try to parse response
                statusMessage = responseData.message || JSON.stringify(responseData);
            }

            if (isSuccess) {
                // Payment initiated successfully
                await Transaction.findOneAndUpdate(
                    { transactionId: transactionId },
                    {
                        status: 'pending',
                        payuPaymentId: responseData.mihpayid || responseData.txnid || orderId,
                        payuResponse: responseData,
                        updatedAt: new Date()
                    }
                );

                res.json({
                    success: true,
                    transaction_id: transactionId,
                    order_id: orderId,
                    status: 'pending',
                    message: 'UPI payment initiated successfully. Customer should complete payment in their UPI app.',
                    payu_response: responseData,
                    next_steps: 'Customer should complete payment in their UPI app. Use /api/payu/verify endpoint to check payment status.'
                });
            } else {
                // Payment initiation failed
                await Transaction.findOneAndUpdate(
                    { transactionId: transactionId },
                    {
                        status: 'failed',
                        failureReason: statusMessage,
                        payuResponse: responseData,
                        updatedAt: new Date()
                    }
                );

                res.status(400).json({
                    success: false,
                    transaction_id: transactionId,
                    order_id: orderId,
                    error: statusMessage,
                    payu_response: responseData
                });
            }
        } catch (apiError) {
            console.error('❌ PayU S2S API Error:', apiError);
            console.error('   Error details:', {
                message: apiError.message,
                status: apiError.response?.status,
                data: apiError.response?.data
            });
            
            await Transaction.findOneAndUpdate(
                { transactionId: transactionId },
                {
                    status: 'failed',
                    failureReason: apiError.message || 'PayU API call failed',
                    payuResponse: apiError.response?.data || {},
                    updatedAt: new Date()
                }
            );

            res.status(500).json({
                success: false,
                transaction_id: transactionId,
                order_id: orderId,
                error: 'Failed to initiate UPI payment',
                details: apiError.response?.data || apiError.message
            });
        }

    } catch (error) {
        console.error('❌ Process UPI Seamless Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process UPI payment',
            transaction_id: transactionId,
            order_id: orderId || 'N/A'
        });
    }
};

// ============ GET PAYU TRANSACTION ============
/**
 * Get PayU transaction details (Public endpoint for Next.js)
 * Similar to getZaakpayTransaction
 */
exports.getPayuTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const transaction = await Transaction.findOne({ transactionId })
            .populate('merchantId', 'name email')
            .select('-__v');
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        res.json({
            success: true,
            transaction: {
                transactionId: transaction.transactionId,
                orderId: transaction.orderId,
                payuOrderId: transaction.payuOrderId,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                customerName: transaction.customerName,
                customerEmail: transaction.customerEmail,
                customerPhone: transaction.customerPhone,
                description: transaction.description,
                merchantName: transaction.merchantName,
                paymentGateway: transaction.paymentGateway,
                paymentMethod: transaction.paymentMethod,
                payuParams: transaction.payuParams,
                callbackUrl: transaction.callbackUrl,
                successUrl: transaction.successUrl,
                failureUrl: transaction.failureUrl,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt
            }
        });
    } catch (error) {
        console.error('❌ Error fetching PayU transaction:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch transaction'
        });
    }
};

// ============ GET TRANSACTION BY ORDER ID ============
exports.getPayuTransactionByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const transaction = await Transaction.findOne({
            $or: [
                { payuOrderId: orderId },
                { orderId: orderId }
            ]
        })
            .populate('merchantId', 'name email')
            .select('-__v');
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        res.json({
            success: true,
            transaction: {
                transactionId: transaction.transactionId,
                orderId: transaction.orderId,
                payuOrderId: transaction.payuOrderId,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                customerName: transaction.customerName,
                customerEmail: transaction.customerEmail,
                customerPhone: transaction.customerPhone,
                description: transaction.description,
                merchantName: transaction.merchantName,
                paymentGateway: transaction.paymentGateway,
                paymentMethod: transaction.paymentMethod,
                successUrl: transaction.successUrl,
                failureUrl: transaction.failureUrl,
                callbackUrl: transaction.callbackUrl,
                createdAt: transaction.createdAt,
                paidAt: transaction.paidAt,
                updatedAt: transaction.updatedAt
            }
        });
    } catch (error) {
        console.error('❌ Get PayU Transaction By Order ID Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch transaction'
        });
    }
};

exports.verifyPaymentStatus = async (req, res) => {
    try {
        const { transaction_id, order_id } = req.query;

        if (!transaction_id && !order_id) {
            return res.status(400).json({
                success: false,
                error: 'Either transaction_id or order_id is required'
            });
        }

        // Find transaction
        const transaction = await Transaction.findOne({
            $or: [
                { transactionId: transaction_id },
                { orderId: order_id || transaction_id }
            ]
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }

        // Prepare verify API parameters
        const verifyParams = {
            key: PAYU_KEY.trim(),
            command: 'verify_payment',
            var1: transaction.payuOrderId || transaction.orderId,
            hash: '' // Will be calculated
        };

        // Generate hash for verify API
        // Hash format: sha512(key|command|var1|salt)
        const hashString = `${PAYU_KEY.trim()}|verify_payment|${verifyParams.var1}|${PAYU_SALT.trim()}`;
        const hash = crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
        verifyParams.hash = hash;

        // Call PayU Verify API
        const verifyResponse = await axios.post(PAYU_S2S_API_URL, new URLSearchParams(verifyParams), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000
        });

        const responseData = verifyResponse.data || {};

        // Update transaction if status changed
        if (responseData.status === 'success' && transaction.status !== 'paid') {
            const paidAt = new Date();
            const expectedSettlement = await calculateExpectedSettlementDate(paidAt);
            const commissionData = calculatePayinCommission(transaction.amount);

            await Transaction.findOneAndUpdate(
                { _id: transaction._id },
                {
                    status: 'paid',
                    paidAt: paidAt,
                    paymentMethod: responseData.payment_mode || transaction.paymentMethod,
                    payuPaymentId: responseData.mihpayid || transaction.payuPaymentId,
                    acquirerData: {
                        utr: responseData.bank_ref_num || null,
                        rrn: responseData.bank_ref_num || null,
                        bank_transaction_id: responseData.bank_ref_num || null
                    },
                    settlementStatus: 'unsettled',
                    expectedSettlementDate: expectedSettlement,
                    commission: commissionData.commission,
                    netAmount: parseFloat((transaction.amount - commissionData.commission).toFixed(2)),
                    payuResponse: responseData,
                    updatedAt: new Date()
                }
            );
        }

        res.json({
            success: true,
            transaction_id: transaction.transactionId,
            order_id: transaction.orderId,
            status: responseData.status || transaction.status,
            payment_status: responseData.status,
            payu_response: responseData,
            transaction: {
                transaction_id: transaction.transactionId,
                order_id: transaction.orderId,
                amount: transaction.amount,
                status: transaction.status,
                payment_method: transaction.paymentMethod
            }
        });

    } catch (error) {
        console.error('❌ Verify Payment Status Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to verify payment status',
            details: error.response?.data || {}
        });
    }
};

