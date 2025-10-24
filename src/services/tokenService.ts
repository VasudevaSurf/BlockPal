// src/services/tokenService.ts - Enhanced version with separate main list balance
interface TokenBalance {
  id: string;
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  balanceWei: string;
  value: number;
  change24h: number; // Percentage change
  usdChange24h?: number; // USD change amount
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
  chainName: string;
  tokens: TokenBalance[];
  totalValue: number; // ALL tokens total value
  mainListValue: number; // NEW: Only main list (preset + user-added) tokens value
  total24hrChange: number; // NEW: 24hr portfolio change in USD for main list only
  tokenCount: number;
  presetTokenCount: number; // NEW: Count of preset tokens
  hiddenTokenCount: number; // NEW: Count of hidden tokens
  showingHidden: boolean; // NEW: Whether hidden tokens are shown
  hasHiddenTokens: boolean; // NEW: Whether there are hidden tokens
  lastUpdated: string;
}

interface NativeBalanceResponse {
  wallet: string;
  chainId: number;
  nativeBalance: {
    balance: number;
    balanceWei: string;
    symbol?: string;
  };
  lastUpdated: string;
}

class TokenService {
  private baseURL: string;
  private debugMode: boolean;

  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://amusing-freedom-production-92a5.up.railway.app/api/tokens";
    this.debugMode = process.env.NODE_ENV === "development";
    console.log("🔗 TokenService initialized with base URL:", this.baseURL);
  }

  /**
   * Enhanced token fetching with email for user preferences
   */
  async getWalletTokens(
    walletAddress: string,
    chainId: number,
    showHidden: boolean = false,
    userEmail?: string // ✅ Already has parameter
  ): Promise<WalletTokensResponse> {
    try {
      console.log(
        `🪙 Fetching tokens for wallet: ${walletAddress} on chain: ${chainId}, showHidden: ${showHidden}, email: ${
          userEmail || "not provided"
        }`
      );

      // ✅ CRITICAL: Include email in query parameters
      let url = `${this.baseURL}/wallet/${walletAddress}?chain=${chainId}&showHidden=${showHidden}`;

      if (userEmail) {
        url += `&email=${encodeURIComponent(userEmail)}`;
        console.log(
          "📧 Including user email in request for user-added token support"
        );
      } else {
        console.log(
          "⚠️ No user email provided - user-added tokens won't be included in main list"
        );
      }

      console.log("📡 Making request to:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(45000),
      });

      console.log("📡 Response status:", response.status, response.statusText);

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

        // Return empty result for better UX
        console.warn("🔄 API error, returning empty result for UX");
        return {
          wallet: walletAddress,
          chainId,
          chainName: "Unknown",
          tokens: [],
          totalValue: 0,
          mainListValue: 0,
          total24hrChange: 0,
          tokenCount: 0,
          presetTokenCount: 0,
          hiddenTokenCount: 0,
          showingHidden: showHidden,
          hasHiddenTokens: false,
          lastUpdated: new Date().toISOString(),
        };
      }

      let data;
      try {
        const responseText = await response.text();
        console.log(
          "📦 Raw response text:",
          responseText.substring(0, 500) + "..."
        );

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
        return {
          wallet: walletAddress,
          chainId,
          chainName: "Unknown",
          tokens: [],
          totalValue: 0,
          mainListValue: 0,
          total24hrChange: 0,
          tokenCount: 0,
          presetTokenCount: 0,
          hiddenTokenCount: 0,
          showingHidden: showHidden,
          hasHiddenTokens: false,
          lastUpdated: new Date().toISOString(),
        };
      }

      const responseData = data.data || {};
      const tokens = Array.isArray(responseData.tokens)
        ? responseData.tokens
        : [];

      // CALCULATE SEPARATE VALUES FOR MAIN LIST VS ALL TOKENS
      const presetTokenCount = responseData.presetTokenCount || 0;

      // Main list tokens = preset tokens + user-added tokens (first presetTokenCount + user-added)
      const mainListTokens = tokens.slice(0, presetTokenCount); // Assuming API returns preset tokens first

      // Calculate main list value (only preset + user-added tokens)
      const mainListValue = mainListTokens.reduce((sum, token) => {
        return sum + (typeof token.value === "number" ? token.value : 0);
      }, 0);

      // Calculate main list 24hr change (only preset + user-added tokens)
      const mainList24hrChange = mainListTokens.reduce((sum, token) => {
        return (
          sum +
          (typeof token.usdChange24h === "number" ? token.usdChange24h : 0)
        );
      }, 0);

      // Total value includes all tokens (for reference)
      const totalValue = responseData.totalValue || 0;

      // Extract enhanced metadata
      const result = {
        wallet: walletAddress,
        chainId,
        chainName: responseData.chainName || "Unknown",
        tokens,
        totalValue, // All tokens value
        mainListValue, // NEW: Only main list tokens value
        total24hrChange: mainList24hrChange, // NEW: Only main list 24hr change
        tokenCount:
          typeof responseData.tokenCount === "number"
            ? responseData.tokenCount
            : tokens.length,
        presetTokenCount,
        hiddenTokenCount:
          typeof responseData.hiddenTokenCount === "number"
            ? responseData.hiddenTokenCount
            : 0,
        showingHidden: responseData.showingHidden === true,
        hasHiddenTokens: responseData.hasHiddenTokens === true,
        lastUpdated: responseData.lastUpdated || new Date().toISOString(),
      };

      console.log(
        `✅ Fetched ${result.tokenCount} tokens (${result.presetTokenCount} in main list, ${result.hiddenTokenCount} hidden)`
      );

      console.log(
        `💰 Main List Value: ${this.formatCurrency(
          result.mainListValue
        )} (showing in wallet balance)`
      );

      console.log(
        `📊 Total Value: ${this.formatCurrency(result.totalValue)} (all tokens)`
      );

      console.log(
        `📈 24hr Main List Change: ${this.format24hrChange(
          result.total24hrChange
        )}`
      );

      // Log token details for debugging
      if (this.debugMode && tokens.length > 0) {
        console.log("🔍 Main list tokens (first %d):", presetTokenCount);
        mainListTokens.slice(0, 3).forEach((token, index) => {
          console.log(
            `  ${index + 1}. ${token.symbol}: ${this.formatTokenAmount(
              token.balance,
              4
            )} (${this.formatCurrency(token.value)}) ${this.formatPercentage(
              token.change24h
            )}`
          );
        });
        if (mainListTokens.length > 3) {
          console.log(
            `  ... and ${mainListTokens.length - 3} more main list tokens`
          );
        }
      }

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

      // Always return a valid response instead of throwing
      console.warn(
        "🔄 Returning empty result due to error (graceful degradation)"
      );
      return {
        wallet: walletAddress,
        chainId,
        chainName: "Unknown",
        tokens: [],
        totalValue: 0,
        mainListValue: 0,
        total24hrChange: 0,
        tokenCount: 0,
        presetTokenCount: 0,
        hiddenTokenCount: 0,
        showingHidden: showHidden,
        hasHiddenTokens: false,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get native balance (unchanged)
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
          symbol: "ETH",
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
   * Format currency value - Following wallet-balance.js format
   */
  formatCurrency(value: number): string {
    if (value === 0) return "$0.000";
    if (value < 0.001) return "< $0.001";
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(3)}`; // Show 3 decimals like wallet-balance.js
  }

  /**
   * Format token amount - Following wallet-balance.js format
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
   * Format percentage - Following wallet-balance.js format
   */
  formatPercentage(value: number): string {
    // Handle invalid or missing values
    if (typeof value !== "number" || isNaN(value)) {
      return "+0.00%";
    }

    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }

  /**
   * Format 24hr change - Following wallet-balance.js format
   */
  format24hrChange(value: number): string {
    if (typeof value !== "number" || isNaN(value) || Math.abs(value) < 0.001) {
      return "+$0.000";
    }

    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toFixed(3)}`;
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

  /**
   * Get supported chains
   */
  async getSupportedChains(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/chains`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch supported chains");
      }

      console.log("⛓️ Supported chains:", data.data.chains.length);
      return data.data.chains;
    } catch (error: any) {
      console.error("❌ Error fetching supported chains:", error);
      return [];
    }
  }

  /**
   * Debug helpers
   */
  logTokenSummary(
    tokens: TokenBalance[],
    mainListValue: number,
    total24hrChange: number
  ) {
    if (!this.debugMode) return;

    console.log("📊 WALLET SUMMARY (Main List Only):");
    console.log("═".repeat(80));
    console.log(`Main List Portfolio Value: $${mainListValue.toFixed(3)}`);
    console.log(
      `24hr Main List Change: ${this.format24hrChange(total24hrChange)}`
    );
    console.log(`Main List Holdings: ${tokens.length} tokens`);
    console.log("─".repeat(80));

    tokens.forEach((token, index) => {
      const isNative = token.isNative ? " - Native Token" : "";
      console.log(`${index + 1}. ${token.symbol} (${token.name})${isNative}`);
      console.log(`   Balance: ${this.formatTokenAmount(token.balance, 6)}`);
      console.log(`   USD Value: ${this.formatCurrency(token.value)}`);
      if (token.usdChange24h !== undefined) {
        console.log(
          `   24hr Change: ${this.format24hrChange(token.usdChange24h)}`
        );
      }
      if (token.logoUrl) {
        console.log(`   Logo: ${token.logoUrl}`);
      }
      console.log("");
    });
    console.log("═".repeat(80));
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export type { TokenBalance, WalletTokensResponse, NativeBalanceResponse };
