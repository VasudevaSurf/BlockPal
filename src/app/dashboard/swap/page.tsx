// src/app/dashboard/swap/page.tsx
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

// History data
const historyData = [
  {
    id: 1,
    type: "sell",
    token: "Ethereum",
    symbol: "ETH",
    amount: "-0.01",
    value: "ETH",
    date: "August 20, 2025",
    status: "completed",
    color: "from-gray-600 to-gray-400",
  },
  {
    id: 2,
    type: "buy",
    token: "Bitcoin",
    symbol: "BTC",
    amount: "+0.31",
    value: "BTC",
    date: "August 20, 2025",
    status: "completed",
    color: "from-orange-500 to-orange-600",
  },
  {
    id: 3,
    type: "buy",
    token: "Solana",
    symbol: "SOL",
    amount: "+0.1",
    value: "SOL",
    date: "June 20, 2025",
    status: "completed",
    color: "from-purple-500 to-purple-600",
  },
  {
    id: 4,
    type: "sell",
    token: "Base",
    symbol: "ETH",
    amount: "-0.01",
    value: "ETH",
    date: "September 9, 2025",
    status: "completed",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: 5,
    type: "buy",
    token: "Solana",
    symbol: "SOL",
    amount: "+0.1",
    value: "SOL",
    date: "August 3, 2025",
    status: "completed",
    color: "from-purple-500 to-purple-600",
  },
];

export default function SwapPage() {
  const [activeTab, setActiveTab] = useState("swap");
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [showFromTokenSelector, setShowFromTokenSelector] = useState(false);
  const [showToTokenSelector, setShowToTokenSelector] = useState(false);
  const [swipeCompleted, setSwipeCompleted] = useState(false);
  const [slippage, setSlippage] = useState("1");
  const [customSlippage, setCustomSlippage] = useState(false);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [gasMode, setGasMode] = useState("high");

  const { isConnected, address } = useAccount();
  const chainId = useChainId();

  // Use the swap hook
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
    executeSwap,
    swapTokenPositions,
  } = useSwap();

  // Get balance for from token
  const { data: fromTokenBalance } = useBalance({
    address: address,
    token:
      fromToken?.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ? undefined
        : (fromToken?.address as `0x${string}`),
    enabled: !!address && !!fromToken,
  });

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

  const handleFromTokenSelect = (token: any) => {
    setFromToken({
      address:
        token.contractAddress === "native"
          ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          : token.contractAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoUrl,
    });
  };

  const handleToTokenSelect = (token: any) => {
    setToToken({
      address:
        token.contractAddress === "native"
          ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          : token.contractAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoUrl,
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

  // Calculate max amount
  const calculateMaxAmount = () => {
    if (!fromTokenBalance) return;

    const balance = fromTokenBalance.formatted;
    const isNativeToken =
      fromToken?.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    if (isNativeToken) {
      // Reserve some ETH for gas
      const maxAmount = Math.max(0, parseFloat(balance) - 0.001);
      setFromAmount(maxAmount.toString());
    } else {
      setFromAmount(balance);
    }
  };

  // Calculate estimated values
  const estimatedGas = quote?.gas
    ? ((parseInt(quote.gas) * 50) / 1e9).toFixed(6)
    : "0.0005";
  const gasUSD = parseFloat(estimatedGas) * 2500; // Approximate ETH price
  const rate =
    fromAmount && toAmount && parseFloat(fromAmount) > 0
      ? (parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)
      : "0";
  const minimumReceived = toAmount
    ? (parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(6)
    : "0";

  const slippagePresets = ["0.1", "0.5", "1", "3"];

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-4 flex flex-col overflow-hidden relative">
      {/* Tab Navigation */}
      <div className="flex justify-center mb-4 relative z-20">
        <div className="relative inline-flex py-[6px] px-[6px] gap-[6px] border border-[#4B3A08] rounded-[12px]">
          <motion.div
            className="absolute h-[calc(100%-12px)] w-[calc(50%-3px)] bg-[#E2AF19] rounded-[13px] top-[6px] left-[6px]"
            initial={false}
            animate={activeTab}
            variants={{
              swap: { x: 0 },
              history: { x: "100%" },
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          />

          <button
            onClick={() => setActiveTab("swap")}
            className={`relative z-10 px-6 py-2.5 font-medium text-sm rounded-[13px] transition-colors duration-200 ${
              activeTab === "swap"
                ? "text-black"
                : "text-white hover:text-gray-300"
            }`}
          >
            Swap
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`relative z-10 px-6 py-2.5 font-medium text-sm rounded-[13px] transition-colors duration-200 ${
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

            <div className="relative bg-[#0F0F0F] rounded-[26px] py-6 px-16">
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

                <div className="flex justify-end items-center gap-2 text-xs bg-[rgba(255,255,255,0.03)] p-2 rounded-[20px]">
                  <span className="text-[#977511] font-satoshi">
                    Slippage %
                  </span>
                  <button
                    onClick={() =>
                      setShowSlippageSettings(!showSlippageSettings)
                    }
                    className="text-[#fff] hover:text-[#D4A853] transition-colors font-satoshi"
                  >
                    {slippage}%
                  </button>
                  <FilterIcon size={12} className="mt-[2px] ml-0.5" />
                </div>
              </div>

              {/* Slippage Settings */}
              {showSlippageSettings && (
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
              )}

              {/* From Token Box */}
              <div
                className="bg-[#191919] p-5"
                style={{ borderRadius: "26.066px" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h2 className="text-[#E2AF19] text-base font-mayeka mb-2">
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
                  <button
                    onClick={() => setShowFromTokenSelector(true)}
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity min-w-fit p-[6px] bg-[rgba(255,255,255,0.03)] rounded-[25px]"
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
                        <span className="text-white text-xs font-bold">E</span>
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
                  <button
                    onClick={() => setShowToTokenSelector(true)}
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity min-w-fit p-[6px] bg-[rgba(255,255,255,0.03)] rounded-[25px]"
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
                        <span className="text-white text-xs font-bold">E</span>
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

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[#939393] font-satoshi">
                      Estimated Fee:
                    </span>
                    <span className="text-[#FFFFFF] font-satoshi">
                      {estimatedGas} ETH (~${gasUSD.toFixed(2)})
                    </span>
                  </div>
                  <div className="flex flex-row items-center bg-[rgba(255,255,255,0.02)] p-[4px] rounded-[15px]">
                    <LightningIcon size={15} />
                    <span className="text-[#FFFFFF] font-satoshi ml-1">
                      Fast
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg mb-2">
                  <p className="text-red-400 text-sm font-satoshi">{error}</p>
                </div>
              )}

              {/* Quote Info */}
              {quote && toAmount && parseFloat(toAmount) > 0 && (
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
                      !loading
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
                        <span className="text-white text-xs font-bold">E</span>
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
                        <span className="text-white text-xs font-bold">E</span>
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

      {/* History Overlay */}
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
              className="absolute top-[55%] left-1/2 transform -translate-y-1/2 z-30 ml-[150px]"
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
                  <div className="flex items-center justify-between mb-7">
                    <h3 className="text-white font-mayeka-demi-bold-demo text-xl mt-3">
                      Swap History
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6">
                    {historyData.map((item, index) => (
                      <div key={item.id}>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col items-start gap-2">
                            <div className="flex items-start">
                              <span className="text-white text-[14px] font-satoshi">
                                {item.type === "sell" ? "Sell" : "Buy"} Token
                              </span>
                            </div>
                            <div className="flex flex-row gap-2">
                              <div
                                className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center`}
                              >
                                <span className="text-white text-xs font-bold">
                                  {item.symbol[0]}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-start flex-col">
                                  <span className="text-white text-[15px] font-satoshi">
                                    {item.token}
                                  </span>
                                  <span className="text-white text-[10px] font-satoshi">
                                    {item.symbol}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-white text-[14px] font-satoshi mb-1">
                              {item.date}
                            </div>
                            <div
                              className={`font-satoshi ${
                                item.type === "sell"
                                  ? "text-white"
                                  : "text-green-400"
                              }`}
                            >
                              {item.amount} {item.value}
                            </div>
                            {item.status === "completed" && (
                              <div className="inline-flex items-center gap-1 bg-[#E2AF19] text-[#000] text-xs p-[2px] rounded mt-1">
                                <span className="font-satoshi text-[8px] flex flex-row items-center gap-0.5">
                                  Explorer
                                  <ExternalLinkIcon />
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {index < historyData.length - 1 && (
                          <div className="w-full h-px mt-2"></div>
                        )}
                      </div>
                    ))}
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
