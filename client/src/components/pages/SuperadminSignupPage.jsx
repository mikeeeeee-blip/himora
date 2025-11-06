import React, { useState } from "react";
import { FiX, FiCopy, FiCheck } from "react-icons/fi";
import signupService from "../../services/signupService";
import "./PageLayout.css";
import Toast from "../ui/Toast";

const SuperadminSignupPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUserData, setCreatedUserData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Function to copy entire welcome message to clipboard
  const copyAllMessage = () => {
    if (!createdUserData) return;

    const fullMessage = `Hello ${createdUserData.name || "Merchant"},

Welcome to Ninexgroup Payment Gateway, your trusted platform for seamless and secure online payments. We're excited to have you on board!

We are proud to partner with Cashfree and Zifypay to ensure smooth and reliable payment processing.

Login Details:

Portal: https://payments.ninex-group.com/

Email: ${createdUserData.email}

Password: ${createdUserData.password}

If you have any questions or need assistance, our support team is always here to help.

Start managing your payments today!

Best regards,

The Ninexgroup Team`;

    navigator.clipboard.writeText(fullMessage);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    businessName: "",
    businessLogo: "",
    businessDetails: {
      displayName: "",
      description: "",
      website: "",
      supportEmail: "",
      supportPhone: "",
      address: "",
    },
  });

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Trim and validate all fields
      const trimmedName = formData.name?.trim() || "";
      const trimmedEmail = formData.email?.trim() || "";
      const trimmedPassword = formData.password?.trim() || "";
      const role = formData.role || "admin";

      // Validation
      if (!trimmedName || !trimmedEmail || !trimmedPassword) {
        throw new Error("Please fill all required fields");
      }

      if (trimmedName.length < 2) {
        throw new Error("Name must be at least 2 characters");
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new Error("Please enter a valid email address");
      }

      if (trimmedPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (!["admin", "superAdmin"].includes(role)) {
        throw new Error("Please select a valid role");
      }

      // Prepare clean data for API - only send required fields
      const signupData = {
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        password: trimmedPassword,
        role: role,
      };

      console.log("Sending signup data:", { ...signupData, password: "***" });
      const result = await signupService.signup(signupData);
      setSuccess("User registered successfully!");
      setToast({ message: "User registered successfully!", type: "success" });

      // Store user data for modal
      setCreatedUserData({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        businessName: formData.businessName || formData.name,
      });

      // Show success modal
      setShowSuccessModal(true);

      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "admin",
      });
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#001D22]">
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

      {/* Scrollable Content Section */}
      <section className="relative z-10 min-h-screen bg-transparent">
        {/* Spacer to show 70% of image initially */}
        <div className="h-[calc(50vh-4rem)] sm:h-[calc(55vh-4rem)]"></div>

        {/* Content Section - Scrolls over image */}
        <div className="bg-transparent pt-2 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            <main className="space-y-6 sm:space-y-8">
              {/* Header */}
              <div className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white mb-3 font-['Albert_Sans']">
                    User Registration
                  </h1>
                  <p className="text-white/70 text-base sm:text-lg font-['Albert_Sans']">
                    Create merchant/admin accounts with complete business
                    details
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {error && (
                  <div className="text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 font-['Albert_Sans']">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="text-green-400 bg-green-500/20 border border-green-500/40 rounded-lg p-4 font-['Albert_Sans']">
                    {success}
                  </div>
                )}

                <div className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <h3 className="text-xl sm:text-2xl font-medium text-white font-['Albert_Sans']">
                      Register New User
                    </h3>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            required
                            placeholder="Enter full name"
                            className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            required
                            placeholder="Enter email address"
                            className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                            Password *
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) =>
                              handleInputChange("password", e.target.value)
                            }
                            required
                            placeholder="Enter password"
                            className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                            Role *
                          </label>
                          <select
                            value={formData.role}
                            onChange={(e) =>
                              handleInputChange("role", e.target.value)
                            }
                            required
                            className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                          >
                            <option value="admin" className="bg-[#263F43]">
                              Admin
                            </option>
                            <option value="superAdmin" className="bg-[#263F43]">
                              Super Admin
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/10">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[#122D32] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Registering...</span>
                          </>
                        ) : (
                          "Register User"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      {/* Success Modal */}
      {showSuccessModal && createdUserData && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSuccessModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl sm:text-2xl font-medium text-white font-['Albert_Sans']">
                🎉 User Created Successfully!
              </h3>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-white/70 hover:text-white transition-colors duration-200 p-2 hover:bg-white/5 rounded-lg"
                aria-label="Close modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Welcome Message */}
              <div className="bg-[#263F43] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="space-y-3 text-white/90 font-['Albert_Sans'] leading-relaxed">
                  <p className="text-base">
                    Hello {createdUserData.name || "Merchant"},
                  </p>
                  <p className="text-base">
                    Welcome to Ninexgroup Payment Gateway, your trusted platform
                    for seamless and secure online payments. We're excited to
                    have you on board!
                  </p>
                  <p className="text-base">
                    We are proud to partner with Cashfree and Zifypay to ensure
                    smooth and reliable payment processing.
                  </p>
                </div>
              </div>

              {/* Login Details Section */}
              <div className="bg-[#263F43] border border-white/10 rounded-lg p-6 space-y-4">
                <h4 className="text-lg font-semibold text-white font-['Albert_Sans']">
                  Login Details:
                </h4>

                {/* Portal */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 font-['Albert_Sans']">
                    Portal:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="https://payments.ninex-group.com/"
                      readOnly
                      className="flex-1 px-4 py-2.5 bg-[#001D22] border border-white/10 rounded-lg text-white font-['Albert_Sans'] text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          "https://payments.ninex-group.com/"
                        );
                        setCopiedField("portal");
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="p-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-lg text-accent transition-all duration-200"
                      title="Copy portal URL"
                    >
                      {copiedField === "portal" ? (
                        <FiCheck className="w-5 h-5" />
                      ) : (
                        <FiCopy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 font-['Albert_Sans']">
                    Email:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={createdUserData.email}
                      readOnly
                      className="flex-1 px-4 py-2.5 bg-[#001D22] border border-white/10 rounded-lg text-white font-['Albert_Sans'] text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdUserData.email);
                        setCopiedField("email");
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="p-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-lg text-accent transition-all duration-200"
                      title="Copy email"
                    >
                      {copiedField === "email" ? (
                        <FiCheck className="w-5 h-5" />
                      ) : (
                        <FiCopy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 font-['Albert_Sans']">
                    Password:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={createdUserData.password}
                      readOnly
                      className="flex-1 px-4 py-2.5 bg-[#001D22] border border-white/10 rounded-lg text-white font-['Albert_Sans'] text-sm font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdUserData.password);
                        setCopiedField("password");
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="p-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-lg text-accent transition-all duration-200"
                      title="Copy password"
                    >
                      {copiedField === "password" ? (
                        <FiCheck className="w-5 h-5" />
                      ) : (
                        <FiCopy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Support Message */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-sm text-green-400 font-['Albert_Sans']">
                  If you have any questions or need assistance, our support team
                  is always here to help.
                </p>
              </div>

              {/* Closing Message */}
              <div className="text-center">
                <p className="text-white/80 font-['Albert_Sans']">
                  Start managing your payments today!
                </p>
                <p className="text-white/60 text-sm mt-2 font-['Albert_Sans']">
                  Best regards,
                </p>
                <p className="text-white/60 text-sm font-['Albert_Sans']">
                  The Ninexgroup Team
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={copyAllMessage}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 py-2.5 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[#122D32]"
              >
                {copiedAll ? (
                  <>
                    <FiCheck className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="w-4 h-4" />
                    <span>Copy All</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex items-center justify-center gap-2 bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white px-6 py-2.5 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[#122D32]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminSignupPage;
