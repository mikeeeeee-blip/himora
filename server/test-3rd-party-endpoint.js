// Simple 3rd Party Webhook Endpoint Example
// Run this to create a test endpoint that receives webhooks from our system
// Usage: node test-3rd-party-endpoint.js

const http = require('http');
const crypto = require('crypto');

// Configuration
const PORT = 3000;
const WEBHOOK_SECRET = process.env.CRYPTO_WEBHOOK_SECRET || 'crypto_whsec_test_secret_change_me';

// Verify webhook signature
function verifySignature(body, signature, secret) {
  if (!signature || !secret) {
    return false;
  }
  
  const payloadString = typeof body === 'string' ? body : JSON.stringify(body);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const expectedSignature = hmac.digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (e) {
    return false;
  }
}

// Create server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-crypto-signature, x-webhook-signature');

  // Handle OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only handle POST requests to /webhook/crypto-payout
  if (req.method === 'POST' && req.url === '/webhook/crypto-payout') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const signature = req.headers['x-crypto-signature'] || req.headers['x-webhook-signature'];
        
        console.log('\n📥 Webhook Received:');
        console.log('='.repeat(60));
        console.log('   URL:', req.url);
        console.log('   Method:', req.method);
        console.log('   Signature Header:', signature ? 'Present' : 'Missing');
        console.log('   Payload:', JSON.stringify(payload, null, 2));
        
        // Verify signature
        if (signature) {
          const isValid = verifySignature(payload, signature, WEBHOOK_SECRET);
          console.log('   Signature Valid:', isValid ? '✅ YES' : '❌ NO');
          
          if (!isValid) {
            console.log('   ⚠️  WARNING: Signature verification failed!');
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Invalid webhook signature'
            }));
            return;
          }
        } else {
          console.log('   ⚠️  WARNING: No signature header found!');
        }
        
        // Process webhook (in real implementation, update your database here)
        console.log('\n✅ Processing webhook:');
        console.log(`   Event: ${payload.event}`);
        console.log(`   Payout ID: ${payload.payout_id}`);
        console.log(`   Status: ${payload.status}`);
        console.log(`   Amount: ${payload.amount}`);
        console.log(`   Network: ${payload.network}`);
        console.log(`   Currency: ${payload.currency}`);
        console.log(`   Transaction Hash: ${payload.transaction_hash}`);
        
        // Return success response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Webhook received and processed successfully',
          received_at: new Date().toISOString(),
          event: payload.event,
          payout_id: payload.payout_id
        }));
        
        console.log('\n✅ Response sent: 200 OK');
        console.log('='.repeat(60));
        
      } catch (error) {
        console.error('\n❌ Error processing webhook:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid payload format',
          message: error.message
        }));
      }
    });
    
  } else {
    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Endpoint not found',
      message: `Route ${req.method} ${req.url} not found. Expected: POST /webhook/crypto-payout`
    }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log('🚀 3rd Party Webhook Endpoint Server Started');
  console.log('='.repeat(60));
  console.log(`📍 Listening on: http://localhost:${PORT}`);
  console.log(`📡 Endpoint: POST http://localhost:${PORT}/webhook/crypto-payout`);
  console.log(`🔑 Secret: ${WEBHOOK_SECRET.substring(0, 20)}...`);
  console.log('');
  console.log('✅ Ready to receive webhooks from your system!');
  console.log('');
  console.log('💡 To test:');
  console.log('   1. Keep this server running');
  console.log('   2. In another terminal, run: node test-crypto-webhook.js');
  console.log('   3. Watch for webhook requests here');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('='.repeat(60));
});

// Handle errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use`);
    console.error('   Another server may be running on this port');
    console.error('   Try:');
    console.error(`   1. Stop the other server on port ${PORT}`);
    console.error(`   2. Or change PORT in this file to a different port`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

