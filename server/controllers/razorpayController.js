const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { calculateExpectedSettlementDate } = require('../utils/settlementCalculator');
const axios = require('axios')    // Initialize Razorpay
const {createPhonePePaymentLink} = require('./phonepeController');
const { calculatePayinCommission } = require('../utils/commissionCalculator');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ============ CREATE RAZORPAY PAYMENT LINK ============
exports.createRazorpayPaymentLink = async (req, res) => {
    try {
        const {
            amount,
            customer_name,
            customer_email,
            customer_phone,
            description,
            callback_url,      // ✅ NEW: Optional merchant callback URL
            success_url,       // ✅ NEW: Optional success redirect
            failure_url        // ✅ NEW: Optional failure redirect
        } = req.body;

        // Get merchant info from apiKeyAuth middleware
        const merchantId = req.merchantId;
        const merchantName = req.merchantName;

        console.log('📤 Razorpay Payment Link request from:', merchantName);

        // Check if Razorpay is enabled in settings
        const settings = await Settings.getSettings();
        if (!settings.paymentGateways.razorpay.enabled) {
            console.error('❌ Razorpay is not enabled in payment gateway settings');
            return res.status(403).json({
                success: false,
                error: 'Razorpay payment gateway is not enabled. Please contact administrator to enable it.',
                details: {
                    description: 'Razorpay gateway is disabled',
                    code: 'GATEWAY_DISABLED',
                    hint: 'The administrator needs to enable Razorpay in the payment gateway settings from the admin dashboard.'
                }
            });
        }

        // Validate Razorpay credentials
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('❌ Razorpay credentials not configured');
            return res.status(500).json({
                success: false,
                error: 'Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.',
                details: {
                    description: 'Razorpay credentials not configured',
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
        if (parseFloat(amount) < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Generate unique IDs
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const referenceId = `REF_${Date.now()}`;

        // ✅ Get merchant's configured URLs or use provided ones
        const merchant = await User.findById(merchantId);

        // Priority: API provided URL > Merchant configured URL > Default URL
        const finalCallbackUrl = callback_url ||
            merchant.successUrl ||
            `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success`;

        // Razorpay callback URL - points to our callback handler
        const razorpayCallbackUrl = `${process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000'}/api/razorpay/callback?transaction_id=${transactionId}`;

                    // Create Payment Link options
                const paymentLinkOptions = {
            amount: parseFloat(amount) * 100,
            currency: 'INR',
            description: description || `Payment for ${merchantName}`,
            customer: {
                name: customer_name,
                email: customer_email,
                contact: `+91${customer_phone}`
            },
            notify: {
                sms: true,
                email: true
            },
            reminder_enable: true,
            callback_url: razorpayCallbackUrl, // ✅ Points to our callback handler
            callback_method: 'get',
            reference_id: referenceId,
            upi_link: true  // ✅ Creates a direct UPI payment link (skips Razorpay page entirely)
            };



        console.log('📤 Creating Razorpay Payment Link...');
        console.log('🔗 Callback URL:', finalCallbackUrl);

        // Create Payment Link
        const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);

        console.log('✅ Payment Link created:', paymentLink.id);

        // Save transaction to database
        const transaction = new Transaction({
            transactionId: transactionId,
            orderId: paymentLink.id,
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

            // Razorpay Data
            paymentGateway: 'razorpay',
            razorpayPaymentLinkId: paymentLink.id,
            razorpayReferenceId: referenceId,

            // ✅ Store callback URLs
            callbackUrl: finalCallbackUrl,
            successUrl: success_url,
            failureUrl: failure_url,

            // Timestamps
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await transaction.save();
        console.log('💾 Transaction saved:', transactionId);

        // Check if this was called from unified endpoint (has gateway_used in response)
        const response = {
            success: true,
            transaction_id: transactionId,
            payment_link_id: paymentLink.id,
            payment_url: paymentLink.short_url,
            order_amount: parseFloat(amount),
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            reference_id: referenceId,
            callback_url: finalCallbackUrl,
            expires_at: paymentLink.expire_by
        };

        // Only add message if not already set by unified endpoint
        if (!res.gateway_message_added) {
            response.message = 'Payment link created successfully. Share this URL with customer.';
        }

        res.json(response);

    } catch (error) {
        console.error('❌ Create Razorpay Payment Link Error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            error: error.error,
            statusCode: error.statusCode,
            status: error.status,
            stack: error.stack
        });

        // Handle different error structures from Razorpay SDK
        let errorMessage = 'Failed to create payment link';
        let errorDetails = null;

        if (error.error) {
            // Razorpay SDK error structure
            errorMessage = error.error.description || error.error.message || errorMessage;
            errorDetails = error.error;
            
            // Check for authentication errors specifically
            if (error.error.code === 'BAD_REQUEST_ERROR' && 
                (errorMessage.toLowerCase().includes('authentication') || 
                 errorMessage.toLowerCase().includes('unauthorized') ||
                 errorMessage.toLowerCase().includes('invalid'))) {
                errorMessage = 'Razorpay authentication failed. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.';
                errorDetails = {
                    ...error.error,
                    hint: 'The Razorpay API credentials are invalid or missing. Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment variables.'
                };
            }
        } else if (error.message) {
            // Standard error with message
            errorMessage = error.message;
            errorDetails = { message: error.message };
        } else if (typeof error === 'string') {
            // String error
            errorMessage = error;
        }

        // Determine status code
        const statusCode = error.statusCode || error.status || 500;

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: errorDetails
        });
    }
};




// ============ CREATE PHONEPAY PAYMENT LINK ============


exports.createPhonePeDeepLink = async (req, res) => {
  try {
    const {
      amount,
      customer_name,
      customer_email,
      customer_phone,
      description,
      callback_url,
      success_url,
      failure_url,
       // new optional param from client
    } = req.body;
    const upi_id =  "7049407951@ptaxis"
    const merchantId = req.merchantId;
    const merchantName = req.merchantName;

    // Check if PhonePe is enabled in settings
    const settings = await Settings.getSettings();
    if (!settings.paymentGateways.phonepe.enabled) {
      console.error('❌ PhonePe is not enabled in payment gateway settings');
      return res.status(403).json({
        success: false,
        error: 'PhonePe payment gateway is not enabled. Please contact administrator to enable it.',
        details: {
          description: 'PhonePe gateway is disabled',
          code: 'GATEWAY_DISABLED',
          hint: 'The administrator needs to enable PhonePe in the payment gateway settings from the admin dashboard.'
        }
      });
    }

    // Validation
    if (!amount || !customer_name || !customer_phone)
      return res.status(400).json({ success: false, error: 'Missing required fields' });

    if (!/^[0-9]{10}$/.test(customer_phone))
      return res.status(400).json({ success: false, error: 'Invalid phone number' });

    if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email))
      return res.status(400).json({ success: false, error: 'Invalid email address' });

    if (parseFloat(amount) < 1)
      return res.status(400).json({ success: false, error: 'Amount must be at least ₹1' });

    // Generate unique transactionId
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Determine final callback URL
    const merchant = await User.findById(merchantId);
    const finalCallbackUrl = callback_url || merchant?.successUrl || `https://payments.ninex-group.com/`;

    // Determine the VPA (pa) to use for deep-links:
    // Priority: request.upi_id -> merchant.upiId -> none
    const pa = (upi_id && String(upi_id).trim()) || (merchant && (merchant.upiId || merchant.vpa)) || '';

    // Create PhonePe payment link via helper (amount in paisa if your flow expects that)
    const paymentLink = await createPhonePePaymentLink({
      amount: parseFloat(amount * 100), // paisa as before
      redirectUrl: success_url || finalCallbackUrl,
      pa, // pass the VPA so helper will generate deep-links
      udf1: transactionId,
      udf2: description || `Payment for ${merchantName}`
    });

    // Normalize values for backward compatibility
    const checkoutUrl =
      (paymentLink && (paymentLink.checkoutUrl || paymentLink.url)) ||
      (typeof paymentLink === 'string' ? paymentLink : null);

    const paymentLinkId = (paymentLink && paymentLink.id) || transactionId;
    const paymentUrl = (paymentLink && (paymentLink.url || checkoutUrl)) || (typeof paymentLink === 'string' ? paymentLink : null);

    const phonepeDeepLink = paymentLink?.phonePeDeepLink || null;
    const gPayDeepLink = paymentLink?.gPayDeepLink || null;
    const gPayIntent = paymentLink?.gPayIntent || null;
    const upiDeepLink = paymentLink?.upiDeepLink || null;

    // Save transaction to DB (store deep links inside transaction for future reference)
    const transaction = new Transaction({
      transactionId,
      orderId: paymentLinkId,
      merchantId,
      merchantName,
      customerId: `CUST_${customer_phone}_${Date.now()}`,
      customerName: customer_name,
      customerEmail: customer_email || '',
      customerPhone: customer_phone,
      amount: parseFloat(amount),
      commission: calculatePayinCommission(amount).commission,
      netAmount: (parseFloat(amount) - calculatePayinCommission(amount).commission),
      currency: 'INR',
      description: description || `Payment for ${merchantName}`,
      status: 'created',
      paymentGateway: 'phonepe',
      phonepeReferenceId: `REF_${Date.now()}`,
      callbackUrl: finalCallbackUrl,
      successUrl: success_url,
      failureUrl: failure_url,
      deepLinks: {
        checkoutUrl,
        phonepeDeepLink : checkoutUrl,
        gPayDeepLink : "Not available",
        gPayIntent : "Not available",
        upiDeepLink : "Not available",
        pa: pa || null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await transaction.save();

    // Return response — keep original fields and add the extra deep-link fields (nullable)
    res.json({
      success: true,
      transaction_id: transactionId,
      payment_link_id: paymentLinkId,
      payment_url: paymentUrl,
      order_amount: parseFloat(amount),
      order_currency: 'INR',
      merchant_id: merchantId.toString(),
      merchant_name: merchantName,
      callback_url: finalCallbackUrl,
      message: 'Payment link created successfully. Share this URL with the customer.',

      // Extra fields added for UI stability (nullable)
      checkout_url: checkoutUrl || null,
      phonepe_deep_link: "Not available",
      gpay_deep_link: "Not available",
      gpay_intent: "Not available", // new field (Android intent)
      upi_deep_link: "Not available",
      pa: "Not available"
    });
  } catch (error) {
    console.error('❌ PhonePe Payment Link Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create PhonePe payment link',
      details: error.response?.data
    });
  }
};





////////////////////////////////////////////////////////////////////////////////////////////////////
const sha256Hex = (input) => crypto.createHash('sha256').update(input, 'utf8').digest('hex');

const timingSafeEqualStr = (a, b) => {
  try {
    const A = Buffer.from(String(a), 'utf8');
    const B = Buffer.from(String(b), 'utf8');
    if (A.length !== B.length) return false;
    return crypto.timingSafeEqual(A, B);
  } catch (e) {
    return false;
  }
};

const validateAuthHeader = (authHeader) => {
  if (!authHeader) return false;
  const username = process.env.PHONEPE_WEBHOOK_USER;
  const password = process.env.PHONEPE_WEBHOOK_PASS;
  if (!username || !password) {
    console.error('PHONEPE_WEBHOOK_USER / PASS not configured');
    return false;
  }
  const expected = sha256Hex(`${username}:${password}`);
  console.log({expected});
  
  let incoming = authHeader.trim();
  // Accept forms: "SHA256 <hex>" or "<hex>"
  if (/^SHA256\s+/i.test(incoming)) incoming = incoming.split(/\s+/)[1] || '';
  console.log({incoming})
  // timing-safe compare (allow lowercase/uppercase hex)
  if (timingSafeEqualStr(incoming, expected)) return true;
  if (timingSafeEqualStr(incoming.toLowerCase(), expected.toLowerCase())) return true;
  return false;
};

const validateSignatureHeader = (req) => {
  const phonepeSignature = req.headers['x-verify-signature'] || req.headers['x-phonepe-signature'] || req.headers['x-phonepe-sign'];
  const webhookSecret = process.env.PHONEPE_WEBHOOK_SECRET;
  if (!phonepeSignature) return { ok: false, reason: 'no_signature_header' };
  if (!webhookSecret) return { ok: false, reason: 'no_secret_configured' };

  const dataBuffer = (req.rawBody && req.rawBody.length) ? req.rawBody : Buffer.from(JSON.stringify(req.body || {}), 'utf8');
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(dataBuffer);
  const expectedHex = hmac.digest('hex');
  const expectedBase64 = Buffer.from(expectedHex, 'hex').toString('base64');

  const incoming = phonepeSignature.trim();

  if (timingSafeEqualStr(incoming, expectedHex)) return { ok: true };
  if (timingSafeEqualStr(incoming.toLowerCase(), expectedHex.toLowerCase())) return { ok: true };
  if (timingSafeEqualStr(incoming, expectedBase64)) return { ok: true };

  return { ok: false, reason: 'signature_mismatch', expectedHex, expectedBase64, incoming };
};


//////////////////////////////////////////////////////////////////

exports.handlePhonePeWebhook = async (req, res) => {
  try {
    console.log('🔔 PhonePe Webhook received');

    // 1) First try Authorization header (Subscription callbacks use this)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader) {
      const ok = validateAuthHeader(authHeader);
      if (!ok) {
        console.warn('❌ Authorization present but invalid');
        return res.status(403).json({ success: false, error: 'Invalid authorization' });
      }
      console.log('✅ Authorization verified (subscription flow)');
    } else {
      // 2) Fallback: validate HMAC signature (one-time payments / legacy)
      const sig = validateSignatureHeader(req); // assume returns { ok: boolean, ... }
      if (!sig || !sig.ok) {
        console.warn('❌ Missing or invalid PhonePe signature header and no Authorization header');
        return res.status(400).json({ success: false, error: 'Missing signature or authorization' });
      }
      console.log('✅ HMAC signature verified (payment flow)');
    }

    // 3) Now process the payload
    const body = req.body || {};
    // prefer the nested payload if PhonePe wraps the payload, else use top-level body
    const payload = body.payload || body;
    if (!payload || Object.keys(payload).length === 0) {
      console.warn('❌ Webhook received with empty payload');
      return res.status(400).json({ success: false, error: 'Empty webhook payload' });
    }

    const event = (body?.event || body?.type || payload?.event || '').toString();
    const rootState = payload?.state || null;

    console.log('📦 Event:', event, 'state:', rootState);

    // 2️⃣ Handle different events
    switch (event) {
      case 'checkout.order.completed':
        await handlePhonePePaymentSuccess(payload);
        break;

      case 'checkout.order.failed':
        await handlePhonePePaymentFailed(payload);
        break;

      default:
        console.log('⚠️ Unhandled PhonePe webhook event:', event);
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('❌ Handler error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
};

// =================== HANDLERS ===================

  



// =================== HANDLERS ===================
async function handlePhonePePaymentSuccess(payload) {
  try {
    console.log("💡 handlePhonePePaymentSuccess triggered");

    // Extract internal transactionId from udf1
    const transactionId = payload.metaInfo?.udf1;
    if (!transactionId) {
      console.warn('⚠️ Missing internal transactionId in webhook payload');
      return;
    }

    // Extract payment details (assuming single payment)
    const paymentDetail = payload.paymentDetails?.[0];
    if (!paymentDetail) {
      console.warn('⚠️ No payment details found in webhook payload');
      return;
    }

    const paidAt = new Date(paymentDetail.timestamp || Date.now());
    const expectedSettlement = calculateExpectedSettlementDate(paidAt);

    // Build atomic update object
    const update = {
      status: 'paid',
      paidAt,
      paymentMethod: paymentDetail.paymentMode || 'UPI',
      phonepePaymentId: paymentDetail.transactionId,
      updatedAt: new Date(),
      acquirerData: {
        utr: paymentDetail.instrument?.utr || null,
        rrn: paymentDetail.instrument?.rrn || null,
        bank_transaction_id: paymentDetail.instrument?.bank_transaction_id || null,
        auth_code: paymentDetail.instrument?.auth_code || null,
        card_last4: paymentDetail.instrument?.card_last4 || null,
        card_network: paymentDetail.instrument?.card_network || null,
        bank_name: paymentDetail.instrument?.bank_name || null,
        vpa: paymentDetail.instrument?.vpa || null
      },
      settlementStatus: 'unsettled',
      expectedSettlementDate: expectedSettlement,
      webhookData: payload
    };

    // Update transaction atomically and return updated document
    const transaction = await Transaction.findOneAndUpdate(
      { transactionId },
      update,
      { new: true }
    ).populate('merchantId');

    if (!transaction) {
      console.warn('⚠️ Transaction not found for transactionId:', transactionId);
      return;
    }

    console.log(`💾 Transaction updated: ${transaction.transactionId}`);
    console.log(`   - Status: ${transaction.status}`);
    console.log(`   - Paid at: ${paidAt.toISOString()}`);
    console.log(`   - Expected settlement: ${expectedSettlement.toISOString()}`);

    // Prepare webhook payload for merchant
    const webhookPayload = {
      event: 'payment.success',
      timestamp: new Date().toISOString(),
      transaction_id: transaction.transactionId,
      order_id: transaction.orderId,
      merchant_id: transaction.merchantId._id.toString(),
      data: {
        transaction_id: transaction.transactionId,
        order_id: transaction.orderId,
        phonepe_reference_id: transaction.phonepeReferenceId,
        payment_id: transaction.phonepePaymentId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        payment_method: transaction.paymentMethod,
        paid_at: transaction.paidAt.toISOString(),
        settlement_status: transaction.settlementStatus,
        expected_settlement_date: transaction.expectedSettlementDate.toISOString(),
        acquirer_data: transaction.acquirerData,
        customer: {
          customer_id: transaction.customerId,
          name: transaction.customerName,
          email: transaction.customerEmail,
          phone: transaction.customerPhone
        },
        merchant: {
          merchant_id: transaction.merchantId._id.toString(),
          merchant_name: transaction.merchantName
        },
        description: transaction.description,
        created_at: transaction.createdAt.toISOString(),
        updated_at: transaction.updatedAt.toISOString()
      }
    };

    // Send merchant webhook if enabled
    if (transaction.merchantId.webhookEnabled) {
      await sendMerchantWebhook(transaction.merchantId, webhookPayload);
    }

    console.log('✅ PhonePe payment webhook processed successfully');

  } catch (error) {
    console.error('❌ handlePhonePePaymentSuccess error:', error.stack || error.message);
  }
}





async function handlePhonePePaymentFailed(payload) {
  try {
    const transaction = await Transaction.findOne({ phonepeReferenceId: payload.referenceId }).populate('merchantId');
    if (!transaction) return;

    transaction.status = 'failed';
    transaction.failureReason = payload.failureReason || payload.errorDescription;
    transaction.phonepePaymentId = payload.transactionId;
    transaction.updatedAt = new Date();

    await transaction.save();
    console.log('❌ PhonePe Transaction marked as FAILED:', transaction.transactionId);
  } catch (error) {
    console.error('❌ handlePhonePePaymentFailed error:', error.message);
  }
}

// ============ RAZORPAY CALLBACK HANDLER ============
/**
 * Handle Razorpay payment link callback (GET request after payment)
 * This is called when user is redirected back from Razorpay payment page
 */
exports.handleRazorpayCallback = async (req, res) => {
    try {
        const { transaction_id, status, payment_link_id, payment_id } = req.query;

        console.log('🔔 Razorpay Callback received');
        console.log('   - Transaction ID:', transaction_id);
        console.log('   - Status:', status);
        console.log('   - Payment Link ID:', payment_link_id);
        console.log('   - Payment ID:', payment_id);

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

        // If payment was successful, verify with Razorpay API
        if (status === 'success' && payment_id) {
            try {
                // Fetch payment details from Razorpay
                const payment = await razorpay.payments.fetch(payment_id);
                
                if (payment.status === 'captured' || payment.status === 'authorized') {
                    // Payment is successful, update transaction if not already updated
                    if (transaction.status !== 'paid') {
                        const paidAt = new Date(payment.created_at * 1000);
                        const expectedSettlement = calculateExpectedSettlementDate(paidAt);

                        // Calculate commission if not already set
                        const commissionData = calculatePayinCommission(transaction.amount);
                        
                        const update = {
                            status: 'paid',
                            paidAt,
                            paymentMethod: payment.method || 'UPI',
                            razorpayPaymentId: payment.id,
                            updatedAt: new Date(),
                            acquirerData: {
                                utr: payment.acquirer_data?.utr || null,
                                rrn: payment.acquirer_data?.rrn || null,
                                bank_transaction_id: payment.acquirer_data?.bank_transaction_id || null,
                                auth_code: payment.acquirer_data?.auth_code || null,
                                card_last4: payment.acquirer_data?.card_last4 || null,
                                card_network: payment.acquirer_data?.card_network || null,
                                bank_name: payment.acquirer_data?.bank_name || null,
                                vpa: payment.acquirer_data?.vpa || null
                            },
                            settlementStatus: 'unsettled',
                            expectedSettlementDate: expectedSettlement,
                            commission: commissionData.commission,
                            netAmount: parseFloat((transaction.amount - commissionData.commission).toFixed(2))
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
                                    razorpay_payment_link_id: updatedTransaction.razorpayPaymentLinkId,
                                    razorpay_payment_id: updatedTransaction.razorpayPaymentId,
                                    razorpay_reference_id: updatedTransaction.razorpayReferenceId,
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
                console.error('❌ Error verifying payment with Razorpay:', error);
                // Continue to redirect even if verification fails
            }
        }

        // Redirect to success or failure URL
        if (status === 'success') {
            const redirectUrl = transaction.successUrl || 
                              transaction.callbackUrl || 
                              `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-success?transaction_id=${transaction_id}`;
            return res.redirect(redirectUrl);
        } else {
            const redirectUrl = transaction.failureUrl || 
                              `${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed?transaction_id=${transaction_id}`;
            return res.redirect(redirectUrl);
        }

    } catch (error) {
        console.error('❌ Razorpay Callback Handler Error:', error);
        return res.redirect(`${process.env.FRONTEND_URL || 'https://payments.ninex-group.com'}/payment-failed?error=callback_error`);
    }
};

// ============ RAZORPAY WEBHOOK HANDLER ============
/**
 * Verify Razorpay webhook signature
 * @param {Buffer} body - Raw request body
 * @param {string} signature - X-Razorpay-Signature header value
 * @returns {boolean} True if signature is valid
 */
function verifyRazorpayWebhookSignature(body, signature) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.error('❌ RAZORPAY_WEBHOOK_SECRET not configured');
        return false;
    }

    if (!signature) {
        return false;
    }

    // Razorpay uses HMAC SHA256
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

    // Timing-safe comparison
    try {
        const A = Buffer.from(signature, 'utf8');
        const B = Buffer.from(expectedSignature, 'utf8');
        if (A.length !== B.length) return false;
        return crypto.timingSafeEqual(A, B);
    } catch (e) {
        return false;
    }
}

/**
 * Handle Razorpay webhook events
 */
exports.handleRazorpayWebhook = async (req, res) => {
    try {
        console.log('🔔 Razorpay Webhook received');
        
        // Log request details for debugging
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ip = req.ip || req.connection.remoteAddress || 'Unknown';
        console.log(`   - IP: ${ip}`);
        console.log(`   - User-Agent: ${userAgent}`);
        console.log(`   - Content-Type: ${req.headers['content-type'] || 'Not set'}`);

        // Get signature from header (check multiple variations)
        const signature = req.headers['x-razorpay-signature'] || 
                         req.headers['X-Razorpay-Signature'] ||
                         req.headers['x-razorpay-signature'] ||
                         req.headers['X-RAZORPAY-SIGNATURE'];
        
        // Check if webhook secret is configured first
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('❌ RAZORPAY_WEBHOOK_SECRET not configured in environment variables');
            console.error('   - Please set RAZORPAY_WEBHOOK_SECRET in your .env file');
            console.error('   - You can find this in Razorpay Dashboard > Settings > Webhooks > Webhook Secret');
            console.error('   - Without the secret, webhooks cannot be verified and will be rejected');
        }
        
        if (!signature) {
            console.warn('❌ Missing X-Razorpay-Signature header');
            console.warn('   - This might be because:');
            console.warn('     1. Webhook secret is not configured in Razorpay Dashboard');
            console.warn('     2. A proxy/load balancer is stripping the header');
            console.warn('     3. This is a test webhook from Razorpay');
            console.warn('   - All headers:', JSON.stringify(req.headers, null, 2));
            
            // In development, allow processing without signature (with warning)
            // In production, always require signature for security
            const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.ALLOW_UNSIGNED_WEBHOOKS === 'true';
            
            if (isDevelopment && webhookSecret) {
                console.warn('⚠️ Development mode: Processing webhook without signature verification');
                console.warn('⚠️ WARNING: This is NOT secure and should NOT be used in production!');
                
                // Parse and process the webhook
                let payload;
                try {
                    if (Buffer.isBuffer(req.body)) {
                        payload = JSON.parse(req.body.toString('utf8'));
                    } else {
                        payload = req.body;
                    }
                    
                    if (payload && payload.event) {
                        console.log('📦 Processing webhook in development mode (no signature verification)');
                        console.log('📦 Event:', payload.event);
                        
                        // Store parsed payload for later use
                        req.parsedPayload = payload;
                        
                        // Process the webhook without signature verification
                        // Continue to the processing logic below
                    } else {
                        return res.status(400).json({ 
                            success: false, 
                            error: 'Invalid webhook payload' 
                        });
                    }
                } catch (e) {
                    console.error('❌ Failed to parse webhook body:', e);
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Invalid JSON payload' 
                    });
                }
                
                // Skip signature verification and go directly to processing
                // We'll set a flag to skip verification
                req.skipSignatureVerification = true;
            } else {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing signature header',
                    message: 'Razorpay webhooks require X-Razorpay-Signature header for security. Please configure webhook secret in Razorpay Dashboard.'
                });
            }
        }

        // Skip signature verification if in development mode and signature is missing
        if (!req.skipSignatureVerification) {
            // Get raw body for signature verification
            // For express.raw() middleware, req.body is already a Buffer
            const rawBody = Buffer.isBuffer(req.body) ? req.body : 
                           (req.rawBody ? Buffer.from(req.rawBody, 'utf8') : 
                            Buffer.from(JSON.stringify(req.body), 'utf8'));

            // Verify signature
            const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
            
            if (!isValid) {
                console.warn('❌ Invalid Razorpay webhook signature');
                console.warn('   - Please verify RAZORPAY_WEBHOOK_SECRET matches the one in Razorpay Dashboard');
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid signature' 
                });
            }

            console.log('✅ Razorpay webhook signature verified');
        } else {
            console.warn('⚠️ Skipping signature verification (development mode only)');
        }

        // Parse payload (if raw body, parse JSON; otherwise use req.body)
        // If we already parsed it in development mode, use that
        let payload = req.parsedPayload;
        
        if (!payload) {
            if (Buffer.isBuffer(req.body)) {
                try {
                    payload = JSON.parse(req.body.toString('utf8'));
                } catch (e) {
                    console.error('❌ Failed to parse webhook body as JSON:', e);
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Invalid JSON payload' 
                    });
                }
            } else {
                payload = req.body;
            }
        }
        
        if (!payload || Object.keys(payload).length === 0) {
            console.warn('❌ Webhook received with empty payload');
            return res.status(400).json({ 
                success: false, 
                error: 'Empty webhook payload' 
            });
        }

        // Extract event type
        const event = payload.event || payload.type || '';
        console.log('📦 Razorpay Event:', event);

        // Handle different events
        switch (event) {
            case 'payment.captured':
            case 'payment_link.paid':
                await handleRazorpayPaymentSuccess(payload);
                break;

            case 'payment.failed':
            case 'payment_link.failed':
                await handleRazorpayPaymentFailed(payload);
                break;

            default:
                console.log('⚠️ Unhandled Razorpay webhook event:', event);
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Webhook processed' 
        });

    } catch (error) {
        console.error('❌ Razorpay Webhook Handler Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Webhook processing failed' 
        });
    }
};

// ============ RAZORPAY WEBHOOK HANDLERS ============

/**
 * Handle successful Razorpay payment (following PhonePe pattern)
 */
async function handleRazorpayPaymentSuccess(payload) {
    try {
        console.log('💡 handleRazorpayPaymentSuccess triggered');
        console.log('📦 Full webhook payload:', JSON.stringify(payload, null, 2));

        // Extract payment link ID or payment ID
        const paymentLinkId = payload.payload?.payment_link?.entity?.id || 
                             payload.payload?.payment?.entity?.notes?.payment_link_id ||
                             payload.payment_link_id;
        
        const paymentId = payload.payload?.payment?.entity?.id || 
                         payload.payment_id;

        // Also try to get reference_id from payment link entity
        const referenceId = payload.payload?.payment_link?.entity?.reference_id ||
                           payload.payload?.payment?.entity?.notes?.reference_id ||
                           payload.reference_id;

        console.log('🔍 Looking for transaction with:');
        console.log('   - Payment Link ID:', paymentLinkId);
        console.log('   - Payment ID:', paymentId);
        console.log('   - Reference ID:', referenceId);

        if (!paymentLinkId && !paymentId && !referenceId) {
            console.warn('⚠️ Missing payment link ID, payment ID, and reference ID in webhook payload');
            return;
        }

        // Build query conditions (only include non-null values)
        const queryConditions = [];
        if (paymentLinkId) {
            queryConditions.push({ razorpayPaymentLinkId: paymentLinkId });
            queryConditions.push({ orderId: paymentLinkId });
        }
        if (paymentId) {
            queryConditions.push({ razorpayPaymentId: paymentId });
        }
        if (referenceId) {
            queryConditions.push({ razorpayReferenceId: referenceId });
        }

        // Find transaction by payment link ID, payment ID, reference ID, or order ID
        const transaction = await Transaction.findOne({
            $or: queryConditions.length > 0 ? queryConditions : [{ _id: null }] // Fallback to prevent empty $or
        }).populate('merchantId');

        if (!transaction) {
            console.warn('⚠️ Transaction not found for:');
            console.warn('   - Payment Link ID:', paymentLinkId);
            console.warn('   - Payment ID:', paymentId);
            console.warn('   - Reference ID:', referenceId);
            return;
        }

        console.log('✅ Transaction found:', transaction.transactionId);
        console.log('   - Current status:', transaction.status);
        
        // Prevent duplicate updates if already paid
        if (transaction.status === 'paid') {
            console.log('⚠️ Transaction already marked as paid, skipping update');
            return;
        }

        // Extract payment details
        const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment_link?.entity || {};
        const amountPaid = (paymentEntity.amount || paymentEntity.amount_paid || transaction.amount || 0) / 100; // Convert from paisa
        const paidAt = paymentEntity.created_at ? new Date(paymentEntity.created_at * 1000) : new Date();
        const expectedSettlement = calculateExpectedSettlementDate(paidAt);

        // Extract payment method
        const paymentMethod = paymentEntity.method || 
                             paymentEntity.payment_method || 
                             'UPI';

        // Extract UTR/RRN from payment entity
        const utr = paymentEntity.acquirer_data?.utr || 
                   paymentEntity.acquirer_data?.rrn ||
                   paymentEntity.notes?.utr ||
                   null;

        // Calculate commission if not already set
        const commissionData = calculatePayinCommission(amountPaid);

        // Build atomic update object (following PhonePe pattern)
        // Use $set to ensure all fields are properly updated
        const update = {
            $set: {
                status: 'paid',
                paidAt,
                paymentMethod,
                razorpayPaymentId: paymentId || paymentEntity.id,
                updatedAt: new Date(),
                acquirerData: {
                    utr: utr,
                    rrn: paymentEntity.acquirer_data?.rrn || null,
                    bank_transaction_id: paymentEntity.acquirer_data?.bank_transaction_id || null,
                    auth_code: paymentEntity.acquirer_data?.auth_code || null,
                    card_last4: paymentEntity.acquirer_data?.card_last4 || null,
                    card_network: paymentEntity.acquirer_data?.card_network || null,
                    bank_name: paymentEntity.acquirer_data?.bank_name || null,
                    vpa: paymentEntity.acquirer_data?.vpa || null
                },
                settlementStatus: 'unsettled',
                expectedSettlementDate: expectedSettlement,
                webhookData: payload,
                commission: commissionData.commission,
                netAmount: parseFloat((amountPaid - commissionData.commission).toFixed(2))
            }
        };

        // Update transaction atomically and return updated document (following PhonePe pattern)
        const updatedTransaction = await Transaction.findOneAndUpdate(
            { 
                _id: transaction._id,
                status: { $ne: 'paid' } // Only update if not already paid (prevent duplicate updates)
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
        console.log(`   - Expected settlement: ${expectedSettlement.toISOString()}`);

        // Prepare webhook payload for merchant (following PhonePe pattern)
        const webhookPayload = {
            event: 'payment.success',
            timestamp: new Date().toISOString(),
            transaction_id: updatedTransaction.transactionId,
            order_id: updatedTransaction.orderId,
            merchant_id: updatedTransaction.merchantId._id.toString(),
            data: {
                transaction_id: updatedTransaction.transactionId,
                order_id: updatedTransaction.orderId,
                razorpay_payment_link_id: updatedTransaction.razorpayPaymentLinkId,
                razorpay_payment_id: updatedTransaction.razorpayPaymentId,
                razorpay_reference_id: updatedTransaction.razorpayReferenceId,
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

        // Send merchant webhook if enabled (following PhonePe pattern)
        if (updatedTransaction.merchantId.webhookEnabled) {
            await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
        }

        console.log('✅ Razorpay payment webhook processed successfully');

    } catch (error) {
        console.error('❌ handleRazorpayPaymentSuccess error:', error.stack || error.message);
    }
}

/**
 * Handle failed Razorpay payment (following PhonePe pattern)
 */
async function handleRazorpayPaymentFailed(payload) {
    try {
        console.log('💡 handleRazorpayPaymentFailed triggered');
        console.log('📦 Full webhook payload:', JSON.stringify(payload, null, 2));

        // Extract payment link ID or payment ID
        const paymentLinkId = payload.payload?.payment_link?.entity?.id || 
                             payload.payload?.payment?.entity?.notes?.payment_link_id ||
                             payload.payment_link_id;
        
        const paymentId = payload.payload?.payment?.entity?.id || 
                         payload.payment_id;

        // Also try to get reference_id from payment link entity
        const referenceId = payload.payload?.payment_link?.entity?.reference_id ||
                           payload.payload?.payment?.entity?.notes?.reference_id ||
                           payload.reference_id;

        console.log('🔍 Looking for transaction with:');
        console.log('   - Payment Link ID:', paymentLinkId);
        console.log('   - Payment ID:', paymentId);
        console.log('   - Reference ID:', referenceId);

        // Build query conditions (only include non-null values)
        const queryConditions = [];
        if (paymentLinkId) {
            queryConditions.push({ razorpayPaymentLinkId: paymentLinkId });
            queryConditions.push({ orderId: paymentLinkId });
        }
        if (paymentId) {
            queryConditions.push({ razorpayPaymentId: paymentId });
        }
        if (referenceId) {
            queryConditions.push({ razorpayReferenceId: referenceId });
        }

        // Find transaction by payment link ID, payment ID, reference ID, or order ID
        const transaction = await Transaction.findOne({
            $or: queryConditions.length > 0 ? queryConditions : [{ _id: null }] // Fallback to prevent empty $or
        }).populate('merchantId');

        if (!transaction) {
            console.warn('⚠️ Transaction not found for failed payment:');
            console.warn('   - Payment Link ID:', paymentLinkId);
            console.warn('   - Payment ID:', paymentId);
            console.warn('   - Reference ID:', referenceId);
            return;
        }

        console.log('✅ Transaction found:', transaction.transactionId);
        console.log('   - Current status:', transaction.status);

        // Extract failure reason
        const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment_link?.entity || {};
        const failureReason = paymentEntity.error_description || 
                            paymentEntity.error_code ||
                            paymentEntity.error?.description ||
                            'Payment failed';

        // Update transaction atomically (following PhonePe pattern, using findOneAndUpdate)
        const update = {
            $set: {
                status: 'failed',
                failureReason: failureReason,
                razorpayPaymentId: paymentId || paymentEntity.id,
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

        console.log('❌ Razorpay Transaction marked as FAILED:', updatedTransaction.transactionId);

        // Send merchant webhook if enabled (following PhonePe pattern)
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
                    razorpay_payment_link_id: updatedTransaction.razorpayPaymentLinkId,
                    razorpay_payment_id: updatedTransaction.razorpayPaymentId,
                    status: updatedTransaction.status,
                    failure_reason: updatedTransaction.failureReason,
                    created_at: updatedTransaction.createdAt.toISOString(),
                    updated_at: updatedTransaction.updatedAt.toISOString()
                }
            };

            await sendMerchantWebhook(updatedTransaction.merchantId, webhookPayload);
        }

    } catch (error) {
        console.error('❌ handleRazorpayPaymentFailed error:', error.message);
    }
}
