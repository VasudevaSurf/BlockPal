// src/app/dashboard/page.tsx - COMPACT VERSION
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

interface DashboardState {
  // Loading phases
  authLoading: boolean;
  walletsLoading: boolean;
  tokensLoading: boolean;

  // Completion flags
  authResolved: boolean;
  walletsResolved: boolean;
  activeWalletResolved: boolean;
  tokensResolved: boolean;

  // Data flags
  hasWallets: boolean;
  hasActiveWallet: boolean;
  hasTokens: boolean;

  // UI states
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
    tokens,
    loading: walletLoading,
  } = useSelector((state: RootState) => state.wallet);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // ENHANCED: Single state object for better tracking
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    authLoading: true,
    walletsLoading: false,
    tokensLoading: false,
    authResolved: false,
    walletsResolved: false,
    activeWalletResolved: false,
    tokensResolved: false,
    hasWallets: false,
    hasActiveWallet: false,
    hasTokens: false,
    showWelcomeModal: false,
    initialLoadComplete: false,
  });

  // Wallet switcher state
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);

  // Use refs to prevent duplicate calls
  const initializationRef = useRef({
    authChecked: false,
    walletsLoaded: false,
    activeWalletSynced: false,
    tokensLoaded: false,
  });

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

  // STEP 1: Auth Check Effect - Only run once on mount
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
  }, []); // Only run on mount

  // STEP 2: Auth Resolution Effect
  useEffect(() => {
    if (dashboardState.authResolved && !isAuthenticated && !authLoading) {
      console.log("🚪 Dashboard - Redirecting to auth");
      router.push("/auth");
    }
  }, [dashboardState.authResolved, isAuthenticated, authLoading, router]);

  // STEP 3: Wallets Loading Effect - Only after auth is resolved
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
          resultType: result.type,
          walletsData,
        });

        setDashboardState((prev) => ({
          ...prev,
          walletsLoading: false,
          walletsResolved: true,
          hasWallets,
        }));
      });
    }
  }, [dashboardState.authResolved, isAuthenticated, user, dispatch]);

  // STEP 4: Active Wallet Sync Effect - Only after wallets are loaded and we have wallets
  useEffect(() => {
    if (
      dashboardState.walletsResolved &&
      wallets.length > 0 && // Use Redux wallets
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
            // Set first wallet as active if none is set
            const firstWallet = wallets[0];
            dispatch(setActiveWallet(firstWallet.id));
            dispatch(setActiveWalletInDB(firstWallet.id));
          }
        } else {
          // Fallback: use first wallet
          if (wallets.length > 0) {
            const firstWallet = wallets[0];
            dispatch(setActiveWallet(firstWallet.id));
            dispatch(setActiveWalletInDB(firstWallet.id));
          }
        }

        setDashboardState((prev) => ({
          ...prev,
          activeWalletResolved: true,
          hasActiveWallet: true,
        }));
      });
    }
  }, [
    dashboardState.walletsResolved,
    wallets.length, // Use Redux wallets
    dispatch,
  ]);

  // STEP 5: Tokens Loading Effect - Only after active wallet is set
  useEffect(() => {
    if (
      dashboardState.activeWalletResolved &&
      activeWallet?.address &&
      !initializationRef.current.tokensLoaded
    ) {
      console.log("🪙 Dashboard - Loading tokens for active wallet");

      initializationRef.current.tokensLoaded = true;
      setDashboardState((prev) => ({ ...prev, tokensLoading: true }));

      dispatch(fetchWalletTokens(activeWallet.address)).then((result) => {
        const tokensData =
          result.type === "wallet/fetchWalletTokens/fulfilled"
            ? (result.payload as any)?.tokens || []
            : [];

        console.log("🪙 Tokens fetch completed:", {
          tokensCount: tokensData.length,
        });

        setDashboardState((prev) => ({
          ...prev,
          tokensLoading: false,
          tokensResolved: true,
          hasTokens: tokensData.length > 0,
          initialLoadComplete: true,
        }));
      });
    }
  }, [dashboardState.activeWalletResolved, activeWallet?.address, dispatch]);

  // STEP 6: Reset flags when active wallet changes (for subsequent changes)
  useEffect(() => {
    if (activeWallet?.address && initializationRef.current.tokensLoaded) {
      // Reset tokens loading for new wallet
      const currentAddress = activeWallet.address;
      console.log(
        "🔄 Active wallet changed, reloading tokens for:",
        currentAddress
      );

      // Reset the flag to allow re-loading
      initializationRef.current.tokensLoaded = false;

      setDashboardState((prev) => ({
        ...prev,
        tokensLoading: false,
        tokensResolved: false,
        hasTokens: false,
      }));
    }
  }, [activeWallet?.address]);

  // Handle wallet selection with DB sync
  const handleWalletSelect = async (walletId: string) => {
    console.log("🎯 Dashboard - Wallet selected:", walletId);

    // Reset tokens loading state for new wallet
    initializationRef.current.tokensLoaded = false;
    setDashboardState((prev) => ({
      ...prev,
      tokensLoading: false,
      tokensResolved: false,
      hasTokens: false,
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
    }
  };

  const handleWalletCreated = () => {
    // Reset all initialization flags
    initializationRef.current = {
      authChecked: true, // Keep auth as checked
      walletsLoaded: false,
      activeWalletSynced: false,
      tokensLoaded: false,
    };

    // Reset dashboard state
    setDashboardState((prev) => ({
      ...prev,
      walletsLoading: false,
      tokensLoading: false,
      walletsResolved: false,
      activeWalletResolved: false,
      tokensResolved: false,
      hasWallets: false,
      hasActiveWallet: false,
      hasTokens: false,
      showWelcomeModal: false,
      initialLoadComplete: false,
    }));

    // Reload wallets
    dispatch(fetchWallets());
  };

  // Manual refresh handler
  const handleManualRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    try {
      await refreshDashboard();
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    }
  };

  // FIXED: Show loading until we have confirmed the wallet state
  const shouldShowSkeleton =
    dashboardState.authLoading ||
    !dashboardState.authResolved ||
    (isAuthenticated &&
      (!dashboardState.walletsResolved || dashboardState.walletsLoading)) ||
    (wallets.length > 0 && !dashboardState.activeWalletResolved) ||
    (dashboardState.hasActiveWallet && !dashboardState.tokensResolved);

  const shouldShowContent =
    dashboardState.authResolved &&
    isAuthenticated &&
    dashboardState.walletsResolved &&
    !dashboardState.authLoading &&
    !dashboardState.walletsLoading;

  // FIXED: Only show welcome modal after everything is loaded AND confirmed no wallets
  const shouldShowWelcomeModal =
    dashboardState.walletsResolved &&
    !dashboardState.walletsLoading &&
    wallets.length === 0 &&
    dashboardState.initialLoadComplete;

  console.log("🎨 Dashboard render state:", {
    authResolved: dashboardState.authResolved,
    walletsResolved: dashboardState.walletsResolved,
    activeWalletResolved: dashboardState.activeWalletResolved,
    tokensResolved: dashboardState.tokensResolved,
    walletsFromRedux: wallets.length,
    hasWalletsInState: dashboardState.hasWallets,
    hasActiveWallet: dashboardState.hasActiveWallet,
    hasTokens: dashboardState.hasTokens,
    shouldShowSkeleton,
    shouldShowContent,
    shouldShowWelcomeModal,
    initialLoadComplete: dashboardState.initialLoadComplete,
    activeWallet: activeWallet?.name,
    tokensLength: tokens.length,
  });

  // Show loading skeleton during initial setup
  if (shouldShowSkeleton) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2 sm:p-3 lg:p-4 flex flex-col overflow-hidden">
        <RealtimeDashboardNotifications />

        {/* Mobile Layout Skeleton */}
        <div className="flex flex-col xl:hidden gap-3 flex-1 min-h-0">
          <SkeletonWalletBalance />
          <SkeletonTokenList />
          <SkeletonSwapSection />
        </div>

        {/* Desktop Layout Skeleton */}
        <div className="hidden xl:flex gap-4 flex-1 min-h-0">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <SkeletonWalletBalance />
            <SkeletonTokenList />
          </div>
          <div className="w-[320px] flex-shrink-0 h-full">
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
      <RealtimeDashboardNotifications />

      {/* Main Dashboard Content */}
      {wallets.length > 0 ? (
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
          <div className="hidden xl:flex flex-1 flex-col gap-4 min-w-0">
            <div className="flex-shrink-0">
              <WalletBalance />
            </div>
            <div className="flex-1 min-h-0">
              <TokenList />
            </div>
          </div>

          <div className="hidden xl:block w-[320px] 2xl:w-[380px] flex-shrink-0 h-full">
            <SwapSection />
          </div>
        </div>
      ) : (
        // Empty state - no content, just let welcome modal handle it
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-black text-lg font-bold">₿</span>
            </div>
            <h3 className="text-white text-base font-satoshi mb-2">
              Welcome to Blockpal
            </h3>
            <p className="text-gray-400 font-satoshi text-sm">
              Setting up your wallet experience...
            </p>
          </div>
        </div>
      )}

      {/* FIXED: Welcome Modal - Only show when confirmed no wallets AND everything loaded */}
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
