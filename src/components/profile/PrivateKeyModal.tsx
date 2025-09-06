// src/components/profile/PrivateKeyModal.tsx - WALLET FEATURES DISABLED
"use client";

import { useState } from "react";
import { X, Key, AlertTriangle, Shield, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { sendPasswordResetEmail, EmailData } from "@/lib/emailjs";

interface PrivateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletData: {
    id: string;
    name: string;
    address: string;
  } | null;
  userProfile: {
    email: string;
    displayName: string;
    authProvider?: "email" | "google";
    hasPassword?: boolean;
  };
}

type Step = "verify" | "email_verify" | "disabled";

export default function PrivateKeyModal({
  isOpen,
  onClose,
  walletData,
  userProfile,
}: PrivateKeyModalProps) {
  const [step, setStep] = useState<Step>("verify");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [generatedEmailCode, setGeneratedEmailCode] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Determine if user is Google-only
  const isGoogleOnlyUser =
    userProfile.authProvider === "google" && !userProfile.hasPassword;

  const handleClose = () => {
    setStep("verify");
    setPassword("");
    setEmailCode("");
    setGeneratedEmailCode("");
    setError("");
    setSendingEmail(false);
    onClose();
  };

  // Send email verification for Google users
  const sendEmailVerification = async () => {
    setSendingEmail(true);
    setError("");

    try {
      console.log("📧 Sending verification email for wallet access");

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedEmailCode(code);

      const emailData: EmailData = {
        to_email: userProfile.email,
        to_name: userProfile.displayName || "User",
        reset_code: code,
        app_name: "Blockpal - Wallet Access",
      };

      const emailSent = await sendPasswordResetEmail(emailData);

      if (!emailSent) {
        throw new Error("Failed to send verification email");
      }

      console.log("✅ Verification email sent successfully");
      console.log("🔑 Code for testing:", code);

      // After successful email verification, show disabled message
      setStep("disabled");
    } catch (error: any) {
      console.error("❌ Error sending verification email:", error);
      setError("Failed to send verification email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Verify email code for Google users
  const handleEmailVerification = async () => {
    if (!emailCode.trim() || emailCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    if (emailCode !== generatedEmailCode) {
      setError("Invalid verification code");
      return;
    }

    console.log("✅ Email verification successful");
    setError("");
    setStep("disabled");
  };

  // Password verification for email users
  const handlePasswordVerification = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Password verification (demo mode)");

      // Simulate password verification delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo purposes, accept any password
      console.log("✅ Password verified (demo mode)");
      setStep("disabled");
    } catch (error: any) {
      console.error("❌ Error in demo verification:", error);
      setError("Demo mode: verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-white/10" />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
        <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
            <div className="flex items-center">
              <Key size={20} className="text-[#E2AF19] mr-2" />
              <div>
                <h3 className="text-base font-semibold text-white font-satoshi">
                  Wallet Credentials
                </h3>
                <p className="text-gray-400 text-sm font-satoshi">
                  {walletData?.name || "Demo Wallet"}
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
            {/* Step 1: Verification */}
            {step === "verify" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield size={24} className="text-[#E2AF19]" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Verify Your Identity
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    {isGoogleOnlyUser
                      ? "We'll send a verification code to your email"
                      : "Please enter your account password to continue"}
                  </p>
                </div>

                {error && (
                  <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                )}

                {!isGoogleOnlyUser ? (
                  // Password verification for email users
                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Enter your account password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className="font-satoshi"
                      autoFocus
                      disabled={loading}
                    />

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={handleClose}
                        className="flex-1"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePasswordVerification}
                        disabled={loading || !password.trim()}
                        className="flex-1"
                      >
                        {loading ? "Verifying..." : "Verify Password"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Email verification for Google users
                  <div className="space-y-3">
                    <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24">
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
                        <div>
                          <p className="text-blue-400 text-sm font-satoshi font-medium">
                            Google Account
                          </p>
                          <p className="text-blue-300 text-xs font-satoshi">
                            {userProfile.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        sendEmailVerification();
                        setStep("email_verify");
                      }}
                      disabled={sendingEmail}
                      className="w-full"
                    >
                      {sendingEmail
                        ? "Sending Code..."
                        : "Send Verification Code"}
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={handleClose}
                      className="w-full"
                      disabled={sendingEmail}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Email Verification (Google users only) */}
            {step === "email_verify" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail size={24} className="text-[#E2AF19]" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Enter Verification Code
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    We sent a 6-digit code to{" "}
                    <strong>{userProfile.email}</strong>
                  </p>
                  <p className="text-gray-500 text-xs font-satoshi mt-1">
                    Please check your email inbox and spam folder
                  </p>
                </div>

                {error && (
                  <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                )}

                <Input
                  type="text"
                  placeholder="000000"
                  value={emailCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setEmailCode(value);
                    setError("");
                  }}
                  className="font-satoshi text-center text-xl tracking-widest"
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                />

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
                    onClick={handleEmailVerification}
                    disabled={loading || emailCode.length !== 6}
                    className="flex-1"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </Button>
                </div>

                <div className="text-center">
                  <button
                    onClick={sendEmailVerification}
                    className="text-[#E2AF19] hover:opacity-80 text-sm font-satoshi"
                    disabled={sendingEmail || loading}
                  >
                    {sendingEmail
                      ? "Sending..."
                      : "Didn't receive the code? Send again"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Feature Disabled Message */}
            {step === "disabled" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={24} className="text-yellow-400" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Wallet Features Disabled
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    Authentication successful, but wallet functionality is not
                    available in this demo version.
                  </p>
                </div>

                {/* Demo Notice */}
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
                  <p className="text-blue-400 text-sm font-satoshi">
                    <strong>Demo Mode Active:</strong>
                    <br />
                    • No real wallet connections
                    <br />
                    • No private key management
                    <br />
                    • Authentication system fully functional
                    <br />• UI demonstration only
                  </p>
                </div>

                <Button onClick={handleClose} className="w-full">
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
