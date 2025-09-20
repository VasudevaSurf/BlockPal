// src/components/dashboard/WalletBalance.tsx - FIXED to include user-added tokens in balance
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
import { useAccount, useChainId, useBalance } from "wagmi";
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
  const isValidChange =
    typeof totalChange24h === "number" &&
    !isNaN(totalChange24h) &&
    Math.abs(totalChange24h) >= 0.001;
  const displayChange = isValidChange ? totalChange24h : 0;

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

  // Format like wallet-balance.js: "+$0.028" or "-$0.012"
  const formattedChange = tokenService.format24hrChange(displayChange);

  if (!isValidChange) {
    return null; // Don't show anything if no meaningful change
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

  // Wallet integration
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address,
    query: {
      enabled: isConnected,
    },
  });

  // Get current chain data
  const currentChain = chains.find((c) => c.id === chainId);

  // Component state - FIXED: Use mainListValue for display
  const [mainListValue, setMainListValue] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [mainList24hrChange, setMainList24hrChange] = useState(0);
  const [presetTokenCount, setPresetTokenCount] = useState(0);
  const [hiddenTokenCount, setHiddenTokenCount] = useState(0);
  const [chainName, setChainName] = useState("");
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
      resetWalletState();
    }
  }, [isConnected, address, chainId]);

  const resetWalletState = () => {
    setMainListValue(0);
    setTotalValue(0);
    setTokenCount(0);
    setMainList24hrChange(0);
    setPresetTokenCount(0);
    setHiddenTokenCount(0);
    setChainName("");
    setError("");
    setLoading(false);
  };

  // FIXED: Fetch wallet data and calculate main list balance properly
  const fetchWalletData = async () => {
    if (!address || !chainId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log(`📊 Fetching wallet data for ${address} on chain ${chainId}`);

      // FIXED: Fetch ALL tokens so we can calculate main list balance properly
      const response = await tokenService.getWalletTokens(
        address,
        chainId,
        true // Get ALL tokens including hidden ones
      );

      // FIXED: Load user preferences to know which tokens are user-added
      const userPreferences = await loadUserPreferences(address, chainId);

      // FIXED: Calculate main list value (preset + user-added tokens only)
      let calculatedMainListValue = 0;
      let calculatedMainList24hrChange = 0;
      let mainListTokenCount = 0;

      response.tokens.forEach((token, index) => {
        // Check if token is in main list (preset or user-added)
        const isPresetToken = index < response.presetTokenCount;
        const isUserAddedToken =
          userPreferences?.userAddedTokens?.includes(token.contractAddress) ||
          false;

        if (isPresetToken || isUserAddedToken) {
          calculatedMainListValue += token.value || 0;
          calculatedMainList24hrChange += token.usdChange24h || 0;
          mainListTokenCount++;
        }
      });

      // FIXED: Set the calculated main list values
      setMainListValue(calculatedMainListValue);
      setTotalValue(response.totalValue);
      setTokenCount(mainListTokenCount); // Only count main list tokens
      setMainList24hrChange(calculatedMainList24hrChange);
      setPresetTokenCount(response.presetTokenCount);
      setHiddenTokenCount(response.hiddenTokenCount);
      setChainName(response.chainName);

      console.log(
        `✅ Wallet data loaded - Main List Value: ${tokenService.formatCurrency(
          calculatedMainListValue
        )}, Total Value: ${tokenService.formatCurrency(response.totalValue)}`
      );

      console.log(
        `📊 Main list: ${mainListTokenCount} tokens (${
          response.presetTokenCount
        } preset + ${
          mainListTokenCount - response.presetTokenCount
        } user-added)`
      );

      if (response.hasHiddenTokens) {
        console.log(
          `💡 ${response.hiddenTokenCount} additional tokens not included in main balance.`
        );
      }
    } catch (err: any) {
      console.error("❌ Error fetching wallet data:", err);
      setError(err.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Helper function to load user preferences
  const loadUserPreferences = async (
    walletAddress: string,
    chainId: number
  ) => {
    try {
      const response = await fetch(
        `/api/wallet/preferences?wallet=${walletAddress}&chain=${chainId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No preferences found
        }
        throw new Error(`Failed to load preferences: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error: any) {
      console.warn("⚠️ Could not load user preferences:", error.message);
      return null;
    }
  };

  // Format balance using mainListValue
  const formatBalance = (balance: number) => {
    return tokenService.formatCurrency(balance);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            {chainName || currentChain?.name || "Ethereum"} Token Balances
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

      {/* FIXED: Balance Display - Show main list value (preset + user-added) */}
      <div className="space-y-2">
        {/* Main Balance Display */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
              {formatBalance(mainListValue)}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Portfolio 24hr Change */}
              <PortfolioChange
                change24h={0}
                totalChange24h={mainList24hrChange}
              />
            </div>
          </div>

          {/* Token count info */}
          {/* <div className="text-right">
            <div className="text-gray-400 text-xs font-satoshi mb-1">
              {tokenCount > 0 ? (
                <>
                  Main List: {tokenCount} token{tokenCount !== 1 ? "s" : ""}
                </>
              ) : (
                "Assets"
              )}
            </div>
            {hiddenTokenCount > 0 && (
              <div className="text-yellow-400 text-xs font-satoshi mb-1">
                +{hiddenTokenCount} additional
              </div>
            )}
          </div> */}
        </div>

        {/* Additional Info Banner */}
        {/* {mainListValue > 0 && hiddenTokenCount > 0 && (
          <div className="mt-3 p-2 bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg">
            <div className="text-gray-400 text-xs font-satoshi">
              💡 Showing balance of {tokenCount} main list token
              {tokenCount !== 1 ? "s" : ""} only.
              <br />
              {hiddenTokenCount} additional token
              {hiddenTokenCount !== 1 ? "s" : ""} not included in balance.
            </div>
          </div>
        )} */}

        {/* Debug Info for Development */}
        {/* {process.env.NODE_ENV === "development" && (
          <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="text-blue-400 text-xs font-satoshi">
              <strong>Debug Info:</strong>
              <br />
              Main List Value (Displayed): {formatBalance(mainListValue)}
              <br />
              Total Value (All Tokens): {formatBalance(totalValue)}
              <br />
              Main List 24h Change:{" "}
              {tokenService.format24hrChange(mainList24hrChange)}
              <br />
              Main List Tokens: {tokenCount} | Hidden: {hiddenTokenCount}
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
