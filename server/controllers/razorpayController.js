const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const { sendMerchantWebhook } = require('./merchantWebhookController');
const User = require('../models/User');
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
            `${process.env.FRONTEND_URL}/razorpay-success.html`;

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
            callback_url: `${finalCallbackUrl}?transaction_id=${transactionId}&status=success`,
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

        res.json({
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
            expires_at: paymentLink.expire_by,
            message: 'Payment link created successfully. Share this URL with customer.'
        });

    } catch (error) {
        console.error('❌ Create Razorpay Payment Link Error:', error);
        res.status(500).json({
            success: false,
            error: error.error?.description || 'Failed to create payment link',
            details: error.error
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
        phonepeDeepLink,
        gPayDeepLink,
        gPayIntent,
        upiDeepLink,
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
      phonepe_deep_link: phonepeDeepLink,
      gpay_deep_link: gPayDeepLink,
      gpay_intent: gPayIntent, // new field (Android intent)
      upi_deep_link: upiDeepLink,
      pa: pa || null
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
