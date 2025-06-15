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
    <div className="bg-black rounded-[20px] p-6 border border-[#2C2C2C] flex-shrink-0 h-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white font-satoshi">
          Wallet Balance
        </h2>
        <div className="flex items-center space-x-3">
          <span className="text-gray-400 text-sm font-satoshi">
            0xA57643dhw64...R8J6153
          </span>
          <button
            onClick={() => copyToClipboard(activeWallet?.address || "")}
            className="text-black hover:bg-[#D4A853] transition-colors bg-[#E2AF19] bg-opacity-100 px-3 py-1 rounded-full text-xs font-satoshi flex items-center gap-1"
          >
            copy
            <Copy size={12} className="text-black" />
          </button>
        </div>
      </div>

      <div>
        <div className="text-4xl font-bold text-white mb-2 font-satoshi">
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
