// src/components/notifications/NotificationPanel.tsx - UNIFIED notification system
"use client";

import { useState, useEffect } from "react";
import {
  X,
  Bell,
  TrendingUp,
  TrendingDown,
  Coins,
  AlertTriangle,
  Radio,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  Info,
} from "lucide-react";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";

interface DatabaseNotification {
  _id: string;
  username: string;
  type:
    | "fund_request"
    | "fund_request_response"
    | "friend_request"
    | "friend_request_response"
    | "general";
  title: string;
  message: string;
  isRead: boolean;
  relatedData?: any;
  createdAt: string;
  readAt?: string;
}

interface UnifiedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  source: "realtime" | "database";
  data?: any;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps) {
  const {
    notifications: realtimeNotifications,
    clearNotifications: clearRealtimeNotifications,
    isMonitoring,
    lastUpdated,
    status,
    refreshDashboard,
    data: realtimeData,
  } = useRealtimeDashboard();

  const [databaseNotifications, setDatabaseNotifications] = useState<
    DatabaseNotification[]
  >([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState<number>(0);

  // Fetch database notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchDatabaseNotifications();
    }
  }, [isOpen]);

  // Calculate countdown to next update
  useEffect(() => {
    if (!isMonitoring || !lastUpdated) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdated.getTime();
      const timeToNextUpdate = 10000 - (timeSinceLastUpdate % 10000); // 10 second interval
      setNextUpdateCountdown(Math.ceil(timeToNextUpdate / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, lastUpdated]);

  const fetchDatabaseNotifications = async () => {
    try {
      setLoadingDb(true);
      const response = await fetch("/api/notifications?limit=10", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDatabaseNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching database notifications:", error);
    } finally {
      setLoadingDb(false);
    }
  };

  const markDatabaseNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationId,
          action: "mark_read",
        }),
        credentials: "include",
      });

      if (response.ok) {
        setDatabaseNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId
              ? { ...notif, isRead: true, readAt: new Date().toISOString() }
              : notif
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Combine both notification sources into unified list
  const unifiedNotifications: UnifiedNotification[] = [
    // Real-time notifications (these are the new portfolio change notifications)
    ...realtimeNotifications.map((notif, index) => ({
      id: `realtime-${notif.timestamp.getTime()}-${index}`,
      type: notif.type,
      title: getRealtimeNotificationTitle(notif.type),
      message: notif.message,
      timestamp: notif.timestamp,
      isRead: false, // Real-time notifications are always "new"
      source: "realtime" as const,
      data: notif.data,
    })),
    // Database notifications (friend requests, fund requests, etc.)
    ...databaseNotifications.map((notif) => ({
      id: `db-${notif._id}`,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      timestamp: new Date(notif.createdAt),
      isRead: notif.isRead,
      source: "database" as const,
      data: notif.relatedData,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by newest first

  function getRealtimeNotificationTitle(type: string): string {
    switch (type) {
      case "portfolio_increased":
        return "Portfolio Increased";
      case "portfolio_decreased":
        return "Portfolio Decreased";
      case "token_count_changed":
        return "Token Count Changed";
      case "fetch_error":
        return "Update Error";
      default:
        return "Real-time Update";
    }
  }

  const getNotificationIcon = (
    type: string,
    source: "realtime" | "database"
  ) => {
    if (source === "realtime") {
      switch (type) {
        case "portfolio_increased":
          return <TrendingUp size={16} className="text-green-400" />;
        case "portfolio_decreased":
          return <TrendingDown size={16} className="text-red-400" />;
        case "token_count_changed":
          return <Coins size={16} className="text-blue-400" />;
        case "fetch_error":
          return <AlertTriangle size={16} className="text-yellow-400" />;
        default:
          return <Radio size={16} className="text-gray-400" />;
      }
    } else {
      // Database notification icons
      switch (type) {
        case "fund_request":
        case "fund_request_response":
          return <TrendingUp size={16} className="text-green-400" />;
        case "friend_request":
        case "friend_request_response":
          return <Bell size={16} className="text-blue-400" />;
        default:
          return <Info size={16} className="text-gray-400" />;
      }
    }
  };

  const getNotificationColor = (
    type: string,
    source: "realtime" | "database"
  ) => {
    if (source === "realtime") {
      switch (type) {
        case "portfolio_increased":
          return "border-l-green-500 bg-green-900/10";
        case "portfolio_decreased":
          return "border-l-red-500 bg-red-900/10";
        case "token_count_changed":
          return "border-l-blue-500 bg-blue-900/10";
        case "fetch_error":
          return "border-l-yellow-500 bg-yellow-900/10";
        default:
          return "border-l-gray-500 bg-gray-900/10";
      }
    } else {
      // Database notification colors
      switch (type) {
        case "fund_request":
        case "fund_request_response":
          return "border-l-green-500 bg-green-900/10";
        case "friend_request":
        case "friend_request_response":
          return "border-l-blue-500 bg-blue-900/10";
        default:
          return "border-l-gray-500 bg-gray-900/10";
      }
    }
  };

  // Auto-mark database notifications as read when panel opens
  useEffect(() => {
    if (isOpen) {
      // Mark all unread database notifications as read when panel opens
      const unreadDbNotifications = databaseNotifications.filter(
        (n) => !n.isRead
      );
      unreadDbNotifications.forEach((notif) => {
        markDatabaseNotificationAsRead(notif._id);
      });
    }
  }, [isOpen, databaseNotifications]);

  const clearAllNotifications = async () => {
    // Clear real-time notifications
    clearRealtimeNotifications();

    // Mark all database notifications as read
    const unreadDbNotifications = databaseNotifications.filter(
      (n) => !n.isRead
    );
    if (unreadDbNotifications.length > 0) {
      try {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_read", // No notificationId means mark all as read
          }),
          credentials: "include",
        });

        if (response.ok) {
          setDatabaseNotifications((prev) =>
            prev.map((notif) => ({
              ...notif,
              isRead: true,
              readAt: new Date().toISOString(),
            }))
          );
        }
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const unreadCount = unifiedNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="absolute top-16 right-0 z-50 w-80 bg-black/95 backdrop-blur-sm border border-[#2C2C2C] rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
        <div className="flex items-center">
          <Bell size={18} className="text-white mr-2" />
          <h3 className="text-white font-semibold font-satoshi">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="ml-2 bg-[#E2AF19] text-black text-xs font-satoshi font-medium px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={clearAllNotifications}
              className="text-[#E2AF19] hover:opacity-80 transition-opacity text-sm font-satoshi"
            >
              Read All
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* <div className="p-4 border-b border-[#2C2C2C] bg-[#0F0F0F]/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            {isMonitoring ? (
              <Wifi size={16} className="text-green-400 animate-pulse mr-2" />
            ) : (
              <WifiOff size={16} className="text-gray-400 mr-2" />
            )}
            <span
              className={`text-sm font-satoshi font-medium ${
                isMonitoring ? "text-green-400" : "text-gray-400"
              }`}
            >
              {isMonitoring ? "Live Updates Active" : "Disconnected"}
            </span>
          </div>

          <button
            onClick={refreshDashboard}
            className="bg-[#E2AF19] text-black px-3 py-1 rounded-lg text-xs font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center"
          >
            <RefreshCw size={12} className="mr-1" />
            Refresh
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {lastUpdated && (
            <div className="flex justify-between">
              <span className="text-gray-400">Last Update:</span>
              <span className="text-white">{formatTime(lastUpdated)}</span>
            </div>
          )}

          {isMonitoring && nextUpdateCountdown > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Next Update:</span>
              <span className="text-green-400 flex items-center">
                <Clock size={10} className="mr-1" />
                {nextUpdateCountdown}s
              </span>
            </div>
          )}

          {realtimeData && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Portfolio:</span>
                <span className="text-white">
                  ${realtimeData.totalValue.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Tokens:</span>
                <span className="text-white">{realtimeData.tokens.length}</span>
              </div>
            </>
          )}
        </div>
      </div> */}

      <div className="max-h-64 overflow-y-auto scrollbar-hide">
        {loadingDb && databaseNotifications.length === 0 ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19] mx-auto mb-2"></div>
            <p className="text-gray-400 font-satoshi">
              Loading notifications...
            </p>
          </div>
        ) : unifiedNotifications.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm font-satoshi">
              No new notifications
            </p>
            <p className="text-gray-500 text-xs font-satoshi mt-1">
              You'll be notified of portfolio changes and friend requests
            </p>
          </div>
        ) : (
          <div className="p-2">
            {unifiedNotifications.slice(0, 20).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border-l-4 mb-2 transition-colors ${getNotificationColor(
                  notification.type,
                  notification.source
                )} ${!notification.isRead ? "bg-opacity-80" : "bg-opacity-40"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(
                        notification.type,
                        notification.source
                      )}
                    </div>

                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-satoshi font-medium">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-[#E2AF19] rounded-full flex-shrink-0 ml-2"></div>
                        )}
                      </div>

                      <p className="text-gray-400 text-sm font-satoshi mt-1">
                        {notification.message}
                      </p>

                      {/* Additional notification data */}
                      {notification.source === "realtime" && (
                        <>
                          {notification.type === "portfolio_increased" &&
                            notification.data && (
                              <p className="text-green-400 text-xs font-satoshi mt-1">
                                New total: $
                                {notification.data.totalValue.toFixed(2)}
                              </p>
                            )}

                          {notification.type === "portfolio_decreased" &&
                            notification.data && (
                              <p className="text-red-400 text-xs font-satoshi mt-1">
                                New total: $
                                {notification.data.totalValue.toFixed(2)}
                              </p>
                            )}

                          {notification.type === "token_count_changed" &&
                            notification.data && (
                              <p className="text-blue-400 text-xs font-satoshi mt-1">
                                {notification.data.previousCount} →{" "}
                                {notification.data.newCount} tokens
                              </p>
                            )}
                        </>
                      )}

                      {/* Database notification details */}
                      {notification.source === "database" &&
                        notification.type === "fund_request_response" &&
                        notification.data && (
                          <div className="bg-[#1A1A1A] rounded p-2 mt-2 border border-[#2C2C2C]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 font-satoshi">
                                Amount: {notification.data.amount}{" "}
                                {notification.data.tokenSymbol}
                              </span>
                              <span
                                className={`font-satoshi font-medium ${
                                  notification.data.action === "fulfill"
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {notification.data.action === "fulfill"
                                  ? "✅ Fulfilled"
                                  : "❌ Declined"}
                              </span>
                            </div>
                            {notification.data.transactionHash && (
                              <div className="text-xs text-gray-400 font-satoshi mt-1">
                                Tx:{" "}
                                {notification.data.transactionHash.slice(0, 10)}
                                ...
                                {notification.data.transactionHash.slice(-8)}
                              </div>
                            )}
                          </div>
                        )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-500 text-xs font-satoshi">
                          {getTimeAgo(notification.timestamp)}
                        </span>
                        <span className="text-gray-600 text-xs font-satoshi capitalize">
                          {notification.source === "realtime"
                            ? "Live"
                            : "System"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Footer */}
      {unifiedNotifications.length > 0 && (
        <div className="p-3 border-t border-[#2C2C2C] bg-[#0F0F0F]/50">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-satoshi">
              {unifiedNotifications.length} notification
              {unifiedNotifications.length !== 1 ? "s" : ""}
              {unreadCount > 0 && ` (${unreadCount} unread)`}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchDatabaseNotifications}
                className="text-gray-400 hover:text-white text-xs font-satoshi px-2 py-1 rounded transition-colors"
              >
                Refresh
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-[#E2AF19] hover:text-white text-xs font-satoshi px-3 py-1 rounded-lg bg-[#2C2C2C] hover:bg-[#3C3C3C] transition-colors"
                >
                  Read All ({unreadCount})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
