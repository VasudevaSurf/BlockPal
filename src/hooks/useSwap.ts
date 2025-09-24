// src/hooks/useSwap.ts - Fix the API_BASE_URL path

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useChainId,
  useWalletClient,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

export interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface SwapQuote {
  dstAmount: string;
  gas?: string;
  protocols?: any[];
}

export function useSwap() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [fromToken, setFromToken] = useState<SwapToken | null>(null);
  const [toToken, setToToken] = useState<SwapToken | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search tokens - FIXED PATH
  const searchTokens = useCallback(
    async (query: string) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/swap/search/${chainId}?query=${encodeURIComponent(
            query
          )}`
        );
        const data = await response.json();
        return data.success ? data.data : [];
      } catch (error) {
        console.error("Error searching tokens:", error);
        return [];
      }
    },
    [chainId]
  );

  // Get quote - FIXED PATH
  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount || !address) {
      setQuote(null);
      setToAmount("");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const amountInWei = parseUnits(fromAmount, fromToken.decimals).toString();

      const response = await fetch(
        `${API_BASE_URL}/api/swap/quote/${chainId}?` +
          `src=${fromToken.address}&` +
          `dst=${toToken.address}&` +
          `amount=${amountInWei}&` +
          `from=${address}&` +
          `slippage=1`
      );

      const data = await response.json();

      if (data.success && data.data) {
        setQuote(data.data);
        const outputAmount = formatUnits(
          BigInt(data.data.dstAmount),
          toToken.decimals
        );
        setToAmount(outputAmount);
      } else {
        setError(data.message || "Failed to get quote");
        setToAmount("0");
      }
    } catch (error) {
      console.error("Quote error:", error);
      setError("Failed to get quote");
      setToAmount("0");
    } finally {
      setLoading(false);
    }
  }, [fromToken, toToken, fromAmount, address, chainId]);

  // Check allowance - FIXED PATH
  const checkAllowance = useCallback(async () => {
    if (
      !fromToken ||
      fromToken.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
      !address
    ) {
      return "999999999999999999999999999999";
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/swap/allowance/${chainId}?` +
          `tokenAddress=${fromToken.address}&` +
          `walletAddress=${address}`
      );
      const data = await response.json();
      return data.success ? data.data.allowance : "0";
    } catch (error) {
      console.error("Error checking allowance:", error);
      return "0";
    }
  }, [fromToken, address, chainId]);

  // Approve token - FIXED PATH
  const approveToken = useCallback(
    async (amount: string) => {
      if (!walletClient || !fromToken || !publicClient) return false;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/swap/approve/${chainId}?` +
            `tokenAddress=${fromToken.address}&` +
            `amount=${amount}`
        );
        const data = await response.json();

        if (data.success && data.data) {
          const tx = await walletClient.sendTransaction({
            to: data.data.to,
            data: data.data.data,
          });

          const receipt = await publicClient.waitForTransactionReceipt({
            hash: tx,
            confirmations: 1,
          });

          return receipt.status === "success";
        }
        return false;
      } catch (error) {
        console.error("Error approving token:", error);
        return false;
      }
    },
    [walletClient, publicClient, fromToken, chainId]
  );

  // Execute swap - FIXED PATH
  const executeSwap = useCallback(async () => {
    if (
      !fromToken ||
      !toToken ||
      !fromAmount ||
      !address ||
      !walletClient ||
      !publicClient
    ) {
      return false;
    }

    setSwapping(true);
    setError(null);

    try {
      const amountInWei = parseUnits(fromAmount, fromToken.decimals).toString();

      // Check and handle approval
      if (fromToken.address !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        const allowance = await checkAllowance();
        if (BigInt(allowance) < BigInt(amountInWei)) {
          const approved = await approveToken(amountInWei);
          if (!approved) {
            throw new Error("Token approval failed");
          }
        }
      }

      // Get swap tx - FIXED PATH
      const response = await fetch(
        `${API_BASE_URL}/api/swap/swap/${chainId}?` +
          `src=${fromToken.address}&` +
          `dst=${toToken.address}&` +
          `amount=${amountInWei}&` +
          `from=${address}&` +
          `slippage=1`
      );

      const data = await response.json();

      if (data.success && data.data?.tx) {
        const tx = await walletClient.sendTransaction({
          to: data.data.tx.to,
          data: data.data.tx.data,
          value: data.data.tx.value ? BigInt(data.data.tx.value) : undefined,
          gas: data.data.tx.gas ? BigInt(data.data.tx.gas) : undefined,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx,
          confirmations: 1,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction failed");
        }

        // Reset state after successful swap
        setFromAmount("");
        setToAmount("");
        setQuote(null);

        return true;
      }

      throw new Error(data.message || "Swap failed");
    } catch (error: any) {
      console.error("Swap error:", error);
      setError(error.message || "Swap failed");
      return false;
    } finally {
      setSwapping(false);
    }
  }, [
    fromToken,
    toToken,
    fromAmount,
    address,
    walletClient,
    publicClient,
    chainId,
    checkAllowance,
    approveToken,
  ]);

  // Fetch gas prices - NEW FUNCTION
  const fetchGasPrice = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/swap/gas/${chainId}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error("Error fetching gas price:", error);
      return null;
    }
  }, [chainId]);

  // Auto-fetch quote when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromAmount && fromToken && toToken && address) {
        getQuote();
      } else {
        setQuote(null);
        setToAmount("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fromAmount, fromToken, toToken, address, getQuote]);

  return {
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
    searchTokens,
    executeSwap,
    fetchGasPrice,
    swapTokenPositions: () => {
      const temp = fromToken;
      setFromToken(toToken);
      setToToken(temp);
      const tempAmount = fromAmount;
      setFromAmount(toAmount);
      setToAmount(tempAmount);
    },
  };
}
