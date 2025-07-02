// src/lib/enhanced-scheduled-payments-service.ts (NO RETRY VERSION)
import { enhancedSimpleTransferService } from "./enhanced-simple-transfer-service";

export interface ScheduledPayment {
  id: string;
  scheduleId: string;
  username: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  recipient: string;
  amount: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  status: "active" | "completed" | "cancelled" | "failed" | "processing";
  scheduledFor: Date;
  nextExecution?: Date;
  executionCount: number;
  maxExecutions: number;
  description?: string;
  timezone?: string;
  createdAt: Date;
  lastExecutionAt?: Date;
  useEnhancedAPI?: boolean;
  // NO RETRY FIELDS - Remove retry logic completely
  failedAt?: Date;
  lastError?: string;
  processingBy?: string;
  processingStarted?: Date;
}

export interface PaymentPreview {
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
  nextExecutions: Date[];
  estimatedGas: string;
  gasCostETH: string;
  gasCostUSD: string;
  approvalRequired: boolean;
  currentAllowance?: string;
  requiredAllowance?: string;
  enhancedAPIEstimate?: {
    gasPrice: string;
    estimatedGas: string;
    gasCostETH: string;
    gasCostUSD: string;
    congestionLevel: string;
  };
}

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
  actualCostETH?: string;
  actualCostUSD?: string;
  enhancedAPI?: boolean;
}

export class EnhancedScheduledPaymentsService {
  constructor() {}

  async createScheduledPaymentPreview(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    fromAddress: string,
    recipient: string,
    amount: string,
    scheduledFor: Date,
    frequency: string,
    timezone: string = "UTC"
  ): Promise<PaymentPreview> {
    console.log("📊 Creating enhanced scheduled payment preview...");

    const isETH =
      tokenInfo.contractAddress === "native" ||
      tokenInfo.symbol === "ETH" ||
      tokenInfo.isETH;

    // Calculate next executions based on frequency
    const nextExecutions = this.calculateNextExecutions(
      scheduledFor,
      frequency,
      5
    );

    // Get enhanced gas estimation using the transfer service
    const enhancedEstimate = await this.getEnhancedGasEstimation(
      tokenInfo,
      fromAddress,
      recipient,
      amount
    );

    // For ERC20 tokens, approval is handled automatically by enhanced API
    let approvalRequired = false;
    let currentAllowance = "0";
    let requiredAllowance = amount;

    if (!isETH) {
      approvalRequired = false; // Enhanced API handles approvals automatically
    }

    return {
      tokenInfo: {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        contractAddress: tokenInfo.contractAddress,
        decimals: tokenInfo.decimals,
        isETH: isETH,
      },
      recipient,
      amount,
      scheduledFor,
      frequency,
      nextExecutions,
      estimatedGas: enhancedEstimate.estimatedGas,
      gasCostETH: enhancedEstimate.gasCostETH,
      gasCostUSD: enhancedEstimate.gasCostUSD,
      approvalRequired,
      currentAllowance,
      requiredAllowance,
      enhancedAPIEstimate: enhancedEstimate,
    };
  }

  // UPDATED: No retry logic - fail immediately on any error
  async executeScheduledPayment(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    fromAddress: string,
    recipient: string,
    amount: string,
    privateKey: string
  ): Promise<ExecutionResult> {
    console.log(
      "🚀 Executing scheduled payment with Enhanced API (NO RETRY)..."
    );

    try {
      const result = await enhancedSimpleTransferService.executeTransfer(
        {
          ...tokenInfo,
          isETH:
            tokenInfo.contractAddress === "native" ||
            tokenInfo.symbol === "ETH" ||
            tokenInfo.isETH,
        },
        recipient,
        amount,
        privateKey
      );

      if (result.success) {
        console.log(
          "✅ Enhanced scheduled payment executed successfully (NO RETRY)"
        );
        return {
          success: true,
          transactionHash: result.transactionHash,
          gasUsed: result.gasUsed,
          blockNumber: result.blockNumber,
          explorerUrl: result.explorerUrl,
          actualCostETH: result.actualCostETH,
          actualCostUSD: result.actualCostUSD,
          enhancedAPI: true,
        };
      } else {
        console.error(
          "❌ Enhanced scheduled payment failed (NO RETRY):",
          result.error
        );
        return {
          success: false,
          error: result.error || "Scheduled payment execution failed",
          enhancedAPI: true,
        };
      }
    } catch (error: any) {
      console.error(
        "💥 Enhanced scheduled payment execution error (NO RETRY):",
        error
      );
      return {
        success: false,
        error: error.message || "Scheduled payment execution failed",
        enhancedAPI: true,
      };
    }
  }

  private async getEnhancedGasEstimation(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    fromAddress: string,
    recipient: string,
    amount: string
  ): Promise<{
    gasPrice: string;
    estimatedGas: string;
    gasCostETH: string;
    gasCostUSD: string;
    congestionLevel: string;
  }> {
    try {
      const preview = await enhancedSimpleTransferService.createTransferPreview(
        tokenInfo,
        fromAddress,
        recipient,
        amount
      );

      return {
        gasPrice: preview.gasEstimation.gasPrice,
        estimatedGas: preview.gasEstimation.estimatedGas,
        gasCostETH: preview.gasEstimation.gasCostETH,
        gasCostUSD: preview.gasEstimation.gasCostUSD.replace("$", ""),
        congestionLevel: preview.gasEstimation.congestionLevel,
      };
    } catch (error) {
      console.error("Error getting enhanced gas estimation:", error);
      return {
        gasPrice: "20",
        estimatedGas: tokenInfo.isETH ? "21000" : "65000",
        gasCostETH: tokenInfo.isETH ? "0.00042" : "0.0013",
        gasCostUSD: tokenInfo.isETH ? "1.47" : "4.55",
        congestionLevel: "Unknown",
      };
    }
  }

  private calculateNextExecutions(
    startDate: Date,
    frequency: string,
    count: number = 5
  ): Date[] {
    const executions: Date[] = [startDate];

    if (frequency === "once") {
      return executions;
    }

    for (let i = 1; i < count; i++) {
      const lastExecution = executions[executions.length - 1];
      const nextExecution = new Date(lastExecution);

      switch (frequency) {
        case "daily":
          nextExecution.setDate(nextExecution.getDate() + 1);
          break;
        case "weekly":
          nextExecution.setDate(nextExecution.getDate() + 7);
          break;
        case "monthly":
          nextExecution.setMonth(nextExecution.getMonth() + 1);
          break;
        case "yearly":
          nextExecution.setFullYear(nextExecution.getFullYear() + 1);
          break;
        default:
          break;
      }

      executions.push(nextExecution);
    }

    return executions;
  }

  // UPDATED: Check if payment is due (exclude failed payments)
  isPaymentDue(scheduledPayment: ScheduledPayment): boolean {
    // CRITICAL: Never execute failed payments
    if (scheduledPayment.status === "failed") {
      return false;
    }

    // Don't execute if currently processing
    if (scheduledPayment.status === "processing") {
      return false;
    }

    // Only execute active payments
    if (scheduledPayment.status !== "active") {
      return false;
    }

    const now = new Date();
    const scheduledTime =
      scheduledPayment.nextExecution || scheduledPayment.scheduledFor;
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return now.getTime() >= scheduledTime.getTime() - bufferMs;
  }

  calculateNextExecution(
    lastExecution: Date,
    frequency: string,
    timezone: string = "UTC"
  ): Date | null {
    if (frequency === "once") {
      return null;
    }

    const nextExecution = new Date(lastExecution);

    switch (frequency) {
      case "daily":
        nextExecution.setDate(nextExecution.getDate() + 1);
        break;
      case "weekly":
        nextExecution.setDate(nextExecution.getDate() + 7);
        break;
      case "monthly":
        nextExecution.setMonth(nextExecution.getMonth() + 1);
        break;
      case "yearly":
        nextExecution.setFullYear(nextExecution.getFullYear() + 1);
        break;
      default:
        return null;
    }

    return nextExecution;
  }

  validateScheduledPayment(
    tokenInfo: any,
    recipient: string,
    amount: string,
    scheduledFor: Date,
    frequency: string
  ): { valid: boolean; error?: string } {
    if (!enhancedSimpleTransferService.isValidAddress(recipient)) {
      return { valid: false, error: "Invalid recipient address" };
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return { valid: false, error: "Invalid amount" };
    }

    if (scheduledFor <= new Date()) {
      return { valid: false, error: "Scheduled time must be in the future" };
    }

    const validFrequencies = ["once", "daily", "weekly", "monthly", "yearly"];
    if (!validFrequencies.includes(frequency)) {
      return { valid: false, error: "Invalid frequency" };
    }

    return { valid: true };
  }

  // UPDATED: Get payment status (include failed status)
  getPaymentStatus(
    executionCount: number,
    maxExecutions: number,
    frequency: string,
    nextExecution?: Date,
    hasFailed?: boolean
  ): "active" | "completed" | "cancelled" | "failed" {
    // If payment has failed, keep it failed
    if (hasFailed) {
      return "failed";
    }

    if (frequency === "once" && executionCount > 0) {
      return "completed";
    }

    if (executionCount >= maxExecutions) {
      return "completed";
    }

    if (!nextExecution) {
      return "completed";
    }

    return "active";
  }
}

export const enhancedScheduledPaymentsService =
  new EnhancedScheduledPaymentsService();
