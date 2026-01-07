# 🚨 IMMEDIATE FIX - Zaakpay Encrypted Name Error

## The Problem

You're still getting encrypted names in Zaakpay's response:
```json
{
  "firstName": "MVBp3kq04dN3OzZB1iaC7A==",  // ❌ Encrypted
  "lastName": "nmnz5hVwH3JYaPD3gkp+UA==",    // ❌ Encrypted
  "responseCode": "109"
}
```

## Root Cause

**The secret key in your environment variables doesn't match what's in the code!**

- **Your actual test secret key**: `0678056d96914a8583fb518caf42828a`
- **Old key that might be in env**: `4efb7796be644b25be2decf19ebf197e` (wrong!)

When the secret key is wrong:
1. ❌ Checksum calculation is wrong
2. ❌ Zaakpay rejects the request (Error 109)
3. ❌ Zaakpay encrypts names in error response (security feature)

## ✅ QUICK FIX (Run This Now)

### Option 1: Automated Fix (Recommended)

```bash
cd /home/pranjal/himora
./fix-zaakpay-env.sh
```

This script will:
- ✅ Check both `.env` files
- ✅ Add/update correct secret keys
- ✅ Add all required environment variables
- ✅ Verify the setup

### Option 2: Manual Fix

**Update `krishi-shaktisewa/.env`:**
```bash
cd /home/pranjal/himora/krishi-shaktisewa
cat >> .env << 'EOF'

# Zaakpay - CORRECT credentials
ZACKPAY_MODE=test
ZACKPAY_MERCHANT_ID_TEST=d22b6680ce804b1a81cdccb69a1285f1
ZACKPAY_SECRET_KEY_TEST=0678056d96914a8583fb518caf42828a
ZACKPAY_MERCHANT_ID=a55fa97d585646228a70d0e6ae5db840
ZACKPAY_SECRET_KEY=8213da8027db44aa937e203ce2745cfe
ZACKPAY_CALLBACK_URL_TEST=https://www.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL_PRODUCTION=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_SERVER_URL=https://api.shaktisewafoudation.in
EOF
```

**Update `server/.env`:**
```bash
cd /home/pranjal/himora/server
cat >> .env << 'EOF'

# Zaakpay - CORRECT credentials
ZACKPAY_MODE=test
ZACKPAY_MERCHANT_ID_TEST=d22b6680ce804b1a81cdccb69a1285f1
ZACKPAY_SECRET_KEY_TEST=0678056d96914a8583fb518caf42828a
ZACKPAY_MERCHANT_ID=a55fa97d585646228a70d0e6ae5db840
ZACKPAY_SECRET_KEY=8213da8027db44aa937e203ce2745cfe
KRISHI_API_URL=https://www.shaktisewafoudation.in
FRONTEND_URL=https://www.shaktisewafoudation.in
BACKEND_URL=https://api.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
EOF
```

## 🔄 RESTART SERVICES (CRITICAL!)

After updating environment variables, you MUST restart:

### 1. Restart Backend Server
```bash
cd /home/pranjal/himora/server
pm2 restart all
# OR if using different process manager:
# systemctl restart your-service
# OR just restart your Node.js process
```

### 2. Rebuild & Redeploy Next.js App
```bash
cd /home/pranjal/himora/krishi-shaktisewa

# If using Vercel:
vercel env pull .env.local  # Pull latest env vars
npm run build

# If using PM2 or similar:
pm2 restart krishi-shaktisewa

# If using Docker:
docker-compose restart krishi-shaktisewa
```

**IMPORTANT**: Environment variables are loaded at startup. If you don't restart, the old values will still be used!

## 🧪 TEST WITH NEW TRANSACTION

**CRITICAL**: Don't reuse old transaction IDs! Create a NEW payment link:

```bash
# Create new payment link via your API
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

Then test the new payment link.

## ✅ Verification

After restarting, check the logs. You should see:

```
🔧 Zaakpay Configuration:
   mode: 'test',
   secretKeySet: true,
   secretKeyPreview: '0678056d96...'
✅ Secret key verified for TEST mode
```

If you see:
- ❌ `secretKeySet: false` → Environment variable not loaded
- ❌ `Secret key mismatch` → Wrong secret key in env
- ❌ `CRITICAL ERROR: ZACKPAY_SECRET_KEY is not set!` → Env var missing

## 📊 Expected Result

After fixing:
- ✅ Correct secret key is used
- ✅ Checksum is calculated correctly
- ✅ Zaakpay accepts the request
- ✅ Transaction proceeds (no error 109)
- ✅ No encrypted names in response

## 🆘 If Still Not Working

1. **Check logs** for secret key verification messages
2. **Verify env vars are loaded**: Check if `process.env.ZACKPAY_SECRET_KEY_TEST` exists
3. **Check deployment**: If using Vercel/Netlify, ensure env vars are set in their dashboard
4. **Contact Zaakpay**: If checksum is correct but still getting error 109, contact Zaakpay support

## 📞 Support

If issue persists after following all steps:
- Check logs for secret key verification
- Verify environment variables are actually loaded (check logs)
- Ensure services are restarted
- Create a NEW transaction (don't reuse old ones)

---

**Status**: Ready to fix
**Priority**: URGENT - Secret key mismatch is the root cause

