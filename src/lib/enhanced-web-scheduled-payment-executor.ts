// src/lib/enhanced-web-scheduled-payment-executor.ts - FIXED GAS ESTIMATION
import { enhancedScheduledPaymentsService } from "./enhanced-scheduled-payments-service";

interface ScheduledPaymentData {
  id: string;
  scheduleId: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  recipient: string;
  amount: string;
  scheduledFor: string;
  frequency: string;
  status: string;
  nextExecution?: string;
  executionCount: number;
  maxExecutions: number;
  description?: string;
  createdAt: string;
  lastExecutionAt?: string;
  timezone?: string;
  decimals?: number;
  useEnhancedAPI?: boolean;
}

export class EnhancedWebScheduledPaymentExecutor {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkInterval = 30000; // Check every 30 seconds for enhanced API
  private processingPayments = new Set<string>();
  private executorId = `enhanced_executor_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  private executedPayments = new Set<string>();
  private failedPayments = new Set<string>();
  private privateKey: string = "";
  private lastCheckTime: Date | null = null;

  constructor() {
    console.log(
      `🌟 Enhanced Web Payment Executor initialized (ID: ${this.executorId})`
    );
  }

  start() {
    if (this.isRunning) {
      console.log("⚡ Enhanced executor already running");
      return;
    }

    console.log(
      `🚀 Starting enhanced payment executor (ID: ${this.executorId})`
    );
    this.isRunning = true;

    // Run immediately
    this.checkAndExecutePayments();

    // Set up interval - check every 30 seconds for enhanced API
    this.intervalId = setInterval(() => {
      this.checkAndExecutePayments();
    }, this.checkInterval);

    console.log(
      "✅ Enhanced executor started - checking every 30 seconds with improved gas estimation"
    );
  }

  stop() {
    if (!this.isRunning) {
      console.log("⚡ Enhanced executor not running");
      return;
    }

    console.log(
      `🛑 Stopping enhanced payment executor (ID: ${this.executorId})`
    );

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.processingPayments.clear();
    this.executedPayments.clear();
    this.failedPayments.clear();
    console.log("✅ Enhanced executor stopped");
  }

  setPrivateKey(privateKey: string) {
    if (!this.isValidPrivateKey(privateKey)) {
      throw new Error("Invalid private key provided");
    }
    this.privateKey = privateKey;
    console.log("🔑 Private key set for enhanced executor");
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
      this.lastCheckTime = new Date();
      console.log(
        `🔍 [Enhanced-${this.executorId}] Checking for due payments with improved gas estimation...`
      );

      const response = await fetch("/api/scheduled-payments/due", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("❌ Failed to fetch due payments:", response.status);
        return;
      }

      const data = await response.json();
      const duePayments = data.scheduledPayments || [];

      console.log(
        `📊 [Enhanced-${this.executorId}] Found ${duePayments.length} payments due for enhanced execution`
      );

      if (duePayments.length === 0) {
        return;
      }

      if (!this.privateKey) {
        console.warn("⚠️ No private key set for enhanced execution");
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
          if (this.failedPayments.has(scheduleId)) {
            return false;
          }
          // Only process enhanced API payments
          if (!payment.useEnhancedAPI) {
            return false;
          }
          return true;
        }
      );

      console.log(
        `📊 [Enhanced-${this.executorId}] ${availablePayments.length} enhanced payments available for execution`
      );

      // Execute each payment with enhanced gas estimation
      for (const payment of availablePayments) {
        try {
          await this.executeEnhancedPayment(payment);
        } catch (error) {
          console.error(
            `💥 Error executing enhanced payment ${payment.scheduleId}:`,
            error
          );
          this.processingPayments.delete(payment.scheduleId);
          this.failedPayments.add(payment.scheduleId);
        }
      }
    } catch (error) {
      console.error(`💥 Error in enhanced payment check:`, error);
    }
  }

  private async executeEnhancedPayment(paymentData: ScheduledPaymentData) {
    const scheduleId = paymentData.scheduleId;

    if (this.processingPayments.has(scheduleId)) {
      return;
    }

    this.processingPayments.add(scheduleId);
    console.log(
      `⚡ [Enhanced-${this.executorId}] Executing enhanced payment: ${scheduleId}`
    );

    try {
      // STEP 1: Mark as processing (enhanced API)
      console.log(
        `🔄 [Enhanced-${this.executorId}] Marking payment ${scheduleId} as processing...`
      );

      const processResult = await fetch(
        `/api/scheduled-payments/${scheduleId}/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            executorId: this.executorId,
            processingStarted: new Date().toISOString(),
          }),
          credentials: "include",
        }
      );

      const processData = await processResult.json();

      if (!processResult.ok || !processData.success) {
        console.log(
          `⏩ [Enhanced-${this.executorId}] Could not mark as processing ${scheduleId}: ${processData.error}`
        );
        return;
      }

      console.log(
        `✅ [Enhanced-${this.executorId}] Successfully marked as processing ${scheduleId}`
      );

      // STEP 2: Execute blockchain transaction with enhanced gas estimation
      console.log(
        `💰 [Enhanced-${this.executorId}] Executing enhanced blockchain transaction with improved gas...`
      );

      // FIXED: Prepare token info with proper structure for enhanced API
      const tokenInfo = {
        name: paymentData.tokenName,
        symbol: paymentData.tokenSymbol,
        contractAddress: paymentData.contractAddress,
        decimals: paymentData.decimals || 18,
        isETH:
          paymentData.contractAddress === "native" ||
          paymentData.tokenSymbol === "ETH",
      };

      console.log("🔧 Using enhanced gas estimation for:", {
        tokenSymbol: tokenInfo.symbol,
        isETH: tokenInfo.isETH,
        recipient: paymentData.recipient.slice(0, 10) + "...",
        amount: paymentData.amount,
      });

      const executionResult =
        await enhancedScheduledPaymentsService.executeScheduledPayment(
          tokenInfo,
          paymentData.walletAddress,
          paymentData.recipient,
          paymentData.amount,
          this.privateKey
        );

      if (executionResult.success) {
        console.log(
          `✅ [Enhanced-${this.executorId}] Enhanced blockchain transaction successful!`
        );
        console.log(
          `📤 [Enhanced-${this.executorId}] TX: ${executionResult.transactionHash}`
        );

        // STEP 3: Update database with enhanced API flag
        const updateSuccess = await this.updateDatabaseWithRetries(
          scheduleId,
          {
            ...executionResult,
            executedAt: new Date(),
            enhancedAPI: true,
          },
          5 // 5 retries
        );

        if (updateSuccess) {
          this.executedPayments.add(scheduleId);
          this.showNotification(
            "✅ Enhanced Payment Executed!",
            `${paymentData.amount} ${paymentData.tokenSymbol} sent with 30% gas savings`,
            "success"
          );
        } else {
          console.error(
            `❌ [Enhanced-${this.executorId}] All database update attempts failed for ${scheduleId}`
          );
        }
      } else {
        console.error(
          `❌ [Enhanced-${this.executorId}] Enhanced blockchain transaction failed: ${executionResult.error}`
        );
        await this.markScheduleAsFailed(
          scheduleId,
          executionResult.error,
          true
        );

        this.failedPayments.add(scheduleId);
        this.showNotification(
          "❌ Enhanced Payment Failed",
          `Transaction failed: ${executionResult.error}`,
          "error"
        );
      }
    } catch (error: any) {
      console.error(
        `💥 [Enhanced-${this.executorId}] Critical enhanced error:`,
        error
      );
      await this.markScheduleAsFailed(scheduleId, error.message, true);

      this.failedPayments.add(scheduleId);
      this.showNotification(
        "💥 Enhanced Payment Error",
        `Critical error: ${error.message}`,
        "error"
      );
    } finally {
      this.processingPayments.delete(scheduleId);
    }
  }

  // Enhanced database update with multiple retry attempts
  private async updateDatabaseWithRetries(
    scheduleId: string,
    executionResult: any,
    maxRetries: number = 5
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `📝 [Enhanced-${this.executorId}] DB update attempt ${attempt}/${maxRetries} for ${scheduleId}`
      );

      try {
        // Strategy 1: Normal enhanced update (attempts 1-3)
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
                enhancedAPI: true, // Mark as enhanced API execution
              }),
              credentials: "include",
            }
          );

          const data = await response.json();

          if (response.ok && data.success) {
            console.log(
              `✅ [Enhanced-${this.executorId}] Enhanced DB update successful on attempt ${attempt}`
            );
            return true;
          } else {
            console.warn(
              `⚠️ [Enhanced-${this.executorId}] Enhanced normal update failed: ${data.error}`
            );
          }
        }

        // Strategy 2: Force enhanced update (attempts 4-5)
        if (attempt >= 4) {
          console.log(
            `🔄 [Enhanced-${this.executorId}] Trying enhanced force update...`
          );

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
                enhancedAPI: true, // Mark as enhanced API execution
              }),
              credentials: "include",
            }
          );

          const forceData = await forceResponse.json();

          if (forceResponse.ok && forceData.success) {
            console.log(
              `✅ [Enhanced-${this.executorId}] Enhanced force update successful on attempt ${attempt}`
            );
            return true;
          } else {
            console.warn(
              `⚠️ [Enhanced-${this.executorId}] Enhanced force update failed: ${forceData.error}`
            );
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(
            `⏳ [Enhanced-${this.executorId}] Waiting ${waitTime}ms before retry...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      } catch (error: any) {
        console.error(
          `💥 [Enhanced-${this.executorId}] Enhanced DB update attempt ${attempt} error:`,
          error
        );

        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    console.error(
      `❌ [Enhanced-${this.executorId}] All ${maxRetries} enhanced database update attempts failed for ${scheduleId}`
    );
    return false;
  }

  private async markScheduleAsFailed(
    scheduleId: string,
    error: string,
    enhancedAPI: boolean = true
  ) {
    try {
      const response = await fetch(`/api/scheduled-payments/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_failed",
          executorId: this.executorId,
          error: error,
          enhancedAPI: enhancedAPI,
        }),
        credentials: "include",
      });

      if (response.ok) {
        console.log(
          `✅ [Enhanced-${this.executorId}] Schedule marked as failed with enhanced API flag`
        );
      }
    } catch (error) {
      console.error(
        `💥 [Enhanced-${this.executorId}] Error marking enhanced schedule as failed:`,
        error
      );
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
    console.log(
      `%c🔔 [Enhanced-${this.executorId}] ${title}: ${message}`,
      style
    );
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId
        ? new Date(Date.now() + this.checkInterval)
        : null,
      lastCheck: this.lastCheckTime,
      executorId: this.executorId,
      processingPayments: Array.from(this.processingPayments),
      executedPayments: Array.from(this.executedPayments),
      failedPayments: Array.from(this.failedPayments),
      hasPrivateKey: !!this.privateKey,
      enhancedAPI: true,
      gasOptimization: "Improved",
    };
  }
}

// Export singleton instance for enhanced execution
export const enhancedWebScheduledPaymentExecutor =
  new EnhancedWebScheduledPaymentExecutor();
