// src/components/dashboard/WalletBalance.tsx - COMPACT VERSION
"use client";

import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { Copy, ChevronDown } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { openWalletSelector } from "@/store/slices/uiSlice";
import { updateWalletBalance } from "@/store/slices/walletSlice";
import { SkeletonWalletBalance } from "@/components/ui/Skeleton";

export default function WalletBalance() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet, totalBalance, loading } = useSelector(
    (state: RootState) => state.wallet
  );

  // Enhanced loading state management
  const [balanceLoadingState, setBalanceLoadingState] = useState({
    isInitialLoad: true,
    hasAttemptedLoad: false,
    balanceLoaded: false,
  });

  // Use ref to prevent duplicate balance updates
  const balanceLoaded = useRef<string | null>(null);

  useEffect(() => {
    console.log("💰 WalletBalance - Effect triggered", {
      activeWalletAddress: activeWallet?.address,
      balanceLoadedFor: balanceLoaded.current,
      totalBalance,
      loading,
      shouldUpdate:
        activeWallet?.address && balanceLoaded.current !== activeWallet.address,
    });

    // Only update balance if we have an active wallet and haven't already loaded balance for this wallet
    if (
      activeWallet?.address &&
      balanceLoaded.current !== activeWallet.address
    ) {
      console.log(
        "📡 WalletBalance - Updating balance for wallet:",
        activeWallet.address
      );

      balanceLoaded.current = activeWallet.address;
      setBalanceLoadingState((prev) => ({
        ...prev,
        hasAttemptedLoad: true,
        isInitialLoad: true,
      }));

      dispatch(updateWalletBalance(activeWallet.address)).then(() => {
        setBalanceLoadingState((prev) => ({
          ...prev,
          balanceLoaded: true,
          isInitialLoad: false,
        }));
      });
    } else if (totalBalance > 0 && !balanceLoadingState.balanceLoaded) {
      // If we already have a balance, mark as loaded
      setBalanceLoadingState((prev) => ({
        ...prev,
        balanceLoaded: true,
        isInitialLoad: false,
        hasAttemptedLoad: true,
      }));
    }
  }, [
    activeWallet?.address,
    dispatch,
    totalBalance,
    balanceLoadingState.balanceLoaded,
  ]);

  // Reset loading state when active wallet changes
  useEffect(() => {
    if (
      activeWallet?.address &&
      balanceLoaded.current !== activeWallet.address
    ) {
      setBalanceLoadingState({
        isInitialLoad: true,
        hasAttemptedLoad: false,
        balanceLoaded: false,
      });
    }
  }, [activeWallet?.address]);

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

  // UPDATED: Show skeleton during initial load or when we don't have wallet data yet
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
    });
    return <SkeletonWalletBalance />;
  }

  // Use real balance from database/tokens or fallback to wallet balance
  const displayBalance = totalBalance || activeWallet?.balance || 0;

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

      {/* Balance Display - Responsive */}
      <div>
        {displayBalance > 0 ? (
          <>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
              {formatBalance(displayBalance)}
            </div>
            <div className="flex items-center text-xs">
              <span className="text-green-400 mr-1 font-satoshi">+$177.56</span>
              <span className="text-green-400 font-satoshi">(0.30%)</span>
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
                balanceLoadingState.balanceLoaded
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
