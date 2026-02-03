// client/src/pages/Login.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../utils/api";
import FaceAuth from "../components/FaceAuth";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [requiresFaceAuth, setRequiresFaceAuth] = useState(false);
  const [requiresEmailOTP, setRequiresEmailOTP] = useState(false);
  const [emailOTP, setEmailOTP] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<number | null>(null);

  const { login, verifyLoginOTP } = useAuth();
  const navigate = useNavigate();

  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    cooldownRef.current = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) window.clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (requiresEmailOTP && resendCooldown === 0) startCooldown(60);
    return () => {
      if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    };
  }, [requiresEmailOTP, resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // SAVE EMAIL FOR FACE AUTH
    localStorage.setItem("loginEmail", email);

    try {
      await login(
        email,
        masterPassword,
        requires2FA ? twoFactorToken : undefined
      );
      navigate("/dashboard");
    } catch (err: any) {
      console.log("Login error/catch:", err);
      if (err.requires2FA) {
        setRequires2FA(true);
        setError(err.message);
      } else if (err.requiresFaceAuth) {
        setRequiresFaceAuth(true);
        console.log("Triggering FaceAuth component");
      } else if (err.requiresEmailOTP) {
        setRequiresEmailOTP(true);
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (requiresFaceAuth) {
    console.log("Rendering FaceAuth component");
    return <FaceAuth onSuccess={() => navigate("/dashboard")} />;
  }

  const handleVerifyEmailOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyLoginOTP(email, emailOTP, masterPassword);
      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await authAPI.resendOTP(email, "login");
      startCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to access your vault</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={requires2FA}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Master Password
            </label>
            <input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              required
              disabled={requires2FA}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="••••••••"
            />
          </div>

          {requires2FA && (
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                2FA Code
              </label>
              <input
                type="text"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          {requiresEmailOTP && (
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Email OTP
              </label>
              <input
                type="text"
                value={emailOTP}
                onChange={(e) => setEmailOTP(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the 6-digit code sent to your email
              </p>
            </div>
          )}

          {!requiresEmailOTP ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleVerifyEmailOTP}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 transition duration-200 disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend OTP"}
              </button>
            </div>
          )}
        </form>

        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
