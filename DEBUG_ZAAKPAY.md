# Debug Zaakpay Encrypted Name Issue

## Current Status
Still getting encrypted names despite:
- ✅ Environment variables set correctly
- ✅ Secret key verified in build logs
- ✅ Services restarted

## Debug Steps

### Step 1: Check if Secret Key is Loaded at Runtime

**On your EC2 server, run:**
```bash
# Test the configuration endpoint
curl https://www.shaktisewafoudation.in/api/zaakpay/test-config
```

This will show:
- Is secret key loaded?
- Is it the correct key?
- Can checksum be calculated?

### Step 2: Check Actual Logs During Payment

**On EC2 server:**
```bash
# Watch logs in real-time
pm2 logs v0-ecomm --lines 100 | grep -i "zaakpay\|secret\|checksum\|firstName"
```

Look for:
- `✅ Secret key verified for TEST mode`
- `🔐 Checksum calculation:`
- `firstName in dataString:`

### Step 3: Check Browser Console

When you open the payment link:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs like:
   - `📤 Sending to Zaakpay:`
   - `✅ Verified - firstName:`
   - `✅ Verified - lastName:`

### Step 4: Check Network Request

1. Open browser DevTools (F12)
2. Go to Network tab
3. Find POST request to `zaakstaging.zaakpay.com/transactU`
4. Click on it → Payload tab
5. Check the `data` field - is firstName/lastName plain text?

## Possible Issues

### Issue 1: Next.js Caching
Next.js might be caching the old build. Try:
```bash
cd ~/shaktisewa-krishi
rm -rf .next
npm run build
pm2 restart v0-ecomm
```

### Issue 2: Environment Variables Not Loaded
If test-config shows secret key as "NOT SET", the env vars aren't loading. Check:
- Is `.env` file in the right location?
- Is it being read by Next.js?
- For Vercel: Are env vars set in Vercel dashboard?

### Issue 3: Zaakpay Auto-Encryption
If everything is correct but Zaakpay still encrypts, it might be:
- A merchant account setting
- Zaakpay's security feature
- Need to contact Zaakpay support

## Next Actions

1. **Run the test-config endpoint** to verify secret key is loaded
2. **Check logs** during a payment attempt
3. **Check browser console** to see what's being sent
4. **If secret key is wrong**: Fix environment variables and restart
5. **If secret key is correct but still encrypted**: Contact Zaakpay support

## Contact Zaakpay Support

If secret key is correct and checksum is calculated properly, but Zaakpay still encrypts names:

**Email Zaakpay:**
```
Subject: Error 109 - Names Encrypted Despite Correct Checksum

Merchant ID: d22b6680ce804b1a81cdccb69a1285f1
Environment: Staging
Issue: Receiving encrypted firstName/lastName in error response (109) 
       despite sending plain text and correct checksum.

Test endpoint shows:
- Secret key: CORRECT (0678056d96914a8583fb518caf42828a)
- Checksum: Calculated correctly
- Names sent: Plain text ("Test", "User")

But Zaakpay returns encrypted names in error response.

Question: Is there a merchant setting that auto-encrypts customer names?
How do we resolve error 109?
```

---

**Last Updated**: After environment fix and service restart
**Status**: Debugging in progress

