// src/app/dashboard/page.tsx - Updated with DB active wallet sync
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  Settings,
  LogOut,
  Wallet,
  ChevronDown,
  Radio,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus, logoutUser } from "@/store/slices/authSlice";
import {
  fetchWallets,
  setActiveWallet,
  setActiveWalletInDB,
  getActiveWalletFromDB,
} from "@/store/slices/walletSlice";
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import RealtimeWalletSwitcher from "@/components/wallet/RealtimeWalletSwitcher";
import RealtimeBalanceNotifications from "@/components/notifications/RealtimeBalanceNotifications";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";

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

  // Real-time wallet balances
  const { realtimeBalances, activeWalletBalance, isMonitoring, notifications } =
    useRealtimeWalletBalances();

  // Wallet switcher state
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [showRealtimeStatus, setShowRealtimeStatus] = useState(false);

  // Use refs to track if we've already made initial calls
  const authChecked = useRef(false);
  const walletsLoaded = useRef(false);
  const activeWalletSynced = useRef(false);

  // Auth check effect - only run once
  useEffect(() => {
    console.log("🔍 Dashboard - Auth check effect");

    if (!authChecked.current && !isAuthenticated && !authLoading) {
      console.log("📡 Checking auth status...");
      authChecked.current = true;
      dispatch(checkAuthStatus());
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
      dispatch(fetchWallets());
    }
  }, [isAuthenticated, user, dispatch]);

  // NEW: Active wallet sync effect - sync with database after wallets are loaded
  useEffect(() => {
    console.log("🎯 Dashboard - Active wallet sync effect", {
      isAuthenticated,
      user: !!user,
      walletsLength: wallets.length,
      activeWallet: !!activeWallet,
      activeWalletSynced: activeWalletSynced.current,
    });

    if (
      isAuthenticated &&
      user &&
      wallets.length > 0 &&
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
      });
    }
  }, [isAuthenticated, user, wallets, activeWallet, dispatch]);

  // Welcome modal effect
  useEffect(() => {
    console.log("🎭 Welcome modal effect:", {
      isAuthenticated,
      walletLoading,
      walletsLength: wallets.length,
      walletsLoaded: walletsLoaded.current,
      user: !!user,
    });

    if (
      isAuthenticated &&
      user &&
      !walletLoading &&
      wallets.length === 0 &&
      walletsLoaded.current
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
    walletsLoaded.current,
  ]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser());
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth");
    }
  };

  // UPDATED: Handle wallet selection with DB sync
  const handleWalletSelect = async (walletId: string) => {
    console.log("🎯 Dashboard - Wallet selected:", walletId);

    // Set locally first for immediate UI response
    dispatch(setActiveWallet(walletId));

    // Then sync with database
    try {
      await dispatch(setActiveWalletInDB(walletId));
      console.log("✅ Active wallet synced with database");
    } catch (error) {
      console.error("❌ Failed to sync active wallet with database:", error);
      // The local state is still updated, so UI remains consistent
    }
  };

  const handleWalletCreated = () => {
    walletsLoaded.current = false;
    activeWalletSynced.current = false; // Reset sync flag
    dispatch(fetchWallets());
    setWelcomeModalOpen(false);
  };

  // Show loading state
  if (authLoading || (!isAuthenticated && !authChecked.current)) {
    console.log("🔄 Dashboard - Showing auth loading state");
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("🚪 Dashboard - User not authenticated, should redirect");
    return null;
  }

  // FIXED: Get wallet color based on activeWallet index in wallets array
  const getWalletColor = () => {
    const colors = [
      "bg-gradient-to-br from-blue-400 to-cyan-400",
      "bg-gradient-to-br from-purple-400 to-pink-400",
      "bg-gradient-to-br from-green-400 to-emerald-400",
      "bg-gradient-to-br from-orange-400 to-red-400",
      "bg-gradient-to-br from-indigo-400 to-purple-400",
    ];

    if (!activeWallet) return colors[0];

    // Find the index of the active wallet in the wallets array
    const activeIndex = wallets.findIndex((w) => w.id === activeWallet.id);
    return colors[activeIndex >= 0 ? activeIndex % colors.length : 0];
  };

  // FIXED: Get active wallet from real-time data or fallback to Redux state
  const getActiveWalletBalance = () => {
    const activeRealtimeWallet = realtimeBalances.find((w) => w.isActive);
    if (activeRealtimeWallet) {
      return activeRealtimeWallet.balance;
    }
    return activeWallet?.balance || 0;
  };

  // FIXED: Get active wallet display data
  const getActiveWalletDisplayData = () => {
    const activeRealtimeWallet = realtimeBalances.find((w) => w.isActive);

    if (activeRealtimeWallet) {
      return {
        name: activeRealtimeWallet.name,
        address: activeRealtimeWallet.address,
        balance: activeRealtimeWallet.balance,
        changeAmount: activeRealtimeWallet.changeAmount,
        hasRealtimeData: true,
      };
    }

    // Fallback to Redux state
    return {
      name: activeWallet?.name || "Loading...",
      address: activeWallet?.address || "",
      balance: activeWallet?.balance || 0,
      changeAmount: undefined,
      hasRealtimeData: false,
    };
  };

  const activeWalletData = getActiveWalletDisplayData();

  console.log("🎨 Dashboard - Rendering main content", {
    activeWalletId: activeWallet?.id,
    activeWalletName: activeWalletData.name,
    hasRealtimeData: activeWalletData.hasRealtimeData,
    walletColor: getWalletColor(),
  });

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Real-time Balance Notifications */}
      <RealtimeBalanceNotifications />

      {/* Header - Fixed and Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Dashboard
          </h1>
          <p className="text-gray-400 text-sm font-satoshi mt-1 flex items-center">
            Welcome back, {user?.displayName || user?.name || "User"}
            {/* Real-time indicator */}
            {isMonitoring && (
              <span className="ml-2 flex items-center text-green-400">
                <Radio size={12} className="mr-1 animate-pulse" />
                <span className="text-xs">Real-time</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Wallet Selector with Real-time Data */}
          {wallets.length > 0 && (
            <button
              onClick={() => setWalletSwitcherOpen(true)}
              className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto hover:border-[#E2AF19] transition-colors group"
            >
              <div
                className={`w-6 h-6 lg:w-8 lg:h-8 ${getWalletColor()} rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0`}
              >
                <div
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                   linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                    backgroundSize: "6px 6px lg:8px 8px",
                  }}
                ></div>
                {/* Real-time pulse indicator */}
                {isMonitoring && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-white text-xs sm:text-sm font-satoshi mr-2 min-w-0 truncate group-hover:text-[#E2AF19] transition-colors block">
                  {activeWalletData.name}
                </span>

                {/* Real-time balance display */}
                <div className="flex items-center text-xs text-gray-400">
                  <span>${activeWalletData.balance.toFixed(2)}</span>
                  {activeWalletData.changeAmount &&
                    Math.abs(activeWalletData.changeAmount) > 0.01 && (
                      <span
                        className={`ml-1 flex items-center ${
                          activeWalletData.changeAmount > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {activeWalletData.changeAmount > 0 ? (
                          <TrendingUp size={10} />
                        ) : (
                          <TrendingDown size={10} />
                        )}
                        <span className="ml-1">
                          ${Math.abs(activeWalletData.changeAmount).toFixed(2)}
                        </span>
                      </span>
                    )}
                </div>
              </div>

              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>

              <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
                {activeWalletData.address
                  ? `${activeWalletData.address.slice(
                      0,
                      6
                    )}...${activeWalletData.address.slice(-4)}`
                  : "Loading..."}
              </span>

              <ChevronDown
                size={14}
                className="text-gray-400 group-hover:text-[#E2AF19] transition-colors lg:w-4 lg:h-4"
              />
            </button>
          )}

          {/* Action Icons Container */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
              <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
                <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
              </button>

              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>

              <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
                <Settings size={16} className="text-gray-400 lg:w-5 lg:h-5" />
              </button>

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

      {/* Rest of your existing dashboard content remains the same */}
      {wallets.length === 0 ? (
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
          {/* Your existing empty state content */}
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
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

      {/* Existing modals */}
      <WalletWelcomeModal
        isOpen={welcomeModalOpen}
        onClose={() => setWelletWelcomeModalOpen(false)}
        userName={user?.displayName || user?.name || "User"}
        onWalletCreated={handleWalletCreated}
      />

      {/* UPDATED: Pass wallet selection handler to RealtimeWalletSwitcher */}
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
