// src/components/dashboard/MobileWalletMenu.tsx - UPDATED WITH SOLANA SUPPORT
"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp, Copy, LogOut, Check } from "lucide-react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useDisconnect, useSwitchChain } from "wagmi";
import { chains, solana } from "@/components/wallet/WalletProvider";
import WalletConnectButton from "@/components/wallet/WalletConnectButton";
import DisconnectModal from "@/components/modals/DisconnectModal";
import { clearWalletConnection } from "@/utils/walletCleanup";
import { useToast } from "@/contexts/ToastContext";

// Chain data with Solana
const getChainDisplayData = () => {
  const chainDisplayData: {
    [key: string]: {
      name: string;
      color: string;
      icon: string;
      image?: string;
      fallbackIcon: string;
      useBackground: boolean;
      isSolana?: boolean;
    };
  } = {
    1: {
      name: "Ethereum",
      color: "bg-blue-500",
      icon: "Ξ",
      image: "/chains/Ethereum.png",
      fallbackIcon: "Ξ",
      useBackground: false,
    },
    8453: {
      name: "Base",
      color: "bg-blue-600",
      icon: "B",
      image: "/chains/Base.png",
      fallbackIcon: "B",
      useBackground: false,
    },
    137: {
      name: "Polygon",
      color: "bg-purple-500",
      icon: "◆",
      image: "/chains/Polygon.png",
      fallbackIcon: "◆",
      useBackground: false,
    },
    43114: {
      name: "Avalanche",
      color: "bg-red-500",
      icon: "A",
      image: "/chains/Avalanche.png",
      fallbackIcon: "A",
      useBackground: true,
    },
    42161: {
      name: "Arbitrum",
      color: "bg-blue-400",
      icon: "◉",
      image: "/chains/Arbitrum.png",
      fallbackIcon: "◉",
      useBackground: false,
    },
    56: {
      name: "BSC",
      color: "bg-yellow-500",
      icon: "B",
      image: "/chains/BSC.png",
      fallbackIcon: "B",
      useBackground: true,
    },
    solana: {
      name: "Solana",
      color: "bg-gradient-to-r from-purple-500 to-blue-500",
      icon: "◎",
      image: "/chains/Solana.png",
      fallbackIcon: "◎",
      useBackground: false,
      isSolana: true,
    },
  };

  return chainDisplayData;
};

// Chain Icon Component (same as before)
interface ChainIconProps {
  chainData: {
    name: string;
    color: string;
    icon: string;
    image?: string;
    fallbackIcon: string;
    useBackground: boolean;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ChainIcon = ({
  chainData,
  size = "md",
  className = "",
}: ChainIconProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
  };

  const iconSizes = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
  };

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [chainData.image]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const shouldShowBackground =
    !chainData.image || imageError || !imageLoaded || chainData.useBackground;
  const backgroundClass = shouldShowBackground ? chainData.color : "";

  return (
    <div
      className={`${sizeClasses[size]} ${backgroundClass} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
    >
      {chainData.image && !imageError && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          } ${!chainData.useBackground && imageLoaded ? "p-0" : "p-1"}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
      )}

      {(!chainData.image || imageError || !imageLoaded) && (
        <span
          className={`text-white ${iconSizes[size]} font-bold font-satoshi absolute inset-0 flex items-center justify-center`}
        >
          {chainData.fallbackIcon}
        </span>
      )}
    </div>
  );
};

interface MobileWalletMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileWalletMenu({
  isOpen,
  onClose,
}: MobileWalletMenuProps) {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { disconnect } = useDisconnect();
  const { showToast } = useToast();

  const { switchChain, isPending: isSwitchingChain } = useSwitchChain({
    mutation: {
      onSuccess: (data) => {
        console.log("✅ Chain switched successfully to:", data.name);
        setSwitchingChain(null);
        setSwitchError(null);
        setTimeout(() => {
          setChainSelectorExpanded(false);
        }, 500);
      },
      onError: (error) => {
        console.error("❌ Chain switch error:", error);
        let userMessage = "Failed to switch chain";
        if (
          error.message?.includes("rejected") ||
          error.message?.includes("denied")
        ) {
          userMessage = "Chain switch was cancelled by user";
        } else if (error.message?.includes("Unrecognized chain")) {
          userMessage = "This chain is not supported by your wallet";
        } else if (error.message) {
          userMessage = error.message;
        }
        setSwitchError(userMessage);
        setSwitchingChain(null);
      },
      onMutate: (variables) => {
        console.log("🔄 Starting chain switch to:", variables.chainId);
        setSwitchingChain(variables.chainId);
        setSwitchError(null);
      },
    },
  });

  const [chainSelectorExpanded, setChainSelectorExpanded] = useState(false);
  const [switchingChain, setSwitchingChain] = useState<number | string | null>(
    null
  );
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const chainDisplayData = getChainDisplayData();

  // Get current chain ID (handles both EVM and Solana)
  const getCurrentChainId = (): string => {
    if (!caipNetwork) return "1";

    if (
      caipNetwork.name?.toLowerCase() === "solana" ||
      caipNetwork.id?.toString().includes("solana") ||
      caipNetwork.chainNamespace === "solana"
    ) {
      return "solana";
    }

    return caipNetwork.id?.toString() || "1";
  };

  const currentChainId = getCurrentChainId();
  const isSolana = currentChainId === "solana";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setSwitchError(null);
      setSwitchingChain(null);
      setChainSelectorExpanded(false);
      setShowDisconnectModal(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (
      currentChainId &&
      switchingChain &&
      currentChainId === switchingChain.toString()
    ) {
      console.log("✅ Chain switch completed, clearing switching state");
      setSwitchingChain(null);
      setSwitchError(null);
    }
  }, [currentChainId, switchingChain]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDisconnectModal) return;

      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
        setChainSelectorExpanded(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose, showDisconnectModal]);

  const getCurrentChainDisplay = () => {
    if (
      mounted &&
      isConnected &&
      currentChainId &&
      chainDisplayData[currentChainId]
    ) {
      return chainDisplayData[currentChainId];
    }

    return (
      chainDisplayData["1"] || {
        name: "Ethereum",
        color: "bg-blue-500",
        icon: "Ξ",
        image: "/chains/Ethereum.png",
        fallbackIcon: "Ξ",
        useBackground: true,
      }
    );
  };

  const currentChainDisplay = getCurrentChainDisplay();

  const handleChainSwitch = async (targetChainId: number | string) => {
    if (!mounted || !isConnected || !address) {
      setSwitchError("Please connect your wallet first");
      return;
    }

    // If switching to Solana, use AppKit's network switcher
    if (targetChainId === "solana") {
      console.log("🔄 Switching to Solana network via AppKit");
      // AppKit will handle Solana network switching automatically
      // through the wallet connection
      showToast("info", "Please switch to Solana network in your wallet", 3000);
      setChainSelectorExpanded(false);
      return;
    }

    // If currently on Solana and switching to EVM, inform user
    if (isSolana && typeof targetChainId === "number") {
      showToast(
        "info",
        "Please switch to an EVM network in your wallet first",
        3000
      );
      setChainSelectorExpanded(false);
      return;
    }

    if (currentChainId === targetChainId.toString()) {
      setChainSelectorExpanded(false);
      return;
    }

    if (isSwitchingChain || switchingChain) {
      console.log("⚠️ Chain switch already in progress");
      return;
    }

    // Only use switchChain for EVM chains
    if (typeof targetChainId === "number") {
      console.log(`🔄 Initiating EVM chain switch to ${targetChainId}`);

      try {
        switchChain({ chainId: targetChainId });
      } catch (error: any) {
        console.error("❌ Error calling switchChain:", error);
        setSwitchError(error.message || "Failed to switch chain");
        setSwitchingChain(null);
      }
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      showToast("success", "Wallet address copied to clipboard!", 2000);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = () => {
    console.log("🔌 Confirming wallet disconnect...");
    disconnect();
    clearWalletConnection();
    setShowDisconnectModal(false);
    onClose();
    showToast("success", "Wallet disconnected successfully", 3000);
  };

  const handleDisconnectModalClose = () => {
    setShowDisconnectModal(false);
  };

  if (!isOpen) return null;

  // Create combined chain list with Solana
  const allChains = [
    ...chains.map((chain) => ({
      id: chain.id,
      name: chainDisplayData[chain.id]?.name || chain.name,
      isEVM: true,
    })),
    {
      id: "solana",
      name: "Solana",
      isEVM: false,
    },
  ];

  return (
    <>
      <div
        className="fixed lg:absolute inset-0 bg-white/10 z-40"
        onClick={onClose}
      />

      <div
        ref={menuRef}
        className="fixed top-16 right-4 w-72 bg-[#000000] border border-[#2C2C2C] rounded-2xl shadow-2xl z-50 lg:hidden overflow-hidden max-h-[calc(100vh-5rem)]"
      >
        <div className="overflow-y-auto max-h-full scrollbar-hide">
          <div className="p-3">
            {/* Chain Selection */}
            {mounted && isConnected && (
              <div className="mb-3">
                <div className="bg-[#000000] border border-[#2C2C2C] rounded-xl overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChainSelectorExpanded(!chainSelectorExpanded);
                    }}
                    className="w-full flex items-center justify-between p-3 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ChainIcon chainData={currentChainDisplay} size="sm" />
                      <span className="text-white text-sm font-satoshi">
                        {currentChainDisplay.name}
                        {isSolana && (
                          <span className="ml-2 text-xs text-purple-400">
                            (Non-EVM)
                          </span>
                        )}
                      </span>
                    </div>
                    {chainSelectorExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </button>

                  {chainSelectorExpanded && (
                    <div className="bg-[#000000] border-t border-[#2C2C2C]">
                      <div className="max-h-64 overflow-y-auto scrollbar-hide">
                        {allChains.map((chain) => {
                          const chainDisplay = chainDisplayData[chain.id] || {
                            name: chain.name,
                            color: "bg-gray-500",
                            icon: chain.name.charAt(0),
                            fallbackIcon: chain.name.charAt(0),
                            useBackground: true,
                          };

                          const isCurrentChain =
                            currentChainId === chain.id.toString();
                          const isSwitching = switchingChain === chain.id;

                          return (
                            <button
                              key={chain.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChainSwitch(chain.id);
                              }}
                              disabled={
                                isSwitching || !isConnected || isSwitchingChain
                              }
                              className={`w-full flex items-center justify-between p-3 transition-all hover:bg-[#1A1A1A] ${
                                !isConnected
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              } ${isSwitching ? "opacity-70" : ""}`}
                            >
                              <div className="flex items-center gap-2">
                                <ChainIcon chainData={chainDisplay} size="sm" />
                                <div className="flex flex-col items-start">
                                  <span
                                    className={`text-sm font-satoshi ${
                                      isCurrentChain
                                        ? "text-[#E2AF19]"
                                        : "text-white"
                                    }`}
                                  >
                                    {chainDisplay.name}
                                    {isSwitching && (
                                      <span className="ml-2 text-xs">
                                        (Switching...)
                                      </span>
                                    )}
                                  </span>
                                  {!chain.isEVM && (
                                    <span className="text-xs text-purple-400">
                                      Non-EVM Chain
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                className={`w-10 h-5 rounded-full transition-colors relative ${
                                  isCurrentChain
                                    ? "bg-[#E2AF19]"
                                    : "bg-[#2C2C2C]"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                                    isCurrentChain
                                      ? "translate-x-5"
                                      : "translate-x-0.5"
                                  }`}
                                >
                                  {isSwitching && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-2.5 h-2.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {switchError && (
                        <div className="p-3 bg-red-900/20 border-t border-red-500/50">
                          <p className="text-red-400 text-xs font-satoshi">
                            {switchError}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSwitchError(null);
                            }}
                            className="text-red-400 hover:text-red-300 text-xs font-satoshi underline mt-1"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Connected Wallet Section */}
            {mounted && isConnected ? (
              <div className="bg-[#000000] rounded-xl p-3 border border-[#2C2C2C]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs font-satoshi">
                    Connected Wallet
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-500 text-xs font-satoshi">
                      Connected
                    </span>
                  </div>
                </div>

                {address && (
                  <div className="bg-black rounded-lg p-2 mb-2">
                    <div className="text-white text-xs font-satoshi font-mono">
                      {address.slice(0, 8)}...{address.slice(-6)}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyAddress}
                    className="flex-1 bg-[#E2AF19] hover:bg-[#D4A118] text-black text-xs font-satoshi py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-black" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="text-black" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnectClick}
                    className="flex-1 bg-[#F9EFD1] hover:bg-[#F5E8C4] text-black text-xs font-satoshi py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={12} className="text-black" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-gray-400 text-xs font-satoshi mb-2 block">
                  Wallet
                </label>
                <WalletConnectButton isMinimized={false} />
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>

      {isConnected && (
        <DisconnectModal
          isOpen={showDisconnectModal}
          onClose={handleDisconnectModalClose}
          onConfirm={confirmDisconnect}
          walletAddress={address}
        />
      )}
    </>
  );
}
