# PayU Test/Sandbox Mode Setup Guide

## Overview
This guide explains how to properly configure and use PayU's test/sandbox mode to avoid "Too many Requests" errors.

## Issue Fixed
The error "Sorry, we are unable to process your payment due to Too many Requests. Please try after 60 seconds" was occurring because the `environment` parameter was not being set when using test credentials.

## Solution
Added `environment=1` parameter to all PayU form submissions when `PAYU_ENVIRONMENT=test` or `PAYU_ENVIRONMENT=sandbox`.

## Configuration

### Environment Variables
Set these in your `.env` file:

```env
# PayU Test/Sandbox Mode Configuration
PAYU_ENVIRONMENT=test  # or 'sandbox' - enables test mode

# Test Credentials (from PayU Dashboard → Test Mode → Key Salt Details)
PAYU_KEY_TEST=your_test_key_here
PAYU_SALT_TEST=your_test_salt_here
PAYU_CLIENT_ID_TEST=your_test_client_id_here
PAYU_CLIENT_SECRET_TEST=your_test_client_secret_here

# Production Credentials (used when PAYU_ENVIRONMENT is not 'test' or 'sandbox')
PAYU_KEY=your_production_key_here
PAYU_SALT=your_production_salt_here
PAYU_CLIENT_ID=your_production_client_id_here
PAYU_CLIENT_SECRET=your_production_client_secret_here
```

## How It Works

1. **Mode Detection**: The system checks `PAYU_ENVIRONMENT`:
   - If set to `'test'` or `'sandbox'` → uses test credentials and adds `environment=1` to form
   - Otherwise → uses production credentials (no `environment` parameter)

2. **Form Parameters**: When in test mode, the following parameter is automatically added:
   ```
   environment=1
   ```

3. **Endpoint**: Both test and production modes use the same endpoint:
   - `https://secure.payu.in/_payment`
   - Test credentials work on the production endpoint (per PayU docs)

## Getting Test Credentials

1. Log in to your PayU Dashboard
2. Switch to **Test Mode** using the toggle in the top left corner
3. Navigate to **Payment Gateway → Mobile SDK Integration → Key Salt Details**
4. Copy the **Test Key** and **Test Salt** values
5. Set them in your `.env` file as `PAYU_KEY_TEST` and `PAYU_SALT_TEST`

## Test Payment Methods

### Test Cards
Use PayU's test cards for card payments (see PayU docs for latest test cards).

### Test UPI
- **UPI ID**: `test@payu` (or any test UPI ID provided by PayU)
- **UPI Pin**: Use test UPI pin if required

### Test Net Banking
- **Username**: `payu`
- **Password**: `payu`
- **OTP**: `123456`

## Logging

When test mode is enabled, you'll see these log messages:
```
🔧 PayU Configuration:
   Mode: test (TEST - using test credentials)
   ✅ TEST MODE: environment=1 will be added to form parameters
   📝 Note: Use test credentials from PayU Dashboard → Test Mode → Key Salt Details
```

## References

- PayU Test Integration Docs: https://docs.payu.in/docs/pythonsdk-test-integration
- PayU Test Cards & UPI IDs: https://docs.payu.in/docs/test-cards-upi-id-and-wallets
- PayU Main Documentation: https://docs.payu.in/

## Troubleshooting

### Still Getting "Too many Requests" Error?

1. **Check Environment Variables**: Ensure `PAYU_ENVIRONMENT=test` is set
2. **Verify Test Credentials**: Make sure you're using test credentials from PayU Dashboard
3. **Wait Period**: PayU may have rate limits - wait 60 seconds between test requests
4. **Check Logs**: Look for "✅ TEST MODE: environment=1 will be added" in logs

### Form Parameters Not Including environment=1?

- Check that `PAYU_ENVIRONMENT` is set to `'test'` or `'sandbox'` (case-insensitive)
- Restart your application after changing environment variables
- Check logs to see which mode is being used

### Transaction Not Processing?

- Verify test credentials are correct
- Ensure you're using test payment methods (test cards, test UPI, etc.)
- Check PayU Dashboard → Test Mode for any errors or notifications

