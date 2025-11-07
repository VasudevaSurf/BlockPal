// src/components/wallet/WalletConnectButton.tsx - UPDATED FOR APPKIT
"use client";

import {
  useAppKitAccount,
  useAppKitNetwork,
  useDisconnect,
} from "@reown/appkit/react";
import { useState, useEffect, useRef } from "react";
import { Copy, LogOut, Check, Wallet } from "lucide-react";
import { chains, solana } from "@/components/wallet/WalletProvider";
import { useToast } from "@/contexts/ToastContext";
import { clearWalletConnection } from "@/utils/walletCleanup";
import DisconnectModal from "@/components/modals/DisconnectModal";

interface WalletConnectButtonProps {
  isMinimized?: boolean;
  height?: string;
}

// Chain display data with Solana
const getChainDisplayData = () => {
  const chainDisplayData: {
    [key: string]: {
      name: string;
      color: string;
      icon: string;
      image?: string;
      fallbackIcon: string;
      useBackground: boolean;
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
    },
  };

  return chainDisplayData;
};

// Image cache system
const imageCache = new Map<string, boolean>();

const preloadImage = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (imageCache.has(src)) {
      resolve(imageCache.get(src) || false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.set(src, true);
      resolve(true);
    };
    img.onerror = () => {
      imageCache.set(src, false);
      resolve(false);
    };
    img.src = src;
  });
};

// Chain Icon Component
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
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(
    () => {
      if (chainData.image && imageCache.has(chainData.image)) {
        return imageCache.get(chainData.image) ? "loaded" : "error";
      }
      return "loading";
    }
  );

  const mountedRef = useRef(true);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  useEffect(() => {
    mountedRef.current = true;

    if (chainData.image && imageCache.has(chainData.image)) {
      const cached = imageCache.get(chainData.image);
      setImageState(cached ? "loaded" : "error");
      return;
    }

    if (chainData.image) {
      preloadImage(chainData.image).then((success) => {
        if (mountedRef.current) {
          setImageState(success ? "loaded" : "error");
        }
      });
    } else {
      setImageState("error");
    }

    return () => {
      mountedRef.current = false;
    };
  }, [chainData.image]);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
      style={{
        opacity: imageState === "loading" ? 0 : 1,
        transition: "opacity 0.15s ease-in",
      }}
    >
      {imageState === "loaded" && chainData.image && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className="w-full h-full object-contain p-0.5"
          draggable={false}
          style={{ userSelect: "none", pointerEvents: "none" }}
        />
      )}

      {imageState === "error" && (
        <div
          className={`${chainData.color} w-full h-full flex items-center justify-center absolute inset-0`}
        >
          <span
            className={`text-white ${iconSizes[size]} font-bold font-satoshi`}
          >
            {chainData.fallbackIcon}
          </span>
        </div>
      )}
    </div>
  );
};

export default function WalletConnectButton({
  isMinimized = false,
  height = "h-10",
}: WalletConnectButtonProps) {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { disconnect } = useDisconnect();
  const { showToast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const chainDisplayData = getChainDisplayData();

  // Get current chain identifier (handles both EVM and Solana)
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
  const isSolana =
    caipNetwork?.name?.toLowerCase() === "solana" ||
    caipNetwork?.id?.toString().includes("solana") ||
    caipNetwork?.chainNamespace === "solana";

  console.log("Connected to:", {
    address,
    network: caipNetwork?.name,
    isSolana,
  });

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
        useBackground: false,
      }
    );
  };

  const currentChainDisplay = getCurrentChainDisplay();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const chainDisplayData = getChainDisplayData();

    const preloadAllChainImages = async () => {
      const images = Object.values(chainDisplayData)
        .map((data) => data.image)
        .filter(Boolean) as string[];

      await Promise.all(images.map((src) => preloadImage(src)));
    };

    preloadAllChainImages();
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setShowDisconnectModal(false);
    }
  }, [isConnected]);

  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      showToast("success", "Wallet address copied to clipboard!", 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
      showToast("error", "Failed to copy address", 2000);
    }
  };

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = () => {
    console.log("🔌 Confirming wallet disconnect...");
    disconnect();
    clearWalletConnection();
    setShowDisconnectModal(false);
    showToast("success", "Wallet disconnected successfully", 3000);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        className={`flex items-center rounded-[12px] bg-[#E2AF19] text-black font-medium font-satoshi text-xs transition-all duration-200 hover:bg-[#D4A118] active:bg-[#C69516] disabled:opacity-50 disabled:cursor-not-allowed ${
          isMinimized
            ? `w-10 ${height} justify-center`
            : `w-full px-3 py-1.5 ${height} justify-center`
        }`}
        disabled
        title={isMinimized ? "Connect Wallet" : undefined}
      >
        <Wallet size={16} className={isMinimized ? "" : "mr-2"} />
        {!isMinimized && "Connect Wallet"}
      </button>
    );
  }

  return (
    <>
      <div className="wallet-container">
        {!isConnected ? (
          <appkit-button />
        ) : (
          <>
            {isMinimized ? (
              <div className="flex flex-col gap-2">
                <div
                  className={`w-10 ${height} bg-[#E2AF19] border border-[#E2AF19] rounded-[12px] flex items-center justify-center relative group cursor-pointer hover:bg-[#D4A118] transition-colors`}
                  title={`Connected: ${address?.slice(0, 6)}...${address?.slice(
                    -4
                  )}`}
                >
                  <ChainIcon chainData={currentChainDisplay} size="sm" />
                </div>

                <button
                  onClick={handleCopyAddress}
                  className={`w-10 ${height} bg-[#E2AF19] border border-[#E2AF19] rounded-[12px] hover:bg-[#D4A118] transition-colors flex items-center justify-center group relative`}
                  title="Copy Address"
                >
                  {copied ? (
                    <Check size={14} className="text-black" />
                  ) : (
                    <Copy size={14} className="text-black" />
                  )}
                </button>

                <button
                  onClick={handleDisconnectClick}
                  className={`w-10 ${height} bg-[#F9EFD1] border border-[#F9EFD1] rounded-[12px] hover:bg-[#F5E8C4] transition-colors flex items-center justify-center group relative`}
                  title="Disconnect"
                >
                  <LogOut size={14} className="text-black" />
                </button>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="bg-[#E2AF19] rounded-[12px] p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#0F0F0F] text-xs font-satoshi font-medium">
                        Connected Wallet
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ChainIcon chainData={currentChainDisplay} size="sm" />
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="text-[#000] text-sm font-satoshi text-[16px]">
                      {address
                        ? `${address.slice(0, 6)}...${address.slice(-6)}`
                        : "Connected"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyAddress}
                    className="bg-[#E2AF19] rounded-[12px] px-3 py-2 flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-[#000]" />
                        <span className="text-[#000] text-xs font-satoshi">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="text-[#000]" />
                        <span className="text-[#000] text-xs font-satoshi">
                          Copy
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDisconnectClick}
                    className="bg-[#F9EFD1] border rounded-[12px] px-3 py-2 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={12} className="text-[#E74C3C]" />
                    <span className="text-[#E74C3C] text-xs font-satoshi">
                      Disconnect
                    </span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isConnected && (
        <DisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          onConfirm={confirmDisconnect}
          walletAddress={address}
        />
      )}
    </>
  );
}
