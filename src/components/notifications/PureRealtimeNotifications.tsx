// src/components/notifications/PureRealtimeNotifications.tsx - Pure real-time notifications
"use client";

import { useState, useEffect } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Plus,
  Minus,
  AlertTriangle,
  X,
  CheckCircle,
} from "lucide-react";

interface RealtimeNotification {
  id: string;
  type:
    | "funds_received"
    | "funds_sent"
    | "new_token"
    | "token_removed"
    | "error";
  title: string;
  message: string;
  amount?: number;
  token?: string;
  timestamp: Date;
  isRead: boolean;
  priority: "low" | "medium" | "high";
}

interface PureRealtimeNotificationsProps {
  notifications: RealtimeNotification[];
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  maxVisible?: number;
}

export default function PureRealtimeNotifications({
  notifications,
  onMarkAsRead,
  onRemove,
  onClearAll,
  maxVisible = 3,
}: PureRealtimeNotificationsProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<
    RealtimeNotification[]
  >([]);
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set());

  // Update visible notifications when new ones arrive
  useEffect(() => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    const prioritySorted = unreadNotifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    const latestNotifications = prioritySorted.slice(0, maxVisible);
    setVisibleNotifications(latestNotifications);
  }, [notifications, maxVisible]);

  // Auto-mark as read after display time
  useEffect(() => {
    visibleNotifications.forEach((notification) => {
      if (!notification.isRead) {
        const displayTime = getDisplayTime(
          notification.type,
          notification.priority
        );
        setTimeout(() => {
          onMarkAsRead(notification.id);
        }, displayTime);
      }
    });
  }, [visibleNotifications, onMarkAsRead]);

  const getDisplayTime = (type: string, priority: string): number => {
    const baseTime =
      priority === "high" ? 15000 : priority === "medium" ? 10000 : 7000;

    switch (type) {
      case "funds_received":
        return baseTime + 3000; // Extra time for important events
      case "funds_sent":
        return baseTime;
      case "new_token":
      case "token_removed":
        return baseTime - 2000;
      case "error":
        return baseTime + 5000; // More time for errors
      default:
        return baseTime;
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconSize = priority === "high" ? 20 : 16;

    switch (type) {
      case "funds_received":
        return <ArrowDownCircle size={iconSize} className="text-green-400" />;
      case "funds_sent":
        return <ArrowUpCircle size={iconSize} className="text-blue-400" />;
      case "new_token":
        return <Plus size={iconSize} className="text-emerald-400" />;
      case "token_removed":
        return <Minus size={iconSize} className="text-orange-400" />;
      case "error":
        return <AlertTriangle size={iconSize} className="text-red-400" />;
      default:
        return <Coins size={iconSize} className="text-gray-400" />;
    }
  };

  const getNotificationStyle = (type: string, priority: string) => {
    const baseStyle = "border backdrop-blur-md shadow-xl";

    const priorityStyles = {
      high: "shadow-2xl ring-2 ring-opacity-50",
      medium: "shadow-lg",
      low: "shadow-md",
    };

    const typeStyles = {
      funds_received: "border-green-500/60 bg-green-900/30 ring-green-400/30",
      funds_sent: "border-blue-500/60 bg-blue-900/30 ring-blue-400/30",
      new_token: "border-emerald-500/60 bg-emerald-900/30 ring-emerald-400/30",
      token_removed: "border-orange-500/60 bg-orange-900/30 ring-orange-400/30",
      error: "border-red-500/60 bg-red-900/30 ring-red-400/30",
    };

    return `${baseStyle} ${priorityStyles[priority]} ${
      typeStyles[type] || "border-gray-500/60 bg-gray-900/30"
    }`;
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - timestamp.getTime()) / 1000
    );

    if (diffInSeconds < 3) return "Just now";
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRemove = (notificationId: string) => {
    setAnimatingOut((prev) => new Set(prev).add(notificationId));

    setTimeout(() => {
      onRemove(notificationId);
      setAnimatingOut((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 300);
  };

  const formatAmount = (amount: number, token: string) => {
    if (token === "ETH") {
      if (amount < 0.0001) return `${amount.toFixed(8)} ${token}`;
      return `${amount.toFixed(6)} ${token}`;
    } else {
      if (amount < 0.01) return `${amount.toFixed(6)} ${token}`;
      return `${amount.toFixed(4)} ${token}`;
    }
  };

  const getSuccessIcon = (type: string) => {
    switch (type) {
      case "funds_received":
        return "💰";
      case "funds_sent":
        return "📤";
      case "new_token":
        return "🆕";
      case "token_removed":
        return "🗑️";
      default:
        return "✅";
    }
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {visibleNotifications.map((notification, index) => {
        const isAnimatingOut = animatingOut.has(notification.id);
        const isHighPriority = notification.priority === "high";

        return (
          <div
            key={notification.id}
            className={`
              transform transition-all duration-500 ease-out
              ${
                isAnimatingOut
                  ? "translate-x-full opacity-0 scale-90"
                  : "translate-x-0 opacity-100 scale-100"
              }
              ${isHighPriority ? "animate-bounce-in" : "animate-slide-in-right"}
            `}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div
              className={`
                relative overflow-hidden rounded-lg p-4
                ${getNotificationStyle(
                  notification.type,
                  notification.priority
                )}
                ${
                  isHighPriority
                    ? "transform hover:scale-105"
                    : "hover:scale-102"
                }
                transition-transform duration-200
              `}
            >
              {/* Progress bar for auto-dismiss */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#E2AF19] to-[#D4A853] transition-all duration-300"
                style={{
                  animation: `shrink ${getDisplayTime(
                    notification.type,
                    notification.priority
                  )}ms linear`,
                  width: "100%",
                }}
              />

              <div className="flex items-start space-x-3">
                {/* Icon with priority styling */}
                <div
                  className={`flex-shrink-0 mt-0.5 ${
                    isHighPriority ? "animate-pulse" : ""
                  }`}
                >
                  {getNotificationIcon(
                    notification.type,
                    notification.priority
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Title with emoji for high priority */}
                      <div className="flex items-center space-x-2">
                        <h4
                          className={`font-semibold leading-snug ${
                            isHighPriority
                              ? "text-white text-base"
                              : "text-gray-100 text-sm"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {isHighPriority && (
                          <span className="text-lg">
                            {getSuccessIcon(notification.type)}
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      <p
                        className={`leading-snug mt-1 ${
                          isHighPriority
                            ? "text-gray-200 text-sm"
                            : "text-gray-300 text-xs"
                        }`}
                      >
                        {notification.message}
                      </p>

                      {/* Enhanced data for transaction notifications */}
                      {(notification.type === "funds_received" ||
                        notification.type === "funds_sent") &&
                        notification.amount &&
                        notification.token && (
                          <div className="mt-2 flex items-center space-x-3">
                            <div
                              className={`
                            px-2 py-1 rounded-md text-xs font-medium
                            ${
                              notification.type === "funds_received"
                                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }
                          `}
                            >
                              {formatAmount(
                                notification.amount,
                                notification.token
                              )}
                            </div>
                            {isHighPriority && (
                              <div className="flex items-center text-xs text-gray-400">
                                <CheckCircle size={12} className="mr-1" />
                                Confirmed
                              </div>
                            )}
                          </div>
                        )}

                      {/* Token info for new/removed tokens */}
                      {(notification.type === "new_token" ||
                        notification.type === "token_removed") &&
                        notification.token && (
                          <div className="mt-2">
                            <span
                              className={`
                            inline-block px-2 py-1 rounded-md text-xs font-medium
                            ${
                              notification.type === "new_token"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                            }
                          `}
                            >
                              {notification.token}
                            </span>
                          </div>
                        )}

                      {/* Timestamp */}
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        {isHighPriority && (
                          <span className="text-xs text-yellow-400 font-medium">
                            HIGH PRIORITY
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => handleRemove(notification.id)}
                      className="flex-shrink-0 ml-3 text-gray-400 hover:text-white transition-colors p-1 hover:bg-black/30 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* High priority glow effect */}
              {isHighPriority && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-400/10 to-emerald-400/10 pointer-events-none animate-pulse" />
              )}
            </div>
          </div>
        );
      })}

      {/* Clear all button when there are multiple notifications */}
      {notifications.filter((n) => !n.isRead).length > 1 && (
        <div className="flex justify-end mt-3">
          <button
            onClick={onClearAll}
            className="text-xs text-gray-400 hover:text-white transition-colors bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-600/30 hover:border-gray-500/50"
          >
            Clear All ({notifications.filter((n) => !n.isRead).length})
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes bounce-in {
          0% {
            transform: translateX(100%) scale(0.3);
            opacity: 0;
          }
          50% {
            transform: translateX(-10px) scale(1.05);
          }
          70% {
            transform: translateX(5px) scale(0.98);
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.4s ease-out;
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
