// src/components/wallet/RealtimeWalletSwitcher.tsx - BACKEND REMOVED, AUTH PRESERVED
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
  Wallet as WalletIcon,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { logoutUser } from "@/store/slices/authSlice";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { sendPasswordResetEmail, EmailData } from "@/lib/emailjs";

interface RealtimeWalletSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect?: (walletId: string) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

interface MockWallet {
  id: string;
  name: string;
  address: string;
  balance: string;
  isActive: boolean;
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
  | "display"
  | "disabled";

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
  const { user } = useSelector((state: RootState) => state.auth);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // MODIFIED: Use mock wallets instead of real data
  const [mockWallets, setMockWallets] = useState<MockWallet[]>([
    {
      id: "demo-1",
      name: "Main Wallet",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      balance: "0.00",
      isActive: true,
    },
    {
      id: "demo-2",
      name: "Trading Wallet",
      address: "0xabcdef1234567890abcdef1234567890abcdef12",
      balance: "0.00",
      isActive: false,
    },
  ]);

  // State for UI and modals
  const [switchingWallet, setSwitchingWallet] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 280,
  });

  // Enhanced credentials state
  const [credentialsStep, setCredentialsStep] =
    useState<CredentialsStep>("list");
  const [selectedWalletForCredentials, setSelectedWalletForCredentials] =
    useState<MockWallet | null>(null);
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

  // Get user profile for auth provider info
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadMockUserProfile();
    }
  }, [isOpen]);

  // MODIFIED: Use mock user profile
  const loadMockUserProfile = async () => {
    try {
      console.log("👤 Loading mock user profile for wallet switcher...");

      // Mock user profile based on authenticated user
      const mockProfile = {
        gmail: user?.email || "demo@example.com",
        displayName: user?.displayName || "Demo User",
        authProvider: user?.authProvider || "email",
        hasPassword: user?.authProvider !== "google" || true,
      };

      setUserProfile(mockProfile);
      console.log("✅ Mock user profile loaded for wallet switcher");
    } catch (error) {
      console.error("Error loading mock user profile:", error);
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
  }, [isOpen, onClose, triggerRef]);

  // Enhanced close handler to reset credentials state
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

  // MODIFIED: Mock wallet selection
  const handleSelectWallet = async (walletId: string) => {
    console.log("🎯 Mock wallet selection:", walletId);

    if (switchingWallet === walletId) {
      console.log("⚠️ Already switching to this wallet, ignoring");
      return;
    }

    setSwitchingWallet(walletId);

    try {
      // Simulate wallet switching
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Update mock active wallet
      setMockWallets((prev) =>
        prev.map((wallet) => ({
          ...wallet,
          isActive: wallet.id === walletId,
        }))
      );

      if (onWalletSelect) {
        onWalletSelect(walletId).catch((error) => {
          console.warn("⚠️ onWalletSelect callback failed:", error);
        });
      }

      console.log("✅ Mock wallet switched successfully");
      handleClose();
    } catch (error) {
      console.error("❌ Failed to switch mock wallet:", error);
    } finally {
      setTimeout(() => {
        setSwitchingWallet(null);
      }, 100);
    }
  };

  // Handle copy wallet address
  const handleCopyAddress = async (e: React.MouseEvent, wallet: MockWallet) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopyFeedback(wallet.id);
      console.log("📋 Copied mock wallet address:", wallet.address);

      setTimeout(() => {
        setCopyFeedback("");
      }, 2000);
    } catch (error) {
      console.error("❌ Failed to copy wallet address:", error);
    }
  };

  // Handle rename wallet
  const handleRenameWallet = (e: React.MouseEvent, wallet: MockWallet) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("✏️ Rename mock wallet:", wallet.name);

    setShowRenameInput(wallet.id);
    setNewWalletName(wallet.name);
  };

  // MODIFIED: Mock wallet rename
  const saveWalletRename = async (walletId: string) => {
    if (!newWalletName.trim()) {
      setError("Wallet name cannot be empty");
      return;
    }

    setSavingRename(true);

    try {
      console.log("📝 Mock wallet rename:", newWalletName.trim());

      // Simulate save delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update mock wallet name
      setMockWallets((prev) =>
        prev.map((wallet) =>
          wallet.id === walletId
            ? { ...wallet, name: newWalletName.trim() }
            : wallet
        )
      );

      setRenameFeedback(walletId);
      setShowRenameInput(null);
      setNewWalletName("");
      setError("");

      setTimeout(() => {
        setRenameFeedback("");
      }, 3000);

      console.log("✅ Mock wallet renamed successfully");
    } catch (error: any) {
      console.error("❌ Error renaming mock wallet:", error);
      setError("Failed to rename wallet (demo mode)");
    } finally {
      setSavingRename(false);
    }
  };

  // Cancel wallet rename
  const cancelWalletRename = () => {
    setShowRenameInput(null);
    setNewWalletName("");
    setError("");
  };

  // Handle show credentials - go to verification step first
  const handleShowCredentials = (e: React.MouseEvent, wallet: MockWallet) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🔑 Show credentials for mock wallet:", wallet.name);

    setSelectedWalletForCredentials(wallet);
    setCredentialsStep(isGoogleOnlyUser ? "email_verify" : "verify");
    setError("");
  };

  // Send email verification for Google users (PRESERVED - EmailJS functionality)
  const sendEmailVerification = async () => {
    if (!userProfile?.gmail) {
      setError("Email not available");
      return;
    }

    setSendingEmail(true);
    setError("");

    try {
      console.log("📧 Sending wallet access verification email");

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedEmailCode(code);

      const emailData: EmailData = {
        to_email: userProfile.gmail,
        to_name: userProfile.displayName || "User",
        reset_code: code,
        app_name: "Blockpal - Wallet Access",
      };

      const emailSent = await sendPasswordResetEmail(emailData);

      if (!emailSent) {
        throw new Error("Failed to send verification email");
      }

      console.log("✅ Verification email sent successfully");
      console.log("🔑 Code for testing:", code);
    } catch (error: any) {
      console.error("❌ Error sending verification email:", error);
      setError("Failed to send verification email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle email verification (PRESERVED - EmailJS functionality)
  const handleEmailVerification = async () => {
    if (!emailCode.trim() || emailCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    if (emailCode !== generatedEmailCode) {
      setError("Invalid verification code");
      return;
    }

    console.log("✅ Email verification successful");
    setError("");

    // Show disabled message instead of fetching real credentials
    setCredentialsStep("disabled");
  };

  // MODIFIED: Mock password verification
  const handlePasswordVerification = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Mock password verification");

      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show disabled message instead of fetching real credentials
      setCredentialsStep("disabled");
    } catch (error: any) {
      console.error("❌ Error in mock password verification:", error);
      setError("Demo mode: verification failed");
    } finally {
      setLoading(false);
    }
  };

  // REMOVED: Real credential fetching - replaced with disabled message
  const fetchWalletCredentials = async (authValue: string) => {
    // This function is no longer used - credentials are disabled
    setCredentialsStep("disabled");
  };

  // Handle credential type selection (kept for UI consistency)
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

  // Mock download credentials
  const downloadCredentials = () => {
    if (!selectedWalletForCredentials) return;

    const content = `Blockpal Demo Wallet Credentials
Wallet Name: ${selectedWalletForCredentials.name}
Wallet Address: ${selectedWalletForCredentials.address}
Generated: ${new Date().toLocaleDateString()}

⚠️ DEMO MODE WARNING ⚠️
This is a demonstration only. No real wallet credentials are provided.

Demo Private Key: demo_private_key_not_functional
Demo Recovery Phrase: demo words not functional twelve words phrase example test blockchain demo

This file is for demonstration purposes only and contains no real wallet data.`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demo-wallet-credentials-${selectedWalletForCredentials.name.replace(
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

  // MODIFIED: Mock add wallet
  const handleAddWallet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("➕ Mock add wallet");

    // Create a new mock wallet
    const newWallet: MockWallet = {
      id: `demo-${Date.now()}`,
      name: `Wallet ${mockWallets.length + 1}`,
      address: `0x${Math.random()
        .toString(16)
        .substring(2, 42)
        .padStart(40, "0")}`,
      balance: "0.00",
      isActive: false,
    };

    setMockWallets((prev) => [...prev, newWallet]);
    console.log("✅ Mock wallet added:", newWallet.name);
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
              Wallet Manager (Demo)
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
            {/* Demo Notice */}
            <div className="px-3 py-2 bg-yellow-900/20 border-b border-yellow-500/30">
              <div className="flex items-center">
                <AlertTriangle size={14} className="text-yellow-400 mr-2" />
                <p className="text-yellow-400 text-xs font-satoshi">
                  Demo Mode: Wallet functionality disabled
                </p>
              </div>
            </div>

            {/* Wallets List */}
            <div className="px-3 py-2 max-h-[280px] overflow-y-auto scrollbar-hide">
              <div className="space-y-1.5">
                {mockWallets.map((wallet, index) => {
                  const isActive = wallet.isActive;
                  const isSwitching = switchingWallet === wallet.id;

                  if (isSwitching) {
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
                        </div>

                        {/* Divider */}
                        <div className="w-px h-3 bg-[#6E6E6E] mx-2.5 flex-shrink-0"></div>

                        {/* Wallet Info - Clickable for switching OR Rename Input */}
                        {showRenameInput === wallet.id ? (
                          <Input
                            type="text"
                            value={newWalletName}
                            onChange={(e) => setNewWalletName(e.target.value)}
                            className="flex-1 text-xs p-1.5 h-7"
                            placeholder="Enter wallet name"
                            autoFocus
                            disabled={savingRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveWalletRename(wallet.id);
                              } else if (e.key === "Escape") {
                                cancelWalletRename();
                              }
                            }}
                          />
                        ) : (
                          <button
                            onClick={() => handleSelectWallet(wallet.id)}
                            disabled={isSwitching || switchingWallet !== null}
                            className={`flex-1 min-w-0 overflow-hidden text-left hover:opacity-80 transition-opacity disabled:cursor-not-allowed ${
                              switchingWallet !== null && !isSwitching
                                ? "opacity-50"
                                : ""
                            }`}
                          >
                            <div className="text-white font-medium text-xs font-satoshi truncate flex items-center">
                              {wallet.name}
                              {copyFeedback === wallet.id && (
                                <span className="text-[#E2AF19] ml-2 flex items-center">
                                  <Check size={12} className="mr-1" />
                                  Copied!
                                </span>
                              )}
                              {renameFeedback === wallet.id && (
                                <span className="text-[#E2AF19] ml-2 flex items-center">
                                  <Check size={12} className="mr-1" />
                                  Renamed!
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
                        )}

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

                          {/* Rename Button OR Save Button */}
                          {showRenameInput === wallet.id ? (
                            <button
                              onClick={() => saveWalletRename(wallet.id)}
                              disabled={savingRename || !newWalletName.trim()}
                              className={`transition-colors p-1 hover:bg-[#2C2C2C] rounded ${
                                savingRename || !newWalletName.trim()
                                  ? "text-gray-600 cursor-not-allowed"
                                  : "text-[#E2AF19] hover:text-[#E2AF19]"
                              }`}
                              title={
                                savingRename ? "Saving..." : "Save wallet name"
                              }
                            >
                              {savingRename ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#E2AF19]"></div>
                              ) : (
                                <Check size={14} />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleRenameWallet(e, wallet)}
                              className="text-gray-400 hover:text-[#E2AF19] transition-colors p-1 hover:bg-[#2C2C2C] rounded"
                              title="Rename wallet"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}

                          {/* Credentials Button */}
                          <button
                            onClick={(e) => handleShowCredentials(e, wallet)}
                            className="text-gray-400 hover:text-[#E2AF19] transition-colors p-1 hover:bg-[#2C2C2C] rounded"
                            title="View wallet credentials (demo)"
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
                Add Mock Wallet
              </button>
            </div>
          </>
        )}

        {/* Password Verification Step (PRESERVED) */}
        {credentialsStep === "verify" && (
          <div className="p-3 space-y-3">
            <div className="text-center">
              <div className="w-10 h-10 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Shield size={20} className="text-[#E2AF19]" />
              </div>
              <h4 className="text-white font-semibold font-satoshi text-sm mb-1">
                Verify Your Password
              </h4>
              <p className="text-gray-400 text-xs font-satoshi">
                Enter your account password (demo mode)
              </p>
            </div>

            {error && (
              <div className="p-2 bg-red-900/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-xs font-satoshi">{error}</p>
              </div>
            )}

            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="font-satoshi text-sm"
              autoFocus
              disabled={loading}
            />

            <Button
              onClick={handlePasswordVerification}
              disabled={loading || !password.trim()}
              className="w-full text-sm"
            >
              {loading ? "Verifying..." : "Verify Password"}
            </Button>
          </div>
        )}

        {/* Email Verification Step (PRESERVED - EmailJS functionality) */}
        {credentialsStep === "email_verify" && (
          <div className="p-3 space-y-3">
            <div className="text-center">
              <div className="w-10 h-10 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Mail size={20} className="text-[#E2AF19]" />
              </div>
              <h4 className="text-white font-semibold font-satoshi text-sm mb-1">
                Verify Your Email
              </h4>
              <p className="text-gray-400 text-xs font-satoshi">
                We'll send a verification code to your email
              </p>
            </div>

            {error && (
              <div className="p-2 bg-red-900/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-xs font-satoshi">{error}</p>
              </div>
            )}

            {!generatedEmailCode ? (
              <Button
                onClick={sendEmailVerification}
                disabled={sendingEmail}
                className="w-full text-sm"
              >
                {sendingEmail ? "Sending Code..." : "Send Verification Code"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-gray-400 text-xs font-satoshi">
                    Code sent to <strong>{userProfile?.gmail}</strong>
                  </p>
                </div>

                <Input
                  type="text"
                  placeholder="000000"
                  value={emailCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setEmailCode(value);
                    setError("");
                  }}
                  className="font-satoshi text-center text-lg tracking-widest"
                  maxLength={6}
                  autoFocus
                />

                <Button
                  onClick={handleEmailVerification}
                  disabled={emailCode.length !== 6}
                  className="w-full text-sm"
                >
                  Verify Code
                </Button>

                <div className="text-center">
                  <button
                    onClick={sendEmailVerification}
                    className="text-[#E2AF19] hover:opacity-80 text-xs font-satoshi"
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? "Sending..." : "Send again"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEW: Feature Disabled Step */}
        {credentialsStep === "disabled" && selectedWalletForCredentials && (
          <div className="p-3 space-y-3">
            <div className="text-center">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle size={20} className="text-yellow-400" />
              </div>
              <h4 className="text-white font-semibold font-satoshi text-sm mb-1">
                Wallet Features Disabled
              </h4>
              <p className="text-gray-400 text-xs font-satoshi">
                Authentication successful, but wallet functionality is not
                available in this demo version.
              </p>
            </div>

            {/* Demo Notice */}
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-2">
              <p className="text-blue-400 text-xs font-satoshi">
                <strong>Demo Mode Active:</strong>
                <br />
                • Email verification system functional
                <br />
                • Password verification working
                <br />
                • Wallet credentials not available
                <br />
                • Authentication flow preserved
                <br />• UI demonstration only
              </p>
            </div>

            <Button onClick={handleBackToList} className="w-full text-sm">
              Back to Wallets
            </Button>
          </div>
        )}
      </div>

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
