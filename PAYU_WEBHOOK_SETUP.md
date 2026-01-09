# PayU Webhook Setup Guide

## Current Configuration

Your PayU webhook callback URL is:
```
https://lyndsay-supercivil-maurita.ngrok-free.dev/api/payu/callback
```

**Note:** If ngrok URL changes, update both:
1. Dashboard webhook configuration
2. Environment variables (if using `PAYU_PUBLIC_TEST_URL` or `NGROK_URL`)

## Steps to Configure in PayU Dashboard

### 1. Access PayU Dashboard
- Log in to your PayU merchant account
- Go to **Settings** → **Webhooks**

### 2. Create Webhook
- Click **Create Webhook**
- **Type:** Select `Payments`
- **Event:** Select the events you want to receive:
  - ✅ **Successful** (Required - marks transactions as paid)
  - ✅ **Failed** (Recommended - for failed payments)
  - **Refund** (Optional - for refunds)
  - **Dispute** (Optional - for disputes)

- **Webhook URL:** Enter your callback URL:
  ```
  https://lyndsay-supercivil-maurita.ngrok-free.dev/api/payu/callback
  ```

- Click **Create**

### 3. Verify Webhook Configuration
After creating the webhook, PayU may send a test webhook to verify the URL is accessible.

## Webhook Events

| Event | Description | When to Use |
|-------|-------------|-------------|
| **Successful** | Payment completed successfully | ✅ Required - Updates transaction status to "paid" |
| **Failed** | Payment failed | ✅ Recommended - Updates transaction status to "failed" |
| **Refund** | Payment was refunded | Optional - Handle refunds |
| **Dispute** | Dispute raised for payment | Optional - Handle disputes |

## Important Notes

### 1. Webhook URL Requirements
- ✅ Must be publicly accessible (HTTPS)
- ✅ Must accept `application/x-www-form-urlencoded` content type
- ✅ Must return **200 OK** status code immediately
- ✅ Should be able to handle POST requests

### 2. Current Implementation
Your webhook handler (`/api/payu/callback`) already:
- ✅ Accepts POST requests with form-encoded data
- ✅ Verifies PayU response hash (includes `status` parameter)
- ✅ Finds transactions by `txnid` (PayU order ID)
- ✅ Updates transaction status to "paid" on success
- ✅ Returns 200 OK immediately to prevent PayU retries

### 3. Testing
1. Create a test payment in PayU test mode
2. Complete the payment successfully
3. Check server logs for:
   - `📥 [CALLBACK] PayU Callback Received` - Webhook received
   - `✅ Transaction found by PayU order ID` - Transaction found
   - `✅ PayU response hash verified successfully` - Hash valid
   - `✅ Transaction updated via callback` - Transaction marked as paid

### 4. IP Whitelisting (Optional)
According to PayU docs, you may need to whitelist these IPs in your firewall:
```
52.140.8.88     3.7.89.1
52.140.8.89     3.7.89.2
180.179.174.2   3.7.89.3
180.179.165.250 3.7.89.8
52.140.8.64     3.7.89.9
52.140.8.65     3.7.89.10
3.6.73.183      3.6.83.44
```

**Note:** With ngrok, IP whitelisting may not be necessary as ngrok handles the routing.

### 5. For Production
When deploying to production:
1. Replace ngrok URL with your production domain
2. Update webhook URL in PayU Dashboard to production URL
3. Ensure production URL is HTTPS and publicly accessible
4. Update environment variables:
   ```
   PAYU_PUBLIC_TEST_URL=https://your-production-domain.com
   # or
   NGROK_URL=https://your-production-domain.com
   ```

## Troubleshooting

### Webhooks Not Received
- Check if ngrok is running: `curl http://localhost:4040/api/tunnels`
- Verify webhook URL is publicly accessible
- Check PayU Dashboard → Webhooks → Status
- Review server logs for callback attempts

### Transactions Not Marked as Paid
- Check server logs for transaction lookup errors
- Verify hash verification (should show "✅ PayU response hash verified")
- Check if transaction was found by `txnid` (PayU order ID)
- Verify transaction update succeeded

### Hash Verification Failed
- Ensure using response hash (includes `status` parameter)
- Verify PayU key and salt are correct
- Check if status field is present in webhook payload

## References
- [PayU Webhooks Documentation](https://docs.payu.in/docs/webhooks)
- [Manage Webhooks using Dashboard](https://docs.payu.in/docs/create-a-new-webhook)

