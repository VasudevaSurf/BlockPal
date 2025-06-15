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
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white font-mayeka">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg px-3 py-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-white text-sm font-satoshi mr-1">
              Wallet 1
            </span>
            <span className="text-gray-400 text-sm font-satoshi">
              0xA57643dhw64...R8J6153
            </span>
          </div>

          {/* Icons */}
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors">
              <Bell size={20} className="text-gray-400" />
            </button>
            <button className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors">
              <HelpCircle size={20} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-6">
          {/* Left Column - Wallet Balance & Token Holdings */}
          <div className="xl:col-span-2 space-y-6">
            <WalletBalance />
            <TokenList />
          </div>

          {/* Right Column - Swap Section */}
          <div className="xl:col-span-1">
            <SwapSection />
          </div>
        </div>
      </div>
    </div>
  );
}
