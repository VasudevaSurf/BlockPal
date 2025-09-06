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
      <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] h-full flex flex-col p-3 lg:p-4 overflow-hidden">
        {/* Header with Settings */}
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            Swap
          </h2>
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 lg:p-1.5 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <Settings className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 bg-black border border-[#2C2C2C] rounded-lg p-3 w-48 shadow-xl z-20">
                <div className="text-white text-xs font-satoshi mb-2">
                  Slippage Tolerance
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSlippageSelect("3")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-satoshi transition-colors ${
                      slippage === "3" && !customSlippage
                        ? "bg-[#E2AF19] text-black"
                        : "text-gray-400 hover:text-white hover:bg-[#2C2C2C]"
                    }`}
                  >
                    3%
                  </button>
                  <button
                    onClick={() => handleSlippageSelect("5")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-satoshi transition-colors ${
                      slippage === "5" && !customSlippage
                        ? "bg-[#E2AF19] text-black"
                        : "text-gray-400 hover:text-white hover:bg-[#2C2C2C]"
                    }`}
                  >
                    5%
                  </button>
                  <div className="relative">
                    <input
                      type="text"
                      value={customSlippage}
                      onChange={(e) =>
                        handleCustomSlippageChange(e.target.value)
                      }
                      placeholder="Custom"
                      className={`w-full px-3 py-2 rounded-lg text-sm font-satoshi bg-transparent border transition-colors ${
                        customSlippage
                          ? "border-[#E2AF19] text-white"
                          : "border-[#2C2C2C] text-gray-400"
                      } focus:outline-none focus:border-[#E2AF19]`}
                    />
                    {customSlippage && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        %
                      </span>
                    )}
                  </div>
                </div>
                {customSlippage &&
                  (parseFloat(customSlippage) < 0.1 ||
                    parseFloat(customSlippage) > 50) && (
                    <div className="mt-2 text-xs text-red-400 font-satoshi">
                      Must be between 0.1% and 50%
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Swap Form */}
        <div className="relative mb-3 lg:mb-4 flex-shrink-0">
          {/* Sell Section */}
          <div>
            <div className="bg-black border border-[#2C2C2C] rounded-xl p-2.5 lg:p-3 w-full h-20 sm:h-24 lg:h-28 overflow-hidden">
              <div className="flex items-center justify-between mb-1.5 lg:mb-2">
                <span className="text-white text-xs font-satoshi">From</span>
                <button
                  onClick={() => setSellTokenSelectorOpen(true)}
                  className="flex items-center bg-[#0F0F0F] hover:bg-[#2C2C2C] px-1.5 lg:px-2 py-1 lg:py-1.5 rounded-full text-xs flex-shrink-0 transition-colors"
                >
                  {sellToken ? (
                    <>
                      {sellToken.logoUrl && (
                        <img
                          src={sellToken.logoUrl}
                          alt={sellToken.symbol}
                          className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full mr-1 lg:mr-1.5"
                        />
                      )}
                      <span className="text-white font-satoshi mr-1 lg:mr-1.5 text-[10px]">
                        {sellToken.symbol}
                      </span>
                    </>
                  ) : (
                    <span className="text-white font-satoshi mr-1 lg:mr-1.5 text-[10px]">
                      Select
                    </span>
                  )}
                  <ChevronDown className="w-2 h-2 lg:w-2.5 lg:h-2.5 text-white" />
                </button>
              </div>
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 mr-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sellAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setSellAmount(value);
                      }
                    }}
                    className="bg-transparent text-base lg:text-lg font-bold text-white focus:outline-none font-mayeka-demi-bold-demo w-full appearance-none"
                    placeholder="0"
                    style={{
                      fontSize:
                        typeof window !== "undefined" && window.innerWidth < 640
                          ? "14px"
                          : undefined,
                      WebkitAppearance: "none",
                      MozAppearance: "textfield",
                    }}
                  />
                  <div className="text-gray-400 text-[10px] lg:text-xs font-satoshi mt-0.5">
                    {sellToken && sellAmount
                      ? `$${(parseFloat(sellAmount) * sellToken.price).toFixed(
                          2
                        )}`
                      : "$0"}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 lg:gap-1.5">
                    <span className="text-gray-400 text-[10px] font-satoshi">
                      {sellToken
                        ? `${sellToken.balance.toFixed(4)} ${sellToken.symbol}`
                        : "0"}
                    </span>
                    {sellToken && (
                      <button
                        onClick={handleMaxClick}
                        className="text-gray-400 text-[10px] font-satoshi bg-[#2C2C2C] hover:bg-[#3C3C3C] px-1 lg:px-1.5 py-0.5 rounded-full transition-colors"
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gap between sections */}
          <div className="h-1.5 lg:h-2"></div>

          {/* Buy Section */}
          <div>
            <div className="bg-black border border-[#2C2C2C] rounded-xl p-2.5 lg:p-3 w-full h-20 sm:h-24 lg:h-28 overflow-hidden">
              <div className="flex items-center justify-between mb-1.5 lg:mb-2">
                <span className="text-white text-xs font-satoshi">To</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-2">
                  <div className="text-base lg:text-lg font-bold text-white font-mayeka-demi-bold-demo">
                    {quoteLoading ? "..." : buyAmount || "0"}
                  </div>
                  {buyToken && buyAmount && (
                    <div className="text-gray-400 text-[10px] lg:text-xs font-satoshi mt-0.5">
                      ${(parseFloat(buyAmount) * buyToken.price).toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => setBuyTokenSelectorOpen(true)}
                    className="bg-[#E2AF19] hover:bg-[#D4A853] text-black px-1.5 lg:px-2 py-1 lg:py-1.5 rounded-full font-satoshi font-medium text-[10px] transition-colors flex items-center"
                  >
                    {buyToken ? (
                      <>
                        {buyToken.logoUrl && (
                          <img
                            src={buyToken.logoUrl}
                            alt={buyToken.symbol}
                            className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full mr-1"
                          />
                        )}
                        <span className="mr-1">{buyToken.symbol}</span>
                      </>
                    ) : (
                      <span className="mr-1">Select Token</span>
                    )}
                    <ChevronDown className="w-2 h-2 lg:w-2.5 lg:h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Overlaid Swap Arrow - clickable */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 z-10"
            style={{ top: "calc(50% - 12px)" }}
          >
            <button
              onClick={handleSwapTokens}
              className="w-6 h-6 lg:w-7 lg:h-7 bg-black border border-[#2C2C2C] hover:border-[#E2AF19] rounded-lg flex items-center justify-center transition-colors"
            >
              <ArrowUpDown className="text-white w-3 h-3 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-red-900/20 border border-red-500/50 rounded-lg mb-2">
            <p className="text-red-400 text-xs font-satoshi">{error}</p>
          </div>
        )}

        {/* Rate Display */}
        {quote && sellToken && buyToken && (
          <div className="text-center mb-2">
            <div className="text-gray-400 text-xs font-satoshi">
              1 {sellToken.symbol} ={" "}
              {(parseFloat(buyAmount) / parseFloat(sellAmount)).toFixed(6)}{" "}
              {buyToken.symbol}
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handlePreview}
          disabled={!canSwap || quoteLoading}
          className="w-full bg-[#E2AF19] hover:bg-[#D4A853] disabled:bg-[#E2AF19] disabled:cursor-not-allowed text-black font-semibold py-2 lg:py-2.5 rounded-lg transition-colors font-satoshi mb-3 lg:mb-4 flex-shrink-0 text-xs lg:text-sm"
        >
          {quoteLoading ? "Getting Quote..." : "Swap"}
        </button>

        {/* Blockpal Info Section */}
        <div className="flex-1 flex justify-center min-h-0 overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-5">
            <img
              src="/blockName.png"
              alt="Blockpal"
              className="brightness-110 h-5 lg:h-6"
              style={{
                width: "auto",
              }}
            />
            <div className="flex justify-center space-x-2 lg:space-x-3">
              {/* Website */}
              <a
                href="https://www.blockpal.tech/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </a>

              {/* Telegram */}
              <a
                href="https://t.me/placeholder"
                target="_blank"
                rel="noopener noreferrer"
                className="w-4 h-4 lg:w-5 lg:h-5 rounded-full flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-45 h-45 lg:w-45 lg:h-45 text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                </svg>
              </a>

              {/* Twitter */}
              <a
                href="https://twitter.com/placeholder"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* Documentation */}
              <a
                href="https://docs-placeholder.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="w-4 h-4 lg:w-4.5 lg:h-4.5"
                  viewBox="0 0 65 65"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M27.3964 34.2196C30.5255 36.0256 32.09 36.9286 33.8083 36.9301C35.5265 36.9316 37.0926 36.0313 40.2249 34.2308L60.1914 22.7535C61.0927 22.2354 61.6484 21.275 61.6484 20.2353C61.6484 19.1956 61.0927 18.2352 60.1914 17.7171L40.2177 6.2356C37.0888 4.43701 35.5243 3.53772 33.8078 3.53839C32.0912 3.53906 30.5275 4.43957 27.4 6.24059L10.2293 16.1286C10.102 16.2019 10.0384 16.2386 9.97908 16.2733C4.11371 19.7069 0.489892 25.9755 0.441438 32.7718C0.440948 32.8405 0.440948 32.9139 0.440948 33.0608C0.440948 33.2074 0.440948 33.2808 0.441437 33.3494C0.489785 40.1381 4.10552 46.4008 9.96044 49.8371C10.0196 49.8718 10.0832 49.9085 10.2102 49.9819L20.9659 56.1919C27.2332 59.8104 30.3668 61.6197 33.8081 61.6209C37.2493 61.622 40.3842 59.8149 46.6539 56.2005L58.008 49.6552C61.1474 47.8454 62.7171 46.9406 63.579 45.4488C64.4409 43.957 64.4409 42.1452 64.4409 38.5215V31.5212C64.4409 30.516 63.8965 29.5896 63.0182 29.1004C62.1684 28.6271 61.1325 28.6341 60.2891 29.1189L37.0074 42.5019C35.4454 43.3998 34.6643 43.8488 33.8073 43.8491C32.9502 43.8493 32.1689 43.4008 30.6063 42.5039L14.8487 33.4587C14.0594 33.0056 13.6647 32.779 13.3477 32.7381C12.625 32.6448 11.9301 33.0497 11.6548 33.7244C11.5341 34.0203 11.5365 34.4754 11.5414 35.3855C11.545 36.0555 11.5468 36.3905 11.6094 36.6987C11.7497 37.3888 12.1127 38.0136 12.6428 38.4772C12.8795 38.6842 13.1696 38.8517 13.75 39.1866L30.5974 48.9103C32.1641 49.8145 32.9474 50.2666 33.8075 50.2669C34.6677 50.2671 35.4513 49.8154 37.0184 48.9121L57.6684 37.0086C58.2037 36.7 58.4714 36.5457 58.6721 36.6617C58.8727 36.7777 58.8727 37.0866 58.8727 37.7045V40.8796C58.8727 41.7856 58.8727 42.2385 58.6572 42.6115C58.4418 42.9844 58.0493 43.2106 57.2644 43.6631L40.2322 53.4811C37.0966 55.2886 35.5288 56.1923 33.8079 56.1915C32.0869 56.1907 30.5199 55.2856 27.386 53.4752L11.4509 44.2702C11.4003 44.2409 11.375 44.2263 11.3514 44.2125C8.01023 42.2601 5.94859 38.6883 5.92925 34.8185C5.92912 34.7912 5.92912 34.762 5.92912 34.7035V31.7889C5.92912 29.6526 7.06689 27.678 8.91513 26.6067C10.5483 25.6601 12.5628 25.6582 14.1977 26.6018L27.3964 34.2196Z"
                    className="text-gray-300"
                  />
                </svg>
              </a>
            </div>
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
