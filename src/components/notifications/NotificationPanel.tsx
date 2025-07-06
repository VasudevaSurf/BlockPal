// src/components/notifications/NotificationPanel.tsx - Notification dropdown panel
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

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps) {
  const {
    notifications,
    clearNotifications,
    isMonitoring,
    lastUpdated,
    status,
    refreshDashboard,
    data: realtimeData,
  } = useRealtimeDashboard();

  const [nextUpdateCountdown, setNextUpdateCountdown] = useState<number>(0);

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

  if (!isOpen) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getNotificationIcon = (type: string) => {
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
  };

  const getNotificationColor = (type: string) => {
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
  };

  return (
    <div className="absolute top-16 right-0 z-50 w-80 bg-black/95 backdrop-blur-sm border border-[#2C2C2C] rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
        <div className="flex items-center">
          <Bell size={18} className="text-white mr-2" />
          <h3 className="text-white font-semibold font-satoshi">
            Notifications
          </h3>
          {notifications.length > 0 && (
            <span className="ml-2 bg-[#E2AF19] text-black text-xs font-satoshi font-medium px-2 py-1 rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded"
        >
          <X size={16} />
        </button>
      </div>

      {/* Real-time Status Section */}
      <div className="p-4 border-b border-[#2C2C2C] bg-[#0F0F0F]/50">
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

        {/* Status Details */}
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

          <div className="flex justify-between">
            <span className="text-gray-400">Auto-refresh:</span>
            <span className="text-green-400">Every 10s</span>
          </div>
        </div>

        {/* Quick Status Indicators */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2C2C2C]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-1 ${
                  status.isPolling
                    ? "bg-green-400 animate-pulse"
                    : "bg-gray-400"
                }`}
              ></div>
              <span className="text-xs text-gray-400">Polling</span>
            </div>

            <div className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-1 ${
                  status.hasBackgroundRefresh ? "bg-blue-400" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-xs text-gray-400">Background</span>
            </div>
          </div>

          {nextUpdateCountdown > 0 && (
            <div className="bg-green-900/20 border border-green-500/30 rounded px-2 py-1">
              <span className="text-green-400 text-xs font-mono">
                {nextUpdateCountdown}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm font-satoshi">
              No new notifications
            </p>
            <p className="text-gray-500 text-xs font-satoshi mt-1">
              You'll be notified of portfolio changes
            </p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.slice(0, 10).map((notification, index) => (
              <div
                key={`${notification.timestamp.getTime()}-${index}`}
                className={`p-3 rounded-lg border-l-4 mb-2 ${getNotificationColor(
                  notification.type
                )}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="ml-3 flex-1">
                      <p className="text-white text-sm font-satoshi">
                        {notification.message}
                      </p>
                      <p className="text-gray-400 text-xs font-satoshi mt-1">
                        {formatTime(notification.timestamp)}
                      </p>

                      {/* Additional notification data */}
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
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Remove this specific notification
                      // This would need to be implemented in the hook
                    }}
                    className="flex-shrink-0 ml-2 text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-[#2C2C2C] bg-[#0F0F0F]/50">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-satoshi">
              {notifications.length} notification
              {notifications.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={clearNotifications}
              className="text-gray-400 hover:text-white text-xs font-satoshi px-3 py-1 rounded-lg bg-[#2C2C2C] hover:bg-[#3C3C3C] transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
