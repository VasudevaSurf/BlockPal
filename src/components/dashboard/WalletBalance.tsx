"use client";

import { useSelector, useDispatch } from "react-redux";
import { Copy, ChevronDown } from "lucide-react";
import { RootState } from "@/store";
import { openWalletSelector } from "@/store/slices/uiSlice";

export default function WalletBalance() {
  const dispatch = useDispatch();
  const { activeWallet, totalBalance } = useSelector(
    (state: RootState) => state.wallet
  );

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
            0xA57643dhw64...R8J6153
          </span>
          <button
            onClick={() => copyToClipboard(activeWallet?.address || "")}
            className="text-black hover:bg-[#D4A853] transition-colors bg-[#E2AF19] bg-opacity-100 px-2 sm:px-3 py-1 rounded-full text-xs font-satoshi flex items-center gap-1 flex-shrink-0"
          >
            copy
            <Copy size={10} className="text-black sm:w-3 sm:h-3" />
          </button>
        </div>
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
