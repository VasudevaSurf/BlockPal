// src/components/auth/ForgotPasswordModal.tsx - UPDATED with EmailJS
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

      console.log("Backend response:", data);

      // Check if we should actually send an email
      if (data.shouldSendEmail && data.emailData) {
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
      } else if (!data.userExists) {
        // User doesn't exist, but we show generic message for security
        setStep("verify");
        console.log(
          "ℹ️ User doesn't exist, but showing generic flow for security"
        );
      } else {
        // Some other case
        setStep("verify");
      }

      // For development, log the reset code
      if (data.resetCode) {
        console.log("🔑 Reset code for testing:", data.resetCode);
      }
    } catch (error: any) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <div className="flex items-center">
            <Lock size={24} className="text-[#E2AF19] mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-white font-satoshi">
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
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Email */}
          {step === "email" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Enter Your Email
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  We'll send you a 6-digit verification code
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-satoshi">{error}</p>
                </div>
              )}

              {emailSending && (
                <div className="p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
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
                icon={<Mail size={20} />}
                className="font-satoshi"
                autoFocus
              />

              <div className="flex gap-3">
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
                  disabled={loading || emailSending}
                  className="flex-1"
                >
                  {loading
                    ? "Sending..."
                    : emailSending
                    ? "Sending Email..."
                    : "Send Code"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === "verify" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={32} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Enter Verification Code
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <p className="text-gray-500 text-xs font-satoshi mt-2">
                  Please check your email inbox and spam folder
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-satoshi">{error}</p>
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
                className="font-satoshi text-center text-2xl tracking-widest"
                maxLength={6}
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setStep("email")}
                  className="flex-1"
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
                >
                  Didn't receive the code? Try again
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Reset Password */}
          {step === "reset" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={32} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Create New Password
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  Choose a strong password for your account
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-satoshi">{error}</p>
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
                icon={<Lock size={20} />}
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
                icon={<Lock size={20} />}
                className="font-satoshi"
              />

              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
                <p className="text-blue-400 text-xs font-satoshi">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setStep("verify")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Password Reset Successful
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  Your password has been successfully updated. You can now sign
                  in with your new password.
                </p>
              </div>

              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
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
