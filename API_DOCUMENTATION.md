# Payment API Documentation

## Unified Payment Link Creation

### Recommended Endpoint

**Use this endpoint for all payment link creation. The system automatically selects the payment gateway configured by the administrator.**

```
POST https://api.himora.art/api/payments/create-payment-link
```

### Request Headers

```
Content-Type: application/json
x-api-key: YOUR_API_KEY_HERE
```

### Request Body

```json
{
  "amount": "150",
  "customer_name": "Nikhil Mathurananda",
  "customer_email": "9222862487@gmail.com",
  "customer_phone": "9222862487",
  "description": "HC1763638536378CRU",
  "callback_url": "https://apiv1.s-pay.in/app/open/api/callback/ninex/coll"
}
```

### Required Fields

- `amount` (string or number): Payment amount in INR (minimum ₹1)
- `customer_name` (string): Customer's full name
- `customer_email` (string): Valid email address
- `customer_phone` (string): 10-digit phone number (without country code)

### Optional Fields

- `description` (string): Payment description
- `callback_url` (string): URL to redirect after payment
- `success_url` (string): URL to redirect on successful payment
- `failure_url` (string): URL to redirect on failed payment

### Response Format

**Success Response:**
```json
{
  "success": true,
  "transaction_id": "TXN_1234567890_abc123",
  "payment_link_id": "plink_xyz789",
  "payment_url": "https://rzp.io/i/abc123",
  "order_amount": 150,
  "order_currency": "INR",
  "merchant_id": "507f1f77bcf86cd799439011",
  "merchant_name": "Your Merchant Name",
  "reference_id": "REF_1234567890",
  "callback_url": "https://apiv1.s-pay.in/app/open/api/callback/ninex/coll",
  "gateway_used": "easebuzz",
  "gateway_name": "Easebuzz",
  "gateway_message": "Payment link created using Easebuzz gateway (automatically selected by system administrator)",
  "message": "Payment link created successfully using Easebuzz. Share this URL with customer. Gateway: Easebuzz.",
  "note": "The payment gateway is automatically selected by the system administrator. You don't need to specify which gateway to use."
}
```

### Key Points

1. **Automatic Gateway Selection**: The system automatically uses the payment gateway configured by the administrator. You don't need to specify which gateway to use.

2. **Gateway Information**: The response includes:
   - `gateway_used`: The gateway identifier (e.g., "easebuzz", "razorpay")
   - `gateway_name`: The human-readable gateway name (e.g., "Easebuzz", "Razorpay")
   - `gateway_message`: A message explaining which gateway was used
   - `note`: Helpful information about automatic gateway selection

3. **No Gateway Selection Needed**: You don't need to know or specify which payment gateway to use. The system handles this automatically based on administrator settings.

### Example cURL Request

```bash
curl -X POST "https://api.himora.art/api/payments/create-payment-link" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "amount": "150",
    "customer_name": "Nikhil Mathurananda",
    "customer_email": "9222862487@gmail.com",
    "customer_phone": "9222862487",
    "description": "HC1763638536378CRU",
    "callback_url": "https://apiv1.s-pay.in/app/open/api/callback/ninex/coll"
  }'
```

---

## ⚠️ Deprecated Endpoints

### Gateway-Specific Endpoints (Not Recommended)

The following endpoints are **deprecated** and kept only for backward compatibility:

- `POST /api/razorpay/create-payment-link`
- `POST /api/paytm/create-payment-link`
- `POST /api/easebuzz/create-payment-link`

**Why use the unified endpoint instead?**

1. **Automatic Gateway Selection**: The unified endpoint automatically uses the gateway configured by the administrator
2. **Future-Proof**: If the administrator changes the default gateway, your integration continues to work without any code changes
3. **Simpler Integration**: You don't need to know which gateway is currently active
4. **Consistent Response Format**: All gateways return the same response structure

**Migration Guide:**

Simply change your endpoint from:
```
POST /api/razorpay/create-payment-link
```

To:
```
POST /api/payments/create-payment-link
```

The request body and headers remain exactly the same. No other changes needed!

---

## Error Responses

### Authentication Failed (API Key)

```json
{
  "success": false,
  "error": "Invalid API key. Please check your credentials.",
  "details": {
    "code": "INVALID_API_KEY",
    "description": "The provided API key does not exist or is invalid."
  }
}
```

### Missing Required Fields

```json
{
  "success": false,
  "error": "Missing required fields: amount, customer_name, customer_email, customer_phone"
}
```

### No Gateway Enabled

```json
{
  "success": false,
  "error": "No payment gateway is enabled. Please contact administrator.",
  "message": "The administrator needs to enable at least one payment gateway in the system settings."
}
```

---

## Get Available Gateways

To check which payment gateways are available and which one is currently active:

```
GET https://api.himora.art/api/payments/available-gateways
```

**Headers:**
```
x-api-key: YOUR_API_KEY_HERE
```

**Response:**
```json
{
  "success": true,
  "default_gateway": "easebuzz",
  "enabled_gateways": ["easebuzz", "razorpay"],
  "all_gateways": {
    "razorpay": {
      "name": "Razorpay",
      "enabled": true,
      "isDefault": false
    },
    "easebuzz": {
      "name": "Easebuzz",
      "enabled": true,
      "isDefault": true
    },
    "paytm": {
      "name": "Paytm",
      "enabled": false,
      "isDefault": false
    }
  }
}
```

---

## Support

For any issues or questions:
- Check the error message in the response
- Verify your API key is correct
- Ensure all required fields are provided
- Contact support if the issue persists

