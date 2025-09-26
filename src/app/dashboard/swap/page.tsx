// src/app/dashboard/swap/page.tsx - History UI Restored Version
"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowDownUp, Clock, CheckCircle, History, X } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
} from "framer-motion";
import { useAccount, useChainId, useSwitchChain, useBalance } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { chains } from "@/components/wallet/WalletProvider";
import ExternalLinkIcon from "@/components/icons/ExternalLinkIcon";
import WalletConnectButton from "@/components/wallet/WalletConnectButton";
import SwapChainSelector from "@/components/swap/SwapChainSelector";
import TokenSelector from "@/components/swap/TokenSelectorModal";
import SwapIcon from "@/components/icons/SwapIcon";
import { useSwap } from "@/hooks/useSwap";
import { swapHistoryService } from "@/services/swapHistoryService";

// Icon Components
const LightningIcon = ({ size = 16, className = "", ...props }: any) => (
  <svg
    className={className}
    {...props}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
  </svg>
);

const FilterIcon = ({ size = 16, className = "", ...props }: any) => (
  <svg
    className={className}
    {...props}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" />
  </svg>
);

// Chain data configuration
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

// Token Image Component
interface TokenImageProps {
  src?: string | null;
  alt: string;
  symbol: string;
  name?: string;
  className?: string;
}

const TokenImage: React.FC<TokenImageProps> = ({
  src,
  alt,
  symbol,
  name,
  className = "",
}) => {
  const [hasError, setHasError] = useState(false);

  const getFirstWord = () => {
    const text = name || symbol || "?";
    const firstWord = text.split(/[\s\-_]+/)[0];
    return firstWord.length > 6 ? firstWord.substring(0, 6) : firstWord;
  };

  if (!src || hasError) {
    const firstWord = getFirstWord();
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600`}
        title={name || symbol}
      >
        <span className="text-white font-bold text-xs text-center px-1">
          {firstWord.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} rounded-full object-cover`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

// Helper function to get token color gradient
const getTokenColorGradient = (symbol: string): string => {
  const colorMap: { [key: string]: string } = {
    ETH: "from-gray-600 to-gray-400",
    BTC: "from-orange-500 to-orange-600",
    SOL: "from-purple-500 to-purple-600",
    USDC: "from-blue-500 to-blue-600",
    USDT: "from-green-500 to-green-600",
    DAI: "from-yellow-500 to-yellow-600",
    MATIC: "from-purple-600 to-purple-700",
    AVAX: "from-red-500 to-red-600",
    BNB: "from-yellow-500 to-yellow-600",
  };

  return colorMap[symbol] || "from-blue-500 to-purple-600";
};

// Add this CSS to your global styles or as a style tag
const scrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }
  .custom-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari, and Opera */
  }
`;

export default function SwapPage() {
  const [activeTab, setActiveTab] = useState("swap");
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [showFromTokenSelector, setShowFromTokenSelector] = useState(false);
  const [showToTokenSelector, setShowToTokenSelector] = useState(false);
  const [swipeCompleted, setSwipeCompleted] = useState(false);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);

  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);

  // Use the swap hook with all its functionality
  const {
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    fromAmount,
    setFromAmount,
    toAmount,
    quote,
    loading,
    swapping,
    error,
    quoteError,
    insufficientBalance,
    executeSwap,
    swapTokenPositions,
    calculateMaxAmount,
    fromTokenBalance,
    gasPrice,
    slippage,
    setSlippage,
    customSlippage,
    setCustomSlippage,
    gasMode,
    setGasMode,
    swapHistory,
    getExplorerLink,
    dbTransactions,
    loadingHistory,
  } = useSwap();

  // Motion values for swipe
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const chainButtonRef = useRef<HTMLButtonElement>(null);

  const chainDisplayData = getChainDisplayData();
  const currentChainDisplay = chainDisplayData[chainId] || chainDisplayData[1];

  const handleSwipeEnd = async (_event: any, info: PanInfo) => {
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const currentX = x.get();
    const threshold = 200;

    if (currentX >= threshold && !swapping) {
      setSwipeCompleted(true);
      x.set(containerWidth - 50);

      // Execute actual swap
      const success = await executeSwap();

      if (success) {
        // Show success animation
        setTimeout(() => {
          setSwipeCompleted(false);
          x.set(0);
        }, 2000);
      } else {
        // Reset on failure
        setSwipeCompleted(false);
        x.set(0);
      }
    } else {
      x.set(0);
    }
  };

  // Handle token selection
  const handleFromTokenSelect = (token: any) => {
    console.log("From token selected:", token);
    setFromToken({
      address:
        token.address ||
        token.contractAddress ||
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI || token.logoUrl,
    });
  };

  const handleToTokenSelect = (token: any) => {
    console.log("To token selected:", token);
    setToToken({
      address:
        token.address ||
        token.contractAddress ||
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI || token.logoUrl,
    });
  };

  const formatTokenAmount = (
    amount: number | string,
    decimals: number = 4
  ): string => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num) || num === 0) return "0";
    if (num < 0.000001) return num.toExponential(2);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(Math.min(decimals, 8));
  };

  // Calculate values for display using actual gas data
  const rate =
    fromAmount && toAmount && parseFloat(fromAmount) > 0
      ? (parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)
      : "0";

  const minimumReceived = toAmount
    ? ((parseFloat(toAmount) * (100 - parseFloat(slippage))) / 100).toFixed(6)
    : "0";

  const slippagePresets = ["0.1", "0.5", "1", "3"];

  // Add styles for hiding scrollbar
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-4 flex flex-col overflow-hidden relative">
      <div className="flex justify-center mb-6 relative z-20">
        <h1 className="text-[#E2AF19] text-[30px] font-mayeka">
          Secure and Best Rates Everytime
        </h1>
      </div>
      {/* Tab Navigation */}
      <div className="flex justify-center mb-4 relative z-20">
        <div className="relative inline-flex py-[6px] px-[6px] gap-[6px] border border-[#4B3A08] rounded-[12px]">
          <motion.div
            className="absolute h-[calc(100%-12px)] bg-[#E2AF19] rounded-[13px] top-[6px]"
            initial={false}
            animate={activeTab}
            variants={{
              swap: { x: 0, width: "calc(50% - 3px)" },
              history: { x: "calc(80% + 3px)", width: "calc(52% - 3px)" },
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          />

          <button
            onClick={() => setActiveTab("swap")}
            className={`relative z-10 px-6 py-2.5 font-mayeka text-md rounded-[13px] transition-colors duration-200 ${
              activeTab === "swap"
                ? "text-black"
                : "text-white hover:text-gray-300"
            }`}
          >
            Swap
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`relative z-10 px-6 py-2.5 font-mayeka text-md rounded-[13px] transition-colors duration-200 ${
              activeTab === "history"
                ? "text-black"
                : "text-white hover:text-gray-300"
            }`}
          >
            History
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-20">
        <div className="w-full max-w-xl mx-auto px-4">
          {/* Container with gradient border */}
          <div className="relative p-[3px] rounded-[30px]">
            <div
              className="absolute inset-0 rounded-[30px]"
              style={{
                background: `linear-gradient(135deg, 
                  #E2AF19 0%, 
                  #E2AF19 3%,
                  #2C2C2C 10%, 
                  #2C2C2C 90%, 
                  #E2AF19 97%,
                  #E2AF19 100%)`,
              }}
            />

            {/* Inner scrollable container */}
            <div className="relative bg-[#0F0F0F] rounded-[26px] overflow-hidden">
              <div className="max-h-[450px] overflow-y-auto custom-scrollbar py-4 px-16">
                {/* Chain selector and slippage */}
                <div className="flex flex-row items-center justify-between mb-4">
                  <button
                    ref={chainButtonRef}
                    onClick={() => setShowChainSelector(true)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-fit justify-center px-3 py-2"
                  >
                    <ChainIcon chainData={currentChainDisplay} size="md" />
                    <span className="text-white text-base font-satoshi font-medium">
                      {currentChainDisplay.name}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <div className="relative">
                    {/* Glacier effect container */}
                    <div className="relative p-[1px] rounded-[25px] overflow-hidden">
                      {/* Animated gradient border */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, 
                            rgba(255, 255, 255, 0.3) 0%,
                            rgba(255, 255, 255, 0.1) 20%,
                            rgba(226, 175, 25, 0.2) 40%,
                            rgba(255, 255, 255, 0.05) 60%,
                            rgba(226, 175, 25, 0.15) 80%,
                            rgba(255, 255, 255, 0.2) 100%)`,
                        }}
                      />

                      {/* Inner container with glass effect */}
                      {/* Inner container with glass effect */}
                      <div
                        className="relative flex items-center gap-3 px-3 py-2 rounded-[24px]"
                        style={{
                          background: `linear-gradient(135deg, 
                            rgba(25, 25, 25, 0.85) 0%,
                            rgba(40, 40, 40, 0.75) 0%,
                            rgba(25, 25, 25, 0.85) 0%)`,
                          backdropFilter: "blur(1px)",
                          boxShadow: `
                            inset 0 1px 2px rgba(255, 255, 255, 0.05),
                            inset 0 -1px 2px rgba(0, 0, 0, 0.5),
                            0 2px 8px rgba(0, 0, 0, 0.3)
                          `,
                        }}
                      >
                        <span className="text-[#E2AF19] text-xs font-satoshi font-medium">
                          Slippage%
                        </span>

                        {/* Toggle container */}
                        <div className="relative flex items-center gap-1">
                          {/* Auto button with conditional border */}
                          <button
                            onClick={() => {
                              setSlippage("5.5");
                              setCustomSlippage(false);
                              setShowSlippageSettings(false); // Close modal when Auto is clicked
                            }}
                            className="relative"
                          >
                            {!customSlippage && (
                              <div
                                className="absolute inset-0 p-[0.5px] rounded-full"
                                style={{
                                  background: `linear-gradient(135deg, 
                                    rgba(255, 255, 255, 0.4) 0%,
                                    rgba(255, 255, 255, 0.15) 25%,
                                    rgba(226, 175, 25, 0.3) 50%,
                                    rgba(255, 255, 255, 0.1) 75%,
                                    rgba(255, 255, 255, 0.3) 100%)`,
                                }}
                              >
                                <div
                                  className="w-full h-full rounded-full"
                                  style={{
                                    background: `linear-gradient(135deg, 
                                      rgba(25, 25, 25, 0.85) 0%,
                                      rgba(40, 40, 40, 0.75) 50%,
                                      rgba(25, 25, 25, 0.85) 100%)`,
                                  }}
                                />
                              </div>
                            )}
                            <span className="relative z-10 block px-3 py-1 text-[10px] font-satoshi font-medium text-white hover:text-white transition-colors">
                              Auto
                            </span>
                          </button>

                          {/* Custom button with conditional border */}
                          <button
                            onClick={() => {
                              setShowSlippageSettings(!showSlippageSettings);
                              setCustomSlippage(true);
                            }}
                            className="relative"
                          >
                            {customSlippage && (
                              <div
                                className="absolute inset-0 p-[0.5px] rounded-full"
                                style={{
                                  background: `linear-gradient(135deg, 
                                    rgba(255, 255, 255, 0.4) 0%,
                                    rgba(255, 255, 255, 0.15) 25%,
                                    rgba(226, 175, 25, 0.3) 50%,
                                    rgba(255, 255, 255, 0.1) 75%,
                                    rgba(255, 255, 255, 0.3) 100%)`,
                                }}
                              >
                                <div
                                  className="w-full h-full rounded-full"
                                  style={{
                                    background: `linear-gradient(135deg, 
                                      rgba(25, 25, 25, 0.85) 0%,
                                      rgba(40, 40, 40, 0.75) 50%,
                                      rgba(25, 25, 25, 0.85) 100%)`,
                                  }}
                                />
                              </div>
                            )}
                            <span className="relative z-10 block px-3 py-1 text-[10px] font-satoshi font-medium text-white hover:text-white transition-colors">
                              Custom
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Slippage Settings Overlay */}
                    {showSlippageSettings && (
                      <div className="absolute top-full mt-2 right-0 z-50">
                        <div className="relative p-[1px] rounded-[20px] overflow-hidden">
                          {/* Animated gradient border - glacier effect */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(135deg, 
                                rgba(255, 255, 255, 0.3) 0%,
                                rgba(255, 255, 255, 0.1) 20%,
                                rgba(226, 175, 25, 0.2) 40%,
                                rgba(255, 255, 255, 0.05) 60%,
                                rgba(226, 175, 25, 0.15) 80%,
                                rgba(255, 255, 255, 0.2) 100%)`,
                            }}
                          />

                          {/* Inner container with glass effect */}
                          <div
                            className="relative rounded-[19px] p-4 min-w-[250px]"
                            style={{
                              background: `linear-gradient(135deg, 
                                rgba(25, 25, 25, 0.95) 0%,
                                rgba(40, 40, 40, 0.85) 50%,
                                rgba(25, 25, 25, 0.95) 100%)`,
                              backdropFilter: "blur(10px)",
                              boxShadow: `
                                inset 0 1px 2px rgba(255, 255, 255, 0.05),
                                inset 0 -1px 2px rgba(0, 0, 0, 0.5),
                                0 4px 12px rgba(0, 0, 0, 0.5)
                              `,
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[#E2AF19] text-sm font-mayeka">
                                Set Slippage
                              </span>
                              <button
                                onClick={() => setShowSlippageSettings(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            <div className="flex gap-2 mb-3">
                              {slippagePresets.map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => {
                                    setSlippage(preset);
                                    setCustomSlippage(false);
                                    setShowSlippageSettings(false);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-satoshi transition-all ${
                                    slippage === preset && !customSlippage
                                      ? "bg-[#E2AF19] text-black"
                                      : "bg-[#191919] text-white hover:bg-[#2C2C2C] border border-[#2C2C2C]"
                                  }`}
                                >
                                  {preset}%
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-xs font-satoshi">
                                Custom:
                              </span>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  placeholder="0.0"
                                  value={customSlippage ? slippage : ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value < 49) {
                                      setSlippage(e.target.value);
                                      setCustomSlippage(true);
                                    }
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter" && customSlippage) {
                                      setShowSlippageSettings(false);
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 bg-[#191919] text-white rounded-lg text-xs border border-[#2C2C2C] focus:border-[#E2AF19] focus:outline-none"
                                  min="0"
                                  max="49"
                                  step="0.1"
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                                  %
                                </span>
                              </div>
                            </div>

                            {customSlippage && parseFloat(slippage) >= 49 && (
                              <p className="text-red-400 text-[10px] mt-2 font-satoshi">
                                Maximum slippage is 49%
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Slippage Settings */}
                {/* {showSlippageSettings && (
                  <div className="mb-4 p-3 bg-[#191919] rounded-lg">
                    <div className="flex gap-2 mb-2">
                      {slippagePresets.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setSlippage(preset);
                            setCustomSlippage(false);
                          }}
                          className={`px-3 py-1 rounded text-xs ${
                            slippage === preset && !customSlippage
                              ? "bg-[#E2AF19] text-black"
                              : "bg-[#2C2C2C] text-white hover:bg-[#3C3C3C]"
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                      <input
                        type="number"
                        placeholder="Custom"
                        value={customSlippage ? slippage : ""}
                        onChange={(e) => {
                          setSlippage(e.target.value);
                          setCustomSlippage(true);
                        }}
                        className="w-20 px-2 py-1 bg-[#2C2C2C] text-white rounded text-xs"
                      />
                    </div>
                    <button
                      onClick={() => setShowSlippageSettings(false)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                )} */}

                {/* From Token Box */}
                <div
                  className="bg-[#191919] p-4"
                  style={{ borderRadius: "26.066px" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h2 className="text-[#E2AF19] text-base font-mayeka mb-1">
                        Swap
                      </h2>
                      <input
                        type="text"
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        className="bg-transparent text-white text-3xl font-satoshi outline-none w-full"
                        placeholder="0"
                        disabled={swapping}
                      />
                    </div>

                    {/* Updated token select button with glacier effect */}
                    <div className="relative">
                      <div className="relative p-[1px] rounded-[25px] overflow-hidden">
                        {/* Animated gradient border */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(135deg, 
            rgba(255, 255, 255, 0.3) 0%,
            rgba(255, 255, 255, 0.1) 20%,
            rgba(226, 175, 25, 0.2) 40%,
            rgba(255, 255, 255, 0.05) 60%,
            rgba(226, 175, 25, 0.15) 80%,
            rgba(255, 255, 255, 0.2) 100%)`,
                          }}
                        />

                        {/* Inner button with glass effect */}
                        <button
                          onClick={() => setShowFromTokenSelector(true)}
                          className="relative flex items-center gap-1 hover:opacity-80 transition-opacity min-w-fit p-[6px] rounded-[24px]"
                          style={{
                            background: `linear-gradient(135deg, 
            rgba(25, 25, 25, 0.85) 0%,
            rgba(40, 40, 40, 0.75) 50%,
            rgba(25, 25, 25, 0.85) 100%)`,
                            backdropFilter: "blur(1px)",
                            boxShadow: `
            inset 0 1px 2px rgba(255, 255, 255, 0.05),
            inset 0 -1px 2px rgba(0, 0, 0, 0.5),
            0 2px 8px rgba(0, 0, 0, 0.3)
          `,
                          }}
                        >
                          {fromToken ? (
                            <TokenImage
                              src={fromToken.logoURI}
                              alt={fromToken.symbol}
                              symbol={fromToken.symbol}
                              name={fromToken.name}
                              className="w-7 h-7"
                            />
                          ) : (
                            <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                E
                              </span>
                            </div>
                          )}
                          <span className="text-white text-base font-satoshi">
                            {fromToken?.symbol || "ETH"}
                          </span>
                          <svg
                            className="w-3.5 h-3.5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#939393] font-satoshi">
                        Available:
                      </span>
                      <span className="text-[#FFFFFF] font-satoshi">
                        {fromTokenBalance
                          ? `${formatTokenAmount(
                              fromTokenBalance.formatted,
                              4
                            )} ${fromTokenBalance.symbol}`
                          : "0.00"}
                      </span>
                    </div>
                    <button
                      onClick={calculateMaxAmount}
                      className="text-xs bg-[#000] hover:bg-[#3C3C3C] text-white px-2 py-1 rounded-md transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Swap Icon */}
                <div className="flex justify-center relative -my-[22px] z-10">
                  <button
                    onClick={swapTokenPositions}
                    className="bg-[#E2AF19] p-3 rounded-full hover:bg-[#D4A853] transition-colors group border-4 border-[#0F0F0F]"
                  >
                    <SwapIcon className="text-black w-5 h-5" />
                  </button>
                </div>

                {/* To Token Box */}
                <div
                  className="bg-[#191919] p-5 mb-2"
                  style={{ borderRadius: "26.066px" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h2 className="text-[#E2AF19] text-base font-mayeka mb-2">
                        GET
                      </h2>
                      <input
                        type="text"
                        value={loading ? "Loading..." : toAmount}
                        readOnly
                        className="bg-transparent text-white text-3xl font-satoshi outline-none w-full"
                        placeholder="0"
                      />
                    </div>

                    {/* Updated token select button with glacier effect */}
                    <div className="relative">
                      <div className="relative p-[1px] rounded-[25px] overflow-hidden">
                        {/* Animated gradient border */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(135deg, 
            rgba(255, 255, 255, 0.3) 0%,
            rgba(255, 255, 255, 0.1) 20%,
            rgba(226, 175, 25, 0.2) 40%,
            rgba(255, 255, 255, 0.05) 60%,
            rgba(226, 175, 25, 0.15) 80%,
            rgba(255, 255, 255, 0.2) 100%)`,
                          }}
                        />

                        {/* Inner button with glass effect */}
                        <button
                          onClick={() => setShowToTokenSelector(true)}
                          className="relative flex items-center gap-1 hover:opacity-80 transition-opacity min-w-fit p-[6px] rounded-[24px]"
                          style={{
                            background: `linear-gradient(135deg, 
            rgba(25, 25, 25, 0.85) 0%,
            rgba(40, 40, 40, 0.75) 50%,
            rgba(25, 25, 25, 0.85) 100%)`,
                            backdropFilter: "blur(1px)",
                            boxShadow: `
            inset 0 1px 2px rgba(255, 255, 255, 0.05),
            inset 0 -1px 2px rgba(0, 0, 0, 0.5),
            0 2px 8px rgba(0, 0, 0, 0.3)
          `,
                          }}
                        >
                          {toToken ? (
                            <TokenImage
                              src={toToken.logoURI}
                              alt={toToken.symbol}
                              symbol={toToken.symbol}
                              name={toToken.name}
                              className="w-7 h-7"
                            />
                          ) : (
                            <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                E
                              </span>
                            </div>
                          )}
                          <span className="text-white text-base font-satoshi">
                            {toToken?.symbol || "ETH"}
                          </span>
                          <svg
                            className="w-3.5 h-3.5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#939393] font-satoshi">
                        Estimated Fee:
                      </span>
                      <span className="text-[#FFFFFF] font-satoshi">
                        {gasPrice ? `(~$${gasPrice.gasCostUSD})` : "(~$1.25)"}
                      </span>
                    </div>
                    {/* Gas Mode Selection Buttons */}
                    <div className="flex gap-2">
                      {/* Fast Button */}
                      <div className="relative">
                        <div className="relative p-[1px] rounded-[12px] overflow-hidden">
                          {/* Animated gradient border */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                gasMode === "high"
                                  ? `linear-gradient(135deg, 
                rgba(255, 152, 0, 0.6) 0%,
                rgba(255, 152, 0, 0.3) 20%,
                rgba(255, 152, 0, 0.4) 40%,
                rgba(255, 152, 0, 0.2) 60%,
                rgba(255, 152, 0, 0.5) 80%,
                rgba(255, 152, 0, 0.4) 100%)`
                                  : `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.3) 0%,
                rgba(255, 255, 255, 0.1) 20%,
                rgba(226, 175, 25, 0.2) 40%,
                rgba(255, 255, 255, 0.05) 60%,
                rgba(226, 175, 25, 0.15) 80%,
                rgba(255, 255, 255, 0.2) 100%)`,
                            }}
                          />

                          {/* Inner button with glass effect */}
                          <button
                            onClick={() => setGasMode("high")}
                            className={`relative flex items-center gap-1 px-3 py-1.5 rounded-[11px] transition-all ${
                              gasMode === "high"
                                ? "text-black"
                                : "text-white hover:opacity-80"
                            }`}
                            style={{
                              background:
                                gasMode === "high"
                                  ? `linear-gradient(135deg, 
                rgba(255, 152, 0, 0.9) 0%,
                rgba(255, 152, 0, 1) 50%,
                rgba(255, 152, 0, 0.9) 100%)`
                                  : `linear-gradient(135deg, 
                rgba(25, 25, 25, 0.85) 0%,
                rgba(40, 40, 40, 0.75) 50%,
                rgba(25, 25, 25, 0.85) 100%)`,
                              backdropFilter: "blur(1px)",
                              boxShadow:
                                gasMode === "high"
                                  ? `0 2px 8px rgba(255, 152, 0, 0.3)`
                                  : `
                inset 0 1px 2px rgba(255, 255, 255, 0.05),
                inset 0 -1px 2px rgba(0, 0, 0, 0.5),
                0 2px 8px rgba(0, 0, 0, 0.3)
              `,
                            }}
                          >
                            <LightningIcon size={14} />
                            <span className="text-xs font-satoshi font-medium">
                              Fast
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Instant Button */}
                      <div className="relative">
                        <div className="relative p-[1px] rounded-[12px] overflow-hidden">
                          {/* Animated gradient border */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                gasMode === "instant"
                                  ? `linear-gradient(135deg, 
                rgba(244, 67, 54, 0.6) 0%,
                rgba(244, 67, 54, 0.3) 20%,
                rgba(244, 67, 54, 0.4) 40%,
                rgba(244, 67, 54, 0.2) 60%,
                rgba(244, 67, 54, 0.5) 80%,
                rgba(244, 67, 54, 0.4) 100%)`
                                  : `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.3) 0%,
                rgba(255, 255, 255, 0.1) 20%,
                rgba(226, 175, 25, 0.2) 40%,
                rgba(255, 255, 255, 0.05) 60%,
                rgba(226, 175, 25, 0.15) 80%,
                rgba(255, 255, 255, 0.2) 100%)`,
                            }}
                          />

                          {/* Inner button with glass effect */}
                          <button
                            onClick={() => setGasMode("instant")}
                            className={`relative flex items-center gap-1 px-3 py-1.5 rounded-[11px] transition-all ${
                              gasMode === "instant"
                                ? "text-white"
                                : "text-white hover:opacity-80"
                            }`}
                            style={{
                              background:
                                gasMode === "instant"
                                  ? `linear-gradient(135deg, 
                rgba(244, 67, 54, 0.9) 0%,
                rgba(244, 67, 54, 1) 50%,
                rgba(244, 67, 54, 0.9) 100%)`
                                  : `linear-gradient(135deg, 
                rgba(25, 25, 25, 0.85) 0%,
                rgba(40, 40, 40, 0.75) 50%,
                rgba(25, 25, 25, 0.85) 100%)`,
                              backdropFilter: "blur(1px)",
                              boxShadow:
                                gasMode === "instant"
                                  ? `0 2px 8px rgba(244, 67, 54, 0.3)`
                                  : `
                inset 0 1px 2px rgba(255, 255, 255, 0.05),
                inset 0 -1px 2px rgba(0, 0, 0, 0.5),
                0 2px 8px rgba(0, 0, 0, 0.3)
              `,
                            }}
                          >
                            <LightningIcon size={14} />
                            <span className="text-xs font-satoshi font-medium">
                              Instant
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {quoteError && (
                  <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg mb-2">
                    <p className="text-red-400 text-sm font-satoshi">
                      {quoteError}
                    </p>
                  </div>
                )}

                {/* Quote Info with proper gas display */}
                {quote && toAmount && parseFloat(toAmount) > 0 && gasPrice && (
                  <div className="p-3 bg-[#191919] rounded-lg mb-2 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">Rate:</span>
                      <span className="text-white">
                        1 {fromToken?.symbol} = {rate} {toToken?.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">Slippage:</span>
                      <span className="text-white">{slippage}%</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">
                        Estimated Gas ({gasMode}):
                      </span>
                      <span className="text-white">
                        {gasPrice.gasCostEth} ETH (${gasPrice.gasCostUSD})
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">Gas Price:</span>
                      <span className="text-white">
                        {gasPrice.gasPriceGwei} Gwei
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Min Received:</span>
                      <span className="text-white">
                        {minimumReceived} {toToken?.symbol}
                      </span>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                {!isConnected ? (
                  <WalletConnectButton />
                ) : (
                  <div
                    className="relative w-full h-[50px] overflow-hidden"
                    style={{
                      borderRadius: "100px",
                      background:
                        "linear-gradient(90deg, rgba(110, 110, 110, 0.37) 0%, rgba(256, 175, 25, 0.25) 100%)",
                    }}
                    ref={containerRef}
                  >
                    <motion.div
                      className="absolute left-1 top-1/2 transform -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                      style={{ x }}
                      drag={
                        !swapping &&
                        fromToken &&
                        toToken &&
                        fromAmount &&
                        !loading &&
                        !insufficientBalance
                          ? "x"
                          : false
                      }
                      dragConstraints={{ left: 0, right: 350 }}
                      dragElastic={0.1}
                      onDragEnd={handleSwipeEnd}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#797878]">
                        {fromToken ? (
                          <TokenImage
                            src={fromToken.logoURI}
                            alt={fromToken.symbol}
                            symbol={fromToken.symbol}
                            name={fromToken.name}
                            className="w-6 h-6"
                          />
                        ) : (
                          <span className="text-white text-xs font-bold">
                            E
                          </span>
                        )}
                      </div>
                    </motion.div>

                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-10">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border-4 border-white/10">
                        {toToken ? (
                          <TokenImage
                            src={toToken.logoURI}
                            alt={toToken.symbol}
                            symbol={toToken.symbol}
                            name={toToken.name}
                            className="w-6 h-6"
                          />
                        ) : (
                          <span className="text-white text-xs font-bold">
                            E
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-mayeka-bold-demo text-base">
                        {swapping ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            SWAPPING...
                          </div>
                        ) : insufficientBalance ? (
                          "Insufficient Balance"
                        ) : (
                          "Swap >>>"
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Overlay - Restored UI from original */}
      <AnimatePresence>
        {activeTab === "history" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/10 z-20"
              onClick={() => setActiveTab("swap")}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 50 }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute top-[62%] left-1/2 transform -translate-y-1/2 z-30 ml-[150px]"
            >
              <div className="relative p-[3px] rounded-[20px] w-[400px]">
                <div
                  className="absolute inset-0 rounded-[20px]"
                  style={{
                    background: `linear-gradient(135deg, 
                      #E2AF19 0%, 
                      #E2AF19 3%,
                      #2C2C2C 10%, 
                      #2C2C2C 90%, 
                      #E2AF19 97%,
                      #E2AF19 100%)`,
                  }}
                />

                <div
                  className="relative bg-[#0F0F0F] rounded-[20px] p-6 max-h-[75vh] overflow-hidden flex flex-col"
                  style={{
                    boxShadow: "0 4px 4px 0 rgba(0, 0, 0, 0.25)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-7">
                    <h3 className="text-white font-mayeka-demi-bold-demo text-xl mt-3">
                      Swap History
                    </h3>
                    {loadingHistory && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#E2AF19]"></div>
                    )}
                  </div>

                  {/* History List */}
                  <div className="flex-1 overflow-y-auto space-y-6">
                    {dbTransactions.length === 0 && !loadingHistory ? (
                      <div className="text-center text-gray-400 py-8">
                        No swap history yet
                      </div>
                    ) : (
                      dbTransactions.slice(0, 10).map((item, index) => {
                        // Format display values
                        const fromAmount =
                          parseFloat(item.fromAmount) /
                          Math.pow(10, item.fromToken.decimals);
                        const toAmount =
                          parseFloat(item.toAmount) /
                          Math.pow(10, item.toToken.decimals);
                        const displayDate = new Date(
                          item.createdAt
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        });

                        // Determine if it's a sell or buy (based on the from token)
                        const isSell =
                          item.fromToken.symbol !== "USDC" &&
                          item.fromToken.symbol !== "USDT" &&
                          item.fromToken.symbol !== "DAI";
                        const transactionType = isSell ? "Sell" : "Buy";
                        const displayToken = isSell
                          ? item.fromToken
                          : item.toToken;
                        const displayAmount = isSell
                          ? `-${fromAmount.toFixed(4)}`
                          : `+${toAmount.toFixed(4)}`;
                        const displaySymbol = displayToken.symbol;

                        // Get color gradient for the token
                        const tokenGradient =
                          getTokenColorGradient(displaySymbol);

                        return (
                          <div key={item._id}>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col items-start gap-2">
                                <div className="flex items-start">
                                  <span className="text-white text-[14px] font-satoshi">
                                    {transactionType} Token
                                  </span>
                                </div>
                                <div className="flex flex-row gap-2">
                                  {/* Token Icon with gradient */}
                                  {displayToken.logoURI ? (
                                    <TokenImage
                                      src={displayToken.logoURI}
                                      alt={displaySymbol}
                                      symbol={displaySymbol}
                                      name={displayToken.name}
                                      className="w-10 h-10"
                                    />
                                  ) : (
                                    <div
                                      className={`w-10 h-10 bg-gradient-to-r ${tokenGradient} rounded-full flex items-center justify-center`}
                                    >
                                      <span className="text-white text-xs font-bold">
                                        {displaySymbol[0]}
                                      </span>
                                    </div>
                                  )}

                                  {/* Transaction Details */}
                                  <div>
                                    <div className="flex items-start flex-col">
                                      <span className="text-white text-[15px] font-satoshi">
                                        {displayToken.name}
                                      </span>
                                      <span className="text-white text-[10px] font-satoshi">
                                        {displaySymbol}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right Side Info */}
                              <div className="text-right">
                                <div className="text-white text-[14px] font-satoshi mb-1">
                                  {displayDate}
                                </div>
                                <div
                                  className={`font-satoshi ${
                                    isSell ? "text-white" : "text-green-400"
                                  }`}
                                >
                                  {displayAmount} {displaySymbol}
                                </div>
                                {item.status === "success" &&
                                  item.txHash &&
                                  item.explorerLink && (
                                    <a
                                      href={item.explorerLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 bg-[#E2AF19] text-[#000] text-xs p-[2px] rounded mt-1"
                                    >
                                      <span className="font-satoshi text-[8px] flex flex-row items-center gap-0.5">
                                        Explorer
                                        <ExternalLinkIcon />
                                      </span>
                                    </a>
                                  )}
                              </div>
                            </div>
                            {/* Divider line - only show if not the last item */}
                            {index < Math.min(dbTransactions.length - 1, 9) && (
                              <div className="w-full h-px mt-2"></div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Token Selectors */}
      <TokenSelector
        isOpen={showFromTokenSelector}
        onClose={() => setShowFromTokenSelector(false)}
        onTokenSelect={handleFromTokenSelect}
        selectedToken={fromToken}
        showChainSelector={true}
      />

      <TokenSelector
        isOpen={showToTokenSelector}
        onClose={() => setShowToTokenSelector(false)}
        onTokenSelect={handleToTokenSelect}
        selectedToken={toToken}
        showChainSelector={false}
      />

      {/* Chain Selector Modal */}
      <SwapChainSelector
        isOpen={showChainSelector}
        onClose={() => setShowChainSelector(false)}
        onChainSelect={(chainId) => {
          console.log("Chain selected:", chainId);
          setShowChainSelector(false);
        }}
        triggerRef={chainButtonRef}
      />
    </div>
  );
}
