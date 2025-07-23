// src/components/wallet/WalletRefreshButton.tsx - ENHANCED VERSION
"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RefreshCw } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import {
  fetchWalletTokens,
  updateWalletBalance,
} from "@/store/slices/walletSlice";

interface WalletRefreshButtonProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

export default function WalletRefreshButton({
  size = "sm",
  className = "",
  showTooltip = true,
}: WalletRefreshButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet, loading } = useSelector(
    (state: RootState) => state.wallet
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const handleRefresh = async () => {
    if (!activeWallet?.address || isRefreshing || loading) {
      return;
    }

    console.log(
      "🔄 Manual refresh triggered for wallet:",
      activeWallet.address
    );
    setIsRefreshing(true);

    try {
      // Refresh both balance and tokens in parallel
      const [balanceResult, tokensResult] = await Promise.all([
        dispatch(updateWalletBalance(activeWallet.address)),
        dispatch(fetchWalletTokens(activeWallet.address)),
      ]);

      // Check if both operations were successful
      const balanceSuccess =
        balanceResult.type === "wallet/updateWalletBalance/fulfilled";
      const tokensSuccess =
        tokensResult.type === "wallet/fetchWalletTokens/fulfilled";

      if (balanceSuccess && tokensSuccess) {
        console.log("✅ Wallet data refreshed successfully");
        setLastRefresh(new Date());

        // Show success feedback (optional)
        if (typeof window !== "undefined") {
          // You could show a toast notification here
          console.log("💰 Wallet balance and tokens updated");
        }
      } else {
        console.warn("⚠️ Some wallet data may not have updated properly", {
          balanceSuccess,
          tokensSuccess,
        });
      }
    } catch (error) {
      console.error("❌ Error refreshing wallet data:", error);
      // You could show an error notification here
    } finally {
      // Add a small delay to show the loading state
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-4 h-4";
      case "md":
        return "w-5 h-5";
      case "lg":
        return "w-6 h-6";
      default:
        return "w-4 h-4";
    }
  };

  const getButtonClasses = () => {
    const baseClasses =
      "p-1.5 lg:p-2 rounded-lg transition-all duration-200 flex items-center justify-center";
    const stateClasses =
      isRefreshing || loading
        ? "text-[#E2AF19] cursor-not-allowed"
        : "text-gray-400 hover:text-white hover:bg-[#2C2C2C] active:bg-[#3C3C3C]";

    return `${baseClasses} ${stateClasses} ${className}`;
  };

  const formatLastRefresh = () => {
    if (!lastRefresh) return null;

    const now = new Date();
    const diffMs = now.getTime() - lastRefresh.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return lastRefresh.toLocaleTimeString();
    }
  };

  const tooltipText = showTooltip
    ? isRefreshing
      ? "Refreshing..."
      : lastRefresh
      ? `Refresh wallet data (last: ${formatLastRefresh()})`
      : "Refresh wallet data"
    : undefined;

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing || loading || !activeWallet?.address}
      className={getButtonClasses()}
      title={tooltipText}
      aria-label="Refresh wallet data"
    >
      <RefreshCw
        className={`${getSizeClasses()} ${
          isRefreshing || loading ? "animate-spin" : ""
        } transition-transform duration-200 ${
          !isRefreshing && !loading ? "hover:rotate-180" : ""
        }`}
      />

      {/* Optional loading indicator */}
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-[#E2AF19] rounded-full animate-pulse" />
        </div>
      )}
    </button>
  );
}
