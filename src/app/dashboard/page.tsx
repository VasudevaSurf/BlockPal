"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { Bell, HelpCircle } from "lucide-react";
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[20px] p-6 flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white font-mayeka">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-4 py-3">
            <div className="w-8 h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-3 flex items-center justify-center relative">
              {/* Grid pattern overlay */}
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "8px 8px",
                }}
              ></div>
            </div>
            <span className="text-white text-sm font-satoshi mr-2">
              Wallet 1
            </span>

            {/* Divider */}
            <div className="w-px h-4 bg-[#2C2C2C] mr-3"></div>

            <span className="text-gray-400 text-sm font-satoshi mr-3">
              0xAD7a4hw64...R8J6153
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 py-3">
            <button className="p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={20} className="text-gray-400" />
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-[#2C2C2C] mx-2"></div>

            <button className="p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={20} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Properly sized grid layout */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Column - Wallet Balance & Token Holdings */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Wallet Balance - Fixed height */}
          <div className="flex-shrink-0">
            <WalletBalance />
          </div>

          {/* Token Holdings - Takes remaining space */}
          <div className="flex-1 min-h-0">
            <TokenList />
          </div>
        </div>

        {/* Right Column - Swap Section - Fixed width */}
        <div className="w-[400px] flex-shrink-0 h-full">
          <SwapSection />
        </div>
      </div>
    </div>
  );
}
