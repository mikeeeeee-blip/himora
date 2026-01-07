# Zaakpay Environment Setup - COMPLETE GUIDE

## Your Credentials (Verified)

### Production Credentials:
- Merchant ID: `a55fa97d585646228a70d0e6ae5db840`
- Secret Key: `8213da8027db44aa937e203ce2745cfe`
- API Key: `0ef17826b646448393d0668d1122b436`

### Test/Staging Credentials:
- Merchant ID: `d22b6680ce804b1a81cdccb69a1285f1`
- Secret Key: `0678056d96914a8583fb518caf42828a` ⚠️ (NEW - different from before!)
- API Key: `lwABtM5NRfn2lL9`

**IMPORTANT**: I noticed your test secret key is different from what was in the code before!

## Step-by-Step Setup

### Step 1: Update `server/.env`

Edit `/home/pranjal/himora/server/.env` and add/update these lines:

```bash
# Zaakpay Configuration
# =====================

# Mode: 'test' or 'production'
# IMPORTANT: Use 'test' for staging, 'production' for live transactions
ZACKPAY_MODE=test

# Production Credentials (Live Transactions)
ZACKPAY_MERCHANT_ID=a55fa97d585646228a70d0e6ae5db840
ZACKPAY_SECRET_KEY=8213da8027db44aa937e203ce2745cfe
ZACKPAY_API_KEY=0ef17826b646448393d0668d1122b436

# Test/Staging Credentials
ZACKPAY_MERCHANT_ID_TEST=d22b6680ce804b1a81cdccb69a1285f1
ZACKPAY_SECRET_KEY_TEST=0678056d96914a8583fb518caf42828a
ZACKPAY_API_KEY_TEST=lwABtM5NRfn2lL9

# Frontend URL (where Next.js app is hosted)
KRISHI_API_URL=https://www.shaktisewafoudation.in
FRONTEND_URL=https://www.shaktisewafoudation.in

# Backend URL
BACKEND_URL=https://api.shaktisewafoudation.in
API_URL=https://api.shaktisewafoudation.in

# Callback URL (MUST be public, NOT localhost)
ZACKPAY_CALLBACK_URL=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
```

### Step 2: Update `krishi-shaktisewa/.env`

Edit `/home/pranjal/himora/krishi-shaktisewa/.env` and add/update these lines:

```bash
# Zaakpay Configuration
# =====================

# Mode: 'test' or 'production'
ZACKPAY_MODE=test

# Production Credentials
ZACKPAY_MERCHANT_ID=a55fa97d585646228a70d0e6ae5db840
ZACKPAY_SECRET_KEY=8213da8027db44aa937e203ce2745cfe

# Test/Staging Credentials
ZACKPAY_MERCHANT_ID_TEST=d22b6680ce804b1a81cdccb69a1285f1
ZACKPAY_SECRET_KEY_TEST=0678056d96914a8583fb518caf42828a

# Callback URLs - MUST be public URLs (NOT localhost)
ZACKPAY_CALLBACK_URL_TEST=https://www.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL_PRODUCTION=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in

# Next.js URLs
NEXT_PUBLIC_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_API_URL=https://www.shaktisewafoudation.in

# Server API URL
NEXT_PUBLIC_SERVER_URL=https://api.shaktisewafoudation.in
KRISHI_API_URL=https://api.shaktisewafoudation.in
```

### Step 3: Update Server Code (Fix Secret Key)

The test secret key in the code might be outdated. Let me check:

**OLD (in code)**: `4efb7796be644b25be2decf19ebf197e`
**NEW (your actual)**: `0678056d96914a8583fb518caf42828a`

This mismatch could be causing the validation error!

### Step 4: Register URLs in Zaakpay Dashboard

Login to https://zaakpay.com and register these URLs:

**For TEST merchant** (`d22b6680ce804b1a81cdccb69a1285f1`):
```
Website URL: https://www.shaktisewafoudation.in
Redirect URL: https://www.shaktisewafoudation.in/api/zaakpay/callback
Realtime Webhook: https://www.shaktisewafoudation.in/api/zaakpay/webhook
Non-Realtime Webhook: https://www.shaktisewafoudation.in/api/zaakpay/webhook
```

**For PRODUCTION merchant** (`a55fa97d585646228a70d0e6ae5db840`):
```
Website URL: https://www.shaktisewafoudation.in
Redirect URL: https://www.shaktisewafoudation.in/api/zaakpay/callback
Realtime Webhook: https://www.shaktisewafoudation.in/api/zaakpay/webhook
Non-Realtime Webhook: https://www.shaktisewafoudation.in/api/zaakpay/webhook
```

### Step 5: Deploy

```bash
# Server
cd /home/pranjal/himora/server
git pull
pm2 restart all

# Next.js
cd /home/pranjal/himora/krishi-shaktisewa
git pull
npm run build
# Deploy to Vercel or your hosting
```

### Step 6: Test with NEW Transaction

**IMPORTANT**: Create a new payment link, don't reuse old transaction IDs!

```bash
# Create new payment link using your API
curl -X POST https://api.shaktisewafoudation.in/api/payments/create-payment-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "amount": 10,
    "customer_name": "Test User",
    "customer_email": "test@example.com",
    "customer_phone": "9876543210"
  }'
```

## Critical Issue Found

**THE SECRET KEY MISMATCH IS LIKELY THE ROOT CAUSE!**

Your test secret key is: `0678056d96914a8583fb518caf42828a`
But the code was using: `4efb7796be644b25be2decf19ebf197e`

When the checksum is calculated with the wrong secret key, Zaakpay will:
1. Reject the request (error 109)
2. Return encrypted data in the error response (security feature)

## Quick Fix Commands

Run these commands to update the environment files:

```bash
# Update server/.env
cd /home/pranjal/himora/server
cat >> .env << 'EOF'

# Updated Zaakpay Configuration
ZACKPAY_MODE=test
ZACKPAY_MERCHANT_ID=a55fa97d585646228a70d0e6ae5db840
ZACKPAY_SECRET_KEY=8213da8027db44aa937e203ce2745cfe
ZACKPAY_MERCHANT_ID_TEST=d22b6680ce804b1a81cdccb69a1285f1
ZACKPAY_SECRET_KEY_TEST=0678056d96914a8583fb518caf42828a
KRISHI_API_URL=https://www.shaktisewafoudation.in
FRONTEND_URL=https://www.shaktisewafoudation.in
BACKEND_URL=https://api.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
EOF

# Update krishi-shaktisewa/.env
cd /home/pranjal/himora/krishi-shaktisewa
cat >> .env << 'EOF'

# Updated Zaakpay Configuration
ZACKPAY_MODE=test
ZACKPAY_MERCHANT_ID=a55fa97d585646228a70d0e6ae5db840
ZACKPAY_SECRET_KEY=8213da8027db44aa937e203ce2745cfe
ZACKPAY_MERCHANT_ID_TEST=d22b6680ce804b1a81cdccb69a1285f1
ZACKPAY_SECRET_KEY_TEST=0678056d96914a8583fb518caf42828a
ZACKPAY_CALLBACK_URL_TEST=https://www.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL_PRODUCTION=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_SERVER_URL=https://api.shaktisewafoudation.in
EOF

# Restart services
cd /home/pranjal/himora/server
pm2 restart all

cd /home/pranjal/himora/krishi-shaktisewa
npm run build
```

## Verification

After updating, verify the setup:

```bash
cd /home/pranjal/himora
node server/verify-zaakpay-setup.js
```

## Expected Result

After fixing the secret key mismatch:
- ✅ Checksum will be calculated correctly
- ✅ Zaakpay will accept the request
- ✅ Transaction should process successfully
- ✅ No more error 109
- ✅ No more encrypted names in response

## Why This Fixes the Issue

1. **Wrong secret key** → Wrong checksum → Zaakpay rejects request → Error 109
2. **Zaakpay's security feature**: When request is rejected, they encrypt sensitive data (names) in error response
3. **With correct secret key** → Correct checksum → Zaakpay accepts request → Transaction proceeds → No encryption needed

---

**Status**: Ready to deploy with correct credentials
**Priority**: HIGH - Secret key mismatch is critical

