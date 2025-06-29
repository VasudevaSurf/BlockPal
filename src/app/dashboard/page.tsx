// src/app/dashboard/page.tsx - UPDATED TO USE ENHANCED EXECUTOR
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
  Play,
  Pause,
  Zap,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus, logoutUser } from "@/store/slices/authSlice";
import { fetchWallets, setActiveWallet } from "@/store/slices/walletSlice";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import WalletSwitcher from "@/components/wallet/WalletSwitcher";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";

// UPDATED: Import the enhanced payment executor
import { enhancedWebScheduledPaymentExecutor } from "@/lib/enhanced-web-scheduled-payment-executor";

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

  // UPDATED: Enhanced payment executor state
  const [executorRunning, setExecutorRunning] = useState(false);
  const [executorStatus, setExecutorStatus] = useState<any>(null);
  const executorInitialized = useRef(false);

  // Wallet switcher state
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

  // Use refs to track if we've already made initial calls
  const authChecked = useRef(false);
  const walletsLoaded = useRef(false);
  const activeWalletSet = useRef(false);

  // UPDATED: Initialize enhanced payment executor when user is authenticated and has wallets
  useEffect(() => {
    console.log("🔧 Enhanced Payment executor initialization effect", {
      isAuthenticated,
      hasActiveWallet: !!activeWallet,
      executorInitialized: executorInitialized.current,
    });

    if (isAuthenticated && activeWallet && !executorInitialized.current) {
      console.log("🚀 Initializing enhanced payment executor...");

      // Get private key from the wallet and start enhanced executor
      initializeEnhancedPaymentExecutor();
      executorInitialized.current = true;
    }
  }, [isAuthenticated, activeWallet]);

  // UPDATED: Update enhanced executor status periodically
  useEffect(() => {
    if (executorRunning) {
      const statusInterval = setInterval(() => {
        const status = enhancedWebScheduledPaymentExecutor.getStatus();
        setExecutorStatus(status);
      }, 5000); // Update every 5 seconds

      return () => clearInterval(statusInterval);
    }
  }, [executorRunning]);

  // UPDATED: Initialize enhanced payment executor
  const initializeEnhancedPaymentExecutor = async () => {
    try {
      if (!activeWallet?.address) {
        console.log("❌ No active wallet found for enhanced executor");
        return;
      }

      console.log("🔑 Getting private key for enhanced payment executor...");

      // Get the private key from your wallet API
      const response = await fetch("/api/wallets/private-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ Private key retrieved, starting enhanced executor...");

        // Set the private key and start the enhanced executor
        enhancedWebScheduledPaymentExecutor.setPrivateKey(data.privateKey);
        enhancedWebScheduledPaymentExecutor.start();

        setExecutorRunning(true);
        setExecutorStatus(enhancedWebScheduledPaymentExecutor.getStatus());

        console.log("✅ Enhanced payment executor started successfully!");

        // Show notification
        if ("Notification" in window && Notification.permission !== "denied") {
          if (Notification.permission === "granted") {
            new Notification("Enhanced Auto-Payment System Started", {
              body: "Scheduled payments will now be executed automatically with 30% lower gas fees",
              icon: "/favicon.ico",
            });
          } else {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                new Notification("Enhanced Auto-Payment System Started", {
                  body: "Scheduled payments will now be executed automatically with 30% lower gas fees",
                  icon: "/favicon.ico",
                });
              }
            });
          }
        }
      } else {
        console.error("❌ Failed to get private key:", data.error);
      }
    } catch (error) {
      console.error("💥 Error initializing enhanced payment executor:", error);
    }
  };

  // UPDATED: Toggle enhanced executor
  const toggleEnhancedExecutor = () => {
    if (executorRunning) {
      console.log("🛑 Stopping enhanced payment executor...");
      enhancedWebScheduledPaymentExecutor.stop();
      setExecutorRunning(false);
      setExecutorStatus(null);
    } else {
      console.log("🚀 Starting enhanced payment executor...");
      initializeEnhancedPaymentExecutor();
    }
  };

  // UPDATED: Cleanup enhanced executor on unmount
  useEffect(() => {
    return () => {
      if (executorRunning) {
        console.log("🧹 Cleaning up enhanced payment executor...");
        enhancedWebScheduledPaymentExecutor.stop();
      }
    };
  }, []);

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
      // UPDATED: Stop enhanced executor before logout
      if (executorRunning) {
        enhancedWebScheduledPaymentExecutor.stop();
        setExecutorRunning(false);
      }

      await dispatch(logoutUser());
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth");
    }
  };

  // Set active wallet effect
  useEffect(() => {
    console.log("🎯 Dashboard - Active wallet effect", {
      activeWallet: !!activeWallet,
      walletsLength: wallets.length,
      activeWalletSet: activeWalletSet.current,
    });

    if (!activeWallet && wallets.length > 0 && !activeWalletSet.current) {
      console.log("🎯 Setting active wallet...");
      activeWalletSet.current = true;
      const defaultWallet = wallets.find((w) => w.isDefault) || wallets[0];
      dispatch(setActiveWallet(defaultWallet.id));
    }
  }, [activeWallet, wallets, dispatch]);

  const handleWalletCreated = () => {
    walletsLoaded.current = false;
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

  console.log("🎨 Dashboard - Rendering main content");

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Fixed and Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Dashboard
          </h1>
          <p className="text-gray-400 text-sm font-satoshi mt-1">
            Welcome back, {user?.displayName || user?.name || "User"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* UPDATED: Enhanced Payment Executor Status */}
          {/* {wallets.length > 0 && (
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3">
              <button
                onClick={toggleEnhancedExecutor}
                className="flex items-center space-x-2"
                title={`Enhanced Auto-Payment System: ${
                  executorRunning ? "Running" : "Stopped"
                }`}
              >
                {executorRunning ? (
                  <Zap
                    size={16}
                    className="text-green-400 lg:w-5 lg:h-5 animate-pulse"
                  />
                ) : (
                  <Play size={16} className="text-gray-400 lg:w-5 lg:h-5" />
                )}
                <span
                  className={`text-xs sm:text-sm font-satoshi ${
                    executorRunning ? "text-green-400" : "text-gray-400"
                  }`}
                >
                  Enhanced Auto-Pay {executorRunning ? "ON" : "OFF"}
                </span>
              </button>

              {executorStatus && executorRunning && (
                <div className="ml-2 text-xs text-gray-400">
                  ({executorStatus.processingPayments?.length || 0} processing)
                </div>
              )}
            </div>
          )} */}

          {/* Wallet Selector */}
          {wallets.length > 0 && (
            <button
              onClick={() => setWalletSwitcherOpen(true)}
              className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto hover:border-[#E2AF19] transition-colors group"
            >
              <div
                className={`w-6 h-6 lg:w-8 lg:h-8 ${getWalletColor(
                  0
                )} rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0`}
              >
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

              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>

              <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
                {activeWallet?.address
                  ? `${activeWallet.address.slice(
                      0,
                      6
                    )}...${activeWallet.address.slice(-4)}`
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

      {/* Rest of your existing dashboard content */}
      {wallets.length === 0 ? (
        // Your existing empty dashboard states
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
          {/* ... existing empty state code ... */}
        </div>
      ) : (
        // Your existing normal dashboard content
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
          {/* ... existing dashboard content ... */}
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
        onClose={() => setWelcomeModalOpen(false)}
        userName={user?.displayName || user?.name || "User"}
        onWalletCreated={handleWalletCreated}
      />

      {wallets.length > 0 && (
        <WalletSwitcher
          isOpen={walletSwitcherOpen}
          onClose={() => setWalletSwitcherOpen(false)}
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
