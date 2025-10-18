// src/components/dashboard/TokenList.tsx - UPDATED TO USE CACHE
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { useWalletTracking } from "@/hooks/useWalletTracking";
import { useCoinGecko, TrendingToken, TopGainer } from "@/hooks/useCoinGecko";
import { useUnifiedDashboard } from "@/contexts/UnifiedDashboardContext";
import { useWalletData } from "@/contexts/WalletDataContext";
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
import { chains } from "@/components/wallet/WalletProvider";

// CSS for sliding menu
const tokenRowStyles = `
  .token-row {
    position: relative;
  }
  
  .token-content-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }
  
  .token-info {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  
  .token-values-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
  }
  
  .token-values {
    text-align: right;
    flex-shrink: 0;
  }
  
  .menu-button-wrapper {
    width: 0;
    overflow: visible;
    transition: width 0.2s ease-in-out, opacity 0.2s ease-in-out;
    opacity: 0;
    display: flex;
    align-items: center;
    position: relative;
  }
  
  .menu-button-wrapper > div {
    position: relative;
  }
  
  .token-row.has-menu:hover .menu-button-wrapper {
    width: 32px;
    opacity: 1;
  }
  
  @media (max-width: 640px) {
    .token-row.has-menu:hover .menu-button-wrapper {
      width: 28px;
    }
  }
`;

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
  isPreset?: boolean;
}

// Wallet Preferences
interface WalletPreferences {
  walletAddress: string;
  chainId: number;
  userAddedTokens: string[];
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

  const getFirstLetter = () => {
    const text = name || symbol || "?";
    return text.charAt(0).toUpperCase();
  };

  if (!src || hasError) {
    const firstLetter = getFirstLetter();
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center`}
        style={{ backgroundColor: "#4A4A4A" }}
        title={name || symbol}
      >
        <span className="text-white font-bold text-base text-center">
          {firstLetter}
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

// Trending Token Image
const TrendingTokenImage = ({
  token,
  size = "w-10 h-10",
}: {
  token: TrendingToken | TopGainer;
  size?: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!token.imageUrl || imageError || imageLoading) {
    return (
      <div
        className={`${size} ${token.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
      >
        <span className="text-white text-xs font-bold font-satoshi">
          {token.icon}
        </span>
        {token.imageUrl && imageLoading && (
          <img
            src={token.imageUrl}
            alt={token.name}
            className="hidden"
            onLoad={() => {
              setImageLoading(false);
              setImageError(false);
            }}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-800`}
    >
      <img
        src={token.imageUrl}
        alt={token.name}
        className="w-full h-full object-cover"
        onLoad={() => {
          setImageLoading(false);
          setImageError(false);
        }}
        onError={() => {
          setImageLoading(false);
          setImageError(true);
        }}
      />
    </div>
  );
};

// Percentage Display
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
    if (typeof value !== "number" || isNaN(value)) return "+0.00%";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div
      className={`${sizeClasses[size]} font-satoshi ${colorClass} ${className} flex items-center ml-1`}
    >
      {showIcon && (
        <>
          {isPositive && <TrendingUp size={12} className="mr-1" />}
          {isNegative && <TrendingDown size={12} className="mr-1" />}
        </>
      )}
      <span>{!isValidChange ? "+0.00%" : formatPercentage(displayChange)}</span>
    </div>
  );
};

// Three Dot Menu
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAnimating) return;
    setIsAnimating(true);

    if (isInMainList && onRemoveFromMain && !token.isPreset) {
      await onRemoveFromMain(token.contractAddress);
    } else if (!isInMainList && onAddToMain) {
      await onAddToMain(token.contractAddress);
    }

    setIsOpen(false);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const canModify = !token.isPreset;

  return (
    <div ref={menuRef} className="relative" style={{ zIndex: 10 }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors relative z-10"
        title={isInMainList ? "Remove from main list" : "Add to main list"}
      >
        <MoreVertical size={14} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg min-w-[160px] overflow-hidden"
          style={{ zIndex: 100 }}
        >
          {canModify ? (
            <button
              type="button"
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
      )}
    </div>
  );
};

// Format helpers
const formatCurrency = (value: number): string => {
  if (value === 0) return "$0.000";
  if (value < 0.001) return "< $0.001";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(3)}`;
};

const formatTokenAmount = (amount: number, decimals: number = 6): string => {
  if (amount === 0) return "0";
  if (amount < 0.000001) return amount.toExponential(2);
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
  return amount.toFixed(Math.min(decimals, 8));
};

export default function TokenList() {
  const router = useRouter();
  const { isLoading: isNavigating, startLoading } = useNavigationLoading();
  const { updateTrackingData, trackNow } = useWalletTracking();

  // ✅ USE CACHED WALLET DATA
  const { walletData, refresh, isRefreshing } = useWalletData();
  const { setComponentLoaded, setComponentDataReady } = useUnifiedDashboard();

  const { address, isConnected } = useAccount();
  const hasReportedMountRef = useRef(false);
  const hasReportedDataRef = useRef(false);

  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);

  // CoinGecko data
  const {
    data: coinGeckoData,
    loading: coinGeckoLoading,
    error: coinGeckoError,
    refetch: refetchCoinGecko,
  } = useCoinGecko();

  // Tab state
  const [activeTab, setActiveTab] = useState<
    "holdings" | "trending" | "gainers"
  >("holdings");
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");

  // Token management
  const [showHidden, setShowHidden] = useState(false);
  const [preferences, setPreferences] = useState<WalletPreferences | null>(
    null
  );
  const [addingToken, setAddingToken] = useState<string | null>(null);

  const trendingTokens = coinGeckoData?.trendingTokens || [];
  const topGainersData = coinGeckoData?.topGainers || [];

  // ✅ Get tokens from cached wallet data
  const allTokens = walletData.tokens;
  const presetTokenCount = useMemo(() => {
    return allTokens.filter((t) => t.isPreset).length;
  }, [allTokens]);

  // Report component mount
  useEffect(() => {
    if (!hasReportedMountRef.current) {
      console.log("✅ TokenList: Component mounted");
      setComponentLoaded("tokenList");
      hasReportedMountRef.current = true;
    }

    return () => {
      hasReportedMountRef.current = false;
    };
  }, [setComponentLoaded]);

  // Report data ready when cache is valid
  useEffect(() => {
    if (!hasReportedDataRef.current && walletData.cacheValid) {
      console.log("✅ TokenList: Data ready (from cache)");
      setComponentDataReady("tokenList");
      hasReportedDataRef.current = true;
    }
  }, [walletData.cacheValid, setComponentDataReady]);

  // Reset data reported flag when cache invalidates
  useEffect(() => {
    if (!walletData.cacheValid) {
      hasReportedDataRef.current = false;
    }
  }, [walletData.cacheValid]);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!address || !chainId) return;

      try {
        const response = await fetch(
          `/api/wallet/preferences?wallet=${address}&chain=${chainId}`
        );

        if (response.ok) {
          const data = await response.json();
          setPreferences(data.data);
        }
      } catch (error) {
        console.error("❌ Error loading preferences:", error);
      }
    };

    if (isConnected && address) {
      loadPreferences();
    }
  }, [address, chainId, isConnected]);

  // Update tracking data when tokens change
  useEffect(() => {
    if (allTokens.length > 0) {
      const trackingTokens = allTokens.map((token) => ({
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
        walletData.mainListValue,
        walletData.total24hrChange,
        trackingTokens
      );

      setTimeout(() => trackNow(), 1500);
    }
  }, [allTokens, walletData.mainListValue, walletData.total24hrChange]);

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

      const response = await fetch(`/api/wallet/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPrefs),
      });

      if (response.ok) {
        setPreferences(updatedPrefs);
        // Refresh wallet data to update token flags
        await refresh(true);
        console.log(`✅ Token added to main list: ${tokenAddress}`);
      }
    } catch (error: any) {
      console.error("❌ Error adding token:", error);
    } finally {
      setAddingToken(null);
    }
  };

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

      const response = await fetch(`/api/wallet/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPrefs),
      });

      if (response.ok) {
        setPreferences(updatedPrefs);
        // Refresh wallet data to update token flags
        await refresh(true);
        console.log(`✅ Token removed from main list: ${tokenAddress}`);
      }
    } catch (error: any) {
      console.error("❌ Error removing token:", error);
    } finally {
      setAddingToken(null);
    }
  };

  const handleTokenClick = (token: TokenBalance) => {
    if (isNavigating || addingToken === token.contractAddress) return;

    try {
      const url = `/dashboard/token/${encodeURIComponent(
        token.contractAddress
      )}`;
      startLoading();
      setTimeout(() => router.push(url), 100);
    } catch (error) {
      console.error("❌ Navigation error:", error);
    }
  };

  const getTokensForDisplay = () => {
    const mainTokens = allTokens.filter((token) => {
      const isInPresetList = token.isPreset;
      const isUserAdded =
        preferences?.userAddedTokens?.includes(token.contractAddress) || false;
      return isInPresetList || isUserAdded;
    });

    const additionalTokens = allTokens.filter((token) => {
      const isInPresetList = token.isPreset;
      const isUserAdded =
        preferences?.userAddedTokens?.includes(token.contractAddress) || false;
      return !isInPresetList && !isUserAdded;
    });

    return { mainTokens, additionalTokens };
  };

  const { mainTokens, additionalTokens } = getTokensForDisplay();
  const hasHiddenTokens = additionalTokens.length > 0;

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
      <style jsx>{tokenRowStyles}</style>
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between mb-3 px-2">
          {/* Mobile Tabs */}
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setActiveTab("holdings")}
              className={`pb-1 text-xs font-mayeka font-medium transition-all relative ${
                activeTab === "holdings"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Holdings
              {activeTab === "holdings" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("trending")}
              className={`pb-1 text-xs font-mayeka font-medium transition-all relative ${
                activeTab === "trending"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Trending
              {activeTab === "trending" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("gainers")}
              className={`pb-1 text-xs font-mayeka font-medium transition-all relative ${
                activeTab === "gainers"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Top Gainers
              {activeTab === "gainers" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
          </div>

          {/* Desktop Title */}
          <h2 className="hidden lg:block text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            Token Holdings
          </h2>

          {/* Show/Hide Button */}
          {hasHiddenTokens && activeTab === "holdings" && (
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
                {showHidden ? "Hide All" : "Show All"}
              </span>
            </button>
          )}

          {/* Trending 24h label */}
          {activeTab === "trending" && (
            <div className="flex lg:hidden items-center gap-1 border border-[#2C2C2C] rounded-lg px-2 py-1">
              <span className="text-gray-400 text-[10px] font-satoshi">
                24h Change
              </span>
            </div>
          )}

          {/* Gainers timeframe */}
          {activeTab === "gainers" && (
            <div className="flex lg:hidden items-center bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg p-1">
              {["1hr", "24h", "7d"].map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-2 py-1 text-[10px] font-satoshi rounded transition-colors ${
                    selectedTimeframe === timeframe
                      ? "bg-[#E2AF19] text-black"
                      : "text-gray-400"
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error state */}
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

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Holdings Tab */}
          <div
            className={activeTab === "holdings" ? "block" : "hidden lg:block"}
          >
            {walletData.loading && !walletData.cacheValid ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 min-h-[400px]">
                <div className="w-12 h-12 border-4 border-[#E2AF19] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-gray-400 font-satoshi text-sm">
                  Loading tokens...
                </p>
              </div>
            ) : allTokens.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 min-h-[400px]">
                <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                  <span className="text-gray-400 text-xl">🪙</span>
                </div>
                <h3 className="text-white text-base font-satoshi mb-1">
                  No tokens found
                </h3>
                <p className="text-gray-400 font-satoshi text-sm mb-3 px-4">
                  No token holdings found on{" "}
                  {walletData.chainName || currentChain?.name}
                </p>
                <button
                  onClick={() => refresh(true)}
                  disabled={isRefreshing}
                  className="px-4 py-2 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi text-sm disabled:opacity-50"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            ) : (
              <>
                {/* Main Tokens */}
                {mainTokens.length > 0 && (
                  <div
                    className={
                      additionalTokens.length > 0 && showHidden ? "mb-6" : ""
                    }
                  >
                    <div className="space-y-2 pr-1">
                      {mainTokens.map((token, index) => (
                        <div
                          key={`${token.contractAddress}_${index}_main`}
                          className={`token-row ${
                            token.isUserAdded ? "has-menu" : ""
                          } flex items-center justify-between p-2.5 rounded-lg transition-colors relative ${
                            isNavigating ||
                            addingToken === token.contractAddress
                              ? "opacity-70"
                              : "hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                          }`}
                          style={{ zIndex: mainTokens.length - index }}
                        >
                          <div className="token-content-wrapper">
                            <div className="token-info">
                              <TokenImage
                                src={token.logoUrl}
                                alt={token.symbol}
                                symbol={token.symbol}
                                name={token.name}
                                className="w-10 h-10 mr-2.5 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-medium font-satoshi text-sm flex items-center">
                                  {token.name}
                                  <PercentageDisplay
                                    change24h={token.change24h}
                                    size="xs"
                                  />
                                </div>
                                <div className="text-gray-400 text-xs font-satoshi">
                                  {formatTokenAmount(token.balance, 4)}{" "}
                                  {token.symbol}
                                </div>
                              </div>
                            </div>

                            <div className="token-values-wrapper">
                              <div className="token-values">
                                <div className="text-white font-medium font-satoshi text-sm">
                                  {formatCurrency(token.value)}
                                </div>
                              </div>

                              {token.isUserAdded && (
                                <div className="menu-button-wrapper">
                                  <ThreeDotMenu
                                    token={token}
                                    onRemoveFromMain={handleRemoveFromMainList}
                                    isInMainList={true}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Tokens */}
                {additionalTokens.length > 0 && showHidden && (
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
                          className={`token-row has-menu flex items-center justify-between p-2.5 rounded-lg transition-colors relative cursor-pointer ${
                            isNavigating ||
                            addingToken === token.contractAddress
                              ? "opacity-70"
                              : "hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                          }`}
                          style={{ zIndex: additionalTokens.length - index }}
                        >
                          <div className="token-content-wrapper">
                            <div className="token-info">
                              <TokenImage
                                src={token.logoUrl}
                                alt={token.symbol}
                                symbol={token.symbol}
                                name={token.name}
                                className="w-10 h-10 mr-2.5 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-medium font-satoshi text-sm flex items-center">
                                  {token.name}
                                  <PercentageDisplay
                                    change24h={token.change24h}
                                    size="xs"
                                  />
                                </div>
                                <div className="text-gray-400 text-xs font-satoshi">
                                  {formatTokenAmount(token.balance, 4)}{" "}
                                  {token.symbol}
                                </div>
                              </div>
                            </div>

                            <div className="token-values-wrapper">
                              <div className="token-values">
                                <div className="text-white font-medium font-satoshi text-sm">
                                  {formatCurrency(token.value)}
                                </div>
                              </div>

                              <div className="menu-button-wrapper">
                                <ThreeDotMenu
                                  token={token}
                                  onAddToMain={handleAddToMainList}
                                  isInMainList={false}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Trending Tab */}
          <div
            className={activeTab === "trending" ? "block lg:hidden" : "hidden"}
          >
            <div className="space-y-2 pr-1">
              {coinGeckoError ? (
                <div className="flex items-center justify-center p-4">
                  <div className="text-center">
                    <AlertCircle
                      size={24}
                      className="text-red-400 mx-auto mb-2"
                    />
                    <p className="text-red-400 text-xs font-satoshi mb-2">
                      {coinGeckoError}
                    </p>
                    <button
                      onClick={refetchCoinGecko}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : trendingTokens.length > 0 ? (
                trendingTokens.map((token: TrendingToken, index: number) => (
                  <div
                    key={`${token.index}_${index}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <TrendingTokenImage token={token} />
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-sm font-medium font-satoshi flex items-center">
                          {token.name}
                          <span
                            className={`text-xs ml-2 ${
                              token.changeType === "positive"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {token.change}
                          </span>
                        </div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          {token.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-white text-sm font-medium font-satoshi">
                        {token.price}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center p-4">
                  <p className="text-gray-400 text-sm font-satoshi">
                    No trending tokens available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top Gainers Tab */}
          <div
            className={activeTab === "gainers" ? "block lg:hidden" : "hidden"}
          >
            <div className="space-y-2 pr-1">
              {coinGeckoError ? (
                <div className="flex items-center justify-center p-4">
                  <div className="text-center">
                    <AlertCircle
                      size={24}
                      className="text-red-400 mx-auto mb-2"
                    />
                    <p className="text-red-400 text-xs font-satoshi mb-2">
                      {coinGeckoError}
                    </p>
                    <button
                      onClick={refetchCoinGecko}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : topGainersData.length > 0 ? (
                topGainersData.map((token: TopGainer, index: number) => (
                  <div
                    key={`${token.index}_${index}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <TrendingTokenImage token={token} size="w-8 h-8" />
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-xs font-medium font-satoshi truncate">
                          {token.name}
                        </div>
                        <div className="text-gray-400 text-[10px] font-satoshi">
                          {token.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="text-white text-xs font-medium font-satoshi">
                        {token.price}
                      </div>
                      <div
                        className={`text-[10px] font-medium font-satoshi ${
                          token.changeType === "positive"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {token.changeType === "positive" ? "▲" : "▼"}{" "}
                        {token.change}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center p-4">
                  <p className="text-gray-400 text-sm font-satoshi">
                    No top gainers available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
