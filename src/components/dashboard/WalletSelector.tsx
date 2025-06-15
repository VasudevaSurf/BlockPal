"use client";

import { useSelector, useDispatch } from "react-redux";
import { X, Plus } from "lucide-react";
import { RootState } from "@/store";
import { closeWalletSelector } from "@/store/slices/uiSlice";
import { setActiveWallet } from "@/store/slices/walletSlice";
import Button from "@/components/ui/Button";

export default function WalletSelector() {
  const dispatch = useDispatch();
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );

  const handleSelectWallet = (walletId: string) => {
    dispatch(setActiveWallet(walletId));
    dispatch(closeWalletSelector());
  };

  const handleClose = () => {
    dispatch(closeWalletSelector());
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const getWalletColor = (index: number) => {
    const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500"];
    return colors[index % colors.length];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-500 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Select Wallet</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {wallets.map((wallet, index) => (
            <button
              key={wallet.id}
              onClick={() => handleSelectWallet(wallet.id)}
              className={`w-full flex items-center p-4 rounded-lg transition-colors ${
                wallet.isActive
                  ? "bg-primary-500 text-black"
                  : "bg-dark-400 hover:bg-dark-300 text-white"
              }`}
            >
              <div
                className={`w-3 h-3 ${getWalletColor(index)} rounded-full mr-3`}
              ></div>
              <div className="flex-1 text-left">
                <div className="font-medium">{wallet.name}</div>
                <div
                  className={`text-sm ${
                    wallet.isActive ? "text-black opacity-70" : "text-gray-400"
                  }`}
                >
                  {wallet.address}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatBalance(wallet.balance)}
                </div>
              </div>
              {wallet.isActive && (
                <div className="ml-3">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                </div>
              )}
            </button>
          ))}
        </div>

        <Button className="w-full" variant="secondary">
          <Plus size={20} className="mr-2" />
          Add wallet
        </Button>
      </div>
    </div>
  );
}
