"use client";

import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef } from "react";
import { Copy, ChevronDown } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { openWalletSelector } from "@/store/slices/uiSlice";
import { updateWalletBalance } from "@/store/slices/walletSlice";

export default function WalletBalance() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet, totalBalance, loading } = useSelector(
    (state: RootState) => state.wallet
  );

  // Use ref to prevent duplicate balance updates
  const balanceLoaded = useRef<string | null>(null);

  useEffect(() => {
    console.log("💰 WalletBalance - Effect triggered", {
      activeWalletAddress: activeWallet?.address,
      balanceLoadedFor: balanceLoaded.current,
      shouldUpdate:
        activeWallet?.address && balanceLoaded.current !== activeWallet.address,
    });

    // Only update balance if we have an active wallet and haven't already loaded balance for this wallet
    if (
      activeWallet?.address &&
      balanceLoaded.current !== activeWallet.address
    ) {
      console.log(
        "📡 WalletBalance - Updating balance for wallet:",
        activeWallet.address
      );
      balanceLoaded.current = activeWallet.address;
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

  // Only use real balance from database
  const displayBalance = totalBalance;

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
            {activeWallet?.address
              ? `${activeWallet.address.slice(
                  0,
                  6
                )}...${activeWallet.address.slice(-4)}`
              : "No wallet selected"}
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

      {/* Balance Display - Responsive */}
      <div>
        {displayBalance > 0 ? (
          <>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 font-satoshi">
              {formatBalance(displayBalance)}
            </div>
            <div className="flex items-center text-sm">
              <span className="text-green-400 mr-1 font-satoshi">+$177.56</span>
              <span className="text-green-400 font-satoshi">(0.30%)</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 font-satoshi">
              {formatBalance(0)}
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-400 font-satoshi">
                No balance available
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
