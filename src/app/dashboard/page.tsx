"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { Bell, Settings } from "lucide-react";
import { RootState } from "@/store";
import { setActiveWallet } from "@/store/slices/walletSlice";
import WalletBalance from "@/components/dashboard/WalletBalance";
import TokenList from "@/components/dashboard/TokenList";
import SwapSection from "@/components/dashboard/SwapSection";

export default function DashboardPage() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    // Set first wallet as active if none is set
    if (!activeWallet && wallets.length > 0) {
      const activeWalletFromState =
        wallets.find((w) => w.isActive) || wallets[0];
      dispatch(setActiveWallet(activeWalletFromState.id));
    }
  }, [isAuthenticated, router, activeWallet, wallets, dispatch]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Fixed and Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Dashboard
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0">
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
            <span className="text-white text-xs sm:text-sm font-satoshi mr-2 min-w-0 truncate">
              Wallet 1
            </span>

            {/* Divider */}
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>

            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              0xAD7a4hw64...R8J6153
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>

            {/* Divider */}
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>

            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Settings size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Grid */}
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
    </div>
  );
}
