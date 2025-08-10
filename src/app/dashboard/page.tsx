// src/app/dashboard/page.tsx - Fixed to show WalletWelcomeModal for new users
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus } from "@/store/slices/authSlice";
import {
  fetchWallets,
  setActiveWallet,
  setActiveWalletInDB,
  getActiveWalletFromDB,
} from "@/store/slices/walletSlice";
import { useDashboardV2 } from "@/hooks/useDashboardV2";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import RealtimeWalletSwitcher from "@/components/wallet/RealtimeWalletSwitcher";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";
import {
  SkeletonWalletBalance,
  SkeletonTokenList,
  SkeletonSwapSection,
} from "@/components/ui/Skeleton";

interface DashboardState {
  authLoading: boolean;
  walletsLoading: boolean;
  authResolved: boolean;
  walletsResolved: boolean;
  activeWalletResolved: boolean;
  hasWallets: boolean;
  hasActiveWallet: boolean;
  showWelcomeModal: boolean;
  initialLoadComplete: boolean;
}

export default function DashboardPage() {
  const {
    isAuthenticated,
    loading: authLoading,
    user,
  } = useSelector((state: RootState) => state.auth);
  const {
    wallets,
    activeWallet,
    loading: walletLoading,
  } = useSelector((state: RootState) => state.wallet);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Use the new dashboard hook
  const {
    tokens,
    totalValue,
    isLoading,
    isRefreshing,
    isInitialized,
    error,
    lastRefresh,
    isNewUser,
    refreshCount,
    manualRefresh,
    portfolioStats,
  } = useDashboardV2();

  // Enhanced state tracking
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    authLoading: true,
    walletsLoading: false,
    authResolved: false,
    walletsResolved: false,
    activeWalletResolved: false,
    hasWallets: false,
    hasActiveWallet: false,
    showWelcomeModal: false,
    initialLoadComplete: false,
  });

  // State for UI
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);

  // Refs for initialization tracking
  const initializationRef = useRef({
    authChecked: false,
    walletsLoaded: false,
    activeWalletSynced: false,
  });

  // Log dashboard status on mount
  useEffect(() => {
    console.log("📊 Dashboard mounted - New workflow implementation active");
    console.log("⚡ Features enabled:");
    console.log("  - Phase 1: New user initialization with preset tokens");
    console.log("  - Phase 2: Returning user with stored metadata");
    console.log("  - Phase 3: Add custom tokens");
    console.log("  - Auto-refresh every 30 seconds");
  }, []);

  // Log user type when detected
  useEffect(() => {
    if (isInitialized && activeWallet) {
      const userTypeLabel = isNewUser ? "🆕 NEW USER" : "👤 RETURNING USER";
      console.log(
        `${userTypeLabel} detected for wallet: ${activeWallet.address}`
      );

      if (isNewUser) {
        console.log(
          "📈 Initialized with preset tokens matching wallet holdings"
        );
      } else {
        console.log("📂 Loaded with stored metadata from database");
      }
    }
  }, [isInitialized, isNewUser, activeWallet]);

  // Log refresh activity
  useEffect(() => {
    if (refreshCount > 0) {
      console.log(`🔄 Dashboard refreshed ${refreshCount} times`);
      console.log(`⏰ Last refresh: ${lastRefresh?.toLocaleTimeString()}`);
    }
  }, [refreshCount, lastRefresh]);

  // STEP 1: Auth Check
  useEffect(() => {
    console.log("🔍 Dashboard - Auth initialization");

    if (!initializationRef.current.authChecked) {
      initializationRef.current.authChecked = true;

      setDashboardState((prev) => ({ ...prev, authLoading: true }));

      dispatch(checkAuthStatus()).finally(() => {
        setDashboardState((prev) => ({
          ...prev,
          authLoading: false,
          authResolved: true,
        }));
      });
    }
  }, [dispatch]);

  // STEP 2: Auth Resolution
  useEffect(() => {
    if (dashboardState.authResolved && !isAuthenticated && !authLoading) {
      console.log("🚪 Dashboard - Redirecting to auth");
      router.push("/auth");
    }
  }, [dashboardState.authResolved, isAuthenticated, authLoading, router]);

  // STEP 3: Load Wallets
  useEffect(() => {
    if (
      dashboardState.authResolved &&
      isAuthenticated &&
      user &&
      !initializationRef.current.walletsLoaded
    ) {
      console.log("📡 Dashboard - Loading wallets");
      initializationRef.current.walletsLoaded = true;
      setDashboardState((prev) => ({ ...prev, walletsLoading: true }));

      dispatch(fetchWallets()).then((result) => {
        const walletsData =
          result.type === "wallet/fetchWallets/fulfilled"
            ? (result.payload as any[])
            : [];

        const hasWallets = walletsData && walletsData.length > 0;

        console.log("📦 Wallets fetch completed:", {
          hasWallets,
          walletsCount: walletsData?.length || 0,
        });

        setDashboardState((prev) => ({
          ...prev,
          walletsLoading: false,
          walletsResolved: true,
          hasWallets,
          initialLoadComplete: true,
          showWelcomeModal: !hasWallets, // Show modal if no wallets
        }));
      });
    }
  }, [dashboardState.authResolved, isAuthenticated, user, dispatch]);

  // STEP 4: Sync Active Wallet (only if wallets exist)
  useEffect(() => {
    if (
      dashboardState.walletsResolved &&
      wallets.length > 0 &&
      !initializationRef.current.activeWalletSynced
    ) {
      console.log("🎯 Dashboard - Syncing active wallet");
      initializationRef.current.activeWalletSynced = true;

      dispatch(getActiveWalletFromDB()).then((result) => {
        if (result.type === "wallet/getActiveWalletFromDB/fulfilled") {
          const { activeWalletId } = result.payload as any;
          if (activeWalletId) {
            dispatch(setActiveWallet(activeWalletId));
          } else if (wallets.length > 0) {
            const firstWallet = wallets[0];
            dispatch(setActiveWallet(firstWallet.id));
            dispatch(setActiveWalletInDB(firstWallet.id));
          }
        } else if (wallets.length > 0) {
          const firstWallet = wallets[0];
          dispatch(setActiveWallet(firstWallet.id));
          dispatch(setActiveWalletInDB(firstWallet.id));
        }

        setDashboardState((prev) => ({
          ...prev,
          activeWalletResolved: true,
          hasActiveWallet: true,
        }));
      });
    } else if (dashboardState.walletsResolved && wallets.length === 0) {
      // No wallets - mark as resolved
      console.log("🎯 Dashboard - No wallets found");
      setDashboardState((prev) => ({
        ...prev,
        activeWalletResolved: true,
        hasActiveWallet: false,
      }));
    }
  }, [dashboardState.walletsResolved, wallets.length, dispatch]);

  // Handle wallet selection
  const handleWalletSelect = async (walletId: string) => {
    console.log("🎯 Dashboard - Wallet selected:", walletId);
    dispatch(setActiveWallet(walletId));
    await dispatch(setActiveWalletInDB(walletId));
  };

  // Handle wallet creation
  const handleWalletCreated = () => {
    console.log("✅ Wallet created, refreshing wallets list");

    // Reset initialization flags
    initializationRef.current.walletsLoaded = false;
    initializationRef.current.activeWalletSynced = false;

    // Close modal and refresh wallets
    setDashboardState((prev) => ({
      ...prev,
      showWelcomeModal: false,
      walletsLoading: true,
      walletsResolved: false,
      activeWalletResolved: false,
    }));

    // Reload wallets
    dispatch(fetchWallets());
  };

  // Handle manual refresh
  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh requested");
    manualRefresh();
  };

  // Determine loading state
  const shouldShowSkeleton =
    dashboardState.authLoading ||
    !dashboardState.authResolved ||
    (isAuthenticated && !dashboardState.walletsResolved) ||
    (wallets.length > 0 && !dashboardState.activeWalletResolved) ||
    (activeWallet && !isInitialized && isLoading);

  const shouldShowContent =
    dashboardState.authResolved &&
    isAuthenticated &&
    dashboardState.walletsResolved &&
    !dashboardState.authLoading &&
    !dashboardState.walletsLoading;

  const shouldShowWelcomeModal =
    dashboardState.walletsResolved &&
    !dashboardState.walletsLoading &&
    wallets.length === 0 &&
    dashboardState.initialLoadComplete &&
    dashboardState.showWelcomeModal &&
    isAuthenticated;

  console.log("🎨 Dashboard render state:", {
    authResolved: dashboardState.authResolved,
    walletsResolved: dashboardState.walletsResolved,
    activeWalletResolved: dashboardState.activeWalletResolved,
    walletsCount: wallets.length,
    shouldShowSkeleton,
    shouldShowContent,
    shouldShowWelcomeModal,
    showWelcomeModal: dashboardState.showWelcomeModal,
    initialLoadComplete: dashboardState.initialLoadComplete,
    isAuthenticated,
  });

  // Log portfolio stats periodically
  useEffect(() => {
    if (isInitialized && portfolioStats.tokenCount > 0) {
      console.log("📊 Portfolio Stats:");
      console.log(`  Total Value: $${totalValue.toFixed(2)}`);
      console.log(`  Token Count: ${portfolioStats.tokenCount}`);
      console.log(
        `  24h Change: ${portfolioStats.totalChangePercentage.toFixed(2)}%`
      );
      if (portfolioStats.topGainers.length > 0) {
        console.log(
          `  Top Gainer: ${
            portfolioStats.topGainers[0].symbol
          } (+${portfolioStats.topGainers[0].change24h.toFixed(2)}%)`
        );
      }
    }
  }, [isInitialized, portfolioStats, totalValue]);

  // Show loading skeleton during initial setup
  if (shouldShowSkeleton) {
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

  // Don't render anything if not ready
  if (!shouldShowContent) {
    return null;
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-1 sm:p-2 lg:p-3 flex flex-col overflow-hidden">
      {/* Refresh Status Bar (only in development) */}
      {process.env.NODE_ENV === "development" &&
        isInitialized &&
        activeWallet && (
          <div className="bg-black/50 rounded-lg p-2 mb-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded ${
                  isNewUser
                    ? "bg-green-500/20 text-green-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {isNewUser ? "NEW USER" : "RETURNING USER"}
              </span>
              <span className="text-gray-400">Refreshes: {refreshCount}</span>
              {lastRefresh && (
                <span className="text-gray-400">
                  Last: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              {isRefreshing && (
                <span className="text-yellow-400 animate-pulse">
                  Refreshing...
                </span>
              )}
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-2 py-1 bg-[#E2AF19] text-black rounded hover:bg-[#D4A853] disabled:opacity-50"
            >
              Manual Refresh
            </button>
          </div>
        )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2 mb-2">
          <p className="text-red-400 text-xs font-satoshi">{error}</p>
        </div>
      )}

      {/* Main Dashboard Content */}
      {wallets.length > 0 && activeWallet ? (
        <div className="flex flex-col xl:flex-row gap-3 lg:gap-4 flex-1 min-h-0">
          {/* Mobile Layout */}
          <div className="flex xl:hidden flex-col gap-3 lg:gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            <div className="flex-shrink-0">
              <WalletBalance />
            </div>
            <div className="flex-shrink-0">
              <TokenList />
            </div>
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
          </div>

          <div className="hidden xl:block w-[32%] min-w-[360px] max-w-[440px] flex-shrink-0 h-full">
            <SwapSection />
          </div>
        </div>
      ) : (
        // Empty state when no wallets or waiting for wallet
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-black text-2xl font-bold">₿</span>
            </div>
            <h3 className="text-white text-lg font-satoshi font-semibold mb-2">
              Welcome to Blockpal
            </h3>
            <p className="text-gray-400 font-satoshi text-sm mb-4">
              {wallets.length === 0
                ? "Create or import a wallet to get started"
                : "Setting up your dashboard..."}
            </p>
            {wallets.length === 0 && (
              <button
                onClick={() =>
                  setDashboardState((prev) => ({
                    ...prev,
                    showWelcomeModal: true,
                  }))
                }
                className="px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      )}

      {/* Welcome Modal - FIXED: Now properly shows for users with no wallets */}
      <WalletWelcomeModal
        isOpen={shouldShowWelcomeModal}
        onClose={() => {
          setDashboardState((prev) => ({ ...prev, showWelcomeModal: false }));
        }}
        userName={user?.displayName || user?.name || "User"}
        onWalletCreated={handleWalletCreated}
      />

      {/* Wallet Switcher */}
      {wallets.length > 0 && (
        <RealtimeWalletSwitcher
          isOpen={walletSwitcherOpen}
          onClose={() => setWalletSwitcherOpen(false)}
          onWalletSelect={handleWalletSelect}
        />
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
