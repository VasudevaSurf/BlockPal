// src/app/dashboard/page.tsx - FIXED: Better loading states and skeleton handling
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus, logoutUser } from "@/store/slices/authSlice";
import {
  fetchWallets,
  setActiveWallet,
  setActiveWalletInDB,
  getActiveWalletFromDB,
  fetchWalletTokens,
} from "@/store/slices/walletSlice";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import RealtimeWalletSwitcher from "@/components/wallet/RealtimeWalletSwitcher";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";
import RealtimeDashboardNotifications from "@/components/notifications/RealtimeDashboardNotifications";
import {
  SkeletonWalletBalance,
  SkeletonTokenList,
  SkeletonSwapSection,
} from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const {
    isAuthenticated,
    loading: authLoading,
    user,
  } = useSelector((state: RootState) => state.auth);
  const {
    wallets,
    activeWallet,
    tokens,
    loading: walletLoading,
  } = useSelector((state: RootState) => state.wallet);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Enhanced loading states
  const [dashboardLoadingState, setDashboardLoadingState] = useState({
    authChecked: false,
    walletsLoaded: false,
    activeWalletSet: false,
    tokensLoaded: false,
    initialDataReady: false,
  });

  // Wallet switcher state
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

  // Use refs to track if we've already made initial calls
  const authChecked = useRef(false);
  const walletsLoaded = useRef(false);
  const activeWalletSynced = useRef(false);
  const tokensLoaded = useRef(false);

  // Real-time dashboard hook
  const {
    data: realtimeData,
    isMonitoring,
    lastUpdated,
    changeAmount,
    hasChanges,
    notifications,
    refreshDashboard,
    status,
    isDataStale,
  } = useRealtimeDashboard();

  // Auth check effect - only run once
  useEffect(() => {
    console.log("🔍 Dashboard - Auth check effect");

    if (!authChecked.current && !isAuthenticated && !authLoading) {
      console.log("📡 Checking auth status...");
      authChecked.current = true;
      dispatch(checkAuthStatus()).then(() => {
        setDashboardLoadingState((prev) => ({ ...prev, authChecked: true }));
      });
    } else if (isAuthenticated) {
      setDashboardLoadingState((prev) => ({ ...prev, authChecked: true }));
    }
  }, [dispatch, isAuthenticated, authLoading]);

  // Redirect effect - separate from auth check
  useEffect(() => {
    console.log("🚪 Dashboard - Redirect effect", {
      isAuthenticated,
      authLoading,
      authChecked: authChecked.current,
    });

    if (authChecked.current && !authLoading && !isAuthenticated) {
      console.log("🔄 Redirecting to auth");
      router.push("/auth");
    }
  }, [isAuthenticated, authLoading, router]);

  // Wallets loading effect
  useEffect(() => {
    console.log("💼 Dashboard - Wallets effect", {
      isAuthenticated,
      user: !!user,
      walletsLoaded: walletsLoaded.current,
      walletsLength: wallets.length,
    });

    if (isAuthenticated && user && !walletsLoaded.current) {
      console.log("📡 Fetching wallets...");
      walletsLoaded.current = true;
      dispatch(fetchWallets()).then(() => {
        setDashboardLoadingState((prev) => ({ ...prev, walletsLoaded: true }));
      });
    } else if (wallets.length > 0 && !dashboardLoadingState.walletsLoaded) {
      setDashboardLoadingState((prev) => ({ ...prev, walletsLoaded: true }));
    }
  }, [isAuthenticated, user, dispatch, wallets.length]);

  // Active wallet sync effect - sync with database after wallets are loaded
  useEffect(() => {
    console.log("🎯 Dashboard - Active wallet sync effect", {
      isAuthenticated,
      user: !!user,
      walletsLength: wallets.length,
      activeWallet: !!activeWallet,
      activeWalletSynced: activeWalletSynced.current,
      walletsLoaded: dashboardLoadingState.walletsLoaded,
    });

    if (
      isAuthenticated &&
      user &&
      wallets.length > 0 &&
      dashboardLoadingState.walletsLoaded &&
      !activeWalletSynced.current
    ) {
      console.log("🔄 Syncing active wallet with database...");
      activeWalletSynced.current = true;

      dispatch(getActiveWalletFromDB()).then((result) => {
        if (result.type === "wallet/getActiveWalletFromDB/fulfilled") {
          const { activeWalletId } = result.payload as any;
          if (activeWalletId) {
            // Set the active wallet locally (without hitting DB again)
            dispatch(setActiveWallet(activeWalletId));
          } else if (wallets.length > 0) {
            // No active wallet in DB, set first wallet as active
            const firstWallet = wallets[0];
            dispatch(setActiveWallet(firstWallet.id));
            dispatch(setActiveWalletInDB(firstWallet.id));
          }
        } else {
          // Fallback: if DB sync fails, use first wallet
          if (wallets.length > 0 && !activeWallet) {
            const firstWallet = wallets[0];
            dispatch(setActiveWallet(firstWallet.id));
            dispatch(setActiveWalletInDB(firstWallet.id));
          }
        }

        setDashboardLoadingState((prev) => ({
          ...prev,
          activeWalletSet: true,
        }));
      });
    } else if (activeWallet && !dashboardLoadingState.activeWalletSet) {
      setDashboardLoadingState((prev) => ({ ...prev, activeWalletSet: true }));
    }
  }, [
    isAuthenticated,
    user,
    wallets,
    activeWallet,
    dispatch,
    dashboardLoadingState.walletsLoaded,
  ]);

  // Tokens loading effect - NEW: Wait for active wallet to be set
  useEffect(() => {
    console.log("🪙 Dashboard - Tokens loading effect", {
      activeWalletAddress: activeWallet?.address,
      activeWalletSet: dashboardLoadingState.activeWalletSet,
      tokensLoaded: tokensLoaded.current,
      tokensLength: tokens.length,
    });

    if (
      activeWallet?.address &&
      dashboardLoadingState.activeWalletSet &&
      !tokensLoaded.current
    ) {
      console.log("📡 Fetching tokens for active wallet...");
      tokensLoaded.current = true;

      dispatch(fetchWalletTokens(activeWallet.address)).then(() => {
        setDashboardLoadingState((prev) => ({
          ...prev,
          tokensLoaded: true,
          initialDataReady: true,
        }));
      });
    } else if (tokens.length > 0 && !dashboardLoadingState.tokensLoaded) {
      setDashboardLoadingState((prev) => ({
        ...prev,
        tokensLoaded: true,
        initialDataReady: true,
      }));
    }
  }, [
    activeWallet?.address,
    dashboardLoadingState.activeWalletSet,
    dispatch,
    tokens.length,
  ]);

  // Welcome modal effect - UPDATED: Check initial data ready state
  useEffect(() => {
    console.log("🎭 Welcome modal effect:", {
      isAuthenticated,
      walletLoading,
      walletsLength: wallets.length,
      walletsLoaded: dashboardLoadingState.walletsLoaded,
      initialDataReady: dashboardLoadingState.initialDataReady,
      user: !!user,
    });

    if (
      isAuthenticated &&
      user &&
      !walletLoading &&
      wallets.length === 0 &&
      dashboardLoadingState.walletsLoaded &&
      dashboardLoadingState.initialDataReady
    ) {
      console.log("🎭 Showing welcome modal - no wallets found");
      setWelcomeModalOpen(true);
    } else {
      console.log("🎭 Not showing welcome modal");
      setWelcomeModalOpen(false);
    }
  }, [
    isAuthenticated,
    user,
    walletLoading,
    wallets.length,
    dashboardLoadingState.walletsLoaded,
    dashboardLoadingState.initialDataReady,
  ]);

  // Real-time monitoring status logging
  useEffect(() => {
    if (isMonitoring) {
      console.log("📊 Real-time dashboard monitoring active:", {
        activeWallet: activeWallet?.address,
        lastUpdated: lastUpdated?.toLocaleTimeString(),
        hasChanges,
        changeAmount,
        dataAge: status.dataAge
          ? `${Math.floor(status.dataAge / 1000)}s`
          : null,
        isDataStale,
      });
    }
  }, [
    isMonitoring,
    lastUpdated,
    hasChanges,
    changeAmount,
    status.dataAge,
    isDataStale,
    activeWallet?.address,
  ]);

  // Handle wallet selection with DB sync
  const handleWalletSelect = async (walletId: string) => {
    console.log("🎯 Dashboard - Wallet selected:", walletId);

    // Reset tokens loading state
    tokensLoaded.current = false;
    setDashboardLoadingState((prev) => ({
      ...prev,
      tokensLoaded: false,
      initialDataReady: false,
    }));

    // Set locally first for immediate UI response
    dispatch(setActiveWallet(walletId));

    // Then sync with database
    try {
      await dispatch(setActiveWalletInDB(walletId));
      console.log("✅ Active wallet synced with database");

      // Force refresh dashboard data for new wallet
      setTimeout(() => {
        refreshDashboard();
      }, 500);
    } catch (error) {
      console.error("❌ Failed to sync active wallet with database:", error);
      // The local state is still updated, so UI remains consistent
    }
  };

  const handleWalletCreated = () => {
    // Reset all loading states
    walletsLoaded.current = false;
    activeWalletSynced.current = false;
    tokensLoaded.current = false;
    setDashboardLoadingState({
      authChecked: true,
      walletsLoaded: false,
      activeWalletSet: false,
      tokensLoaded: false,
      initialDataReady: false,
    });

    dispatch(fetchWallets());
    setWelcomeModalOpen(false);
  };

  // Handle manual refresh
  const handleManualRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    try {
      await refreshDashboard();
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    }
  };

  // UPDATED: Better loading state determination
  const isInitialLoading =
    !dashboardLoadingState.initialDataReady ||
    (!isAuthenticated && !authChecked.current) ||
    authLoading;

  const shouldShowContent =
    dashboardLoadingState.initialDataReady && isAuthenticated && !authLoading;

  // Show loading state during initial setup
  if (isInitialLoading) {
    console.log("🔄 Dashboard - Showing initial loading state", {
      authChecked: dashboardLoadingState.authChecked,
      walletsLoaded: dashboardLoadingState.walletsLoaded,
      activeWalletSet: dashboardLoadingState.activeWalletSet,
      tokensLoaded: dashboardLoadingState.tokensLoaded,
      initialDataReady: dashboardLoadingState.initialDataReady,
    });

    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
        {/* Real-time Dashboard Notifications */}
        <RealtimeDashboardNotifications />

        {/* Mobile Layout Skeleton */}
        <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0">
          <SkeletonWalletBalance />
          <SkeletonTokenList />
          <SkeletonSwapSection />
        </div>

        {/* Desktop Layout Skeleton */}
        <div className="hidden xl:flex gap-6 flex-1 min-h-0">
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <SkeletonWalletBalance />
            <SkeletonTokenList />
          </div>

          <div className="w-[400px] flex-shrink-0 h-full">
            <SkeletonSwapSection />
          </div>
        </div>
      </div>
    );
  }

  if (!shouldShowContent) {
    console.log("🚪 Dashboard - User not ready, should redirect");
    return null;
  }

  console.log("🎨 Dashboard - Rendering main content", {
    activeWalletId: activeWallet?.id,
    walletCount: wallets.length,
    tokensCount: tokens.length,
    isMonitoring,
    realtimeDataAvailable: !!realtimeData,
    initialDataReady: dashboardLoadingState.initialDataReady,
  });

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Real-time Dashboard Notifications */}
      <RealtimeDashboardNotifications />

      {/* Main Dashboard Content */}
      {wallets.length === 0 ? (
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
          {/* Empty state content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">
                Welcome to Blockpal
              </h2>
              <p className="text-gray-400">
                Create your first wallet to get started
              </p>
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                <p className="text-blue-400 text-sm font-satoshi">
                  📱 Real-time monitoring will start automatically once you add
                  a wallet
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
          {/* Mobile Layout */}
          <div className="flex xl:hidden flex-col gap-4 lg:gap-6 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
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
          <div className="hidden xl:flex flex-1 flex-col gap-6 min-w-0">
            <div className="flex-shrink-0">
              <WalletBalance />
            </div>
            <div className="flex-1 min-h-0">
              <TokenList />
            </div>
          </div>

          <div className="hidden xl:block w-[400px] flex-shrink-0 h-full">
            <SwapSection />
          </div>
        </div>
      )}

      {/* Modals */}
      <WalletWelcomeModal
        isOpen={welcomeModalOpen}
        onClose={() => setWelcomeModalOpen(false)}
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
