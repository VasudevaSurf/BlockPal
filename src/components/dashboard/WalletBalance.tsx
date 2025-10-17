// src/components/dashboard/WalletBalance.tsx - COMPLETE CODE with Universal Skeleton
"use client";

import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
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
import { useDashboardLoading } from "@/contexts/DashboardLoadingContext";
import { WalletBalanceSkeleton } from "@/components/ui/UniversalSkeleton";

// Portfolio Change Component
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

  // Use shared wallet data context
  const { walletData, refresh, isRefreshing } = useWalletData();

  // Use dashboard loading context
  const { allComponentsLoaded, setComponentLoading } = useDashboardLoading();

  // Wallet integration
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);

  // Copy feedback state
  const [copyState, setCopyState] = useState({
    isCopied: false,
    isAnimating: false,
  });

  // Update loading state
  useEffect(() => {
    const isLoading = walletData.isInitialLoading && !walletData.hasLoadedOnce;
    setComponentLoading("walletBalance", isLoading);
  }, [
    walletData.isInitialLoading,
    walletData.hasLoadedOnce,
    setComponentLoading,
  ]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState({ isCopied: true, isAnimating: true });
      setTimeout(() => {
        setCopyState({ isCopied: false, isAnimating: false });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  // Show wallet not connected state
  if (!isConnected || !address) {
    // Not loading when wallet is not connected
    useEffect(() => {
      setComponentLoading("walletBalance", false);
    }, [setComponentLoading]);

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

  // Determine if we should show universal skeleton or wait for all components
  const showInternalSkeleton =
    (walletData.isInitialLoading && !walletData.hasLoadedOnce) ||
    !allComponentsLoaded;

  // Use universal skeleton instead of custom one
  if (showInternalSkeleton) {
    return <WalletBalanceSkeleton />;
  }

  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex-shrink-0">
      {/* Header - Desktop only */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            {walletData.chainName || currentChain?.name || "Ethereum"} Token
            Balances
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

        {/* Address and Copy Button - Desktop */}
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

      {/* Mobile Header - Title only */}
      <div className="lg:hidden flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white font-mayeka-demi-bold-demo">
          {walletData.chainName || currentChain?.name || "Ethereum"} Token
          Balances
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
                onClick={refresh}
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

            {/* Address and Copy Button - Mobile only, below price */}
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
