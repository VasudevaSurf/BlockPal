// src/components/dashboard/WalletBalance.tsx - SIMPLE STABLE FIX
"use client";

import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef, useState } from "react";
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

  // Simple loading state management
  const [isWalletSwitching, setIsWalletSwitching] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [hasRealBalance, setHasRealBalance] = useState(false); // NEW: Track if we have real balance data

  // Copy feedback state
  const [copyState, setCopyState] = useState({
    isCopied: false,
    isAnimating: false,
  });

  // Track wallet changes and page loads
  const previousWalletAddress = useRef<string | null>(null);
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataLoadedForWallet = useRef<string | null>(null);
  const isInitialPageLoad = useRef<boolean>(true); // NEW: Track initial page load

  // Detect wallet switching
  useEffect(() => {
    const currentWalletAddress = activeWallet?.address;
    const prevAddress = previousWalletAddress.current;

    // If wallet changed, IMMEDIATELY start switching state
    if (
      prevAddress &&
      currentWalletAddress &&
      prevAddress !== currentWalletAddress
    ) {
      console.log(
        "💰 WalletBalance - Wallet switching detected - IMMEDIATE skeleton"
      );

      // IMMEDIATELY set switching state and clear data
      setIsWalletSwitching(true);
      setHasInitialData(false);
      setHasRealBalance(false); // Reset real balance flag
      dataLoadedForWallet.current = null;

      // Clear any existing timeout
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }

      // Minimum switching time to prevent flickering (3 seconds for stability)
      switchingTimeoutRef.current = setTimeout(() => {
        console.log("💰 WalletBalance - Ending switching state after timeout");
        setIsWalletSwitching(false);
      }, 3000); // Increased to 3 seconds for more stability
    }

    // Always update the previous wallet reference
    previousWalletAddress.current = currentWalletAddress;
  }, [activeWallet?.address]);

  // Load data for current wallet
  useEffect(() => {
    if (
      activeWallet?.address &&
      dataLoadedForWallet.current !== activeWallet.address
    ) {
      console.log(
        "💰 WalletBalance - Loading data for wallet:",
        activeWallet.address
      );

      dataLoadedForWallet.current = activeWallet.address;
      isInitialPageLoad.current = false; // Mark that we've started loading

      // Load balance and tokens
      Promise.all([
        dispatch(updateWalletBalance(activeWallet.address)),
        dispatch(fetchWalletTokens(activeWallet.address)),
      ])
        .then(() => {
          console.log("💰 WalletBalance - Data loaded successfully");

          // Only set initial data if we're not switching or if enough time has passed
          setTimeout(() => {
            setHasInitialData(true);
            setHasRealBalance(true); // Mark that we have real balance data
          }, 100); // Small delay to ensure data is stable

          // Don't end switching state here - let the timeout handle it
        })
        .catch((error) => {
          console.error("💰 WalletBalance - Error loading data:", error);
          // Still mark as having data even if there's an error
          setTimeout(() => {
            setHasInitialData(true);
            setHasRealBalance(true); // Mark that we attempted to get real data
          }, 100);
        });
    }
  }, [activeWallet?.address, dispatch]);

  // Mark data as loaded when we have tokens or balance (but only if it's meaningful data)
  useEffect(() => {
    if (activeWallet?.address && !hasInitialData) {
      // Check if we have meaningful data (tokens with value or actual balance > 0)
      const hasMeaningfulTokens =
        tokens.length > 0 && tokens.some((token) => token.value > 0);
      const hasMeaningfulBalance = totalBalance > 0;

      if (hasMeaningfulTokens || hasMeaningfulBalance) {
        console.log(
          "💰 WalletBalance - Meaningful data detected, marking as loaded"
        );
        setHasInitialData(true);
        setHasRealBalance(true);
      } else if (tokens.length === 0 && totalBalance === 0 && hasRealBalance) {
        // If we've already attempted to load and got 0, that's still valid data
        console.log("💰 WalletBalance - Zero balance confirmed as real data");
        setHasInitialData(true);
      }
    }
  }, [
    tokens,
    totalBalance,
    activeWallet?.address,
    hasInitialData,
    hasRealBalance,
  ]);

  // Reset copy state when wallet changes
  useEffect(() => {
    setCopyState({
      isCopied: false,
      isAnimating: false,
    });
  }, [activeWallet?.address]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
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

      setCopyState({ isCopied: true, isAnimating: true });

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

  // Enhanced skeleton logic: show skeleton until we have real balance data or are still loading
  const shouldShowSkeleton =
    isWalletSwitching ||
    !activeWallet ||
    !hasInitialData ||
    !hasRealBalance ||
    isInitialPageLoad.current || // NEW: Show skeleton on initial page load
    loading;

  if (shouldShowSkeleton) {
    console.log("💰 WalletBalance - Showing skeleton:", {
      isWalletSwitching,
      hasActiveWallet: !!activeWallet,
      hasInitialData,
      hasRealBalance,
      loading,
      tokensLength: tokens.length,
      totalBalance,
    });
    return <SkeletonWalletBalance />;
  }

  // Calculate display balance from tokens with deduplication
  const calculateTotalFromTokens = () => {
    if (tokens && tokens.length > 0) {
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

      const total = Array.from(uniqueTokens.values()).reduce(
        (sum, token) => sum + (token.value || 0),
        0
      );

      return total;
    }
    return 0;
  };

  const tokensTotalValue = calculateTotalFromTokens();
  const displayBalance =
    tokensTotalValue > 0 ? tokensTotalValue : totalBalance || 0;

  // Calculate 24h change from unique tokens
  const calculate24hChange = () => {
    if (tokens && tokens.length > 0) {
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

      {/* Balance Display */}
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
                No balance available
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
