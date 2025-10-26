// src/app/dashboard/page.tsx - UPDATED: Removed old mobile header, using layout header
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import WalletStats from "@/components/dashboard/WalletStats";
import MobileWalletMenu from "@/components/dashboard/MobileWalletMenu";
import { useWalletData } from "@/contexts/WalletDataContext";
import { createPortal } from "react-dom";

const mockAuth = {
  isAuthenticated: true,
  loading: false,
  user: {
    id: "user123",
    username: "demouser",
    displayName: "Demo User",
    name: "Demo User",
  },
};

interface DashboardState {
  error: string | null;
  showStats: boolean;
  mobileMenuOpen: boolean;
}

function DashboardContent() {
  const router = useRouter();
  const { isAuthenticated, user } = mockAuth;
  const { address, isConnected } = useAccount();
  const { walletData } = useWalletData();

  const hasWallets = useMemo(() => {
    return isConnected || walletData.cacheValid || walletData.tokens.length > 0;
  }, [isConnected, walletData.cacheValid, walletData.tokens.length]);

  const [dashboardState, setDashboardState] = useState<DashboardState>({
    error: null,
    showStats: false,
    mobileMenuOpen: false,
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log("🔍 Dashboard - Checking auth status");

    if (!isAuthenticated) {
      console.log("🚪 Dashboard - Not authenticated, redirecting to auth");
      router.push("/auth");
      return;
    }

    setDashboardState((prev) => ({
      ...prev,
      error: null,
      showStats: localStorage.getItem("show-wallet-stats") === "true",
    }));

    console.log("📊 Dashboard initialized with hasWallets:", hasWallets);
  }, [isAuthenticated, router, hasWallets]);

  if (!isAuthenticated) {
    return null;
  }

  // Right hamburger button for mobile wallet menu
  const RightHamburgerButton = () => {
    if (!mounted) return null;

    const container = document.getElementById("mobile-wallet-menu-trigger");
    if (!container) return null;

    return createPortal(
      <button
        onClick={() =>
          setDashboardState((prev) => ({ ...prev, mobileMenuOpen: true }))
        }
        className="p-2 bg-[#1A1A1A] hover:bg-[#2C2C2C] rounded-lg transition-colors border border-[#2C2C2C]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E2AF19"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      </button>,
      container
    );
  };

  return (
    <>
      <RightHamburgerButton />

      <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[16px] p-4 sm:p-5 lg:p-1 flex flex-col overflow-hidden pb-0 lg:pb-auto">
        {/* Error Display */}
        {dashboardState.error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2 mb-2">
            <p className="text-red-400 text-xs font-satoshi">
              {dashboardState.error}
            </p>
          </div>
        )}

        {/* Main Dashboard Content */}
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-4 flex-1 min-h-0 overflow-hidden pb-0 lg:pb-auto">
          {/* Mobile Layout */}
          <div className="flex xl:hidden flex-col gap-4 lg:gap-4 flex-1 min-h-0 overflow-hidden pb-0">
            <div className="flex-shrink-0">
              <WalletBalance />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TokenList />
            </div>
            {dashboardState.showStats && hasWallets && (
              <div className="flex-shrink-0">
                <WalletStats />
              </div>
            )}
          </div>

          {/* Desktop Layout */}
          <div className="hidden xl:flex flex-1 flex-col gap-4 min-w-0 max-w-[68%]">
            <div className="flex-shrink-0">
              <WalletBalance />
            </div>
            <div className="flex-1 min-h-0 -mb-0 lg:-mb-4">
              <TokenList />
            </div>
            {dashboardState.showStats && hasWallets && (
              <div className="flex-shrink-0">
                <WalletStats />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - SwapSection (Trending/Gainers) - ALWAYS SHOW */}
          <div className="hidden xl:block w-[32%] min-w-[360px] max-w-[440px] flex-shrink-0 h-full">
            <SwapSection />
          </div>
        </div>

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

      <MobileWalletMenu
        isOpen={dashboardState.mobileMenuOpen}
        onClose={() =>
          setDashboardState((prev) => ({ ...prev, mobileMenuOpen: false }))
        }
      />
    </>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
