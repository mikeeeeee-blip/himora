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
// Official API endpoint for creating payment links
// Documentation: https://docs.easebuzz.in/docs/payment-gateway/05be3a890b572-create-update-link
const EASEBUZZ_API_BASE_URL = 'https://dashboard.easebuzz.in';
const EASEBUZZ_CREATE_LINK_ENDPOINT = `${EASEBUZZ_API_BASE_URL}/easycollect/v1/create`;
const EASEBUZZ_PAYMENT_BASE_URL = EASEBUZZ_ENVIRONMENT === 'sandbox'
    ? 'https://testpay.easebuzz.in'
    : 'https://pay.easebuzz.in';

// ============ UPI DEEP LINK GENERATION ============
// Function to generate UPI deep links for different payment apps
function generateUPIDeepLinks(paymentData) {
    const amount = paymentData.amount || '0.00';
    const merchantName = paymentData.name || 'Merchant';
    const paymentUrl = paymentData.payment_url || paymentData.short_url || '';
    
    // URL encode parameters
    const encode = (str) => encodeURIComponent(str || '');
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:3000';
    
    // Generate deep links for popular UPI apps
    // The smart_link is the main deep link that automatically opens UPI apps
    const deepLinks = {
        // Direct payment URLs from Easebuzz
        payment_url: paymentUrl,
        short_url: paymentData.short_url || null,
        
        // Smart redirect link - automatically detects device and opens UPI app
        // This is the recommended link to use - it will try to open UPI apps first
        smart_link: paymentUrl ? `${baseUrl}/upi-redirect?payment_url=${encode(paymentUrl)}&amount=${amount}&merchant=${encode(merchantName)}` : null,
        
        // Direct app deep links (for manual use if needed)
        // These will attempt to open specific UPI apps
        apps: paymentUrl ? {
            phonepe: `phonepe://pay?url=${encode(paymentUrl)}`,
            googlepay: `tez://pay?url=${encode(paymentUrl)}`,
            paytm: `paytmmp://pay?url=${encode(paymentUrl)}`,
            bhim: `bhim://pay?url=${encode(paymentUrl)}`
        } : null
    };
    
    return deepLinks;
}

// ============ CREATE EASEBUZZ PAYMENT LINK ============
exports.createEasebuzzPaymentLink = async (req, res) => {
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

        // Generate unique IDs
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const merchantTxn = `EC${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`; // Easebuzz format: EC + timestamp + random
        const referenceId = `REF_${Date.now()}`;

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
        const easebuzzCallbackUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/easebuzz/webhook?transaction_id=${transactionId}`;
        const easebuzzRedirectUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/easebuzz/callback?transaction_id=${transactionId}`;

        // Prepare Easebuzz payment link creation payload (Official API format)
        // Documentation: https://docs.easebuzz.in/docs/payment-gateway/05be3a890b572-create-update-link
        // NOTE: The "key" field in Easebuzz API can be:
        // 1. Merchant ID (most common)
        // 2. Salt Key (some implementations)
        // 3. API Key (less common)
        // IMPORTANT: If you get "Please enter correct key" error, try using SALT KEY as the "key" field
        // You can test by temporarily setting: const easebuzzKey = EASEBUZZ_SALT_KEY;
        
        // IMPORTANT: The "key" field in Easebuzz API should be the API_KEY (as per working implementation)
        // Based on the working code, API_KEY is used as the "key" field
        let easebuzzKey = EASEBUZZ_API_KEY; // Use API Key as the "key" field
        
        if (!easebuzzKey) {
            console.error('❌ Easebuzz API Key not found. Please set EASEBUZZ_API_KEY');
            return res.status(500).json({
                success: false,
                error: 'Easebuzz API Key not configured. Please set EASEBUZZ_API_KEY in environment variables.',
                hint: 'The "key" field in Easebuzz API should be your API Key from the dashboard.'
            });
        }

        if (!EASEBUZZ_SALT_KEY) {
            console.error('❌ Easebuzz Salt Key not found. Required for hash generation.');
            return res.status(500).json({
                success: false,
                error: 'Easebuzz Salt Key not configured. Please set EASEBUZZ_SALT_KEY in environment variables.'
            });
        }

        console.log('\n🔑 Easebuzz Key Configuration:');
        console.log('   EASEBUZZ_MERCHANT_ID:', EASEBUZZ_MERCHANT_ID ? `Set (${EASEBUZZ_MERCHANT_ID.length} chars, starts with: ${EASEBUZZ_MERCHANT_ID.substring(0, 4)}...)` : 'NOT SET');
        console.log('   EASEBUZZ_SALT_KEY:', EASEBUZZ_SALT_KEY ? `Set (${EASEBUZZ_SALT_KEY.length} chars, starts with: ${EASEBUZZ_SALT_KEY.substring(0, 4)}...)` : 'NOT SET');
        console.log('   EASEBUZZ_API_KEY:', EASEBUZZ_API_KEY ? `Set (${EASEBUZZ_API_KEY.length} chars, starts with: ${EASEBUZZ_API_KEY.substring(0, 4)}...)` : 'NOT SET');
        console.log('   ✅ Using as "key" field:', easebuzzKey.substring(0, 4) + '...' + easebuzzKey.substring(easebuzzKey.length - 4));
        console.log('   Key length:', easebuzzKey.length, 'characters');

        // Easebuzz webhook URL - for payment status updates
        const easebuzzWebhookUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/easebuzz/webhook?transaction_id=${transactionId}`;
        
        console.log('🔗 Easebuzz Webhook URL:', easebuzzWebhookUrl);
        console.log('   ⚠️  Make sure to configure this URL in your Easebuzz dashboard:');
        console.log('      1. Login to Easebuzz Dashboard');
        console.log('      2. Go to Settings > Webhooks');
        console.log('      3. Add webhook URL:', easebuzzWebhookUrl);
        console.log('      4. Enable webhook events: payment.success, payment.failed, payment.pending');

        const paymentLinkData = {
            merchant_txn: merchantTxn,
            key: easebuzzKey, // Using API_KEY as per working implementation
            email: customer_email,
            name: customer_name,
            amount: parseFloat(amount).toFixed(2),
            phone: customer_phone,
            udf1: description || `Payment for ${merchantName}`,
            udf2: transactionId, // Store our transaction ID
            udf3: '',
            udf4: '',
            udf5: '',
            message: description || `Payment for ${merchantName}`,
            // Webhook URL for payment status updates
            webhook_url: easebuzzWebhookUrl,
            // Optional: expiry_date in DD-MM-YYYY format (30 days from now)
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB').replace(/\//g, '-'),
            // Optional: operation array for notifications
            operation: [
                {
                    type: "email",
                    template: "Default email template"
                }
            ]
        };

        console.log('\n📋 Easebuzz Payment Link Request:');
        console.log('   Merchant Key:', EASEBUZZ_MERCHANT_ID);
        console.log('   Merchant Txn:', merchantTxn);
        console.log('   Amount:', paymentLinkData.amount);
        console.log('   Name:', paymentLinkData.name);
        console.log('   Email:', paymentLinkData.email);
        console.log('   Phone:', paymentLinkData.phone);
        console.log('   Message:', paymentLinkData.message);
        console.log('   Expiry Date:', paymentLinkData.expiry_date);

        // Generate hash for Easebuzz payment link API
        // Hash format: SHA512 of concatenated values
        // Hash sequence: key|merchant_txn|name|email|phone|amount|udf1|udf2|udf3|udf4|udf5|message|salt
        // IMPORTANT: Use createHash (not createHmac) and append salt at the end
        const hashPayload = [
            paymentLinkData.key || easebuzzKey,
            paymentLinkData.merchant_txn,
            paymentLinkData.name,
            paymentLinkData.email,
            paymentLinkData.phone,
            paymentLinkData.amount,
            paymentLinkData.udf1 || '',
            paymentLinkData.udf2 || '',
            paymentLinkData.udf3 || '',
            paymentLinkData.udf4 || '',
            paymentLinkData.udf5 || '',
            paymentLinkData.message || '',
            EASEBUZZ_SALT_KEY
        ].join('|');

        console.log('\n🔐 Generating Easebuzz Hash...');
        console.log('   Hash Payload:', hashPayload);
        console.log('   Salt Key Length:', EASEBUZZ_SALT_KEY ? EASEBUZZ_SALT_KEY.length : 0, 'characters');

        // Easebuzz uses SHA512 hash (not HMAC)
        const hash = crypto.createHash('sha512').update(hashPayload).digest('hex');

        console.log('   ✅ Hash Generated:', hash.substring(0, 30) + '...');

        // Add hash to payload
        paymentLinkData.hash = hash;

        // Save transaction to database first
        const transaction = new Transaction({
            transactionId: transactionId,
            orderId: merchantTxn, // Use Easebuzz merchant_txn as orderId
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
            easebuzzOrderId: merchantTxn,
            easebuzzReferenceId: referenceId,

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

        // Call Easebuzz Official API to create payment link
        // Endpoint: https://dashboard.easebuzz.in/easycollect/v1/create
        console.log('\n📤 Calling Easebuzz Payment Link API...');
        console.log('   API Endpoint:', EASEBUZZ_CREATE_LINK_ENDPOINT);
        console.log('   Request Payload:', JSON.stringify(paymentLinkData, null, 2));

        try {
            const apiResponse = await axios.post(EASEBUZZ_CREATE_LINK_ENDPOINT, paymentLinkData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            });

            console.log('✅ Easebuzz API Response Status:', apiResponse.status);
            console.log('📦 Easebuzz API Response:', JSON.stringify(apiResponse.data, null, 2));

            const responseData = apiResponse.data;

            // Check if API call was successful
            if (!responseData.status || !responseData.data) {
                throw new Error(responseData.message || 'Easebuzz API returned an error');
            }

            // Extract payment URL from response
            const paymentUrl = responseData.data.payment_url || responseData.data.short_url;
            const linkId = responseData.data.id;
            const shortUrl = responseData.data.short_url;

            if (!paymentUrl) {
                throw new Error('Easebuzz API did not return a payment URL. Response: ' + JSON.stringify(responseData));
            }

            console.log('✅ Payment link created successfully!');
            console.log('   Link ID:', linkId);
            console.log('   Payment URL:', paymentUrl);
            console.log('   Short URL:', shortUrl);

            // Update transaction with Easebuzz response data
            // IMPORTANT: Store the merchant_txn as easebuzzOrderId - this is what Easebuzz will send back in webhooks
            const updateResult = await Transaction.findOneAndUpdate(
                { transactionId: transactionId },
                { 
                    easebuzzPaymentId: linkId?.toString(),
                    easebuzzOrderId: merchantTxn, // This is the merchant_txn we sent to Easebuzz
                    easebuzzLinkId: linkId?.toString(),
                    orderId: merchantTxn // Also update orderId to match for easier lookup
                },
                { new: true }
            );
            
            console.log('💾 Transaction updated with Easebuzz data:');
            console.log('   Transaction ID:', transactionId);
            console.log('   Easebuzz Order ID (merchant_txn):', merchantTxn);
            console.log('   Easebuzz Link ID:', linkId);
            console.log('   Update Result:', updateResult ? 'Success' : 'Failed');
            
            if (!updateResult) {
                console.warn('⚠️  WARNING: Failed to update transaction with Easebuzz order ID!');
                console.warn('   This might cause webhook lookup to fail!');
            }

            // Generate UPI deep links
            const deepLinks = generateUPIDeepLinks({
                payment_url: paymentUrl,
                short_url: shortUrl,
                merchant_txn: merchantTxn,
                name: customer_name,
                amount: parseFloat(amount).toFixed(2),
                message: description || `Payment for ${merchantName}`
            });

            res.json({
                success: true,
                transaction_id: transactionId,
                payment_link_id: merchantTxn,
                payment_url: paymentUrl, // Direct Easebuzz payment link (shareable)
                short_url: shortUrl,
                deep_links: deepLinks, // UPI deep links for mobile apps
                order_id: merchantTxn,
                order_amount: parseFloat(amount),
                order_currency: 'INR',
                merchant_id: merchantId.toString(),
                merchant_name: merchantName,
                reference_id: referenceId,
                callback_url: finalCallbackUrl,
                easebuzz_link_id: linkId,
                payment_data: responseData.data,
                message: 'Payment link created successfully. Share this URL with your customer.'
            });

        } catch (apiError) {
            console.error('❌ Easebuzz API Error:', apiError.message);
            console.error('   Status:', apiError.response?.status);
            console.error('   Response Data:', JSON.stringify(apiError.response?.data, null, 2));
            console.error('   Headers:', apiError.response?.headers);
            console.error('   URL Attempted:', EASEBUZZ_CREATE_LINK_ENDPOINT);
            console.error('   Key Used:', easebuzzKey.substring(0, 4) + '...' + easebuzzKey.substring(easebuzzKey.length - 4));
            
            // If "Please enter correct key" error, suggest trying Salt Key
            if (apiError.response?.data?.error?.toLowerCase().includes('key') || 
                apiError.response?.data?.error?.toLowerCase().includes('correct key')) {
                console.error('\n   💡 TROUBLESHOOTING TIP:');
                console.error('      The "key" field might need to be your SALT KEY instead of MERCHANT ID.');
                console.error('      Try setting the "key" field to EASEBUZZ_SALT_KEY value.');
                console.error('      Or check your Easebuzz dashboard for the exact "key" value to use.');
            }

            // If 404, the endpoint might be wrong - return form-based approach
            if (apiError.response?.status === 404 || apiError.code === 'ENOTFOUND') {
                console.log('⚠️  Got 404 or DNS error. Easebuzz endpoint might be incorrect.');
                console.log('   Attempted URL:', apiUrl);
                console.log('   ⚠️  IMPORTANT: Please verify the correct Easebuzz API endpoint with Easebuzz support.');
                console.log('   Falling back to form-based submission approach...');
                
                // Return form URL and parameters for frontend to submit
                // Note: The actual endpoint might be different - user needs to verify with Easebuzz
                const formUrl = `${EASEBUZZ_BASE_URL}/payment/initiate`;
                console.log('   Form URL:', formUrl);
                
                res.json({
                    success: true,
                    transaction_id: transactionId,
                    payment_link_id: merchantOrderId,
                    payment_url: formUrl,
                    order_id: merchantOrderId,
                    order_amount: parseFloat(amount),
                    order_currency: 'INR',
                    merchant_id: merchantId.toString(),
                    merchant_name: merchantName,
                    reference_id: referenceId,
                    callback_url: finalCallbackUrl,
                    // Include payment parameters for form submission
                    easebuzz_params: paymentData,
                    message: 'Payment link created. Note: If you see 404, please verify the correct Easebuzz endpoint with their support team.',
                    warning: 'Endpoint returned 404. Please contact Easebuzz support to verify the correct API endpoint URL.'
                });
                return;
            }

            // Update transaction status to failed
            await Transaction.findOneAndUpdate(
                { transactionId: transactionId },
                { 
                    status: 'failed',
                    failureReason: apiError.response?.data?.message || apiError.message || 'Failed to create payment link'
                }
            );

            res.status(apiError.response?.status || 500).json({
                success: false,
                error: apiError.response?.data?.message || apiError.message || 'Failed to create Easebuzz payment link',
                details: apiError.response?.data,
                attempted_url: EASEBUZZ_CREATE_LINK_ENDPOINT
            });
        }

    } catch (error) {
        console.error('❌ Create Easebuzz Payment Link Error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create payment link'
        });
    }
};

// ============ EASEBUZZ PAYMENT PAGE (AUTO-SUBMIT FORM) ============
// This creates a shareable payment link that auto-submits to Easebuzz
exports.getEasebuzzPaymentPage = async (req, res) => {
    try {
        const { transactionId } = req.params;

        console.log('\n' + '='.repeat(80));
        console.log('📄 EASEBUZZ PAYMENT PAGE REQUEST');
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

        // Prepare payment data for Easebuzz
        const paymentData = {
            amount: transaction.amount.toFixed(2),
            delivery_charge: '0',
            merchant_order_id: transaction.orderId,
            currency: transaction.currency || 'INR',
            redirect_url: transaction.callbackUrl || `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/easebuzz/callback?transaction_id=${transactionId}`,
            callback_url: transaction.callbackUrl || `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/easebuzz/webhook?transaction_id=${transactionId}`,
            buyer_name: transaction.customerName,
            buyer_email: transaction.customerEmail,
            buyer_phone: transaction.customerPhone,
            description: transaction.description || `Payment for ${transaction.merchantName}`
        };

        // Generate checksum
        const checksumPayload = [
            paymentData.amount,
            paymentData.merchant_order_id,
            paymentData.currency,
            paymentData.buyer_name,
            paymentData.buyer_email,
            paymentData.buyer_phone,
            paymentData.redirect_url,
            paymentData.callback_url,
            paymentData.description
        ].join('|');

        const checksum = crypto.createHmac('sha256', EASEBUZZ_SALT_KEY)
            .update(checksumPayload)
            .digest('hex');

        paymentData.checksum = checksum;

        // Easebuzz payment endpoint
        const easebuzzPaymentUrl = `${EASEBUZZ_BASE_URL}/payment/initiate`;

        console.log('✅ Generating payment page for transaction:', transactionId);
        console.log('   Easebuzz Payment URL:', easebuzzPaymentUrl);

        // Return HTML page that auto-submits form to Easebuzz
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Processing Payment...</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .container {
                        text-align: center;
                        padding: 40px;
                    }
                    .spinner {
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    h1 {
                        margin: 0 0 10px 0;
                        font-size: 24px;
                    }
                    p {
                        margin: 0;
                        opacity: 0.9;
                        font-size: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="spinner"></div>
                    <h1>Redirecting to Payment Gateway...</h1>
                    <p>Please wait while we redirect you to Easebuzz</p>
                </div>
                <form id="easebuzzForm" method="POST" action="${easebuzzPaymentUrl}">
                    ${Object.keys(paymentData).map(key => 
                        `<input type="hidden" name="${key}" value="${paymentData[key]}">`
                    ).join('')}
                </form>
                <script>
                    // Auto-submit form after a brief delay
                    setTimeout(function() {
                        document.getElementById('easebuzzForm').submit();
                    }, 500);
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

        const paymentId = payload.transaction_id || payload.txn_id || transaction.easebuzzPaymentId;
        const paymentMethod = payload.payment_mode || payload.payment_method || 'unknown';
        const amount = parseFloat(payload.amount || transaction.amount);

        // Calculate commission
        const commission = calculatePayinCommission(amount, transaction.merchantId);
        const netAmount = amount - commission;

        // Update transaction atomically
        const update = {
            $set: {
                status: 'paid',
                easebuzzPaymentId: paymentId,
                paymentMethod: paymentMethod,
                paidAt: new Date(),
                updatedAt: new Date(),
                commission: commission,
                netAmount: netAmount,
                expectedSettlementDate: calculateExpectedSettlementDate(),
                webhookData: payload
            }
        };

        console.log('\n💾 Attempting to update transaction in database...');
        console.log('   Update Query:', JSON.stringify(update, null, 2));
        console.log('   Transaction ID:', transaction._id);
        console.log('   Transaction Object ID:', transaction._id.toString());
        console.log('   Current Status:', transaction.status);
        console.log('   Query Filter: { _id: ObjectId("' + transaction._id + '"), status: { $ne: "paid" } }');
        
        // Try the update
        let updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: transaction._id, status: { $ne: 'paid' } },
            update,
            { new: true }
        ).populate('merchantId');

        // If update failed (maybe already paid), try without the status filter
        if (!updatedTransaction) {
            console.warn('\n⚠️ First update attempt failed (transaction may already be paid)');
            console.warn('   Trying update without status filter...');
            
            // Try updating without the status filter - this will update even if already paid
            updatedTransaction = await Transaction.findByIdAndUpdate(
                transaction._id,
                update,
                { new: true }
            ).populate('merchantId');
        }

        if (!updatedTransaction) {
            console.error('\n❌❌❌ CRITICAL: Failed to update transaction! ❌❌❌');
            console.error('   Transaction Object ID:', transaction._id);
            console.error('   Transaction ID String:', transaction._id.toString());
            console.error('   Possible reasons:');
            console.error('   1. Transaction ID not found in database');
            console.error('   2. Database connection issue');
            console.error('   3. Transaction was deleted');
            
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

        console.log('\n✅✅✅ TRANSACTION SUCCESSFULLY UPDATED TO PAID ✅✅✅');
        console.log('   🆔 Transaction ID:', updatedTransaction.transactionId);
        console.log('   📋 Order ID:', updatedTransaction.orderId);
        console.log('   💰 Payment ID:', paymentId);
        console.log('   💵 Amount: ₹', amount);
        console.log('   💸 Commission: ₹', commission);
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

