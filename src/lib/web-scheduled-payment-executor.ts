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

  constructor() {
    console.log("🌐 Web-based scheduled payment executor initialized");
  }

  start() {
    if (this.isRunning) {
      console.log("⚡ Executor already running");
      return;
    }

    console.log("🚀 Starting web-based scheduled payment executor");
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

    console.log("🛑 Stopping web-based scheduled payment executor");

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log("✅ Executor stopped");
  }

  private async checkAndExecutePayments() {
    try {
      console.log("🔍 Checking for due payments...");

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

      console.log(`📊 Found ${duePayments.length} payments due for execution`);

      if (duePayments.length === 0) {
        return;
      }

      // Execute each due payment
      for (const payment of duePayments) {
        try {
          await this.executePayment(payment);
        } catch (error) {
          console.error(
            `💥 Error executing payment ${payment.scheduleId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("💥 Error checking scheduled payments:", error);
    }
  }

  private async executePayment(paymentData: ScheduledPaymentData) {
    console.log(`⚡ Executing payment: ${paymentData.scheduleId}`);

    try {
      // Transform the data for the execution service
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

      // Execute the payment using the scheduled payment service
      const executionResult =
        await scheduledPaymentService.executeScheduledPayment(
          scheduleData,
          this.testPrivateKey
        );

      if (executionResult.success) {
        console.log(
          `✅ Payment executed successfully: ${paymentData.scheduleId}`
        );
        console.log(`📤 Transaction hash: ${executionResult.transactionHash}`);

        // Update the schedule in the database
        await this.updateScheduleAfterExecution(paymentData, executionResult);

        // Show success notification
        this.showNotification(
          "Payment Executed Successfully!",
          `${paymentData.amount} ${
            paymentData.tokenInfo.symbol
          } sent to ${paymentData.recipient.slice(0, 10)}...`,
          "success"
        );
      } else {
        console.error(`❌ Payment execution failed: ${executionResult.error}`);

        // Update schedule status to failed
        await this.markScheduleAsFailed(
          paymentData.scheduleId,
          executionResult.error
        );

        // Show error notification
        this.showNotification(
          "Payment Execution Failed",
          `Failed to execute payment: ${executionResult.error}`,
          "error"
        );
      }
    } catch (error: any) {
      console.error(`💥 Critical error executing payment:`, error);
      await this.markScheduleAsFailed(paymentData.scheduleId, error.message);

      this.showNotification(
        "Payment Execution Error",
        `Critical error: ${error.message}`,
        "error"
      );
    }
  }

  private async updateScheduleAfterExecution(
    paymentData: ScheduledPaymentData,
    executionResult: any
  ) {
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
            transactionHash: executionResult.transactionHash,
            gasUsed: executionResult.gasUsed,
            blockNumber: executionResult.blockNumber,
            actualCostETH: executionResult.actualCostETH,
            actualCostUSD: executionResult.actualCostUSD,
            executedAt: executionResult.executedAt,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.error("❌ Failed to update schedule after execution");
      } else {
        console.log("✅ Schedule updated after successful execution");
      }
    } catch (error) {
      console.error("💥 Error updating schedule:", error);
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
          error: error,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        console.error("❌ Failed to mark schedule as failed");
      }
    } catch (error) {
      console.error("💥 Error marking schedule as failed:", error);
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
    console.log(`%c🔔 ${title}: ${message}`, style);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId
        ? new Date(Date.now() + this.checkInterval)
        : null,
    };
  }
}

// Singleton instance
export const webScheduledPaymentExecutor = new WebScheduledPaymentExecutor();
