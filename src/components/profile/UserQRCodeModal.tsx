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
  User,
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
  const { user } = useSelector((state: RootState) => state.auth);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchQRData();
      fetchUserProfile();
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

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/profile", {
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
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
      {/* Modal Overlay with faded background */}
      <div
        className="fixed inset-0 z-50 bg-white/10 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Container */}
        <div
          className="bg-black rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-white text-lg font-medium font-satoshi">
              Receive
            </h1>

            {/* Profile Picture */}
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={14} className="text-black" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center px-6 pb-8">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-400 font-satoshi">Loading QR code...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-400 font-satoshi mb-4">{error}</p>
                <button
                  onClick={fetchQRData}
                  className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-satoshi hover:bg-yellow-400 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {qrData && !loading && !error && (
              <>
                {/* Network Warning */}
                <div className="bg-gray-800/50 text-gray-300 px-4 py-2.5 rounded-xl mb-8 font-satoshi text-sm text-center">
                  Assets can only be sent within the same network
                </div>

                {/* QR Code Container */}
                <div className="bg-gray-300 p-8 rounded-3xl mb-8 shadow-2xl">
                  <div className="w-56 h-56 flex items-center justify-center bg-white rounded-2xl">
                    {qrData.hasWallet ? (
                      <img
                        src={`/api/users/qr?format=svg&size=224`}
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
                  <div className="text-center mb-8 px-4">
                    <p className="text-gray-300 font-mono text-sm tracking-wider font-satoshi break-all leading-relaxed italic">
                      {qrData.activeWallet.address}
                    </p>
                  </div>
                )}

                {/* Copy Button */}
                <button
                  onClick={copyToClipboard}
                  className="flex items-center justify-center space-x-3 bg-gray-800/70 hover:bg-gray-700/70 text-white px-8 py-4 rounded-2xl transition-colors font-satoshi border border-gray-700 backdrop-blur-sm"
                >
                  {copied ? (
                    <>
                      <span className="text-base font-mayeka-demi-bold-demo">
                        Copied!
                      </span>
                      <CheckCircle size={20} className="text-green-400" />
                    </>
                  ) : (
                    <>
                      <span className="text-base font-mayeka-demi-bold-demo">
                        Copy Address
                      </span>
                      <Copy size={20} />
                    </>
                  )}
                </button>

                {/* Hidden Share and Download buttons - can be accessed via long press or additional menu */}
                <div className="hidden">
                  <button onClick={shareQR}>
                    <Share2 size={20} />
                  </button>
                  <button onClick={downloadQR}>
                    <Download size={20} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
