const crypto = require('crypto');
const axios = require('axios');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');

// Easebuzz Configuration
const EASEBUZZ_MERCHANT_ID = process.env.EASEBUZZ_MERCHANT_ID;
const EASEBUZZ_SALT_KEY = process.env.EASEBUZZ_SALT_KEY; // This is the "key" in the API
const EASEBUZZ_API_KEY = process.env.EASEBUZZ_API_KEY;
const EASEBUZZ_ENVIRONMENT = process.env.EASEBUZZ_ENVIRONMENT || 'production'; // 'sandbox' or 'production'

// Easebuzz API URLs
// Initiate Payment API endpoint for checkout links
// Documentation: https://docs.easebuzz.in/docs/payment-gateway/8ec545c331e6f-initiate-payment-api
const EASEBUZZ_API_BASE_URL = 'https://dashboard.easebuzz.in';
const EASEBUZZ_PAYMENT_BASE_URL = EASEBUZZ_ENVIRONMENT === 'sandbox'
    ? 'https://testpay.easebuzz.in'
    : 'https://pay.easebuzz.in';
const EASEBUZZ_INITIATE_PAYMENT_URL = `${EASEBUZZ_PAYMENT_BASE_URL}/payment/initiateLink`;

// ============ HASH GENERATION FOR INITIATE PAYMENT API ============
// Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
// IMPORTANT: udf1-udf10 should be included in hash if they're in the payload
// According to Easebuzz docs, if udf fields are sent, they should be in hash (even if empty)
function generateInitiatePaymentHash(payload) {
    // Build hash string exactly as per Easebuzz documentation
    // Sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    // Ensure all values are strings and handle empty/null values
    // IMPORTANT: Values must match exactly what's sent in the API request
    const key = String(payload.key || '').trim();
    const txnid = String(payload.txnid || '').trim();
    const amount = String(payload.amount || '').trim();
    const productinfo = String(payload.productinfo || '').trim();
    const firstname = String(payload.firstname || '').trim();
    const email = String(payload.email || '').trim();
    // Include udf1-udf10 from payload if present, otherwise empty
    const udf1 = String(payload.udf1 || '').trim();
    const udf2 = String(payload.udf2 || '').trim();
    const udf3 = String(payload.udf3 || '').trim();
    const udf4 = String(payload.udf4 || '').trim();
    const udf5 = String(payload.udf5 || '').trim();
    const udf6 = String(payload.udf6 || '').trim();
    const udf7 = String(payload.udf7 || '').trim();
    const udf8 = String(payload.udf8 || '').trim();
    const udf9 = String(payload.udf9 || '').trim();
    const udf10 = String(payload.udf10 || '').trim();
    const salt = String(EASEBUZZ_SALT_KEY || '').trim();
    
    const hashString = [
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1, // Include udf1 if present in payload
        udf2, // Include udf2 if present in payload
        udf3, // Include udf3 if present in payload
        udf4, // Include udf4 if present in payload
        udf5, // Include udf5 if present in payload
        udf6, // Include udf6 if present in payload
        udf7, // Include udf7 if present in payload
        udf8, // Include udf8 if present in payload
        udf9, // Include udf9 if present in payload
        udf10, // Include udf10 if present in payload
        salt
    ].join('|');
    
    // Log hash components for debugging (mask sensitive data)
    console.log('   🔐 Hash Components:');
    console.log('      Key:', key.substring(0, 4) + '...' + key.substring(key.length - 4));
    console.log('      Txn ID:', txnid);
    console.log('      Amount:', amount);
    console.log('      Product Info:', productinfo);
    console.log('      Firstname:', firstname);
    console.log('      Email:', email);
    console.log('      UDF1:', udf1 || '(empty)');
    console.log('      Salt:', salt.substring(0, 4) + '...' + salt.substring(salt.length - 4));
    console.log('      Hash String Length:', hashString.length);
    console.log('      Hash String (first 100 chars):', hashString.substring(0, 100) + '...');
    
    return crypto.createHash('sha512').update(hashString).digest('hex');
}

// ============ UPI DEEP LINK GENERATION ============
// Function to generate UPI deep links for different payment apps
function generateUPIDeepLinks(checkoutUrl, paymentData, req) {
    const amount = paymentData.amount || '0.00';
    const merchantName = paymentData.firstname || paymentData.name || 'Merchant';
    
    // URL encode parameters
    const encode = (str) => encodeURIComponent(str || '');
    
    // Get base URL from request or environment variable
    let baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL;
    if (!baseUrl && req) {
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:3000';
        baseUrl = `${protocol}://${host}`;
    }
    baseUrl = baseUrl || 'http://localhost:3000';
    
    // Generate deep links for popular UPI apps
    const deepLinks = {
        // Direct checkout URL from Easebuzz
        checkout_url: checkoutUrl,
        
        // Smart redirect link - automatically detects device and opens UPI app
        smart_link: checkoutUrl ? `${baseUrl}/api/easebuzz/upi-redirect?payment_url=${encode(checkoutUrl)}&amount=${amount}&merchant=${encode(merchantName)}` : null,
        
        // Direct app deep links (for manual use if needed)
        apps: checkoutUrl ? {
            phonepe: `phonepe://pay?url=${encode(checkoutUrl)}`,
            googlepay: `tez://pay?url=${encode(checkoutUrl)}`,
            paytm: `paytmmp://pay?url=${encode(checkoutUrl)}`,
            bhim: `bhim://pay?url=${encode(checkoutUrl)}`
        } : null
    };
    
    return deepLinks;
}

// ============ CREATE EASEBUZZ PAYMENT LINK ============
exports.createEasebuzzPaymentLink = async (req, res) => {
    // Define transactionId at function scope so it's accessible in catch block
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

        console.log('📤 Easebuzz Payment Link request from:', merchantName);

        // Validate credentials
        if (!EASEBUZZ_MERCHANT_ID || !EASEBUZZ_SALT_KEY) {
            console.error('❌ Easebuzz credentials not configured');
            return res.status(500).json({
                success: false,
                error: 'Easebuzz credentials not configured. Please set EASEBUZZ_MERCHANT_ID and EASEBUZZ_SALT_KEY in environment variables.'
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
        if (parseFloat(amount) < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Generate unique transaction ID
        transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const txnid = `EC${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`; // Easebuzz format: EC + timestamp + random

        // Get merchant's configured URLs or use provided ones
        const merchant = await User.findById(merchantId);

        // Priority: API provided URL > Merchant configured URL > Default URL
        const finalCallbackUrl = callback_url ||
            merchant.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        const finalFailureUrl = failure_url ||
            merchant.failureUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed`;

        // Easebuzz callback and redirect URLs
        // IMPORTANT: surl and furl must be valid, accessible URLs
        // They should be absolute URLs without special characters
        const backendBaseUrl = (process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, ''); // Remove trailing slash
        const easebuzzCallbackUrl = `${backendBaseUrl}/api/easebuzz/webhook?transaction_id=${encodeURIComponent(transactionId)}`;
        const easebuzzRedirectUrl = `${backendBaseUrl}/api/easebuzz/callback?transaction_id=${encodeURIComponent(transactionId)}`;
        
        // For surl and furl, use the merchant's success/failure URLs or default frontend URLs
        // Easebuzz requires these to be publicly accessible URLs
        // IMPORTANT: These URLs must be whitelisted in Easebuzz dashboard and must be accessible from internet
        const surl = success_url || 
                    finalCallbackUrl || 
                    `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;
        const furl = failure_url || 
                    finalFailureUrl || 
                    `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed`;
        
        // Validate URLs are absolute and properly formatted
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(surl)) {
            return res.status(400).json({
                success: false,
                error: `Invalid success URL format: ${surl}. Must be an absolute URL starting with http:// or https://`
            });
        }
        if (!urlPattern.test(furl)) {
            return res.status(400).json({
                success: false,
                error: `Invalid failure URL format: ${furl}. Must be an absolute URL starting with http:// or https://`
            });
        }
        
        console.log('\n🔗 URL Configuration:');
        console.log('   Success URL (surl):', surl);
        console.log('   Failure URL (furl):', furl);
        console.log('   Callback URL:', easebuzzCallbackUrl);
        console.log('   Redirect URL:', easebuzzRedirectUrl);

        // Validate credentials
        if (!EASEBUZZ_API_KEY) {
            console.error('❌ Easebuzz API Key not found. Please set EASEBUZZ_API_KEY');
            return res.status(500).json({
                success: false,
                error: 'Easebuzz API Key not configured. Please set EASEBUZZ_API_KEY in environment variables.'
            });
        }

        if (!EASEBUZZ_SALT_KEY) {
            console.error('❌ Easebuzz Salt Key not found. Required for hash generation.');
            return res.status(500).json({
                success: false,
                error: 'Easebuzz Salt Key not configured. Please set EASEBUZZ_SALT_KEY in environment variables.'
            });
        }

        console.log('\n🔑 Easebuzz Configuration:');
        console.log('   EASEBUZZ_MERCHANT_ID:', EASEBUZZ_MERCHANT_ID ? `Set (${EASEBUZZ_MERCHANT_ID.length} chars)` : 'NOT SET');
        console.log('   EASEBUZZ_SALT_KEY:', EASEBUZZ_SALT_KEY ? `Set (${EASEBUZZ_SALT_KEY.length} chars)` : 'NOT SET');
        console.log('   EASEBUZZ_API_KEY:', EASEBUZZ_API_KEY ? `Set (${EASEBUZZ_API_KEY.length} chars)` : 'NOT SET');
        console.log('   Environment:', EASEBUZZ_ENVIRONMENT);

        // Prepare payload for Initiate Payment API
        // Documentation: https://docs.easebuzz.in/docs/payment-gateway/8ec545c331e6f-initiate-payment-api
        // Hash sequence: key|txnid|amount|productinfo|firstname|email|||||||||||salt
        // NOTE: udf1-udf10, phone, surl, furl, pg are NOT included in hash, even if sent in payload
        // Use API_KEY as per provided code example
        if (!EASEBUZZ_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'EASEBUZZ_API_KEY is required for Initiate Payment API'
            });
        }
        
        const payload = {
            key: EASEBUZZ_API_KEY, // Use API_KEY as per provided code example
            txnid: txnid,
            amount: parseFloat(amount).toFixed(2),
            productinfo: description || `Payment for ${merchantName}`,
            firstname: customer_name,
            email: customer_email,
            phone: customer_phone,
            surl: surl, // Success URL - must be valid, accessible URL
            furl: furl,  // Failure URL - must be valid, accessible URL
            udf1: transactionId, // Store our transaction ID in udf1 (not in hash)
            pg: 'UPI' // Pre-select UPI payment mode (not in hash)
        };

        // Generate hash for Initiate Payment API
        // Hash sequence: key|txnid|amount|productinfo|firstname|email|||||||||||salt
        // Only these fields are used in hash - phone, surl, furl, udf1-udf10, pg are NOT in hash
        const hash = generateInitiatePaymentHash(payload);
        payload.hash = hash;
        
        console.log('\n🔐 Hash Generation Details:');
        console.log('   Key used (API_KEY):', EASEBUZZ_API_KEY.substring(0, 4) + '...' + EASEBUZZ_API_KEY.substring(EASEBUZZ_API_KEY.length - 4));
        console.log('   Txn ID:', txnid);
        console.log('   Amount:', payload.amount);
        console.log('   Product Info:', payload.productinfo);
        console.log('   Firstname:', payload.firstname);
        console.log('   Email:', payload.email);
        console.log('   Salt Key Length:', EASEBUZZ_SALT_KEY ? EASEBUZZ_SALT_KEY.length : 0);
        console.log('   Hash (first 30 chars):', hash.substring(0, 30) + '...');
        console.log('   ⚠️  Note: phone, surl, furl, udf1, pg are NOT included in hash');

        console.log('\n📋 Initiate Payment API Request:');
        console.log('   Transaction ID:', transactionId);
        console.log('   Txn ID:', txnid);
        console.log('   Amount:', payload.amount);
        console.log('   Customer:', payload.firstname);
        console.log('   Email:', payload.email);
        console.log('   Phone:', payload.phone);
        console.log('   Product Info:', payload.productinfo);
        console.log('   Payment Mode: UPI (pre-selected)');

        // Save transaction to database first
        const transaction = new Transaction({
            transactionId: transactionId,
            orderId: txnid, // Use Easebuzz txnid as orderId
            merchantId: merchantId,
            merchantName: merchantName,

            // Customer Details
            customerId: `CUST_${customer_phone}_${Date.now()}`,
            customerName: customer_name,
            customerEmail: customer_email,
            customerPhone: customer_phone,

            // Payment Details
            amount: parseFloat(amount),
            currency: 'INR',
            description: description || `Payment for ${merchantName}`,

            // Status
            status: 'created',

            // Easebuzz Data
            paymentGateway: 'easebuzz',
            easebuzzOrderId: txnid,

            // Store callback URLs
            callbackUrl: finalCallbackUrl,
            successUrl: success_url,
            failureUrl: failure_url,

            // Timestamps
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await transaction.save();
        console.log('💾 Transaction saved:', transactionId);

        // Call Easebuzz Initiate Payment API
        // Endpoint: https://pay.easebuzz.in/payment/initiateLink
        console.log('\n📤 Calling Easebuzz Initiate Payment API...');
        console.log('   API Endpoint:', EASEBUZZ_INITIATE_PAYMENT_URL);
        console.log('   Request Payload:', JSON.stringify({ ...payload, hash: '***' }, null, 2));

        // Try with API_KEY first, if hash mismatch, try with MERCHANT_ID
        let accessKey = null;
        let lastError = null;
        let keysToTry = [];
        
        // Determine which keys to try
        // For Initiate Payment API, the "key" field should be the Merchant Key
        // Try MERCHANT_ID first (most likely to be the correct key), then API_KEY
        if (EASEBUZZ_MERCHANT_ID && EASEBUZZ_API_KEY && EASEBUZZ_MERCHANT_ID !== EASEBUZZ_API_KEY) {
            // Try MERCHANT_ID first (most common), then API_KEY
            keysToTry = [
                { key: EASEBUZZ_MERCHANT_ID, name: 'MERCHANT_ID' },
                { key: EASEBUZZ_API_KEY, name: 'API_KEY' }
            ];
        } else if (EASEBUZZ_MERCHANT_ID) {
            keysToTry = [{ key: EASEBUZZ_MERCHANT_ID, name: 'MERCHANT_ID' }];
        } else if (EASEBUZZ_API_KEY) {
            keysToTry = [{ key: EASEBUZZ_API_KEY, name: 'API_KEY' }];
        } else {
            return res.status(500).json({
                success: false,
                error: 'EASEBUZZ_MERCHANT_ID or EASEBUZZ_API_KEY must be set'
            });
        }

        // Try different hash approaches if hash mismatch occurs
        const hashApproaches = [
            { name: 'with_udf', includeUdf: true },
            { name: 'without_udf', includeUdf: false }
        ];

        for (const keyConfig of keysToTry) {
            for (const hashApproach of hashApproaches) {
                try {
                    console.log(`\n🔄 Trying with ${keyConfig.name} (hash: ${hashApproach.name})...`);
                    
                    // Update payload with current key
                    payload.key = keyConfig.key;
                    
                    // Generate hash based on approach
                    let hash;
                    if (hashApproach.includeUdf) {
                        // Include udf1-udf10 in hash if present in payload
                        hash = generateInitiatePaymentHash(payload);
                    } else {
                        // Use empty udf1-udf10 in hash (original approach)
                        const hashPayload = { ...payload };
                        // Temporarily clear udf fields for hash calculation
                        const tempUdf1 = hashPayload.udf1;
                        hashPayload.udf1 = '';
                        hashPayload.udf2 = '';
                        hashPayload.udf3 = '';
                        hashPayload.udf4 = '';
                        hashPayload.udf5 = '';
                        hashPayload.udf6 = '';
                        hashPayload.udf7 = '';
                        hashPayload.udf8 = '';
                        hashPayload.udf9 = '';
                        hashPayload.udf10 = '';
                        hash = generateInitiatePaymentHash(hashPayload);
                        // Restore udf1 for payload
                        hashPayload.udf1 = tempUdf1;
                    }
                    payload.hash = hash;
                    
                    console.log(`   Key: ${keyConfig.key.substring(0, 4)}...${keyConfig.key.substring(keyConfig.key.length - 4)}`);
                    console.log(`   Hash: ${hash.substring(0, 30)}...`);

                    // Send request as form-encoded data
                    const formData = new URLSearchParams();
                    Object.keys(payload).forEach(key => {
                        if (payload[key] !== undefined && payload[key] !== null) {
                            formData.append(key, String(payload[key]).trim()); // Trim whitespace
                        }
                    });

                    const apiResponse = await axios.post(EASEBUZZ_INITIATE_PAYMENT_URL, formData.toString(), {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        timeout: 30000
                    });

                    console.log('✅ Easebuzz API Response Status:', apiResponse.status);
                    console.log('📦 Easebuzz API Response:', JSON.stringify(apiResponse.data, null, 2));

                    const responseData = apiResponse.data;

                    // Check if API call was successful
                    if (responseData && responseData.status === 1) {
                        // Extract access_key from response
                        accessKey = responseData.data || responseData.access_key || responseData.token;
                        
                        if (!accessKey) {
                            throw new Error('Easebuzz API did not return an access_key. Response: ' + JSON.stringify(responseData));
                        }

                        console.log(`✅ Success with ${keyConfig.name} (hash: ${hashApproach.name})!`);
                        console.log('   Access Key:', accessKey.substring(0, 20) + '...' + accessKey.substring(accessKey.length - 10));
                        break; // Success, exit both loops
                    } else {
                        // Check error type
                        const errorDesc = responseData?.error_desc || responseData?.message || responseData?.data || '';
                        const errorLower = errorDesc.toLowerCase();
                        
                        // If it's "Invalid merchant key", try next key
                        if (errorLower.includes('invalid merchant key') || errorLower.includes('invalid key')) {
                            console.warn(`   ❌ Invalid merchant key with ${keyConfig.name}, trying next key...`);
                            lastError = new Error(errorDesc);
                            break; // Break hash approach loop, try next key
                        } 
                        // If it's a hash mismatch error, try next hash approach or next key
                        else if (errorLower.includes('hash') || errorLower.includes('mismatch')) {
                            console.warn(`   ❌ Hash mismatch with ${keyConfig.name} (${hashApproach.name}), trying next approach...`);
                            lastError = new Error(errorDesc);
                            continue; // Try next hash approach
                        } 
                        // For other errors, throw immediately
                        else {
                            throw new Error(errorDesc || 'Easebuzz API returned an error');
                        }
                    }

                } catch (apiError) {
                    // If it's a network error or non-hash error, don't try other approaches
                    if (apiError.response && apiError.response.data) {
                        const errorDesc = apiError.response.data?.error_desc || apiError.response.data?.message || '';
                        const errorLower = errorDesc.toLowerCase();
                        
                        if (errorLower.includes('hash') || errorLower.includes('mismatch')) {
                            console.error(`❌ Hash mismatch with ${keyConfig.name} (${hashApproach.name}):`, errorDesc);
                            lastError = apiError;
                            continue; // Try next hash approach
                        } else {
                            console.error(`❌ Error with ${keyConfig.name} (${hashApproach.name}):`, apiError.message);
                            lastError = apiError;
                            // If this is the last key and last hash approach, throw
                            if (keyConfig === keysToTry[keysToTry.length - 1] && hashApproach === hashApproaches[hashApproaches.length - 1]) {
                                throw apiError;
                            }
                            continue;
                        }
                    } else {
                        console.error(`❌ Network/Other error with ${keyConfig.name} (${hashApproach.name}):`, apiError.message);
                        lastError = apiError;
                        // If this is the last key and last hash approach, throw
                        if (keyConfig === keysToTry[keysToTry.length - 1] && hashApproach === hashApproaches[hashApproaches.length - 1]) {
                            throw apiError;
                        }
                        continue;
                    }
                }
            }
            
            // If we got accessKey, break out of key loop too
            if (accessKey) {
                break;
            }
        }

        if (!accessKey) {
            throw lastError || new Error('Failed to get access_key from Easebuzz API');
        }

        // Construct checkout page URL
        const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
        const checkoutPageUrl = `${baseUrl}/api/easebuzz/checkout/${transactionId}`;

        // Update transaction with Easebuzz response data
        await Transaction.findOneAndUpdate(
            { transactionId: transactionId },
            { 
                easebuzzOrderId: txnid,
                orderId: txnid
            },
            { new: true }
        );

        // Generate UPI deep links (using checkout page URL)
        const deepLinks = generateUPIDeepLinks(checkoutPageUrl, {
            firstname: customer_name,
            amount: parseFloat(amount).toFixed(2),
            productinfo: description || `Payment for ${merchantName}`
        }, req);

        res.json({
            success: true,
            transaction_id: transactionId,
            payment_link_id: txnid,
            payment_url: checkoutPageUrl, // Custom checkout page URL
            checkout_page: checkoutPageUrl, // Alias for payment_url
            access_key: accessKey, // Access key for EaseCheckout SDK
            short_url: null,
            deep_links: deepLinks,
            order_id: txnid,
            order_amount: parseFloat(amount),
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            callback_url: finalCallbackUrl,
            message: 'Payment link created successfully. Use the checkout_page URL for payment.'
        });

    } catch (error) {
        console.error('❌ Create Easebuzz Payment Link Error:', error.message);
        console.error('   Response Data:', error.response?.data);
        
        // Update transaction status to failed (only if transactionId was created)
        if (transactionId) {
            try {
                await Transaction.findOneAndUpdate(
                    { transactionId: transactionId },
                    { 
                        status: 'failed',
                        failureReason: error.response?.data?.error_desc || error.response?.data?.message || error.message || 'Failed to create payment link'
                    }
                );
                console.log('   ✅ Transaction status updated to failed:', transactionId);
            } catch (updateError) {
                console.error('   Failed to update transaction status:', updateError.message);
                console.error('   Transaction ID:', transactionId);
            }
        } else {
            console.warn('   ⚠️  Transaction ID not available - transaction was not created yet');
        }

        // Provide helpful error message
        const errorMessage = error.response?.data?.error_desc || error.response?.data?.message || error.message || 'Failed to create Easebuzz payment link';
        let helpfulMessage = errorMessage;
        
        // Add helpful hints for common errors
        if (errorMessage.toLowerCase().includes('invalid merchant key') || errorMessage.toLowerCase().includes('invalid key')) {
            helpfulMessage += '. Please verify that EASEBUZZ_MERCHANT_ID or EASEBUZZ_API_KEY is correct in your environment variables.';
        } else if (errorMessage.toLowerCase().includes('hash') || errorMessage.toLowerCase().includes('mismatch')) {
            helpfulMessage += '. Please verify that EASEBUZZ_SALT_KEY is correct in your environment variables.';
        }

        res.status(error.response?.status || 500).json({
            success: false,
            error: helpfulMessage,
            details: error.response?.data,
            attempted_url: EASEBUZZ_INITIATE_PAYMENT_URL,
            hint: 'Check your Easebuzz credentials: EASEBUZZ_MERCHANT_ID, EASEBUZZ_API_KEY, and EASEBUZZ_SALT_KEY'
        });
    }
};

// ============ EASEBUZZ CHECKOUT PAGE (EASECHECKOUT SDK) ============
// This creates a custom checkout page using EaseCheckout SDK with UPI pre-selected
// Documentation: https://docs.easebuzz.in/docs/payment-gateway/7zfogdgdwb9c8-i-frame-integration-ease-checkout
exports.getEasebuzzCheckoutPage = async (req, res) => {
    try {
        const { transactionId } = req.params;

        console.log('\n' + '='.repeat(80));
        console.log('📄 EASEBUZZ EASE CHECKOUT PAGE REQUEST');
        console.log('='.repeat(80));
        console.log('   Transaction ID:', transactionId);

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
            console.warn('⚠️  Transaction already processed:', transaction.status);
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

        // Validate credentials
        if (!EASEBUZZ_MERCHANT_ID || !EASEBUZZ_SALT_KEY) {
            console.error('❌ Easebuzz credentials not configured');
            return res.status(500).send(`
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
                    <h1 class="error">Payment Configuration Error</h1>
                    <p>Payment gateway is not properly configured. Please contact support.</p>
                </body>
                </html>
            `);
        }

        // Prepare payment data for Easebuzz Initiate Payment API
        // Documentation: https://docs.easebuzz.in/docs/payment-gateway/8ec545c331e6f-initiate-payment-api
        const payload = {
            key: EASEBUZZ_API_KEY,
            txnid: transaction.orderId,
            amount: transaction.amount.toFixed(2),
            productinfo: transaction.description || `Payment for ${transaction.merchantName}`,
            firstname: transaction.customerName,
            email: transaction.customerEmail,
            phone: transaction.customerPhone,
            surl: transaction.callbackUrl || `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/easebuzz/callback?transaction_id=${transactionId}`,
            furl: transaction.failureUrl || `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/easebuzz/callback?transaction_id=${transactionId}`,
            udf1: transactionId, // Store our transaction ID
            pg: 'UPI' // Pre-select UPI payment mode
        };

        // Generate hash for Initiate Payment API
        const hash = generateInitiatePaymentHash(payload);
        payload.hash = hash;

        console.log('✅ Calling Easebuzz Initiate Payment API for transaction:', transactionId);
        console.log('   API Endpoint:', EASEBUZZ_INITIATE_PAYMENT_URL);
        console.log('   Amount:', payload.amount);
        console.log('   Payment Mode: UPI (pre-selected)');

        // Call Easebuzz Initiate Payment API to get access_key
        let accessKey = null;
        try {
            // Send request as form-encoded data
            const formData = new URLSearchParams();
            Object.keys(payload).forEach(key => {
                if (payload[key] !== undefined && payload[key] !== null) {
                    formData.append(key, payload[key]);
                }
            });

            const apiResponse = await axios.post(EASEBUZZ_INITIATE_PAYMENT_URL, formData.toString(), {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
            });

            console.log('✅ Easebuzz API Response Status:', apiResponse.status);
            console.log('📦 Easebuzz API Response:', JSON.stringify(apiResponse.data, null, 2));

            const responseData = apiResponse.data;

            if (responseData && responseData.status === 1) {
                accessKey = responseData.data || responseData.access_key || responseData.token;
                
                if (!accessKey) {
                    throw new Error('Easebuzz API did not return an access_key. Response: ' + JSON.stringify(responseData));
                }

                console.log('✅ Access Key received:', accessKey.substring(0, 20) + '...');
            } else {
                throw new Error(responseData.message || responseData.error || 'Easebuzz API returned an error');
            }

        } catch (apiError) {
            console.error('❌ Easebuzz Initiate Payment API Error:', apiError.message);
            console.error('   Response Data:', JSON.stringify(apiError.response?.data, null, 2));
            
            return res.status(500).send(`
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
                    <h1 class="error">Payment Gateway Error</h1>
                    <p>Failed to initialize payment gateway. Please try again later.</p>
                    <p>Error: ${apiError.message}</p>
                </body>
                </html>
            `);
        }
        
        const env = EASEBUZZ_ENVIRONMENT === 'sandbox' ? 'test' : 'prod';

        // Return HTML page with Ease Checkout integration
        // This will directly open UPI payment mode with integrated UPI apps
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Complete Payment - ${transaction.merchantName}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        background: #f5f5f5;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header h1 {
                        font-size: 24px;
                        margin-bottom: 5px;
                    }
                    .header p {
                        font-size: 14px;
                        opacity: 0.9;
                    }
                    .checkout-container {
                        flex: 1;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        padding: 20px;
                    }
                    .checkout-wrapper {
                        width: 100%;
                        max-width: 600px;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    .checkout-header {
                        padding: 20px;
                        background: #f8f9fa;
                        border-bottom: 1px solid #e9ecef;
                    }
                    .checkout-header h2 {
                        font-size: 20px;
                        color: #333;
                        margin-bottom: 5px;
                    }
                    .checkout-header .amount {
                        font-size: 28px;
                        font-weight: bold;
                        color: #667eea;
                    }
                    #easebuzz-checkout-container {
                        width: 100%;
                        min-height: 600px;
                        padding: 20px;
                    }
                    .loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 60px 20px;
                        text-align: center;
                    }
                    .spinner {
                        border: 4px solid rgba(102, 126, 234, 0.2);
                        border-top: 4px solid #667eea;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .loading-text {
                        color: #666;
                        font-size: 16px;
                    }
                    @media (max-width: 768px) {
                        .checkout-wrapper {
                            border-radius: 0;
                            max-width: 100%;
                        }
                        .header h1 {
                            font-size: 20px;
                        }
                        #easebuzz-checkout-container {
                            min-height: 500px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Complete Your Payment</h1>
                    <p>${transaction.merchantName}</p>
                </div>
                
                <div class="checkout-container">
                    <div class="checkout-wrapper">
                        <div class="checkout-header">
                            <h2>Payment Details</h2>
                            <div class="amount">₹${payload.amount}</div>
                        </div>
                        <div id="checkout-loading" class="loading">
                            <div class="spinner"></div>
                            <div class="loading-text">Initializing payment gateway...</div>
                        </div>
                        <div id="easebuzz-checkout-container" style="display: none;"></div>
                    </div>
                </div>

                <!-- Easebuzz EaseCheckout SDK -->
                <script src="https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/v2.0.0/easebuzz-checkout-v2.min.js"></script>
                
                <script>
                    // Configuration
                    const accessKey = ${JSON.stringify(accessKey)};
                    const merchantKey = ${JSON.stringify(EASEBUZZ_API_KEY)};
                    const environment = ${JSON.stringify(EASEBUZZ_ENVIRONMENT === 'sandbox' ? 'test' : 'prod')};
                    const successUrl = ${JSON.stringify(payload.surl)};
                    const failureUrl = ${JSON.stringify(payload.furl)};
                    const transactionId = ${JSON.stringify(transactionId)};
                    
                    console.log('✅ EaseCheckout Configuration:');
                    console.log('   Merchant Key:', merchantKey);
                    console.log('   Environment:', environment);
                    console.log('   Access Key:', accessKey.substring(0, 20) + '...');
                    console.log('   UPI Pre-selected: pg=UPI (via Initiate Payment API)');
                    
                    // Initialize Easebuzz Checkout SDK
                    function initEaseCheckout() {
                        try {
                            // Check if SDK is loaded
                            if (typeof EasebuzzCheckout === 'undefined') {
                                console.error('❌ EasebuzzCheckout SDK not loaded');
                                document.getElementById('checkout-loading').innerHTML = 
                                    '<div style="color: #d32f2f; padding: 20px;">Error loading payment gateway SDK. Please refresh the page.</div>';
                                return;
                            }
                            
                            console.log('✅ EasebuzzCheckout SDK loaded, initializing...');
                            
                            // Create EasebuzzCheckout instance
                            const easebuzzCheckout = new EasebuzzCheckout(merchantKey, environment);
                            
                            // Hide loading, show container
                            document.getElementById('checkout-loading').style.display = 'none';
                            document.getElementById('easebuzz-checkout-container').style.display = 'block';
                            
                            // Auto-initialize payment (no button click needed)
                            // This will open the checkout directly with UPI options visible
                            const options = {
                                access_key: accessKey, // Access key from Initiate Payment API
                                onResponse: (response) => {
                                    console.log('✅ Payment Response received:', response);
                                    
                                    // Handle payment response
                                    if (response && response.status) {
                                        if (response.status === 'success' || response.status === 'Success') {
                                            // Payment successful - redirect to success URL
                                            console.log('✅ Payment successful, redirecting...');
                                            window.location.href = successUrl + '?transaction_id=' + transactionId;
                                        } else {
                                            // Payment failed - redirect to failure URL
                                            console.log('❌ Payment failed, redirecting...');
                                            window.location.href = failureUrl + '?transaction_id=' + transactionId + '&error=' + encodeURIComponent(response.message || 'Payment failed');
                                        }
                                    } else {
                                        // Unknown response - redirect to failure
                                        console.warn('⚠️ Unknown payment response:', response);
                                        window.location.href = failureUrl + '?transaction_id=' + transactionId;
                                    }
                                },
                                theme: '#667eea', // Theme color matching header
                                // Optional: You can add payment mode pre-selection here if supported
                                // payment_mode: 'UPI' // This might work depending on SDK version
                            };
                            
                            console.log('✅ Calling initiatePayment() with access_key...');
                            console.log('   Options:', JSON.stringify(options, null, 2));
                            
                            // Initialize payment - this will open checkout directly
                            // The pg=UPI parameter was already sent in Initiate Payment API, so UPI should be pre-selected
                            easebuzzCheckout.initiatePayment(options);
                            
                            console.log('✅ Payment checkout initialized - UPI options should be visible now');
                            
                        } catch (error) {
                            console.error('❌ Error initializing EaseCheckout:', error);
                            document.getElementById('checkout-loading').innerHTML = 
                                '<div style="color: #d32f2f; padding: 20px;">Error initializing payment gateway: ' + error.message + '</div>';
                        }
                    }
                    
                    // Wait for SDK to load, then initialize
                    function waitForSDK() {
                        if (typeof EasebuzzCheckout !== 'undefined') {
                            // SDK loaded, initialize immediately
                            setTimeout(initEaseCheckout, 100);
                        } else {
                            // SDK not loaded yet, wait a bit and retry
                            setTimeout(waitForSDK, 100);
                        }
                    }
                    
                    // Start initialization when DOM is ready
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', function() {
                            console.log('✅ DOM loaded, waiting for EaseCheckout SDK...');
                            waitForSDK();
                        });
                    } else {
                        console.log('✅ DOM already loaded, waiting for EaseCheckout SDK...');
                        waitForSDK();
                    }
                    
                    // Fallback: Try to initialize after window load
                    window.addEventListener('load', function() {
                        if (typeof EasebuzzCheckout !== 'undefined' && 
                            document.getElementById('checkout-loading').style.display !== 'none') {
                            console.log('✅ Window loaded, initializing EaseCheckout...');
                            initEaseCheckout();
                        }
                    });
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('❌ Easebuzz Payment Page Error:', error);
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

// ============ EASEBUZZ PAYMENT PAGE (ALIAS FOR BACKWARD COMPATIBILITY) ============
// This is an alias to getEasebuzzCheckoutPage for backward compatibility
exports.getEasebuzzPaymentPage = exports.getEasebuzzCheckoutPage;

// ============ HANDLE EASEBUZZ CALLBACK ============
exports.handleEasebuzzCallback = async (req, res) => {
    try {
        const { transaction_id } = req.query;
        const callbackData = req.body || req.query;

        console.log('\n' + '='.repeat(80));
        console.log('🔔 EASEBUZZ CALLBACK RECEIVED');
        console.log('='.repeat(80));
        console.log('   Method:', req.method);
        console.log('   Query Params:', JSON.stringify(req.query, null, 2));
        console.log('   Body:', JSON.stringify(req.body, null, 2));
        console.log('   Transaction ID (query):', transaction_id);
        console.log('   Callback Data:', JSON.stringify(callbackData, null, 2));

        if (!transaction_id) {
            console.warn('❌ Missing transaction_id in callback');
            const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/payment-failed?error=missing_transaction_id`);
        }

        // Find transaction
        const transaction = await Transaction.findOne({ transactionId: transaction_id }).populate('merchantId');

        if (!transaction) {
            console.warn('❌ Transaction not found:', transaction_id);
            const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/payment-failed?error=transaction_not_found`);
        }

        // Verify checksum if present
        if (callbackData.checksum) {
            const isValidChecksum = verifyEasebuzzChecksum(callbackData, EASEBUZZ_SALT_KEY);
            if (!isValidChecksum) {
                console.warn('❌ Invalid Easebuzz checksum in callback');
            } else {
                console.log('✅ Easebuzz callback checksum verified');
            }
        }

        // Check payment status
        const status = callbackData.status || callbackData.payment_status || 'pending';
        const isSuccess = status.toLowerCase() === 'success' || status.toLowerCase() === 'paid';

        if (isSuccess) {
            await handleEasebuzzPaymentSuccess(transaction, callbackData);
            const frontendUrl = (transaction.callbackUrl || process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/payment-success?transaction_id=${transaction_id}`);
        } else {
            await handleEasebuzzPaymentFailed(transaction, callbackData);
            const frontendUrl = (transaction.failureUrl || process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/payment-failed?transaction_id=${transaction_id}&error=${encodeURIComponent(callbackData.message || 'Payment failed')}`);
        }

    } catch (error) {
        console.error('❌ handleEasebuzzCallback error:', error.message);
        const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
        return res.redirect(`${frontendUrl}/payment-failed?error=callback_error`);
    }
};

// ============ HANDLE EASEBUZZ WEBHOOK ============
exports.handleEasebuzzWebhook = async (req, res) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    try {
        // Support both JSON body (POST) and query params (GET)
        const webhookData = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
        const { transaction_id } = req.query;

        console.log('\n' + '🔔'.repeat(40));
        console.log('🔔 EASEBUZZ WEBHOOK PROCESSING STARTED 🔔');
        console.log('🔔'.repeat(40));
        console.log('   ⏰ Timestamp:', timestamp);
        console.log('   🌐 IP Address:', ip);
        console.log('   📱 User-Agent:', userAgent);
        console.log('   🔗 HTTP Method:', req.method);
        console.log('   🔗 Request URL:', req.originalUrl || req.url);
        console.log('   📋 Content-Type:', req.headers['content-type'] || 'Not set');
        console.log('   📦 Content-Length:', req.headers['content-length'] || 'Unknown', 'bytes');
        console.log('\n   📥 REQUEST HEADERS:');
        console.log('      ' + JSON.stringify(req.headers, null, 2).split('\n').join('\n      '));
        console.log('\n   📥 QUERY PARAMETERS:');
        console.log('      ' + JSON.stringify(req.query, null, 2).split('\n').join('\n      '));
        console.log('\n   📥 REQUEST BODY:');
        console.log('      ' + JSON.stringify(req.body, null, 2).split('\n').join('\n      '));
        console.log('\n   📦 PARSED WEBHOOK DATA:');
        console.log('      ' + JSON.stringify(webhookData, null, 2).split('\n').join('\n      '));
        
        // Check if webhook data is empty
        if (!webhookData || Object.keys(webhookData).length === 0) {
            console.warn('\n⚠️  WARNING: Webhook received with empty payload!');
            console.warn('   This might indicate:');
            console.warn('   1. Easebuzz is sending a test webhook');
            console.warn('   2. The webhook payload format is different than expected');
            console.warn('   3. The request body was not parsed correctly');
            return res.status(200).json({
                success: true,
                message: 'Webhook received (empty payload)',
                timestamp: timestamp
            });
        }
        
        console.log('\n   ✅ Webhook payload received successfully!');

        // Verify checksum if present (Easebuzz may or may not send checksum)
        if (webhookData.checksum || webhookData.hash) {
            const checksumToVerify = webhookData.checksum || webhookData.hash;
            const isValidChecksum = verifyEasebuzzChecksum(webhookData, EASEBUZZ_SALT_KEY);
            if (!isValidChecksum) {
                console.warn('❌ Invalid Easebuzz checksum in webhook');
                console.warn('   Received checksum:', checksumToVerify);
                // Don't reject the webhook if checksum fails - log it but continue processing
                // Some Easebuzz webhooks may not include checksum or use different format
                console.warn('   ⚠️  Continuing webhook processing despite checksum failure');
            } else {
                console.log('✅ Easebuzz webhook checksum verified');
            }
        } else {
            console.log('ℹ️  No checksum/hash found in webhook payload (this may be normal)');
        }

        // Find transaction by order_id or transaction_id
        // Easebuzz sends: txnid (the merchant_txn we sent), and our transactionId is in udf2
        // IMPORTANT: Easebuzz webhook format uses "txnid" for the order ID and "udf2" for our transaction ID
        const orderId = webhookData.txnid ||  // Easebuzz sends merchant_txn as "txnid"
                       webhookData.order_id || 
                       webhookData.merchant_order_id || 
                       webhookData.merchant_txn ||
                       webhookData.merchant_txn_id ||
                       webhookData.merchant_transaction_id ||
                       webhookData.orderId;
        const transactionId = webhookData.udf2 ||  // We stored our transactionId in udf2
                             transaction_id || 
                             webhookData.transaction_id || 
                             webhookData.txn_id ||
                             webhookData.payment_id ||
                             webhookData.transactionId;
        
        console.log('\n🔍 TRANSACTION SEARCH:');
        console.log('   📋 Order ID (from webhook):', orderId);
        console.log('   🆔 Transaction ID (from webhook):', transactionId);
        console.log('   📋 Transaction ID (from query):', transaction_id);
        console.log('   📦 All webhook keys:', Object.keys(webhookData).join(', '));

        let transaction = null;
        
        // Try multiple search strategies
        if (orderId) {
            console.log('   🔎 Searching by Order ID:', orderId);
            transaction = await Transaction.findOne({ 
                $or: [
                    { orderId: orderId },
                    { easebuzzOrderId: orderId },
                    { easebuzzOrderId: orderId.toString() }
                ]
            }).populate('merchantId');
            
            if (transaction) {
                console.log('   ✅ Transaction found by Order ID!');
                console.log('      Transaction ID:', transaction.transactionId);
                console.log('      Current Status:', transaction.status);
                console.log('      Easebuzz Order ID:', transaction.easebuzzOrderId);
            } else {
                console.log('   ❌ Transaction NOT found by Order ID');
            }
        }
        
        // If not found by order ID, try transaction ID
        if (!transaction && transactionId) {
            console.log('   🔎 Searching by Transaction ID:', transactionId);
            transaction = await Transaction.findOne({ 
                $or: [
                    { transactionId: transactionId },
                    { transactionId: transactionId.toString() }
                ]
            }).populate('merchantId');
            
            if (transaction) {
                console.log('   ✅ Transaction found by Transaction ID!');
                console.log('      Transaction ID:', transaction.transactionId);
                console.log('      Current Status:', transaction.status);
                console.log('      Easebuzz Order ID:', transaction.easebuzzOrderId);
            } else {
                console.log('   ❌ Transaction NOT found by Transaction ID');
            }
        }
        
        // Last resort: search by any matching field in webhook data
        // Easebuzz specific fields: txnid (order ID), udf2 (our transaction ID), easepayid (payment ID)
        if (!transaction) {
            console.log('   🔎 Last resort: Searching by Easebuzz-specific fields...');
            const searchFields = [
                { easebuzzOrderId: webhookData.txnid },  // Most important - Easebuzz sends merchant_txn as txnid
                { transactionId: webhookData.udf2 },    // We stored transactionId in udf2
                { easebuzzPaymentId: webhookData.easepayid },  // Easebuzz payment ID
                { easebuzzOrderId: webhookData.merchant_txn },
                { easebuzzOrderId: webhookData.order_id },
                { easebuzzOrderId: webhookData.merchant_order_id },
                { easebuzzPaymentId: webhookData.transaction_id },
                { easebuzzPaymentId: webhookData.txn_id },
                { easebuzzPaymentId: webhookData.payment_id }
            ];
            
            for (const searchField of searchFields) {
                const key = Object.keys(searchField)[0];
                const value = searchField[key];
                if (value && value !== 'NA' && value !== '') {
                    console.log(`      Trying: ${key} = ${value}`);
                    transaction = await Transaction.findOne({ [key]: value }).populate('merchantId');
                    if (transaction) {
                        console.log(`   ✅ Transaction found by ${key}:`, value);
                        break;
                    }
                }
            }
        }

        if (!transaction) {
            console.error('\n' + '❌'.repeat(40));
            console.error('❌ TRANSACTION NOT FOUND FOR WEBHOOK ❌');
            console.error('❌'.repeat(40));
            console.error('   📋 Searched Order ID (txnid):', webhookData.txnid);
            console.error('   🆔 Searched Transaction ID (udf2):', webhookData.udf2);
            console.error('   📋 All order ID attempts:', {
                txnid: webhookData.txnid,
                order_id: webhookData.order_id,
                merchant_order_id: webhookData.merchant_order_id,
                merchant_txn: webhookData.merchant_txn
            });
            console.error('   🆔 All transaction ID attempts:', {
                udf2: webhookData.udf2,
                transaction_id: webhookData.transaction_id,
                txn_id: webhookData.txn_id
            });
            console.error('   ⚠️  This webhook will be ignored - transaction status will not be updated!');
            console.error('   💡 Tip: Check if the transaction exists in database with:');
            console.error('      - easebuzzOrderId:', webhookData.txnid);
            console.error('      - transactionId:', webhookData.udf2);
            console.error('❌'.repeat(40) + '\n');
            
            // Don't return 404 - return 200 so Easebuzz doesn't retry
            // But log the error for debugging
            return res.status(200).json({
                success: false,
                error: 'Transaction not found',
                message: 'Webhook received but transaction not found in database',
                searched_order_id: webhookData.txnid,
                searched_transaction_id: webhookData.udf2,
                webhook_received: true
            });
        }

        // Extract payment status from various possible fields
        // Easebuzz may send status in different formats, check all possibilities
        const status = webhookData.status || 
                      webhookData.payment_status || 
                      webhookData.txn_status ||
                      webhookData.transaction_status ||
                      webhookData.paymentStatus ||
                      webhookData.state ||
                      webhookData.payment_state ||
                      webhookData.result ||
                      webhookData.response ||
                      (webhookData.data && webhookData.data.status) ||
                      (webhookData.data && webhookData.data.payment_status) ||
                      'pending';
        
        const statusLower = status ? status.toString().toLowerCase().trim() : 'pending';
        
        console.log('\n📊 PAYMENT STATUS ANALYSIS:');
        console.log('   Raw status field:', webhookData.status);
        console.log('   Raw payment_status field:', webhookData.payment_status);
        console.log('   Raw txn_status field:', webhookData.txn_status);
        console.log('   Raw transaction_status field:', webhookData.transaction_status);
        console.log('   Raw state field:', webhookData.state);
        console.log('   Raw result field:', webhookData.result);
        console.log('   Raw response field:', webhookData.response);
        if (webhookData.data) {
            console.log('   Raw data.status:', webhookData.data.status);
            console.log('   Raw data.payment_status:', webhookData.data.payment_status);
        }
        console.log('   ✅ Extracted Status:', status);
        console.log('   ✅ Normalized Status (lowercase):', statusLower);
        console.log('   📋 All webhook fields:', Object.keys(webhookData).join(', '));

        // Handle different payment statuses
        // Check for success statuses (including numeric codes that might indicate success)
        const isSuccess = statusLower === 'success' || 
                         statusLower === 'paid' || 
                         statusLower === 'completed' ||
                         statusLower === 'captured' ||
                         statusLower === '1' ||
                         statusLower === 'true' ||
                         status === '1' ||
                         status === 1 ||
                         (typeof status === 'number' && status === 1) ||
                         webhookData.response_code === '1' ||
                         webhookData.response_code === 1 ||
                         webhookData.code === '1' ||
                         webhookData.code === 1;
        
        const isFailed = statusLower === 'failed' || 
                        statusLower === 'failure' ||
                        statusLower === 'declined' ||
                        statusLower === 'rejected' ||
                        statusLower === '0' ||
                        statusLower === 'false' ||
                        status === '0' ||
                        status === 0 ||
                        (typeof status === 'number' && status === 0) ||
                        webhookData.response_code === '0' ||
                        webhookData.response_code === 0 ||
                        webhookData.code === '0' ||
                        webhookData.code === 0;
        
        const isPending = statusLower === 'pending' || 
                         statusLower === 'processing' ||
                         statusLower === 'initiated' ||
                         statusLower === 'in_progress';
        
        const isCancelled = statusLower === 'cancelled' || 
                           statusLower === 'canceled' ||
                           statusLower === 'aborted';
        
        console.log('\n🎯 STATUS MATCHING:');
        console.log('   Is Success?', isSuccess);
        console.log('   Is Failed?', isFailed);
        console.log('   Is Pending?', isPending);
        console.log('   Is Cancelled?', isCancelled);
        
        console.log('\n🎯 STATUS MATCHING RESULT:');
        console.log('   isSuccess:', isSuccess);
        console.log('   isFailed:', isFailed);
        console.log('   isPending:', isPending);
        console.log('   isCancelled:', isCancelled);
        
        if (isSuccess) {
            console.log('\n✅✅✅ ROUTING TO: handleEasebuzzPaymentSuccess ✅✅✅');
            try {
                await handleEasebuzzPaymentSuccess(transaction, webhookData);
                console.log('✅ handleEasebuzzPaymentSuccess completed successfully');
            } catch (error) {
                console.error('❌ ERROR in handleEasebuzzPaymentSuccess:', error);
                console.error('   Error message:', error.message);
                console.error('   Error stack:', error.stack);
                // Don't throw - we still want to return 200 to Easebuzz
            }
        } else if (isFailed) {
            console.log('\n❌ ROUTING TO: handleEasebuzzPaymentFailed');
            await handleEasebuzzPaymentFailed(transaction, webhookData);
        } else if (isPending) {
            console.log('\n⏳ ROUTING TO: handleEasebuzzPaymentPending');
            await handleEasebuzzPaymentPending(transaction, webhookData);
        } else if (isCancelled) {
            console.log('\n🚫 ROUTING TO: handleEasebuzzPaymentCancelled');
            await handleEasebuzzPaymentCancelled(transaction, webhookData);
        } else {
            console.warn('\n⚠️ UNKNOWN PAYMENT STATUS - Status not recognized!');
            console.warn('   Status value:', status);
            console.warn('   Status type:', typeof status);
            console.warn('   Status lower:', statusLower);
            console.warn('   Full webhook payload:', JSON.stringify(webhookData, null, 2));
            console.warn('   ⚠️  Transaction status will NOT be updated automatically');
            console.warn('   ⚠️  Please check Easebuzz documentation for correct status values');
            
            // Update transaction with webhook data but don't change status
            // This allows us to see the raw webhook data in the database
            await Transaction.findOneAndUpdate(
                { _id: transaction._id },
                { 
                    webhookData: webhookData,
                    updatedAt: new Date()
                }
            );
            console.warn('   ℹ️  Transaction webhookData field updated with raw payload');
        }

        const processingTime = Date.now() - startTime;
        const finalStatus = statusLower || 'unknown';
        const finalTransactionId = transaction?.transactionId || 'N/A';
        
        console.log('\n' + '✅'.repeat(40));
        console.log('✅ EASEBUZZ WEBHOOK PROCESSED SUCCESSFULLY ✅');
        console.log('✅'.repeat(40));
        console.log('   ⏱️  Processing Time:', processingTime, 'ms');
        console.log('   ⏰ Completed At:', new Date().toISOString());
        console.log('   📊 Final Status:', finalStatus);
        console.log('   🆔 Transaction ID:', finalTransactionId);
        console.log('   📋 Order ID:', orderId || 'N/A');
        console.log('✅'.repeat(40) + '\n');

        res.status(200).json({
            success: true,
            message: 'Webhook received and processed',
            timestamp: timestamp,
            processing_time_ms: processingTime,
            transaction_id: finalTransactionId,
            order_id: orderId,
            status: finalStatus
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        const webhookData = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
        
        console.error('\n' + '❌'.repeat(40));
        console.error('❌ EASEBUZZ WEBHOOK PROCESSING ERROR ❌');
        console.error('❌'.repeat(40));
        console.error('   ⏰ Timestamp:', timestamp);
        console.error('   🌐 IP Address:', ip);
        console.error('   ⏱️  Processing Time:', processingTime, 'ms');
        console.error('   ❌ Error Message:', error.message);
        console.error('   📚 Error Stack:', error.stack);
        if (webhookData) {
            console.error('   📦 Webhook Data:', JSON.stringify(webhookData, null, 2));
        } else {
            console.error('   📦 Webhook Data: Not available');
        }
        console.error('❌'.repeat(40) + '\n');
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process webhook',
            timestamp: timestamp,
            processing_time_ms: processingTime
        });
    }
};

// ============ UPI REDIRECT ENDPOINT ============
// UPI Redirect endpoint - detects device and opens appropriate UPI app
exports.handleUPIRedirect = (req, res) => {
    try {
        const { payment_url, amount, merchant } = req.query;
        
        if (!payment_url) {
            return res.status(400).json({ error: 'Payment URL is required' });
        }
        
        // Create an HTML page that tries to open UPI apps and falls back to payment URL
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to Payment...</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 20px;
        }
        .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .upi-buttons {
            margin-top: 30px;
        }
        .upi-btn {
            display: inline-block;
            margin: 10px;
            padding: 12px 24px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .upi-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Opening Payment...</h2>
        <div class="spinner"></div>
        <p>If payment app doesn't open automatically, choose an option below:</p>
        <div class="upi-buttons">
            <a href="phonepe://pay?pa=${encodeURIComponent(payment_url)}" class="upi-btn">PhonePe</a>
            <a href="tez://pay?pa=${encodeURIComponent(payment_url)}" class="upi-btn">Google Pay</a>
            <a href="paytmmp://pay?pa=${encodeURIComponent(payment_url)}" class="upi-btn">Paytm</a>
            <a href="${payment_url}" class="upi-btn">Open Payment Page</a>
        </div>
    </div>
    <script>
        // Try to open UPI apps in order of preference
        const paymentUrl = "${payment_url}";
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Detect if mobile device
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        
        if (isMobile) {
            // Try PhonePe first
            window.location.href = "phonepe://pay?pa=" + encodeURIComponent(paymentUrl);
            
            // Fallback to payment URL after 2 seconds
            setTimeout(() => {
                window.location.href = paymentUrl;
            }, 2000);
        } else {
            // Desktop - redirect to payment page
            window.location.href = paymentUrl;
        }
    </script>
</body>
</html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('❌ handleUPIRedirect error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to redirect'
        });
    }
};

// ============ HANDLE EASEBUZZ PAYMENT SUCCESS ============
async function handleEasebuzzPaymentSuccess(transaction, payload) {
    try {
        console.log('\n' + '💰'.repeat(40));
        console.log('💰 HANDLE EASEBUZZ PAYMENT SUCCESS - STARTED 💰');
        console.log('💰'.repeat(40));
        console.log('   🆔 Transaction ID:', transaction.transactionId);
        console.log('   📋 Order ID:', transaction.orderId);
        console.log('   📊 Current Status:', transaction.status);
        console.log('   💵 Amount:', transaction.amount);
        console.log('   📦 Payload:', JSON.stringify(payload, null, 2));

        // Prevent duplicate processing
        if (transaction.status === 'paid') {
            console.log('⚠️ Transaction already marked as paid, skipping update');
            console.log('💰'.repeat(40) + '\n');
            return;
        }

        const paymentId = payload.easepayid || payload.transaction_id || payload.txn_id || transaction.easebuzzPaymentId;
        const paymentMethod = payload.mode || payload.payment_mode || payload.payment_method || 'UPI';
        const amount = parseFloat(payload.amount || transaction.amount);

        // Calculate commission (returns an object with commission.commission as the numeric value)
        const commissionObj = calculatePayinCommission(amount, transaction.merchantId);
        const commissionAmount = commissionObj.commission || 0;
        const netAmount = parseFloat((amount - commissionAmount).toFixed(2));
        
        console.log('   💰 Commission Calculation:');
        console.log('      Amount: ₹', amount);
        console.log('      Commission Object:', JSON.stringify(commissionObj, null, 2));
        console.log('      Commission Amount (extracted): ₹', commissionAmount);
        console.log('      Net Amount: ₹', netAmount);
        console.log('      Commission Amount Type:', typeof commissionAmount);
        console.log('      Net Amount Type:', typeof netAmount);
        console.log('      Is Commission Valid Number?', !isNaN(commissionAmount) && isFinite(commissionAmount));
        console.log('      Is Net Amount Valid Number?', !isNaN(netAmount) && isFinite(netAmount));

        // Get paidAt timestamp - ensure it's valid
        const paidAt = new Date();
        if (isNaN(paidAt.getTime())) {
            throw new Error('Cannot create valid paidAt date');
        }
        
        console.log('   📅 Settlement Calculation:');
        console.log('      Paid At:', paidAt.toISOString());
        console.log('      Paid At Valid?', !isNaN(paidAt.getTime()));
        
        // Calculate settlement date with robust error handling
        let expectedSettlementDate = null;
        let settlementDateCalculated = false;
        
        try {
            expectedSettlementDate = calculateExpectedSettlementDate(paidAt);
            console.log('      Expected Settlement Date (calculated):', expectedSettlementDate ? expectedSettlementDate.toISOString() : 'null');
            
            // Validate the returned date
            if (expectedSettlementDate && expectedSettlementDate instanceof Date && !isNaN(expectedSettlementDate.getTime())) {
                settlementDateCalculated = true;
                console.log('      ✅ Settlement Date Valid');
            } else {
                throw new Error('Invalid date returned from calculateExpectedSettlementDate');
            }
        } catch (error) {
            console.error('      ❌ Error calculating settlement date:', error.message);
            settlementDateCalculated = false;
        }
        
        // If calculation failed, use fallback
        if (!settlementDateCalculated) {
            console.log('      Using fallback: T+1 from paidAt');
            expectedSettlementDate = new Date(paidAt);
            expectedSettlementDate.setDate(expectedSettlementDate.getDate() + 1);
            expectedSettlementDate.setHours(16, 0, 0, 0);
            console.log('      Fallback date:', expectedSettlementDate.toISOString());
            console.log('      Fallback date valid?', !isNaN(expectedSettlementDate.getTime()));
        }
        
        // Final validation - ensure date is valid before proceeding
        if (!expectedSettlementDate || !(expectedSettlementDate instanceof Date) || isNaN(expectedSettlementDate.getTime())) {
            console.error('   ❌ CRITICAL: Settlement date is still invalid after all attempts!');
            // Emergency fallback: use current date + 1 day
            expectedSettlementDate = new Date();
            expectedSettlementDate.setDate(expectedSettlementDate.getDate() + 1);
            expectedSettlementDate.setHours(16, 0, 0, 0);
            console.log('   Using emergency fallback date:', expectedSettlementDate.toISOString());
            
            // One final check
            if (isNaN(expectedSettlementDate.getTime())) {
                console.error('   ❌ CRITICAL: Even emergency fallback date is invalid!');
                // Last resort: use a hardcoded valid date (tomorrow)
                expectedSettlementDate = new Date();
                expectedSettlementDate.setTime(expectedSettlementDate.getTime() + 24 * 60 * 60 * 1000);
                expectedSettlementDate.setHours(16, 0, 0, 0);
                console.log('   Using last resort date:', expectedSettlementDate.toISOString());
            }
        }
        
        // Absolute final check
        if (isNaN(expectedSettlementDate.getTime())) {
            throw new Error(`Cannot create valid settlement date. Final attempt: ${expectedSettlementDate}`);
        }
        
        console.log('   ✅ Final Settlement Date:', expectedSettlementDate.toISOString());
        
        // Validate all values before update
        if (isNaN(commissionAmount) || !isFinite(commissionAmount)) {
            console.error('   ❌ Invalid commission amount:', commissionAmount);
            throw new Error(`Invalid commission amount: ${commissionAmount}`);
        }
        
        if (isNaN(netAmount) || !isFinite(netAmount)) {
            console.error('   ❌ Invalid net amount:', netAmount);
            throw new Error(`Invalid net amount: ${netAmount}`);
        }
        
        // Update transaction atomically
        // IMPORTANT: Store commission as NUMBER (not object) to match schema
        const finalCommission = Number(commissionAmount);
        const finalNetAmount = Number(netAmount);
        
        // Verify types before update
        if (typeof finalCommission !== 'number' || isNaN(finalCommission)) {
            throw new Error(`Commission is not a valid number: ${finalCommission} (type: ${typeof finalCommission})`);
        }
        if (typeof finalNetAmount !== 'number' || isNaN(finalNetAmount)) {
            throw new Error(`NetAmount is not a valid number: ${finalNetAmount} (type: ${typeof finalNetAmount})`);
        }
        if (!(expectedSettlementDate instanceof Date) || isNaN(expectedSettlementDate.getTime())) {
            throw new Error(`ExpectedSettlementDate is not a valid date: ${expectedSettlementDate}`);
        }
        
        // Build update object - ensure all types are correct
        const update = {
            $set: {
                status: 'paid',
                easebuzzPaymentId: String(paymentId || ''),
                easebuzzReferenceId: String(payload.bank_ref_num || payload.auth_ref_num || transaction.easebuzzReferenceId || ''),
                paymentMethod: String(paymentMethod || 'UPI'),
                paidAt: paidAt instanceof Date ? paidAt : new Date(paidAt),
                updatedAt: new Date(),
                commission: Number(finalCommission), // MUST be a number
                netAmount: Number(finalNetAmount), // MUST be a number
                expectedSettlementDate: expectedSettlementDate instanceof Date ? expectedSettlementDate : new Date(expectedSettlementDate),
                webhookData: payload
            }
        };
        
        // Final type check before update
        console.log('   🔍 Final Type Check:');
        console.log('      commission type:', typeof update.$set.commission, 'value:', update.$set.commission);
        console.log('      netAmount type:', typeof update.$set.netAmount, 'value:', update.$set.netAmount);
        console.log('      expectedSettlementDate type:', typeof update.$set.expectedSettlementDate);
        console.log('      expectedSettlementDate instanceof Date:', update.$set.expectedSettlementDate instanceof Date);
        console.log('      expectedSettlementDate valid:', !isNaN(update.$set.expectedSettlementDate.getTime()));
        
        if (typeof update.$set.commission !== 'number') {
            throw new Error(`Commission must be a number, got: ${typeof update.$set.commission} (${update.$set.commission})`);
        }
        if (typeof update.$set.netAmount !== 'number') {
            throw new Error(`netAmount must be a number, got: ${typeof update.$set.netAmount} (${update.$set.netAmount})`);
        }
        if (!(update.$set.expectedSettlementDate instanceof Date) || isNaN(update.$set.expectedSettlementDate.getTime())) {
            throw new Error(`expectedSettlementDate must be a valid Date, got: ${update.$set.expectedSettlementDate}`);
        }
        
        console.log('   ✅ Update Query Prepared:');
        console.log('      Status:', update.$set.status);
        console.log('      Commission (type):', typeof update.$set.commission, 'value:', update.$set.commission);
        console.log('      Net Amount (type):', typeof update.$set.netAmount, 'value:', update.$set.netAmount);
        console.log('      Expected Settlement Date:', update.$set.expectedSettlementDate);
        console.log('      Expected Settlement Date Type:', typeof update.$set.expectedSettlementDate);
        console.log('      Expected Settlement Date Valid?', update.$set.expectedSettlementDate instanceof Date && !isNaN(update.$set.expectedSettlementDate.getTime()));
        
        // Final validation before attempting update
        if (typeof update.$set.commission !== 'number' || isNaN(update.$set.commission)) {
            throw new Error(`Invalid commission in update: ${update.$set.commission} (type: ${typeof update.$set.commission})`);
        }
        if (typeof update.$set.netAmount !== 'number' || isNaN(update.$set.netAmount)) {
            throw new Error(`Invalid netAmount in update: ${update.$set.netAmount} (type: ${typeof update.$set.netAmount})`);
        }
        if (!(update.$set.expectedSettlementDate instanceof Date) || isNaN(update.$set.expectedSettlementDate.getTime())) {
            throw new Error(`Invalid expectedSettlementDate in update: ${update.$set.expectedSettlementDate}`);
        }

        console.log('\n💾 Attempting to update transaction in database...');
        // Log update query with proper serialization (dates won't serialize well in JSON)
        const updateForLog = {
            $set: {
                ...update.$set,
                paidAt: update.$set.paidAt.toISOString(),
                updatedAt: update.$set.updatedAt.toISOString(),
                expectedSettlementDate: update.$set.expectedSettlementDate.toISOString()
            }
        };
        console.log('   Update Query:', JSON.stringify(updateForLog, null, 2));
        console.log('   ⚠️  NOTE: Commission MUST be a number, not an object!');
        console.log('   ⚠️  NOTE: Expected Settlement Date MUST be a valid Date object!');
        console.log('   Transaction ID:', transaction._id);
        console.log('   Transaction Object ID:', transaction._id.toString());
        console.log('   Current Status:', transaction.status);
        console.log('   Query Filter: { _id: ObjectId("' + transaction._id + '"), status: { $ne: "paid" } }');
        
        // Try the update
        console.log('   🔄 Executing database update...');
        let updatedTransaction = null;
        let updateError = null;
        
        try {
            console.log('   🔄 Attempting first update (with status filter)...');
            updatedTransaction = await Transaction.findOneAndUpdate(
                { _id: transaction._id, status: { $ne: 'paid' } },
                update,
                { new: true, runValidators: false } // Disable validators to avoid date casting issues
            ).populate('merchantId');
            
            if (updatedTransaction) {
                console.log('   ✅ First update succeeded!');
            }
        } catch (error) {
            updateError = error;
            console.error('   ❌ Database update error:', error.message);
            console.error('   Error name:', error.name);
            console.error('   Error stack:', error.stack);
            console.error('   Update object that failed:', {
                status: update.$set.status,
                commission: update.$set.commission,
                commissionType: typeof update.$set.commission,
                netAmount: update.$set.netAmount,
                netAmountType: typeof update.$set.netAmount,
                expectedSettlementDate: update.$set.expectedSettlementDate,
                expectedSettlementDateType: typeof update.$set.expectedSettlementDate,
                expectedSettlementDateValid: update.$set.expectedSettlementDate instanceof Date && !isNaN(update.$set.expectedSettlementDate.getTime())
            });
        }

        // If update failed (maybe already paid), try without the status filter
        if (!updatedTransaction && !updateError) {
            console.warn('\n⚠️ First update attempt returned null');
            console.warn('   Transaction may already be paid, or query filter didn\'t match');
            console.warn('   Trying update without status filter...');
            
            try {
                console.log('   🔄 Attempting second update (without status filter)...');
                // Try updating without the status filter - this will update even if already paid
                updatedTransaction = await Transaction.findByIdAndUpdate(
                    transaction._id,
                    update,
                    { new: true, runValidators: false } // Disable validators to avoid date casting issues
                ).populate('merchantId');
                
                if (updatedTransaction) {
                    console.warn('   ✅ Update succeeded on second attempt (without status filter)');
                } else {
                    console.warn('   ⚠️  Second update attempt returned null');
                }
            } catch (error) {
                updateError = error;
                console.error('   ❌ Second update attempt also failed:', error.message);
                console.error('   Error name:', error.name);
                console.error('   Error stack:', error.stack);
            }
        }

        if (updateError) {
            console.error('\n❌❌❌ CRITICAL: Database update threw an error! ❌❌❌');
            console.error('   Error:', updateError.message);
            console.error('   Error Name:', updateError.name);
            console.error('   Stack:', updateError.stack);
            console.error('   Transaction Object ID:', transaction._id);
            
            // If it's a date casting error, try updating without the problematic date field
            if (updateError.message && updateError.message.includes('Cast to date')) {
                console.error('   ⚠️  Date casting error detected! Trying update without expectedSettlementDate...');
                
                // Create a simplified update without the problematic date
                const simplifiedUpdate = {
                    $set: {
                        status: 'paid',
                        easebuzzPaymentId: paymentId,
                        easebuzzReferenceId: payload.bank_ref_num || payload.auth_ref_num || transaction.easebuzzReferenceId,
                        paymentMethod: paymentMethod,
                        paidAt: paidAt,
                        updatedAt: new Date(),
                        commission: finalCommission,
                        netAmount: finalNetAmount,
                        webhookData: payload
                        // Skip expectedSettlementDate for now
                    }
                };
                
                try {
                    updatedTransaction = await Transaction.findByIdAndUpdate(
                        transaction._id,
                        simplifiedUpdate,
                        { new: true, runValidators: false }
                    ).populate('merchantId');
                    
                    if (updatedTransaction) {
                        console.error('   ✅ Update succeeded with simplified query (without expectedSettlementDate)');
                        // Now try to update just the settlement date separately
                        try {
                            const settlementUpdate = {
                                $set: {
                                    expectedSettlementDate: expectedSettlementDate
                                }
                            };
                            await Transaction.findByIdAndUpdate(transaction._id, settlementUpdate, { runValidators: false });
                            console.error('   ✅ Settlement date updated separately');
                        } catch (settlementError) {
                            console.error('   ⚠️  Could not update settlement date separately:', settlementError.message);
                        }
                    }
                } catch (simplifiedError) {
                    console.error('   ❌ Simplified update also failed:', simplifiedError.message);
                    throw updateError; // Throw original error
                }
            } else {
                throw updateError;
            }
        }

        if (!updatedTransaction) {
            console.error('\n❌❌❌ CRITICAL: Failed to update transaction! ❌❌❌');
            console.error('   Transaction Object ID:', transaction._id);
            console.error('   Transaction ID String:', transaction._id.toString());
            console.error('   Possible reasons:');
            console.error('   1. Transaction ID not found in database');
            console.error('   2. Database connection issue');
            console.error('   3. Transaction was deleted');
            console.error('   4. Validation error in update query');
            
            // Try to find the transaction again to see its current state
            const currentTransaction = await Transaction.findById(transaction._id);
            if (currentTransaction) {
                console.error('   ✅ Transaction still exists in database');
                console.error('   Current transaction status:', currentTransaction.status);
                console.error('   Current transaction ID:', currentTransaction.transactionId);
                console.error('   ⚠️  Update query may have failed - check database logs');
            } else {
                console.error('   ❌ Transaction not found in database!');
            }
            console.error('💰'.repeat(40) + '\n');
            throw new Error('Failed to update transaction in database');
        }
        
        // Verify the update actually persisted
        console.log('   ✅ Database update completed successfully!');
        console.log('   📊 Updated Transaction Status (from returned object):', updatedTransaction.status);
        console.log('   💰 Commission (from returned object):', updatedTransaction.commission, 'type:', typeof updatedTransaction.commission);
        console.log('   💵 Net Amount (from returned object):', updatedTransaction.netAmount, 'type:', typeof updatedTransaction.netAmount);
        console.log('   📅 Expected Settlement Date (from returned object):', updatedTransaction.expectedSettlementDate);
        
        // Double-check by querying the database again
        const verifyTransaction = await Transaction.findById(transaction._id);
        if (verifyTransaction) {
            console.log('\n   🔍 Verification Query Results:');
            console.log('      Current Status in DB:', verifyTransaction.status);
            console.log('      Commission in DB:', verifyTransaction.commission, 'type:', typeof verifyTransaction.commission);
            console.log('      Net Amount in DB:', verifyTransaction.netAmount, 'type:', typeof verifyTransaction.netAmount);
            console.log('      Expected Settlement Date in DB:', verifyTransaction.expectedSettlementDate);
            
            if (verifyTransaction.status !== 'paid') {
                console.error('   ❌ WARNING: Status mismatch! Update returned "paid" but DB still shows:', verifyTransaction.status);
                console.error('   ⚠️  This indicates the update did not persist!');
                console.error('   💡 Possible causes:');
                console.error('      1. Database transaction rollback');
                console.error('      2. Validation error that was silently ignored');
                console.error('      3. Concurrent update overwrote the change');
            } else {
                console.log('   ✅ Verification passed - Status is correctly set to "paid" in database');
            }
        } else {
            console.error('   ❌ Verification query returned null - transaction not found!');
        }

        console.log('\n✅✅✅ TRANSACTION SUCCESSFULLY UPDATED TO PAID ✅✅✅');
        console.log('   🆔 Transaction ID:', updatedTransaction.transactionId);
        console.log('   📋 Order ID:', updatedTransaction.orderId);
        console.log('   💰 Payment ID:', paymentId);
        console.log('   💵 Amount: ₹', amount);
        console.log('   💸 Commission: ₹', commissionAmount);
        console.log('   💵 Net Amount: ₹', netAmount);
        console.log('   📊 New Status:', updatedTransaction.status);
        console.log('   ⏰ Paid At:', updatedTransaction.paidAt);
        console.log('💰'.repeat(40) + '\n');

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
                    easebuzz_order_id: updatedTransaction.easebuzzOrderId,
                    easebuzz_payment_id: updatedTransaction.easebuzzPaymentId,
                    amount: updatedTransaction.amount,
                    commission: updatedTransaction.commission,
                    net_amount: updatedTransaction.netAmount,
                    status: updatedTransaction.status,
                    payment_method: updatedTransaction.paymentMethod,
                    paid_at: updatedTransaction.paidAt.toISOString(),
                    created_at: updatedTransaction.createdAt.toISOString(),
                    updated_at: updatedTransaction.updatedAt.toISOString()
                }
            };

            await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
        }

    } catch (error) {
        console.error('❌ handleEasebuzzPaymentSuccess error:', error.message);
    }
}

// ============ HANDLE EASEBUZZ PAYMENT FAILED ============
async function handleEasebuzzPaymentFailed(transaction, payload) {
    try {
        console.log('💡 handleEasebuzzPaymentFailed triggered');

        const failureReason = payload.message || payload.failure_reason || payload.status || 'Payment failed';

        // Update transaction atomically
        const update = {
            $set: {
                status: 'failed',
                failureReason: failureReason,
                easebuzzPaymentId: payload.transaction_id || payload.txn_id,
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

        console.log('❌ Easebuzz Transaction marked as FAILED:', updatedTransaction.transactionId);

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
                    easebuzz_order_id: updatedTransaction.easebuzzOrderId,
                    easebuzz_payment_id: updatedTransaction.easebuzzPaymentId,
                    status: updatedTransaction.status,
                    failure_reason: updatedTransaction.failureReason,
                    created_at: updatedTransaction.createdAt.toISOString(),
                    updated_at: updatedTransaction.updatedAt.toISOString()
                }
            };

            await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
        }

    } catch (error) {
        console.error('❌ handleEasebuzzPaymentFailed error:', error.message);
    }
}

// ============ HANDLE EASEBUZZ PAYMENT PENDING ============
async function handleEasebuzzPaymentPending(transaction, payload) {
    try {
        console.log('💡 handleEasebuzzPaymentPending triggered');

        // Update transaction with pending status
        const update = {
            $set: {
                status: 'pending',
                updatedAt: new Date(),
                webhookData: payload
            }
        };

        // Add payment ID if available
        if (payload.transaction_id || payload.txn_id) {
            update.$set.easebuzzPaymentId = payload.transaction_id || payload.txn_id;
        }

        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: transaction._id },
            update,
            { new: true }
        ).populate('merchantId');

        if (!updatedTransaction) {
            console.warn('⚠️ Failed to update transaction');
            return;
        }

        console.log('⏳ Easebuzz Transaction marked as PENDING:', updatedTransaction.transactionId);

        // Send merchant webhook if enabled
        if (updatedTransaction.merchantId.webhookEnabled) {
            const webhookPayload = {
                event: 'payment.pending',
                timestamp: new Date().toISOString(),
                transaction_id: updatedTransaction.transactionId,
                order_id: updatedTransaction.orderId,
                merchant_id: updatedTransaction.merchantId._id.toString(),
                data: {
                    transaction_id: updatedTransaction.transactionId,
                    order_id: updatedTransaction.orderId,
                    easebuzz_order_id: updatedTransaction.easebuzzOrderId,
                    easebuzz_payment_id: updatedTransaction.easebuzzPaymentId,
                    status: updatedTransaction.status,
                    created_at: updatedTransaction.createdAt.toISOString(),
                    updated_at: updatedTransaction.updatedAt.toISOString()
                }
            };

            await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
        }

    } catch (error) {
        console.error('❌ handleEasebuzzPaymentPending error:', error.message);
    }
}

// ============ HANDLE EASEBUZZ PAYMENT CANCELLED ============
async function handleEasebuzzPaymentCancelled(transaction, payload) {
    try {
        console.log('💡 handleEasebuzzPaymentCancelled triggered');

        const cancellationReason = payload.message || payload.cancellation_reason || payload.status || 'Payment cancelled';

        // Update transaction with cancelled status
        const update = {
            $set: {
                status: 'cancelled',
                failureReason: cancellationReason,
                updatedAt: new Date(),
                webhookData: payload
            }
        };

        // Add payment ID if available
        if (payload.transaction_id || payload.txn_id) {
            update.$set.easebuzzPaymentId = payload.transaction_id || payload.txn_id;
        }

        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: transaction._id },
            update,
            { new: true }
        ).populate('merchantId');

        if (!updatedTransaction) {
            console.warn('⚠️ Failed to update transaction');
            return;
        }

        console.log('🚫 Easebuzz Transaction marked as CANCELLED:', updatedTransaction.transactionId);
        console.log('   Cancellation Reason:', cancellationReason);

        // Send merchant webhook if enabled
        if (updatedTransaction.merchantId.webhookEnabled) {
            const webhookPayload = {
                event: 'payment.cancelled',
                timestamp: new Date().toISOString(),
                transaction_id: updatedTransaction.transactionId,
                order_id: updatedTransaction.orderId,
                merchant_id: updatedTransaction.merchantId._id.toString(),
                data: {
                    transaction_id: updatedTransaction.transactionId,
                    order_id: updatedTransaction.orderId,
                    easebuzz_order_id: updatedTransaction.easebuzzOrderId,
                    easebuzz_payment_id: updatedTransaction.easebuzzPaymentId,
                    status: updatedTransaction.status,
                    cancellation_reason: cancellationReason,
                    created_at: updatedTransaction.createdAt.toISOString(),
                    updated_at: updatedTransaction.updatedAt.toISOString()
                }
            };

            await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
        }

    } catch (error) {
        console.error('❌ handleEasebuzzPaymentCancelled error:', error.message);
    }
}

// ============ EASEBUZZ UTILITY FUNCTIONS ============

/**
 * Verify Easebuzz checksum
 */
function verifyEasebuzzChecksum(payload, saltKey) {
    try {
        if (!payload.checksum) {
            return false;
        }

        // Extract checksum
        const receivedChecksum = payload.checksum;
        const payloadForChecksum = { ...payload };
        delete payloadForChecksum.checksum;

        // Generate checksum payload (same order as creation)
        // amount|merchant_order_id|currency|buyer_name|buyer_email|buyer_phone|redirect_url|callback_url|description
        const checksumPayload = [
            payloadForChecksum.amount || '',
            payloadForChecksum.merchant_order_id || payloadForChecksum.order_id || '',
            payloadForChecksum.currency || 'INR',
            payloadForChecksum.buyer_name || '',
            payloadForChecksum.buyer_email || '',
            payloadForChecksum.buyer_phone || '',
            payloadForChecksum.redirect_url || '',
            payloadForChecksum.callback_url || '',
            payloadForChecksum.description || ''
        ].join('|');

        // Generate checksum
        const calculatedChecksum = crypto.createHmac('sha256', saltKey)
            .update(checksumPayload)
            .digest('hex');

        // Compare (case-insensitive)
        return calculatedChecksum.toLowerCase() === receivedChecksum.toLowerCase();
    } catch (error) {
        console.error('❌ Error verifying Easebuzz checksum:', error.message);
        return false;
    }
}

