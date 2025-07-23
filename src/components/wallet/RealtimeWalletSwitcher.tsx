// src/components/wallet/RealtimeWalletSwitcher.tsx - FIXED VERSION
"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Plus, RefreshCw } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import {
  setActiveWallet,
  setActiveWalletInDB,
  fetchWallets,
  fetchWalletTokens,
  updateWalletBalance,
  clearTokens, // Add this import
} from "@/store/slices/walletSlice";
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";
import Button from "@/components/ui/Button";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";

interface RealtimeWalletSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect?: (walletId: string) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export default function RealtimeWalletSwitcher({
  isOpen,
  onClose,
  onWalletSelect,
  triggerRef,
}: RealtimeWalletSwitcherProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );
  const { user } = useSelector((state: RootState) => state.auth);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use the real-time wallet balances hook
  const { realtimeBalances, isMonitoring, lastUpdateTime, refreshAllWallets } =
    useRealtimeWalletBalances();

  // State for wallet modal and UI
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [switchingWallet, setSwitchingWallet] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 280,
  });

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const headerContainer = triggerRef.current.closest(
        ".flex.flex-col.sm\\:flex-row"
      );
      let rightEdge = window.innerWidth - 12;

      if (headerContainer) {
        const headerRect = headerContainer.getBoundingClientRect();
        rightEdge = headerRect.right;
      }

      const dropdownHeight = 320;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      let top = triggerRect.bottom + 8;
      let left = triggerRect.left;
      let width = rightEdge - triggerRect.left;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        top = triggerRect.top - dropdownHeight - 8;
      }

      if (width < 280) {
        width = 280;
      }

      setDropdownPosition({ top, left, width });
    }
  }, [isOpen, triggerRef]);

  // FIXED: Better outside click handling
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (walletModalOpen) {
        return;
      }

      const walletModalElement = document.querySelector("[data-wallet-modal]");
      if (
        walletModalElement &&
        walletModalElement.contains(event.target as Node)
      ) {
        return;
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef, walletModalOpen]);

  if (!isOpen) return null;

  // FIXED: Enhanced wallet selection with proper data loading
  const handleSelectWallet = async (walletId: string) => {
    console.log("🎯 RealtimeWalletSwitcher - Wallet selected:", walletId);

    // Find the wallet being selected
    const selectedWallet = wallets.find((w) => w.id === walletId);
    if (!selectedWallet) {
      console.error("❌ Selected wallet not found:", walletId);
      return;
    }

    // Show loading state
    setSwitchingWallet(walletId);

    try {
      // Step 1: Clear existing tokens to show loading state
      dispatch(clearTokens());
      console.log("🧹 Cleared existing tokens");

      // Step 2: Set active wallet locally first (immediate UI update)
      dispatch(setActiveWallet(walletId));
      console.log("🎯 Set active wallet locally:", selectedWallet.name);

      // Step 3: Sync with database
      await dispatch(setActiveWalletInDB(walletId));
      console.log("💾 Synced active wallet with database");

      // Step 4: Load fresh data for the new wallet
      console.log("📡 Loading fresh data for wallet:", selectedWallet.address);

      // Load both tokens and balance in parallel
      const [tokensResult, balanceResult] = await Promise.all([
        dispatch(fetchWalletTokens(selectedWallet.address)),
        dispatch(updateWalletBalance(selectedWallet.address)),
      ]);

      // Check if data loading was successful
      const tokensSuccess =
        tokensResult.type === "wallet/fetchWalletTokens/fulfilled";
      const balanceSuccess =
        balanceResult.type === "wallet/updateWalletBalance/fulfilled";

      if (tokensSuccess && balanceSuccess) {
        console.log("✅ Wallet data loaded successfully");
      } else {
        console.warn("⚠️ Some wallet data may not have loaded properly", {
          tokensSuccess,
          balanceSuccess,
        });
      }

      // Step 5: Call onWalletSelect callback if provided
      if (onWalletSelect) {
        await onWalletSelect(walletId);
      }

      // Step 6: Close the switcher
      onClose();
    } catch (error) {
      console.error("❌ Failed to switch wallet:", error);
      // Don't close on error, let user try again
    } finally {
      setSwitchingWallet(null);
    }
  };

  // Handle add wallet
  const handleAddWallet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🎭 Opening wallet modal from switcher");
    setWalletModalOpen(true);
  };

  // Handle wallet creation
  const handleWalletCreated = () => {
    console.log("🎭 Wallet created, refreshing and closing modals");
    dispatch(fetchWallets());
    setWalletModalOpen(false);
    setTimeout(() => {
      onClose();
    }, 100);
  };

  // Handle wallet modal close
  const handleWalletModalClose = () => {
    console.log("🎭 Wallet modal closed, keeping switcher open");
    setWalletModalOpen(false);
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-white/10" onClick={onClose} />

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed z-40 bg-black border border-[#2C2C2C] rounded-[12px] shadow-2xl overflow-hidden"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "320px",
        }}
      >
        {/* Wallets List */}
        <div className="px-3 py-2 max-h-[220px] overflow-y-auto scrollbar-hide">
          <div className="space-y-1.5">
            {realtimeBalances.map((wallet, index) => {
              const isActive = activeWallet?.id === wallet.id;
              const isSwitching = switchingWallet === wallet.id;

              return (
                <div
                  key={wallet.id}
                  className="w-full border border-[#6E6E6E] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => handleSelectWallet(wallet.id)}
                    disabled={isSwitching}
                    className={`w-full flex items-center p-2.5 hover:bg-[#1A1A1A] transition-colors text-left relative ${
                      isSwitching ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {/* Loading indicator when switching */}
                    {isSwitching && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                        <RefreshCw
                          size={12}
                          className="animate-spin text-white"
                        />
                      </div>
                    )}

                    {/* Wallet Icon */}
                    <div
                      className={`w-6 h-6 ${getWalletColor(
                        index
                      )} rounded-full flex items-center justify-center relative flex-shrink-0`}
                    >
                      <div
                        className="absolute inset-0 rounded-full opacity-30"
                        style={{
                          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                         linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                          backgroundSize: "4px 4px",
                        }}
                      ></div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-3 bg-[#6E6E6E] mx-2.5 flex-shrink-0"></div>

                    {/* Wallet Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="text-white font-medium text-xs font-satoshi truncate">
                        {wallet.name}
                      </div>
                      <div className="text-gray-400 text-[10px] font-satoshi truncate">
                        {wallet.address
                          ? `${wallet.address.slice(
                              0,
                              6
                            )}...${wallet.address.slice(-4)}`
                          : "Loading..."}
                      </div>
                    </div>

                    {/* Active indicator */}
                    <div className="w-3 h-3 border-2 border-[#6E6E6E] rounded-full flex items-center justify-center flex-shrink-0 ml-2.5">
                      {isActive && (
                        <div className="w-1.5 h-1.5 bg-[#E2AF19] rounded-full" />
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with Add Wallet */}
        <div className="px-3 py-3">
          <button
            onClick={handleAddWallet}
            className="w-full bg-[#E2AF19] text-black py-2 rounded-[10px] font-satoshi font-medium text-xs hover:bg-[#D4A853] transition-colors flex items-center justify-center"
          >
            <Plus size={14} className="mr-1.5" />
            Add wallet
          </button>
        </div>
      </div>

      {/* Wallet Welcome Modal */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/10"
            onClick={handleWalletModalClose}
          />
          <div
            data-wallet-modal
            className="relative z-51"
            onClick={(e) => e.stopPropagation()}
          >
            <WalletWelcomeModal
              isOpen={true}
              onClose={handleWalletModalClose}
              userName={user?.displayName || user?.name || "User"}
              onWalletCreated={handleWalletCreated}
            />
          </div>
        </div>
      )}
    </>
  );
}
