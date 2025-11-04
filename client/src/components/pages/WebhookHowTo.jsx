import React from "react";
import { motion } from "framer-motion";
import { FiLink, FiCode, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import Navbar from "../Navbar";

const Code = ({ children }) => (
  <pre className="bg-[#263F43] border border-white/10 rounded-lg p-4 overflow-x-auto text-xs sm:text-sm font-mono text-green-400 font-['Albert_Sans']">
    <code>{children}</code>
  </pre>
);

const WebhookHowTo = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#1F383D]">
      <Navbar />

      {/* Split Layout: Top Half (Graphic) + Bottom Half (Data) */}
      <div className="relative">
        {/* Fixed X Graphic - Background Layer */}
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ top: "4rem" }}
        >
          <img
            src="/X.png"
            alt="X graphic"
            className="object-contain hidden sm:block"
            style={{
              filter: "drop-shadow(0 0 40px rgba(94, 234, 212, 0.5))",
              width: "120%",
              height: "85%",
              maxWidth: "none",
              maxHeight: "none",
            }}
          />
          <img
            src="/X.png"
            alt="X graphic"
            className="object-contain sm:hidden"
            style={{
              filter: "drop-shadow(0 0 20px rgba(94, 234, 212, 0.5))",
              width: "100%",
              height: "70%",
              maxWidth: "none",
              maxHeight: "none",
            }}
          />
        </div>

        {/* Scrollable Content Section - Overlays on top */}
        <section className="relative z-10 min-h-screen bg-transparent">
          <div className="bg-transparent pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6 sm:space-y-8"
              >
                {/* Header */}
                <motion.div
                  variants={itemVariants}
                  className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                      <FiLink className="text-accent text-xl" />
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white mb-2 font-['Albert_Sans']">
                        How to Setup Webhooks
                      </h1>
                      <p className="text-white/70 text-base sm:text-lg font-['Albert_Sans']">
                        Follow these steps to receive real-time callbacks for
                        payments and payouts.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Content Sections */}
                <div className="space-y-6">
                  {/* Step 1 */}
                  <motion.section
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent font-bold text-lg font-['Albert_Sans']">
                          1
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 font-['Albert_Sans']">
                          Choose where to receive callbacks
                        </h3>
                        <p className="text-white/70 text-sm sm:text-base mb-4 font-['Albert_Sans'] leading-relaxed">
                          Host two POST endpoints in your system. You can use
                          our sample receiver to test locally.
                        </p>
                        <Code>{`# Sample minimal receiver
PAYMENT_WEBHOOK_SECRET=your_payment_secret \\
PAYOUT_WEBHOOK_SECRET=your_payout_secret \\
PORT=3001 node index.js

Payment URL: http://localhost:3001/webhooks/payment
Payout URL:  http://localhost:3001/webhooks/payout`}</Code>
                      </div>
                    </div>
                  </motion.section>

                  {/* Step 2 */}
                  <motion.section
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent font-bold text-lg font-['Albert_Sans']">
                          2
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 font-['Albert_Sans']">
                          Configure the URLs in this dashboard
                        </h3>
                        <p className="text-white/70 text-sm sm:text-base mb-3 font-['Albert_Sans']">
                          Go to Webhooks page and set:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mb-4 text-white/80 text-sm sm:text-base font-['Albert_Sans']">
                          <li>
                            Payments webhook URL + events (e.g.,
                            payment.success)
                          </li>
                          <li>
                            Payouts webhook URL + events (e.g.,
                            payout.completed)
                          </li>
                        </ul>
                        <p className="text-white/70 text-sm sm:text-base font-['Albert_Sans']">
                          Use the "Test Webhook" buttons to trigger a sample
                          event and validate your receiver.
                        </p>
                      </div>
                    </div>
                  </motion.section>

                  {/* Step 3 */}
                  <motion.section
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent font-bold text-lg font-['Albert_Sans']">
                          3
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 font-['Albert_Sans'] flex items-center gap-2">
                          <FiCode className="text-accent" />
                          Signature verification
                        </h3>
                        <p className="text-white/70 text-sm sm:text-base mb-3 font-['Albert_Sans']">
                          We sign each request using HMAC SHA-256 with your
                          secret. Verify headers:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mb-4 text-white/80 text-sm sm:text-base font-['Albert_Sans']">
                          <li>
                            <b className="text-white">x-webhook-signature</b>:
                            hex HMAC of (timestamp + raw_body)
                          </li>
                          <li>
                            <b className="text-white">x-webhook-timestamp</b>:
                            unix milliseconds or ISO timestamp
                          </li>
                          <li>
                            <b className="text-white">x-event-type</b>: event
                            type identifier
                          </li>
                        </ul>
                        <Code>{`function verify(req, secret) {
  const sig = req.headers['x-webhook-signature']
  const ts  = req.headers['x-webhook-timestamp']
  const raw = req.rawBody // Buffer
  const expected = crypto.createHmac('sha256', secret)
    .update(String(ts) + raw.toString('utf8')).digest('hex')
  return timingSafeEqual(sig, expected)
}`}</Code>
                      </div>
                    </div>
                  </motion.section>

                  {/* Step 4 */}
                  <motion.section
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent font-bold text-lg font-['Albert_Sans']">
                          4
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4 font-['Albert_Sans']">
                          Payloads you will receive
                        </h3>

                        <div className="mb-6">
                          <h4 className="text-lg font-semibold text-white mb-3 font-['Albert_Sans'] flex items-center gap-2">
                            <FiCheckCircle className="text-green-400" />
                            Payment (example: payment.success)
                          </h4>
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
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-white mb-3 font-['Albert_Sans'] flex items-center gap-2">
                            <FiCheckCircle className="text-green-400" />
                            Payout (example: payout.completed)
                          </h4>
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
                        </div>
                      </div>
                    </div>
                  </motion.section>

                  {/* Step 5 */}
                  <motion.section
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent font-bold text-lg font-['Albert_Sans']">
                          5
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 font-['Albert_Sans'] flex items-center gap-2">
                          <FiAlertCircle className="text-yellow-400" />
                          Troubleshooting
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-white/80 text-sm sm:text-base font-['Albert_Sans']">
                          <li>
                            Ensure your endpoint returns HTTP 200 within 10s.
                          </li>
                          <li>
                            Verify secrets and use timing-safe comparisons.
                          </li>
                          <li>
                            Allow-list our IPs if your firewall blocks external
                            calls.
                          </li>
                          <li>
                            Use the Test buttons to validate connectivity and
                            signature.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </motion.section>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WebhookHowTo;
