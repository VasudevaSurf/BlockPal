// src/components/transactions/TransactionHistory.tsx - WITH REAL-TIME COINGECKO PRICES
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
  CheckCircle,
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
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  from?: string;
  to?: string;
  value?: string;
  asset?: string;
  rawContract?: any;
  metadata?: any;
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
  source?: string;
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
  useDatabase?: boolean;
}

// REAL-TIME PRICE SERVICE using CoinGecko API
class CoinGeckoPriceService {
  private static instance: CoinGeckoPriceService;
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private priceUpdateListeners = new Map<string, Function[]>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();
  private lastRequestTime = 0;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly RATE_LIMIT_DELAY = 1100; // 1.1 seconds between requests
  private readonly BATCH_SIZE = 250; // CoinGecko allows up to 250 ids per request

  // CoinGecko ID mapping for tokens
  private readonly TOKEN_TO_COINGECKO_ID: Record<string, string> = {
    ETH: "ethereum",
    ETHEREUM: "ethereum",
    BTC: "bitcoin",
    WBTC: "wrapped-bitcoin",
    USDT: "tether",
    USDC: "usd-coin",
    DAI: "dai",
    BUSD: "binance-usd",
    LINK: "chainlink",
    UNI: "uniswap",
    AAVE: "aave",
    COMP: "compound-governance-token",
    MKR: "maker",
    SNX: "havven",
    YFI: "yearn-finance",
    SUSHI: "sushi",
    CRV: "curve-dao-token",
    BAL: "balancer",
    "1INCH": "1inch",
    LDO: "lido-dao",
    ENS: "ethereum-name-service",
    APE: "apecoin",
    SAND: "the-sandbox",
    MANA: "decentraland",
    AXS: "axie-infinity",
    SHIB: "shiba-inu",
    DOGE: "dogecoin",
    MATIC: "matic-network",
    BNB: "binancecoin",
    ADA: "cardano",
    SOL: "solana",
    DOT: "polkadot",
    AVAX: "avalanche-2",
    ATOM: "cosmos",
    NEAR: "near",
    FTM: "fantom",
    ALGO: "algorand",
    XTZ: "tezos",
    WETH: "weth",
    "USDT.e": "tether",
    "USDC.e": "usd-coin",
  };

  static getInstance(): CoinGeckoPriceService {
    if (!CoinGeckoPriceService.instance) {
      CoinGeckoPriceService.instance = new CoinGeckoPriceService();
    }
    return CoinGeckoPriceService.instance;
  }

  // Get CoinGecko ID for a token symbol
  private getCoinGeckoId(symbol: string): string | null {
    const upperSymbol = symbol.toUpperCase();
    return this.TOKEN_TO_COINGECKO_ID[upperSymbol] || null;
  }

  // Check if price is cached and still valid
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.priceCache.get(cacheKey);
    if (!cached) return false;

    const now = Date.now();
    return now - cached.timestamp < this.CACHE_DURATION;
  }

  // Rate limiting for CoinGecko API
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  // Fetch prices from CoinGecko API
  private async fetchPricesFromAPI(
    coinIds: string[]
  ): Promise<Record<string, number>> {
    try {
      await this.enforceRateLimit();

      const idsString = coinIds.join(",");
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=false&precision=6`;

      console.log(
        `🦎 CoinGecko: Fetching prices for ${coinIds.length} tokens:`,
        coinIds
      );

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("🦎 CoinGecko: Rate limit hit, using cached prices");
          return {};
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const prices: Record<string, number> = {};

      // Convert CoinGecko response to our format
      Object.entries(data).forEach(([coinId, priceData]: [string, any]) => {
        if (priceData && priceData.usd) {
          prices[coinId] = priceData.usd;
        }
      });

      console.log(
        `🦎 CoinGecko: Successfully fetched ${
          Object.keys(prices).length
        } prices`
      );
      return prices;
    } catch (error) {
      console.error("🦎 CoinGecko: API fetch failed:", error);
      return {};
    }
  }

  // Queue system for batching requests
  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Process all queued requests
      const requests = [...this.requestQueue];
      this.requestQueue = [];

      await Promise.all(requests.map((request) => request()));
    } catch (error) {
      console.error("🦎 CoinGecko: Queue processing failed:", error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Get single token price
  async getTokenPrice(symbol: string, timestamp?: string): Promise<number> {
    const coinId = this.getCoinGeckoId(symbol);

    if (!coinId) {
      console.warn(`🦎 CoinGecko: Unknown token symbol: ${symbol}`);
      return 0;
    }

    const cacheKey = `${coinId}-current`;

    // Return cached price if valid
    if (this.isCacheValid(cacheKey)) {
      const cached = this.priceCache.get(cacheKey)!;
      return cached.price;
    }

    // Add to queue for batched fetching
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        try {
          const prices = await this.fetchPricesFromAPI([coinId]);
          const price = prices[coinId] || 0;

          // Cache the price
          this.priceCache.set(cacheKey, {
            price,
            timestamp: Date.now(),
          });

          // Notify listeners
          this.notifyPriceListeners(symbol, price);

          resolve(price);
        } catch (error) {
          console.error(
            `🦎 CoinGecko: Error fetching price for ${symbol}:`,
            error
          );
          resolve(0);
        }
      });

      // Process queue with slight delay to allow batching
      setTimeout(() => this.processRequestQueue(), 50);
    });
  }

  // Get multiple token prices in a single request
  async getMultipleTokenPrices(
    symbols: string[]
  ): Promise<Record<string, number>> {
    const coinIds: string[] = [];
    const symbolToCoinId: Record<string, string> = {};

    // Map symbols to CoinGecko IDs
    symbols.forEach((symbol) => {
      const coinId = this.getCoinGeckoId(symbol);
      if (coinId) {
        coinIds.push(coinId);
        symbolToCoinId[symbol] = coinId;
      }
    });

    if (coinIds.length === 0) {
      return {};
    }

    // Check cache first
    const results: Record<string, number> = {};
    const uncachedCoinIds: string[] = [];

    coinIds.forEach((coinId) => {
      const cacheKey = `${coinId}-current`;
      if (this.isCacheValid(cacheKey)) {
        const cached = this.priceCache.get(cacheKey)!;
        // Find symbol for this coinId
        const symbol = Object.keys(symbolToCoinId).find(
          (s) => symbolToCoinId[s] === coinId
        );
        if (symbol) {
          results[symbol] = cached.price;
        }
      } else {
        uncachedCoinIds.push(coinId);
      }
    });

    // Fetch uncached prices
    if (uncachedCoinIds.length > 0) {
      try {
        const prices = await this.fetchPricesFromAPI(uncachedCoinIds);

        // Process results and update cache
        Object.entries(prices).forEach(([coinId, price]) => {
          const cacheKey = `${coinId}-current`;
          this.priceCache.set(cacheKey, {
            price,
            timestamp: Date.now(),
          });

          // Find symbol for this coinId
          const symbol = Object.keys(symbolToCoinId).find(
            (s) => symbolToCoinId[s] === coinId
          );
          if (symbol) {
            results[symbol] = price;
            this.notifyPriceListeners(symbol, price);
          }
        });
      } catch (error) {
        console.error("🦎 CoinGecko: Batch price fetch failed:", error);
      }
    }

    return results;
  }

  // Subscribe to price updates for a token
  subscribeToPriceUpdates(
    symbol: string,
    callback: (price: number) => void
  ): () => void {
    const upperSymbol = symbol.toUpperCase();

    if (!this.priceUpdateListeners.has(upperSymbol)) {
      this.priceUpdateListeners.set(upperSymbol, []);
    }

    this.priceUpdateListeners.get(upperSymbol)!.push(callback);

    // Start periodic updates for this token
    this.startPriceUpdates(symbol);

    // Return unsubscribe function
    return () => {
      const listeners = this.priceUpdateListeners.get(upperSymbol);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
          this.stopPriceUpdates(symbol);
        }
      }
    };
  }

  // Start periodic price updates
  private startPriceUpdates(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();

    if (this.updateIntervals.has(upperSymbol)) {
      return; // Already updating
    }

    const interval = setInterval(async () => {
      try {
        const price = await this.getTokenPrice(symbol);
        this.notifyPriceListeners(symbol, price);
      } catch (error) {
        console.error(`🦎 CoinGecko: Auto-update failed for ${symbol}:`, error);
      }
    }, this.CACHE_DURATION);

    this.updateIntervals.set(upperSymbol, interval);
  }

  // Stop periodic price updates
  private stopPriceUpdates(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    const interval = this.updateIntervals.get(upperSymbol);

    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(upperSymbol);
    }
  }

  // Notify price update listeners
  private notifyPriceListeners(symbol: string, price: number): void {
    const upperSymbol = symbol.toUpperCase();
    const listeners = this.priceUpdateListeners.get(upperSymbol);

    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(price);
        } catch (error) {
          console.error(
            `🦎 CoinGecko: Listener callback failed for ${symbol}:`,
            error
          );
        }
      });
    }
  }

  // Clear old cache entries
  private cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.priceCache.entries());

    entries.forEach(([key, value]) => {
      if (now - value.timestamp > this.CACHE_DURATION * 2) {
        this.priceCache.delete(key);
      }
    });
  }

  // Cleanup method
  cleanup(): void {
    // Clear all intervals
    this.updateIntervals.forEach((interval) => clearInterval(interval));
    this.updateIntervals.clear();

    // Clear listeners
    this.priceUpdateListeners.clear();

    // Cleanup old cache
    this.cleanupCache();
  }
}

// DATABASE-ONLY Transaction Service for Batch Payments Page
class DatabaseTransactionService {
  private static instance: DatabaseTransactionService;
  private lastKnownTransactions = new Map<string, Set<string>>();
  private backgroundMonitors = new Map<string, NodeJS.Timeout>();
  private listeners = new Map<string, Function[]>();
  private isMonitoring = new Map<string, boolean>();
  private priceService = CoinGeckoPriceService.getInstance();

  private readonly QUICK_CHECK_INTERVAL = 5000;
  private readonly BACKGROUND_CHECK_INTERVAL = 30000;

  static getInstance(): DatabaseTransactionService {
    if (!DatabaseTransactionService.instance) {
      DatabaseTransactionService.instance = new DatabaseTransactionService();
    }
    return DatabaseTransactionService.instance;
  }

  subscribeToTransactions(
    walletAddress: string,
    callback: (transactions: Transaction[], isNewTransaction: boolean) => void
  ): () => void {
    const key = walletAddress;

    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    this.listeners.get(key)!.push(callback);

    if (!this.isMonitoring.get(key)) {
      this.startDatabaseMonitoring(walletAddress);
    }

    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }

        if (callbacks.length === 0) {
          this.stopMonitoring(key);
        }
      }
    };
  }

  private async fetchDatabaseTransactions(
    walletAddress: string
  ): Promise<Transaction[]> {
    console.log(
      "📊 Database Service: Fetching transactions for",
      walletAddress
    );

    try {
      const response = await fetch(
        `/api/transactions?walletAddress=${walletAddress}&limit=100`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Database fetch failed: ${response.status}`);
      }

      const data = await response.json();
      const transactions = data.transactions || [];

      console.log(`📊 Database transactions found: ${transactions.length}`);

      // Process transactions with real-time pricing
      const processedTransactions = await this.processTransactionsWithPricing(
        transactions,
        walletAddress
      );

      return processedTransactions;
    } catch (error) {
      console.error("❌ Database transaction fetch failed:", error);
      return [];
    }
  }

  private async processTransactionsWithPricing(
    transactions: any[],
    walletAddress: string
  ): Promise<Transaction[]> {
    // Extract all unique token symbols
    const tokenSymbols = new Set<string>();

    transactions.forEach((tx) => {
      if (tx.tokenSymbol) {
        tokenSymbols.add(tx.tokenSymbol);
      }
      if (tx.transfers) {
        tx.transfers.forEach((transfer: any) => {
          if (transfer.tokenSymbol) {
            tokenSymbols.add(transfer.tokenSymbol);
          }
        });
      }
    });

    // Fetch all prices in batch
    const prices = await this.priceService.getMultipleTokenPrices(
      Array.from(tokenSymbols)
    );
    console.log("💰 Database: Fetched prices for tokens:", prices);

    // Process each transaction
    return transactions.map((tx: any) => {
      const processedTx = {
        ...tx,
        type: this.detectBatchType(tx),
        category:
          tx.category ||
          (this.isBatchTransaction(tx) ? "batch_transfer" : "regular"),
        direction: this.determineDirection(tx, walletAddress),
        isBatch: this.isBatchTransaction(tx),
        batchInfo: this.getBatchInfo(tx),
        source: "database",
      };

      // Update main transaction value with real-time pricing
      if (tx.tokenSymbol && tx.amount) {
        const price = prices[tx.tokenSymbol] || 0;
        const amount = parseFloat(tx.amount) || 0;
        processedTx.valueUSD = amount * price;
      }

      // Update individual transfer values for batch transactions
      if (tx.transfers && Array.isArray(tx.transfers)) {
        processedTx.transfers = tx.transfers.map((transfer: any) => ({
          ...transfer,
          usdValue:
            transfer.tokenSymbol && transfer.amount
              ? (parseFloat(transfer.amount) || 0) *
                (prices[transfer.tokenSymbol] || 0)
              : 0,
        }));

        // Calculate total USD value for batch
        processedTx.totalValueUSD = processedTx.transfers.reduce(
          (sum: number, transfer: any) => sum + (transfer.usdValue || 0),
          0
        );
        processedTx.valueUSD = processedTx.totalValueUSD;
      }

      return processedTx;
    });
  }

  private isBatchTransaction(tx: any): boolean {
    return !!(
      tx.type === "batch" ||
      tx.category === "batch_transfer" ||
      tx.transferMode === "BATCH" ||
      tx.transferMode === "MIXED" ||
      tx.totalTransfers > 1 ||
      (tx.transfers && tx.transfers.length > 1) ||
      tx.batchSize > 0 ||
      (typeof tx.type === "string" && tx.type.includes("batch"))
    );
  }

  private detectBatchType(tx: any): string {
    if (this.isBatchTransaction(tx)) {
      return "batch";
    }
    return tx.type || "simple";
  }

  private getBatchInfo(tx: any): string | null {
    if (!this.isBatchTransaction(tx)) return null;

    const transferCount =
      tx.totalTransfers || tx.transfers?.length || tx.batchSize || 0;
    const uniqueTokens = new Set(
      tx.transfers?.map((t: any) => t.tokenSymbol) || []
    );
    const tokenCount = uniqueTokens.size;

    if (tokenCount <= 1) {
      const tokenSymbol = Array.from(uniqueTokens)[0] || "Unknown";
      return `${transferCount} ${tokenSymbol} transfers`;
    } else {
      return `${transferCount} transfers (${tokenCount} tokens)`;
    }
  }

  private determineDirection(
    tx: any,
    walletAddress: string
  ): "sent" | "received" {
    if (tx.direction) return tx.direction;
    if (tx.isReceived) return "received";

    const from = (tx.from || tx.senderWallet || "").toLowerCase();
    const to = (tx.to || tx.receiverWallet || "").toLowerCase();
    const wallet = walletAddress.toLowerCase();

    if (from === wallet) return "sent";
    if (to === wallet) return "received";
    return "sent";
  }

  private async startDatabaseMonitoring(walletAddress: string) {
    const key = walletAddress;

    if (this.isMonitoring.get(key)) return;

    this.isMonitoring.set(key, true);
    console.log("🔍 Database Monitor: Starting for", key);

    const initialTransactions = await this.fetchDatabaseTransactions(
      walletAddress
    );
    this.updateKnownTransactions(key, initialTransactions);
    this.notifyListeners(key, initialTransactions, false);

    this.scheduleNextCheck(walletAddress, this.QUICK_CHECK_INTERVAL);
  }

  private scheduleNextCheck(walletAddress: string, interval: number) {
    const key = walletAddress;

    if (!this.isMonitoring.get(key)) return;

    if (this.backgroundMonitors.has(key)) {
      clearTimeout(this.backgroundMonitors.get(key)!);
    }

    const monitor = setTimeout(async () => {
      if (!this.isMonitoring.get(key)) return;

      try {
        const latestTransactions = await this.fetchDatabaseTransactions(
          walletAddress
        );
        const hasNewTransactions = this.detectNewTransactions(
          key,
          latestTransactions
        );

        if (hasNewTransactions) {
          console.log("✨ Database Monitor: New transaction detected!");
          this.updateKnownTransactions(key, latestTransactions);
          this.notifyListeners(key, latestTransactions, true);

          this.scheduleNextCheck(walletAddress, this.QUICK_CHECK_INTERVAL);
        } else {
          this.scheduleNextCheck(walletAddress, this.BACKGROUND_CHECK_INTERVAL);
        }
      } catch (error) {
        console.error("❌ Database Monitor: Background check failed", error);
        this.scheduleNextCheck(walletAddress, this.BACKGROUND_CHECK_INTERVAL);
      }
    }, interval);

    this.backgroundMonitors.set(key, monitor);
  }

  private detectNewTransactions(
    key: string,
    newTransactions: Transaction[]
  ): boolean {
    const knownHashes = this.lastKnownTransactions.get(key) || new Set();
    const newHashes = new Set(
      newTransactions.map((tx) => tx.hash || tx.transactionHash).filter(Boolean)
    );

    for (const hash of newHashes) {
      if (!knownHashes.has(hash)) {
        return true;
      }
    }

    return false;
  }

  private updateKnownTransactions(key: string, transactions: Transaction[]) {
    const hashes = new Set(
      transactions.map((tx) => tx.hash || tx.transactionHash).filter(Boolean)
    );
    this.lastKnownTransactions.set(key, hashes);
  }

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
          console.error("❌ Database Monitor: Listener callback failed", error);
        }
      });
    }
  }

  private stopMonitoring(key: string) {
    console.log("🛑 Database Monitor: Stopping monitoring for", key);

    this.isMonitoring.set(key, false);

    if (this.backgroundMonitors.has(key)) {
      clearTimeout(this.backgroundMonitors.get(key)!);
      this.backgroundMonitors.delete(key);
    }

    this.lastKnownTransactions.delete(key);
    this.listeners.delete(key);
  }

  async manualRefresh(walletAddress: string): Promise<Transaction[]> {
    console.log("🔄 Database Monitor: Manual refresh requested");

    const transactions = await this.fetchDatabaseTransactions(walletAddress);
    this.updateKnownTransactions(walletAddress, transactions);

    if (this.isMonitoring.get(walletAddress)) {
      this.scheduleNextCheck(walletAddress, this.QUICK_CHECK_INTERVAL);
    }

    return transactions;
  }
}

// ALCHEMY-ONLY Transaction Service for Token Overview Page
class AlchemyTransactionService {
  private static instance: AlchemyTransactionService;
  private lastKnownTransactions = new Map<string, Set<string>>();
  private backgroundMonitors = new Map<string, NodeJS.Timeout>();
  private listeners = new Map<string, Function[]>();
  private isMonitoring = new Map<string, boolean>();
  private methodSignatureCache = new Map<string, any>();
  private priceService = CoinGeckoPriceService.getInstance();

  private readonly QUICK_CHECK_INTERVAL = 8000;
  private readonly BACKGROUND_CHECK_INTERVAL = 45000;

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

  static getInstance(): AlchemyTransactionService {
    if (!AlchemyTransactionService.instance) {
      AlchemyTransactionService.instance = new AlchemyTransactionService();
    }
    return AlchemyTransactionService.instance;
  }

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

    if (!this.isMonitoring.get(key)) {
      this.startAlchemyMonitoring(walletAddress, contractAddress);
    }

    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }

        if (callbacks.length === 0) {
          this.stopMonitoring(key);
        }
      }
    };
  }

  private async fetchAlchemyTransactions(
    walletAddress: string,
    contractAddress: string
  ): Promise<Transaction[]> {
    console.log("🔗 Alchemy Service: Fetching transactions for", {
      walletAddress,
      contractAddress,
    });

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
        throw new Error(`Alchemy fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Alchemy fetch failed");
      }

      console.log(
        `🔗 Alchemy transactions found: ${data.transactions?.length || 0}`
      );

      return this.processAlchemyTransactions(
        data.transactions || [],
        walletAddress
      );
    } catch (error) {
      console.error("❌ Alchemy transaction fetch failed:", error);
      return [];
    }
  }

  private async processAlchemyTransactions(
    transactions: any[],
    walletAddress: string
  ): Promise<Transaction[]> {
    const BATCH_SIZE = 3;
    const processedTransactions: Transaction[] = [];

    // Extract unique token symbols for batch price fetching
    const tokenSymbols = new Set<string>();
    transactions.forEach((tx) => {
      const tokenSymbol =
        tx.asset ||
        (!tx.contractAddress || tx.contractAddress === "native"
          ? "ETH"
          : "Unknown");
      if (tokenSymbol && tokenSymbol !== "Unknown") {
        tokenSymbols.add(tokenSymbol);
      }
    });

    // Fetch all prices at once
    const prices = await this.priceService.getMultipleTokenPrices(
      Array.from(tokenSymbols)
    );
    console.log("💰 Alchemy: Fetched prices for tokens:", prices);

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (tx, batchIndex) => {
          const index = i + batchIndex;
          const isETH = !tx.contractAddress || tx.contractAddress === "native";
          const direction = this.determineDirection(tx, walletAddress);
          const transactionType = await this.detectTransactionType(tx);
          const tokenSymbol = tx.asset || (isETH ? "ETH" : "Unknown");

          const amount = parseFloat(this.formatAmount(tx.value, 18)) || 0;
          const tokenPrice = prices[tokenSymbol] || 0;
          const valueUSD = amount * tokenPrice;

          console.log(
            `💰 Token ${tokenSymbol}: ${amount} × ${tokenPrice} = ${valueUSD.toFixed(
              2
            )}`
          );

          return Object.freeze({
            _id: `alchemy-${tx.hash}-${index}`,
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
            source: "alchemy",
          });
        })
      );

      processedTransactions.push(...batchResults);

      if (i + BATCH_SIZE < transactions.length && transactions.length > 20) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return processedTransactions;
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

  private detectTransactionType = async (tx: any): Promise<string> => {
    const cacheKey = `${tx.hash}-type`;
    if (this.methodSignatureCache.has(cacheKey)) {
      return this.methodSignatureCache.get(cacheKey);
    }

    try {
      if (tx.category === "erc20" && tx.input) {
        const methodSig = this.getMethodSignature(tx.input);

        if (methodSig && this.KNOWN_METHODS[methodSig]) {
          const method = this.KNOWN_METHODS[methodSig];

          if (method.type === "transfer" && methodSig === "0xa9059cbb") {
            const result = tx.direction === "sent" ? "Sent" : "Received";
            this.methodSignatureCache.set(cacheKey, result);
            return result;
          }

          this.methodSignatureCache.set(cacheKey, method.name);
          return method.name;
        }
      }

      if (!tx.input || tx.input === "0x") {
        const result = tx.direction === "sent" ? "Sent" : "Received";
        this.methodSignatureCache.set(cacheKey, result);
        return result;
      }

      const methodSig = this.getMethodSignature(tx.input);

      if (methodSig && this.KNOWN_METHODS[methodSig]) {
        const method = this.KNOWN_METHODS[methodSig];

        if (method.type === "transfer" && methodSig === "0xa9059cbb") {
          const result = tx.direction === "sent" ? "Sent" : "Received";
          this.methodSignatureCache.set(cacheKey, result);
          return result;
        }

        this.methodSignatureCache.set(cacheKey, method.name);
        return method.name;
      }

      const result = "Contract Interaction";
      this.methodSignatureCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Error detecting transaction type for ${tx.hash}:`, error);
      const result = tx.direction === "sent" ? "Sent" : "Received";
      this.methodSignatureCache.set(cacheKey, result);
      return result;
    }
  };

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

  private async startAlchemyMonitoring(
    walletAddress: string,
    contractAddress: string
  ) {
    const key = `${walletAddress}-${contractAddress}`;

    if (this.isMonitoring.get(key)) return;

    this.isMonitoring.set(key, true);
    console.log("🔍 Alchemy Monitor: Starting for", key);

    const initialTransactions = await this.fetchAlchemyTransactions(
      walletAddress,
      contractAddress
    );
    this.updateKnownTransactions(key, initialTransactions);
    this.notifyListeners(key, initialTransactions, false);

    this.scheduleNextCheck(
      walletAddress,
      contractAddress,
      this.QUICK_CHECK_INTERVAL
    );
  }

  private scheduleNextCheck(
    walletAddress: string,
    contractAddress: string,
    interval: number
  ) {
    const key = `${walletAddress}-${contractAddress}`;

    if (!this.isMonitoring.get(key)) return;

    if (this.backgroundMonitors.has(key)) {
      clearTimeout(this.backgroundMonitors.get(key)!);
    }

    const monitor = setTimeout(async () => {
      if (!this.isMonitoring.get(key)) return;

      try {
        const latestTransactions = await this.fetchAlchemyTransactions(
          walletAddress,
          contractAddress
        );
        const hasNewTransactions = this.detectNewTransactions(
          key,
          latestTransactions
        );

        if (hasNewTransactions) {
          console.log("✨ Alchemy Monitor: New transaction detected!");
          this.updateKnownTransactions(key, latestTransactions);
          this.notifyListeners(key, latestTransactions, true);

          this.scheduleNextCheck(
            walletAddress,
            contractAddress,
            this.QUICK_CHECK_INTERVAL
          );
        } else {
          this.scheduleNextCheck(
            walletAddress,
            contractAddress,
            this.BACKGROUND_CHECK_INTERVAL
          );
        }
      } catch (error) {
        console.error("❌ Alchemy Monitor: Background check failed", error);
        this.scheduleNextCheck(
          walletAddress,
          contractAddress,
          this.BACKGROUND_CHECK_INTERVAL
        );
      }
    }, interval);

    this.backgroundMonitors.set(key, monitor);
  }

  private detectNewTransactions(
    key: string,
    newTransactions: Transaction[]
  ): boolean {
    const knownHashes = this.lastKnownTransactions.get(key) || new Set();
    const newHashes = new Set(
      newTransactions.map((tx) => tx.hash || tx.transactionHash).filter(Boolean)
    );

    for (const hash of newHashes) {
      if (!knownHashes.has(hash)) {
        return true;
      }
    }

    return false;
  }

  private updateKnownTransactions(key: string, transactions: Transaction[]) {
    const hashes = new Set(
      transactions.map((tx) => tx.hash || tx.transactionHash).filter(Boolean)
    );
    this.lastKnownTransactions.set(key, hashes);
  }

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
          console.error("❌ Alchemy Monitor: Listener callback failed", error);
        }
      });
    }
  }

  private stopMonitoring(key: string) {
    console.log("🛑 Alchemy Monitor: Stopping monitoring for", key);

    this.isMonitoring.set(key, false);

    if (this.backgroundMonitors.has(key)) {
      clearTimeout(this.backgroundMonitors.get(key)!);
      this.backgroundMonitors.delete(key);
    }

    this.lastKnownTransactions.delete(key);
    this.listeners.delete(key);
  }

  async manualRefresh(
    walletAddress: string,
    contractAddress: string
  ): Promise<Transaction[]> {
    console.log("🔄 Alchemy Monitor: Manual refresh requested");

    const transactions = await this.fetchAlchemyTransactions(
      walletAddress,
      contractAddress
    );
    const key = `${walletAddress}-${contractAddress}`;
    this.updateKnownTransactions(key, transactions);

    if (this.isMonitoring.get(key)) {
      this.scheduleNextCheck(
        walletAddress,
        contractAddress,
        this.QUICK_CHECK_INTERVAL
      );
    }

    return transactions;
  }
}

// Token styling helpers
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

// Optimized TokenIcon component
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

// Get batch transaction info
const getBatchTransactionInfo = (tx: Transaction) => {
  const isBatch = !!(
    tx.type === "batch" ||
    tx.category === "batch_transfer" ||
    tx.transferMode === "BATCH" ||
    tx.transferMode === "MIXED" ||
    tx.totalTransfers > 1 ||
    (tx.transfers && tx.transfers.length > 1) ||
    tx.batchSize > 0 ||
    (typeof tx.type === "string" && tx.type.includes("batch"))
  );

  if (isBatch) {
    const uniqueTokens = new Set(tx.transfers?.map((t) => t.tokenSymbol) || []);
    const tokenCount = uniqueTokens.size;
    const transferCount =
      tx.totalTransfers || tx.transfers?.length || tx.batchSize || 0;
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

// FIXED: Add function to get display type based on your requirements
const getDisplayType = (tx: Transaction): string => {
  const txType = tx.type || "";

  // If it's "Approve", don't show it (return empty string or skip)
  if (txType === "Approve") {
    return ""; // This will cause the transaction to be filtered out
  }

  // If it's Contract Interaction, show same heading
  if (txType === "Contract Interaction") {
    return "Contract Interaction";
  }

  // If it's sent, show "Sent"
  if (
    txType === "Sent" ||
    (tx.direction === "sent" && (txType === "Transfer" || txType === ""))
  ) {
    return "Sent";
  }

  // If it's received, show "Received"
  if (
    txType === "Received" ||
    (tx.direction === "received" && (txType === "Transfer" || txType === ""))
  ) {
    return "Received";
  }

  // For all other types (Swap, etc.), show the actual type
  return txType;
};

// TransactionRow component
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

    // FIXED: Get display type and filter out "Approve" transactions
    const displayType = getDisplayType(tx);

    // Don't render if it's an Approve transaction
    if (displayType === "") {
      return null;
    }

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

            {/* Token Icon Logic: Users icon for multiple tokens, actual token icon for single token batches */}
            {txInfo.isBatch && txInfo.tokenCount > 1 ? (
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-pink-600/40 rounded-full border border-gray-700/50 flex items-center justify-center flex-shrink-0">
                <Users size={12} className="text-white" />
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
                      displayType === "Swap" ||
                      displayType === "Swap ETH" ||
                      displayType === "Swap to ETH"
                        ? "bg-blue-500/20 text-blue-400"
                        : displayType === "Contract Interaction"
                        ? "bg-purple-500/20 text-purple-400"
                        : direction === "sent"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {displayType === "Swap" ||
                    displayType === "Swap ETH" ||
                    displayType === "Swap to ETH" ? (
                      <RefreshCw size={10} />
                    ) : displayType === "Contract Interaction" ? (
                      <Hash size={10} />
                    ) : direction === "sent" ? (
                      <ArrowUpRight size={10} />
                    ) : (
                      <ArrowDownLeft size={10} />
                    )}
                  </div>
                  <span className="text-white font-medium font-satoshi text-sm">
                    {displayType}
                    {isNew && (
                      <span className="text-green-400 ml-1 text-xs">NEW</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Token info and batch details */}
              <div className="text-gray-400 text-xs font-satoshi truncate">
                {txInfo.isBatch ? (
                  <span className="flex items-center space-x-1">
                    <Users size={10} />
                    <span>
                      {txInfo.batchInfo} • {txInfo.tokenCount} token
                      {txInfo.tokenCount > 1 ? "s" : ""}
                    </span>
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
                  <span className="text-gray-300 flex items-center space-x-1">
                    <Users size={12} />
                    <span>{txInfo.displayAmount} transfers</span>
                  </span>
                ) : (
                  <span>
                    {direction === "received" ? "+" : ""}
                    {txInfo.displayAmount} {txInfo.displaySymbol}
                  </span>
                )}
              </div>

              {(tx.valueUSD || txInfo.displayValue) &&
                (tx.valueUSD > 0.01 || txInfo.displayValue > 0.01) && (
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

        {/* Timestamp and Source Indicator */}
        <div className="mt-2 pt-2 border-t border-[#2C2C2C] flex items-end justify-end">
          <span className="text-gray-400 text-xs font-satoshi">
            {tx.timestamp ? formatDateTime(tx.timestamp) : tx.date}
          </span>
        </div>

        {/* Expanded Details for Batch Transactions */}
        {txInfo.isBatch && isExpanded && tx.transfers && (
          <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
            <div className="space-y-2">
              <div className="text-gray-400 text-xs font-satoshi mb-2 flex items-center space-x-1">
                <Users size={12} />
                <span>Transfer Details ({tx.transfers.length} transfers):</span>
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

// Main component with conditional data sources
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
  useDatabase = false,
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

  const databaseService = useMemo(
    () => DatabaseTransactionService.getInstance(),
    []
  );
  const alchemyService = useMemo(
    () => AlchemyTransactionService.getInstance(),
    []
  );
  const priceService = useMemo(() => CoinGeckoPriceService.getInstance(), []);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  console.log("🔧 TransactionHistory config:", {
    useDatabase,
    isTokenOverview,
    walletAddress: walletAddress?.slice(0, 10),
    contractAddress,
    tokenFilter,
  });

  // Handle transaction updates
  const handleTransactionUpdate = useCallback(
    (newTransactions: Transaction[], isNewTransaction: boolean) => {
      console.log(
        `📡 ${useDatabase ? "Database" : "Alchemy"} Transaction Update:`,
        {
          count: newTransactions.length,
          isNew: isNewTransaction,
          batchCount: newTransactions.filter(
            (tx) =>
              tx.type === "batch" ||
              tx.category === "batch_transfer" ||
              tx.transfers?.length > 0
          ).length,
          source: useDatabase ? "database" : "alchemy",
        }
      );

      // Apply client-side filtering if needed
      let filteredTransactions = newTransactions;

      // FIXED: Filter out "Approve" transactions
      filteredTransactions = filteredTransactions.filter((tx: Transaction) => {
        const displayType = getDisplayType(tx);
        return displayType !== ""; // This filters out Approve transactions
      });

      // FIXED: For batch payments page (database mode) - only show batch transactions and sent direction
      if (useDatabase) {
        filteredTransactions = filteredTransactions.filter(
          (tx: Transaction) => {
            const isBatch = !!(
              tx.type === "batch" ||
              tx.category === "batch_transfer" ||
              tx.transferMode === "BATCH" ||
              tx.transferMode === "MIXED" ||
              tx.totalTransfers > 1 ||
              (tx.transfers && tx.transfers.length > 1) ||
              tx.batchSize > 0 ||
              (typeof tx.type === "string" && tx.type.includes("batch"))
            );

            if (!isBatch) {
              return false;
            }

            const direction =
              tx.direction || (tx.isReceived ? "received" : "sent");
            return direction === "sent";
          }
        );
        console.log(
          `📦 Batch Payments: Filtered to ${filteredTransactions.length} sent batch transactions only`
        );
      }

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

      if (isNewTransaction) {
        const newHashes = new Set(
          filteredTransactions
            .slice(0, 3)
            .map((tx) => tx.hash || tx.transactionHash)
            .filter(Boolean)
        );
        setNewTransactionHashes(newHashes);

        setTimeout(() => {
          setNewTransactionHashes(new Set());
        }, 5000);
      }

      setInitialLoading(false);
    },
    [tokenFilter, transactionTypeFilter, isTokenOverview, useDatabase]
  );

  // Subscribe to appropriate service
  useEffect(() => {
    if (walletAddress) {
      console.log(
        `🔔 Subscribing to ${useDatabase ? "Database" : "Alchemy"} service:`,
        {
          walletAddress,
          contractAddress,
          tokenFilter,
        }
      );

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      let unsubscribe: () => void;

      if (useDatabase) {
        unsubscribe = databaseService.subscribeToTransactions(
          walletAddress,
          handleTransactionUpdate
        );
      } else {
        const targetContract = contractAddress || tokenFilter || "ETH";
        unsubscribe = alchemyService.subscribeToTransactions(
          walletAddress,
          targetContract,
          handleTransactionUpdate
        );
      }

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
    useDatabase,
    databaseService,
    alchemyService,
    handleTransactionUpdate,
  ]);

  // Cleanup price service on unmount
  useEffect(() => {
    return () => {
      priceService.cleanup();
    };
  }, [priceService]);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);

    try {
      let refreshedTransactions: Transaction[];

      if (useDatabase) {
        refreshedTransactions = await databaseService.manualRefresh(
          walletAddress
        );
      } else {
        const targetContract = contractAddress || tokenFilter || "ETH";
        refreshedTransactions = await alchemyService.manualRefresh(
          walletAddress,
          targetContract
        );
      }

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
    useDatabase,
    databaseService,
    alchemyService,
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

  // Memoized transaction list
  const transactionList = useMemo(() => {
    return transactions
      .map((tx, index) => {
        const txHash = tx.hash || tx.transactionHash;
        const isNew = newTransactionHashes.has(txHash);

        const row = (
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

        return row;
      })
      .filter(Boolean); // Remove null rows (filtered out Approve transactions)
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
      {/* Header with service indicator */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-base font-semibold text-white font-mayeka-demi-bold-demo">
            {title}
          </h3>
          {/* Real-time pricing indicator */}
          {/* <div
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-green-400 to-blue-400 opacity-60 animate-pulse"
            title="Real-time pricing via CoinGecko"
          ></div> */}
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
              Loading transactions with real-time prices...
            </span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
              <Calendar size={20} className="text-gray-400" />
            </div>
            <h3 className="text-white text-base font-satoshi mb-1.5">
              No batch transactions found
            </h3>
            <p className="text-gray-400 text-sm font-satoshi text-center max-w-sm">
              {useDatabase
                ? "Your batch payments (multiple recipients) will appear here once you send them"
                : "Your blockchain transactions will appear here"}
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
