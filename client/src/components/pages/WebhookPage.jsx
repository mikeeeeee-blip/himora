import React, { useState, useEffect } from "react";
import {
  FiLink,
  FiCopy,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiPlay,
  FiCheck,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiInfo,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Navbar from "../Navbar";
import webhookService from "../../services/webhookService";
import "./PageLayout.css";
import Toast from "../ui/Toast";
import { API_ENDPOINTS } from "../../constants/api";

const WebhookPage = () => {
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [payoutWebhookConfig, setPayoutWebhookConfig] = useState(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showPayoutConfigForm, setShowPayoutConfigForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [webhookData, setWebhookData] = useState({
    url: "",
    events: [],
  });
  const [payoutWebhookData, setPayoutWebhookData] = useState({
    url: "",
    events: [],
  });
  const [showPaymentSecret, setShowPaymentSecret] = useState(false);
  const [showPayoutSecret, setShowPayoutSecret] = useState(false);
  const [cryptoWebhookSecret, setCryptoWebhookSecret] = useState(null);
  const [showCryptoSecret, setShowCryptoSecret] = useState(false);
  const [cryptoSecretLoading, setCryptoSecretLoading] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState(null);

  const webhookEvents = webhookService.getAvailableEvents();
  const payoutEvents = webhookService.getAvailablePayoutEvents();

  // Debug: Log state changes
  useEffect(() => {
    console.log("🔄 webhookConfig state changed:", webhookConfig);
  }, [webhookConfig]);

  useEffect(() => {
    console.log("🔄 payoutWebhookConfig state changed:", payoutWebhookConfig);
  }, [payoutWebhookConfig]);

  useEffect(() => {
    fetchAllWebhookConfigs();
    fetchCryptoWebhookSecret();
  }, []);

  // Fetch crypto webhook secret configuration
  const fetchCryptoWebhookSecret = async () => {
    setCryptoSecretLoading(true);
    try {
      const config = await webhookService.getCryptoWebhookSecret();
      setCryptoWebhookSecret(config);
    } catch (error) {
      console.error("Error fetching crypto webhook secret:", error);
      setCryptoWebhookSecret({ secret_configured: false });
    } finally {
      setCryptoSecretLoading(false);
    }
  };

  // Generate new crypto webhook secret
  const handleGenerateCryptoSecret = async () => {
    if (
      !window.confirm(
        "Generate a new crypto webhook secret? You will need to update your environment variables and share the new secret with third-party crypto services."
      )
    ) {
      return;
    }

    setCryptoSecretLoading(true);
    try {
      const result = await webhookService.generateCryptoWebhookSecret();
      setGeneratedSecret(result.secret);
      setToast({
        message:
          "New secret generated! Copy it and add to your environment variables.",
        type: "success",
      });
      // Refresh secret config
      await fetchCryptoWebhookSecret();
    } catch (error) {
      setToast({
        message: error.message || "Failed to generate crypto webhook secret",
        type: "error",
      });
    } finally {
      setCryptoSecretLoading(false);
    }
  };

  // Unified function to fetch both webhook configs in a single API call
  const fetchAllWebhookConfigs = async () => {
    setLoading(true);
    setPayoutLoading(true);
    try {
      const configs = await webhookService.getAllWebhookConfigs();
      console.log("📥 Fetched webhook configs (raw):", configs);
      console.log("📥 Payment webhook exists:", !!configs?.paymentWebhook);
      console.log("📥 Payout webhook exists:", !!configs?.payoutWebhook);

      // Handle payment webhook config - only update if we have data
      const paymentWebhook = configs?.paymentWebhook;
      console.log("💳 Payment webhook data:", paymentWebhook);
      if (paymentWebhook) {
        setWebhookConfig(paymentWebhook);
        console.log("💳 Setting webhookConfig state to:", paymentWebhook);
        setWebhookData({
          url: paymentWebhook.webhook_url || paymentWebhook.url || "",
          events: paymentWebhook.webhook_events || paymentWebhook.events || [],
        });
      } else {
        // Only set to null if it was previously null (don't overwrite existing config)
        setWebhookConfig((prev) => prev || null);
        setWebhookData({ url: "", events: [] });
      }

      // Handle payout webhook config - only update if we have data
      const payoutWebhook = configs?.payoutWebhook;
      console.log("💰 Payout webhook data:", payoutWebhook);
      if (payoutWebhook) {
        setPayoutWebhookConfig(payoutWebhook);
        console.log("💰 Setting payoutWebhookConfig state to:", payoutWebhook);
        setPayoutWebhookData({
          url: payoutWebhook.webhook_url || payoutWebhook.url || "",
          events: payoutWebhook.webhook_events || payoutWebhook.events || [],
        });
      } else {
        // Only set to null if it was previously null (don't overwrite existing config)
        setPayoutWebhookConfig((prev) => prev || null);
        setPayoutWebhookData({ url: "", events: [] });
      }
    } catch (error) {
      console.error("Error fetching webhook configs:", error);
      setError("Failed to fetch webhook configurations");
      setToast({
        message: "Failed to fetch webhook configurations",
        type: "error",
      });
      // Don't reset configs on error - keep existing state
      // setWebhookConfig(null);
      // setPayoutWebhookConfig(null);
      setWebhookData({ url: "", events: [] });
      setPayoutWebhookData({ url: "", events: [] });
    } finally {
      setLoading(false);
      setPayoutLoading(false);
    }
  };

  // Keep individual functions for backward compatibility (when refreshing after config changes)
  const fetchWebhookConfig = async () => {
    setLoading(true);
    try {
      const config = await webhookService.getWebhookConfig();
      // Handle both direct config and wrapped response
      const webhookData =
        config?.success === false
          ? null
          : config?.webhook_url
          ? config
          : config || null;
      setWebhookConfig(webhookData);
      if (webhookData) {
        setWebhookData({
          url: webhookData.webhook_url || webhookData.url || "",
          events: webhookData.webhook_events || webhookData.events || [],
        });
      } else {
        setWebhookData({ url: "", events: [] });
      }
    } catch (error) {
      console.error("Error fetching webhook config:", error);
      setError("Failed to fetch webhook configuration");
      setToast({
        message: "Failed to fetch webhook configuration",
        type: "error",
      });
      setWebhookConfig(null);
      setWebhookData({ url: "", events: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutWebhookConfig = async () => {
    setPayoutLoading(true);
    try {
      const config = await webhookService.getPayoutWebhookConfig();
      // Handle both direct config and wrapped response
      const payoutData =
        config?.success === false
          ? null
          : config?.webhook_url
          ? config
          : config || null;
      setPayoutWebhookConfig(payoutData);
      if (payoutData) {
        setPayoutWebhookData({
          url: payoutData.webhook_url || payoutData.url || "",
          events: payoutData.webhook_events || payoutData.events || [],
        });
      } else {
        setPayoutWebhookData({ url: "", events: [] });
      }
    } catch (error) {
      console.error("Error fetching payout webhook config:", error);
      setError("Failed to fetch payout webhook configuration");
      setToast({
        message: "Failed to fetch payout webhook configuration",
        type: "error",
      });
      setPayoutWebhookConfig(null);
      setPayoutWebhookData({ url: "", events: [] });
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "events") {
      setWebhookData((prev) => ({
        ...prev,
        events: value,
      }));
    } else {
      setWebhookData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleEventToggle = (eventId) => {
    setWebhookData((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const handlePayoutEventToggle = (eventId) => {
    setPayoutWebhookData((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const handleConfigure = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      if (!webhookData.url || webhookData.events.length === 0) {
        throw new Error("Please fill in all required fields");
      }

      // Validate URL format
      try {
        new URL(webhookData.url);
      } catch {
        throw new Error("Please enter a valid URL");
      }

      const result = await webhookService.configureWebhook(webhookData);
      setSuccess("Webhook configured successfully!");
      setToast({
        message: "Webhook configured successfully!",
        type: "success",
      });

      // Update webhook config from response if available
      if (result && result.webhook_url) {
        setWebhookConfig(result);
        setWebhookData({
          url: result.webhook_url || "",
          events: result.webhook_events || [],
        });
      }

      // Refresh all webhook configs to get latest state
      await fetchAllWebhookConfigs();
      setShowConfigForm(false);
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutConfigure = async (e) => {
    e.preventDefault();
    setPayoutLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      if (!payoutWebhookData.url || payoutWebhookData.events.length === 0) {
        throw new Error("Please fill in all required fields");
      }

      // Validate URL format
      try {
        new URL(payoutWebhookData.url);
      } catch {
        throw new Error("Please enter a valid URL");
      }

      const result = await webhookService.configurePayoutWebhook(
        payoutWebhookData
      );
      setSuccess("Payout webhook configured successfully!");
      setToast({
        message: "Payout webhook configured successfully!",
        type: "success",
      });

      // Update payout webhook config from response if available
      if (result && result.webhook_url) {
        setPayoutWebhookConfig(result);
        setPayoutWebhookData({
          url: result.webhook_url || "",
          events: result.webhook_events || [],
        });
      }

      // Refresh all webhook configs to get latest state
      await fetchAllWebhookConfigs();
      setShowPayoutConfigForm(false);
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: "error" });
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleDelete = async () => {
    const hasPaymentWebhook = webhookConfig !== null;
    const hasPayoutWebhook = payoutWebhookConfig !== null;

    if (!hasPaymentWebhook && !hasPayoutWebhook) {
      setToast({ message: "No webhooks configured to delete", type: "error" });
      return;
    }

    const confirmMessage =
      hasPaymentWebhook && hasPayoutWebhook
        ? "Are you sure you want to delete both payment and payout webhook configurations?"
        : hasPaymentWebhook
        ? "Are you sure you want to delete the payment webhook configuration?"
        : "Are you sure you want to delete the payout webhook configuration?";

    if (window.confirm(confirmMessage)) {
      setLoading(true);
      setPayoutLoading(true);
      setError("");
      setSuccess("");

      try {
        // Delete payment webhook if it exists
        if (hasPaymentWebhook) {
          try {
            await webhookService.deleteWebhook();
            setWebhookConfig(null);
            setWebhookData({ url: "", events: [] });
          } catch (error) {
            console.error("Error deleting payment webhook:", error);
            throw new Error(
              `Failed to delete payment webhook: ${error.message}`
            );
          }
        }

        // Delete payout webhook if it exists
        if (hasPayoutWebhook) {
          try {
            await webhookService.deletePayoutWebhook();
            setPayoutWebhookConfig(null);
            setPayoutWebhookData({ url: "", events: [] });
          } catch (error) {
            console.error("Error deleting payout webhook:", error);
            throw new Error(
              `Failed to delete payout webhook: ${error.message}`
            );
          }
        }

        const successMessage =
          hasPaymentWebhook && hasPayoutWebhook
            ? "Both webhook configurations deleted successfully!"
            : hasPaymentWebhook
            ? "Payment webhook configuration deleted successfully!"
            : "Payout webhook configuration deleted successfully!";

        setSuccess(successMessage);
        setToast({ message: successMessage, type: "success" });

        // Refresh all webhook configs to ensure UI is updated
        await fetchAllWebhookConfigs();
      } catch (error) {
        setError(error.message);
        setToast({ message: error.message, type: "error" });
      } finally {
        setLoading(false);
        setPayoutLoading(false);
      }
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const result = await webhookService.testWebhook();
      if (result && result.success) {
        setSuccess("Test webhook sent successfully!");
        setToast({
          message: "Test webhook sent successfully!",
          type: "success",
        });
      } else {
        setError(result?.error || "Test webhook failed");
        setToast({
          message: result?.error || "Test webhook failed",
          type: "error",
        });
      }
    } catch (error) {
      setError(error.message || "Failed to send test webhook");
      setToast({
        message: error.message || "Failed to send test webhook",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutTest = async () => {
    setPayoutLoading(true);
    try {
      const result = await webhookService.testPayoutWebhook();
      if (result && result.success) {
        setSuccess("Test payout webhook sent successfully!");
        setToast({
          message: "Test payout webhook sent successfully!",
          type: "success",
        });
      } else {
        setError(result?.error || "Test payout webhook failed");
        setToast({
          message: result?.error || "Test payout webhook failed",
          type: "error",
        });
      }
    } catch (error) {
      setError(error.message || "Failed to send test payout webhook");
      setToast({
        message: error.message || "Failed to send test payout webhook",
        type: "error",
      });
    } finally {
      setPayoutLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast({ message: "Copied to clipboard!", type: "success" });
  };

  // Animation variants
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
          {/* Content Section - Scrolls over image */}
          <div className="bg-transparent pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              <main className="space-y-6 sm:space-y-8">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8"
                >
                  <div className="flex flex-col gap-4">
                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white mb-3 font-['Albert_Sans']">
                        Webhook Configuration
                      </h1>
                      <p className="text-white/70 text-base sm:text-lg font-['Albert_Sans']">
                        Configure your webhooks to receive real-time
                        notifications
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href="/admin/webhooks/how-to"
                        className="bg-bg-secondary text-white border border-accent px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                      >
                        How to setup
                      </a>
                      {!webhookConfig ? (
                        <motion.button
                          onClick={() => setShowConfigForm(!showConfigForm)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary"
                        >
                          <FiPlus className="text-base" />
                          {showConfigForm ? "Cancel" : "Configure Webhook"}
                        </motion.button>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <motion.button
                            onClick={handleTest}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-bg-secondary text-white border border-accent px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                          >
                            <FiPlay className="text-base" />
                            Test Webhook
                          </motion.button>
                          <motion.button
                            onClick={() => setShowConfigForm(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-bg-secondary text-white border border-accent px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                          >
                            <FiEdit className="text-base" />
                            Edit Configuration
                          </motion.button>
                          <motion.button
                            onClick={handleDelete}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:bg-red-500/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-bg-primary"
                          >
                            <FiTrash2 className="text-base" />
                            Delete Webhook
                          </motion.button>
                        </div>
                      )}
                      {/* Payout webhook actions */}
                      {!payoutWebhookConfig ? (
                        <motion.button
                          onClick={() =>
                            setShowPayoutConfigForm(!showPayoutConfigForm)
                          }
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary"
                        >
                          <FiPlus className="text-base" />
                          {showPayoutConfigForm
                            ? "Cancel"
                            : "Configure Payout Webhook"}
                        </motion.button>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <motion.button
                            onClick={handlePayoutTest}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-bg-secondary text-white border border-accent px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                          >
                            <FiPlay className="text-base" />
                            Test Payout Webhook
                          </motion.button>
                          <motion.button
                            onClick={() => setShowPayoutConfigForm(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-bg-secondary text-white border border-accent px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                          >
                            <FiEdit className="text-base" />
                            Edit Payout Webhook
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                <div className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-3 h-3 text-red-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <p className="text-red-400 text-sm sm:text-base font-medium font-['Albert_Sans'] flex-1">
                        {error}
                      </p>
                    </motion.div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4"
                    >
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-3 h-3 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <p className="text-green-400 text-sm sm:text-base font-medium font-['Albert_Sans'] flex-1">
                        {success}
                      </p>
                    </motion.div>
                  )}

                  {showConfigForm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                          <FiLink className="text-accent text-xl" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
                          Configure Webhook
                        </h3>
                      </div>
                      <form onSubmit={handleConfigure} className="space-y-6">
                        <div>
                          <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                            Webhook URL <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="url"
                            value={webhookData.url}
                            onChange={(e) =>
                              handleInputChange("url", e.target.value)
                            }
                            required
                            placeholder="https://yourdomain.com/api/webhooks/payment"
                            className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                          />
                        </div>

                        <div>
                          <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-3">
                            Events to Subscribe{" "}
                            <span className="text-red-400">*</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {webhookEvents.map((event) => (
                              <div
                                key={event.id}
                                className="bg-[#263F43] border border-white/10 rounded-lg p-3 hover:border-accent/30 transition-all duration-200"
                              >
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={webhookData.events.includes(
                                      event.id
                                    )}
                                    onChange={() => handleEventToggle(event.id)}
                                    className="mt-1 w-4 h-4 rounded border-white/20 bg-bg-secondary text-accent focus:ring-accent focus:ring-2"
                                  />
                                  <div className="flex-1">
                                    <div className="text-white font-medium text-sm font-['Albert_Sans'] mb-1">
                                      {event.label}
                                    </div>
                                    <div className="text-white/60 text-xs font-['Albert_Sans']">
                                      {event.description}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              setShowConfigForm(false);
                              setWebhookData({ url: "", events: [] });
                            }}
                            className="bg-bg-secondary text-white border border-accent px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {loading ? (
                              <>
                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                Configuring...
                              </>
                            ) : (
                              "Configure Webhook"
                            )}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                  {showPayoutConfigForm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                          <FiLink className="text-accent text-xl" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
                          Configure Payout Webhook
                        </h3>
                      </div>
                      <form
                        onSubmit={handlePayoutConfigure}
                        className="space-y-6"
                      >
                        <div>
                          <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                            Payout Webhook URL{" "}
                            <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="url"
                            value={payoutWebhookData.url}
                            onChange={(e) =>
                              setPayoutWebhookData((prev) => ({
                                ...prev,
                                url: e.target.value,
                              }))
                            }
                            required
                            placeholder="https://yourdomain.com/api/webhooks/payout"
                            className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                          />
                        </div>

                        <div>
                          <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-3">
                            Payout Events to Subscribe{" "}
                            <span className="text-red-400">*</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {payoutEvents.map((event) => (
                              <div
                                key={event.id}
                                className="bg-[#263F43] border border-white/10 rounded-lg p-3 hover:border-accent/30 transition-all duration-200"
                              >
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={payoutWebhookData.events.includes(
                                      event.id
                                    )}
                                    onChange={() =>
                                      handlePayoutEventToggle(event.id)
                                    }
                                    className="mt-1 w-4 h-4 rounded border-white/20 bg-bg-secondary text-accent focus:ring-accent focus:ring-2"
                                  />
                                  <div className="flex-1">
                                    <div className="text-white font-medium text-sm font-['Albert_Sans'] mb-1">
                                      {event.label}
                                    </div>
                                    <div className="text-white/60 text-xs font-['Albert_Sans']">
                                      {event.description}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPayoutConfigForm(false);
                              setPayoutWebhookData({ url: "", events: [] });
                            }}
                            className="bg-bg-secondary text-white border border-accent px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={payoutLoading}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {payoutLoading ? (
                              <>
                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                Configuring...
                              </>
                            ) : (
                              "Configure Payout Webhook"
                            )}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {/* Always show both webhook cards - loading state only shows spinner */}
                  {loading || payoutLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-[#122D32] border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-white/70 text-sm font-['Albert_Sans']">
                          Loading Payment Webhook...
                        </p>
                      </div>
                      <div className="bg-[#122D32] border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-white/70 text-sm font-['Albert_Sans']">
                          Loading Payout Webhook...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payment Webhook Configuration Card - Always Show */}
                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: webhookConfig ? 1.02 : 1 }}
                          className="bg-[#122D32] border border-white/10 rounded-xl p-6 hover:border-accent/30 transition-all duration-300 group"
                        >
                          {webhookConfig ? (
                            <>
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                                    <FiLink className="text-accent text-xl" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-medium text-white font-['Albert_Sans']">
                                      Payment Webhook
                                    </h4>
                                    <p className="text-white/60 text-xs font-['Albert_Sans']">
                                      Transaction notifications
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-['Albert_Sans'] ${
                                    webhookConfig.webhook_enabled
                                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                                  }`}
                                >
                                  {webhookConfig.webhook_enabled
                                    ? "Enabled"
                                    : "Disabled"}
                                </span>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                                    Webhook URL
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={webhookConfig.webhook_url}
                                      readOnly
                                      className="flex-1 px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent"
                                    />
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          webhookConfig.webhook_url
                                        )
                                      }
                                      className="bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2.5 rounded-lg transition-all duration-200 hover:scale-105"
                                      title="Copy URL"
                                    >
                                      <FiCopy className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                                    Webhook Secret
                                  </label>
                                  <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                      <input
                                        type={
                                          showPaymentSecret
                                            ? "text"
                                            : "password"
                                        }
                                        value={
                                          webhookConfig.webhook_secret ||
                                          "Not available"
                                        }
                                        readOnly
                                        className="w-full px-4 py-2.5 pr-12 bg-[#263F43] border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent"
                                      />
                                      {webhookConfig.webhook_secret && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setShowPaymentSecret(
                                              !showPaymentSecret
                                            )
                                          }
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1.5"
                                          title={
                                            showPaymentSecret
                                              ? "Hide Secret"
                                              : "Show Secret"
                                          }
                                        >
                                          {showPaymentSecret ? (
                                            <FiEyeOff className="w-4 h-4" />
                                          ) : (
                                            <FiEye className="w-4 h-4" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                    {webhookConfig.webhook_secret && (
                                      <button
                                        onClick={() =>
                                          copyToClipboard(
                                            webhookConfig.webhook_secret
                                          )
                                        }
                                        className="bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2.5 rounded-lg transition-all duration-200 hover:scale-105"
                                        title="Copy Secret"
                                      >
                                        <FiCopy className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                                    Subscribed Events
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {webhookConfig.webhook_events?.map(
                                      (eventId) => {
                                        const event = webhookEvents.find(
                                          (e) => e.id === eventId
                                        );
                                        return (
                                          <span
                                            key={eventId}
                                            className="px-3 py-1.5 bg-accent/10 text-accent border border-accent/30 rounded-md text-xs font-medium font-['Albert_Sans']"
                                          >
                                            {event ? event.label : eventId}
                                          </span>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                  <span className="text-white/60 text-xs font-medium font-['Albert_Sans'] uppercase tracking-wider">
                                    Retry Attempts
                                  </span>
                                  <span className="text-white text-sm font-semibold font-['Albert_Sans']">
                                    {webhookConfig.webhook_retries || 3}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                              <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                                <FiLink className="text-accent text-2xl" />
                              </div>
                              <h4 className="text-lg font-medium text-white mb-2 font-['Albert_Sans']">
                                Payment Webhook
                              </h4>
                              <p className="text-white/60 text-sm text-center font-['Albert_Sans'] mb-4">
                                No payment webhook configured
                              </p>
                            </div>
                          )}
                        </motion.div>

                        {/* Payout Webhook Configuration Card - Always Show */}
                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: payoutWebhookConfig ? 1.02 : 1 }}
                          className="bg-[#122D32] border border-white/10 rounded-xl p-6 hover:border-accent/30 transition-all duration-300 group"
                        >
                          {payoutWebhookConfig ? (
                            <>
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                                    <FiLink className="text-accent text-xl" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-medium text-white font-['Albert_Sans']">
                                      Payout Webhook
                                    </h4>
                                    <p className="text-white/60 text-xs font-['Albert_Sans']">
                                      Payout notifications
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-['Albert_Sans'] ${
                                    payoutWebhookConfig.webhook_enabled
                                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                                  }`}
                                >
                                  {payoutWebhookConfig.webhook_enabled
                                    ? "Enabled"
                                    : "Disabled"}
                                </span>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                                    Webhook URL
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={payoutWebhookConfig.webhook_url}
                                      readOnly
                                      className="flex-1 px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent"
                                    />
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          payoutWebhookConfig.webhook_url
                                        )
                                      }
                                      className="bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2.5 rounded-lg transition-all duration-200 hover:scale-105"
                                      title="Copy URL"
                                    >
                                      <FiCopy className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                                    Webhook Secret
                                  </label>
                                  <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                      <input
                                        type={
                                          showPayoutSecret ? "text" : "password"
                                        }
                                        value={
                                          payoutWebhookConfig.webhook_secret ||
                                          "Not available"
                                        }
                                        readOnly
                                        className="w-full px-4 py-2.5 pr-12 bg-[#263F43] border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent"
                                      />
                                      {payoutWebhookConfig.webhook_secret && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setShowPayoutSecret(
                                              !showPayoutSecret
                                            )
                                          }
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1.5"
                                          title={
                                            showPayoutSecret
                                              ? "Hide Secret"
                                              : "Show Secret"
                                          }
                                        >
                                          {showPayoutSecret ? (
                                            <FiEyeOff className="w-4 h-4" />
                                          ) : (
                                            <FiEye className="w-4 h-4" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                    {payoutWebhookConfig.webhook_secret && (
                                      <button
                                        onClick={() =>
                                          copyToClipboard(
                                            payoutWebhookConfig.webhook_secret
                                          )
                                        }
                                        className="bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2.5 rounded-lg transition-all duration-200 hover:scale-105"
                                        title="Copy Secret"
                                      >
                                        <FiCopy className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                                    Subscribed Events
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {payoutWebhookConfig.webhook_events?.map(
                                      (eventId) => {
                                        const event = payoutEvents.find(
                                          (e) => e.id === eventId
                                        );
                                        return (
                                          <span
                                            key={eventId}
                                            className="px-3 py-1.5 bg-accent/10 text-accent border border-accent/30 rounded-md text-xs font-medium font-['Albert_Sans']"
                                          >
                                            {event ? event.label : eventId}
                                          </span>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                  <span className="text-white/60 text-xs font-medium font-['Albert_Sans'] uppercase tracking-wider">
                                    Retry Attempts
                                  </span>
                                  <span className="text-white text-sm font-semibold font-['Albert_Sans']">
                                    {payoutWebhookConfig.webhook_retries || 3}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                              <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                                <FiLink className="text-accent text-2xl" />
                              </div>
                              <h4 className="text-lg font-medium text-white mb-2 font-['Albert_Sans']">
                                Payout Webhook
                              </h4>
                              <p className="text-white/60 text-sm text-center font-['Albert_Sans'] mb-4">
                                No payout webhook configured
                              </p>
                            </div>
                          )}
                        </motion.div>
                      </div>

                      {/* Crypto Payout Webhook Information Card */}
                      <motion.div
                        variants={itemVariants}
                        className="bg-[#122D32] border border-white/10 rounded-xl p-6 hover:border-accent/30 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <FiInfo className="text-purple-400 text-xl" />
                            </div>
                            <div>
                              <h4 className="text-lg font-medium text-white font-['Albert_Sans']">
                                Crypto Payout Webhook
                              </h4>
                              <p className="text-white/60 text-xs font-['Albert_Sans']">
                                Outgoing webhook to 3rd party crypto services
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium font-['Albert_Sans'] bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Outgoing
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                              Configuration Status
                            </label>
                            <div className="bg-[#263F43] border border-white/10 rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-white/70 text-sm font-['Albert_Sans']">
                                  3rd Party Webhook URL
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium font-['Albert_Sans'] ${
                                    cryptoWebhookSecret?.webhook_url_configured
                                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                      : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                  }`}
                                >
                                  {cryptoWebhookSecret?.webhook_url_configured
                                    ? "Configured"
                                    : "Not Configured"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-white/70 text-sm font-['Albert_Sans']">
                                  Webhook Secret
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium font-['Albert_Sans'] ${
                                    cryptoWebhookSecret?.secret_configured
                                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                      : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                  }`}
                                >
                                  {cryptoWebhookSecret?.secret_configured
                                    ? "Configured"
                                    : "Not Configured"}
                                </span>
                              </div>
                            </div>
                            <p className="text-white/50 text-xs mt-2 font-['Albert_Sans']">
                              When crypto payouts are processed, our system
                              automatically sends webhooks to the 3rd party
                              service configured in{" "}
                              <code className="bg-[#1F383D] px-1.5 py-0.5 rounded text-xs">
                                CRYPTO_WEBHOOK_URL
                              </code>{" "}
                              environment variable.
                            </p>
                          </div>

                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <FiInfo className="text-purple-400 text-lg flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="text-purple-400 font-medium text-sm mb-2 font-['Albert_Sans']">
                                  📍 3rd Party Endpoint Required
                                </h5>
                                <p className="text-white/70 text-xs font-['Albert_Sans'] mb-2">
                                  The 3rd party crypto service must expose a
                                  webhook endpoint to receive payout updates:
                                </p>
                                <div className="bg-[#1F383D] border border-purple-500/20 rounded p-3 mb-2">
                                  <code className="text-purple-300 text-xs font-mono">
                                    POST
                                    https://your-3rd-party-service.com/webhook/crypto-payout
                                  </code>
                                </div>
                                <p className="text-white/60 text-xs font-['Albert_Sans']">
                                  This URL should be set in your{" "}
                                  <code className="bg-[#1F383D] px-1.5 py-0.5 rounded text-xs">
                                    CRYPTO_WEBHOOK_URL
                                  </code>{" "}
                                  environment variable. Our system will send
                                  webhook requests to this endpoint when payout
                                  status changes.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                              Supported Events
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-md text-xs font-medium font-['Albert_Sans']">
                                payout.completed
                              </span>
                              <span className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-md text-xs font-medium font-['Albert_Sans']">
                                payout.failed
                              </span>
                              <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded-md text-xs font-medium font-['Albert_Sans']">
                                payout.pending
                              </span>
                            </div>
                          </div>

                          <div className="bg-[#263F43] border border-white/10 rounded-lg p-4">
                            <h5 className="text-white font-medium text-sm mb-2 font-['Albert_Sans']">
                              Webhook Payload Sent to 3rd Party:
                            </h5>
                            <pre className="text-xs text-white/80 font-mono overflow-x-auto bg-[#1F383D] p-3 rounded border border-white/5">
                              {`{
  "event": "payout.completed",
  "payout_id": "PAYOUT_REQ_1234567890_abc123",
  "transaction_hash": "0x1234...",
  "network": "ethereum",
  "currency": "USDT",
  "wallet_address": "0x742d...",
  "amount": 100.50,
  "timestamp": "2024-01-15T10:30:00Z",
  "explorer_url": "https://etherscan.io/tx/...",
  "status": "completed",
  "merchant_id": "...",
  "merchant_name": "...",
  "commission": 5.00,
  "gross_amount": 105.50,
  "net_amount": 100.50
}`}
                            </pre>
                            <p className="text-white/60 text-xs mt-2 font-['Albert_Sans']">
                              This payload is automatically sent to the 3rd
                              party when a crypto payout status changes.
                            </p>
                          </div>

                          <div>
                            <label className="block text-white/60 text-xs font-medium font-['Albert_Sans'] mb-2 uppercase tracking-wider">
                              Webhook Secret
                            </label>
                            {cryptoSecretLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {cryptoWebhookSecret?.secret_configured ? (
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <div className="flex-1 relative">
                                        <input
                                          type={
                                            showCryptoSecret
                                              ? "text"
                                              : "password"
                                          }
                                          value={
                                            generatedSecret ||
                                            cryptoWebhookSecret.secret ||
                                            "Configured (masked)"
                                          }
                                          readOnly
                                          className="w-full px-4 py-2.5 pr-12 bg-[#263F43] border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent"
                                        />
                                        {(generatedSecret ||
                                          cryptoWebhookSecret.secret) && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setShowCryptoSecret(
                                                !showCryptoSecret
                                              )
                                            }
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1.5"
                                            title={
                                              showCryptoSecret
                                                ? "Hide Secret"
                                                : "Show Secret"
                                            }
                                          >
                                            {showCryptoSecret ? (
                                              <FiEyeOff className="w-4 h-4" />
                                            ) : (
                                              <FiEye className="w-4 h-4" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => {
                                          const secretToCopy =
                                            generatedSecret ||
                                            cryptoWebhookSecret.secret;
                                          if (
                                            secretToCopy &&
                                            secretToCopy !==
                                              "Configured (masked)"
                                          ) {
                                            copyToClipboard(secretToCopy);
                                          }
                                        }}
                                        className="bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2.5 rounded-lg transition-all duration-200 hover:scale-105"
                                        title="Copy Secret"
                                        disabled={
                                          !generatedSecret &&
                                          !cryptoWebhookSecret.secret
                                        }
                                      >
                                        <FiCopy className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={handleGenerateCryptoSecret}
                                        disabled={cryptoSecretLoading}
                                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 px-4 py-2.5 rounded-lg text-xs font-medium font-['Albert_Sans'] transition-all duration-200 disabled:opacity-50"
                                        title="Regenerate Secret"
                                      >
                                        {cryptoSecretLoading ? (
                                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                          "Regenerate"
                                        )}
                                      </button>
                                    </div>
                                    {!generatedSecret &&
                                      cryptoWebhookSecret.secret &&
                                      cryptoWebhookSecret.secret.includes(
                                        "..."
                                      ) && (
                                        <p className="text-white/50 text-xs font-['Albert_Sans']">
                                          Secret is configured but masked for
                                          security. Generate a new one to see
                                          the full secret.
                                        </p>
                                      )}
                                  </div>
                                ) : (
                                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                    <p className="text-yellow-400 text-xs font-['Albert_Sans'] mb-2">
                                      ⚠️ Crypto webhook secret is not
                                      configured. Third-party services cannot
                                      verify webhook signatures.
                                    </p>
                                    <button
                                      onClick={handleGenerateCryptoSecret}
                                      disabled={cryptoSecretLoading}
                                      className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg text-xs font-medium font-['Albert_Sans'] transition-all duration-200 disabled:opacity-50"
                                    >
                                      {cryptoSecretLoading
                                        ? "Generating..."
                                        : "Generate Secret"}
                                    </button>
                                  </div>
                                )}

                                {generatedSecret && (
                                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                    <div className="flex items-start gap-2 mb-2">
                                      <FiCheck className="text-green-400 text-lg flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <h5 className="text-green-400 font-medium text-sm mb-1 font-['Albert_Sans']">
                                          New Secret Generated
                                        </h5>
                                        <p className="text-white/70 text-xs font-['Albert_Sans'] mb-2">
                                          Copy this secret and add it to your
                                          environment variables:
                                        </p>
                                        <div className="flex gap-2 mb-2">
                                          <input
                                            type="text"
                                            value={generatedSecret}
                                            readOnly
                                            className="flex-1 px-3 py-2 bg-[#1F383D] border border-green-500/30 rounded text-white text-xs font-mono"
                                          />
                                          <button
                                            onClick={() =>
                                              copyToClipboard(generatedSecret)
                                            }
                                            className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-2 rounded text-xs font-medium"
                                          >
                                            <FiCopy className="w-4 h-4" />
                                          </button>
                                        </div>
                                        <p className="text-yellow-400 text-xs font-['Albert_Sans']">
                                          ⚠️ This secret is shown only once.
                                          Save it securely!
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {!cryptoWebhookSecret?.secret_configured &&
                                  !generatedSecret && (
                                    <button
                                      onClick={handleGenerateCryptoSecret}
                                      disabled={cryptoSecretLoading}
                                      className="w-full bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 px-4 py-2.5 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                      {cryptoSecretLoading ? (
                                        <>
                                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <FiPlus className="w-4 h-4" />
                                          Generate Webhook Secret
                                        </>
                                      )}
                                    </button>
                                  )}
                              </div>
                            )}
                            <p className="text-white/50 text-xs mt-2 font-['Albert_Sans']">
                              Add this secret to your{" "}
                              <code className="bg-[#1F383D] px-1.5 py-0.5 rounded text-xs">
                                CRYPTO_WEBHOOK_SECRET
                              </code>{" "}
                              environment variable. The 3rd party service can
                              use this secret to verify webhook signatures.
                            </p>
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <FiInfo className="text-blue-400 text-lg flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="text-blue-400 font-medium text-sm mb-1 font-['Albert_Sans']">
                                  Configuration Instructions
                                </h5>
                                <ol className="text-white/70 text-xs font-['Albert_Sans'] space-y-1 list-decimal list-inside">
                                  <li>
                                    Set{" "}
                                    <code className="bg-[#1F383D] px-1.5 py-0.5 rounded text-xs">
                                      CRYPTO_WEBHOOK_URL
                                    </code>{" "}
                                    in your environment variables (3rd party's
                                    endpoint URL)
                                  </li>
                                  <li>
                                    Generate and set{" "}
                                    <code className="bg-[#1F383D] px-1.5 py-0.5 rounded text-xs">
                                      CRYPTO_WEBHOOK_SECRET
                                    </code>{" "}
                                    in your environment variables
                                  </li>
                                  <li>
                                    Restart your server after adding environment
                                    variables
                                  </li>
                                  <li>
                                    When crypto payouts are processed, webhooks
                                    are automatically sent to the 3rd party
                                  </li>
                                </ol>
                              </div>
                            </div>
                          </div>

                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <FiInfo className="text-green-400 text-lg flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="text-green-400 font-medium text-sm mb-1 font-['Albert_Sans']">
                                  Security Note
                                </h5>
                                <p className="text-white/70 text-xs font-['Albert_Sans']">
                                  Webhooks sent to the 3rd party are signed
                                  using HMAC-SHA256 with the webhook secret. The
                                  signature is included in the{" "}
                                  <code className="bg-[#1F383D] px-1.5 py-0.5 rounded text-xs">
                                    x-crypto-signature
                                  </code>{" "}
                                  header. The 3rd party can verify the signature
                                  to ensure the webhook is authentic.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <span className="text-white/60 text-xs font-medium font-['Albert_Sans'] uppercase tracking-wider">
                              Webhook Method
                            </span>
                            <span className="text-white text-sm font-semibold font-['Albert_Sans']">
                              POST (Outgoing)
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </section>
      </div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
};

export default WebhookPage;
