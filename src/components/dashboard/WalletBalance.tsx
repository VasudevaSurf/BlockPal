// src/components/dashboard/WalletBalance.tsx - Updated for new dashboard workflow
"use client";

import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { Copy, ChevronDown, Check, RefreshCw } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { openWalletSelector } from "@/store/slices/uiSlice";
import { useDashboardV2 } from "@/hooks/useDashboardV2";
import { SkeletonWalletBalance } from "@/components/ui/Skeleton";

export default function WalletBalance() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  // Use the new dashboard hook for data
  const {
    totalValue,
    isLoading,
    isRefreshing,
    isInitialized,
    lastRefresh,
    refreshCount,
    portfolioStats,
    manualRefresh,
    tokens,
  } = useDashboardV2();

  // Copy feedback state
  const [copyState, setCopyState] = useState({
    isCopied: false,
    isAnimating: false,
  });

  // Track if this is initial load
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialized && isInitialLoad.current) {
      isInitialLoad.current = false;
      console.log("💰 WalletBalance initialized with total value:", totalValue);
    }
  }, [isInitialized, totalValue]);

  // Reset copy state when wallet changes
  useEffect(() => {
    setCopyState({
      isCopied: false,
      isAnimating: false,
    });
  }, [activeWallet?.address]);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Address copied to clipboard");

      setCopyState({ isCopied: true, isAnimating: true });

      setTimeout(() => {
        setCopyState({ isCopied: false, isAnimating: false });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleWalletClick = () => {
    dispatch(openWalletSelector());
  };

  const handleRefresh = () => {
    console.log("🔄 Manual refresh triggered from WalletBalance");
    manualRefresh();
  };

  // Calculate time since last refresh
  const getTimeSinceRefresh = () => {
    if (!lastRefresh) return "Never";
    const seconds = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Show skeleton during initial load or when switching wallets
  if (!activeWallet || (!isInitialized && isLoading)) {
    return <SkeletonWalletBalance />;
  }

  // Calculate 24h change from portfolio stats
  const change24h = portfolioStats.totalChange24h;
  const changePercentage = portfolioStats.totalChangePercentage;

  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex-shrink-0 h-auto">
      {/* Header - Responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            Wallet Balance
          </h2>

          {/* Refresh indicator - commented out for production */}
          {/* {isRefreshing && (
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-[#E2AF19] animate-spin" />
              <span className="text-xs text-[#E2AF19] font-satoshi">
                Updating...
              </span>
            </div>
          )} */}
        </div>

        {/* Address and Copy Button with Refresh Info */}
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-xs sm:text-xs font-satoshi italic font-medium truncate max-w-[120px] sm:max-w-none tracking-wide">
            {activeWallet?.address
              ? `${activeWallet.address.slice(
                  0,
                  8
                )}...${activeWallet.address.slice(-6)}`
              : "No wallet selected"}
          </span>
          {activeWallet?.address && (
            <>
              <button
                onClick={() => copyToClipboard(activeWallet.address)}
                className={`transition-all duration-300 ease-in-out px-2 py-0.5 rounded-full text-xs font-satoshi flex items-center gap-1 flex-shrink-0 ${
                  copyState.isCopied
                    ? "bg-[#E2AF19] text-black scale-105"
                    : "text-black hover:bg-[#D4A853] bg-[#E2AF19] bg-opacity-100"
                }`}
                disabled={copyState.isAnimating}
              >
                <span>{copyState.isCopied ? "Copied!" : "Copy"}</span>
              </button>

              {/* Manual Refresh Button - commented out for production */}
              {/* <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh wallet data"
              >
                <RefreshCw
                  size={14}
                  className={`transition-transform ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
              </button> */}
            </>
          )}
        </div>
      </div>

      {/* Balance Display */}
      <div>
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
          {formatBalance(totalValue)}
        </div>

        {/* 24h Change Display */}
        <div className="flex items-center text-xs gap-2">
          {tokens.length > 0 ? (
            <>
              <span
                className={`font-satoshi ${
                  change24h >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {change24h >= 0 ? "+" : ""}${Math.abs(change24h).toFixed(2)}
              </span>
              <span
                className={`font-satoshi ${
                  changePercentage >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ({formatPercentage(changePercentage)})
              </span>
              {/* <span className="text-gray-500 font-satoshi">24h</span> */}
            </>
          ) : (
            <span className="text-gray-400 font-satoshi">
              No tokens in dashboard
            </span>
          )}
        </div>

        <div className="flex items-center">
          {/* <span className="text-xs text-gray-500 font-satoshi">
            {tokens.length} {tokens.length === 1 ? "token" : "tokens"}
          </span> */}
          {/* Refresh count commented out for production */}
          {/* {refreshCount > 0 && (
            <span className="text-xs text-gray-500 font-satoshi">
              • Refreshed {refreshCount}x
            </span>
          )} */}
        </div>
      </div>

      {/* Development Mode: Show additional stats - COMMENTED OUT FOR PRODUCTION */}
      {/* {process.env.NODE_ENV === "development" && (
        <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Top Gainer:</span>
              {portfolioStats.topGainers[0] ? (
                <span className="text-green-400 ml-1">
                  {portfolioStats.topGainers[0].symbol}{" "}
                  {formatPercentage(portfolioStats.topGainers[0].change24h)}
                </span>
              ) : (
                <span className="text-gray-400 ml-1">-</span>
              )}
            </div>
            <div>
              <span className="text-gray-500">Top Loser:</span>
              {portfolioStats.topLosers[0] ? (
                <span className="text-red-400 ml-1">
                  {portfolioStats.topLosers[0].symbol}{" "}
                  {formatPercentage(portfolioStats.topLosers[0].change24h)}
                </span>
              ) : (
                <span className="text-gray-400 ml-1">-</span>
              )}
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
