"use client";

import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { Copy, ChevronDown } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { openWalletSelector } from "@/store/slices/uiSlice";
import { updateWalletBalance } from "@/store/slices/walletSlice";

export default function WalletBalance() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet, totalBalance, loading } = useSelector(
    (state: RootState) => state.wallet
  );

  useEffect(() => {
    // Update wallet balance when component mounts or active wallet changes
    if (activeWallet?.address) {
      dispatch(updateWalletBalance(activeWallet.address));
    }
  }, [activeWallet?.address, dispatch]);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Address copied to clipboard");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleWalletClick = () => {
    dispatch(openWalletSelector());
  };

  if (loading) {
    return (
      <div className="bg-black rounded-[16px] lg:rounded-[20px] p-4 lg:p-6 border border-[#2C2C2C] flex-shrink-0 h-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-[16px] lg:rounded-[20px] p-4 lg:p-6 border border-[#2C2C2C] flex-shrink-0 h-auto">
      {/* Header - Responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-0">
        <h2 className="text-base lg:text-lg font-semibold text-white font-satoshi">
          Wallet Balance
        </h2>

        {/* Address and Copy Button - Responsive */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <span className="text-gray-400 text-xs sm:text-sm font-satoshi truncate max-w-[150px] sm:max-w-none">
            {activeWallet?.address || "No wallet selected"}
          </span>
          {activeWallet?.address && (
            <button
              onClick={() => copyToClipboard(activeWallet.address)}
              className="text-black hover:bg-[#D4A853] transition-colors bg-[#E2AF19] bg-opacity-100 px-2 sm:px-3 py-1 rounded-full text-xs font-satoshi flex items-center gap-1 flex-shrink-0"
            >
              copy
              <Copy size={10} className="text-black sm:w-3 sm:h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Wallet Selector - Click to change wallet */}
      <div 
        className="mb-4 cursor-pointer"
        onClick={handleWalletClick}
      >
        <button className="flex items-center text-gray-400 hover:text-white transition-colors font-satoshi text-sm">
          <span className="mr-2">{activeWallet?.name || "Select Wallet"}</span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Balance Display - Responsive */}
      <div>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 font-satoshi">
          {formatBalance(totalBalance)}
        </div>
        <div className="flex items-center text-sm">
          <span className="text-green-400 mr-1 font-satoshi">+$177.56</span>
          <span className="text-green-400 font-satoshi">(0.30%)</span>
        </div>
      </div>
    </div>
  );
}