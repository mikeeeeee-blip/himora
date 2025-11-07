// Crypto Webhook Routes
// Separate route file for crypto payout webhook configuration
//
// PURPOSE:
// This module handles sending webhooks TO 3rd party crypto services when payout status changes.
// When our system processes/completes a crypto payout, we notify the 3rd party service.
//
// FLOW:
// 1. Admin configures 3rd party webhook URL in environment: CRYPTO_WEBHOOK_URL
// 2. Admin generates/gets secret key: CRYPTO_WEBHOOK_SECRET (via WebhookPage)
// 3. Admin adds URL and secret to environment variables
// 4. When crypto payout is processed/completed, system sends webhook to 3rd party URL
// 5. Webhook includes payout details, transaction hash, network info, etc.
// 6. 3rd party receives webhook and updates their records
//
// ENDPOINTS:
// - GET /api/crypto/webhook/health - Health check (public)
// - GET /api/crypto/webhook/secret - Admin gets webhook config status (auth required)
// - POST /api/crypto/webhook/secret/generate - Admin generates new secret (auth required)
//
// WEBHOOK PAYLOAD SENT TO 3RD PARTY:
// {
//   "event": "payout.completed",
//   "payout_id": "PAYOUT_REQ_1234567890_abc123",
//   "transaction_hash": "0x1234...",
//   "network": "ethereum",
//   "currency": "USDT",
//   "wallet_address": "0x742d...",
//   "amount": 100.50,
//   "timestamp": "2024-01-15T10:30:00Z",
//   "explorer_url": "https://etherscan.io/tx/..."
// }

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.js");
const {
  cryptoWebhookHealth,
  getCryptoWebhookSecret,
  generateCryptoWebhookSecret,
} = require("../controllers/cryptoWebhookController");

// ============ WEBHOOK HEALTH CHECK ============
// Public endpoint to verify webhook service is running
router.get("/webhook/health", cryptoWebhookHealth);

// ============ CRYPTO WEBHOOK CONFIGURATION (Admin Only) ============
// Admin endpoints to manage webhook configuration for 3rd party integration
// GET: Check if webhook URL and secret are configured
// POST: Generate new secret (admin must add CRYPTO_WEBHOOK_SECRET to environment variables)
// Note: CRYPTO_WEBHOOK_URL must be set in environment variables (3rd party's endpoint)
router.get("/webhook/secret", auth, getCryptoWebhookSecret);
router.post("/webhook/secret/generate", auth, generateCryptoWebhookSecret);

module.exports = router;
