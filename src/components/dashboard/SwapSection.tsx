"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUpDown, ChevronDown, Settings } from "lucide-react";
import TokenSelectorModal from "@/components/swap/TokenSelectorModal";
import SwapPreviewModal from "@/components/swap/SwapPreviewModal";
import { SkeletonSwapSection } from "@/components/ui/Skeleton";

// Mock token data
const mockTokens = [
  {
    symbol: "ETH",
    name: "Ethereum",
    contractAddress: "native",
    decimals: 18,
    balance: 1.25843,
    value: 4027.45,
    logoUrl: "/tokens/eth.png",
    price: 3200.45,
    icon: "/tokens/eth.png",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    balance: 1000.5,
    value: 1000.5,
    logoUrl: "/tokens/usdt.png",
    price: 1.0,
    icon: "/tokens/usdt.png",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    contractAddress: "0xA0b86a33E6417f5a10c4C9a6bd1a0d7AF0DB58a7",
    decimals: 6,
    balance: 2500.75,
    value: 2500.75,
    logoUrl: "/tokens/usdc.png",
    price: 1.0,
    icon: "/tokens/usdc.png",
  },
];

// Trending tokens data
const trendingTokens = [
  {
    name: "Avalanche",
    symbol: "AVAX",
    price: "$25.46",
    change: "▲ 1.37%",
    changeType: "positive",
    bgColor: "bg-red-500",
    icon: "A",
  },
  {
    name: "Polkadot",
    symbol: "DOT",
    price: "$4,478.78",
    change: "▲ 0.48%",
    changeType: "positive",
    bgColor: "bg-pink-500",
    icon: "•",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    price: "$4,478.78",
    change: "▲ 4.36%",
    changeType: "positive",
    bgColor: "bg-blue-500",
    icon: "◆",
  },
  {
    name: "Cardano",
    symbol: "ADA",
    price: "$25.45",
    change: "▼ 1.06%",
    changeType: "negative",
    bgColor: "bg-blue-400",
    icon: "❄",
  },
  {
    name: "Solana",
    symbol: "SOL",
    price: "$212.22",
    change: "▲ 5.42%",
    changeType: "positive",
    bgColor: "bg-purple-500",
    icon: "S",
  },
  {
    name: "Sui",
    symbol: "SUI",
    price: "$3.39",
    change: "▲ 3.71%",
    changeType: "positive",
    bgColor: "bg-cyan-500",
    icon: "~",
  },
  {
    name: "Toncoin",
    symbol: "TON",
    price: "$25.54",
    change: "▲ 5.42%",
    changeType: "positive",
    bgColor: "bg-blue-600",
    icon: "T",
  },
];

// Top Gainers data
const topGainersData = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    price: "$112,212.87",
    marketCap: "$480,212,687",
    change: "1.37%",
    changeType: "positive",
    icon: "₿",
    bgColor: "bg-orange-500",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    price: "$4,478.78",
    marketCap: "$112,212,687",
    change: "4.36%",
    changeType: "positive",
    icon: "◆",
    bgColor: "bg-blue-500",
  },
  {
    name: "Solana",
    symbol: "SOL",
    price: "$212.22",
    marketCap: "$2,212,687",
    change: "5.42%",
    changeType: "positive",
    icon: "◎",
    bgColor: "bg-purple-500",
  },
  {
    name: "Cardano",
    symbol: "ADA",
    price: "$25.45",
    marketCap: "$480,212,687",
    change: "1.06%",
    changeType: "negative",
    icon: "❄",
    bgColor: "bg-blue-400",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    price: "$4,478.78",
    marketCap: "$112,212,687",
    change: "4.36%",
    changeType: "positive",
    icon: "◆",
    bgColor: "bg-blue-500",
  },
  {
    name: "Sui",
    symbol: "SUI",
    price: "$3.39",
    marketCap: "$112,212,687",
    change: "3.71%",
    changeType: "positive",
    icon: "~",
    bgColor: "bg-cyan-500",
  },
];

interface Token {
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  value: number;
  logoUrl?: string;
  price: number;
}

interface SwapQuote {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  price: string;
  guaranteedPrice: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
  protocolFee: string;
  minimumProtocolFee: string;
  buyTokenAddress: string;
  sellTokenAddress: string;
  allowanceTarget: string;
  sources: any[];
}

export default function SwapSection() {
  // Use mock data instead of Redux
  const tokens = mockTokens;

  // State
  const [sellToken, setSellToken] = useState<Token | null>(null);
  const [buyToken, setBuyToken] = useState<Token | null>(null);
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellTokenSelectorOpen, setSellTokenSelectorOpen] = useState(false);
  const [buyTokenSelectorOpen, setBuyTokenSelectorOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [error, setError] = useState("");

  // Settings state
  const [slippage, setSlippage] = useState("3");
  const [showSettings, setShowSettings] = useState(false);
  const [customSlippage, setCustomSlippage] = useState("");
  const settingsRef = useRef<HTMLDivElement>(null);

  // Top Gainers state
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [showGainersDropdown, setShowGainersDropdown] = useState(false);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize with ETH as default sell token
  useEffect(() => {
    if (tokens.length > 0 && !sellToken) {
      const ethToken = tokens.find(
        (t) => t.symbol === "ETH" || t.contractAddress === "native"
      );
      if (ethToken) {
        setSellToken({
          symbol: ethToken.symbol,
          name: ethToken.name,
          contractAddress: ethToken.contractAddress || "native",
          decimals: ethToken.decimals || 18,
          balance: ethToken.balance,
          value: ethToken.value,
          logoUrl: ethToken.logoUrl,
          price: ethToken.price,
        });
      }
    }
  }, [tokens, sellToken]);

  // Mock quote generation when amounts change
  useEffect(() => {
    if (sellToken && buyToken && sellAmount && parseFloat(sellAmount) > 0) {
      getMockQuote();
    } else {
      setBuyAmount("");
      setQuote(null);
    }
  }, [sellToken, buyToken, sellAmount]);

  const getMockQuote = async () => {
    if (!sellToken || !buyToken || !sellAmount) return;

    setQuoteLoading(true);
    setError("");

    // Simulate API delay
    setTimeout(() => {
      try {
        // Mock exchange rate calculation
        const sellAmountNum = parseFloat(sellAmount);
        const mockExchangeRate = buyToken.price / sellToken.price;
        const buyAmountNum = sellAmountNum * mockExchangeRate;

        // Create mock quote
        const mockQuote: SwapQuote = {
          sellToken: sellToken.symbol,
          buyToken: buyToken.symbol,
          sellAmount: (
            sellAmountNum * Math.pow(10, sellToken.decimals)
          ).toString(),
          buyAmount: (
            buyAmountNum * Math.pow(10, buyToken.decimals)
          ).toString(),
          price: mockExchangeRate.toString(),
          guaranteedPrice: (mockExchangeRate * 0.97).toString(),
          to: "0x0000000000000000000000000000000000000000",
          data: "0x",
          value: "0",
          gas: "150000",
          gasPrice: "20000000000",
          protocolFee: "0",
          minimumProtocolFee: "0",
          buyTokenAddress: buyToken.contractAddress,
          sellTokenAddress: sellToken.contractAddress,
          allowanceTarget: "0x0000000000000000000000000000000000000000",
          sources: [],
        };

        setQuote(mockQuote);
        setBuyAmount(buyAmountNum.toFixed(6));
      } catch (error: any) {
        console.error("Mock quote error:", error);
        setError("Failed to get quote");
        setBuyAmount("");
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 800);
  };

  const handleSellTokenSelect = (token: Token) => {
    setSellToken(token);
    setSellTokenSelectorOpen(false);
    setSellAmount("");
    setBuyAmount("");
    setQuote(null);
  };

  const handleBuyTokenSelect = (token: Token) => {
    setBuyToken(token);
    setBuyTokenSelectorOpen(false);
    setBuyAmount("");
    setQuote(null);
  };

  const handleSwapTokens = () => {
    if (sellToken && buyToken) {
      const tempToken = sellToken;
      setSellToken(buyToken);
      setBuyToken(tempToken);
      setSellAmount("");
      setBuyAmount("");
      setQuote(null);
    }
  };

  const handleMaxClick = () => {
    if (sellToken) {
      // Reserve small amount for gas if selling ETH
      const maxAmount =
        sellToken.contractAddress === "native"
          ? Math.max(0, sellToken.balance - 0.005)
          : sellToken.balance;
      setSellAmount(maxAmount.toString());
    }
  };

  const handlePreview = () => {
    if (quote && sellToken && buyToken) {
      setPreviewModalOpen(true);
    }
  };

  const handleSlippageSelect = (value: string) => {
    if (value === "custom") {
      setSlippage(customSlippage || "3");
    } else {
      setSlippage(value);
      setCustomSlippage("");
    }
    setShowSettings(false);
  };

  const handleCustomSlippageChange = (value: string) => {
    // Only allow valid number inputs
    if (/^\d*\.?\d*$/.test(value) || value === "") {
      setCustomSlippage(value);
      if (value && parseFloat(value) >= 0.1 && parseFloat(value) <= 50) {
        setSlippage(value);
      }
    }
  };

  const canSwap =
    sellToken &&
    buyToken &&
    sellAmount &&
    quote &&
    parseFloat(sellAmount) > 0 &&
    parseFloat(sellAmount) <= sellToken.balance;

  if (loading) {
    return <SkeletonSwapSection />;
  }

  return (
    <>
      <div className="space-y-3 lg:space-y-4 h-full flex flex-col">
        {/* First Box - Trending Tokens */}
        <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] flex-1 flex flex-col p-2 lg:p-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white text-sm font-mayeka">Trending Tokens</h2>
            <div className="flex items-center gap-1 border border-[#0F0F0F] rounded-xl px-1 py-1">
              <span className="text-gray-400 text-[10px] font-satoshi">
                Change in the last 24h
              </span>
              <button className="p-0.5 hover:bg-gray-800 rounded transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M8.00003 15.1666C4.53337 15.1666 1.72003 12.3466 1.72003 8.88659C1.72003 7.63993 2.0867 6.43326 2.78003 5.39326C2.93337 5.16659 3.2467 5.09993 3.47337 5.25326C3.70003 5.4066 3.7667 5.71993 3.61337 5.94659C3.03337 6.81326 2.7267 7.83326 2.7267 8.87993C2.7267 11.7933 5.09337 14.1599 8.0067 14.1599C10.92 14.1599 13.2867 11.7933 13.2867 8.87993C13.2867 5.96659 10.9134 3.59993 8.00003 3.59993C7.3867 3.59993 6.7867 3.68659 6.22003 3.85993C5.95337 3.93993 5.67337 3.79326 5.59337 3.52659C5.51337 3.25993 5.66003 2.97993 5.9267 2.89993C6.59337 2.69993 7.2867 2.59326 8.00003 2.59326C11.4667 2.59326 14.28 5.41326 14.28 8.87326C14.28 12.3333 11.4667 15.1666 8.00003 15.1666Z"
                    fill="#E7BC3F"
                  />
                  <path
                    d="M5.24668 4.04683C5.13335 4.04683 5.01335 4.00683 4.92002 3.92683C4.70668 3.74016 4.68668 3.42683 4.86668 3.22016L6.79335 1.00683C6.97335 0.800162 7.29335 0.773495 7.50002 0.960162C7.70668 1.14016 7.72668 1.46016 7.54668 1.66683L5.62002 3.8735C5.52002 3.98683 5.38002 4.04683 5.24668 4.04683Z"
                    fill="#E7BC3F"
                  />
                  <path
                    d="M7.49332 5.68659C7.39332 5.68659 7.28666 5.65325 7.19999 5.59325L4.94666 3.94659C4.72666 3.78659 4.67999 3.47325 4.83999 3.25325C4.99999 3.02659 5.31332 2.97992 5.53999 3.13992L7.78666 4.77992C8.00666 4.93992 8.05999 5.25325 7.89332 5.47992C7.79999 5.61992 7.64666 5.68659 7.49332 5.68659Z"
                    fill="#E7BC3F"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Border between header and content */}
          <div className="border-t border-[#2C2C2C] mb-1"></div>

          {/* Token List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {trendingTokens.map((token, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5"
              >
                {/* Token info with fixed width */}
                <div className="flex items-center gap-2.5 w-24 flex-shrink-0">
                  <div
                    className={`w-7 h-7 ${token.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white text-xs font-bold font-satoshi">
                      {token.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-[11px] font-medium font-satoshi truncate">
                      {token.name}
                    </div>
                    <div className="text-gray-400 text-[8px] font-satoshi">
                      {token.symbol}
                    </div>
                  </div>
                </div>

                {/* Price with fixed width */}
                <div className="text-white text-[13px] font-medium font-satoshi w-20 text-center flex-shrink-0">
                  {token.price}
                </div>

                {/* Chart with fixed width */}
                <div className="w-20 h-7 flex-shrink-0 flex items-center justify-center">
                  <img
                    src="/graph.png"
                    alt="chart"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Change percentage with fixed width */}
                <div
                  className={`text-xs font-medium font-satoshi w-16 text-center flex-shrink-0 ${
                    token.changeType === "positive"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {token.change}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Second Box - Top Gainers */}
        <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] flex-1 flex flex-col p-2 lg:p-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <button
                onClick={() => setShowGainersDropdown(!showGainersDropdown)}
                className="flex items-center gap-2 bg-[#0F0F0F] rounded-[20px] px-4 py-2 text-white text-sm font-mayeka hover:bg-[#222] transition-colors"
              >
                Top Gainers
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown */}
              {showGainersDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg py-1 min-w-[120px] z-10">
                  <button className="w-full text-left px-3 py-1.5 text-white text-sm font-satoshi hover:bg-[#2C2C2C] transition-colors">
                    Top Gainers
                  </button>
                  <button className="w-full text-left px-3 py-1.5 text-gray-400 text-sm font-satoshi hover:bg-[#2C2C2C] transition-colors">
                    Top Losers
                  </button>
                  <button className="w-full text-left px-3 py-1.5 text-gray-400 text-sm font-satoshi hover:bg-[#2C2C2C] transition-colors">
                    Most Active
                  </button>
                </div>
              )}
            </div>

            {/* Time Filter */}
            <div className="flex items-center bg-[#000000] border border-[#2C2C2C] rounded-[20px] p-1">
              {["1hr", "24h", "7d"].map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-3 py-1 text-xs font-satoshi rounded-[200px] transition-colors ${
                    selectedTimeframe === timeframe
                      ? "bg-[#0F0F0F] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div className="flex items-center justify-between py-2 border-b border-[#2C2C2C] mb-2">
            <div className="text-gray-400 text-xs font-satoshi w-[100px] text-center">
              Name
            </div>
            <div className="text-gray-400 text-xs font-satoshi w-[80px] text-center">
              Price
            </div>
            <div className="text-gray-400 text-xs font-satoshi w-[100px] text-center">
              Market Cap
            </div>
            <div className="text-gray-400 text-xs font-satoshi w-[60px] text-center">
              {selectedTimeframe}
            </div>
          </div>

          {/* Token List */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {topGainersData.map((token, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5 hover:bg-[#1A1A1A] rounded-lg px-1 transition-colors"
              >
                {/* Token info */}
                <div className="flex items-center gap-2.5 w-[100px] flex-shrink-0">
                  <div
                    className={`w-6 h-6 ${token.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white text-xs font-bold font-satoshi">
                      {token.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-[11px] font-medium font-satoshi truncate">
                      {token.name}
                    </div>
                    <div className="text-gray-400 text-[9px] font-satoshi">
                      {token.symbol}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-white text-[11px] font-medium font-satoshi w-[80px] text-center flex-shrink-0">
                  {token.price}
                </div>

                {/* Market Cap */}
                <div className="text-white text-[11px] font-medium font-satoshi w-[100px] text-center flex-shrink-0">
                  {token.marketCap}
                </div>

                {/* Change percentage */}
                <div className="w-[60px] text-center flex-shrink-0">
                  <div
                    className={`text-[11px] font-medium font-satoshi ${
                      token.changeType === "positive"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {token.changeType === "positive" ? "▲" : "▼"} {token.change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          /* Remove number input spinners */
          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          input[type="number"] {
            -moz-appearance: textfield;
          }

          /* Mobile specific styles */
          @media (max-width: 640px) {
            input {
              font-size: 14px !important; /* Prevents zoom on iOS */
            }
          }
        `}</style>
      </div>

      {/* Token Selector Modals - Use mock data */}
      <TokenSelectorModal
        isOpen={sellTokenSelectorOpen}
        onClose={() => setSellTokenSelectorOpen(false)}
        onSelect={handleSellTokenSelect}
        tokens={tokens.map((t) => ({
          symbol: t.symbol,
          name: t.name,
          contractAddress: t.contractAddress || "native",
          decimals: t.decimals || 18,
          balance: t.balance,
          value: t.value,
          logoUrl: t.logoUrl,
          price: t.price,
        }))}
        title="Select Token"
        showBalances={true}
      />

      <TokenSelectorModal
        isOpen={buyTokenSelectorOpen}
        onClose={() => setBuyTokenSelectorOpen(false)}
        onSelect={handleBuyTokenSelect}
        tokens={tokens.map((t) => ({
          symbol: t.symbol,
          name: t.name,
          contractAddress: t.contractAddress || "native",
          decimals: t.decimals || 18,
          balance: t.balance,
          value: t.value,
          logoUrl: t.logoUrl,
          price: t.price,
        }))}
        title="Select Token"
        showBalances={false}
        allowCustomToken={true}
      />

      {/* Preview Modal - Demo functionality */}
      <SwapPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        sellToken={sellToken}
        buyToken={buyToken}
        sellAmount={sellAmount}
        buyAmount={buyAmount}
        quote={quote}
        onConfirm={() => {
          setPreviewModalOpen(false);
          // Reset form after demo swap
          setSellAmount("");
          setBuyAmount("");
          setQuote(null);
          console.log("Demo swap completed!");
        }}
      />
    </>
  );
}
