// src/components/dashboard/WalletBalance.tsx - SIMPLIFIED with better loading logic
"use client";

import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { Copy, ChevronDown } from "lucide-react";
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

  // SIMPLIFIED: Better loading state management
  const [balanceLoadingState, setBalanceLoadingState] = useState({
    isInitialLoad: true,
    hasAttemptedLoad: false,
    balanceLoaded: false,
    tokensLoaded: false,
    dataStabilized: false, // NEW: Simple flag for when data is ready
  });

  // Track when we first get meaningful data
  const [hasRealData, setHasRealData] = useState(false);
  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);

  // Use refs to prevent duplicate balance updates
  const balanceLoaded = useRef<string | null>(null);
  const tokensLoaded = useRef<string | null>(null);

  // SIMPLIFIED: Data stabilization effect - wait for real data then stabilize
  useEffect(() => {
    // Check if we have meaningful data (either balance > 0 or tokens)
    const hasMeaningfulData = totalBalance > 0 || tokens.length > 0;
    
    if (hasMeaningfulData && !hasRealData) {
      console.log("📊 First real data received:", {
        totalBalance,
        tokensCount: tokens.length,
      });
      setHasRealData(true);
      
      // Clear any existing timer
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
      }
      
      // Wait a short time for data to stabilize, then show it
      stabilizationTimer.current = setTimeout(() => {
        console.log("✅ Data stabilized, showing balance");
        setBalanceLoadingState(prev => ({
          ...prev,
          dataStabilized: true,
          isInitialLoad: false,
        }));
      }, 1500); // 1.5 seconds to let real-time data settle
    }
    
    // If we lose all data (wallet switch), reset
    if (!hasMeaningfulData && hasRealData) {
      console.log("🔄 Data cleared, resetting state");
      setHasRealData(false);
      setBalanceLoadingState(prev => ({
        ...prev,
        dataStabilized: false,
        isInitialLoad: true,
      }));
    }
  }, [totalBalance, tokens.length, hasRealData]);

  // Main data loading effect
  useEffect(() => {
    console.log("💰 WalletBalance - Effect triggered", {
      activeWalletAddress: activeWallet?.address,
      balanceLoadedFor: balanceLoaded.current,
      tokensLoadedFor: tokensLoaded.current,
      totalBalance,
      tokensCount: tokens.length,
      loading,
      dataStabilized: balanceLoadingState.dataStabilized,
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

        // Reset state for new wallet
        setBalanceLoadingState((prev) => ({
          ...prev,
          hasAttemptedLoad: true,
          isInitialLoad: true,
          dataStabilized: false,
        }));
        
        setHasRealData(false);
        
        // Clear stabilization timer
        if (stabilizationTimer.current) {
          clearTimeout(stabilizationTimer.current);
          stabilizationTimer.current = null;
        }

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
          console.log("✅ Initial data loading completed");
        });
      } else if (
        (totalBalance > 0 || tokens.length > 0) &&
        (!balanceLoadingState.balanceLoaded ||
          !balanceLoadingState.tokensLoaded) &&
        !balanceLoadingState.dataStabilized
      ) {
        // If we already have data but haven't marked as loaded
        setBalanceLoadingState((prev) => ({
          ...prev,
          balanceLoaded: totalBalance > 0 || prev.balanceLoaded,
          tokensLoaded: tokens.length > 0 || prev.tokensLoaded,
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
    balanceLoadingState.dataStabilized,
  ]);

  // Reset loading state when active wallet changes
  useEffect(() => {
    if (
      activeWallet?.address &&
      (balanceLoaded.current !== activeWallet.address ||
        tokensLoaded.current !== activeWallet.address)
    ) {
      console.log("🔄 Active wallet changed, resetting balance state");
      
      // Clear stabilization timer
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
        stabilizationTimer.current = null;
      }
      
      setBalanceLoadingState({
        isInitialLoad: true,
        hasAttemptedLoad: false,
        balanceLoaded: false,
        tokensLoaded: false,
        dataStabilized: false,
      });
      
      setHasRealData(false);
    }
  }, [activeWallet?.address]);

  // Auto-refresh on page load/mount
  useEffect(() => {
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
          dataStabilized: false,
        });
        
        setHasRealData(false);
        
        if (stabilizationTimer.current) {
          clearTimeout(stabilizationTimer.current);
          stabilizationTimer.current = null;
        }
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
      }
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
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleWalletClick = () => {
    dispatch(openWalletSelector());
  };

  // SIMPLIFIED: Show skeleton conditions
  const shouldShowSkeleton =
    balanceLoadingState.isInitialLoad ||
    !balanceLoadingState.dataStabilized ||
    (loading && !activeWallet) ||
    (!balanceLoadingState.hasAttemptedLoad && activeWallet?.address);

  // FALLBACK: If we've been loading too long (over 10 seconds), force show data
  useEffect(() => {
    if (balanceLoadingState.hasAttemptedLoad && !balanceLoadingState.dataStabilized) {
      const fallbackTimer = setTimeout(() => {
        console.log("⚠️ Forcing balance display after timeout");
        setBalanceLoadingState(prev => ({
          ...prev,
          dataStabilized: true,
          isInitialLoad: false,
        }));
      }, 10000); // 10 second fallback

      return () => clearTimeout(fallbackTimer);
    }
  }, [balanceLoadingState.hasAttemptedLoad, balanceLoadingState.dataStabilized]);

  if (shouldShowSkeleton) {
    console.log("🔄 WalletBalance - Showing skeleton", {
      isInitialLoad: balanceLoadingState.isInitialLoad,
      dataStabilized: balanceLoadingState.dataStabilized,
      hasRealData,
      loading,
      activeWallet: !!activeWallet,
      hasAttemptedLoad: balanceLoadingState.hasAttemptedLoad,
      balanceLoaded: balanceLoadingState.balanceLoaded,
      tokensLoaded: balanceLoadingState.tokensLoaded,
      currentBalance: totalBalance,
      tokensCount: tokens.length,
    });
    return <SkeletonWalletBalance />;
  }

  // Calculate display balance from tokens if available
  const calculateTotalFromTokens = () => {
    if (tokens && tokens.length > 0) {
      return tokens.reduce((sum, token) => sum + (token.value || 0), 0);
    }
    return 0;
  };

  const tokensTotalValue = calculateTotalFromTokens();
  const displayBalance =
    tokensTotalValue > 0
      ? tokensTotalValue
      : totalBalance || activeWallet?.balance || 0;

  // Calculate 24h change from tokens
  const calculate24hChange = () => {
    if (tokens && tokens.length > 0) {
      const totalChange = tokens.reduce((sum, token) => {
        const tokenChange = token.change24h || 0;
        const tokenChangeValue = (token.value * tokenChange) / 100;
        return sum + tokenChangeValue;
      }, 0);
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

        {/* Address and Copy Button - Responsive */}
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
              className="text-black hover:bg-[#D4A853] transition-colors bg-[#E2AF19] bg-opacity-100 px-2 py-0.5 rounded-full text-xs font-satoshi flex items-center gap-1 flex-shrink-0"
            >
              Copy
              <Copy size={8} className="text-black sm:w-2.5 sm:h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Balance Display - Enhanced with stable real-time data */}
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

      {/* Debug info (remove in production) */}
      {/* {process.env.NODE_ENV === "development" && (
        <div className="mt-2 text-xs text-gray-500 font-mono">
          Stabilized: {balanceLoadingState.dataStabilized ? "✅" : "⏳"} | 
          RealData: {hasRealData ? "✅" : "❌"} | 
          Balance: {displayBalance.toFixed(4)} | 
          Tokens: {tokens.length}
        </div>
      )} */}
    </div>
  );
}