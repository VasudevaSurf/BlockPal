// src/services/swapHistoryService.ts
interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

interface SwapTransactionCreate {
  walletAddress: string;
  username?: string;
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  fromAmountUSD?: number;
  toAmountUSD?: number;
  chainId: number;
  chainName: string;
  gasPrice?: string;
  gasCostETH?: string;
  gasCostUSD?: number;
  gasMode?: string;
  slippage?: number;
  route?: string;
  protocol?: string;
  priceImpact?: number;
  quoteId?: string;
}

interface SwapTransactionUpdate {
  status:
    | "pending"
    | "success"
    | "failed"
    | "cancelled"
    | "expired"
    | "rejected";
  txHash?: string;
  gasUsed?: string;
  errorMessage?: string;
  errorCode?: string;
  toAmount?: string;
}

interface SwapTransaction {
  _id: string;
  walletAddress: string;
  username?: string;
  txHash?: string;
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  fromAmountUSD?: number;
  toAmountUSD?: number;
  chainId: number;
  chainName: string;
  status:
    | "pending"
    | "success"
    | "failed"
    | "cancelled"
    | "expired"
    | "rejected";
  gasUsed?: string;
  gasPrice?: string;
  gasCostETH?: string;
  gasCostUSD?: number;
  gasMode?: string;
  slippage?: number;
  route?: string;
  protocol?: string;
  priceImpact?: number;
  errorMessage?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  failedAt?: string;
  explorerLink?: string;
}

interface SwapHistoryResponse {
  transactions: SwapTransaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class SwapHistoryService {
  private baseURL: string;

  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://amusing-freedom-production-92a5.up.railway.app/api/swap-history";
  }

  async createTransaction(
    data: SwapTransactionCreate
  ): Promise<{ id: string; status: string } | null> {
    try {
      const response = await fetch(`${this.baseURL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("Failed to create transaction:", result.message);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error("Error creating swap transaction:", error);
      return null;
    }
  }

  async updateTransaction(
    id: string,
    update: SwapTransactionUpdate
  ): Promise<{
    id: string;
    status: string;
    txHash?: string;
    explorerLink?: string;
  } | null> {
    try {
      const response = await fetch(`${this.baseURL}/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("Failed to update transaction:", result.message);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error("Error updating swap transaction:", error);
      return null;
    }
  }

  async getWalletHistory(
    walletAddress: string,
    options?: {
      chainId?: number;
      status?: string;
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<SwapHistoryResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.chainId)
        params.append("chainId", options.chainId.toString());
      if (options?.status) params.append("status", options.status);
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());
      if (options?.startDate) params.append("startDate", options.startDate);
      if (options?.endDate) params.append("endDate", options.endDate);

      const response = await fetch(
        `${this.baseURL}/wallet/${walletAddress}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Check if response is ok
      if (!response.ok) {
        console.warn(`History API returned status ${response.status}`);
        return this.getEmptyHistory();
      }

      const result = await response.json();

      // Handle both success and error responses gracefully
      if (result.success && result.data) {
        return result.data;
      } else {
        console.warn("History API returned unexpected format:", result);
        return this.getEmptyHistory();
      }
    } catch (error) {
      console.error("Error fetching swap history:", error);
      return this.getEmptyHistory();
    }
  }

  private getEmptyHistory(): SwapHistoryResponse {
    return {
      transactions: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    };
  }

  async getTransaction(id: string): Promise<SwapTransaction | null> {
    try {
      const response = await fetch(`${this.baseURL}/transaction/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();

      if (!result.success) {
        return null;
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return null;
    }
  }

  async getStatistics(
    walletAddress: string,
    options?: {
      chainId?: number;
      days?: number;
    }
  ): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (options?.chainId)
        params.append("chainId", options.chainId.toString());
      if (options?.days) params.append("days", options.days.toString());

      const response = await fetch(
        `${this.baseURL}/stats/${walletAddress}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return this.getDefaultStatistics();
      }

      const result = await response.json();

      if (!result.success) {
        return this.getDefaultStatistics();
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching statistics:", error);
      return this.getDefaultStatistics();
    }
  }

  private getDefaultStatistics() {
    return {
      totalSwaps: 0,
      successfulSwaps: 0,
      failedSwaps: 0,
      totalVolumeUSD: 0,
      totalGasUSD: 0,
      avgGasUSD: 0,
      uniqueTokens: [],
      successRate: "0",
    };
  }

  formatTransaction(transaction: SwapTransaction) {
    return {
      ...transaction,
      displayFromAmount: this.formatAmount(
        transaction.fromAmount,
        transaction.fromToken.decimals
      ),
      displayToAmount: this.formatAmount(
        transaction.toAmount,
        transaction.toToken.decimals
      ),
      displayDate: new Date(transaction.createdAt).toLocaleString(),
      age: this.getTransactionAge(transaction.createdAt),
      statusColor: this.getStatusColor(transaction.status),
      statusText: this.getStatusText(transaction.status),
    };
  }

  private formatAmount(amount: string, decimals: number): string {
    const value = parseFloat(amount) / Math.pow(10, decimals);
    if (value < 0.000001) return value.toExponential(2);
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(6);
  }

  private getTransactionAge(createdAt: string): string {
    const age = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case "success":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      case "cancelled":
        return "text-orange-400";
      case "rejected":
        return "text-red-300";
      case "expired":
        return "text-gray-400";
      case "pending":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case "success":
        return "✓";
      case "failed":
        return "✗";
      case "cancelled":
        return "⊘";
      case "rejected":
        return "⊗";
      case "expired":
        return "⏱";
      case "pending":
        return "⏳";
      default:
        return status;
    }
  }
}

export const swapHistoryService = new SwapHistoryService();
export type {
  SwapTransaction,
  SwapTransactionCreate,
  SwapTransactionUpdate,
  SwapHistoryResponse,
};
