// Test script to verify 3rd party crypto webhook endpoint
// This simulates what our system sends to the 3rd party

const http = require('http');
const crypto = require('crypto');

// ============ CONFIGURATION ============
// Update these values to match your setup
const THIRD_PARTY_URL = 'http://localhost:3000/webhook/crypto-payout';
const SECRET = process.env.CRYPTO_WEBHOOK_SECRET || 'crypto_whsec_test_secret_change_me';

// ============ TEST PAYLOAD ============
// This matches what our system sends
const testPayload = {
  event: 'payout.completed',
  payout_id: 'PAYOUT_REQ_TEST_1234567890_abc123',
  transaction_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  network: 'ethereum',
  currency: 'USDT',
  wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  amount: 100.50,
  timestamp: new Date().toISOString(),
  explorer_url: 'https://etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  status: 'completed',
  merchant_id: '507f1f77bcf86cd799439011',
  merchant_name: 'Test Merchant',
  commission: 5.00,
  gross_amount: 105.50,
  net_amount: 100.50
};

// ============ GENERATE SIGNATURE ============
// Same algorithm as our system uses
function generateWebhookSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

// ============ PREPARE REQUEST ============
const payloadString = JSON.stringify(testPayload);
const signature = generateWebhookSignature(testPayload, SECRET);

// Parse URL
const url = new URL(THIRD_PARTY_URL);

console.log('🧪 Testing 3rd Party Crypto Webhook Endpoint');
console.log('='.repeat(60));
console.log(`📍 URL: ${THIRD_PARTY_URL}`);
console.log(`🔑 Secret: ${SECRET.substring(0, 20)}...`);
console.log(`📦 Payload Size: ${Buffer.byteLength(payloadString)} bytes`);
console.log(`🔐 Signature: ${signature}`);
console.log('');

// ============ SEND REQUEST ============
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadString),
    'x-crypto-signature': signature,
    'x-webhook-signature': signature, // Alternative header name
    'User-Agent': 'Himora-Crypto-Webhook/1.0'
  }
};

console.log('📤 Sending webhook request...');
console.log('   Headers:', JSON.stringify(options.headers, null, 2));
console.log('   Payload:', payloadString);
console.log('');

const req = http.request(options, (res) => {
  console.log('📥 Response Received:');
  console.log('='.repeat(60));
  console.log(`   Status Code: ${res.statusCode}`);
  console.log(`   Status Message: ${res.statusMessage}`);
  console.log(`   Headers:`, JSON.stringify(res.headers, null, 2));
  console.log('');
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📤 Response Body:');
    console.log('='.repeat(60));
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
    console.log('');
    
    // Evaluate response
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ SUCCESS: 3rd party endpoint received webhook correctly!');
      console.log('   The endpoint is working and ready to receive webhooks from our system.');
    } else if (res.statusCode >= 400 && res.statusCode < 500) {
      console.log('⚠️  CLIENT ERROR: 3rd party endpoint returned 4xx status');
      console.log('   Check your endpoint implementation - it may be rejecting the request.');
    } else if (res.statusCode >= 500) {
      console.log('❌ SERVER ERROR: 3rd party endpoint returned 5xx status');
      console.log('   There may be an error in the 3rd party endpoint code.');
    } else {
      console.log(`⚠️  UNEXPECTED STATUS: ${res.statusCode}`);
    }
    
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. If status is 200-299: Endpoint is working correctly!');
    console.log('   2. Set CRYPTO_WEBHOOK_URL=http://localhost:3000/webhook/crypto-payout in your .env');
    console.log('   3. Set CRYPTO_WEBHOOK_SECRET to match the secret used in this test');
    console.log('   4. Restart your server');
    console.log('   5. Process a crypto payout - webhook will be sent automatically');
    
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('❌ REQUEST ERROR:');
  console.error('='.repeat(60));
  console.error(`   Error: ${e.message}`);
  console.error(`   Code: ${e.code}`);
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('   1. Make sure your 3rd party server is running on port 3000');
  console.error('   2. Verify the endpoint URL is correct: http://localhost:3000/webhook/crypto-payout');
  console.error('   3. Check if the endpoint accepts POST requests');
  console.error('   4. Ensure CORS is configured if needed');
  console.error('   5. Check firewall/network settings');
  process.exit(1);
});

// Set timeout
req.setTimeout(10000, () => {
  console.error('❌ REQUEST TIMEOUT:');
  console.error('   The request took longer than 10 seconds');
  console.error('   The 3rd party endpoint may be slow or unresponsive');
  req.destroy();
  process.exit(1);
});

// Send request
req.write(payloadString);
req.end();

