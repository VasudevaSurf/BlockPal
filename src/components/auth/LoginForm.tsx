// src/components/auth/LoginForm.tsx - UPDATED with better Google auth
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ForgotPasswordModal from "./ForgotPasswordModal";
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

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { loading, error, isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  // Google Auth hook
  const {
    loading: googleLoading,
    error: googleError,
    loginWithGoogle,
    clearError: clearGoogleError,
  } = useGoogleAuth();

  // Debug: Log all state changes
  useEffect(() => {
    console.log("🔄 LoginForm State Change:", {
      isAuthenticated,
      loading,
      user: user ? { id: user.id, email: user.email } : null,
      error,
    });
  }, [isAuthenticated, loading, user, error]);

  // Handle navigation when authenticated
  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      console.log("🚀 NAVIGATING TO DASHBOARD");
      console.log("User authenticated:", user);

      // Check if cookies are available
      const cookies = document.cookie;
      console.log("🍪 Current cookies:", cookies);

      // Try multiple navigation methods
      console.log("Method 1: window.location.href");
      window.location.href = "/dashboard";

      // Backup method
      setTimeout(() => {
        console.log("Method 2: router.push (backup)");
        router.push("/dashboard");
      }, 100);

      // Last resort
      setTimeout(() => {
        console.log("Method 3: window.location.replace (last resort)");
        window.location.replace("/dashboard");
      }, 500);
    }
  }, [isAuthenticated, loading, user, router]);

  useEffect(() => {
    if (error) {
      console.log("❌ Login error:", error);
      // Clear error after 5 seconds
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
      // Clear Google error after 5 seconds
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔐 LOGIN FORM SUBMISSION");
    console.log("Email:", formData.email);
    console.log("Password length:", formData.password.length);

    if (!validateForm()) {
      console.log("❌ Form validation failed");
      return;
    }

    console.log("✅ Form validation passed");

    try {
      console.log("📤 Dispatching login action...");

      const result = await dispatch(
        loginUser({
          email: formData.email,
          password: formData.password,
        })
      );

      console.log("📥 Login action result:", result);

      if (loginUser.fulfilled.match(result)) {
        console.log("✅ Login fulfilled successfully");
        console.log("User data:", result.payload);

        // Check cookies immediately after login
        setTimeout(() => {
          const cookies = document.cookie;
          console.log("🍪 Cookies after login:", cookies);

          // Check if auth-token exists
          const hasAuthToken = cookies.includes("auth-token");
          console.log("🍪 Auth token in cookies:", hasAuthToken);
        }, 100);
      } else if (loginUser.rejected.match(result)) {
        console.log("❌ Login rejected:", result.error);
      } else {
        console.log("⚠️ Login result unclear:", result);
      }
    } catch (err) {
      console.error("💥 Login error:", err);
    }
  };

  const handleGoogleLogin = async () => {
    // Clear any existing errors
    setFormErrors((prev) => {
      const { google, ...rest } = prev;
      return rest;
    });
    clearGoogleError();

    await loginWithGoogle({
      onError: (error) => {
        setFormErrors({ google: error });
      },
    });
  };

  // Debug render
  console.log("🎨 LoginForm rendering with state:", {
    isAuthenticated,
    loading,
    hasUser: !!user,
    hasError: !!error,
    googleLoading,
    googleError,
  });

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2 font-mayeka">
          Login into your Account
        </h1>
        <p className="text-gray-400 font-satoshi">
          Welcome back! Select method to login
        </p>
      </div>

      {error && (
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
          disabled={loading || googleLoading}
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
          icon={<Mail size={20} />}
          className="font-satoshi"
          disabled={loading || googleLoading}
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
            icon={<Lock size={20} />}
            className="font-satoshi"
            disabled={loading || googleLoading}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading || googleLoading}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded focus:ring-2 bg-black border border-[#2C2C2C] text-[#E2AF19] focus:ring-[#E2AF19]"
              style={{ accentColor: "#E2AF19" }}
              disabled={loading || googleLoading}
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-400 font-satoshi"
            >
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-medium hover:opacity-80 text-[#E2AF19] font-satoshi"
              disabled={loading || googleLoading}
            >
              Forgotten Password?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full py-3 text-base font-semibold font-satoshi"
          disabled={loading || googleLoading}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
