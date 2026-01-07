# Response to Zaakpay Support - 502 Bad Gateway Error

## Email to Zaakpay Support

**Subject:** Request for Complete Request Details - 502 Bad Gateway Error on transactU API

---

Dear Zaakpay Support Team,

Thank you for your response regarding the 502 Bad Gateway error we're experiencing with the transactU API endpoint.

**Merchant Details:**
- **Merchant ID (Test)**: d22b6680ce804b1a81cdccb69a1285f1
- **Merchant ID (Production)**: a55fa97d585646228a70d0e6ae5db840
- **Environment**: Test/Staging
- **API Endpoint**: https://api.zaakpay.com/transactU?v=8

**Issue:**
We are experiencing intermittent 502 Bad Gateway errors when submitting payment requests to the transactU API endpoint. The requests are being sent with the correct format and checksum, but we're receiving 502 errors from your servers.

**Request:**
As you mentioned, could you please share the complete request details that you're receiving on your end? This will help us:
1. Verify that our request format matches your expectations
2. Identify any missing or incorrect parameters
3. Ensure the environment/mode parameter is being passed correctly

**Current Implementation:**
- We are using the endpoint: `https://api.zaakpay.com/transactU?v=8`
- Environment is passed in the request data as `mode: "0"` for test mode
- We are sending the request as a POST with `data` and `checksum` form fields
- All required fields are included: merchantIdentifier, orderDetail, paymentInstrument, billingAddress, shippingAddress

**Sample Request Structure (what we're sending):**
```json
{
  "merchantIdentifier": "d22b6680ce804b1a81cdccb69a1285f1",
  "showMobile": "true",
  "mode": "0",
  "returnUrl": "https://www.shaktisewafoudation.in/api/zaakpay/callback?transaction_id=...",
  "orderDetail": {
    "orderId": "ORDER_...",
    "amount": "1000",
    "currency": "INR",
    "productDescription": "Product purchase",
    "email": "customer@example.com",
    "phone": "9979738295",
    "firstName": "Customer",
    "lastName": "Name"
  },
  "paymentInstrument": {
    "paymentMode": "UPIAPP",
    "netbanking": {
      "bankid": ""
    }
  },
  "billingAddress": {
    "city": "NA"
  },
  "shippingAddress": {
    "city": "NA"
  }
}
```

**Questions:**
1. Is the endpoint URL `https://api.zaakpay.com/transactU?v=8` correct for both test and production?
2. Should the environment be passed in the URL or only in the request data (`mode` field)?
3. Are there any additional headers or parameters required?
4. What is the expected response format when the request is successful?

**Additional Information:**
- All integration URLs are registered in our Zaakpay dashboard
- Domain Name: https://www.shaktisewafoudation.in
- Return URL: https://www.shaktisewafoudation.in/api/zaakpay/callback
- Webhook URLs are also configured

We look forward to your response with the complete request details so we can resolve this issue promptly.

Thank you for your assistance.

Best regards,
[Your Name]
[Your Company]
[Contact Information]

---

## Technical Details for Reference

**Request Method:** POST
**Content-Type:** application/x-www-form-urlencoded
**Endpoint:** https://api.zaakpay.com/transactU?v=8

**Form Fields:**
- `data`: JSON string of payment data
- `checksum`: HMAC SHA-256 checksum of the data string

**Checksum Calculation:**
- Algorithm: HMAC SHA-256
- Secret Key: [Test Secret Key]
- Input: JSON string of payment data (UTF-8)

**Error Details:**
- Error Code: 502 Bad Gateway
- Frequency: Intermittent
- Timing: Usually occurs after 30+ seconds of waiting
- Response: nginx error page

