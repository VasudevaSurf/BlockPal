// src/components/auth/LoginForm.tsx - FIXED VERSION
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { loginUser, clearError } from "@/store/slices/authSlice";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

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

  // Redirect on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      console.log("✅ User authenticated, redirecting to dashboard");
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Form validation
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
          setRequires2FA(true);
          setIsGoogle2FA(false);
          return;
        }

        console.error("❌ Login failed:", errorPayload);
        // Error is already set in Redux state
      } else {
        console.log("✅ Email login successful");
        // User will be redirected by useEffect
      }
    } catch (error) {
      console.error("💥 Login error:", error);
    }
  };

  // Handle 2FA code submission
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError("");

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setTwoFactorError("Please enter a valid 6-digit code");
      return;
    }

    try {
      if (isGoogle2FA && googleUserData) {
        console.log("🔐 Completing Google login with 2FA");
        await completeGoogleLoginWith2FA(googleUserData, twoFactorCode);
        console.log("✅ Google 2FA login successful");
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
          setTwoFactorError(
            errorPayload || "Invalid two-factor authentication code"
          );
          return;
        }

        console.log("✅ Email 2FA login successful");
      }

      // Reset 2FA state
      setRequires2FA(false);
      setTwoFactorCode("");
      setGoogleUserData(null);
      setIsGoogle2FA(false);
    } catch (error: any) {
      console.error("❌ 2FA verification error:", error);
      setTwoFactorError(error.message || "Invalid verification code");
    }
  };

  // Handle Google login
  const handleGoogleLogin = () => {
    console.log("🔐 Starting Google login");
    clearGoogleError();

    loginWithGoogle({
      onSuccess: (user) => {
        console.log("✅ Google login successful:", user);
        // User will be redirected by useEffect
      },
      onError: (error) => {
        console.error("❌ Google login error:", error);
      },
      on2FARequired: (email, googleData) => {
        console.log("🔐 Google login requires 2FA");
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

  // Loading state
  const isLoading = loading || googleLoading;

  // 2FA Form
  if (requires2FA) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white font-mayeka mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-gray-400 font-satoshi">
            {isGoogle2FA
              ? "Enter the 6-digit code from your authenticator app for your Google account"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
          <div className="mt-2 text-sm text-gray-500 font-satoshi">
            Signing in as: <span className="text-white">{formData.email}</span>
          </div>
        </div>

        {/* 2FA Error */}
        {twoFactorError && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle
                size={16}
                className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
              />
              <p className="text-red-400 text-sm font-satoshi">
                {twoFactorError}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handle2FASubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="000000"
            value={twoFactorCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setTwoFactorCode(value);
              setTwoFactorError("");
            }}
            className="font-satoshi text-center text-2xl tracking-widest"
            maxLength={6}
            autoFocus
            autoComplete="one-time-code"
          />

          <div className="flex gap-3">
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
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Verifying...
                </div>
              ) : (
                "Verify & Sign In"
              )}
            </Button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-gray-400 text-sm font-satoshi">
            Don't have access to your authenticator app?{" "}
            <button
              type="button"
              className="text-[#E2AF19] hover:opacity-80 font-medium"
              onClick={() => {
                // Handle backup codes or recovery
                alert("Please contact support for account recovery");
              }}
            >
              Use backup code
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Main Login Form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white font-mayeka mb-2">
          Welcome back
        </h2>
        <p className="text-gray-400 font-satoshi">
          Sign in to your Blockpal account
        </p>
      </div>

      {/* General Error Display */}
      {(error || googleError) && (
        <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle
              size={16}
              className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
            />
            <p className="text-red-400 text-sm font-satoshi">
              {error || googleError}
            </p>
          </div>
        </div>
      )}

      {/* Google Sign In Button */}
      <Button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        variant="secondary"
        className="w-full text-black hover:bg-gray-100 border-white font-satoshi"
        size="lg"
      >
        {googleLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 size={16} className="animate-spin mr-2" />
            Signing in with Google...
          </div>
        ) : (
          <div className="flex items-center justify-center">
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
          <span className="bg-black px-2 text-gray-400 font-satoshi">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-red-400 text-sm mt-1 font-satoshi">
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
              className="font-satoshi pr-10"
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {formErrors.password && (
            <p className="text-red-400 text-sm mt-1 font-satoshi">
              {formErrors.password}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full font-satoshi"
          size="lg"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <Loader2 size={16} className="animate-spin mr-2" />
              Signing in...
            </div>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      {/* Forgot Password Link */}
      <div className="text-center">
        <button
          type="button"
          className="text-[#E2AF19] hover:opacity-80 text-sm font-satoshi font-medium"
          onClick={() => {
            // Handle forgot password
            alert("Forgot password functionality coming soon!");
          }}
        >
          Forgot your password?
        </button>
      </div>
    </div>
  );
}
