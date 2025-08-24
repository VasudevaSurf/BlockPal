// src/components/wallet/RealtimeWalletSwitcher.tsx - FIXED WITH PROPER SWITCHING
"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Plus,
  Key,
  Eye,
  EyeOff,
  Copy,
  ArrowLeft,
  Shield,
  Mail,
  AlertTriangle,
  CheckCircle,
  X,
  Edit3,
  Check,
  FileText,
  Download,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import {
  setActiveWallet,
  setActiveWalletInDB,
  refreshWalletList, // NEW: Import refreshWalletList
  fetchWalletTokens,
  updateWalletBalance,
  clearTokens,
} from "@/store/slices/walletSlice";
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";
import { sendPasswordResetEmail, EmailData } from "@/lib/emailjs";
import { SecureWalletStorage } from "@/lib/wallet-security";

interface RealtimeWalletSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect?: (walletId: string) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

interface WalletCredentials {
  privateKey: string;
  mnemonic?: string;
}

type CredentialsStep =
  | "list"
  | "verify"
  | "email_verify"
  | "select_credential"
  | "display";

type CredentialType = "privateKey" | "mnemonic";

// Skeleton Loader Component
const WalletSkeleton = () => (
  <div className="w-full border border-[#6E6E6E] rounded-xl overflow-hidden animate-pulse">
    <div className="w-full flex items-center p-2.5">
      <div className="w-6 h-6 bg-gray-600 rounded-full flex-shrink-0"></div>
      <div className="w-px h-3 bg-[#6E6E6E] mx-2.5 flex-shrink-0"></div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="h-3 bg-gray-600 rounded mb-1 w-3/4"></div>
        <div className="h-2 bg-gray-700 rounded w-1/2"></div>
      </div>
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

  // Real-time wallet balances hook
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

  // Credentials state
  const [credentialsStep, setCredentialsStep] =
    useState<CredentialsStep>("list");
  const [selectedWalletForCredentials, setSelectedWalletForCredentials] =
    useState<any>(null);
  const [credentials, setCredentials] = useState<WalletCredentials | null>(
    null
  );
  const [selectedCredentialType, setSelectedCredentialType] =
    useState<CredentialType>("privateKey");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [generatedEmailCode, setGeneratedEmailCode] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Additional state for rename and copy functionality
  const [showRenameInput, setShowRenameInput] = useState<string | null>(null);
  const [newWalletName, setNewWalletName] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const [renameFeedback, setRenameFeedback] = useState<string>("");
  const [savingRename, setSavingRename] = useState(false);

  // Persist local wallet names
  const [localWalletNames, setLocalWalletNames] = useState<
    Record<string, string>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("walletNameOverrides");
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [userProfile, setUserProfile] = useState<any>(null);

  // NEW: Track wallet switching state to prevent multiple simultaneous switches
  const [isSwitchingWallet, setIsSwitchingWallet] = useState(false);
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();

      // NEW: Refresh wallet list when modal opens to get latest wallets
      console.log("🔄 Refreshing wallet list on modal open...");
      dispatch(refreshWalletList());

      // Clean up any old wallet name overrides
      if (typeof window !== "undefined" && wallets.length > 0) {
        try {
          const stored = sessionStorage.getItem("walletNameOverrides");
          if (stored) {
            const overrides = JSON.parse(stored);
            const validWalletIds = wallets.map((w) => w.id);
            const cleanedOverrides: Record<string, string> = {};

            Object.keys(overrides).forEach((walletId) => {
              if (validWalletIds.includes(walletId)) {
                cleanedOverrides[walletId] = overrides[walletId];
              }
            });

            if (
              Object.keys(cleanedOverrides).length !==
              Object.keys(overrides).length
            ) {
              if (Object.keys(cleanedOverrides).length === 0) {
                sessionStorage.removeItem("walletNameOverrides");
              } else {
                sessionStorage.setItem(
                  "walletNameOverrides",
                  JSON.stringify(cleanedOverrides)
                );
              }
              setLocalWalletNames(cleanedOverrides);
            }
          }
        } catch (error) {
          console.warn("Could not clean up wallet name overrides:", error);
        }
      }
    }
  }, [isOpen, wallets.length, dispatch]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/profile", {
        credentials: "include",
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Determine if user is Google-only
  const isGoogleOnlyUser =
    userProfile?.authProvider === "google" && !userProfile?.hasPassword;

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

      const dropdownHeight = 450;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      let top = triggerRect.bottom + 8;
      let left = triggerRect.left;
      let width = rightEdge - triggerRect.left;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        top = triggerRect.top - dropdownHeight - 8;
      }

      if (width < 320) {
        width = 320;
      }

      setDropdownPosition({ top, left, width });
    }
  }, [isOpen, triggerRef, credentialsStep]);

  // Outside click handling
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (walletModalOpen) return;

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
        handleClose();
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

  // Enhanced close handler
  const handleClose = () => {
    setCredentialsStep("list");
    setSelectedWalletForCredentials(null);
    setCredentials(null);
    setSelectedCredentialType("privateKey");
    setPassword("");
    setEmailCode("");
    setGeneratedEmailCode("");
    setShowPrivateKey(false);
    setShowMnemonic(false);
    setCopied("");
    setError("");
    setLoading(false);
    setSendingEmail(false);
    setShowRenameInput(null);
    setNewWalletName("");
    setCopyFeedback("");
    setRenameFeedback("");
    setSavingRename(false);
    onClose();
  };

  // Helper to update local wallet names with persistence
  const updateLocalWalletName = (walletId: string, name: string) => {
    const newOverrides = { ...localWalletNames, [walletId]: name };
    setLocalWalletNames(newOverrides);

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "walletNameOverrides",
          JSON.stringify(newOverrides)
        );
      } catch (error) {
        console.warn("Could not save wallet name overrides:", error);
      }
    }
  };

  // Helper to clear local wallet name override
  const clearLocalWalletName = (walletId: string) => {
    const newOverrides = { ...localWalletNames };
    delete newOverrides[walletId];
    setLocalWalletNames(newOverrides);

    if (typeof window !== "undefined") {
      try {
        if (Object.keys(newOverrides).length === 0) {
          sessionStorage.removeItem("walletNameOverrides");
        } else {
          sessionStorage.setItem(
            "walletNameOverrides",
            JSON.stringify(newOverrides)
          );
        }
      } catch (error) {
        console.warn("Could not update wallet name overrides:", error);
      }
    }
  };

  // ENHANCED: Wallet selection with proper switching for additional wallets
  // Enhanced handleSelectWallet function for RealtimeWalletSwitcher.tsx
  const handleSelectWallet = async (walletId: string) => {
    console.log("🎯 RealtimeWalletSwitcher - Wallet selected:", walletId);

    // Prevent multiple simultaneous wallet switches
    if (isSwitchingWallet) {
      console.log("⚠️ Already switching wallets, ignoring request");
      return;
    }

    // IMPORTANT: Refresh wallet list first to ensure we have latest data
    dispatch(refreshWalletList());

    // Find the selected wallet (after refresh)
    const allWallets =
      wallets.length > 0
        ? wallets
        : (() => {
            // Force reload wallets from localStorage if Redux state is empty
            const primary = SecureWalletStorage.getPrimaryWalletCredentials();
            const additional = SecureWalletStorage.getAdditionalWallets();

            const loadedWallets = [];
            if (primary) {
              loadedWallets.push({
                id: "primary",
                name: "Primary Wallet",
                address: primary.address,
                balance: 0,
                isActive: false,
              });
            }

            additional.forEach((wallet) => {
              loadedWallets.push({
                id: wallet.id,
                name: wallet.name,
                address: wallet.address,
                balance: 0,
                isActive: false,
              });
            });

            return loadedWallets;
          })();

    const selectedWallet = allWallets.find((w) => w.id === walletId);
    if (!selectedWallet) {
      console.error("❌ Selected wallet not found:", walletId);
      return;
    }

    // Get current wallet for event emission
    const currentWalletAddress = activeWallet?.address;

    // Set switching state
    setIsSwitchingWallet(true);

    // Clear any existing timeout
    if (switchingTimeoutRef.current) {
      clearTimeout(switchingTimeoutRef.current);
    }

    try {
      console.log("🔄 Starting wallet switch process", {
        from: currentWalletAddress?.slice(0, 10) + "...",
        to: selectedWallet.address.slice(0, 10) + "...",
        walletName: selectedWallet.name,
      });

      // STEP 1: Emit wallet switch start event
      window.dispatchEvent(
        new CustomEvent("walletSwitchStart", {
          detail: {
            fromWallet: currentWalletAddress,
            toWallet: selectedWallet.address,
            source: "wallet-switcher",
          },
        })
      );

      // STEP 2: Update Redux state immediately for UI responsiveness
      dispatch(setActiveWallet(walletId));

      // STEP 3: Clear existing tokens to show loading state
      dispatch(clearTokens());
      console.log("🧹 Cleared existing tokens");

      // STEP 4: Store preference in localStorage
      localStorage.setItem("activeWalletId", walletId);

      // STEP 5: Sync with database (compatibility)
      try {
        await dispatch(setActiveWalletInDB(walletId));
        console.log("💾 Synced with database");
      } catch (error) {
        console.warn("⚠️ Database sync failed, but continuing:", error);
      }

      // STEP 6: Load fresh data for the new wallet
      console.log(
        "📡 Loading fresh data for:",
        selectedWallet.address.slice(0, 10) + "..."
      );

      const [tokensResult, balanceResult] = await Promise.allSettled([
        dispatch(fetchWalletTokens(selectedWallet.address)),
        dispatch(updateWalletBalance(selectedWallet.address)),
      ]);

      // Check results
      const tokensSuccess =
        tokensResult.status === "fulfilled" &&
        tokensResult.value.type === "wallet/fetchWalletTokens/fulfilled";
      const balanceSuccess =
        balanceResult.status === "fulfilled" &&
        balanceResult.value.type === "wallet/updateWalletBalance/fulfilled";

      if (tokensSuccess) {
        console.log("✅ Tokens loaded successfully");
      } else {
        console.warn("⚠️ Token loading failed:", tokensResult);
      }

      if (balanceSuccess) {
        console.log("✅ Balance updated successfully");
      } else {
        console.warn("⚠️ Balance update failed:", balanceResult);
      }

      // STEP 7: Notify parent component if provided
      if (onWalletSelect) {
        try {
          await onWalletSelect(walletId);
          console.log("✅ Parent onWalletSelect callback completed");
        } catch (error) {
          console.warn("⚠️ onWalletSelect callback failed:", error);
        }
      }

      // STEP 8: Update dashboard services
      // Stop current dashboard monitoring
      if (typeof window !== "undefined" && window.realtimeDashboardService) {
        window.realtimeDashboardService.stopMonitoring();
      }

      // Force refresh real-time services with new wallet
      setTimeout(() => {
        if (refreshAllWallets) {
          refreshAllWallets();
        }

        // Restart dashboard monitoring for new wallet
        if (typeof window !== "undefined" && window.realtimeDashboardService) {
          window.realtimeDashboardService.startMonitoring(
            selectedWallet.address
          );
        }
      }, 1000);

      // STEP 9: Emit wallet switch completion event
      setTimeout(() => {
        console.log("✅ Emitting wallet switch complete event");
        window.dispatchEvent(
          new CustomEvent("walletSwitchComplete", {
            detail: {
              walletAddress: selectedWallet.address,
              walletId: selectedWallet.id,
              walletName: selectedWallet.name,
              source: "wallet-switcher",
            },
          })
        );
      }, 100);

      console.log("✅ Wallet switch completed successfully");

      // Close the modal
      handleClose();
    } catch (error) {
      console.error("❌ Failed to switch wallet:", error);

      // Emit error event
      window.dispatchEvent(
        new CustomEvent("walletSwitchError", {
          detail: {
            error: error,
            walletId: walletId,
            source: "wallet-switcher",
          },
        })
      );

      // Reset to previous wallet if switch failed
      if (currentWalletAddress && activeWallet) {
        dispatch(setActiveWallet(activeWallet.id));
      }
    } finally {
      // Reset switching state after a delay to ensure all components have updated
      switchingTimeoutRef.current = setTimeout(() => {
        setIsSwitchingWallet(false);
        switchingTimeoutRef.current = null;
      }, 2000); // Increased delay for additional wallet switching
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }
    };
  }, []);

  // Handle copy wallet address
  const handleCopyAddress = async (e: React.MouseEvent, wallet: any) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopyFeedback(wallet.id);
      console.log("📋 Copied wallet address:", wallet.address);

      setTimeout(() => {
        setCopyFeedback("");
      }, 2000);
    } catch (error) {
      console.error("❌ Failed to copy wallet address:", error);
    }
  };

  // Handle show credentials
  const handleShowCredentials = (e: React.MouseEvent, wallet: any) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🔑 Show credentials for wallet:", wallet.name);

    setSelectedWalletForCredentials(wallet);

    // For additional wallets, get credentials directly from localStorage
    if (wallet.isAdditional) {
      const additionalWallets = SecureWalletStorage.getAdditionalWallets();
      const additionalWallet = additionalWallets.find(
        (w) => w.id === wallet.id
      );
      if (additionalWallet) {
        setCredentials({
          privateKey: additionalWallet.privateKey,
          mnemonic: additionalWallet.mnemonic,
        });
        setCredentialsStep("select_credential");
      } else {
        setError("Additional wallet credentials not found");
      }
    } else {
      // For primary wallet, check if credentials are in localStorage
      const primaryCredentials =
        SecureWalletStorage.getPrimaryWalletCredentials();

      if (primaryCredentials) {
        setCredentials({
          privateKey: primaryCredentials.privateKey,
          mnemonic: primaryCredentials.mnemonic,
        });
        setCredentialsStep("select_credential");
      } else {
        setCredentialsStep(isGoogleOnlyUser ? "email_verify" : "verify");
      }
    }

    setError("");
  };

  // Handle credential selection
  const handleCredentialSelection = (credentialType: CredentialType) => {
    setSelectedCredentialType(credentialType);
    setCredentialsStep("display");
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Download credentials
  const downloadCredentials = () => {
    if (!credentials || !selectedWalletForCredentials) return;

    const content = `Blockpal Wallet Credentials
Wallet Name: ${selectedWalletForCredentials.name}
Wallet Address: ${selectedWalletForCredentials.address}
Generated: ${new Date().toLocaleDateString()}

⚠️ IMPORTANT SECURITY WARNING ⚠️
- Store this information in a secure location
- Never share your private key or recovery phrase with anyone
- Blockpal will never ask for your private key
- Anyone with access to this information can control your wallet

${
  selectedCredentialType === "privateKey"
    ? "Private Key:"
    : "Recovery Phrase (Mnemonic):"
}
${
  selectedCredentialType === "privateKey"
    ? credentials.privateKey
    : credentials.mnemonic || "Not available"
}

Keep this information safe and secure!`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet-${selectedCredentialType}-${selectedWalletForCredentials.name.replace(
      /\s+/g,
      "-"
    )}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Back to wallet list
  const handleBackToList = () => {
    setCredentialsStep("list");
    setSelectedWalletForCredentials(null);
    setCredentials(null);
    setSelectedCredentialType("privateKey");
    setPassword("");
    setEmailCode("");
    setGeneratedEmailCode("");
    setShowPrivateKey(false);
    setShowMnemonic(false);
    setCopied("");
    setError("");
    setLoading(false);
    setSendingEmail(false);
  };

  // Handle add wallet
  const handleAddWallet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWalletModalOpen(true);
  };

  // Handle wallet creation
  const handleWalletCreated = () => {
    // NEW: Refresh wallet list when a new wallet is created
    console.log("🔄 Refreshing wallet list after wallet creation...");
    dispatch(refreshWalletList());

    setWalletModalOpen(false);
    setTimeout(() => {
      handleClose();
    }, 100);
  };

  // Handle wallet modal close
  const handleWalletModalClose = () => {
    setWalletModalOpen(false);
  };

  // Generate letters from wallet name
  const getWalletLetters = (walletName: string): string => {
    if (!walletName || typeof walletName !== "string") {
      return "W";
    }

    const words = walletName.trim().split(/\s+/);

    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase();
    } else if (words.length === 1 && words[0].length === 1) {
      return words[0].toUpperCase();
    } else {
      return "W";
    }
  };

  // Use dark grey for all wallet colors
  const getWalletColor = (index: number) => {
    return "bg-gradient-to-br from-gray-600/80 to-gray-700/90";
  };

  if (!isOpen) return null;

  console.log("🎨 RealtimeWalletSwitcher render:", {
    walletsCount: wallets.length,
    activeWallet: activeWallet?.id,
    isSwitchingWallet,
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-white/10" onClick={handleClose} />

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed z-40 bg-black border border-[#2C2C2C] rounded-[12px] shadow-2xl overflow-hidden"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "500px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#2C2C2C]">
          {credentialsStep !== "list" ? (
            <button
              onClick={handleBackToList}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} className="mr-1.5" />
              <span className="text-sm font-satoshi">Back</span>
            </button>
          ) : (
            <h3 className="text-white font-semibold text-sm font-satoshi">
              Wallet Manager ({wallets.length})
            </h3>
          )}

          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content based on step */}
        {credentialsStep === "list" && (
          <>
            {/* Wallets List */}
            <div className="px-3 py-2 max-h-[280px] overflow-y-auto scrollbar-hide">
              <div className="space-y-1.5">
                {wallets.map((wallet, index) => {
                  const isActive = activeWallet?.id === wallet.id;
                  const isSwitchingThisWallet =
                    switchingWallet === wallet.id || isSwitchingWallet;

                  if (isSwitchingThisWallet) {
                    return <WalletSkeleton key={`${wallet.id}-skeleton`} />;
                  }

                  return (
                    <div
                      key={wallet.id}
                      className="w-full border border-[#6E6E6E] rounded-xl overflow-hidden"
                    >
                      <div className="w-full flex items-center p-2.5">
                        {/* Wallet Icon */}
                        <div
                          className={`w-7 h-7 ${getWalletColor(
                            index
                          )} rounded-full flex items-center justify-center relative flex-shrink-0`}
                        >
                          <span className="text-white text-xs font-bold font-satoshi">
                            {getWalletLetters(wallet.name)}
                          </span>
                          {/* Additional wallet indicator */}
                          {(wallet as any).isAdditional && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#E2AF19] rounded-full flex items-center justify-center">
                              <Plus size={8} className="text-black" />
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-3 bg-[#6E6E6E] mx-2.5 flex-shrink-0"></div>

                        {/* Wallet Info - Clickable for switching */}
                        <button
                          onClick={() => handleSelectWallet(wallet.id)}
                          disabled={isSwitchingThisWallet}
                          className={`flex-1 min-w-0 overflow-hidden text-left hover:opacity-80 transition-opacity disabled:cursor-not-allowed ${
                            isSwitchingThisWallet ? "opacity-50" : ""
                          }`}
                        >
                          <div className="text-white font-medium text-xs font-satoshi truncate flex items-center">
                            {localWalletNames[wallet.id] || wallet.name}
                            {(wallet as any).isAdditional && (
                              <span className="ml-1 text-[#E2AF19] text-[10px]">
                                +
                              </span>
                            )}
                            {copyFeedback === wallet.id && (
                              <span className="text-[#E2AF19] ml-2 flex items-center">
                                <Check size={12} className="mr-1" />
                                Copied!
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-[10px] font-satoshi truncate">
                            {wallet.address
                              ? `${wallet.address.slice(
                                  0,
                                  6
                                )}...${wallet.address.slice(-4)}`
                              : "Loading..."}
                          </div>
                        </button>

                        {/* Wallet Action Buttons */}
                        <div className="flex items-center gap-1 ml-2">
                          {/* Copy Address Button */}
                          <button
                            onClick={(e) => handleCopyAddress(e, wallet)}
                            className="text-gray-400 hover:text-[#E2AF19] transition-colors p-1 hover:bg-[#2C2C2C] rounded"
                            title="Copy wallet address"
                          >
                            <Copy size={14} />
                          </button>

                          {/* Credentials Button */}
                          <button
                            onClick={(e) => handleShowCredentials(e, wallet)}
                            className="text-gray-400 hover:text-[#E2AF19] transition-colors p-1 hover:bg-[#2C2C2C] rounded"
                            title="View wallet credentials"
                          >
                            <Key size={14} />
                          </button>
                        </div>

                        {/* Active indicator */}
                        <div className="w-3 h-3 border-2 border-[#6E6E6E] rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                          {isActive && (
                            <div className="w-1.5 h-1.5 bg-[#E2AF19] rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer with Add Wallet */}
            <div className="px-3 py-3 border-t border-[#2C2C2C]">
              <button
                onClick={handleAddWallet}
                className="w-full bg-[#E2AF19] text-black py-2 rounded-[10px] font-satoshi font-medium text-xs hover:bg-[#D4A853] transition-colors flex items-center justify-center"
              >
                <Plus size={14} className="mr-1.5" />
                Add wallet
              </button>
            </div>
          </>
        )}

        {/* Credential Selection Step */}
        {credentialsStep === "select_credential" &&
          credentials &&
          selectedWalletForCredentials && (
            <div className="p-3 space-y-3">
              <div className="text-center">
                <h4 className="text-white font-semibold font-satoshi text-sm mb-1">
                  {selectedWalletForCredentials.name}
                </h4>
                <p className="text-gray-400 text-xs font-satoshi">
                  Choose which credential to view
                </p>
              </div>

              {/* Credential Options */}
              <div className="space-y-2">
                {/* Private Key Option */}
                <button
                  onClick={() => handleCredentialSelection("privateKey")}
                  className="w-full p-3 bg-[#0F0F0F] hover:bg-[#2C2C2C] border border-[#2C2C2C] hover:border-[#E2AF19] rounded-lg transition-colors text-left"
                >
                  <div className="flex items-center">
                    <Key size={16} className="text-[#E2AF19] mr-2" />
                    <div>
                      <h5 className="text-white font-semibold font-satoshi text-sm">
                        Private Key
                      </h5>
                      <p className="text-gray-400 text-xs font-satoshi">
                        View your wallet's private key
                      </p>
                    </div>
                  </div>
                </button>

                {/* Recovery Phrase Option */}
                <button
                  onClick={() => handleCredentialSelection("mnemonic")}
                  disabled={!credentials.mnemonic}
                  className={`w-full p-3 border rounded-lg transition-colors text-left ${
                    credentials.mnemonic
                      ? "bg-[#0F0F0F] hover:bg-[#2C2C2C] border-[#2C2C2C] hover:border-[#E2AF19]"
                      : "bg-gray-800/30 border-gray-600 cursor-not-allowed opacity-50"
                  }`}
                >
                  <div className="flex items-center">
                    <FileText
                      size={16}
                      className={`mr-2 ${
                        credentials.mnemonic
                          ? "text-[#E2AF19]"
                          : "text-gray-500"
                      }`}
                    />
                    <div>
                      <h5
                        className={`font-semibold font-satoshi text-sm ${
                          credentials.mnemonic ? "text-white" : "text-gray-500"
                        }`}
                      >
                        Recovery Phrase
                      </h5>
                      <p
                        className={`text-xs font-satoshi ${
                          credentials.mnemonic
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        {credentials.mnemonic
                          ? "View your wallet's recovery phrase"
                          : "Not available for this wallet"}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

        {/* Credentials Display Step */}
        {credentialsStep === "display" &&
          credentials &&
          selectedWalletForCredentials && (
            <div className="p-3 space-y-3 max-h-[350px] overflow-y-auto scrollbar-hide">
              <div className="text-center">
                <div className="w-10 h-10 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  {selectedCredentialType === "privateKey" ? (
                    <Key size={20} className="text-[#E2AF19]" />
                  ) : (
                    <FileText size={20} className="text-[#E2AF19]" />
                  )}
                </div>
                <h4 className="text-white font-semibold font-satoshi text-sm mb-1">
                  {selectedCredentialType === "privateKey"
                    ? "Private Key"
                    : "Recovery Phrase"}
                </h4>
                <p className="text-gray-400 text-xs font-satoshi">
                  {selectedWalletForCredentials.name}
                </p>
              </div>

              {/* Credential Display */}
              <div className="bg-[#0F0F0F] rounded-lg p-2 border border-[#2C2C2C]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs font-satoshi">
                    {selectedCredentialType === "privateKey"
                      ? "Private Key:"
                      : "Recovery Phrase:"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        selectedCredentialType === "privateKey"
                          ? setShowPrivateKey(!showPrivateKey)
                          : setShowMnemonic(!showMnemonic)
                      }
                      className="text-gray-400 hover:text-white transition-colors p-0.5"
                    >
                      {(
                        selectedCredentialType === "privateKey"
                          ? showPrivateKey
                          : showMnemonic
                      ) ? (
                        <EyeOff size={12} />
                      ) : (
                        <Eye size={12} />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          selectedCredentialType === "privateKey"
                            ? credentials.privateKey
                            : credentials.mnemonic!,
                          selectedCredentialType
                        )
                      }
                      className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-xs"
                    >
                      <Copy size={10} className="mr-0.5" />
                      {copied === selectedCredentialType ? "✓" : "Copy"}
                    </button>
                    <button
                      onClick={downloadCredentials}
                      className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-xs"
                    >
                      <Download size={10} className="mr-0.5" />
                      Save
                    </button>
                  </div>
                </div>
                <div className="text-white font-mono text-xs break-all leading-relaxed">
                  {selectedCredentialType === "privateKey"
                    ? showPrivateKey
                      ? credentials.privateKey
                      : "•".repeat(64)
                    : showMnemonic
                    ? credentials.mnemonic
                    : "•".repeat(credentials.mnemonic?.length || 0)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setCredentialsStep("select_credential")}
                  variant="secondary"
                  className="flex-1 text-xs"
                >
                  <ArrowLeft size={12} className="mr-1" />
                  Back
                </Button>
                <Button onClick={handleBackToList} className="flex-1 text-xs">
                  Done
                </Button>
              </div>
            </div>
          )}
      </div>

      {/* Wallet Welcome Modal for Additional Wallets */}
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
              isAdditionalWallet={true} // NEW: Pass flag to indicate this is for additional wallets
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
