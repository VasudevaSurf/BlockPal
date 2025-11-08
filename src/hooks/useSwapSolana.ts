// src/hooks/useSwapSolana.ts - FIXED VERSION
import { useState, useEffect, useCallback, useRef } from "react";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import { VersionedTransaction, PublicKey } from "@solana/web3.js"; // ✅ Add PublicKey import
import type { Provider } from "@reown/appkit-adapter-solana/react";
import { swapHistoryService } from "@/services/swapHistoryService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

export interface SolanaToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

export function useSwapSolana() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>("solana");
  const { connection } = useAppKitConnection();

  // Token states
  const [fromToken, setFromToken] = useState<SolanaToken | null>(null);
  const [toToken, setToToken] = useState<SolanaToken | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  // Quote and transaction states
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [slippage, setSlippage] = useState("1");
  const [customSlippage, setCustomSlippage] = useState(false);
  const [gasMode, setGasMode] = useState<
    "safe" | "medium" | "high" | "instant"
  >("high");

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // History states
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const quoteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get SOL balance for gas checking
  const [solBalance, setSolBalance] = useState<number>(0);

  useEffect(() => {
    if (address && connection) {
      fetchSolBalance();
    }
  }, [address, connection]);

  // ✅ FIXED: Convert address string to PublicKey
  const fetchSolBalance = async () => {
    if (!address || !connection) return;

    try {
      // Convert address string to PublicKey object
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / 1e9); // Convert lamports to SOL

      console.log(`✅ SOL Balance: ${balance / 1e9} SOL`);
    } catch (error) {
      console.error("Error fetching SOL balance:", error);
      setSolBalance(0);
    }
  };

  // Load swap history
  useEffect(() => {
    if (address && isConnected) {
      loadSwapHistory();
    }
  }, [address, isConnected]);

  const loadSwapHistory = async () => {
    if (!address) return;

    setLoadingHistory(true);
    try {
      const response = await swapHistoryService.getWalletHistory(address, {
        limit: 50,
        chainId: 900, // Solana custom chain ID
      });

      setDbTransactions(response.transactions);
    } catch (error) {
      console.error("Error loading swap history:", error);
      setDbTransactions([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Search tokens
  const searchTokens = useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/jupiter/search?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error("Error searching Solana tokens:", error);
      return [];
    }
  }, []);

  // Get quote
  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount || !address) {
      setQuoteError(null);
      setToAmount("");
      setQuote(null);
      setInsufficientBalance(false);
      return;
    }

    const amount = parseFloat(fromAmount);
    if (isNaN(amount) || amount <= 0) {
      setToAmount("0");
      setQuote(null);
      setQuoteError("Please enter a valid amount");
      setInsufficientBalance(false);
      return;
    }

    setLoading(true);
    setQuoteError(null);
    setInsufficientBalance(false);

    try {
      const amountInSmallestUnit = Math.floor(
        parseFloat(fromAmount) * Math.pow(10, fromToken.decimals)
      );

      const slippageBps = Math.floor(parseFloat(slippage) * 100);

      console.log(
        `🔄 Getting quote: ${amountInSmallestUnit} ${fromToken.symbol} -> ${toToken.symbol}`
      );

      const response = await fetch(
        `${API_BASE_URL}/api/jupiter/quote?` +
          `inputMint=${fromToken.address}&` +
          `outputMint=${toToken.address}&` +
          `amount=${amountInSmallestUnit}&` +
          `slippageBps=${slippageBps}`
      );

      const data = await response.json();

      if (!data.success || !data.data?.outAmount) {
        setQuote(null);
        setToAmount("0");
        setQuoteError(data.message || "Unable to get quote");
        return;
      }

      setQuoteError(null);
      setQuote(data.data);

      const outputAmount =
        parseFloat(data.data.outAmount) / Math.pow(10, toToken.decimals);
      setToAmount(outputAmount > 0 ? outputAmount.toFixed(6) : "0");

      console.log(`✅ Quote received: ${outputAmount} ${toToken.symbol}`);

      // Check balance
      if (
        fromToken.symbol === "SOL" ||
        fromToken.address === "So11111111111111111111111111111111111111112"
      ) {
        // For SOL swaps, need to reserve some for fees
        const requiredAmount = amount + 0.01; // Reserve 0.01 SOL for fees
        if (solBalance < requiredAmount) {
          setInsufficientBalance(true);
          setQuoteError(
            `Insufficient SOL balance (need ${requiredAmount.toFixed(
              4
            )} SOL including fees)`
          );
        }
      } else {
        // For token swaps, just check if we have enough SOL for fees
        if (solBalance < 0.01) {
          setInsufficientBalance(true);
          setQuoteError(
            "Insufficient SOL for transaction fees (need at least 0.01 SOL)"
          );
        }
      }
    } catch (error: any) {
      console.error("Error getting quote:", error);
      setQuote(null);
      setToAmount("0");
      setQuoteError("Failed to get quote. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fromToken, toToken, fromAmount, address, slippage, solBalance]);

  // Auto-refresh quote
  useEffect(() => {
    if (quoteTimerRef.current) {
      clearTimeout(quoteTimerRef.current);
    }

    quoteTimerRef.current = setTimeout(() => {
      if (fromAmount && fromToken && toToken && address) {
        getQuote();
      } else {
        setToAmount("");
        setQuote(null);
        setQuoteError(null);
        setInsufficientBalance(false);
      }
    }, 500);

    return () => {
      if (quoteTimerRef.current) {
        clearTimeout(quoteTimerRef.current);
      }
    };
  }, [fromAmount, fromToken, toToken, address, slippage, getQuote]);

  // Execute swap
  const executeSwap = async () => {
    if (
      !fromToken ||
      !toToken ||
      !fromAmount ||
      !address ||
      !walletProvider ||
      !connection ||
      !quote
    ) {
      console.log("Missing requirements for swap");
      return false;
    }

    if (insufficientBalance) {
      alert("Insufficient balance to complete this swap");
      return false;
    }

    setSwapping(true);
    let transactionId: string | null = null;

    try {
      console.log("🚀 Starting Solana swap execution via Jupiter");

      // Create DB transaction record
      const amountInSmallestUnit = Math.floor(
        parseFloat(fromAmount) * Math.pow(10, fromToken.decimals)
      );

      transactionId = (await swapHistoryService.createTransaction({
        walletAddress: address as string,
        username: "Solana User",
        fromToken: {
          address: fromToken.address,
          symbol: fromToken.symbol,
          name: fromToken.name,
          decimals: fromToken.decimals,
          logoUrl: fromToken.logoURI,
        },
        toToken: {
          address: toToken.address,
          symbol: toToken.symbol,
          name: toToken.name,
          decimals: toToken.decimals,
          logoUrl: toToken.logoURI,
        },
        fromAmount: amountInSmallestUnit.toString(),
        toAmount: quote.outAmount,
        fromAmountUSD: 0,
        toAmountUSD: 0,
        chainId: 900, // Custom chainId for Solana
        chainName: "Solana",
        gasPrice: "0",
        gasCostETH: "0",
        gasCostUSD: 0,
        gasMode,
        slippage: parseFloat(slippage),
        route: "Jupiter",
        protocol: "Jupiter",
      })) as any;

      console.log("📝 DB transaction created:", transactionId);

      // Get swap transaction from Jupiter
      console.log("🔄 Getting swap transaction from Jupiter...");

      const swapResponse = await fetch(`${API_BASE_URL}/api/jupiter/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userPublicKey: address,
          quoteResponse: quote,
        }),
      });

      const swapData = await swapResponse.json();

      if (!swapData.success || !swapData.data?.swapTransaction) {
        throw new Error(swapData.message || "Failed to get swap transaction");
      }

      console.log("✅ Swap transaction received from Jupiter");

      // Deserialize the transaction
      const swapTransactionBuf = Buffer.from(
        swapData.data.swapTransaction,
        "base64"
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      console.log("📤 Sending transaction to wallet for signing...");

      // Send transaction
      const signature = await walletProvider.sendTransaction(
        transaction,
        connection
      );

      console.log("✅ Transaction sent! Signature:", signature);

      // Update DB with pending status
      if (transactionId) {
        await swapHistoryService.updateTransaction(transactionId, {
          status: "pending",
          txHash: signature,
        });
      }

      // Wait for confirmation (optional - in background)
      connection
        .confirmTransaction(signature, "confirmed")
        .then(() => {
          console.log("✅ Transaction confirmed!");
          if (transactionId) {
            swapHistoryService.updateTransaction(transactionId, {
              status: "success",
              txHash: signature,
            });
          }
        })
        .catch((err) => {
          console.error("❌ Transaction confirmation failed:", err);
        });

      // Clear form on success
      setFromAmount("");
      setToAmount("");
      setQuote(null);
      setQuoteError(null);
      setInsufficientBalance(false);

      // Reload balance and history
      await fetchSolBalance();
      await loadSwapHistory();

      return true;
    } catch (error: any) {
      console.error("❌ Solana swap error:", error);

      let errorMessage = error.message || "Swap failed";

      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User declined")
      ) {
        errorMessage = "Transaction cancelled by user";
        if (transactionId) {
          await swapHistoryService.updateTransaction(transactionId, {
            status: "cancelled",
            errorMessage,
          });
        }
      } else {
        if (transactionId) {
          await swapHistoryService.updateTransaction(transactionId, {
            status: "failed",
            errorMessage,
          });
        }
      }

      return false;
    } finally {
      setSwapping(false);
    }
  };

  // Swap token positions
  const swapTokenPositions = useCallback(() => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);

    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  }, [fromToken, toToken, fromAmount, toAmount]);

  // Calculate max amount (all SOL minus some for fees)
  const calculateMaxAmount = useCallback(() => {
    if (solBalance > 0) {
      // Reserve 0.01 SOL for transaction fees
      const maxAmount = Math.max(0, solBalance - 0.01);
      setFromAmount(maxAmount.toFixed(6));
    }
  }, [solBalance]);

  // Get explorer link for Solana
  const getExplorerLink = (txHash: string) => {
    return `https://solscan.io/tx/${txHash}`;
  };

  return {
    // Token states
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    fromAmount,
    setFromAmount,
    toAmount,

    // Balance
    fromTokenBalance: {
      formatted: solBalance.toString(),
      symbol: "SOL",
      decimals: 9,
      value: solBalance,
    },

    // Quote and transaction states
    quote,
    gasPrice: null, // Not used for Solana

    // Settings
    slippage,
    setSlippage,
    customSlippage,
    setCustomSlippage,
    gasMode,
    setGasMode,

    // Loading and error states
    loading,
    swapping,
    error,
    quoteError,
    insufficientBalance,

    // History
    swapHistory: [], // For compatibility
    dbTransactions,
    loadingHistory,
    currentTransactionId: null,

    // Functions
    searchTokens,
    loadTokens: async () => {}, // Not needed for Solana
    executeSwap,
    fetchGasPrice: async () => null, // Not needed for Solana
    calculateMaxAmount,
    swapTokenPositions,
    getExplorerLink,
    checkAllowance: async () => "999999999", // Not needed for Solana (no approvals)
    approveToken: async () => true, // Not needed for Solana
    getQuote,
    loadSwapHistory,
  };
}
