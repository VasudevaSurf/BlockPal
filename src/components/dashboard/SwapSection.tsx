// src/components/dashboard/SwapSection.tsx - FIXED to keep skeleton until all content ready
"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  Settings,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import TokenSelectorModal from "@/components/swap/TokenSelectorModal";
import SwapPreviewModal from "@/components/swap/SwapPreviewModal";
import { useCoinGecko, TrendingToken, TopGainer } from "@/hooks/useCoinGecko";
import { useDashboardLoading } from "@/contexts/DashboardLoadingContext";

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

// Token Image Component with fallback
const TokenImage = ({
  token,
  size = "w-7 h-7",
}: {
  token: TrendingToken | TopGainer;
  size?: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  if (!token.imageUrl || imageError || imageLoading) {
    return (
      <div
        className={`${size} ${token.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
      >
        <span className="text-white text-xs font-bold font-satoshi">
          {token.icon}
        </span>
        {token.imageUrl && imageLoading && (
          <img
            src={token.imageUrl}
            alt={token.name}
            className="hidden"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-800`}
    >
      <img
        src={token.imageUrl}
        alt={token.name}
        className="w-full h-full object-cover"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
};

export default function SwapSection() {
  // Use CoinGecko hook for real data
  const {
    data: coinGeckoData,
    loading: coinGeckoLoading,
    error: coinGeckoError,
    refetch,
  } = useCoinGecko();

  // Use dashboard loading context
  const { allComponentsLoaded, setComponentLoading } = useDashboardLoading();

  // Track initial load
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Use mock data instead of Redux
  const tokens = mockTokens;

  // Get real trending tokens and top gainers from CoinGecko
  const trendingTokens = coinGeckoData?.trendingTokens || [];
  const topGainersData = coinGeckoData?.topGainers || [];

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

  // Update loading state for dashboard synchronization
  useEffect(() => {
    const isLoading = coinGeckoLoading && !hasInitiallyLoaded;
    setComponentLoading("swapSection", isLoading);

    // Mark as loaded once we have data
    if (
      !coinGeckoLoading &&
      (trendingTokens.length > 0 || topGainersData.length > 0)
    ) {
      setHasInitiallyLoaded(true);
    }
  }, [
    coinGeckoLoading,
    trendingTokens.length,
    topGainersData.length,
    hasInitiallyLoaded,
    setComponentLoading,
  ]);

  // Determine if we should show content or skeleton
  const shouldShowContent =
    allComponentsLoaded && hasInitiallyLoaded && !coinGeckoLoading;

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

    setTimeout(() => {
      try {
        const sellAmountNum = parseFloat(sellAmount);
        const mockExchangeRate = buyToken.price / sellToken.price;
        const buyAmountNum = sellAmountNum * mockExchangeRate;

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
            </div>
          </div>

          <div className="border-t border-[#2C2C2C] mb-1"></div>

          {/* Error State - only show when content should be visible */}
          {coinGeckoError && shouldShowContent && (
            <div className="flex items-center justify-center p-4">
              <div className="text-center">
                <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
                <p className="text-red-400 text-xs font-satoshi mb-2">
                  {coinGeckoError}
                </p>
                <button
                  onClick={refetch}
                  className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Loading State - show skeleton until shouldShowContent is true */}
          {!shouldShowContent && (
            <div className="flex-1 overflow-y-auto space-y-2 animate-pulse">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2.5 w-24 flex-shrink-0">
                    <div className="w-7 h-7 bg-[#1A1A1A] rounded-full"></div>
                    <div className="min-w-0 flex-1">
                      <div className="h-2 bg-[#1A1A1A] rounded mb-1"></div>
                      <div className="h-1.5 bg-[#1A1A1A] rounded"></div>
                    </div>
                  </div>
                  <div className="w-20 h-2 bg-[#1A1A1A] rounded"></div>
                  <div className="w-20 h-7 bg-[#1A1A1A] rounded"></div>
                  <div className="w-16 h-2 bg-[#1A1A1A] rounded"></div>
                </div>
              ))}
            </div>
          )}

          {/* Token List - only show when shouldShowContent is true */}
          {shouldShowContent && !coinGeckoError && (
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {trendingTokens.length > 0 ? (
                trendingTokens.map((token: TrendingToken) => (
                  <div
                    key={token.index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2.5 w-24 flex-shrink-0">
                      <TokenImage token={token} />
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-[11px] font-medium font-satoshi truncate">
                          {token.name}
                        </div>
                        <div className="text-gray-400 text-[8px] font-satoshi">
                          {token.symbol}
                        </div>
                      </div>
                    </div>

                    <div className="text-white text-[13px] font-medium font-satoshi w-20 text-center flex-shrink-0">
                      {token.price}
                    </div>

                    <div className="w-20 h-7 flex-shrink-0 flex items-center justify-center">
                      {token.sparklineUrl ? (
                        <img
                          src={token.sparklineUrl}
                          alt={`${token.name} chart`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/graph.png";
                          }}
                        />
                      ) : (
                        <img
                          src="/graph.png"
                          alt="chart placeholder"
                          className="w-full h-full object-contain opacity-50"
                        />
                      )}
                    </div>

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
                ))
              ) : (
                <div className="flex items-center justify-center p-4">
                  <p className="text-gray-400 text-sm font-satoshi">
                    No trending tokens available
                  </p>
                </div>
              )}
            </div>
          )}
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

          {/* Loading State - show skeleton until shouldShowContent is true */}
          {!shouldShowContent && (
            <div className="flex-1 overflow-y-auto space-y-1 animate-pulse">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2.5 w-[100px]">
                    <div className="w-6 h-6 bg-[#1A1A1A] rounded-full"></div>
                    <div className="min-w-0 flex-1">
                      <div className="h-2 bg-[#1A1A1A] rounded mb-1"></div>
                      <div className="h-1.5 bg-[#1A1A1A] rounded"></div>
                    </div>
                  </div>
                  <div className="w-[80px] h-2 bg-[#1A1A1A] rounded"></div>
                  <div className="w-[100px] h-2 bg-[#1A1A1A] rounded"></div>
                  <div className="w-[60px] h-2 bg-[#1A1A1A] rounded"></div>
                </div>
              ))}
            </div>
          )}

          {/* Token List - only show when shouldShowContent is true */}
          {shouldShowContent && (
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
              {topGainersData.length > 0 ? (
                topGainersData.map((token: TopGainer) => (
                  <div
                    key={token.index}
                    className="flex items-center justify-between py-1.5 hover:bg-[#1A1A1A] rounded-lg px-1 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 w-[100px] flex-shrink-0">
                      <TokenImage token={token} size="w-6 h-6" />
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-[11px] font-medium font-satoshi truncate">
                          {token.name}
                        </div>
                        <div className="text-gray-400 text-[9px] font-satoshi">
                          {token.symbol}
                        </div>
                      </div>
                    </div>

                    <div className="text-white text-[11px] font-medium font-satoshi w-[80px] text-center flex-shrink-0">
                      {token.price}
                    </div>

                    <div className="text-white text-[11px] font-medium font-satoshi w-[100px] text-center flex-shrink-0">
                      {token.marketCap}
                    </div>

                    <div className="w-[60px] text-center flex-shrink-0">
                      <div
                        className={`text-[11px] font-medium font-satoshi ${
                          token.changeType === "positive"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {token.changeType === "positive" ? "▲" : "▼"}{" "}
                        {token.change}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center p-4">
                  <p className="text-gray-400 text-sm font-satoshi">
                    No top gainers available
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          input[type="number"] {
            -moz-appearance: textfield;
          }

          @media (max-width: 640px) {
            input {
              font-size: 14px !important;
            }
          }
        `}</style>
      </div>

      {/* Token Selector Modals */}
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

      {/* Preview Modal */}
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
          setSellAmount("");
          setBuyAmount("");
          setQuote(null);
          console.log("Demo swap completed!");
        }}
      />
    </>
  );
}