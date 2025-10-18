"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";
import WalletStats from "@/components/dashboard/WalletStats";
import MobileWalletMenu from "@/components/dashboard/MobileWalletMenu";
import { WalletDataProvider } from "@/contexts/WalletDataContext";

// Mock authentication state
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
  hasWallets: boolean;
  error: string | null;
  showStats: boolean;
  mobileMenuOpen: boolean;
}

// Dashboard Content Component
function DashboardContent() {
  const router = useRouter();

  const { isAuthenticated, loading: authLoading, user } = mockAuth;

  const [dashboardState, setDashboardState] = useState<DashboardState>({
    hasWallets: false,
    error: null,
    showStats: false,
    mobileMenuOpen: false,
  });

  useEffect(() => {
    console.log("🔍 Dashboard - Checking auth status");

    if (!isAuthenticated) {
      console.log("🚪 Dashboard - Not authenticated, redirecting to auth");
      router.push("/auth");
      return;
    }

    setDashboardState((prev) => ({
      ...prev,
      hasWallets: true,
      error: null,
      showStats: localStorage.getItem("show-wallet-stats") === "true",
    }));

    console.log("📊 Dashboard initialized with mock data");
  }, [isAuthenticated, router]);

  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh requested");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#000000] border-b border-[#2C2C2C] flex-shrink-0">
        <h1 className="text-white text-lg font-mayeka font-semibold">
          Dashboard
        </h1>
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
        </button>
      </div>

      <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[16px] p-4 sm:p-5 lg:p-1 pb-10 lg:pb-1 flex flex-col overflow-hidden">
        {/* Error Display */}
        {dashboardState.error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2 mb-2">
            <p className="text-red-400 text-xs font-satoshi">
              {dashboardState.error}
            </p>
            <button
              onClick={handleManualRefresh}
              className="text-red-400 underline text-xs mt-1"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Main Dashboard Content */}
        {dashboardState.hasWallets ? (
          <div className="flex flex-col xl:flex-row gap-4 lg:gap-4 flex-1 min-h-0">
            {/* Mobile Layout */}
            <div className="flex xl:hidden flex-col gap-4 lg:gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              <div className="flex-shrink-0">
                <WalletBalance />
              </div>
              <div className="flex-1 min-h-0 mb-4">
                <TokenList />
              </div>
              {dashboardState.showStats && (
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
              {dashboardState.showStats && (
                <div className="flex-shrink-0">
                  <WalletStats />
                </div>
              )}
            </div>

            <div className="hidden xl:block w-[32%] min-w-[360px] max-w-[440px] flex-shrink-0 h-full">
              <SwapSection />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-black text-2xl font-bold">₿</span>
              </div>
              <h3 className="text-white text-lg font-satoshi font-semibold mb-2">
                Welcome to Blockpal, {user?.displayName || user?.name || "User"}
              </h3>
              <p className="text-gray-400 font-satoshi text-sm mb-4">
                Create or import a wallet to get started with your crypto
                journey
              </p>
              <button
                onClick={() => {
                  console.log("🆕 Creating wallet (demo)");
                  setDashboardState((prev) => ({
                    ...prev,
                    hasWallets: true,
                  }));
                }}
                className="px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
              >
                Get Started
              </button>
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

      {/* Mobile Wallet Menu Modal */}
      <MobileWalletMenu
        isOpen={dashboardState.mobileMenuOpen}
        onClose={() =>
          setDashboardState((prev) => ({ ...prev, mobileMenuOpen: false }))
        }
      />
    </>
  );
}

// Main Dashboard Page Component with Providers
export default function DashboardPage() {
  return (
    <WalletDataProvider>
      <DashboardContent />
    </WalletDataProvider>
  );
}
