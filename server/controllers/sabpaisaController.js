const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const { calculatePayinCommission } = require('../utils/commissionCalculator');

// SabPaisa Configuration
// Support multiple credential formats (case-insensitive matching)
// Note: Environment variable names in .env are case-sensitive, but we check multiple variations
// Helper function to get non-empty env var
const getEnvVar = (...names) => {
    for (const name of names) {
        const value = process.env[name];
        if (value && typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }
    return null;
};

// Helper to safely get env var with direct fallback
const getEnvVarSafe = (primaryName, ...altNames) => {
    // Try getEnvVar first (checks multiple names)
    const value = getEnvVar(primaryName, ...altNames);
    if (value) return value;
    
    // Direct fallback to process.env
    const directValue = process.env[primaryName];
    if (directValue && typeof directValue === 'string' && directValue.trim() !== '') {
        return directValue.trim();
    }
    
    return null;
};

// Get credentials from environment variables
// ⚠️ IMPORTANT: In production, these MUST be set via environment variables
// Fallback values are only for development/testing and will NOT work in production
const SABPAISA_AES_KEY_BASE64 = getEnvVarSafe(
    'SABPAISA_AES_KEY_BASE64',
    'AuthenticationKey',
    'AUTHENTICATION_KEY',
    'authenticationkey',
    'SABPAISA_AUTH_KEY',
    'SABPAISA_AUTHENTICATION_KEY'
);

const SABPAISA_HMAC_KEY_BASE64 = getEnvVarSafe(
    'SABPAISA_HMAC_KEY_BASE64',
    'AuthenticationIV',
    'AUTHENTICATION_IV',
    'authenticationiv',
    'SABPAISA_HMAC_KEY',
    'SABPAISA_AUTH_IV'
);

const SABPAISA_CLIENT_CODE = getEnvVarSafe(
    'SABPAISA_CLIENT_CODE',
    'ClientCode',
    'CLIENT_CODE',
    'clientcode',
    'SABPAISA_CLIENT'
);

const SABPAISA_TRANS_USER_NAME = getEnvVarSafe(
    'SABPAISA_TRANS_USER_NAME',
    'UserName',
    'USER_NAME',
    'username',
    'SABPAISA_USERNAME',
    'SABPAISA_USER'
);

const SABPAISA_TRANS_USER_PASSWORD = getEnvVarSafe(
    'SABPAISA_TRANS_USER_PASSWORD',
    'Password',
    'PASSWORD',
    'password',
    'SABPAISA_PASSWORD',
    'SABPAISA_PASS'
);

// Check if we're in production and credentials are missing
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.NODE_ENV === 'PRODUCTION' ||
                     !process.env.NODE_ENV || // Default to production if not set
                     process.env.SABPAISA_ENVIRONMENT === 'production';

// Development fallback values (ONLY for non-production environments)
const DEV_FALLBACK_AES_KEY = 'eURubF0fni5Wp9hcWTwjahLVHDWFKYCkmms3Uo/qt40=';
const DEV_FALLBACK_HMAC_KEY = 'MA7rAPIimkRb4dys0RggJ0a/WRju1hJBwn0Af9Ub4rKwxsQcKMvGaab0NCuEgMXc';
const DEV_FALLBACK_CLIENT_CODE = 'PRAB70';
const DEV_FALLBACK_USER_NAME = 'prabhash4152@gmail.com';
const DEV_FALLBACK_PASSWORD = 'PRAB70_SP24229';

// Use fallbacks only in non-production environments
const finalAESKey = SABPAISA_AES_KEY_BASE64 || (!isProduction ? DEV_FALLBACK_AES_KEY : null);
const finalHMACKey = SABPAISA_HMAC_KEY_BASE64 || (!isProduction ? DEV_FALLBACK_HMAC_KEY : null);
const finalClientCode = SABPAISA_CLIENT_CODE || (!isProduction ? DEV_FALLBACK_CLIENT_CODE : null);
const finalUserName = SABPAISA_TRANS_USER_NAME || (!isProduction ? DEV_FALLBACK_USER_NAME : null);
const finalPassword = SABPAISA_TRANS_USER_PASSWORD || (!isProduction ? DEV_FALLBACK_PASSWORD : null);

// Debug: Log credential loading status (only in development or if credentials are missing)
if (!isProduction || !finalAESKey || !finalHMACKey || !finalClientCode || !finalUserName || !finalPassword) {
    console.log('\n🔐 SabPaisaa Credential Loading Status:');
    console.log('   Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
    console.log('   AES_KEY:', SABPAISA_AES_KEY_BASE64 ? `✅ Loaded (length: ${SABPAISA_AES_KEY_BASE64.length})` : '❌ Missing');
    console.log('   HMAC_KEY:', SABPAISA_HMAC_KEY_BASE64 ? `✅ Loaded (length: ${SABPAISA_HMAC_KEY_BASE64.length})` : '❌ Missing');
    console.log('   CLIENT_CODE:', SABPAISA_CLIENT_CODE ? `✅ Loaded (${SABPAISA_CLIENT_CODE})` : '❌ Missing');
    console.log('   USER_NAME:', SABPAISA_TRANS_USER_NAME ? `✅ Loaded (${SABPAISA_TRANS_USER_NAME})` : '❌ Missing');
    console.log('   PASSWORD:', SABPAISA_TRANS_USER_PASSWORD ? `✅ Loaded (length: ${SABPAISA_TRANS_USER_PASSWORD.length})` : '❌ Missing');
    if (isProduction && (!finalAESKey || !finalHMACKey || !finalClientCode || !finalUserName || !finalPassword)) {
        console.log('   ⚠️  WARNING: Production environment but some credentials are missing!');
    }
}
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
function encrypt(plaintext, customAESKey = null, customHMACKey = null) {
    const useAESKey = customAESKey || finalAESKey;
    const useHMACKey = customHMACKey || finalHMACKey;
    
    if (!useAESKey || !useHMACKey) {
        throw new Error('SabPaisa encryption keys not configured');
    }

    // Direct base64 decoding of keys (no derivation) - as per SubPaisa specification
    const aesKey = Buffer.from(useAESKey, 'base64');
    const hmacKey = Buffer.from(useHMACKey, 'base64');
    
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
function decrypt(hexCiphertext, customAESKey = null, customHMACKey = null) {
    const useAESKey = customAESKey || finalAESKey;
    const useHMACKey = customHMACKey || finalHMACKey;
    
    if (!useAESKey || !useHMACKey) {
        throw new Error('SabPaisa encryption keys not configured');
    }

    // Direct base64 decoding of keys (no derivation) - as per SubPaisa specification
    const aesKey = Buffer.from(useAESKey, 'base64');
    const hmacKey = Buffer.from(useHMACKey, 'base64');
    
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

        // Re-check credentials at runtime (in case they weren't loaded at module init)
        // This handles cases where dotenv loads after module initialization
        const runtimeAESKey = finalAESKey || getEnvVarSafe('SABPAISA_AES_KEY_BASE64', 'AuthenticationKey', 'AUTHENTICATION_KEY') || 
                              (process.env.SABPAISA_AES_KEY_BASE64 && process.env.SABPAISA_AES_KEY_BASE64.trim ? process.env.SABPAISA_AES_KEY_BASE64.trim() : null);
        const runtimeHMACKey = finalHMACKey || getEnvVarSafe('SABPAISA_HMAC_KEY_BASE64', 'AuthenticationIV', 'AUTHENTICATION_IV') || 
                                (process.env.SABPAISA_HMAC_KEY_BASE64 && process.env.SABPAISA_HMAC_KEY_BASE64.trim ? process.env.SABPAISA_HMAC_KEY_BASE64.trim() : null);
        const runtimeClientCode = finalClientCode || getEnvVarSafe('SABPAISA_CLIENT_CODE', 'ClientCode', 'CLIENT_CODE') || 
                                  (process.env.SABPAISA_CLIENT_CODE && process.env.SABPAISA_CLIENT_CODE.trim ? process.env.SABPAISA_CLIENT_CODE.trim() : null);
        const runtimeUserName = finalUserName || getEnvVarSafe('SABPAISA_TRANS_USER_NAME', 'UserName', 'USER_NAME') || 
                                 (process.env.SABPAISA_TRANS_USER_NAME && process.env.SABPAISA_TRANS_USER_NAME.trim ? process.env.SABPAISA_TRANS_USER_NAME.trim() : null);
        const runtimePassword = finalPassword || getEnvVarSafe('SABPAISA_TRANS_USER_PASSWORD', 'Password', 'PASSWORD') || 
                                (process.env.SABPAISA_TRANS_USER_PASSWORD && process.env.SABPAISA_TRANS_USER_PASSWORD.trim ? process.env.SABPAISA_TRANS_USER_PASSWORD.trim() : null);

        // Validate credentials
        // Support both naming conventions:
        // Old: SABPAISA_AES_KEY_BASE64, SABPAISA_HMAC_KEY_BASE64, etc.
        // New: AuthenticationKey, AuthenticationIV, ClientCode, UserName, Password
        const missingCredentials = {
            AES_KEY: !runtimeAESKey,
            HMAC_KEY: !runtimeHMACKey,
            CLIENT_CODE: !runtimeClientCode,
            USER_NAME: !runtimeUserName,
            PASSWORD: !runtimePassword
        };
        
        if (missingCredentials.AES_KEY || missingCredentials.HMAC_KEY || missingCredentials.CLIENT_CODE || 
            missingCredentials.USER_NAME || missingCredentials.PASSWORD) {
            console.error('❌ SabPaisa credentials not configured');
            console.error('   Missing:', missingCredentials);
            
            // Debug: Show what environment variables are available
            console.error('\n📋 Debug: Checking environment variables...');
            const envKeys = Object.keys(process.env).filter(key => 
                key.toUpperCase().includes('SABPAISA') || 
                key.toUpperCase().includes('AUTH') ||
                key.toUpperCase().includes('CLIENT') ||
                key.toUpperCase().includes('USER') ||
                key.toUpperCase().includes('PASSWORD')
            );
            console.error('   Found related env vars:', envKeys.length > 0 ? envKeys.join(', ') : 'None found');
            
            // Check specific variable names and their values (first few chars only for security)
            const checks = {
                'SABPAISA_AES_KEY_BASE64': process.env.SABPAISA_AES_KEY_BASE64 ? 
                    `✅ (length: ${process.env.SABPAISA_AES_KEY_BASE64.length})` : '❌',
                'AuthenticationKey': process.env.AuthenticationKey ? 
                    `✅ (length: ${process.env.AuthenticationKey.length})` : '❌',
                'SABPAISA_HMAC_KEY_BASE64': process.env.SABPAISA_HMAC_KEY_BASE64 ? 
                    `✅ (length: ${process.env.SABPAISA_HMAC_KEY_BASE64.length})` : '❌',
                'AuthenticationIV': process.env.AuthenticationIV ? 
                    `✅ (length: ${process.env.AuthenticationIV.length})` : '❌',
                'SABPAISA_CLIENT_CODE': process.env.SABPAISA_CLIENT_CODE ? 
                    `✅ (value: ${process.env.SABPAISA_CLIENT_CODE})` : '❌',
                'ClientCode': process.env.ClientCode ? 
                    `✅ (value: ${process.env.ClientCode})` : '❌',
                'SABPAISA_TRANS_USER_NAME': process.env.SABPAISA_TRANS_USER_NAME ? 
                    `✅ (value: ${process.env.SABPAISA_TRANS_USER_NAME})` : '❌',
                'UserName': process.env.UserName ? 
                    `✅ (value: ${process.env.UserName})` : '❌',
                'SABPAISA_TRANS_USER_PASSWORD': process.env.SABPAISA_TRANS_USER_PASSWORD ? 
                    `✅ (length: ${process.env.SABPAISA_TRANS_USER_PASSWORD.length})` : '❌',
                'Password': process.env.Password ? 
                    `✅ (length: ${process.env.Password.length})` : '❌'
            };
            console.error('   Variable check:', checks);
            
            // Show actual resolved values (both module-level and runtime)
            console.error('\n📋 Resolved values:');
            console.error('   Environment:', isProduction ? 'PRODUCTION ⚠️' : 'DEVELOPMENT');
            console.error('   Module-level SABPAISA_AES_KEY_BASE64:', SABPAISA_AES_KEY_BASE64 ? `✅ (length: ${SABPAISA_AES_KEY_BASE64.length})` : '❌ NULL');
            console.error('   Module-level finalAESKey:', finalAESKey ? `✅ (length: ${finalAESKey.length})` : '❌ NULL');
            console.error('   Runtime runtimeAESKey:', runtimeAESKey ? `✅ (length: ${runtimeAESKey.length})` : '❌ NULL');
            console.error('   Direct process.env check:', process.env.SABPAISA_AES_KEY_BASE64 ? `✅ (length: ${process.env.SABPAISA_AES_KEY_BASE64.length}, type: ${typeof process.env.SABPAISA_AES_KEY_BASE64})` : '❌ NULL');
            console.error('   SABPAISA_HMAC_KEY_BASE64:', runtimeHMACKey ? `✅ (length: ${runtimeHMACKey.length})` : '❌ NULL');
            console.error('   SABPAISA_CLIENT_CODE:', runtimeClientCode ? `✅ (value: ${runtimeClientCode})` : '❌ NULL');
            console.error('   SABPAISA_TRANS_USER_NAME:', runtimeUserName ? `✅ (value: ${runtimeUserName})` : '❌ NULL');
            console.error('   SABPAISA_TRANS_USER_PASSWORD:', runtimePassword ? `✅ (length: ${runtimePassword.length})` : '❌ NULL');
            
            // Production-specific warning
            if (isProduction && (!runtimeAESKey || !runtimeHMACKey || !runtimeClientCode || !runtimeUserName || !runtimePassword)) {
                console.error('\n🚨 CRITICAL: Production environment detected but credentials are missing!');
                console.error('   Fallback credentials will NOT work in production.');
                console.error('   Please set the following environment variables in your production server:');
            }
            
            // If runtime credentials are available, use them and continue instead of returning error
            if (runtimeAESKey && runtimeHMACKey && runtimeClientCode && runtimeUserName && runtimePassword) {
                console.log('✅ Runtime credentials found! Proceeding with payment link creation using runtime credentials.');
                // We'll use runtime credentials below, so we skip the error return
            } else {
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
        }

        // Use runtime credentials if available, otherwise use module-level (which may be null)
        const activeAESKey = runtimeAESKey || finalAESKey;
        const activeHMACKey = runtimeHMACKey || finalHMACKey;
        const activeClientCode = runtimeClientCode || finalClientCode;
        const activeUserName = runtimeUserName || finalUserName;
        const activePassword = runtimePassword || finalPassword;

        // Final validation - if still missing, return error
        if (!activeAESKey || !activeHMACKey || !activeClientCode || !activeUserName || !activePassword) {
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
            `clientCode=${activeClientCode}`,
            `transUserName=${activeUserName}`,
            `transUserPassword=${activePassword}`,
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

        // Encrypt the request string using active credentials
        let encryptedStringForRequest;
        try {
            encryptedStringForRequest = encrypt(stringForRequest, activeAESKey, activeHMACKey);
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
            clientCode: activeClientCode
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
        
        // Re-check credentials at runtime (same as createSabpaisaPaymentLink)
        const runtimeAESKey = finalAESKey || getEnvVarSafe('SABPAISA_AES_KEY_BASE64', 'AuthenticationKey', 'AUTHENTICATION_KEY') || 
                              (process.env.SABPAISA_AES_KEY_BASE64 && process.env.SABPAISA_AES_KEY_BASE64.trim ? process.env.SABPAISA_AES_KEY_BASE64.trim() : null);
        const runtimeHMACKey = finalHMACKey || getEnvVarSafe('SABPAISA_HMAC_KEY_BASE64', 'AuthenticationIV', 'AUTHENTICATION_IV') || 
                                (process.env.SABPAISA_HMAC_KEY_BASE64 && process.env.SABPAISA_HMAC_KEY_BASE64.trim ? process.env.SABPAISA_HMAC_KEY_BASE64.trim() : null);
        const runtimeClientCode = finalClientCode || getEnvVarSafe('SABPAISA_CLIENT_CODE', 'ClientCode', 'CLIENT_CODE') || 
                                  (process.env.SABPAISA_CLIENT_CODE && process.env.SABPAISA_CLIENT_CODE.trim ? process.env.SABPAISA_CLIENT_CODE.trim() : null);
        const runtimeUserName = finalUserName || getEnvVarSafe('SABPAISA_TRANS_USER_NAME', 'UserName', 'USER_NAME') || 
                                 (process.env.SABPAISA_TRANS_USER_NAME && process.env.SABPAISA_TRANS_USER_NAME.trim ? process.env.SABPAISA_TRANS_USER_NAME.trim() : null);
        const runtimePassword = finalPassword || getEnvVarSafe('SABPAISA_TRANS_USER_PASSWORD', 'Password', 'PASSWORD') || 
                                (process.env.SABPAISA_TRANS_USER_PASSWORD && process.env.SABPAISA_TRANS_USER_PASSWORD.trim ? process.env.SABPAISA_TRANS_USER_PASSWORD.trim() : null);

        // Use runtime credentials if available, otherwise use module-level
        const activeAESKey = runtimeAESKey || finalAESKey;
        const activeHMACKey = runtimeHMACKey || finalHMACKey;
        const activeClientCode = runtimeClientCode || finalClientCode;
        const activeUserName = runtimeUserName || finalUserName;
        const activePassword = runtimePassword || finalPassword;

        // Validate credentials
        if (!activeAESKey || !activeHMACKey || !activeClientCode || !activeUserName || !activePassword) {
            return res.status(500).send(`
                <html>
                    <body>
                        <h1>Payment Error</h1>
                        <p>SabPaisa credentials not configured. Please contact support.</p>
                    </body>
                </html>
            `);
        }

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
            `clientCode=${activeClientCode}`,
            `transUserName=${activeUserName}`,
            `transUserPassword=${activePassword}`,
            `callbackUrl=${sabpaisaCallbackUrl}`,
            `channelId=${channelId}`,
            `mcc=${mcc}`,
            `transDate=${transDate}`,
            `paymentMode=UPI` // Force UPI payment mode
        ];
        
        const stringForRequest = requestParams.join('&');

        const encryptedStringForRequest = encrypt(stringForRequest, activeAESKey, activeHMACKey);

        const formData = {
            spURL: SABPAISA_SP_URL,
            encData: encryptedStringForRequest,
            clientCode: activeClientCode
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

        // Load credentials at runtime for callback decryption
        const runtimeAESKey = finalAESKey || getEnvVarSafe('SABPAISA_AES_KEY_BASE64', 'AuthenticationKey', 'AUTHENTICATION_KEY') || 
                              (process.env.SABPAISA_AES_KEY_BASE64 && process.env.SABPAISA_AES_KEY_BASE64.trim ? process.env.SABPAISA_AES_KEY_BASE64.trim() : null);
        const runtimeHMACKey = finalHMACKey || getEnvVarSafe('SABPAISA_HMAC_KEY_BASE64', 'AuthenticationIV', 'AUTHENTICATION_IV') || 
                                (process.env.SABPAISA_HMAC_KEY_BASE64 && process.env.SABPAISA_HMAC_KEY_BASE64.trim ? process.env.SABPAISA_HMAC_KEY_BASE64.trim() : null);
        
        const activeAESKey = runtimeAESKey || finalAESKey;
        const activeHMACKey = runtimeHMACKey || finalHMACKey;

        if (!activeAESKey || !activeHMACKey) {
            console.error('❌ SabPaisa encryption keys not configured for callback decryption');
            const frontendUrl = (process.env.FRONTEND_URL || 'https://payments.ninex-group.com').replace(/:\d+$/, '').replace(/\/$/, '');
            return res.redirect(`${frontendUrl}/payment-failed?error=decryption_keys_missing`);
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

            // Decrypt response using runtime credentials
            const decryptedResponse = decrypt(encData, activeAESKey, activeHMACKey);
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
                
                console.log('\n✅ PAYMENT SUCCESSFUL - Processing callback...');
                console.log('   Current Transaction Status:', transaction.status);
                
                // Payment is successful, update transaction if not already updated
                if (transaction.status !== 'paid') {
                    console.log('   📝 Updating transaction status to "paid"...');
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

                    console.log('   ✅ Transaction status updated to "paid"');
                    console.log('   💰 Amount:', amount);
                    console.log('   💵 Commission:', commissionData.commission);
                    console.log('   💵 Net Amount:', update.netAmount);
                    console.log('   📅 Paid At:', paidAt.toISOString());
                    console.log('   🏦 Payment Method:', update.paymentMethod);
                    if (update.acquirerData.utr) {
                        console.log('   🔢 UTR:', update.acquirerData.utr);
                    }
                    if (update.acquirerData.rrn) {
                        console.log('   🔢 RRN:', update.acquirerData.rrn);
                    }

                    if (updatedTransaction && updatedTransaction.merchantId && updatedTransaction.merchantId.webhookEnabled) {
                        console.log('   📡 Sending webhook notification to merchant...');
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
                        console.log('   ✅ Webhook notification sent');
                    } else {
                        console.log('   ℹ️  Webhook not enabled for this merchant');
                    }

                    console.log('✅ Transaction successfully marked as PAID via callback:', transaction_id);
                } else {
                    console.log('   ℹ️  Transaction already marked as paid, skipping update');
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

