// src/app/dashboard/page.tsx - FIXED with no modal flash during auth transitions
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch, store } from "@/store";
import { checkAuthStatus } from "@/store/slices/authSlice";
import {
  fetchWallets,
  setActiveWallet,
  setActiveWalletInDB,
  getActiveWalletFromDB,
  clearWalletState,
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
  currentUserId: string | null;
  walletOperationInProgress: boolean;
  isAuthTransitioning: boolean;
  isInitialMount: boolean;
  isLoggingOut: boolean; // NEW: Track logout state
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

  // Use the dashboard hook
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

  // State tracking with initial mount flag
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
    currentUserId: null,
    walletOperationInProgress: false,
    isAuthTransitioning: false,
    isInitialMount: true,
    isLoggingOut: false, // NEW: Initialize logout state
  });

  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);

  // Refs for initialization tracking
  const initializationRef = useRef({
    authChecked: false,
    walletsLoaded: false,
    activeWalletSynced: false,
    lastUserId: null as string | null,
    isProcessingWalletOperation: false,
    lastAuthState: isAuthenticated,
    mountTime: Date.now(),
    isActualLogout: false, // NEW: Track actual logout
  });

  // NEW: Clear initial mount flag after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDashboardState((prev) => ({
        ...prev,
        isInitialMount: false,
      }));
    }, 2000); // Give 2 seconds for initial load

    return () => clearTimeout(timer);
  }, []);

  // NEW: Listen for logout events
  useEffect(() => {
    // Listen for custom logout event instead of Redux state
    const handleLogoutEvent = (event: Event) => {
      console.log("🚪 Logout event received");
      initializationRef.current.isActualLogout = true;
      setDashboardState((prev) => ({
        ...prev,
        isLoggingOut: true,
        showWelcomeModal: false,
      }));
    };

    // Add event listener for custom logout event
    window.addEventListener("userLogout", handleLogoutEvent);

    return () => {
      window.removeEventListener("userLogout", handleLogoutEvent);
    };
  }, []);

  // Detect auth state transitions
  useEffect(() => {
    // Check if auth state changed
    if (
      initializationRef.current.lastAuthState !== undefined &&
      initializationRef.current.lastAuthState !== isAuthenticated
    ) {
      console.log("🔄 Auth state transitioning:", {
        from: initializationRef.current.lastAuthState,
        to: isAuthenticated,
      });

      // Mark as transitioning
      setDashboardState((prev) => ({
        ...prev,
        isAuthTransitioning: true,
        showWelcomeModal: false, // Hide modal during transition
      }));

      // Clear transition flag after a short delay
      setTimeout(() => {
        setDashboardState((prev) => ({
          ...prev,
          isAuthTransitioning: false,
        }));
      }, 500);
    }

    initializationRef.current.lastAuthState = isAuthenticated;
  }, [isAuthenticated]);

  // Detect user changes and clear state
  useEffect(() => {
    const userId = user?.id || user?.username || null;

    // If user changed (including logout), clear wallet state
    if (
      initializationRef.current.lastUserId &&
      initializationRef.current.lastUserId !== userId
    ) {
      console.log("👤 User changed, clearing wallet state", {
        oldUser: initializationRef.current.lastUserId,
        newUser: userId,
      });

      // Mark as auth transitioning
      setDashboardState((prev) => ({
        ...prev,
        isAuthTransitioning: true,
        showWelcomeModal: false, // Ensure modal is hidden
      }));

      // Clear wallet state
      dispatch(clearWalletState());

      // Reset initialization flags
      initializationRef.current.walletsLoaded = false;
      initializationRef.current.activeWalletSynced = false;
      initializationRef.current.isProcessingWalletOperation = false;

      // Reset dashboard state
      setDashboardState({
        authLoading: false,
        walletsLoading: false,
        authResolved: true,
        walletsResolved: false,
        activeWalletResolved: false,
        hasWallets: false,
        hasActiveWallet: false,
        showWelcomeModal: false,
        initialLoadComplete: false,
        currentUserId: userId,
        walletOperationInProgress: false,
        isAuthTransitioning: true,
        isInitialMount: false, // Keep initial mount false on user change
      });

      // Clear any cached data
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("walletNameOverrides");
        localStorage.removeItem("dashboard-user-data-v2");
        localStorage.removeItem("activeWalletId");
      }

      // Clear transition flag after delay
      setTimeout(() => {
        setDashboardState((prev) => ({
          ...prev,
          isAuthTransitioning: false,
        }));
      }, 500);
    }

    // Update last user ID
    initializationRef.current.lastUserId = userId;

    // Update dashboard state with current user
    setDashboardState((prev) => ({
      ...prev,
      currentUserId: userId,
    }));
  }, [user, dispatch]);

  // Log dashboard status on mount
  useEffect(() => {
    console.log("📊 Dashboard mounted");

    // Cleanup function
    return () => {
      console.log("📊 Dashboard unmounting");
    };
  }, []);

  // STEP 1: Auth Check
  useEffect(() => {
    if (!initializationRef.current.authChecked) {
      console.log("🔍 Dashboard - Checking auth status");
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

  // STEP 2: Redirect if not authenticated
  useEffect(() => {
    if (dashboardState.authResolved && !isAuthenticated && !authLoading) {
      console.log("🚪 Dashboard - Not authenticated, redirecting to auth");

      // Clear wallet state before redirecting
      dispatch(clearWalletState());

      router.push("/auth");
    }
  }, [
    dashboardState.authResolved,
    isAuthenticated,
    authLoading,
    router,
    dispatch,
  ]);

  // STEP 3: Load Wallets (only for current user)
  useEffect(() => {
    if (
      dashboardState.authResolved &&
      isAuthenticated &&
      user &&
      !initializationRef.current.walletsLoaded &&
      dashboardState.currentUserId === (user.id || user.username) &&
      !initializationRef.current.isProcessingWalletOperation &&
      !dashboardState.isAuthTransitioning // Don't load during transition
    ) {
      console.log("📡 Dashboard - Loading wallets for user:", user.username);
      initializationRef.current.walletsLoaded = true;
      setDashboardState((prev) => ({ ...prev, walletsLoading: true }));

      dispatch(fetchWallets()).then((result) => {
        const walletsData =
          result.type === "wallet/fetchWallets/fulfilled"
            ? (result.payload as any[])
            : [];

        const hasWallets = walletsData && walletsData.length > 0;

        console.log("📦 Wallets loaded:", {
          hasWallets,
          count: walletsData?.length || 0,
          userId: user.username,
        });

        setDashboardState((prev) => ({
          ...prev,
          walletsLoading: false,
          walletsResolved: true,
          hasWallets,
          initialLoadComplete: true,
          // Only show modal if:
          // 1. No wallets
          // 2. Not transitioning
          // 3. Not initial mount
          // 4. Not during wallet operation
          showWelcomeModal:
            !hasWallets &&
            !prev.isAuthTransitioning &&
            !prev.isInitialMount &&
            !prev.walletOperationInProgress,
        }));
      });
    }
  }, [
    dashboardState.authResolved,
    isAuthenticated,
    user,
    dashboardState.currentUserId,
    dashboardState.isAuthTransitioning,
    dispatch,
  ]);

  // STEP 4: Sync Active Wallet (only if wallets belong to current user)
  useEffect(() => {
    if (
      dashboardState.walletsResolved &&
      wallets.length > 0 &&
      !initializationRef.current.activeWalletSynced &&
      user &&
      dashboardState.currentUserId === (user.id || user.username) &&
      !initializationRef.current.isProcessingWalletOperation &&
      !dashboardState.isAuthTransitioning // Don't sync during transition
    ) {
      console.log(
        "🎯 Dashboard - Setting active wallet for user:",
        user.username
      );
      initializationRef.current.activeWalletSynced = true;

      dispatch(getActiveWalletFromDB()).then((result) => {
        if (result.type === "wallet/getActiveWalletFromDB/fulfilled") {
          const { activeWalletId } = result.payload as any;
          if (activeWalletId) {
            // Verify the wallet belongs to current user's wallets
            const walletExists = wallets.find((w) => w.id === activeWalletId);
            if (walletExists) {
              dispatch(setActiveWallet(activeWalletId));
            } else {
              console.warn(
                "⚠️ Active wallet from DB doesn't belong to current user"
              );
              // Set first wallet as active
              if (wallets.length > 0) {
                const firstWallet = wallets[0];
                dispatch(setActiveWallet(firstWallet.id));
                dispatch(setActiveWalletInDB(firstWallet.id));
              }
            }
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
    } else if (
      dashboardState.walletsResolved &&
      wallets.length === 0 &&
      !initializationRef.current.isProcessingWalletOperation &&
      !dashboardState.isAuthTransitioning
    ) {
      setDashboardState((prev) => ({
        ...prev,
        activeWalletResolved: true,
        hasActiveWallet: false,
      }));
    }
  }, [
    dashboardState.walletsResolved,
    wallets,
    user,
    dashboardState.currentUserId,
    dashboardState.isAuthTransitioning,
    dispatch,
  ]);

  // Handle wallet selection
  const handleWalletSelect = async (walletId: string) => {
    console.log("🎯 Wallet selected:", walletId);
    dispatch(setActiveWallet(walletId));
    await dispatch(setActiveWalletInDB(walletId));
  };

  // Enhanced wallet creation handler
  const handleWalletCreated = async () => {
    console.log("✅ Wallet operation completed (create/import)");

    // Mark wallet operation in progress
    initializationRef.current.isProcessingWalletOperation = true;
    setDashboardState((prev) => ({
      ...prev,
      walletOperationInProgress: true,
      showWelcomeModal: false,
    }));

    // Reset initialization flags to allow re-fetching
    initializationRef.current.walletsLoaded = false;
    initializationRef.current.activeWalletSynced = false;

    try {
      // Fetch wallets
      const result = await dispatch(fetchWallets());

      const walletsData =
        result.type === "wallet/fetchWallets/fulfilled"
          ? (result.payload as any[])
          : [];

      const hasWallets = walletsData && walletsData.length > 0;

      console.log("📦 Wallets after operation:", {
        hasWallets,
        count: walletsData?.length || 0,
      });

      if (hasWallets) {
        // Get the most recently created/imported wallet (usually the last one)
        const newWallet = walletsData[walletsData.length - 1];

        if (newWallet) {
          const walletId = newWallet._id?.toString() || newWallet.id;

          // Set as active wallet
          await dispatch(setActiveWallet(walletId));
          await dispatch(setActiveWalletInDB(walletId));

          // Update state to show the dashboard
          setDashboardState((prev) => ({
            ...prev,
            walletsResolved: true,
            activeWalletResolved: true,
            hasWallets: true,
            hasActiveWallet: true,
            walletOperationInProgress: false,
          }));

          // Allow the dashboard hook to naturally initialize
          console.log(
            "🔄 Dashboard will auto-initialize for wallet:",
            newWallet.walletAddress || newWallet.address
          );
        }
      } else {
        // If still no wallets (shouldn't happen), reset state
        setDashboardState((prev) => ({
          ...prev,
          walletsResolved: true,
          activeWalletResolved: true,
          hasWallets: false,
          hasActiveWallet: false,
          walletOperationInProgress: false,
          showWelcomeModal: true,
        }));
      }
    } finally {
      // Clear the operation flag
      initializationRef.current.isProcessingWalletOperation = false;
    }
  };

  // Handle manual refresh
  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh requested");
    manualRefresh();
  };

  // Determine loading conditions
  const shouldShowSkeleton =
    dashboardState.authLoading ||
    !dashboardState.authResolved ||
    dashboardState.isAuthTransitioning ||
    dashboardState.isInitialMount ||
    (dashboardState.isLoggingOut && initializationRef.current.isActualLogout) || // Only show during actual logout
    (isAuthenticated &&
      !dashboardState.walletsResolved &&
      !dashboardState.walletOperationInProgress) ||
    (wallets.length > 0 &&
      !dashboardState.activeWalletResolved &&
      !dashboardState.walletOperationInProgress) ||
    (dashboardState.walletOperationInProgress && !isInitialized);

  // Determine content display conditions
  const shouldShowContent =
    dashboardState.authResolved &&
    isAuthenticated &&
    dashboardState.walletsResolved &&
    (dashboardState.activeWalletResolved || wallets.length === 0) &&
    !dashboardState.authLoading &&
    !dashboardState.walletsLoading &&
    !dashboardState.isAuthTransitioning &&
    !dashboardState.isInitialMount && // NEW: Don't show content during initial mount
    (!dashboardState.walletOperationInProgress || isInitialized);

  // Determine if we should show welcome modal
  const shouldShowWelcomeModal =
    dashboardState.walletsResolved &&
    !dashboardState.walletsLoading &&
    wallets.length === 0 &&
    dashboardState.initialLoadComplete &&
    dashboardState.showWelcomeModal &&
    isAuthenticated &&
    !dashboardState.walletOperationInProgress &&
    !dashboardState.isAuthTransitioning &&
    !dashboardState.isInitialMount && // NEW: Never show modal during initial mount
    !authLoading;

  console.log("🎨 Dashboard render state:", {
    shouldShowSkeleton,
    shouldShowContent,
    shouldShowWelcomeModal,
    walletOperationInProgress: dashboardState.walletOperationInProgress,
    isAuthTransitioning: dashboardState.isAuthTransitioning,
    isInitialMount: dashboardState.isInitialMount,
    activeWallet: activeWallet?.address,
    isInitialized,
    isLoading,
    tokensCount: tokens.length,
    totalValue,
    currentUser: user?.username,
    currentUserId: dashboardState.currentUserId,
  });

  // Show loading skeleton during initial setup or transitions
  if (shouldShowSkeleton) {
    return (
      <>
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

        {/* Logout Loading Overlay */}
        {dashboardState.isLoggingOut && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <div className="bg-black border border-[#2C2C2C] rounded-xl p-6 flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19] mb-4"></div>
              <p className="text-white font-satoshi text-sm">Logging out...</p>
              <p className="text-gray-400 font-satoshi text-xs mt-1">
                Please wait
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Don't render anything if not ready
  if (!shouldShowContent) {
    return null;
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-1 sm:p-2 lg:p-3 flex flex-col overflow-hidden">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2 mb-2">
          <p className="text-red-400 text-xs font-satoshi">{error}</p>
          <button
            onClick={handleManualRefresh}
            className="text-red-400 underline text-xs mt-1"
          >
            Try Again
          </button>
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
        // Empty state when no wallets
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-black text-2xl font-bold">₿</span>
            </div>
            <h3 className="text-white text-lg font-satoshi font-semibold mb-2">
              Welcome to Blockpal, {user?.displayName || user?.name || "User"}
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

      {/* Welcome Modal - Only show when appropriate */}
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
