// src/components/auth/LoginForm.tsx - COMPLETE FIXED VERSION with Google 2FA (No scroll indicators)
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ForgotPasswordModal from "./ForgotPasswordModal";
import TwoFactorInput from "./TwoFactorInput";
import MailIcon from "../icons/MailIcon";
import LockIcon from "../icons/LockIcon";
import EyeIcon from "../icons/EyeIcon";
import EyeOffIcon from "../icons/EyeOffIcon";
import { loginUser, clearError } from "@/store/slices/authSlice";
import { RootState, AppDispatch } from "@/store";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{
    email: string;
    password?: string;
    isGoogle?: boolean;
    googleData?: any;
  } | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { loading, error, isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  // Google Auth hook with 2FA support
  const {
    loading: googleLoading,
    error: googleError,
    loginWithGoogle,
    completeGoogleLoginWith2FA,
    clearError: clearGoogleError,
  } = useGoogleAuth();

  // Debug logging for state changes
  useEffect(() => {
    console.log("🔄 LoginForm State Change:", {
      isAuthenticated,
      loading,
      user: user ? { id: user.id, email: user.email } : null,
      error,
      show2FA,
      pendingLogin: pendingLogin
        ? {
            email: pendingLogin.email,
            isGoogle: pendingLogin.isGoogle,
          }
        : null,
    });
  }, [isAuthenticated, loading, user, error, show2FA, pendingLogin]);

  // Handle navigation when authenticated
  useEffect(() => {
    if (isAuthenticated && !loading && user && !show2FA) {
      console.log("🚀 NAVIGATING TO DASHBOARD");
      console.log("User authenticated:", user);
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, loading, user, router, show2FA]);

  useEffect(() => {
    if (error) {
      console.log("❌ Login error:", error);
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Clear Google error when it changes
  useEffect(() => {
    if (googleError) {
      setFormErrors({ google: googleError });
      const timer = setTimeout(() => {
        clearGoogleError();
        setFormErrors((prev) => {
          const { google, ...rest } = prev;
          return rest;
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [googleError, clearGoogleError]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle 2FA verification for both email and Google logins
  const handle2FAVerification = async (code: string) => {
    if (!pendingLogin) {
      console.error("❌ No pending login data");
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError("");

    try {
      console.log("🔐 Verifying 2FA code for login...", {
        isGoogle: pendingLogin.isGoogle,
        email: pendingLogin.email,
      });

      if (pendingLogin.isGoogle) {
        // Handle Google login with 2FA
        console.log("🔐 Google 2FA verification...");

        const user = await completeGoogleLoginWith2FA(
          pendingLogin.googleData,
          code
        );

        console.log("✅ Google auth with 2FA successful:", user);

        // Close 2FA modal and clear pending login
        setShow2FA(false);
        setPendingLogin(null);
        setTwoFactorError("");
      } else {
        // Handle regular email/password login with 2FA
        console.log("🔐 Email 2FA verification...");

        const result = await dispatch(
          loginUser({
            email: pendingLogin.email,
            password: pendingLogin.password!,
            twoFactorCode: code,
          })
        );

        if (loginUser.fulfilled.match(result)) {
          console.log("✅ Login with 2FA successful");
          setShow2FA(false);
          setPendingLogin(null);
          setTwoFactorError("");
        } else if (loginUser.rejected.match(result)) {
          console.log("❌ Login with 2FA rejected:", result.error);
          throw new Error(
            result.error?.message || "Invalid two-factor authentication code"
          );
        }
      }
    } catch (error: any) {
      console.error("❌ 2FA verification failed:", error);
      setTwoFactorError(
        error.message || "Invalid two-factor authentication code"
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Handle 2FA cancellation
  const handle2FACancel = () => {
    console.log("🔐 2FA cancelled");
    setShow2FA(false);
    setPendingLogin(null);
    setTwoFactorError("");
    setTwoFactorLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔐 LOGIN FORM SUBMISSION");

    if (!validateForm()) {
      console.log("❌ Form validation failed");
      return;
    }

    console.log("✅ Form validation passed");

    try {
      const result = await dispatch(
        loginUser({
          email: formData.email,
          password: formData.password,
        })
      );

      if (loginUser.fulfilled.match(result)) {
        console.log("✅ Login fulfilled successfully");
      } else if (loginUser.rejected.match(result)) {
        console.log("❌ Login rejected:", result.error);

        // Check if 2FA is required
        const errorMessage = result.error?.message || "";
        if (
          errorMessage === "2FA_REQUIRED" ||
          result.payload === "2FA_REQUIRED"
        ) {
          console.log("🔐 2FA required, showing 2FA modal");
          setPendingLogin({
            email: formData.email,
            password: formData.password,
            isGoogle: false,
          });
          setShow2FA(true);
          return;
        }
      }
    } catch (err) {
      console.error("💥 Login error:", err);
    }
  };

  // Google login with 2FA support
  const handleGoogleLogin = async () => {
    console.log("🔐 LoginForm: Starting Google login");

    // Clear any existing errors
    setFormErrors((prev) => {
      const { google, ...rest } = prev;
      return rest;
    });
    clearGoogleError();

    await loginWithGoogle({
      onError: (error) => {
        console.error("❌ LoginForm: Google login error:", error);
        setFormErrors({ google: error });
      },
      onSuccess: (user) => {
        console.log("✅ LoginForm: Google login successful:", user);
        // Navigation will be handled by useEffect
      },
      // Handle 2FA requirement for Google login
      on2FARequired: (email, googleData) => {
        console.log("🔐 LoginForm: Google login requires 2FA for:", email);
        console.log("🔐 LoginForm: Setting pending login state");

        setPendingLogin({
          email: email,
          isGoogle: true,
          googleData: googleData,
        });

        console.log("🔐 LoginForm: Setting show2FA to true");
        setShow2FA(true);

        console.log("🔐 LoginForm: 2FA state updated");
      },
    });
  };

  return (
    <div
      className="w-full overflow-hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2 font-mayeka-bold-demo">
          Login into your Account
        </h1>
        <p className="text-gray-400 font-satoshi">
          Welcome back! Select method to login
        </p>
      </div>

      {error && !show2FA && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}

      {/* Google Error */}
      {formErrors.google && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm font-satoshi">
            {formErrors.google}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-center py-3 font-satoshi"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading || show2FA}
        >
          {googleLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#E2AF19] mr-2"></div>
          ) : (
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {googleLoading ? "Signing in..." : "Login with Google"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2C2C2C]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-400 bg-black font-satoshi">OR</span>
          </div>
        </div>

        <Input
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            if (formErrors.email) {
              setFormErrors({ ...formErrors, email: "" });
            }
          }}
          error={formErrors.email}
          icon={<MailIcon size={20} color="#6E6E6E" />}
          className="font-satoshi"
          disabled={loading || googleLoading || show2FA}
        />

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (formErrors.password) {
                setFormErrors({ ...formErrors, password: "" });
              }
            }}
            error={formErrors.password}
            icon={<LockIcon size={20} color="#6E6E6E" />}
            className="font-satoshi"
            disabled={loading || googleLoading || show2FA}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading || googleLoading || show2FA}
          >
            {showPassword ? (
              <EyeOffIcon size={20} color="#9CA3AF" />
            ) : (
              <EyeIcon size={20} color="#9CA3AF" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded-sm bg-transparent border-2 border-[#2C2C2C] text-[#E2AF19] 
                         focus:ring-2 focus:ring-[#E2AF19] focus:ring-offset-0 focus:border-[#E2AF19]
                         checked:bg-transparent checked:border-[#E2AF19] 
                         appearance-none relative cursor-pointer
                         before:content-[''] before:absolute before:inset-0 before:bg-transparent
                         checked:before:content-['✓'] checked:before:text-[#E2AF19] checked:before:text-xs 
                         checked:before:flex checked:before:items-center checked:before:justify-center 
                         checked:before:font-bold"
              disabled={loading || googleLoading || show2FA}
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-400 font-satoshi cursor-pointer"
            >
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-medium hover:opacity-80 text-[#E2AF19] font-satoshi"
              disabled={loading || googleLoading || show2FA}
            >
              Forgotten Password?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full py-3 text-base font-semibold font-satoshi"
          disabled={loading || googleLoading || show2FA}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>

      {/* 2FA Input Modal - Handles both email and Google 2FA */}
      {show2FA && (
        <TwoFactorInput
          isOpen={show2FA}
          onVerify={handle2FAVerification}
          onCancel={handle2FACancel}
          loading={twoFactorLoading}
          error={twoFactorError}
          email={pendingLogin?.email || ""}
          isGoogleAuth={pendingLogin?.isGoogle || false}
        />
      )}

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />

      {/* Debug info - only in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 bg-black border border-gray-600 rounded p-2 text-xs text-white max-w-xs">
          <div>
            <strong>Debug Info:</strong>
          </div>
          <div>show2FA: {String(show2FA)}</div>
          <div>googleLoading: {String(googleLoading)}</div>
          <div>
            pendingLogin:{" "}
            {pendingLogin
              ? `${pendingLogin.email} (Google: ${pendingLogin.isGoogle})`
              : "null"}
          </div>
          <div>twoFactorError: {twoFactorError}</div>
        </div>
      )}
    </div>
  );
}
