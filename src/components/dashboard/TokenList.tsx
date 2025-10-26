// src/components/dashboard/TokenList.tsx - COMPLETE FIXED VERSION
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
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
import { useToast } from "@/contexts/ToastContext";

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

interface WalletPreferences {
  userEmail: string;
  walletAddress: string;
  chainId: number;
  userAddedTokens: string[];
  lastUpdated: string;
}

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

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

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
        onClick={handleButtonClick}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors relative z-10"
        title={isInMainList ? "Remove from main list" : "Add to main list"}
        style={{ pointerEvents: "auto" }}
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

  const authState = useSelector((state: RootState) => state.auth);

  // Get user email
  const getUserEmail = (): string | null => {
    if (!authState?.user) {
      console.warn("⚠️ No user in auth state");
      return null;
    }

    const email =
      authState.user.gmail ||
      authState.user.email ||
      authState.user.emailAddress ||
      authState.user.userEmail ||
      null;

    if (!email) {
      console.warn(
        "⚠️ User object exists but no email field found:",
        authState.user
      );
    }

    return email;
  };

  const userEmail = getUserEmail();

  // ✅ Get updateTokenCategories from context
  const { walletData, refresh, isRefreshing, updateTokenCategories } =
    useWalletData();
  const { setComponentLoaded, setComponentDataReady } = useUnifiedDashboard();

  const { address, isConnected } = useAccount();
  const hasReportedMountRef = useRef(false);
  const hasReportedDataRef = useRef(false);

  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);

  const {
    data: coinGeckoData,
    loading: coinGeckoLoading,
    error: coinGeckoError,
    refetch: refetchCoinGecko,
  } = useCoinGecko();

  const [activeTab, setActiveTab] = useState<
    "holdings" | "trending" | "gainers"
  >(isConnected ? "holdings" : "trending");
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");

  const [showHidden, setShowHidden] = useState(false);
  const [preferences, setPreferences] = useState<WalletPreferences | null>(
    null
  );
  const [addingToken, setAddingToken] = useState<string | null>(null);

  const trendingTokens = coinGeckoData?.trendingTokens || [];
  const topGainersData = coinGeckoData?.topGainers || [];

  const { showToast } = useToast();

  const allTokens = walletData.tokens;
  const presetTokenCount = useMemo(() => {
    return allTokens.filter((t) => t.isPreset).length;
  }, [allTokens]);

  useEffect(() => {
    if (isConnected && activeTab !== "holdings") {
      setActiveTab("holdings");
    }
  }, [isConnected]);

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

  useEffect(() => {
    if (!hasReportedDataRef.current) {
      const hasCoinGeckoData =
        trendingTokens.length > 0 || topGainersData.length > 0;
      const hasWalletData = walletData.cacheValid;

      if (hasCoinGeckoData || hasWalletData) {
        console.log("✅ TokenList: Data ready");
        setComponentDataReady("tokenList");
        hasReportedDataRef.current = true;
      }
    }
  }, [
    walletData.cacheValid,
    trendingTokens.length,
    topGainersData.length,
    setComponentDataReady,
  ]);

  useEffect(() => {
    if (
      !walletData.cacheValid &&
      !trendingTokens.length &&
      !topGainersData.length
    ) {
      hasReportedDataRef.current = false;
    }
  }, [walletData.cacheValid, trendingTokens.length, topGainersData.length]);

  // ✅ Load preferences and sync with context
  useEffect(() => {
    const loadPreferences = async () => {
      if (!address || !chainId || !userEmail) {
        console.log("⚠️ Cannot load preferences: missing required data");
        return;
      }

      try {
        console.log(
          `📥 Loading preferences for user: ${userEmail}, wallet: ${address}, chain: ${chainId}`
        );

        const response = await fetch(
          `/api/wallet/preferences?wallet=${address}&chain=${chainId}&email=${encodeURIComponent(
            userEmail
          )}`
        );

        if (response.ok) {
          const data = await response.json();
          setPreferences(data.data);

          // ✅ Sync with context immediately
          updateTokenCategories(data.data);

          console.log(
            `✅ Preferences loaded for ${userEmail}:`,
            data.data.userAddedTokens?.length || 0,
            "user-added tokens"
          );
        } else {
          console.error("❌ Failed to load preferences:", response.status);
          // Set empty preferences
          const emptyPrefs = {
            userEmail: userEmail,
            walletAddress: address,
            chainId: chainId,
            userAddedTokens: [],
            lastUpdated: new Date().toISOString(),
          };
          setPreferences(emptyPrefs);
          updateTokenCategories(emptyPrefs);
        }
      } catch (error) {
        console.error("❌ Error loading preferences:", error);
      }
    };

    if (isConnected && address && userEmail) {
      loadPreferences();
    }
  }, [address, chainId, isConnected, userEmail, updateTokenCategories]);

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

  // ✅ FIXED: Add token to main list with immediate update
  const handleAddToMainList = async (tokenAddress: string) => {
    if (!address || !chainId || !userEmail || addingToken) {
      console.log("⚠️ Cannot add token: missing required data");
      if (!userEmail) {
        showToast("error", "Please sign in to add tokens to your list", 4000);
      }
      return;
    }

    setAddingToken(tokenAddress);

    try {
      console.log(`➕ Adding token ${tokenAddress} for user ${userEmail}`);

      // Create updated preferences
      const currentPrefs = preferences || {
        userEmail: userEmail,
        walletAddress: address,
        chainId,
        userAddedTokens: [],
        lastUpdated: new Date().toISOString(),
      };

      const updatedPrefs = {
        ...currentPrefs,
        userEmail: userEmail,
        userAddedTokens: [
          ...currentPrefs.userAddedTokens,
          tokenAddress.toLowerCase(),
        ],
        lastUpdated: new Date().toISOString(),
      };

      // ✅ FIX 1: Update local state immediately (optimistic update)
      setPreferences(updatedPrefs);

      // ✅ FIX 2: Update context immediately BEFORE any async calls
      updateTokenCategories(updatedPrefs);

      console.log("📤 Sending preferences to server:", updatedPrefs);

      // ✅ FIX 3: Save to server (but don't wait for refresh)
      const response = await fetch(`/api/wallet/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPrefs),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Server response:", data);

        showToast("success", "Token added to main list successfully!", 3000);
        console.log(
          `✅ Token ${tokenAddress} added to main list for user ${userEmail}`
        );

        // ✅ FIX 4: Don't call refresh() here - the context already updated
        // The wallet balance is already updated via updateTokenCategories
      } else {
        // Rollback on error
        const errorData = await response.json();
        console.error("❌ Server error:", errorData);

        // Revert the optimistic update
        setPreferences(currentPrefs);
        updateTokenCategories(currentPrefs);

        showToast(
          "error",
          errorData.error || "Failed to add token. Please try again.",
          4000
        );
      }
    } catch (error: any) {
      console.error("❌ Error adding token:", error);

      // Revert on error
      if (preferences) {
        setPreferences(preferences);
        updateTokenCategories(preferences);
      }

      showToast("error", "Failed to add token. Please try again.", 4000);
    } finally {
      setAddingToken(null);
    }
  };

  // ✅ FIXED: Remove token from main list with immediate update
  const handleRemoveFromMainList = async (tokenAddress: string) => {
    if (!address || !chainId || !preferences || !userEmail || addingToken) {
      console.log("⚠️ Cannot remove token: missing required data");
      if (!userEmail) {
        showToast("error", "Please sign in to modify your token list", 4000);
      }
      return;
    }

    setAddingToken(tokenAddress);

    try {
      console.log(`➖ Removing token ${tokenAddress} for user ${userEmail}`);

      // Store original for rollback
      const originalPrefs = preferences;

      // Create updated preferences
      const updatedPrefs = {
        ...preferences,
        userEmail: userEmail,
        userAddedTokens: preferences.userAddedTokens.filter(
          (addr) => addr.toLowerCase() !== tokenAddress.toLowerCase()
        ),
        lastUpdated: new Date().toISOString(),
      };

      // ✅ FIX 1: Update local state immediately (optimistic update)
      setPreferences(updatedPrefs);

      // ✅ FIX 2: Update context immediately BEFORE any async calls
      updateTokenCategories(updatedPrefs);

      // ✅ FIX 3: Save to server (but don't wait for refresh)
      const response = await fetch(`/api/wallet/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPrefs),
      });

      if (response.ok) {
        showToast("success", "Token removed from main list", 3000);
        console.log(
          `✅ Token ${tokenAddress} removed from main list for user ${userEmail}`
        );

        // ✅ FIX 4: Don't call refresh() here - the context already updated
      } else {
        // Rollback on error
        const errorData = await response.json();
        console.error("❌ Failed to remove token:", errorData);

        // Revert the optimistic update
        setPreferences(originalPrefs);
        updateTokenCategories(originalPrefs);

        showToast(
          "error",
          errorData.error || "Failed to remove token. Please try again.",
          4000
        );
      }
    } catch (error: any) {
      console.error("❌ Error removing token:", error);

      // Revert on error
      if (preferences) {
        setPreferences(preferences);
        updateTokenCategories(preferences);
      }

      showToast("error", "Failed to remove token. Please try again.", 4000);
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
        preferences?.userAddedTokens?.some(
          (addr) => addr.toLowerCase() === token.contractAddress.toLowerCase()
        ) || false;
      return isInPresetList || isUserAdded;
    });

    const additionalTokens = allTokens.filter((token) => {
      const isInPresetList = token.isPreset;
      const isUserAdded =
        preferences?.userAddedTokens?.some(
          (addr) => addr.toLowerCase() === token.contractAddress.toLowerCase()
        ) || false;
      return !isInPresetList && !isUserAdded;
    });

    return { mainTokens, additionalTokens };
  };

  const { mainTokens, additionalTokens } = getTokensForDisplay();
  const hasHiddenTokens = additionalTokens.length > 0;

  return (
    <>
      <style jsx>{tokenRowStyles}</style>
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden pb-0 lg:pb-auto">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between mb-3 px-2">
          {/* Mobile Tabs - ALWAYS SHOW */}
          <div className="flex items-center gap-4 lg:hidden">
            {isConnected && (
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
            )}
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
          {hasHiddenTokens && activeTab === "holdings" && isConnected && (
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
          {/* {activeTab === "trending" && (
            <div className="flex lg:hidden items-center gap-1 border border-[#2C2C2C] rounded-lg px-2 py-1">
              <span className="text-gray-400 text-[10px] font-satoshi">
                24h Change
              </span>
            </div>
          )} */}

          {/* Gainers timeframe */}
          {/* {activeTab === "gainers" && (
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
          )} */}
        </div>

        {/* Error state - only for wallet errors */}
        {walletData.error && activeTab === "holdings" && isConnected && (
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
          {/* Holdings Tab - ALWAYS SHOW ON DESKTOP */}
          <div
            className={`${
              activeTab === "holdings" ? "flex" : "hidden"
            } lg:flex flex-col h-full`}
          >
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center text-center flex-1">
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
            ) : walletData.loading && !walletData.cacheValid ? (
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
                      {mainTokens.map((token, index) => {
                        const isUserAddedInMain =
                          preferences?.userAddedTokens?.some(
                            (addr) =>
                              addr.toLowerCase() ===
                              token.contractAddress.toLowerCase()
                          ) && !token.isPreset;

                        return (
                          <div
                            key={`${token.contractAddress}_${index}_main`}
                            className={`token-row ${
                              isUserAddedInMain ? "has-menu" : ""
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

                                {isUserAddedInMain && (
                                  <div className="menu-button-wrapper">
                                    <ThreeDotMenu
                                      token={token}
                                      onRemoveFromMain={
                                        handleRemoveFromMainList
                                      }
                                      isInMainList={true}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                          className={`token-row has-menu flex items-center justify-between p-2.5 rounded-lg transition-colors relative ${
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

          {/* Trending Tab - ALWAYS SHOW (works without wallet) */}
          <div
            className={`${
              activeTab === "trending" ? "block" : "hidden"
            } lg:hidden`}
          >
            <div className="space-y-2 pr-1">
              {coinGeckoLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-[#E2AF19] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-400 text-xs font-satoshi">
                      Loading trending tokens...
                    </p>
                  </div>
                </div>
              ) : coinGeckoError ? (
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

          {/* Top Gainers Tab - ALWAYS SHOW (works without wallet) */}
          <div
            className={`${
              activeTab === "gainers" ? "block" : "hidden"
            } lg:hidden`}
          >
            <div className="space-y-2 pr-1">
              {coinGeckoLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-[#E2AF19] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-400 text-xs font-satoshi">
                      Loading top gainers...
                    </p>
                  </div>
                </div>
              ) : coinGeckoError ? (
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
