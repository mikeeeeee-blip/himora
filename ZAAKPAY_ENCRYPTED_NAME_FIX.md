# Zaakpay Encrypted Name Error Fix - Step by Step Guide

## Problem
Zaakpay is receiving encrypted `firstName` and `lastName` fields even though we're sending plain text, resulting in validation error 109.

## Root Causes Identified

1. **HTML Escaping Issue**: The JSON data was being HTML-escaped incorrectly when embedded in the form, potentially corrupting the data
2. **Localhost returnUrl**: Zaakpay cannot reach localhost URLs, which may cause them to reject or encrypt the data
3. **Form Submission Method**: Using HTML attribute values for JSON can cause encoding issues

## Fixes Applied

### 1. Fixed HTML Form Submission (✅ Done)
- **Changed from**: HTML attribute value with escaped quotes
- **Changed to**: JavaScript-set form values to avoid HTML escaping issues
- **File**: `krishi-shaktisewa/app/api/zaakpay/checkout/route.ts`
- **Impact**: Ensures JSON is sent exactly as generated without corruption

### 2. Fixed returnUrl Validation (✅ Done)
- **Added**: Automatic detection and fallback for localhost URLs
- **Added**: Error messages with clear instructions
- **File**: `krishi-shaktisewa/app/api/zaakpay/checkout/route.ts`
- **Impact**: Prevents Zaakpay from rejecting transactions due to unreachable returnUrl

### 3. Enhanced Logging (✅ Done)
- **Added**: Comprehensive logging to track data at every step
- **Added**: Verification of dataString before sending
- **Impact**: Better debugging to identify where encryption might occur

## Steps to Fix in Your Environment

### Step 1: Set Correct Environment Variables

**For Test/Staging Mode:**
```bash
# Set a public URL for test mode (NOT localhost)
ZACKPAY_CALLBACK_URL_TEST=https://your-ngrok-url.ngrok.io
# OR use production URL even in test mode
ZACKPAY_CALLBACK_URL_TEST=https://www.shaktisewafoudation.in
```

**For Production Mode:**
```bash
# Must match the Website URL in Zaakpay dashboard
ZACKPAY_CALLBACK_URL_PRODUCTION=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
```

### Step 2: Register URLs in Zaakpay Dashboard

1. Log into Zaakpay Dashboard: https://zaakpay.com
2. Go to **Developers** → **Integration URLs**
3. Ensure these URLs are registered:
   - **Website URL**: `https://www.shaktisewafoudation.in`
   - **Redirect URL**: `https://www.shaktisewafoudation.in/api/zaakpay/callback`
   - **Realtime Webhook URL**: `https://www.shaktisewafoudation.in/api/zaakpay/webhook`
   - **Non-Realtime Webhook URL**: `https://www.shaktisewafoudation.in/api/zaakpay/webhook`

### Step 3: Verify Zaakpay Configuration

1. Check **Merchant Settings** in Zaakpay dashboard
2. Verify **Encryption Settings**:
   - If there's an option to disable encryption for customer names, disable it
   - Or ensure encryption is only for sensitive fields, not names

### Step 4: Test the Fix

1. **Create a new payment link** (don't reuse old transactions with encrypted names in DB)
2. **Check server logs** for:
   ```
   ✅ [CHECKOUT] Final extracted names:
      firstName: Pranjal (length: 7, isBase64: false)
      lastName: Birla (length: 5, isBase64: false)
   ```
3. **Check browser console** (when form submits) for:
   ```
   📤 Sending to Zaakpay:
      First name in data: Pranjal
      Last name in data: Birla
   ```
4. **Verify returnUrl** in logs is NOT localhost:
   ```
   🔗 Return URL configured:
      url: 'https://www.shaktisewafoudation.in/api/zaakpay/callback?...'
   ```

### Step 5: If Issue Persists

#### Option A: Check Zaakpay Dashboard Settings
- Contact Zaakpay support to verify if there's a merchant-level encryption setting
- Ask if error 109 can occur due to returnUrl issues

#### Option B: Use Direct API Call (Alternative)
If form submission still has issues, we can switch to making a direct server-to-server API call instead of form submission. This would require:
- Moving the API call back to the server
- Handling the redirect response from Zaakpay

#### Option C: Verify Data at Network Level
1. Use browser DevTools → Network tab
2. Find the POST request to `zaakstaging.zaakpay.com/transactU`
3. Check the **Request Payload** to see exactly what's being sent
4. Verify the `data` field contains plain text names

## Code Changes Summary

### Key Changes Made:
1. **Form Submission Method**: Changed from HTML-escaped attributes to JavaScript-set values
2. **returnUrl Handling**: Added validation and fallback for localhost URLs
3. **Logging**: Added comprehensive logging at every step
4. **Data Validation**: Added verification of dataString before sending

### Files Modified:
- `krishi-shaktisewa/app/api/zaakpay/checkout/route.ts`
  - Fixed HTML form generation
  - Added returnUrl validation
  - Enhanced logging

## Expected Behavior After Fix

1. ✅ Names are extracted as plain text from database
2. ✅ Names are validated as plain text before JSON stringify
3. ✅ JSON string is verified to contain plain text names
4. ✅ Form values are set via JavaScript (no HTML escaping)
5. ✅ returnUrl is a public URL (not localhost)
6. ✅ Zaakpay receives plain text names
7. ✅ Transaction processes successfully

## Troubleshooting

### If you still see encrypted names in Zaakpay response:

1. **Check the browser console** when the form submits - verify the data being sent
2. **Check server logs** - verify names are plain text at every step
3. **Verify environment variables** - ensure returnUrl is not localhost
4. **Check Zaakpay dashboard** - verify URLs are registered correctly
5. **Contact Zaakpay support** - ask if there's merchant-level encryption enabled

### Common Issues:

- **Issue**: returnUrl is still localhost
  - **Fix**: Set `ZACKPAY_CALLBACK_URL_TEST` or `ZACKPAY_CALLBACK_URL_PRODUCTION` environment variable

- **Issue**: Names are encrypted in database
  - **Fix**: The code now auto-decodes encrypted names when reading from DB, but create a NEW payment link to ensure clean data

- **Issue**: Zaakpay still returns error 109
  - **Fix**: Verify returnUrl is registered in Zaakpay dashboard and is publicly accessible

## Next Steps

1. ✅ Code changes have been pushed to git
2. ⏳ Deploy the updated code to your environment
3. ⏳ Set correct environment variables
4. ⏳ Register URLs in Zaakpay dashboard
5. ⏳ Test with a new payment link
6. ⏳ Monitor logs to verify plain text names are being sent

## Support

If the issue persists after following all steps:
1. Check Zaakpay documentation: https://developer.zaakpay.com/docs
2. Contact Zaakpay support with:
   - Transaction ID
   - Error response from Zaakpay
   - Server logs showing plain text names being sent
   - Network request showing the exact payload sent

---

**Last Updated**: January 7, 2026
**Status**: Code fixes applied, awaiting environment configuration and testing

