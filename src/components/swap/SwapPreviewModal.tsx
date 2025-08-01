"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Info } from "lucide-react";
import { useSelector } from "react-redux";
import { ethers } from "ethers";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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

interface SwapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellToken: Token | null;
  buyToken: Token | null;
  sellAmount: string;
  buyAmount: string;
  quote: SwapQuote | null;
  onConfirm: () => void;
}

export default function SwapPreviewModal({
  isOpen,
  onClose,
  sellToken,
  buyToken,
  sellAmount,
  buyAmount,
  quote,
  onConfirm,
}: SwapPreviewModalProps) {
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [slippage, setSlippage] = useState("3");
  const [gasMode, setGasMode] = useState<"safe" | "medium" | "fast">("fast");
  const [showPreview, setShowPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(quote);
  const [currentBuyAmount, setCurrentBuyAmount] = useState(buyAmount);

  // Debug log when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("🔍 SwapPreviewModal opened with props:", {
        sellToken: sellToken?.symbol,
        buyToken: buyToken?.symbol,
        sellAmount,
        buyAmount,
        quote: !!quote,
        isOpen,
      });
      setCurrentQuote(quote);
      setCurrentBuyAmount(buyAmount);
    }
  }, [isOpen, sellToken, buyToken, sellAmount, buyAmount, quote]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowPreview(false);
      setExecuting(false);
      setError("");
      setRefreshing(false);
      setCurrentQuote(quote);
      setCurrentBuyAmount(buyAmount);
    }
  }, [isOpen, quote, buyAmount]);

  const handleAutoRefresh = async () => {
    if (!sellToken || !buyToken || !activeWallet || executing) return;

    setRefreshing(true);
    try {
      console.log("🔄 Auto-refreshing quote...");

      // Convert amount to base units
      const sellAmountInBaseUnits = ethers
        .parseUnits(sellAmount, sellToken.decimals)
        .toString();

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

      if (response.ok && data.quote) {
        const newBuyAmount = (
          parseFloat(data.quote.buyAmount) / Math.pow(10, buyToken.decimals)
        ).toFixed(6);
        setCurrentQuote(data.quote);
        setCurrentBuyAmount(newBuyAmount);
        console.log("✅ Quote refreshed successfully");
      } else {
        console.log("⚠️ Failed to refresh quote, using previous values");
      }
    } catch (error) {
      console.error("❌ Auto-refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate preview values with proper gas and fee calculations
  const minimumReceived = currentBuyAmount
    ? (
        (parseFloat(currentBuyAmount) * (100 - parseFloat(slippage))) /
        100
      ).toFixed(6)
    : "0";

  const rate =
    sellAmount && currentBuyAmount
      ? `1 ${sellToken?.symbol} = ${(
          parseFloat(currentBuyAmount) / parseFloat(sellAmount)
        ).toFixed(6)} ${buyToken?.symbol}`
      : "";

  // Calculate platform fee (0.2% = 20 basis points)
  const TAX_BPS = 20; // 0.2% = 20 basis points
  let platformFee = "0";
  let platformFeeUSD = "0";

  if (currentQuote && sellToken && buyToken) {
    try {
      if (
        sellToken.contractAddress === "native" ||
        sellToken.contractAddress ===
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      ) {
        // ETH to Token: tax is 0.2% of sell amount
        const sellAmountBN = ethers.parseEther(sellAmount);
        const taxAmount = (sellAmountBN * BigInt(TAX_BPS)) / BigInt(10000);
        platformFee = ethers.formatEther(taxAmount);
        platformFeeUSD = (
          parseFloat(platformFee) * (sellToken.price || 2500)
        ).toFixed(2);
      } else if (
        buyToken.contractAddress === "native" ||
        buyToken.contractAddress ===
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      ) {
        // Token to ETH: tax is 0.2% of expected ETH output
        const buyAmountBN = ethers.parseEther(currentBuyAmount);
        const taxAmount = (buyAmountBN * BigInt(TAX_BPS)) / BigInt(10000);
        platformFee = ethers.formatEther(taxAmount);
        platformFeeUSD = (
          parseFloat(platformFee) * (buyToken.price || 2500)
        ).toFixed(2);
      } else {
        // Token to Token: estimate tax in ETH (small fixed amount as fallback)
        platformFee = "0.0001";
        platformFeeUSD = (parseFloat(platformFee) * 2500).toFixed(2);
      }
    } catch (error) {
      console.error("Error calculating platform fee:", error);
      platformFee = "0.0001";
      platformFeeUSD = "0.25";
    }
  }

  // Calculate gas cost
  let gasCost = "0";
  let gasCostUSD = "0";

  if (currentQuote) {
    try {
      // Get gas limit from quote with 30% buffer
      const transactionData = currentQuote.transaction || {
        gas: currentQuote.gas,
      };
      const gasLimit =
        (BigInt(transactionData.gas || currentQuote.gas || "300000") *
          BigInt(130)) /
        BigInt(100);

      // Use realistic gas prices based on network conditions
      let gasPriceGwei = "10"; // Conservative default
      switch (gasMode) {
        case "safe":
          gasPriceGwei = "8";
          break;
        case "medium":
          gasPriceGwei = "12";
          break;
        case "fast":
          gasPriceGwei = "15";
          break;
      }

      const gasPrice = ethers.parseUnits(gasPriceGwei, "gwei");
      const totalGasCost = gasLimit * gasPrice;
      gasCost = ethers.formatEther(totalGasCost);

      // Use ETH price for USD calculation
      const ethPrice =
        sellToken?.contractAddress === "native" ||
        sellToken?.contractAddress ===
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
          ? sellToken.price
          : buyToken?.contractAddress === "native" ||
            buyToken?.contractAddress ===
              "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
          ? buyToken.price
          : 2500;
      gasCostUSD = (parseFloat(gasCost) * ethPrice).toFixed(2);
    } catch (error) {
      console.error("Error calculating gas cost:", error);
      gasCost = "0.002";
      gasCostUSD = "5.00";
    }
  }

  const handlePreview = () => {
    console.log("🔍 Preview button clicked, validation:", {
      slippage: parseFloat(slippage),
      slippageValid: parseFloat(slippage) >= 0.1 && parseFloat(slippage) <= 50,
    });

    if (parseFloat(slippage) < 0.1 || parseFloat(slippage) > 50) {
      setError("Slippage must be between 0.1% and 50%");
      return;
    }
    setError("");
    setShowPreview(true);
    console.log("✅ Moving to preview screen");
  };

  const handleExecuteSwap = async () => {
    if (!currentQuote || !sellToken || !buyToken || !activeWallet) {
      console.log("❌ Missing required data for execution");
      return;
    }

    console.log("🚀 Executing swap...");
    setExecuting(true);
    setError("");

    try {
      const response = await fetch("/api/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
          sellToken: sellToken.contractAddress,
          buyToken: buyToken.contractAddress,
          sellAmount,
          slippage: parseFloat(slippage),
          gasMode,
          quote: currentQuote,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Swap failed");
      }

      // Success - show transaction hash and close
      console.log("✅ Swap executed successfully:", data.transactionHash);
      alert(`Swap executed! Transaction: ${data.transactionHash}`);
      onConfirm();
    } catch (error: any) {
      console.error("❌ Swap execution failed:", error);
      setError(error.message);
    } finally {
      setExecuting(false);
    }
  };

  // Don't render if not open or missing required data
  if (!isOpen) {
    console.log("🚫 Modal not rendering - isOpen:", isOpen);
    return null;
  }

  if (!sellToken || !buyToken || !currentQuote) {
    console.log("🚫 Modal not rendering - missing data:", {
      sellToken: !!sellToken,
      buyToken: !!buyToken,
      currentQuote: !!currentQuote,
    });
    return null;
  }

  console.log("✅ Modal rendering with showPreview:", showPreview);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <h3 className="text-lg font-bold text-white font-mayeka">
            {showPreview ? "Swap Preview" : "Swap Settings"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!showPreview ? (
            // Settings Form
            <>
              {/* Slippage */}
              <div>
                <label className="block text-white font-satoshi mb-2">
                  Slippage Tolerance %
                </label>
                <p className="text-gray-400 text-sm font-satoshi mb-3">
                  Recommended: 1-5% for mainnet, default: 3%
                </p>
                <Input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  placeholder="3"
                  step="0.1"
                  min="0.1"
                  max="50"
                />
              </div>

              {/* Gas Mode */}
              <div>
                <label className="block text-white font-satoshi mb-2">
                  ⛽ Gas Mode Selection
                </label>
                <div className="space-y-2">
                  {[
                    { value: "safe", label: "Safe (slower, cheaper)" },
                    { value: "medium", label: "Medium (balanced)" },
                    { value: "fast", label: "Fast (faster, more expensive)" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        console.log("🔧 Gas mode selected:", option.value);
                        setGasMode(option.value as any);
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        gasMode === option.value
                          ? "border-[#E2AF19] bg-[#E2AF19]/10"
                          : "border-[#2C2C2C] hover:border-[#3C3C3C]"
                      }`}
                    >
                      <span className="text-white font-satoshi">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-satoshi">{error}</p>
                </div>
              )}

              <Button onClick={handlePreview} className="w-full">
                Preview Swap
              </Button>
            </>
          ) : (
            // Preview Display
            <>
              {/* Swap Preview Table */}
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] font-mono text-sm">
                <div className="flex items-center justify-between mb-4 border-b border-[#2C2C2C] pb-2">
                  <span className="text-center text-[#E2AF19] font-bold">
                    🔄 SWAP PREVIEW
                  </span>
                  {refreshing && (
                    <div className="flex items-center text-yellow-400 text-xs">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-yellow-400 mr-1"></div>
                      Refreshing...
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sell Token:</span>
                    <span className="text-white">{sellToken.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Buy Token:</span>
                    <span className="text-white">{buyToken.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sell Amount:</span>
                    <span className="text-white">{sellAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rate:</span>
                    <span className="text-white text-xs">{rate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expected:</span>
                    <span className="text-white">
                      {currentBuyAmount} {buyToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Minimum:</span>
                    <span className="text-white">
                      {minimumReceived} {buyToken.symbol} ({slippage}% slippage)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Platform Fee:</span>
                    <span className="text-white">
                      {platformFee} ETH (${platformFeeUSD})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. Gas Cost:</span>
                    <span className="text-white">
                      {gasCost} ETH (~${gasCostUSD})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Mode:</span>
                    <span className="text-white capitalize">{gasMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Route:</span>
                    <span className="text-white">
                      {currentQuote.sources?.[0]?.name || "Direct Route"}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-satoshi">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    console.log("⬅️ Back to settings");
                    setShowPreview(false);
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleExecuteSwap}
                  disabled={executing}
                  className="flex-1"
                >
                  {executing ? "Executing..." : "Confirm Swap"}
                </Button>
              </div>
            </>
          )}
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
      `}</style>
    </div>
  );
}
