// src/components/friends/FriendsPageHeader.tsx - COMPACT VERSION
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Bell, HelpCircle } from "lucide-react";
import { RootState } from "@/store";
import NotificationCenter from "@/components/notifications/NotificationCenter";

interface FriendsPageHeaderProps {
  activeWallet: any;
}

export default function FriendsPageHeader({
  activeWallet,
}: FriendsPageHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications?unreadOnly=true", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

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
              {activeWallet?.name || "Wallet 1"}
            </span>
            <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mr-1.5 lg:mr-2 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-xs font-satoshi mr-1.5 lg:mr-2 hidden sm:block truncate">
              {activeWallet?.address
                ? `${activeWallet.address.slice(
                    0,
                    6
                  )}...${activeWallet.address.slice(-4)}`
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

      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
