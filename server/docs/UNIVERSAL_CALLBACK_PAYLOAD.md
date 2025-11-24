# Universal Callback Payload Documentation

## Overview

All payment gateways (Easebuzz, Paytm, Razorpay, PhonePe, etc.) send webhooks to merchants in a **consistent, unified format**. This ensures merchants can integrate once and receive the same payload structure regardless of which payment gateway processes the transaction.

## Base Payload Structure

All webhook payloads follow this structure:

```json
{
  "event": "payment.success",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transaction_id": "TXN_1234567890",
  "order_id": "ORD_1234567890",
  "merchant_id": "507f1f77bcf86cd799439011",
  "data": {
    // Transaction details (see below)
  }
}
```

## Event Types

| Event | Description |
|-------|-------------|
| `payment.success` | Payment was successfully completed |
| `payment.failed` | Payment failed |
| `payment.pending` | Payment is pending (awaiting confirmation) |
| `payment.cancelled` | Payment was cancelled by user or system |

## Data Object Structure

The `data` object contains all transaction information in a normalized format:

```json
{
  "data": {
    // Core Transaction Information
    "transaction_id": "TXN_1234567890",
    "order_id": "ORD_1234567890",
    "amount": 1000.00,
    "currency": "INR",
    "status": "paid",
    "payment_method": "UPI",
    
    // Timestamps
    "paid_at": "2024-01-15T10:30:00.000Z",
    "created_at": "2024-01-15T10:25:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    
    // Financial Details
    "commission": 20.00,
    "net_amount": 980.00,
    
    // Settlement Information
    "settlement_status": "unsettled",
    "expected_settlement_date": "2024-01-17T10:30:00.000Z",
    
    // Payment Gateway Identifiers (Normalized)
    "gateway": "paytm",
    "gateway_order_id": "ORDER_1234567890",
    "gateway_payment_id": "PAYMENT_1234567890",
    "gateway_reference_id": "REF_1234567890",
    
    // Acquirer/Bank Information
    "acquirer": {
      "utr": "UTR1234567890123456",
      "rrn": "RRN1234567890123456",
      "bank_transaction_id": "BANK_TXN_1234567890",
      "bank_name": "HDFC Bank",
      "vpa": "merchant@upi"
    },
    
    // Customer Information
    "customer": {
      "customer_id": "CUST_1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210"
    },
    
    // Merchant Information
    "merchant": {
      "merchant_id": "507f1f77bcf86cd799439011",
      "merchant_name": "My Store"
    },
    
    // Transaction Description
    "description": "Order #12345",
    
    // Failure Information (only for failed/cancelled payments)
    "failure_reason": null,
    
    // Gateway-Specific Metadata (optional)
    "gateway_metadata": {
      "paytm_order_id": "ORDER_1234567890",
      "paytm_payment_id": "PAYMENT_1234567890",
      "paytm_reference_id": "REF_1234567890"
    }
  }
}
```

## Field Descriptions

### Core Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `transaction_id` | string | Unique transaction ID from our system | `"TXN_1234567890"` |
| `order_id` | string | Merchant's order ID | `"ORD_1234567890"` |
| `amount` | number | Transaction amount in currency units | `1000.00` |
| `currency` | string | Currency code (ISO 4217) | `"INR"` |
| `status` | string | Transaction status | `"paid"`, `"failed"`, `"pending"`, `"cancelled"` |
| `payment_method` | string | Payment method used | `"UPI"`, `"CARD"`, `"NETBANKING"` |

### Financial Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `commission` | number | Commission charged | `20.00` |
| `net_amount` | number | Amount after commission | `980.00` |
| `settlement_status` | string | Settlement status | `"unsettled"`, `"settled"` |
| `expected_settlement_date` | string (ISO 8601) | Expected settlement date | `"2024-01-17T10:30:00.000Z"` |

### Gateway Fields (Normalized)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `gateway` | string | Payment gateway used | `"paytm"`, `"easebuzz"`, `"razorpay"` |
| `gateway_order_id` | string | Gateway's order ID | `"ORDER_1234567890"` |
| `gateway_payment_id` | string | Gateway's payment ID | `"PAYMENT_1234567890"` |
| `gateway_reference_id` | string | Gateway's reference ID | `"REF_1234567890"` |

**Note:** These fields are normalized across all gateways. Gateway-specific IDs are also available in `gateway_metadata`.

### Acquirer Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `acquirer.utr` | string | UTR (Unique Transaction Reference) | `"UTR1234567890123456"` |
| `acquirer.rrn` | string | RRN (Retrieval Reference Number) | `"RRN1234567890123456"` |
| `acquirer.bank_transaction_id` | string | Bank's transaction ID | `"BANK_TXN_1234567890"` |
| `acquirer.bank_name` | string | Bank name | `"HDFC Bank"` |
| `acquirer.vpa` | string | VPA (for UPI payments) | `"merchant@upi"` |

### Customer Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `customer.customer_id` | string | Customer ID | `"CUST_1234567890"` |
| `customer.name` | string | Customer name | `"John Doe"` |
| `customer.email` | string | Customer email | `"john@example.com"` |
| `customer.phone` | string | Customer phone | `"+919876543210"` |

### Merchant Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `merchant.merchant_id` | string | Merchant ID | `"507f1f77bcf86cd799439011"` |
| `merchant.merchant_name` | string | Merchant name | `"My Store"` |

## Example Payloads

### Payment Success

```json
{
  "event": "payment.success",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transaction_id": "TXN_1234567890",
  "order_id": "ORD_1234567890",
  "merchant_id": "507f1f77bcf86cd799439011",
  "data": {
    "transaction_id": "TXN_1234567890",
    "order_id": "ORD_1234567890",
    "amount": 1000.00,
    "currency": "INR",
    "status": "paid",
    "payment_method": "UPI",
    "paid_at": "2024-01-15T10:30:00.000Z",
    "created_at": "2024-01-15T10:25:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "commission": 20.00,
    "net_amount": 980.00,
    "settlement_status": "unsettled",
    "expected_settlement_date": "2024-01-17T10:30:00.000Z",
    "gateway": "paytm",
    "gateway_order_id": "ORDER_1234567890",
    "gateway_payment_id": "PAYMENT_1234567890",
    "gateway_reference_id": "REF_1234567890",
    "acquirer": {
      "utr": "UTR1234567890123456",
      "rrn": "RRN1234567890123456",
      "bank_transaction_id": "BANK_TXN_1234567890",
      "bank_name": "HDFC Bank",
      "vpa": "merchant@upi"
    },
    "customer": {
      "customer_id": "CUST_1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210"
    },
    "merchant": {
      "merchant_id": "507f1f77bcf86cd799439011",
      "merchant_name": "My Store"
    },
    "description": "Order #12345",
    "failure_reason": null,
    "gateway_metadata": {
      "paytm_order_id": "ORDER_1234567890",
      "paytm_payment_id": "PAYMENT_1234567890",
      "paytm_reference_id": "REF_1234567890"
    }
  }
}
```

### Payment Failed

```json
{
  "event": "payment.failed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transaction_id": "TXN_1234567890",
  "order_id": "ORD_1234567890",
  "merchant_id": "507f1f77bcf86cd799439011",
  "data": {
    "transaction_id": "TXN_1234567890",
    "order_id": "ORD_1234567890",
    "amount": 1000.00,
    "currency": "INR",
    "status": "failed",
    "payment_method": null,
    "paid_at": null,
    "created_at": "2024-01-15T10:25:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "commission": 0,
    "net_amount": 1000.00,
    "settlement_status": null,
    "expected_settlement_date": null,
    "gateway": "paytm",
    "gateway_order_id": "ORDER_1234567890",
    "gateway_payment_id": null,
    "gateway_reference_id": null,
    "acquirer": {
      "utr": null,
      "rrn": null,
      "bank_transaction_id": null,
      "bank_name": null,
      "vpa": null
    },
    "customer": {
      "customer_id": "CUST_1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210"
    },
    "merchant": {
      "merchant_id": "507f1f77bcf86cd799439011",
      "merchant_name": "My Store"
    },
    "description": "Order #12345",
    "failure_reason": "Payment declined by bank",
    "gateway_metadata": {
      "paytm_order_id": "ORDER_1234567890"
    }
  }
}
```

## Webhook Headers

All webhooks include the following headers for security:

| Header | Description |
|--------|-------------|
| `x-webhook-signature` | HMAC SHA256 signature of the payload |
| `x-webhook-timestamp` | Timestamp used in signature generation |
| `x-merchant-id` | Merchant ID |
| `x-event-type` | Event type (`payment.success`, `payment.failed`, etc.) |

### Signature Verification

To verify the webhook signature:

1. Concatenate `timestamp` + `JSON.stringify(payload)`
2. Create HMAC SHA256 hash using your webhook secret
3. Compare with `x-webhook-signature` header

Example (Node.js):

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  const signaturePayload = timestamp + JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  
  return signature === expectedSignature;
}
```

## Gateway-Specific Metadata

Gateway-specific fields are available in the `gateway_metadata` object:

### Paytm
```json
{
  "gateway_metadata": {
    "paytm_order_id": "ORDER_1234567890",
    "paytm_payment_id": "PAYMENT_1234567890",
    "paytm_reference_id": "REF_1234567890"
  }
}
```

### Easebuzz
```json
{
  "gateway_metadata": {
    "easebuzz_order_id": "ORDER_1234567890",
    "easebuzz_payment_id": "PAYMENT_1234567890",
    "easebuzz_reference_id": "REF_1234567890"
  }
}
```

### Razorpay
```json
{
  "gateway_metadata": {
    "razorpay_payment_link_id": "plink_1234567890",
    "razorpay_payment_id": "pay_1234567890",
    "razorpay_reference_id": "ref_1234567890"
  }
}
```

### PhonePe
```json
{
  "gateway_metadata": {
    "phonepe_reference_id": "REF_1234567890",
    "phonepe_payment_id": "PAYMENT_1234567890",
    "phonepe_order_id": "ORDER_1234567890"
  }
}
```

## Best Practices

1. **Always verify the webhook signature** before processing
2. **Check the `event` field** to determine the action
3. **Use `transaction_id`** as the primary identifier (not gateway-specific IDs)
4. **Handle null values** gracefully (some fields may be null for failed payments)
5. **Store `gateway_metadata`** if you need gateway-specific information
6. **Implement idempotency** using `transaction_id` to prevent duplicate processing

## Support

For questions or issues with webhook payloads, contact support or refer to the main API documentation.

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0

