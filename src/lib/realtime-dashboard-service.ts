// src/lib/realtime-dashboard-service.ts - Enhanced Real-time dashboard service (NOTIFICATIONS DISABLED)
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
  pollInterval: number; // in milliseconds
  backgroundRefreshInterval: number; // in milliseconds for background updates
  maxRetries: number;
  enableBackgroundRefresh: boolean;
  enableVisibilityDetection: boolean; // Pause when tab is not visible
  enableNotifications: boolean; // NEW: Control notifications
}

export class RealtimeDashboardService extends EventEmitter {
  private activeWalletAddress: string | null = null;
  private dashboardData: DashboardData | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private backgroundInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private isVisible = true;
  private retryCount = 0;

  private config: RealtimeDashboardConfig = {
    pollInterval: 15000, // 15 seconds for active refresh
    backgroundRefreshInterval: 30000, // 30 seconds for background refresh
    maxRetries: 3,
    enableBackgroundRefresh: true,
    enableVisibilityDetection: true,
    enableNotifications: false, // DISABLED: Turn off notifications by default
  };

  constructor(config?: Partial<RealtimeDashboardConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Set up visibility change detection
    if (
      this.config.enableVisibilityDetection &&
      typeof document !== "undefined"
    ) {
      this.setupVisibilityDetection();
    }
  }

  // Start real-time monitoring for active wallet
  startMonitoring(walletAddress: string) {
    console.log(
      "🚀 Starting real-time dashboard monitoring for wallet:",
      walletAddress
    );

    this.activeWalletAddress = walletAddress;
    this.stopMonitoring();

    // Initial fetch
    this.fetchDashboardData();

    // Start main polling
    this.startPolling();

    // Start background refresh if enabled
    if (this.config.enableBackgroundRefresh) {
      this.startBackgroundRefresh();
    }
  }

  // Stop all monitoring
  stopMonitoring() {
    console.log("🛑 Stopping real-time dashboard monitoring");

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }

    this.isPolling = false;
  }

  // Setup visibility detection to pause/resume monitoring
  private setupVisibilityDetection() {
    const handleVisibilityChange = () => {
      this.isVisible = !document.hidden;
      console.log(
        `👁️ Tab visibility changed: ${this.isVisible ? "visible" : "hidden"}`
      );

      if (this.isVisible && this.activeWalletAddress) {
        // Tab became visible - resume monitoring and do immediate refresh
        this.fetchDashboardData();
        if (!this.isPolling) {
          this.startPolling();
        }
      } else if (!this.isVisible) {
        // Tab became hidden - keep background refresh only
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          this.isPolling = false;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  // Start main polling (active when tab is visible)
  private startPolling() {
    if (this.isPolling || !this.activeWalletAddress) return;

    this.isPolling = true;
    console.log(
      `⏰ Starting active dashboard polling every ${this.config.pollInterval}ms`
    );

    this.pollInterval = setInterval(() => {
      if (this.isVisible) {
        this.fetchDashboardData();
      }
    }, this.config.pollInterval);
  }

  // Start background refresh (continues even when tab is hidden)
  private startBackgroundRefresh() {
    if (this.backgroundInterval || !this.activeWalletAddress) return;

    console.log(
      `🔄 Starting background refresh every ${this.config.backgroundRefreshInterval}ms`
    );

    this.backgroundInterval = setInterval(() => {
      // Background refresh runs regardless of visibility
      this.fetchDashboardData(true);
    }, this.config.backgroundRefreshInterval);
  }

  // Fetch dashboard data
  private async fetchDashboardData(isBackground = false) {
    if (!this.activeWalletAddress) return;

    try {
      const [tokensResponse, balanceResponse] = await Promise.all([
        fetch(`/api/wallets/tokens?walletAddress=${this.activeWalletAddress}`, {
          credentials: "include",
        }),
        fetch(
          `/api/wallets/balance?walletAddress=${this.activeWalletAddress}`,
          {
            credentials: "include",
          }
        ),
      ]);

      if (!tokensResponse.ok || !balanceResponse.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const tokensData = await tokensResponse.json();
      const balanceData = await balanceResponse.json();

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

        console.log(
          `💰 Dashboard data updated${
            isBackground ? " (background)" : ""
          }: $${newDashboardData.totalValue.toFixed(2)} (${
            newDashboardData.tokens.length
          } tokens)`
        );

        // Emit update event
        this.emit("dashboard_updated", {
          data: newDashboardData,
          previousData,
          isBackground,
          changeAmount: previousData
            ? newDashboardData.totalValue - previousData.totalValue
            : 0,
        });

        // COMMENTED OUT: Disable specific change event notifications
        // These events are what trigger the pop-up notifications
        if (this.config.enableNotifications && previousData) {
          // if (newDashboardData.totalValue > previousData.totalValue) {
          //   this.emit("portfolio_increased", {
          //     data: newDashboardData,
          //     increase: newDashboardData.totalValue - previousData.totalValue,
          //   });
          // } else if (newDashboardData.totalValue < previousData.totalValue) {
          //   this.emit("portfolio_decreased", {
          //     data: newDashboardData,
          //     decrease: previousData.totalValue - newDashboardData.totalValue,
          //   });
          // }
          // if (newDashboardData.tokens.length !== previousData.tokens.length) {
          //   this.emit("token_count_changed", {
          //     data: newDashboardData,
          //     previousCount: previousData.tokens.length,
          //     newCount: newDashboardData.tokens.length,
          //   });
          // }
        }
      } else if (!isBackground) {
        console.log("📊 Dashboard data unchanged");
      }

      // Reset retry count on success
      this.retryCount = 0;
    } catch (error) {
      console.error(`❌ Error fetching dashboard data:`, error);
      this.retryCount++;

      if (this.retryCount <= this.config.maxRetries) {
        console.log(
          `🔄 Retrying dashboard fetch (${this.retryCount}/${this.config.maxRetries})`
        );
        setTimeout(() => this.fetchDashboardData(isBackground), 5000);
      } else {
        console.error("❌ Max retries reached for dashboard fetch");
        // COMMENTED OUT: Disable error notifications too
        // this.emit("fetch_error", { error, retryCount: this.retryCount });
      }
    }
  }

  // Check if data has meaningfully changed
  private hasDataChanged(newData: DashboardData): boolean {
    if (!this.dashboardData) return true;

    const oldData = this.dashboardData;

    // Check if total value changed significantly (more than $0.01)
    if (Math.abs(newData.totalValue - oldData.totalValue) > 0.01) {
      return true;
    }

    // Check if wallet balance changed significantly
    if (Math.abs(newData.walletBalance - oldData.walletBalance) > 0.01) {
      return true;
    }

    // Check if token count changed
    if (newData.tokens.length !== oldData.tokens.length) {
      return true;
    }

    // Check if any individual token balance changed significantly
    for (const newToken of newData.tokens) {
      const oldToken = oldData.tokens.find((t) => t.id === newToken.id);
      if (!oldToken) {
        return true; // New token
      }

      if (Math.abs(newToken.value - oldToken.value) > 0.01) {
        return true; // Token value changed
      }

      if (Math.abs(newToken.balance - oldToken.balance) > 0.000001) {
        return true; // Token balance changed
      }

      if (Math.abs(newToken.price - oldToken.price) > 0.000001) {
        return true; // Token price changed
      }
    }

    return false;
  }

  // Get current dashboard data
  getData(): DashboardData | null {
    return this.dashboardData;
  }

  // Force refresh dashboard data
  async refreshDashboard(): Promise<void> {
    if (!this.activeWalletAddress) {
      throw new Error("No active wallet to refresh");
    }

    console.log("🔄 Force refreshing dashboard data");
    await this.fetchDashboardData();
  }

  // Update wallet address being monitored
  updateWallet(walletAddress: string) {
    if (this.activeWalletAddress === walletAddress) return;

    console.log("🔄 Switching dashboard monitoring to wallet:", walletAddress);
    this.startMonitoring(walletAddress);
  }

  // Update configuration
  updateConfig(config: Partial<RealtimeDashboardConfig>) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    console.log("⚙️ Dashboard service config updated:", config);

    // Restart monitoring if intervals changed
    if (
      config.pollInterval &&
      config.pollInterval !== oldConfig.pollInterval &&
      this.activeWalletAddress
    ) {
      this.startMonitoring(this.activeWalletAddress);
    }
  }

  // Enable/disable notifications
  enableNotifications(enabled: boolean) {
    this.config.enableNotifications = enabled;
    console.log(`🔔 Notifications ${enabled ? "enabled" : "disabled"}`);
  }

  // Check if monitoring is active
  isActive(): boolean {
    return this.isPolling || !!this.backgroundInterval;
  }

  // Get monitoring status
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
      dataAge: this.dashboardData
        ? Date.now() - this.dashboardData.lastUpdated.getTime()
        : null,
      notificationsEnabled: this.config.enableNotifications,
    };
  }

  // Cleanup when service is destroyed
  destroy() {
    this.stopMonitoring();
    this.removeAllListeners();

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", () => {});
    }
  }
}

// Export singleton instance with notifications disabled
export const realtimeDashboardService = new RealtimeDashboardService({
  pollInterval: 10000, // 10 seconds - faster for better real-time experience
  backgroundRefreshInterval: 15000, // 15 seconds for background
  enableBackgroundRefresh: true,
  enableVisibilityDetection: true,
  maxRetries: 3,
  enableNotifications: false, // DISABLED: Turn off all pop-up notifications
});
