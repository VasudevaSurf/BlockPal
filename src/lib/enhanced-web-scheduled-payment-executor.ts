// src/lib/enhanced-web-scheduled-payment-executor.ts - FIXED STRING AMOUNT HANDLING
import { enhancedScheduledPaymentsService } from "./enhanced-scheduled-payments-service";

interface ScheduledPaymentData {
  id: string;
  scheduleId: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  recipient: string;
  amount: string | number; // FIXED: Handle both string and number from database
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
  private checkInterval = 30000; // Check every 30 seconds
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
      `🌟 Enhanced Web Payment Executor initialized (ID: ${this.executorId}) with fixed string amount handling`
    );
  }

  start() {
    if (this.isRunning) {
      console.log("⚡ Enhanced executor already running");
      return;
    }

    console.log(
      `🚀 Starting enhanced payment executor with fixed string amounts (ID: ${this.executorId})`
    );
    this.isRunning = true;

    // Run immediately
    this.checkAndExecutePayments();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkAndExecutePayments();
    }, this.checkInterval);

    console.log(
      "✅ Enhanced executor started with improved string amount handling"
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
    console.log(
      "🔑 Private key set for enhanced executor with string amount handling"
    );
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

  // FIXED: Helper function to ensure amount is always a string
  private ensureAmountIsString(amount: string | number): string {
    if (typeof amount === "number") {
      // Handle scientific notation and precision issues
      if (amount < 1e-6) {
        // For very small numbers, use toFixed to avoid scientific notation
        return amount.toFixed(18).replace(/\.?0+$/, "");
      } else {
        // For normal numbers, convert to string
        return amount.toString();
      }
    } else if (typeof amount === "string") {
      return amount;
    } else {
      throw new Error(
        `Invalid amount type: ${typeof amount}. Expected string or number.`
      );
    }
  }

  private async checkAndExecutePayments() {
    try {
      this.lastCheckTime = new Date();
      console.log(
        `🔍 [Enhanced-${this.executorId}] Checking for due payments with fixed string amounts...`
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
        `📊 [Enhanced-${this.executorId}] Found ${duePayments.length} payments due for enhanced execution with string amounts`
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
        `📊 [Enhanced-${this.executorId}] ${availablePayments.length} enhanced payments available for execution with string amounts`
      );

      // Execute each payment with enhanced string amount handling
      for (const payment of availablePayments) {
        try {
          await this.executeEnhancedPaymentWithStringAmounts(payment);
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

  private async executeEnhancedPaymentWithStringAmounts(
    paymentData: ScheduledPaymentData
  ) {
    const scheduleId = paymentData.scheduleId;

    if (this.processingPayments.has(scheduleId)) {
      return;
    }

    this.processingPayments.add(scheduleId);
    console.log(
      `⚡ [Enhanced-${this.executorId}] Executing enhanced payment with string amounts: ${scheduleId}`
    );

    try {
      // STEP 1: Mark as processing
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

      // STEP 2: Execute blockchain transaction with fixed string amounts
      console.log(
        `💰 [Enhanced-${this.executorId}] Executing blockchain transaction with string amounts...`
      );

      // FIXED: Prepare token info with proper structure and validation
      const tokenInfo = {
        name: paymentData.tokenName || paymentData.tokenSymbol,
        symbol: paymentData.tokenSymbol,
        contractAddress: paymentData.contractAddress,
        decimals: this.getCorrectDecimals(
          paymentData.tokenSymbol,
          paymentData.decimals
        ),
        isETH: this.isETHToken(
          paymentData.tokenSymbol,
          paymentData.contractAddress
        ),
      };

      // FIXED: Ensure amount is string before passing to service
      const amountStr = this.ensureAmountIsString(paymentData.amount);

      console.log("🔍 Enhanced: Amount conversion details:", {
        originalAmount: paymentData.amount,
        originalType: typeof paymentData.amount,
        convertedAmount: amountStr,
        convertedType: typeof amountStr,
        tokenSymbol: tokenInfo.symbol,
      });

      // FIXED: Additional validation before execution
      if (!this.validatePaymentData(paymentData, tokenInfo)) {
        throw new Error("Payment data validation failed");
      }

      console.log("🔧 Enhanced: Using string amount for execution:", {
        tokenSymbol: tokenInfo.symbol,
        isETH: tokenInfo.isETH,
        contractAddress: tokenInfo.contractAddress,
        decimals: tokenInfo.decimals,
        recipient: paymentData.recipient.slice(0, 10) + "...",
        amount: amountStr,
        amountType: typeof amountStr,
      });

      const executionResult =
        await enhancedScheduledPaymentsService.executeScheduledPayment(
          tokenInfo,
          paymentData.walletAddress,
          paymentData.recipient,
          amountStr, // Use string amount
          this.privateKey
        );

      if (executionResult.success) {
        console.log(
          `✅ [Enhanced-${this.executorId}] Blockchain transaction successful with string amounts!`
        );
        console.log(
          `📤 [Enhanced-${this.executorId}] TX: ${executionResult.transactionHash}`
        );

        // STEP 3: Update database
        const updateSuccess = await this.updateDatabaseWithRetries(
          scheduleId,
          {
            ...executionResult,
            executedAt: new Date(),
            enhancedAPI: true,
            stringAmountHandling: true,
          },
          5 // 5 retries
        );

        if (updateSuccess) {
          this.executedPayments.add(scheduleId);
          this.showNotification(
            "✅ Enhanced Payment Executed!",
            `${amountStr} ${paymentData.tokenSymbol} sent with string amount handling`,
            "success"
          );
        } else {
          console.error(
            `❌ [Enhanced-${this.executorId}] All database update attempts failed for ${scheduleId}`
          );
        }
      } else {
        console.error(
          `❌ [Enhanced-${this.executorId}] Blockchain transaction failed: ${executionResult.error}`
        );

        // FIXED: Better error handling for string amount failures
        let errorCategory = "execution_failed";
        if (
          executionResult.error?.includes("invalid") &&
          executionResult.error?.includes("string")
        ) {
          errorCategory = "amount_format_error";
        } else if (
          executionResult.error?.includes("approval") ||
          executionResult.error?.includes("allowance")
        ) {
          errorCategory = "approval_failed";
        } else if (executionResult.error?.includes("balance")) {
          errorCategory = "insufficient_balance";
        } else if (executionResult.error?.includes("deadline")) {
          errorCategory = "deadline_exceeded";
        }

        await this.markScheduleAsFailed(
          scheduleId,
          executionResult.error,
          true,
          errorCategory
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

      let errorCategory = "critical_error";
      if (
        error.message?.includes("invalid") &&
        error.message?.includes("string")
      ) {
        errorCategory = "amount_format_critical_error";
      } else if (
        error.message?.includes("approval") ||
        error.message?.includes("allowance")
      ) {
        errorCategory = "approval_system_failure";
      }

      await this.markScheduleAsFailed(
        scheduleId,
        error.message,
        true,
        errorCategory
      );

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

  // FIXED: Helper functions for better validation
  private getCorrectDecimals(tokenSymbol: string, fallback?: number): number {
    const knownDecimals: { [key: string]: number } = {
      ETH: 18,
      USDT: 6,
      USDC: 6,
      DAI: 18,
      LINK: 18,
      UNI: 18,
    };

    return knownDecimals[tokenSymbol] || fallback || 18;
  }

  private isETHToken(tokenSymbol: string, contractAddress: string): boolean {
    return (
      tokenSymbol === "ETH" ||
      contractAddress === "native" ||
      contractAddress === "0x0000000000000000000000000000000000000000"
    );
  }

  private validatePaymentData(
    paymentData: ScheduledPaymentData,
    tokenInfo: any
  ): boolean {
    // Validate recipient address
    if (
      !paymentData.recipient ||
      !/^0x[a-fA-F0-9]{40}$/i.test(paymentData.recipient)
    ) {
      console.error("❌ Enhanced: Invalid recipient address");
      return false;
    }

    // Validate amount - FIXED: Handle both string and number
    const amountStr = this.ensureAmountIsString(paymentData.amount);
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      console.error("❌ Enhanced: Invalid amount after string conversion");
      return false;
    }

    // Validate token symbol
    const supportedTokens = ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"];
    if (!supportedTokens.includes(tokenInfo.symbol)) {
      console.error(`❌ Enhanced: Unsupported token: ${tokenInfo.symbol}`);
      return false;
    }

    // Validate contract address for ERC20 tokens
    if (
      !tokenInfo.isETH &&
      (!tokenInfo.contractAddress || tokenInfo.contractAddress === "")
    ) {
      console.error("❌ Enhanced: Missing contract address for ERC20 token");
      return false;
    }

    return true;
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
                enhancedAPI: true,
                taxPaidETH: executionResult.taxPaidETH || "0",
                contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
                stringAmountHandling: true,
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
                enhancedAPI: true,
                taxPaid: executionResult.taxPaidETH || "0",
                contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
                stringAmountHandling: true,
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
    enhancedAPI: boolean = true,
    errorCategory: string = "unknown"
  ) {
    try {
      console.log(
        `❌ [Enhanced-${this.executorId}] Marking schedule as failed: ${scheduleId}`
      );

      // Try the new dedicated mark-failed endpoint first
      const response = await fetch(
        `/api/scheduled-payments/${scheduleId}/mark-failed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: error,
            executorId: this.executorId,
            enhancedAPI: enhancedAPI,
            errorCategory: errorCategory,
            stringAmountHandling: true,
          }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(
          `✅ [Enhanced-${this.executorId}] Schedule marked as failed successfully:`,
          data
        );
        return;
      }

      // Fallback to the old PATCH method
      console.log(
        `⚠️ [Enhanced-${this.executorId}] Mark-failed endpoint failed, trying PATCH fallback...`
      );

      const fallbackResponse = await fetch(
        `/api/scheduled-payments/${scheduleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_failed",
            executorId: this.executorId,
            error: error,
            enhancedAPI: enhancedAPI,
            errorCategory: errorCategory,
            stringAmountHandling: true,
          }),
          credentials: "include",
        }
      );

      if (fallbackResponse.ok) {
        console.log(
          `✅ [Enhanced-${this.executorId}] Schedule marked as failed with fallback method`
        );
      } else {
        const errorData = await fallbackResponse.json();
        console.error(
          `❌ [Enhanced-${this.executorId}] Failed to mark schedule as failed:`,
          errorData
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
      stringAmountHandling: true,
      gasOptimization: "Enhanced with Fixed String Amount Handling",
    };
  }
}

// Export singleton instance for enhanced execution with string amount handling
export const enhancedWebScheduledPaymentExecutor =
  new EnhancedWebScheduledPaymentExecutor();
