// src/components/notifications/NotificationCenter.tsx - FIXED VERSION
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  X,
  Bell,
  Check,
  Clock,
  DollarSign,
  UserPlus,
  AlertCircle,
  ExternalLink,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { RootState } from "@/store";

interface Notification {
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
  relatedData?: {
    requestId?: string;
    requesterUsername?: string;
    recipientUsername?: string;
    amount?: string;
    tokenSymbol?: string;
    transactionHash?: string;
    action?: "fulfill" | "decline"; // ADDED: Action type for fund request responses
    acceptedBy?: string;
    declinedBy?: string;
    originalRequester?: string;
  };
  createdAt: string;
  readAt?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
}: NotificationCenterProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=20", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
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
        if (notificationId) {
          // Mark specific notification as read
          setNotifications((prev) =>
            prev.map((notif) =>
              notif._id === notificationId
                ? { ...notif, isRead: true, readAt: new Date().toISOString() }
                : notif
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } else {
          // Mark all as read
          setNotifications((prev) =>
            prev.map((notif) => ({
              ...notif,
              isRead: true,
              readAt: new Date().toISOString(),
            }))
          );
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case "fund_request":
        return <DollarSign size={20} className="text-green-400" />;
      case "fund_request_response":
        // FIXED: Show different icons based on action
        if (notification.relatedData?.action === "fulfill") {
          return <CheckCircle size={20} className="text-green-400" />;
        } else if (notification.relatedData?.action === "decline") {
          return <XCircle size={20} className="text-red-400" />;
        }
        return <DollarSign size={20} className="text-blue-400" />;
      case "friend_request":
        return <UserPlus size={20} className="text-purple-400" />;
      case "friend_request_response":
        return <Check size={20} className="text-blue-400" />;
      default:
        return <Bell size={20} className="text-gray-400" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // FIXED: Enhanced notification click handler
  const handleNotificationClick = async (notification: Notification) => {
    console.log("🔔 Notification clicked:", {
      type: notification.type,
      action: notification.relatedData?.action,
      transactionHash: notification.relatedData?.transactionHash,
    });

    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Handle different notification types
    switch (notification.type) {
      case "fund_request":
        // Only navigate to friends page for pending fund requests
        console.log("📍 Navigating to friends page for fund request");
        window.location.href = "/dashboard/friends";
        break;

      case "fund_request_response":
        // FIXED: Handle fund request responses based on action
        if (
          notification.relatedData?.action === "fulfill" &&
          notification.relatedData?.transactionHash
        ) {
          // Only open transaction explorer if fulfilled and has transaction hash
          console.log("🔗 Opening transaction explorer for fulfilled request");
          window.open(
            `https://etherscan.io/tx/${notification.relatedData.transactionHash}`,
            "_blank"
          );
        } else if (notification.relatedData?.action === "decline") {
          // For declined requests, just show info (no action needed)
          console.log("❌ Fund request was declined - no action available");
          // Could show a toast message here if needed
        } else {
          // Fallback: navigate to friends page
          console.log(
            "📍 Navigating to friends page for fund request response"
          );
          window.location.href = "/dashboard/friends";
        }
        break;

      case "friend_request":
      case "friend_request_response":
        // Navigate to friends page
        console.log("📍 Navigating to friends page for friend request");
        window.location.href = "/dashboard/friends";
        break;

      default:
        console.log("ℹ️ No specific action for this notification type");
        break;
    }
  };

  // FIXED: Enhanced notification action display
  const getNotificationAction = (notification: Notification) => {
    switch (notification.type) {
      case "fund_request":
        return (
          <div className="flex items-center text-xs text-[#E2AF19]">
            <Clock size={12} className="mr-1" />
            View Request
          </div>
        );

      case "fund_request_response":
        if (
          notification.relatedData?.action === "fulfill" &&
          notification.relatedData?.transactionHash
        ) {
          return (
            <div className="flex items-center text-xs text-green-400">
              <ExternalLink size={12} className="mr-1" />
              View Transaction
            </div>
          );
        } else if (notification.relatedData?.action === "decline") {
          return (
            <div className="flex items-center text-xs text-red-400">
              <XCircle size={12} className="mr-1" />
              Declined
            </div>
          );
        }
        return (
          <div className="flex items-center text-xs text-blue-400">
            <DollarSign size={12} className="mr-1" />
            Response
          </div>
        );

      case "friend_request":
        return (
          <div className="flex items-center text-xs text-purple-400">
            <UserPlus size={12} className="mr-1" />
            View Request
          </div>
        );

      case "friend_request_response":
        return (
          <div className="flex items-center text-xs text-blue-400">
            <Check size={12} className="mr-1" />
            View Friends
          </div>
        );

      default:
        return null;
    }
  };

  // FIXED: Enhanced notification styling based on status
  const getNotificationStyles = (notification: Notification) => {
    const baseStyles = "p-4 rounded-lg mb-3 cursor-pointer transition-colors";
    const readStyles = notification.isRead
      ? "bg-[#0F0F0F] border border-[#2C2C2C] hover:bg-[#1A1A1A]"
      : "bg-[#E2AF19]/10 border border-[#E2AF19]/30 hover:bg-[#E2AF19]/20";

    // Special styling for declined fund requests
    if (
      notification.type === "fund_request_response" &&
      notification.relatedData?.action === "decline"
    ) {
      return `${baseStyles} ${readStyles} opacity-75`;
    }

    return `${baseStyles} ${readStyles}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <div className="flex items-center">
            <Bell size={24} className="text-[#E2AF19] mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-gray-400 text-sm font-satoshi">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="text-[#E2AF19] hover:opacity-80 transition-opacity text-sm font-satoshi"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19] mx-auto mb-2"></div>
              <p className="text-gray-400 font-satoshi">
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell size={24} className="text-gray-400" />
              </div>
              <h4 className="text-white font-semibold font-satoshi mb-2">
                No notifications
              </h4>
              <p className="text-gray-400 text-sm font-satoshi">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="p-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={getNotificationStyles(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h5 className="text-white font-semibold font-satoshi text-sm">
                          {notification.title}
                        </h5>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-[#E2AF19] rounded-full flex-shrink-0 ml-2 mt-1"></div>
                        )}
                      </div>

                      <p className="text-gray-400 text-sm font-satoshi mb-2">
                        {notification.message}
                      </p>

                      {/* FIXED: Enhanced notification details */}
                      {notification.type === "fund_request_response" &&
                        notification.relatedData && (
                          <div className="bg-[#1A1A1A] rounded p-2 mb-2 border border-[#2C2C2C]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 font-satoshi">
                                Amount: {notification.relatedData.amount}{" "}
                                {notification.relatedData.tokenSymbol}
                              </span>
                              <span
                                className={`font-satoshi font-medium ${
                                  notification.relatedData.action === "fulfill"
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {notification.relatedData.action === "fulfill"
                                  ? "✅ Fulfilled"
                                  : "❌ Declined"}
                              </span>
                            </div>
                            {notification.relatedData.transactionHash && (
                              <div className="text-xs text-gray-400 font-satoshi mt-1">
                                Tx:{" "}
                                {notification.relatedData.transactionHash.slice(
                                  0,
                                  10
                                )}
                                ...
                                {notification.relatedData.transactionHash.slice(
                                  -8
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs font-satoshi">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                        {getNotificationAction(notification)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-[#2C2C2C] p-4">
            <button
              onClick={fetchNotifications}
              className="w-full text-center text-gray-400 hover:text-white transition-colors text-sm font-satoshi"
            >
              Refresh Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
