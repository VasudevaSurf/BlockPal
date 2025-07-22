// src/components/auth/ForgotPasswordModal.tsx - FINAL FIXED VERSION
"use client";

import { useState } from "react";
import { X, Mail, Shield, Lock, AlertCircle, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { sendPasswordResetEmail, EmailData } from "@/lib/emailjs";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "email" | "verify" | "reset" | "success";

export default function ForgotPasswordModal({
  isOpen,
  onClose,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  // Reset state when modal opens/closes
  const handleClose = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
    setEmailSending(false);
    onClose();
  };

  // Step 1: Send reset code
  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("📤 Requesting reset code for:", email);

      // First, request reset code from backend
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset code");
      }

      console.log("📥 Backend response:", data);

      // NEW: Check if user exists and show appropriate error
      if (!data.userExists) {
        console.log("❌ User doesn't exist, showing error");
        setError(
          "No account found with this email address. Please check your email or register for a new account."
        );
        return;
      }

      // Check if we should actually send an email
      if (data.shouldSendEmail && data.emailData) {
        console.log("📧 Sending email to user...");
        setEmailSending(true);

        try {
          const emailSent = await sendPasswordResetEmail(
            data.emailData as EmailData
          );

          if (!emailSent) {
            setError(
              "Failed to send email. Please try again, or contact support if the problem persists."
            );
            return;
          }

          console.log("✅ Email sent successfully");
          setStep("verify");
        } catch (emailError) {
          console.error("❌ Email sending failed:", emailError);
          setError(
            "Failed to send email. Please try again, or contact support if the problem persists."
          );
          return;
        }
      } else {
        // Some other case - proceed to verification step
        setStep("verify");
      }

      // For development, log the reset code
      if (data.resetCode && process.env.NODE_ENV === "development") {
        console.log("🔑 Reset code for testing:", data.resetCode);
      }
    } catch (error: any) {
      console.error("❌ Error in handleSendCode:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setEmailSending(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      setStep("reset");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setStep("success");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
      <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
          <div className="flex items-center">
            <Lock size={20} className="text-[#E2AF19] mr-2" />
            <div>
              <h3 className="text-base font-semibold text-white font-satoshi">
                Reset Password
              </h3>
              <p className="text-gray-400 text-sm font-satoshi">
                {step === "email" && "Enter your email to receive a reset code"}
                {step === "verify" &&
                  "Enter the 6-digit code sent to your email"}
                {step === "reset" && "Create your new password"}
                {step === "success" && "Password reset successful"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step 1: Email */}
          {step === "email" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail size={24} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-1.5">
                  Enter Your Email
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  We'll send you a 6-digit verification code if your account
                  exists
                </p>
              </div>

              {error && (
                <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle
                      size={14}
                      className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                </div>
              )}

              {emailSending && (
                <div className="p-2.5 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-400 mr-2"></div>
                    <p className="text-blue-400 text-sm font-satoshi">
                      Sending email...
                    </p>
                  </div>
                </div>
              )}

              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                icon={<Mail size={18} />}
                className="font-satoshi"
                autoFocus
                disabled={loading || emailSending}
              />

              {/* NEW: Info box about account types */}
              <div className="bg-gray-900/20 border border-gray-600/50 rounded-lg p-2.5">
                <p className="text-gray-400 text-xs font-satoshi">
                  <strong>Note:</strong> If your account uses Google sign-in,
                  you'll need to sign in with Google instead. Password reset is
                  only available for email/password accounts.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={loading || emailSending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendCode}
                  disabled={loading || emailSending || !email.trim()}
                  className="flex-1"
                >
                  {loading
                    ? "Processing..."
                    : emailSending
                    ? "Sending Email..."
                    : "Send Code"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === "verify" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield size={24} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-1.5">
                  Enter Verification Code
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <p className="text-gray-500 text-xs font-satoshi mt-1.5">
                  Please check your email inbox and spam folder
                </p>
              </div>

              {error && (
                <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle
                      size={14}
                      className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                </div>
              )}

              <Input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(value);
                  setError("");
                }}
                className="font-satoshi text-center text-xl tracking-widest"
                maxLength={6}
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setStep("email")}
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                  className="flex-1"
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep("email")}
                  className="text-[#E2AF19] hover:opacity-80 text-sm font-satoshi"
                  disabled={loading}
                >
                  Didn't receive the code? Try again
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Reset Password */}
          {step === "reset" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock size={24} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-1.5">
                  Create New Password
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  Choose a strong password for your account
                </p>
              </div>

              {error && (
                <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle
                      size={14}
                      className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                </div>
              )}

              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                icon={<Lock size={18} />}
                className="font-satoshi"
                autoFocus
              />

              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                icon={<Lock size={18} />}
                className="font-satoshi"
              />

              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-2.5">
                <p className="text-blue-400 text-xs font-satoshi">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setStep("verify")}
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex-1"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={24} className="text-green-400" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-1.5">
                  Password Reset Successful
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  Your password has been successfully updated. You can now sign
                  in with your new password.
                </p>
              </div>

              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-2.5">
                <p className="text-green-400 text-sm font-satoshi text-center">
                  🎉 You can now log in with your new password!
                </p>
              </div>

              <Button onClick={handleClose} className="w-full">
                Continue to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
