// src/components/wallet/WalletSwitcher.tsx - FIXED: Load all wallet balances with hook
"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Plus, RefreshCw } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { setActiveWallet, fetchWallets } from "@/store/slices/walletSlice";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import Button from "@/components/ui/Button";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";
import { Skeleton } from "@/components/ui/Skeleton";

interface WalletSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletSwitcher({
  isOpen,
  onClose,
}: WalletSwitcherProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );
  const { user } = useSelector((state: RootState) => state.auth);

  // Use the wallet balances hook
  const {
    walletsWithBalances,
    loading: loadingBalances,
    refreshAllBalances,
  } = useWalletBalances();

  // State for wallet modal
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [copied, setCopied] = useState<string>("");

  if (!isOpen) return null;

  const handleSelectWallet = (walletId: string) => {
    dispatch(setActiveWallet(walletId));
    onClose();
  };

  const handleAddWallet = () => {
    setWalletModalOpen(true);
  };

  const handleWalletCreated = () => {
    // Refresh wallets after creation
    dispatch(fetchWallets());
    setWalletModalOpen(false);
  };

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const getWalletColor = (index: number) => {
    const colors = [
      "bg-gradient-to-br from-blue-400 to-cyan-400",
      "bg-gradient-to-br from-purple-400 to-pink-400",
      "bg-gradient-to-br from-green-400 to-emerald-400",
      "bg-gradient-to-br from-orange-400 to-red-400",
      "bg-gradient-to-br from-indigo-400 to-purple-400",
    ];
    return colors[index % colors.length];
  };

  // Use walletsWithBalances from the hook, with fallback to basic wallet data
  const displayWallets =
    walletsWithBalances.length > 0
      ? walletsWithBalances
      : wallets.map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          balance: wallet.balance || 0,
          tokenCount: 0,
          isActive: activeWallet?.id === wallet.id,
        }));

  return (
    <>
      {/* Main Wallet Switcher Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
            <div>
              <h2 className="text-xl font-bold text-white font-mayeka">
                Wallet Manager
              </h2>
              <p className="text-gray-400 text-sm font-satoshi mt-1">
                Switch between wallets or manage your accounts
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Wallets List */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* UPDATED: Show skeleton when loading balances */}
            {loadingBalances && walletsWithBalances.length === 0 && (
              <div className="space-y-3 mb-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg p-4"
                  >
                    <div className="flex items-center">
                      <Skeleton variant="circular" className="w-10 h-10 mr-3" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton variant="circular" className="w-2 h-2 ml-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 mb-6">
              {displayWallets.map((wallet, index) => {
                const isActive = activeWallet?.id === wallet.id;
                return (
                  <button
                    key={wallet.id}
                    onClick={() => handleSelectWallet(wallet.id)}
                    className={`w-full flex items-center p-4 rounded-lg transition-all duration-200 text-left ${
                      isActive
                        ? "bg-[#E2AF19] text-black"
                        : "bg-[#0F0F0F] border border-[#2C2C2C] text-white hover:bg-[#1A1A1A] hover:border-[#E2AF19]"
                    }`}
                  >
                    {/* Wallet Icon */}
                    <div
                      className={`w-10 h-10 ${getWalletColor(
                        index
                      )} rounded-full mr-3 flex items-center justify-center relative flex-shrink-0`}
                    >
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

                    {/* Wallet Info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium font-satoshi ${
                          isActive ? "text-black" : "text-white"
                        }`}
                      >
                        {wallet.name}
                      </div>
                      <div
                        className={`text-sm font-satoshi truncate ${
                          isActive ? "text-black opacity-70" : "text-gray-400"
                        }`}
                      >
                        {wallet.address
                          ? `${wallet.address.slice(
                              0,
                              8
                            )}...${wallet.address.slice(-6)}`
                          : "Loading..."}
                      </div>
                    </div>

                    {/* Balance and Token Count */}
                    <div className="text-right mr-3">
                      <div
                        className={`font-medium font-satoshi ${
                          isActive ? "text-black" : "text-white"
                        }`}
                      >
                        {/* FIXED: Show real balance with better loading state */}
                        {loadingBalances && walletsWithBalances.length === 0 ? (
                          <div className="flex items-center">
                            <RefreshCw
                              size={12}
                              className="mr-1 animate-spin"
                            />
                            <span className="text-xs">Loading...</span>
                          </div>
                        ) : (
                          formatBalance(wallet.balance)
                        )}
                      </div>
                      <div
                        className={`text-sm font-satoshi ${
                          isActive ? "text-black opacity-70" : "text-gray-400"
                        }`}
                      >
                        {wallet.tokenCount || 0} tokens
                      </div>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-black rounded-full"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Add Wallet Button */}
            <Button
              onClick={handleAddWallet}
              variant="secondary"
              className="w-full font-satoshi"
              size="lg"
            >
              <Plus size={18} className="mr-2" />
              Add Wallet
            </Button>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#2C2C2C] bg-[#0F0F0F]">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#E2AF19] rounded-full flex items-center justify-center mr-3">
                  <span className="text-black text-sm font-bold">B</span>
                </div>
                <div>
                  <div className="text-white text-sm font-satoshi font-medium">
                    {user?.displayName || user?.name || "User"}
                  </div>
                  <div className="text-gray-400 text-xs font-satoshi">
                    {wallets.length} wallet{wallets.length !== 1 ? "s" : ""}{" "}
                    connected
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-sm font-satoshi"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Welcome Modal */}
      <WalletWelcomeModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        userName={user?.displayName || user?.name || "User"}
        onWalletCreated={handleWalletCreated}
      />
    </>
  );
}
