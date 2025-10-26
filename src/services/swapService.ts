// src/services/swapService.ts - Fixed Version
interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

class SwapService {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "https://creative-amazement-production-7acf.up.railway.app";
  }

  /**
   * Search for tokens on a specific chain - returns ALL tokens, not just wallet tokens
   */
  async searchTokens(chainId: number, query?: string): Promise<SwapToken[]> {
    try {
      console.log(
        `🔍 Searching for tokens on chain ${chainId}${
          query ? ` with query: ${query}` : ""
        }`
      );

      // FIXED: Use correct API endpoint path
      const url = query
        ? `${
            this.baseURL
          }/api/swap/search/${chainId}?query=${encodeURIComponent(query)}`
        : `${this.baseURL}/api/swap/search/${chainId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`Failed to search tokens: ${response.status}`);
        return [];
      }

      const data = await response.json();

      // Handle both success response formats from your API
      const tokens = data.success ? data.data : data;

      console.log(`✅ Found ${tokens.length} tokens`);
      return Array.isArray(tokens) ? tokens : [];
    } catch (error) {
      console.error("Error searching tokens:", error);
      return [];
    }
  }

  /**
   * Get all available tokens for a chain
   */
  async getAllTokens(chainId: number): Promise<{ [key: string]: SwapToken }> {
    try {
      console.log(`📦 Fetching all tokens for chain ${chainId}`);

      // FIXED: Use correct API endpoint path
      const response = await fetch(
        `${this.baseURL}/api/swap/tokens/${chainId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch tokens: ${response.status}`);
        return {};
      }

      const data = await response.json();

      // Handle response format from your API
      const tokens = data.success ? data.data?.tokens || {} : {};

      console.log(`✅ Fetched ${Object.keys(tokens).length} tokens`);
      return tokens;
    } catch (error) {
      console.error("Error fetching all tokens:", error);
      return {};
    }
  }

  /**
   * Get swap quote
   */
  async getQuote(
    chainId: number,
    src: string,
    dst: string,
    amount: string,
    from: string,
    slippage: string = "1",
    gasMode: string = "high"
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/swap/quote/${chainId}?` +
          `src=${src}&` +
          `dst=${dst}&` +
          `amount=${amount}&` +
          `from=${from}&` +
          `slippage=${slippage}&` +
          `gasMode=${gasMode}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting quote:", error);
      throw error;
    }
  }

  /**
   * Get swap transaction
   */
  async getSwapTransaction(
    chainId: number,
    src: string,
    dst: string,
    amount: string,
    from: string,
    slippage: string = "1",
    gasMode: string = "high"
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/swap/swap/${chainId}?` +
          `src=${src}&` +
          `dst=${dst}&` +
          `amount=${amount}&` +
          `from=${from}&` +
          `slippage=${slippage}&` +
          `gasMode=${gasMode}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting swap transaction:", error);
      throw error;
    }
  }
}

export const swapService = new SwapService();
