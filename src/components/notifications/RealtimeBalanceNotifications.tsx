// src/components/notifications/RealtimeBalanceNotifications.tsx - Real-time balance notifications
"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp, TrendingDown, Plus, Minus, Radio } from "lucide-react";
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";

export default function RealtimeBalanceNotifications() {
  const { notifications, dismissNotification } = useRealtimeWalletBalances();
  const [visibleNotifications, setVisibleNotifications] = useState<
    typeof notifications
  >([]);

  // Update visible notifications with animation
  useEffect(() => {
    // Add new notifications with a slight delay for animation
    notifications.forEach((notification, index) => {
      if (
        !visibleNotifications.find(
          (n) => n.timestamp === notification.timestamp
        )
      ) {
        setTimeout(() => {
          setVisibleNotifications((prev) =>
            [notification, ...prev].slice(0, 5)
          ); // Show max 5
        }, index * 200); // Stagger animations
      }
    });
  }, [notifications]);

  // Clean up dismissed notifications
  useEffect(() => {
    setVisibleNotifications((prev) =>
      prev.filter((vn) =>
        notifications.find((n) => n.timestamp === vn.timestamp)
      )
    );
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "balance_change":
        return <Radio size={16} className="text-blue-400" />;
      case "new_token":
        return <Plus size={16} className="text-green-400" />;
      case "token_removed":
        return <Minus size={16} className="text-red-400" />;
      default:
        return <Radio size={16} className="text-gray-400" />;
    }
  };

  const getNotificationColor = (type: string, amount?: number) => {
    if (type === "balance_change" && amount !== undefined) {
      return amount > 0
        ? "border-green-500 bg-green-900/20"
        : "border-red-500 bg-red-900/20";
    }
    switch (type) {
      case "new_token":
        return "border-green-500 bg-green-900/20";
      case "token_removed":
        return "border-red-500 bg-red-900/20";
      default:
        return "border-blue-500 bg-blue-900/20";
    }
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.timestamp.getTime()}
          className={`
            pointer-events-auto
            transform transition-all duration-500 ease-out
            ${
              index === 0
                ? "translate-x-0 opacity-100"
                : "translate-x-0 opacity-100"
            }
            animate-in slide-in-from-right-full duration-300
          `}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <div
            className={`
              relative overflow-hidden
              bg-black border rounded-lg shadow-2xl
              p-4 pr-10 min-w-[280px] max-w-[320px]
              ${getNotificationColor(notification.type, notification.amount)}
            `}
          >
            {/* Animated background pulse for balance changes */}
            {notification.type === "balance_change" && (
              <div
                className={`
                  absolute inset-0 
                  ${
                    notification.amount && notification.amount > 0
                      ? "bg-green-400"
                      : "bg-red-400"
                  }
                  opacity-20 animate-pulse
                `}
              />
            )}

            {/* Content */}
            <div className="relative flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm font-satoshi">
                    {notification.walletName}
                  </p>
                  <button
                    onClick={() => dismissNotification(notification.timestamp)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-gray-300 text-sm font-satoshi mt-1">
                  {notification.message}
                </p>

                {/* Amount display for balance changes */}
                {notification.type === "balance_change" &&
                  notification.amount && (
                    <div className="flex items-center mt-2">
                      {notification.amount > 0 ? (
                        <TrendingUp size={14} className="text-green-400 mr-1" />
                      ) : (
                        <TrendingDown size={14} className="text-red-400 mr-1" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          notification.amount > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {notification.amount > 0 ? "+" : ""}$
                        {Math.abs(notification.amount).toFixed(2)}
                      </span>
                    </div>
                  )}

                {/* Timestamp */}
                <p className="text-gray-500 text-xs font-satoshi mt-1">
                  {notification.timestamp.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Progress bar for auto-dismiss */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-[#E2AF19] transform origin-left animate-pulse"
                style={{
                  animation: "shrink 5s linear forwards",
                }}
              />
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        @keyframes slide-in-from-right-full {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-in {
          animation-fill-mode: both;
        }

        .slide-in-from-right-full {
          animation-name: slide-in-from-right-full;
        }
      `}</style>
    </div>
  );
}
