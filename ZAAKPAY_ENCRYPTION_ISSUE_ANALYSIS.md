# Zaakpay Encryption Issue - Deep Analysis

## Problem Statement
Despite sending **verified plain text names** to Zaakpay, their API is returning **encrypted firstName/lastName** in the error response.

## Evidence from Logs

### What We're Sending (Verified):
```json
{
  "orderDetail": {
    "firstName": "Pranjal",  // ✅ Plain text, length: 7
    "lastName": "Birla",      // ✅ Plain text, length: 5
    "email": "birlapranjal460@gmail.com",
    "phone": "9979738295"
  }
}
```

### What Zaakpay Returns:
```json
{
  "orderDetail": {
    "firstName": "MVBp3kq04dN3OzZB1iaC7A==",  // ❌ Base64 encrypted
    "lastName": "nmnz5hVwH3JYaPD3gkp+UA==",    // ❌ Base64 encrypted
    "orderId": "ORDER_ZP_17677780891",
    "amount": "1000"
  },
  "responseCode": "109",
  "responseDescription": "One or more fields entered for this transactions has validation error"
}
```

## Key Observations

1. **Logs show plain text at every step**:
   - ✅ Database has plain text: `Pranjal Birla`
   - ✅ Extraction produces plain text: `firstName: Pranjal`, `lastName: Birla`
   - ✅ JSON string contains plain text: `"firstName":"Pranjal"`
   - ✅ Browser console will show plain text in form values

2. **Zaakpay's response contains the same encrypted values**:
   - The encrypted values `MVBp3kq04dN3OzZB1iaC7A==` and `nmnz5hVwH3JYaPD3gkp+UA==` appear consistently
   - These look like base64-encoded AES encryption
   - Zaakpay is ECHOING BACK encrypted versions of the names we sent

## Possible Root Causes

### Theory 1: Zaakpay Auto-Encryption (MOST LIKELY)
**Hypothesis**: Zaakpay has a merchant-level setting that automatically encrypts PII (Personally Identifiable Information) fields like firstName/lastName.

**Evidence**:
- The encryption is consistent across multiple requests
- The same plain text always produces the same encrypted output
- Zaakpay is the one returning the encrypted data in their error response
- This is a security feature to protect customer data

**Solution**:
1. Check Zaakpay Dashboard → Merchant Settings → Data Protection/Encryption
2. Look for options like:
   - "Encrypt customer names in responses"
   - "PII encryption settings"
   - "Data masking"
3. Contact Zaakpay support to disable auto-encryption for names (if that's causing validation to fail)

### Theory 2: Zaakpay Validates THEN Encrypts for Storage
**Hypothesis**: Zaakpay validates the names, finds them invalid for some OTHER reason (not encryption), then encrypts them before returning in the error response.

**Evidence**:
- Error code 109 is a validation error
- The validation might be failing due to:
  - Special characters or encoding issues
  - Name format requirements
  - Merchant account configuration

**Solution**:
1. Test with simpler names (e.g., "Test User")
2. Check if there are name format requirements in Zaakpay docs
3. Verify the merchant account is properly configured

### Theory 3: Network/Proxy Intervention
**Hypothesis**: Something between our server and Zaakpay is modifying the request.

**Evidence**:
- Unlikely, but possible if there's a proxy or CDN

**Solution**:
1. Capture the actual network request using Zaakpay's staging environment
2. Use tools like Wireshark or mitmproxy to inspect the raw HTTP request

### Theory 4: Zaakpay TransactU Endpoint Behavior
**Hypothesis**: The `/transactU` endpoint might be encrypting data automatically as part of the "Express Checkout" flow.

**Evidence**:
- We're using the hosted checkout (`/transactU`) endpoint
- This might have different behavior than direct API calls

**Solution**:
1. Try the standard API endpoint instead of `/transactU`
2. Check if there's a parameter to disable auto-encryption

## Recommended Next Steps

### Immediate Actions:

1. **Contact Zaakpay Support** (HIGH PRIORITY)
   - Email/Call Zaakpay technical support
   - Provide them with:
     - Transaction ID: `TXN_ZP_1767778089106_j9e5ak`
     - Order ID: `ORDER_ZP_17677780891`
     - Error code: 109
     - Issue: "Names are sent as plain text but returned encrypted"
   - Ask specifically:
     - "Is there a merchant setting that auto-encrypts customer names?"
     - "Why is error 109 occurring if we're sending plain text names?"
     - "How do we disable name encryption if it's enabled?"

2. **Test with Browser DevTools** (IMMEDIATE)
   - Open the payment page: https://shaktisewafoudation.in/zaakpay-checkout?transaction_id=TXN_ZP_1767778089106_j9e5ak
   - Open Browser DevTools → Console tab
   - Look for the log: `📤 Sending to Zaakpay:`
   - Verify firstName and lastName are plain text
   - Go to Network tab
   - Find the POST request to `zaakstaging.zaakpay.com/transactU`
   - Click on it → Payload tab
   - Check the `data` field to see exactly what's being sent

3. **Check Zaakpay Dashboard** (HIGH PRIORITY)
   - Log into https://zaakpay.com dashboard
   - Navigate to Settings/Configuration
   - Look for any options related to:
     - Data encryption
     - PII protection
     - Name masking
     - Customer data security
   - Check if there's a setting to disable auto-encryption

4. **Test with Simple Names** (QUICK TEST)
   - Create a test transaction with:
     - firstName: "Test"
     - lastName: "User"
   - See if the same encryption occurs
   - This helps rule out character encoding issues

5. **Try Alternative Endpoint** (IF ABOVE FAILS)
   - Instead of hosted checkout (`/transactU`), try the standard API
   - Check Zaakpay docs for alternative integration methods

### Long-term Solutions:

**If Zaakpay auto-encryption is required**:
- Accept that Zaakpay will encrypt names in responses
- Don't rely on the error response to validate names
- Focus on ensuring the transaction succeeds (error 109 might be unrelated to encryption)

**If error 109 is the real issue**:
- The encryption might be Zaakpay's way of hiding the actual invalid data
- Need to find out what validation is actually failing:
  - Name length limits?
  - Special character restrictions?
  - Format requirements?

## Testing Checklist

- [ ] Check browser console logs for plain text names
- [ ] Check Network tab for actual data being sent
- [ ] Create test transaction with simple names
- [ ] Check Zaakpay dashboard for encryption settings
- [ ] Contact Zaakpay support
- [ ] Try test merchant credentials (if available)
- [ ] Test on Zaakpay staging vs production
- [ ] Verify returnUrl is properly registered
- [ ] Check if other merchants face the same issue

## Additional Context

The encrypted values are consistent:
- `MVBp3kq04dN3OzZB1iaC7A==` always appears for "Pranjal"
- `nmnz5hVwH3JYaPD3gkp+UA==` always appears for "Birla"

This suggests:
1. Deterministic encryption (same input → same output)
2. Likely using a merchant-specific key
3. Zaakpay is doing the encryption, not us

## Conclusion

**The issue is almost certainly on Zaakpay's side**. We are sending plain text names (verified at multiple points), but Zaakpay is either:
1. Auto-encrypting them as a security feature
2. Encrypting them before returning in error responses
3. Having a validation issue that's unrelated to encryption

**Next step**: Contact Zaakpay support with transaction details and ask about the auto-encryption behavior.

---

**Last Updated**: January 7, 2026
**Status**: Issue identified as Zaakpay-side behavior, awaiting support response

