import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import authService from "../services/authService";
import { USER_ROLES } from "../constants/api";
import Toast from "./ui/Toast";
import { FiEye, FiEyeOff, FiEdit2, FiLock, FiMail } from "react-icons/fi";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  // Check if user is already authenticated and redirect accordingly
  useEffect(() => {
    if (authService.isAuthenticated()) {
      const role = authService.getRole();
      if (role === USER_ROLES.SUPERADMIN) {
        navigate("/superadmin", { replace: true });
      } else if (role === USER_ROLES.ADMIN) {
        navigate("/admin", { replace: true });
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { role } = await authService.login(
        formData.email,
        formData.password
      );

      // Redirect based on role
      if (role === USER_ROLES.SUPERADMIN) {
        navigate("/superadmin");
      } else if (role === USER_ROLES.ADMIN) {
        navigate("/admin");
      } else {
        setError(`Invalid role: ${role}. Expected 'admin' or 'superAdmin'`);
        setToast({ message: `Invalid role: ${role}`, type: "error" });
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      setToast({ message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#001D22] relative overflow-hidden">
      {/* Fixed X Graphic - Background Layer */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
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

      {/* Login Form - Centered Overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Login Card */}
          <div className="bg-[#122D32] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-sm">
            {/* Logo Section */}
            <div className="flex items-center justify-center mb-8">
              <img
                src="/X.png"
                alt="Ninex Group Logo"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>

            {/* Welcome Text */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2 font-['Albert_Sans']">
                Welcome Back
              </h1>
              <p className="text-white/60 text-sm sm:text-base font-['Albert_Sans']">
                Sign in to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 text-white/80 font-medium text-sm font-['Albert_Sans']"
                >
                  Company Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    <FiMail className="text-lg" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-20 py-3 bg-[#263F43] border border-white/10 rounded-lg text-sm transition-all duration-200 text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 hover:border-white/20 font-['Albert_Sans']"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-accent text-xs font-medium cursor-pointer flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-accent/10 font-['Albert_Sans']"
                  >
                    <span className="text-xs">
                      <FiEdit2 />
                    </span>
                    Modify
                  </button>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-white/80 font-medium text-sm font-['Albert_Sans']"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    <FiLock className="text-lg" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 bg-[#263F43] border border-white/10 rounded-lg text-sm transition-all duration-200 text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 hover:border-white/20 font-['Albert_Sans']"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-white/60 cursor-pointer p-1 rounded transition-colors hover:text-accent"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="text-base">
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex justify-between items-center">
                <label className="flex items-center cursor-pointer text-sm text-white/70 font-['Albert_Sans']">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="hidden"
                  />
                  <span
                    className={`w-5 h-5 border-2 border-accent rounded mr-2 relative transition-all duration-200 flex items-center justify-center ${
                      rememberMe ? "bg-accent" : "bg-[#263F43]"
                    }`}
                  >
                    {rememberMe && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </span>
                  Remember me
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm font-['Albert_Sans'] flex items-center gap-2">
                  <span className="text-lg">⚠</span>
                  {error}
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3.5 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white border-none rounded-lg text-base font-medium font-['Albert_Sans'] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
};

export default Login;
