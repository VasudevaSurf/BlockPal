// src/components/friends/FriendsPageHeader.tsx - FRONTEND ONLY VERSION
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Bell, HelpCircle } from "lucide-react";
import { RootState } from "@/store";

interface FriendsPageHeaderProps {
  activeWallet?: any;
}

// Simple notification modal for UI demonstration
const NotificationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-black border border-[#2C2C2C] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Notifications</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
            <div className="text-white text-sm font-medium mb-1">
              Welcome to Friends!
            </div>
            <div className="text-gray-400 text-xs">
              Start connecting with other users
            </div>
          </div>

          <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
            <div className="text-white text-sm font-medium mb-1">
              Friend Request Received
            </div>
            <div className="text-gray-400 text-xs">
              @alice_crypto wants to be your friend
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-[#E2AF19] text-black py-2 rounded-lg hover:bg-[#D4A853] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default function FriendsPageHeader({
  activeWallet,
}: FriendsPageHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount] = useState(2); // Mock unread count

  // Mock wallet data if none provided
  const mockWallet = {
    name: "Main Wallet",
    address: "0x1234567890123456789012345678901234567890",
  };

  const displayWallet = activeWallet || mockWallet;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 lg:mb-4 flex-shrink-0 gap-3 sm:gap-0">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white font-mayeka">
            Friends
          </h1>
          <p className="text-gray-400 text-xs font-satoshi mt-0.5">
            Connect with friends and request funds
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2.5 lg:px-3 py-1.5 lg:py-2 w-full sm:w-auto">
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-1.5 lg:mr-2 flex items-center justify-center relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "5px 5px lg:6px 6px",
                }}
              ></div>
            </div>
            <span className="text-white text-xs sm:text-xs font-satoshi mr-1.5 min-w-0 truncate">
              {displayWallet?.name || "Wallet 1"}
            </span>
            <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mr-1.5 lg:mr-2 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-xs font-satoshi mr-1.5 lg:mr-2 hidden sm:block truncate">
              {displayWallet?.address
                ? `${displayWallet.address.slice(
                    0,
                    6
                  )}...${displayWallet.address.slice(-4)}`
                : "No wallet"}
            </span>
          </div>

          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-1.5 lg:px-2 py-1.5 lg:py-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full relative"
            >
              <Bell size={14} className="text-gray-400 lg:w-4 lg:h-4" />
              {unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </div>
              )}
            </button>
            <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mx-1 lg:mx-1.5"></div>
            <button className="p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={14} className="text-gray-400 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>
      </div>

      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
