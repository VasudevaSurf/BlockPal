// src/components/wallet/RealtimeWalletSwitcher.tsx - FIXED: Added backdrop like WelcomeModal
"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Plus, RefreshCw } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import {
  setActiveWallet,
  setActiveWalletInDB,
  fetchWallets,
} from "@/store/slices/walletSlice";
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";
import Button from "@/components/ui/Button";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";

interface RealtimeWalletSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect?: (walletId: string) => void;
  triggerRef?: React.RefObject<HTMLElement>; // Reference to the trigger button
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
    width: 320,
  });

  // FIXED: Close modal state when wallet modal is opened/closed
  useEffect(() => {
    if (walletModalOpen) {
      // Don't close the switcher when wallet modal opens
      console.log("🎭 Wallet modal opened, keeping switcher open");
    }
  }, [walletModalOpen]);

  // Calculate dropdown position to stretch from wallet button to end of header icons
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();

      // Find the header container to get the right edge
      const headerContainer = triggerRef.current.closest(
        ".flex.flex-col.sm\\:flex-row"
      );
      let rightEdge = window.innerWidth - 16; // Default fallback with padding

      if (headerContainer) {
        const headerRect = headerContainer.getBoundingClientRect();
        rightEdge = headerRect.right;
      }

      const dropdownHeight = 400; // Approximate dropdown height
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      let top = triggerRect.bottom + 12; // 12px gap below button
      let left = triggerRect.left;
      let width = rightEdge - triggerRect.left; // Stretch to the end of header

      // If not enough space below, show above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        top = triggerRect.top - dropdownHeight - 12;
      }

      // Ensure minimum width
      if (width < 320) {
        width = 320;
      }

      setDropdownPosition({ top, left, width });
    }
  }, [isOpen, triggerRef]);

  // FIXED: Better outside click handling that respects modal state
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't close if wallet modal is open
      if (walletModalOpen) {
        console.log("🎭 Wallet modal is open, ignoring outside click");
        return;
      }

      // Check if click is on wallet modal content
      const walletModalElement = document.querySelector("[data-wallet-modal]");
      if (
        walletModalElement &&
        walletModalElement.contains(event.target as Node)
      ) {
        console.log("🎭 Click inside wallet modal, ignoring");
        return;
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        console.log("🎭 Outside click detected, closing switcher");
        onClose();
      }
    }

    if (isOpen) {
      // Small delay to prevent immediate closure
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef, walletModalOpen]);

  if (!isOpen) return null;

  // Handle wallet selection with DB sync and real-time data
  const handleSelectWallet = async (walletId: string) => {
    console.log("🎯 RealtimeWalletSwitcher - Wallet selected:", walletId);

    // Show loading state
    setSwitchingWallet(walletId);

    try {
      if (onWalletSelect) {
        await onWalletSelect(walletId);
      } else {
        dispatch(setActiveWallet(walletId));
        await dispatch(setActiveWalletInDB(walletId));
      }
      onClose();
    } catch (error) {
      console.error("❌ Failed to switch wallet:", error);
      onClose();
    } finally {
      setSwitchingWallet(null);
    }
  };

  // FIXED: Better add wallet handling
  const handleAddWallet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🎭 Opening wallet modal from switcher");
    setWalletModalOpen(true);
  };

  // FIXED: Handle wallet creation and properly close modals
  const handleWalletCreated = () => {
    console.log("🎭 Wallet created, refreshing and closing modals");
    dispatch(fetchWallets());
    setWalletModalOpen(false);
    // Close the main switcher as well since wallet was created
    setTimeout(() => {
      onClose();
    }, 100);
  };

  // FIXED: Handle wallet modal close
  const handleWalletModalClose = () => {
    console.log("🎭 Wallet modal closed, keeping switcher open");
    setWalletModalOpen(false);
    // Don't close the main switcher
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
      {/* ADDED: Backdrop similar to WelcomeModal */}
      <div className="fixed inset-0 z-30 bg-white/10" onClick={onClose} />

      {/* Dropdown positioned below trigger button */}
      <div
        ref={dropdownRef}
        className="fixed z-40 bg-black border border-[#2C2C2C] rounded-[16px] shadow-2xl overflow-hidden"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "400px",
        }}
      >
        {/* Wallets List */}
        <div className="px-4 py-3 max-h-[280px] overflow-y-auto scrollbar-hide">
          <div className="space-y-2">
            {realtimeBalances.map((wallet, index) => {
              const isActive = activeWallet?.id === wallet.id;
              const isSwitching = switchingWallet === wallet.id;

              return (
                <div
                  key={wallet.id}
                  className="w-full border border-[#6E6E6E] rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => handleSelectWallet(wallet.id)}
                    disabled={isSwitching}
                    className={`w-full flex items-center p-3 hover:bg-[#1A1A1A] transition-colors text-left relative ${
                      isSwitching ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {/* Loading indicator when switching */}
                    {isSwitching && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                        <RefreshCw
                          size={14}
                          className="animate-spin text-white"
                        />
                      </div>
                    )}

                    {/* Wallet Icon */}
                    <div
                      className={`w-8 h-8 ${getWalletColor(
                        index
                      )} rounded-full flex items-center justify-center relative flex-shrink-0`}
                    >
                      {/* Grid pattern overlay */}
                      <div
                        className="absolute inset-0 rounded-full opacity-30"
                        style={{
                          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                         linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                          backgroundSize: "6px 6px",
                        }}
                      ></div>
                    </div>

                    {/* Divider after icon */}
                    <div className="w-px h-4 bg-[#6E6E6E] mx-3 flex-shrink-0"></div>

                    {/* Wallet Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="text-white font-medium text-sm font-satoshi truncate">
                        {wallet.name}
                      </div>
                      <div className="text-gray-400 text-xs font-satoshi truncate">
                        {wallet.address
                          ? `${wallet.address.slice(
                              0,
                              6
                            )}...${wallet.address.slice(-4)}`
                          : "Loading..."}
                      </div>
                    </div>

                    {/* Active indicator (yellow radio button) */}
                    <div className="w-4 h-4 border-2 border-[#6E6E6E] rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                      {isActive && (
                        <div className="w-2 h-2 bg-[#E2AF19] rounded-full" />
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with Add Wallet */}
        <div className="px-4 py-4">
          <button
            onClick={handleAddWallet}
            className="w-full bg-[#E2AF19] text-black py-2.5 rounded-[12px] font-satoshi font-medium text-sm hover:bg-[#D4A853] transition-colors flex items-center justify-center"
          >
            <Plus size={16} className="mr-2" />
            Add wallet
          </button>
        </div>
      </div>

      {/* Wallet Welcome Modal with higher z-index and data attribute */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal backdrop */}
          <div
            className="absolute inset-0 bg-white/10"
            onClick={handleWalletModalClose}
          />

          {/* Modal wrapper with data attribute for click detection */}
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
