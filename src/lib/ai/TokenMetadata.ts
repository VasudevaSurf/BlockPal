// src/lib/ai/TokenMetadata.ts
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const CHAIN_FALLBACK_ORDER = [
  "ethereum",
  "base",
  "polygon-pos",
  "binance-smart-chain",
  "arbitrum-one",
  "avalanche",
];

class TokenMetadata {
  private apiKey: string;
  private headers: { [key: string]: string };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.headers = { "x-cg-demo-api-key": apiKey };
  }

  isContractAddress(input: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/i.test(input);
  }

  async getTokenData(input: string) {
    let tokenData = null;
    let usedContract = false;

    if (this.isContractAddress(input)) {
      tokenData = await this.getTokenDataByContract(input.toLowerCase());
      usedContract = true;
    } else {
      const tokenId = await this.findTokenId(input);
      if (tokenId) {
        tokenData = await this.getTokenDataById(tokenId);
      }
    }

    if (!tokenData) {
      return {
        error: "TOKEN_NOT_FOUND",
        searchedFor: input,
        message: usedContract
          ? `Token with contract address "${input}" not found.`
          : `Token "${input}" not found.`,
      };
    }

    return this.extractTokenData(tokenData);
  }

  async findTokenId(input: string): Promise<string | null> {
    const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(
      input
    )}`;

    try {
      const response = await fetch(url, {
        headers: this.headers,
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const coins = data.coins || [];

      const exactMatch = coins.find(
        (coin: any) =>
          coin.symbol?.toLowerCase() === input.toLowerCase() ||
          coin.name?.toLowerCase() === input.toLowerCase()
      );

      return exactMatch?.id || null;
    } catch (error) {
      console.error("Error finding token ID:", error);
      return null;
    }
  }

  async getTokenDataById(tokenId: string) {
    const url = `${COINGECKO_BASE_URL}/coins/${tokenId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false`;

    try {
      const response = await fetch(url, {
        headers: this.headers,
        next: { revalidate: 60 }, // Cache for 1 minute
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return await response.json();
    } catch (error) {
      console.error("Error getting token data by ID:", error);
      return null;
    }
  }

  async getTokenDataByContract(contractAddress: string) {
    for (const chainId of CHAIN_FALLBACK_ORDER) {
      try {
        const url = `${COINGECKO_BASE_URL}/coins/${chainId}/contract/${contractAddress}`;
        const response = await fetch(url, {
          headers: this.headers,
          next: { revalidate: 60 },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            data._platform = chainId;
            data._contractAddress = contractAddress;
            return data;
          }
        }
      } catch (error) {
        // Continue to next chain
        continue;
      }
    }
    return null;
  }

  extractTokenData(data: any) {
    const market = data.market_data;

    let description = null;
    if (data.description?.en) {
      description = data.description.en
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    const links: { [key: string]: string } = {};
    if (data.links) {
      if (data.links.homepage?.[0]) links.website = data.links.homepage[0];
      if (data.links.twitter_screen_name)
        links.twitter = `https://twitter.com/${data.links.twitter_screen_name}`;
      if (data.links.telegram_channel_identifier)
        links.telegram = `https://t.me/${data.links.telegram_channel_identifier}`;
      if (data.links.blockchain_site?.[0])
        links.explorer = data.links.blockchain_site[0];
    }

    return {
      name: data.name,
      symbol: data.symbol?.toUpperCase(),
      contractAddress: data._contractAddress || data.contract_address || null,
      platform: data._platform || null,
      rank: data.market_cap_rank || null,
      description: description,
      categories: data.categories || [],
      price: {
        current: market?.current_price?.usd || null,
        ath: market?.ath?.usd || null,
        atl: market?.atl?.usd || null,
        change24h: market?.price_change_percentage_24h || null,
        change7d: market?.price_change_percentage_7d || null,
        change30d: market?.price_change_percentage_30d || null,
      },
      marketData: {
        marketCap: market?.market_cap?.usd || null,
        volume24h: market?.total_volume?.usd || null,
        fdv: market?.fully_diluted_valuation?.usd || null,
      },
      supply: {
        circulating: market?.circulating_supply || null,
        total: market?.total_supply || null,
        max: market?.max_supply || null,
      },
      links: links,
    };
  }
}

export default TokenMetadata;
