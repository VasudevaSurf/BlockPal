// src/components/profile/TwoFactorSetupModal.tsx - COMPACT VERSION
"use client";

import { useState, useEffect } from "react";
import {
  X,
  Copy,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Shield,
  Download,
  Mail,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { sendPasswordResetEmail, EmailData } from "@/lib/emailjs";

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isEnabling: boolean; // true for enabling, false for disabling
  userProfile?: {
    email: string;
    displayName: string;
    authProvider?: "email" | "google";
    hasPassword?: boolean;
  };
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

type Step =
  | "password"
  | "email_verify"
  | "setup"
  | "verify"
  | "backup"
  | "disable";

export default function TwoFactorSetupModal({
  isOpen,
  onClose,
  onComplete,
  isEnabling,
  userProfile,
}: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<Step>("password");
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [generatedEmailCode, setGeneratedEmailCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [error, setError] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Determine if user has password or is Google-only
  const isGoogleOnlyUser =
    userProfile?.authProvider === "google" && !userProfile?.hasPassword;

  useEffect(() => {
    if (isOpen) {
      if (isEnabling) {
        // For enabling: Google users skip password, go to email verification
        setStep(isGoogleOnlyUser ? "email_verify" : "password");
      } else {
        // For disabling: Always go to verification step
        setStep("verify");
      }
      setPassword("");
      setEmailCode("");
      setGeneratedEmailCode("");
      setVerificationCode("");
      setError("");
      setSetupData(null);
    }
  }, [isOpen, isEnabling, isGoogleOnlyUser]);

  // Send email verification code for Google users
  const sendEmailVerification = async () => {
    if (!userProfile?.email) {
      setError("Email not available");
      return;
    }

    setSendingEmail(true);
    setError("");

    try {
      console.log("📧 Sending 2FA email verification to:", userProfile.email);

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedEmailCode(code);

      // Send email using the same service as forgot password
      const emailData: EmailData = {
        to_email: userProfile.email,
        to_name: userProfile.displayName || "User",
        reset_code: code,
        app_name: "Blockpal - 2FA Setup",
      };

      const emailSent = await sendPasswordResetEmail(emailData);

      if (!emailSent) {
        throw new Error("Failed to send verification email");
      }

      console.log("✅ 2FA verification email sent successfully");
      console.log("🔑 Code for testing:", code); // For development
    } catch (error: any) {
      console.error("❌ Error sending 2FA verification email:", error);
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

    console.log("✅ Email verification successful, proceeding to 2FA setup");
    setError("");

    // Proceed to generate 2FA setup
    await generate2FASetup();
  };

  // Generate 2FA setup data
  const generate2FASetup = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // For Google users, we skip password and use email verification
          password: isGoogleOnlyUser ? "GOOGLE_USER_VERIFIED" : password,
          action: "enable",
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to setup 2FA");
      }

      setSetupData(data.setupData);
      setStep("setup");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    await generate2FASetup();
  };

  const handleVerificationSubmit = async () => {
    if (!verificationCode.trim()) {
      setError("Verification code is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: verificationCode,
          action: isEnabling ? "enable" : "disable",
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      if (isEnabling) {
        setStep("backup");
      } else {
        onComplete();
        onClose();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = `Blockpal 2FA Backup Codes
Generated: ${new Date().toLocaleDateString()}

IMPORTANT: Store these codes in a safe place. Each code can only be used once.

${setupData.backupCodes
  .map((code, index) => `${index + 1}. ${code}`)
  .join("\n")}

If you lose access to your authenticator app, you can use these codes to regain access to your account.`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blockpal-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              <Shield size={20} className="text-[#E2AF19] mr-2" />
              <div>
                <h3 className="text-base font-semibold text-white font-satoshi">
                  {isEnabling ? "Enable" : "Disable"} Two-Factor Authentication
                </h3>
                <p className="text-gray-400 text-sm font-satoshi">
                  {isEnabling
                    ? "Secure your account with 2FA"
                    : "Remove 2FA from your account"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Step 1: Password Verification (for email/password users) */}
            {step === "password" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield size={24} className="text-[#E2AF19]" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Verify Your Password
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    Please enter your current password to continue
                  </p>
                </div>

                {error && (
                  <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                )}

                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="font-satoshi"
                  autoFocus
                />

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePasswordSubmit}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Verifying..." : "Continue"}
                  </Button>
                </div>
              </div>
            )}

            {/* NEW Step: Email Verification (for Google users) */}
            {step === "email_verify" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail size={24} className="text-[#E2AF19]" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Verify Your Email
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    Since you're using Google sign-in, we'll send a verification
                    code to your email
                  </p>
                </div>

                {/* Google Account Info */}
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
                        {userProfile?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                )}

                {!generatedEmailCode ? (
                  <Button
                    onClick={sendEmailVerification}
                    disabled={sendingEmail}
                    className="w-full"
                  >
                    {sendingEmail
                      ? "Sending Code..."
                      : "Send Verification Code"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm font-satoshi">
                        We sent a 6-digit code to{" "}
                        <strong>{userProfile?.email}</strong>
                      </p>
                      <p className="text-gray-500 text-xs font-satoshi mt-1">
                        Please check your email inbox and spam folder
                      </p>
                    </div>

                    <Input
                      type="text"
                      placeholder="000000"
                      value={emailCode}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6);
                        setEmailCode(value);
                        setError("");
                      }}
                      className="font-satoshi text-center text-xl tracking-widest"
                      maxLength={6}
                      autoFocus
                    />

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEmailVerification}
                        disabled={emailCode.length !== 6}
                        className="flex-1"
                      >
                        Verify Code
                      </Button>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={sendEmailVerification}
                        className="text-[#E2AF19] hover:opacity-80 text-sm font-satoshi"
                        disabled={sendingEmail}
                      >
                        {sendingEmail
                          ? "Sending..."
                          : "Didn't receive the code? Send again"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Setup Instructions (Enable only) */}
            {step === "setup" && setupData && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Smartphone size={24} className="text-[#E2AF19]" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Set Up Your Authenticator App
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    Scan the QR code or enter the setup key manually
                  </p>
                </div>

                {/* QR Code */}
                <div className="bg-white p-3 rounded-lg text-center">
                  <img
                    src={setupData.qrCodeUrl}
                    alt="2FA QR Code"
                    className="mx-auto w-40 h-40"
                  />
                </div>

                {/* Manual Entry */}
                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Setup Key:
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(setupData.manualEntryKey, "setup-key")
                      }
                      className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-sm"
                    >
                      <Copy size={12} className="mr-1" />
                      {copied === "setup-key" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-white font-mono text-sm break-all">
                    {setupData.manualEntryKey}
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
                  <h5 className="text-blue-400 font-semibold font-satoshi mb-1.5 text-sm">
                    Instructions:
                  </h5>
                  <ol className="text-blue-400 text-sm font-satoshi space-y-0.5">
                    <li>
                      1. Install an authenticator app (Google Authenticator,
                      Authy, etc.)
                    </li>
                    <li>2. Scan the QR code or enter the setup key manually</li>
                    <li>3. Enter the 6-digit code from your app below</li>
                  </ol>
                </div>

                <Button onClick={() => setStep("verify")} className="w-full">
                  I've Added the Account
                </Button>
              </div>
            )}

            {/* Step 3: Verification */}
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
                    {isEnabling
                      ? "Enter the 6-digit code from your authenticator app"
                      : "Enter your current 2FA code to disable"}
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
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(value);
                    setError("");
                  }}
                  className="font-satoshi text-center text-xl tracking-widest"
                  maxLength={6}
                  autoFocus
                />

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setStep(isEnabling ? "setup" : "password")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleVerificationSubmit}
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Backup Codes (Enable only) */}
            {step === "backup" && setupData && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-green-400" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Save Your Backup Codes
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    Store these codes safely. Each can only be used once.
                  </p>
                </div>

                {/* Backup Codes */}
                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Backup Codes:
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() =>
                          copyToClipboard(
                            setupData.backupCodes.join("\n"),
                            "backup-codes"
                          )
                        }
                        className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-sm"
                      >
                        <Copy size={12} className="mr-1" />
                        {copied === "backup-codes" ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={downloadBackupCodes}
                        className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-sm"
                      >
                        <Download size={12} className="mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {setupData.backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="bg-black p-1.5 rounded border border-[#2C2C2C]"
                      >
                        <span className="text-white font-mono text-sm">
                          {code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={14}
                      className="text-yellow-400 mr-1.5 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-yellow-400 text-sm font-satoshi font-medium mb-0.5">
                        Important Security Notice
                      </p>
                      <p className="text-yellow-400 text-xs font-satoshi">
                        • Save these codes in a secure location • Each code can
                        only be used once • You'll need these if you lose your
                        authenticator device • Don't share these codes with
                        anyone
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleComplete} className="w-full">
                  I've Saved My Backup Codes
                </Button>
              </div>
            )}

            {/* Disable 2FA Confirmation */}
            {step === "disable" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Disable Two-Factor Authentication
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    This will make your account less secure
                  </p>
                </div>

                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm font-satoshi">
                    <strong>Warning:</strong> Disabling 2FA will reduce your
                    account security. You'll only need your password (or Google
                    sign-in) to access your account.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep("verify")}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Continue to Disable
                  </Button>
                </div>
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
