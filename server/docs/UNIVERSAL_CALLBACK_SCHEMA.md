# Universal Callback Schema Documentation

## Overview

This document describes the **standardized webhook/callback payload** that is sent to merchants regardless of which payment gateway is used (Paytm, Easebuzz, Razorpay, PhonePe, SabPaisa, etc.). This ensures consistent integration for merchants across all payment gateways.

---

## Webhook Delivery

### HTTP Method
- **POST** request to merchant's configured webhook URL

### Headers
```
Content-Type: application/json
x-webhook-signature: <HMAC-SHA256 signature>
x-webhook-timestamp: <Unix timestamp in milliseconds>
x-merchant-id: <Merchant ID>
x-event-type: <Event type>
```

### Signature Verification
The webhook signature is generated using HMAC-SHA256:
```
signature = HMAC-SHA256(timestamp + JSON.stringify(payload), webhook_secret)
```

**Verification:**
1. Extract `x-webhook-timestamp` and `x-webhook-signature` from headers
2. Concatenate timestamp + JSON payload string
3. Compute HMAC-SHA256 with your webhook secret
4. Compare computed signature with `x-webhook-signature` (case-insensitive)

---

## Universal Payload Structure

All webhook payloads follow this consistent structure:

```json
{
  "event": "<event_type>",
  "timestamp": "<ISO 8601 timestamp>",
  "transaction_id": "<unique_transaction_id>",
  "order_id": "<merchant_order_id>",
  "merchant_id": "<merchant_id>",
  "data": {
    // Event-specific data (see below)
  }
}
```

---

## Event Types

### 1. Payment Success (`payment.success`)

Sent when a payment is successfully completed.

**Payload:**
```json
{
  "event": "payment.success",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transaction_id": "TXN_1234567890_abc123",
  "order_id": "ORDER_1234567890",
  "merchant_id": "507f1f77bcf86cd799439011",
  "data": {
    "transaction_id": "TXN_1234567890_abc123",
    "order_id": "ORDER_1234567890",
    "amount": 100.00,
    "currency": "INR",
    "status": "paid",
    "payment_method": "UPI",
    "paid_at": "2024-01-15T10:30:00.000Z",
    "settlement_status": "unsettled",
    "expected_settlement_date": "2024-01-16T16:00:00.000Z",
    "commission": 2.00,
    "net_amount": 98.00,
    "description": "Payment for Order #12345",
    "customer": {
      "customer_id": "CUST_1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "merchant": {
      "merchant_id": "507f1f77bcf86cd799439011",
      "merchant_name": "My Store"
    },
    "gateway_used": "paytm",
    "gateway_order_id": "ORDER_1234567890",
    "gateway_payment_id": "PAY_1234567890",
    "gateway_reference_id": "REF_1234567890",
    "acquirer_data": {
      "utr": "UTR123456789012",
      "rrn": "RRN123456789012",
      "bank_transaction_id": "BANK_TXN_123",
      "bank_name": "HDFC Bank",
      "vpa": "merchant@paytm"
    },
    "gateway_metadata": {
      // Gateway-specific raw data (varies by gateway)
      "paytm_order_id": "ORDER_1234567890",
      "paytm_payment_id": "PAY_1234567890"
    },
    "created_at": "2024-01-15T10:25:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Payment Failed (`payment.failed`)

Sent when a payment fails.

**Payload:**
```json
{
  "event": "payment.failed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transaction_id": "TXN_1234567890_abc123",
  "order_id": "ORDER_1234567890",
  "merchant_id": "507f1f77bcf86cd799439011",
  "data": {
    "transaction_id": "TXN_1234567890_abc123",
    "order_id": "ORDER_1234567890",
    "amount": 100.00,
    "currency": "INR",
    "status": "failed",
    "failure_reason": "Payment declined by bank",
    "gateway_used": "paytm",
    "gateway_order_id": "ORDER_1234567890",
    "gateway_payment_id": null,
    "gateway_reference_id": null,
    "gateway_metadata": {
      "paytm_order_id": "ORDER_1234567890",
      "error_code": "DECLINED",
      "error_message": "Payment declined by bank"
    },
    "created_at": "2024-01-15T10:25:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Payment Pending (`payment.pending`)

Sent when a payment is in pending state (e.g., awaiting bank confirmation).

**Payload:**
```json
{
  "event": "payment.pending",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transaction_id": "TXN_1234567890_abc123",
  "order_id": "ORDER_1234567890",
  "merchant_id": "507f1f77bcf86cd799439011",
  "data": {
    "transaction_id": "TXN_1234567890_abc123",
    "order_id": "ORDER_1234567890",
    "amount": 100.00,
    "currency": "INR",
    "status": "pending",
    "gateway_used": "easebuzz",
    "gateway_order_id": "ORDER_1234567890",
    "gateway_payment_id": null,
    "gateway_reference_id": null,
    "created_at": "2024-01-15T10:25:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Payment Cancelled (`payment.cancelled`)

Sent when a payment is cancelled by the user.

**Payload:**
```json
{
  "event": "payment.cancelled",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transaction_id": "TXN_1234567890_abc123",
  "order_id": "ORDER_1234567890",
  "merchant_id": "507f1f77bcf86cd799439011",
  "data": {
    "transaction_id": "TXN_1234567890_abc123",
    "order_id": "ORDER_1234567890",
    "amount": 100.00,
    "currency": "INR",
    "status": "cancelled",
    "cancellation_reason": "User cancelled payment",
    "gateway_used": "razorpay",
    "gateway_order_id": "ORDER_1234567890",
    "created_at": "2024-01-15T10:25:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 5. Webhook Test (`webhook.test`)

Sent when testing webhook configuration.

**Payload:**
```json
{
  "event": "webhook.test",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "merchant_id": "507f1f77bcf86cd799439011",
  "data": {
    "test": true,
    "message": "This is a test webhook from Ninex Payment Gateway",
    "merchant_name": "My Store"
  }
}
```

---

## Field Descriptions

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | Yes | Event type (e.g., `payment.success`, `payment.failed`) |
| `timestamp` | string (ISO 8601) | Yes | Timestamp when the event occurred |
| `transaction_id` | string | Yes | Unique transaction ID generated by the system |
| `order_id` | string | Yes | Merchant's order ID |
| `merchant_id` | string | Yes | Merchant's unique ID |
| `data` | object | Yes | Event-specific data (see below) |

### Data Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transaction_id` | string | Yes | Same as top-level transaction_id |
| `order_id` | string | Yes | Same as top-level order_id |
| `amount` | number | Yes | Payment amount in currency units |
| `currency` | string | Yes | Currency code (e.g., "INR") |
| `status` | string | Yes | Payment status: `paid`, `failed`, `pending`, `cancelled`, `refunded` |
| `payment_method` | string | Conditional | Payment method (e.g., "UPI", "Card", "Net Banking") - only for success events |
| `paid_at` | string (ISO 8601) | Conditional | Timestamp when payment was completed - only for success events |
| `settlement_status` | string | Conditional | Settlement status: `unsettled`, `settled`, `failed` - only for success events |
| `expected_settlement_date` | string (ISO 8601) | Conditional | Expected settlement date - only for success events |
| `commission` | number | Conditional | Commission charged - only for success events |
| `net_amount` | number | Conditional | Net amount after commission - only for success events |
| `description` | string | No | Payment description |
| `failure_reason` | string | Conditional | Reason for failure - only for failed events |
| `cancellation_reason` | string | Conditional | Reason for cancellation - only for cancelled events |
| `customer` | object | Yes | Customer information (see below) |
| `merchant` | object | Yes | Merchant information (see below) |
| `gateway_used` | string | Yes | Payment gateway used: `paytm`, `razorpay`, `easebuzz`, `phonepe`, `sabpaisa` |
| `gateway_order_id` | string | Yes | Order ID from payment gateway |
| `gateway_payment_id` | string | Conditional | Payment ID from gateway - null if not available |
| `gateway_reference_id` | string | Conditional | Reference ID from gateway - null if not available |
| `acquirer_data` | object | Conditional | Bank/acquirer transaction data - only for success events (see below) |
| `gateway_metadata` | object | Conditional | Gateway-specific raw data (varies by gateway) |
| `created_at` | string (ISO 8601) | Yes | Transaction creation timestamp |
| `updated_at` | string (ISO 8601) | Yes | Transaction last update timestamp |

### Customer Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_id` | string | Yes | Customer ID provided by merchant |
| `name` | string | Yes | Customer name |
| `email` | string | Yes | Customer email |
| `phone` | string | Yes | Customer phone number |

### Merchant Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `merchant_id` | string | Yes | Merchant's unique ID |
| `merchant_name` | string | Yes | Merchant's name |

### Acquirer Data Object (Success Events Only)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `utr` | string | Conditional | Unique Transaction Reference (UTR) - if available |
| `rrn` | string | Conditional | Retrieval Reference Number (RRN) - if available |
| `bank_transaction_id` | string | Conditional | Bank's transaction ID - if available |
| `bank_name` | string | Conditional | Bank name - if available |
| `vpa` | string | Conditional | Virtual Payment Address (for UPI) - if available |

### Gateway Metadata

The `gateway_metadata` object contains gateway-specific raw data. Structure varies by gateway:

**Paytm:**
```json
{
  "paytm_order_id": "ORDER_1234567890",
  "paytm_payment_id": "PAY_1234567890",
  "paytm_reference_id": "REF_1234567890"
}
```

**Razorpay:**
```json
{
  "razorpay_payment_link_id": "plink_1234567890",
  "razorpay_payment_id": "pay_1234567890",
  "razorpay_reference_id": "REF_1234567890"
}
```

**Easebuzz:**
```json
{
  "easebuzz_order_id": "ORDER_1234567890",
  "easebuzz_payment_id": "PAY_1234567890",
  "easebuzz_reference_id": "REF_1234567890"
}
```

**PhonePe:**
```json
{
  "phonepe_merchant_transaction_id": "MTXN_1234567890",
  "phonepe_payment_id": "PAY_1234567890",
  "phonepe_reference_id": "REF_1234567890"
}
```

---

## Gateway-Specific Field Mapping

### Standardized Gateway Fields

Regardless of the payment gateway, the following fields are always standardized:

- `gateway_used`: Always one of: `paytm`, `razorpay`, `easebuzz`, `phonepe`, `sabpaisa`
- `gateway_order_id`: Always the order ID from the payment gateway
- `gateway_payment_id`: Always the payment ID from the gateway (null if not available)
- `gateway_reference_id`: Always the reference ID from the gateway (null if not available)

### Gateway-Specific IDs in Metadata

Gateway-specific IDs are also included in `gateway_metadata` for reference:

- **Paytm**: `paytm_order_id`, `paytm_payment_id`, `paytm_reference_id`
- **Razorpay**: `razorpay_payment_link_id`, `razorpay_payment_id`, `razorpay_reference_id`
- **Easebuzz**: `easebuzz_order_id`, `easebuzz_payment_id`, `easebuzz_reference_id`
- **PhonePe**: `phonepe_merchant_transaction_id`, `phonepe_payment_id`, `phonepe_reference_id`

---

## Response Handling

### Expected Response

Your webhook endpoint should return:

- **Status Code**: `200 OK` (or any 2xx status code)
- **Response Body**: Any JSON response (optional)

### Retry Logic

If your endpoint returns a non-2xx status code or times out:

- **Retries**: Up to 3 retry attempts
- **Backoff**: Exponential backoff (1s, 2s, 4s, 8s... capped at 30s)
- **Timeout**: 10 seconds per request

### Idempotency

Webhooks are designed to be idempotent. You may receive the same webhook multiple times. Always check if you've already processed the transaction before taking action.

**Recommended approach:**
1. Check if transaction with `transaction_id` already exists
2. If exists and status matches, ignore (idempotent)
3. If exists but status differs, update accordingly
4. If not exists, create new record

---

## Security Best Practices

1. **Always verify the webhook signature** before processing
2. **Use HTTPS** for webhook URLs
3. **Validate the merchant_id** matches your merchant account
4. **Check timestamp** to prevent replay attacks (recommended: reject if > 5 minutes old)
5. **Store webhook secret securely** (never expose in logs or client-side code)

---

## Example Webhook Handler (Node.js/Express)

```javascript
const crypto = require('crypto');
const express = require('express');
const router = express.Router();

router.post('/webhook', express.json(), async (req, res) => {
  try {
    // 1. Extract headers
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const merchantId = req.headers['x-merchant-id'];
    const eventType = req.headers['x-event-type'];
    
    // 2. Verify signature
    const webhookSecret = process.env.WEBHOOK_SECRET; // Your webhook secret
    const payloadString = timestamp + JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');
    
    if (computedSignature.toLowerCase() !== signature.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // 3. Verify timestamp (prevent replay attacks)
    const webhookTime = parseInt(timestamp);
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - webhookTime);
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return res.status(401).json({ error: 'Timestamp too old' });
    }
    
    // 4. Verify merchant ID
    if (merchantId !== process.env.MERCHANT_ID) {
      return res.status(401).json({ error: 'Invalid merchant ID' });
    }
    
    // 5. Process webhook
    const { event, transaction_id, order_id, data } = req.body;
    
    // Check for duplicate (idempotency)
    const existingTransaction = await findTransactionByTransactionId(transaction_id);
    if (existingTransaction && existingTransaction.status === data.status) {
      return res.status(200).json({ message: 'Already processed' });
    }
    
    // Handle different events
    switch (event) {
      case 'payment.success':
        await handlePaymentSuccess(data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(data);
        break;
      case 'payment.pending':
        await handlePaymentPending(data);
        break;
      case 'payment.cancelled':
        await handlePaymentCancelled(data);
        break;
      default:
        console.log('Unknown event type:', event);
    }
    
    // 6. Return success
    res.status(200).json({ success: true, message: 'Webhook processed' });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Support

For questions or issues regarding webhook integration, please contact support or refer to the main API documentation.

---

**Last Updated**: January 2024  
**Version**: 1.0.0

