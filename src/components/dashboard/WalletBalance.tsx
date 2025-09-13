// src/components/dashboard/WalletBalance.tsx - ENHANCED VERSION with portfolio percentage change
"use client";

import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  Copy,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAccount, useChainId, useBalance } from "wagmi"; // UPDATED: useChainId instead of useNetwork
import { RootState } from "@/store";
import { SkeletonWalletBalance } from "@/components/ui/Skeleton";
import { tokenService } from "@/services/tokenService";
import { chains } from "@/components/wallet/WalletProvider";

// Portfolio Change Component
const PortfolioChange = ({
  change24h,
  totalChange24h,
}: {
  change24h: number;
  totalChange24h?: number;
}) => {
  // Handle invalid or missing values
  const isValidChange = typeof change24h === "number" && !isNaN(change24h);
  const displayChange = isValidChange ? change24h : 0;

  const isPositive = displayChange > 0;
  const isNegative = displayChange < 0;

  // Color classes
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

  const formattedPercentage = tokenService.formatPercentage(displayChange);

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${bgClass}`}>
      {isPositive && <TrendingUp size={14} className={iconColor} />}
      {isNegative && <TrendingDown size={14} className={iconColor} />}
      <span className={`text-sm font-satoshi ${colorClass}`}>
        {!isValidChange ? "+0.00%" : formattedPercentage}
      </span>
      <span className="text-gray-400 text-sm font-satoshi">24h</span>
      {totalChange24h && Math.abs(totalChange24h) > 0.01 && (
        <span className={`text-xs font-satoshi ${colorClass} ml-1`}>
          (${totalChange24h >= 0 ? "+" : ""}${totalChange24h.toFixed(2)})
        </span>
      )}
    </div>
  );
};

export default function WalletBalance() {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Wallet integration - UPDATED for wagmi v2
  const { address, isConnected } = useAccount();
  const chainId = useChainId(); // UPDATED: useChainId instead of useNetwork
  const { data: balance } = useBalance({
    address,
    query: {
      enabled: isConnected,
    },
  });

  // Get current chain data
  const currentChain = chains.find((c) => c.id === chainId);

  // Component state
  const [totalValue, setTotalValue] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [totalChange24h, setTotalChange24h] = useState(0); // USD change amount
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Copy feedback state
  const [copyState, setCopyState] = useState({
    isCopied: false,
    isAnimating: false,
  });

  // Fetch wallet data when connected
  useEffect(() => {
    if (isConnected && address && chainId) {
      fetchWalletData();
    } else {
      // Reset state when disconnected
      setTotalValue(0);
      setTokenCount(0);
      setChange24h(0);
      setTotalChange24h(0);
      setError("");
      setLoading(false);
    }
  }, [isConnected, address, chainId]);

  // Fetch wallet data from API
  const fetchWalletData = async () => {
    if (!address || !chainId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log(`📊 Fetching wallet data for ${address} on chain ${chainId}`);

      const response = await tokenService.getWalletTokens(address, chainId);

      setTotalValue(response.totalValue);
      setTokenCount(response.tokenCount);

      // ENHANCED: Calculate weighted portfolio change
      let portfolioChange = 0;
      let totalUsdChange = 0;

      if (response.totalValue > 0) {
        response.tokens.forEach((token) => {
          // Skip invalid change values
          if (typeof token.change24h === "number" && !isNaN(token.change24h)) {
            // Weight by token value proportion
            const weight = token.value / response.totalValue;
            portfolioChange += token.change24h * weight;

            // Calculate USD change if available
            if (token.usdChange24h) {
              totalUsdChange += token.usdChange24h;
            } else {
              // Calculate from percentage if USD change not available
              const previousValue = token.value / (1 + token.change24h / 100);
              const usdChange = token.value - previousValue;
              totalUsdChange += usdChange;
            }
          }
        });
      }

      setChange24h(portfolioChange);
      setTotalChange24h(totalUsdChange);

      console.log(
        `✅ Wallet data loaded: $${response.totalValue.toFixed(2)}, ${
          response.tokenCount
        } tokens, ${portfolioChange.toFixed(2)}% change`
      );

      // Log percentage change calculation details
      const tokensWithChange = response.tokens.filter(
        (t) => typeof t.change24h === "number" && !isNaN(t.change24h)
      );
      console.log(`📈 Portfolio change calculation:`, {
        totalTokens: response.tokens.length,
        tokensWithChange: tokensWithChange.length,
        portfolioChange: portfolioChange.toFixed(4),
        totalUsdChange: totalUsdChange.toFixed(2),
        weights: response.tokens.map((t) => ({
          symbol: t.symbol,
          value: t.value,
          change: t.change24h,
          weight: response.totalValue > 0 ? t.value / response.totalValue : 0,
        })),
      });
    } catch (err: any) {
      console.error("❌ Error fetching wallet data:", err);
      setError(err.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
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

  const handleRefresh = async () => {
    if (!address) return;

    setIsRefreshing(true);
    try {
      await tokenService.refreshWalletTokens(address);
      await fetchWalletData();
    } catch (err: any) {
      console.error("❌ Error refreshing wallet data:", err);
      setError("Failed to refresh wallet data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show skeleton during initial load
  if (loading && (!isAuthenticated || !user)) {
    return <SkeletonWalletBalance />;
  }

  // Show wallet not connected state
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

          {/* Chain indicator */}
          {currentChain && (
            <div className="flex items-center gap-1 bg-[#0F0F0F] px-2 py-1 rounded-full border border-[#2C2C2C]">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-white text-xs font-satoshi">
                {currentChain.name}
              </span>
            </div>
          )}
        </div>

        {/* Address and Copy Button */}
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

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || !address}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50"
            title="Refresh wallet data"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle size={14} className="text-red-400 mr-2 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-satoshi">{error}</p>
              <button
                onClick={() => fetchWalletData()}
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
        {/* Main Balance */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
              {formatBalance(totalValue)}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* ENHANCED: Portfolio percentage change */}
              {(change24h !== 0 || totalChange24h !== 0) && (
                <PortfolioChange
                  change24h={change24h}
                  totalChange24h={totalChange24h}
                />
              )}
            </div>
          </div>

          {/* Token count */}
          {tokenCount > 0 && (
            <div className="text-right">
              <div className="text-gray-400 text-xs font-satoshi">Assets</div>
              <div className="text-white text-sm font-satoshi font-medium">
                {tokenCount}
              </div>
            </div>
          )}
        </div>

        {/* Native Balance Display (if available) */}
        {balance && (
          <div className="text-gray-400 text-sm font-satoshi">
            {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#E2AF19]"></div>
            <span className="text-gray-400 text-sm font-satoshi">
              Loading wallet data...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
