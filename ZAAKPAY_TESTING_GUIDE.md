# Zaakpay Testing Guide - Verify Plain Text Names

## Quick Test Steps

### Step 1: Open the Payment Page
Navigate to: https://shaktisewafoudation.in/zaakpay-checkout?transaction_id=TXN_ZP_1767778089106_j9e5ak

### Step 2: Open Browser DevTools
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: Press `F12`
- **Safari**: Enable Developer menu first, then press `Cmd+Option+I`

### Step 3: Check Console Logs
Look for these logs in the Console tab:

```
📤 Sending to Zaakpay:
   Data length: XXX
   Checksum: ...
   First name in data: Pranjal
   Last name in data: Birla
```

**Expected Result**: firstName and lastName should show "Pranjal" and "Birla" (plain text)
**If you see base64 strings**: The issue is in our code (unlikely now)

### Step 4: Check Network Request
1. Go to the **Network** tab in DevTools
2. Wait for the form to submit (you'll see it redirect)
3. Look for a POST request to `zaakstaging.zaakpay.com/transactU`
4. Click on that request
5. Go to the **Payload** or **Request** tab
6. Find the `data` field
7. Copy the entire `data` value

### Step 5: Decode and Verify
The `data` field contains a JSON string. You can verify it:

1. Copy the data value
2. It should look like:
   ```json
   {
     "merchantIdentifier": "...",
     "orderDetail": {
       "firstName": "Pranjal",
       "lastName": "Birla",
       ...
     }
   }
   ```

3. **If firstName/lastName are plain text**: The issue is on Zaakpay's side
4. **If they're encrypted**: Contact me immediately

## What to Look For

### ✅ Good Signs (Names are plain text):
- Console shows: `First name in data: Pranjal`
- Network request shows: `"firstName":"Pranjal"`
- No base64-looking strings like `MVBp3kq04dN3OzZB1iaC7A==`

### ❌ Bad Signs (Names are encrypted):
- Console shows: `First name in data: MVBp3kq04dN3OzZB1iaC7A==`
- Network request shows: `"firstName":"MVBp3kq04dN3OzZB1iaC7A=="`

## If Names Are Plain Text (Expected)

This confirms the issue is on **Zaakpay's side**. They are:
1. Receiving plain text names from us
2. Either encrypting them automatically (security feature)
3. Or returning encrypted versions in error responses

### Next Steps:
1. **Contact Zaakpay Support** with these details:
   - Transaction ID: `TXN_ZP_1767778089106_j9e5ak`
   - Order ID: `ORDER_ZP_17677780891`
   - Error: "Receiving error 109 with encrypted names in response, despite sending plain text"
   - Question: "Is there a merchant setting that auto-encrypts customer names? How do we disable it?"

2. **Check Zaakpay Dashboard**:
   - Login: https://zaakpay.com
   - Go to: Settings → Merchant Settings → Data Protection/Security
   - Look for: Any encryption or PII masking settings
   - Take screenshots of relevant settings

3. **Ask Zaakpay**:
   - "Why is error code 109 occurring?"
   - "Are firstName/lastName being auto-encrypted by your system?"
   - "What validation is failing that causes error 109?"
   - "Do we need to configure something in the dashboard?"

## Alternative Test: Create New Transaction

If you want to test with a different transaction:

1. Create a new payment link using your API
2. Use a simple name like:
   - firstName: "Test"
   - lastName: "User"
3. Follow the same testing steps above
4. See if the same encryption occurs

## Expected vs Actual

### What We're Sending (Verified in Logs):
```json
{
  "firstName": "Pranjal",  // Plain text ✅
  "lastName": "Birla"       // Plain text ✅
}
```

### What Zaakpay Returns:
```json
{
  "firstName": "MVBp3kq04dN3OzZB1iaC7A==",  // Encrypted ❌
  "lastName": "nmnz5hVwH3JYaPD3gkp+UA==",    // Encrypted ❌
  "responseCode": "109"
}
```

This proves:
- ✅ We're sending plain text
- ❌ Zaakpay is returning encrypted data
- ❓ Either they encrypt automatically, or error 109 is unrelated to encryption

## Support Contact Information

**Zaakpay Support**:
- Dashboard: https://zaakpay.com
- Support: Check dashboard for support email/phone
- Developer Docs: https://developer.zaakpay.com/docs

**Information to Provide**:
- Merchant ID: (from dashboard)
- Transaction ID: `TXN_ZP_1767778089106_j9e5ak`
- Order ID: `ORDER_ZP_17677780891`
- Error Code: 109
- Environment: Staging (`zaakstaging.zaakpay.com`)
- Issue: Names sent as plain text but returned encrypted
- Screenshots: From browser DevTools showing plain text being sent

---

**Status**: Waiting for browser DevTools verification and Zaakpay support response

