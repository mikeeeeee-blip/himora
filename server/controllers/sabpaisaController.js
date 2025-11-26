const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');

// SabPaisa Configuration
// Support multiple credential formats (case-insensitive matching)
// Note: Environment variable names in .env are case-sensitive, but we check multiple variations
const SABPAISA_AES_KEY_BASE64 = process.env.SABPAISA_AES_KEY_BASE64 || 
                                  process.env.AuthenticationKey || 
                                  process.env.AUTHENTICATION_KEY ||
                                  process.env.authenticationkey;
const SABPAISA_HMAC_KEY_BASE64 = process.env.SABPAISA_HMAC_KEY_BASE64 || 
                                  process.env.AuthenticationIV || 
                                  process.env.AUTHENTICATION_IV ||
                                  process.env.authenticationiv;
const SABPAISA_CLIENT_CODE = process.env.SABPAISA_CLIENT_CODE || 
                              process.env.ClientCode || 
                              process.env.CLIENT_CODE ||
                              process.env.clientcode;
const SABPAISA_TRANS_USER_NAME = process.env.SABPAISA_TRANS_USER_NAME || 
                                  process.env.UserName || 
                                  process.env.USER_NAME ||
                                  process.env.username;
const SABPAISA_TRANS_USER_PASSWORD = process.env.SABPAISA_TRANS_USER_PASSWORD || 
                                     process.env.Password || 
                                     process.env.PASSWORD ||
                                     process.env.password;
const SABPAISA_DOMAIN = process.env.SabPaisaDomain || 
                        process.env.SABPAISA_DOMAIN ||
                        process.env.SABPAISA_DOMAIN_URL ||
                        process.env.sabpaisadomain;

// SabPaisa Environment (defaults to production)
const SABPAISA_ENVIRONMENT = process.env.SABPAISA_ENVIRONMENT || 
                             process.env.SabPaisaEnvironment ||
                             'production'; // 'staging' or 'production'

// SabPaisa API URLs
const SABPAISA_SP_URL = SABPAISA_DOMAIN 
    ? `${SABPAISA_DOMAIN}${SABPAISA_DOMAIN.includes('?') ? '' : '?v=1'}`
    : (SABPAISA_ENVIRONMENT === 'staging'
        ? 'https://stage-securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1'
        : 'https://securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1');

// Encryption constants
const IV_SIZE = 12;
const TAG_SIZE = 16;
const HMAC_SIZE = 48;

// ============ ENCRYPTION/DECRYPTION UTILITIES ============

/**
 * Convert hex string to Buffer
 */
function hexToBuffer(hex) {
    return Buffer.from(hex, 'hex');
}

/**
 * Convert Buffer to uppercase hex string
 */
function bufferToHex(buffer) {
    return buffer.toString('hex').toUpperCase();
}

/**
 * Encrypt plaintext string -> HEX string (HMAC || IV || ciphertext || tag)
 * Format: HMAC(48 bytes) || IV(12 bytes) || Ciphertext || Tag(16 bytes)
 * 
 * Uses direct base64 decoding of keys (no key derivation) as per SubPaisa specification
 */
function encrypt(plaintext) {
    if (!SABPAISA_AES_KEY_BASE64 || !SABPAISA_HMAC_KEY_BASE64) {
        throw new Error('SabPaisa encryption keys not configured');
    }

    // Direct base64 decoding of keys (no derivation) - as per SubPaisa specification
    const aesKey = Buffer.from(SABPAISA_AES_KEY_BASE64, 'base64');
    const hmacKey = Buffer.from(SABPAISA_HMAC_KEY_BASE64, 'base64');
    
    console.log('🔐 Encryption Key Processing:');
    console.log('   AES Key (base64 decoded):', aesKey.length, 'bytes');
    console.log('   HMAC Key (base64 decoded):', hmacKey.length, 'bytes');
    
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(IV_SIZE);
    
    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv, { authTagLength: TAG_SIZE });
    let encrypted = cipher.update(Buffer.from(plaintext, 'utf8'));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Build encrypted message: IV || Ciphertext || Tag
    const encryptedMessage = Buffer.concat([iv, encrypted, tag]);
    
    // Compute HMAC-SHA384 of the encrypted message
    const hmac = crypto.createHmac('sha384', hmacKey).update(encryptedMessage).digest();
    
    // Final message: HMAC || IV || Ciphertext || Tag
    const finalMessage = Buffer.concat([hmac, encryptedMessage]);
    
    return bufferToHex(finalMessage);
}

/**
 * Decrypt HEX string -> plaintext string
 * 
 * Uses direct base64 decoding of keys (no key derivation) as per SubPaisa specification
 */
function decrypt(hexCiphertext) {
    if (!SABPAISA_AES_KEY_BASE64 || !SABPAISA_HMAC_KEY_BASE64) {
        throw new Error('SabPaisa encryption keys not configured');
    }

    // Direct base64 decoding of keys (no derivation) - as per SubPaisa specification
    const aesKey = Buffer.from(SABPAISA_AES_KEY_BASE64, 'base64');
    const hmacKey = Buffer.from(SABPAISA_HMAC_KEY_BASE64, 'base64');
    
    const fullMessage = hexToBuffer(hexCiphertext);
    
    if (fullMessage.length < HMAC_SIZE + IV_SIZE + TAG_SIZE) {
        throw new Error('Invalid ciphertext length');
    }
    
    // Extract HMAC and encrypted data
    const hmacReceived = fullMessage.slice(0, HMAC_SIZE);
    const encryptedData = fullMessage.slice(HMAC_SIZE);
    
    // Verify HMAC
    const hmacComputed = crypto.createHmac('sha384', hmacKey).update(encryptedData).digest();
    
    if (!crypto.timingSafeEqual(hmacReceived, hmacComputed)) {
        throw new Error('HMAC validation failed - data may be tampered');
    }
    
    // Extract IV, ciphertext, and tag
    const iv = encryptedData.slice(0, IV_SIZE);
    const tag = encryptedData.slice(encryptedData.length - TAG_SIZE);
    const ciphertext = encryptedData.slice(IV_SIZE, encryptedData.length - TAG_SIZE);
    
    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv, { authTagLength: TAG_SIZE });
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
}

/**
 * Generate random string helper function
 */
function randomStr(len, arr) {
    let ans = '';
    for (let i = 0; i < len; i++) {
        ans += arr[Math.floor(Math.random() * arr.length)];
    }
    return ans;
}

/**
 * Format transaction date for SabPaisa
 */
function formatTransDate() {
    const now = new Date();
    const pad = n => n < 10 ? '0' + n : n;
    return (
        now.getFullYear() + '-' +
        pad(now.getMonth() + 1) + '-' +
        pad(now.getDate()) + ' ' +
        pad(now.getHours()) + ':' +
        pad(now.getMinutes()) + ':' +
        pad(now.getSeconds())
    );
}

// ============ CREATE SABPAISA PAYMENT LINK ============
exports.createSabpaisaPaymentLink = async (req, res) => {
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
        console.log('📤 SabPaisa Payment Link Creation Request');
        console.log('='.repeat(80));
        console.log('   Merchant:', merchantName, `(${merchantId})`);
        console.log('   Environment:', SABPAISA_ENVIRONMENT);

        // Validate credentials
        // Support both naming conventions:
        // Old: SABPAISA_AES_KEY_BASE64, SABPAISA_HMAC_KEY_BASE64, etc.
        // New: AuthenticationKey, AuthenticationIV, ClientCode, UserName, Password
        if (!SABPAISA_AES_KEY_BASE64 || !SABPAISA_HMAC_KEY_BASE64 || !SABPAISA_CLIENT_CODE || 
            !SABPAISA_TRANS_USER_NAME || !SABPAISA_TRANS_USER_PASSWORD) {
            console.error('❌ SabPaisa credentials not configured');
            console.error('   Missing:', {
                AES_KEY: !SABPAISA_AES_KEY_BASE64,
                HMAC_KEY: !SABPAISA_HMAC_KEY_BASE64,
                CLIENT_CODE: !SABPAISA_CLIENT_CODE,
                USER_NAME: !SABPAISA_TRANS_USER_NAME,
                PASSWORD: !SABPAISA_TRANS_USER_PASSWORD
            });
            return res.status(500).json({
                success: false,
                error: 'SabPaisa credentials not configured. Please set the following environment variables:',
                required_variables: {
                    'Option 1 (New format)': {
                        'AuthenticationKey': 'Your AES encryption key (base64)',
                        'AuthenticationIV': 'Your HMAC key (base64)',
                        'ClientCode': 'Your client code',
                        'UserName': 'Your transaction username',
                        'Password': 'Your transaction password',
                        'SabPaisaDomain': 'SabPaisa domain URL (optional)'
                    },
                    'Option 2 (Old format)': {
                        'SABPAISA_AES_KEY_BASE64': 'Your AES encryption key (base64)',
                        'SABPAISA_HMAC_KEY_BASE64': 'Your HMAC key (base64)',
                        'SABPAISA_CLIENT_CODE': 'Your client code',
                        'SABPAISA_TRANS_USER_NAME': 'Your transaction username',
                        'SABPAISA_TRANS_USER_PASSWORD': 'Your transaction password'
                    }
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
        if (parseFloat(amount) < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Generate unique IDs
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const clientTxnId = randomStr(20, '12345abcde');
        const referenceId = `REF_${Date.now()}`;

        // Get merchant's configured URLs or use provided ones
        const merchant = await User.findById(merchantId);

        // Priority: API provided URL > Merchant configured URL > Default URL
        const finalCallbackUrl = callback_url ||
            merchant.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        // SabPaisa callback URL - points to our callback handler
        const sabpaisaCallbackUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/sabpaisa/callback?transaction_id=${transactionId}`;

        // Prepare request string for encryption
        // Channel ID: 'W' for Web, 'M' for Mobile, 'U' for UPI
        // For UPI payments, we can use 'U' or 'W' (Web with UPI option)
        const channelId = req.body.payment_method === 'upi' ? 'U' : 'W'; // U for UPI, W for Web (all methods)
        const mcc = '5666'; // Merchant Category Code
        const transDate = formatTransDate();
        
        // Build request parameters
        const requestParams = [
            `payerName=${customer_name}`,
            `payerEmail=${customer_email}`,
            `payerMobile=${customer_phone}`,
            `clientTxnId=${clientTxnId}`,
            `amount=${amount}`,
            `clientCode=${SABPAISA_CLIENT_CODE}`,
            `transUserName=${SABPAISA_TRANS_USER_NAME}`,
            `transUserPassword=${SABPAISA_TRANS_USER_PASSWORD}`,
            `callbackUrl=${sabpaisaCallbackUrl}`,
            `channelId=${channelId}`,
            `mcc=${mcc}`,
            `transDate=${transDate}`
        ];
        
        // Add payment method if specified (for UPI-specific payments)
        if (req.body.payment_method === 'upi') {
            requestParams.push(`paymentMode=UPI`);
        }
        
        const stringForRequest = requestParams.join('&');

        console.log('📋 Request String:', stringForRequest);

        // Encrypt the request string
        let encryptedStringForRequest;
        try {
            encryptedStringForRequest = encrypt(stringForRequest);
            console.log('✅ Encryption successful');
            console.log('   Encrypted String (first 50 chars):', encryptedStringForRequest.substring(0, 50) + '...');
        } catch (err) {
            console.error('❌ Encryption failed:', err);
            return res.status(500).json({
                success: false,
                error: 'Encryption error',
                detail: err.message
            });
        }

        // Save transaction to database first
        const transaction = new Transaction({
            transactionId: transactionId,
            orderId: clientTxnId,
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

            // SabPaisa Data
            paymentGateway: 'sabpaisa',
            sabpaisaClientTxnId: clientTxnId,
            sabpaisaReferenceId: referenceId,

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

        // Return form data for frontend to submit
        const formData = {
            spURL: SABPAISA_SP_URL,
            encData: encryptedStringForRequest,
            clientCode: SABPAISA_CLIENT_CODE
        };

        // Return response with payment URL (frontend will auto-submit form)
        res.json({
            success: true,
            transaction_id: transactionId,
            payment_link_id: clientTxnId,
            payment_url: `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/sabpaisa/payment-page/${transactionId}`,
            order_id: clientTxnId,
            order_amount: parseFloat(amount),
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            reference_id: referenceId,
            callback_url: finalCallbackUrl,
            form_data: formData, // For direct form submission if needed
            message: 'Payment link created successfully. Use payment_url to redirect user to payment page.'
        });

    } catch (error) {
        console.error('❌ Create SabPaisa Payment Link Error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            error: 'Failed to create payment link',
            detail: error.message
        });
    }
};

// ============ SABPAISA PAYMENT PAGE (Auto-submit form) ============
/**
 * Render payment page that auto-submits form to SabPaisa
 */
exports.getSabpaisaPaymentPage = async (req, res) => {
    try {
        const { transactionId } = req.params;

        if (!transactionId) {
            return res.status(400).send('Missing transaction ID');
        }

        // Find transaction
        const transaction = await Transaction.findOne({ transactionId });

        if (!transaction) {
            return res.status(404).send('Transaction not found');
        }

        // Re-encrypt the request data (or store encrypted data in transaction)
        // For now, we'll need to reconstruct it
        const sabpaisaCallbackUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/sabpaisa/callback?transaction_id=${transactionId}`;
        const channelId = 'U'; // Use UPI channel for payment page
        const mcc = '5666';
        const transDate = formatTransDate();

        const requestParams = [
            `payerName=${transaction.customerName}`,
            `payerEmail=${transaction.customerEmail}`,
            `payerMobile=${transaction.customerPhone}`,
            `clientTxnId=${transaction.orderId}`,
            `amount=${transaction.amount}`,
            `clientCode=${SABPAISA_CLIENT_CODE}`,
            `transUserName=${SABPAISA_TRANS_USER_NAME}`,
            `transUserPassword=${SABPAISA_TRANS_USER_PASSWORD}`,
            `callbackUrl=${sabpaisaCallbackUrl}`,
            `channelId=${channelId}`,
            `mcc=${mcc}`,
            `transDate=${transDate}`,
            `paymentMode=UPI` // Force UPI payment mode
        ];
        
        const stringForRequest = requestParams.join('&');

        const encryptedStringForRequest = encrypt(stringForRequest);

        const formData = {
            spURL: SABPAISA_SP_URL,
            encData: encryptedStringForRequest,
            clientCode: SABPAISA_CLIENT_CODE
        };

        // Render HTML page that auto-submits form
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to Payment Gateway...</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .loader {
            text-align: center;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <p>Redirecting to payment gateway...</p>
    </div>
    <form id="paymentForm" action="${formData.spURL}" method="POST" style="display: none;">
        <input type="text" name="encData" value="${formData.encData}">
        <input type="text" name="clientCode" value="${formData.clientCode}">
    </form>
    <script>
        document.getElementById('paymentForm').submit();
    </script>
</body>
</html>
        `;

        res.send(html);

    } catch (error) {
        console.error('❌ Get SabPaisa Payment Page Error:', error);
        res.status(500).send('Error loading payment page');
    }
};

// ============ SABPAISA CALLBACK HANDLER ============
/**
 * Handle SabPaisa payment callback (POST request after payment)
 */
exports.handleSabpaisaCallback = async (req, res) => {
    try {
        const { transaction_id } = req.query;

        console.log('\n' + '='.repeat(80));
        console.log('🔔 SABPAISA CALLBACK RECEIVED');
        console.log('='.repeat(80));
        console.log('   Method:', req.method);
        console.log('   Transaction ID (query):', transaction_id);
        console.log('   Body:', JSON.stringify(req.body, null, 2));

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

        // Extract encrypted response from POST body (form-encoded)
        // SabPaisa sends encrypted response in POST body as form data: encResponse=<encrypted_data>
        let encData = null;
        try {
            // Try parsed body first (express.urlencoded should handle this)
            if (req.body && req.body.encResponse) {
                encData = req.body.encResponse;
                console.log('   Found encResponse in parsed body');
            } else if (req.body && typeof req.body === 'object') {
                // Try to find encResponse in body object
                encData = req.body.encResponse || req.body.encData || req.body.enc_data;
            }
            
            // If not found, try raw body
            if (!encData && req.rawBody) {
                const rawBodyStr = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString();
                console.log('   Trying raw body:', rawBodyStr.substring(0, 100) + '...');
                const encDataParam = rawBodyStr.split('&').find(s => s.startsWith('encResponse='));
                if (encDataParam) {
                    encData = decodeURIComponent(encDataParam.split('=').slice(1).join('='));
                }
            }

            if (!encData) {
                throw new Error('No encResponse found in callback body');
            }

            console.log('   Encrypted Response (first 50 chars):', encData.substring(0, 50) + '...');

            // Decrypt response
            const decryptedResponse = decrypt(encData);
            console.log('   Decrypted Response:', decryptedResponse);

            // Parse decrypted response (format: key1=value1&key2=value2)
            const responseParams = {};
            decryptedResponse.split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key && value) {
                    responseParams[key] = decodeURIComponent(value);
                }
            });

            console.log('   Parsed Response Params:', JSON.stringify(responseParams, null, 2));

            // Extract payment status
            const status = responseParams.status || responseParams.paymentStatus || responseParams.txnStatus;
            const amount = responseParams.amount ? parseFloat(responseParams.amount) : transaction.amount;
            const txnId = responseParams.txnId || responseParams.transactionId || responseParams.clientTxnId;

            console.log('\n📊 Payment Status Analysis:');
            console.log('   Status:', status);
            console.log('   Amount:', amount);
            console.log('   Transaction ID:', txnId);

            // Check if payment was successful
            if (status === 'SUCCESS' || status === 'success' || status === 'Success' || 
                responseParams.responseCode === '000' || responseParams.responseCode === '00') {
                
                // Payment is successful, update transaction if not already updated
                if (transaction.status !== 'paid') {
                    const paidAt = new Date();
                    const expectedSettlement = calculateExpectedSettlementDate(paidAt);
                    const commissionData = calculatePayinCommission(amount);

                    const update = {
                        status: 'paid',
                        paidAt,
                        paymentMethod: responseParams.paymentMode || 'UPI',
                        sabpaisaPaymentId: txnId,
                        updatedAt: new Date(),
                        acquirerData: {
                            utr: responseParams.utr || responseParams.rrn || null,
                            rrn: responseParams.rrn || null,
                            bank_transaction_id: responseParams.bankTxnId || null,
                            bank_name: responseParams.bankName || null,
                            vpa: responseParams.vpa || null
                        },
                        settlementStatus: 'unsettled',
                        expectedSettlementDate: expectedSettlement,
                        commission: commissionData.commission,
                        netAmount: parseFloat((amount - commissionData.commission).toFixed(2)),
                        webhookData: responseParams
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
                                sabpaisa_client_txn_id: updatedTransaction.sabpaisaClientTxnId,
                                sabpaisa_payment_id: updatedTransaction.sabpaisaPaymentId,
                                sabpaisa_reference_id: updatedTransaction.sabpaisaReferenceId,
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
            } else {
                // Payment failed
                const failureReason = responseParams.message || responseParams.responseMessage || status || 'Payment failed';
                
                console.log('\n❌ PAYMENT FAILED');
                console.log('   Failure Reason:', failureReason);

                if (transaction.status !== 'failed') {
                    await Transaction.findOneAndUpdate(
                        { transactionId: transaction_id },
                        {
                            status: 'failed',
                            failureReason: failureReason,
                            sabpaisaPaymentId: txnId,
                            updatedAt: new Date(),
                            webhookData: responseParams
                        }
                    );
                    console.log('   ✅ Transaction status updated to "failed" in database');
                }
            }

            // Helper function to get clean frontend URL
            const getFrontendUrl = () => {
                let frontendUrl = process.env.FRONTEND_URL || 'https://payments.ninex-group.com';
                frontendUrl = frontendUrl.replace(/:\d+$/, '').replace(/\/$/, '');
                if (frontendUrl.startsWith('localhost')) {
                    frontendUrl = `http://${frontendUrl}`;
                }
                if (frontendUrl === 'http://localhost' || frontendUrl === 'localhost') {
                    frontendUrl = 'https://payments.ninex-group.com';
                }
                return frontendUrl;
            };

            // Redirect to success or failure URL
            console.log('\n🔄 Preparing Redirect...');
            const cleanFrontendUrl = getFrontendUrl();
            console.log('   Frontend URL:', cleanFrontendUrl);

            if (status === 'SUCCESS' || status === 'success' || status === 'Success' || 
                responseParams.responseCode === '000' || responseParams.responseCode === '00') {
                const redirectUrl = transaction.successUrl ||
                    transaction.callbackUrl ||
                    `${cleanFrontendUrl}/payment-success?transaction_id=${transaction_id}`;
                
                console.log('   ✅ Redirecting to SUCCESS:', redirectUrl);
                return res.redirect(redirectUrl);
            } else {
                const errorMsg = responseParams.message || responseParams.responseMessage || 'Payment failed';
                const redirectUrl = transaction.failureUrl ||
                    `${cleanFrontendUrl}/payment-failed?transaction_id=${transaction_id}&error=${encodeURIComponent(errorMsg)}`;
                
                console.log('   ❌ Redirecting to FAILURE:', redirectUrl);
                return res.redirect(redirectUrl);
            }

        } catch (decryptError) {
            console.error('❌ Decryption or parsing failed:', decryptError);
            console.error('   Error:', decryptError.message);
            console.error('   Stack:', decryptError.stack);
            
            // Still redirect to failure page
            const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/payment-failed?error=decryption_error`);
        }

    } catch (error) {
        console.error('❌ SabPaisa Callback Handler Error:', error);
        const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
        return res.redirect(`${frontendUrl}/payment-failed?error=callback_error`);
    }
};

