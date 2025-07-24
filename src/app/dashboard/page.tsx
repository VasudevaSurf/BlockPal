// src/app/dashboard/page.tsx - Final implementation with pure real-time updates
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
} from "@/store/slices/walletSlice";
import { usePureRealtimeDashboard } from "@/hooks/usePureRealtimeDashboard";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import RealtimeWalletSwitcher from "@/components/wallet/RealtimeWalletSwitcher";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";
import PureRealtimeNotifications from "@/components/notifications/PureRealtimeNotifications";
import PureRealtimeStatusBar from "@/components/dashboard/PureRealtimeStatusBar";
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

export default function PureRealtimeDashboardPage() {
  const {
    isAuthenticated,
    loading: authLoading,
    user,
  } = useSelector((state: RootState) => state.auth);
  const {
    wallets,
    activeWallet,
    tokens,
    totalBalance,
    loading: walletLoading,
  } = useSelector((state: RootState) => state.wallet);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Pure real-time dashboard hook - NO MANUAL TRIGGERS NEEDED!
  const {
    data: blockchainData,
    isMonitoring,
    lastUpdated,
    totalValueChange,
    hasRecentChanges,
    recentChanges,
    status,
    notifications,
    unreadNotificationCount,
    highPriorityNotifications,
    refreshDashboard,
    clearNotifications,
    markNotificationAsRead,
    removeNotification,
    getTimeSinceUpdate,
    isDataStale,
    isConnected,
    isActive,
    changeHistory,
  } = usePureRealtimeDashboard();

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

  // Wallet switcher state
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);

  // Use refs to prevent duplicate calls and track current operations
  const initializationRef = useRef({
    authChecked: false,
    walletsLoaded: false,
    activeWalletSynced: false,
    pageLoadTime: Date.now(),
    currentWalletAddress: null as string | null,
  });

  // STEP 1: Auth Check Effect
  useEffect(() => {
    console.log("🔍 Pure Real-time Dashboard - Auth initialization");

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
  }, []);

  // STEP 2: Auth Resolution Effect
  useEffect(() => {
    if (dashboardState.authResolved && !isAuthenticated && !authLoading) {
      console.log("🚪 Pure Real-time Dashboard - Redirecting to auth");
      router.push("/auth");
    }
  }, [dashboardState.authResolved, isAuthenticated, authLoading, router]);

  // STEP 3: Wallets Loading Effect
  useEffect(() => {
    if (
      dashboardState.authResolved &&
      isAuthenticated &&
      user &&
      !initializationRef.current.walletsLoaded
    ) {
      console.log("📡 Pure Real-time Dashboard - Loading wallets");

      initializationRef.current.walletsLoaded = true;
      setDashboardState((prev) => ({ ...prev, walletsLoading: true }));

      dispatch(fetchWallets()).then((result) => {
        const walletsData =
          result.type === "wallet/fetchWallets/fulfilled"
            ? (result.payload as any[])
            : [];

        const hasWallets = walletsData && walletsData.length > 0;

        console.log("📦 Pure Real-time Wallets fetch completed:", {
          hasWallets,
          walletsCount: walletsData?.length || 0,
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

  // STEP 4: Active Wallet Sync Effect
  useEffect(() => {
    if (
      dashboardState.walletsResolved &&
      wallets.length > 0 &&
      !initializationRef.current.activeWalletSynced
    ) {
      console.log("🎯 Pure Real-time Dashboard - Syncing active wallet");

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
        } else {
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
          initialLoadComplete: true,
        }));
      });
    }
  }, [dashboardState.walletsResolved, wallets.length, dispatch]);

  // Track active wallet changes for pure blockchain monitoring
  useEffect(() => {
    const currentWalletAddress = activeWallet?.address;
    const previousWalletAddress =
      initializationRef.current.currentWalletAddress;

    if (currentWalletAddress !== previousWalletAddress) {
      console.log("🔄 Pure Real-time Dashboard - Active wallet changed:", {
        from: previousWalletAddress,
        to: currentWalletAddress,
      });

      initializationRef.current.currentWalletAddress = currentWalletAddress;

      // The pure blockchain service automatically starts monitoring!
      // No manual data loading or refresh needed - it detects ALL changes automatically!
    }
  }, [activeWallet?.address]);

  // Pure wallet selection handler - NO MANUAL REFRESH NEEDED!
  const handleWalletSelect = async (walletId: string) => {
    console.log("🎯 Pure Real-time Dashboard - Wallet selected:", walletId);

    // Find the selected wallet
    const selectedWallet = wallets.find((w) => w.id === walletId);
    if (!selectedWallet) {
      console.error("❌ Selected wallet not found");
      return;
    }

    try {
      // Set locally first for immediate UI response
      dispatch(setActiveWallet(walletId));

      // Sync with database
      await dispatch(setActiveWalletInDB(walletId));
      console.log("✅ Active wallet synced with database");

      // The pure blockchain service will AUTOMATICALLY detect the wallet change
      // and start monitoring the new wallet in real-time!
      // NO MANUAL REFRESH OR API CALLS NEEDED! 🎉
    } catch (error) {
      console.error("❌ Failed to sync active wallet with database:", error);
    }
  };

  const handleWalletCreated = () => {
    // Reset initialization flags
    initializationRef.current = {
      authChecked: true,
      walletsLoaded: false,
      activeWalletSynced: false,
      pageLoadTime: Date.now(),
      currentWalletAddress: null,
    };

    // Reset dashboard state
    setDashboardState((prev) => ({
      ...prev,
      walletsLoading: false,
      walletsResolved: false,
      activeWalletResolved: false,
      hasWallets: false,
      hasActiveWallet: false,
      showWelcomeModal: false,
      initialLoadComplete: false,
    }));

    // Reload wallets
    dispatch(fetchWallets());
  };

  // Manual refresh handler (rarely needed with pure monitoring!)
  const handleManualRefresh = async () => {
    console.log(
      "🔄 Manual refresh triggered (though pure monitoring runs automatically!)"
    );
    try {
      if (refreshDashboard) {
        await refreshDashboard();
      }
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    }
  };

  // Better loading conditions
  const shouldShowSkeleton =
    dashboardState.authLoading ||
    !dashboardState.authResolved ||
    (isAuthenticated &&
      (!dashboardState.walletsResolved || dashboardState.walletsLoading)) ||
    (wallets.length > 0 && !dashboardState.activeWalletResolved);

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
    dashboardState.initialLoadComplete;

  console.log("🎨 Pure Real-time Dashboard render state:", {
    authResolved: dashboardState.authResolved,
    walletsResolved: dashboardState.walletsResolved,
    activeWalletResolved: dashboardState.activeWalletResolved,
    walletsFromRedux: wallets.length,
    shouldShowSkeleton,
    shouldShowContent,
    shouldShowWelcomeModal,
    pureMonitoring: isMonitoring,
    isConnected,
    lastUpdate: getTimeSinceUpdate(),
    totalValueChange: totalValueChange?.toFixed(4),
    hasRecentChanges,
    recentChangesCount: recentChanges.length,
    notificationsCount: notifications.length,
    highPriorityCount: highPriorityNotifications.length,
  });

  // Show loading skeleton during initial setup
  if (shouldShowSkeleton) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2 sm:p-3 lg:p-4 flex flex-col overflow-hidden">
        <PureRealtimeNotifications
          notifications={notifications}
          onMarkAsRead={markNotificationAsRead}
          onRemove={removeNotification}
          onClearAll={clearNotifications}
        />

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
      {/* Pure Real-time Notifications - Shows incoming/outgoing transactions automatically! */}
      <PureRealtimeNotifications
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onRemove={removeNotification}
        onClearAll={clearNotifications}
      />

      {/* Pure Real-time Status Bar - Shows live blockchain monitoring status */}
      <PureRealtimeStatusBar
        isMonitoring={isMonitoring}
        isConnected={isConnected}
        lastUpdated={lastUpdated}
        totalValueChange={totalValueChange}
        hasRecentChanges={hasRecentChanges}
        timeSinceUpdate={getTimeSinceUpdate()}
        status={status}
        isDataStale={isDataStale}
        changeCount={recentChanges.length}
        onManualRefresh={handleManualRefresh}
      />

      {/* Main Dashboard Content - Updates automatically with pure blockchain monitoring! */}
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
        // Empty state with pure real-time readiness indicator
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-3 relative">
              <span className="text-black text-lg font-bold">₿</span>
              {/* Real-time indicator */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse">
                <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-25"></div>
              </div>
            </div>
            <h3 className="text-white text-base font-satoshi mb-2">
              Welcome to Pure Real-time Blockpal
            </h3>
            <p className="text-gray-400 font-satoshi text-sm mb-3">
              Your dashboard will update automatically when transactions happen
            </p>
            <div className="text-xs text-green-400 font-satoshi">
              🔴 Live • Pure blockchain monitoring ready
            </div>
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      <WalletWelcomeModal
        isOpen={shouldShowWelcomeModal}
        onClose={() => {
          setDashboardState((prev) => ({ ...prev, showWelcomeModal: false }));
        }}
        userName={user?.displayName || user?.name || "User"}
        onWalletCreated={handleWalletCreated}
      />

      {/* Enhanced Wallet Switcher */}
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
