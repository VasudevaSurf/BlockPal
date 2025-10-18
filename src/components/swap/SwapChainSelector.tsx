// src/components/swap/SwapChainSelector.tsx - FIXED FLICKERING VERSION
"use client";

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useChainId, useSwitchChain } from "wagmi";
import { chains } from "@/components/wallet/WalletProvider";

// Chain data with proper image paths
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
      useBackground: true,
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

// ✅ FIXED: Preload images cache to prevent flickering
const imageCache = new Map<string, boolean>();

// Preload function
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

// Chain Icon Component - FIXED VERSION
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

const ChainIcon: React.FC<ChainIconProps> = ({
  chainData,
  size = "md",
  className = "",
}) => {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(
    "loading"
  );
  const mountedRef = useRef(true);

  const sizeClasses = {
    sm: "w-4 h-4 lg:w-5 lg:h-5",
    md: "w-5 h-5 lg:w-6 lg:h-6",
    lg: "w-6 h-6 lg:w-8 lg:h-8",
  };

  useEffect(() => {
    mountedRef.current = true;

    // Check cache first
    if (chainData.image && imageCache.has(chainData.image)) {
      const cached = imageCache.get(chainData.image);
      setImageState(cached ? "loaded" : "error");
      return;
    }

    // Preload image
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
    >
      {/* Show image only when loaded */}
      {imageState === "loaded" && chainData.image && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className="w-full h-full object-contain p-1"
          draggable={false}
        />
      )}

      {/* Show fallback immediately when loading or error */}
      {imageState !== "loaded" && (
        <div
          className={`${chainData.color} w-full h-full flex items-center justify-center absolute inset-0`}
        >
          <span className="text-white text-[10px] lg:text-xs font-bold font-satoshi">
            {chainData.fallbackIcon}
          </span>
        </div>
      )}
    </div>
  );
};

interface SwapChainSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onChainSelect?: (chainId: number) => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

const SwapChainSelector: React.FC<SwapChainSelectorProps> = ({
  isOpen,
  onClose,
  onChainSelect,
  triggerRef,
}) => {
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain({
    mutation: {
      onSuccess: (data, variables) => {
        setSwitchingChain(null);
        setSelectedChain(variables.chainId);
        if (onChainSelect) {
          onChainSelect(variables.chainId);
        }
        onClose();
      },
      onError: (error) => {
        console.error("❌ Chain switch failed:", error);
        setSwitchingChain(null);
      },
      onSettled: () => {
        setSwitchingChain(null);
      },
    },
  });

  const [selectedChain, setSelectedChain] = useState(chainId);
  const [switchingChain, setSwitchingChain] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 320,
  });

  const chainDisplayData = getChainDisplayData();

  // ✅ Preload all chain images on mount
  useEffect(() => {
    const preloadAllImages = async () => {
      const images = Object.values(chainDisplayData)
        .map((data) => data.image)
        .filter(Boolean) as string[];

      await Promise.all(images.map((src) => preloadImage(src)));
    };

    preloadAllImages();
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 1024;

      setDropdownPosition({
        top: triggerRect.bottom + 8,
        left: isMobile ? triggerRect.left : triggerRect.left,
        width: isMobile
          ? Math.min(triggerRect.width * 2.2, 280)
          : Math.max(triggerRect.width * 1.7, 320),
      });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (chainId) {
      setSelectedChain(chainId);
    }
  }, [chainId]);

  useEffect(() => {
    if (isOpen) {
      setSwitchingChain(null);
      setSelectedChain(chainId);
    }
  }, [isOpen, chainId]);

  const handleChainSelect = (targetChainId: number) => {
    setSelectedChain(targetChainId);
  };

  const handleConfirm = async () => {
    if (selectedChain === chainId) {
      onClose();
      return;
    }

    setSwitchingChain(selectedChain);

    try {
      if (switchChain) {
        await switchChain({ chainId: selectedChain });
      }
    } catch (error) {
      console.error("Failed to switch chain:", error);
      setSwitchingChain(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-white/10 z-40" onClick={onClose} />

      {/* Desktop Dropdown */}
      <div
        className="hidden lg:block fixed z-50 bg-[#0F0F0F] rounded-[28px] border border-[#2C2C2C] shadow-2xl"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "350px",
        }}
      >
        <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
          {chains.map((chain) => {
            const chainDisplay = chainDisplayData[chain.id] || {
              name: chain.name,
              color: "bg-gray-500",
              icon: chain.name.charAt(0),
              fallbackIcon: chain.name.charAt(0),
              useBackground: true,
            };

            const isSelected = selectedChain === chain.id;
            const isSwitching = switchingChain === chain.id;

            return (
              <button
                key={chain.id}
                onClick={() => handleChainSelect(chain.id)}
                disabled={isSwitching || isSwitchingChain}
                className={`w-full p-3 rounded-[10px] transition-all duration-200 text-left ${
                  isSelected
                    ? "bg-[#71570C] border border-[#E2AF19]"
                    : "border border-[#2C2C2C] hover:border-[#4C4C4C]"
                } ${isSwitching ? "opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ChainIcon chainData={chainDisplay} size="md" />
                    <span
                      className={`text-base font-satoshi font-medium ${
                        isSelected ? "text-[#E2AF19]" : "text-white"
                      }`}
                    >
                      {chainDisplay.name}
                      {isSwitching && (
                        <span className="ml-2 text-xs text-gray-400">
                          (Switching...)
                        </span>
                      )}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 bg-[#E2AF19] rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-black"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 pt-1">
          <button
            onClick={handleConfirm}
            disabled={isSwitchingChain || switchingChain !== null}
            className={`w-full py-3 font-mayeka-demi-bold-demo font-medium text-base rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedChain === chainId
                ? "bg-[#2C2C2C] text-gray-400 cursor-not-allowed"
                : "bg-[#E2AF19] text-black hover:bg-[#D4A853]"
            }`}
          >
            {isSwitchingChain || switchingChain !== null ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Switching...
              </div>
            ) : selectedChain === chainId ? (
              "Current Chain"
            ) : (
              "Switch to " + (chainDisplayData[selectedChain]?.name || "Chain")
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown - Centered */}
      <div
        className="lg:hidden fixed z-50 bg-[#0F0F0F] rounded-[20px] border border-[#2C2C2C] shadow-2xl flex flex-col"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "280px",
          maxHeight: "400px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2.5 border-b border-[#2C2C2C] flex-shrink-0">
          <h3 className="text-white font-mayeka text-sm">Select Chain</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        </div>

        {/* Chain List */}
        <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
          {chains.map((chain) => {
            const chainDisplay = chainDisplayData[chain.id] || {
              name: chain.name,
              color: "bg-gray-500",
              icon: chain.name.charAt(0),
              fallbackIcon: chain.name.charAt(0),
              useBackground: true,
            };

            const isSelected = selectedChain === chain.id;
            const isSwitching = switchingChain === chain.id;

            return (
              <button
                key={chain.id}
                onClick={() => handleChainSelect(chain.id)}
                disabled={isSwitching || isSwitchingChain}
                className={`w-full p-2 rounded-[8px] transition-all duration-200 text-left ${
                  isSelected
                    ? "bg-[#71570C] border border-[#E2AF19]"
                    : "border border-[#2C2C2C] hover:border-[#4C4C4C]"
                } ${isSwitching ? "opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChainIcon chainData={chainDisplay} size="sm" />
                    <span
                      className={`text-xs font-satoshi font-medium ${
                        isSelected ? "text-[#E2AF19]" : "text-white"
                      }`}
                    >
                      {chainDisplay.name}
                      {isSwitching && (
                        <span className="ml-1.5 text-[10px] text-gray-400">
                          (Switching...)
                        </span>
                      )}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-3.5 h-3.5 bg-[#E2AF19] rounded-full flex items-center justify-center">
                      <svg
                        className="w-2 h-2 text-black"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm Button */}
        <div className="p-2 pt-0 pb-2 flex-shrink-0">
          <button
            onClick={handleConfirm}
            disabled={isSwitchingChain || switchingChain !== null}
            className={`w-full py-2 font-mayeka-demi-bold-demo font-medium text-xs rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedChain === chainId
                ? "bg-[#2C2C2C] text-gray-400 cursor-not-allowed"
                : "bg-[#E2AF19] text-black hover:bg-[#D4A853]"
            }`}
          >
            {isSwitchingChain || switchingChain !== null ? (
              <div className="flex items-center justify-center gap-1.5">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></div>
                Switching...
              </div>
            ) : selectedChain === chainId ? (
              "Current Chain"
            ) : (
              "Switch to " + (chainDisplayData[selectedChain]?.name || "Chain")
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default SwapChainSelector;
