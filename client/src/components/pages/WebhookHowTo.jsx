import React from 'react';
import Sidebar from '../Sidebar';
import './PageLayout.css';

const Code = ({ children }) => (
  <pre style={{
    background: '#0f172a',
    color: '#e2e8f0',
    padding: 16,
    borderRadius: 8,
    overflowX: 'auto',
    fontSize: 12,
    lineHeight: 1.5
  }}>
    <code>{children}</code>
  </pre>
);

const WebhookHowTo = () => {
  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>How to setup webhooks</h1>
          <p>Follow these steps to receive real-time callbacks for payments and payouts.</p>
        </div>

        <div className="page-content">
          <section className="webhook-form-card">
            <h3>1) Choose where to receive callbacks</h3>
            <p>
              Host two POST endpoints in your system. You can use our sample receiver to test locally.
            </p>
            <Code>{`# Sample minimal receiver
PAYMENT_WEBHOOK_SECRET=your_payment_secret \
PAYOUT_WEBHOOK_SECRET=your_payout_secret \
PORT=3001 node index.js

Payment URL: http://localhost:3001/webhooks/payment
Payout URL:  http://localhost:3001/webhooks/payout`}</Code>
          </section>

          <section className="webhook-form-card">
            <h3>2) Configure the URLs in this dashboard</h3>
            <p>
              Go to Webhooks page and set:
            </p>
            <ul>
              <li>Payments webhook URL + events (e.g., payment.success)</li>
              <li>Payouts webhook URL + events (e.g., payout.completed)</li>
            </ul>
            <p>
              Use the “Test Webhook” buttons to trigger a sample event and validate your receiver.
            </p>
          </section>

          <section className="webhook-form-card">
            <h3>3) Signature verification</h3>
            <p>
              We sign each request using HMAC SHA-256 with your secret. Verify headers:
            </p>
            <ul>
              <li><b>x-webhook-signature</b>: hex HMAC of (timestamp + raw_body)</li>
              <li><b>x-webhook-timestamp</b>: unix milliseconds or ISO timestamp</li>
              <li><b>x-event-type</b>: event type identifier</li>
            </ul>
            <Code>{`function verify(req, secret) {
  const sig = req.headers['x-webhook-signature']
  const ts  = req.headers['x-webhook-timestamp']
  const raw = req.rawBody // Buffer
  const expected = crypto.createHmac('sha256', secret)
    .update(String(ts) + raw.toString('utf8')).digest('hex')
  return timingSafeEqual(sig, expected)
}`}</Code>
          </section>

          <section className="webhook-form-card">
            <h3>4) Payloads you will receive</h3>
            <h4 style={{ marginTop: 8 }}>Payment (example: payment.success)</h4>
            <Code>{`{
  "event": "payment.success",
  "timestamp": "2025-10-30T11:20:57.774Z",
  "transaction_id": "TXN_1761823239121_qxzapf",
  "order_id": "TXN_1761823239121_qxzapf",
  "merchant_id": "68fb6967b3f0e2eb400bfbd0",
  "data": {
    "transaction_id": "TXN_1761823239121_qxzapf",
    "order_id": "TXN_1761823239121_qxzapf",
    "amount": 20,
    "currency": "INR",
    "status": "paid",
    "payment_method": "UPI_QR",
    "paid_at": "2025-10-30T11:20:41.910Z",
    "settlement_status": "unsettled",
    "expected_settlement_date": "2025-11-03T10:30:00.000Z",
    "acquirer_data": { /* utr, rrn, bank info ... */ },
    "customer": { /* id, name, email, phone */ },
    "merchant": { /* id, name */ },
    "description": "...",
    "created_at": "2025-10-30T11:20:39.529Z",
    "updated_at": "2025-10-30T11:20:57.453Z"
  }
}`}</Code>

            <h4 style={{ marginTop: 8 }}>Payout (example: payout.completed)</h4>
            <Code>{`{
  "event": "payout.completed",
  "timestamp": "2025-10-30T11:25:44.943Z",
  "payout": {
    "payout_id": "PAYOUT_REQ_1761823499983_0541dc71",
    "status": "completed",
    "amount": 5,
    "net_amount": 5,
    "commission": 0,
    "transfer_mode": "upi",
    "utr": "456789",
    "processed_at": "2025-10-30T11:25:44.459Z",
    "completed_at": "2025-10-30T11:25:44.943Z"
  }
}`}</Code>
          </section>

          <section className="webhook-form-card">
            <h3>5) Troubleshooting</h3>
            <ul>
              <li>Ensure your endpoint returns HTTP 200 within 10s.</li>
              <li>Verify secrets and use timing-safe comparisons.</li>
              <li>Allow-list our IPs if your firewall blocks external calls.</li>
              <li>Use the Test buttons to validate connectivity and signature.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default WebhookHowTo;


