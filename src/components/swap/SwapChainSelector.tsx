// src/components/swap/SwapChainSelector.tsx - FIXED ICON BACKGROUNDS
"use client";

import React, { useState, useEffect } from "react";
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

// FIXED Chain Icon Component - No background when image loads successfully
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6 lg:w-7 lg:h-7",
    lg: "w-8 h-8",
  };

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [chainData.image]);

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
    >
      {/* Dark background while loading or on error */}
      {(!imageLoaded || imageError) && (
        <div className="absolute inset-0 bg-[#2C2C2C] rounded-full" />
      )}

      {/* Actual Image - no background when loaded successfully */}
      {chainData.image && !imageError && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          } p-1 relative z-10`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
      )}

      {/* Only show fallback icon if image fails to load */}
      {imageError && (
        <div
          className={`${chainData.color} w-full h-full flex items-center justify-center absolute inset-0`}
        >
          <span className="text-white text-xs font-bold font-satoshi">
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

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: triggerRect.bottom + 8,
        left: triggerRect.left,
        width: Math.max(triggerRect.width * 1.7, 320),
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
      <div className="fixed inset-0 bg-white/10 z-40" onClick={onClose} />

      <div
        className="fixed z-50 bg-[#0F0F0F] rounded-[28px] border border-[#2C2C2C] shadow-2xl"
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
            disabled={isSwitchingChain || switchingChain}
            className={`w-full py-3 font-mayeka-demi-bold-demo font-medium text-base rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedChain === chainId
                ? "bg-[#2C2C2C] text-gray-400 cursor-not-allowed"
                : "bg-[#E2AF19] text-black hover:bg-[#D4A853]"
            }`}
          >
            {isSwitchingChain || switchingChain ? (
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
    </>
  );
};

export default SwapChainSelector;
