// src/app/dashboard/page.tsx - FIXED FOR PROPER WALLET LOADING
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus } from "@/store/slices/authSlice";
import {
  initializePrimaryWallet,
  fetchWallets, // ADDED: Ensure we fetch all wallets
  fetchWalletTokens,
  updateWalletBalance,
  clearWalletState,
  refreshWalletList, // ADDED: Refresh wallet list
} from "@/store/slices/walletSlice";
import { useDashboardV2 } from "@/hooks/useDashboardV2";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import {
  SkeletonWalletBalance,
  SkeletonTokenList,
  SkeletonSwapSection,
} from "@/components/ui/Skeleton";

interface DashboardState {
  authLoading: boolean;
  walletInitialized: boolean;
  authResolved: boolean;
  initialLoadComplete: boolean;
  walletsLoaded: boolean; // ADDED: Track if wallets are loaded
  currentUserId: string | null;
  isLoggingOut: boolean;
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

  // ENHANCED: State tracking with wallet loading
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    authLoading: true,
    walletInitialized: false,
    authResolved: false,
    initialLoadComplete: false,
    walletsLoaded: false, // ADDED
    currentUserId: null,
    isLoggingOut: false,
  });

  // Refs for initialization tracking
  const initializationRef = useRef({
    authChecked: false,
    walletInitialized: false,
    walletsLoaded: false, // ADDED
    lastUserId: null as string | null,
    mountTime: Date.now(),
  });

  // Log dashboard status on mount
  useEffect(() => {
    console.log("📊 Wallet-First Dashboard mounted");
    console.log("🔍 Initial state:", {
      isAuthenticated,
      userExists: !!user,
      walletsCount: wallets.length,
      activeWallet: activeWallet?.name,
    });

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

  // STEP 3: Initialize Wallet System
  useEffect(() => {
    if (
      dashboardState.authResolved &&
      isAuthenticated &&
      user &&
      !initializationRef.current.walletInitialized &&
      dashboardState.currentUserId === (user.id || user.username)
    ) {
      console.log(
        "📡 Dashboard - Initializing wallet system for user:",
        user.username
      );
      initializationRef.current.walletInitialized = true;

      dispatch(initializePrimaryWallet()).then((result) => {
        if (initializePrimaryWallet.fulfilled.match(result)) {
          console.log("✅ Wallet system initialized successfully");
          setDashboardState((prev) => ({
            ...prev,
            walletInitialized: true,
          }));
        } else {
          console.error("❌ Failed to initialize wallet system:", result.error);
          router.push("/auth");
        }
      });
    }
  }, [
    dashboardState.authResolved,
    isAuthenticated,
    user,
    dashboardState.currentUserId,
    dispatch,
    router,
  ]);

  // STEP 4: Load All Wallets (ENHANCED)
  useEffect(() => {
    if (
      dashboardState.walletInitialized &&
      isAuthenticated &&
      user &&
      !initializationRef.current.walletsLoaded
    ) {
      console.log("📋 Dashboard - Loading all wallets");
      initializationRef.current.walletsLoaded = true;

      // First refresh wallet list to ensure we have latest from localStorage
      dispatch(refreshWalletList());

      // Then fetch wallets to ensure proper format
      dispatch(fetchWallets()).then((result) => {
        if (fetchWallets.fulfilled.match(result)) {
          console.log(
            "✅ All wallets loaded successfully:",
            result.payload.length,
            "wallets"
          );
          console.log(
            "📋 Wallet details:",
            result.payload.map((w: any) => ({
              name: w.name,
              isPrimary: w.isPrimary,
              address: w.address?.slice(0, 10) + "...",
            }))
          );

          setDashboardState((prev) => ({
            ...prev,
            walletsLoaded: true,
            initialLoadComplete: true,
          }));
        } else {
          console.error("❌ Failed to load wallets:", result.error);
        }
      });
    }
  }, [dashboardState.walletInitialized, isAuthenticated, user, dispatch]);

  // STEP 5: Update current user tracking
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

      // Clear wallet state
      dispatch(clearWalletState());

      // Reset initialization flags
      initializationRef.current.walletInitialized = false;
      initializationRef.current.walletsLoaded = false;

      // Reset dashboard state
      setDashboardState({
        authLoading: false,
        walletInitialized: false,
        authResolved: true,
        initialLoadComplete: false,
        walletsLoaded: false,
        currentUserId: userId,
        isLoggingOut: false,
      });
    }

    // Update last user ID
    initializationRef.current.lastUserId = userId;

    // Update dashboard state with current user
    setDashboardState((prev) => ({
      ...prev,
      currentUserId: userId,
    }));
  }, [user, dispatch]);

  // ENHANCED: Debug logging for wallet state
  useEffect(() => {
    console.log("🔍 Dashboard wallet state:", {
      walletsCount: wallets.length,
      activeWallet: activeWallet
        ? {
            id: activeWallet.id,
            name: activeWallet.name,
            address: activeWallet.address.slice(0, 10) + "...",
            isPrimary: activeWallet.id === "primary",
          }
        : null,
      walletsLoaded: dashboardState.walletsLoaded,
      walletsList: wallets.map((w) => ({
        id: w.id,
        name: w.name,
        isPrimary: w.id === "primary",
        isActive: w.isActive,
      })),
    });
  }, [wallets, activeWallet, dashboardState.walletsLoaded]);

  // Handle manual refresh
  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh requested");
    manualRefresh();
  };

  // ENHANCED: Determine loading conditions
  const shouldShowSkeleton =
    dashboardState.authLoading ||
    !dashboardState.authResolved ||
    (isAuthenticated && !dashboardState.walletInitialized) ||
    (isAuthenticated && !dashboardState.walletsLoaded) || // ADDED: Wait for wallets to load
    (dashboardState.walletsLoaded && !isInitialized && isLoading);

  // ENHANCED: Determine content display conditions
  const shouldShowContent =
    dashboardState.authResolved &&
    isAuthenticated &&
    dashboardState.walletInitialized &&
    dashboardState.walletsLoaded && // ADDED: Ensure wallets are loaded
    !dashboardState.authLoading &&
    !walletLoading &&
    activeWallet;

  console.log("🎨 Dashboard render state:", {
    shouldShowSkeleton,
    shouldShowContent,
    authResolved: dashboardState.authResolved,
    isAuthenticated,
    walletInitialized: dashboardState.walletInitialized,
    walletsLoaded: dashboardState.walletsLoaded,
    activeWallet: activeWallet?.name,
    walletsCount: wallets.length,
    isInitialized,
    isLoading,
    tokensCount: tokens.length,
    totalValue,
    currentUser: user?.username,
  });

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

      {/* ENHANCED: Wallet Status Display */}
      {activeWallet && (
        <div className="mb-2 p-2 bg-blue-900/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-xs font-satoshi">
                🏦 Active: {activeWallet.name} (
                {activeWallet.id === "primary" ? "Primary" : "Additional"})
              </p>
              <p className="text-blue-300 text-[10px] font-satoshi">
                {activeWallet.address.slice(0, 10)}...
                {activeWallet.address.slice(-6)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-300 text-[10px] font-satoshi">
                Total Wallets: {wallets.length}
              </p>
              <p className="text-blue-400 text-xs font-satoshi">
                {wallets.filter((w) => w.id === "primary").length} Primary +{" "}
                {wallets.filter((w) => w.id !== "primary").length} Additional
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      {activeWallet ? (
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
        // Empty state when no wallet
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-black text-2xl font-bold">₿</span>
            </div>
            <h3 className="text-white text-lg font-satoshi font-semibold mb-2">
              Welcome to Blockpal,{" "}
              {user?.displayName || user?.username || "User"}
            </h3>
            <p className="text-gray-400 font-satoshi text-sm mb-4">
              Your wallet system is being initialized...
            </p>
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
              <p className="text-yellow-400 text-xs font-satoshi">
                Loading all wallets from storage...
              </p>
            </div>
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
