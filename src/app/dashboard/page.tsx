// src/app/dashboard/page.tsx - Updated without header (now uses global header)
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
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import RealtimeWalletSwitcher from "@/components/wallet/RealtimeWalletSwitcher";
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

  // Active wallet sync effect - sync with database after wallets are loaded
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

  // Handle wallet selection with DB sync
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
      <div className="h-full flex items-center justify-center bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("🚪 Dashboard - User not authenticated, should redirect");
    return null;
  }

  console.log("🎨 Dashboard - Rendering main content", {
    activeWalletId: activeWallet?.id,
    walletCount: wallets.length,
  });

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* No header here anymore - it's in the global layout */}

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
