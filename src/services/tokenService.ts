// src/services/tokenService.ts - Updated Frontend token service
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
  isPopular?: boolean;
  possibleSpam?: boolean;
  verifiedContract?: boolean;
}

interface WalletTokensResponse {
  wallet: string;
  chainId: number;
  tokens: TokenBalance[];
  totalValue: number;
  tokenCount: number;
  lastUpdated: string;
}

interface NativeBalanceResponse {
  wallet: string;
  chainId: number;
  nativeBalance: {
    balance: number;
    balanceWei: string;
  };
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
    // Use environment variable or fallback to localhost
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api/tokens";
    console.log("🔗 TokenService initialized with base URL:", this.baseURL);
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

      const url = `${this.baseURL}/wallet/${walletAddress}?chain=${chainId}`;
      console.log("📡 Making request to:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Add CORS headers if needed
          Accept: "application/json",
        },
        // Add timeout
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });

      console.log("📡 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`;
        console.error("❌ API Error Response:", errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("📦 API Response:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch wallet tokens");
      }

      console.log(
        `✅ Fetched ${data.data.tokenCount} tokens with total value $${
          data.data.totalValue?.toFixed(2) || "0.00"
        } for wallet ${walletAddress}`
      );

      return data.data;
    } catch (error) {
      console.error("❌ Error fetching wallet tokens:", error);

      // Handle network errors gracefully
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error(
          "Network error: Please check your internet connection and server status"
        );
      }

      // Handle timeout errors
      if (error.name === "AbortError") {
        throw new Error("Request timeout: The server took too long to respond");
      }

      throw error;
    }
  }

  /**
   * Get native token balance for a wallet
   */
  async getNativeBalance(
    walletAddress: string,
    chainId: number
  ): Promise<NativeBalanceResponse> {
    try {
      console.log(
        `💎 Fetching native balance for wallet: ${walletAddress} on chain: ${chainId}`
      );

      const url = `${this.baseURL}/native/${walletAddress}?chain=${chainId}`;
      console.log("📡 Making request to:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000), // 15 seconds timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch native balance");
      }

      console.log(
        `✅ Fetched native balance: ${data.data.nativeBalance.balance} for wallet ${walletAddress}`
      );

      return data.data;
    } catch (error) {
      console.error("❌ Error fetching native balance:", error);
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
        signal: AbortSignal.timeout(10000), // 10 seconds timeout
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
        signal: AbortSignal.timeout(10000), // 10 seconds timeout
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
        signal: AbortSignal.timeout(10000), // 10 seconds timeout
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
        signal: AbortSignal.timeout(5000), // 5 seconds timeout
      });

      const data = await response.json();
      console.log("🏥 Health status:", data);
      return data;
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
        signal: AbortSignal.timeout(10000), // 10 seconds timeout
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
   * Check if the service is available
   */
  async ping(): Promise<boolean> {
    try {
      const health = await this.getHealthStatus();
      return health.status === "healthy";
    } catch (error) {
      console.warn("🔴 Service ping failed:", error.message);
      return false;
    }
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    if (value === 0) return "$0.00";
    if (value < 0.01) return "< $0.01";
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
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

    // For very large amounts, use abbreviated format
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }

    return amount.toFixed(Math.min(decimals, 8));
  }

  /**
   * Format percentage change
   */
  formatPercentage(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }

  /**
   * Validate wallet address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate chain ID
   */
  isValidChainId(chainId: number): boolean {
    return Number.isInteger(chainId) && chainId > 0;
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export type {
  TokenBalance,
  WalletTokensResponse,
  NativeBalanceResponse,
  PopularTokensResponse,
  SupportedChain,
};
