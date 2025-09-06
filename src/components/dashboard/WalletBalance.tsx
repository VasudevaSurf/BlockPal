"use client";

import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { RootState } from "@/store";
import { SkeletonWalletBalance } from "@/components/ui/Skeleton";

export default function WalletBalance() {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Mock wallet data for UI
  const [walletData] = useState({
    address: "0x1234567890123456789012345678901234567890",
    balance: 12847.65,
    change24h: 342.18,
    changePercentage: 2.74,
    tokenCount: 8,
  });

  // Copy feedback state
  const [copyState, setCopyState] = useState({
    isCopied: false,
    isAnimating: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Show skeleton during initial load
  if (!isAuthenticated || !user) {
    return <SkeletonWalletBalance />;
  }

  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex-shrink-0 h-auto">
      {/* Header - Responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            Wallet Balance
          </h2>

          {isRefreshing && (
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-[#E2AF19] animate-spin" />
              <span className="text-xs text-[#E2AF19] font-satoshi">
                Updating...
              </span>
            </div>
          )}
        </div>

        {/* Address and Copy Button */}
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-xs sm:text-xs font-satoshi italic font-medium truncate max-w-[120px] sm:max-w-none tracking-wide">
            {walletData.address
              ? `${walletData.address.slice(0, 8)}...${walletData.address.slice(
                  -6
                )}`
              : "No wallet selected"}
          </span>

          <button
            onClick={() => copyToClipboard(walletData.address)}
            className={`transition-all duration-300 ease-in-out px-2 py-0.5 rounded-full text-xs font-satoshi flex items-center gap-1 flex-shrink-0 ${
              copyState.isCopied
                ? "bg-[#E2AF19] text-black scale-105"
                : "text-black hover:bg-[#D4A853] bg-[#E2AF19] bg-opacity-100"
            }`}
            disabled={copyState.isAnimating}
          >
            <span>{copyState.isCopied ? "Copied!" : "Copy"}</span>
          </button>

          <button
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
          </button>
        </div>
      </div>

      {/* Balance Display */}
      <div>
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
          {formatBalance(walletData.balance)}
        </div>

        {/* 24h Change Display */}
        <div className="flex items-center text-xs gap-2">
          <span
            className={`font-satoshi ${
              walletData.change24h >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {walletData.change24h >= 0 ? "+" : ""}$
            {Math.abs(walletData.change24h).toFixed(2)}
          </span>
          <span
            className={`font-satoshi ${
              walletData.changePercentage >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            ({formatPercentage(walletData.changePercentage)})
          </span>
          <span className="text-gray-500 font-satoshi">24h</span>
        </div>

        <div className="flex items-center">
          <span className="text-xs text-gray-500 font-satoshi">
            {walletData.tokenCount}{" "}
            {walletData.tokenCount === 1 ? "token" : "tokens"}
          </span>
        </div>
      </div>
    </div>
  );
}
