// src/components/profile/UserQRCodeModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Copy,
  Share2,
  Download,
  CheckCircle,
  X,
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface QRData {
  user: {
    username: string;
    displayName: string;
    email: string;
  };
  activeWallet: {
    id: string;
    address: string;
    name: string;
    isDefault: boolean;
  } | null;
  qrUrls: {
    svg: string;
    png: string;
    detailed: string;
    large: string;
  };
  hasWallet: boolean;
}

interface UserQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserQRCodeModal({
  isOpen,
  onClose,
}: UserQRCodeModalProps) {
  const { activeWallet } = useSelector((state: RootState) => state.wallet);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQRData();
    }
  }, [isOpen]);

  const fetchQRData = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users/qr", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch QR data");
      }

      const data = await response.json();
      setQrData(data);
    } catch (error: any) {
      console.error("❌ Error fetching QR data:", error);
      setError(error.message || "Failed to load QR code data");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!qrData?.activeWallet?.address) return;

    try {
      await navigator.clipboard.writeText(qrData.activeWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    const start = address.slice(0, 6);
    const middle = address.slice(6, -6).replace(/./g, "•");
    const end = address.slice(-6);
    return `${start}${middle}${end}`;
  };

  const shareQR = async () => {
    if (!qrData?.activeWallet?.address) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Wallet Address",
          text: "Send crypto to my wallet",
          url: qrData.activeWallet.address,
        });
      } else {
        await copyToClipboard();
      }
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const downloadQR = async () => {
    if (!qrData?.activeWallet?.address) return;

    try {
      const response = await fetch(`/api/users/qr?format=png&size=512`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to generate QR code");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wallet-qr-${qrData.user.username}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download QR code:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full Screen Overlay */}
      <div className="fixed inset-0 z-50 bg-black">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>

          <h1 className="text-white text-lg font-semibold font-satoshi">
            Receive
          </h1>

          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg"></div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center px-6 py-8 min-h-[calc(100vh-80px)]">
          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-gray-400 font-satoshi">Loading QR code...</p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <p className="text-red-400 font-satoshi mb-4">{error}</p>
              <button
                onClick={fetchQRData}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-satoshi"
              >
                Try Again
              </button>
            </div>
          )}

          {qrData && !loading && !error && (
            <>
              {/* Network Warning */}
              <div className="bg-gray-800 text-gray-300 px-4 py-2 rounded-lg mb-8 font-satoshi text-sm">
                Assets can only be sent within the same network
              </div>

              {/* QR Code Container */}
              <div className="bg-gray-300 p-8 rounded-3xl mb-8 shadow-2xl">
                <div className="w-64 h-64 flex items-center justify-center bg-white rounded-2xl">
                  {qrData.hasWallet ? (
                    <img
                      src={`/api/users/qr?format=svg&size=256`}
                      alt="Wallet QR Code"
                      className="w-full h-full rounded-2xl"
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <p className="font-satoshi">No wallet available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Wallet Address */}
              {qrData.activeWallet && (
                <div className="text-center mb-8">
                  <p className="text-white font-mono text-lg mb-1 tracking-wider font-satoshi">
                    {formatAddress(qrData.activeWallet.address)}
                  </p>
                  <p className="text-gray-400 text-sm font-satoshi">
                    {qrData.activeWallet.name}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl transition-colors font-satoshi"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={20} className="text-green-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={20} />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>

                <button
                  onClick={shareQR}
                  className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl transition-colors font-satoshi"
                >
                  <Share2 size={20} />
                  <span>Share</span>
                </button>

                <button
                  onClick={downloadQR}
                  className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl transition-colors font-satoshi"
                >
                  <Download size={20} />
                  <span>Save</span>
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-8 text-center max-w-md">
                <p className="text-gray-400 text-sm font-satoshi leading-relaxed">
                  Share this QR code or wallet address to receive cryptocurrency
                  payments. Make sure the sender is using the same network
                  (Ethereum).
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
