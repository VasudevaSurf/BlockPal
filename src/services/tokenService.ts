// src/services/tokenService.ts - Frontend token service
interface TokenBalance {
  id: string;
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  balanceWei: string;
  value: number;
  change24h: number;
  price: number;
  isNative: boolean;
  logoUrl?: string;
}

interface WalletTokensResponse {
  wallet: string;
  chainId: number;
  tokens: TokenBalance[];
  totalValue: number;
  tokenCount: number;
  lastUpdated: string;
}

interface PopularTokensResponse {
  chainId: number;
  tokens: Array<{
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  }>;
  count: number;
}

interface SupportedChain {
  chainId: number;
  name: string;
  symbol: string;
  popularTokenCount: number;
}

interface ChainsResponse {
  chains: SupportedChain[];
  count: number;
}

class TokenService {
  private baseURL: string;

  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api/tokens";
  }

  /**
   * Get token balances for a wallet on a specific chain
   */
  async getWalletTokens(
    walletAddress: string,
    chainId: number
  ): Promise<WalletTokensResponse> {
    try {
      console.log(
        `🪙 Fetching tokens for wallet: ${walletAddress} on chain: ${chainId}`
      );

      const response = await fetch(
        `${this.baseURL}/wallet/${walletAddress}?chain=${chainId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch wallet tokens");
      }

      console.log(
        `✅ Fetched ${data.data.tokenCount} tokens for wallet ${walletAddress}`
      );
      return data.data;
    } catch (error) {
      console.error("❌ Error fetching wallet tokens:", error);
      throw error;
    }
  }

  /**
   * Get popular tokens for a specific chain
   */
  async getPopularTokens(chainId: number): Promise<PopularTokensResponse> {
    try {
      console.log(`🌟 Fetching popular tokens for chain: ${chainId}`);

      const response = await fetch(`${this.baseURL}/popular/${chainId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch popular tokens");
      }

      console.log(
        `✅ Fetched ${data.data.count} popular tokens for chain ${chainId}`
      );
      return data.data;
    } catch (error) {
      console.error("❌ Error fetching popular tokens:", error);
      throw error;
    }
  }

  /**
   * Get supported chains
   */
  async getSupportedChains(): Promise<ChainsResponse> {
    try {
      console.log("🔗 Fetching supported chains");

      const response = await fetch(`${this.baseURL}/chains`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch supported chains");
      }

      console.log(`✅ Fetched ${data.data.count} supported chains`);
      return data.data;
    } catch (error) {
      console.error("❌ Error fetching supported chains:", error);
      throw error;
    }
  }

  /**
   * Refresh token data for a wallet (clears cache)
   */
  async refreshWalletTokens(walletAddress: string): Promise<void> {
    try {
      console.log(`🔄 Refreshing token data for wallet: ${walletAddress}`);

      const response = await fetch(`${this.baseURL}/refresh/${walletAddress}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to refresh token data");
      }

      console.log(`✅ Refreshed token data for wallet ${walletAddress}`);
    } catch (error) {
      console.error("❌ Error refreshing token data:", error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return await response.json();
    } catch (error) {
      console.error("❌ Error fetching health status:", error);
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("❌ Error fetching service stats:", error);
      throw error;
    }
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    if (value === 0) return "$0.00";
    if (value < 0.01) return "< $0.01";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  }

  /**
   * Format token amount
   */
  formatTokenAmount(amount: number, decimals: number = 6): string {
    if (amount === 0) return "0";
    if (amount < 0.000001) return amount.toExponential(2);
    return amount.toFixed(Math.min(decimals, 8));
  }

  /**
   * Format percentage change
   */
  formatPercentage(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export type {
  TokenBalance,
  WalletTokensResponse,
  PopularTokensResponse,
  SupportedChain,
};
