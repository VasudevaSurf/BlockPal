// src/components/wallet/WalletSwitcher.tsx
"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Wallet,
  Copy,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { setActiveWallet } from "@/store/slices/walletSlice";
import Button from "@/components/ui/Button";

interface WalletSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletSwitcher({
  isOpen,
  onClose,
}: WalletSwitcherProps) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );
  const [copied, setCopied] = useState<string>("");
  const [showPrivateKeys, setShowPrivateKeys] = useState<
    Record<string, boolean>
  >({});

  const handleSelectWallet = (walletId: string) => {
    dispatch(setActiveWallet(walletId));
    onClose();
  };

  const handleAddWallet = () => {
    router.push("/dashboard/wallet-setup");
    onClose();
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const togglePrivateKeyVisibility = (walletId: string) => {
    setShowPrivateKeys((prev) => ({
      ...prev,
      [walletId]: !prev[walletId],
    }));
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-2xl max-h-[90vh] overflow-hidden">
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

        {/* Wallet List */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
          <div className="space-y-4">
            {wallets.map((wallet, index) => (
              <div
                key={wallet.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  wallet.id === activeWallet?.id
                    ? "border-[#E2AF19] bg-[#E2AF19]/10"
                    : "border-[#2C2C2C] hover:border-[#4C4C4C] bg-[#0F0F0F]"
                }`}
              >
                {/* Wallet Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
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
                          backgroundSize: "4px 4px",
                        }}
                      ></div>
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-white font-semibold font-satoshi">
                          {wallet.name}
                        </h3>
                        {wallet.id === activeWallet?.id && (
                          <CheckCircle2
                            size={16}
                            className="text-[#E2AF19] ml-2"
                          />
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="text-gray-400 text-sm font-satoshi">
                          {wallet.address.slice(0, 8)}...
                          {wallet.address.slice(-6)}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              wallet.address,
                              `address-${wallet.id}`
                            )
                          }
                          className="ml-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                        {copied === `address-${wallet.id}` && (
                          <span className="text-green-400 text-xs ml-1">
                            Copied!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wallet Balance */}
                  <div className="text-right">
                    <div className="text-white font-semibold font-satoshi">
                      {formatBalance(wallet.balance)}
                    </div>
                    <div className="text-gray-400 text-xs font-satoshi">
                      Portfolio Value
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* Select Wallet Button */}
                    {wallet.id !== activeWallet?.id && (
                      <button
                        onClick={() => handleSelectWallet(wallet.id)}
                        className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                      >
                        Select
                      </button>
                    )}

                    {/* Settings Button */}
                    <button className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg">
                      <Settings size={14} />
                    </button>

                    {/* Delete Button */}
                    <button className="text-gray-400 hover:text-red-400 transition-colors p-1.5 hover:bg-red-900/20 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Private Key Section */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => togglePrivateKeyVisibility(wallet.id)}
                      className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
                      title={
                        showPrivateKeys[wallet.id]
                          ? "Hide private key"
                          : "Show private key"
                      }
                    >
                      {showPrivateKeys[wallet.id] ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>

                    {showPrivateKeys[wallet.id] && (
                      <div className="flex items-center">
                        <span className="text-gray-400 text-xs font-mono mr-2">
                          0x***...{wallet.address.slice(-4)}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              "private-key-placeholder",
                              `pk-${wallet.id}`
                            )
                          }
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                        {copied === `pk-${wallet.id}` && (
                          <span className="text-green-400 text-xs ml-1">
                            Copied!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add Wallet Card */}
            <button
              onClick={handleAddWallet}
              className="w-full p-6 border-2 border-dashed border-[#2C2C2C] hover:border-[#E2AF19] rounded-xl transition-colors text-center group"
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#2C2C2C] group-hover:bg-[#E2AF19]/20 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <Plus
                    size={24}
                    className="text-gray-400 group-hover:text-[#E2AF19] transition-colors"
                  />
                </div>
                <h3 className="text-white font-semibold font-satoshi mb-1">
                  Add New Wallet
                </h3>
                <p className="text-gray-400 text-sm font-satoshi">
                  Import existing or create new wallet
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2C2C2C] bg-[#0F0F0F]">
          <div className="flex items-center justify-between">
            <div className="text-gray-400 text-sm font-satoshi">
              {wallets.length} wallet{wallets.length !== 1 ? "s" : ""} connected
            </div>
            <div className="flex space-x-3">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleAddWallet}>
                <Plus size={16} className="mr-2" />
                Add Wallet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
