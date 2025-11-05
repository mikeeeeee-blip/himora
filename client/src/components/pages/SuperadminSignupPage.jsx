import React, { useState } from "react";
import signupService from "../../services/signupService";
import Navbar from "../Navbar";
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
        <div className="bg-transparent pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            <main className="space-y-6 sm:space-y-8">
              {/* Header */}
              <div className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white mb-3 font-['Albert_Sans']">
                    User Registration
                  </h1>
                  <p className="text-white/70 text-base sm:text-lg font-['Albert_Sans']">
                    Create merchant/admin accounts with complete business details
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

          <div className="create-form-card">
            <h3>Register New User</h3>
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-section">
                <h4>Basic Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      required
                      placeholder="Rajesh Kumar"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      required
                      placeholder="rajesh@electronics.com"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      required
                      placeholder="SecurePass123"
                    />
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        handleInputChange("role", e.target.value)
                      }
                      required
                    >
                      <option value="admin">Admin</option>
                      <option value="superAdmin">Super Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Business Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Business Name *</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) =>
                        handleInputChange("businessName", e.target.value)
                      }
                      required
                      placeholder="Rajesh Electronics"
                    />
                  </div>
                  <div className="form-group">
                    <label>Business Logo URL</label>
                    <input
                      type="url"
                      value={formData.businessLogo}
                      onChange={(e) =>
                        handleInputChange("businessLogo", e.target.value)
                      }
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Business Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Display Name</label>
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
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
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
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Website</label>
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
                    />
                  </div>
                  <div className="form-group">
                    <label>Support Email</label>
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
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Support Phone</label>
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
                    />
                  </div>
                  <div className="form-group">
                    <label>GSTIN</label>
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
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
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
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="primary-btn"
                >
                  {loading ? "Registering..." : "Register User"}
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
