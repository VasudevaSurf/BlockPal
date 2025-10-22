"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  walletAddress?: string;
}

function DisconnectModalContent({
  isOpen,
  onClose,
  onConfirm,
  walletAddress,
  isExiting,
  handleClose,
  handleConfirm,
}: DisconnectModalProps & {
  isExiting: boolean;
  handleClose: () => void;
  handleConfirm: () => void;
}) {
  if (!isOpen && !isExiting) return null;

  return (
    <>
      {/* Backdrop with extremely high z-index */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-200 ${
          isExiting ? "opacity-0" : "opacity-100"
        }`}
        style={{ zIndex: 999999 }}
        onClick={handleClose}
      />

      {/* Modal Container with extremely high z-index */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        style={{ zIndex: 1000000 }}
      >
        <div
          className={`bg-[#1A1A1A] border border-[#2C2C2C] rounded-2xl p-6 max-w-md w-full shadow-2xl transition-all duration-200 pointer-events-auto ${
            isExiting
              ? "opacity-0 scale-95"
              : "opacity-100 scale-100 animate-modal-in"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-mayeka text-white">
              Disconnect Wallet
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-300 text-sm font-satoshi mb-4 leading-relaxed">
              Are you sure you want to disconnect your wallet? You'll need to
              reconnect to access your portfolio.
            </p>

            {walletAddress && (
              <div className="bg-black/50 border border-[#2C2C2C] rounded-lg p-3">
                <p className="text-gray-400 text-xs font-satoshi mb-1">
                  Connected Wallet
                </p>
                <p className="text-white text-sm font-mono font-satoshi">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-[#2C2C2C] hover:bg-[#3C3C3C] text-white rounded-xl font-satoshi text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-satoshi text-sm transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default function DisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  walletAddress,
}: DisconnectModalProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsExiting(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 200);
  };

  const handleConfirm = () => {
    setIsExiting(true);
    setTimeout(() => {
      onConfirm();
      setIsExiting(false);
    }, 200);
  };

  // Don't render on server
  if (!mounted) return null;

  // Use createPortal to render at document.body level
  return createPortal(
    <DisconnectModalContent
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      walletAddress={walletAddress}
      isExiting={isExiting}
      handleClose={handleClose}
      handleConfirm={handleConfirm}
    />,
    document.body
  );
}
