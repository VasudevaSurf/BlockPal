// src/components/dashboard/WalletBalance.tsx - UPDATED WITH CACHE SUPPORT
"use client";

import { useSelector } from "react-redux";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Copy,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { RootState } from "@/store";
import { tokenService } from "@/services/tokenService";
import { chains } from "@/components/wallet/WalletProvider";
import { useWalletData } from "@/contexts/WalletDataContext";
import { useUnifiedDashboard } from "@/contexts/UnifiedDashboardContext";
import { useToast } from "@/contexts/ToastContext";
import { useAppKitAccount } from "@reown/appkit/react";

const PortfolioChange = ({ totalChange24h }: { totalChange24h?: number }) => {
  const isValidChange =
    typeof totalChange24h === "number" &&
    !isNaN(totalChange24h) &&
    Math.abs(totalChange24h) >= 0.001;
  const displayChange = isValidChange ? totalChange24h : 0;

  const isPositive = displayChange > 0;
  const isNegative = displayChange < 0;

  let colorClass = "text-gray-400";
  let bgClass = "bg-gray-500/10";
  let iconColor = "text-gray-400";

  if (isPositive) {
    colorClass = "text-green-400";
    bgClass = "bg-green-500/10";
    iconColor = "text-green-400";
  }
  if (isNegative) {
    colorClass = "text-red-400";
    bgClass = "bg-red-500/10";
    iconColor = "text-red-400";
  }

  const formattedChange = tokenService.format24hrChange(displayChange);

  if (!isValidChange) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${bgClass}`}>
      {isPositive && <TrendingUp size={14} className={iconColor} />}
      {isNegative && <TrendingDown size={14} className={iconColor} />}
      <span className={`text-sm font-satoshi ${colorClass} font-medium`}>
        {formattedChange}
      </span>
      <span className="text-gray-400 text-sm font-satoshi">24h</span>
    </div>
  );
};

export default function WalletBalance() {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const { walletData, refresh, isRefreshing } = useWalletData();
  const { setComponentLoaded, setComponentDataReady } = useUnifiedDashboard();

  const { address, isConnected } = useAppKitAccount(); // ✅ CHANGED
  const hasReportedMountRef = useRef(false);
  const hasReportedDataRef = useRef(false);

  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);

  const { showToast } = useToast();

  const [copyState, setCopyState] = useState({
    isCopied: false,
    isAnimating: false,
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState({ isCopied: true, isAnimating: true });

      showToast("success", "Wallet address copied to clipboard!", 2000);

      setTimeout(() => {
        setCopyState({ isCopied: false, isAnimating: false });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      showToast("error", "Failed to copy address", 2000);
    }
  };

  // Report component mount
  useEffect(() => {
    if (!hasReportedMountRef.current) {
      console.log("✅ WalletBalance: Component mounted");
      setComponentLoaded("walletBalance");
      hasReportedMountRef.current = true;
    }

    return () => {
      hasReportedMountRef.current = false;
    };
  }, [setComponentLoaded]);

  // Report data ready - now checks cache validity
  useEffect(() => {
    if (!hasReportedDataRef.current && walletData.cacheValid) {
      console.log("✅ WalletBalance: Data ready (from cache)");
      setComponentDataReady("walletBalance");
      hasReportedDataRef.current = true;
    }
  }, [walletData.cacheValid, setComponentDataReady]);

  // Reset data reported flag when wallet/chain changes
  useEffect(() => {
    if (!walletData.cacheValid) {
      hasReportedDataRef.current = false;
    }
  }, [walletData.cacheValid]);

  if (!isConnected || !address) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
              Wallet Balance
            </h2>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
            <span className="text-gray-400 text-xl">🔌</span>
          </div>
          <h3 className="text-white text-base font-satoshi mb-1">
            Connect Wallet
          </h3>
          <p className="text-gray-400 font-satoshi text-sm">
            Connect your wallet to view your balance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex-shrink-0">
      {/* Header - Desktop only */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            {walletData.chainName || "Unknown"} Token Balances{" "}
            {/* ✅ Use walletData.chainName */}
          </h2>

          {isRefreshing && (
            <div className="flex items-center gap-1">
              {/* <RefreshCw className="w-3 h-3 text-[#E2AF19] animate-spin" />
              <span className="text-xs text-[#E2AF19] font-satoshi">
                Updating...
              </span> */}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-xs sm:text-xs font-satoshi italic font-medium truncate max-w-[120px] sm:max-w-none tracking-wide">
            {address
              ? `${address.slice(0, 8)}...${address.slice(-6)}`
              : "No wallet connected"}
          </span>

          <button
            onClick={() => copyToClipboard(address!)}
            disabled={!address}
            className={`transition-all duration-300 ease-in-out px-2 py-0.5 rounded-full text-xs font-satoshi flex items-center gap-1 flex-shrink-0 ${
              copyState.isCopied
                ? "bg-[#E2AF19] text-black scale-105"
                : "text-black hover:bg-[#D4A853] bg-[#E2AF19] bg-opacity-100 disabled:opacity-50"
            }`}
          >
            <span>{copyState.isCopied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white font-mayeka-demi-bold-demo">
          {walletData.chainName || "Unknown"} Token Balances{" "}
          {/* ✅ Use walletData.chainName */}
        </h2>
        {isRefreshing && (
          <div className="flex items-center gap-1">
            {/* <RefreshCw className="w-3 h-3 text-[#E2AF19] animate-spin" />
            <span className="text-xs text-[#E2AF19] font-satoshi">
              Updating...
            </span> */}
          </div>
        )}
      </div>

      {/* Error Display */}
      {walletData.error && (
        <div className="mb-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle size={14} className="text-red-400 mr-2 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-satoshi">
                {walletData.error}
              </p>
              <button
                onClick={() => refresh(true)}
                className="text-red-400 underline text-xs mt-1 font-satoshi"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Display */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div className="w-full">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
              {tokenService.formatCurrency(walletData.mainListValue)}
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-3 lg:mb-0">
              {walletData.total24hrChange !== 0 && (
                <PortfolioChange totalChange24h={walletData.total24hrChange} />
              )}
            </div>

            {/* Mobile Address */}
            <div className="lg:hidden flex items-center space-x-2 mt-2">
              <span className="text-gray-400 text-xs font-satoshi italic font-medium truncate max-w-[150px] tracking-wide">
                {address
                  ? `${address.slice(0, 8)}...${address.slice(-6)}`
                  : "No wallet connected"}
              </span>

              <button
                onClick={() => copyToClipboard(address!)}
                disabled={!address}
                className={`transition-all duration-300 ease-in-out px-2 py-0.5 rounded-full text-xs font-satoshi flex items-center gap-1 flex-shrink-0 ${
                  copyState.isCopied
                    ? "bg-[#E2AF19] text-black scale-105"
                    : "text-black hover:bg-[#D4A853] bg-[#E2AF19] bg-opacity-100 disabled:opacity-50"
                }`}
              >
                <span>{copyState.isCopied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
