# PayU URL Configuration - Important Clarification

## ❌ You DON'T Need to Set URLs in PayU Dashboard

**These URLs are NOT configured in the PayU dashboard.** They are sent dynamically with each payment request.

## ✅ How PayU URLs Work

PayU uses three URL parameters that are sent with **each payment request**:

1. **`surl` (Success URL)** - Where PayU redirects the user after successful payment
2. **`furl` (Failure URL)** - Where PayU redirects the user after failed payment  
3. **`curl` (Callback URL)** - Where PayU sends server-to-server webhook/callback

These are sent as form parameters when you submit the payment form to PayU.

## 🔧 Current Implementation

Our code automatically sets these URLs for every payment:

- **Success URL (surl)**: `https://www.shaktisewafoudation.in/payment/success?txnid=ORDER_ID`
- **Failure URL (furl)**: `https://www.shaktisewafoudation.in/payment/failed?txnid=ORDER_ID`
- **Callback URL (curl)**: `https://www.shaktisewafoudation.in/api/payu/callback`

## 📍 Where URLs Are Set in Code

1. **Next.js Checkout Route**: `krishi-shaktisewa/app/api/payu/checkout/route.ts`
   - Lines 179-201: Sets `surl`, `furl`, and `curl` parameters

2. **Backend Controller**: `server/controllers/payuController.js`
   - Multiple functions set these URLs when creating payment links
   - All use the same URL structure

## ⚠️ Optional: PayU Dashboard Settings

Some PayU accounts may have optional settings for:
- **IP Whitelisting** - If enabled, ensure your server IPs are whitelisted
- **Webhook Settings** - Some accounts allow configuring webhook endpoints (optional)

But the **surl, furl, and curl parameters are always sent with each payment request** and don't need dashboard configuration.

## ✅ What You Need to Do

**Nothing!** The URLs are automatically configured in the code. Just ensure:

1. Your domain `www.shaktisewafoudation.in` is accessible
2. The routes `/payment/success`, `/payment/failed`, and `/api/payu/callback` are working
3. Your PayU credentials (key, salt) are correct

## 🧪 Testing

To verify URLs are being sent correctly, check the logs when creating a payment:

```
🔧 PayU URLs:
   Callback URL (curl - webhook): https://www.shaktisewafoudation.in/api/payu/callback
   Success URL (surl - user redirect): https://www.shaktisewafoudation.in/payment/success?txnid=ORDER_123
   Failure URL (furl - user redirect): https://www.shaktisewafoudation.in/payment/failed?txnid=ORDER_123
```

These URLs are automatically included in the payment form that gets submitted to PayU.

