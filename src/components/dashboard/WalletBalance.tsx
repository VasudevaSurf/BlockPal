// src/components/dashboard/WalletBalance.tsx - FIXED VERSION
"use client";

import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef, useState, useCallback } from "react";
import { Copy, ChevronDown, Check } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { openWalletSelector } from "@/store/slices/uiSlice";
import {
  updateWalletBalance,
  fetchWalletTokens,
} from "@/store/slices/walletSlice";
import { SkeletonWalletBalance } from "@/components/ui/Skeleton";

export default function WalletBalance() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet, totalBalance, loading, tokens } = useSelector(
    (state: RootState) => state.wallet
  );

  // Enhanced loading state management
  const [balanceLoadingState, setBalanceLoadingState] = useState({
    isInitialLoad: true,
    hasAttemptedLoad: false,
    balanceLoaded: false,
    tokensLoaded: false,
  });

  // Copy feedback state
  const [copyState, setCopyState] = useState({
    isCopied: false,
    isAnimating: false,
  });

  // Use ref to prevent duplicate balance updates
  const balanceLoaded = useRef<string | null>(null);
  const tokensLoaded = useRef<string | null>(null);

  // FIX: Track if we're currently refreshing to prevent double calculations
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Combined effect for balance and tokens loading
  useEffect(() => {
    console.log("💰 WalletBalance - Effect triggered", {
      activeWalletAddress: activeWallet?.address,
      balanceLoadedFor: balanceLoaded.current,
      tokensLoadedFor: tokensLoaded.current,
      totalBalance,
      tokensCount: tokens.length,
      loading,
      shouldUpdate:
        activeWallet?.address &&
        (balanceLoaded.current !== activeWallet.address ||
          tokensLoaded.current !== activeWallet.address),
    });

    // Only update if we have an active wallet and haven't loaded data for this wallet
    if (activeWallet?.address) {
      const needsBalanceUpdate = balanceLoaded.current !== activeWallet.address;
      const needsTokensUpdate = tokensLoaded.current !== activeWallet.address;

      if (needsBalanceUpdate || needsTokensUpdate) {
        console.log(
          "📡 WalletBalance - Loading data for wallet:",
          activeWallet.address,
          { needsBalanceUpdate, needsTokensUpdate }
        );

        setBalanceLoadingState((prev) => ({
          ...prev,
          hasAttemptedLoad: true,
          isInitialLoad: true,
        }));

        // Load both balance and tokens
        const loadPromises: Promise<any>[] = [];

        if (needsBalanceUpdate) {
          balanceLoaded.current = activeWallet.address;
          loadPromises.push(
            dispatch(updateWalletBalance(activeWallet.address)).then(() => {
              setBalanceLoadingState((prev) => ({
                ...prev,
                balanceLoaded: true,
              }));
            })
          );
        }

        if (needsTokensUpdate) {
          tokensLoaded.current = activeWallet.address;
          loadPromises.push(
            dispatch(fetchWalletTokens(activeWallet.address)).then(() => {
              setBalanceLoadingState((prev) => ({
                ...prev,
                tokensLoaded: true,
              }));
            })
          );
        }

        // Wait for all loading to complete
        Promise.all(loadPromises).then(() => {
          setBalanceLoadingState((prev) => ({
            ...prev,
            isInitialLoad: false,
          }));
        });
      } else if (
        (totalBalance > 0 || tokens.length > 0) &&
        (!balanceLoadingState.balanceLoaded ||
          !balanceLoadingState.tokensLoaded)
      ) {
        // If we already have data, mark as loaded
        setBalanceLoadingState((prev) => ({
          ...prev,
          balanceLoaded: totalBalance > 0 || prev.balanceLoaded,
          tokensLoaded: tokens.length > 0 || prev.tokensLoaded,
          isInitialLoad: false,
          hasAttemptedLoad: true,
        }));
      }
    }
  }, [
    activeWallet?.address,
    dispatch,
    totalBalance,
    tokens.length,
    balanceLoadingState.balanceLoaded,
    balanceLoadingState.tokensLoaded,
  ]);

  // Reset loading state when active wallet changes
  useEffect(() => {
    if (
      activeWallet?.address &&
      (balanceLoaded.current !== activeWallet.address ||
        tokensLoaded.current !== activeWallet.address)
    ) {
      setBalanceLoadingState({
        isInitialLoad: true,
        hasAttemptedLoad: false,
        balanceLoaded: false,
        tokensLoaded: false,
      });
    }
  }, [activeWallet?.address]);

  // Reset copy state when wallet changes
  useEffect(() => {
    setCopyState({
      isCopied: false,
      isAnimating: false,
    });
  }, [activeWallet?.address]);

  // Auto-refresh on page load/mount
  useEffect(() => {
    // Force refresh when component mounts (page reload)
    const handlePageLoad = () => {
      if (activeWallet?.address) {
        console.log("🔄 Page loaded - forcing wallet data refresh");

        // Reset refs to force reload
        balanceLoaded.current = null;
        tokensLoaded.current = null;

        // Reset state to trigger loading
        setBalanceLoadingState({
          isInitialLoad: true,
          hasAttemptedLoad: false,
          balanceLoaded: false,
          tokensLoaded: false,
        });
      }
    };

    // Check if this is a page load/reload
    if (document.readyState === "complete") {
      handlePageLoad();
    } else {
      window.addEventListener("load", handlePageLoad);
      return () => window.removeEventListener("load", handlePageLoad);
    }
  }, [activeWallet?.address]);

  // FIX: Listen for refresh events to prevent double calculation during refresh
  useEffect(() => {
    const handleRefreshStart = () => {
      console.log("🔄 Refresh started - preventing double calculation");
      setIsRefreshing(true);
    };

    const handleRefreshComplete = () => {
      console.log("✅ Refresh completed - allowing normal calculation");
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500); // Small delay to ensure data is updated
    };

    const handleWalletUpdated = () => {
      console.log("💰 Wallet updated event received");
      // Force recalculation after wallet update
      setTimeout(() => {
        setIsRefreshing(false);
      }, 100);
    };

    window.addEventListener("walletRefreshStart", handleRefreshStart);
    window.addEventListener("walletRefreshComplete", handleRefreshComplete);
    window.addEventListener("walletUpdated", handleWalletUpdated);

    return () => {
      window.removeEventListener("walletRefreshStart", handleRefreshStart);
      window.removeEventListener(
        "walletRefreshComplete",
        handleRefreshComplete
      );
      window.removeEventListener("walletUpdated", handleWalletUpdated);
    };
  }, []);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Address copied to clipboard");

      // Trigger copy feedback animation
      setCopyState({ isCopied: true, isAnimating: true });

      // Reset after 2 seconds
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

  // Better skeleton loading conditions - don't show during auto-refresh
  const shouldShowSkeleton =
    balanceLoadingState.isInitialLoad ||
    (loading && !activeWallet) ||
    (!balanceLoadingState.hasAttemptedLoad && activeWallet?.address);

  if (shouldShowSkeleton) {
    console.log("🔄 WalletBalance - Showing skeleton", {
      isInitialLoad: balanceLoadingState.isInitialLoad,
      loading,
      activeWallet: !!activeWallet,
      hasAttemptedLoad: balanceLoadingState.hasAttemptedLoad,
      balanceLoaded: balanceLoadingState.balanceLoaded,
      tokensLoaded: balanceLoadingState.tokensLoaded,
    });
    return <SkeletonWalletBalance />;
  }

  // FIX: Calculate display balance from tokens if available, with deduplication
  const calculateTotalFromTokens = () => {
    if (tokens && tokens.length > 0) {
      // Create a map to track unique tokens and prevent duplicates
      const uniqueTokens = new Map();

      tokens.forEach((token) => {
        // Create a unique key for each token
        const key =
          token.contractAddress === "native" || !token.contractAddress
            ? `${token.symbol}_native`
            : `${token.symbol}_${token.contractAddress}`;

        // Only add if not already in map
        if (!uniqueTokens.has(key)) {
          uniqueTokens.set(key, token);
        }
      });

      // Calculate total from unique tokens
      const total = Array.from(uniqueTokens.values()).reduce(
        (sum, token) => sum + (token.value || 0),
        0
      );

      console.log("💰 Calculated total from unique tokens:", {
        tokenCount: tokens.length,
        uniqueTokenCount: uniqueTokens.size,
        total,
        isRefreshing,
      });

      return total;
    }
    return 0;
  };

  // FIX: Use calculated total or totalBalance, but not both
  const tokensTotalValue = calculateTotalFromTokens();
  const displayBalance =
    tokensTotalValue > 0 ? tokensTotalValue : totalBalance || 0;

  // FIX: Calculate 24h change from unique tokens
  const calculate24hChange = () => {
    if (tokens && tokens.length > 0) {
      // Create a map to track unique tokens
      const uniqueTokens = new Map();

      tokens.forEach((token) => {
        const key =
          token.contractAddress === "native" || !token.contractAddress
            ? `${token.symbol}_native`
            : `${token.symbol}_${token.contractAddress}`;

        if (!uniqueTokens.has(key)) {
          uniqueTokens.set(key, token);
        }
      });

      // Calculate change from unique tokens
      const totalChange = Array.from(uniqueTokens.values()).reduce(
        (sum, token) => {
          const tokenChange = token.change24h || 0;
          const tokenChangeValue = (token.value * tokenChange) / 100;
          return sum + tokenChangeValue;
        },
        0
      );

      return totalChange;
    }
    return 0;
  };

  const change24h = calculate24hChange();
  const changePercentage =
    displayBalance > 0 ? (change24h / displayBalance) * 100 : 0;

  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex-shrink-0 h-auto">
      {/* Header - Responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
        <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
          Wallet Balance
        </h2>

        {/* Address and Copy Button - Responsive with feedback */}
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
          )}
        </div>
      </div>

      {/* Balance Display - Enhanced with real-time data */}
      <div>
        {displayBalance > 0 ? (
          <>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
              {formatBalance(displayBalance)}
            </div>
            <div className="flex items-center text-xs">
              <span
                className={`mr-1 font-satoshi ${
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
                ({changePercentage >= 0 ? "+" : ""}
                {changePercentage.toFixed(2)}%)
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
              {formatBalance(0)}
            </div>
            <div className="flex items-center text-xs">
              <span className="text-gray-400 font-satoshi">
                {balanceLoadingState.hasAttemptedLoad &&
                (balanceLoadingState.balanceLoaded ||
                  balanceLoadingState.tokensLoaded)
                  ? "No balance available"
                  : "Loading balance..."}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
