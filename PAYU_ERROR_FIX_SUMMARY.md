# PayU "Pardon, Some Problem Occurred" Error - Complete Fix

## Error Code
- Error: `782837_69609f6532912_69609f653301e`
- Status: "Pardon, Some Problem Occurred"
- Cause: Invalid PayU form parameters or hash verification failure

## Root Causes Identified

### 1. ❌ **service_provider Parameter**
- **Issue**: The `service_provider: 'payu_paisa'` parameter causes conflicts with UPI payments
- **Fix**: Removed from all PayU form submissions
- **Reference**: PayU documentation doesn't require this for form-based UPI payments

### 2. ❌ **environment Parameter in Form Submissions**
- **Issue**: `environment=1` parameter is only for API calls, NOT for form submissions
- **Fix**: Removed from all form submissions (test mode is handled by endpoint URL)
- **Reference**: https://docs.payu.in/docs/prebuilt-checkout-page-integration
- **Important**: Test mode is determined by endpoint URL:
  - Test: `https://test.payu.in/_payment`
  - Production: `https://secure.payu.in/_payment`

### 3. ❌ **bankcode Parameter Conflict**
- **Issue**: Setting both `pg: 'UPI'` and `bankcode: 'UPI'` causes parameter conflicts
- **Fix**: Removed `bankcode` when `pg` is set (PayU handles it internally)

### 4. ⚠️ **Parameter Format Issues**
- **Issue**: PayU is strict about parameter format (trimming, casing, special characters)
- **Fix**: 
  - Trim all parameter values
  - Lowercase email addresses (PayU requirement)
  - Sanitize `productinfo` and `firstname` to remove special characters
  - Limit text field lengths (productinfo: 100 chars, firstname: 50 chars)

### 5. ⚠️ **Hash Generation**
- **Issue**: Hash must be generated with exact trimmed values
- **Fix**: Use already-trimmed values from `payuParams` for hash generation
- **Format**: `sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt)`

## Files Modified

### Backend (`server/controllers/payuController.js`)
- ✅ `createPayuPaymentLink`: Removed `service_provider` and `environment`, added sanitization
- ✅ `createPayuFormBasedPayment`: Removed `service_provider` and `environment`
- ✅ `getPayuCheckoutPage`: Removed `service_provider` and `environment`, added sanitization
- ✅ `createMerchantHostedPayment`: Removed `service_provider` and `environment`, added sanitization
- ✅ `generatePayUHash`: Already correct, but added logging
- ✅ `generatePayUResponseHash`: Added for webhook verification (includes `status`)

### Frontend (`krishi-shaktisewa/app/api/payu/checkout/route.ts`)
- ✅ Removed `service_provider` parameter
- ✅ Removed `environment` parameter
- ✅ Added text sanitization for `productinfo` and `firstname`
- ✅ Lowercased email addresses
- ✅ Trimmed all parameter values including `txnid`
- ✅ Fixed HTML encoding (browser handles URL encoding)

## Correct PayU Form Parameters (UPI)

### Mandatory Parameters:
```javascript
{
  key: PAYU_KEY.trim(),
  txnid: orderId.trim(),           // Order ID (trimmed, max 75 chars)
  amount: amountFormatted.trim(),  // Amount with 2 decimal places (e.g., "23.00")
  productinfo: productInfo.trim(), // Product description (sanitized, max 100 chars)
  firstname: firstName.trim(),     // First name (sanitized, max 50 chars)
  email: email.trim().toLowerCase(), // Email (lowercased, PayU requirement)
  phone: phone.trim(),             // Phone number (10 digits)
  surl: successUrl.trim(),         // Success redirect URL
  furl: failureUrl.trim(),         // Failure redirect URL
  hash: hash                       // SHA512 hash of above parameters
}
```

### Optional Parameters (for UPI):
```javascript
{
  pg: 'UPI',                       // Payment gateway: UPI
  curl: callbackUrl.trim()         // Callback URL (only if publicly accessible)
  // NO service_provider
  // NO bankcode (PayU handles it when pg is set)
  // NO environment (only for API calls, not form submissions)
}
```

## Text Sanitization

All text fields are sanitized to remove problematic characters:
- Removed: `` ` " ' < > `` (backticks, quotes, angle brackets)
- Removed: Control characters (`\x00-\x1F\x7F`)
- Trimmed: Leading/trailing whitespace
- Limited: Max length (productinfo: 100, firstname: 50)

## Hash Generation

Hash is generated using these exact parameters (already trimmed):
1. `key` (from `PAYU_KEY`)
2. `txnid` (order ID, trimmed)
3. `amount` (formatted with 2 decimals, trimmed)
4. `productinfo` (sanitized and trimmed)
5. `firstname` (sanitized and trimmed)
6. `email` (lowercased and trimmed)
7-16. `udf1` through `udf10` (empty strings)
17. `salt` (from `PAYU_SALT`)

**Hash String Format**: `key|txnid|amount|productinfo|firstname|email|||||||||||salt`
**Algorithm**: SHA512
**Result**: 128-character hexadecimal string

## Test Mode Configuration

- **Endpoint URL**: `https://test.payu.in/_payment` (automatic when `PAYU_MODE === 'test'`)
- **Credentials**: Uses `PAYU_KEY_TEST` and `PAYU_SALT_TEST`
- **Environment Parameter**: NOT included in form submissions
- **Callback URL**: Uses ngrok URL if localhost detected (`https://lyndsay-supercivil-maurita.ngrok-free.dev/api/payu/callback`)

## Testing Checklist

After these fixes, test:

1. ✅ Create a new payment (don't reuse old transaction IDs)
2. ✅ Check server logs for:
   - `🔐 Generating hash with parameters:` - Hash generation details
   - `✅ Hash generated:` - Hash preview (128 characters)
   - `📋 PayU Form Parameters:` - All parameters (excluding hash/key)
   - No `service_provider` in parameters
   - No `environment` in parameters
   - No `bankcode` when `pg` is set
3. ✅ Verify form submission succeeds (no "Pardon, Some Problem Occurred" error)
4. ✅ Verify payment completes successfully in PayU test mode
5. ✅ Verify webhook is received and transaction is marked as paid

## References

- [PayU Prebuilt Checkout Page Integration](https://docs.payu.in/docs/prebuilt-checkout-page-integration)
- [PayU Webhooks Documentation](https://docs.payu.in/docs/webhooks)
- [PayU Test Mode Integration](https://docs.payu.in/docs/pythonsdk-test-integration)

## Important Notes

1. **Test Mode**: Use `https://test.payu.in/_payment` endpoint (already configured)
2. **Webhook URL**: Must be publicly accessible (use ngrok for localhost)
3. **Parameter Order**: Hash parameters must be in exact order
4. **Email**: Must be lowercase (PayU requirement)
5. **Special Characters**: Remove from productinfo and firstname
6. **Form Encoding**: Browser automatically URL-encodes form values
7. **Hash Length**: Must be 128 characters (SHA512 hexadecimal)

## If Error Persists

1. Check server logs for hash generation details
2. Verify PayU credentials (key and salt) are correct
3. Verify endpoint URL matches test mode (`https://test.payu.in/_payment`)
4. Check if all parameters are properly trimmed and sanitized
5. Verify hash length is 128 characters
6. Contact PayU support with error code and transaction details

