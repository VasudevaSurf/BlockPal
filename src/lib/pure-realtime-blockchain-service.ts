// src/lib/pure-realtime-blockchain-service.ts - FIXED timestamp handling
import { EventEmitter } from "events";

export interface BlockchainData {
  walletAddress: string;
  ethBalance: string;
  ethBalanceWei: string;
  ethPriceUSD: number;
  totalValue: number;
  tokens: Array<{
    id: string;
    symbol: string;
    name: string;
    balance: number;
    balanceRaw: string;
    value: number;
    price: number;
    change24h: number;
    logoUrl?: string;
    contractAddress: string;
    decimals: number;
  }>;
  lastBlockNumber: number;
  lastUpdated: Date;
  dataHash: string;
}

export interface BalanceChange {
  type: "increase" | "decrease" | "new_token" | "token_removed";
  amount: number;
  token?: string;
  fromBalance: number;
  toBalance: number;
  timestamp: Date;
}

export interface PureRealtimeConfig {
  pollInterval: number;
  deepScanInterval: number;
  priceUpdateInterval: number;
  enableBlockNumberTracking: boolean;
  enableMemoryOptimization: boolean;
  maxHistoryLength: number;
  balanceChangeThreshold: number;
}

export class PureRealtimeBlockchainService extends EventEmitter {
  private activeWalletAddress: string | null = null;
  private currentData: BlockchainData | null = null;
  private previousData: BlockchainData | null = null;

  // Polling intervals
  private blockchainPollInterval: NodeJS.Timeout | null = null;
  private deepScanInterval: NodeJS.Timeout | null = null;
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  // State tracking
  private isMonitoring = false;
  private lastKnownBlock = 0;
  private changeHistory: BalanceChange[] = [];
  private retryCount = 0;
  private errorCount = 0;

  // Performance tracking
  private apiCallCount = 0;
  private lastApiReset = Date.now();

  private config: PureRealtimeConfig = {
    pollInterval: 8000,
    deepScanInterval: 30000,
    priceUpdateInterval: 60000,
    enableBlockNumberTracking: true,
    enableMemoryOptimization: true,
    maxHistoryLength: 50,
    balanceChangeThreshold: 0.0001,
  };

  constructor(config?: Partial<PureRealtimeConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.setupPerformanceTracking();
    this.setupCleanup();
  }

  // FIXED: Helper function to ensure Date objects
  private ensureDate(timestamp: any): Date {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === "string") {
      return new Date(timestamp);
    }
    if (typeof timestamp === "number") {
      return new Date(timestamp);
    }
    return new Date(); // Fallback to current time
  }

  // Start pure blockchain monitoring
  startMonitoring(walletAddress: string) {
    console.log(
      "🚀 Starting PURE real-time blockchain monitoring for:",
      walletAddress
    );

    this.activeWalletAddress = walletAddress;
    this.stopMonitoring();

    // Reset state
    this.currentData = null;
    this.previousData = null;
    this.lastKnownBlock = 0;
    this.changeHistory = [];
    this.retryCount = 0;
    this.errorCount = 0;

    // Start monitoring processes
    this.startBlockchainPolling();
    this.startDeepScanning();
    this.startPriceUpdating();

    this.isMonitoring = true;
    console.log("✅ Pure blockchain monitoring started");

    this.emit("monitoring_started", { walletAddress });
  }

  // Stop all monitoring
  stopMonitoring() {
    console.log("🛑 Stopping pure blockchain monitoring");

    if (this.blockchainPollInterval) {
      clearInterval(this.blockchainPollInterval);
      this.blockchainPollInterval = null;
    }

    if (this.deepScanInterval) {
      clearInterval(this.deepScanInterval);
      this.deepScanInterval = null;
    }

    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }

    this.isMonitoring = false;
    this.emit("monitoring_stopped");
  }

  // Start main blockchain polling
  private startBlockchainPolling() {
    console.log(
      `⏰ Starting blockchain polling every ${this.config.pollInterval}ms`
    );

    // Initial scan
    this.scanBlockchainData();

    this.blockchainPollInterval = setInterval(() => {
      this.scanBlockchainData();
    }, this.config.pollInterval);
  }

  // Start deep token scanning
  private startDeepScanning() {
    console.log(
      `🔍 Starting deep scanning every ${this.config.deepScanInterval}ms`
    );

    this.deepScanInterval = setInterval(() => {
      this.performDeepScan();
    }, this.config.deepScanInterval);
  }

  // Start price updating
  private startPriceUpdating() {
    console.log(
      `💰 Starting price updates every ${this.config.priceUpdateInterval}ms`
    );

    this.priceUpdateInterval = setInterval(() => {
      this.updateTokenPrices();
    }, this.config.priceUpdateInterval);
  }

  // Main blockchain scanning function
  private async scanBlockchainData(isDeepScan = false) {
    if (!this.activeWalletAddress) return;

    try {
      console.log(
        `📡 ${isDeepScan ? "Deep scanning" : "Scanning"} blockchain data...`
      );
      this.incrementApiCall();

      // Get current block number for change detection
      let currentBlock = 0;
      if (this.config.enableBlockNumberTracking) {
        currentBlock = await this.getCurrentBlockNumber();
      }

      // Check if we need to scan based on block changes
      if (
        currentBlock > 0 &&
        currentBlock === this.lastKnownBlock &&
        !isDeepScan
      ) {
        console.log("📊 No new blocks, skipping scan");
        return;
      }

      // FIXED: Fetch wallet data with better error handling
      const [ethBalanceData, walletTokensData] = await Promise.all([
        this.fetchETHBalanceFromBlockchain(this.activeWalletAddress),
        this.fetchWalletTokensFromBlockchain(this.activeWalletAddress),
      ]);

      // FIXED: Better token processing
      const processedTokens = this.processTokenData(
        walletTokensData.tokens || []
      );

      // FIXED: Calculate total value including ETH
      const totalValue = this.calculateTotalValue(
        ethBalanceData,
        processedTokens
      );

      // Create new blockchain data
      const newData: BlockchainData = {
        walletAddress: this.activeWalletAddress,
        ethBalance: ethBalanceData.formatted || "0",
        ethBalanceWei: ethBalanceData.wei || "0",
        ethPriceUSD: ethBalanceData.priceUSD || 0,
        totalValue,
        tokens: processedTokens,
        lastBlockNumber: currentBlock,
        lastUpdated: new Date(), // Always create new Date object
        dataHash: this.generateDataHash(ethBalanceData, processedTokens),
      };

      console.log("📊 Blockchain scan completed:", {
        ethBalance: newData.ethBalance,
        ethPrice: newData.ethPriceUSD,
        tokensCount: newData.tokens.length,
        totalValue: newData.totalValue.toFixed(4),
        lastUpdated: newData.lastUpdated.toISOString(),
      });

      // Detect and process changes
      this.processDataChanges(newData);

      // Update state
      this.previousData = this.currentData;
      this.currentData = newData;
      this.lastKnownBlock = currentBlock;

      // Reset error count on success
      this.errorCount = 0;
      this.retryCount = 0;
    } catch (error) {
      console.error("❌ Error scanning blockchain data:", error);
      this.handleScanError(error);
    }
  }

  // FIXED: Process token data with better formatting
  private processTokenData(rawTokens: any[]): BlockchainData["tokens"] {
    return rawTokens.map((token, index) => {
      const balance =
        typeof token.balance === "number"
          ? token.balance
          : parseFloat(token.balanceFormatted || token.balance || "0");

      const price =
        typeof token.price === "number"
          ? token.price
          : parseFloat(token.priceUSD || token.price || "0");

      const value = balance * price;

      return {
        id: token.contractAddress || `token-${index}`,
        symbol: token.symbol || "UNKNOWN",
        name: token.name || "Unknown Token",
        balance,
        balanceRaw: token.balanceRaw || token.tokenBalance || "0",
        value,
        price,
        change24h:
          typeof token.change24h === "number"
            ? token.change24h
            : parseFloat(token.change24h || "0"),
        logoUrl: token.logoUrl || token.icon,
        contractAddress: token.contractAddress || "",
        decimals: token.decimals || 18,
      };
    });
  }

  // Fetch ETH balance directly from blockchain
  private async fetchETHBalanceFromBlockchain(address: string) {
    const response = await fetch(
      `/api/blockchain/eth-balance?address=${address}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ETH balance: ${response.status}`);
    }

    const data = await response.json();
    console.log("🔷 ETH balance fetched:", {
      formatted: data.formatted,
      priceUSD: data.priceUSD,
      valueUSD: data.valueUSD,
    });

    return data;
  }

  // Fetch tokens directly from blockchain
  private async fetchWalletTokensFromBlockchain(address: string) {
    const response = await fetch(
      `/api/blockchain/wallet-tokens?address=${address}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch wallet tokens: ${response.status}`);
    }

    const data = await response.json();
    console.log("🪙 Wallet tokens fetched:", {
      tokenCount: data.tokens?.length || 0,
      totalValue: data.totalValue || 0,
    });

    return data;
  }

  // Get current block number
  private async getCurrentBlockNumber(): Promise<number> {
    try {
      const response = await fetch("/api/blockchain/current-block", {
        credentials: "include",
      });

      if (!response.ok) return 0;

      const data = await response.json();
      return data.blockNumber || 0;
    } catch (error) {
      console.warn("⚠️ Could not fetch current block number:", error);
      return 0;
    }
  }

  // FIXED: Calculate total portfolio value including ETH
  private calculateTotalValue(ethBalance: any, tokens: any[]): number {
    const ethValue =
      parseFloat(ethBalance.formatted || "0") * (ethBalance.priceUSD || 0);
    const tokensValue = tokens.reduce(
      (sum, token) => sum + (token.value || 0),
      0
    );
    const total = ethValue + tokensValue;

    console.log("💰 Portfolio value calculation:", {
      ethBalance: ethBalance.formatted,
      ethPrice: ethBalance.priceUSD,
      ethValue: ethValue.toFixed(4),
      tokensValue: tokensValue.toFixed(4),
      totalValue: total.toFixed(4),
    });

    return total;
  }

  // Generate data hash for change detection
  private generateDataHash(ethBalance: any, tokens: any[]): string {
    const ethPart = `${ethBalance.wei || "0"}`;
    const tokensPart = tokens
      .map((t) => `${t.contractAddress}:${t.balanceRaw}:${t.price}`)
      .join("|");
    const combined = `${ethPart}:${tokensPart}`;
    return btoa(combined).slice(0, 20);
  }

  // Process and detect data changes
  private processDataChanges(newData: BlockchainData) {
    if (!this.previousData) {
      console.log("📊 Initial blockchain data loaded");
      this.emit("data_loaded", { data: newData, isInitial: true });
      return;
    }

    const changes = this.detectChanges(this.previousData, newData);

    if (changes.length > 0) {
      console.log(`🔍 Detected ${changes.length} blockchain changes:`, changes);

      // Add to history
      this.changeHistory = [...changes, ...this.changeHistory].slice(
        0,
        this.config.maxHistoryLength
      );

      // Emit specific change events
      changes.forEach((change) => {
        this.emit("balance_change", { change, data: newData });

        if (
          change.type === "increase" &&
          change.amount > this.config.balanceChangeThreshold
        ) {
          this.emit("funds_received", {
            amount: change.amount,
            token: change.token,
            data: newData,
          });
        } else if (
          change.type === "decrease" &&
          change.amount > this.config.balanceChangeThreshold
        ) {
          this.emit("funds_sent", {
            amount: change.amount,
            token: change.token,
            data: newData,
          });
        } else if (change.type === "new_token") {
          this.emit("new_token_detected", {
            token: change.token,
            data: newData,
          });
        } else if (change.type === "token_removed") {
          this.emit("token_removed", {
            token: change.token,
            data: newData,
          });
        }
      });

      // Emit general update
      this.emit("data_updated", {
        data: newData,
        previousData: this.previousData,
        changes,
        changeCount: changes.length,
      });
    } else {
      // Even if no changes, emit periodic update for UI refresh
      this.emit("data_refreshed", { data: newData });
    }
  }

  // Detect specific changes between data sets
  private detectChanges(
    oldData: BlockchainData,
    newData: BlockchainData
  ): BalanceChange[] {
    const changes: BalanceChange[] = [];

    // Check ETH balance changes
    if (oldData.ethBalanceWei !== newData.ethBalanceWei) {
      const oldETH = parseFloat(oldData.ethBalance);
      const newETH = parseFloat(newData.ethBalance);
      const diff = newETH - oldETH;

      if (Math.abs(diff) > this.config.balanceChangeThreshold) {
        changes.push({
          type: diff > 0 ? "increase" : "decrease",
          amount: Math.abs(diff),
          token: "ETH",
          fromBalance: oldETH,
          toBalance: newETH,
          timestamp: new Date(), // Always create new Date object
        });
      }
    }

    // Check token changes
    const oldTokenMap = new Map(
      oldData.tokens.map((t) => [t.contractAddress, t])
    );
    const newTokenMap = new Map(
      newData.tokens.map((t) => [t.contractAddress, t])
    );

    // Check for new tokens
    newData.tokens.forEach((newToken) => {
      if (!oldTokenMap.has(newToken.contractAddress)) {
        changes.push({
          type: "new_token",
          amount: newToken.balance,
          token: newToken.symbol,
          fromBalance: 0,
          toBalance: newToken.balance,
          timestamp: new Date(), // Always create new Date object
        });
      }
    });

    // Check for removed tokens
    oldData.tokens.forEach((oldToken) => {
      if (!newTokenMap.has(oldToken.contractAddress)) {
        changes.push({
          type: "token_removed",
          amount: oldToken.balance,
          token: oldToken.symbol,
          fromBalance: oldToken.balance,
          toBalance: 0,
          timestamp: new Date(), // Always create new Date object
        });
      }
    });

    // Check for token balance changes
    newData.tokens.forEach((newToken) => {
      const oldToken = oldTokenMap.get(newToken.contractAddress);
      if (oldToken && oldToken.balanceRaw !== newToken.balanceRaw) {
        const diff = newToken.balance - oldToken.balance;

        if (Math.abs(diff) > this.config.balanceChangeThreshold) {
          changes.push({
            type: diff > 0 ? "increase" : "decrease",
            amount: Math.abs(diff),
            token: newToken.symbol,
            fromBalance: oldToken.balance,
            toBalance: newToken.balance,
            timestamp: new Date(), // Always create new Date object
          });
        }
      }
    });

    return changes;
  }

  // Perform deep scan for new tokens
  private async performDeepScan() {
    console.log("🔍 Performing deep blockchain scan...");
    await this.scanBlockchainData(true);
  }

  // Update token prices
  private async updateTokenPrices() {
    if (!this.currentData) return;

    console.log("💰 Updating token prices...");

    try {
      // Update prices for all tokens
      const updatedTokens = await Promise.all(
        this.currentData.tokens.map(async (token) => {
          try {
            const priceData = await this.fetchTokenPrice(token.contractAddress);
            return {
              ...token,
              price: priceData.current_price || token.price,
              change24h:
                priceData.price_change_percentage_24h || token.change24h,
              value: token.balance * (priceData.current_price || token.price),
            };
          } catch (error) {
            console.warn(
              `⚠️ Could not update price for ${token.symbol}:`,
              error
            );
            return token;
          }
        })
      );

      // FIXED: Update ETH price too
      let updatedEthPrice = this.currentData.ethPriceUSD;
      try {
        const ethPriceResponse = await fetch(
          "/api/blockchain/eth-balance?address=" + this.activeWalletAddress,
          {
            credentials: "include",
          }
        );
        if (ethPriceResponse.ok) {
          const ethData = await ethPriceResponse.json();
          updatedEthPrice = ethData.priceUSD || this.currentData.ethPriceUSD;
        }
      } catch (error) {
        console.warn("⚠️ Could not update ETH price:", error);
      }

      // Update current data with new prices
      this.currentData = {
        ...this.currentData,
        tokens: updatedTokens,
        ethPriceUSD: updatedEthPrice,
        totalValue: this.calculateTotalValue(
          {
            formatted: this.currentData.ethBalance,
            wei: this.currentData.ethBalanceWei,
            priceUSD: updatedEthPrice,
          },
          updatedTokens
        ),
        lastUpdated: new Date(), // Always create new Date object
      };

      this.emit("prices_updated", { data: this.currentData });
    } catch (error) {
      console.error("❌ Error updating token prices:", error);
    }
  }

  // Fetch token price
  private async fetchTokenPrice(contractAddress: string) {
    const response = await fetch(
      `/api/blockchain/token-price?contract=${contractAddress}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch token price: ${response.status}`);
    }

    return response.json();
  }

  // Handle scan errors with retry logic
  private handleScanError(error: any) {
    this.errorCount++;
    this.retryCount++;

    console.error(`❌ Blockchain scan error (${this.errorCount}):`, error);

    if (this.retryCount <= 3) {
      console.log(`🔄 Retrying in 5 seconds... (${this.retryCount}/3)`);
      setTimeout(() => {
        this.scanBlockchainData();
      }, 5000);
    } else {
      console.error("❌ Max retries reached, continuing with regular polling");
      this.retryCount = 0;
    }

    this.emit("scan_error", { error, errorCount: this.errorCount });
  }

  // Performance tracking
  private setupPerformanceTracking() {
    setInterval(() => {
      const now = Date.now();
      const timeDiff = now - this.lastApiReset;

      if (timeDiff >= 60000) {
        // Reset every minute
        console.log(
          `📊 API Performance: ${this.apiCallCount} calls in ${timeDiff}ms`
        );
        this.apiCallCount = 0;
        this.lastApiReset = now;
      }
    }, 60000);
  }

  // Cleanup on destroy
  private setupCleanup() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.stopMonitoring();
      });
    }
  }

  // Utility functions
  private incrementApiCall() {
    this.apiCallCount++;
  }

  // Public API
  getCurrentData(): BlockchainData | null {
    return this.currentData;
  }

  getChangeHistory(): BalanceChange[] {
    return [...this.changeHistory];
  }

  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  // FIXED: Ensure proper timestamp handling in status
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      walletAddress: this.activeWalletAddress,
      lastBlock: this.lastKnownBlock,
      lastUpdated: this.currentData?.lastUpdated || null,
      changeCount: this.changeHistory.length,
      errorCount: this.errorCount,
      apiCallsPerMinute: this.apiCallCount,
      dataAge: this.currentData
        ? Date.now() - this.ensureDate(this.currentData.lastUpdated).getTime()
        : null,
    };
  }

  updateConfig(newConfig: Partial<PureRealtimeConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Restart monitoring with new config if currently monitoring
    if (this.isMonitoring && this.activeWalletAddress) {
      this.startMonitoring(this.activeWalletAddress);
    }
  }

  // Force refresh
  async forceRefresh(): Promise<void> {
    if (!this.activeWalletAddress) return;

    console.log("🔄 Force refreshing blockchain data...");
    await this.scanBlockchainData(true);
  }

  // Cleanup
  destroy() {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const pureRealtimeBlockchainService = new PureRealtimeBlockchainService({
  pollInterval: 6000, // 6 seconds - good balance
  deepScanInterval: 25000, // 25 seconds
  priceUpdateInterval: 45000, // 45 seconds
  enableBlockNumberTracking: true,
  enableMemoryOptimization: true,
  maxHistoryLength: 100,
  balanceChangeThreshold: 0.0001, // Very sensitive
});
