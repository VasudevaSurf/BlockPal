// src/services/swapService.ts
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
    this.baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api/swap";
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

      const url = query
        ? `${this.baseURL}/search/${chainId}?query=${encodeURIComponent(query)}`
        : `${this.baseURL}/search/${chainId}`;

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

      const response = await fetch(`${this.baseURL}/tokens/${chainId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

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
}

export const swapService = new SwapService();
