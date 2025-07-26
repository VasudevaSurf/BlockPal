// src/components/wallet/RealtimeWalletSwitcher.tsx - ENHANCED WITH INLINE CREDENTIALS
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
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import {
  setActiveWallet,
  setActiveWalletInDB,
  fetchWallets,
  fetchWalletTokens,
  updateWalletBalance,
  clearTokens,
} from "@/store/slices/walletSlice";
import { useRealtimeWalletBalances } from "@/hooks/useRealtimeWalletBalances";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";
import { sendPasswordResetEmail, EmailData } from "@/lib/emailjs";

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

type CredentialsStep = "list" | "verify" | "email_verify" | "display";

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

  // NEW: Credentials state
  const [credentialsStep, setCredentialsStep] =
    useState<CredentialsStep>("list");
  const [selectedWalletForCredentials, setSelectedWalletForCredentials] =
    useState<any>(null);
  const [credentials, setCredentials] = useState<WalletCredentials | null>(
    null
  );
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [generatedEmailCode, setGeneratedEmailCode] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Get user profile for auth provider info
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

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

      const dropdownHeight = 400; // Increased height for credentials view
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
        // Increased minimum width for credentials
        width = 320;
      }

      setDropdownPosition({ top, left, width });
    }
  }, [isOpen, triggerRef, credentialsStep]);

  // Outside click handling
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

  // Enhanced close handler to reset credentials state
  const handleClose = () => {
    setCredentialsStep("list");
    setSelectedWalletForCredentials(null);
    setCredentials(null);
    setPassword("");
    setEmailCode("");
    setGeneratedEmailCode("");
    setShowPrivateKey(false);
    setShowMnemonic(false);
    setCopied("");
    setError("");
    setLoading(false);
    setSendingEmail(false);
    onClose();
  };

  // Enhanced wallet selection
  const handleSelectWallet = async (walletId: string) => {
    console.log("🎯 RealtimeWalletSwitcher - Wallet selected:", walletId);

    if (switchingWallet === walletId) {
      console.log("⚠️ Already switching to this wallet, ignoring");
      return;
    }

    const selectedWallet = wallets.find((w) => w.id === walletId);
    if (!selectedWallet) {
      console.error("❌ Selected wallet not found:", walletId);
      return;
    }

    setSwitchingWallet(walletId);

    try {
      dispatch(setActiveWallet(walletId));
      dispatch(clearTokens());

      const [dbResult, tokensResult, balanceResult] = await Promise.allSettled([
        dispatch(setActiveWalletInDB(walletId)),
        dispatch(fetchWalletTokens(selectedWallet.address)),
        dispatch(updateWalletBalance(selectedWallet.address)),
      ]);

      if (onWalletSelect) {
        onWalletSelect(walletId).catch((error) => {
          console.warn("⚠️ onWalletSelect callback failed:", error);
        });
      }

      handleClose();
    } catch (error) {
      console.error("❌ Failed to switch wallet:", error);
    } finally {
      setTimeout(() => {
        setSwitchingWallet(null);
      }, 100);
    }
  };

  // NEW: Handle credentials button click
  const handleShowCredentials = (e: React.MouseEvent, wallet: any) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🔑 Show credentials for wallet:", wallet.name);

    setSelectedWalletForCredentials(wallet);
    setCredentialsStep(isGoogleOnlyUser ? "email_verify" : "verify");
    setError("");
  };

  // NEW: Send email verification for Google users
  const sendEmailVerification = async () => {
    if (!userProfile?.gmail) {
      setError("Email not available");
      return;
    }

    setSendingEmail(true);
    setError("");

    try {
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

  // NEW: Handle email verification
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
    await fetchWalletCredentials("GOOGLE_USER_VERIFIED");
  };

  // NEW: Handle password verification
  const handlePasswordVerification = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError("Incorrect password. Please try again.");
        setLoading(false);
        return;
      }

      await fetchWalletCredentials(password);
    } catch (error: any) {
      console.error("❌ Error verifying password:", error);
      setError("Network error occurred. Please try again.");
      setLoading(false);
    }
  };

  // NEW: Fetch wallet credentials
  const fetchWalletCredentials = async (authValue: string) => {
    if (!selectedWalletForCredentials) {
      setError("No wallet selected");
      return;
    }

    setError("");

    try {
      const response = await fetch("/api/wallets/private-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: selectedWalletForCredentials.address,
          password: authValue,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to retrieve wallet credentials");
        return;
      }

      setCredentials({
        privateKey: data.privateKey,
        mnemonic: data.mnemonic,
      });
      setCredentialsStep("display");
    } catch (error: any) {
      console.error("❌ Error fetching wallet credentials:", error);
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // NEW: Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // NEW: Back to wallet list
  const handleBackToList = () => {
    setCredentialsStep("list");
    setSelectedWalletForCredentials(null);
    setCredentials(null);
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
    dispatch(fetchWallets());
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
          maxHeight: "450px",
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
              Wallet Manager
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
                {realtimeBalances.map((wallet, index) => {
                  const isActive = activeWallet?.id === wallet.id;
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

                        {/* Wallet Info - Clickable for switching */}
                        <button
                          onClick={() => handleSelectWallet(wallet.id)}
                          disabled={isSwitching || switchingWallet !== null}
                          className={`flex-1 min-w-0 overflow-hidden text-left hover:opacity-80 transition-opacity disabled:cursor-not-allowed ${
                            switchingWallet !== null && !isSwitching
                              ? "opacity-50"
                              : ""
                          }`}
                        >
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
                        </button>

                        {/* NEW: Credentials Button */}
                        <button
                          onClick={(e) => handleShowCredentials(e, wallet)}
                          className="text-gray-400 hover:text-[#E2AF19] transition-colors p-1 hover:bg-[#2C2C2C] rounded ml-2"
                          title="View wallet credentials"
                        >
                          <Key size={14} />
                        </button>

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

        {/* Password Verification Step */}
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
                Enter your account password to view wallet credentials
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

        {/* Email Verification Step */}
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

        {/* Credentials Display Step */}
        {credentialsStep === "display" &&
          credentials &&
          selectedWalletForCredentials && (
            <div className="p-3 space-y-3 max-h-[350px] overflow-y-auto scrollbar-hide">
              <div className="text-center">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle size={20} className="text-green-400" />
                </div>
                <h4 className="text-white font-semibold font-satoshi text-sm mb-1">
                  {selectedWalletForCredentials.name}
                </h4>
                <p className="text-gray-400 text-xs font-satoshi">
                  Wallet Credentials
                </p>
              </div>

              {/* Security Warning */}
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2">
                <div className="flex items-start">
                  <AlertTriangle
                    size={12}
                    className="text-red-400 mr-1.5 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-red-400 text-xs font-satoshi">
                    Never share these credentials. Anyone with this information
                    can control your wallet.
                  </p>
                </div>
              </div>

              {/* Private Key */}
              <div className="bg-[#0F0F0F] rounded-lg p-2 border border-[#2C2C2C]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs font-satoshi">
                    Private Key:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-gray-400 hover:text-white transition-colors p-0.5"
                    >
                      {showPrivateKey ? (
                        <EyeOff size={12} />
                      ) : (
                        <Eye size={12} />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(credentials.privateKey, "privateKey")
                      }
                      className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-xs"
                    >
                      <Copy size={10} className="mr-0.5" />
                      {copied === "privateKey" ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="text-white font-mono text-xs break-all leading-relaxed">
                  {showPrivateKey ? credentials.privateKey : "•".repeat(64)}
                </div>
              </div>

              {/* Mnemonic (if available) */}
              {credentials.mnemonic && (
                <div className="bg-[#0F0F0F] rounded-lg p-2 border border-[#2C2C2C]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-xs font-satoshi">
                      Recovery Phrase:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowMnemonic(!showMnemonic)}
                        className="text-gray-400 hover:text-white transition-colors p-0.5"
                      >
                        {showMnemonic ? (
                          <EyeOff size={12} />
                        ) : (
                          <Eye size={12} />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(credentials.mnemonic!, "mnemonic")
                        }
                        className="text-[#E2AF19] hover:opacity-80 transition-opacity flex items-center text-xs"
                      >
                        <Copy size={10} className="mr-0.5" />
                        {copied === "mnemonic" ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="text-white font-mono text-xs break-all leading-relaxed">
                    {showMnemonic
                      ? credentials.mnemonic
                      : "•".repeat(credentials.mnemonic.length)}
                  </div>
                </div>
              )}

              {/* Wallet Info */}
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-2">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 text-xs font-satoshi">
                      Address:
                    </span>
                    <span className="text-blue-300 text-xs font-satoshi font-mono">
                      {selectedWalletForCredentials.address.slice(0, 8)}...
                      {selectedWalletForCredentials.address.slice(-6)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
