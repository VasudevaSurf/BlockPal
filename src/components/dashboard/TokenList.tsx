// src/components/dashboard/TokenList.tsx - COMPLETE Enhanced with show/hide functionality
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useAccount, useChainId } from "wagmi";
import { RootState } from "@/store";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import {
  RefreshCw,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { SkeletonTokenList } from "@/components/ui/Skeleton";
import { chains } from "@/components/wallet/WalletProvider";

// Token Interface - Complete definition
interface TokenBalance {
  id: string;
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  balanceWei: string;
  value: number;
  change24h: number; // Percentage change
  usdChange24h?: number; // USD change amount
  price: number;
  isNative: boolean;
  logoUrl?: string | null;
  isPopular?: boolean;
  possibleSpam?: boolean;
  verifiedContract?: boolean;
}

// Enhanced API Response Interface
interface WalletTokensResponse {
  wallet: string;
  chainId: number;
  chainName: string;
  tokens: TokenBalance[];
  totalValue: number;
  total24hrChange: number;
  tokenCount: number;
  presetTokenCount: number;
  hiddenTokenCount: number;
  showingHidden: boolean;
  hasHiddenTokens: boolean;
  lastUpdated: string;
}

// Token Image Component
const TokenImage = ({
  src,
  alt,
  symbol,
  className = "",
}: {
  src?: string | null;
  alt: string;
  symbol: string;
  className?: string;
}) => {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center`}
        style={{ backgroundColor: "#4A4A4A" }}
      >
        <span className="text-white font-bold text-xs">
          {symbol?.charAt(0) || "?"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} rounded-full object-cover`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

// Enhanced Percentage Display Component
const PercentageDisplay = ({
  change24h,
  usdChange24h,
  className = "",
  showIcon = false,
  size = "sm",
}: {
  change24h: number;
  usdChange24h?: number;
  className?: string;
  showIcon?: boolean;
  size?: "xs" | "sm" | "md";
}) => {
  const isValidChange = typeof change24h === "number" && !isNaN(change24h);
  const displayChange = isValidChange ? change24h : 0;

  const isPositive = displayChange > 0;
  const isNegative = displayChange < 0;

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-xs",
    md: "text-sm",
  };

  let colorClass = "text-gray-400";
  if (isPositive) colorClass = "text-green-400";
  if (isNegative) colorClass = "text-red-400";

  const formatPercentage = (value: number) => {
    if (typeof value !== "number" || isNaN(value)) {
      return "+0.00%";
    }
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div
      className={`${sizeClasses[size]} font-satoshi ${colorClass} ${className} flex items-center`}
    >
      {showIcon && (
        <>
          {isPositive && <TrendingUp size={12} className="mr-1" />}
          {isNegative && <TrendingDown size={12} className="mr-1" />}
        </>
      )}
      <span>{!isValidChange ? "+0.00%" : formatPercentage(displayChange)}</span>
      {usdChange24h && Math.abs(usdChange24h) > 0.01 && (
        <span className="ml-1 opacity-75">
          (${usdChange24h >= 0 ? "+" : ""}${usdChange24h.toFixed(2)})
        </span>
      )}
    </div>
  );
};

// Enhanced Token Service Class
class EnhancedTokenService {
  private baseURL: string;
  private debugMode: boolean;

  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api/tokens";
    this.debugMode = process.env.NODE_ENV === "development";
  }

  async getWalletTokens(
    walletAddress: string,
    chainId: number,
    showHidden: boolean = false
  ): Promise<WalletTokensResponse> {
    try {
      console.log(
        `🪙 Fetching tokens for wallet: ${walletAddress} on chain: ${chainId}, showHidden: ${showHidden}`
      );

      const url = `${this.baseURL}/wallet/${walletAddress}?chain=${chainId}&showHidden=${showHidden}`;
      console.log("📡 Making request to:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(45000),
      });

      console.log("📡 Response status:", response.status, response.statusText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        console.error("❌ API Error Response:", errorData);
        throw new Error(errorData.message || "Failed to fetch tokens");
      }

      let data;
      try {
        const responseText = await response.text();
        console.log(
          "📦 Raw response preview:",
          responseText.substring(0, 200) + "..."
        );

        if (!responseText.trim()) {
          throw new Error("Empty response from server");
        }

        data = JSON.parse(responseText);
        console.log("📦 Parsed API Response:", data);
      } catch (parseError) {
        console.error("❌ Error parsing response:", parseError);
        throw new Error("Invalid response format from server");
      }

      if (!data.success) {
        console.error("❌ API returned error:", data.message);
        throw new Error(data.message || "API returned error");
      }

      const responseData = data.data;

      return {
        wallet: responseData.wallet || walletAddress,
        chainId: responseData.chainId || chainId,
        chainName: responseData.chainName || "Unknown",
        tokens: responseData.tokens || [],
        totalValue: responseData.totalValue || 0,
        total24hrChange: responseData.total24hrChange || 0,
        tokenCount: responseData.tokenCount || 0,
        presetTokenCount: responseData.presetTokenCount || 0,
        hiddenTokenCount: responseData.hiddenTokenCount || 0,
        showingHidden: responseData.showingHidden || false,
        hasHiddenTokens: responseData.hasHiddenTokens || false,
        lastUpdated: responseData.lastUpdated || new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("❌ Error fetching wallet tokens:", error);
      throw error;
    }
  }

  async refreshWalletTokens(walletAddress: string): Promise<void> {
    try {
      console.log(`🔄 Refreshing token data for wallet: ${walletAddress}`);

      const response = await fetch(`${this.baseURL}/refresh/${walletAddress}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to refresh token data");
      }

      console.log(`✅ Refreshed token data for wallet ${walletAddress}`);
    } catch (error: any) {
      console.error("❌ Error refreshing token data:", error);
      throw error;
    }
  }

  formatCurrency(value: number): string {
    if (value === 0) return "$0.000";
    if (value < 0.001) return "< $0.001";
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(3)}`;
  }

  formatTokenAmount(amount: number, decimals: number = 6): string {
    if (amount === 0) return "0";
    if (amount < 0.000001) return amount.toExponential(2);

    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }

    return amount.toFixed(Math.min(decimals, 8));
  }

  format24hrChange(value: number): string {
    if (typeof value !== "number" || isNaN(value) || Math.abs(value) < 0.001) {
      return "+$0.000";
    }

    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toFixed(3)}`;
  }
}

// Create service instance
const enhancedTokenService = new EnhancedTokenService();

// MAIN COMPONENT
export default function TokenList() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading: isNavigating, startLoading } = useNavigationLoading();

  // Wallet integration
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get current chain data
  const currentChain = chains.find((c) => c.id === chainId);

  // Component state
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removingToken, setRemovingToken] = useState<string | null>(null);

  // Enhanced state for show/hide functionality
  const [showHidden, setShowHidden] = useState(false);
  const [presetTokenCount, setPresetTokenCount] = useState(0);
  const [hiddenTokenCount, setHiddenTokenCount] = useState(0);
  const [hasHiddenTokens, setHasHiddenTokens] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [total24hrChange, setTotal24hrChange] = useState(0);
  const [chainName, setChainName] = useState("");

  // Fetch tokens when wallet or chain changes or show/hide toggles
  useEffect(() => {
    if (isConnected && address && chainId) {
      fetchTokens();
    } else {
      // Reset state when not connected
      resetTokenState();
    }
  }, [isConnected, address, chainId, showHidden]);

  const resetTokenState = () => {
    setTokens([]);
    setTotalValue(0);
    setTotal24hrChange(0);
    setPresetTokenCount(0);
    setHiddenTokenCount(0);
    setHasHiddenTokens(false);
    setChainName("");
    setLoading(false);
    setError("");
  };

  // Fetch tokens from enhanced API
  const fetchTokens = async () => {
    if (!address || !chainId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log(
        `📡 Fetching tokens for ${address} on chain ${chainId}, showHidden: ${showHidden}`
      );

      const response = await enhancedTokenService.getWalletTokens(
        address,
        chainId,
        showHidden
      );

      setTokens(response.tokens);
      setTotalValue(response.totalValue);
      setTotal24hrChange(response.total24hrChange);
      setPresetTokenCount(response.presetTokenCount);
      setHiddenTokenCount(response.hiddenTokenCount);
      setHasHiddenTokens(response.hasHiddenTokens);
      setChainName(response.chainName);

      console.log(
        `✅ Loaded ${
          response.tokens.length
        } tokens with total value: ${enhancedTokenService.formatCurrency(
          response.totalValue
        )}`
      );
      console.log(
        `📊 Preset: ${response.presetTokenCount}, Hidden: ${
          response.hiddenTokenCount
        }, Showing: ${showHidden ? "All" : "Preset only"}`
      );
      console.log(
        `📈 24hr Change: ${enhancedTokenService.format24hrChange(
          response.total24hrChange
        )}`
      );

      // Log wallet-balance.js style summary
      if (response.totalValue > 0) {
        console.log("📊 Portfolio Summary:");
        console.log(
          `   Total Portfolio Value: ${enhancedTokenService.formatCurrency(
            response.totalValue
          )}`
        );
        console.log(
          `   24hr Portfolio Change: ${enhancedTokenService.format24hrChange(
            response.total24hrChange
          )}`
        );
        console.log(`   Showing: ${response.presetTokenCount} preset tokens`);
        if (response.hasHiddenTokens) {
          console.log(
            `   💡 Found ${response.hiddenTokenCount} additional token(s) not in preset list.`
          );
        }
      }
    } catch (err: any) {
      console.error("❌ Error fetching tokens:", err);
      setError(err.message || "Failed to load tokens");
      resetTokenState();
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!address) return;

    setIsRefreshing(true);
    try {
      await enhancedTokenService.refreshWalletTokens(address);
      await fetchTokens();
    } catch (err: any) {
      console.error("❌ Error refreshing tokens:", err);
      setError("Failed to refresh tokens");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle show/hide toggle
  const handleToggleHidden = () => {
    console.log(`🔄 Toggling hidden tokens: ${showHidden} -> ${!showHidden}`);
    setShowHidden(!showHidden);
  };

  // Handle token click
  const handleTokenClick = (token: TokenBalance) => {
    if (isNavigating) return;

    try {
      const url = `/dashboard/token/${encodeURIComponent(
        token.contractAddress
      )}`;
      startLoading();
      setTimeout(() => {
        router.push(url);
      }, 100);
    } catch (error) {
      console.error("❌ Navigation error:", error);
    }
  };

  // Handle remove token
  const handleRemoveToken = async (
    e: React.MouseEvent,
    contractAddress: string
  ) => {
    e.stopPropagation();

    if (removingToken || contractAddress === "native") return;

    setRemovingToken(contractAddress);
    try {
      // For now, just remove from local state
      setTimeout(() => {
        setTokens(tokens.filter((t) => t.contractAddress !== contractAddress));
        setRemovingToken(null);
      }, 500);
    } catch (error) {
      console.error("Failed to remove token:", error);
      setRemovingToken(null);
    }
  };

  // Show loading state
  if (loading) {
    return <SkeletonTokenList />;
  }

  // Show wallet not connected state
  if (!isConnected || !address) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            Token Holdings
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-6 lg:py-8 flex-1">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
            <span className="text-gray-400 text-base lg:text-lg">🔌</span>
          </div>
          <h3 className="text-white text-sm lg:text-base font-satoshi mb-1">
            Connect your wallet
          </h3>
          <p className="text-gray-400 font-satoshi text-xs lg:text-sm">
            Connect your wallet to see your token holdings
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        {/* Enhanced Header with Show/Hide Toggle */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
              Token Holdings
            </h2>

            {/* Token count display */}
            {/* <div className="flex items-center gap-1 text-xs font-satoshi">
              <span className="text-gray-400">
                ({showHidden ? tokens.length : presetTokenCount})
              </span>
              {hasHiddenTokens && !showHidden && (
                <span className="text-yellow-400">
                  +{hiddenTokenCount} hidden
                </span>
              )}
            </div> */}
          </div>

          <div className="flex items-center gap-2">
            {/* Show/Hide Toggle Button */}
            {hasHiddenTokens && (
              <button
                onClick={handleToggleHidden}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  showHidden
                    ? "text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20"
                    : "text-gray-400 hover:text-yellow-400 hover:bg-[#2C2C2C]"
                }`}
                title={
                  showHidden ? "Hide non-preset tokens" : "Show all tokens"
                }
              >
                {showHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                <span className="text-xs font-satoshi hidden sm:inline">
                  {showHidden ? "Hide" : "Show"} All
                </span>
              </button>
            )}

            {/* Refresh Button */}
            {/* <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50"
              title="Refresh tokens"
            >
              <RefreshCw
                size={16}
                className={`lg:w-5 lg:h-5 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button> */}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle size={14} className="text-red-400 mr-2 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-satoshi">{error}</p>
                <button
                  onClick={() => fetchTokens()}
                  className="text-red-400 underline text-xs mt-1 font-satoshi"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chain info with enhanced stats */}
        {/* {currentChain && (
          <div className="mb-3 p-2 bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-white text-sm font-satoshi">
                  {chainName || currentChain.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-gray-400 text-xs font-satoshi">
                  {enhancedTokenService.formatCurrency(totalValue)}
                </div>
                {Math.abs(total24hrChange) > 0.001 && (
                  <div
                    className={`text-xs font-satoshi ${
                      total24hrChange >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {enhancedTokenService.format24hrChange(total24hrChange)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )} */}

        {/* Hidden tokens info banner - Following wallet-balance.js style */}
        {/* {hasHiddenTokens && !showHidden && (
          <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Info size={14} className="text-yellow-400 mr-2" />
                <span className="text-yellow-400 text-xs font-satoshi">
                  💡 Found {hiddenTokenCount} additional token
                  {hiddenTokenCount > 1 ? "s" : ""} not in preset list.
                </span>
              </div>
              <button
                onClick={handleToggleHidden}
                className="text-yellow-400 hover:text-yellow-300 text-xs font-satoshi underline"
              >
                Show All
              </button>
            </div>
          </div>
        )} */}

        {/* Token List */}
        {tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 lg:py-8 flex-1">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
              <span className="text-gray-400 text-base lg:text-lg">🪙</span>
            </div>
            <h3 className="text-white text-sm lg:text-base font-satoshi mb-1">
              No tokens found
            </h3>
            <p className="text-gray-400 font-satoshi text-xs lg:text-sm mb-3">
              No token holdings found on {chainName || currentChain?.name}
            </p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi text-sm disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Grid Layout */}
            <div className="block sm:hidden flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 gap-2 pr-1">
                {tokens.map((token, index) => (
                  <div
                    key={`${token.contractAddress}_${index}`}
                    onClick={() => handleTokenClick(token)}
                    className={`bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C] transition-colors relative group ${
                      isNavigating || removingToken === token.contractAddress
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                    }`}
                  >
                    {/* Remove button */}
                    {!token.isNative && (
                      <button
                        onClick={(e) =>
                          handleRemoveToken(e, token.contractAddress)
                        }
                        disabled={removingToken === token.contractAddress}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1 hover:bg-[#2C2C2C] rounded"
                      >
                        <X size={14} />
                      </button>
                    )}

                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center">
                        <TokenImage
                          src={token.logoUrl}
                          alt={token.symbol}
                          symbol={token.symbol}
                          className="w-8 h-8 mr-2.5 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-white font-medium font-satoshi text-sm flex items-center">
                            {token.name}
                            {token.isNative && (
                              <span className="ml-2 text-xs bg-[#E2AF19] text-black px-1.5 py-0.5 rounded">
                                Native
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-xs font-satoshi">
                            {enhancedTokenService.formatTokenAmount(
                              token.balance,
                              4
                            )}{" "}
                            {token.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-white font-medium font-satoshi text-sm">
                          {enhancedTokenService.formatCurrency(token.value)}
                        </div>
                        <PercentageDisplay
                          change24h={token.change24h}
                          usdChange24h={token.usdChange24h}
                          size="xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop List Layout */}
            <div className="hidden sm:block flex-1 overflow-y-auto scrollbar-hide">
              <div className="space-y-2 pr-1">
                {tokens.map((token, index) => (
                  <div
                    key={`${token.contractAddress}_${index}`}
                    onClick={() => handleTokenClick(token)}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors relative group ${
                      isNavigating || removingToken === token.contractAddress
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                    }`}
                  >
                    {/* Remove button */}
                    {!token.isNative && (
                      <button
                        onClick={(e) =>
                          handleRemoveToken(e, token.contractAddress)
                        }
                        disabled={removingToken === token.contractAddress}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1 hover:bg-[#2C2C2C] rounded z-10"
                      >
                        <X size={14} />
                      </button>
                    )}

                    <div className="flex items-center min-w-0 flex-1">
                      <TokenImage
                        src={token.logoUrl}
                        alt={token.symbol}
                        symbol={token.symbol}
                        className="w-10 h-10 mr-2.5 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium font-satoshi text-sm sm:text-sm flex items-center">
                          {token.name}
                          {token.isNative && (
                            <span className="ml-2 text-xs bg-[#E2AF19] text-black px-1.5 py-0.5 rounded">
                              Native
                            </span>
                          )}
                          {!token.isPopular && showHidden && (
                            <span className="ml-2 text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">
                              New
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          {enhancedTokenService.formatTokenAmount(
                            token.balance,
                            4
                          )}{" "}
                          {token.symbol}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pr-8">
                      <div className="text-white font-medium font-satoshi text-sm">
                        {enhancedTokenService.formatCurrency(token.value)}
                      </div>
                      <PercentageDisplay
                        change24h={token.change24h}
                        usdChange24h={token.usdChange24h}
                        size="xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Custom scrollbar styles */}
        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </>
  );
}
