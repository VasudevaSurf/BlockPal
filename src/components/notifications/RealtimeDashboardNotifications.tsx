// src/components/notifications/RealtimeDashboardNotifications.tsx
"use client";

import { useEffect, useState } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Coins,
  AlertTriangle,
  Radio,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";

export default function RealtimeDashboardNotifications() {
  const {
    notifications,
    clearNotifications,
    isMonitoring,
    lastUpdated,
    status,
    isDataStale,
    getTimeSinceUpdate,
  } = useRealtimeDashboard();

  const [showStatus, setShowStatus] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatTimeSince = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
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
        return "border-green-500/50 bg-green-900/20";
      case "portfolio_decreased":
        return "border-red-500/50 bg-red-900/20";
      case "token_count_changed":
        return "border-blue-500/50 bg-blue-900/20";
      case "fetch_error":
        return "border-yellow-500/50 bg-yellow-900/20";
      default:
        return "border-gray-500/50 bg-gray-900/20";
    }
  };

  if (!isMonitoring && notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Real-time Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex flex-col items-end space-y-2">
          {/* Status Badge */}
          {/* <div
            className={`flex items-center px-3 py-2 rounded-full border cursor-pointer transition-all duration-200 ${
              isMonitoring
                ? "bg-green-900/20 border-green-500/50 hover:bg-green-900/30"
                : "bg-gray-900/20 border-gray-500/50 hover:bg-gray-900/30"
            }`}
            onClick={() => setShowStatus(!showStatus)}
          >
            <div className="flex items-center">
              {isMonitoring ? (
                <Wifi size={12} className="text-green-400 animate-pulse mr-2" />
              ) : (
                <WifiOff size={12} className="text-gray-400 mr-2" />
              )}
              <span
                className={`text-xs font-satoshi ${
                  isMonitoring ? "text-green-400" : "text-gray-400"
                }`}
              >
                {isMonitoring ? "LIVE" : "OFFLINE"}
              </span>
              {lastUpdated && (
                <span className="text-xs text-gray-400 ml-2">
                  {formatTimeSince(getTimeSinceUpdate() || 0)}
                </span>
              )}
              {isDataStale && (
                <AlertTriangle size={12} className="text-yellow-400 ml-2" />
              )}
            </div>
          </div> */}

          {/* Detailed Status Panel */}
          {showStatus && (
            <div className="bg-black/95 backdrop-blur-sm border border-[#2C2C2C] rounded-lg p-4 w-72 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm font-satoshi">
                  Real-time Status
                </h3>
                <button
                  onClick={() => setShowStatus(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Dashboard Monitoring:</span>
                  <span
                    className={isMonitoring ? "text-green-400" : "text-red-400"}
                  >
                    {isMonitoring ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Active Polling:</span>
                  <span
                    className={
                      status.isPolling ? "text-green-400" : "text-gray-400"
                    }
                  >
                    {status.isPolling ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Background Refresh:</span>
                  <span
                    className={
                      status.hasBackgroundRefresh
                        ? "text-green-400"
                        : "text-gray-400"
                    }
                  >
                    {status.hasBackgroundRefresh ? "Active" : "Inactive"}
                  </span>
                </div>

                {lastUpdated && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Update:</span>
                    <span className="text-white">
                      {formatTime(lastUpdated)}
                    </span>
                  </div>
                )}

                {status.dataAge && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data Age:</span>
                    <span
                      className={`${
                        isDataStale ? "text-yellow-400" : "text-white"
                      }`}
                    >
                      {formatTimeSince(status.dataAge)}
                    </span>
                  </div>
                )}

                {status.retryCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Retry Count:</span>
                    <span className="text-yellow-400">
                      {status.retryCount}/3
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-[#E2AF19] text-black px-3 py-2 rounded-lg text-xs font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                >
                  Force Refresh Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 left-4 z-40 space-y-2 max-w-sm">
          {notifications.slice(0, 5).map((notification, index) => (
            <div
              key={`${notification.timestamp.getTime()}-${index}`}
              className={`flex items-start p-3 rounded-lg border backdrop-blur-sm animate-in slide-in-from-left-full duration-300 ${getNotificationColor(
                notification.type
              )}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="ml-3 flex-1 min-w-0">
                <p className="text-white text-sm font-satoshi font-medium">
                  {notification.message}
                </p>
                <p className="text-gray-400 text-xs font-satoshi mt-1">
                  {formatTime(notification.timestamp)}
                </p>

                {/* Additional data for specific notification types */}
                {notification.type === "portfolio_increased" &&
                  notification.data && (
                    <p className="text-green-400 text-xs font-satoshi mt-1">
                      New total: ${notification.data.totalValue.toFixed(2)}
                    </p>
                  )}

                {notification.type === "portfolio_decreased" &&
                  notification.data && (
                    <p className="text-red-400 text-xs font-satoshi mt-1">
                      New total: ${notification.data.totalValue.toFixed(2)}
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

              <button
                onClick={() => {
                  setNotifications((prev) =>
                    prev.filter((_, i) => i !== index)
                  );
                }}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {/* Clear all notifications button */}
          {notifications.length > 1 && (
            <div className="flex justify-end">
              <button
                onClick={clearNotifications}
                className="text-gray-400 hover:text-white text-xs font-satoshi px-3 py-1 rounded-lg bg-black/50 border border-[#2C2C2C] transition-colors"
              >
                Clear all ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
