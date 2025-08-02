// src/components/wallet/WalletRefreshButton.tsx - FIXED VERSION
"use client";

import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RefreshCw } from "lucide-react";
import { AppDispatch, RootState } from "@/store";
import {
  fetchWalletTokens,
  updateWalletBalance,
} from "@/store/slices/walletSlice";

interface WalletRefreshButtonProps {
  onRefreshStart?: () => void;
  onRefreshComplete?: () => void;
  autoRefreshInterval?: number; // in milliseconds
  showLastUpdated?: boolean;
}

export default function WalletRefreshButton({
  onRefreshStart,
  onRefreshComplete,
  autoRefreshInterval = 10000, // 10 seconds default
  showLastUpdated = true,
}: WalletRefreshButtonProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet, loading } = useSelector(
    (state: RootState) => state.wallet
  );
  const [syncing, setSyncing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track if component is mounted

  // Manual refresh function
  const handleRefresh = async () => {
    if (!activeWallet?.address || syncing) return;

    console.log(
      "🔄 Manual refresh triggered for wallet:",
      activeWallet.address
    );

    setSyncing(true);
    if (onRefreshStart) onRefreshStart();

    // FIX: Emit refresh start event
    window.dispatchEvent(new Event("walletRefreshStart"));

    try {
      // Sync wallet tokens from blockchain
      const response = await fetch("/api/wallets/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      if (response.ok) {
        // Refresh the local data
        await Promise.all([
          dispatch(fetchWalletTokens(activeWallet.address)),
          dispatch(updateWalletBalance(activeWallet.address)),
        ]);

        setLastRefreshTime(new Date());
        console.log("✅ Wallet synced successfully");

        // Emit wallet updated event
        window.dispatchEvent(new Event("walletUpdated"));
      } else {
        console.error("❌ Failed to sync wallet");
      }
    } catch (error) {
      console.error("❌ Error syncing wallet:", error);
    } finally {
      setSyncing(false);
      if (onRefreshComplete) onRefreshComplete();

      // FIX: Emit refresh complete event
      window.dispatchEvent(new Event("walletRefreshComplete"));
    }
  };

  // Track if component is mounted
  const isMountedRef = useRef(false);

  // Set up auto-refresh
  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;

    if (activeWallet?.address && autoRefreshInterval > 0) {
      console.log(`⏰ Setting up auto-refresh every ${autoRefreshInterval}ms`);
      console.log("Component mounted, activeWallet:", activeWallet.address);

      // Clear any existing intervals
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }

      // Initial refresh after 3 seconds (reduced from 5)
      const initialTimeout = setTimeout(() => {
        if (isMountedRef.current && activeWallet?.address) {
          console.log("⏰ Initial auto-refresh after mount");
          handleRefresh();
        }
      }, 3000);

      // Set up recurring refresh
      autoRefreshRef.current = setInterval(() => {
        if (isMountedRef.current && activeWallet?.address) {
          console.log("⏰ Auto-refresh triggered");
          handleRefresh();
        }
      }, autoRefreshInterval);

      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up auto-refresh");
        isMountedRef.current = false;
        clearTimeout(initialTimeout);
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
          autoRefreshRef.current = null;
        }
      };
    }

    // Return cleanup for when wallet is not available
    return () => {
      isMountedRef.current = false;
    };
  }, [activeWallet?.address, autoRefreshInterval]);

  // Force refresh on component mount/navigation
  useEffect(() => {
    // Only run this effect once on mount
    if (activeWallet?.address) {
      console.log("🚀 WalletRefreshButton mounted - forcing initial refresh");

      // Small delay to ensure component is fully mounted
      const mountRefreshTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          handleRefresh();
        }
      }, 500);

      return () => clearTimeout(mountRefreshTimeout);
    }
  }, []); // Empty dependency array - only runs on mount

  // Initialize last refresh time on mount if not set
  useEffect(() => {
    if (!lastRefreshTime && activeWallet?.address) {
      // Set a temporary last refresh time to show "0s ago" initially
      setLastRefreshTime(new Date());
    }
  }, [activeWallet?.address]);

  // Update seconds since last refresh
  useEffect(() => {
    if (lastRefreshTime && showLastUpdated) {
      // Calculate initial seconds
      const initialSeconds = Math.floor(
        (Date.now() - lastRefreshTime.getTime()) / 1000
      );
      setSecondsSinceRefresh(initialSeconds);

      // Update every second
      updateIntervalRef.current = setInterval(() => {
        const seconds = Math.floor(
          (Date.now() - lastRefreshTime.getTime()) / 1000
        );
        setSecondsSinceRefresh(seconds);
      }, 1000);

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };
    }
  }, [lastRefreshTime, showLastUpdated]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeWallet?.address) {
        console.log("📱 Tab became visible - checking if refresh needed");

        // If more than 30 seconds since last refresh, refresh now
        if (lastRefreshTime) {
          const timeSinceLastRefresh = Date.now() - lastRefreshTime.getTime();
          if (timeSinceLastRefresh > 30000) {
            console.log("⏰ Tab visible - refreshing due to stale data");
            handleRefresh();
          }
        } else {
          // No last refresh time, do initial refresh
          console.log("⏰ Tab visible - initial refresh");
          handleRefresh();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeWallet?.address, lastRefreshTime]);

  // Listen for payment events
  useEffect(() => {
    const handlePaymentCompleted = () => {
      console.log("💰 Payment completed, triggering refresh");
      handleRefresh();
    };

    window.addEventListener("paymentCompleted", handlePaymentCompleted);
    return () => {
      window.removeEventListener("paymentCompleted", handlePaymentCompleted);
    };
  }, [activeWallet?.address]);

  if (!activeWallet) return null;

  return (
    <div className="flex items-center gap-2">
      {showLastUpdated && lastRefreshTime && (
        <span className="text-xs text-gray-500 font-satoshi">
          {secondsSinceRefresh < 60
            ? `${secondsSinceRefresh}s ago`
            : `${Math.floor(secondsSinceRefresh / 60)}m ago`}
        </span>
      )}
      <button
        onClick={handleRefresh}
        disabled={syncing || loading}
        className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
        title="Refresh wallet data from blockchain"
      >
        <RefreshCw
          size={16}
          className={`lg:w-5 lg:h-5 transition-transform ${
            syncing || loading ? "animate-spin" : ""
          }`}
        />
        {syncing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full rounded-lg bg-[#2C2C2C]/50"></div>
          </div>
        )}
      </button>
    </div>
  );
}
