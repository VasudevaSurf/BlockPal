// src/components/wallet/RealtimeWalletSwitcher.tsx - FIXED VERSION (Skeleton instead of rotating icon)
"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Plus } from "lucide-react";
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

// NEW: Skeleton Loader Component
const WalletSkeleton = () => (
  <div className="w-full border border-[#6E6E6E] rounded-xl overflow-hidden animate-pulse">
    <div className="w-full flex items-center p-2.5">
      {/* Skeleton Wallet Icon */}
      <div className="w-6 h-6 bg-gray-600 rounded-full flex-shrink-0"></div>

      {/* Divider */}
      <div className="w-px h-3 bg-[#6E6E6E] mx-2.5 flex-shrink-0"></div>

      {/* Skeleton Wallet Info */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="h-3 bg-gray-600 rounded mb-1 w-3/4"></div>
        <div className="h-2 bg-gray-700 rounded w-1/2"></div>
      </div>

      {/* Skeleton Active indicator - FIXED: Better centering */}
      <div className="w-3 h-3 border-2 border-[#6E6E6E] rounded-full flex items-center justify-center flex-shrink-0 ml-2.5 relative">
        <div className="w-1.5 h-1.5 bg-gray-600 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>
    </div>
  </div>
);

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

  // FIXED: Enhanced wallet selection with proper data loading and reduced lag
  const handleSelectWallet = async (walletId: string) => {
    console.log("🎯 RealtimeWalletSwitcher - Wallet selected:", walletId);

    // Prevent double-clicks and already switching
    if (switchingWallet === walletId) {
      console.log("⚠️ Already switching to this wallet, ignoring");
      return;
    }

    // Find the wallet being selected
    const selectedWallet = wallets.find((w) => w.id === walletId);
    if (!selectedWallet) {
      console.error("❌ Selected wallet not found:", walletId);
      return;
    }

    // Show loading state immediately
    setSwitchingWallet(walletId);

    try {
      // Step 1: Set active wallet locally first (immediate UI update)
      dispatch(setActiveWallet(walletId));
      console.log("🎯 Set active wallet locally:", selectedWallet.name);

      // Step 2: Clear existing tokens and start data loading in parallel
      dispatch(clearTokens());
      console.log("🧹 Cleared existing tokens");

      // Step 3: Start all async operations in parallel for better performance
      const [dbResult, tokensResult, balanceResult] = await Promise.allSettled([
        dispatch(setActiveWalletInDB(walletId)),
        dispatch(fetchWalletTokens(selectedWallet.address)),
        dispatch(updateWalletBalance(selectedWallet.address)),
      ]);

      // Log results
      console.log("💾 Database sync:", dbResult.status);
      console.log("🪙 Tokens fetch:", tokensResult.status);
      console.log("💰 Balance update:", balanceResult.status);

      // Step 4: Call onWalletSelect callback if provided (also in parallel)
      if (onWalletSelect) {
        onWalletSelect(walletId).catch((error) => {
          console.warn("⚠️ onWalletSelect callback failed:", error);
        });
      }

      // Step 5: Close the switcher immediately (don't wait for callback)
      onClose();

      console.log("✅ Wallet switching completed");
    } catch (error) {
      console.error("❌ Failed to switch wallet:", error);
      // Don't close on error, let user try again
    } finally {
      // Clear switching state after a short delay to prevent flash
      setTimeout(() => {
        setSwitchingWallet(null);
      }, 100);
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

  // NEW: Generate letters from wallet name
  const getWalletLetters = (walletName: string): string => {
    if (!walletName || typeof walletName !== "string") {
      return "W"; // Default fallback
    }

    const words = walletName.trim().split(/\s+/);

    if (words.length >= 2) {
      // If 2 or more words, take first letter of each of the first two words
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      // If one word with 2+ characters, take first 2 letters
      return words[0].substring(0, 2).toUpperCase();
    } else if (words.length === 1 && words[0].length === 1) {
      // If one word with 1 character, just use that character
      return words[0].toUpperCase();
    } else {
      // Fallback
      return "W";
    }
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

              // FIXED: Show skeleton when switching instead of rotating icon
              if (isSwitching) {
                return <WalletSkeleton key={`${wallet.id}-skeleton`} />;
              }

              return (
                <div
                  key={wallet.id}
                  className="w-full border border-[#6E6E6E] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => handleSelectWallet(wallet.id)}
                    disabled={isSwitching || switchingWallet !== null}
                    className={`w-full flex items-center p-2.5 hover:bg-[#1A1A1A] transition-colors text-left disabled:cursor-not-allowed ${
                      switchingWallet !== null && !isSwitching
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    {/* FIXED: Wallet Icon with Letters */}
                    <div
                      className={`w-6 h-6 ${getWalletColor(
                        index
                      )} rounded-full flex items-center justify-center relative flex-shrink-0`}
                    >
                      <span className="text-white text-xs font-bold font-satoshi">
                        {getWalletLetters(wallet.name)}
                      </span>
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
