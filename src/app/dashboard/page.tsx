// src/app/dashboard/page.tsx (FIXED - Better Test Mode Support)
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { Bell, Settings, LogOut, Wallet, ChevronDown } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import {
  checkAuthStatus,
  logoutUser,
  setAuthenticated,
} from "@/store/slices/authSlice";
import {
  fetchWallets,
  setActiveWallet,
  initializeTestWallet,
} from "@/store/slices/walletSlice";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import WalletSetupPrompt from "@/components/wallet/WalletSetupPrompt";
import WalletSwitcher from "@/components/wallet/WalletSwitcher";

// Check if we're in test mode
const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

// Mock test user for test mode
const testUser = {
  id: "test-user-1",
  name: "Test User",
  email: "test@example.com",
  displayName: "Test User",
  username: "testuser",
};

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

  // Wallet switcher state
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);

  // Use refs to track if we've already made initial calls
  const authChecked = useRef(false);
  const walletsLoaded = useRef(false);
  const testModeInitialized = useRef(false);

  // Test mode initialization - run immediately
  useEffect(() => {
    if (isTestMode && !testModeInitialized.current) {
      console.log("🧪 Test mode: Initializing immediately");
      testModeInitialized.current = true;

      // Set test user as authenticated
      dispatch(setAuthenticated(testUser));

      // Initialize test wallet
      dispatch(initializeTestWallet());

      console.log("🧪 Test mode: Initialization complete");
    }
  }, [dispatch]);

  // Auth check effect - only run in production mode
  useEffect(() => {
    if (isTestMode) {
      return; // Skip auth check in test mode
    }

    console.log("🔍 Dashboard - Auth check effect");

    if (!authChecked.current && !isAuthenticated && !authLoading) {
      console.log("📡 Checking auth status...");
      authChecked.current = true;
      dispatch(checkAuthStatus());
    }
  }, [dispatch, isAuthenticated, authLoading]);

  // Redirect effect - only in production mode
  useEffect(() => {
    if (isTestMode) {
      return; // Skip redirect logic in test mode
    }

    console.log("🚪 Dashboard - Redirect effect", {
      isAuthenticated,
      authLoading,
      authChecked: authChecked.current,
    });

    // Only redirect if auth check is complete and user is not authenticated
    if (authChecked.current && !authLoading && !isAuthenticated) {
      console.log("🔄 Redirecting to auth");
      router.push("/auth");
    }
  }, [isAuthenticated, authLoading, router]);

  // Wallets loading effect - run when authenticated or in test mode
  useEffect(() => {
    const shouldLoadWallets = isTestMode || (isAuthenticated && user);

    console.log("💼 Dashboard - Wallets effect", {
      isTestMode,
      isAuthenticated,
      user: !!user,
      walletsLoaded: walletsLoaded.current,
      walletsLength: wallets.length,
      shouldLoadWallets,
    });

    if (shouldLoadWallets && !walletsLoaded.current) {
      console.log("📡 Loading wallets...");
      walletsLoaded.current = true;

      if (isTestMode) {
        console.log("🧪 Test mode: Test wallet should already be initialized");
        // Test wallet is already initialized in the first effect
      } else {
        dispatch(fetchWallets());
      }
    }
  }, [isAuthenticated, user, dispatch, wallets.length]);

  const handleLogout = async () => {
    if (isTestMode) {
      console.log("🧪 Test mode: Simulating logout");
      router.push("/auth");
      return;
    }

    try {
      await dispatch(logoutUser());
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even if logout fails
      router.push("/auth");
    }
  };

  // Set active wallet effect - only run when wallets are loaded and no active wallet
  useEffect(() => {
    console.log("🎯 Dashboard - Active wallet effect", {
      activeWallet: !!activeWallet,
      walletsLength: wallets.length,
    });

    if (!activeWallet && wallets.length > 0) {
      console.log("🎯 Setting active wallet...");
      const defaultWallet = wallets.find((w) => w.isActive) || wallets[0];
      dispatch(setActiveWallet(defaultWallet.id));
    }
  }, [activeWallet, wallets, dispatch]);

  // Show loading state only in production mode
  if (
    !isTestMode &&
    (authLoading || (!isAuthenticated && !authChecked.current))
  ) {
    console.log("🔄 Dashboard - Showing auth loading state");
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  // Redirect if not authenticated (but don't show loading) - skip in test mode
  if (!isTestMode && !isAuthenticated) {
    console.log("🚪 Dashboard - User not authenticated, should redirect");
    return null;
  }

  // Show wallet setup if no wallets exist (skip in test mode)
  if (
    !isTestMode &&
    isAuthenticated &&
    !walletLoading &&
    wallets.length === 0
  ) {
    return <WalletSetupPrompt />;
  }

  const getWalletColor = (index: number) => {
    const colors = [
      "bg-gradient-to-br from-blue-400 to-cyan-400",
      "bg-gradient-to-br from-purple-400 to-pink-400",
      "bg-gradient-to-br from-green-400 to-emerald-400",
      "bg-gradient-to-br from-orange-400 to-red-400",
      "bg-gradient-to-br from-indigo-400 to-purple-400",
    ];
    const activeIndex = wallets.findIndex((w) => w.id === activeWallet?.id);
    return colors[activeIndex % colors.length] || colors[0];
  };

  console.log("🎨 Dashboard - Rendering main content", {
    isTestMode,
    isAuthenticated: isTestMode || isAuthenticated,
    walletsCount: wallets.length,
    activeWallet: activeWallet?.name,
  });

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 mb-4 flex-shrink-0">
          <div className="flex items-center">
            <span className="text-yellow-400 text-sm font-satoshi font-medium">
              🧪 TEST MODE ACTIVE
            </span>
            <span className="text-yellow-400 text-xs font-satoshi ml-2">
              Using test wallet: {activeWallet?.address?.slice(0, 10)}...
              {activeWallet?.address?.slice(-6)}
            </span>
          </div>
        </div>
      )}

      {/* Header - Fixed and Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            {isTestMode ? "Test Dashboard" : "Dashboard"}
          </h1>
          <p className="text-gray-400 text-sm font-satoshi mt-1">
            Welcome back{isTestMode ? " to test mode" : ""},{" "}
            {user?.displayName || user?.name || "Test User"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Wallet Selector - Clickable */}
          <button
            onClick={() => setWalletSwitcherOpen(true)}
            className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto hover:border-[#E2AF19] transition-colors group"
          >
            <div
              className={`w-6 h-6 lg:w-8 lg:h-8 ${getWalletColor(
                0
              )} rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0`}
            >
              {/* Grid pattern overlay */}
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "6px 6px lg:8px 8px",
                }}
              ></div>
            </div>
            <span className="text-white text-xs sm:text-sm font-satoshi mr-2 min-w-0 truncate group-hover:text-[#E2AF19] transition-colors">
              {activeWallet?.name || "Loading..."}
            </span>

            {/* Divider */}
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>

            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              {activeWallet?.address
                ? `${activeWallet.address.slice(
                    0,
                    6
                  )}...${activeWallet.address.slice(-4)}`
                : "Loading..."}
            </span>

            {/* Dropdown Icon */}
            <ChevronDown
              size={14}
              className="text-gray-400 group-hover:text-[#E2AF19] transition-colors lg:w-4 lg:h-4"
            />
          </button>

          {/* Action Icons Container */}
          <div className="flex items-center space-x-3">
            {/* Other Icons Container */}
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
              <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
                <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
              </button>

              {/* Divider */}
              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>

              <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
                <Settings size={16} className="text-gray-400 lg:w-5 lg:h-5" />
              </button>

              {/* Divider */}
              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>

              <button
                onClick={handleLogout}
                className="p-1.5 lg:p-2 transition-colors hover:bg-red-600 hover:bg-opacity-20 rounded-full group"
                title="Logout"
              >
                <LogOut
                  size={16}
                  className="text-gray-400 lg:w-5 lg:h-5 group-hover:text-red-400 transition-colors"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Always show, even if wallets are loading */}
      <div className="flex flex-col xl:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
        {/* Mobile Layout - Scrollable */}
        <div className="flex xl:hidden flex-col gap-4 lg:gap-6 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {/* Wallet Balance - Fixed at top */}
          <div className="flex-shrink-0">
            <WalletBalance />
          </div>

          {/* Token Holdings - Full content visible */}
          <div className="flex-shrink-0">
            <TokenList />
          </div>

          {/* Swap Section - Full content visible */}
          <div className="flex-shrink-0">
            <SwapSection />
          </div>
        </div>

        {/* Desktop Layout - Same as before */}
        <div className="hidden xl:flex flex-1 flex-col gap-6 min-w-0">
          {/* Wallet Balance - Fixed height */}
          <div className="flex-shrink-0">
            <WalletBalance />
          </div>

          {/* Token Holdings - Takes remaining space */}
          <div className="flex-1 min-h-0">
            <TokenList />
          </div>
        </div>

        {/* Right Column - Swap Section - Responsive width - Desktop only */}
        <div className="hidden xl:block w-[400px] flex-shrink-0 h-full">
          <SwapSection />
        </div>
      </div>

      {/* Wallet Switcher Modal */}
      <WalletSwitcher
        isOpen={walletSwitcherOpen}
        onClose={() => setWalletSwitcherOpen(false)}
      />

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
