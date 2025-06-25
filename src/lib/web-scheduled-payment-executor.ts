// src/lib/web-scheduled-payment-executor.ts (FIXED STATUS UPDATE VERSION)
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
  private checkInterval = 30000; // Check every 30 seconds
  private testPrivateKey =
    "c1fcde81f943602b92f11121d426b8b499f2f52a24468894ad058ec5f9931b23";
  private processingPayments = new Set<string>(); // Track payments being processed
  private executorId = Math.random().toString(36).substr(2, 9); // Unique executor ID
  private executedPayments = new Set<string>(); // Track already executed payments

  constructor() {
    console.log(
      `🌐 Web-based scheduled payment executor initialized (ID: ${this.executorId})`
    );
  }

  start() {
    if (this.isRunning) {
      console.log("⚡ Executor already running");
      return;
    }

    console.log(
      `🚀 Starting web-based scheduled payment executor (ID: ${this.executorId})`
    );
    this.isRunning = true;

    // Run immediately
    this.checkAndExecutePayments();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkAndExecutePayments();
    }, this.checkInterval);

    console.log("✅ Executor started - checking every 30 seconds");
  }

  stop() {
    if (!this.isRunning) {
      console.log("⚡ Executor not running");
      return;
    }

    console.log(
      `🛑 Stopping web-based scheduled payment executor (ID: ${this.executorId})`
    );

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.processingPayments.clear();
    this.executedPayments.clear();
    console.log("✅ Executor stopped");
  }

  private async checkAndExecutePayments() {
    try {
      console.log(`🔍 [${this.executorId}] Checking for due payments...`);

      // Fetch due payments from API
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
        `📊 [${this.executorId}] Found ${duePayments.length} payments due for execution`
      );

      if (duePayments.length === 0) {
        return;
      }

      // Filter out payments that are already being processed or already executed
      const availablePayments = duePayments.filter(
        (payment: ScheduledPaymentData) => {
          const scheduleId = payment.scheduleId;

          // Skip if already processing
          if (this.processingPayments.has(scheduleId)) {
            console.log(
              `⏩ [${this.executorId}] Skipping ${scheduleId} - already processing`
            );
            return false;
          }

          // Skip if already executed in this session
          if (this.executedPayments.has(scheduleId)) {
            console.log(
              `⏩ [${this.executorId}] Skipping ${scheduleId} - already executed in this session`
            );
            return false;
          }

          return true;
        }
      );

      console.log(
        `📊 [${this.executorId}] ${availablePayments.length} payments available for processing`
      );

      // Execute each available payment
      for (const payment of availablePayments) {
        try {
          await this.executePayment(payment);
        } catch (error) {
          console.error(
            `💥 [${this.executorId}] Error executing payment ${payment.scheduleId}:`,
            error
          );
          // Remove from processing set on error
          this.processingPayments.delete(payment.scheduleId);
        }
      }
    } catch (error) {
      console.error(
        `💥 [${this.executorId}] Error checking scheduled payments:`,
        error
      );
    }
  }

  private async executePayment(paymentData: ScheduledPaymentData) {
    const scheduleId = paymentData.scheduleId;

    // Mark as processing to prevent duplicate execution
    if (this.processingPayments.has(scheduleId)) {
      console.log(
        `⏩ [${this.executorId}] Payment ${scheduleId} already being processed`
      );
      return;
    }

    this.processingPayments.add(scheduleId);
    console.log(`⚡ [${this.executorId}] Executing payment: ${scheduleId}`);

    try {
      // STEP 1: Mark as processing in database
      console.log(
        `🔒 [${this.executorId}] Marking ${scheduleId} as processing...`
      );
      const processingResult = await this.markAsProcessing(scheduleId);

      if (!processingResult.success) {
        console.log(
          `⏩ [${this.executorId}] Payment ${scheduleId} could not be marked as processing: ${processingResult.error}`
        );
        return;
      }

      console.log(
        `✅ [${this.executorId}] Payment ${scheduleId} marked as processing`
      );

      // STEP 2: Execute the blockchain transaction
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
        `💰 [${this.executorId}] Starting blockchain transaction for ${scheduleId}`
      );

      const executionResult =
        await scheduledPaymentService.executeScheduledPayment(
          scheduleData,
          this.testPrivateKey
        );

      if (executionResult.success) {
        console.log(
          `✅ [${this.executorId}] Blockchain transaction successful for ${scheduleId}`
        );
        console.log(
          `📤 [${this.executorId}] Transaction hash: ${executionResult.transactionHash}`
        );

        // STEP 3: IMMEDIATELY update database with execution results
        console.log(
          `📝 [${this.executorId}] Updating database for ${scheduleId}...`
        );

        const updateResult = await this.updateScheduleAfterExecutionWithRetry(
          paymentData,
          executionResult,
          3 // Retry up to 3 times
        );

        if (updateResult.success) {
          console.log(
            `✅ [${this.executorId}] Database updated successfully for ${scheduleId} - Final Status: ${updateResult.finalStatus}`
          );

          // Mark as executed in this session
          this.executedPayments.add(scheduleId);

          // Show success notification
          this.showNotification(
            "Payment Executed Successfully!",
            `${paymentData.amount} ${
              paymentData.tokenInfo.symbol
            } sent to ${paymentData.recipient.slice(0, 10)}... (Status: ${
              updateResult.finalStatus
            })`,
            "success"
          );
        } else {
          console.error(
            `❌ [${this.executorId}] Failed to update database for ${scheduleId}: ${updateResult.error}`
          );

          // Try one more time with force update
          console.log(
            `🔄 [${this.executorId}] Attempting force update for ${scheduleId}...`
          );
          await this.forceUpdateSchedule(scheduleId, executionResult);

          // Still mark as executed to prevent re-execution
          this.executedPayments.add(scheduleId);
        }
      } else {
        console.error(
          `❌ [${this.executorId}] Blockchain transaction failed for ${scheduleId}: ${executionResult.error}`
        );

        // Mark as failed in database
        await this.markScheduleAsFailed(scheduleId, executionResult.error);

        // Show error notification
        this.showNotification(
          "Payment Execution Failed",
          `Failed to execute payment: ${executionResult.error}`,
          "error"
        );
      }
    } catch (error: any) {
      console.error(
        `💥 [${this.executorId}] Critical error executing payment ${scheduleId}:`,
        error
      );
      await this.markScheduleAsFailed(scheduleId, error.message);

      this.showNotification(
        "Payment Execution Error",
        `Critical error: ${error.message}`,
        "error"
      );
    } finally {
      // Always remove from processing set when done
      this.processingPayments.delete(scheduleId);
      console.log(
        `🔓 [${this.executorId}] Released payment ${scheduleId} from processing`
      );
    }
  }

  // Enhanced method with retry logic
  private async updateScheduleAfterExecutionWithRetry(
    paymentData: ScheduledPaymentData,
    executionResult: any,
    maxRetries: number = 3
  ): Promise<{ success: boolean; error?: string; finalStatus?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `📝 [${this.executorId}] Database update attempt ${attempt}/${maxRetries} for ${paymentData.scheduleId}`
      );

      try {
        const response = await fetch(
          `/api/scheduled-payments/${paymentData.scheduleId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
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
            `✅ [${this.executorId}] Database update successful on attempt ${attempt} - Status: ${data.nextStatus}`
          );
          return {
            success: true,
            finalStatus: data.nextStatus,
          };
        } else {
          console.warn(
            `⚠️ [${this.executorId}] Database update failed on attempt ${attempt}: ${data.error}`
          );

          if (attempt === maxRetries) {
            return {
              success: false,
              error: data.error || "Failed after all retries",
            };
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error: any) {
        console.error(
          `💥 [${this.executorId}] Database update error on attempt ${attempt}:`,
          error
        );

        if (attempt === maxRetries) {
          return {
            success: false,
            error: error.message || "Network error after all retries",
          };
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    return { success: false, error: "Max retries exceeded" };
  }

  // Force update method that bypasses some checks
  private async forceUpdateSchedule(scheduleId: string, executionResult: any) {
    try {
      console.log(
        `🔄 [${this.executorId}] Force updating schedule ${scheduleId}...`
      );

      const response = await fetch(
        `/api/scheduled-payments/${scheduleId}/force-update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

      const data = await response.json();

      if (response.ok && data.success) {
        console.log(
          `✅ [${this.executorId}] Force update successful for ${scheduleId}`
        );
      } else {
        console.error(
          `❌ [${this.executorId}] Force update failed for ${scheduleId}: ${data.error}`
        );
      }
    } catch (error) {
      console.error(`💥 [${this.executorId}] Force update error:`, error);
    }
  }

  private async markAsProcessing(scheduleId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `/api/scheduled-payments/${scheduleId}/process`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            executorId: this.executorId,
            processingStarted: new Date().toISOString(),
          }),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || "Failed to mark as processing",
        };
      }
    } catch (error: any) {
      console.error(
        `💥 [${this.executorId}] Error marking as processing:`,
        error
      );
      return {
        success: false,
        error: error.message || "Network error",
      };
    }
  }

  private async markScheduleAsFailed(scheduleId: string, error: string) {
    try {
      const response = await fetch(`/api/scheduled-payments/${scheduleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark_failed",
          executorId: this.executorId,
          error: error,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        console.error(
          `❌ [${this.executorId}] Failed to mark schedule as failed`
        );
      } else {
        console.log(
          `✅ [${this.executorId}] Schedule marked as failed successfully`
        );
      }
    } catch (error) {
      console.error(
        `💥 [${this.executorId}] Error marking schedule as failed:`,
        error
      );
    }
  }

  private showNotification(
    title: string,
    message: string,
    type: "success" | "error"
  ) {
    // Create a browser notification if permission is granted
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body: message,
          icon: type === "success" ? "/icons/success.png" : "/icons/error.png",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, {
              body: message,
              icon:
                type === "success" ? "/icons/success.png" : "/icons/error.png",
            });
          }
        });
      }
    }

    // Also log to console with appropriate styling
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
    };
  }
}

// Singleton instance
export const webScheduledPaymentExecutor = new WebScheduledPaymentExecutor();
