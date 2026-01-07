const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');

// Determine mode - default to 'test' (staging) if not explicitly set to 'production'
// For testing, always use 'test' mode to use staging endpoint: https://zaakstaging.zaakpay.com
let MODE = (process.env.ZACKPAY_MODE || '').toLowerCase() === 'production' ? 'production' : 'test';

// Force test mode if ZACKPAY_FORCE_STAGING is set
if (process.env.ZACKPAY_FORCE_STAGING === 'true' || process.env.ZACKPAY_FORCE_STAGING === '1') {
    console.log('🔧 ZACKPAY_FORCE_STAGING is set - forcing TEST mode (staging endpoint)');
    MODE = 'test';
}

// Use test credentials by default unless explicitly in production mode
let MERCHANT_ID = MODE === 'production'
    ? process.env.ZACKPAY_MERCHANT_ID
    : (process.env.ZACKPAY_MERCHANT_ID_TEST || process.env.ZACKPAY_MERCHANT_ID);
let SECRET_KEY = MODE === 'production'
    ? process.env.ZACKPAY_SECRET_KEY
    : (process.env.ZACKPAY_SECRET_KEY_TEST || process.env.ZACKPAY_SECRET_KEY);
let API_KEY = MODE === 'production'
    ? process.env.ZACKPAY_API_KEY
    : (process.env.ZACKPAY_API_KEY_TEST || process.env.ZACKPAY_API_KEY);
let ENCRYPTION_KEY_ID = MODE === 'production'
    ? process.env.ZACKPAY_ENCRYPTION_PUBLIC_KEY_ID
    : (process.env.ZACKPAY_ENCRYPTION_PUBLIC_KEY_ID_TEST || process.env.ZACKPAY_ENCRYPTION_PUBLIC_KEY_ID);

// Auto-detect if production mode is set but test credentials are being used
// Force test mode in this case to avoid calling production API with test credentials
if (MODE === 'production') {
    const hasTestCredentials = process.env.ZACKPAY_MERCHANT_ID_TEST || process.env.ZACKPAY_SECRET_KEY_TEST;
    const hasProdCredentials = process.env.ZACKPAY_MERCHANT_ID && process.env.ZACKPAY_SECRET_KEY;
    
    if (hasTestCredentials && !hasProdCredentials) {
        console.warn('⚠️ WARNING: Production mode detected but only test credentials found. Forcing TEST mode.');
        MODE = 'test';
        MERCHANT_ID = process.env.ZACKPAY_MERCHANT_ID_TEST || process.env.ZACKPAY_MERCHANT_ID;
        SECRET_KEY = process.env.ZACKPAY_SECRET_KEY_TEST || process.env.ZACKPAY_SECRET_KEY;
        API_KEY = process.env.ZACKPAY_API_KEY_TEST || process.env.ZACKPAY_API_KEY;
        ENCRYPTION_KEY_ID = process.env.ZACKPAY_ENCRYPTION_PUBLIC_KEY_ID_TEST || process.env.ZACKPAY_ENCRYPTION_PUBLIC_KEY_ID;
    }
}

// According to Zaakpay docs: https://developer.zaakpay.com/docs/seamless-flow
// Custom Checkout (TransactU) endpoint - Server to Server API
// IMPORTANT: Staging and Production use DIFFERENT endpoints
// Staging: https://zaakstaging.zaakpay.com/api/paymentTransact/V8
// Production: https://api.zaakpay.com/api/paymentTransact/V8
// 
// Force staging for testing - change to production only when going live
const BASE_URL = MODE === 'production'
    ? 'https://api.zaakpay.com'
    : 'https://zaakstaging.zaakpay.com';
const TRANSACT_ENDPOINT = `${BASE_URL}/api/paymentTransact/V8`;

// Ensure we're using staging endpoint (for testing)
if (BASE_URL !== 'https://zaakstaging.zaakpay.com' && MODE !== 'production') {
    console.warn('⚠️ Forcing staging endpoint for testing');
}

// Warn if using production endpoint with test credentials
if (MODE === 'production' && (!process.env.ZACKPAY_MERCHANT_ID || !process.env.ZACKPAY_SECRET_KEY)) {
    console.warn('⚠️ WARNING: Production mode but production credentials not found. Using test credentials.');
}

// Log configuration on startup
if (!global.zaakpayConfigLogged) {
    console.log('🔧 Zaakpay Configuration:');
    console.log('   Mode:', MODE, MODE === 'test' ? '(STAGING)' : '(PRODUCTION)');
    console.log('   Base URL:', BASE_URL);
    console.log('   Endpoint:', TRANSACT_ENDPOINT);
    console.log('   Merchant ID:', MERCHANT_ID ? MERCHANT_ID.substring(0, 15) + '...' : 'NOT SET');
    if (MODE === 'test') {
        console.log('   ✅ Using STAGING endpoint: https://zaakstaging.zaakpay.com');
    } else {
        console.log('   ⚠️ Using PRODUCTION endpoint: https://zaakpay.com');
    }
    global.zaakpayConfigLogged = true;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper function to detect base64 encoded strings (encrypted data)
function isBase64(str) {
    if (!str || typeof str !== 'string') return false;
    // Base64 pattern: alphanumeric + / + = padding, typically 20+ chars, ends with = or ==
    // More lenient pattern to catch shorter encrypted strings
    const base64Pattern = /^[A-Za-z0-9+\/]{16,}={0,2}$/;
    return base64Pattern.test(str) && str.length >= 20;
}

// Helper function to try decoding base64 (only for debugging - should not be used in production)
function tryDecodeBase64(str) {
    try {
        if (isBase64(str)) {
            const decoded = Buffer.from(str, 'base64').toString('utf8');
            // Check if decoded value looks like a name (contains letters, may have numbers/special chars)
            // More lenient check - just ensure it's not binary data
            if (decoded && decoded.trim().length > 0 && decoded.trim().length < 100) {
                // Check if it contains at least some letters (not just binary)
                if (/[a-zA-Z]/.test(decoded.trim())) {
                    console.log('   ⚠️ Decoded base64:', decoded.trim());
                    return decoded.trim();
                }
            }
        }
    } catch (e) {
        console.error('   ❌ Base64 decode error:', e.message);
    }
    return null;
}

// Force plain text extraction - always returns plain text, never encrypted
function forcePlainTextName(name, fallback = 'Customer') {
    if (!name || typeof name !== 'string') return fallback;
    
    const trimmed = name.trim();
    
    // If it's clearly base64/encrypted, try to decode
    if (isBase64(trimmed)) {
        const decoded = tryDecodeBase64(trimmed);
        if (decoded) {
            return decoded;
        }
        // If decode fails, use fallback
        console.warn('   ⚠️ Could not decode encrypted name, using fallback');
        return fallback;
    }
    
    // If it's suspiciously long or looks encrypted, use fallback
    if (trimmed.length > 50 || /^[A-Za-z0-9+\/]{20,}={0,2}$/.test(trimmed)) {
        console.warn('   ⚠️ Name looks encrypted, using fallback');
        return fallback;
    }
    
    return trimmed;
}

function buildCheckoutHTML(dataString, checksum, transaction, option, transactionId) {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zaakpay Checkout</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f6f8fb; margin:0; padding:24px; }
    .card { max-width:520px; margin:0 auto; background:#fff; border-radius:12px; padding:24px; box-shadow:0 6px 24px rgba(0,0,0,0.08); }
    .actions { display:flex; gap:8px; flex-wrap:wrap; margin:16px 0; }
    .btn { flex:1 1 48%; padding:12px; border:1px solid #dfe3eb; border-radius:10px; cursor:pointer; background:#fff; font-weight:600; }
    .btn.primary { background:#008cdd; color:#fff; border-color:#008cdd; }
    .note { color:#6b7280; font-size:13px; }
    form { display:none; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Pay ₹${escapeHtml(transaction.amount.toFixed(2))}</h2>
    <p class="note">Choose your preferred UPI option. You will be redirected securely to Zaakpay.</p>
    <div class="actions">
      <a class="btn" href="?option=upi&transactionId=${encodeURIComponent(transactionId)}">Pay by any UPI ID</a>
      <a class="btn" href="?option=gpay&transactionId=${encodeURIComponent(transactionId)}">Google Pay</a>
      <a class="btn" href="?option=phonepe&transactionId=${encodeURIComponent(transactionId)}">PhonePe</a>
      <a class="btn" href="?option=paytm&transactionId=${encodeURIComponent(transactionId)}">Paytm</a>
    </div>
    <p class="note">Selected option: ${escapeHtml(option)}</p>
    <p class="note">If you are not redirected automatically, <a href="#" onclick="document.getElementById('zpForm').submit(); return false;">click here</a>.</p>
  </div>
  <form id="zpForm" method="POST" action="${TRANSACT_ENDPOINT}">
    <input type="hidden" name="data" value="${escapeHtml(dataString)}" />
    <input type="hidden" name="checksum" value="${checksum}" />
  </form>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        document.getElementById('zpForm').submit();
      }, 300);
    });
  </script>
</body>
</html>`;
}

function hmacSha256(dataString) {
    return crypto.createHmac('sha256', SECRET_KEY || '').update(dataString, 'utf8').digest('hex');
}

function buildZaakpayData({
    orderId,
    amountPaisa,
    description,
    email,
    phone,
    firstName,
    lastName,
    returnUrl,
    paymentMode = 'UPIAPP',
    bankId = '',
    extra = {}
}) {
    return {
        merchantIdentifier: MERCHANT_ID,
        showMobile: 'true',
        mode: '0', // 0 = standard mode as per docs
        returnUrl,
        orderDetail: {
            orderId,
            amount: amountPaisa,
            currency: 'INR',
            productDescription: description || 'Payment',
            email,
            phone,
            firstName,
            lastName,
            ...extra.orderDetail
        },
        paymentInstrument: {
            paymentMode,
            netbanking: {
                bankid: bankId || ''
            }
        },
        billingAddress: {
            city: extra.billingCity || 'NA'
        },
        shippingAddress: {
            city: extra.shippingCity || 'NA'
        }
    };
}

exports.createZaakpayPaymentLink = async (req, res) => {
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

        const settings = await Settings.getSettings();
        if (!settings.paymentGateways.zaakpay?.enabled) {
            return res.status(403).json({
                success: false,
                error: 'Zaakpay payment gateway is not enabled.',
                code: 'GATEWAY_DISABLED'
            });
        }

        if (!MERCHANT_ID || !SECRET_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Zaakpay credentials missing. Please set ZACKPAY_* environment variables.'
            });
        }

        if (!amount || !customer_name || !customer_email || !customer_phone) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: amount, customer_name, customer_email, customer_phone'
            });
        }

        if (!/^[0-9]{10}$/.test(customer_phone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number. Must be 10 digits.'
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        const amountFloat = parseFloat(amount);
        if (isNaN(amountFloat) || amountFloat < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        const merchantId = req.merchantId;
        const merchantName = req.merchantName;
        const merchant = await User.findById(merchantId);

        const transactionId = `TXN_ZP_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const orderId = `ORDER_ZP_${Date.now()}_${Math.random().toString(36).substring(5)}`.slice(0, 20);

        const finalCallbackUrl = callback_url ||
            merchant?.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        // Build returnUrl - ALWAYS use production URL (never localhost)
        // Zaakpay requires the returnUrl to be registered in their dashboard
        // Hardcoded to always use: https://www.shaktisewafoudation.in/api/zaakpay/callback
        const returnUrl = `https://www.shaktisewafoudation.in/api/zaakpay/callback?transaction_id=${transactionId}`;
        
        console.log('🔗 Return URL configured (hardcoded):', returnUrl);

        const amountPaisa = Math.round(amountFloat * 100).toString();
        const nameParts = (customer_name || '').trim().split(' ').filter(p => p.length > 0);
        
        // Extract firstName and lastName - ensure they are plain text, not encrypted
        let firstName = (nameParts[0] || customer_name || 'Customer').trim();
        let lastName = nameParts.slice(1).join(' ').trim() || '';
        
        // CRITICAL: Validate that customer_name is NOT encrypted before storing
        // This prevents storing encrypted data in the database
        if (customer_name && isBase64(customer_name.trim())) {
            console.error('❌ CRITICAL: customer_name in request appears to be encrypted (base64)!');
            console.error('   Value:', customer_name);
            return res.status(400).json({
                success: false,
                error: 'Invalid customer_name: appears to be encrypted (base64). Please provide plain text customer name.'
            });
        }
        
        // Validate extracted firstName is not encrypted
        if (isBase64(firstName)) {
            console.error('❌ Extracted firstName appears encrypted:', firstName);
            return res.status(400).json({
                success: false,
                error: 'Invalid customer name format. Extracted firstName appears to be encrypted. Please provide plain text customer name.'
            });
        }
        
        // Ensure firstName is not empty (Zaakpay requirement)
        if (!firstName || firstName.length === 0) {
            firstName = 'Customer';
        }
        
        // Final validation: ensure names are reasonable length
        if (firstName.length > 50) {
            console.error('❌ firstName too long, likely encrypted:', firstName.substring(0, 30));
            return res.status(400).json({
                success: false,
                error: 'Invalid customer name: firstName is too long. Please provide plain text customer name.'
            });
        }

        const dataObject = buildZaakpayData({
            orderId,
            amountPaisa,
            description: description || `Payment for ${merchantName}`,
            email: customer_email,
            phone: customer_phone,
            firstName,
            lastName,
            returnUrl
        });

        // Log data for debugging (without sensitive info)
        console.log('📤 Zaakpay Payment Data:');
        console.log('   Order ID:', orderId);
        console.log('   Amount (paisa):', amountPaisa);
        console.log('   First Name:', firstName, '(length:', firstName.length + ')');
        console.log('   Last Name:', lastName, '(length:', lastName.length + ')');
        console.log('   Email:', customer_email);
        console.log('   Phone:', customer_phone);
        
        // Validate data before sending
        if (!firstName || firstName.trim().length === 0) {
            console.error('❌ Invalid firstName - cannot be empty');
            return res.status(400).json({
                success: false,
                error: 'Invalid customer name - firstName cannot be empty'
            });
        }

        const dataString = JSON.stringify(dataObject);
        const checksum = hmacSha256(dataString);
        
        console.log('   Checksum:', checksum.substring(0, 20) + '...');

        const transaction = new Transaction({
            transactionId,
            orderId,
            merchantId,
            merchantName,
            customerId: `CUST_${customer_phone}_${Date.now()}`,
            customerName: customer_name,
            customerEmail: customer_email,
            customerPhone: customer_phone,
            amount: amountFloat,
            currency: 'INR',
            description: description || `Payment for ${merchantName}`,
            status: 'created',
            paymentGateway: 'zaakpay',
            paymentMethod: 'UPI',
            callbackUrl: finalCallbackUrl,
            successUrl: success_url,
            failureUrl: failure_url,
            zaakpayOrderId: orderId,
            zaakpayChecksum: checksum,
            // Note: Not storing zaakpayRequestData to avoid any confusion with encrypted data
            // We rebuild it fresh from transaction fields in checkout page
            zaakpayEndpoint: TRANSACT_ENDPOINT,
            zaakpayMode: MODE,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await transaction.save();

        // Return a WORKING link that opens our Next.js redirect page, which then POSTs to Zaakpay hosted checkout.
        // (A plain TRANSACT_ENDPOINT URL is not directly usable because Zaakpay expects POST fields: data + checksum.)
        const frontendUrl =
            process.env.KRISHI_API_URL ||
            process.env.FRONTEND_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            process.env.ZACKPAY_WEBSITE_URL ||
            'http://localhost:3001';

        const hostedRedirectLink = `${String(frontendUrl).replace(/\/$/, '')}/zaakpay-checkout?transaction_id=${encodeURIComponent(transactionId)}`;
        const zaakpayHostedUrl = `${TRANSACT_ENDPOINT}`;
        
        // Return the hosted checkout URL with form data
        // The frontend can either:
        // 1. Auto-submit a form to redirect to Zaakpay
        // 2. Use the data to build a redirect URL
        
        res.json({
            success: true,
            transaction_id: transactionId,
            order_id: orderId,
            payment_url: hostedRedirectLink,
            checkout_page: hostedRedirectLink,
            gateway: 'zaakpay',
            mode: MODE,
            data: dataObject,
            checksum,
            endpoint: TRANSACT_ENDPOINT,
            redirect_url: zaakpayHostedUrl,
            hosted_redirect_link: hostedRedirectLink,
            form_data: {
                data: dataString,
                checksum: checksum
            },
            message: 'Zaakpay payment link created. Redirect customer to checkout_page (our redirect page -> Zaakpay hosted checkout).'
        });
    } catch (error) {
        console.error('❌ Zaakpay createPaymentLink error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create Zaakpay payment link'
        });
    }
};

// Helper function to build payment data with plain text names
function buildPaymentData(transaction, option, vpa) {
    // Extract names from transaction - FORCE plain text extraction
    // This ensures we NEVER send encrypted data to Zaakpay
    const rawCustomerName = String(transaction.customerName || '').trim();
    
    console.log('🔍 Checking customerName from transaction:');
    console.log('   Raw value:', rawCustomerName);
    console.log('   Length:', rawCustomerName.length);
    console.log('   Looks like base64:', isBase64(rawCustomerName));
    
    // Force plain text - decode if encrypted, use fallback if can't decode
    const customerName = forcePlainTextName(rawCustomerName, 'Customer');
    
    console.log('✅ Processed customerName:', customerName, '(length:', customerName.length + ')');
    
    // Split into firstName and lastName
    const nameParts = customerName.split(' ').filter(p => p && p.trim().length > 0);
    let firstName = forcePlainTextName(nameParts[0] || customerName, 'Customer');
    let lastName = forcePlainTextName(nameParts.slice(1).join(' '), '');
    
    // Final validation - ensure names are definitely plain text and reasonable length
    if (firstName.length > 50 || isBase64(firstName)) {
        console.error('❌ firstName validation failed after processing:', firstName.substring(0, 30));
        firstName = 'Customer'; // Force fallback
    }
    
    if (lastName.length > 50 || (lastName.length > 0 && isBase64(lastName))) {
        console.warn('⚠️ lastName validation failed, setting to empty');
        lastName = ''; // Force empty if invalid
    }
    
    console.log('✅ Final plain text names:');
    console.log('   customerName:', customerName, '(length:', customerName.length + ')');
    console.log('   firstName:', firstName, '(length:', firstName.length + ')');
    console.log('   lastName:', lastName, '(length:', lastName.length + ')');
    
    // Build returnUrl - ALWAYS use production URL (never localhost)
    // Hardcoded to always use: https://www.shaktisewafoudation.in/api/zaakpay/callback
    const returnUrl = `https://www.shaktisewafoudation.in/api/zaakpay/callback?transaction_id=${transaction.transactionId}`;
    
    console.log('🔗 Return URL configured (hardcoded):', returnUrl);
    const amountPaisa = Math.round(transaction.amount * 100).toString();
    
    // Map payment option to instrument
    // According to Zaakpay docs:
    // - UPI Collect: paymentMode = "UPI", bankid = VPA address
    // - UPI Intent: paymentMode = "UPIAPP", bankid = "" (empty string)
    //   Zaakpay will return intent URLs for different apps in the response
    const mapOptionToInstrument = (opt) => {
        const instrument = {
            paymentMode: 'UPIAPP',
            netbanking: { bankid: '' }
        };
        
        switch (opt) {
            case 'upi':
            case 'upi-id':
                // UPI Collect - requires VPA (bankid must be VPA address)
                if (!vpa || vpa.trim().length === 0) {
                    throw new Error('VPA (UPI ID) is required for UPI Collect payment');
                }
                // Validate VPA format (e.g., user@paytm, user@ybl, user@upi)
                if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(vpa.trim())) {
                    throw new Error('Invalid VPA format. Please enter a valid UPI ID (e.g., yourname@paytm)');
                }
                instrument.paymentMode = 'UPI';
                instrument.netbanking.bankid = vpa.trim();
                break;
            case 'gpay':
            case 'phonepe':
            case 'paytm':
                // UPI Intent - bankid must be empty, Zaakpay returns intent URLs
                instrument.paymentMode = 'UPIAPP';
                instrument.netbanking.bankid = ''; // Empty as per docs
                break;
            default:
                // Default to UPI Intent
                instrument.paymentMode = 'UPIAPP';
                instrument.netbanking.bankid = '';
        }
        return instrument;
    };
    
    // Validate all required fields before building payment data
    const orderId = transaction.zaakpayOrderId || transaction.orderId;
    const email = String(transaction.customerEmail || '').trim();
    const phone = String(transaction.customerPhone || '').trim();
    const productDescription = (transaction.description || 'Payment').substring(0, 100);
    
    // Validate required fields
    if (!orderId || orderId.length === 0) {
        throw new Error('Order ID is missing');
    }
    if (orderId.length > 20) {
        throw new Error('Order ID must be 20 characters or less');
    }
    if (!email || email.length === 0) {
        throw new Error('Customer email is required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format');
    }
    if (!phone || phone.length === 0) {
        throw new Error('Customer phone is required');
    }
    if (phone.length < 10 || phone.length > 15) {
        throw new Error('Invalid phone number format');
    }
    if (!productDescription || productDescription.length === 0) {
        throw new Error('Product description is required');
    }
    
    // Final check: ensure firstName and lastName are definitely plain text
    // Force plain text one more time to be absolutely sure
    firstName = forcePlainTextName(firstName, 'Customer');
    lastName = forcePlainTextName(lastName, '');
    
    // Validate names are not encrypted (final check)
    if (isBase64(firstName) || firstName.length > 50) {
        console.error('❌ CRITICAL: firstName still encrypted after all processing!');
        firstName = 'Customer'; // Force fallback
    }
    if ((lastName.length > 0 && isBase64(lastName)) || lastName.length > 50) {
        console.warn('⚠️ lastName still encrypted, setting to empty');
        lastName = '';
    }
    
    // Build clean data object with plain text names
    const paymentData = {
        merchantIdentifier: MERCHANT_ID,
        showMobile: 'true',
        mode: '0',
        returnUrl,
        orderDetail: {
            orderId: orderId,
            amount: amountPaisa,
            currency: 'INR',
            productDescription: productDescription,
            email: email,
            phone: phone,
            firstName: firstName, // GUARANTEED plain text
            lastName: lastName     // GUARANTEED plain text
        },
        paymentInstrument: mapOptionToInstrument(option),
        billingAddress: { city: 'NA' },
        shippingAddress: { city: 'NA' }
    };
    
    // Final verification: double-check the JSON string doesn't contain encrypted values
    const dataString = JSON.stringify(paymentData);
    const firstNameInJson = dataString.match(/"firstName":"([^"]+)"/)?.[1];
    const lastNameInJson = dataString.match(/"lastName":"([^"]+)"/)?.[1];
    
    if (firstNameInJson && (isBase64(firstNameInJson) || firstNameInJson.length > 50)) {
        console.error('❌ CRITICAL: firstName in JSON is still encrypted!');
        console.error('   Value:', firstNameInJson);
        throw new Error('firstName validation failed - encrypted data detected in final JSON. Please create a new payment link.');
    }
    
    if (lastNameInJson && lastNameInJson.length > 0 && (isBase64(lastNameInJson) || lastNameInJson.length > 50)) {
        console.warn('⚠️ lastName in JSON looks encrypted, setting to empty');
        paymentData.orderDetail.lastName = '';
    }
    
    console.log('✅ Payment data validated - all names are plain text');
    console.log('   Order ID:', paymentData.orderDetail.orderId);
    console.log('   Amount (paisa):', paymentData.orderDetail.amount);
    console.log('   Email:', paymentData.orderDetail.email);
    console.log('   Phone:', paymentData.orderDetail.phone);
    console.log('   First Name:', paymentData.orderDetail.firstName, '(length:', paymentData.orderDetail.firstName.length + ', type:', typeof paymentData.orderDetail.firstName + ')');
    console.log('   Last Name:', paymentData.orderDetail.lastName, '(length:', paymentData.orderDetail.lastName.length + ', type:', typeof paymentData.orderDetail.lastName + ')');
    console.log('   Payment Mode:', paymentData.paymentInstrument.paymentMode);
    console.log('   Bank ID:', paymentData.paymentInstrument.netbanking.bankid);
    
    // Final sanity check - verify the data object is correct
    if (!paymentData.merchantIdentifier || !paymentData.orderDetail.orderId || !paymentData.orderDetail.amount) {
        throw new Error('Payment data validation failed: missing required fields');
    }
    
    return paymentData;
}

// Public endpoint to call Zaakpay API and get intent URLs (for Next.js to use)
exports.callZaakpayAPIForIntent = async (req, res) => {
    try {
        const { transactionId, option, vpa } = req.query;
        
        console.log('🔍 callZaakpayAPIForIntent called with:', {
            transactionId,
            option,
            vpa: vpa ? 'provided' : 'not provided',
            endpoint: TRANSACT_ENDPOINT,
            mode: MODE
        });
        
        if (!transactionId) {
            return res.status(400).json({
                success: false,
                error: 'Transaction ID is required'
            });
        }
        
        const transaction = await Transaction.findOne({ transactionId });
        if (!transaction) {
            console.error('❌ Transaction not found:', transactionId);
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        console.log('✅ Transaction found:', {
            transactionId: transaction.transactionId,
            orderId: transaction.zaakpayOrderId,
            amount: transaction.amount,
            customerName: transaction.customerName
        });
        
        // Build payment data
        const paymentData = buildPaymentData(transaction, option || 'upiapp', vpa || '');
        
        console.log('📦 Payment data built, calling Zaakpay API at:', TRANSACT_ENDPOINT);
        
        // Call Zaakpay API
        const apiResponse = await callZaakpayAPI(paymentData);
        
        // callZaakpayAPI returns responseData directly
        if (apiResponse && apiResponse.responseCode === '208' && apiResponse.bankPostData) {
            return res.json({
                success: true,
                intentUrls: {
                    android: apiResponse.bankPostData.androidIntentUrl || '',
                    gpay: apiResponse.bankPostData.gpayIntentIosUrl || apiResponse.bankPostData.androidIntentUrl || '',
                    phonepe: apiResponse.bankPostData.phonepeIntentIosUrl || apiResponse.bankPostData.androidIntentUrl || '',
                    paytm: apiResponse.bankPostData.paytmIntentIosUrl || apiResponse.bankPostData.androidIntentUrl || ''
                },
                responseCode: apiResponse.responseCode
            });
        }
        
        // Handle error responses
        if (apiResponse && apiResponse.responseCode) {
            return res.status(400).json({
                success: false,
                error: apiResponse.responseDescription || 'Failed to get intent URLs',
                responseCode: apiResponse.responseCode,
                orderDetail: apiResponse.orderDetail
            });
        }
        
        return res.status(500).json({
            success: false,
            error: 'Unexpected response from Zaakpay API',
            response: apiResponse
        });
        
    } catch (error) {
        console.error('❌ Error in callZaakpayAPIForIntent:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to call Zaakpay API'
        });
    }
};

// Function to call Zaakpay API server-to-server and get UPI intent URLs
async function callZaakpayAPI(paymentData) {
    try {
        const dataString = JSON.stringify(paymentData);
        const checksum = hmacSha256(dataString);
        
        console.log('📞 Calling Zaakpay API server-to-server...');
        console.log('   Payment Mode:', paymentData.paymentInstrument.paymentMode);
        console.log('   First Name:', paymentData.orderDetail.firstName, '(type:', typeof paymentData.orderDetail.firstName + ', length:', paymentData.orderDetail.firstName.length + ')');
        console.log('   Last Name:', paymentData.orderDetail.lastName, '(type:', typeof paymentData.orderDetail.lastName + ', length:', paymentData.orderDetail.lastName.length + ')');
        console.log('   Email:', paymentData.orderDetail.email);
        console.log('   Phone:', paymentData.orderDetail.phone);
        console.log('   Order ID:', paymentData.orderDetail.orderId);
        console.log('   Amount:', paymentData.orderDetail.amount);
        
        // Log the data string being sent (first 500 chars to see firstName/lastName)
        const dataPreview = dataString.substring(0, 500);
        console.log('   Data String Preview:', dataPreview);
        
        // Extract and verify firstName/lastName in the JSON string
        const fnMatch = dataString.match(/"firstName":"([^"]+)"/);
        const lnMatch = dataString.match(/"lastName":"([^"]+)"/);
        if (fnMatch) {
            console.log('   firstName in JSON:', fnMatch[1], '(length:', fnMatch[1].length + ', isBase64:', isBase64(fnMatch[1]) + ')');
        }
        if (lnMatch) {
            console.log('   lastName in JSON:', lnMatch[1], '(length:', lnMatch[1].length + ', isBase64:', isBase64(lnMatch[1]) + ')');
        }
        
        // Ensure dataString is properly formatted (no extra whitespace, proper JSON)
        let cleanDataString;
        try {
            // Re-parse and stringify to ensure clean JSON format
            const parsed = JSON.parse(dataString);
            cleanDataString = JSON.stringify(parsed);
        } catch (e) {
            // If parsing fails, use original (shouldn't happen)
            console.warn('   ⚠️ Could not re-parse dataString, using original');
            cleanDataString = dataString;
        }
        
        // Verify checksum calculation
        const verifyChecksum = hmacSha256(cleanDataString);
        if (verifyChecksum !== checksum) {
            console.error('   ❌ Checksum mismatch! Recalculating...');
            checksum = verifyChecksum;
        }
        
        // Build form data - Zaakpay expects data and checksum as form fields
        const formData = querystring.stringify({
            data: cleanDataString,
            checksum: checksum
        });
        
        console.log('   📤 Sending to Zaakpay API:');
        console.log('      ========================================');
        console.log('      Endpoint URL:', TRANSACT_ENDPOINT);
        console.log('      Mode:', MODE);
        console.log('      Merchant ID:', MERCHANT_ID ? MERCHANT_ID.substring(0, 15) + '...' : 'NOT SET');
        console.log('      Data length:', cleanDataString.length, 'bytes');
        console.log('      Checksum:', checksum.substring(0, 20) + '...');
        console.log('      Return URL:', paymentData.returnUrl);
        console.log('      Payment Mode:', paymentData.paymentInstrument?.paymentMode);
        console.log('      Order ID:', paymentData.orderDetail?.orderId);
        console.log('      Amount:', paymentData.orderDetail?.amount);
        console.log('      ========================================');
        
        // Log a sample of the data being sent (first 200 chars)
        const dataSample = cleanDataString.substring(0, 200);
        console.log('      Data sample (first 200 chars):', dataSample);
        
        // Call Zaakpay API with shorter timeout and no retries for faster failure
        // According to Zaakpay docs, API should respond quickly
        const http = require('http');
        const https = require('https');
        
        const startTime = Date.now();
        console.log('      ⏱️  Making API call at:', new Date().toISOString());
        console.log('      🔗 Full URL:', TRANSACT_ENDPOINT);
        
        // Increase timeout for staging (can be slower) and production
        const apiTimeout = MODE === 'production' ? 25000 : 35000; // 35s for staging, 25s for production
        const connectionTimeout = MODE === 'production' ? 8000 : 12000; // 12s for staging, 8s for production
        
        console.log('      ⏱️  Timeout settings:', {
            apiTimeout: apiTimeout + 'ms',
            connectionTimeout: connectionTimeout + 'ms',
            mode: MODE
        });
        
        let response;
        try {
            response = await axios.post(TRANSACT_ENDPOINT, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'User-Agent': 'Zaakpay-Integration/1.0'
                },
                timeout: apiTimeout,
                maxRedirects: 0,
                // Connection timeout - longer for staging
                httpAgent: new http.Agent({ 
                    timeout: connectionTimeout,
                    keepAlive: false 
                }),
                httpsAgent: new https.Agent({ 
                    timeout: connectionTimeout,
                    keepAlive: false,
                    rejectUnauthorized: true // Verify SSL certificate
                })
            });
            
            const elapsed = Date.now() - startTime;
            console.log('      ✅ API call completed in', elapsed, 'ms');
            console.log('      📥 Response status:', response.status);
        } catch (axiosError) {
            const elapsed = Date.now() - startTime;
            console.error('      ❌ API call failed after', elapsed, 'ms');
            console.error('      Error code:', axiosError.code);
            console.error('      Error message:', axiosError.message);
            
            if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
                console.error('      ⚠️ TIMEOUT ERROR - Possible causes:');
                console.error('         1. Zaakpay server is slow or overloaded');
                console.error('         2. Network connectivity issues');
                console.error('         3. Firewall/proxy blocking the request');
                console.error('         4. DNS resolution problems');
                console.error('      💡 Try:');
                console.error('         - Check Zaakpay status page');
                console.error('         - Verify network connectivity');
                console.error('         - Check if endpoint is correct:', TRANSACT_ENDPOINT);
            }
            
            if (axiosError.response) {
                console.error('      Response status:', axiosError.response.status);
                console.error('      Response data:', JSON.stringify(axiosError.response.data).substring(0, 500));
            } else if (axiosError.request) {
                console.error('      ⚠️ Request was made but no response received');
                console.error('      Request config:', {
                    url: axiosError.config?.url,
                    method: axiosError.config?.method,
                    timeout: axiosError.config?.timeout
                });
            }
            
            throw axiosError;
        }
        
        console.log('✅ Zaakpay API Response Status:', response.status);
        
        // Zaakpay returns JSON response
        let responseData;
        if (typeof response.data === 'string') {
            try {
                responseData = JSON.parse(response.data);
            } catch (e) {
                responseData = response.data;
            }
        } else {
            responseData = response.data;
        }
        
        // Check for validation errors
        if (responseData && responseData.responseCode) {
            const responseCode = String(responseData.responseCode);
            
            // Response code 109 = Validation error
            if (responseCode === '109') {
                console.error('❌ Zaakpay Validation Error (109):', responseData.responseDescription);
                console.error('   Full Response:', JSON.stringify(responseData, null, 2));
                
                // Log what we sent vs what Zaakpay received
                console.error('   📤 Data we sent:');
                console.error('      firstName:', paymentData.orderDetail.firstName);
                console.error('      lastName:', paymentData.orderDetail.lastName);
                console.error('      email:', paymentData.orderDetail.email);
                console.error('      phone:', paymentData.orderDetail.phone);
                console.error('      orderId:', paymentData.orderDetail.orderId);
                console.error('      amount:', paymentData.orderDetail.amount);
                console.error('      merchantIdentifier:', paymentData.merchantIdentifier);
                console.error('      returnUrl:', paymentData.returnUrl);
                
                // Note: Zaakpay may return encrypted values in error responses (this is how they store data)
                // This doesn't mean we sent encrypted data - it's just how they echo it back
                // Focus on the actual validation error message
                
                // Check for common validation issues
                let errorDetails = responseData.responseDescription || 'One or more fields have validation errors';
                
                // Add helpful hints based on common issues
                const hints = [];
                
                if (!paymentData.returnUrl) {
                    hints.push('returnUrl is missing');
                } else if (!paymentData.returnUrl.startsWith('http://') && !paymentData.returnUrl.startsWith('https://')) {
                    hints.push('returnUrl must be a valid HTTP/HTTPS URL');
                } else if (paymentData.returnUrl.includes('localhost') || paymentData.returnUrl.includes('127.0.0.1')) {
                    hints.push('returnUrl cannot be localhost - Zaakpay cannot reach localhost URLs. Use a public URL (e.g., ngrok tunnel) or set ZACKPAY_CALLBACK_URL environment variable');
                } else {
                    hints.push('returnUrl must be registered in Zaakpay dashboard (Developers > Integration URLs). Current returnUrl: ' + paymentData.returnUrl);
                }
                
                if (!paymentData.merchantIdentifier) {
                    hints.push('merchantIdentifier is missing');
                }
                
                if (!paymentData.orderDetail?.orderId) {
                    hints.push('orderId is missing');
                } else if (paymentData.orderDetail.orderId.length > 20) {
                    hints.push('orderId must be 20 characters or less');
                }
                
                // Note: Encrypted values in Zaakpay response are normal - they echo back data in encrypted format
                // This doesn't mean we sent encrypted data
                
                const hintText = hints.length > 0 ? ` Common issues: ${hints.join(', ')}.` : '';
                
                // Provide specific guidance for returnUrl issues
                let additionalHelp = '';
                if (paymentData.returnUrl && (paymentData.returnUrl.includes('localhost') || paymentData.returnUrl.includes('127.0.0.1'))) {
                    additionalHelp = '\n\n🔧 HOW TO FIX returnUrl (localhost) issue:\n' +
                        '   1. Install ngrok: npm install -g ngrok (or npx ngrok)\n' +
                        '   2. Start tunnel: ngrok http 5001\n' +
                        '   3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)\n' +
                        '   4. Set environment variable: ZACKPAY_CALLBACK_URL=https://abc123.ngrok.io\n' +
                        '   5. Register this URL in Zaakpay dashboard: Developers > Integration URLs\n' +
                        '   6. Restart your server and try again';
                } else if (paymentData.returnUrl) {
                    additionalHelp = '\n\n🔧 HOW TO FIX returnUrl registration:\n' +
                        '   1. Log in to Zaakpay dashboard (staging: https://zaakstaging.zaakpay.com)\n' +
                        '   2. Go to: Developers > Integration URLs\n' +
                        '   3. Add/register your returnUrl: ' + paymentData.returnUrl + '\n' +
                        '   4. Save and try creating a new payment link';
                }
                
                throw new Error(`Zaakpay validation error (109): ${errorDetails}.${hintText}${additionalHelp}`);
            }
            
            // Other error codes
            if (responseCode !== '100' && responseCode !== '208') {
                console.error('❌ Zaakpay API Error:', responseCode, responseData.responseDescription);
                throw new Error(`Zaakpay error (${responseCode}): ${responseData.responseDescription || 'Transaction failed'}`);
            }
        }
        
        return responseData;
    } catch (error) {
        console.error('❌ Zaakpay API call error:', error.code || error.message);
        console.error('   Error details:', {
            code: error.code,
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        // Provide helpful error message
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            throw new Error(`Zaakpay API timeout: The API took too long to respond. This might be a temporary issue with Zaakpay's servers. Please try again in a moment.`);
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            throw new Error(`Network error: Could not connect to Zaakpay API. Please check your internet connection and try again.`);
        } else if (error.response?.data) {
            // Zaakpay returned an error response
            throw error; // Will be handled by caller
        } else {
            throw new Error(`Zaakpay API error: ${error.message || 'Unknown error occurred'}`);
        }
    }
}

exports.getZaakpayCheckoutPage = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const option = (req.query.option || '').toString().toLowerCase();
        const vpa = req.query.vpa;

        const transaction = await Transaction.findOne({ transactionId });
        if (!transaction) {
            return res.status(404).send('<h3>Payment link not found</h3>');
        }

        if (transaction.status !== 'created' && transaction.status !== 'pending') {
            return res.status(400).send(`<h3>Payment link already ${transaction.status}</h3>`);
        }
        
        // If option is selected, call Zaakpay API and get intent URLs
        if (option && ['upi', 'upi-id', 'gpay', 'phonepe', 'paytm'].includes(option)) {
            try {
                const paymentData = buildPaymentData(transaction, option, vpa);
                
                // For UPI Intent (gpay/phonepe/paytm), call API and get intent URLs
                if (['gpay', 'phonepe', 'paytm'].includes(option)) {
                    const apiResponse = await callZaakpayAPI(paymentData);
                    
                    console.log('📥 Zaakpay API Response:', JSON.stringify(apiResponse, null, 2));
                    
                    if (apiResponse.responseCode === '208' && apiResponse.bankPostData) {
                        // UPI Intent response - extract intent URLs
                        const intentUrls = apiResponse.bankPostData;
                        const androidIntentUrl = intentUrls.androidIntentUrl;
                        const gpayUrl = intentUrls.gpayIntentIosUrl || androidIntentUrl;
                        const phonepeUrl = intentUrls.phonepeIntentIosUrl || androidIntentUrl;
                        const paytmUrl = intentUrls.paytmIntentIosUrl || androidIntentUrl;
                        
                        // Return page with buttons for each app
                        return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Choose Payment App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #008cdd 0%, #0066aa 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .header .amount {
      font-size: 36px;
      font-weight: 700;
      margin-top: 8px;
    }
    .content {
      padding: 32px 24px;
    }
    .payment-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .payment-option {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
      text-decoration: none;
      color: inherit;
    }
    .payment-option:hover {
      border-color: #008cdd;
      background: #f0f9ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,140,221,0.15);
    }
    .payment-option .icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-right: 16px;
      flex-shrink: 0;
    }
    .payment-option.gpay .icon { background: #4285f4; color: white; }
    .payment-option.phonepe .icon { background: #5f259f; color: white; }
    .payment-option.paytm .icon { background: #00baf2; color: white; }
    .payment-option .text {
      flex: 1;
    }
    .payment-option .title {
      font-weight: 600;
      font-size: 16px;
      color: #111827;
      margin-bottom: 4px;
    }
    .payment-option .subtitle {
      font-size: 13px;
      color: #6b7280;
    }
    .payment-option .arrow {
      color: #9ca3af;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Choose Payment App</h1>
      <div class="amount">₹${escapeHtml(transaction.amount.toFixed(2))}</div>
    </div>
    <div class="content">
      <div class="payment-options">
        <a href="${escapeHtml(gpayUrl)}" class="payment-option gpay" onclick="openIntent(event, '${escapeHtml(gpayUrl)}')">
          <div class="icon">G</div>
          <div class="text">
            <div class="title">Google Pay</div>
            <div class="subtitle">Open Google Pay app</div>
          </div>
          <div class="arrow">→</div>
        </a>
        <a href="${escapeHtml(phonepeUrl)}" class="payment-option phonepe" onclick="openIntent(event, '${escapeHtml(phonepeUrl)}')">
          <div class="icon">P</div>
          <div class="text">
            <div class="title">PhonePe</div>
            <div class="subtitle">Open PhonePe app</div>
          </div>
          <div class="arrow">→</div>
        </a>
        <a href="${escapeHtml(paytmUrl)}" class="payment-option paytm" onclick="openIntent(event, '${escapeHtml(paytmUrl)}')">
          <div class="icon">P</div>
          <div class="text">
            <div class="title">Paytm</div>
            <div class="subtitle">Open Paytm app</div>
          </div>
          <div class="arrow">→</div>
        </a>
      </div>
    </div>
  </div>
  <script>
    function openIntent(e, url) {
      e.preventDefault();
      console.log('Opening UPI Intent:', url);
      window.location.href = url;
    }
  </script>
</body>
</html>`);
                    } else {
                        throw new Error(apiResponse.responseDescription || 'Failed to get UPI intent URLs');
                    }
                } else {
                    // UPI Collect - submit form to Zaakpay
                    const dataString = JSON.stringify(paymentData);
                    const checksum = hmacSha256(dataString);
                    
                    return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting to Zaakpay...</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f6f8fb; margin:0; padding:24px; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { max-width:400px; background:#fff; border-radius:12px; padding:32px; box-shadow:0 6px 24px rgba(0,0,0,0.08); text-align:center; }
    .spinner { border:3px solid #f3f3f3; border-top:3px solid #008cdd; border-radius:50%; width:40px; height:40px; animation:spin 1s linear infinite; margin:20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <h2>Redirecting to Zaakpay...</h2>
    <div class="spinner"></div>
    <p style="color:#6b7280; margin-top:16px;">Please wait while we redirect you to complete your payment.</p>
  </div>
  <form id="zpForm" method="POST" action="${TRANSACT_ENDPOINT}" style="display:none;">
    <input type="hidden" name="data" value="${escapeHtml(dataString)}" />
    <input type="hidden" name="checksum" value="${checksum}" />
  </form>
  <script>
    setTimeout(function() {
      document.getElementById('zpForm').submit();
    }, 500);
  </script>
</body>
</html>`);
                }
            } catch (error) {
                console.error('❌ Error building payment data:', error);
                const isEncryptedError = error.message.includes('encrypted') || error.message.includes('Invalid customer data');
                return res.status(500).send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Error</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f6f8fb; margin:0; padding:24px; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { max-width:500px; background:#fff; border-radius:12px; padding:32px; box-shadow:0 6px 24px rgba(0,0,0,0.08); }
    .error-icon { width:64px; height:64px; background:#fee; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; font-size:32px; }
    h2 { color:#dc2626; text-align:center; margin-bottom:16px; }
    p { color:#6b7280; line-height:1.6; margin-bottom:12px; }
    .solution { background:#f0f9ff; border-left:4px solid #008cdd; padding:16px; margin-top:24px; border-radius:8px; }
    .solution strong { color:#008cdd; display:block; margin-bottom:8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="error-icon">⚠️</div>
    <h2>Payment Link Error</h2>
    <p>${escapeHtml(error.message)}</p>
    ${isEncryptedError ? `
    <div class="solution">
      <strong>Solution:</strong>
      <p>This payment link contains encrypted customer data and cannot be used. Please create a <strong>new payment link</strong> with plain text customer information.</p>
      <p>The merchant should create a fresh payment link using the API with plain text customer name (not encrypted).</p>
    </div>
    ` : ''}
  </div>
</body>
</html>`);
            }
        }
        
        // Show custom checkout page - fetch UPI intent URLs and display as buttons
        let intentUrls = {
            android: '',
            gpay: '',
            phonepe: '',
            paytm: ''
        };
        
        try {
            // Build payment data for UPI Intent
            const paymentData = buildPaymentData(transaction, 'upiapp', '');
            const apiResponse = await callZaakpayAPI(paymentData);
            
            console.log('📥 Zaakpay API Response for checkout page:', JSON.stringify(apiResponse, null, 2));
            
            if (apiResponse.responseCode === '208' && apiResponse.bankPostData) {
                intentUrls = {
                    android: apiResponse.bankPostData.androidIntentUrl || '',
                    gpay: apiResponse.bankPostData.gpayIntentIosUrl || apiResponse.bankPostData.androidIntentUrl || '',
                    phonepe: apiResponse.bankPostData.phonepeIntentIosUrl || apiResponse.bankPostData.androidIntentUrl || '',
                    paytm: apiResponse.bankPostData.paytmIntentIosUrl || apiResponse.bankPostData.androidIntentUrl || ''
                };
                console.log('✅ UPI Intent URLs fetched successfully');
            } else {
                console.warn('⚠️ Unexpected API response:', apiResponse.responseCode, apiResponse.responseDescription);
            }
        } catch (error) {
            console.error('❌ Error fetching UPI intent URLs:', error.message);
            // Continue to show page with fallback - buttons will use query params as fallback
        }
            
            // Show custom checkout page with UPI options (no auto-redirect)
            const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zaakpay Payment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #008cdd 0%, #0066aa 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .header .amount {
      font-size: 36px;
      font-weight: 700;
      margin-top: 8px;
    }
    .content {
      padding: 32px 24px;
    }
    .merchant-info {
      text-align: center;
      margin-bottom: 32px;
      color: #6b7280;
      font-size: 14px;
    }
    .payment-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .payment-option {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
      text-decoration: none;
      color: inherit;
    }
    .payment-option:hover {
      border-color: #008cdd;
      background: #f0f9ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,140,221,0.15);
    }
    .payment-option .icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-right: 16px;
      flex-shrink: 0;
    }
    .payment-option.gpay .icon { background: #4285f4; color: white; }
    .payment-option.phonepe .icon { background: #5f259f; color: white; }
    .payment-option.paytm .icon { background: #00baf2; color: white; }
    .payment-option.upi .icon { background: #6c5ce7; color: white; }
    .payment-option .text {
      flex: 1;
    }
    .payment-option .title {
      font-weight: 600;
      font-size: 16px;
      color: #111827;
      margin-bottom: 4px;
    }
    .payment-option .subtitle {
      font-size: 13px;
      color: #6b7280;
    }
    .payment-option .arrow {
      color: #9ca3af;
      font-size: 20px;
    }
    .upi-input-section {
      margin-top: 16px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      display: none;
    }
    .upi-input-section.active {
      display: block;
    }
    .upi-input-section input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .upi-input-section input:focus {
      outline: none;
      border-color: #008cdd;
    }
    .upi-input-section button {
      width: 100%;
      padding: 12px;
      background: #008cdd;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    .upi-input-section button:hover {
      background: #0066aa;
    }
    .footer {
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Complete Payment</h1>
      <div class="amount">₹${escapeHtml(transaction.amount.toFixed(2))}</div>
      <div style="margin-top: 8px; font-size: 14px; opacity: 0.9;">${escapeHtml(transaction.description || 'Payment')}</div>
    </div>
    <div class="content">
      <div class="merchant-info">
        Paying to: ${escapeHtml(transaction.merchantName || 'Merchant')}
      </div>
      <div class="payment-options">
        <a href="${intentUrls.gpay || `?option=gpay&transactionId=${encodeURIComponent(transactionId)}`}" class="payment-option gpay" ${intentUrls.gpay ? `onclick="window.location.href='${escapeHtml(intentUrls.gpay)}'; return false;"` : ''}>
          <div class="icon">G</div>
          <div class="text">
            <div class="title">Google Pay</div>
            <div class="subtitle">Pay using Google Pay app</div>
          </div>
          <div class="arrow">→</div>
        </a>
        <a href="${intentUrls.phonepe || `?option=phonepe&transactionId=${encodeURIComponent(transactionId)}`}" class="payment-option phonepe" ${intentUrls.phonepe ? `onclick="window.location.href='${escapeHtml(intentUrls.phonepe)}'; return false;"` : ''}>
          <div class="icon">P</div>
          <div class="text">
            <div class="title">PhonePe</div>
            <div class="subtitle">Pay using PhonePe app</div>
          </div>
          <div class="arrow">→</div>
        </a>
        <a href="${intentUrls.paytm || `?option=paytm&transactionId=${encodeURIComponent(transactionId)}`}" class="payment-option paytm" ${intentUrls.paytm ? `onclick="window.location.href='${escapeHtml(intentUrls.paytm)}'; return false;"` : ''}>
          <div class="icon">P</div>
          <div class="text">
            <div class="title">Paytm</div>
            <div class="subtitle">Pay using Paytm app</div>
          </div>
          <div class="arrow">→</div>
        </a>
        <div class="payment-option upi" onclick="showUpiInput()">
          <div class="icon">U</div>
          <div class="text">
            <div class="title">Pay by any UPI ID</div>
            <div class="subtitle">Enter your UPI ID to pay</div>
          </div>
          <div class="arrow">→</div>
        </div>
        <div class="upi-input-section" id="upiInput">
          <input type="text" id="vpaInput" placeholder="Enter your UPI ID (e.g., yourname@paytm)" />
          <button onclick="submitUpiPayment()">Continue to Payment</button>
        </div>
      </div>
    </div>
    <div class="footer">
      Secured by Zaakpay
    </div>
  </div>
  <script>
    function showUpiInput() {
      document.getElementById('upiInput').classList.add('active');
      document.getElementById('vpaInput').focus();
    }
    function submitUpiPayment() {
      const vpa = document.getElementById('vpaInput').value.trim();
      if (!vpa) {
        alert('Please enter your UPI ID');
        return;
      }
      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(vpa)) {
        alert('Please enter a valid UPI ID (e.g., yourname@paytm)');
        return;
      }
      window.location.href = '?option=upi&transactionId=${encodeURIComponent(transactionId)}&vpa=' + encodeURIComponent(vpa);
    }
  </script>
</body>
</html>`;
        
        res.set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        return res.send(html);
    } catch (error) {
        console.error('❌ Zaakpay checkout page error:', error);
        res.status(500).send(`<h3>Zaakpay checkout error</h3><pre>${escapeHtml(error.message)}</pre>`);
    }
};

exports.getZaakpayTransaction = async (req, res) => {
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
        
        // CRITICAL: Decode customerName if it's encrypted (base64)
        // This ensures we always return plain text names to the frontend
        let customerName = String(transaction.customerName || '').trim();
        
        console.log('🔍 [getZaakpayTransaction] Processing customerName:');
        console.log('   Raw value from DB:', customerName);
        console.log('   Length:', customerName.length);
        console.log('   Looks like base64:', isBase64(customerName));
        
        // Force plain text extraction
        customerName = forcePlainTextName(customerName, 'Customer');
        
        console.log('✅ [getZaakpayTransaction] Decoded customerName:', customerName);
        
        // If the name was encrypted, update the transaction in the database with the decoded value
        // This prevents future issues
        if (isBase64(String(transaction.customerName || '').trim())) {
            console.warn('⚠️ [getZaakpayTransaction] Detected encrypted customerName in DB, updating transaction');
            try {
                transaction.customerName = customerName;
                await transaction.save();
                console.log('✅ [getZaakpayTransaction] Transaction updated with plain text customerName');
            } catch (updateError) {
                console.error('❌ [getZaakpayTransaction] Failed to update transaction:', updateError);
                // Continue anyway - we'll return the decoded name
            }
        }
        
        res.json({
            success: true,
            transaction: {
                transactionId: transaction.transactionId,
                orderId: transaction.orderId,
                zaakpayOrderId: transaction.zaakpayOrderId,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                customerName: customerName, // Use decoded name
                customerEmail: transaction.customerEmail,
                customerPhone: transaction.customerPhone,
                description: transaction.description,
                merchantName: transaction.merchantName,
                paymentGateway: transaction.paymentGateway,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt
            }
        });
    } catch (error) {
        console.error('❌ Error fetching Zaakpay transaction:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch transaction'
        });
    }
};

exports.handleZaakpayCallback = async (req, res) => {
    try {
        const payload = req.body || req.query || {};
        const orderId = payload.orderId || payload.orderid;
        const responseCode = payload.responseCode || payload.responsecode;
        const transaction = await Transaction.findOne({
            $or: [
                { orderId: orderId },
                { zaakpayOrderId: orderId }
            ]
        }).populate('merchantId');

        if (!transaction) {
            return res.status(404).send('Transaction not found');
        }

        const amountRupees = payload.amount ? parseFloat(payload.amount) / 100 : transaction.amount;

        if (responseCode === '100' || responseCode === 100) {
            const paidAt = new Date();
            const expectedSettlement = await calculateExpectedSettlementDate(paidAt);
            const commissionData = calculatePayinCommission(amountRupees);

            await Transaction.findOneAndUpdate(
                { _id: transaction._id },
                {
                    status: 'paid',
                    paidAt,
                    paymentMethod: payload.paymentMode || 'UPI',
                    zaakpayPaymentId: payload.paymentId || payload.payment_id || payload.txnId,
                    acquirerData: {
                        utr: payload.utr || payload.bankTransactionId || null,
                        bank_transaction_id: payload.bankTransactionId || null
                    },
                    settlementStatus: 'unsettled',
                    expectedSettlementDate: expectedSettlement,
                    commission: commissionData.commission,
                    netAmount: parseFloat((amountRupees - commissionData.commission).toFixed(2)),
                    webhookData: payload
                }
            );
        } else {
            await Transaction.findOneAndUpdate(
                { _id: transaction._id },
                {
                    status: 'failed',
                    failureReason: payload.responseDescription || 'Payment failed',
                    webhookData: payload
                }
            );
        }

        const successUrl = transaction.successUrl || transaction.callbackUrl;
        const failureUrl = transaction.failureUrl;

        if (responseCode === '100' || responseCode === 100) {
            return res.redirect(successUrl || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success?transaction_id=${transaction.transactionId}`);
        }

        return res.redirect(failureUrl || `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed?transaction_id=${transaction.transactionId}`);
    } catch (error) {
        console.error('❌ Zaakpay callback error:', error);
        res.status(500).send('Callback processing failed');
    }
};

