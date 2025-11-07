# Crypto Payout Webhook Integration Guide

## Overview

Our system **sends webhooks TO** the 3rd party crypto service when payout status changes. The 3rd party must expose an endpoint to receive these webhook notifications.

## Architecture

```
Our System → Sends Webhook → 3rd Party Endpoint
```

**NOT** the other way around. We do not receive webhooks from the 3rd party.

## 3rd Party Requirements

### 1. Expose Webhook Endpoint

The 3rd party crypto service must expose a **POST** endpoint to receive webhook notifications:

```
POST https://your-3rd-party-service.com/webhook/crypto-payout
```

### 2. Expected Request Format

**Headers:**
- `Content-Type: application/json`
- `x-crypto-signature: <HMAC-SHA256 signature>` (for verification)
- `x-webhook-signature: <HMAC-SHA256 signature>` (alternative header)
- `User-Agent: Himora-Crypto-Webhook/1.0`

**Request Body:**
```json
{
  "event": "payout.completed",
  "payout_id": "PAYOUT_REQ_1234567890_abc123",
  "transaction_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "network": "ethereum",
  "currency": "USDT",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 100.50,
  "timestamp": "2024-01-15T10:30:00Z",
  "explorer_url": "https://etherscan.io/tx/0x1234...",
  "status": "completed",
  "merchant_id": "507f1f77bcf86cd799439011",
  "merchant_name": "Merchant Name",
  "commission": 5.00,
  "gross_amount": 105.50,
  "net_amount": 100.50
}
```

### 3. Signature Verification

The 3rd party should verify the webhook signature to ensure authenticity:

1. Get the signature from `x-crypto-signature` or `x-webhook-signature` header
2. Compute HMAC-SHA256 of the request body using the shared secret
3. Compare the computed signature with the received signature

**Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifySignature(body, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(body));
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 4. Response Format

The 3rd party endpoint should return:

**Success (200-299):**
```json
{
  "success": true,
  "message": "Webhook received"
}
```

**Error (4xx):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Our System Configuration

### Environment Variables

1. **CRYPTO_WEBHOOK_URL** - The 3rd party's webhook endpoint URL
   ```
   CRYPTO_WEBHOOK_URL=https://your-3rd-party-service.com/webhook/crypto-payout
   ```

2. **CRYPTO_WEBHOOK_SECRET** - Shared secret for signing webhooks
   ```
   CRYPTO_WEBHOOK_SECRET=crypto_whsec_<generated-secret>
   ```

### How to Configure

1. Generate secret via Admin Dashboard → Webhooks → Crypto Payout Webhook → Generate Secret
2. Copy the generated secret
3. Add both `CRYPTO_WEBHOOK_URL` and `CRYPTO_WEBHOOK_SECRET` to your `.env` file
4. Restart the server

## Webhook Events

Our system sends the following events:

- `payout.completed` - Payout was successfully processed
- `payout.failed` - Payout failed
- `payout.pending` - Payout is pending processing

## Testing the 3rd Party Endpoint

Use this test script to verify your 3rd party endpoint receives webhooks correctly:

```javascript
// test-3rd-party-webhook.js
// Test script to verify 3rd party endpoint receives our webhooks

const http = require('http');
const crypto = require('crypto');

// Configuration
const THIRD_PARTY_URL = 'http://localhost:3000/webhook/crypto-payout'; // Your 3rd party endpoint
const SECRET = 'crypto_whsec_your_secret_here'; // Shared secret

// Test payload (what our system sends)
const testPayload = {
  event: 'payout.completed',
  payout_id: 'PAYOUT_REQ_1234567890_abc123',
  transaction_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  network: 'ethereum',
  currency: 'USDT',
  wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  amount: 100.50,
  timestamp: new Date().toISOString(),
  explorer_url: 'https://etherscan.io/tx/0x1234...',
  status: 'completed',
  merchant_id: '507f1f77bcf86cd799439011',
  merchant_name: 'Test Merchant',
  commission: 5.00,
  gross_amount: 105.50,
  net_amount: 100.50
};

// Generate signature (same as our system)
function generateSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

const payloadString = JSON.stringify(testPayload);
const signature = generateSignature(testPayload, SECRET);

// Parse URL
const url = new URL(THIRD_PARTY_URL);

console.log('🧪 Testing 3rd Party Webhook Endpoint...');
console.log('📋 URL:', THIRD_PARTY_URL);
console.log('📦 Payload:', payloadString);
console.log('🔑 Signature:', signature);
console.log('');

const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadString),
    'x-crypto-signature': signature,
    'x-webhook-signature': signature,
    'User-Agent': 'Himora-Crypto-Webhook/1.0'
  }
};

const req = http.request(options, (res) => {
  console.log(`\n📥 Response from 3rd Party:`);
  console.log(`   Status Code: ${res.statusCode}`);
  console.log(`   Status Message: ${res.statusMessage}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n📤 Response Body:`);
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('\n✅ Webhook received successfully by 3rd party!');
    } else {
      console.log('\n⚠️ 3rd party returned non-success status');
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Request error: ${e.message}`);
  console.log('\n💡 Make sure your 3rd party endpoint is running and accessible');
  process.exit(1);
});

req.write(payloadString);
req.end();
```

## Flow Diagram

```
1. Admin processes crypto payout in our system
   ↓
2. Payout status updated to "completed"
   ↓
3. Our system sends POST request to CRYPTO_WEBHOOK_URL
   ↓
4. 3rd party receives webhook, verifies signature
   ↓
5. 3rd party updates their records
   ↓
6. 3rd party returns 200 OK
```

## Important Notes

- **We send TO them**: Our system initiates the webhook, 3rd party receives it
- **Signature verification**: 3rd party should always verify the signature
- **Retry logic**: Our system retries failed webhooks (exponential backoff)
- **Timeout**: 10 seconds timeout per request
- **Idempotency**: 3rd party should handle duplicate webhooks gracefully

