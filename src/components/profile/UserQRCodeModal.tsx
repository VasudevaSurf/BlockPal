// src/components/profile/UserQRCodeModal.tsx - COMPACT VERSION
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
        className="fixed inset-0 z-50 bg-white/10 flex items-center justify-center p-3"
        onClick={onClose}
      >
        {/* Modal Container - COMPACT */}
        <div
          className="bg-black rounded-[20px] w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - COMPACT */}
          <div className="flex items-center justify-between p-4 pb-3">
            <button
              onClick={onClose}
              className="p-1.5 text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} />
            </button>

            <h1 className="text-white text-base font-medium font-satoshi">
              Receive
            </h1>

            {/* Profile Picture - COMPACT */}
            <div className="w-6 h-6 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={12} className="text-black" />
              )}
            </div>
          </div>

          {/* Content - COMPACT */}
          <div className="flex flex-col items-center px-4 pb-6">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-3"></div>
                <p className="text-gray-400 font-satoshi text-sm">
                  Loading QR code...
                </p>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-red-400 font-satoshi mb-3 text-sm">
                  {error}
                </p>
                <button
                  onClick={fetchQRData}
                  className="bg-yellow-500 text-black px-3 py-1.5 rounded-lg font-satoshi hover:bg-yellow-400 transition-colors text-sm"
                >
                  Try Again
                </button>
              </div>
            )}

            {qrData && !loading && !error && (
              <>
                {/* Network Warning - COMPACT */}
                <div className="bg-gray-800/50 text-gray-300 px-3 py-2 rounded-xl mb-6 font-satoshi text-sm text-center">
                  Assets can only be sent within the same network
                </div>

                {/* QR Code Container - COMPACT */}
                <div className="bg-gray-300 p-6 rounded-[20px] mb-6 shadow-2xl">
                  <div className="w-44 h-44 flex items-center justify-center bg-white rounded-xl">
                    {qrData.hasWallet ? (
                      <img
                        src={`/api/users/qr?format=svg&size=176`}
                        alt="Wallet QR Code"
                        className="w-full h-full rounded-xl"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <p className="font-satoshi text-sm">
                          No wallet available
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Wallet Address - COMPACT */}
                {qrData.activeWallet && (
                  <div className="text-center mb-6 px-3">
                    <p className="text-gray-300 font-mono text-sm tracking-wider font-satoshi break-all leading-relaxed italic">
                      {qrData.activeWallet.address}
                    </p>
                  </div>
                )}

                {/* Copy Button - COMPACT */}
                <button
                  onClick={copyToClipboard}
                  className="flex items-center justify-center space-x-2.5 bg-gray-800/70 hover:bg-gray-700/70 text-white px-6 py-3 rounded-xl transition-colors font-satoshi border border-gray-700 backdrop-blur-sm"
                >
                  {copied ? (
                    <>
                      <span className="text-sm font-mayeka-demi-bold-demo">
                        Copied!
                      </span>
                      <CheckCircle size={16} className="text-green-400" />
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-mayeka-demi-bold-demo">
                        Copy Address
                      </span>
                      <Copy size={16} />
                    </>
                  )}
                </button>

                {/* Hidden Share and Download buttons - can be accessed via long press or additional menu */}
                <div className="hidden">
                  <button onClick={shareQR}>
                    <Share2 size={18} />
                  </button>
                  <button onClick={downloadQR}>
                    <Download size={18} />
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
