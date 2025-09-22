// src/components/dashboard/TokenList.tsx - FIXED with proper token management
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useAccount, useChainId } from "wagmi";
import { RootState } from "@/store";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { useWalletTracking } from "@/hooks/useWalletTracking";
import {
  RefreshCw,
  MoreVertical,
  Eye,
  EyeOff,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Plus,
  Minus,
} from "lucide-react";
import { SkeletonTokenList } from "@/components/ui/Skeleton";
import { chains } from "@/components/wallet/WalletProvider";

// Token Interface
interface TokenBalance {
  id: string;
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  balanceWei: string;
  value: number;
  change24h: number;
  usdChange24h?: number;
  price: number;
  isNative: boolean;
  logoUrl?: string | null;
  isPopular?: boolean;
  possibleSpam?: boolean;
  verifiedContract?: boolean;
  isUserAdded?: boolean;
  isPreset?: boolean; // NEW: Track if token is in preset list
}

// Wallet Preferences Interface
interface WalletPreferences {
  walletAddress: string;
  chainId: number;
  userAddedTokens: string[];
  lastUpdated: string;
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
  name,
  className = "",
}: {
  src?: string | null;
  alt: string;
  symbol: string;
  name?: string;
  className?: string;
}) => {
  const [hasError, setHasError] = React.useState(false);

  // Get first word from token name or symbol
  const getFirstWord = () => {
    // Try to get first word from name first, then symbol
    const text = name || symbol || "?";
    const firstWord = text.split(/[\s\-_]+/)[0]; // Split on spaces, hyphens, underscores

    // If first word is too long, truncate it
    if (firstWord.length > 6) {
      return firstWord.substring(0, 6);
    }

    return firstWord;
  };

  if (!src || hasError) {
    const firstWord = getFirstWord();

    return (
      <div
        className={`${className} rounded-full flex items-center justify-center`}
        style={{ backgroundColor: "#4A4A4A" }}
        title={name || symbol}
      >
        <span className="text-white font-bold text-xs text-center px-1">
          {firstWord}
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

// Three Dot Menu Component - For additional tokens only
const ThreeDotMenu = ({
  token,
  onAddToMain,
  onRemoveFromMain,
  isInMainList,
}: {
  token: TokenBalance;
  onAddToMain?: (tokenAddress: string) => void;
  onRemoveFromMain?: (tokenAddress: string) => void;
  isInMainList: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAction = async () => {
    if (isAnimating) return;

    setIsAnimating(true);

    if (isInMainList && onRemoveFromMain && !token.isPreset) {
      // Only allow removing user-added tokens, not preset tokens
      await onRemoveFromMain(token.contractAddress);
    } else if (!isInMainList && onAddToMain) {
      await onAddToMain(token.contractAddress);
    }

    setIsOpen(false);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const canModify = !token.isPreset; // Can only modify non-preset tokens

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        title={isInMainList ? "Remove from main list" : "Add to main list"}
      >
        <MoreVertical size={14} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 top-8 z-30 bg-black border border-[#2C2C2C] rounded-lg shadow-lg min-w-[160px] overflow-hidden">
            {canModify ? (
              <button
                onClick={handleAction}
                disabled={isAnimating}
                className={`w-full flex items-center px-3 py-2 text-sm text-left hover:bg-[#1A1A1A] transition-colors ${
                  isAnimating ? "opacity-50 cursor-not-allowed" : "text-white"
                }`}
              >
                {isAnimating ? (
                  <div className="w-4 h-4 border-2 border-[#E2AF19] border-t-transparent rounded-full animate-spin mr-2" />
                ) : isInMainList ? (
                  <Minus size={14} className="mr-2 text-red-400" />
                ) : (
                  <Plus size={14} className="mr-2 text-green-400" />
                )}
                {isAnimating
                  ? isInMainList
                    ? "Removing..."
                    : "Adding..."
                  : isInMainList
                  ? "Remove from Main"
                  : "Add to Main List"}
              </button>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                <Info size={14} className="mr-2 inline" />
                Preset token (cannot modify)
              </div>
            )}
          </div>
        </>
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
      process.env.NEXT_PUBLIC_API_URL || "https://amusing-freedom-production-92a5.up.railway.app/api/tokens";
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

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        throw new Error(errorData.message || "Failed to fetch tokens");
      }

      const data = await response.json();

      if (!data.success) {
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

  async saveWalletPreferences(
    preferences: WalletPreferences
  ): Promise<boolean> {
    try {
      console.log("💾 Saving wallet preferences:", preferences);

      const response = await fetch(`/api/wallet/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`Failed to save preferences: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error: any) {
      console.error("❌ Error saving preferences:", error);
      return false;
    }
  }

  async loadWalletPreferences(
    walletAddress: string,
    chainId: number
  ): Promise<WalletPreferences | null> {
    try {
      const response = await fetch(
        `/api/wallet/preferences?wallet=${walletAddress}&chain=${chainId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to load preferences: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error("❌ Error loading preferences:", error);
      return null;
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
}

// Create service instance
const enhancedTokenService = new EnhancedTokenService();

// MAIN COMPONENT
export default function TokenList() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading: isNavigating, startLoading } = useNavigationLoading();

  const {
    updateTrackingData,
    trackNow,
    isConnected: trackingConnected,
  } = useWalletTracking();

  // Wallet integration
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);

  // Component state
  const [allTokens, setAllTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Token management state
  const [showHidden, setShowHidden] = useState(false);
  const [presetTokenCount, setPresetTokenCount] = useState(0);
  const [hiddenTokenCount, setHiddenTokenCount] = useState(0);
  const [hasHiddenTokens, setHasHiddenTokens] = useState(false);
  const presetTokenCountRef = useRef(0); // FIXED: Add reference for preset count

  // Preferences state
  const [preferences, setPreferences] = useState<WalletPreferences | null>(
    null
  );
  const [addingToken, setAddingToken] = useState<string | null>(null);

  // Enhanced state
  const [totalValue, setTotalValue] = useState(0);
  const [total24hrChange, setTotal24hrChange] = useState(0);
  const [chainName, setChainName] = useState("");

  // Load preferences and tokens when wallet connects
  useEffect(() => {
    if (isConnected && address && chainId) {
      loadPreferencesAndTokens();
    } else {
      resetTokenState();
    }
  }, [isConnected, address, chainId]);

  const resetTokenState = () => {
    setAllTokens([]);
    setTotalValue(0);
    setTotal24hrChange(0);
    setPresetTokenCount(0);
    setHiddenTokenCount(0);
    setHasHiddenTokens(false);
    setChainName("");
    setLoading(false);
    setError("");
    setPreferences(null);
    presetTokenCountRef.current = 0; // FIXED: Reset reference
  };

  // Load preferences and tokens
  const loadPreferencesAndTokens = async () => {
    if (!address || !chainId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("📊 Loading preferences and tokens...");

      // Load user preferences first
      const userPreferences = await enhancedTokenService.loadWalletPreferences(
        address,
        chainId
      );
      setPreferences(userPreferences);

      // Fetch ALL tokens from server
      const response = await enhancedTokenService.getWalletTokens(
        address,
        chainId,
        true // Always fetch all tokens
      );

      // FIXED: Mark tokens with proper flags - trust backend classification
      const tokensWithFlags = response.tokens.map((token, index) => {
        // Check if token is in user's manually added list
        const isUserAdded = userPreferences
          ? userPreferences.userAddedTokens.includes(token.contractAddress)
          : false;

        // For preset classification, check if token is in the first presetTokenCount tokens
        // that the backend already sorted (preset tokens come first from backend)
        const isPreset = index < response.presetTokenCount;

        return {
          ...token,
          isPreset,
          isUserAdded,
        };
      });

      setAllTokens(tokensWithFlags);
      setTotalValue(response.totalValue);
      setTotal24hrChange(response.total24hrChange);
      setPresetTokenCount(response.presetTokenCount);
      setHiddenTokenCount(response.hiddenTokenCount);
      setHasHiddenTokens(response.hasHiddenTokens);
      setChainName(response.chainName);
      presetTokenCountRef.current = response.presetTokenCount; // FIXED: Update reference

      console.log(
        `✅ Loaded ${tokensWithFlags.length} tokens (${response.presetTokenCount} preset, ${response.hiddenTokenCount} hidden)`
      );

      // Update tracking data
      if (tokensWithFlags.length > 0) {
        const trackingTokens = tokensWithFlags.map((token) => ({
          contractAddress: token.contractAddress,
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          value: token.value,
          price: token.price,
          change24h: token.change24h,
          isNative: token.isNative,
          isPreferred:
            token.isPopular || token.isNative || token.isUserAdded || false,
        }));

        updateTrackingData(
          response.totalValue,
          response.total24hrChange,
          trackingTokens
        );

        setTimeout(() => {
          trackNow();
        }, 1500);
      }
    } catch (err: any) {
      console.error("❌ Error loading tokens and preferences:", err);
      setError(err.message || "Failed to load tokens");
      resetTokenState();
    } finally {
      setLoading(false);
    }
  };

  // Handle adding token to main list
  const handleAddToMainList = async (tokenAddress: string) => {
    if (!address || !chainId || addingToken) return;

    setAddingToken(tokenAddress);

    try {
      const currentPrefs = preferences || {
        walletAddress: address,
        chainId,
        userAddedTokens: [],
        lastUpdated: new Date().toISOString(),
      };

      const updatedPrefs = {
        ...currentPrefs,
        userAddedTokens: [...currentPrefs.userAddedTokens, tokenAddress],
        lastUpdated: new Date().toISOString(),
      };

      const saved = await enhancedTokenService.saveWalletPreferences(
        updatedPrefs
      );

      if (saved) {
        setPreferences(updatedPrefs);
        setAllTokens((prevTokens) =>
          prevTokens.map((token) =>
            token.contractAddress === tokenAddress
              ? { ...token, isUserAdded: true }
              : token
          )
        );

        console.log(`✅ Token added to main list: ${tokenAddress}`);
      } else {
        throw new Error("Failed to save preferences");
      }
    } catch (error: any) {
      console.error("❌ Error adding token to main list:", error);
      setError("Failed to add token to main list");
    } finally {
      setAddingToken(null);
    }
  };

  // Handle removing token from main list
  const handleRemoveFromMainList = async (tokenAddress: string) => {
    if (!address || !chainId || !preferences || addingToken) return;

    setAddingToken(tokenAddress);

    try {
      const updatedPrefs = {
        ...preferences,
        userAddedTokens: preferences.userAddedTokens.filter(
          (addr) => addr !== tokenAddress
        ),
        lastUpdated: new Date().toISOString(),
      };

      const saved = await enhancedTokenService.saveWalletPreferences(
        updatedPrefs
      );

      if (saved) {
        setPreferences(updatedPrefs);
        setAllTokens((prevTokens) =>
          prevTokens.map((token) =>
            token.contractAddress === tokenAddress
              ? { ...token, isUserAdded: false }
              : token
          )
        );

        console.log(`✅ Token removed from main list: ${tokenAddress}`);
      } else {
        throw new Error("Failed to save preferences");
      }
    } catch (error: any) {
      console.error("❌ Error removing token from main list:", error);
      setError("Failed to remove token from main list");
    } finally {
      setAddingToken(null);
    }
  };

  // Handle token click
  const handleTokenClick = (token: TokenBalance) => {
    if (isNavigating || addingToken === token.contractAddress) return;

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

  // Handle refresh
  const handleRefresh = async () => {
    if (!address) return;
    setIsRefreshing(true);
    try {
      await loadPreferencesAndTokens();
    } catch (err: any) {
      console.error("❌ Error refreshing tokens:", err);
      setError("Failed to refresh tokens");
    } finally {
      setIsRefreshing(false);
    }
  };

  // FIXED: Split tokens for display - trust backend's preset classification
  const getTokensForDisplay = () => {
    const presetTokenCount = presetTokenCountRef.current || 0;

    // Main list tokens: first N tokens (preset) + user manually added tokens
    const mainTokens = allTokens.filter((token, index) => {
      // Token is in preset list (first presetTokenCount tokens from backend)
      const isInPresetList = index < presetTokenCount;

      // Token was manually added by user
      const isUserAdded =
        preferences?.userAddedTokens?.includes(token.contractAddress) || false;

      return isInPresetList || isUserAdded;
    });

    // Additional tokens: everything else
    const additionalTokens = allTokens.filter((token, index) => {
      const isInPresetList = index < presetTokenCount;
      const isUserAdded =
        preferences?.userAddedTokens?.includes(token.contractAddress) || false;

      return !isInPresetList && !isUserAdded;
    });

    return { mainTokens, additionalTokens };
  };

  const { mainTokens, additionalTokens } = getTokensForDisplay();

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
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
            Token Holdings
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Show All Toggle Button */}
          {hasHiddenTokens && (
            <button
              onClick={() => setShowHidden(!showHidden)}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                showHidden
                  ? "text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20"
                  : "text-gray-400 hover:text-yellow-400 hover:bg-[#2C2C2C]"
              }`}
              title={showHidden ? "Hide additional tokens" : "Show all tokens"}
            >
              {showHidden ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="text-xs font-satoshi hidden sm:inline">
                {showHidden ? "Show All" : "Hide All"}
              </span>
            </button>
          )}
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
                onClick={() => loadPreferencesAndTokens()}
                className="text-red-400 underline text-xs mt-1 font-satoshi"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token List */}
      {allTokens.length === 0 ? (
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
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Main Tokens Section */}
          {mainTokens.length > 0 && (
            <div
              className={
                additionalTokens.length > 0 && !showHidden ? "mb-6" : ""
              }
            >
              <div className="space-y-2 pr-1">
                {mainTokens.map((token, index) => (
                  <div
                    key={`${token.contractAddress}_${index}_main`}
                    onClick={() => handleTokenClick(token)}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors relative group ${
                      isNavigating || addingToken === token.contractAddress
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                    }`}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <TokenImage
                        src={token.logoUrl}
                        alt={token.symbol}
                        symbol={token.symbol}
                        className="w-10 h-10 mr-2.5 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium font-satoshi text-sm flex items-center">
                          {token.name}
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

                    <div className="flex items-center">
                      <div className="text-right flex-shrink-0 mr-2">
                        <div className="text-white font-medium font-satoshi text-sm">
                          {enhancedTokenService.formatCurrency(token.value)}
                        </div>
                        <PercentageDisplay
                          change24h={token.change24h}
                          usdChange24h={token.usdChange24h}
                          size="xs"
                        />
                      </div>

                      {/* Show 3-dot menu for user-added tokens */}
                      {token.isUserAdded && (
                        <ThreeDotMenu
                          token={token}
                          onRemoveFromMain={handleRemoveFromMainList}
                          isInMainList={true}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Tokens Section */}
          {additionalTokens.length > 0 && !showHidden && (
            <div>
              <div className="flex items-center mb-3 px-2">
                <div className="flex-1 h-px bg-[#2C2C2C]"></div>
                <div className="px-3 text-xs text-gray-400 font-satoshi">
                  Additional Tokens ({additionalTokens.length})
                </div>
                <div className="flex-1 h-px bg-[#2C2C2C]"></div>
              </div>

              <div className="space-y-2 pr-1">
                {additionalTokens.map((token, index) => (
                  <div
                    key={`${token.contractAddress}_${index}_additional`}
                    onClick={() => handleTokenClick(token)}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors relative group ${
                      isNavigating || addingToken === token.contractAddress
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                    }`}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <TokenImage
                        src={token.logoUrl}
                        alt={token.symbol}
                        symbol={token.symbol}
                        className="w-10 h-10 mr-2.5 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium font-satoshi text-sm flex items-center">
                          {token.name}
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

                    <div className="flex items-center">
                      <div className="text-right flex-shrink-0 mr-2">
                        <div className="text-white font-medium font-satoshi text-sm">
                          {enhancedTokenService.formatCurrency(token.value)}
                        </div>
                        <PercentageDisplay
                          change24h={token.change24h}
                          usdChange24h={token.usdChange24h}
                          size="xs"
                        />
                      </div>

                      {/* Three Dot Menu for additional tokens */}
                      <ThreeDotMenu
                        token={token}
                        onAddToMain={handleAddToMainList}
                        isInMainList={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
