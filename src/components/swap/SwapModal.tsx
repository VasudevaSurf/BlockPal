// src/components/swap/SwapModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { X, ChevronDown, ArrowUpDown, AlertCircle, Info } from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TokenSelectorModal from "./TokenSelectorModal";
import SwapPreviewModal from "./SwapPreviewModal";
import { ethers } from "ethers";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  to?: string;
  data?: string;
  value?: string;
  gas?: string;
  gasPrice: string;
  protocolFee: string;
  minimumProtocolFee: string;
  buyTokenAddress: string;
  sellTokenAddress: string;
  allowanceTarget: string;
  sources: any[];
  transaction?: {
    to: string;
    data: string;
    value: string;
    gas: string;
  };
}

interface SwapError {
  message: string;
  suggestion: string;
  type:
    | "VALIDATION_ERROR"
    | "API_ERROR"
    | "NETWORK_ERROR"
    | "TIMEOUT_ERROR"
    | "UNKNOWN_ERROR";
}

export default function SwapModal({ isOpen, onClose }: SwapModalProps) {
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
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [error, setError] = useState<SwapError | null>(null);
  const [quoteTimeout, setQuoteTimeout] = useState<NodeJS.Timeout | null>(null);

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

  // Debounced quote function
  const getQuote = useCallback(async () => {
    if (!sellToken || !buyToken || !sellAmount || !activeWallet) return;

    const sellAmountNum = parseFloat(sellAmount);
    if (isNaN(sellAmountNum) || sellAmountNum <= 0) {
      setBuyAmount("");
      setQuote(null);
      setError(null);
      return;
    }

    // Only check for extremely small amounts that would cause issues
    if (sellAmountNum < 1e-15) {
      setError({
        message: "Amount too small for calculation",
        suggestion: "Please enter a larger amount",
        type: "VALIDATION_ERROR",
      });
      setBuyAmount("");
      setQuote(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Only check balance, let 0x API handle minimum amount validation
      if (sellAmountNum > sellToken.balance) {
        throw new Error(
          JSON.stringify({
            error: "Insufficient balance",
            suggestion: `Available balance: ${sellToken.balance.toFixed(6)} ${
              sellToken.symbol
            }`,
            errorType: "VALIDATION_ERROR",
          })
        );
      }

      // Only reserve gas for ETH swaps, but don't prevent small amounts
      if (
        (sellToken.contractAddress === "native" ||
          sellToken.contractAddress ===
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") &&
        sellAmountNum > sellToken.balance - 0.005
      ) {
        throw new Error(
          JSON.stringify({
            error: "Insufficient ETH for gas fees",
            suggestion:
              "Please reserve at least 0.005 ETH for transaction fees",
            errorType: "VALIDATION_ERROR",
          })
        );
      }

      // Convert amount to base units properly (like in your JS file)
      let sellAmountInBaseUnits;
      try {
        // Use more precise calculation to avoid precision issues
        const sellAmountBigInt = ethers.parseUnits(
          sellAmount,
          sellToken.decimals
        );
        sellAmountInBaseUnits = sellAmountBigInt.toString();
      } catch (conversionError) {
        throw new Error(
          JSON.stringify({
            error: "Invalid amount format",
            suggestion: "Please enter a valid number",
            errorType: "VALIDATION_ERROR",
          })
        );
      }

      console.log("🔄 Requesting quote:", {
        sellToken:
          sellToken.contractAddress === "native" ||
          sellToken.contractAddress ===
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            ? "ETH"
            : sellToken.contractAddress,
        buyToken:
          buyToken.contractAddress === "native" ||
          buyToken.contractAddress ===
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            ? "ETH"
            : buyToken.contractAddress,
        sellAmount: sellAmount,
        sellAmountInBaseUnits,
        sellTokenDecimals: sellToken.decimals,
        buyTokenDecimals: buyToken.decimals,
      });

      const response = await fetch("/api/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellToken:
            sellToken.contractAddress === "native" ||
            sellToken.contractAddress ===
              "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
              ? "ETH"
              : sellToken.contractAddress,
          buyToken:
            buyToken.contractAddress === "native" ||
            buyToken.contractAddress ===
              "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
              ? "ETH"
              : buyToken.contractAddress,
          sellAmount: sellAmountInBaseUnits,
          takerAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      const data = await response.json();

      console.log("📈 Quote response:", {
        success: response.ok,
        status: response.status,
        data: response.ok ? "Quote received" : data,
      });

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      if (!data.quote || !data.quote.buyAmount) {
        throw new Error(
          JSON.stringify({
            error: "Invalid quote response",
            suggestion: "Please try again or contact support",
            errorType: "API_ERROR",
          })
        );
      }

      setQuote(data.quote);
      const buyAmountFormatted =
        parseFloat(data.quote.buyAmount) / Math.pow(10, buyToken.decimals);
      setBuyAmount(buyAmountFormatted.toFixed(6));
      setError(null);

      console.log("✅ Quote processed successfully:", {
        buyAmount: data.quote.buyAmount,
        buyAmountFormatted: buyAmountFormatted.toFixed(6),
      });
    } catch (error: any) {
      console.error("Quote error:", error);

      let errorData;
      try {
        errorData = JSON.parse(error.message);
      } catch {
        errorData = {
          error: "Failed to get quote",
          suggestion: "Please try again or contact support",
          errorType: "UNKNOWN_ERROR",
        };
      }

      setError({
        message: errorData.error || "Quote failed",
        suggestion: errorData.suggestion || "Please try again",
        type: errorData.errorType || "UNKNOWN_ERROR",
      });
      setBuyAmount("");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [sellToken, buyToken, sellAmount, activeWallet]);

  // Debounced quote fetching
  useEffect(() => {
    if (quoteTimeout) {
      clearTimeout(quoteTimeout);
    }

    if (sellToken && buyToken && sellAmount && parseFloat(sellAmount) > 0) {
      // Add delay to avoid too many API calls
      const timeout = setTimeout(() => {
        getQuote();
      }, 800); // 800ms delay

      setQuoteTimeout(timeout);
    } else {
      setBuyAmount("");
      setQuote(null);
      setError(null);
    }

    return () => {
      if (quoteTimeout) {
        clearTimeout(quoteTimeout);
      }
    };
  }, [sellToken, buyToken, sellAmount, getQuote]);

  const handleSellTokenSelect = (token: Token) => {
    setSellToken(token);
    setSellTokenSelectorOpen(false);
    setSellAmount("");
    setBuyAmount("");
    setQuote(null);
    setError(null);
  };

  const handleBuyTokenSelect = (token: Token) => {
    setBuyToken(token);
    setBuyTokenSelectorOpen(false);
    setBuyAmount("");
    setQuote(null);
    setError(null);
  };

  const handleSwapTokens = () => {
    if (sellToken && buyToken) {
      const tempToken = sellToken;
      setSellToken(buyToken);
      setBuyToken(tempToken);
      setSellAmount("");
      setBuyAmount("");
      setQuote(null);
      setError(null);
    }
  };

  const handleMaxClick = () => {
    if (sellToken) {
      // Reserve small amount for gas if selling ETH
      const maxAmount =
        sellToken.contractAddress === "native" ||
        sellToken.contractAddress ===
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
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

  const handleAmountChange = (value: string) => {
    // Only allow valid number inputs
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setSellAmount(value);
    }
  };

  const canSwap =
    sellToken &&
    buyToken &&
    sellAmount &&
    quote &&
    !error &&
    !loading &&
    parseFloat(sellAmount) > 0 &&
    parseFloat(sellAmount) <= sellToken.balance;

  // Debug function to check what's happening
  const handlePreviewDebug = () => {
    console.log("🔍 Swap button clicked - Debug info:", {
      sellToken: sellToken?.symbol,
      buyToken: buyToken?.symbol,
      sellAmount,
      buyAmount,
      quote: !!quote,
      error: error?.message,
      loading,
      canSwap,
    });

    if (!sellToken) {
      console.log("❌ No sell token selected");
      return;
    }

    if (!buyToken) {
      console.log("❌ No buy token selected");
      return;
    }

    if (!sellAmount) {
      console.log("❌ No sell amount entered");
      return;
    }

    if (!quote) {
      console.log("❌ No quote available");
      return;
    }

    if (error) {
      console.log("❌ Error present:", error);
      return;
    }

    if (loading) {
      console.log("❌ Still loading");
      return;
    }

    console.log("✅ All conditions met, opening preview modal");
    handlePreview();
  };

  // Error icon based on error type
  const getErrorIcon = (type: string) => {
    switch (type) {
      case "VALIDATION_ERROR":
        return <AlertCircle size={16} className="text-orange-400" />;
      case "NETWORK_ERROR":
      case "TIMEOUT_ERROR":
        return <AlertCircle size={16} className="text-yellow-400" />;
      default:
        return <AlertCircle size={16} className="text-red-400" />;
    }
  };

  // Error color based on error type
  const getErrorColor = (type: string) => {
    switch (type) {
      case "VALIDATION_ERROR":
        return "orange";
      case "NETWORK_ERROR":
      case "TIMEOUT_ERROR":
        return "yellow";
      default:
        return "red";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
            <h2 className="text-xl font-bold text-white font-mayeka">Swap</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Swap Form */}
          <div className="p-6 space-y-4">
            {/* Sell Section */}
            <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2C2C2C]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-satoshi">Sell</span>
                <button
                  onClick={() => setSellTokenSelectorOpen(true)}
                  className="flex items-center bg-[#2C2C2C] hover:bg-[#3C3C3C] px-3 py-2 rounded-full text-sm transition-colors"
                >
                  {sellToken ? (
                    <>
                      {sellToken.logoUrl && (
                        <img
                          src={sellToken.logoUrl}
                          alt={sellToken.symbol}
                          className="w-5 h-5 rounded-full mr-2"
                        />
                      )}
                      <span className="text-white font-satoshi mr-2">
                        {sellToken.symbol}
                      </span>
                    </>
                  ) : (
                    <span className="text-white font-satoshi mr-2">
                      Select Token
                    </span>
                  )}
                  <ChevronDown size={16} className="text-white" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <Input
                  type="text"
                  value={sellAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.0"
                  className="bg-transparent border-none text-white text-2xl font-bold p-0 focus:ring-0"
                />
                <div className="text-right">
                  <div className="text-gray-400 text-sm font-satoshi">
                    Balance: {sellToken?.balance.toFixed(6) || "0"}
                  </div>
                  {sellToken && (
                    <button
                      onClick={handleMaxClick}
                      className="text-[#E2AF19] hover:opacity-80 text-sm font-satoshi mt-1"
                    >
                      Max
                    </button>
                  )}
                </div>
              </div>

              {/* Fixed USD value display */}
              {sellToken && sellAmount && !isNaN(parseFloat(sellAmount)) && (
                <div className="text-gray-400 text-sm font-satoshi mt-2">
                  ≈ $
                  {(parseFloat(sellAmount) * (sellToken.price || 0)).toFixed(2)}
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwapTokens}
                className="p-2 bg-[#2C2C2C] hover:bg-[#3C3C3C] rounded-full transition-colors"
              >
                <ArrowUpDown size={16} className="text-white" />
              </button>
            </div>

            {/* Buy Section */}
            <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2C2C2C]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-satoshi">Buy</span>
                <button
                  onClick={() => setBuyTokenSelectorOpen(true)}
                  className="flex items-center bg-[#E2AF19] hover:bg-[#D4A853] px-3 py-2 rounded-full text-sm transition-colors"
                >
                  {buyToken ? (
                    <>
                      {buyToken.logoUrl && (
                        <img
                          src={buyToken.logoUrl}
                          alt={buyToken.symbol}
                          className="w-5 h-5 rounded-full mr-2"
                        />
                      )}
                      <span className="text-black font-satoshi mr-2">
                        {buyToken.symbol}
                      </span>
                    </>
                  ) : (
                    <span className="text-black font-satoshi mr-2">
                      Select Token
                    </span>
                  )}
                  <ChevronDown size={16} className="text-black" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-white text-2xl font-bold">
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#E2AF19] mr-2"></div>
                      Getting quote...
                    </div>
                  ) : (
                    buyAmount || "0.0"
                  )}
                </div>
                {/* Fixed USD value display for buy amount */}
                {buyToken &&
                  buyAmount &&
                  !loading &&
                  !isNaN(parseFloat(buyAmount)) && (
                    <div className="text-gray-400 text-sm font-satoshi">
                      ≈ $
                      {(parseFloat(buyAmount) * (buyToken.price || 0)).toFixed(
                        2
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Enhanced Error Display */}
            {error && (
              <div
                className={`p-3 bg-${getErrorColor(
                  error.type
                )}-900/20 border border-${getErrorColor(
                  error.type
                )}-500/50 rounded-lg`}
              >
                <div className="flex items-start">
                  {getErrorIcon(error.type)}
                  <div className="ml-2 flex-1">
                    <p
                      className={`text-${getErrorColor(
                        error.type
                      )}-400 text-sm font-satoshi font-semibold mb-1`}
                    >
                      {error.message}
                    </p>
                    <p
                      className={`text-${getErrorColor(
                        error.type
                      )}-300 text-xs font-satoshi`}
                    >
                      {error.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rate Display */}
            {quote &&
              sellToken &&
              buyToken &&
              !error &&
              sellAmount &&
              buyAmount && (
                <div className="flex items-center justify-center p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C]">
                  <Info size={14} className="text-[#E2AF19] mr-2" />
                  <div className="text-center text-gray-400 text-sm font-satoshi">
                    1 {sellToken.symbol} ={" "}
                    {(parseFloat(buyAmount) / parseFloat(sellAmount)).toFixed(
                      6
                    )}{" "}
                    {buyToken.symbol}
                  </div>
                </div>
              )}

            {/* Swap Button */}
            <Button
              onClick={handlePreviewDebug}
              disabled={!canSwap}
              className="w-full py-3 text-lg font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Getting Quote...
                </div>
              ) : error ? (
                "Fix Issues Above"
              ) : !sellToken || !buyToken ? (
                "Select Tokens"
              ) : !sellAmount ? (
                "Enter Amount"
              ) : !quote ? (
                "Getting Quote..."
              ) : (
                "Preview Swap"
              )}
            </Button>
          </div>
        </div>
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
          onClose();
        }}
      />
    </>
  );
}
