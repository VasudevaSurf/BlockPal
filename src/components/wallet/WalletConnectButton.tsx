// src/components/wallet/WalletConnectButton.tsx - COMPLETE FIXED VERSION
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import { useState, useEffect, useRef } from "react";
import { Copy, LogOut, Check, Wallet } from "lucide-react";
import { chains } from "./WalletProvider";

interface WalletConnectButtonProps {
  isMinimized?: boolean;
  height?: string;
}

// Chain display data with image paths
const getChainDisplayData = () => {
  const chainDisplayData: {
    [key: number]: {
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
  };

  return chainDisplayData;
};

// ✅ FIXED: Image cache and preload system
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

// ✅ FIXED: Chain Icon Component
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
      // ✅ Check cache on initial render
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

    // Check cache first
    if (chainData.image && imageCache.has(chainData.image)) {
      const cached = imageCache.get(chainData.image);
      setImageState(cached ? "loaded" : "error");
      return;
    }

    // Preload image if not cached
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
        // ✅ Hide completely during loading
        opacity: imageState === "loading" ? 0 : 1,
        transition: "opacity 0.15s ease-in",
      }}
    >
      {/* Show image when loaded */}
      {imageState === "loaded" && chainData.image && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className="w-full h-full object-contain p-0.5"
          draggable={false}
          style={{ userSelect: "none", pointerEvents: "none" }}
        />
      )}

      {/* Show fallback only on error */}
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
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get chain display data
  const chainDisplayData = getChainDisplayData();

  // Get current chain data
  const currentChain = chains.find((c) => c.id === chainId);

  // Get display data for current chain
  const getCurrentChainDisplay = () => {
    if (mounted && isConnected && chainId && chainDisplayData[chainId]) {
      return chainDisplayData[chainId];
    }

    // Fallback to Ethereum
    return (
      chainDisplayData[1] || {
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

  // Ensure component is mounted before accessing wallet state
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Preload all chain images on mount
  useEffect(() => {
    const chainDisplayData = getChainDisplayData();

    const preloadAllChainImages = async () => {
      const images = Object.values(chainDisplayData)
        .map((data) => data.image)
        .filter(Boolean) as string[];

      console.log("🔄 WalletConnectButton: Preloading chain images");
      await Promise.all(images.map((src) => preloadImage(src)));
      console.log("✅ WalletConnectButton: All chain images preloaded");
    };

    preloadAllChainImages();
  }, []);

  // Clear errors when successfully connected
  useEffect(() => {
    if (mounted && isConnected && address) {
      setConnectionError(null);
    }
  }, [mounted, isConnected, address]);

  // Handle copy address
  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setConnectionError(null);
  };

  // Return a static button during SSR/hydration
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
    <div className="wallet-container">
      {connectionError && !isMinimized && (
        <div className="mb-2 p-2 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-xs font-satoshi">{connectionError}</p>
        </div>
      )}

      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted: rainbowKitMounted,
        }) => {
          const ready = rainbowKitMounted && authenticationStatus !== "loading";
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === "authenticated");

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={() => {
                        setConnectionError(null);
                        openConnectModal();
                      }}
                      type="button"
                      className={`flex items-center rounded-[12px] bg-[#E2AF19] text-black font-medium font-satoshi text-xs transition-all duration-200 hover:bg-[#D4A118] active:bg-[#C69516] disabled:opacity-50 disabled:cursor-not-allowed ${
                        isMinimized
                          ? `w-10 ${height} justify-center`
                          : `w-full px-3 py-1.5 ${height} justify-center`
                      }`}
                      title={isMinimized ? "Connect Wallet" : undefined}
                    >
                      <Wallet size={16} className={isMinimized ? "" : "mr-2"} />
                      {!isMinimized && "Connect Wallet"}
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={() => {
                        setConnectionError(null);
                        openChainModal();
                      }}
                      type="button"
                      className={`bg-red-500 hover:bg-red-600 text-white rounded-[12px] font-satoshi text-xs flex items-center justify-center ${
                        isMinimized
                          ? `w-10 ${height}`
                          : `w-full py-2 px-4 ${height}`
                      }`}
                      title={isMinimized ? "Wrong Network" : undefined}
                    >
                      {isMinimized ? "⚠️" : "Wrong network"}
                    </button>
                  );
                }

                // Connected wallet - minimized view (icons only)
                if (isMinimized) {
                  return (
                    <div className="flex flex-col gap-2">
                      {/* Connected status indicator with chain image */}
                      <div
                        className={`w-10 ${height} bg-[#E2AF19] border border-[#E2AF19] rounded-[12px] flex items-center justify-center relative group cursor-pointer hover:bg-[#D4A118] transition-colors`}
                        title={`Connected: ${account.displayName}`}
                      >
                        <ChainIcon chainData={currentChainDisplay} size="sm" />
                      </div>

                      {/* Copy address button */}
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

                      {/* Disconnect button */}
                      <button
                        onClick={handleDisconnect}
                        className={`w-10 ${height} bg-[#F9EFD1] border border-[#F9EFD1] rounded-[12px] hover:bg-[#F5E8C4] transition-colors flex items-center justify-center group relative`}
                        title="Disconnect"
                      >
                        <LogOut size={14} className="text-black" />
                      </button>
                    </div>
                  );
                }

                // Connected wallet - full view
                return (
                  <div className="w-full space-y-2">
                    {/* Main wallet info box */}
                    <div className="bg-[#E2AF19] rounded-[12px] p-3">
                      {/* Connection status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#0F0F0F] text-xs font-satoshi font-medium">
                            Connected Wallet
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Chain icon with image */}
                          <ChainIcon
                            chainData={currentChainDisplay}
                            size="sm"
                          />
                        </div>
                      </div>

                      {/* Wallet address */}
                      <div className="mb-2">
                        <span className="text-[#000] text-sm font-satoshi text-[16px]">
                          {account.address
                            ? `${account.address.slice(
                                0,
                                6
                              )}...${account.address.slice(-6)}`
                            : account.displayName}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Copy address button */}
                      <button
                        onClick={handleCopyAddress}
                        className="bg-[#E2AF19] rounded-[12px] px-3 py-2 flex items-center justify-center gap-2"
                      >
                        {copied ? (
                          <>
                            <Check size={12} className="[#000]" />
                            <span className="[#000] text-xs font-satoshi">
                              Copied
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} className="[#000]" />
                            <span className="[#000] text-xs font-satoshi">
                              Copy
                            </span>
                          </>
                        )}
                      </button>

                      {/* Disconnect button */}
                      <button
                        onClick={handleDisconnect}
                        className="bg-[#F9EFD1] border rounded-[12px] px-3 py-2 transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut size={12} className="[#E74C3C]" />
                        <span className="[#E74C3C] text-xs font-satoshi">
                          Disconnect
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
