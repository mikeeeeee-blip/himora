// Crypto Payout Webhook Controller
// Sends webhooks TO 3rd party crypto services when payout status changes
//
// PURPOSE:
// When our system processes/completes a crypto payout, we send a webhook notification
// to the 3rd party crypto service so they can update their records.
//
// FLOW:
// 1. Admin configures 3rd party webhook URL and secret in the system
// 2. When crypto payout status changes (completed/failed/pending), we send webhook to 3rd party
// 3. Webhook includes payout details, transaction hash, network info, etc.
// 4. 3rd party receives and processes the webhook

const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const { getExplorerUrl } = require('../config/cryptoConfig');

/**
 * Get crypto webhook URL from environment or database
 * This is the 3rd party's webhook endpoint where we send notifications
 */
async function getCryptoWebhookUrl() {
  // First check environment variable
  if (process.env.CRYPTO_WEBHOOK_URL) {
    return process.env.CRYPTO_WEBHOOK_URL;
  }

  // Fallback: Check if stored in a system config (could be in User model for superAdmin)
  // For now, return null if not in environment
  return null;
}

/**
 * Get crypto webhook secret from environment
 * This secret is used to sign webhooks sent to 3rd party
 */
async function getCryptoWebhookSecretInternal() {
  if (process.env.CRYPTO_WEBHOOK_SECRET) {
    return process.env.CRYPTO_WEBHOOK_SECRET;
  }
  return null;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateWebhookSignature(payload, secret) {
  if (!secret) {
    return null;
  }
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

/**
 * Send webhook to 3rd party crypto service
 * 
 * @param {Object} payout - Payout document
 * @param {String} event - Event type: 'payout.completed', 'payout.failed', 'payout.pending'
 * @param {Number} retries - Number of retry attempts (default: 3)
 */
async function sendCryptoPayoutWebhook(payout, event, retries = 3) {
  try {
    // Get 3rd party webhook URL
    const webhookUrl = await getCryptoWebhookUrl();
    
    if (!webhookUrl) {
      console.warn('⚠️ CRYPTO_WEBHOOK_URL not configured - skipping webhook to 3rd party');
      return { success: false, error: 'Webhook URL not configured' };
    }

    // Get secret for signing
    const secret = await getCryptoWebhookSecretInternal();

    // Build webhook payload
    const payload = {
      event: event,
      payout_id: payout.payoutId,
      transaction_hash: payout.cryptoTransactionHash || payout.utr || null,
      network: payout.beneficiaryDetails?.cryptoNetwork || null,
      currency: payout.beneficiaryDetails?.cryptoCurrency || null,
      wallet_address: payout.beneficiaryDetails?.cryptoWalletAddress || null,
      amount: payout.netAmount || payout.amount || 0,
      timestamp: new Date().toISOString(),
      explorer_url: payout.cryptoExplorerUrl || null,
      status: payout.status,
      // Additional metadata
      merchant_id: payout.merchantId?.toString() || null,
      merchant_name: payout.merchantName || null,
      commission: payout.commission || 0,
      gross_amount: payout.amount || 0,
      net_amount: payout.netAmount || 0
    };

    // Generate signature if secret is available
    const signature = secret ? generateWebhookSignature(payload, secret) : null;

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Himora-Crypto-Webhook/1.0'
    };

    if (signature) {
      headers['x-crypto-signature'] = signature;
      headers['x-webhook-signature'] = signature; // Alternative header name
    }

    console.log(`📤 Sending crypto payout webhook to 3rd party: ${event}`);
    console.log(`   URL: ${webhookUrl}`);
    console.log(`   Payout ID: ${payout.payoutId}`);
    console.log(`   Retries: ${retries}`);

    // Send webhook
    const response = await axios.post(webhookUrl, payload, {
      headers,
      timeout: 10000,
      validateStatus: (status) => status < 500 // Don't throw on 4xx
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ Crypto webhook sent successfully to 3rd party. Status: ${response.status}`);
      return { 
        success: true, 
        status: response.status, 
        response: response.data 
      };
    }

    // 4xx responses (client errors)
    console.warn(`⚠️ Crypto webhook returned non-2xx status: ${response.status}`);
    return { 
      success: false, 
      status: response.status, 
      response: response.data, 
      error: `HTTP ${response.status}` 
    };

  } catch (error) {
    console.error(`❌ Crypto webhook failed for payout ${payout.payoutId}:`, error.message);
    
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    if (error.code) {
      console.error('   Error code:', error.code);
    }

    // Retry logic with exponential backoff
    if (retries > 0 && error.code !== 'ENOTFOUND') {
      const attempt = 4 - retries;
      const backoffMs = Math.min(30000, 1000 * Math.pow(2, attempt)); // 1s, 2s, 4s, 8s... capped 30s
      console.log(`   Retrying in ${backoffMs}ms... (${retries - 1} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return await sendCryptoPayoutWebhook(payout, event, retries - 1);
    }

    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      code: error.code
    };
  }
}

/**
 * Health check endpoint
 */
exports.cryptoWebhookHealth = async (req, res) => {
  try {
    const webhookUrl = await getCryptoWebhookUrl();
    const secret = await getCryptoWebhookSecretInternal();

    res.json({
      success: true,
      status: 'healthy',
      webhook_configured: !!webhookUrl,
      secret_configured: !!secret,
      webhook_url: webhookUrl ? 'configured' : 'not configured',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
};

/**
 * Get crypto webhook configuration status (Admin only)
 */
exports.getCryptoWebhookSecret = async (req, res) => {
  try {
    const webhookUrl = await getCryptoWebhookUrl();
    const secret = await getCryptoWebhookSecretInternal();

    res.json({
      success: true,
      webhook_url_configured: !!webhookUrl,
      secret_configured: !!secret,
      // Don't expose the actual URL or secret for security
      webhook_url: webhookUrl ? 'configured' : null,
      secret: secret ? 'configured' : null
    });
  } catch (error) {
    console.error('❌ Get Crypto Webhook Secret Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook configuration'
    });
  }
};

/**
 * Generate new crypto webhook secret (Admin only)
 * Note: This generates a secret, but admin must manually add it to environment variables
 */
exports.generateCryptoWebhookSecret = async (req, res) => {
  try {
    const newSecret = `crypto_whsec_${crypto.randomBytes(32).toString('hex')}`;

    res.json({
      success: true,
      secret: newSecret,
      message: 'New secret generated. Add CRYPTO_WEBHOOK_SECRET to your environment variables.',
      instructions: [
        '1. Copy the secret above',
        '2. Add CRYPTO_WEBHOOK_SECRET=<secret> to your .env file',
        '3. Restart your server',
        '4. Share this secret with the 3rd party crypto service'
      ]
    });
  } catch (error) {
    console.error('❌ Generate Crypto Webhook Secret Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate webhook secret'
    });
  }
};

/**
 * Export the send function for use in other controllers
 */
exports.sendCryptoPayoutWebhook = sendCryptoPayoutWebhook;
