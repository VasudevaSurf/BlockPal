// src/components/wallet/RealtimeWalletSwitcher.tsx - Real-time wallet switcher
"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  X,
  Plus,
  RefreshCw,
  Radio,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { setActiveWallet, fetchWallets } from "@/store/slices/walletSlice";
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";
import Button from "@/components/ui/Button";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";

interface RealtimeWalletSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RealtimeWalletSwitcher({
  isOpen,
  onClose,
}: RealtimeWalletSwitcherProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );
  const { user } = useSelector((state: RootState) => state.auth);

  // Use the real-time wallet balances hook
  const {
    realtimeBalances,
    isMonitoring,
    lastUpdateTime,
    refreshAllWallets,
    getMonitoringStatus,
  } = useRealtimeWalletBalances();

  // State for wallet modal
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  if (!isOpen) return null;

  const handleSelectWallet = (walletId: string) => {
    dispatch(setActiveWallet(walletId));
    onClose();
  };

  const handleAddWallet = () => {
    setWalletModalOpen(true);
  };

  const handleWalletCreated = () => {
    dispatch(fetchWallets());
    setWalletModalOpen(false);
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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

  const getBalanceChangeIndicator = (wallet: any) => {
    if (!wallet.changeAmount || Math.abs(wallet.changeAmount) < 0.01)
      return null;

    const isPositive = wallet.changeAmount > 0;
    return (
      <div
        className={`flex items-center text-xs ${
          isPositive ? "text-green-400" : "text-red-400"
        }`}
      >
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span className="ml-1">
          ${Math.abs(wallet.changeAmount).toFixed(2)}
        </span>
      </div>
    );
  };

  const monitoringStatus = getMonitoringStatus();

  return (
    <>
      {/* Main Wallet Switcher Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
            <div>
              <div className="flex items-center">
                <h2 className="text-xl font-bold text-white font-mayeka mr-2">
                  Wallets
                </h2>
                {/* Real-time indicator */}
                {/* <div className="flex items-center">
                  <Radio
                    size={12}
                    className={`mr-1 ${
                      isMonitoring
                        ? "text-green-400 animate-pulse"
                        : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      isMonitoring ? "text-green-400" : "text-gray-400"
                    }`}
                  >
                    {isMonitoring ? "LIVE" : "OFFLINE"}
                  </span>
                </div> */}
              </div>
              {/* <div className="flex items-center text-gray-400 text-sm font-satoshi mt-1">
                <span>Auto-updating every 15 seconds</span>
                {lastUpdateTime && (
                  <span className="ml-2 text-xs">
                    Last: {formatTime(lastUpdateTime)}
                  </span>
                )}
              </div> */}
            </div>
            <div className="flex items-center space-x-2">
              {/* Status button */}
              {/* <button
                onClick={() => setShowStatus(!showStatus)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors"
                title="Monitor status"
              >
                <Radio
                  size={16}
                  className={isMonitoring ? "text-green-400" : "text-gray-400"}
                />
              </button> */}

              {/* Manual refresh button */}
              <button
                onClick={refreshAllWallets}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors"
                title="Force refresh all balances"
              >
                <RefreshCw size={16} />
              </button>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Status Panel */}
          {showStatus && (
            <div className="p-4 bg-[#0F0F0F] border-b border-[#2C2C2C]">
              <h3 className="text-white font-semibold text-sm mb-2">
                Monitor Status
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-400">
                  Status:{" "}
                  <span
                    className={isMonitoring ? "text-green-400" : "text-red-400"}
                  >
                    {isMonitoring ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-gray-400">
                  Wallets:{" "}
                  <span className="text-white">
                    {monitoringStatus.walletsCount}
                  </span>
                </div>
                <div className="text-gray-400">
                  Interval:{" "}
                  <span className="text-white">
                    {monitoringStatus.pollInterval / 1000}s
                  </span>
                </div>
                <div className="text-gray-400">
                  WebSocket:{" "}
                  <span
                    className={
                      monitoringStatus.hasWebSocket
                        ? "text-green-400"
                        : "text-gray-400"
                    }
                  >
                    {monitoringStatus.hasWebSocket ? "Connected" : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wallets List */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3 mb-6">
              {realtimeBalances.map((wallet, index) => {
                const isActive = activeWallet?.id === wallet.id;
                const balanceChangeIndicator =
                  getBalanceChangeIndicator(wallet);

                return (
                  <button
                    key={wallet.id}
                    onClick={() => handleSelectWallet(wallet.id)}
                    className={`w-full flex items-center p-4 rounded-lg transition-all duration-200 text-left relative ${
                      isActive
                        ? "bg-[#E2AF19] text-black"
                        : "bg-[#0F0F0F] border border-[#2C2C2C] text-white hover:bg-[#1A1A1A] hover:border-[#E2AF19]"
                    }`}
                  >
                    {/* Real-time update indicator */}
                    {wallet.lastUpdated && (
                      <div
                        className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                          isActive ? "bg-black" : "bg-green-400"
                        } opacity-60 animate-pulse`}
                      />
                    )}

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
                      <div className="flex items-center">
                        <div
                          className={`font-medium font-satoshi ${
                            isActive ? "text-black" : "text-white"
                          }`}
                        >
                          {wallet.name}
                        </div>
                        {/* Live indicator */}
                        {isMonitoring && (
                          <Radio
                            size={10}
                            className={`ml-2 ${
                              isActive ? "text-black" : "text-green-400"
                            } animate-pulse`}
                          />
                        )}
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
                      {/* Last update time */}
                      {wallet.lastUpdated && (
                        <div
                          className={`text-xs font-satoshi ${
                            isActive ? "text-black opacity-50" : "text-gray-500"
                          }`}
                        >
                          Updated: {formatTime(wallet.lastUpdated)}
                        </div>
                      )}
                    </div>

                    {/* Balance and Token Count */}
                    <div className="text-right mr-3">
                      <div
                        className={`font-medium font-satoshi flex items-center ${
                          isActive ? "text-black" : "text-white"
                        }`}
                      >
                        {formatBalance(wallet.balance)}
                        {balanceChangeIndicator && (
                          <div className="ml-2">{balanceChangeIndicator}</div>
                        )}
                      </div>
                      <div
                        className={`text-sm font-satoshi flex items-center ${
                          isActive ? "text-black opacity-70" : "text-gray-400"
                        }`}
                      >
                        <span>{wallet.tokenCount || 0} tokens</span>
                        {wallet.isIncreasing !== undefined && (
                          <span className="ml-1">
                            {wallet.isIncreasing ? "📈" : "📉"}
                          </span>
                        )}
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
                  <div className="text-gray-400 text-xs font-satoshi flex items-center">
                    <span>
                      {wallets.length} wallet{wallets.length !== 1 ? "s" : ""}
                    </span>
                    <Radio
                      size={8}
                      className="ml-2 text-green-400 animate-pulse"
                    />
                    <span className="ml-1">Real-time</span>
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
