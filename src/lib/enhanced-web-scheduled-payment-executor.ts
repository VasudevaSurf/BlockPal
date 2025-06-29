// src/lib/enhanced-web-scheduled-payment-executor.ts (NEW - Enhanced Payment Executor)
import { enhancedScheduledPaymentsService } from "./enhanced-scheduled-payments-service";

interface ScheduledPayment {
  id: string;
  scheduleId: string;
  username: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  recipient: string;
  amount: string;
  frequency: string;
  status: string;
  scheduledFor: string;
  nextExecution?: string;
  executionCount: number;
  maxExecutions: number;
  decimals?: number;
  useEnhancedAPI?: boolean;
}

interface ExecutorStatus {
  isRunning: boolean;
  executorId: string;
  useTestnet: boolean;
  processingPayments: string[];
  executedPayments: string[];
  failedPayments: string[];
  lastCheckTime?: Date;
  nextCheck?: Date;
  enhancedAPI: boolean;
}

class EnhancedWebScheduledPaymentExecutor {
  private isRunning = false;
  private executorId: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private privateKey: string | null = null;
  private useTestnet: boolean = false;
  private processingPayments: Set<string> = new Set();
  private executedPayments: string[] = [];
  private failedPayments: string[] = [];
  private lastCheckTime: Date | null = null;

  constructor() {
    this.executorId = `enhanced_executor_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(
      "🔧 Enhanced Web Scheduled Payment Executor initialized:",
      this.executorId
    );
  }

  // Set private key for transaction signing
  setPrivateKey(privateKey: string) {
    this.privateKey = privateKey;
    console.log("🔑 Enhanced executor private key set");
  }

  // Start the executor
  start() {
    if (this.isRunning) {
      console.log("⚠️ Enhanced executor is already running");
      return;
    }

    if (!this.privateKey) {
      throw new Error(
        "Private key must be set before starting the enhanced executor"
      );
    }

    this.isRunning = true;
    console.log("🚀 Starting Enhanced Web Scheduled Payment Executor...");

    // Check for due payments every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkAndExecutePayments();
    }, 30000);

    // Run initial check
    this.checkAndExecutePayments();

    console.log("✅ Enhanced executor started successfully");
  }

  // Stop the executor
  stop() {
    if (!this.isRunning) {
      console.log("⚠️ Enhanced executor is not running");
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log("🛑 Enhanced Web Scheduled Payment Executor stopped");
  }

  // Get executor status
  getStatus(): ExecutorStatus {
    return {
      isRunning: this.isRunning,
      executorId: this.executorId,
      useTestnet: this.useTestnet,
      processingPayments: Array.from(this.processingPayments),
      executedPayments: this.executedPayments.slice(-10), // Last 10
      failedPayments: this.failedPayments.slice(-10), // Last 10
      lastCheckTime: this.lastCheckTime,
      nextCheck:
        this.isRunning && this.checkInterval
          ? new Date(Date.now() + 30000)
          : undefined,
      enhancedAPI: true,
    };
  }

  // Check for due payments and execute them
  private async checkAndExecutePayments() {
    if (!this.isRunning || !this.privateKey) {
      return;
    }

    this.lastCheckTime = new Date();
    console.log("🔍 Enhanced executor checking for due payments...");

    try {
      // Fetch due payments from the API
      const duePayments = await this.fetchDuePayments();

      if (duePayments.length === 0) {
        console.log("📭 No due payments found (Enhanced API)");
        return;
      }

      console.log(`📋 Found ${duePayments.length} due payments (Enhanced API)`);

      // Process each due payment
      for (const payment of duePayments) {
        if (!this.isRunning) break; // Stop if executor was stopped

        if (this.processingPayments.has(payment.scheduleId)) {
          console.log(`⏭️ Skipping ${payment.scheduleId} - already processing`);
          continue;
        }

        await this.executePayment(payment);
      }
    } catch (error) {
      console.error(
        "❌ Error checking for due payments (Enhanced API):",
        error
      );
    }
  }

  // Fetch due payments from the server
  private async fetchDuePayments(): Promise<ScheduledPayment[]> {
    try {
      const response = await fetch("/api/scheduled-payments?status=active", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const allPayments = data.scheduledPayments || [];

      // Filter for due payments
      const now = new Date();
      const duePayments = allPayments.filter((payment: ScheduledPayment) => {
        const executionTime = new Date(
          payment.nextExecution || payment.scheduledFor
        );
        const timeDiff = executionTime.getTime() - now.getTime();

        // Execute if due within 5 minutes
        return timeDiff <= 5 * 60 * 1000 && timeDiff >= -5 * 60 * 1000;
      });

      return duePayments;
    } catch (error) {
      console.error("❌ Error fetching due payments (Enhanced API):", error);
      return [];
    }
  }

  // Execute a single scheduled payment
  private async executePayment(payment: ScheduledPayment) {
    const scheduleId = payment.scheduleId;

    if (this.processingPayments.has(scheduleId)) {
      console.log(`⏭️ Payment ${scheduleId} is already being processed`);
      return;
    }

    this.processingPayments.add(scheduleId);
    console.log(`🚀 Executing scheduled payment (Enhanced API): ${scheduleId}`);

    try {
      // Execute using enhanced API
      const result =
        await enhancedScheduledPaymentsService.executeScheduledPayment(
          {
            name: payment.tokenName,
            symbol: payment.tokenSymbol,
            contractAddress: payment.contractAddress,
            decimals: payment.decimals || 18,
            isETH:
              payment.contractAddress === "native" ||
              payment.tokenSymbol === "ETH",
          },
          payment.walletAddress,
          payment.recipient,
          payment.amount,
          this.privateKey!
        );

      if (result.success) {
        console.log(`✅ Enhanced payment executed successfully: ${scheduleId}`);
        console.log(`📊 Transaction: ${result.transactionHash}`);
        console.log(
          `⛽ Gas used: ${result.gasUsed}, Cost: ${result.actualCostUSD}`
        );

        this.executedPayments.push(scheduleId);

        // Update the payment status via API
        await this.updatePaymentStatus(scheduleId, "executed", {
          transactionHash: result.transactionHash,
          gasUsed: result.gasUsed,
          actualCostETH: result.actualCostETH,
          actualCostUSD: result.actualCostUSD,
          enhancedAPI: true,
        });

        // Send notification if browser supports it
        this.sendNotification(
          "Enhanced Payment Executed",
          `Scheduled payment of ${payment.amount} ${payment.tokenSymbol} completed successfully with Enhanced API`
        );
      } else {
        console.error(
          `❌ Enhanced payment execution failed: ${scheduleId}`,
          result.error
        );
        this.failedPayments.push(scheduleId);

        await this.updatePaymentStatus(scheduleId, "failed", {
          error: result.error,
          enhancedAPI: true,
        });

        this.sendNotification(
          "Enhanced Payment Failed",
          `Scheduled payment of ${payment.amount} ${payment.tokenSymbol} failed: ${result.error}`
        );
      }
    } catch (error: any) {
      console.error(
        `💥 Enhanced payment execution error for ${scheduleId}:`,
        error
      );
      this.failedPayments.push(scheduleId);

      await this.updatePaymentStatus(scheduleId, "failed", {
        error: error.message,
        enhancedAPI: true,
      });

      this.sendNotification(
        "Enhanced Payment Error",
        `Scheduled payment execution failed: ${error.message}`
      );
    } finally {
      this.processingPayments.delete(scheduleId);
    }
  }

  // Update payment status via API
  private async updatePaymentStatus(
    scheduleId: string,
    status: string,
    details: any
  ) {
    try {
      const response = await fetch(`/api/scheduled-payments/${scheduleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_status",
          status,
          executionDetails: {
            ...details,
            executedAt: new Date().toISOString(),
            executorId: this.executorId,
          },
        }),
        credentials: "include",
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to update payment status for ${scheduleId}`);
      } else {
        console.log(`✅ Payment status updated for ${scheduleId}: ${status}`);
      }
    } catch (error) {
      console.error(
        `❌ Error updating payment status for ${scheduleId}:`,
        error
      );
    }
  }

  // Send browser notification
  private sendNotification(title: string, body: string) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    }
  }

  // Get processing count
  getProcessingCount(): number {
    return this.processingPayments.size;
  }

  // Get executed count
  getExecutedCount(): number {
    return this.executedPayments.length;
  }

  // Get failed count
  getFailedCount(): number {
    return this.failedPayments.length;
  }

  // Clear history
  clearHistory() {
    this.executedPayments = [];
    this.failedPayments = [];
    console.log("🧹 Enhanced executor history cleared");
  }
}

// Export singleton instance
export const enhancedWebScheduledPaymentExecutor =
  new EnhancedWebScheduledPaymentExecutor();
