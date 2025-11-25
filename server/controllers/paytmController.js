const crypto = require('crypto');
const axios = require('axios');
const PaytmChecksum = require('../utils/PaytmChecksum'); // Official PaytmChecksum from GitHub
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');

// Paytm Configuration
const PAYTM_MERCHANT_ID = process.env.PAYTM_MERCHANT_ID;
// Handle merchant key with special characters (like #) - trim whitespace and ensure it's not truncated
let PAYTM_MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY;
if (PAYTM_MERCHANT_KEY) {
    PAYTM_MERCHANT_KEY = PAYTM_MERCHANT_KEY.trim();
    // Check if key might be truncated (common issue with # characters in .env)
    if (PAYTM_MERCHANT_KEY.length < 20) {
        console.warn('⚠️ WARNING: PAYTM_MERCHANT_KEY appears to be truncated or too short!');
        console.warn('⚠️ If your key contains # characters, wrap it in quotes in your .env file:');
        console.warn('⚠️ PAYTM_MERCHANT_KEY="#your_full_key_here"');
        console.warn('⚠️ Current key length:', PAYTM_MERCHANT_KEY.length, 'characters');
    }
}
const PAYTM_WEBSITE = process.env.PAYTM_WEBSITE || 'DEFAULT'; // Should match Paytm Dashboard
const PAYTM_INDUSTRY_TYPE = process.env.PAYTM_INDUSTRY_TYPE || 'Retail'; // Should match Paytm Dashboard
const PAYTM_ENVIRONMENT = process.env.PAYTM_ENVIRONMENT || 'production'; // 'staging' or 'production'
// Paytm API URLs - Using NEW host as per Paytm support (Jan 2025)
// IMPORTANT: Old Host (https://securegw.paytm.in) is DEPRECATED and causes issues
// New Host: https://secure.paytmpayments.com (for production)
// New Host: https://securestage.paytmpayments.com (for staging)
const PAYTM_BASE_URL = PAYTM_ENVIRONMENT === 'staging' 
    ? 'https://securestage.paytmpayments.com'
    : 'https://secure.paytmpayments.com';
// Form-based payment URL (also uses new host)
const PAYTM_FORM_URL = PAYTM_ENVIRONMENT === 'staging'
    ? 'https://securestage.paytmpayments.com'
    : 'https://secure.paytmpayments.com';

// ============ GENERATE UPI DEEP LINKS FOR PAYTM ============
/**
 * Generate UPI deep links from Paytm payment URL
 * Similar to Easebuzz implementation
 */
function generatePaytmUPIDeepLinks(paymentUrl, paymentData, req) {
    const amount = paymentData.amount || '0.00';
    const merchantName = paymentData.merchantName || paymentData.merchant_name || paymentData.customer_name || 'Merchant';
    
    // URL encode parameters
    const encode = (str) => encodeURIComponent(str || '');
    
    // Get base URL from request or environment variable
    let baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
    if (!baseUrl && req) {
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:5000';
        baseUrl = `${protocol}://${host}`;
    }
    baseUrl = baseUrl || 'http://localhost:5000';
    
    // Generate deep links for popular UPI apps
    const deepLinks = {
        // Direct Paytm payment URL
        checkout_url: paymentUrl,
        paytm_payment_url: paymentUrl, // Alias for backward compatibility
        
        // Smart redirect link - automatically detects device and opens UPI app
        smart_link: paymentUrl ? `${baseUrl}/api/paytm/upi-redirect?payment_url=${encode(paymentUrl)}&amount=${amount}&merchant=${encode(merchantName)}` : null,
        
        // Direct app deep links (for manual use if needed)
        apps: paymentUrl ? {
            phonepe: `phonepe://pay?url=${encode(paymentUrl)}`,
            googlepay: `tez://pay?url=${encode(paymentUrl)}`,
            paytm: `paytmmp://pay?url=${encode(paymentUrl)}`,
            bhim: `bhim://pay?url=${encode(paymentUrl)}`
        } : null
    };
    
    return deepLinks;
}

// ============ CREATE PAYTM PAYMENT LINK ============
exports.createPaytmPaymentLink = async (req, res) => {
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
        console.log('📤 Paytm Payment Link Creation Request');
        console.log('='.repeat(80));
        console.log('   Merchant:', merchantName, `(${merchantId})`);
        console.log('   Request Body:', JSON.stringify({
            amount,
            customer_name,
            customer_email,
            customer_phone: customer_phone ? customer_phone.substring(0, 3) + '****' + customer_phone.substring(7) : 'N/A',
            description,
            callback_url,
            success_url,
            failure_url
        }, null, 2));
        console.log('   Environment:', PAYTM_ENVIRONMENT);
        console.log('   Base URL:', PAYTM_BASE_URL);

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

        // Validate Paytm credentials
        if (!PAYTM_MERCHANT_ID || !PAYTM_MERCHANT_KEY) {
            console.error('❌ Paytm credentials missing!');
            console.error('   PAYTM_MERCHANT_ID:', PAYTM_MERCHANT_ID ? 'SET' : 'MISSING');
            console.error('   PAYTM_MERCHANT_KEY:', PAYTM_MERCHANT_KEY ? 'SET' : 'MISSING');
            return res.status(500).json({
                success: false,
                error: 'Paytm credentials not configured. Please set PAYTM_MERCHANT_ID and PAYTM_MERCHANT_KEY in environment variables.'
            });
        }

        console.log('✅ Paytm Credentials Check:');
        console.log('   MID:', PAYTM_MERCHANT_ID);
        console.log('   Merchant Key:', PAYTM_MERCHANT_KEY ? PAYTM_MERCHANT_KEY.substring(0, 10) + '...' + PAYTM_MERCHANT_KEY.substring(PAYTM_MERCHANT_KEY.length - 5) : 'MISSING');
        console.log('   Merchant Key Length:', PAYTM_MERCHANT_KEY ? PAYTM_MERCHANT_KEY.length : 0, 'characters');
        if (PAYTM_MERCHANT_KEY && PAYTM_MERCHANT_KEY.length < 20) {
            console.warn('   ⚠️ WARNING: Merchant key is unusually short! Paytm keys are typically 32+ characters.');
            console.warn('   ⚠️ Please verify PAYTM_MERCHANT_KEY in your .env matches your Paytm Dashboard exactly.');
        }
        console.log('   WEBSITE:', PAYTM_WEBSITE);
        console.log('   INDUSTRY_TYPE_ID:', PAYTM_INDUSTRY_TYPE);

        // Generate unique IDs
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const referenceId = `REF_${Date.now()}`;

        // Get merchant's configured URLs or use provided ones
        const merchant = await User.findById(merchantId);

        // Priority: API provided URL > Merchant configured URL > Default URL
        const finalCallbackUrl = callback_url ||
            merchant.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        // Paytm callback URL - points to our callback handler
        const paytmCallbackUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/paytm/callback?transaction_id=${transactionId}`;

        // Prepare Paytm payment request parameters using NEW API structure
        // Based on latest Paytm documentation: https://paytmpayments.com/docs/checksum/
        const amountFormatted = parseFloat(amount).toFixed(2);
        console.log('💰 Amount Formatting:');
        console.log('   Original:', amount);
        console.log('   Parsed:', parseFloat(amount));
        console.log('   Formatted (value):', amountFormatted);

        // NEW Paytm API structure (as per latest documentation)
        const paytmParams = {
            body: {
                requestType: "Payment",
                mid: PAYTM_MERCHANT_ID,
                websiteName: PAYTM_WEBSITE, // Must match Paytm Dashboard
                orderId: orderId,
                callbackUrl: paytmCallbackUrl,
                txnAmount: {
                    value: amountFormatted,
                    currency: "INR"
                },
                userInfo: {
                    custId: `CUST_${customer_phone}_${Date.now()}`,
                    mobile: customer_phone,
                    email: customer_email,
                    firstName: customer_name.split(' ')[0] || customer_name,
                    lastName: customer_name.split(' ').slice(1).join(' ') || ''
                }
            }
        };

        // Also keep old format for form-based submission (if needed)
        const paytmFormParams = {
            MID: PAYTM_MERCHANT_ID,
            ORDER_ID: orderId,
            CUST_ID: `CUST_${customer_phone}_${Date.now()}`,
            INDUSTRY_TYPE_ID: PAYTM_INDUSTRY_TYPE,
            CHANNEL_ID: 'WEB',
            TXN_AMOUNT: amountFormatted,
            WEBSITE: PAYTM_WEBSITE,
            CALLBACK_URL: paytmCallbackUrl,
            EMAIL: customer_email,
            MOBILE_NO: customer_phone
        };

        console.log('\n📋 Paytm Parameters (NEW API Structure):');
        console.log('   body.requestType:', paytmParams.body.requestType);
        console.log('   body.mid:', paytmParams.body.mid);
        console.log('   body.websiteName:', paytmParams.body.websiteName, '(⚠️ MUST match Dashboard)');
        console.log('   body.orderId:', paytmParams.body.orderId);
        console.log('   body.callbackUrl:', paytmParams.body.callbackUrl);
        console.log('   body.txnAmount.value:', paytmParams.body.txnAmount.value);
        console.log('   body.txnAmount.currency:', paytmParams.body.txnAmount.currency);
        console.log('   body.userInfo.custId:', paytmParams.body.userInfo.custId);

        // Generate checksum using NEW API structure (checksum is generated from body only)
        // Using official PaytmChecksum from GitHub (uses AES encryption with salt)
        // As per Paytm docs: generateSignature(JSON.stringify(paytmParams.body), merchantKey)
        console.log('\n🔐 Generating Checksum using official PaytmChecksum (from GitHub)...');
        console.log('   - Generating checksum from JSON.stringify(body) as per Paytm documentation');
        console.log('   - PaytmChecksum uses AES-128-CBC encryption with salt');
        const bodyString = JSON.stringify(paytmParams.body);
        console.log('   - Body JSON string length:', bodyString.length, 'characters');
        const checksum = await PaytmChecksum.generateSignature(bodyString, PAYTM_MERCHANT_KEY);
        
        // Add checksum to head.signature (NEW API structure)
        paytmParams.head = {
            signature: checksum
        };

        console.log('\n✅ Checksum Generated Successfully');
        console.log('   Checksum (first 30 chars):', checksum.substring(0, 30) + '...');
        console.log('   Checksum (last 10 chars):', '...' + checksum.substring(checksum.length - 10));
        console.log('   Checksum Length:', checksum.length, 'characters');

        console.log('\n📦 Final Paytm Parameters (NEW API Structure):');
        const paramsForLog = { ...paytmParams };
        if (paramsForLog.body?.mid) paramsForLog.body.mid = '***HIDDEN***';
        if (paramsForLog.head?.signature) paramsForLog.head.signature = checksum.substring(0, 20) + '...' + checksum.substring(checksum.length - 10);
        console.log(JSON.stringify(paramsForLog, null, 2));

        console.log('\n⚠️ CRITICAL: Verify these match your Paytm Dashboard EXACTLY:');
        console.log('   - websiteName:', paytmParams.body.websiteName, '(case-sensitive, must match Dashboard EXACTLY)');
        console.log('   - mid:', paytmParams.body.mid, '(must match Dashboard)');
        console.log('   - Merchant Key:', PAYTM_MERCHANT_KEY ? `SET (${PAYTM_MERCHANT_KEY.length} chars - verify it matches Dashboard)` : 'MISSING!');
        console.log('\n💡 TROUBLESHOOTING TIPS:');
        console.log('   1. Go to Paytm Dashboard → Settings → API Keys');
        console.log('   2. Check websiteName (might be "DEFAULT", "WEBSTAGING", or custom)');
        console.log('   3. These values are CASE-SENSITIVE and must match EXACTLY');
        console.log('   4. Even a single character difference will cause "Invalid checksum" error');

        console.log('\n📤 Payment Link Details:');
        console.log('   Transaction ID:', transactionId);
        console.log('   Order ID:', orderId);
        console.log('   Amount: ₹', amount, '(formatted as:', amountFormatted + ')');
        console.log('   Paytm API Endpoint:', `${PAYTM_BASE_URL}/theia/api/v1/initiateTransaction`);
        console.log('   Callback URL:', paytmCallbackUrl);
        console.log('   Success Redirect:', finalCallbackUrl);

        // Save transaction to database first
        const transaction = new Transaction({
            transactionId: transactionId,
            orderId: orderId,
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

            // Paytm Data
            paymentGateway: 'paytm',
            paytmOrderId: orderId,
            paytmReferenceId: referenceId,

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

        // Call Paytm NEW API to initiate transaction
        // According to Paytm docs: https://www.paytmpayments.com/docs/jscheckout-initiate-payment
        // Endpoint: /theia/api/v1/initiateTransaction?mid={mid}&orderId={orderId}
        console.log('\n📤 Calling Paytm API to initiate transaction...');
        const initiateUrl = `${PAYTM_BASE_URL}/theia/api/v1/initiateTransaction?mid=${PAYTM_MERCHANT_ID}&orderId=${orderId}`;
        console.log('   API Endpoint:', initiateUrl);
        console.log('   Request Payload:', JSON.stringify(paytmParams, null, 2));

        let txnToken = null;
        let paymentUrl = null;

        try {
            const apiResponse = await axios.post(initiateUrl, paytmParams, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            });

            console.log('✅ Paytm API Response Status:', apiResponse.status);
            console.log('📦 Paytm API Response Head:', JSON.stringify(apiResponse.data?.head, null, 2));
            console.log('📦 Paytm API Response Body:', JSON.stringify(apiResponse.data?.body, null, 2));
            console.log('📦 Paytm API Full Response:', JSON.stringify(apiResponse.data, null, 2));

            const responseData = apiResponse.data;
            
            // Check for errors in response
            if (responseData.body?.resultInfo) {
                const resultStatus = responseData.body.resultInfo.resultStatus;
                const resultCode = responseData.body.resultInfo.resultCode;
                const resultMsg = responseData.body.resultInfo.resultMsg;
                
                console.log('📊 Paytm API Result Info:');
                console.log('   Status:', resultStatus);
                console.log('   Code:', resultCode);
                console.log('   Message:', resultMsg);
                
                if (resultStatus === 'F' || resultStatus === 'U') {
                    console.error('❌ Paytm API returned error:', resultCode, '-', resultMsg);
                    throw new Error(`Paytm API Error: ${resultCode} - ${resultMsg}`);
                }
            }

            // Extract txnToken from response (check multiple possible locations)
            txnToken = responseData.body?.txnToken 
                     || responseData.txnToken 
                     || responseData.body?.data?.txnToken
                     || null;
            
            console.log('🔍 Checking for txnToken in response:');
            console.log('   responseData.body?.txnToken:', responseData.body?.txnToken ? 'Found' : 'Not found');
            console.log('   responseData.txnToken:', responseData.txnToken ? 'Found' : 'Not found');
            console.log('   responseData.body?.data?.txnToken:', responseData.body?.data?.txnToken ? 'Found' : 'Not found');
            console.log('   Final txnToken:', txnToken ? txnToken.substring(0, 20) + '...' : 'null');
            
            if (txnToken) {
                // Construct payment URL with txnToken (JS Checkout method)
                // Format: /theia/processTransaction?mid={mid}&orderId={orderId}&txnToken={txnToken}
                paymentUrl = `${PAYTM_FORM_URL}/theia/processTransaction?mid=${PAYTM_MERCHANT_ID}&orderId=${orderId}&txnToken=${txnToken}`;
                console.log('✅ txnToken received:', txnToken.substring(0, 20) + '...');
                console.log('✅ Payment URL constructed:', paymentUrl);
                
                // Update transaction with txnToken
                await Transaction.findOneAndUpdate(
                    { transactionId: transactionId },
                    { paytmPaymentId: txnToken }
                );
            } else if (responseData.body?.redirectUrl) {
                // Use redirectUrl if provided
                paymentUrl = responseData.body.redirectUrl;
                console.log('✅ Using redirectUrl from response:', paymentUrl);
            } else {
                console.warn('⚠️ No txnToken or redirectUrl in Paytm response');
                console.warn('   Response structure:');
                console.warn('   - responseData keys:', Object.keys(responseData || {}));
                console.warn('   - responseData.body keys:', Object.keys(responseData.body || {}));
                if (responseData.body?.resultInfo) {
                    console.warn('   - resultInfo:', JSON.stringify(responseData.body.resultInfo, null, 2));
                }
                throw new Error('No txnToken or redirectUrl in Paytm response. Check API response structure.');
            }

        } catch (apiError) {
            console.error('\n❌ Paytm API Error Details:');
            console.error('   Error Message:', apiError.message);
            console.error('   Error Code:', apiError.code);
            console.error('   Response Status:', apiError.response?.status);
            console.error('   Response Status Text:', apiError.response?.statusText);
            if (apiError.response?.data) {
                console.error('   Response Data:', JSON.stringify(apiError.response.data, null, 2));
            }
            if (apiError.response?.headers) {
                console.error('   Response Headers:', JSON.stringify(apiError.response.headers, null, 2));
            }
            
            // If API call fails, we cannot create a working payment URL without txnToken
            // Paytm requires either:
            // 1. txnToken from initiateTransaction API (JS Checkout)
            // 2. Form submission with all parameters and checksum (Form-based)
            // Since form-based requires client-side form submission, we should return an error
            // with clear instructions, OR we can try to generate a form checksum and return form data
            
            console.warn('\n⚠️ API call failed. Attempting to generate form-based payment checksum...');
            
            try {
                // Generate checksum for form parameters (old format)
                // For form-based submission, checksum is generated from the parameter object
                const formChecksum = await PaytmChecksum.generateSignature(
                    paytmFormParams, // Pass object, not string
                    PAYTM_MERCHANT_KEY
                );
                paytmFormParams.CHECKSUMHASH = formChecksum;
                
                console.log('✅ Form checksum generated successfully');
                
                // For form-based submission, the URL should point to processTransaction
                // But it requires POST with all parameters, not a simple redirect
                // We'll return the form submission details for client-side handling
                // OR we can create a server-side endpoint that renders a form and auto-submits
                
                // Actually, let's create a payment URL that includes all parameters as query string
                // Some Paytm implementations accept GET requests with all params
                const queryParams = new URLSearchParams();
                Object.keys(paytmFormParams).forEach(key => {
                    queryParams.append(key, paytmFormParams[key]);
                });
                const formBasedUrl = `${PAYTM_FORM_URL}/theia/processTransaction?${queryParams.toString()}`;
                
                console.log('⚠️ Using form-based payment URL (may require POST, not GET)');
                console.log('   URL:', formBasedUrl.substring(0, 100) + '...');
                
                // Return form-based URL as fallback
                paymentUrl = formBasedUrl;
                console.log('✅ Form-based payment URL generated');
                
            } catch (checksumError) {
                console.error('❌ Error generating form checksum:', checksumError);
                console.error('   Checksum Error Message:', checksumError.message);
                console.error('   Checksum Error Stack:', checksumError.stack);
                
                // If checksum generation also fails, return error
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create Paytm payment link',
                    error_details: {
                        api_error: apiError.message,
                        api_response: apiError.response?.data || null,
                        checksum_error: checksumError.message
                    },
                    transaction_id: transactionId,
                    order_id: orderId,
                    message: 'Both Paytm API call and form checksum generation failed. Please check Paytm credentials, website name, and industry type in your .env file. Verify these match your Paytm Dashboard exactly.'
                });
            }
        }

        // Validate payment URL was generated
        if (!paymentUrl) {
            console.error('❌ No payment URL generated after all attempts');
            return res.status(500).json({
                success: false,
                error: 'Failed to generate payment URL',
                transaction_id: transactionId,
                message: 'Payment link creation failed: No payment URL generated after API call and fallback attempts'
            });
        }

        // Ensure payment URL has required parameters
        if (!paymentUrl.includes('mid=') || !paymentUrl.includes('orderId=')) {
            console.warn('⚠️ Payment URL missing required parameters, adding them...');
            const urlObj = new URL(paymentUrl);
            if (!urlObj.searchParams.has('mid')) {
                urlObj.searchParams.set('mid', PAYTM_MERCHANT_ID);
            }
            if (!urlObj.searchParams.has('orderId')) {
                urlObj.searchParams.set('orderId', orderId);
            }
            paymentUrl = urlObj.toString();
        }

        console.log('\n✅ Payment URL generated successfully');
        console.log('   URL:', paymentUrl.substring(0, 150) + (paymentUrl.length > 150 ? '...' : ''));
        console.log('   Has txnToken:', txnToken ? 'Yes' : 'No');
        console.log('   Has mid:', paymentUrl.includes('mid=') ? 'Yes' : 'No');
        console.log('   Has orderId:', paymentUrl.includes('orderId=') ? 'Yes' : 'No');

        // Store the payment URL in the transaction for checkout page
        if (paymentUrl) {
            await Transaction.findOneAndUpdate(
                { transactionId: transactionId },
                { 
                    paytmPaymentUrl: paymentUrl,
                    paytmPaymentId: txnToken
                },
                { new: true }
            );
            console.log('💾 Stored Paytm payment URL in transaction');
        }

        // Construct checkout page URL (similar to Easebuzz approach)
        const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
        const checkoutPageUrl = `${baseUrl}/api/paytm/checkout/${transactionId}`;

        // Generate UPI deep links (similar to Easebuzz)
        const deepLinks = generatePaytmUPIDeepLinks(paymentUrl, {
            amount: parseFloat(amount).toFixed(2),
            customer_name: customer_name,
            merchantName: merchantName,
            merchant_name: merchantName
        }, req);

        // Use smart_link as primary payment_url (for deep link functionality)
        const primaryPaymentUrl = deepLinks.smart_link || paymentUrl;

        console.log('🔗 Generated deep links for Paytm payment');
        console.log('   Smart Link:', deepLinks.smart_link ? deepLinks.smart_link.substring(0, 100) + '...' : 'Not available');
        console.log('   Primary Payment URL:', primaryPaymentUrl.substring(0, 100) + '...');
        console.log('   Checkout Page URL:', checkoutPageUrl);
        res.json({
            success: true,
            transaction_id: transactionId,
            payment_link_id: orderId,
            payment_url: primaryPaymentUrl, // Smart link for deep link functionality
            checkout_page: checkoutPageUrl, // Custom checkout page URL
            paytm_payment_url: paymentUrl, // Original Paytm payment URL (for direct access)
            deep_links: deepLinks, // All deep links including smart_link and app-specific links
            order_id: orderId,
            order_amount: parseFloat(amount),
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            reference_id: referenceId,
            callback_url: finalCallbackUrl,
            txn_token: txnToken,
            paytm_params: paytmFormParams, // Keep old format for backward compatibility
            message: 'Payment link created successfully. Use payment_url (deep link) for mobile apps or checkout_page for web browser.'
        });

    } catch (error) {
        console.error('❌ Create Paytm Payment Link Error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            error: error.response?.data || error.error,
            statusCode: error.response?.status || error.statusCode,
            stack: error.stack
        });

        let errorMessage = 'Failed to create payment link';
        let errorDetails = null;

        if (error.response?.data) {
            errorMessage = error.response.data.errorMessage || error.response.data.message || errorMessage;
            errorDetails = error.response.data;
        } else if (error.message) {
            errorMessage = error.message;
            errorDetails = { message: error.message };
        }

        const statusCode = error.response?.status || error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: errorDetails
        });
    }
};

// ============ PAYTM UPI REDIRECT HANDLER ============
/**
 * Handle UPI redirect for Paytm payments
 * Similar to Easebuzz implementation - automatically detects and opens UPI apps
 */
exports.handlePaytmUPIRedirect = (req, res) => {
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
            background: linear-gradient(135deg, #00BAF2 0%, #0078D4 100%);
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
            color: #00BAF2;
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
            <a href="phonepe://pay?url=${encodeURIComponent(payment_url)}" class="upi-btn">PhonePe</a>
            <a href="tez://pay?url=${encodeURIComponent(payment_url)}" class="upi-btn">Google Pay</a>
            <a href="paytmmp://pay?url=${encodeURIComponent(payment_url)}" class="upi-btn">Paytm</a>
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
            // Try to open UPI apps
            const upiApps = [
                'phonepe://pay?url=' + encodeURIComponent(paymentUrl),
                'tez://pay?url=' + encodeURIComponent(paymentUrl),
                'paytmmp://pay?url=' + encodeURIComponent(paymentUrl),
                'bhim://pay?url=' + encodeURIComponent(paymentUrl)
            ];
            
            let appIndex = 0;
            const tryNextApp = () => {
                if (appIndex < upiApps.length) {
                    window.location.href = upiApps[appIndex];
                    appIndex++;
                    setTimeout(tryNextApp, 1000);
                } else {
                    // Fallback to payment URL
                    window.location.href = paymentUrl;
                }
            };
            
            // Start trying apps
            tryNextApp();
        } else {
            // Desktop - redirect to payment URL
            window.location.href = paymentUrl;
        }
        
        // Fallback after 3 seconds
        setTimeout(() => {
            if (document.hasFocus && document.hasFocus()) {
                window.location.href = paymentUrl;
            }
        }, 3000);
    </script>
</body>
</html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('❌ handlePaytmUPIRedirect error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to redirect'
        });
    }
};

// ============ PAYTM CALLBACK HANDLER ============
/**
 * Handle Paytm payment callback (POST request after payment)
 * This is called when user is redirected back from Paytm payment page
 */
exports.handlePaytmCallback = async (req, res) => {
    try {
        // Paytm can send data via POST (body) or GET (query params)
        const { transaction_id } = req.query;
        const paytmResponse = req.method === 'POST' ? req.body : req.query;

        console.log('\n' + '='.repeat(80));
        console.log('🔔 PAYTM CALLBACK RECEIVED');
        console.log('='.repeat(80));
        console.log('   Method:', req.method);
        console.log('   Headers:', JSON.stringify(req.headers, null, 2));
        console.log('   Query Params:', JSON.stringify(req.query, null, 2));
        console.log('   Body:', JSON.stringify(req.body, null, 2));
        console.log('   Transaction ID (query):', transaction_id);
        console.log('   Paytm Response:', JSON.stringify(paytmResponse, null, 2));
        
        // Log specific Paytm response fields
        if (paytmResponse.STATUS) {
            console.log('   STATUS:', paytmResponse.STATUS);
        }
        if (paytmResponse.RESPCODE) {
            console.log('   RESPCODE:', paytmResponse.RESPCODE);
        }
        if (paytmResponse.RESPMSG) {
            console.log('   RESPMSG:', paytmResponse.RESPMSG);
        }
        if (paytmResponse.ORDERID) {
            console.log('   ORDERID:', paytmResponse.ORDERID);
        }
        if (paytmResponse.TXNID) {
            console.log('   TXNID:', paytmResponse.TXNID);
        }
        if (paytmResponse.CHECKSUMHASH) {
            console.log('   CHECKSUMHASH (received):', paytmResponse.CHECKSUMHASH.substring(0, 30) + '...');
        } else {
            console.log('   ⚠️ No CHECKSUMHASH in response');
        }

        // If transaction_id is in query but not in response, use query
        const finalTransactionId = transaction_id || paytmResponse.transaction_id;
        
        if (!finalTransactionId) {
            console.warn('❌ Missing transaction_id in callback');
            const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            // if (frontendUrl === 'localhost' || frontendUrl.startsWith('localhost')) {
            //     return res.redirect(`https://payments.ninex-group.com/payment-failed?error=missing_transaction_id`);
            // }
            return res.redirect(`${frontendUrl}/payment-failed?error=missing_transaction_id`);
        }

        // Find transaction
        const transaction = await Transaction.findOne({ transactionId: finalTransactionId }).populate('merchantId');

        if (!transaction) {
            console.warn('⚠️ Transaction not found for transactionId:', finalTransactionId);
            const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            if (frontendUrl === 'localhost' || frontendUrl.startsWith('localhost')) {
                return res.redirect(`https://payments.ninex-group.com/payment-failed?error=transaction_not_found`);
            }
            return res.redirect(`${frontendUrl}/payment-failed?error=transaction_not_found`);
        }

        // Verify checksum from Paytm response (if present)
        // Note: Paytm may not always send checksum in callback, so we verify payment status via API instead
        if (paytmResponse.CHECKSUMHASH) {
            console.log('\n🔍 Verifying Paytm Callback Checksum using official SDK...');
            const isValidChecksum = await verifyPaytmChecksum(paytmResponse, PAYTM_MERCHANT_KEY, paytmResponse.CHECKSUMHASH);
            if (!isValidChecksum) {
                console.warn('❌ Invalid Paytm checksum in callback');
                console.warn('   - Received Checksum:', paytmResponse.CHECKSUMHASH.substring(0, 30) + '...');
                console.warn('   - This might be okay if Paytm callback format differs');
                console.warn('   - We will verify payment status via Paytm API instead');
            } else {
                console.log('✅ Paytm callback checksum verified successfully');
            }
        } else {
            console.log('⚠️ No checksum in Paytm callback, will verify via API');
        }

        // Check payment status
        const status = paytmResponse.STATUS || paytmResponse.RESPCODE;
        const orderId = paytmResponse.ORDERID;
        const txnId = paytmResponse.TXNID;
        // Paytm returns TXNAMOUNT as "100.00" (in rupees), not in paise
        const amount = paytmResponse.TXNAMOUNT ? parseFloat(paytmResponse.TXNAMOUNT) : transaction.amount;
        
        console.log('\n📊 Payment Status Analysis:');
        console.log('   STATUS:', status);
        console.log('   RESPCODE:', paytmResponse.RESPCODE);
        console.log('   RESPMSG:', paytmResponse.RESPMSG);
        console.log('   ORDERID:', orderId);
        console.log('   TXNID:', txnId);
        console.log('   TXNAMOUNT:', paytmResponse.TXNAMOUNT, '-> parsed:', amount);
        console.log('   Transaction Status (current):', transaction.status);

        // If payment was successful, verify with Paytm API
        if (status === 'TXN_SUCCESS' || paytmResponse.RESPCODE === '01') {
            try {
                // Verify payment status with Paytm
                const verificationResult = await verifyPaytmPayment(orderId);

                if (verificationResult && verificationResult.STATUS === 'TXN_SUCCESS') {
                    // Payment is successful, update transaction if not already updated
                    if (transaction.status !== 'paid') {
                        const paidAt = new Date();
                        const expectedSettlement = calculateExpectedSettlementDate(paidAt);

                        // Calculate commission if not already set
                        const commissionData = calculatePayinCommission(amount);

                        const update = {
                            status: 'paid',
                            paidAt,
                            paymentMethod: paytmResponse.PAYMENTMODE || 'UPI',
                            paytmPaymentId: txnId,
                            paytmOrderId: orderId,
                            updatedAt: new Date(),
                            acquirerData: {
                                utr: paytmResponse.BANKTXNID || null,
                                rrn: paytmResponse.RRN || null,
                                bank_transaction_id: paytmResponse.BANKTXNID || null,
                                bank_name: paytmResponse.BANKNAME || null,
                                vpa: paytmResponse.PAYMENTMODE === 'UPI' ? paytmResponse.PAYMENTMODE : null
                            },
                            settlementStatus: 'unsettled',
                            expectedSettlementDate: expectedSettlement,
                            commission: commissionData.commission,
                            netAmount: parseFloat((amount - commissionData.commission).toFixed(2)),
                            webhookData: paytmResponse
                        };

                        const updatedTransaction = await Transaction.findOneAndUpdate(
                            { transactionId: finalTransactionId },
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
                                    paytm_order_id: updatedTransaction.paytmOrderId,
                                    paytm_payment_id: updatedTransaction.paytmPaymentId,
                                    paytm_reference_id: updatedTransaction.paytmReferenceId,
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
                }
            } catch (error) {
                console.error('❌ Error verifying payment with Paytm:', error);
                // Continue to redirect even if verification fails
            }
        } else {
            // Payment failed
            const failureReason = paytmResponse.RESPMSG || paytmResponse.STATUS || 'Payment failed';
            
            console.log('\n❌ PAYMENT FAILED');
            console.log('   Failure Reason:', failureReason);
            console.log('   RESPCODE:', paytmResponse.RESPCODE);
            console.log('   RESPMSG:', paytmResponse.RESPMSG);
            console.log('   STATUS:', paytmResponse.STATUS);
            
            // Special handling for "Invalid checksum" error
            if (paytmResponse.RESPCODE === '330' || paytmResponse.RESPMSG === 'Invalid checksum' || 
                (paytmResponse.RESPMSG && paytmResponse.RESPMSG.toLowerCase().includes('checksum'))) {
                console.error('\n🚨 CRITICAL: INVALID CHECKSUM ERROR FROM PAYTM');
                console.error('   This means the checksum we generated during payment link creation was incorrect!');
                console.error('   Possible causes:');
                console.error('   1. PAYTM_MERCHANT_KEY in .env does not match Paytm Dashboard');
                console.error('   2. WEBSITE parameter does not match Paytm Dashboard');
                console.error('   3. INDUSTRY_TYPE_ID parameter does not match Paytm Dashboard');
                console.error('   4. Parameter values were modified after checksum generation');
                console.error('   5. Parameter order or format is incorrect');
                console.error('\n   Transaction Details:');
                console.error('   - Transaction ID:', finalTransactionId);
                console.error('   - Order ID:', orderId);
                console.error('   - Original Order ID from DB:', transaction.orderId);
                console.error('   - Amount:', amount);
                console.error('\n   Please check the logs from payment link creation to see what checksum was generated.');
            }
            
            if (transaction.status !== 'failed') {
                await Transaction.findOneAndUpdate(
                    { transactionId: transaction_id },
                    {
                        status: 'failed',
                        failureReason: failureReason,
                        paytmPaymentId: txnId,
                        updatedAt: new Date(),
                        webhookData: paytmResponse
                    }
                );
                console.log('   ✅ Transaction status updated to "failed" in database');
            } else {
                console.log('   ℹ️ Transaction already marked as failed');
            }
        }

        // Helper function to get clean frontend URL
        const getFrontendUrl = () => {
            let frontendUrl = process.env.FRONTEND_URL || 'https://payments.ninex-group.com';
            // Remove port from URL if it's a devtunnels URL or localhost (they don't need ports)
            frontendUrl = frontendUrl.replace(/:\d+$/, '').replace(/\/$/, '');
            // If it's localhost without protocol, add http://
            if (frontendUrl.startsWith('localhost')) {
                frontendUrl = `http://${frontendUrl}`;
            }
            // If it's just 'localhost', use the default
            if (frontendUrl === 'http://localhost' || frontendUrl === 'localhost') {
                frontendUrl = 'https://payments.ninex-group.com';
            }
            return frontendUrl;
        };

        // Redirect to success or failure URL
        // Note: If Paytm returns "Invalid checksum" (RESPCODE: 330), it means the payment link creation had wrong checksum
        // In this case, we should still redirect but log the error
        console.log('\n🔄 Preparing Redirect...');
        const cleanFrontendUrl = getFrontendUrl();
        console.log('   Frontend URL:', cleanFrontendUrl);
        
        if (status === 'TXN_SUCCESS' || paytmResponse.RESPCODE === '01') {
            const redirectUrl = transaction.successUrl ||
                transaction.callbackUrl ||
                `${cleanFrontendUrl}/payment-success?transaction_id=${finalTransactionId}`;
            
            console.log('   ✅ Redirecting to SUCCESS:', redirectUrl);
            return res.redirect(redirectUrl);
        } else {
            const errorMsg = paytmResponse.RESPMSG || 'Payment failed';
            const redirectUrl = transaction.failureUrl ||
                `${cleanFrontendUrl}/payment-failed?transaction_id=${finalTransactionId}&error=${encodeURIComponent(errorMsg)}`;
            
            console.log('   ❌ Redirecting to FAILURE:', redirectUrl);
            console.log('   Error Message:', errorMsg);
            
            // If it's a checksum error, log additional details
            if (paytmResponse.RESPCODE === '330' || (errorMsg && errorMsg.toLowerCase().includes('checksum'))) {
                console.error('\n🔴 CHECKSUM ERROR - REDIRECTING TO FAILURE PAGE');
                console.error('   This error occurred because Paytm rejected our checksum during payment submission.');
                console.error('   Check the payment link creation logs to see what went wrong.');
                console.error('   Look for the "CHECKSUM GENERATION - DETAILED LOG" section in the logs.');
            }
            
            return res.redirect(redirectUrl);
        }

    } catch (error) {
        console.error('❌ Paytm Callback Handler Error:', error);
        const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
        if (frontendUrl === 'localhost' || frontendUrl.startsWith('localhost')) {
            return res.redirect(`https://payments.ninex-group.com/payment-failed?error=callback_error`);
        }
        return res.redirect(`${frontendUrl}/payment-failed?error=callback_error`);
    }
};

// ============ PAYTM WEBHOOK HANDLER ============
/**
 * Handle Paytm webhook events
 */
exports.handlePaytmWebhook = async (req, res) => {
    try {
        console.log('🔔 Paytm Webhook received');

        // Log request details for debugging
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ip = req.ip || req.connection.remoteAddress || 'Unknown';
        console.log(`   - IP: ${ip}`);
        console.log(`   - User-Agent: ${userAgent}`);
        console.log(`   - Content-Type: ${req.headers['content-type'] || 'Not set'}`);

        // Get payload
        const payload = req.body || {};

        if (!payload || Object.keys(payload).length === 0) {
            console.warn('❌ Webhook received with empty payload');
            return res.status(400).json({
                success: false,
                error: 'Empty webhook payload'
            });
        }

        console.log('📦 Paytm Webhook Payload:', JSON.stringify(payload, null, 2));

        // Verify checksum if present
        if (payload.CHECKSUMHASH) {
            const isValidChecksum = await verifyPaytmChecksum(payload, PAYTM_MERCHANT_KEY, payload.CHECKSUMHASH);
            if (!isValidChecksum) {
                console.warn('❌ Invalid Paytm webhook checksum');
                return res.status(401).json({
                    success: false,
                    error: 'Invalid checksum'
                });
            }
            console.log('✅ Paytm webhook checksum verified');
        }

        // Extract order ID and transaction ID
        const orderId = payload.ORDERID || payload.orderId;
        const txnId = payload.TXNID || payload.txnId;
        const status = payload.STATUS || payload.status;

        if (!orderId) {
            console.warn('❌ Missing ORDERID in webhook payload');
            return res.status(400).json({
                success: false,
                error: 'Missing ORDERID in payload'
            });
        }

        // Find transaction by order ID
        const transaction = await Transaction.findOne({
            $or: [
                { paytmOrderId: orderId },
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

        // Handle different statuses
        if (status === 'TXN_SUCCESS' || payload.RESPCODE === '01') {
            await handlePaytmPaymentSuccess(transaction, payload);
        } else {
            await handlePaytmPaymentFailed(transaction, payload);
        }

        return res.status(200).json({
            success: true,
            message: 'Webhook processed'
        });

    } catch (error) {
        console.error('❌ Paytm Webhook Handler Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Webhook processing failed'
        });
    }
};

// ============ PAYTM WEBHOOK HANDLERS ============

/**
 * Handle successful Paytm payment
 */
async function handlePaytmPaymentSuccess(transaction, payload) {
    try {
        console.log('💡 handlePaytmPaymentSuccess triggered');
        console.log('📦 Transaction ID:', transaction.transactionId);

        // Prevent duplicate updates if already paid
        if (transaction.status === 'paid') {
            console.log('⚠️ Transaction already marked as paid, skipping update');
            return;
        }

        const amount = payload.TXNAMOUNT ? parseFloat(payload.TXNAMOUNT) / 100 : transaction.amount;
        const paidAt = new Date(payload.TXNDATE || Date.now());
        const expectedSettlement = calculateExpectedSettlementDate(paidAt);
        const commissionData = calculatePayinCommission(amount);

        // Build atomic update object
        const update = {
            $set: {
                status: 'paid',
                paidAt,
                paymentMethod: payload.PAYMENTMODE || 'UPI',
                paytmPaymentId: payload.TXNID || payload.txnId,
                paytmOrderId: payload.ORDERID || payload.orderId,
                updatedAt: new Date(),
                acquirerData: {
                    utr: payload.BANKTXNID || null,
                    rrn: payload.RRN || null,
                    bank_transaction_id: payload.BANKTXNID || null,
                    bank_name: payload.BANKNAME || null,
                    vpa: payload.PAYMENTMODE === 'UPI' ? payload.PAYMENTMODE : null
                },
                settlementStatus: 'unsettled',
                expectedSettlementDate: expectedSettlement,
                webhookData: payload,
                commission: commissionData.commission,
                netAmount: parseFloat((amount - commissionData.commission).toFixed(2))
            }
        };

        // Update transaction atomically
        const updatedTransaction = await Transaction.findOneAndUpdate(
            {
                _id: transaction._id,
                status: { $ne: 'paid' } // Only update if not already paid
            },
            update,
            { new: true, upsert: false }
        ).populate('merchantId');

        if (!updatedTransaction) {
            console.warn('⚠️ Failed to update transaction');
            return;
        }

        console.log(`💾 Transaction updated: ${updatedTransaction.transactionId}`);
        console.log(`   - Status: ${updatedTransaction.status}`);
        console.log(`   - Paid at: ${paidAt.toISOString()}`);

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
                    paytm_order_id: updatedTransaction.paytmOrderId,
                    paytm_payment_id: updatedTransaction.paytmPaymentId,
                    paytm_reference_id: updatedTransaction.paytmReferenceId,
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

        console.log('✅ Paytm payment webhook processed successfully');

    } catch (error) {
        console.error('❌ handlePaytmPaymentSuccess error:', error.stack || error.message);
    }
}

/**
 * Handle failed Paytm payment
 */
async function handlePaytmPaymentFailed(transaction, payload) {
    try {
        console.log('💡 handlePaytmPaymentFailed triggered');

        const failureReason = payload.RESPMSG || payload.STATUS || 'Payment failed';

        // Update transaction atomically
        const update = {
            $set: {
                status: 'failed',
                failureReason: failureReason,
                paytmPaymentId: payload.TXNID || payload.txnId,
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

        console.log('❌ Paytm Transaction marked as FAILED:', updatedTransaction.transactionId);

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
                    paytm_order_id: updatedTransaction.paytmOrderId,
                    paytm_payment_id: updatedTransaction.paytmPaymentId,
                    status: updatedTransaction.status,
                    failure_reason: updatedTransaction.failureReason,
                    created_at: updatedTransaction.createdAt.toISOString(),
                    updated_at: updatedTransaction.updatedAt.toISOString()
                }
            };

            await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
        }

    } catch (error) {
        console.error('❌ handlePaytmPaymentFailed error:', error.message);
    }
}

// ============ PAYTM UTILITY FUNCTIONS ============

/**
 * Generate Paytm checksum using official PaytmChecksum from GitHub
 * Wrapper function for logging and error handling
 */
async function generatePaytmChecksum(params, merchantKey) {
    console.log('\n' + '-'.repeat(80));
    console.log('🔐 CHECKSUM GENERATION - USING OFFICIAL PAYTMCHECKSUM (GitHub)');
    console.log('-'.repeat(80));

    if (!merchantKey) {
        console.error('❌ Merchant key is missing!');
        throw new Error('Merchant key is required for checksum generation');
    }

    console.log('   Step 1: Input Parameters');
    console.log('   - Total params received:', Object.keys(params).length);
    console.log('   - Merchant Key length:', merchantKey.length);
    console.log('   - Merchant Key (first 10):', merchantKey.substring(0, 10) + '...');
    console.log('   - Merchant Key (last 5):', '...' + merchantKey.substring(merchantKey.length - 5));
    
    // Validate merchant key length
    if (merchantKey.length < 16) {
        console.warn('   ⚠️ WARNING: Merchant key seems unusually short! Paytm keys are typically 32+ characters.');
        console.warn('   ⚠️ Please verify the merchant key in your Paytm Dashboard matches the one in .env');
    }

    // Remove CHECKSUMHASH/signature if present (don't include it in checksum generation)
    const paramsForChecksum = { ...params };
    const hadChecksum = 'CHECKSUMHASH' in paramsForChecksum || 'signature' in paramsForChecksum;
    delete paramsForChecksum.CHECKSUMHASH;
    delete paramsForChecksum.signature;
    
    console.log('   Step 2: Prepare Parameters');
    console.log('   - Had CHECKSUMHASH/signature:', hadChecksum);
    console.log('   - Params for checksum:', Object.keys(paramsForChecksum).length);
    console.log('   - Parameters:', JSON.stringify(paramsForChecksum, null, 2));

    try {
        // Use official PaytmChecksum from GitHub
        // The SDK converts object to string using getStringByParams (sorts keys, joins with |)
        console.log('   Step 3: Generate Checksum using PaytmChecksum.generateSignature()');
        console.log('   - PaytmChecksum uses AES-128-CBC encryption with salt');
        console.log('   - Object will be converted to string: sorted keys, values joined with |');
        
        const checksum = await PaytmChecksum.generateSignature(paramsForChecksum, merchantKey);
        
        if (!checksum || typeof checksum !== 'string') {
            throw new Error(`Invalid checksum returned: ${typeof checksum}`);
        }
        
        console.log('   ✅ PaytmChecksum Generated Successfully');
        console.log('   - Checksum (first 30 chars):', checksum.substring(0, 30) + '...');
        console.log('   - Checksum (last 10 chars):', '...' + checksum.substring(checksum.length - 10));
        console.log('   - Checksum Length:', checksum.length, 'characters');
        
        console.log('-'.repeat(80));
        console.log('✅ Checksum Generation Complete (using official PaytmChecksum from GitHub)');
        console.log('-'.repeat(80) + '\n');

        return checksum;
    } catch (error) {
        console.error('❌ Error generating checksum with PaytmChecksum:');
        console.error('   Error Message:', error.message);
        console.error('   Error Stack:', error.stack);
        console.error('   Params sent:', JSON.stringify(paramsForChecksum, null, 2));
        throw new Error(`Failed to generate Paytm checksum: ${error.message}`);
    }
}

/**
 * Verify Paytm checksum using official Paytm SDK
 */
async function verifyPaytmChecksum(params, merchantKey, checksum) {
    if (!checksum) return false;

    try {
        // Remove CHECKSUMHASH from params for verification
        const paramsForVerification = { ...params };
        delete paramsForVerification.CHECKSUMHASH;
        
        // Generate checksum using official PaytmChecksum (pass object directly, SDK will convert)
        const calculatedChecksum = await PaytmChecksum.generateSignature(paramsForVerification, merchantKey);

        // Compare (case-insensitive)
        return calculatedChecksum.toLowerCase() === checksum.toLowerCase();
    } catch (error) {
        console.error('❌ Error verifying checksum with Paytm SDK:', error.message);
        return false;
    }
}

/**
 * Verify Paytm payment status
 */
async function verifyPaytmPayment(orderId) {
    try {
        const params = {
            MID: PAYTM_MERCHANT_ID,
            ORDERID: orderId
        };

        const checksum = await PaytmChecksum.generateSignature(params, PAYTM_MERCHANT_KEY);
        params.CHECKSUMHASH = checksum;

        const response = await axios.post(
            `${PAYTM_BASE_URL}/merchant-status/getTxnStatus`,
            params,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Error verifying Paytm payment:', error);
        throw error;
    }
}

// ============ PAYTM CHECKOUT PAGE (CUSTOM UPI SELECTION) ============
// This creates a custom checkout page with UPI app selection options
// Similar to Easebuzz approach - user selects UPI app and jumps to mobile
exports.getPaytmCheckoutPage = async (req, res) => {
    try {
        const { transactionId } = req.params;

        console.log('\n' + '='.repeat(80));
        console.log('📄 PAYTM CHECKOUT PAGE REQUEST');
        console.log('='.repeat(80));
        console.log('   Method:', req.method);
        console.log('   Transaction ID:', transactionId);
        console.log('   URL:', req.url);
        console.log('   Params:', req.params);

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

        // Get Paytm payment URL from transaction, or reconstruct it
        let paytmPaymentUrl = transaction.paytmPaymentUrl;
        
        // If URL not stored, try to reconstruct it from stored data
        if (!paytmPaymentUrl) {
            console.warn('⚠️ Paytm payment URL not found in transaction, attempting to reconstruct...');
            
            const orderId = transaction.paytmOrderId || transaction.orderId;
            const txnToken = transaction.paytmPaymentId;
            
            if (orderId && txnToken) {
                // Reconstruct Paytm payment URL
                paytmPaymentUrl = `${PAYTM_BASE_URL}/theia/processTransaction?mid=${PAYTM_MERCHANT_ID}&orderId=${orderId}&txnToken=${txnToken}`;
                console.log('✅ Reconstructed Paytm payment URL from orderId and txnToken');
                
                // Store it for future use
                await Transaction.findOneAndUpdate(
                    { transactionId: transactionId },
                    { paytmPaymentUrl: paytmPaymentUrl }
                );
            } else {
                console.error('❌ Cannot reconstruct Paytm payment URL - missing orderId or txnToken');
                console.error('   orderId:', orderId ? 'Found' : 'Missing');
                console.error('   txnToken:', txnToken ? 'Found' : 'Missing');
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
                        <p>Payment URL not found. Please contact support.</p>
                    </body>
                    </html>
                `);
            }
        }

        console.log('✅ Redirecting to Paytm checkout page');
        console.log('   Paytm Payment URL:', paytmPaymentUrl.substring(0, 100) + '...');
        console.log('   Amount: ₹' + transaction.amount.toFixed(2));

        // Auto-redirect to Paytm's checkout page with multiple fallbacks
        // This ensures it works on both mobile and desktop
        // Paytm will handle all UPI app selection and payment processing
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to Paytm...</title>
    <meta http-equiv="refresh" content="0;url=${paytmPaymentUrl}">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #00BAF2 0%, #0078D4 100%);
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
        .link {
            color: white;
            text-decoration: underline;
            margin-top: 20px;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Redirecting to Paytm Payment...</h2>
        <div class="spinner"></div>
        <p>If you are not redirected automatically, <a href="${paytmPaymentUrl}" class="link">click here</a></p>
    </div>
    <script>
        // Immediate redirect (works on all devices)
        window.location.href = ${JSON.stringify(paytmPaymentUrl)};
        
        // Fallback after 1 second if redirect didn't work
        setTimeout(function() {
            if (document.hasFocus && document.hasFocus()) {
                window.location.href = ${JSON.stringify(paytmPaymentUrl)};
            }
        }, 1000);
    </script>
</body>
</html>
        `;
        
        // Set redirect header and send HTML with fallbacks
        res.setHeader('Location', paytmPaymentUrl);
        res.status(302).send(html);

    } catch (error) {
        console.error('❌ Paytm Checkout Page Error:', error);
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

// ============ PAYTM UPI REDIRECT (SMART UPI APP DETECTION) ============
// This handles smart redirect to UPI apps - similar to Easebuzz approach
exports.handlePaytmUPIRedirect = async (req, res) => {
    try {
        const { payment_url, amount, merchant } = req.query;
        
        if (!payment_url) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invalid Request</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #d32f2f; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Invalid Request</h1>
                    <p>Payment URL is required.</p>
                </body>
                </html>
            `);
        }

        // Generate UPI deep links
        const encode = (str) => encodeURIComponent(str || '');
        const encodedPaymentUrl = encode(payment_url);
        const upiLinks = {
            phonepe: `phonepe://pay?url=${encodedPaymentUrl}`,
            googlepay: `tez://pay?url=${encodedPaymentUrl}`,
            paytm: `paytmmp://pay?url=${encodedPaymentUrl}`,
            bhim: `bhim://pay?url=${encodedPaymentUrl}`
        };

        // Return HTML page that tries to open UPI apps
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Opening UPI Payment...</title>
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
                        <a href="${upiLinks.phonepe}" class="upi-btn">PhonePe</a>
                        <a href="${upiLinks.googlepay}" class="upi-btn">Google Pay</a>
                        <a href="${upiLinks.paytm}" class="upi-btn">Paytm</a>
                        <a href="${upiLinks.bhim}" class="upi-btn">BHIM</a>
                        <a href="${payment_url}" class="upi-btn">Paytm Page</a>
                    </div>
                </div>
                <script>
                    const paymentUrl = ${JSON.stringify(payment_url)};
                    const userAgent = navigator.userAgent.toLowerCase();
                    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
                    
                    if (isMobile) {
                        // Try PhonePe first
                        window.location.href = ${JSON.stringify(upiLinks.phonepe)};
                        
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
        `);
    } catch (error) {
        console.error('❌ Paytm UPI Redirect Error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #d32f2f; }
                </style>
            </head>
            <body>
                <h1 class="error">Error</h1>
                <p>${error.message}</p>
            </body>
            </html>
        `);
    }
};

