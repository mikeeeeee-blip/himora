import React, { useState, useEffect, useRef } from "react";
import {
  FiBook,
  FiClock,
  FiCode,
  FiKey,
  FiSend,
  FiLink,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiGlobe,
  FiFileText,
  FiDownload,
  FiSearch,
  FiMenu,
  FiX,
} from "react-icons/fi";
import Navbar from "../Navbar";
import "./ApiDocumentationPage.css";
import apiKeyService from "../../services/apiKeyService";
import Toast from "../ui/Toast";

const ApiDocumentationPage = () => {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [activeSection, setActiveSection] = useState("getting-started");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef(null);

  const BASE_URL = "https://himora.art/api";
  // const BASE_URL = 'http://localhost:5001/api'; // For development

  useEffect(() => {
    fetchApiKey();
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest("[data-mobile-menu-button]")
      ) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu when section changes
  useEffect(() => {
    setShowMobileMenu(false);
  }, [activeSection]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMobileMenu]);

  const fetchApiKey = async () => {
    try {
      const result = await apiKeyService.getApiKey();
      const apiKeyValue =
        result?.apiKey ||
        result?.key ||
        result?.data?.apiKey ||
        result?.data?.key ||
        result;
      if (
        apiKeyValue &&
        typeof apiKeyValue === "string" &&
        apiKeyValue.length > 0
      ) {
        setApiKey(apiKeyValue);
      }
    } catch (error) {
      console.error("Error fetching API key:", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast({ message: "Copied to clipboard!", type: "success" });
  };

  const CodeBlock = ({ title, code, language = "javascript" }) => (
    <div className="code-block-wrapper">
      {title && <div className="code-block-header">{title}</div>}
      <div className="code-block">
        <button className="copy-code-btn" onClick={() => copyToClipboard(code)}>
          <FiCode /> Copy
        </button>
        <pre>
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );

  const ApiEndpoint = ({
    method,
    path,
    auth,
    description,
    params,
    body,
    response,
  }) => (
    <div className="api-endpoint">
      <div className="endpoint-header">
        <span className={`method-badge method-${method.toLowerCase()}`}>
          {method}
        </span>
        <code className="endpoint-path">{path}</code>
        {auth && <span className="auth-badge">{auth}</span>}
      </div>
      {description && <p className="endpoint-description">{description}</p>}
      {params && (
        <div className="endpoint-section">
          <h4>Query Parameters</h4>
          <div className="params-table-wrapper">
            <table className="params-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {params.map((param, idx) => (
                  <tr key={idx}>
                    <td>
                      <code>{param.name}</code>
                    </td>
                    <td>
                      <span className="type-badge">{param.type}</span>
                    </td>
                    <td>
                      {param.required ? (
                        <FiCheckCircle className="required" />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {body && (
        <div className="endpoint-section">
          <h4>Request Body</h4>
          <CodeBlock code={JSON.stringify(body, null, 2)} language="json" />
        </div>
      )}
      {response && (
        <div className="endpoint-section">
          <h4>Response</h4>
          <CodeBlock code={JSON.stringify(response, null, 2)} language="json" />
        </div>
      )}
    </div>
  );

  const sections = [
    { id: "getting-started", label: "Getting Started", icon: <FiBook /> },
    { id: "authentication", label: "Authentication", icon: <FiKey /> },
    { id: "payment-apis", label: "Payment APIs", icon: <FiSend /> },
    { id: "dashboard-apis", label: "Dashboard APIs", icon: <FiLink /> },
    { id: "webhooks", label: "Webhooks", icon: <FiGlobe /> },
    { id: "reports", label: "Reports", icon: <FiFileText /> },
    { id: "api-key-management", label: "API Key Management", icon: <FiKey /> },
    { id: "examples", label: "Code Examples", icon: <FiCode /> },
    { id: "best-practices", label: "Best Practices", icon: <FiCheckCircle /> },
  ];

  return (
    <div className="min-h-screen bg-[#001D22] relative">
      {/* Background Image */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <img
          src="/bgdashboard.png"
          alt="Background"
          className="object-cover w-full h-full opacity-10"
          style={{
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
      </div>

      <Navbar />

      {/* Scrollable Content Section */}
      <section className="relative z-10 min-h-screen bg-transparent">
        <div className="bg-transparent pt-20 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1600px] mx-auto">
            {/* Main Content Container */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              {/* Mobile Menu Button */}
              <button
                data-mobile-menu-button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden fixed top-20 left-4 z-50 p-2.5 sm:p-3 bg-[#122D32] border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all duration-200 shadow-lg backdrop-blur-sm"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? (
                  <FiX className="text-lg sm:text-xl" />
                ) : (
                  <FiMenu className="text-lg sm:text-xl" />
                )}
              </button>

              {/* Mobile Menu Overlay */}
              {showMobileMenu && (
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] lg:hidden"
                  onClick={() => setShowMobileMenu(false)}
                ></div>
              )}

              {/* Sidebar */}
              <aside
                ref={mobileMenuRef}
                className={`w-full max-w-[85vw] sm:max-w-sm lg:w-72 xl:w-80 flex-shrink-0 ${
                  showMobileMenu
                    ? "fixed left-0 top-16 bottom-0 z-[999] transform transition-transform duration-300 ease-in-out"
                    : "hidden lg:block lg:fixed lg:left-4 lg:top-20 lg:bottom-4 lg:z-40"
                }`}
              >
                <div className="bg-[#122D32] border border-white/10 rounded-xl p-3 sm:p-4 h-full overflow-y-auto lg:max-h-[calc(100vh-5rem)] shadow-lg backdrop-blur-sm">
                  <nav className="flex flex-col gap-1.5 sm:gap-2">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        className={`flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium text-xs sm:text-sm font-['Albert_Sans'] transition-all duration-200 ${
                          activeSection === section.id
                            ? "bg-white text-[#001D22] shadow-md font-semibold"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        }`}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <span className="text-lg sm:text-xl flex-shrink-0">
                          {section.icon}
                        </span>
                        <span className="truncate">{section.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Content */}
              <div className="flex-1 min-w-0 w-full lg:ml-[328px] xl:ml-[360px]">
                <div className="docs-content bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6 lg:p-8 shadow-lg backdrop-blur-sm">
                  {/* Getting Started */}
                  {activeSection === "getting-started" && (
                    <section className="docs-section">
                      <h2>Getting Started</h2>
                      <p>
                        Welcome to the NinexGroup Payment API documentation.
                        This guide will help you integrate our payment solutions
                        into your website or application.
                      </p>

                      <div className="info-card">
                        <h3>
                          <FiKey /> Step 1: Get Your API Key
                        </h3>
                        <p>
                          First, you need to create an API key from your
                          dashboard:
                        </p>
                        <ol>
                          <li>Log in to your merchant dashboard</li>
                          <li>Navigate to the Dashboard section</li>
                          <li>
                            Click on "Create New API Key" or "Get API Key"
                          </li>
                          <li>Copy your API key and store it securely</li>
                        </ol>
                        {apiKey && (
                          <div className="api-key-display">
                            <label>Your API Key:</label>
                            <div className="api-key-box">
                              <code>{apiKey}</code>
                              <button
                                onClick={() => copyToClipboard(apiKey)}
                                className="copy-btn"
                              >
                                <FiCode /> Copy
                              </button>
                            </div>
                            <p className="warning-text">
                              ⚠️ Keep this key secure and never expose it in
                              client-side code
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiGlobe /> Step 2: Base URL
                        </h3>
                        <p>All API requests should be made to:</p>
                        <div className="code-blocks-container">
                          <CodeBlock code={BASE_URL} />
                        </div>
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiCode /> Step 3: Choose Your Integration Method
                        </h3>
                        <p>You can integrate using:</p>
                        <ul>
                          <li>
                            <strong>REST API:</strong> Direct HTTP requests to
                            our endpoints
                          </li>
                          <li>
                            <strong>Webhooks:</strong> Real-time notifications
                            for payment events
                          </li>
                          <li>
                            <strong>Payment Links:</strong> Pre-built payment
                            pages you can redirect customers to
                          </li>
                        </ul>
                      </div>

                      <div className="info-card success">
                        <h3>
                          <FiCheckCircle /> Quick Test
                        </h3>
                        <p>Test your API key with a simple status check:</p>
                        <div className="code-blocks-container">
                          <CodeBlock
                            title="cURL Example"
                            code={`curl -X GET "${BASE_URL}/payments/status/YOUR_ORDER_ID" \\
  -H "x-api-key: YOUR_API_KEY"`}
                            language="bash"
                          />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Authentication */}
                  {activeSection === "authentication" && (
                    <section className="docs-section">
                      <h2>Authentication</h2>
                      <p>
                        Our API supports two authentication methods depending on
                        the endpoint:
                      </p>

                      <div className="info-card">
                        <h3>1. API Key Authentication</h3>
                        <p>
                          Used for payment-related APIs. Include your API key in
                          the request header:
                        </p>
                        <div className="code-blocks-container">
                          <CodeBlock
                            code={`headers: {
  "x-api-key": "YOUR_API_KEY"
}`}
                          />
                        </div>
                        <p className="note">
                          Required for: Payment links, payment status,
                          transactions listing
                        </p>

                        <div
                          className="warning-card"
                          style={{
                            marginTop: "16px",
                            padding: "16px",
                            background: "#fffbeb",
                            border: "1px solid #fbbf24",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 8px 0",
                              color: "#92400e",
                              fontSize: "14px",
                              fontWeight: 600,
                            }}
                          >
                            <FiAlertCircle style={{ marginRight: "6px" }} />
                            ⚠️ Important
                          </h4>
                          <ul
                            style={{
                              margin: "8px 0 0 0",
                              paddingLeft: "20px",
                              color: "#78350f",
                              fontSize: "13px",
                            }}
                          >
                            <li>
                              API key is extracted from the{" "}
                              <code>x-api-key</code> header
                            </li>
                            <li>Always use HTTPS when making API requests</li>
                            <li>
                              Never expose your API key in client-side
                              JavaScript
                            </li>
                            <li>
                              Store API keys in environment variables or secure
                              server-side storage
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="info-card">
                        <h3>2. JWT Token Authentication</h3>
                        <p>
                          Used for dashboard and webhook configuration APIs. Get
                          your token by logging in:
                        </p>

                        <div
                          className="code-blocks-container"
                          style={{ marginTop: "24px" }}
                        >
                          <CodeBlock
                            title="Login Request"
                            code={`POST ${BASE_URL}/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}`}
                            language="http"
                          />
                          <CodeBlock
                            title="Response"
                            code={`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "Merchant Name",
    "email": "merchant@example.com",
    "role": "admin"
  }
}`}
                            language="json"
                          />
                          <CodeBlock
                            title="Using the Token (Preferred Method)"
                            code={`headers: {
  "X-Auth-Token": "YOUR_JWT_TOKEN"
}`}
                          />
                          <CodeBlock
                            title="Alternative Method (Also Supported)"
                            code={`headers: {
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}`}
                          />
                        </div>

                        <p className="note" style={{ marginTop: "24px" }}>
                          Required for: Dashboard APIs, webhook configuration,
                          balance, payouts, reports
                        </p>
                      </div>

                      <div className="warning-card">
                        <h3>
                          <FiAlertCircle /> Security Best Practices
                        </h3>
                        <ul>
                          <li>
                            Never expose your API key in client-side JavaScript
                            code
                          </li>
                          <li>
                            Store API keys securely in environment variables
                          </li>
                          <li>
                            Rotate your API key regularly from the dashboard
                          </li>
                          <li>Use HTTPS for all API requests</li>
                          <li>Validate webhook signatures before processing</li>
                        </ul>
                      </div>
                    </section>
                  )}

                  {/* Payment APIs */}
                  {activeSection === "payment-apis" && (
                    <section className="docs-section">
                      <h2>Payment APIs</h2>
                      <p>
                        These APIs allow you to create payment links, check
                        payment status, and retrieve transactions. All require
                        API Key authentication via <code>x-api-key</code>{" "}
                        header.
                      </p>

                      <div
                        className="warning-card"
                        style={{ marginBottom: "24px" }}
                      >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                          <FiAlertCircle /> Authentication Required
                        </h3>
                        <p style={{ margin: 0, fontSize: "14px" }}>
                          All payment APIs require the <code>x-api-key</code>{" "}
                          header. Without a valid API key, you will receive a
                          401 Unauthorized response.
                        </p>
                      </div>

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/razorpay/create-payment-link`}
                        auth="API Key (x-api-key)"
                        description="Creates a PhonePe payment link with deep links (UPI, GPay) that customers can use to make payments. Returns multiple deep link formats for better customer experience."
                        body={{
                          amount: 1000,
                          customer_name: "John Doe",
                          customer_email: "john@example.com",
                          customer_phone: "9876543210",
                          description: "Payment for order #123",
                          callback_url: "https://yoursite.com/callback",
                          success_url: "https://yoursite.com/success",
                          failure_url: "https://yoursite.com/failure",
                        }}
                        response={{
                          success: true,
                          transaction_id: "TXN_1705312345678_abc123",
                          payment_link_id: "REF_1705312345678",
                          payment_url:
                            "https://mercury-uat.phonepe.com/transact/...",
                          order_amount: 1000,
                          order_currency: "INR",
                          merchant_id: "68e757305a9692e03a4b816d",
                          merchant_name: "Your Merchant Name",
                          callback_url: "https://yoursite.com/callback",
                          message:
                            "Payment link created successfully. Share this URL with the customer.",
                          checkout_url:
                            "https://mercury-uat.phonepe.com/transact/...",
                          // phonepe_deep_link: "phonepe://pay?pa=...&am=...",
                          // gpay_deep_link: "tez://pay?pa=...&pn=...",
                          // gpay_intent: "upi://pay?pa=...&pn=...",
                          // upi_deep_link: "upi://pay?pa=...&pn=..."
                        }}
                      />

                      <div
                        className="info-card"
                        style={{ marginTop: "24px", marginBottom: "24px" }}
                      >
                        <h4>Request Body Parameters</h4>
                        <div className="params-table-wrapper">
                          <table className="params-table">
                            <thead>
                              <tr>
                                <th>Parameter</th>
                                <th>Type</th>
                                <th>Required</th>
                                <th>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <code>amount</code>
                                </td>
                                <td>
                                  <span className="type-badge">number</span>
                                </td>
                                <td>
                                  <FiCheckCircle className="required" />
                                </td>
                                <td>Payment amount in ₹ (minimum ₹1)</td>
                              </tr>
                              <tr>
                                <td>
                                  <code>customer_name</code>
                                </td>
                                <td>
                                  <span className="type-badge">string</span>
                                </td>
                                <td>
                                  <FiCheckCircle className="required" />
                                </td>
                                <td>Customer's full name</td>
                              </tr>
                              <tr>
                                <td>
                                  <code>customer_email</code>
                                </td>
                                <td>
                                  <span className="type-badge">string</span>
                                </td>
                                <td>
                                  <FiCheckCircle className="required" />
                                </td>
                                <td>Valid email address</td>
                              </tr>
                              <tr>
                                <td>
                                  <code>customer_phone</code>
                                </td>
                                <td>
                                  <span className="type-badge">string</span>
                                </td>
                                <td>
                                  <FiCheckCircle className="required" />
                                </td>
                                <td>
                                  10-digit phone number (without country code)
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <code>description</code>
                                </td>
                                <td>
                                  <span className="type-badge">string</span>
                                </td>
                                <td>-</td>
                                <td>Payment description (optional)</td>
                              </tr>
                              <tr>
                                <td>
                                  <code>callback_url</code>
                                </td>
                                <td>
                                  <span className="type-badge">string</span>
                                </td>
                                <td>-</td>
                                <td>
                                  Callback URL after payment (optional, uses
                                  merchant default if not provided)
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <code>success_url</code>
                                </td>
                                <td>
                                  <span className="type-badge">string</span>
                                </td>
                                <td>-</td>
                                <td>
                                  Redirect URL on successful payment (optional)
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <code>failure_url</code>
                                </td>
                                <td>
                                  <span className="type-badge">string</span>
                                </td>
                                <td>-</td>
                                <td>
                                  Redirect URL on failed payment (optional)
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div
                        className="info-card"
                        style={{ marginBottom: "24px" }}
                      >
                        <h4>Error Responses</h4>
                        <CodeBlock
                          title="400 Bad Request - Missing Fields"
                          code={`{
  "success": false,
  "error": "Missing required fields: amount, customer_name, customer_email, customer_phone"
}`}
                          language="json"
                        />
                        <CodeBlock
                          title="400 Bad Request - Invalid Phone"
                          code={`{
  "success": false,
  "error": "Invalid phone number. Must be 10 digits."
}`}
                          language="json"
                        />
                        <CodeBlock
                          title="400 Bad Request - Invalid Amount"
                          code={`{
  "success": false,
  "error": "Amount must be at least ₹1"
}`}
                          language="json"
                        />
                        <CodeBlock
                          title="401 Unauthorized - Invalid API Key"
                          code={`{
  "success": false,
  "error": "Invalid API key. Please check your credentials."
}`}
                          language="json"
                        />
                        <CodeBlock
                          title="500 Internal Server Error"
                          code={`{
  "success": false,
  "error": "Failed to create payment link",
  "details": { ... }
}`}
                          language="json"
                        />
                      </div>

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/status/:orderId`}
                        auth="API Key (x-api-key)"
                        description="Get the current status and full details of a payment by order ID or payment link ID."
                        params={[
                          {
                            name: "orderId",
                            type: "string (path)",
                            required: true,
                            description:
                              "The order ID or payment link ID returned when creating the payment link",
                          },
                        ]}
                        response={{
                          success: true,
                          transaction: {
                            transaction_id: "TXN_1705312345678_abc123",
                            order_id: "REF_1705312345678",
                            payment_gateway: "phonepe",
                            utr: "123456789012",
                            razorpay_payment_link_id: null,
                            razorpay_payment_id: null,
                            amount: 1000,
                            currency: "INR",
                            status: "paid",
                            payment_method: "upi",
                            customer: {
                              customer_id: "CUST_9876543210_1705312345678",
                              customer_name: "John Doe",
                              customer_email: "john@example.com",
                              customer_phone: "9876543210",
                            },
                            created_at: "2024-01-15T10:00:00.000Z",
                            paid_at: "2024-01-15T10:05:00.000Z",
                            updated_at: "2024-01-15T10:05:00.000Z",
                            description: "Payment for order #123",
                            failure_reason: null,
                            refund_amount: 0,
                            refund_reason: null,
                          },
                          merchant: {
                            merchant_id: "68e757305a9692e03a4b816d",
                            merchant_name: "Your Merchant Name",
                          },
                        }}
                      />

                      <div className="info-card" style={{ marginTop: "16px" }}>
                        <h4>Status Values</h4>
                        <ul>
                          <li>
                            <code>created</code> - Payment link created, waiting
                            for customer
                          </li>
                          <li>
                            <code>pending</code> - Payment initiated, awaiting
                            confirmation
                          </li>
                          <li>
                            <code>paid</code> - Payment successfully completed
                          </li>
                          <li>
                            <code>failed</code> - Payment failed
                          </li>
                          <li>
                            <code>cancelled</code> - Payment cancelled by
                            customer
                          </li>
                          <li>
                            <code>expired</code> - Payment link expired
                          </li>
                          <li>
                            <code>refunded</code> - Payment refunded
                          </li>
                        </ul>
                      </div>

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/transactions`}
                        auth="API Key (x-api-key)"
                        description="Retrieve a paginated list of all transactions with optional filtering. Supports search across multiple fields."
                        params={[
                          {
                            name: "page",
                            type: "number",
                            required: false,
                            description: "Page number (default: 1)",
                          },
                          {
                            name: "limit",
                            type: "number",
                            required: false,
                            description:
                              "Items per page (default: 20, max: 100)",
                          },
                          {
                            name: "status",
                            type: "string",
                            required: false,
                            description:
                              'Filter by status: paid, pending, failed, cancelled, created, expired. Supports comma-separated values: "paid,pending"',
                          },
                          {
                            name: "payment_gateway",
                            type: "string",
                            required: false,
                            description:
                              "Filter by gateway: razorpay, cashfree, phonepe",
                          },
                          {
                            name: "payment_method",
                            type: "string",
                            required: false,
                            description:
                              "Filter by method: upi, card, netbanking, wallet",
                          },
                          {
                            name: "start_date",
                            type: "string",
                            required: false,
                            description: "Start date (YYYY-MM-DD)",
                          },
                          {
                            name: "end_date",
                            type: "string",
                            required: false,
                            description: "End date (YYYY-MM-DD)",
                          },
                          {
                            name: "search",
                            type: "string",
                            required: false,
                            description:
                              "Global search across transactionId, orderId, customerName, customerEmail, customerPhone, description",
                          },
                          {
                            name: "sort_by",
                            type: "string",
                            required: false,
                            description:
                              "Sort field: createdAt, amount, paidAt (default: createdAt)",
                          },
                          {
                            name: "sort_order",
                            type: "string",
                            required: false,
                            description:
                              "Sort order: asc, desc (default: desc)",
                          },
                        ]}
                        response={{
                          success: true,
                          transactions: [
                            {
                              transaction_id: "TXN_1705312345678_abc123",
                              order_id: "REF_1705312345678",
                              payment_gateway: "phonepe",
                              razorpay_payment_link_id: null,
                              razorpay_payment_id: null,
                              utr: "123456789012",
                              bank_transaction_id: null,
                              amount: 1000,
                              currency: "INR",
                              status: "paid",
                              payment_method: "upi",
                              customer_name: "John Doe",
                              customer_email: "john@example.com",
                              customer_phone: "9876543210",
                              created_at: "2024-01-15T10:00:00.000Z",
                              paid_at: "2024-01-15T10:05:00.000Z",
                              description: "Payment for order #123",
                              failure_reason: null,
                              settlement_status: "settled",
                              expected_settlement_date:
                                "2024-01-16T10:05:00.000Z",
                              settlement_date: "2024-01-16T10:05:00.000Z",
                            },
                          ],
                          pagination: {
                            current_page: 1,
                            total_pages: 5,
                            total_count: 100,
                            limit: 20,
                            has_next_page: true,
                            has_prev_page: false,
                          },
                          summary: {
                            total_transactions: 100,
                            successful_transactions: 85,
                            pending_transactions: 10,
                            failed_transactions: 5,
                            cancelled_transactions: 0,
                            expired_transactions: 0,
                            total_revenue: "85000.00",
                            total_refunded: "500.00",
                            pending_amount: "10000.00",
                            net_revenue: "84500.00",
                            razorpay_transactions: 50,
                            razorpay_revenue: "45000.00",
                            cashfree_transactions: 0,
                            cashfree_revenue: "0.00",
                          },
                          merchant: {
                            merchant_id: "68e757305a9692e03a4b816d",
                            merchant_name: "Your Merchant Name",
                          },
                        }}
                      />
                    </section>
                  )}

                  {/* Dashboard APIs */}
                  {activeSection === "dashboard-apis" && (
                    <section className="docs-section">
                      <h2>Dashboard APIs</h2>
                      <p>
                        These APIs provide access to your account balance,
                        payout management, and transaction details. All require
                        JWT token authentication via <code>x-auth-token</code>{" "}
                        header.
                      </p>

                      <div
                        className="warning-card"
                        style={{ marginBottom: "24px" }}
                      >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                          <FiAlertCircle /> Authentication Required
                        </h3>
                        <p style={{ margin: 0, fontSize: "14px" }}>
                          All dashboard APIs require JWT token authentication.
                          Use <code>x-auth-token</code> header with the token
                          received from login.
                          <strong style={{ color: "#856404" }}>
                            {" "}
                            ⚠️ Important: JWT tokens expire after 7 days.
                          </strong>{" "}
                          You must refresh your token by logging in again before
                          expiration to maintain uninterrupted access.
                        </p>
                      </div>

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/balance`}
                        auth="JWT Token (x-auth-token)"
                        description="Get your complete account balance breakdown including settled/unsettled revenue, commission calculations, payout eligibility, and settlement information."
                        response={{
                          success: true,
                          merchant: {
                            merchantId: "68e757305a9692e03a4b816d",
                            merchantName: "Your Merchant Name",
                            merchantEmail: "merchant@example.com",
                            freePayoutsRemaining: 5,
                          },
                          balance: {
                            settled_revenue: "50000.00",
                            settled_commission: "1900.00",
                            settled_net_revenue: "48100.00",
                            available_balance: "38100.00",
                            totalTodayRevenue: "10000.00",
                            totalPayinCommission: "380.00",
                            unsettled_revenue: "25000.00",
                            unsettled_commission: "950.00",
                            unsettled_net_revenue: "24050.00",
                            total_revenue: "75000.00",
                            total_refunded: "500.00",
                            total_commission: "2850.00",
                            commission_deducted: "2850.00",
                            net_revenue: "72150.00",
                            total_paid_out: "5000.00",
                            pending_payouts: "5000.00",
                            commission_structure: {
                              payin: "3.8%",
                              payout_500_to_1000: "₹30",
                              payout_above_1000: "(1.77%)",
                            },
                          },
                          settlement_info: {
                            settled_transactions: 50,
                            unsettled_transactions: 25,
                            next_settlement: "Settles on 2024-01-16 10:05 AM",
                            next_settlement_date: "2024-01-16T10:05:00.000Z",
                            next_settlement_status: "unsettled",
                            settlement_policy:
                              "T+1 settlement (24 hours after payment)",
                            weekend_policy:
                              "Saturday and Sunday are off. Weekend payments settle on Monday.",
                            settlement_policy2:
                              "T0 Settlement (Weekend policy)",
                            weekend_policy2:
                              "On Saturday, payouts are available from 4 PM to 6 PM. Settlement times are at 4 PM and 2 AM.",
                            settlement_examples: {
                              "Monday payment": "Settles Tuesday (24 hours)",
                              "Tuesday payment": "Settles Wednesday (24 hours)",
                              "Wednesday payment":
                                "Settles Thursday (24 hours)",
                              "Thursday payment": "Settles Friday (24 hours)",
                              "Friday payment": "Settles Monday (skip weekend)",
                              "Saturday payment":
                                "Settles Monday (skip Sunday)",
                              "Sunday payment": "Settles Monday (24+ hours)",
                            },
                          },
                          transaction_summary: {
                            total_transactions: 75,
                            settled_transactions: 50,
                            unsettled_transactions: 25,
                            total_payouts_completed: 5,
                            pending_payout_requests: 1,
                            avg_commission_per_transaction: "38.00",
                          },
                          payout_eligibility: {
                            can_request_payout: true,
                            minimum_payout_amount: 0,
                            maximum_payout_amount: "38100.00",
                            available_for_payout: "38100.00",
                            reason: "Eligible for payout",
                          },
                        }}
                      />

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/payouts`}
                        auth="JWT Token (x-auth-token)"
                        description="Retrieve all your payout requests with filtering and pagination options."
                        params={[
                          {
                            name: "status",
                            type: "string",
                            required: false,
                            description:
                              'Filter by status: requested, pending, processing, completed, rejected, failed, cancelled. Supports comma-separated: "requested,pending"',
                          },
                          {
                            name: "page",
                            type: "number",
                            required: false,
                            description: "Page number (default: 1)",
                          },
                          {
                            name: "limit",
                            type: "number",
                            required: false,
                            description: "Items per page (default: 20)",
                          },
                          {
                            name: "description",
                            type: "string",
                            required: false,
                            description: "Search in payout description",
                          },
                          {
                            name: "sortBy",
                            type: "string",
                            required: false,
                            description:
                              "Sort field: createdAt, amount, requestedAt (default: createdAt)",
                          },
                          {
                            name: "sortOrder",
                            type: "string",
                            required: false,
                            description:
                              "Sort order: asc, desc (default: desc)",
                          },
                        ]}
                        response={{
                          success: true,
                          payouts: [
                            {
                              payoutId: "PAYOUT_REQ_1705312345678_abc123",
                              merchantId: "68e757305a9692e03a4b816d",
                              merchantName: "Your Merchant Name",
                              amount: 10000,
                              commission: 30,
                              commissionType: "flat",
                              commissionBreakdown: {
                                baseAmount: 9970,
                                flatFee: "₹30",
                                totalCommission: 30,
                              },
                              netAmount: 9970,
                              currency: "INR",
                              transferMode: "upi",
                              beneficiaryDetails: {
                                upiId: "merchant@paytm",
                              },
                              status: "completed",
                              description: "Monthly payout",
                              adminNotes: "",
                              utr: "123456789012",
                              requestedBy: "68e757305a9692e03a4b816d",
                              requestedByName: "Your Name",
                              requestedAt: "2024-01-15T10:00:00.000Z",
                              approvedBy: null,
                              approvedByName: null,
                              approvedAt: null,
                              processedBy: "68e757305a9692e03a4b816d",
                              processedByName: "Admin Name",
                              processedAt: "2024-01-15T11:00:00.000Z",
                              completedAt: "2024-01-15T11:00:00.000Z",
                              rejectedBy: null,
                              rejectedByName: null,
                              rejectedAt: null,
                              rejectionReason: null,
                            },
                          ],
                          summary: {
                            total_payout_requests: 10,
                            completed_payouts: 8,
                            pending_payouts: 1,
                            total_completed: "80000.00",
                            total_pending: "10000.00",
                          },
                        }}
                      />

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/payments/merchant/payout/request`}
                        auth="JWT Token (x-auth-token)"
                        description="Request a payout to your bank account or UPI ID. Commission is automatically calculated based on amount and free payouts remaining."
                        body={{
                          amount: 10000,
                          transferMode: "upi",
                          beneficiaryDetails: {
                            upiId: "merchant@paytm",
                          },
                          notes: "Monthly payout",
                          description: "January payout",
                        }}
                        response={{
                          success: true,
                          payoutId: "PAYOUT_REQ_1705312345678_abc123",
                          message: "Payout request submitted successfully",
                          grossAmount: 10030,
                          commission: 30,
                          netAmount: 10000,
                          remainingBalance: "28070.00",
                        }}
                      />

                      <div className="info-card" style={{ marginTop: "16px" }}>
                        <h4>Payout Request Body - Bank Transfer Example</h4>
                        <CodeBlock
                          code={`{
  "amount": 10000,
  "transferMode": "bank_transfer",
  "beneficiaryDetails": {
    "accountHolderName": "John Doe",
    "accountNumber": "1234567890123456",
    "ifscCode": "SBIN0001234",
    "bankName": "State Bank of India",
    "branchName": "Katraj Branch"
  },
  "notes": "Monthly payout",
  "description": "January payout"
}`}
                          language="json"
                        />
                      </div>

                      <div className="info-card" style={{ marginTop: "16px" }}>
                        <h4>Payout Commission Structure</h4>
                        <ul>
                          <li>
                            <strong>Free Payouts:</strong> Each merchant gets 5
                            free payouts for amounts under ₹500
                          </li>
                          <li>
                            <strong>Under ₹500:</strong> ₹10 flat fee (when free
                            payouts exhausted)
                          </li>
                          <li>
                            <strong>₹500 - ₹1000:</strong> ₹35.40 flat fee (₹30
                            + 18% GST)
                          </li>
                          <li>
                            <strong>Above ₹1000:</strong> 1.77% commission
                          </li>
                        </ul>
                      </div>

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/transactions/:transactionId`}
                        auth="JWT Token (x-auth-token)"
                        description="Get detailed information about a specific transaction by transaction ID."
                        params={[
                          {
                            name: "transactionId",
                            type: "string (path)",
                            required: true,
                            description:
                              "The transaction ID (e.g., TXN_1705312345678_abc123)",
                          },
                        ]}
                        response={{
                          success: true,
                          transaction: {
                            transactionId: "TXN_1705312345678_abc123",
                            orderId: "REF_1705312345678",
                            merchantId: "68e757305a9692e03a4b816d",
                            merchantName: "Your Merchant Name",
                            customerId: "CUST_9876543210_1705312345678",
                            customerName: "John Doe",
                            customerEmail: "john@example.com",
                            customerPhone: "9876543210",
                            amount: 1000,
                            commission: 38,
                            netAmount: 962,
                            currency: "INR",
                            status: "paid",
                            paymentMethod: "upi",
                            paymentGateway: "phonepe",
                            description: "Payment for order #123",
                            createdAt: "2024-01-15T10:00:00.000Z",
                            paidAt: "2024-01-15T10:05:00.000Z",
                            updatedAt: "2024-01-15T10:05:00.000Z",
                            settlementStatus: "settled",
                            expectedSettlementDate: "2024-01-16T10:05:00.000Z",
                            settlementDate: "2024-01-16T10:05:00.000Z",
                            acquirerData: {
                              utr: "123456789012",
                              rrn: null,
                              bank_transaction_id: null,
                              vpa: "customer@upi",
                            },
                          },
                        }}
                      />

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/payout/:payoutId/status`}
                        auth="JWT Token (x-auth-token)"
                        description="Get the status and details of a specific payout request."
                        params={[
                          {
                            name: "payoutId",
                            type: "string (path)",
                            required: true,
                            description:
                              "The payout ID (e.g., PAYOUT_REQ_1705312345678_abc123)",
                          },
                        ]}
                        response={{
                          success: true,
                          payoutId: "PAYOUT_REQ_1705312345678_abc123",
                          status: "completed",
                          amount: 10000,
                          netAmount: 9970,
                          requestedAt: "2024-01-15T10:00:00.000Z",
                          approvedAt: "2024-01-15T10:30:00.000Z",
                          completedAt: "2024-01-15T11:00:00.000Z",
                          rejectionReason: null,
                          utr: "123456789012",
                          adminNotes: "Processed successfully",
                        }}
                      />

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/payments/merchant/payout/:payoutId/cancel`}
                        auth="JWT Token (x-auth-token)"
                        description="Cancel a payout request. Only payouts with status 'requested' can be cancelled."
                        params={[
                          {
                            name: "payoutId",
                            type: "string (path)",
                            required: true,
                            description: "The payout ID to cancel",
                          },
                        ]}
                        body={{
                          reason: "Changed my mind",
                        }}
                        response={{
                          success: true,
                          message: "Payout request cancelled successfully",
                          payoutId: "PAYOUT_REQ_1705312345678_abc123",
                        }}
                      />

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/transactions/search`}
                        auth="JWT Token (x-auth-token)"
                        description="Advanced search for transactions with multiple filter options and global text search."
                        params={[
                          {
                            name: "minAmount",
                            type: "number",
                            required: false,
                            description: "Minimum transaction amount",
                          },
                          {
                            name: "maxAmount",
                            type: "number",
                            required: false,
                            description: "Maximum transaction amount",
                          },
                          {
                            name: "startDate",
                            type: "string",
                            required: false,
                            description:
                              "Start date (YYYY-MM-DD or ISO format)",
                          },
                          {
                            name: "endDate",
                            type: "string",
                            required: false,
                            description: "End date (YYYY-MM-DD or ISO format)",
                          },
                          {
                            name: "status",
                            type: "string",
                            required: false,
                            description:
                              "Transaction status: paid, pending, failed, cancelled",
                          },
                          {
                            name: "paymentGateway",
                            type: "string",
                            required: false,
                            description: "Gateway: razorpay, cashfree, phonepe",
                          },
                          {
                            name: "paymentMethod",
                            type: "string",
                            required: false,
                            description:
                              "Method: upi, card, netbanking, wallet",
                          },
                          {
                            name: "transactionId",
                            type: "string",
                            required: false,
                            description: "Exact transaction ID match",
                          },
                          {
                            name: "orderId",
                            type: "string",
                            required: false,
                            description: "Exact order ID match",
                          },
                          {
                            name: "customerName",
                            type: "string",
                            required: false,
                            description: "Customer name (partial match)",
                          },
                          {
                            name: "customerEmail",
                            type: "string",
                            required: false,
                            description: "Customer email (partial match)",
                          },
                          {
                            name: "customerPhone",
                            type: "string",
                            required: false,
                            description: "Customer phone number",
                          },
                          {
                            name: "search",
                            type: "string",
                            required: false,
                            description:
                              "Global search across transactionId, orderId, description, customerName, customerEmail, customerPhone",
                          },
                          {
                            name: "page",
                            type: "number",
                            required: false,
                            description: "Page number (default: 1)",
                          },
                          {
                            name: "limit",
                            type: "number",
                            required: false,
                            description: "Items per page (default: 20)",
                          },
                          {
                            name: "sortBy",
                            type: "string",
                            required: false,
                            description:
                              "Sort field: createdAt, amount (default: createdAt)",
                          },
                          {
                            name: "sortOrder",
                            type: "string",
                            required: false,
                            description:
                              "Sort order: asc, desc (default: desc)",
                          },
                        ]}
                        response={{
                          success: true,
                          transactions: [
                            {
                              transactionId: "TXN_1705312345678_abc123",
                              orderId: "REF_1705312345678",
                              amount: 1000,
                              status: "paid",
                              paymentMethod: "upi",
                              paymentGateway: "phonepe",
                              createdAt: "2024-01-15T10:00:00.000Z",
                            },
                          ],
                          pagination: {
                            currentPage: 1,
                            totalPages: 5,
                            totalCount: 100,
                            limit: 20,
                            hasNextPage: true,
                            hasPrevPage: false,
                          },
                        }}
                      />

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/payouts/search`}
                        auth="JWT Token (x-auth-token)"
                        description="Advanced search for payouts with multiple filter options and global text search."
                        params={[
                          {
                            name: "payoutId",
                            type: "string",
                            required: false,
                            description: "Exact payout ID match",
                          },
                          {
                            name: "minAmount",
                            type: "number",
                            required: false,
                            description:
                              "Minimum net amount (after commission)",
                          },
                          {
                            name: "maxAmount",
                            type: "number",
                            required: false,
                            description:
                              "Maximum net amount (after commission)",
                          },
                          {
                            name: "status",
                            type: "string",
                            required: false,
                            description:
                              "Payout status: requested, pending, processing, completed, rejected, failed",
                          },
                          {
                            name: "startDate",
                            type: "string",
                            required: false,
                            description:
                              "Start date (YYYY-MM-DD or ISO format)",
                          },
                          {
                            name: "endDate",
                            type: "string",
                            required: false,
                            description: "End date (YYYY-MM-DD or ISO format)",
                          },
                          {
                            name: "description",
                            type: "string",
                            required: false,
                            description: "Search in payout description",
                          },
                          {
                            name: "beneficiaryName",
                            type: "string",
                            required: false,
                            description: "Beneficiary account holder name",
                          },
                          {
                            name: "notes",
                            type: "string",
                            required: false,
                            description: "Search in admin notes",
                          },
                          {
                            name: "search",
                            type: "string",
                            required: false,
                            description:
                              "Global search across payoutId, merchantName, description, adminNotes, beneficiaryName, UPI ID, UTR",
                          },
                          {
                            name: "page",
                            type: "number",
                            required: false,
                            description: "Page number (default: 1)",
                          },
                          {
                            name: "limit",
                            type: "number",
                            required: false,
                            description: "Items per page (default: 20)",
                          },
                          {
                            name: "sortBy",
                            type: "string",
                            required: false,
                            description:
                              "Sort field: createdAt, amount, netAmount, requestedAt (default: createdAt)",
                          },
                          {
                            name: "sortOrder",
                            type: "string",
                            required: false,
                            description:
                              "Sort order: asc, desc (default: desc)",
                          },
                        ]}
                        response={{
                          success: true,
                          payouts: [
                            {
                              payoutId: "PAYOUT_REQ_1705312345678_abc123",
                              amount: 10000,
                              netAmount: 9970,
                              status: "completed",
                              requestedAt: "2024-01-15T10:00:00.000Z",
                            },
                          ],
                          pagination: {
                            currentPage: 1,
                            totalPages: 3,
                            totalCount: 50,
                            limit: 20,
                            hasNextPage: true,
                            hasPrevPage: false,
                          },
                        }}
                      />
                    </section>
                  )}

                  {/* Webhooks */}
                  {activeSection === "webhooks" && (
                    <section className="docs-section">
                      <h2>Webhooks</h2>
                      <p>
                        Webhooks allow you to receive real-time notifications
                        about payment and payout events. Configure your webhook
                        URL and subscribe to specific events. All webhook APIs
                        require JWT token authentication via{" "}
                        <code>x-auth-token</code> header.
                      </p>

                      <div
                        className="warning-card"
                        style={{ marginBottom: "24px" }}
                      >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                          <FiAlertCircle /> Authentication Required
                        </h3>
                        <p style={{ margin: 0, fontSize: "14px" }}>
                          All webhook configuration APIs require JWT token
                          authentication. Use <code>x-auth-token</code> header
                          with your login token.
                        </p>
                      </div>

                      <div className="info-card">
                        <h3>Payment Webhook Events</h3>
                        <p>
                          Subscribe to receive notifications for payment-related
                          events:
                        </p>
                        <ul>
                          <li>
                            <code>payment.created</code> - New payment link
                            created
                          </li>
                          <li>
                            <code>payment.paid</code> - Payment successfully
                            completed
                          </li>
                          <li>
                            <code>payment.failed</code> - Payment failed
                          </li>
                          <li>
                            <code>payment.cancelled</code> - Payment cancelled
                            by customer
                          </li>
                          <li>
                            <code>payment.refunded</code> - Payment refunded
                          </li>
                          <li>
                            <code>payment.pending</code> - Payment pending
                            confirmation
                          </li>
                        </ul>
                      </div>

                      <div className="info-card">
                        <h3>Payout Webhook Events</h3>
                        <p>
                          Subscribe to receive notifications for payout-related
                          events:
                        </p>
                        <ul>
                          <li>
                            <code>payout.requested</code> - Payout request
                            created by merchant
                          </li>
                          <li>
                            <code>payout.pending</code> - Payout approved and
                            pending processing
                          </li>
                          <li>
                            <code>payout.completed</code> - Payout processed
                            successfully
                          </li>
                          <li>
                            <code>payout.rejected</code> - Payout rejected by
                            admin
                          </li>
                          <li>
                            <code>payout.failed</code> - Payout processing
                            failed
                          </li>
                        </ul>
                      </div>

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/payments/merchant/webhook/configure`}
                        auth="JWT Token (x-auth-token)"
                        description="Configure your payment webhook URL and subscribe to payment events. A webhook secret will be automatically generated for signature verification."
                        body={{
                          webhook_url:
                            "https://yoursite.com/api/webhooks/payment",
                          events: [
                            "payment.paid",
                            "payment.failed",
                            "payment.refunded",
                            "payment.created",
                            "payment.cancelled",
                          ],
                        }}
                        response={{
                          success: true,
                          message: "Webhook configuration saved successfully",
                          webhook_url:
                            "https://yoursite.com/api/webhooks/payment",
                          webhook_secret: "whsec_a1b2c3d4e5f6...",
                          webhook_enabled: true,
                          webhook_events: [
                            "payment.paid",
                            "payment.failed",
                            "payment.refunded",
                            "payment.created",
                            "payment.cancelled",
                          ],
                          webhook_retries: 3,
                        }}
                      />

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/webhook/config`}
                        auth="JWT Token (x-auth-token)"
                        description="Get your current payment webhook configuration including URL, events, and secret."
                        response={{
                          success: true,
                          webhook_url:
                            "https://yoursite.com/api/webhooks/payment",
                          webhook_secret: "whsec_a1b2c3d4e5f6...",
                          webhook_enabled: true,
                          webhook_events: ["payment.paid", "payment.failed"],
                          webhook_retries: 3,
                          success_url: "https://yoursite.com/success",
                          failure_url: "https://yoursite.com/failure",
                        }}
                      />

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/payments/merchant/webhook/test`}
                        auth="JWT Token (x-auth-token)"
                        description="Send a test webhook to your configured webhook URL to verify your endpoint is working correctly."
                        response={{
                          success: true,
                          message: "Test webhook sent successfully",
                          status: 200,
                          response: "Webhook received successfully",
                        }}
                      />

                      <ApiEndpoint
                        method="DELETE"
                        path={`${BASE_URL}/payments/merchant/webhook`}
                        auth="JWT Token (x-auth-token)"
                        description="Delete your payment webhook configuration. This will disable webhook notifications for payment events."
                        response={{
                          success: true,
                          message: "Webhook configuration deleted successfully",
                        }}
                      />

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/payments/merchant/webhook/payout/configure`}
                        auth="JWT Token (x-auth-token)"
                        description="Configure your payout webhook URL and subscribe to payout events. A webhook secret will be automatically generated."
                        body={{
                          webhook_url:
                            "https://yoursite.com/api/webhooks/payout",
                          events: [
                            "payout.completed",
                            "payout.failed",
                            "payout.rejected",
                            "payout.requested",
                            "payout.pending",
                          ],
                        }}
                        response={{
                          success: true,
                          message:
                            "Payout webhook configuration saved successfully",
                          webhook_url:
                            "https://yoursite.com/api/webhooks/payout",
                          webhook_secret: "whsec_a1b2c3d4e5f6...",
                          webhook_enabled: true,
                          webhook_events: [
                            "payout.completed",
                            "payout.failed",
                            "payout.rejected",
                          ],
                          webhook_retries: 3,
                        }}
                      />

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/webhook/payout/config`}
                        auth="JWT Token (x-auth-token)"
                        description="Get your current payout webhook configuration."
                        response={{
                          success: true,
                          webhook_url:
                            "https://yoursite.com/api/webhooks/payout",
                          webhook_secret: "whsec_a1b2c3d4e5f6...",
                          webhook_enabled: true,
                          webhook_events: ["payout.completed", "payout.failed"],
                          webhook_retries: 3,
                        }}
                      />

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/payments/merchant/webhook/payout/test`}
                        auth="JWT Token (x-auth-token)"
                        description="Send a test payout webhook to verify your endpoint."
                        response={{
                          success: true,
                          message: "Test payout webhook sent successfully",
                        }}
                      />

                      <ApiEndpoint
                        method="DELETE"
                        path={`${BASE_URL}/payments/merchant/webhook/payout`}
                        auth="JWT Token (x-auth-token)"
                        description="Delete your payout webhook configuration."
                        response={{
                          success: true,
                          message:
                            "Payout webhook configuration deleted successfully",
                        }}
                      />

                      <ApiEndpoint
                        method="PUT"
                        path={`${BASE_URL}/payments/merchant/webhook/payout`}
                        auth="JWT Token (x-auth-token)"
                        description="Update your payout webhook configuration (URL, events, or enabled status)."
                        body={{
                          webhook_url:
                            "https://yoursite.com/api/webhooks/payout",
                          events: ["payout.completed"],
                          enabled: true,
                        }}
                        response={{
                          success: true,
                          message: "Payout webhook updated successfully",
                          webhook_url:
                            "https://yoursite.com/api/webhooks/payout",
                          webhook_enabled: true,
                          webhook_events: ["payout.completed"],
                        }}
                      />

                      <div
                        className="warning-card"
                        style={{ marginTop: "24px" }}
                      >
                        <h3>
                          <FiAlertCircle /> Webhook Security - Critical
                        </h3>
                        <p>
                          <strong>
                            Always verify webhook signatures before processing
                            webhooks:
                          </strong>
                        </p>
                        <CodeBlock
                          title="Node.js Signature Verification"
                          code={`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  // Payload should be the raw request body as string
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in Express
app.post('/api/webhooks/payment', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature']; // or similar header
  const secret = 'your_webhook_secret_from_config';
  
  if (!verifyWebhookSignature(req.body.toString(), signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const payload = JSON.parse(req.body);
  // Process webhook...
});`}
                          language="javascript"
                        />
                        <ul style={{ marginTop: "12px" }}>
                          <li>
                            Never process webhooks without signature
                            verification
                          </li>
                          <li>
                            Use the webhook secret from your configuration
                          </li>
                          <li>
                            Store the secret securely (environment variable)
                          </li>
                          <li>Always use HTTPS for webhook endpoints</li>
                          <li>
                            Implement idempotency checks to prevent duplicate
                            processing
                          </li>
                        </ul>
                      </div>

                      <div className="info-card" style={{ marginTop: "24px" }}>
                        <h3>Payment Webhook Payload Example</h3>
                        <CodeBlock
                          code={`{
  "event": "payment.paid",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transaction_id": "TXN_1705312345678_abc123",
  "order_id": "REF_1705312345678",
  "merchant_id": "68e757305a9692e03a4b816d",
  "data": {
    "transaction_id": "TXN_1705312345678_abc123",
    "order_id": "REF_1705312345678",
    "phonepe_reference_id": "REF_1705312345678",
    "payment_id": "PAY_123456789",
    "amount": 1000,
    "currency": "INR",
    "status": "paid",
    "payment_method": "upi",
    "paid_at": "2024-01-15T10:05:00.000Z",
    "settlement_status": "unsettled",
    "expected_settlement_date": "2024-01-16T10:05:00.000Z",
    "acquirer_data": {
      "utr": "123456789012",
      "rrn": null,
      "bank_transaction_id": null,
      "vpa": "customer@upi"
    },
    "customer": {
      "customer_id": "CUST_9876543210_1705312345678",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "merchant": {
      "merchant_id": "68e757305a9692e03a4b816d",
      "merchant_name": "Your Merchant Name"
    },
    "description": "Payment for order #123",
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T10:05:00.000Z"
  }
}`}
                          language="json"
                        />
                      </div>

                      <div className="info-card" style={{ marginTop: "16px" }}>
                        <h3>Payout Webhook Payload Example</h3>
                        <CodeBlock
                          code={`{
  "event": "payout.completed",
  "timestamp": "2024-01-15T11:00:00.000Z",
  "payout_id": "PAYOUT_REQ_1705312345678_abc123",
  "merchant_id": "68e757305a9692e03a4b816d",
  "data": {
    "payoutId": "PAYOUT_REQ_1705312345678_abc123",
    "amount": 10000,
    "netAmount": 9970,
    "commission": 30,
    "status": "completed",
    "transferMode": "upi",
    "utr": "123456789012",
    "completedAt": "2024-01-15T11:00:00.000Z"
  }
}`}
                          language="json"
                        />
                      </div>

                      <div
                        className="info-card"
                        style={{
                          marginTop: "16px",
                          background: "#eff6ff",
                          borderColor: "#3b82f6",
                        }}
                      >
                        <h4 style={{ color: "#1e40af" }}>
                          Webhook Retry Policy
                        </h4>
                        <ul>
                          <li>
                            Default retry attempts: <strong>3</strong>
                          </li>
                          <li>Retries use exponential backoff</li>
                          <li>
                            Webhooks are retried if your endpoint returns
                            non-2xx status
                          </li>
                          <li>
                            Ensure your endpoint responds with 200 OK quickly
                            (within 5 seconds)
                          </li>
                          <li>
                            Idempotency is critical - same webhook may be sent
                            multiple times
                          </li>
                        </ul>
                      </div>
                    </section>
                  )}

                  {/* Reports */}
                  {activeSection === "reports" && (
                    <section className="docs-section">
                      <h2>Reports</h2>
                      <p>
                        Download detailed transaction and payout reports in
                        Excel (.xlsx) format. All reports require JWT token
                        authentication via <code>x-auth-token</code> header.
                        Reports are streamed directly as file downloads.
                      </p>

                      <div
                        className="warning-card"
                        style={{ marginBottom: "24px" }}
                      >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                          <FiAlertCircle /> Authentication & Response Format
                        </h3>
                        <ul
                          style={{
                            margin: "8px 0 0 0",
                            paddingLeft: "20px",
                            fontSize: "14px",
                          }}
                        >
                          <li>
                            All report APIs require <code>x-auth-token</code>{" "}
                            header
                          </li>
                          <li>
                            Response is a binary Excel file (.xlsx), not JSON
                          </li>
                          <li>
                            Content-Type:{" "}
                            <code>
                              application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
                            </code>
                          </li>
                          <li>
                            File will be downloaded automatically by browser
                          </li>
                          <li>
                            For programmatic access, handle binary response
                            stream
                          </li>
                        </ul>
                      </div>

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/transaction/report`}
                        auth="JWT Token (x-auth-token)"
                        description="Download transaction report as Excel file with comprehensive filtering options. Returns all transaction fields including UTR, settlement status, and commission details."
                        params={[
                          {
                            name: "startDate",
                            type: "string",
                            required: false,
                            description:
                              "Start date (YYYY-MM-DD or ISO format)",
                          },
                          {
                            name: "endDate",
                            type: "string",
                            required: false,
                            description: "End date (YYYY-MM-DD or ISO format)",
                          },
                          {
                            name: "status",
                            type: "string",
                            required: false,
                            description:
                              'Filter by status. Supports comma-separated: "paid,pending,failed"',
                          },
                          {
                            name: "paymentMethod",
                            type: "string",
                            required: false,
                            description:
                              'Filter by payment method. Supports comma-separated: "upi,card"',
                          },
                          {
                            name: "paymentGateway",
                            type: "string",
                            required: false,
                            description:
                              "Filter by gateway: razorpay, cashfree, phonepe",
                          },
                          {
                            name: "minAmount",
                            type: "number",
                            required: false,
                            description: "Minimum transaction amount",
                          },
                          {
                            name: "maxAmount",
                            type: "number",
                            required: false,
                            description: "Maximum transaction amount",
                          },
                          {
                            name: "transactionId",
                            type: "string",
                            required: false,
                            description: "Exact transaction ID match",
                          },
                          {
                            name: "orderId",
                            type: "string",
                            required: false,
                            description: "Exact order ID match",
                          },
                          {
                            name: "customerEmail",
                            type: "string",
                            required: false,
                            description: "Customer email",
                          },
                          {
                            name: "customerPhone",
                            type: "string",
                            required: false,
                            description: "Customer phone number",
                          },
                          {
                            name: "settlementStatus",
                            type: "string",
                            required: false,
                            description:
                              "Settlement status: settled, unsettled",
                          },
                          {
                            name: "q",
                            type: "string",
                            required: false,
                            description:
                              "Global text search across customerName, customerEmail, customerPhone, merchantName, description, UTR, transactionId, orderId",
                          },
                          {
                            name: "sortBy",
                            type: "string",
                            required: false,
                            description:
                              'Sort field and order (format: field:asc|desc). Example: "createdAt:desc" or "amount:asc"',
                          },
                          {
                            name: "limit",
                            type: "number",
                            required: false,
                            description:
                              "Maximum number of records to export (optional, no limit if not specified)",
                          },
                        ]}
                      />

                      <div className="info-card" style={{ marginTop: "16px" }}>
                        <h4>Transaction Report Excel Columns</h4>
                        <p>The Excel file includes the following columns:</p>
                        <ul
                          style={{
                            fontSize: "13px",
                            columnCount: 2,
                            columnGap: "20px",
                          }}
                        >
                          <li>Transaction ID</li>
                          <li>Order ID</li>
                          <li>Merchant ID</li>
                          <li>Merchant Name</li>
                          <li>Customer ID</li>
                          <li>Customer Name</li>
                          <li>Customer Email</li>
                          <li>Customer Phone</li>
                          <li>Amount</li>
                          <li>Commission</li>
                          <li>Net Amount</li>
                          <li>Currency</li>
                          <li>Status</li>
                          <li>Payment Method</li>
                          <li>Payment Gateway</li>
                          <li>UTR</li>
                          <li>RRN</li>
                          <li>Bank Transaction ID</li>
                          <li>Settlement Status</li>
                          <li>Settlement Date</li>
                          <li>Paid At</li>
                          <li>Created At</li>
                          <li>And more...</li>
                        </ul>
                      </div>

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/payout/report`}
                        auth="JWT Token (x-auth-token)"
                        description="Download payout report as Excel file with comprehensive filtering options. Returns all payout details including beneficiary information and timeline."
                        params={[
                          {
                            name: "startDate",
                            type: "string",
                            required: false,
                            description:
                              "Start date (YYYY-MM-DD or ISO format)",
                          },
                          {
                            name: "endDate",
                            type: "string",
                            required: false,
                            description: "End date (YYYY-MM-DD or ISO format)",
                          },
                          {
                            name: "status",
                            type: "string",
                            required: false,
                            description:
                              'Filter by status. Supports comma-separated: "completed,requested"',
                          },
                          {
                            name: "transferMode",
                            type: "string",
                            required: false,
                            description: "Transfer mode: bank_transfer, upi",
                          },
                          {
                            name: "minAmount",
                            type: "number",
                            required: false,
                            description:
                              "Minimum net amount (after commission)",
                          },
                          {
                            name: "maxAmount",
                            type: "number",
                            required: false,
                            description:
                              "Maximum net amount (after commission)",
                          },
                          {
                            name: "payoutId",
                            type: "string",
                            required: false,
                            description: "Exact payout ID match",
                          },
                          {
                            name: "description",
                            type: "string",
                            required: false,
                            description: "Search in payout description",
                          },
                          {
                            name: "beneficiaryName",
                            type: "string",
                            required: false,
                            description: "Beneficiary account holder name",
                          },
                          {
                            name: "q",
                            type: "string",
                            required: false,
                            description:
                              "Global text search across payoutId, merchantName, description, adminNotes, beneficiaryName, UPI ID, UTR",
                          },
                          {
                            name: "sortBy",
                            type: "string",
                            required: false,
                            description:
                              'Sort field and order. Example: "createdAt:desc" or "amount:asc"',
                          },
                          {
                            name: "limit",
                            type: "number",
                            required: false,
                            description:
                              "Maximum number of records to export (optional)",
                          },
                        ]}
                      />

                      <div className="info-card" style={{ marginTop: "16px" }}>
                        <h4>Payout Report Excel Columns</h4>
                        <p>The Excel file includes:</p>
                        <ul style={{ fontSize: "13px", columnCount: 2 }}>
                          <li>Payout ID</li>
                          <li>Merchant ID & Name</li>
                          <li>Amount (Gross)</li>
                          <li>Commission</li>
                          <li>Commission Type</li>
                          <li>Net Amount</li>
                          <li>Transfer Mode</li>
                          <li>
                            Beneficiary Details (Name, Account, IFSC, Bank, UPI)
                          </li>
                          <li>Status</li>
                          <li>Description & Notes</li>
                          <li>UTR</li>
                          <li>Requested/Approved/Processed/Rejected By & At</li>
                          <li>Timeline information</li>
                        </ul>
                      </div>

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/payments/merchant/report/combined`}
                        auth="JWT Token (x-auth-token)"
                        description="Download a combined Excel file with two sheets: 'Transactions' and 'Payouts'. Use prefix parameters: t_* for transaction filters, p_* for payout filters."
                        params={[
                          {
                            name: "t_startDate",
                            type: "string",
                            required: false,
                            description: "Transaction start date",
                          },
                          {
                            name: "t_endDate",
                            type: "string",
                            required: false,
                            description: "Transaction end date",
                          },
                          {
                            name: "t_status",
                            type: "string",
                            required: false,
                            description:
                              "Transaction status filter (comma-separated)",
                          },
                          {
                            name: "t_paymentMethod",
                            type: "string",
                            required: false,
                            description: "Transaction payment method",
                          },
                          {
                            name: "t_paymentGateway",
                            type: "string",
                            required: false,
                            description: "Transaction gateway",
                          },
                          {
                            name: "t_minAmount",
                            type: "number",
                            required: false,
                            description: "Transaction minimum amount",
                          },
                          {
                            name: "t_maxAmount",
                            type: "number",
                            required: false,
                            description: "Transaction maximum amount",
                          },
                          {
                            name: "t_settlementStatus",
                            type: "string",
                            required: false,
                            description: "Transaction settlement status",
                          },
                          {
                            name: "t_q",
                            type: "string",
                            required: false,
                            description: "Transaction global search",
                          },
                          {
                            name: "t_sortBy",
                            type: "string",
                            required: false,
                            description: "Transaction sort (field:asc|desc)",
                          },
                          {
                            name: "t_limit",
                            type: "number",
                            required: false,
                            description: "Transaction limit",
                          },
                          {
                            name: "p_startDate",
                            type: "string",
                            required: false,
                            description: "Payout start date",
                          },
                          {
                            name: "p_endDate",
                            type: "string",
                            required: false,
                            description: "Payout end date",
                          },
                          {
                            name: "p_status",
                            type: "string",
                            required: false,
                            description: "Payout status filter",
                          },
                          {
                            name: "p_transferMode",
                            type: "string",
                            required: false,
                            description: "Payout transfer mode",
                          },
                          {
                            name: "p_minAmount",
                            type: "number",
                            required: false,
                            description: "Payout minimum net amount",
                          },
                          {
                            name: "p_maxAmount",
                            type: "number",
                            required: false,
                            description: "Payout maximum net amount",
                          },
                          {
                            name: "p_q",
                            type: "string",
                            required: false,
                            description: "Payout global search",
                          },
                          {
                            name: "p_sortBy",
                            type: "string",
                            required: false,
                            description: "Payout sort (field:asc|desc)",
                          },
                          {
                            name: "p_limit",
                            type: "number",
                            required: false,
                            description: "Payout limit",
                          },
                        ]}
                      />

                      <div
                        className="info-card success"
                        style={{ marginTop: "24px" }}
                      >
                        <h4>
                          <FiCheckCircle /> Report Download Example
                        </h4>
                        <CodeBlock
                          title="JavaScript - Download Report"
                          code={`// Download transaction report
async function downloadTransactionReport(filters) {
  const token = await getAuthToken(); // Your token retrieval logic
  
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.status) params.append('status', filters.status);
  // Add more filters...
  
  const response = await fetch(
    \`${BASE_URL}/payments/merchant/transaction/report?\${params.toString()}\`,
    {
      method: 'GET',
      headers: {
        'x-auth-token': token
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to download report');
  }
  
  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition 
    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
    : \`transaction_report_\${Date.now()}.xlsx\`;
  
  // Download file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}`}
                          language="javascript"
                        />
                      </div>

                      <div
                        className="warning-card"
                        style={{ marginTop: "16px" }}
                      >
                        <h4>
                          <FiAlertCircle /> Important Notes
                        </h4>
                        <ul>
                          <li>
                            Reports are generated server-side and streamed to
                            client
                          </li>
                          <li>
                            Large reports may take time - implement loading
                            indicators
                          </li>
                          <li>
                            Use filters to limit data size for faster downloads
                          </li>
                          <li>
                            Combined report prefixes: <code>t_</code> for
                            transactions, <code>p_</code> for payouts
                          </li>
                          <li>
                            File name format:{" "}
                            <code>
                              transactions_report_merchantId_timestamp.xlsx
                            </code>
                          </li>
                          <li>
                            Only your merchant's data is included (automatic
                            filtering)
                          </li>
                        </ul>
                      </div>
                    </section>
                  )}

                  {/* API Key Management */}
                  {activeSection === "api-key-management" && (
                    <section className="docs-section">
                      <h2>API Key Management</h2>
                      <p>
                        Manage your API keys for accessing payment APIs. All API
                        key management endpoints require JWT token
                        authentication via <code>x-auth-token</code> header.
                      </p>

                      <div
                        className="warning-card"
                        style={{ marginBottom: "24px" }}
                      >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                          <FiAlertCircle /> Important
                        </h3>
                        <ul
                          style={{
                            margin: "8px 0 0 0",
                            paddingLeft: "20px",
                            fontSize: "14px",
                          }}
                        >
                          <li>
                            Each merchant can have only{" "}
                            <strong>one API key</strong> at a time
                          </li>
                          <li>API keys are permanent unless regenerated</li>
                          <li>
                            Regenerating an API key invalidates the old one
                            immediately
                          </li>
                          <li>
                            Store your API key securely - you cannot retrieve it
                            again after creation
                          </li>
                          <li>
                            If you lose your API key, you must regenerate it
                            (old integrations will break)
                          </li>
                        </ul>
                      </div>

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/api-key/create`}
                        auth="JWT Token (x-auth-token)"
                        description="Create a new API key. If you already have an API key, this will return an error. Use GET /api-key/get to retrieve existing key."
                        response={{
                          success: true,
                          apiKey:
                            "ak_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
                          message: "API key created successfully",
                        }}
                      />

                      <div
                        className="warning-card"
                        style={{ marginTop: "16px" }}
                      >
                        <h4>
                          <FiAlertCircle /> Store Your API Key Immediately
                        </h4>
                        <p>
                          The API key is returned only once during creation.
                          Save it immediately in a secure location. You cannot
                          retrieve it later without regenerating.
                        </p>
                      </div>

                      <ApiEndpoint
                        method="GET"
                        path={`${BASE_URL}/api-key/get`}
                        auth="JWT Token (x-auth-token)"
                        description="Retrieve your existing API key. Returns the API key if one exists."
                        response={{
                          success: true,
                          apiKey:
                            "ak_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
                        }}
                      />

                      <ApiEndpoint
                        method="POST"
                        path={`${BASE_URL}/api-key/regenerate`}
                        auth="JWT Token (x-auth-token)"
                        description="Regenerate your API key. This creates a new API key and immediately invalidates the old one. All integrations using the old key will stop working."
                        response={{
                          success: true,
                          apiKey:
                            "ak_live_new_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
                          message: "API key regenerated successfully",
                        }}
                      />

                      <div
                        className="warning-card"
                        style={{
                          marginTop: "16px",
                          background: "#fef2f2",
                          borderColor: "#fca5a5",
                        }}
                      >
                        <h4 style={{ color: "#991b1b" }}>
                          <FiAlertCircle /> ⚠️ Critical Warning: Regeneration
                        </h4>
                        <ul style={{ marginTop: "8px", color: "#7f1d1d" }}>
                          <li>
                            Regenerating an API key{" "}
                            <strong>immediately invalidates</strong> the old key
                          </li>
                          <li>
                            All active integrations using the old key will{" "}
                            <strong>stop working</strong>
                          </li>
                          <li>
                            You must update all your services with the new key
                            immediately
                          </li>
                          <li>
                            Consider regenerating only if your key is
                            compromised
                          </li>
                        </ul>
                      </div>

                      <ApiEndpoint
                        method="DELETE"
                        path={`${BASE_URL}/api-key/delete`}
                        auth="JWT Token (x-auth-token)"
                        description="Delete your API key. This permanently removes your API key and disables all API access until you create a new one."
                        response={{
                          success: true,
                          message: "API key deleted successfully",
                        }}
                      />

                      <div className="info-card" style={{ marginTop: "24px" }}>
                        <h3>API Key Format</h3>
                        <p>API keys follow this format:</p>
                        <CodeBlock
                          code={`ak_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`}
                        />
                        <ul style={{ marginTop: "12px" }}>
                          <li>
                            Prefix: <code>ak_live_</code>
                          </li>
                          <li>Length: Approximately 64 characters total</li>
                          <li>Characters: Lowercase letters and numbers</li>
                        </ul>
                      </div>

                      <div className="info-card" style={{ marginTop: "16px" }}>
                        <h3>Error Responses</h3>
                        <CodeBlock
                          title="409 Conflict - API Key Already Exists"
                          code={`{
  "success": false,
  "error": "API key already exists. Use GET /api-key/get to retrieve it."
}`}
                          language="json"
                        />
                        <CodeBlock
                          title="404 Not Found - No API Key"
                          code={`{
  "success": false,
  "error": "No API key found. Create one using POST /api-key/create"
}`}
                          language="json"
                        />
                        <CodeBlock
                          title="401 Unauthorized - Invalid Token"
                          code={`{
  "success": false,
  "error": "Token has expired. Please login again."
}`}
                          language="json"
                        />
                      </div>
                    </section>
                  )}

                  {/* Code Examples */}
                  {activeSection === "examples" && (
                    <section className="docs-section">
                      <h2>Code Examples</h2>
                      <p>
                        Complete integration examples in various programming
                        languages.
                      </p>

                      <div
                        className="warning-card"
                        style={{ marginBottom: "24px" }}
                      >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                          <FiAlertCircle /> Important
                        </h3>
                        <p style={{ margin: 0, fontSize: "14px" }}>
                          Replace <code>YOUR_API_KEY</code> with your actual API
                          key. Replace <code>YOUR_JWT_TOKEN</code> with your JWT
                          token from login. Always handle errors appropriately
                          in production.
                        </p>
                      </div>

                      <div className="example-section">
                        <h3>JavaScript / Node.js</h3>
                        <CodeBlock
                          title="1. Create Payment Link"
                          code={`const axios = require('axios');

async function createPaymentLink(apiKey, paymentData) {
  try {
    const response = await axios.post(
      '${BASE_URL}/razorpay/create-payment-link',
      {
        amount: paymentData.amount,
        customer_name: paymentData.customerName,
        customer_email: paymentData.customerEmail,
        customer_phone: paymentData.customerPhone,
        description: paymentData.description || 'Payment',
        callback_url: paymentData.callbackUrl,
        success_url: paymentData.successUrl,
        failure_url: paymentData.failureUrl
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Payment Link Created:', {
      transactionId: response.data.transaction_id,
      paymentUrl: response.data.payment_url,
      checkoutUrl: response.data.checkout_url,
      deepLinks: {
        phonepe: response.data.phonepe_deep_link,
        gpay: response.data.gpay_deep_link,
        upi: response.data.upi_deep_link
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating payment link:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
    throw error;
  }
}

// Usage
createPaymentLink('YOUR_API_KEY', {
  amount: 1000,
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '9876543210',
  description: 'Payment for order #123',
  successUrl: 'https://yoursite.com/success',
  failureUrl: 'https://yoursite.com/failure'
}).then(data => {
  // Redirect customer to data.payment_url or use deep links
  console.log('Redirect to:', data.payment_url);
});`}
                        />
                        <CodeBlock
                          title="2. Get Payment Status"
                          code={`async function getPaymentStatus(apiKey, orderId) {
  try {
    const response = await axios.get(
      \`${BASE_URL}/payments/status/\${orderId}\`,
      {
        headers: {
          'x-api-key': apiKey
        }
      }
    );
    
    return response.data.transaction;
  } catch (error) {
    console.error('Error getting payment status:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
getPaymentStatus('YOUR_API_KEY', 'REF_1705312345678')
  .then(transaction => {
    if (transaction.status === 'paid') {
      console.log('Payment successful!', transaction);
    }
  });`}
                        />
                        <CodeBlock
                          title="3. Get Balance (JWT Auth)"
                          code={`async function getBalance(jwtToken) {
  try {
    const response = await axios.get(
      '${BASE_URL}/payments/merchant/balance',
      {
        headers: {
          'x-auth-token': jwtToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired (JWT tokens expire after 7 days)
      console.error('Token expired - please login again to refresh token');
      // Redirect to login or trigger token refresh flow
      // Note: Tokens expire after 7 days, plan accordingly
    }
    throw error;
  }
}

// Usage
const token = 'YOUR_JWT_TOKEN'; // Valid for 7 days from login
getBalance(token).then(balance => {
  console.log('Available Balance:', balance.balance.available_balance);
  console.log('Can request payout:', balance.payout_eligibility.can_request_payout);
});`}
                        />
                        <CodeBlock
                          title="4. Request Payout (JWT Auth)"
                          code={`async function requestPayout(jwtToken, payoutData) {
  try {
    const response = await axios.post(
      '${BASE_URL}/payments/merchant/payout/request',
      {
        amount: payoutData.amount,
        transferMode: payoutData.transferMode, // 'upi' or 'bank_transfer'
        beneficiaryDetails: payoutData.transferMode === 'upi' 
          ? { upiId: payoutData.upiId }
          : {
              accountHolderName: payoutData.accountHolderName,
              accountNumber: payoutData.accountNumber,
              ifscCode: payoutData.ifscCode,
              bankName: payoutData.bankName,
              branchName: payoutData.branchName
            },
        notes: payoutData.notes || '',
        description: payoutData.description || ''
      },
      {
        headers: {
          'x-auth-token': jwtToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error requesting payout:', error.response?.data || error.message);
    throw error;
  }
}

// Usage - UPI Payout
requestPayout('YOUR_JWT_TOKEN', {
  amount: 10000,
  transferMode: 'upi',
  upiId: 'merchant@paytm'
}).then(result => {
  console.log('Payout requested:', result.payoutId);
  console.log('Net amount:', result.netAmount);
  console.log('Commission:', result.commission);
});

// Usage - Bank Transfer
requestPayout('YOUR_JWT_TOKEN', {
  amount: 10000,
  transferMode: 'bank_transfer',
  accountHolderName: 'John Doe',
  accountNumber: '1234567890123456',
  ifscCode: 'SBIN0001234',
  bankName: 'State Bank of India',
  branchName: 'Katraj Branch'
});`}
                        />
                        <CodeBlock
                          title="5. Configure Webhook (JWT Auth)"
                          code={`async function configureWebhook(jwtToken, webhookUrl, events) {
  try {
    const response = await axios.post(
      '${BASE_URL}/payments/merchant/webhook/configure',
      {
        webhook_url: webhookUrl,
        events: events // ['payment.paid', 'payment.failed', 'payment.refunded']
      },
      {
        headers: {
          'x-auth-token': jwtToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Webhook configured. Secret:', response.data.webhook_secret);
    return response.data;
  } catch (error) {
    console.error('Error configuring webhook:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
configureWebhook('YOUR_JWT_TOKEN', 'https://yoursite.com/api/webhooks/payment', [
  'payment.paid',
  'payment.failed',
  'payment.refunded'
]).then(config => {
  // Save webhook_secret securely for signature verification
  console.log('Webhook secret:', config.webhook_secret);
});`}
                        />

                        <CodeBlock
                          title="6. Webhook Signature Verification"
                          code={`const crypto = require('crypto');
const express = require('express');

const app = express();

// Middleware to capture raw body for signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

app.post('/webhook/payment', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET; // Get from your webhook config
    
    if (!signature || !webhookSecret) {
      return res.status(401).json({ error: 'Missing signature or secret' });
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body.toString())
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Parse payload
    const payload = JSON.parse(req.body.toString());
    
    // Process webhook based on event type
    switch (payload.event) {
      case 'payment.paid':
        console.log('Payment successful:', payload.data.transaction_id);
        // Update order status, send confirmation email, etc.
        break;
      case 'payment.failed':
        console.log('Payment failed:', payload.data.transaction_id);
        // Handle failure
        break;
      case 'payment.refunded':
        console.log('Payment refunded:', payload.data.transaction_id);
        // Process refund
        break;
      default:
        console.log('Unknown event:', payload.event);
    }
    
    // Always return 200 OK quickly
    res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});`}
                        />
                      </div>

                      <div className="example-section">
                        <h3>Python</h3>
                        <CodeBlock
                          title="Create Payment Link with Error Handling"
                          code={`import requests
import os

def create_payment_link(amount, customer_info):
    """Create a payment link with proper error handling."""
    url = "${BASE_URL}/razorpay/create-payment-link"
    api_key = os.getenv('API_KEY')  # Store in environment variable
    
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    data = {
        "amount": amount,
        "customer_name": customer_info['name'],
        "customer_email": customer_info['email'],
        "customer_phone": customer_info['phone'],
        "description": customer_info.get('description', 'Payment'),
        "success_url": customer_info.get('success_url'),
        "failure_url": customer_info.get('failure_url')
    }
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        response.raise_for_status()  # Raise exception for bad status codes
        
        result = response.json()
        return {
            'success': True,
            'payment_url': result['payment_url'],
            'transaction_id': result['transaction_id'],
            'deep_links': {
                'phonepe': result.get('phonepe_deep_link'),
                'gpay': result.get('gpay_deep_link'),
                'upi': result.get('upi_deep_link')
            }
        }
    except requests.exceptions.HTTPError as e:
        error_data = e.response.json() if e.response else {}
        return {
            'success': False,
            'error': error_data.get('error', str(e)),
            'status_code': e.response.status_code if e.response else None
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

# Usage
result = create_payment_link(1000, {
    'name': 'John Doe',
    'email': 'john@example.com',
    'phone': '9876543210',
    'description': 'Payment for order #123'
})

if result['success']:
    print(f"Payment URL: {result['payment_url']}")
else:
    print(f"Error: {result['error']}")`}
                          language="python"
                        />
                        <CodeBlock
                          title="Get Balance (Python)"
                          code={`import requests

def get_balance(jwt_token):
    """Get merchant balance using JWT token."""
    url = "${BASE_URL}/payments/merchant/balance"
    
    headers = {
        "x-auth-token": jwt_token,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        return {
            'available_balance': data['balance']['available_balance'],
            'can_request_payout': data['payout_eligibility']['can_request_payout'],
            'max_payout_amount': data['payout_eligibility']['maximum_payout_amount']
        }
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print("Token expired - please login again")
        return None

# Usage
balance = get_balance('YOUR_JWT_TOKEN')
if balance:
    print(f"Available: ₹{balance['available_balance']}")
    print(f"Max payout: ₹{balance['max_payout_amount']}")`}
                          language="python"
                        />
                      </div>

                      <div className="example-section">
                        <h3>cURL Examples</h3>
                        <CodeBlock
                          title="Create Payment Link"
                          code={`curl -X POST "${BASE_URL}/razorpay/create-payment-link" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1000,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "9876543210",
    "description": "Payment for order #123",
    "success_url": "https://yoursite.com/success",
    "failure_url": "https://yoursite.com/failure"
  }'`}
                          language="bash"
                        />
                        <CodeBlock
                          title="Get Payment Status"
                          code={`curl -X GET "${BASE_URL}/payments/status/REF_1705312345678" \\
  -H "x-api-key: YOUR_API_KEY"`}
                          language="bash"
                        />
                        <CodeBlock
                          title="Get Balance (JWT)"
                          code={`curl -X GET "${BASE_URL}/payments/merchant/balance" \\
  -H "x-auth-token: YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json"`}
                          language="bash"
                        />
                        <CodeBlock
                          title="Request Payout (JWT)"
                          code={`curl -X POST "${BASE_URL}/payments/merchant/payout/request" \\
  -H "x-auth-token: YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "transferMode": "upi",
    "beneficiaryDetails": {
      "upiId": "merchant@paytm"
    },
    "notes": "Monthly payout"
  }'`}
                          language="bash"
                        />
                        <CodeBlock
                          title="Configure Webhook (JWT)"
                          code={`curl -X POST "${BASE_URL}/payments/merchant/webhook/configure" \\
  -H "x-auth-token: YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_url": "https://yoursite.com/api/webhooks/payment",
    "events": ["payment.paid", "payment.failed", "payment.refunded"]
  }'`}
                          language="bash"
                        />
                      </div>
                    </section>
                  )}

                  {/* Best Practices */}
                  {activeSection === "best-practices" && (
                    <section className="docs-section">
                      <h2>Best Practices & Guidelines</h2>
                      <p>
                        Follow these best practices to ensure secure, reliable,
                        and efficient API integration.
                      </p>

                      <div className="info-card">
                        <h3>
                          <FiCheckCircle /> Security Best Practices
                        </h3>
                        <ul>
                          <li>
                            <strong>Always use HTTPS:</strong> Never make API
                            requests over HTTP. All endpoints require secure
                            connections.
                          </li>
                          <li>
                            <strong>
                              Never expose API keys in client-side code:
                            </strong>{" "}
                            API keys should only be used in server-side
                            applications.
                          </li>
                          <li>
                            <strong>Store credentials securely:</strong> Use
                            environment variables, secret managers, or secure
                            configuration files.
                          </li>
                          <li>
                            <strong>Verify webhook signatures:</strong> Always
                            validate webhook signatures before processing
                            webhook payloads.
                          </li>
                          <li>
                            <strong>Implement rate limiting:</strong> Add rate
                            limiting on your side to prevent abuse and handle
                            API limits gracefully.
                          </li>
                          <li>
                            <strong>Rotate credentials periodically:</strong>{" "}
                            Regularly rotate API keys and update integrations
                            (with proper testing).
                          </li>
                          <li>
                            <strong>Use x-auth-token consistently:</strong>{" "}
                            Prefer <code>x-auth-token</code> header over{" "}
                            <code>Authorization: Bearer</code> for consistency.
                          </li>
                          <li>
                            <strong>Handle token expiration:</strong>{" "}
                            <strong>JWT tokens expire after 7 days.</strong>{" "}
                            Implement token refresh logic (re-login) and
                            graceful handling of 401 errors before the 7-day
                            expiration period.
                          </li>
                          <li>
                            <strong>Validate all inputs:</strong> Validate and
                            sanitize all data before sending to API endpoints.
                          </li>
                        </ul>
                      </div>

                      <div
                        className="warning-card"
                        style={{
                          marginTop: "20px",
                          padding: "16px",
                          background: "#fff3cd",
                          border: "1px solid #ffc107",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 8px 0",
                            color: "#856404",
                            fontSize: "14px",
                            fontWeight: 600,
                          }}
                        >
                          <FiClock style={{ marginRight: "6px" }} />⏰ Token
                          Expiration
                        </h4>
                        <p
                          style={{
                            margin: "8px 0",
                            color: "#856404",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          <strong>JWT tokens expire after 7 days.</strong> You
                          must refresh your token by logging in again before the
                          7-day period expires to maintain uninterrupted API
                          access.
                        </p>
                        <ul
                          style={{
                            margin: "8px 0 0 0",
                            paddingLeft: "20px",
                            color: "#856404",
                            fontSize: "13px",
                          }}
                        >
                          <li>
                            Token validity: <strong>7 days from login</strong>
                          </li>
                          <li>
                            Implement automatic token refresh logic in your
                            application
                          </li>
                          <li>
                            Monitor token expiration and prompt users to
                            re-authenticate
                          </li>
                          <li>
                            Handle 401 errors gracefully and redirect to login
                            when token expires
                          </li>
                          <li>
                            Plan your integration to handle token refresh
                            without service interruption
                          </li>
                        </ul>
                      </div>

                      <div
                        className="warning-card"
                        style={{
                          marginTop: "16px",
                          padding: "16px",
                          background: "#fef2f2",
                          border: "1px solid #fca5a5",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 8px 0",
                            color: "#991b1b",
                            fontSize: "14px",
                            fontWeight: 600,
                          }}
                        >
                          <FiAlertCircle style={{ marginRight: "6px" }} />
                          ⚠️ Critical: Token Usage
                        </h4>
                        <ul
                          style={{
                            margin: "8px 0 0 0",
                            paddingLeft: "20px",
                            color: "#7f1d1d",
                            fontSize: "13px",
                          }}
                        >
                          <li>
                            <strong>x-auth-token</strong> is the{" "}
                            <strong>primary header</strong> - use this format
                            for consistency
                          </li>
                          <li>
                            <strong>Authorization: Bearer</strong> is also
                            supported but <code>x-auth-token</code> is
                            recommended
                          </li>
                          <li>
                            <strong>Tokens expire in 7 days</strong> - implement
                            token refresh logic before expiration
                          </li>
                          <li>
                            Handle 401 errors and redirect to login when token
                            expires
                          </li>
                          <li>
                            Never store tokens in localStorage for sensitive
                            operations
                          </li>
                          <li>
                            Always validate token on your backend before making
                            API calls
                          </li>
                          <li>
                            Set up automatic token renewal or user
                            re-authentication flow
                          </li>
                        </ul>
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiRefreshCw /> Error Handling
                        </h3>
                        <p>Always implement comprehensive error handling:</p>
                        <CodeBlock
                          title="JavaScript Error Handling Pattern"
                          code={`async function apiCall() {
  try {
    const response = await axios.post(url, data, { headers });
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response) {
      // API returned an error response
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Bad Request:', data.error);
          return { success: false, error: data.error, type: 'validation' };
        case 401:
          console.error('Unauthorized - Token may have expired');
          // Redirect to login or refresh token
          return { success: false, error: 'Authentication required', type: 'auth' };
        case 403:
          console.error('Forbidden - Insufficient permissions');
          return { success: false, error: 'Access denied', type: 'permission' };
        case 404:
          console.error('Not Found');
          return { success: false, error: 'Resource not found', type: 'not_found' };
        case 429:
          console.error('Rate Limited');
          // Implement exponential backoff
          return { success: false, error: 'Too many requests', type: 'rate_limit' };
        case 500:
          console.error('Server Error');
          return { success: false, error: 'Internal server error', type: 'server' };
        default:
          return { success: false, error: data.error || 'Unknown error', type: 'unknown' };
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.message);
      return { success: false, error: 'Network error - check your connection', type: 'network' };
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
      return { success: false, error: error.message, type: 'request' };
    }
  }
}`}
                          language="javascript"
                        />
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiRefreshCw /> Rate Limiting & Performance
                        </h3>
                        <p>
                          Our API implements rate limits to ensure fair usage:
                        </p>
                        <ul>
                          <li>
                            <strong>Payment APIs (API Key Auth):</strong> 100
                            requests per minute per merchant
                          </li>
                          <li>
                            <strong>Dashboard APIs (JWT Auth):</strong> 60
                            requests per minute per merchant
                          </li>
                          <li>
                            <strong>Webhook APIs:</strong> 30 requests per
                            minute per merchant
                          </li>
                        </ul>
                        <div style={{ marginTop: "12px" }}>
                          <h4>Implement Exponential Backoff</h4>
                          <CodeBlock
                            code={`function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 || error.response?.status >= 500) {
        const waitTime = Math.min(1000 * Math.pow(2, i), 10000); // Max 10 seconds
        console.log(\`Rate limited or server error. Retrying in \${waitTime}ms...\`);
        await delay(waitTime);
      } else {
        throw error; // Don't retry for client errors (4xx)
      }
    }
  }
  throw new Error('Max retries exceeded');
}`}
                            language="javascript"
                          />
                        </div>
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiCheckCircle /> Data Validation
                        </h3>
                        <p>Always validate data before sending API requests:</p>
                        <ul>
                          <li>
                            <strong>Amount:</strong> Must be a positive number,
                            minimum ₹1
                          </li>
                          <li>
                            <strong>Email:</strong> Use proper email validation
                            regex
                          </li>
                          <li>
                            <strong>Phone:</strong> Must be exactly 10 digits
                            (Indian format)
                          </li>
                          <li>
                            <strong>URLs:</strong> Validate callback URLs are
                            valid HTTPS URLs
                          </li>
                          <li>
                            <strong>Dates:</strong> Use ISO 8601 format
                            (YYYY-MM-DD or full ISO string)
                          </li>
                          <li>
                            <strong>Status values:</strong> Use only documented
                            status values
                          </li>
                        </ul>
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiSearch /> Payment Status - Use Webhooks, Not
                          Polling
                        </h3>
                        <p>
                          Instead of polling continuously, use webhooks for
                          real-time updates:
                        </p>
                        <ul>
                          <li>Configure webhook URL in your dashboard</li>
                          <li>Listen for webhook events on your server</li>
                          <li>Verify webhook signatures before processing</li>
                          <li>
                            Implement idempotency checks to handle duplicate
                            webhooks
                          </li>
                          <li>
                            Respond quickly (within 5 seconds) with 200 OK
                          </li>
                        </ul>
                        <p
                          style={{
                            marginTop: "12px",
                            fontSize: "14px",
                            color: "#6b7280",
                          }}
                        >
                          <strong>Why webhooks over polling?</strong> Webhooks
                          are more efficient, real-time, and reduce unnecessary
                          API calls. Polling wastes resources and may miss
                          timely updates.
                        </p>
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiDownload /> Idempotency
                        </h3>
                        <p>
                          Ensure your payment processing is idempotent to
                          prevent duplicate processing:
                        </p>
                        <ul>
                          <li>
                            Store transaction IDs to prevent duplicate
                            processing
                          </li>
                          <li>
                            Check if payment already processed before creating
                            new one
                          </li>
                          <li>Use unique order IDs for each transaction</li>
                          <li>
                            Implement idempotency keys for webhook processing
                          </li>
                          <li>
                            Use database constraints or unique indexes on
                            transaction IDs
                          </li>
                        </ul>
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiCheckCircle /> Testing Recommendations
                        </h3>
                        <ul>
                          <li>
                            <strong>Test in staging/sandbox first:</strong>{" "}
                            Always test integrations thoroughly before going
                            live
                          </li>
                          <li>
                            <strong>Test error scenarios:</strong> Test all
                            error responses (400, 401, 404, 500, etc.)
                          </li>
                          <li>
                            <strong>Test webhook delivery:</strong> Use the test
                            webhook endpoint to verify your webhook handler
                          </li>
                          <li>
                            <strong>Test edge cases:</strong> Test minimum
                            amounts, maximum amounts, invalid inputs
                          </li>
                          <li>
                            <strong>Test token expiration:</strong> Verify your
                            application handles token expiration gracefully
                          </li>
                          <li>
                            <strong>Load testing:</strong> Test your integration
                            under expected load conditions
                          </li>
                        </ul>
                      </div>

                      <div className="info-card">
                        <h3>
                          <FiAlertCircle /> Common Mistakes to Avoid
                        </h3>
                        <ul>
                          <li>
                            ❌ Exposing API keys in JavaScript code
                            (client-side)
                          </li>
                          <li>
                            ❌ Not verifying webhook signatures before
                            processing
                          </li>
                          <li>
                            ❌ Processing webhooks without idempotency checks
                          </li>
                          <li>❌ Not handling network errors gracefully</li>
                          <li>
                            ❌ Storing sensitive data in logs or error messages
                          </li>
                          <li>
                            ❌ Using <code>Authorization: Bearer</code> when{" "}
                            <code>x-auth-token</code> is recommended
                          </li>
                          <li>❌ Not handling 401 errors (token expiration)</li>
                          <li>
                            ❌ Polling for payment status instead of using
                            webhooks
                          </li>
                          <li>
                            ❌ Not validating user input before sending to API
                          </li>
                          <li>
                            ❌ Ignoring rate limit errors (429) without backoff
                          </li>
                        </ul>
                      </div>

                      <div
                        className="warning-card"
                        style={{
                          marginTop: "24px",
                          background: "#fffbeb",
                          borderColor: "#fbbf24",
                        }}
                      >
                        <h3 style={{ color: "#92400e" }}>
                          <FiAlertCircle /> Production Checklist
                        </h3>
                        <ul style={{ color: "#78350f" }}>
                          <li>
                            ✅ All API keys stored in secure environment
                            variables
                          </li>
                          <li>✅ All API calls use HTTPS</li>
                          <li>✅ Webhook signature verification implemented</li>
                          <li>✅ Error handling and retry logic implemented</li>
                          <li>
                            ✅ Rate limiting and backoff strategies in place
                          </li>
                          <li>✅ Token refresh logic for JWT authentication</li>
                          <li>✅ Logging and monitoring configured</li>
                          <li>✅ Idempotency checks for webhooks</li>
                          <li>✅ Input validation on all user data</li>
                          <li>✅ Testing completed in staging environment</li>
                          <li>
                            ✅ Webhook endpoints are publicly accessible (HTTPS)
                          </li>
                          <li>
                            ✅ Webhook endpoints respond quickly (&lt; 5
                            seconds)
                          </li>
                        </ul>
                      </div>

                      <div
                        className="info-card"
                        style={{
                          marginTop: "24px",
                          background: "#eff6ff",
                          borderColor: "#3b82f6",
                        }}
                      >
                        <h3 style={{ color: "#1e40af" }}>
                          Support & Troubleshooting
                        </h3>
                        <ul>
                          <li>
                            For API issues, check error messages and status
                            codes first
                          </li>
                          <li>
                            Verify your authentication headers are correct (
                            <code>x-api-key</code> or <code>x-auth-token</code>)
                          </li>
                          <li>
                            Ensure your request payload matches the documented
                            format
                          </li>
                          <li>
                            Check that your webhook endpoint is publicly
                            accessible (for webhook testing)
                          </li>
                          <li>
                            Review the error response body for detailed error
                            messages
                          </li>
                          <li>
                            Use the test webhook endpoints to verify your
                            webhook handler is working
                          </li>
                          <li>
                            Check API logs in your dashboard for detailed
                            request/response information
                          </li>
                          <li>
                            Contact support if you encounter persistent issues
                            with documented APIs
                          </li>
                        </ul>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
};

export default ApiDocumentationPage;
