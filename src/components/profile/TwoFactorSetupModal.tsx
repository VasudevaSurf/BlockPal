// src/components/profile/TwoFactorSetupModal.tsx
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
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isEnabling: boolean; // true for enabling, false for disabling
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export default function TwoFactorSetupModal({
  isOpen,
  onClose,
  onComplete,
  isEnabling,
}: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<
    "password" | "setup" | "verify" | "backup" | "disable"
  >("password");
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (isEnabling) {
        setStep("password");
      } else {
        setStep("disable");
      }
      setPassword("");
      setVerificationCode("");
      setError("");
      setSetupData(null);
    }
  }, [isOpen, isEnabling]);

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          action: isEnabling ? "enable" : "disable",
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify password");
      }

      if (isEnabling) {
        setSetupData(data.setupData);
        setStep("setup");
      } else {
        // For disabling, we might go straight to completion or need verification
        setStep("verify");
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <div className="flex items-center">
            <Shield size={24} className="text-[#E2AF19] mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-white font-satoshi">
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
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Password Verification */}
          {step === "password" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={32} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Verify Your Password
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  Please enter your current password to continue
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
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

              <div className="flex gap-3">
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

          {/* Step 2: Setup Instructions (Enable only) */}
          {step === "setup" && setupData && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone size={32} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Set Up Your Authenticator App
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  Scan the QR code or enter the setup key manually
                </p>
              </div>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg text-center">
                <img
                  src={setupData.qrCodeUrl}
                  alt="2FA QR Code"
                  className="mx-auto w-48 h-48"
                />
              </div>

              {/* Manual Entry */}
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm font-satoshi">
                    Setup Key:
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(setupData.manualEntryKey, "setup-key")
                    }
                    className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center"
                  >
                    <Copy size={14} className="mr-1" />
                    {copied === "setup-key" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-white font-mono text-sm break-all">
                  {setupData.manualEntryKey}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                <h5 className="text-blue-400 font-semibold font-satoshi mb-2">
                  Instructions:
                </h5>
                <ol className="text-blue-400 text-sm font-satoshi space-y-1">
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
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={32} className="text-[#E2AF19]" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Enter Verification Code
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  {isEnabling
                    ? "Enter the 6-digit code from your authenticator app"
                    : "Enter your current 2FA code to disable"}
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
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerificationCode(value);
                  setError("");
                }}
                className="font-satoshi text-center text-2xl tracking-widest"
                maxLength={6}
                autoFocus
              />

              <div className="flex gap-3">
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
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Save Your Backup Codes
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  Store these codes safely. Each can only be used once.
                </p>
              </div>

              {/* Backup Codes */}
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm font-satoshi">
                    Backup Codes:
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          setupData.backupCodes.join("\n"),
                          "backup-codes"
                        )
                      }
                      className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-sm"
                    >
                      <Copy size={14} className="mr-1" />
                      {copied === "backup-codes" ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={downloadBackupCodes}
                      className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-sm"
                    >
                      <Download size={14} className="mr-1" />
                      Download
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-black p-2 rounded border border-[#2C2C2C]"
                    >
                      <span className="text-white font-mono text-sm">
                        {code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle
                    size={16}
                    className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-yellow-400 text-sm font-satoshi font-medium mb-1">
                      Important Security Notice
                    </p>
                    <p className="text-yellow-400 text-xs font-satoshi">
                      • Save these codes in a secure location • Each code can
                      only be used once • You'll need these if you lose your
                      authenticator device • Don't share these codes with anyone
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
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} className="text-red-400" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Disable Two-Factor Authentication
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  This will make your account less secure
                </p>
              </div>

              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400 text-sm font-satoshi">
                  <strong>Warning:</strong> Disabling 2FA will reduce your
                  account security. You'll only need your password to access
                  your account.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep("password")}
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
  );
}
