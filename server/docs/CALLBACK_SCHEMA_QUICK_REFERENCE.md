# Universal Callback Schema - Quick Reference

## Standard Payload Structure

```json
{
  "event": "payment.success | payment.failed | payment.pending | payment.cancelled",
  "timestamp": "ISO 8601 timestamp",
  "transaction_id": "TXN_xxx",
  "order_id": "ORDER_xxx",
  "merchant_id": "merchant_id",
  "data": {
    "transaction_id": "TXN_xxx",
    "order_id": "ORDER_xxx",
    "amount": 100.00,
    "currency": "INR",                           
    "status": "paid | failed | pending | cancelled",
    "payment_method": "UPI | Card | Net Banking",
    "paid_at": "ISO 8601 timestamp",
    "settlement_status": "unsettled | settled | failed",
    "expected_settlement_date": "ISO 8601 timestamp",
    "commission": 2.00,
    "net_amount": 98.00,
    "customer": {
      "customer_id": "CUST_xxx",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "merchant": {
      "merchant_id": "merchant_id",
      "merchant_name": "Merchant Name"
    },
    "gateway_used": "paytm | razorpay | easebuzz | phonepe | sabpaisa",
    "gateway_order_id": "gateway_order_id",
    "gateway_payment_id": "gateway_payment_id",
    "gateway_reference_id": "gateway_reference_id",
    "acquirer_data": {
      "utr": "UTR123456789012",
      "rrn": "RRN123456789012",
      "bank_transaction_id": "BANK_TXN_123",
      "bank_name": "Bank Name",
      "vpa": "merchant@paytm"
    },
    "gateway_metadata": {},
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

## Webhook Headers

```
x-webhook-signature: HMAC-SHA256 signature
x-webhook-timestamp: Unix timestamp (milliseconds)
x-merchant-id: Merchant ID
x-event-type: Event type
```

## Signature Verification

```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(timestamp + JSON.stringify(payload))
  .digest('hex');
```

## Event Types

- `payment.success` - Payment completed successfully
- `payment.failed` - Payment failed
- `payment.pending` - Payment pending confirmation
- `payment.cancelled` - Payment cancelled by user
- `webhook.test` - Test webhook

## Gateway Values

- `gateway_used`: `paytm`, `razorpay`, `easebuzz`, `phonepe`, `sabpaisa`
- Gateway-specific IDs available in `gateway_metadata`

## Response

Return `200 OK` (or any 2xx) to acknowledge receipt.

---

**Full Documentation**: See `UNIVERSAL_CALLBACK_SCHEMA.md`

