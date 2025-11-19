const crypto = require('crypto');
const axios = require('axios');
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
const PAYTM_BASE_URL = PAYTM_ENVIRONMENT === 'staging' 
    ? 'https://securegw-stage.paytm.in'
    : 'https://securegw.paytm.in';

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

        // Prepare Paytm payment request parameters
        // Paytm expects TXN_AMOUNT as a string with 2 decimal places (e.g., "100.00" for ₹100)
        const amountFormatted = parseFloat(amount).toFixed(2);
        console.log('💰 Amount Formatting:');
        console.log('   Original:', amount);
        console.log('   Parsed:', parseFloat(amount));
        console.log('   Formatted (TXN_AMOUNT):', amountFormatted);

        // Create checksum for Paytm request (without CHECKSUMHASH first)
        // Note: Parameter names and values must match exactly what's in Paytm Dashboard
        const paytmParams = {
            MID: PAYTM_MERCHANT_ID,
            ORDER_ID: orderId,
            CUST_ID: `CUST_${customer_phone}_${Date.now()}`,
            INDUSTRY_TYPE_ID: PAYTM_INDUSTRY_TYPE,
            CHANNEL_ID: 'WEB',
            TXN_AMOUNT: amountFormatted, // Format: "100.00" (not in paise)
            WEBSITE: PAYTM_WEBSITE, // Must match Paytm Dashboard configuration
            CALLBACK_URL: paytmCallbackUrl,
            EMAIL: customer_email,
            MOBILE_NO: customer_phone
        };

        console.log('\n📋 Paytm Parameters (BEFORE checksum generation):');
        console.log('   MID:', paytmParams.MID);
        console.log('   ORDER_ID:', paytmParams.ORDER_ID);
        console.log('   CUST_ID:', paytmParams.CUST_ID);
        console.log('   INDUSTRY_TYPE_ID:', paytmParams.INDUSTRY_TYPE_ID, '(⚠️ MUST match Dashboard)');
        console.log('   CHANNEL_ID:', paytmParams.CHANNEL_ID);
        console.log('   TXN_AMOUNT:', paytmParams.TXN_AMOUNT, '(type:', typeof paytmParams.TXN_AMOUNT + ')');
        console.log('   WEBSITE:', paytmParams.WEBSITE, '(⚠️ MUST match Dashboard)');
        console.log('   CALLBACK_URL:', paytmParams.CALLBACK_URL);
        console.log('   EMAIL:', paytmParams.EMAIL);
        console.log('   MOBILE_NO:', paytmParams.MOBILE_NO);
        console.log('   Total Parameters:', Object.keys(paytmParams).length);

        // Generate checksum (don't include CHECKSUMHASH in the params when generating)
        console.log('\n🔐 Generating Checksum...');
        const checksum = generatePaytmChecksum(paytmParams, PAYTM_MERCHANT_KEY);
        paytmParams.CHECKSUMHASH = checksum;

        console.log('\n✅ Checksum Generated Successfully');
        console.log('   Checksum (first 30 chars):', checksum.substring(0, 30) + '...');
        console.log('   Checksum (last 10 chars):', '...' + checksum.substring(checksum.length - 10));
        console.log('   Checksum Length:', checksum.length, 'characters');

        console.log('\n📦 Final Paytm Parameters (for form submission):');
        const paramsForLog = { ...paytmParams };
        paramsForLog.MID = '***HIDDEN***';
        paramsForLog.CHECKSUMHASH = checksum.substring(0, 20) + '...' + checksum.substring(checksum.length - 10);
        console.log(JSON.stringify(paramsForLog, null, 2));

        console.log('\n⚠️ CRITICAL: Verify these match your Paytm Dashboard EXACTLY:');
        console.log('   - WEBSITE:', PAYTM_WEBSITE, '(case-sensitive, must match Dashboard)');
        console.log('   - INDUSTRY_TYPE_ID:', PAYTM_INDUSTRY_TYPE, '(case-sensitive, must match Dashboard)');
        console.log('   - MID:', PAYTM_MERCHANT_ID, '(must match Dashboard)');
        console.log('   - Merchant Key:', PAYTM_MERCHANT_KEY ? 'SET (verify it matches Dashboard)' : 'MISSING!');

        console.log('\n📤 Payment Link Details:');
        console.log('   Transaction ID:', transactionId);
        console.log('   Order ID:', orderId);
        console.log('   Amount: ₹', amount, '(formatted as:', amountFormatted + ')');
        console.log('   Paytm Payment URL:', `${PAYTM_BASE_URL}/theia/processTransaction`);
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

        // Return payment form URL (Paytm uses form-based payment)
        const paymentUrl = `${PAYTM_BASE_URL}/theia/processTransaction`;

        res.json({
            success: true,
            transaction_id: transactionId,
            payment_link_id: orderId,
            payment_url: paymentUrl,
            order_id: orderId,
            order_amount: parseFloat(amount),
            order_currency: 'INR',
            merchant_id: merchantId.toString(),
            merchant_name: merchantName,
            reference_id: referenceId,
            callback_url: finalCallbackUrl,
            paytm_params: paytmParams, // Include params for frontend to submit form
            message: 'Payment link created successfully. Use payment_url and paytm_params to create payment form.'
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
            console.log('\n🔍 Verifying Paytm Callback Checksum...');
            const isValidChecksum = verifyPaytmChecksum(paytmResponse, PAYTM_MERCHANT_KEY, paytmResponse.CHECKSUMHASH);
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
            const isValidChecksum = verifyPaytmChecksum(payload, PAYTM_MERCHANT_KEY, payload.CHECKSUMHASH);
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
 * Generate Paytm checksum
 * Paytm uses SHA256 with specific string format: key1=value1&key2=value2&...&key=merchantKey
 * Important: Only include non-empty values, sort alphabetically, and append &key=merchantKey
 */
function generatePaytmChecksum(params, merchantKey) {
    console.log('\n' + '-'.repeat(80));
    console.log('🔐 CHECKSUM GENERATION - DETAILED LOG');
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
    
    // Validate merchant key length (Paytm keys are typically 32+ characters)
    if (merchantKey.length < 16) {
        console.warn('   ⚠️ WARNING: Merchant key seems unusually short! Paytm keys are typically 32+ characters.');
        console.warn('   ⚠️ Please verify the merchant key in your Paytm Dashboard matches the one in .env');
    }

    // Remove CHECKSUMHASH if present
    const filteredParams = { ...params };
    const hadChecksum = 'CHECKSUMHASH' in filteredParams;
    delete filteredParams.CHECKSUMHASH;
    
    console.log('   Step 2: Remove CHECKSUMHASH');
    console.log('   - Had CHECKSUMHASH:', hadChecksum);
    console.log('   - Params after removal:', Object.keys(filteredParams).length);

    // Filter out empty values and convert all values to strings, then sort keys alphabetically
    console.log('   Step 3: Filter and Sort Parameters');
    const allKeys = Object.keys(filteredParams);
    console.log('   - All keys before filtering:', allKeys.join(', '));
    
    const sortedKeys = allKeys
        .filter(key => {
            const value = filteredParams[key];
            const isEmpty = value === null || value === undefined || value === '';
            if (isEmpty) {
                console.log(`   - Filtered out (empty): ${key} = ${value}`);
            }
            return !isEmpty;
        })
        .sort();

    console.log('   - Keys after filtering:', sortedKeys.length);
    console.log('   - Sorted keys:', sortedKeys.join(', '));

    // Create string: key1=value1&key2=value2&...
    console.log('   Step 4: Build Parameter String');
    const paramPairs = sortedKeys.map(key => {
        let value = filteredParams[key];
        const originalType = typeof value;
        
        // Convert to string but preserve exact value
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        // Special handling for CALLBACK_URL - Paytm might require it as-is or URL-encoded
        // For now, we'll use it as-is (most Paytm implementations use raw URL)
        // If this fails, we might need to URL-encode it
        const pair = `${key}=${value}`;
        console.log(`   - ${key} (${originalType}): "${value}" -> "${pair}"`);
        
        return pair;
    });

    const dataString = paramPairs.join('&');
    console.log('   - Data String (without key):', dataString);
    console.log('   - Data String Length:', dataString.length, 'characters');

    // Append merchant key: ...&key=merchantKey
    const finalString = `${dataString}&key=${merchantKey}`;
    console.log('   Step 5: Append Merchant Key');
    console.log('   - Final String Length:', finalString.length, 'characters');
    
    // Log full checksum string for debugging (hide merchant key)
    const maskedString = finalString.replace(new RegExp(merchantKey, 'g'), '***MERCHANT_KEY***');
    console.log('   - Final String (masked):', maskedString);
    console.log('   - Final String (first 100 chars):', finalString.substring(0, 100));
    console.log('   - Final String (last 50 chars):', '...' + finalString.substring(finalString.length - 50));

    // Generate SHA256 hash and convert to uppercase
    console.log('   Step 6: Generate SHA256 Hash');
    const hashBuffer = crypto.createHash('sha256').update(finalString, 'utf8').digest();
    const hashHex = hashBuffer.toString('hex');
    const hash = hashHex.toUpperCase();
    
    console.log('   - Hash (lowercase):', hashHex);
    console.log('   - Hash (uppercase):', hash);
    console.log('   - Hash Length:', hash.length, 'characters (expected: 64)');

    console.log('-'.repeat(80));
    console.log('✅ Checksum Generation Complete');
    console.log('-'.repeat(80) + '\n');

    return hash;
}

/**
 * Verify Paytm checksum
 */
function verifyPaytmChecksum(params, merchantKey, checksum) {
    if (!checksum) return false;

    // Generate checksum using same method
    const calculatedChecksum = generatePaytmChecksum(params, merchantKey);

    // Compare (case-insensitive)
    return calculatedChecksum.toLowerCase() === checksum.toLowerCase();
}

/**
 * Verify Paytm payment status
 */
async function verifyPaytmPayment(orderId) {
    try {
        const params = {
            MID: PAYTM_MERCHANT_ID,
            ORDERID: orderId,
            CHECKSUMHASH: ''
        };

        const checksum = generatePaytmChecksum(params, PAYTM_MERCHANT_KEY);
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

