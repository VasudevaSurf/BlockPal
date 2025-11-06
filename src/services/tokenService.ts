// src/services/tokenService.ts - WITH FULL DEBUG LOGGING
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
  usdChange24h?: number;
  price: number;
  isNative: boolean;
  logoUrl?: string;
  isPopular?: boolean;
  possibleSpam?: boolean;
  verifiedContract?: boolean;
}

interface WalletTokensResponse {
  wallet: string;
  chainId: number | string;
  chainName: string;
  tokens: TokenBalance[];
  totalValue: number;
  mainListValue: number;
  total24hrChange: number;
  tokenCount: number;
  presetTokenCount: number;
  hiddenTokenCount: number;
  showingHidden: boolean;
  hasHiddenTokens: boolean;
  lastUpdated: string;
}

class TokenService {
  private baseURL: string;
  private debugMode: boolean;

  constructor() {
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api/tokens";
    this.debugMode = true; // Force debug mode
    console.log("🔗 TokenService initialized with base URL:", this.baseURL);
  }

  async getWalletTokens(
    walletAddress: string,
    chainId: number | string,
    showHidden: boolean = false
  ): Promise<WalletTokensResponse> {
    console.log("\n🟢🟢🟢 TOKEN SERVICE: getWalletTokens START 🟢🟢🟢");
    console.log("📥 Request Parameters:");
    console.log({
      walletAddress,
      chainId,
      chainIdType: typeof chainId,
      showHidden,
      baseURL: this.baseURL,
    });

    try {
      const url = `${this.baseURL}/wallet/${walletAddress}?chain=${chainId}&showHidden=${showHidden}`;
      console.log("\n📡 Making API request to:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(45000),
      });

      console.log("\n📡 Response received:");
      console.log({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        console.error("❌ Response not OK");
        let errorData;
        try {
          errorData = await response.json();
          console.error("Error data:", errorData);
        } catch {
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        console.warn("🔄 Returning empty result for UX");
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

      console.log("\n📦 Parsing response...");
      let data;
      try {
        const responseText = await response.text();
        console.log("Raw response length:", responseText.length);
        console.log(
          "Raw response preview:",
          responseText.substring(0, 200) + "..."
        );

        if (!responseText.trim()) {
          throw new Error("Empty response from server");
        }

        data = JSON.parse(responseText);
        console.log("\n✅ Parsed response structure:");
        console.log({
          success: data.success,
          hasData: !!data.data,
          dataKeys: data.data ? Object.keys(data.data) : [],
        });
      } catch (parseError) {
        console.error("❌ Parse error:", parseError);
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

      console.log("\n📊 Response Data Summary:");
      console.log({
        tokenCount: tokens.length,
        totalValue: responseData.totalValue,
        chainName: responseData.chainName,
        presetTokenCount: responseData.presetTokenCount,
        hiddenTokenCount: responseData.hiddenTokenCount,
      });

      if (tokens.length > 0) {
        console.log("\n🪙 First 3 tokens:");
        tokens.slice(0, 3).forEach((token, i) => {
          console.log(`  ${i + 1}. ${token.symbol}:`, {
            balance: token.balance,
            value: token.value,
            price: token.price,
          });
        });
      }

      const presetTokenCount = responseData.presetTokenCount || 0;
      const mainListTokens = tokens.slice(0, presetTokenCount);

      const mainListValue = mainListTokens.reduce((sum, token) => {
        return sum + (typeof token.value === "number" ? token.value : 0);
      }, 0);

      const mainList24hrChange = mainListTokens.reduce((sum, token) => {
        return (
          sum +
          (typeof token.usdChange24h === "number" ? token.usdChange24h : 0)
        );
      }, 0);

      const totalValue = responseData.totalValue || 0;

      const result = {
        wallet: walletAddress,
        chainId,
        chainName: responseData.chainName || "Unknown",
        tokens,
        totalValue,
        mainListValue,
        total24hrChange: mainList24hrChange,
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

      console.log("\n✅ Final Result:");
      console.log({
        tokenCount: result.tokenCount,
        presetCount: result.presetTokenCount,
        hiddenCount: result.hiddenTokenCount,
        totalValue: `$${result.totalValue.toFixed(2)}`,
        mainListValue: `$${result.mainListValue.toFixed(2)}`,
        total24hrChange: `$${result.total24hrChange.toFixed(2)}`,
        chainName: result.chainName,
      });

      console.log("🟢🟢🟢 TOKEN SERVICE: getWalletTokens END 🟢🟢🟢\n");
      return result;
    } catch (error: any) {
      console.error("\n❌❌❌ TOKEN SERVICE ERROR ❌❌❌");
      console.error({
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      });

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        console.error("🌐 Network error - server might be down");
      } else if (error.name === "AbortError") {
        console.error("⏰ Request timeout - server took too long");
      }

      console.warn("🔄 Returning empty result (graceful degradation)");
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

  formatCurrency(value: number): string {
    if (value === 0) return "$0.000";
    if (value < 0.001) return "< $0.001";
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(3)}`;
  }

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

  formatPercentage(value: number): string {
    if (typeof value !== "number" || isNaN(value)) {
      return "+0.00%";
    }

    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }

  format24hrChange(value: number): string {
    if (typeof value !== "number" || isNaN(value) || Math.abs(value) < 0.001) {
      return "+$0.000";
    }

    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toFixed(3)}`;
  }
}

export const tokenService = new TokenService();
export type { TokenBalance, WalletTokensResponse };
