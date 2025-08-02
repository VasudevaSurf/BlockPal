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
  slippage?: string;
  onConfirm: () => void;
}

// Gas price fetching function like JS file
async function getCurrentGasPrices() {
  try {
    const response = await fetch("/api/gas-prices"); // You'll need to create this endpoint
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log("Failed to fetch gas prices, using defaults");
  }

  // Realistic fallback values (much lower than before)
  return {
    baseFee: 8,
    safeGasPrice: 10,
    proposeGasPrice: 12,
    fastGasPrice: 15,
  };
}

export default function SwapPreviewModal({
  isOpen,
  onClose,
  sellToken,
  buyToken,
  sellAmount,
  buyAmount,
  quote,
  slippage = "3",
  onConfirm,
}: SwapPreviewModalProps) {
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const gasMode = "fast"; // Always use fast mode
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(quote);
  const [currentBuyAmount, setCurrentBuyAmount] = useState(buyAmount);
  const [transactionHash, setTransactionHash] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [gasPrices, setGasPrices] = useState({
    baseFee: 8,
    safeGasPrice: 10,
    proposeGasPrice: 12,
    fastGasPrice: 15,
  });

  // Fetch gas prices when modal opens (like JS file)
  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true);
      getCurrentGasPrices().then((prices) => {
        setGasPrices(prices);
        // Small delay to ensure smooth transition
        setTimeout(() => setIsInitializing(false), 300);
      });
    }
  }, [isOpen]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setExecuting(false);
      setError("");
      setRefreshing(false);
      setCurrentQuote(quote);
      setCurrentBuyAmount(buyAmount);
    }
  }, [isOpen, quote, buyAmount]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!isOpen || executing) return;

    console.log("🔄 Starting auto-refresh interval (5 seconds)");

    const intervalId = setInterval(() => {
      console.log(
        "⏰ Auto-refresh triggered at",
        new Date().toLocaleTimeString()
      );
      handleAutoRefresh();
    }, 5000); // 5 seconds

    return () => {
      console.log("🛑 Stopping auto-refresh interval");
      clearInterval(intervalId);
    };
  }, [isOpen, executing, sellToken, buyToken, sellAmount, activeWallet]);

  const handleAutoRefresh = async () => {
    if (!sellToken || !buyToken || !activeWallet || executing) return;

    console.log("🔄 Auto-refreshing quote...");
    setRefreshing(true);
    try {
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

        console.log("✅ Quote refreshed successfully");
        console.log("📊 Old buy amount:", currentBuyAmount);
        console.log("📊 New buy amount:", newBuyAmount);

        setCurrentQuote(data.quote);
        setCurrentBuyAmount(newBuyAmount);
      } else {
        console.log(
          "⚠️ Failed to refresh quote:",
          data.error || "Unknown error"
        );
      }
    } catch (error) {
      console.error("❌ Auto-refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate preview values
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

  // EXACT SAME TAX CALCULATION AS JS FILE (small amounts)
  let platformFee = "0";
  let platformFeeUSD = "0";

  if (currentQuote && sellToken && buyToken) {
    const TAX_BPS = 20; // 0.2% = 20 basis points

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
      } else if (
        buyToken.contractAddress === "native" ||
        buyToken.contractAddress ===
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      ) {
        // Token to ETH: tax is 0.2% of expected ETH output
        const buyAmountBN = ethers.parseEther(currentBuyAmount);
        const taxAmount = (buyAmountBN * BigInt(TAX_BPS)) / BigInt(10000);
        platformFee = ethers.formatEther(taxAmount);
      } else {
        // Token to Token: small fixed amount
        platformFee = "0.0001";
      }

      const ethPrice = 2500; // You can make this dynamic
      platformFeeUSD = (parseFloat(platformFee) * ethPrice).toFixed(2);
    } catch (error) {
      platformFee = "0.0001";
      platformFeeUSD = "0.25";
    }
  }

  // REALISTIC GAS CALCULATION LIKE JS FILE
  let gasCost = "0";
  let gasCostUSD = "0";

  if (currentQuote) {
    try {
      // Get gas limit from quote with 30% buffer (not 50% like before)
      const transactionData = currentQuote.transaction || {
        gas: currentQuote.gas,
      };
      const baseGasLimit = BigInt(
        transactionData.gas || currentQuote.gas || "300000"
      );
      const gasLimitWithBuffer = (baseGasLimit * BigInt(130)) / BigInt(100); // 30% buffer

      // Use REALISTIC gas pricing like your JS file
      let selectedTotalGasPrice;
      switch (gasMode) {
        case "safe":
          selectedTotalGasPrice = gasPrices.safeGasPrice;
          break;
        case "medium":
          selectedTotalGasPrice = gasPrices.proposeGasPrice;
          break;
        case "fast":
          selectedTotalGasPrice = gasPrices.fastGasPrice;
          break;
        default:
          selectedTotalGasPrice = gasPrices.fastGasPrice;
      }

      // Convert total gas price to priority fee structure (like JS file)
      const totalGasPrice = ethers.parseUnits(
        selectedTotalGasPrice.toString(),
        "gwei"
      );
      const baseFee = ethers.parseUnits(gasPrices.baseFee.toString(), "gwei");

      // Priority fee = total - base (like your JS file)
      const priorityFee =
        totalGasPrice > baseFee
          ? totalGasPrice - baseFee
          : ethers.parseUnits("1", "gwei");

      // MaxFeePerGas with small buffer (like JS file)
      const feeMultiplier = 1.1; // Same as JS file
      const maxFeePerGas =
        (totalGasPrice * BigInt(Math.floor(feeMultiplier * 100))) / 100n;

      // Calculate actual gas cost
      const totalGasCost = gasLimitWithBuffer * maxFeePerGas;
      gasCost = ethers.formatEther(totalGasCost);

      console.log("💰 Realistic gas calculation:", {
        baseGasLimit: baseGasLimit.toString(),
        gasLimitWithBuffer: gasLimitWithBuffer.toString(),
        selectedTotalGasPrice: selectedTotalGasPrice + " gwei",
        baseFee: gasPrices.baseFee + " gwei",
        priorityFee: ethers.formatUnits(priorityFee, "gwei") + " gwei",
        maxFeePerGas: ethers.formatUnits(maxFeePerGas, "gwei") + " gwei",
        finalGasCost: gasCost + " ETH",
      });

      const ethPrice = 2500;
      gasCostUSD = (parseFloat(gasCost) * ethPrice).toFixed(2);
    } catch (error) {
      console.error("Error calculating gas cost:", error);
      gasCost = "0.0005"; // Much smaller fallback
      gasCostUSD = "1.25";
    }
  }

  const handleExecuteSwap = async () => {
    if (!currentQuote || !sellToken || !buyToken || !activeWallet) return;

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

      // Success - show transaction hash in modal
      console.log("✅ Swap executed successfully:", data.transactionHash);
      setTransactionHash(data.transactionHash);
      setShowSuccess(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen || !sellToken || !buyToken || !currentQuote) return null;

  // Show success modal
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
        <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl">
          <div className="p-6 text-center">
            {/* Success animation */}
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-white font-mayeka mb-2">
              Swap Successful!
            </h3>

            <p className="text-gray-400 text-sm font-satoshi mb-4">
              Your transaction has been submitted to the blockchain
            </p>

            <div className="bg-[#0F0F0F] rounded-lg p-3 mb-6">
              <p className="text-gray-400 text-xs font-satoshi mb-1">
                Transaction Hash
              </p>
              <p className="text-white text-xs font-mono break-all">
                {transactionHash}
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href={`https://etherscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#E2AF19] hover:bg-[#D4A853] text-black font-semibold py-2 rounded-lg transition-colors font-satoshi text-sm"
              >
                View on Etherscan
              </a>
              <Button
                onClick={() => {
                  setShowSuccess(false);
                  setTransactionHash("");
                  onConfirm();
                }}
                variant="secondary"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show executing modal
  if (executing) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
        <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl">
          <div className="p-6 text-center">
            {/* Loading animation */}
            <div className="w-16 h-16 relative mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-[#2C2C2C] rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#E2AF19] rounded-full border-t-transparent animate-spin"></div>
            </div>

            <h3 className="text-xl font-bold text-white font-mayeka mb-2">
              Executing Swap...
            </h3>

            <p className="text-gray-400 text-sm font-satoshi mb-4">
              Please wait while we process your transaction
            </p>

            <div className="bg-[#0F0F0F] rounded-lg p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Swapping</span>
                <span className="text-white text-sm">
                  {sellAmount} {sellToken.symbol} → {buyToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Status</span>
                <span className="text-[#E2AF19] text-sm">Processing...</span>
              </div>
            </div>

            <p className="text-gray-500 text-xs font-satoshi mt-4">
              Do not close this window
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <h3 className="text-lg font-bold text-white font-mayeka">
            Swap Preview
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Preview Display */}
          {isInitializing ? (
            // Skeleton loader
            <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
              {/* <div className="text-center text-[#E2AF19] font-bold mb-4 border-b border-[#2C2C2C] pb-2">
                SWAP PREVIEW
              </div> */}

              <div className="space-y-2">
                {[...Array(10)].map((_, index) => (
                  <div key={index} className="flex justify-between">
                    <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Actual preview content
            <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] font-mono text-sm">
              {/* <div className="text-center text-[#E2AF19] font-bold mb-4 border-b border-[#2C2C2C] pb-2">
                SWAP PREVIEW
              </div> */}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">From:</span>
                  <span className="text-white">{sellToken.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">To:</span>
                  <span className="text-white">{buyToken.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white">{sellAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rate:</span>
                  <span className="text-white text-xs">{rate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expected:</span>
                  <span className="text-white">
                    {parseFloat(currentBuyAmount).toFixed(6)} {buyToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Minimum:</span>
                  <span className="text-white">
                    {parseFloat(minimumReceived).toFixed(6)} {buyToken.symbol} (
                    {slippage}% slippage)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform Fee:</span>
                  <span className="text-white">
                    {parseFloat(platformFee).toFixed(6)} ETH ($
                    {platformFeeUSD})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. Gas Cost:</span>
                  <span className="text-white">
                    {parseFloat(gasCost).toFixed(6)} ETH (~${gasCostUSD})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gas Mode:</span>
                  <span className="text-white capitalize">
                    {gasMode} (
                    {gasMode === "safe"
                      ? gasPrices.safeGasPrice
                      : gasMode === "medium"
                      ? gasPrices.proposeGasPrice
                      : gasPrices.fastGasPrice}{" "}
                    gwei)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Route:</span>
                  <span className="text-white">
                    {currentQuote.sources?.[0]?.name || "Direct Route"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm font-satoshi">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={isInitializing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteSwap}
              disabled={executing || isInitializing}
              className="flex-1"
            >
              {executing
                ? "Executing..."
                : isInitializing
                ? "Loading..."
                : "Confirm Swap"}
            </Button>
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
      `}</style>
    </div>
  );
}
