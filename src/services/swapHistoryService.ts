// src/services/swapHistoryService.ts - SIMPLIFIED VERSION
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

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
}

interface SwapTransactionUpdate {
  status: string;
  txHash?: string;
  gasUsed?: string;
  errorMessage?: string;
  toAmount?: string;
}

export interface SwapTransaction {
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
  status: string;
  gasUsed?: string;
  gasPrice?: string;
  gasCostETH?: string;
  gasCostUSD?: number;
  gasMode?: string;
  slippage?: number;
  route?: string;
  protocol?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
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
  async createTransaction(
    data: SwapTransactionCreate
  ): Promise<{ id: string; status: string } | null> {
    try {
      console.log("📤 Sending swap transaction to backend:", data);

      const response = await fetch(`${API_BASE_URL}/api/swap-history/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error(`Backend returned status ${response.status}`);
        return null;
      }

      const result = await response.json();
      console.log("📥 Backend response:", result);

      if (result.success && result.data) {
        return {
          id: result.data.id,
          status: result.data.status,
        };
      }

      return null;
    } catch (error) {
      console.error("❌ Failed to save transaction to database:", error);
      return null;
    }
  }

  async updateTransaction(
    id: string,
    update: SwapTransactionUpdate
  ): Promise<any> {
    if (!id || id.startsWith("temp-")) {
      return null;
    }

    try {
      console.log(`📤 Updating transaction ${id}:`, update);

      const response = await fetch(
        `${API_BASE_URL}/api/swap-history/update/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(update),
        }
      );

      if (!response.ok) {
        console.error(`Failed to update transaction: ${response.status}`);
        return null;
      }

      const result = await response.json();
      console.log("📥 Update response:", result);

      return result.data;
    } catch (error) {
      console.error("❌ Failed to update transaction:", error);
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
    }
  ): Promise<SwapHistoryResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.chainId)
        params.append("chainId", options.chainId.toString());
      if (options?.status) params.append("status", options.status);
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());

      console.log(`📤 Fetching history for ${walletAddress}`);

      const response = await fetch(
        `${API_BASE_URL}/api/swap-history/wallet/${walletAddress}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch history: ${response.status}`);
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

      const result = await response.json();
      console.log(
        `📥 Retrieved ${result.data?.transactions?.length || 0} transactions`
      );

      if (result.success && result.data) {
        return result.data;
      }

      return {
        transactions: [],
        pagination: {
          total: 0,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      };
    } catch (error) {
      console.error("❌ Failed to fetch history:", error);
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
  }
}

export const swapHistoryService = new SwapHistoryService();
