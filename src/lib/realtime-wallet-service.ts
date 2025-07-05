// src/lib/realtime-wallet-service.ts - Real-time wallet balance service
import { EventEmitter } from "events";

export interface WalletBalanceUpdate {
  walletId: string;
  address: string;
  balance: number;
  tokenCount: number;
  tokens: Array<{
    symbol: string;
    balance: number;
    value: number;
    change24h: number;
    price: number;
  }>;
  lastUpdated: Date;
}

export interface RealtimeWalletServiceConfig {
  pollInterval: number; // in milliseconds
  enableWebSocket: boolean;
  maxRetries: number;
}

export class RealtimeWalletService extends EventEmitter {
  private wallets: Map<string, { id: string; address: string; name: string }> =
    new Map();
  private balances: Map<string, WalletBalanceUpdate> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private websocket: WebSocket | null = null;
  private isPolling = false;
  private retryCount = 0;

  private config: RealtimeWalletServiceConfig = {
    pollInterval: 10000, // 10 seconds
    enableWebSocket: true,
    maxRetries: 3,
  };

  constructor(config?: Partial<RealtimeWalletServiceConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Start real-time monitoring for wallets
  startMonitoring(
    wallets: Array<{ id: string; address: string; name: string }>
  ) {
    console.log(
      "🚀 Starting real-time wallet monitoring for",
      wallets.length,
      "wallets"
    );

    // Update wallet list
    this.wallets.clear();
    wallets.forEach((wallet) => {
      this.wallets.set(wallet.id, wallet);
    });

    // Stop any existing monitoring
    this.stopMonitoring();

    // Start WebSocket connection if enabled
    if (this.config.enableWebSocket) {
      this.initializeWebSocket();
    }

    // Start polling
    this.startPolling();
  }

  // Stop all real-time monitoring
  stopMonitoring() {
    console.log("🛑 Stopping real-time wallet monitoring");

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isPolling = false;
  }

  // Initialize WebSocket connection (for future use with real WebSocket server)
  private initializeWebSocket() {
    try {
      // For now, we'll skip WebSocket since you don't have a WebSocket server
      // But this is where you'd connect to your real-time service
      console.log("📡 WebSocket support ready (not implemented yet)");

      /* Future implementation:
      this.websocket = new WebSocket('wss://your-websocket-server.com');
      
      this.websocket.onopen = () => {
        console.log('✅ WebSocket connected');
        // Subscribe to wallet updates
        this.wallets.forEach(wallet => {
          this.websocket?.send(JSON.stringify({
            type: 'subscribe',
            walletAddress: wallet.address
          }));
        });
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'balance_update') {
          this.handleBalanceUpdate(data.walletId, data.update);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.websocket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        // Attempt to reconnect
        if (this.retryCount < this.config.maxRetries) {
          this.retryCount++;
          setTimeout(() => this.initializeWebSocket(), 5000);
        }
      };
      */
    } catch (error) {
      console.error("❌ WebSocket initialization failed:", error);
    }
  }

  // Start polling for balance updates
  private startPolling() {
    if (this.isPolling) return;

    this.isPolling = true;
    console.log(
      `⏰ Starting balance polling every ${this.config.pollInterval}ms`
    );

    // Initial fetch
    this.fetchAllBalances();

    // Set up polling interval
    this.pollInterval = setInterval(() => {
      this.fetchAllBalances();
    }, this.config.pollInterval);
  }

  // Fetch balances for all monitored wallets
  private async fetchAllBalances() {
    const promises = Array.from(this.wallets.values()).map(async (wallet) => {
      try {
        const balanceUpdate = await this.fetchWalletBalance(wallet);
        if (balanceUpdate) {
          this.handleBalanceUpdate(wallet.id, balanceUpdate);
        }
      } catch (error) {
        console.error(`❌ Error fetching balance for ${wallet.name}:`, error);
      }
    });

    await Promise.all(promises);
  }

  // Fetch balance for a single wallet
  private async fetchWalletBalance(wallet: {
    id: string;
    address: string;
    name: string;
  }): Promise<WalletBalanceUpdate | null> {
    try {
      const response = await fetch(
        `/api/wallets/tokens?walletAddress=${wallet.address}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        walletId: wallet.id,
        address: wallet.address,
        balance: data.totalValue || 0,
        tokenCount: data.tokens?.length || 0,
        tokens:
          data.tokens?.map((token: any) => ({
            symbol: token.symbol,
            balance: token.balance,
            value: token.value,
            change24h: token.change24h,
            price: token.price,
          })) || [],
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(
        `❌ Failed to fetch balance for wallet ${wallet.address}:`,
        error
      );
      return null;
    }
  }

  // Handle balance update
  private handleBalanceUpdate(walletId: string, update: WalletBalanceUpdate) {
    const previousBalance = this.balances.get(walletId);
    const hasChanged =
      !previousBalance ||
      previousBalance.balance !== update.balance ||
      previousBalance.tokenCount !== update.tokenCount;

    if (hasChanged) {
      this.balances.set(walletId, update);

      console.log(
        `💰 Balance updated for wallet ${walletId}: $${update.balance.toFixed(
          2
        )} (${update.tokenCount} tokens)`
      );

      // Emit events for different types of changes
      this.emit("balance_updated", {
        walletId,
        update,
        previousBalance,
        changeAmount: previousBalance
          ? update.balance - previousBalance.balance
          : 0,
      });

      // Emit specific events
      if (previousBalance && update.balance > previousBalance.balance) {
        this.emit("balance_increased", {
          walletId,
          update,
          increase: update.balance - previousBalance.balance,
        });
      } else if (previousBalance && update.balance < previousBalance.balance) {
        this.emit("balance_decreased", {
          walletId,
          update,
          decrease: previousBalance.balance - update.balance,
        });
      }

      // Emit token count changes
      if (previousBalance && update.tokenCount !== previousBalance.tokenCount) {
        this.emit("token_count_changed", {
          walletId,
          update,
          previousCount: previousBalance.tokenCount,
          newCount: update.tokenCount,
        });
      }
    }
  }

  // Get current balance for a wallet
  getBalance(walletId: string): WalletBalanceUpdate | null {
    return this.balances.get(walletId) || null;
  }

  // Get all current balances
  getAllBalances(): Map<string, WalletBalanceUpdate> {
    return new Map(this.balances);
  }

  // Force refresh a specific wallet
  async refreshWallet(walletId: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const update = await this.fetchWalletBalance(wallet);
    if (update) {
      this.handleBalanceUpdate(walletId, update);
    }
  }

  // Update polling interval
  updatePollInterval(interval: number) {
    this.config.pollInterval = interval;
    if (this.isPolling) {
      this.stopMonitoring();
      this.startPolling();
    }
  }

  // Check if monitoring is active
  isActive(): boolean {
    return this.isPolling;
  }

  // Get monitoring status
  getStatus() {
    return {
      isPolling: this.isPolling,
      hasWebSocket: !!this.websocket,
      walletsCount: this.wallets.size,
      pollInterval: this.config.pollInterval,
      lastUpdate: Math.max(
        ...Array.from(this.balances.values()).map((b) =>
          b.lastUpdated.getTime()
        )
      ),
    };
  }
}

// Export singleton instance
export const realtimeWalletService = new RealtimeWalletService({
  pollInterval: 15000, // 15 seconds - reasonable for real-time without overwhelming the API
  enableWebSocket: false, // Disable for now since no WebSocket server
  maxRetries: 3,
});
