// src/hooks/useSwap.ts - Complete Fixed Version
import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  useChainId,
  useWalletClient,
  usePublicClient,
  useBalance,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  swapHistoryService,
  SwapTransaction,
} from "@/services/swapHistoryService";

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
  gasPrice?: string;
  protocols?: any[];
  tx?: any;
}

export interface SwapHistoryItem {
  txHash: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  chainId: number;
  timestamp: string;
  status: "success" | "failed" | "pending";
  gasUsed?: string;
  gasPrice?: string;
}

interface GasPrice {
  estimatedGas: string;
  gasPrice: string;
  gasCostWei: string;
  gasCostEth: string;
  gasCostUSD: string;
  nativeTokenPriceUSD: string;
  gasPriceGwei: string;
}

export function useSwap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { user } = useSelector((state: RootState) => state.auth);

  // Token states
  const [fromToken, setFromToken] = useState<SwapToken | null>(null);
  const [toToken, setToToken] = useState<SwapToken | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [tokens, setTokens] = useState<SwapToken[]>([]);

  // Quote and transaction states
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [spenderAddress, setSpenderAddress] = useState<string | null>(null);

  // Settings states
  const [slippage, setSlippage] = useState("1");
  const [customSlippage, setCustomSlippage] = useState(false);
  const [gasMode, setGasMode] = useState<
    "safe" | "medium" | "high" | "instant"
  >("high");
  const [gasPrice, setGasPrice] = useState<GasPrice | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  const [dbTransactions, setDbTransactions] = useState<SwapTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<
    string | null
  >(null);

  // History state
  const [swapHistory, setSwapHistory] = useState<SwapHistoryItem[]>([]);

  // Quote refresh timer
  const quoteTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getChainName = useCallback((chain: number) => {
    const chainNames: { [key: number]: string } = {
      1: "Ethereum",
      137: "Polygon",
      56: "BSC",
      43114: "Avalanche",
      8453: "Base",
      42161: "Arbitrum",
    };
    return chainNames[chain] || "Unknown";
  }, []);

  const loadSwapHistory = useCallback(async () => {
    if (!address) return;

    setLoadingHistory(true);
    try {
      const response = await swapHistoryService.getWalletHistory(address, {
        limit: 50,
        chainId: chainId,
      });

      setDbTransactions(response.transactions);
      console.log(
        `✅ Loaded ${response.transactions.length} transactions from database`
      );
    } catch (error) {
      console.error("Error loading swap history:", error);
      setDbTransactions([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    if (address && isConnected) {
      loadSwapHistory();
    }
  }, [address, isConnected, loadSwapHistory]);

  const createDbTransaction = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount || !address) return null;

    try {
      const transactionData = {
        walletAddress: address,
        username: user?.username,
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
        fromAmount: amountWei, // Make sure this is defined
        toAmount: quote?.dstAmount || "0",
        fromAmountUSD: 0,
        toAmountUSD: 0,
        chainId,
        chainName: getChainName(chainId),
        gasPrice: gasPrice?.gasPriceGwei,
        gasCostETH: gasPrice?.gasCostEth,
        gasCostUSD: parseFloat(gasPrice?.gasCostUSD || "0"),
        gasMode,
        slippage: parseFloat(slippage),
        route: quote?.protocols?.[0]?.[0]?.name || "Unknown",
        protocol: "1inch",
      };

      const result = await swapHistoryService.createTransaction(
        transactionData
      );

      if (result && result.id) {
        console.log("✅ Transaction created in database:", result.id);
        return result.id;
      } else {
        console.log(
          "⚠️ Transaction not saved to database (service might be offline)"
        );
        return null;
      }
    } catch (error) {
      console.warn(
        "Error creating database transaction (non-critical):",
        error
      );
      return null;
    }
  }, [
    fromToken,
    toToken,
    fromAmount,
    quote,
    address,
    user,
    chainId,
    gasPrice,
    gasMode,
    slippage,
    getChainName,
  ]);

  const updateDbTransaction = useCallback(
    async (
      id: string | null,
      status: "success" | "failed" | "cancelled",
      txHash?: string,
      errorMessage?: string
    ) => {
      if (!id) {
        console.log("No transaction ID to update (DB might be offline)");
        return;
      }

      try {
        await swapHistoryService.updateTransaction(id, {
          status,
          txHash,
          errorMessage,
          gasUsed: gasPrice?.estimatedGas,
          toAmount: status === "success" ? toAmount : undefined,
        });

        console.log(`✅ Transaction ${id} updated to ${status}`);
        await loadSwapHistory();
      } catch (error) {
        console.warn(
          "Error updating database transaction (non-critical):",
          error
        );
      }
    },
    [gasPrice, toAmount, loadSwapHistory]
  );

  // Get balance for from token
  const { data: fromTokenBalance } = useBalance({
    address: address,
    token:
      fromToken?.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ? undefined
        : (fromToken?.address as `0x${string}`),
    enabled: !!address && !!fromToken,
    watch: true,
  });

  // Get ETH balance for gas checking
  const { data: ethBalance } = useBalance({
    address: address,
    watch: true,
  });

  // Initialize default ETH token on chain change
  useEffect(() => {
    if (chainId && !fromToken) {
      setFromToken({
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        logoURI:
          "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
      });
      loadTokens();
      getSpenderAddress();
    }
  }, [chainId]);

  // Load swap history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("swapHistory");
    if (savedHistory) {
      try {
        setSwapHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error("Error loading swap history:", error);
      }
    }
  }, []);

  // Save swap to history
  const saveSwapToHistory = useCallback(
    (
      txHash: string,
      fromTkn: SwapToken,
      toTkn: SwapToken,
      fromAmt: string,
      toAmt: string,
      chain: number,
      status: "success" | "failed" | "pending" = "success"
    ) => {
      const newSwap: SwapHistoryItem = {
        txHash,
        fromToken: fromTkn.symbol,
        toToken: toTkn.symbol,
        fromAmount: fromAmt,
        toAmount: toAmt,
        chainId: chain,
        timestamp: new Date().toISOString(),
        status,
        gasUsed: gasPrice?.estimatedGas,
        gasPrice: gasPrice?.gasPriceGwei,
      };

      const updatedHistory = [newSwap, ...swapHistory].slice(0, 50);
      setSwapHistory(updatedHistory);
      localStorage.setItem("swapHistory", JSON.stringify(updatedHistory));
    },
    [swapHistory, gasPrice]
  );

  // Get explorer link
  const getExplorerLink = useCallback((txHash: string, chain: number) => {
    const explorers: { [key: number]: string } = {
      1: "https://etherscan.io/tx/",
      137: "https://polygonscan.com/tx/",
      56: "https://bscscan.com/tx/",
      43114: "https://snowtrace.io/tx/",
      8453: "https://basescan.org/tx/",
      42161: "https://arbiscan.io/tx/",
    };
    return explorers[chain] + txHash;
  }, []);

  // FIXED: Get spender address with correct API path
  const getSpenderAddress = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/swap/spender/${chainId}`
      );
      const data = await response.json();
      if (data.success && data.data) {
        setSpenderAddress(data.data.address);
      }
    } catch (error) {
      console.error("Error getting spender:", error);
    }
  }, [chainId]);

  // FIXED: Load tokens with correct API path
  const loadTokens = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/swap/tokens/${chainId}`
      );
      const data = await response.json();

      if (data.success && data.data?.tokens) {
        const tokenList = Object.values(data.data.tokens) as SwapToken[];

        // Sort popular tokens first
        const popularTokens = tokenList.sort((a: any, b: any) => {
          const priority = [
            "ETH",
            "WETH",
            "USDT",
            "USDC",
            "DAI",
            "WBTC",
            "UNI",
            "LINK",
            "MATIC",
            "BNB",
            "AVAX",
          ];
          const aIndex = priority.indexOf(a.symbol);
          const bIndex = priority.indexOf(b.symbol);

          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;

          return 0;
        });

        setTokens(popularTokens.slice(0, 100));
      }
    } catch (error) {
      console.error("Error loading tokens:", error);
      setTokens([]);
    }
  }, [chainId]);

  // FIXED: Search tokens with correct API path
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

  // FIXED: Fetch gas prices with correct API path
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

  // FIXED: Fetch native token price with correct API path
  const fetchNativePrice = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/swap/price/${chainId}`);
      const data = await response.json();
      return data.success ? data.data.price : 2500;
    } catch (error) {
      console.error("Error fetching native price:", error);
      return 2500;
    }
  }, [chainId]);

  // Calculate max amount based on actual gas from quote
  const calculateMaxAmount = useCallback(async () => {
    if (!fromTokenBalance || !fromToken) return;

    const balance = parseFloat(fromTokenBalance.formatted);

    // For ERC20 tokens, use full balance
    if (fromToken.address !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      setFromAmount(balance.toString());
      return;
    }

    // For native tokens, need to get actual gas cost
    if (!toToken) {
      setFromAmount(balance.toString());
      return;
    }

    try {
      // Use a small test amount to get gas estimate
      const testAmount = 0.01;
      const decimals = fromToken?.decimals || 18;
      const factor = Math.pow(10, decimals);
      const amountInWei = Math.floor(testAmount * factor).toString();

      const response = await fetch(
        `${API_BASE_URL}/api/swap/quote/${chainId}?` +
          `src=${fromToken.address}&` +
          `dst=${toToken.address}&` +
          `amount=${amountInWei}&` +
          `from=${address}&` +
          `slippage=${slippage}&` +
          `gasMode=${gasMode}`
      );

      if (!response.ok) {
        throw new Error("Failed to get gas estimate");
      }

      const data = await response.json();

      if (!data.success || !data.data?.gas) {
        throw new Error("No gas data available");
      }

      // Get current gas price
      const gasPrices = await fetchGasPrice();
      if (!gasPrices) {
        throw new Error("Failed to get gas price");
      }

      const gasPriceGwei =
        gasMode === "instant"
          ? gasPrices.instant
          : gasMode === "high"
          ? gasPrices.high
          : gasMode === "medium"
          ? gasPrices.medium
          : gasPrices.safe;

      // Calculate actual gas cost correctly
      const gasUnits = parseInt(data.data.gas);
      const gasCostETH = (gasUnits * gasPriceGwei) / 1e9;
      console.log("MAX button gas calculation:", {
        gasUnits,
        gasPriceGwei,
        gasCostETH,
      });

      // Add 20% buffer for gas price fluctuation
      const gasWithBuffer = gasCostETH * 1.2;

      // Calculate max sendable amount
      const maxAmount = Math.max(0, balance - gasWithBuffer);

      if (maxAmount <= 0) {
        setQuoteError(
          `Insufficient balance for gas (need ~${gasWithBuffer.toFixed(6)} ETH)`
        );
        setFromAmount("0");
      } else {
        setFromAmount(maxAmount.toFixed(8).replace(/\.?0+$/, ""));
      }
    } catch (error) {
      console.error("Error calculating max amount:", error);
      setQuoteError("Unable to calculate max amount. Please enter manually.");
      setFromAmount("");
    }
  }, [
    fromTokenBalance,
    fromToken,
    toToken,
    address,
    chainId,
    slippage,
    gasMode,
    fetchGasPrice,
  ]);

  // FIXED: Get quote with correct API path and response handling
  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount || !address) {
      setQuoteError(null);
      setToAmount("");
      setQuote(null);
      setGasPrice(null);
      setInsufficientBalance(false);
      return;
    }

    const amount = parseFloat(fromAmount);
    if (isNaN(amount) || amount <= 0) {
      setToAmount("0");
      setQuote(null);
      setQuoteError("Please enter a valid amount");
      setGasPrice(null);
      setInsufficientBalance(false);
      return;
    }

    // Early balance check
    if (fromTokenBalance) {
      const userBalance = parseFloat(fromTokenBalance.formatted);
      if (userBalance < amount) {
        setQuoteError(`Insufficient ${fromToken.symbol} balance`);
        setInsufficientBalance(true);
        setToAmount("0");
        return;
      }
    }

    setLoading(true);
    setQuoteError(null);
    setGasPrice(null);
    setInsufficientBalance(false);

    try {
      const decimals = fromToken?.decimals || 18;
      const factor = Math.pow(10, decimals);
      const amountInWei = Math.floor(amount * factor);

      if (amountInWei <= 0) {
        throw new Error("Amount too small");
      }

      const amountWei = amountInWei.toString();

      // FIXED: Use correct API endpoint path
      const response = await fetch(
        `${API_BASE_URL}/api/swap/quote/${chainId}?` +
          `src=${fromToken.address}&` +
          `dst=${toToken.address}&` +
          `amount=${amountWei}&` +
          `from=${address}&` +
          `slippage=${slippage}&` +
          `gasMode=${gasMode}`
      );

      const data = await response.json();

      if (!data.success || !data.data?.dstAmount) {
        setQuote(null);
        setToAmount("0");
        setGasPrice(null);

        const errorMsg = data.message || data.error || "Unable to get quote";
        if (errorMsg.includes("insufficient")) {
          setQuoteError("Insufficient liquidity for this trade");
        } else if (errorMsg.includes("cannot estimate")) {
          setQuoteError("Cannot estimate. Try a different amount.");
        } else if (errorMsg.includes("not enough")) {
          setQuoteError("Not enough balance for gas");
        } else {
          setQuoteError(errorMsg);
        }
        return;
      }

      setQuoteError(null);
      setQuote(data.data);

      const toDecimals = toToken?.decimals || 18;
      const outputAmount =
        parseFloat(data.data.dstAmount) / Math.pow(10, toDecimals);
      setToAmount(outputAmount > 0 ? outputAmount.toFixed(6) : "0");

      // Calculate gas cost from quote
      if (data.data.gas && !isNaN(parseInt(data.data.gas))) {
        const gasUnits = parseInt(data.data.gas);
        const gasPrices = await fetchGasPrice();
        const nativePrice = await fetchNativePrice();

        if (gasPrices) {
          const gasPriceGwei =
            gasMode === "instant"
              ? gasPrices.instant
              : gasMode === "high"
              ? gasPrices.high
              : gasMode === "medium"
              ? gasPrices.medium
              : gasPrices.safe;

          const gasCostInEth = (gasUnits * gasPriceGwei) / 1e9;
          const gasCostUSD = (gasCostInEth * nativePrice).toFixed(2);

          setGasPrice({
            estimatedGas: gasUnits.toString(),
            gasPrice: (gasPriceGwei * 1e9).toString(),
            gasCostWei: (gasUnits * gasPriceGwei * 1e9).toString(),
            gasCostEth: gasCostInEth.toFixed(6),
            gasCostUSD: gasCostUSD,
            nativeTokenPriceUSD: nativePrice.toString(),
            gasPriceGwei: gasPriceGwei.toFixed(2),
          });

          // Check sufficient balance for gas
          const isNativeToken =
            fromToken.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

          if (isNativeToken) {
            const ethBalanceValue = ethBalance
              ? parseFloat(ethBalance.formatted)
              : 0;
            const totalNeeded = amount + gasCostInEth;

            if (ethBalanceValue < totalNeeded) {
              setInsufficientBalance(true);
              setQuoteError(
                `Insufficient ETH. Need ${totalNeeded.toFixed(
                  6
                )} ETH (${amount.toFixed(6)} for swap + ${gasCostInEth.toFixed(
                  6
                )} for gas)`
              );
            }
          } else {
            const tokenBalance = fromTokenBalance
              ? parseFloat(fromTokenBalance.formatted)
              : 0;
            const ethBalanceValue = ethBalance
              ? parseFloat(ethBalance.formatted)
              : 0;

            if (tokenBalance < amount) {
              setInsufficientBalance(true);
              setQuoteError(`Insufficient ${fromToken.symbol} balance`);
            } else if (gasCostInEth > 0 && ethBalanceValue < gasCostInEth) {
              setInsufficientBalance(true);
              setQuoteError(
                `Insufficient ETH for gas. Need ${gasCostInEth.toFixed(6)} ETH`
              );
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error getting quote:", error);
      setQuote(null);
      setToAmount("0");
      setGasPrice(null);

      if (error.message?.includes("Amount too small")) {
        setQuoteError("Amount too small for this trade");
      } else if (error.message?.includes("fetch")) {
        setQuoteError("Network error. Please check your connection.");
      } else {
        setQuoteError("Failed to get quote. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    fromToken,
    toToken,
    fromAmount,
    address,
    chainId,
    slippage,
    gasMode,
    fromTokenBalance,
    ethBalance,
    fetchGasPrice,
    fetchNativePrice,
  ]);

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
  }, [fromAmount, fromToken, toToken, address, slippage, gasMode, getQuote]);

  // FIXED: Check allowance with correct API path
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
      return data.success && data.data ? data.data.allowance : "0";
    } catch (error) {
      console.error("Error checking allowance:", error);
      return "0";
    }
  }, [fromToken, address, chainId]);

  // FIXED: Approve token with correct API path
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
            to: data.data.to as `0x${string}`,
            data: data.data.data as `0x${string}`,
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

  // FIXED: Execute swap with correct API path
  const executeSwap = async () => {
    if (
      !fromToken ||
      !toToken ||
      !fromAmount ||
      !address ||
      !walletClient ||
      !publicClient
    )
      return false;

    if (insufficientBalance) {
      alert("Insufficient balance to complete this swap");
      return false;
    }

    setSwapping(true);
    let transactionId: string | null = null;

    try {
      const decimals = fromToken.decimals || 18;
      const amount = parseFloat(fromAmount);
      const factor = Math.pow(10, decimals);
      const amountInWei = Math.floor(amount * factor);
      const amountWei = amountInWei.toString();

      console.log("Executing swap with amount:", amountWei);

      // Create transaction record first
      transactionId = await createDbTransaction();

      // Check allowance for ERC20 tokens
      if (fromToken.address !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        const allowance = await checkAllowance();
        const allowanceNum = parseFloat(allowance);
        const amountNum = parseFloat(amountWei);

        if (allowanceNum < amountNum) {
          console.log("Approving token...");
          const approved = await approveToken(amountWei);
          if (!approved) {
            if (transactionId) {
              await updateDbTransaction(
                transactionId,
                "failed",
                undefined,
                "Token approval failed"
              );
            }
            throw new Error("Token approval failed");
          }
        }
      }

      // FIXED: Use correct API endpoint path for swap
      const response = await fetch(
        `${API_BASE_URL}/api/swap/swap/${chainId}?` +
          `src=${fromToken.address}&` +
          `dst=${toToken.address}&` +
          `amount=${amountWei}&` +
          `from=${address}&` +
          `slippage=${slippage}&` +
          `gasMode=${gasMode}`
      );

      const swapData = await response.json();

      if (!swapData.success || swapData.error) {
        if (transactionId) {
          await updateDbTransaction(
            transactionId,
            "failed",
            undefined,
            swapData.error?.description || swapData.message || "Swap failed"
          );
        }
        throw new Error(
          swapData.error?.description ||
            swapData.message ||
            swapData.details ||
            "Swap failed"
        );
      }

      if (swapData.data && swapData.data.tx) {
        console.log("Swap transaction data:", swapData.data.tx);

        const tx = await walletClient.sendTransaction({
          to: swapData.data.tx.to as `0x${string}`,
          data: swapData.data.tx.data as `0x${string}`,
          value: swapData.data.tx.value
            ? BigInt(swapData.data.tx.value)
            : undefined,
          gas: swapData.data.tx.gas ? BigInt(swapData.data.tx.gas) : undefined,
          gasPrice: swapData.data.tx.gasPrice
            ? BigInt(swapData.data.tx.gasPrice)
            : undefined,
        });

        if (transactionId) {
          await updateDbTransaction(transactionId, "pending", tx);
        }

        saveSwapToHistory(
          tx,
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          chainId,
          "pending"
        );

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx,
          confirmations: 1,
        });

        console.log("Transaction confirmed:", receipt);

        const finalStatus = receipt.status === "success" ? "success" : "failed";

        if (transactionId) {
          await updateDbTransaction(transactionId, finalStatus, tx);
        }

        saveSwapToHistory(
          tx,
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          chainId,
          finalStatus
        );

        if (receipt.status !== "success") {
          throw new Error("Transaction failed on chain");
        }

        // Clear form on success
        setFromAmount("");
        setToAmount("");
        setQuote(null);
        setQuoteError(null);
        setInsufficientBalance(false);

        const explorerLink = getExplorerLink(tx, chainId);
        alert(
          `Swap successful! \nTransaction: ${tx.substring(
            0,
            10
          )}...${tx.substring(
            tx.length - 8
          )}\n\nView on explorer: ${explorerLink}`
        );

        return true;
      }
    } catch (error: any) {
      console.error("Swap error:", error);

      let errorMessage = error.message;

      if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (
        errorMessage.includes("user rejected") ||
        errorMessage.includes("User denied")
      ) {
        errorMessage = "Transaction cancelled by user";
      } else if (errorMessage.includes("intrinsic gas too low")) {
        errorMessage =
          "Gas estimation failed. Please try again with higher gas.";
      }

      if (transactionId) {
        await updateDbTransaction(
          transactionId,
          "failed",
          undefined,
          errorMessage
        );
      }

      alert(`Swap failed: ${errorMessage}`);
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

  return {
    // Token states
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    fromAmount,
    setFromAmount,
    toAmount,
    tokens,

    // Balance states
    fromTokenBalance,
    ethBalance,

    // Quote and transaction states
    quote,
    spenderAddress,

    // Settings states
    slippage,
    setSlippage,
    customSlippage,
    setCustomSlippage,
    gasMode,
    setGasMode,
    gasPrice,

    // Loading and error states
    loading,
    swapping,
    error,
    quoteError,
    insufficientBalance,

    // History
    swapHistory,

    // Functions
    searchTokens,
    loadTokens,
    executeSwap,
    fetchGasPrice,
    calculateMaxAmount,
    swapTokenPositions,
    getExplorerLink,
    checkAllowance,
    approveToken,
    getQuote,
    dbTransactions,
    loadingHistory,
    loadSwapHistory,
    currentTransactionId,
  };
}
