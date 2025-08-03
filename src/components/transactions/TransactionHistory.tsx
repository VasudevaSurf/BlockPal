// src/components/transactions/TransactionHistory.tsx - SMART AUTO-DETECTION WITH HIDDEN REFRESH
"use client";

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
  RefreshCw,
  ExternalLink,
  Hash,
  Copy,
  Calendar,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from "lucide-react";
import { SkeletonTransactionHistory } from "@/components/ui/Skeleton";

interface Transaction {
  _id?: string;
  id?: string;
  transactionHash?: string;
  hash?: string;
  direction?: "sent" | "received";
  isReceived?: boolean;
  type?: string;
  category?: string;
  tokenSymbol?: string;
  token?: string;
  amount?: string | number;
  amountFormatted?: string;
  valueUSD?: number;
  batchSize?: number;
  transferMode?: string;
  totalTransfers?: number;
  totalValueUSD?: number;
  timestamp?: string;
  date?: string;
  status?: string;
  username?: string;
  contractAddress?: string;
  senderWallet?: string;
  receiverWallet?: string;
  otherParty?: string;
  displayDirection?: string;
  // Alchemy-specific fields
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  from?: string;
  to?: string;
  value?: string;
  asset?: string;
  rawContract?: any;
  metadata?: any;
  // Scheduled transaction fields
  scheduleId?: string;
  frequency?: string;
  executionCount?: number;
  smartContractExecution?: boolean;
  transfers?: Array<{
    recipient: string;
    tokenSymbol: string;
    contractAddress: string;
    amount: string;
    usdValue: number;
  }>;
}

interface TransactionHistoryProps {
  walletAddress?: string;
  contractAddress?: string;
  tokenFilter?: string;
  transactionTypeFilter?: string;
  limit?: number;
  title?: string;
  showRefresh?: boolean;
  showFilter?: boolean;
  compact?: boolean;
  className?: string;
  isTokenOverview?: boolean;
}

// Smart Transaction Detection Service with hidden background monitoring
class SmartTransactionService {
  private static instance: SmartTransactionService;
  private methodSignatureCache = new Map<string, any>();
  private priceCache = new Map<string, number>();
  private lastKnownTransactions = new Map<string, Set<string>>(); // wallet -> transaction hashes
  private backgroundMonitors = new Map<string, NodeJS.Timeout>(); // wallet -> monitor interval
  private listeners = new Map<string, Function[]>(); // wallet -> callback functions
  private isMonitoring = new Map<string, boolean>();

  // Smart detection intervals
  private readonly QUICK_CHECK_INTERVAL = 8000; // 8 seconds for new transaction detection
  private readonly BACKGROUND_CHECK_INTERVAL = 45000; // 45 seconds for background monitoring
  private currentCheckInterval = this.QUICK_CHECK_INTERVAL;

  // Known DeFi method signatures - frozen for performance
  private readonly KNOWN_METHODS = Object.freeze({
    "0xa9059cbb": Object.freeze({ name: "Transfer", type: "transfer" }),
    "0x23b872dd": Object.freeze({ name: "Transfer From", type: "transfer" }),
    "0x38ed1739": Object.freeze({ name: "Swap", type: "swap" }),
    "0x8803dbee": Object.freeze({ name: "Swap", type: "swap" }),
    "0x7ff36ab5": Object.freeze({ name: "Swap ETH", type: "swap" }),
    "0xfb3bdb41": Object.freeze({ name: "Swap ETH", type: "swap" }),
    "0x18cbafe5": Object.freeze({ name: "Swap to ETH", type: "swap" }),
    "0x4a25d94a": Object.freeze({ name: "Swap to ETH", type: "swap" }),
    "0x3593564c": Object.freeze({ name: "Universal Router", type: "swap" }),
    "0x415565b0": Object.freeze({ name: "0x Protocol", type: "swap" }),
    "0x095ea7b3": Object.freeze({ name: "Approve", type: "approval" }),
    "0xe8e33700": Object.freeze({ name: "Add Liquidity", type: "liquidity" }),
    "0xbaa2abde": Object.freeze({
      name: "Remove Liquidity",
      type: "liquidity",
    }),
    "0xd0e30db0": Object.freeze({ name: "Deposit", type: "deposit" }),
    "0x2e1a7d4d": Object.freeze({ name: "Withdraw", type: "withdraw" }),
  });

  static getInstance(): SmartTransactionService {
    if (!SmartTransactionService.instance) {
      SmartTransactionService.instance = new SmartTransactionService();
    }
    return SmartTransactionService.instance;
  }

  // Subscribe to transaction updates for a wallet
  subscribeToTransactions(
    walletAddress: string,
    contractAddress: string,
    callback: (transactions: Transaction[], isNewTransaction: boolean) => void
  ): () => void {
    const key = `${walletAddress}-${contractAddress}`;

    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    this.listeners.get(key)!.push(callback);

    // Start monitoring if not already monitoring
    if (!this.isMonitoring.get(key)) {
      this.startSmartMonitoring(walletAddress, contractAddress);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }

        // Stop monitoring if no listeners
        if (callbacks.length === 0) {
          this.stopMonitoring(key);
        }
      }
    };
  }

  // Smart monitoring that detects new transactions without visible reloading
  private async startSmartMonitoring(
    walletAddress: string,
    contractAddress: string
  ) {
    const key = `${walletAddress}-${contractAddress}`;

    if (this.isMonitoring.get(key)) return;

    this.isMonitoring.set(key, true);
    console.log("🔍 Smart Monitor: Starting transaction detection for", key);

    // Initial fetch to establish baseline
    const initialTransactions = await this.fetchTransactionsQuietly(
      walletAddress,
      contractAddress
    );
    this.updateKnownTransactions(key, initialTransactions);

    // Notify initial load
    this.notifyListeners(key, initialTransactions, false);

    // Start intelligent monitoring
    this.scheduleNextCheck(
      walletAddress,
      contractAddress,
      this.QUICK_CHECK_INTERVAL
    );
  }

  // Intelligent scheduling that adapts based on activity
  private scheduleNextCheck(
    walletAddress: string,
    contractAddress: string,
    interval: number
  ) {
    const key = `${walletAddress}-${contractAddress}`;

    if (!this.isMonitoring.get(key)) return;

    // Clear existing monitor
    if (this.backgroundMonitors.has(key)) {
      clearTimeout(this.backgroundMonitors.get(key)!);
    }

    const monitor = setTimeout(async () => {
      if (!this.isMonitoring.get(key)) return;

      try {
        // Silent background check
        const latestTransactions = await this.fetchTransactionsQuietly(
          walletAddress,
          contractAddress
        );
        const hasNewTransactions = this.detectNewTransactions(
          key,
          latestTransactions
        );

        if (hasNewTransactions) {
          console.log("✨ Smart Monitor: New transaction detected!");
          this.updateKnownTransactions(key, latestTransactions);
          this.notifyListeners(key, latestTransactions, true);

          // Speed up monitoring temporarily after new transaction
          this.scheduleNextCheck(
            walletAddress,
            contractAddress,
            this.QUICK_CHECK_INTERVAL
          );
        } else {
          // No new transactions, slow down monitoring
          this.scheduleNextCheck(
            walletAddress,
            contractAddress,
            this.BACKGROUND_CHECK_INTERVAL
          );
        }
      } catch (error) {
        console.error("❌ Smart Monitor: Background check failed", error);
        // Retry with longer interval on error
        this.scheduleNextCheck(
          walletAddress,
          contractAddress,
          this.BACKGROUND_CHECK_INTERVAL
        );
      }
    }, interval);

    this.backgroundMonitors.set(key, monitor);
  }

  // Detect new transactions by comparing transaction hashes
  private detectNewTransactions(
    key: string,
    newTransactions: Transaction[]
  ): boolean {
    const knownHashes = this.lastKnownTransactions.get(key) || new Set();
    const newHashes = new Set(
      newTransactions.map((tx) => tx.hash || tx.transactionHash).filter(Boolean)
    );

    // Check if any new transaction hash exists
    for (const hash of newHashes) {
      if (!knownHashes.has(hash)) {
        return true;
      }
    }

    return false;
  }

  // Update known transactions cache
  private updateKnownTransactions(key: string, transactions: Transaction[]) {
    const hashes = new Set(
      transactions.map((tx) => tx.hash || tx.transactionHash).filter(Boolean)
    );
    this.lastKnownTransactions.set(key, hashes);
  }

  // Notify all listeners of updates
  private notifyListeners(
    key: string,
    transactions: Transaction[],
    isNewTransaction: boolean
  ) {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(transactions, isNewTransaction);
        } catch (error) {
          console.error("❌ Smart Monitor: Listener callback failed", error);
        }
      });
    }
  }

  // Stop monitoring for a specific wallet
  private stopMonitoring(key: string) {
    console.log("🛑 Smart Monitor: Stopping monitoring for", key);

    this.isMonitoring.set(key, false);

    if (this.backgroundMonitors.has(key)) {
      clearTimeout(this.backgroundMonitors.get(key)!);
      this.backgroundMonitors.delete(key);
    }

    this.lastKnownTransactions.delete(key);
    this.listeners.delete(key);
  }

  // Quiet fetch without loading indicators
  private async fetchTransactionsQuietly(
    walletAddress: string,
    contractAddress: string
  ): Promise<Transaction[]> {
    try {
      const response = await fetch("/api/alchemy/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          contractAddress:
            contractAddress === "ETH" ? "native" : contractAddress,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch transactions");
      }

      return this.processAlchemyTransactions(
        data.transactions || [],
        walletAddress
      );
    } catch (error) {
      console.error("❌ Smart Monitor: Quiet fetch failed:", error);
      return [];
    }
  }

  // Manual refresh function
  async manualRefresh(
    walletAddress: string,
    contractAddress: string
  ): Promise<Transaction[]> {
    const key = `${walletAddress}-${contractAddress}`;
    console.log("🔄 Smart Monitor: Manual refresh requested");

    const transactions = await this.fetchTransactionsQuietly(
      walletAddress,
      contractAddress
    );
    this.updateKnownTransactions(key, transactions);

    // Reset to quick monitoring after manual refresh
    if (this.isMonitoring.get(key)) {
      this.scheduleNextCheck(
        walletAddress,
        contractAddress,
        this.QUICK_CHECK_INTERVAL
      );
    }

    return transactions;
  }

  private formatAmount = (
    value: string | number,
    decimals: number = 18
  ): string => {
    if (!value || value === "0") return "0";

    try {
      let numValue: number;

      if (typeof value === "string") {
        if (value.startsWith("0x")) {
          const bigIntValue = BigInt(value);
          numValue = Number(bigIntValue) / Math.pow(10, decimals);
        } else {
          numValue = parseFloat(value);
        }
      } else {
        numValue = value;
      }

      if (numValue === 0) return "0";
      if (numValue < 0.000001) return "<0.000001";
      if (numValue < 1) return numValue.toFixed(6).replace(/\.?0+$/, "");
      if (numValue < 1000) return numValue.toFixed(4).replace(/\.?0+$/, "");
      if (numValue < 1000000) return numValue.toFixed(2).replace(/\.?0+$/, "");

      return numValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
    } catch (error) {
      console.error("Error formatting amount:", error);
      return "0";
    }
  };

  private getMethodSignature = (input: string): string | null => {
    if (!input || input === "0x" || input.length < 10) {
      return null;
    }
    return input.substring(0, 10);
  };

  private detectTransactionType = (tx: any): string => {
    const cacheKey = `${tx.hash}-type`;
    if (this.methodSignatureCache.has(cacheKey)) {
      return this.methodSignatureCache.get(cacheKey);
    }

    if (!tx.input || tx.input === "0x") {
      const result = tx.category === "external" ? "Sent" : "Received";
      this.methodSignatureCache.set(cacheKey, result);
      return result;
    }

    const methodSig = this.getMethodSignature(tx.input);

    if (methodSig && this.KNOWN_METHODS[methodSig]) {
      const method = this.KNOWN_METHODS[methodSig];

      if (method.type === "transfer" && methodSig === "0xa9059cbb") {
        const result = tx.category === "external" ? "Sent" : "Received";
        this.methodSignatureCache.set(cacheKey, result);
        return result;
      }

      this.methodSignatureCache.set(cacheKey, method.name);
      return method.name;
    }

    const result = "Contract Interaction";
    this.methodSignatureCache.set(cacheKey, result);
    return result;
  };

  private async getTokenPrice(
    symbol: string,
    timestamp?: string
  ): Promise<number> {
    const cacheKey = `price-${symbol}-${timestamp || "current"}`;

    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey)!;
    }

    try {
      const commonPrices: Record<string, number> = Object.freeze({
        ETH: 2400,
        ETHEREUM: 2400,
        USDT: 1,
        USDC: 1,
        DAI: 1,
        BTC: 45000,
        LINK: 15,
        UNI: 8,
      });

      const price = commonPrices[symbol] || 0;
      this.priceCache.set(cacheKey, price);

      // Clean up price cache periodically
      if (this.priceCache.size > 100) {
        const entries = Array.from(this.priceCache.entries());
        this.priceCache.clear();
        entries.slice(-50).forEach(([key, value]) => {
          this.priceCache.set(key, value);
        });
      }

      return price;
    } catch (error) {
      console.error("Error fetching token price:", error);
      return 0;
    }
  }

  private async processAlchemyTransactions(
    transactions: any[],
    walletAddress: string
  ): Promise<Transaction[]> {
    // Process in micro-batches for performance
    const BATCH_SIZE = 3;
    const processedTransactions: Transaction[] = [];

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (tx, batchIndex) => {
          const index = i + batchIndex;
          const isETH = !tx.contractAddress || tx.contractAddress === "native";
          const direction = this.determineDirection(tx, walletAddress);
          const transactionType = this.detectTransactionType(tx);
          const tokenSymbol = tx.asset || (isETH ? "ETH" : "Unknown");

          // Calculate USD value
          const amount = parseFloat(this.formatAmount(tx.value, 18)) || 0;
          const tokenPrice = await this.getTokenPrice(
            tokenSymbol,
            tx.metadata?.blockTimestamp
          );
          const valueUSD = amount * tokenPrice;

          return Object.freeze({
            _id: `${tx.hash}-${index}`,
            id: tx.hash,
            transactionHash: tx.hash,
            hash: tx.hash,
            direction,
            isReceived: direction === "received",
            type: transactionType,
            category: tx.category || "external",
            tokenSymbol,
            token: tokenSymbol,
            amount: this.formatAmount(tx.value, 18),
            amountFormatted: `${this.formatAmount(
              tx.value,
              18
            )} ${tokenSymbol}`,
            valueUSD,
            timestamp: tx.metadata?.blockTimestamp || new Date().toISOString(),
            date: tx.metadata?.blockTimestamp || new Date().toISOString(),
            status: "confirmed",
            contractAddress: isETH ? "native" : tx.contractAddress,
            senderWallet: tx.from,
            receiverWallet: tx.to,
            otherParty: direction === "sent" ? tx.to : tx.from,
            displayDirection: direction === "sent" ? "Sent" : "Received",
            blockNumber: parseInt(tx.blockNum, 16),
            gasUsed: tx.gasUsed || "N/A",
            from: tx.from,
            to: tx.to,
            value: tx.value,
            asset: tx.asset,
            metadata: tx.metadata,
          });
        })
      );

      processedTransactions.push(...batchResults);

      // Micro-yield for large batches only
      if (i + BATCH_SIZE < transactions.length && transactions.length > 20) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return processedTransactions;
  }

  private determineDirection(
    tx: any,
    walletAddress: string
  ): "sent" | "received" {
    const from = tx.from?.toLowerCase();
    const to = tx.to?.toLowerCase();
    const wallet = walletAddress.toLowerCase();

    if (from === wallet) return "sent";
    if (to === wallet) return "received";
    return "sent";
  }
}

// Pre-computed token data for maximum performance
const TOKEN_COLORS = Object.freeze({
  ETH: "from-blue-500/30 to-blue-600/40",
  ETHEREUM: "from-blue-500/30 to-blue-600/40",
  SOL: "from-purple-500/30 to-purple-600/40",
  BTC: "from-orange-500/30 to-orange-600/40",
  SUI: "from-cyan-500/30 to-cyan-600/40",
  USDT: "from-green-500/30 to-green-600/40",
  USDC: "from-blue-600/30 to-blue-700/40",
  YAI: "from-yellow-500/30 to-yellow-600/40",
  LINK: "from-blue-700/30 to-blue-800/40",
  DAI: "from-yellow-500/30 to-yellow-600/40",
  UNI: "from-pink-500/30 to-pink-600/40",
});

const TOKEN_ICONS = Object.freeze({
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  ETHEREUM: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  DAI: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
});

const TOKEN_LETTERS = Object.freeze({
  ETH: "Ξ",
  ETHEREUM: "Ξ",
  SOL: "◎",
  BTC: "₿",
  SUI: "~",
  USDT: "₮",
  USDC: "$",
  YAI: "Ÿ",
  LINK: "⛓",
  DAI: "◈",
  UNI: "🦄",
});

// Optimized utility functions
const getTokenBackgroundColor = (symbol: string, contractAddress?: string) => {
  if (
    symbol === "ETH" ||
    contractAddress === "native" ||
    symbol === "ETHEREUM"
  ) {
    return TOKEN_COLORS.ETH || "from-gray-500/30 to-gray-600/40";
  }
  return TOKEN_COLORS[symbol] || "from-gray-500/30 to-gray-600/40";
};

const getTokenIconUrl = (symbol: string, contractAddress?: string) => {
  return TOKEN_ICONS[symbol] || null;
};

const getTokenLetter = (symbol: string, contractAddress?: string) => {
  if (
    symbol === "ETH" ||
    contractAddress === "native" ||
    symbol === "ETHEREUM"
  ) {
    return TOKEN_LETTERS.ETH || "Ξ";
  }
  return TOKEN_LETTERS[symbol] || symbol.charAt(0);
};

const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || url === "null" || url === "undefined" || url === "") {
    return false;
  }
  return (
    url.startsWith("http") &&
    (url.includes("coingecko") ||
      url.includes("coinbase") ||
      url.includes("cdn") ||
      url.includes("assets"))
  );
};

// Highly optimized TokenIcon component
const TokenIcon = memo(
  ({ token, size = "w-8 h-8" }: { token: any; size?: string }) => {
    const [imageError, setImageError] = useState(false);

    const iconUrl = useMemo(
      () =>
        getTokenIconUrl(token.symbol, token.contractAddress) ||
        token.icon ||
        token.logoUrl,
      [token.symbol, token.contractAddress, token.icon, token.logoUrl]
    );

    const hasValidImage = !imageError && isValidImageUrl(iconUrl);
    const bgGradient = useMemo(
      () => getTokenBackgroundColor(token.symbol, token.contractAddress),
      [token.symbol, token.contractAddress]
    );

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    if (hasValidImage) {
      return (
        <img
          src={iconUrl}
          alt={token.symbol}
          className={`${size} rounded-full object-cover`}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
      );
    }

    return (
      <div
        className={`${size} rounded-full bg-gradient-to-br ${bgGradient} border border-gray-700/50 flex items-center justify-center`}
      >
        <span className="text-white text-sm font-semibold">
          {getTokenLetter(token.symbol, token.contractAddress)}
        </span>
      </div>
    );
  }
);

TokenIcon.displayName = "TokenIcon";

// Optimized batch transaction info
const getBatchTransactionInfo = (tx: Transaction) => {
  if (tx.type === "batch" || tx.category === "batch_transfer" || tx.transfers) {
    const uniqueTokens = new Set(tx.transfers?.map((t) => t.tokenSymbol) || []);
    const tokenCount = uniqueTokens.size;
    const transferCount = tx.totalTransfers || tx.transfers?.length || 0;
    const totalValue =
      tx.totalValueUSD ||
      tx.transfers?.reduce((sum, t) => sum + t.usdValue, 0) ||
      0;

    if (tokenCount === 1) {
      const tokenSymbol = Array.from(uniqueTokens)[0] || "Unknown";
      return {
        isBatch: true,
        displaySymbol: tokenSymbol,
        displayAmount: transferCount.toString(),
        displayValue: totalValue,
        batchInfo: `${transferCount} transfers`,
        tokenCount: 1,
      };
    } else if (tokenCount > 1) {
      return {
        isBatch: true,
        displaySymbol: "MIXED",
        displayAmount: transferCount.toString(),
        displayValue: totalValue,
        batchInfo: `${transferCount} transfers`,
        tokenCount,
      };
    }
  }

  return {
    isBatch: false,
    displaySymbol: tx.tokenSymbol || tx.token || "Unknown",
    displayAmount:
      typeof tx.amount === "string" ? tx.amount : `${tx.amount || "0"}`,
    displayValue: tx.valueUSD || 0,
    batchInfo: null,
    tokenCount: 1,
  };
};

// Highly optimized TransactionRow component
const TransactionRow = memo(
  ({
    tx,
    index,
    walletAddress,
    copied,
    setCopied,
    expandedTransactions,
    toggleExpanded,
    copyToClipboard,
    formatDateTime,
    getTransactionDirection,
    isNew,
  }: {
    tx: Transaction;
    index: number;
    walletAddress?: string;
    copied: string;
    setCopied: (value: string) => void;
    expandedTransactions: Set<string>;
    toggleExpanded: (txId: string) => void;
    copyToClipboard: (text: string, type: string) => Promise<void>;
    formatDateTime: (dateString: string) => string;
    getTransactionDirection: (tx: Transaction) => "sent" | "received";
    isNew?: boolean;
  }) => {
    const txInfo = useMemo(() => getBatchTransactionInfo(tx), [tx]);
    const hash = tx.transactionHash || tx.hash;
    const direction = useMemo(
      () => getTransactionDirection(tx),
      [tx, getTransactionDirection]
    );
    const txId = tx._id || tx.id || `tx-${index}`;
    const isExpanded = expandedTransactions.has(txId);
    const isBatch = txInfo.isBatch;

    const handleEtherscanClick = useCallback(() => {
      if (hash) {
        window.open(`https://etherscan.io/tx/${hash}`, "_blank");
      }
    }, [hash]);

    const handleCopyHash = useCallback(() => {
      if (hash) {
        copyToClipboard(hash, `hash-${index}`);
      }
    }, [hash, index, copyToClipboard]);

    const handleToggleExpanded = useCallback(() => {
      toggleExpanded(txId);
    }, [txId, toggleExpanded]);

    return (
      <div
        className={`bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg p-3 hover:bg-[#1A1A1A] hover:border-[#3C3C3C] transition-all duration-200 ${
          isNew ? "animate-pulse bg-green-900/10 border-green-500/30" : ""
        }`}
      >
        {/* Main Transaction Row */}
        <div className="flex items-center justify-between">
          {/* Left Side - Token and Direction */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* New Transaction Indicator */}
            {isNew && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
            )}

            {/* Token Icon */}
            {txInfo.displaySymbol === "MIXED" ? (
              <div className="w-8 h-8 bg-gradient-to-br from-gray-500/30 to-gray-600/40 rounded-full border border-gray-700/50 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">M</span>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <TokenIcon
                  token={{
                    symbol: txInfo.displaySymbol,
                    contractAddress: tx.contractAddress,
                  }}
                  size="w-8 h-8"
                />
              </div>
            )}

            {/* Transaction Details */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center space-x-2 mb-1">
                {/* Direction indicator with icon */}
                <div className="flex items-center space-x-1.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      direction === "sent"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {direction === "sent" ? (
                      <ArrowUpRight size={10} />
                    ) : (
                      <ArrowDownLeft size={10} />
                    )}
                  </div>
                  <span className="text-white font-medium font-satoshi text-sm">
                    {direction === "sent" ? "Sent" : "Received"}
                    {isNew && (
                      <span className="text-green-400 ml-1 text-xs">NEW</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Token info and batch details */}
              <div className="text-gray-400 text-xs font-satoshi truncate">
                {txInfo.isBatch ? (
                  <span>
                    {txInfo.batchInfo} • {txInfo.tokenCount} token
                    {txInfo.tokenCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>{txInfo.displaySymbol}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Amount and Actions */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Amount */}
            <div className="text-right">
              <div className="text-white font-semibold font-satoshi text-sm">
                {txInfo.isBatch ? (
                  <span className="text-gray-300">
                    {txInfo.displayAmount} transfers
                  </span>
                ) : (
                  <span>
                    {direction === "received" ? "+" : ""}
                    {txInfo.displayAmount} {txInfo.displaySymbol}
                  </span>
                )}
              </div>

              {(tx.valueUSD || txInfo.displayValue) && tx.valueUSD > 0 && (
                <div className="text-gray-400 text-xs font-satoshi">
                  ${(tx.valueUSD || txInfo.displayValue).toFixed(2)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              {hash && (
                <>
                  <button
                    onClick={handleEtherscanClick}
                    className="p-1.5 text-gray-400 hover:text-[#E2AF19] hover:bg-[#2C2C2C] rounded-lg transition-all duration-200"
                    title="View on Etherscan"
                  >
                    <ExternalLink size={12} />
                  </button>

                  <button
                    onClick={handleCopyHash}
                    className="p-1.5 text-gray-400 hover:text-[#E2AF19] hover:bg-[#2C2C2C] rounded-lg transition-all duration-200"
                    title="Copy transaction hash"
                  >
                    {copied === `hash-${index}` ? (
                      <div className="text-green-400 text-xs">✓</div>
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </>
              )}

              {/* Expand Button for Batch Transactions */}
              {txInfo.isBatch && tx.transfers && tx.transfers.length > 0 && (
                <button
                  onClick={handleToggleExpanded}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-all duration-200"
                  title={isExpanded ? "Collapse details" : "Expand details"}
                >
                  {isExpanded ? (
                    <ChevronUp size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="mt-2 pt-2 border-t border-[#2C2C2C] flex items-end justify-end">
          <span className="text-gray-400 text-xs font-satoshi">
            {tx.timestamp ? formatDateTime(tx.timestamp) : tx.date}
          </span>
        </div>

        {/* Expanded Details for Batch Transactions */}
        {txInfo.isBatch && isExpanded && tx.transfers && (
          <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
            <div className="space-y-2">
              <div className="text-gray-400 text-xs font-satoshi mb-2">
                Transfer Details ({tx.transfers.length} transfers):
              </div>

              {tx.transfers.map((transfer, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-[#2C2C2C]/30 rounded-lg hover:bg-[#2C2C2C]/50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <TokenIcon
                      token={{
                        symbol: transfer.tokenSymbol,
                        contractAddress: transfer.contractAddress,
                      }}
                      size="w-6 h-6"
                    />
                    <div className="flex flex-col">
                      <span className="text-white text-xs font-medium font-satoshi">
                        {transfer.amount} {transfer.tokenSymbol}
                      </span>
                      <span className="text-gray-400 text-xs font-mono">
                        {transfer.recipient.slice(0, 6)}...
                        {transfer.recipient.slice(-4)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-gray-400 text-xs font-satoshi">
                      ${transfer.usdValue.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

TransactionRow.displayName = "TransactionRow";

// Main component with smart auto-detection
export default function TransactionHistory({
  walletAddress,
  contractAddress,
  tokenFilter,
  transactionTypeFilter,
  limit = 20,
  title = "Transaction History",
  showRefresh = true,
  showFilter = true,
  compact = false,
  className = "",
  isTokenOverview = false,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(
    new Set()
  );
  const [newTransactionHashes, setNewTransactionHashes] = useState<Set<string>>(
    new Set()
  );

  // Smart service instance
  const smartService = useMemo(() => SmartTransactionService.getInstance(), []);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Handle transaction updates from smart service
  const handleTransactionUpdate = useCallback(
    (newTransactions: Transaction[], isNewTransaction: boolean) => {
      console.log("📡 Transaction Update:", {
        count: newTransactions.length,
        isNew: isNewTransaction,
      });

      // Apply client-side filtering if needed
      let filteredTransactions = newTransactions;

      if (tokenFilter && !isTokenOverview) {
        filteredTransactions = filteredTransactions.filter(
          (tx: Transaction) => {
            if (tokenFilter === "ETH") {
              return (
                tx.tokenSymbol === "ETH" ||
                tx.token === "ETH" ||
                tx.type === "simple_eth" ||
                tx.contractAddress === "native" ||
                (!tx.contractAddress &&
                  (tx.tokenSymbol === "ETH" || tx.token === "ETH"))
              );
            }

            return (
              tx.contractAddress === tokenFilter ||
              tx.tokenSymbol === tokenFilter ||
              tx.token === tokenFilter
            );
          }
        );
      }

      if (transactionTypeFilter && !isTokenOverview) {
        filteredTransactions = filteredTransactions.filter(
          (tx: Transaction) => {
            if (transactionTypeFilter === "batch") {
              return (
                tx.type === "batch" ||
                tx.category === "batch_transfer" ||
                tx.batchSize > 0 ||
                tx.transferMode === "BATCH" ||
                tx.transferMode === "MIXED" ||
                tx.transfers?.length > 0
              );
            }

            if (transactionTypeFilter === "scheduled") {
              return (
                tx.type === "scheduled_payment" ||
                tx.category === "scheduled" ||
                tx.scheduleId
              );
            }

            return tx.type === transactionTypeFilter;
          }
        );
      }

      setTransactions(filteredTransactions);

      // Mark new transactions for visual indication
      if (isNewTransaction) {
        const newHashes = new Set(
          filteredTransactions
            .slice(0, 3) // Assume first few are new
            .map((tx) => tx.hash || tx.transactionHash)
            .filter(Boolean)
        );
        setNewTransactionHashes(newHashes);

        // Clear new indicators after 5 seconds
        setTimeout(() => {
          setNewTransactionHashes(new Set());
        }, 5000);
      }

      setInitialLoading(false);
    },
    [tokenFilter, transactionTypeFilter, isTokenOverview]
  );

  // Subscribe to smart transaction monitoring
  useEffect(() => {
    if (walletAddress && (contractAddress || tokenFilter)) {
      const targetContract = contractAddress || tokenFilter || "ETH";

      console.log("🔔 Subscribing to transaction updates for:", {
        walletAddress,
        targetContract,
      });

      // Unsubscribe from previous subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      // Subscribe to new updates
      const unsubscribe = smartService.subscribeToTransactions(
        walletAddress,
        targetContract,
        handleTransactionUpdate
      );

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }
  }, [
    walletAddress,
    contractAddress,
    tokenFilter,
    smartService,
    handleTransactionUpdate,
  ]);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);

    try {
      const targetContract = contractAddress || tokenFilter || "ETH";
      const refreshedTransactions = await smartService.manualRefresh(
        walletAddress,
        targetContract
      );

      handleTransactionUpdate(refreshedTransactions, false);
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    } finally {
      setLoading(false);
    }
  }, [
    walletAddress,
    contractAddress,
    tokenFilter,
    smartService,
    handleTransactionUpdate,
  ]);

  // Utility functions
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }, []);

  const getTransactionDirection = useCallback(
    (tx: Transaction): "sent" | "received" => {
      if (tx.direction) return tx.direction;
      if (tx.isReceived) return "received";

      if (walletAddress) {
        if (tx.senderWallet?.toLowerCase() === walletAddress.toLowerCase()) {
          return "sent";
        } else if (
          tx.receiverWallet?.toLowerCase() === walletAddress.toLowerCase()
        ) {
          return "received";
        }
      }

      return "sent";
    },
    [walletAddress]
  );

  const toggleExpanded = useCallback((txId: string) => {
    setExpandedTransactions((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(txId)) {
        newExpanded.delete(txId);
      } else {
        newExpanded.add(txId);
      }
      return newExpanded;
    });
  }, []);

  // Memoized transaction list with new transaction indicators
  const transactionList = useMemo(() => {
    return transactions.map((tx, index) => {
      const txHash = tx.hash || tx.transactionHash;
      const isNew = newTransactionHashes.has(txHash);

      return (
        <TransactionRow
          key={`${tx._id || tx.id || tx.hash}-${index}`}
          tx={tx}
          index={index}
          walletAddress={walletAddress}
          copied={copied}
          setCopied={setCopied}
          expandedTransactions={expandedTransactions}
          toggleExpanded={toggleExpanded}
          copyToClipboard={copyToClipboard}
          formatDateTime={formatDateTime}
          getTransactionDirection={getTransactionDirection}
          isNew={isNew}
        />
      );
    });
  }, [
    transactions,
    newTransactionHashes,
    walletAddress,
    copied,
    expandedTransactions,
    toggleExpanded,
    copyToClipboard,
    formatDateTime,
    getTransactionDirection,
  ]);

  if (initialLoading) {
    return (
      <div className={`flex flex-col min-h-0 ${className}`}>
        <SkeletonTransactionHistory />
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Header with smart monitoring indicator */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-base font-semibold text-white font-mayeka-demi-bold-demo">
            {title}
          </h3>
          {/* Smart monitoring indicator - more subtle */}
          <div
            className="w-1.5 h-1.5 bg-blue-400 rounded-full opacity-60"
            title="Smart monitoring active"
          ></div>
        </div>

        {showRefresh && (
          <button
            onClick={handleManualRefresh}
            className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#E2AF19] border-t-transparent rounded-full animate-spin mb-3"></div>
            <span className="text-gray-400 text-sm font-satoshi">
              Loading transactions...
            </span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
              <Calendar size={20} className="text-gray-400" />
            </div>
            <h3 className="text-white text-base font-satoshi mb-1.5">
              No transactions found
            </h3>
            <p className="text-gray-400 text-sm font-satoshi text-center max-w-sm">
              {tokenFilter || transactionTypeFilter
                ? "Try adjusting your filters to see more results"
                : "Your transaction history will appear here once you make your first transaction"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">{transactionList}</div>
        )}
      </div>

      <style>{`
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
