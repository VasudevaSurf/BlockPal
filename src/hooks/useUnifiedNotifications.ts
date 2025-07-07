// src/hooks/useUnifiedNotifications.ts - Hook to manage all notification sources
import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";

interface DatabaseNotification {
  _id: string;
  username: string;
  type: string;
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

export function useUnifiedNotifications() {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const {
    notifications: realtimeNotifications,
    clearNotifications: clearRealtimeNotifications,
  } = useRealtimeDashboard();

  const [databaseNotifications, setDatabaseNotifications] = useState<
    DatabaseNotification[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  // Fetch database notifications
  const fetchDatabaseNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=20", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDatabaseNotifications(data.notifications || []);
        setLastFetchTime(new Date());
        console.log(
          "📫 Database notifications updated:",
          data.notifications?.length || 0
        );
      }
    } catch (error) {
      console.error("Error fetching database notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Auto-fetch database notifications periodically
  useEffect(() => {
    if (isAuthenticated && user) {
      // Initial fetch
      fetchDatabaseNotifications();

      // Set up periodic refresh every 30 seconds
      const interval = setInterval(fetchDatabaseNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, fetchDatabaseNotifications]);

  // Mark database notification as read
  const markDatabaseNotificationAsRead = useCallback(
    async (notificationId: string) => {
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
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error marking notification as read:", error);
        return false;
      }
    },
    []
  );

  // Auto-mark database notifications as read when accessed
  const markAllUnreadDatabaseNotificationsAsRead = useCallback(async () => {
    const unreadNotifications = databaseNotifications.filter((n) => !n.isRead);

    if (unreadNotifications.length > 0) {
      try {
        // Mark all as read in one API call
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
          return true;
        }
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
      }
    }
    return false;
  }, [databaseNotifications]);

  // Helper function to convert notification types to titles
  const getRealtimeNotificationTitle = useCallback((type: string): string => {
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
  }, []);

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

  // Calculate unread counts
  const realtimeUnreadCount = realtimeNotifications.length;
  const databaseUnreadCount = databaseNotifications.filter(
    (n) => !n.isRead
  ).length;
  const totalUnreadCount = realtimeUnreadCount + databaseUnreadCount;

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    // Clear real-time notifications
    clearRealtimeNotifications();

    // Mark all database notifications as read
    markAllDatabaseNotificationsAsRead();
  }, [clearRealtimeNotifications, markAllDatabaseNotificationsAsRead]);

  // Handle notification click (navigation, marking as read, etc.)
  const handleNotificationClick = useCallback(
    async (notification: UnifiedNotification) => {
      console.log("🔔 Notification clicked:", notification);

      // Mark database notifications as read
      if (notification.source === "database" && !notification.isRead) {
        await markDatabaseNotificationAsRead(
          notification.id.replace("db-", "")
        );
      }

      // Handle navigation based on notification type
      if (notification.source === "database") {
        switch (notification.type) {
          case "fund_request":
          case "friend_request":
          case "friend_request_response":
            window.location.href = "/dashboard/friends";
            break;
          case "fund_request_response":
            if (notification.data?.transactionHash) {
              window.open(
                `https://etherscan.io/tx/${notification.data.transactionHash}`,
                "_blank"
              );
            } else {
              window.location.href = "/dashboard/friends";
            }
            break;
        }
      }
      // Real-time notifications don't need navigation, they're just informational
    },
    [markDatabaseNotificationAsRead]
  );

  return {
    // All notifications
    allNotifications: unifiedNotifications,

    // Separate sources
    realtimeNotifications,
    databaseNotifications,

    // Counts
    totalUnreadCount,
    realtimeUnreadCount,
    databaseUnreadCount,

    // Loading states
    loading,
    lastFetchTime,

    // Actions
    fetchDatabaseNotifications,
    markDatabaseNotificationAsRead,
    markAllUnreadDatabaseNotificationsAsRead,
    clearAllNotifications,
    handleNotificationClick,

    // Utils
    getRealtimeNotificationTitle,
  };
}
