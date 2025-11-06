import React, { useState } from "react";
import signupService from "../../services/signupService";
import "./PageLayout.css";
import Toast from "../ui/Toast";

const SuperadminSignupPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState({ message: "", type: "success" });
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
      gstin: "",
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
      if (
        !formData.name ||
        !formData.email ||
        !formData.password ||
        !formData.businessName
      ) {
        throw new Error("Please fill all required fields");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error("Please enter a valid email address");
      }
      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const result = await signupService.signup(formData);
      setSuccess("User registered successfully!");
      setToast({ message: "User registered successfully!", type: "success" });

      // Reset form
      setFormData({
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
          gstin: "",
        },
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
                      <div>
                        <h4 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/10 font-['Albert_Sans']">
                          Basic Information
                        </h4>
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
                              placeholder="Rajesh Kumar"
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
                              placeholder="rajesh@electronics.com"
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
                              placeholder="SecurePass123"
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
                              <option
                                value="superAdmin"
                                className="bg-[#263F43]"
                              >
                                Super Admin
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/10 font-['Albert_Sans']">
                          Business Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                              Business Name *
                            </label>
                            <input
                              type="text"
                              value={formData.businessName}
                              onChange={(e) =>
                                handleInputChange(
                                  "businessName",
                                  e.target.value
                                )
                              }
                              required
                              placeholder="Rajesh Electronics"
                              className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                              Business Logo URL
                            </label>
                            <input
                              type="url"
                              value={formData.businessLogo}
                              onChange={(e) =>
                                handleInputChange(
                                  "businessLogo",
                                  e.target.value
                                )
                              }
                              placeholder="https://example.com/logo.png"
                              className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/10 font-['Albert_Sans']">
                          Business Details
                        </h4>
                        <div className="space-y-4 sm:space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                                Display Name
                              </label>
                              <input
                                type="text"
                                value={formData.businessDetails.displayName}
                                onChange={(e) =>
                                  handleInputChange(
                                    "businessDetails.displayName",
                                    e.target.value
                                  )
                                }
                                placeholder="Rajesh Electronics - Your Trusted Partner"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                                Description
                              </label>
                              <input
                                type="text"
                                value={formData.businessDetails.description}
                                onChange={(e) =>
                                  handleInputChange(
                                    "businessDetails.description",
                                    e.target.value
                                  )
                                }
                                placeholder="Best electronics store in Pune"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                                Website
                              </label>
                              <input
                                type="url"
                                value={formData.businessDetails.website}
                                onChange={(e) =>
                                  handleInputChange(
                                    "businessDetails.website",
                                    e.target.value
                                  )
                                }
                                placeholder="https://rajeshelectronics.com"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                                Support Email
                              </label>
                              <input
                                type="email"
                                value={formData.businessDetails.supportEmail}
                                onChange={(e) =>
                                  handleInputChange(
                                    "businessDetails.supportEmail",
                                    e.target.value
                                  )
                                }
                                placeholder="support@rajeshelectronics.com"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                                Support Phone
                              </label>
                              <input
                                type="tel"
                                value={formData.businessDetails.supportPhone}
                                onChange={(e) =>
                                  handleInputChange(
                                    "businessDetails.supportPhone",
                                    e.target.value
                                  )
                                }
                                placeholder="9876543210"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                                GSTIN
                              </label>
                              <input
                                type="text"
                                value={formData.businessDetails.gstin}
                                onChange={(e) =>
                                  handleInputChange(
                                    "businessDetails.gstin",
                                    e.target.value
                                  )
                                }
                                placeholder="27AABCU9603R1ZM"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-white/80 font-['Albert_Sans']">
                              Address
                            </label>
                            <textarea
                              value={formData.businessDetails.address}
                              onChange={(e) =>
                                handleInputChange(
                                  "businessDetails.address",
                                  e.target.value
                                )
                              }
                              placeholder="123 MG Road, Pune, Maharashtra 411001"
                              rows="3"
                              className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans'] transition-all resize-none"
                            />
                          </div>
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
    </div>
  );
};

export default SuperadminSignupPage;
