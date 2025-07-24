// src/components/dashboard/PureRealtimeStatusBar.tsx - Status bar for pure real-time monitoring
"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  Wifi,
  WifiOff,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";

interface PureRealtimeStatusBarProps {
  isMonitoring: boolean;
  isConnected: boolean;
  lastUpdated?: Date | null;
  totalValueChange?: number;
  hasRecentChanges?: boolean;
  timeSinceUpdate?: string | null;
  status: {
    isMonitoring: boolean;
    lastBlock: number;
    changeCount: number;
    errorCount: number;
    apiCallsPerMinute: number;
    dataAge: number | null;
  };
  isDataStale?: boolean;
  changeCount?: number;
  onManualRefresh?: () => void;
  className?: string;
}

export default function PureRealtimeStatusBar({
  isMonitoring,
  isConnected,
  lastUpdated,
  totalValueChange = 0,
  hasRecentChanges = false,
  timeSinceUpdate,
  status,
  isDataStale = false,
  changeCount = 0,
  onManualRefresh,
  className = "",
}: PureRealtimeStatusBarProps) {
  const [pulse, setPulse] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Trigger pulse animation on changes
  useEffect(() => {
    if (hasRecentChanges && Math.abs(totalValueChange) > 0.001) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasRecentChanges, totalValueChange]);

  const getConnectionStatus = () => {
    if (!isMonitoring) {
      return {
        icon: WifiOff,
        text: "Offline",
        color: "text-gray-400",
        bgColor: "bg-gray-900/50",
        description: "Pure monitoring is offline",
      };
    }

    if (!isConnected || status.errorCount > 5) {
      return {
        icon: AlertCircle,
        text: "Reconnecting",
        color: "text-yellow-400",
        bgColor: "bg-yellow-900/30",
        description: "Connection issues detected",
      };
    }

    if (isDataStale) {
      return {
        icon: Clock,
        text: "Stale",
        color: "text-orange-400",
        bgColor: "bg-orange-900/30",
        description: "Data is stale, refreshing...",
      };
    }

    return {
      icon: Radio,
      text: "Live",
      color: "text-green-400",
      bgColor: "bg-green-900/30",
      description: "Pure blockchain monitoring active",
    };
  };

  const formatValueChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    if (Math.abs(change) < 0.01) {
      return `${sign}$${change.toFixed(4)}`;
    }
    return `${sign}$${change.toFixed(2)}`;
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;

  return (
    <div
      className={`flex items-center justify-between py-2 px-3 mb-2 rounded-lg border border-gray-700/30 bg-black/40 backdrop-blur-sm ${className}`}
    >
      {/* Left side - Connection status */}
      <div className="flex items-center space-x-3">
        {/* Main status indicator */}
        <div
          className={`flex items-center space-x-2 px-2 py-1 rounded-md ${connectionStatus.bgColor}`}
        >
          <div className="relative">
            <ConnectionIcon
              size={14}
              className={`${connectionStatus.color} ${
                pulse ? "animate-pulse" : ""
              } ${isMonitoring && isConnected ? "animate-pulse" : ""}`}
            />
            {/* Activity indicator */}
            {isMonitoring && isConnected && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75" />
            )}
          </div>
          <span className={`text-xs font-medium ${connectionStatus.color}`}>
            {connectionStatus.text}
          </span>
        </div>

        {/* Block info */}
        {isMonitoring && status.lastBlock > 0 && (
          <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-400">
            <Activity size={12} />
            <span>Block {status.lastBlock.toLocaleString()}</span>
          </div>
        )}

        {/* Change counter */}
        {changeCount > 0 && (
          <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-blue-900/30">
            <Zap size={12} className="text-blue-400" />
            <span className="text-xs font-medium text-blue-400">
              {changeCount} change{changeCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Center - Value change indicator */}
      {hasRecentChanges && Math.abs(totalValueChange) > 0.001 && (
        <div
          className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-all duration-300 ${
            totalValueChange >= 0
              ? "bg-green-900/30 text-green-400"
              : "bg-red-900/30 text-red-400"
          } ${pulse ? "scale-110" : "scale-100"}`}
        >
          {totalValueChange >= 0 ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} />
          )}
          <span className="text-xs font-bold">
            {formatValueChange(totalValueChange)}
          </span>
        </div>
      )}

      {/* Right side - Last update and controls */}
      <div className="flex items-center space-x-3">
        {/* API performance */}
        {isMonitoring && status.apiCallsPerMinute > 0 && (
          <div className="hidden md:flex items-center space-x-1 text-xs text-gray-500">
            <Activity size={10} />
            <span>{status.apiCallsPerMinute}/min</span>
          </div>
        )}

        {/* Last update time */}
        {timeSinceUpdate && (
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <Clock size={12} />
            <span>{timeSinceUpdate}</span>
          </div>
        )}

        {/* Details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
          title="Toggle details"
        >
          <Eye size={12} />
        </button>

        {/* Manual refresh button (only show if stale or errors) */}
        {(isDataStale || status.errorCount > 0) && onManualRefresh && (
          <button
            onClick={onManualRefresh}
            className="text-xs text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/30 rounded"
            title="Force refresh"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Detailed status panel */}
      {showDetails && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 border border-gray-700/50 rounded-lg p-3 backdrop-blur-sm z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-gray-400 mb-1">Status</div>
              <div className={connectionStatus.color}>
                {connectionStatus.description}
              </div>
            </div>

            <div>
              <div className="text-gray-400 mb-1">Performance</div>
              <div className="text-white">
                {status.apiCallsPerMinute} API calls/min
              </div>
            </div>

            <div>
              <div className="text-gray-400 mb-1">Errors</div>
              <div
                className={
                  status.errorCount > 0 ? "text-red-400" : "text-green-400"
                }
              >
                {status.errorCount} errors
              </div>
            </div>

            <div>
              <div className="text-gray-400 mb-1">Data Age</div>
              <div
                className={isDataStale ? "text-orange-400" : "text-green-400"}
              >
                {status.dataAge
                  ? `${Math.floor(status.dataAge / 1000)}s`
                  : "Fresh"}
              </div>
            </div>
          </div>

          {/* Last update details */}
          {lastUpdated && (
            <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs text-gray-400">
              <div className="flex items-center justify-between">
                <span>Last Update:</span>
                <span>{lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
