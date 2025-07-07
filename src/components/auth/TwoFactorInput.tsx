// src/components/auth/TwoFactorInput.tsx
"use client";

import { useState } from "react";
import { Shield, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface TwoFactorInputProps {
  isOpen: boolean;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
  email?: string;
  isGoogleAuth?: boolean;
}

export default function TwoFactorInput({
  isOpen,
  onVerify,
  onCancel,
  loading = false,
  error = "",
  email = "",
  isGoogleAuth = false,
}: TwoFactorInputProps) {
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      await onVerify(code);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-[#E2AF19]" />
          </div>
          <h3 className="text-xl font-semibold text-white font-satoshi mb-2">
            Two-Factor Authentication
          </h3>
          <p className="text-gray-400 text-sm font-satoshi">
            {isGoogleAuth
              ? `Enter your 6-digit authentication code to complete Google sign-in for ${email}`
              : `Enter your 6-digit authentication code to complete sign-in for ${email}`}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle
                size={16}
                className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
              />
              <p className="text-red-400 text-sm font-satoshi">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="text"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              className="font-satoshi text-center text-2xl tracking-widest"
              maxLength={6}
              autoFocus
              disabled={loading}
            />
            <p className="text-gray-500 text-xs font-satoshi mt-2 text-center">
              Enter the code from your authenticator app or use a backup code
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
            <p className="text-blue-400 text-xs font-satoshi">
              <strong>Need help?</strong>
              <br />• Check your authenticator app (Google Authenticator, Authy,
              etc.)
              <br />• You can also use one of your backup codes
              <br />• Make sure your device time is synced
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </Button>
          </div>
        </form>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs font-satoshi">
            Lost access to your authenticator? Contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
