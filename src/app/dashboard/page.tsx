"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import WalletStats from "@/components/dashboard/WalletStats"; // NEW: Optional stats component
import {
  SkeletonWalletBalance,
  SkeletonTokenList,
  SkeletonSwapSection,
} from "@/components/ui/Skeleton";

// Mock authentication state
const mockAuth = {
  isAuthenticated: true, // Set to false to test auth redirect
  loading: false,
  user: {
    id: "user123",
    username: "demouser",
    displayName: "Demo User",
    name: "Demo User",
  },
};

// Mock wallet data
const mockWallets = [
  {
    id: "wallet1",
    address: "0x742d35Cc6634C0532925a3b8d4Ae7F6eC1e7F5c7",
    name: "Main Wallet",
    balance: 1.25843,
  },
  {
    id: "wallet2",
    address: "0x8ba1f109551bD432803012645Hac136c22C7F6e2",
    name: "Trading Wallet",
    balance: 0.45621,
  },
];

const mockActiveWallet = mockWallets[0];

interface DashboardState {
  isLoading: boolean;
  isInitialized: boolean;
  hasWallets: boolean;
  error: string | null;
  isAuthenticating: boolean;
  showStats: boolean; // NEW: Toggle for wallet stats
}

export default function DashboardPage() {
  const router = useRouter();

  // Use mock auth data instead of Redux
  const { isAuthenticated, loading: authLoading, user } = mockAuth;
  const wallets = mockWallets;
  const activeWallet = mockActiveWallet;

  const [dashboardState, setDashboardState] = useState<DashboardState>({
    isLoading: true,
    isInitialized: false,
    hasWallets: false,
    error: null,
    isAuthenticating: true,
    showStats: false, // NEW: Default to false
  });

  // Simulate authentication check
  useEffect(() => {
    console.log("🔍 Dashboard - Checking auth status");

    // Simulate auth loading
    setTimeout(() => {
      if (!isAuthenticated) {
        console.log("🚪 Dashboard - Not authenticated, redirecting to auth");
        router.push("/auth");
        return;
      }

      // Simulate wallet loading
      setTimeout(() => {
        setDashboardState({
          isLoading: false,
          isInitialized: true,
          hasWallets: wallets.length > 0,
          error: null,
          isAuthenticating: false,
          showStats: localStorage.getItem("show-wallet-stats") === "true", // Persist preference
        });
        console.log("📊 Dashboard initialized with mock data");
      }, 1000);
    }, 500);
  }, [isAuthenticated, router]);

  // Handle manual refresh
  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh requested");
    setDashboardState((prev) => ({ ...prev, isLoading: true }));

    // Simulate refresh
    setTimeout(() => {
      setDashboardState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    }, 1000);
  };

  // Toggle wallet stats visibility
  const toggleWalletStats = () => {
    const newShowStats = !dashboardState.showStats;
    setDashboardState((prev) => ({ ...prev, showStats: newShowStats }));
    localStorage.setItem("show-wallet-stats", newShowStats.toString());
    console.log(`📊 Wallet stats ${newShowStats ? "enabled" : "disabled"}`);
  };

  // Show loading skeleton during initial setup
  if (
    dashboardState.isLoading ||
    dashboardState.isAuthenticating ||
    authLoading
  ) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2 sm:p-3 lg:p-4 flex flex-col overflow-hidden">
        {/* Mobile Layout Skeleton */}
        <div className="flex flex-col xl:hidden gap-3 flex-1 min-h-0">
          <SkeletonWalletBalance />
          <SkeletonTokenList />
          <SkeletonSwapSection />
        </div>

        {/* Desktop Layout Skeleton */}
        <div className="hidden xl:flex gap-4 flex-1 min-h-0">
          <div className="flex-1 flex flex-col gap-4 min-w-0 max-w-[68%]">
            <SkeletonWalletBalance />
            <SkeletonTokenList />
          </div>
          <div className="w-[32%] min-w-[360px] max-w-[440px] flex-shrink-0 h-full">
            <SkeletonSwapSection />
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (should redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-1 sm:p-2 lg:p-3 flex flex-col overflow-hidden">
      {/* Error Display */}
      {dashboardState.error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2 mb-2">
          <p className="text-red-400 text-xs font-satoshi">
            {dashboardState.error}
          </p>
          <button
            onClick={handleManualRefresh}
            className="text-red-400 underline text-xs mt-1"
          >
            Try Again
          </button>
        </div>
      )}

      {/* NEW: Stats Toggle (Debug/Development) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-2 flex items-center justify-end">
          <button
            onClick={toggleWalletStats}
            className="text-xs text-gray-400 hover:text-white transition-colors underline"
          >
            {dashboardState.showStats ? "Hide" : "Show"} Wallet Stats
          </button>
        </div>
      )}

      {/* Main Dashboard Content */}
      {dashboardState.hasWallets && activeWallet ? (
        <div className="flex flex-col xl:flex-row gap-3 lg:gap-4 flex-1 min-h-0">
          {/* Mobile Layout */}
          <div className="flex xl:hidden flex-col gap-3 lg:gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            <div className="flex-shrink-0">
              <WalletBalance />
            </div>
            <div className="flex-shrink-0">
              <TokenList />
            </div>
            {/* NEW: Optional wallet stats on mobile */}
            {dashboardState.showStats && (
              <div className="flex-shrink-0">
                <WalletStats />
              </div>
            )}
            <div className="flex-shrink-0">
              <SwapSection />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden xl:flex flex-1 flex-col gap-4 min-w-0 max-w-[68%]">
            <div className="flex-shrink-0">
              <WalletBalance />
            </div>
            <div className="flex-1 min-h-0">
              <TokenList />
            </div>
            {/* NEW: Optional wallet stats on desktop */}
            {dashboardState.showStats && (
              <div className="flex-shrink-0">
                <WalletStats />
              </div>
            )}
          </div>

          <div className="hidden xl:block w-[32%] min-w-[360px] max-w-[440px] flex-shrink-0 h-full">
            <SwapSection />
          </div>
        </div>
      ) : (
        /* Empty state when no wallets */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-black text-2xl font-bold">₿</span>
            </div>
            <h3 className="text-white text-lg font-satoshi font-semibold mb-2">
              Welcome to Blockpal, {user?.displayName || user?.name || "User"}
            </h3>
            <p className="text-gray-400 font-satoshi text-sm mb-4">
              Create or import a wallet to get started with your crypto journey
            </p>
            <button
              onClick={() => {
                // Simulate wallet creation
                console.log("🆕 Creating wallet (demo)");
                setDashboardState((prev) => ({
                  ...prev,
                  hasWallets: true,
                }));
              }}
              className="px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

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
  );
}
