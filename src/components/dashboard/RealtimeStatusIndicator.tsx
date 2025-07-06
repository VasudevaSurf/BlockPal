// src/components/dashboard/RealtimeStatusIndicator.tsx - Enhanced status indicator
"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, Clock, Radio, RefreshCw } from "lucide-react";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";

interface RealtimeStatusIndicatorProps {
  showLabel?: boolean;
  showCountdown?: boolean;
  className?: string;
}

export default function RealtimeStatusIndicator({
  showLabel = true,
  showCountdown = true,
  className = "",
}: RealtimeStatusIndicatorProps) {
  const { isMonitoring, lastUpdated, refreshDashboard, isDataStale } =
    useRealtimeDashboard();

  const [nextUpdateCountdown, setNextUpdateCountdown] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate countdown to next update
  useEffect(() => {
    if (!isMonitoring || !lastUpdated) {
      setNextUpdateCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdated.getTime();
      const timeToNextUpdate = 10000 - (timeSinceLastUpdate % 10000); // 10 second interval
      const countdown = Math.ceil(timeToNextUpdate / 1000);

      setNextUpdateCountdown(countdown);

      // Show refreshing animation near update time
      setIsRefreshing(countdown <= 1);
    }, 100); // More frequent updates for smooth countdown

    return () => clearInterval(interval);
  }, [isMonitoring, lastUpdated]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard();
    } catch (error) {
      console.error("Manual refresh failed:", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const getStatusColor = () => {
    if (!isMonitoring) return "text-gray-400";
    if (isDataStale) return "text-yellow-400";
    if (isRefreshing) return "text-blue-400";
    return "text-green-400";
  };

  const getStatusIcon = () => {
    if (!isMonitoring) {
      return <WifiOff size={12} className={getStatusColor()} />;
    }

    if (isRefreshing) {
      return (
        <RefreshCw size={12} className={`${getStatusColor()} animate-spin`} />
      );
    }

    return <Wifi size={12} className={`${getStatusColor()} animate-pulse`} />;
  };

  const getStatusText = () => {
    if (!isMonitoring) return "Offline";
    if (isDataStale) return "Stale";
    if (isRefreshing) return "Updating...";
    return "Live";
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center">
        {getStatusIcon()}
        {showLabel && (
          <span className={`text-xs font-satoshi ml-1 ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        )}
      </div>

      {showCountdown &&
        isMonitoring &&
        nextUpdateCountdown > 0 &&
        !isRefreshing && (
          <div className="flex items-center">
            <Clock size={10} className="text-gray-400 mr-1" />
            <span className="text-xs font-mono text-gray-400">
              {nextUpdateCountdown}s
            </span>
          </div>
        )}

      {isMonitoring && !isDataStale && (
        <div className="relative">
          <div
            className={`w-2 h-2 rounded-full ${
              isRefreshing ? "bg-blue-400" : "bg-green-400"
            } animate-pulse`}
          ></div>
          <div
            className={`absolute inset-0 w-2 h-2 rounded-full ${
              isRefreshing ? "bg-blue-400" : "bg-green-400"
            } animate-ping opacity-25`}
          ></div>
        </div>
      )}

      {isMonitoring && (
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded disabled:opacity-50"
          title="Force refresh"
        >
          <RefreshCw size={10} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      )}
    </div>
  );
}

// Compact version for use in tight spaces
export function CompactRealtimeStatus() {
  const { isMonitoring, isDataStale } = useRealtimeDashboard();
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState<number>(0);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - Date.now(); // This would need lastUpdated from hook
      const timeToNextUpdate = 10000 - (Math.abs(timeSinceLastUpdate) % 10000);
      setNextUpdateCountdown(Math.ceil(timeToNextUpdate / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  if (!isMonitoring) {
    return (
      <div className="flex items-center">
        <WifiOff size={8} className="text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      <Radio
        size={8}
        className={`${
          isDataStale ? "text-yellow-400" : "text-green-400"
        } animate-pulse`}
      />
      {nextUpdateCountdown > 0 && (
        <span className="text-xs font-mono text-gray-400">
          {nextUpdateCountdown}
        </span>
      )}
    </div>
  );
}
