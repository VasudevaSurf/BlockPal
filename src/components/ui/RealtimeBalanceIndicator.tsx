// src/components/ui/RealtimeBalanceIndicator.tsx - Real-time balance indicator
"use client";

import { Radio, TrendingUp, TrendingDown } from "lucide-react";
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";

interface RealtimeBalanceIndicatorProps {
  walletId?: string; // If provided, shows specific wallet, otherwise shows active wallet
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function RealtimeBalanceIndicator({
  walletId,
  showLabel = true,
  size = "md",
  className = "",
}: RealtimeBalanceIndicatorProps) {
  const { realtimeBalances, isMonitoring, activeWalletBalance } =
    useRealtimeWalletBalances();

  // Get the target wallet
  const targetWallet = walletId
    ? realtimeBalances.find((w) => w.id === walletId)
    : realtimeBalances.find((w) => w.isActive);

  if (!targetWallet) {
    return null;
  }

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          text: "text-sm",
          icon: 12,
          gap: "space-x-1",
        };
      case "lg":
        return {
          text: "text-lg",
          icon: 20,
          gap: "space-x-3",
        };
      default:
        return {
          text: "text-base",
          icon: 16,
          gap: "space-x-2",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={`flex items-center ${sizeClasses.gap} ${className}`}>
      {/* Real-time status indicator */}
      <div className="flex items-center">
        <Radio
          size={sizeClasses.icon}
          className={`${
            isMonitoring ? "text-green-400 animate-pulse" : "text-gray-400"
          }`}
        />
        {showLabel && (
          <span
            className={`ml-1 ${sizeClasses.text} ${
              isMonitoring ? "text-green-400" : "text-gray-400"
            } font-satoshi`}
          >
            {isMonitoring ? "Live" : "Offline"}
          </span>
        )}
      </div>

      {/* Balance display */}
      <div className="flex items-center">
        <span
          className={`${sizeClasses.text} text-white font-semibold font-satoshi`}
        >
          {formatBalance(targetWallet.balance)}
        </span>

        {/* Change indicator */}
        {targetWallet.changeAmount &&
          Math.abs(targetWallet.changeAmount) > 0.01 && (
            <div
              className={`ml-2 flex items-center ${
                targetWallet.changeAmount > 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {targetWallet.changeAmount > 0 ? (
                <TrendingUp size={sizeClasses.icon * 0.75} />
              ) : (
                <TrendingDown size={sizeClasses.icon * 0.75} />
              )}
              <span className={`ml-1 ${sizeClasses.text} font-medium`}>
                ${Math.abs(targetWallet.changeAmount).toFixed(2)}
              </span>
            </div>
          )}
      </div>

      {/* Last update time */}
      {targetWallet.lastUpdated && size !== "sm" && (
        <span className="text-xs text-gray-500 font-satoshi">
          {formatTime(targetWallet.lastUpdated)}
        </span>
      )}
    </div>
  );
}
