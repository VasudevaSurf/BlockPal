// src/components/dashboard/SwapSection.tsx - INTERACTIVE SWAP IN SECTION
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { RootState } from "@/store";
import TokenSelectorModal from "@/components/swap/TokenSelectorModal";
import SwapPreviewModal from "@/components/swap/SwapPreviewModal";
import { SkeletonSwapSection } from "@/components/ui/Skeleton";

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
  const { activeWallet, tokens } = useSelector(
    (state: RootState) => state.wallet
  );

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
          logoUrl: ethToken.icon,
          price: ethToken.price,
        });
      }
    }
  }, [tokens, sellToken]);

  // Get quote when amounts change
  useEffect(() => {
    if (sellToken && buyToken && sellAmount && parseFloat(sellAmount) > 0) {
      getQuote();
    } else {
      setBuyAmount("");
      setQuote(null);
    }
  }, [sellToken, buyToken, sellAmount]);

  const getQuote = async () => {
    if (!sellToken || !buyToken || !sellAmount || !activeWallet) return;

    setQuoteLoading(true);
    setError("");

    try {
      const response = await fetch("/api/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellToken:
            sellToken.contractAddress === "native"
              ? "ETH"
              : sellToken.contractAddress,
          buyToken:
            buyToken.contractAddress === "native"
              ? "ETH"
              : buyToken.contractAddress,
          sellAmount: (
            parseFloat(sellAmount) * Math.pow(10, sellToken.decimals)
          ).toString(),
          takerAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get quote");
      }

      setQuote(data.quote);
      const buyAmountFormatted =
        parseFloat(data.quote.buyAmount) / Math.pow(10, buyToken.decimals);
      setBuyAmount(buyAmountFormatted.toFixed(6));
    } catch (error: any) {
      console.error("Quote error:", error);
      setError(error.message);
      setBuyAmount("");
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
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
        {/* Header */}
        <h2 className="text-sm lg:text-base font-semibold text-white mb-3 lg:mb-4 font-mayeka-demi-bold-demo">
          Swap
        </h2>

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
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="bg-transparent text-base lg:text-lg font-bold text-white focus:outline-none font-mayeka-demi-bold-demo w-full"
                    placeholder="0"
                    step="any"
                    style={{
                      fontSize:
                        typeof window !== "undefined" && window.innerWidth < 640
                          ? "14px"
                          : undefined,
                    }}
                  />
                  <div className="text-gray-400 text-[10px] lg:text-xs font-satoshi mt-0.5">
                    {sellToken && sellAmount
                      ? `${(parseFloat(sellAmount) * sellToken.price).toFixed(
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
          <div className="text-center text-gray-400 text-xs font-satoshi mb-2">
            1 {sellToken.symbol} ={" "}
            {(parseFloat(buyAmount) / parseFloat(sellAmount)).toFixed(6)}{" "}
            {buyToken.symbol}
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handlePreview}
          disabled={!canSwap || quoteLoading}
          className="w-full bg-[#E2AF19] hover:bg-[#D4A853] disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold py-2 lg:py-2.5 rounded-lg transition-colors font-satoshi mb-3 lg:mb-4 flex-shrink-0 text-xs lg:text-sm"
        >
          {quoteLoading ? "Getting Quote..." : "Swap"}
        </button>

        {/* Blockpal Info Section - Original content */}
        <div className="flex-1 flex flex-col justify-end min-h-0 overflow-hidden">
          <div className="text-center max-h-full overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-center mb-2 lg:mb-3">
              <div className="w-4 h-4 lg:w-5 lg:h-5 bg-[#E2AF19] rounded-full mr-1.5 flex items-center justify-center">
                <span className="text-black text-[10px] lg:text-xs font-bold">
                  B
                </span>
              </div>
              <span className="text-white font-semibold font-satoshi text-sm lg:text-base">
                Blockpal
              </span>
            </div>

            <div className="mb-4 lg:mb-6">
              <p className="text-gray-400 text-[10px] sm:text-xs font-satoshi leading-relaxed mb-2 lg:mb-3 max-w-xs mx-auto">
                Blockpal is a modern crypto wallet that makes managing your
                digital assets easy and stress-free. Whether you're sending
                tokens, tracking your balance, or planning future payments,
                Blockpal brings everything you need to one streamlined space.
              </p>

              <p className="text-gray-400 text-[10px] sm:text-xs font-satoshi mb-4 lg:mb-6">
                No complex tools, just a smooth, secure, and simple way to stay
                in control of your crypto.
              </p>
            </div>

            {/* Social icons at the very bottom */}
            <div className="flex justify-center space-x-2 lg:space-x-3 pb-1">
              <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gray-700 rounded-full"></div>
              <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gray-700 rounded-full"></div>
              <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gray-700 rounded-full"></div>
              <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gray-700 rounded-full"></div>
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

          /* Mobile specific styles */
          @media (max-width: 640px) {
            input {
              font-size: 14px !important; /* Prevents zoom on iOS */
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
          logoUrl: t.icon,
          price: t.price,
        }))}
        title="Select Token to Sell"
        showBalances={true}
      />

      <TokenSelectorModal
        isOpen={buyTokenSelectorOpen}
        onClose={() => setBuyTokenSelectorOpen(false)}
        onSelect={handleBuyTokenSelect}
        tokens={[]}
        title="Select Token to Buy"
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
          // Reset form after successful swap
          setSellAmount("");
          setBuyAmount("");
          setQuote(null);
        }}
      />
    </>
  );
}
