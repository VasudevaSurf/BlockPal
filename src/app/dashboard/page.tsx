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
        className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="20"
          viewBox="0 0 29 20"
          fill="none"
        >
          <path
            d="M2 2H27.3521"
            stroke="white"
            strokeWidth="2.11268"
            strokeLinecap="round"
          />
          <path
            d="M2 10H19"
            stroke="white"
            strokeWidth="2.11268"
            strokeLinecap="round"
          />
          <path
            d="M2 18H13"
            stroke="white"
            strokeWidth="2.11268"
            strokeLinecap="round"
          />
        </svg>
      </button>,
      container
    );
  };

  return (
    <>
      <RightHamburgerButton />

      <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[16px] p-4 sm:p-5 lg:p-1 flex flex-col overflow-hidden">
        {/* Error Display */}
        {dashboardState.error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2 mb-2">
            <p className="text-red-400 text-xs font-satoshi">
              {dashboardState.error}
            </p>
          </div>
        )}

        {/* Main Dashboard Content */}
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Mobile Layout */}
          <div className="flex xl:hidden flex-col gap-4 lg:gap-4 flex-1 min-h-0 overflow-hidden">
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
            <div className="flex-1 min-h-0 -mb-4">
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