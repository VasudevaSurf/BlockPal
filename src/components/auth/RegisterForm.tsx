// src/components/auth/RegisterForm.tsx - UPDATED with email verification
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { signInWithPopup } from "firebase/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerUser, clearError } from "@/store/slices/authSlice";
import { RootState, AppDispatch } from "@/store";
import { auth, googleProvider } from "@/lib/firebase";
import { sendPasswordResetEmail, EmailData } from "@/lib/emailjs";
import EyeOff from "../icons/EyeOffIcon";
import Eye from "../icons/EyeIcon";
import UserIcon from "../icons/UserIcon";
import MailIcon from "../icons/MailIcon";
import LockIcon from "../icons/LockIcon";
import { Shield, AlertCircle, CheckCircle, Mail } from "lucide-react";

type Step = "form" | "verify" | "success";

export default function RegisterForm() {
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { loading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // NEW: Send verification code
  const handleSendVerificationCode = async () => {
    if (!validateForm()) {
      return;
    }

    setSendingCode(true);
    setFormErrors({});

    try {
      console.log("📧 Sending verification code to:", formData.email);

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      // Send email using the same service as forgot password
      const emailData: EmailData = {
        to_email: formData.email,
        to_name: formData.name,
        reset_code: code,
        app_name: "Blockpal",
      };

      const emailSent = await sendPasswordResetEmail(emailData);

      if (!emailSent) {
        throw new Error("Failed to send verification email");
      }

      console.log("✅ Verification code sent successfully");
      console.log("🔑 Code for testing:", code); // For development

      setStep("verify");
    } catch (error: any) {
      console.error("❌ Error sending verification code:", error);
      setFormErrors({
        email: "Failed to send verification email. Please try again.",
      });
    } finally {
      setSendingCode(false);
    }
  };

  // NEW: Verify code and register
  const handleVerifyAndRegister = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setFormErrors({ code: "Please enter the 6-digit code" });
      return;
    }

    if (verificationCode !== generatedCode) {
      setFormErrors({ code: "Invalid verification code" });
      return;
    }

    setVerifyingCode(true);
    setFormErrors({});

    try {
      console.log("✅ Code verified, proceeding with registration");

      const result = await dispatch(
        registerUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        })
      );

      if (registerUser.fulfilled.match(result)) {
        setStep("success");
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setFormErrors({
          general: "Registration failed. Please try again.",
        });
        setStep("form");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setFormErrors({
        general: "Registration failed. Please try again.",
      });
      setStep("form");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setGoogleLoading(true);
      console.log("🔐 Starting Google registration...");

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("✅ Google auth successful:", {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
      });

      // Send user data to our backend with REGISTER action
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          action: "register", // Specify this is a registration attempt
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error(
            "An account with this Google email already exists. Please sign in instead."
          );
        }
        throw new Error(data.error || "Google registration failed");
      }

      console.log("✅ Google registration backend success:", data.user);

      // Manually update Redux state
      dispatch({
        type: "auth/registerUser/fulfilled",
        payload: data.user,
      });

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("❌ Google registration error:", error);

      // Clear any error state first
      setFormErrors({});

      // Set the appropriate error message
      if (error.message.includes("already exists")) {
        setFormErrors({
          google:
            "An account with this Google email already exists. Please sign in instead.",
        });
      } else if (error.message.includes("popup")) {
        setFormErrors({
          google:
            "Registration popup was blocked. Please allow popups and try again.",
        });
      } else {
        setFormErrors({
          google:
            error.message || "Google registration failed. Please try again.",
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Step 1: Registration Form
  if (step === "form") {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2 font-mayeka-bold-demo">
            Create your Account
          </h1>
          <p className="text-gray-400 font-satoshi">
            Let's get you set up, your journey starts here.
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

        {/* General Error */}
        {formErrors.general && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm font-satoshi">
              {formErrors.general}
            </p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendVerificationCode();
          }}
          className="space-y-3"
        >
          <Button
            type="button"
            variant="secondary"
            className="w-full flex items-center justify-center py-4 px-6 text-base font-satoshi"
            onClick={handleGoogleRegister}
            disabled={loading || googleLoading || sendingCode}
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
            {googleLoading ? "Creating account..." : "Register with Google"}
          </Button>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2C2C2C]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 text-gray-400 bg-black font-satoshi">
                OR
              </span>
            </div>
          </div>

          <Input
            type="text"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.name) {
                setFormErrors({ ...formErrors, name: "" });
              }
            }}
            error={formErrors.name}
            icon={<UserIcon size={16} color="#6E6E6E" />}
            className="font-satoshi w-full h-14 text-base px-4"
            disabled={loading || googleLoading || sendingCode}
          />

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
            icon={<MailIcon size={22} color="#6E6E6E" />}
            className="font-satoshi w-full h-14 text-base px-4"
            disabled={loading || googleLoading || sendingCode}
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Create password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (formErrors.password) {
                  setFormErrors({ ...formErrors, password: "" });
                }
              }}
              error={formErrors.password}
              icon={<LockIcon size={22} color="#6E6E6E" />}
              className="font-satoshi w-full h-14 text-base px-4"
              disabled={loading || googleLoading || sendingCode}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading || googleLoading || sendingCode}
            >
              {showPassword ? (
                <EyeOff size={22} color="#9CA3AF" />
              ) : (
                <Eye size={22} color="#9CA3AF" />
              )}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repeat password"
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                if (formErrors.confirmPassword) {
                  setFormErrors({ ...formErrors, confirmPassword: "" });
                }
              }}
              error={formErrors.confirmPassword}
              icon={<LockIcon size={22} color="#6E6E6E" />}
              className="font-satoshi w-full h-14 text-base px-4"
              disabled={loading || googleLoading || sendingCode}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading || googleLoading || sendingCode}
            >
              {showConfirmPassword ? (
                <EyeOff size={22} color="#9CA3AF" />
              ) : (
                <Eye size={22} color="#9CA3AF" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full py-4 px-6 text-lg font-semibold font-satoshi mt-4"
            disabled={loading || googleLoading || sendingCode}
          >
            {sendingCode ? "Sending Code..." : "Send Verification Code"}
          </Button>
        </form>
      </div>
    );
  }

  // Step 2: Email Verification
  if (step === "verify") {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-[#E2AF19]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-mayeka-bold-demo">
            Verify Your Email
          </h1>
          <p className="text-gray-400 font-satoshi">
            We sent a 6-digit code to <strong>{formData.email}</strong>
          </p>
          <p className="text-gray-500 text-sm font-satoshi mt-2">
            Please check your email inbox and spam folder
          </p>
        </div>

        {formErrors.code && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle
                size={16}
                className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
              />
              <p className="text-red-400 text-sm font-satoshi">
                {formErrors.code}
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyAndRegister();
          }}
          className="space-y-6"
        >
          <Input
            type="text"
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setVerificationCode(value);
              if (formErrors.code) {
                setFormErrors({ ...formErrors, code: "" });
              }
            }}
            className="font-satoshi text-center text-2xl tracking-widest"
            maxLength={6}
            autoFocus
            disabled={verifyingCode}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("form")}
              className="flex-1"
              disabled={verifyingCode}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={verifyingCode || verificationCode.length !== 6}
              className="flex-1"
            >
              {verifyingCode ? "Creating Account..." : "Verify & Register"}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleSendVerificationCode}
              className="text-[#E2AF19] hover:opacity-80 text-sm font-satoshi"
              disabled={verifyingCode || sendingCode}
            >
              {sendingCode
                ? "Sending..."
                : "Didn't receive the code? Send again"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 3: Success
  if (step === "success") {
    return (
      <div className="w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-mayeka-bold-demo">
            Account Created Successfully!
          </h1>
          <p className="text-gray-400 font-satoshi mb-6">
            Welcome to Blockpal! Redirecting you to the dashboard...
          </p>

          <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
            <p className="text-green-400 text-sm font-satoshi text-center">
              🎉 Your account has been verified and created successfully!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
