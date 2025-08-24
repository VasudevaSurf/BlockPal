// src/lib/realtime-dashboard-service.ts - FIXED VERSION
import { EventEmitter } from "events";

export interface DashboardData {
  walletBalance: number;
  totalValue: number;
  tokens: Array<{
    id: string;
    symbol: string;
    name: string;
    balance: number;
    value: number;
    price: number;
    change24h: number;
    logoUrl?: string;
    contractAddress: string;
  }>;
  lastUpdated: Date;
}

export interface RealtimeDashboardConfig {
  pollInterval: number;
  backgroundRefreshInterval: number;
  maxRetries: number;
  enableBackgroundRefresh: boolean;
  enableVisibilityDetection: boolean;
  enableNotifications: boolean;
}

export class RealtimeDashboardService extends EventEmitter {
  private activeWalletAddress: string | null = null;
  private dashboardData: DashboardData | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private backgroundInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private isVisible = true;
  private retryCount = 0;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;

  private config: RealtimeDashboardConfig = {
    pollInterval: 15000,
    backgroundRefreshInterval: 30000,
    maxRetries: 2, // REDUCED: Lower retry count
    enableBackgroundRefresh: true,
    enableVisibilityDetection: true,
    enableNotifications: false,
  };

  constructor(config?: Partial<RealtimeDashboardConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (
      this.config.enableVisibilityDetection &&
      typeof document !== "undefined"
    ) {
      this.setupVisibilityDetection();
    }
  }

  startMonitoring(walletAddress: string) {
    if (this.activeWalletAddress === walletAddress) {
      console.log("🔄 Already monitoring this wallet, skipping");
      return;
    }

    console.log(
      "🚀 Starting dashboard monitoring for:",
      walletAddress.slice(0, 10) + "..."
    );

    this.activeWalletAddress = walletAddress;
    this.consecutiveErrors = 0; // Reset error count
    this.stopMonitoring();

    // Initial fetch with delay to avoid conflicts
    setTimeout(() => {
      this.fetchDashboardData();
    }, 1000);

    this.startPolling();

    if (this.config.enableBackgroundRefresh) {
      this.startBackgroundRefresh();
    }
  }

  stopMonitoring() {
    console.log("🛑 Stopping dashboard monitoring");

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }

    this.isPolling = false;
    this.retryCount = 0;
  }

  private setupVisibilityDetection() {
    const handleVisibilityChange = () => {
      this.isVisible = !document.hidden;

      if (this.isVisible && this.activeWalletAddress) {
        this.consecutiveErrors = 0; // Reset errors when tab becomes visible
        this.fetchDashboardData();
        if (!this.isPolling) {
          this.startPolling();
        }
      } else if (!this.isVisible) {
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          this.isPolling = false;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  private startPolling() {
    if (this.isPolling || !this.activeWalletAddress) return;

    this.isPolling = true;
    console.log(`⏰ Starting polling every ${this.config.pollInterval}ms`);

    this.pollInterval = setInterval(() => {
      if (
        this.isVisible &&
        this.consecutiveErrors < this.maxConsecutiveErrors
      ) {
        this.fetchDashboardData();
      }
    }, this.config.pollInterval);
  }

  private startBackgroundRefresh() {
    if (this.backgroundInterval || !this.activeWalletAddress) return;

    this.backgroundInterval = setInterval(() => {
      if (this.consecutiveErrors < this.maxConsecutiveErrors) {
        this.fetchDashboardData(true);
      }
    }, this.config.backgroundRefreshInterval);
  }

  private async fetchDashboardData(isBackground = false) {
    if (!this.activeWalletAddress) return;

    // FIXED: Skip if too many consecutive errors
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      console.log("⚠️ Too many errors, skipping dashboard fetch");
      return;
    }

    try {
      // FIXED: Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const [tokensResponse, balanceResponse] = await Promise.allSettled([
        fetch(`/api/wallets/tokens?walletAddress=${this.activeWalletAddress}`, {
          credentials: "include",
          signal: controller.signal,
        }),
        fetch(
          `/api/wallets/balance?walletAddress=${this.activeWalletAddress}`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        ),
      ]);

      clearTimeout(timeoutId);

      // FIXED: Handle partial failures gracefully
      let tokensData = { tokens: [], totalValue: 0 };
      let balanceData = { balance: 0 };

      if (tokensResponse.status === "fulfilled" && tokensResponse.value.ok) {
        try {
          tokensData = await tokensResponse.value.json();
        } catch {
          console.log("⚠️ Failed to parse tokens response, using defaults");
        }
      }

      if (balanceResponse.status === "fulfilled" && balanceResponse.value.ok) {
        try {
          balanceData = await balanceResponse.value.json();
        } catch {
          console.log("⚠️ Failed to parse balance response, using default");
        }
      }

      const newDashboardData: DashboardData = {
        walletBalance: balanceData.balance || 0,
        totalValue: tokensData.totalValue || 0,
        tokens: tokensData.tokens || [],
        lastUpdated: new Date(),
      };

      const hasChanged = this.hasDataChanged(newDashboardData);

      if (hasChanged || !this.dashboardData) {
        const previousData = this.dashboardData;
        this.dashboardData = newDashboardData;

        if (!isBackground) {
          console.log(
            `💰 Dashboard updated: $${newDashboardData.totalValue.toFixed(2)}`
          );
        }

        this.emit("dashboard_updated", {
          data: newDashboardData,
          previousData,
          isBackground,
          changeAmount: previousData
            ? newDashboardData.totalValue - previousData.totalValue
            : 0,
        });
      }

      // FIXED: Reset counters on success
      this.retryCount = 0;
      this.consecutiveErrors = 0;
    } catch (error: any) {
      this.consecutiveErrors++;

      // FIXED: Only log errors occasionally to reduce noise
      if (this.consecutiveErrors <= 2) {
        console.log(
          `⚠️ Dashboard fetch error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`,
          error.message
        );
      }

      // FIXED: Exponential backoff for retries
      if (this.retryCount < this.config.maxRetries && !isBackground) {
        this.retryCount++;
        const backoffDelay = Math.min(
          5000 * Math.pow(2, this.retryCount - 1),
          30000
        );

        setTimeout(() => {
          if (this.activeWalletAddress) {
            this.fetchDashboardData(isBackground);
          }
        }, backoffDelay);
      }

      // FIXED: Stop aggressive polling if too many errors
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.log(
          "🛑 Too many consecutive errors, pausing dashboard monitoring"
        );
        this.stopMonitoring();

        // Try to restart after a longer delay
        setTimeout(() => {
          if (this.activeWalletAddress) {
            this.consecutiveErrors = 0;
            this.startMonitoring(this.activeWalletAddress);
          }
        }, 60000); // 1 minute delay
      }
    }
  }

  private hasDataChanged(newData: DashboardData): boolean {
    if (!this.dashboardData) return true;

    const oldData = this.dashboardData;

    // Check significant changes only
    if (Math.abs(newData.totalValue - oldData.totalValue) > 0.01) {
      return true;
    }

    if (Math.abs(newData.walletBalance - oldData.walletBalance) > 0.01) {
      return true;
    }

    if (newData.tokens.length !== oldData.tokens.length) {
      return true;
    }

    return false;
  }

  getData(): DashboardData | null {
    return this.dashboardData;
  }

  async refreshDashboard(): Promise<void> {
    if (!this.activeWalletAddress) {
      throw new Error("No active wallet to refresh");
    }

    console.log("🔄 Force refreshing dashboard");
    this.consecutiveErrors = 0; // Reset error count for manual refresh
    await this.fetchDashboardData();
  }

  updateWallet(walletAddress: string) {
    if (this.activeWalletAddress === walletAddress) return;

    console.log(
      "🔄 Switching dashboard monitoring to:",
      walletAddress.slice(0, 10) + "..."
    );
    this.startMonitoring(walletAddress);
  }

  updateConfig(config: Partial<RealtimeDashboardConfig>) {
    this.config = { ...this.config, ...config };
    console.log("⚙️ Dashboard config updated");

    if (config.pollInterval && this.activeWalletAddress) {
      this.startMonitoring(this.activeWalletAddress);
    }
  }

  enableNotifications(enabled: boolean) {
    this.config.enableNotifications = enabled;
  }

  isActive(): boolean {
    return this.isPolling || !!this.backgroundInterval;
  }

  getStatus() {
    return {
      isPolling: this.isPolling,
      hasBackgroundRefresh: !!this.backgroundInterval,
      activeWallet: this.activeWalletAddress,
      isVisible: this.isVisible,
      pollInterval: this.config.pollInterval,
      backgroundInterval: this.config.backgroundRefreshInterval,
      lastUpdate: this.dashboardData?.lastUpdated || null,
      retryCount: this.retryCount,
      consecutiveErrors: this.consecutiveErrors,
      dataAge: this.dashboardData
        ? Date.now() - this.dashboardData.lastUpdated.getTime()
        : null,
      notificationsEnabled: this.config.enableNotifications,
    };
  }

  destroy() {
    this.stopMonitoring();
    this.removeAllListeners();

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", () => {});
    }
  }
}

// Export with better configuration
export const realtimeDashboardService = new RealtimeDashboardService({
  pollInterval: 20000, // INCREASED: Less aggressive polling
  backgroundRefreshInterval: 30000,
  enableBackgroundRefresh: true,
  enableVisibilityDetection: true,
  maxRetries: 2, // REDUCED: Fewer retries
  enableNotifications: false,
});
