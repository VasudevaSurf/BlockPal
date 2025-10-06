// src/services/coinlesService.ts - COMPLETE FIXED VERSION
interface TokenSearchResult {
  poolAddress: string;
  contractAddress: string;
  contractAddressDisplay: string;
  name: string;
  symbol: string;
  price: number;
  logo: string;
  change24h: number;
  liquidity: number;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  poolCount: number;
  displayName: string;
}

interface TokenInfo {
  metadata: {
    name: string;
    symbol: string;
    logo: string;
    description: string;
    websites: string[];
    socials: { [key: string]: string };
    gtScore: number;
    tokenScore: number;
    poolScore: number;
    palScore: number;
    riskLevel: string;
    cautionNotes: string[];
    holders: number;
    holderDistribution: {
      top_10: string;
      "11_30": string;
      "31_50": string;
      rest: string;
    };
    isHoneypot: boolean;
    mintAuthority: string | null;
    freezeAuthority: string | null;
  };
  marketData: {
    price: number;
    change24h: number;
    priceChange: {
      m5: number;
      m15: number;
      m30: number;
      h1: number;
      h6: number;
      h24: number;
    };
    marketCap: number;
    fdv: number;
    volume24h: number;
    liquidity: number;
  } | null;
  transactions: {
    buys24h: number;
    sells24h: number;
    buys6h: number;
    sells6h: number;
    buys1h: number;
    sells1h: number;
    netBuys24h: number;
    totalTx24h: number;
  } | null;
}

interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface WatchlistToken {
  chainId: string;
  contractAddress: string;
  poolAddress: string;
  tokenName: string;
  tokenSymbol: string;
  addedAt?: string;
  lastViewed?: string;
}

class CoinLesService {
  private baseURL: string;

  constructor() {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL_COIN ||
      process.env.NEXT_PUBLIC_WALLET_SERVICE_URL ||
      "http://localhost:5002";

    this.baseURL = apiUrl.replace(/\/api$/, "");

    console.log("CoinLes Service initialized with URL:", this.baseURL);
  }

  async searchTokens(
    chain: string,
    query: string
  ): Promise<TokenSearchResult[]> {
    try {
      const url = `${
        this.baseURL
      }/api/coinles/search?chain=${chain}&query=${encodeURIComponent(query)}`;
      console.log("Searching tokens:", { chain, query, url });

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      console.log("Search response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Search failed:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to search tokens");
      }

      console.log("Found tokens:", data.data?.results?.length || 0);
      return data.data.results || [];
    } catch (error: any) {
      console.error("Error searching tokens:", error);
      return [];
    }
  }

  async getTokenInfo(
    network: string,
    contract: string,
    pool?: string
  ): Promise<TokenInfo | null> {
    try {
      let url = `${this.baseURL}/api/coinles/token-info?network=${network}&contract=${contract}`;
      if (pool) {
        url += `&pool=${pool}`;
      }

      console.log("Getting token info:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to get token info");
      }

      return data.data;
    } catch (error: any) {
      console.error("Error getting token info:", error);
      return null;
    }
  }

  async getChartData(
    network: string,
    pool: string,
    timeframe: string
  ): Promise<ChartDataPoint[]> {
    try {
      const url = `${this.baseURL}/api/coinles/chart-data?network=${network}&pool=${pool}&timeframe=${timeframe}`;

      console.log("Getting chart data:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to get chart data");
      }

      return data.data.chartData || [];
    } catch (error: any) {
      console.error("Error getting chart data:", error);
      return [];
    }
  }

  async getUserWatchlist(email: string): Promise<WatchlistToken[]> {
    try {
      const url = `${this.baseURL}/api/user-watchlist/${email}`;
      console.log("Getting watchlist:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Watchlist response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Watchlist fetch failed:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to get watchlist");
      }

      console.log(
        "Loaded watchlist:",
        data.data?.watchlist?.length || 0,
        "tokens"
      );
      return data.data.watchlist || [];
    } catch (error: any) {
      console.error("Error getting watchlist:", error);
      return [];
    }
  }

  async addTokenToWatchlist(
    email: string,
    token: WatchlistToken
  ): Promise<boolean> {
    try {
      const url = `${this.baseURL}/api/user-watchlist/${email}/add-token`;
      console.log("Adding token to watchlist:", { email, token });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(token),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Token added:", data.success);
      return data.success;
    } catch (error: any) {
      console.error("Error adding token to watchlist:", error);
      return false;
    }
  }

  async removeTokenFromWatchlist(
    email: string,
    chainId: string,
    contractAddress: string
  ): Promise<boolean> {
    try {
      const url = `${this.baseURL}/api/user-watchlist/${email}/remove-token?chainId=${chainId}&contractAddress=${contractAddress}`;
      console.log("Removing token from watchlist:", {
        email,
        chainId,
        contractAddress,
      });

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Token removed:", data.success);
      return data.success;
    } catch (error: any) {
      console.error("Error removing token from watchlist:", error);
      return false;
    }
  }

  async addRecentSearch(email: string, search: any): Promise<void> {
    try {
      const url = `${this.baseURL}/api/user-watchlist/${email}/add-search`;

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(search),
      });
    } catch (error: any) {
      console.error("Error adding recent search:", error);
    }
  }
}

export const coinlesService = new CoinLesService();
export type { TokenSearchResult, TokenInfo, ChartDataPoint, WatchlistToken };
