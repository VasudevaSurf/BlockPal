// src/components/swap/SwapChainSelector.tsx
"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useChainId, useSwitchChain } from "wagmi";
import { chains } from "@/components/wallet/WalletProvider";

// Chain data with proper image paths and conditional background colors
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

// Chain Icon Component with image support and conditional background
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
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6 lg:w-7 lg:h-7",
    lg: "w-8 h-8",
  };

  const iconSizes = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
  };

  // Reset image error state when chainData changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [chainData.image]);

  const handleImageError = () => {
    console.warn(`Failed to load chain image: ${chainData.image}`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Determine if we should show background
  const shouldShowBackground =
    !chainData.image || imageError || !imageLoaded || chainData.useBackground;
  const backgroundClass = shouldShowBackground ? chainData.color : "";

  return (
    <div
      className={`${sizeClasses[size]} ${backgroundClass} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
    >
      {/* Chain Image */}
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

      {/* Fallback Icon - only show when needed */}
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

interface SwapChainSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onChainSelect?: (chainId: number) => void;
  triggerRef?: React.RefObject<HTMLButtonElement>; // Add ref for positioning
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
        console.log("✅ Chain switched successfully:", data.name);
        setSwitchingChain(null); // Clear switching state
        setSelectedChain(variables.chainId); // Update selected chain
        if (onChainSelect) {
          onChainSelect(variables.chainId);
        }
        onClose();
      },
      onError: (error) => {
        console.error("❌ Chain switch failed:", error);
        setSwitchingChain(null); // Clear switching state on error
      },
      onSettled: () => {
        // Always clear switching state when operation completes
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

  // Calculate dropdown position based on trigger button
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();

      setDropdownPosition({
        top: triggerRect.bottom + 8, // 8px below the button
        left: triggerRect.left,
        width: Math.max(triggerRect.width * 1.7, 320), // Bigger width - 1.7x button width or min 320px
      });
    }
  }, [isOpen, triggerRef]);

  // Update selected chain when current chain changes
  useEffect(() => {
    if (chainId) {
      setSelectedChain(chainId);
    }
  }, [chainId]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSwitchingChain(null);
      setSelectedChain(chainId);
    }
  }, [isOpen, chainId]);

  // Handle chain selection
  const handleChainSelect = (targetChainId: number) => {
    setSelectedChain(targetChainId);
  };

  // Handle confirm chain switch
  const handleConfirm = async () => {
    if (selectedChain === chainId) {
      onClose();
      return;
    }

    setSwitchingChain(selectedChain);

    try {
      if (switchChain) {
        switchChain({ chainId: selectedChain });
      }
    } catch (error) {
      console.error("Failed to switch chain:", error);
      setSwitchingChain(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with fade effect like history */}
      <div className="fixed inset-0 bg-white/10 z-40" onClick={onClose} />

      {/* Dropdown positioned below button */}
      <div
        className="fixed z-50 bg-[#0F0F0F] rounded-[28px] border border-[#2C2C2C] shadow-2xl"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: "350px",
        }}
      >
        {/* Chain Buttons - Vertical List (no header) */}
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
                  isSelected ? "bg-[#71570C]" : " border border-[#2C2C2C]"
                } ${isSwitching ? "opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between">
                  {/* Chain Icon and Name */}
                  <div className="flex items-center gap-3">
                    <ChainIcon chainData={chainDisplay} size="sm" />
                    <span
                      className={`text-base font-satoshi font-medium ${
                        isSelected ? "text-[#fff]" : "text-white"
                      }`}
                    >
                      {chainDisplay.name}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm Button (no divider) */}
        <div className="p-3 pt-1">
          <button
            onClick={handleConfirm}
            disabled={isSwitchingChain || switchingChain}
            className="w-full py-3 bg-[#E2AF19] text-black font-mayeka-demi-bold-demo font-medium text-base rounded-[10px] hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSwitchingChain || switchingChain ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Switching...
              </div>
            ) : selectedChain === chainId ? (
              "Current Chain"
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default SwapChainSelector;
