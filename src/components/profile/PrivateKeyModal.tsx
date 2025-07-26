// src/components/profile/PrivateKeyModal.tsx
"use client";

import { useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Copy,
  Shield,
  Key,
  AlertTriangle,
  Mail,
  CheckCircle,
  Download,
} from "lucide-react";
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

type Step = "verify" | "email_verify" | "display";

interface WalletCredentials {
  privateKey: string;
  mnemonic?: string;
}

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

  // Wallet credentials state
  const [credentials, setCredentials] = useState<WalletCredentials | null>(
    null
  );
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState<string>("");

  // Determine if user is Google-only
  const isGoogleOnlyUser =
    userProfile.authProvider === "google" && !userProfile.hasPassword;

  const handleClose = () => {
    setStep("verify");
    setPassword("");
    setEmailCode("");
    setGeneratedEmailCode("");
    setError("");
    setCredentials(null);
    setShowPrivateKey(false);
    setShowMnemonic(false);
    setCopied("");
    setSendingEmail(false);
    onClose();
  };

  // Send email verification for Google users
  const sendEmailVerification = async () => {
    setSendingEmail(true);
    setError("");

    try {
      console.log("📧 Sending verification email for private key access");

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
    await fetchWalletCredentials("GOOGLE_USER_VERIFIED");
  };

  // Password verification for email users
  const handlePasswordVerification = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    // First verify the password with the backend before fetching wallet credentials
    setLoading(true);
    setError("");

    try {
      console.log("🔐 Verifying account password...");

      // Use a temporary password verification endpoint (similar to 2FA setup)
      const response = await fetch("/api/profile/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: password,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          data.error?.includes("incorrect") ||
          data.error?.includes("Invalid")
        ) {
          setError("Incorrect password. Please try again.");
        } else {
          setError(data.error || "Password verification failed");
        }
        setLoading(false);
        return;
      }

      console.log("✅ Password verified successfully");

      // Now fetch wallet credentials with verified password
      await fetchWalletCredentials(password);
    } catch (error: any) {
      console.error("❌ Error verifying password:", error);
      setError("Network error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Fetch wallet credentials from API
  const fetchWalletCredentials = async (authValue: string) => {
    if (!walletData) {
      setError("No wallet selected");
      return;
    }

    // Don't set loading here since it's already set in handlePasswordVerification
    // setLoading(true);
    setError("");

    try {
      console.log("🔑 Fetching wallet credentials for:", walletData.address);

      const response = await fetch("/api/wallets/private-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: walletData.address,
          password: authValue, // This should be the verified password or "GOOGLE_USER_VERIFIED"
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // Since we already verified the password, this should be a different error
        setError(data.error || "Failed to retrieve wallet credentials");
        return;
      }

      console.log("✅ Wallet credentials retrieved successfully");
      setCredentials({
        privateKey: data.privateKey,
        mnemonic: data.mnemonic, // May be undefined
      });
      setStep("display");
    } catch (error: any) {
      console.error("❌ Error fetching wallet credentials:", error);
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
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

  const downloadCredentials = () => {
    if (!credentials || !walletData) return;

    const content = `Blockpal Wallet Credentials
Wallet Name: ${walletData.name}
Wallet Address: ${walletData.address}
Generated: ${new Date().toLocaleDateString()}

⚠️ IMPORTANT SECURITY WARNING ⚠️
- Store this information in a secure location
- Never share your private key or recovery phrase with anyone
- Blockpal will never ask for your private key
- Anyone with access to this information can control your wallet

Private Key:
${credentials.privateKey}

${
  credentials.mnemonic
    ? `Recovery Phrase (Mnemonic):
${credentials.mnemonic}`
    : ""
}

Keep this information safe and secure!`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet-credentials-${walletData.name.replace(
      /\s+/g,
      "-"
    )}.txt`;
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
              <Key size={20} className="text-[#E2AF19] mr-2" />
              <div>
                <h3 className="text-base font-semibold text-white font-satoshi">
                  Wallet Credentials
                </h3>
                <p className="text-gray-400 text-sm font-satoshi">
                  {walletData?.name || "Unknown Wallet"}
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

                {/* Security Warning */}
                {/* <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={14}
                      className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-red-400 text-sm font-satoshi font-medium mb-1">
                        Security Warning
                      </p>
                      <p className="text-red-400 text-xs font-satoshi">
                        Never share your private key or recovery phrase with
                        anyone. Anyone with this information can control your
                        wallet and steal your funds.
                      </p>
                    </div>
                  </div>
                </div> */}

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

            {/* Step 3: Display Credentials */}
            {step === "display" && credentials && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-green-400" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Wallet Credentials
                  </h4>
                  <p className="text-gray-400 text-sm font-satoshi">
                    Keep this information secure and private
                  </p>
                </div>

                {/* Private Key Section */}
                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Private Key:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                      >
                        {showPrivateKey ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(credentials.privateKey, "privateKey")
                        }
                        className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-sm"
                      >
                        <Copy size={12} className="mr-1" />
                        {copied === "privateKey" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="text-white font-mono text-sm break-all">
                    {showPrivateKey ? credentials.privateKey : "•".repeat(64)}
                  </div>
                </div>

                {/* Mnemonic Section (if available) */}
                {credentials.mnemonic && (
                  <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Recovery Phrase:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowMnemonic(!showMnemonic)}
                          className="text-gray-400 hover:text-white transition-colors p-1"
                        >
                          {showMnemonic ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            copyToClipboard(credentials.mnemonic!, "mnemonic")
                          }
                          className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-sm"
                        >
                          <Copy size={12} className="mr-1" />
                          {copied === "mnemonic" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div className="text-white font-mono text-sm break-all">
                      {showMnemonic
                        ? credentials.mnemonic
                        : "•".repeat(credentials.mnemonic.length)}
                    </div>
                  </div>
                )}

                {/* Wallet Info */}
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 text-sm font-satoshi">
                        Wallet:
                      </span>
                      <span className="text-blue-300 text-sm font-satoshi">
                        {walletData?.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 text-sm font-satoshi">
                        Address:
                      </span>
                      <span className="text-blue-300 text-sm font-satoshi font-mono">
                        {walletData?.address.slice(0, 8)}...
                        {walletData?.address.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Warning */}
                {/* <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={14}
                      className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-red-400 text-sm font-satoshi font-medium mb-1">
                        Important Security Reminders
                      </p>
                      <ul className="text-red-400 text-xs font-satoshi space-y-0.5">
                        <li>
                          • Never share your private key or recovery phrase
                        </li>
                        <li>• Store this information in a secure location</li>
                        <li>• Blockpal cannot recover lost private keys</li>
                        <li>• Close this window when finished</li>
                      </ul>
                    </div>
                  </div>
                </div> */}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={downloadCredentials}
                    className="flex-1"
                  >
                    <Download size={14} className="mr-1.5" />
                    Download
                  </Button>
                  <Button onClick={handleClose} className="flex-1">
                    Close
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
