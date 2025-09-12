// src/services/tokenService.ts - FIXED VERSION with better error handling
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

class TokenService {
  private baseURL: string;

  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api/tokens";
    console.log("🔗 TokenService initialized with base URL:", this.baseURL);
  }

  /**
   * FIXED: Get token balances with better error handling and debugging
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
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(45000), // Increased timeout
      });

      console.log("📡 Response status:", response.status, response.statusText);
      console.log("📡 Response headers:", Object.fromEntries(response.headers));

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        console.error("❌ API Error Response:", errorData);

        // Don't throw error for client - return empty result
        console.warn("🔄 API error, returning empty result for UX");
        return {
          wallet: walletAddress,
          chainId,
          tokens: [],
          totalValue: 0,
          tokenCount: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      let data;
      try {
        const responseText = await response.text();
        console.log("📦 Raw response text:", responseText);

        if (!responseText.trim()) {
          throw new Error("Empty response from server");
        }

        data = JSON.parse(responseText);
        console.log("📦 Parsed API Response:", data);
      } catch (parseError) {
        console.error("❌ Error parsing response:", parseError);
        throw new Error("Invalid response format from server");
      }

      if (!data.success) {
        console.error("❌ API returned error:", data.message);
        // Don't throw - return empty result for better UX
        return {
          wallet: walletAddress,
          chainId,
          tokens: [],
          totalValue: 0,
          tokenCount: 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      // FIXED: Better data validation
      const responseData = data.data || {};
      const tokens = Array.isArray(responseData.tokens)
        ? responseData.tokens
        : [];
      const totalValue =
        typeof responseData.totalValue === "number"
          ? responseData.totalValue
          : 0;
      const tokenCount =
        typeof responseData.tokenCount === "number"
          ? responseData.tokenCount
          : tokens.length;

      console.log(
        `✅ Fetched ${tokenCount} tokens with total value $${totalValue.toFixed(
          2
        )} for wallet ${walletAddress}`
      );

      // Log each token for debugging
      tokens.forEach((token, index) => {
        console.log(`🪙 Token ${index + 1}:`, {
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          value: token.value,
          isNative: token.isNative,
          contractAddress: token.contractAddress,
        });
      });

      const result = {
        wallet: walletAddress,
        chainId,
        tokens,
        totalValue,
        tokenCount,
        lastUpdated: responseData.lastUpdated || new Date().toISOString(),
      };

      console.log("✅ Returning processed token data:", {
        tokenCount: result.tokens.length,
        totalValue: result.totalValue,
        hasNativeToken: result.tokens.some((t) => t.isNative),
        chainId: result.chainId,
      });

      return result;
    } catch (error: any) {
      console.error("❌ Error fetching wallet tokens:", error);

      // Handle different error types
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        console.error("🌐 Network error - server might be down");
      } else if (error.name === "AbortError") {
        console.error("⏰ Request timeout - server took too long to respond");
      } else {
        console.error("🔧 Unexpected error:", error.message);
      }

      // FIXED: Always return a valid response instead of throwing
      console.warn(
        "🔄 Returning empty result due to error (graceful degradation)"
      );
      return {
        wallet: walletAddress,
        chainId,
        tokens: [],
        totalValue: 0,
        tokenCount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * FIXED: Get native balance with better error handling
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
        signal: AbortSignal.timeout(15000),
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
    } catch (error: any) {
      console.error("❌ Error fetching native balance:", error);
      // Return zero balance instead of throwing
      return {
        wallet: walletAddress,
        chainId,
        nativeBalance: {
          balance: 0,
          balanceWei: "0",
        },
        lastUpdated: new Date().toISOString(),
      };
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
        signal: AbortSignal.timeout(10000),
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
    } catch (error: any) {
      console.error("❌ Error refreshing token data:", error);
      // Don't throw - just log the error
      console.warn("⚠️ Token refresh failed, but continuing...");
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
        signal: AbortSignal.timeout(5000),
      });

      const data = await response.json();
      console.log("🏥 Health status:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Error fetching health status:", error);
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Check if the service is available
   */
  async ping(): Promise<boolean> {
    try {
      const health = await this.getHealthStatus();
      const isHealthy = health.status === "healthy";
      console.log(
        `🔔 Service ping result: ${isHealthy ? "healthy" : "unhealthy"}`
      );
      return isHealthy;
    } catch (error: any) {
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
export type { TokenBalance, WalletTokensResponse, NativeBalanceResponse };
