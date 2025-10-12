// src/components/auth/LoginForm.tsx - UPDATED with working forgot password and loading states
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  X,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { loginUser, clearError } from "@/store/slices/authSlice";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ForgotPasswordModal from "./ForgotPasswordModal"; // Import the modal

// Toast Component
interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

const ToastContainer = ({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            max-w-sm p-4 rounded-lg border backdrop-blur-sm
            animate-in slide-in-from-right-full duration-300
            ${
              toast.type === "error"
                ? "bg-red-900/90 border-red-500/50 text-red-100"
                : toast.type === "success"
                ? "bg-green-900/90 border-green-500/50 text-green-100"
                : toast.type === "warning"
                ? "bg-yellow-900/90 border-yellow-500/50 text-yellow-100"
                : "bg-blue-900/90 border-blue-500/50 text-blue-100"
            }
          `}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              {toast.type === "error" && <AlertCircle size={20} />}
              {toast.type === "success" && <CheckCircle size={20} />}
              {toast.type === "warning" && <AlertTriangle size={20} />}
              {toast.type === "info" && <AlertCircle size={20} />}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm font-mayeka">
                {toast.title}
              </h4>
              <p className="text-xs font-satoshi mt-1 opacity-90">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Custom hook for toast management
const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showError = (title: string, message: string) => {
    addToast({ type: "error", title, message });
  };

  const showSuccess = (title: string, message: string) => {
    addToast({ type: "success", title, message });
  };

  const showWarning = (title: string, message: string) => {
    addToast({ type: "warning", title, message });
  };

  const showInfo = (title: string, message: string) => {
    addToast({ type: "info", title, message });
  };

  return {
    toasts,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
};

// Loading Overlay Component
const LoadingOverlay = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-black border border-[#2C2C2C] rounded-[16px] p-6 text-center max-w-sm mx-4">
      <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Loader2 size={24} className="animate-spin text-[#E2AF19]" />
      </div>
      <h3 className="text-white font-semibold font-mayeka mb-2">
        Redirecting to Dashboard
      </h3>
      <p className="text-gray-400 text-sm font-satoshi">{message}</p>
    </div>
  </div>
);

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Toast hook
  const { toasts, removeToast, showError, showSuccess } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // NEW: Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // NEW: Loading overlay state
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [googleUserData, setGoogleUserData] = useState<any>(null);
  const [isGoogle2FA, setIsGoogle2FA] = useState(false);

  // Google Auth hook
  const {
    loading: googleLoading,
    error: googleError,
    loginWithGoogle,
    completeGoogleLoginWith2FA,
    clearError: clearGoogleError,
  } = useGoogleAuth();

  // Clear errors when component mounts
  useEffect(() => {
    dispatch(clearError());
    clearGoogleError();
  }, [dispatch, clearGoogleError]);

  // Show toast only for critical errors that need user acknowledgment
  useEffect(() => {
    if (error) {
      // Only show toast for critical errors like wrong credentials, account issues, or server problems
      if (
        error.includes("Invalid") ||
        error.includes("incorrect") ||
        error.includes("wrong") ||
        error.includes("credentials")
      ) {
        showError(
          "Invalid Credentials",
          "The email or password you entered is incorrect. Please try again."
        );
      } else if (
        error.includes("account") &&
        (error.includes("locked") ||
          error.includes("suspended") ||
          error.includes("disabled"))
      ) {
        showError(
          "Account Issue",
          "Your account has been temporarily locked. Please contact support for assistance."
        );
      } else if (
        error.includes("network") ||
        error.includes("connection") ||
        error.includes("server") ||
        error.includes("timeout")
      ) {
        showError(
          "Connection Problem",
          "Unable to connect to our servers. Please check your internet connection and try again."
        );
      } else if (error.includes("rate") && error.includes("limit")) {
        showError(
          "Too Many Attempts",
          "Too many login attempts. Please wait a few minutes before trying again."
        );
      }
      // Don't show toast for 2FA_REQUIRED or other flow-related messages
    }
  }, [error, showError]);

  // Show toast only for critical Google auth errors
  useEffect(() => {
    if (
      googleError &&
      !googleError.includes("cancelled") &&
      !googleError.includes("popup")
    ) {
      showError("Google Sign-In Failed", googleError);
    }
  }, [googleError, showError]);

  // NEW: Enhanced redirect with loading overlay on successful authentication
  useEffect(() => {
    if (isAuthenticated && !isRedirecting) {
      console.log("✅ User authenticated, starting redirect process");

      setIsRedirecting(true);

      // Show success message
      showSuccess(
        "Login Successful!",
        "Welcome back! Redirecting to your dashboard..."
      );

      // Add a brief delay to show the success state, then redirect
      setTimeout(() => {
        console.log("🚀 Redirecting to dashboard");
        router.push("/dashboard");

        // Reset the redirecting state after a delay in case something goes wrong
        setTimeout(() => {
          setIsRedirecting(false);
        }, 2000);
      }, 1500); // 1.5 second delay to show success message
    }
  }, [isAuthenticated, router, showSuccess, isRedirecting]);

  // Form validation (no toast for validation - inline errors are sufficient)
  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error when user starts typing
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Clear general error
    if (error) {
      dispatch(clearError());
    }
  };

  // Handle regular email/password login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    dispatch(clearError());
    setTwoFactorError("");

    if (!validateForm()) {
      return;
    }

    try {
      console.log("🔐 Attempting email/password login");

      const result = await dispatch(
        loginUser({
          email: formData.email,
          password: formData.password,
          ...(requires2FA && { twoFactorCode }),
        })
      );

      if (result.type === "auth/loginUser/rejected") {
        const errorPayload = result.payload as string;

        if (errorPayload === "2FA_REQUIRED") {
          console.log("🔐 2FA required for email login");
          // No toast needed - 2FA is a normal flow continuation
          setRequires2FA(true);
          setIsGoogle2FA(false);
          return;
        }

        console.error("❌ Login failed:", errorPayload);
        // Error toast will be shown by useEffect
      } else {
        console.log("✅ Email login successful");
        // Success toast and redirect will be handled by useEffect
      }
    } catch (error) {
      console.error("💥 Login error:", error);
      showError(
        "Connection Error",
        "An unexpected error occurred. Please try again."
      );
    }
  };

  // Handle 2FA code submission
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError("");

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      const errorMsg = "Please enter a valid 6-digit code";
      setTwoFactorError(errorMsg);
      // No toast needed - inline error is sufficient for validation
      return;
    }

    try {
      if (isGoogle2FA && googleUserData) {
        console.log("🔐 Completing Google login with 2FA");
        await completeGoogleLoginWith2FA(googleUserData, twoFactorCode);
        console.log("✅ Google 2FA login successful");
        // No toast needed - success flows continue naturally
      } else {
        console.log("🔐 Completing email login with 2FA");
        const result = await dispatch(
          loginUser({
            email: formData.email,
            password: formData.password,
            twoFactorCode,
          })
        );

        if (result.type === "auth/loginUser/rejected") {
          const errorPayload = result.payload as string;
          const errorMsg =
            errorPayload || "Invalid two-factor authentication code";
          setTwoFactorError(errorMsg);
          // Show toast for wrong 2FA code since user needs to try again
          showError(
            "Invalid Code",
            "The authentication code you entered is incorrect. Please try again."
          );
          return;
        }

        console.log("✅ Email 2FA login successful");
        // No toast needed - success flows continue naturally
      }

      // Reset 2FA state
      setRequires2FA(false);
      setTwoFactorCode("");
      setGoogleUserData(null);
      setIsGoogle2FA(false);
    } catch (error: any) {
      console.error("❌ 2FA verification error:", error);
      const errorMsg = error.message || "Invalid verification code";
      setTwoFactorError(errorMsg);
      // Show toast for 2FA errors since user needs to understand what went wrong
      showError("Verification Failed", errorMsg);
    }
  };

  // Handle Google login
  const handleGoogleLogin = () => {
    console.log("🔐 Starting Google login");
    clearGoogleError();

    loginWithGoogle({
      onSuccess: (user) => {
        console.log("✅ Google login successful:", user);
        // No toast needed - success flows continue naturally to redirect
      },
      onError: (error) => {
        console.error("❌ Google login error:", error);
        // Error toast will be shown by useEffect if it's a critical error
      },
      on2FARequired: (email, googleData) => {
        console.log("🔐 Google login requires 2FA");
        // No toast needed - 2FA is a normal flow continuation
        setRequires2FA(true);
        setIsGoogle2FA(true);
        setGoogleUserData(googleData);
        setFormData((prev) => ({ ...prev, email }));
      },
    });
  };

  // Back to login form
  const handleBackToLogin = () => {
    setRequires2FA(false);
    setTwoFactorCode("");
    setTwoFactorError("");
    setGoogleUserData(null);
    setIsGoogle2FA(false);
    dispatch(clearError());
  };

  // NEW: Handle forgot password button click
  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
  };

  // Loading state
  const isLoading = loading || googleLoading;

  // 2FA Form
  if (requires2FA) {
    return (
      <>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white font-mayeka mb-1">
              Two-Factor Authentication
            </h2>
            <p className="text-gray-400 font-satoshi text-sm">
              {isGoogle2FA
                ? "Enter the 6-digit code from your authenticator app for your Google account"
                : "Enter the 6-digit code from your authenticator app"}
            </p>
            <div className="mt-1 text-xs text-gray-500 font-satoshi">
              Signing in as:{" "}
              <span className="text-white">{formData.email}</span>
            </div>
          </div>

          {/* 2FA Error */}
          {twoFactorError && (
            <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
              <div className="flex items-start">
                <AlertCircle
                  size={14}
                  className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
                />
                <p className="text-red-400 text-xs font-satoshi">
                  {twoFactorError}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handle2FASubmit} className="space-y-3">
            <Input
              type="text"
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTwoFactorCode(value);
                setTwoFactorError("");
              }}
              className="font-satoshi text-center text-lg tracking-widest"
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBackToLogin}
                disabled={isLoading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || twoFactorCode.length !== 6}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin mr-1" />
                    Verifying...
                  </div>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-gray-400 text-xs font-satoshi">
              Don't have access to your authenticator app?{" "}
              <button
                type="button"
                className="text-[#E2AF19] hover:opacity-80 font-medium"
                onClick={() => {
                  showError(
                    "Account Recovery",
                    "Please contact our support team for assistance with account recovery."
                  );
                }}
              >
                Use backup code
              </button>
            </p>
          </div>
        </div>
      </>
    );
  }

  // Main Login Form
  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* NEW: Loading Overlay */}
      {isRedirecting && (
        <LoadingOverlay message="Setting up your workspace..." />
      )}

      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-white font-mayeka mb-1">
            Welcome back
          </h2>
          <p className="text-gray-400 font-satoshi text-sm">
            Sign in to your Blockpal account
          </p>
        </div>

        {/* Google Sign In Button */}
        <Button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          variant="secondary"
          className="w-full text-black border-white font-satoshi"
          size="md"
        >
          {googleLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 size={14} className="animate-spin mr-2" />
              Signing in with Google...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
              Continue with Google
            </div>
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#2C2C2C]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-black px-2 text-gray-400 font-satoshi text-xs">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              className="font-satoshi"
              autoComplete="email"
              disabled={isLoading}
            />
            {formErrors.email && (
              <p className="text-red-400 text-xs mt-1 font-satoshi">
                {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                className="font-satoshi pr-8"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
            {formErrors.password && (
              <p className="text-red-400 text-xs mt-1 font-satoshi">
                {formErrors.password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full font-satoshi"
            size="md"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 size={14} className="animate-spin mr-2" />
                Signing in...
              </div>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* NEW: Updated Forgot Password Link */}
        <div className="text-center">
          <button
            type="button"
            className="text-[#E2AF19] hover:opacity-80 text-xs font-satoshi font-medium"
            onClick={handleForgotPasswordClick}
            disabled={isLoading}
          >
            Forgot your password?
          </button>
        </div>
      </div>

      {/* NEW: Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  );
}
