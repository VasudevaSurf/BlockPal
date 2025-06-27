// src/lib/web-scheduled-payment-executor.ts - FIXED VERSION with proper DB updates
import { scheduledPaymentService } from "./scheduled-payment-service";

interface ScheduledPaymentData {
  id: string;
  scheduleId: string;
  walletAddress: string;
  tokenInfo: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
    isETH: boolean;
  };
  recipient: string;
  amount: string;
  scheduledFor: Date;
  frequency: string;
  status: string;
  nextExecution?: Date;
  executionCount: number;
  maxExecutions: number;
  description?: string;
  createdAt: Date;
  lastExecutionAt?: Date;
  timezone?: string;
}

export class WebScheduledPaymentExecutor {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkInterval = 15000; // Check every 15 seconds for faster execution
  private processingPayments = new Set<string>();
  private executorId = Math.random().toString(36).substr(2, 9);
  private executedPayments = new Set<string>();
  private useTestnet = false;
  private privateKey: string = "";

  constructor(useTestnet: boolean = false) {
    this.useTestnet = useTestnet;
    console.log(
      `🌐 Web Payment Executor initialized (ID: ${this.executorId}, Network: ${
        useTestnet ? "Testnet" : "Mainnet"
      })`
    );
  }

  start() {
    if (this.isRunning) {
      console.log("⚡ Executor already running");
      return;
    }

    console.log(`🚀 Starting payment executor (ID: ${this.executorId})`);
    this.isRunning = true;

    // Run immediately
    this.checkAndExecutePayments();

    // Set up interval - check every 15 seconds
    this.intervalId = setInterval(() => {
      this.checkAndExecutePayments();
    }, this.checkInterval);

    console.log("✅ Executor started - checking every 15 seconds");
  }

  stop() {
    if (!this.isRunning) {
      console.log("⚡ Executor not running");
      return;
    }

    console.log(`🛑 Stopping payment executor (ID: ${this.executorId})`);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.processingPayments.clear();
    this.executedPayments.clear();
    console.log("✅ Executor stopped");
  }

  setPrivateKey(privateKey: string) {
    if (!this.isValidPrivateKey(privateKey)) {
      throw new Error("Invalid private key provided");
    }
    this.privateKey = privateKey;
    console.log("🔑 Private key set for executor");
  }

  private isValidPrivateKey(privateKey: string): boolean {
    try {
      const cleanKey = privateKey.startsWith("0x")
        ? privateKey.slice(2)
        : privateKey;
      if (cleanKey.length !== 64) return false;
      if (!/^[a-fA-F0-9]+$/.test(cleanKey)) return false;
      return true;
    } catch {
      return false;
    }
  }

  private async checkAndExecutePayments() {
    try {
      console.log(`🔍 [${this.executorId}] Checking for due payments...`);

      const response = await fetch("/api/scheduled-payments/due", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("❌ Failed to fetch due payments:", response.status);
        return;
      }

      const data = await response.json();
      const duePayments = data.duePayments || [];

      console.log(
        `📊 [${this.executorId}] Found ${duePayments.length} payments due`
      );

      if (duePayments.length === 0) {
        return;
      }

      if (!this.privateKey) {
        console.warn("⚠️ No private key set for execution");
        return;
      }

      // Filter available payments
      const availablePayments = duePayments.filter(
        (payment: ScheduledPaymentData) => {
          const scheduleId = payment.scheduleId;
          if (this.processingPayments.has(scheduleId)) {
            return false;
          }
          if (this.executedPayments.has(scheduleId)) {
            return false;
          }
          return true;
        }
      );

      console.log(
        `📊 [${this.executorId}] ${availablePayments.length} payments available`
      );

      // Execute each payment
      for (const payment of availablePayments) {
        try {
          await this.executePayment(payment);
        } catch (error) {
          console.error(
            `💥 Error executing payment ${payment.scheduleId}:`,
            error
          );
          this.processingPayments.delete(payment.scheduleId);
        }
      }
    } catch (error) {
      console.error(`💥 Error in payment check:`, error);
    }
  }

  private async executePayment(paymentData: ScheduledPaymentData) {
    const scheduleId = paymentData.scheduleId;

    if (this.processingPayments.has(scheduleId)) {
      return;
    }

    this.processingPayments.add(scheduleId);
    console.log(`⚡ [${this.executorId}] Executing payment: ${scheduleId}`);

    try {
      // STEP 1: Claim the payment (atomic lock)
      console.log(`🔒 [${this.executorId}] Claiming payment ${scheduleId}...`);

      const claimResult = await fetch(
        `/api/scheduled-payments/${scheduleId}/claim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            executorId: this.executorId,
            claimedAt: new Date().toISOString(),
          }),
          credentials: "include",
        }
      );

      const claimData = await claimResult.json();

      if (!claimResult.ok || !claimData.success) {
        console.log(
          `⏩ [${this.executorId}] Could not claim ${scheduleId}: ${claimData.error}`
        );
        return;
      }

      console.log(`✅ [${this.executorId}] Successfully claimed ${scheduleId}`);

      // STEP 2: Execute blockchain transaction
      const scheduleData = {
        id: paymentData.id,
        scheduleId: paymentData.scheduleId,
        walletAddress: paymentData.walletAddress,
        tokenInfo: paymentData.tokenInfo,
        recipient: paymentData.recipient,
        amount: paymentData.amount,
        scheduledFor: new Date(paymentData.scheduledFor),
        frequency: paymentData.frequency as any,
        timezone: paymentData.timezone || "UTC",
        status: paymentData.status as any,
        nextExecution: paymentData.nextExecution
          ? new Date(paymentData.nextExecution)
          : undefined,
        executionCount: paymentData.executionCount,
        maxExecutions: paymentData.maxExecutions,
        description: paymentData.description,
        createdAt: new Date(paymentData.createdAt),
        lastExecutionAt: paymentData.lastExecutionAt
          ? new Date(paymentData.lastExecutionAt)
          : undefined,
      };

      console.log(
        `💰 [${this.executorId}] Executing blockchain transaction...`
      );

      const executionResult =
        await scheduledPaymentService.executeScheduledPayment(
          scheduleData,
          this.privateKey,
          this.useTestnet
        );

      if (executionResult.success) {
        console.log(
          `✅ [${this.executorId}] Blockchain transaction successful!`
        );
        console.log(
          `📤 [${this.executorId}] TX: ${executionResult.transactionHash}`
        );

        // STEP 3: Update database with MULTIPLE retry attempts
        const updateSuccess = await this.updateDatabaseWithRetries(
          scheduleId,
          executionResult,
          5 // 5 retries
        );

        if (updateSuccess) {
          this.executedPayments.add(scheduleId);
          this.showNotification(
            "✅ Payment Executed!",
            `${paymentData.amount} ${paymentData.tokenInfo.symbol} sent successfully`,
            "success"
          );
        } else {
          console.error(
            `❌ [${this.executorId}] All database update attempts failed for ${scheduleId}`
          );
        }
      } else {
        console.error(
          `❌ [${this.executorId}] Blockchain transaction failed: ${executionResult.error}`
        );
        await this.markScheduleAsFailed(scheduleId, executionResult.error);

        this.showNotification(
          "❌ Payment Failed",
          `Transaction failed: ${executionResult.error}`,
          "error"
        );
      }
    } catch (error: any) {
      console.error(`💥 [${this.executorId}] Critical error:`, error);
      await this.markScheduleAsFailed(scheduleId, error.message);

      this.showNotification(
        "💥 Payment Error",
        `Critical error: ${error.message}`,
        "error"
      );
    } finally {
      this.processingPayments.delete(scheduleId);
    }
  }

  // ENHANCED: Multiple retry attempts with different strategies
  private async updateDatabaseWithRetries(
    scheduleId: string,
    executionResult: any,
    maxRetries: number = 5
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `📝 [${this.executorId}] DB update attempt ${attempt}/${maxRetries} for ${scheduleId}`
      );

      try {
        // Strategy 1: Normal update (attempts 1-3)
        if (attempt <= 3) {
          const response = await fetch(
            `/api/scheduled-payments/${scheduleId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "update_after_execution",
                executorId: this.executorId,
                transactionHash: executionResult.transactionHash,
                gasUsed: executionResult.gasUsed,
                blockNumber: executionResult.blockNumber,
                actualCostETH: executionResult.actualCostETH,
                actualCostUSD: executionResult.actualCostUSD,
                executedAt: executionResult.executedAt.toISOString(),
              }),
              credentials: "include",
            }
          );

          const data = await response.json();

          if (response.ok && data.success) {
            console.log(
              `✅ [${this.executorId}] DB update successful on attempt ${attempt}`
            );
            return true;
          } else {
            console.warn(
              `⚠️ [${this.executorId}] Normal update failed: ${data.error}`
            );
          }
        }

        // Strategy 2: Force update (attempts 4-5)
        if (attempt >= 4) {
          console.log(`🔄 [${this.executorId}] Trying force update...`);

          const forceResponse = await fetch(
            `/api/scheduled-payments/${scheduleId}/force-update`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                executorId: this.executorId,
                transactionHash: executionResult.transactionHash,
                gasUsed: executionResult.gasUsed,
                blockNumber: executionResult.blockNumber,
                actualCostETH: executionResult.actualCostETH,
                actualCostUSD: executionResult.actualCostUSD,
                executedAt: executionResult.executedAt.toISOString(),
                forceUpdate: true,
              }),
              credentials: "include",
            }
          );

          const forceData = await forceResponse.json();

          if (forceResponse.ok && forceData.success) {
            console.log(
              `✅ [${this.executorId}] Force update successful on attempt ${attempt}`
            );
            return true;
          } else {
            console.warn(
              `⚠️ [${this.executorId}] Force update failed: ${forceData.error}`
            );
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(
            `⏳ [${this.executorId}] Waiting ${waitTime}ms before retry...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      } catch (error: any) {
        console.error(
          `💥 [${this.executorId}] DB update attempt ${attempt} error:`,
          error
        );

        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    console.error(
      `❌ [${this.executorId}] All ${maxRetries} database update attempts failed for ${scheduleId}`
    );
    return false;
  }

  private async markScheduleAsFailed(scheduleId: string, error: string) {
    try {
      const response = await fetch(`/api/scheduled-payments/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_failed",
          executorId: this.executorId,
          error: error,
        }),
        credentials: "include",
      });

      if (response.ok) {
        console.log(`✅ [${this.executorId}] Schedule marked as failed`);
      }
    } catch (error) {
      console.error(`💥 [${this.executorId}] Error marking as failed:`, error);
    }
  }

  private showNotification(
    title: string,
    message: string,
    type: "success" | "error"
  ) {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body: message,
          icon: type === "success" ? "/favicon.ico" : "/favicon.ico",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, {
              body: message,
              icon: "/favicon.ico",
            });
          }
        });
      }
    }

    const style = type === "success" ? "color: green" : "color: red";
    console.log(`%c🔔 [${this.executorId}] ${title}: ${message}`, style);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId
        ? new Date(Date.now() + this.checkInterval)
        : null,
      executorId: this.executorId,
      processingPayments: Array.from(this.processingPayments),
      executedPayments: Array.from(this.executedPayments),
      useTestnet: this.useTestnet,
      hasPrivateKey: !!this.privateKey,
    };
  }

  setNetwork(useTestnet: boolean) {
    this.useTestnet = useTestnet;
    console.log(
      `🔄 [${this.executorId}] Switched to ${
        useTestnet ? "Testnet" : "Mainnet"
      }`
    );
  }
}

// Export singleton instances
export const webScheduledPaymentExecutor = new WebScheduledPaymentExecutor(
  false
); // Mainnet
export const webScheduledPaymentExecutorTestnet =
  new WebScheduledPaymentExecutor(true); // Testnet
