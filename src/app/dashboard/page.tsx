// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus } from "@/store/slices/authSlice";
import { fetchWallets } from "@/store/slices/walletSlice";
import NewDashboard from "@/components/dashboard/NewDashboard";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const {
    isAuthenticated,
    loading: authLoading,
    user,
  } = useSelector((state: RootState) => state.auth);
  const {
    wallets,
    activeWallet,
    loading: walletsLoading,
  } = useSelector((state: RootState) => state.wallet);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      dispatch(checkAuthStatus());
    }
  }, [dispatch, authLoading, isAuthenticated]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load wallets
  useEffect(() => {
    if (isAuthenticated && user) {
      dispatch(fetchWallets()).then(() => {
        setIsInitialized(true);
      });
    }
  }, [isAuthenticated, user, dispatch]);

  // Show welcome modal if no wallets
  useEffect(() => {
    if (isInitialized && !walletsLoading && wallets.length === 0) {
      setShowWelcomeModal(true);
    }
  }, [isInitialized, walletsLoading, wallets.length]);

  // Handle wallet creation
  const handleWalletCreated = () => {
    setShowWelcomeModal(false);
    dispatch(fetchWallets());
  };

  // Loading state
  if (authLoading || (!isInitialized && walletsLoading)) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0F0F0F] rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E2AF19] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // No wallets state - show welcome modal
  if (
    !authLoading &&
    isAuthenticated &&
    wallets.length === 0 &&
    !showWelcomeModal
  ) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0F0F0F] rounded-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-black text-2xl font-bold">₿</span>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Welcome to Blockpal
          </h2>
          <p className="text-gray-400 mb-6">
            Setting up your wallet experience...
          </p>
          <button
            onClick={() => setShowWelcomeModal(true)}
            className="px-6 py-2 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors font-semibold"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // Main dashboard with wallets
  return (
    <div className="h-full">
      {/* Render the new dashboard when wallets exist */}
      {wallets.length > 0 && <NewDashboard />}

      {/* Welcome Modal for new users */}
      <WalletWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userName={user?.displayName || user?.name || "User"}
        onWalletCreated={handleWalletCreated}
      />
    </div>
  );
}
