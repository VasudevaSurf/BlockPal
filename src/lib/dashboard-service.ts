// src/lib/dashboard-service.ts - FIXED VERSION
import { ethers } from "ethers";
import axios from "axios";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "tFaWgpOB1QAns76d3CgbT";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-xCH4APq7mHESUuEFzDU5GTSy";
const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Use the free API endpoint
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Known token mappings (contract address -> CoinGecko ID)
const TOKEN_ID_MAPPINGS: Record<string, string> = {
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "tether", // USDT
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "usd-coin", // USDC
  "0x6b175474e89094c44da98b954eedeac495271d0f": "dai", // DAI
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "weth", // WETH
  "0x514910771af9ca656af840dff83e8264ecf986ca": "chainlink", // LINK
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "uniswap", // UNI
  // Add more known tokens as needed
};

interface TokenMetadata {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  imageUrl: string;
  geckoId?: string;
}

interface TokenBalance {
  contractAddress: string;
  balance: string;
  balanceFormatted: number;
}

interface TokenDashboardData {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  imageUrl: string;
  balance: number;
  price: number;
  value: number;
  change24h: number;
}

export class DashboardService {
  private provider: ethers.JsonRpcProvider;
  private coinGeckoHeaders: Record<string, string>;
  private priceCache: Map<
    string,
    { price: number; change24h: number; timestamp: number }
  > = new Map();
  private CACHE_DURATION = 60000; // 1 minute cache

  constructor() {
    this.provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    // Use demo API key header for free tier
    this.coinGeckoHeaders = {
      accept: "application/json",
      "x-cg-demo-api-key": COINGECKO_API_KEY,
    };
  }

  // Get all token balances from Alchemy
  async getWalletTokens(walletAddress: string): Promise<TokenBalance[]> {
    try {
      console.log("🔍 Fetching tokens from Alchemy for:", walletAddress);

      const tokens: TokenBalance[] = [];

      // Get ETH balance first
      const ethBalance = await this.provider.getBalance(walletAddress);
      const ethBalanceFormatted = parseFloat(ethers.formatEther(ethBalance));

      // Always include ETH
      tokens.push({
        contractAddress: "native",
        balance: ethBalance.toString(),
        balanceFormatted: ethBalanceFormatted,
      });

      // Get ERC-20 tokens using Alchemy
      const response = await axios.post(ALCHEMY_URL, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [walletAddress],
        id: 1,
      });

      if (response.data.result?.tokenBalances) {
        for (const token of response.data.result.tokenBalances) {
          // Skip if balance is 0
          if (token.tokenBalance === "0x0" || token.tokenBalance === "0x") {
            continue;
          }

          const contractAddress = token.contractAddress.toLowerCase();

          // Get decimals using Alchemy's getTokenMetadata
          let decimals = 18;
          try {
            const metadataResponse = await axios.post(ALCHEMY_URL, {
              jsonrpc: "2.0",
              method: "alchemy_getTokenMetadata",
              params: [token.contractAddress],
              id: 1,
            });
            decimals = metadataResponse.data.result?.decimals || 18;
          } catch {
            console.log(
              `⚠️ Could not get decimals for ${contractAddress}, using 18`
            );
          }

          const balance = parseFloat(
            ethers.formatUnits(token.tokenBalance, decimals)
          );

          tokens.push({
            contractAddress,
            balance: token.tokenBalance,
            balanceFormatted: balance,
          });
        }
      }

      console.log(`✅ Found ${tokens.length} tokens with balance`);
      return tokens;
    } catch (error) {
      console.error("❌ Error fetching wallet tokens:", error);
      throw error;
    }
  }

  // Get token metadata from CoinGecko with better error handling
  async getTokenMetadata(
    contractAddress: string
  ): Promise<TokenMetadata | null> {
    try {
      if (contractAddress === "native") {
        return {
          contractAddress: "native",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          imageUrl:
            "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
          geckoId: "ethereum",
        };
      }

      // Check if we have a known mapping
      const knownId = TOKEN_ID_MAPPINGS[contractAddress.toLowerCase()];
      if (knownId) {
        console.log(
          `✅ Using known mapping for ${contractAddress}: ${knownId}`
        );

        // Get data using the known ID
        const response = await axios.get(
          `${COINGECKO_BASE_URL}/coins/${knownId}`,
          {
            headers: this.coinGeckoHeaders,
            timeout: 5000,
          }
        );

        if (response.data) {
          return {
            contractAddress,
            symbol: response.data.symbol?.toUpperCase() || "UNKNOWN",
            name: response.data.name || "Unknown Token",
            decimals:
              response.data.detail_platforms?.ethereum?.decimal_place || 18,
            imageUrl:
              response.data.image?.large || response.data.image?.small || "",
            geckoId: response.data.id,
          };
        }
      }

      // Try by contract address
      const response = await axios.get(
        `${COINGECKO_BASE_URL}/coins/ethereum/contract/${contractAddress}`,
        {
          headers: this.coinGeckoHeaders,
          timeout: 5000,
        }
      );

      if (response.data) {
        return {
          contractAddress,
          symbol: response.data.symbol?.toUpperCase() || "UNKNOWN",
          name: response.data.name || "Unknown Token",
          decimals:
            response.data.detail_platforms?.ethereum?.decimal_place || 18,
          imageUrl:
            response.data.image?.large || response.data.image?.small || "",
          geckoId: response.data.id,
        };
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log("⚠️ CoinGecko rate limit hit");
      } else if (error.response?.status === 404) {
        console.log(`⚠️ Token ${contractAddress} not found on CoinGecko`);
      } else {
        console.log(
          `⚠️ CoinGecko API error for ${contractAddress}:`,
          error.message
        );
      }
    }
    return null;
  }

  // Get metadata from Alchemy as fallback
  async getTokenMetadataFromAlchemy(
    contractAddress: string
  ): Promise<TokenMetadata | null> {
    try {
      const response = await axios.post(ALCHEMY_URL, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenMetadata",
        params: [contractAddress],
        id: 1,
      });

      const metadata = response.data.result;
      if (metadata) {
        return {
          contractAddress,
          symbol: metadata.symbol || "UNKNOWN",
          name: metadata.name || "Unknown Token",
          decimals: metadata.decimals || 18,
          imageUrl: metadata.logo || "",
        };
      }
    } catch (error) {
      console.log(`⚠️ Alchemy metadata fetch failed for ${contractAddress}`);
    }
    return null;
  }

  // Enhanced batch price fetching with better fallbacks
  async batchFetchTokenPrices(
    contractAddresses: string[]
  ): Promise<Record<string, { price: number; change24h: number }>> {
    const prices: Record<string, { price: number; change24h: number }> = {};

    try {
      console.log(
        "💰 Batch fetching prices for",
        contractAddresses.length,
        "tokens"
      );

      // Handle ETH separately
      if (contractAddresses.includes("native")) {
        try {
          // Check cache first
          const cached = this.priceCache.get("ethereum");
          if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            prices["native"] = {
              price: cached.price,
              change24h: cached.change24h,
            };
            console.log("✅ Using cached ETH price:", cached.price);
          } else {
            const ethResponse = await axios.get(
              `${COINGECKO_BASE_URL}/simple/price`,
              {
                params: {
                  ids: "ethereum",
                  vs_currencies: "usd",
                  include_24hr_change: true,
                },
                headers: this.coinGeckoHeaders,
                timeout: 5000,
              }
            );

            if (ethResponse.data?.ethereum) {
              const price = ethResponse.data.ethereum.usd || 0;
              const change = ethResponse.data.ethereum.usd_24h_change || 0;
              prices["native"] = { price, change24h: change };
              this.priceCache.set("ethereum", {
                price,
                change24h: change,
                timestamp: Date.now(),
              });
              console.log("✅ ETH price fetched:", price);
            }
          }
        } catch (error) {
          console.log("⚠️ Failed to fetch ETH price, using fallback");
          prices["native"] = { price: 0, change24h: 0 };
        }
      }

      // Filter out native and get ERC-20 addresses
      const erc20Addresses = contractAddresses.filter(
        (addr) => addr !== "native"
      );

      if (erc20Addresses.length > 0) {
        // Try to get prices using known IDs first
        const knownTokens: string[] = [];
        const unknownAddresses: string[] = [];

        for (const addr of erc20Addresses) {
          const knownId = TOKEN_ID_MAPPINGS[addr.toLowerCase()];
          if (knownId) {
            knownTokens.push(knownId);
            // Map the ID back to address for later
            prices[addr.toLowerCase()] = { price: 0, change24h: 0 }; // Default
          } else {
            unknownAddresses.push(addr);
          }
        }

        // Fetch prices for known tokens by ID
        if (knownTokens.length > 0) {
          try {
            const idsString = knownTokens.join(",");
            const response = await axios.get(
              `${COINGECKO_BASE_URL}/simple/price`,
              {
                params: {
                  ids: idsString,
                  vs_currencies: "usd",
                  include_24hr_change: true,
                },
                headers: this.coinGeckoHeaders,
                timeout: 5000,
              }
            );

            if (response.data) {
              // Map prices back to contract addresses
              for (const [contractAddr, geckoId] of Object.entries(
                TOKEN_ID_MAPPINGS
              )) {
                if (response.data[geckoId]) {
                  prices[contractAddr.toLowerCase()] = {
                    price: response.data[geckoId].usd || 0,
                    change24h: response.data[geckoId].usd_24h_change || 0,
                  };
                  console.log(
                    `✅ Price for ${geckoId}: $${response.data[geckoId].usd}`
                  );
                }
              }
            }
          } catch (error) {
            console.log("⚠️ Failed to fetch known token prices");
          }
        }

        // Try to fetch remaining unknown tokens by contract address
        if (unknownAddresses.length > 0) {
          try {
            const addresses = unknownAddresses.join(",");
            const response = await axios.get(
              `${COINGECKO_BASE_URL}/simple/token_price/ethereum`,
              {
                params: {
                  contract_addresses: addresses,
                  vs_currencies: "usd",
                  include_24hr_change: true,
                },
                headers: this.coinGeckoHeaders,
                timeout: 5000,
              }
            );

            if (response.data) {
              for (const [address, data] of Object.entries(response.data)) {
                const priceData = data as any;
                prices[address.toLowerCase()] = {
                  price: priceData.usd || 0,
                  change24h: priceData.usd_24h_change || 0,
                };
              }
            }
          } catch (error) {
            console.log("⚠️ Failed to fetch unknown token prices");
          }
        }

        // Set 0 for any tokens that still don't have prices
        for (const addr of erc20Addresses) {
          if (!prices[addr.toLowerCase()]) {
            prices[addr.toLowerCase()] = { price: 0, change24h: 0 };
          }
        }
      }

      return prices;
    } catch (error) {
      console.error("❌ Error in batch price fetching:", error);
      // Return 0 prices as fallback
      for (const addr of contractAddresses) {
        prices[addr.toLowerCase()] = { price: 0, change24h: 0 };
      }
      return prices;
    }
  }

  // Get metadata with fallback chain
  async getTokenMetadataWithFallback(
    contractAddress: string
  ): Promise<TokenMetadata> {
    // Try CoinGecko first
    let metadata = await this.getTokenMetadata(contractAddress);
    if (metadata) {
      console.log(`✅ Got metadata from CoinGecko for ${contractAddress}`);
      return metadata;
    }

    // Try Alchemy
    metadata = await this.getTokenMetadataFromAlchemy(contractAddress);
    if (metadata) {
      console.log(`✅ Got metadata from Alchemy for ${contractAddress}`);
      return metadata;
    }

    // Return minimal data as last resort
    console.log(`⚠️ Using minimal metadata for ${contractAddress}`);
    return {
      contractAddress,
      symbol: "UNKNOWN",
      name: "Unknown Token",
      decimals: 18,
      imageUrl: "",
    };
  }

  // Initialize dashboard for new user
  async initializeNewUser(walletAddress: string): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
    metadata: TokenMetadata[];
  }> {
    console.log("🚀 Initializing dashboard for new user:", walletAddress);

    try {
      // Step 1: Get all tokens from Alchemy
      const allTokens = await this.getWalletTokens(walletAddress);
      console.log(`📊 Found ${allTokens.length} tokens with balance`);

      // Step 2: Get metadata for each token
      const metadata: TokenMetadata[] = [];
      const metadataPromises = allTokens.map(async (token) => {
        const tokenMetadata = await this.getTokenMetadataWithFallback(
          token.contractAddress
        );
        return tokenMetadata;
      });

      const metadataResults = await Promise.all(metadataPromises);
      metadata.push(...metadataResults);

      // Step 3: Batch fetch prices
      const addresses = allTokens.map((t) => t.contractAddress);
      const prices = await this.batchFetchTokenPrices(addresses);

      // Step 4: Combine data and calculate values
      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const token of allTokens) {
        const meta = metadata.find(
          (m) =>
            m.contractAddress.toLowerCase() ===
            token.contractAddress.toLowerCase()
        );
        const priceData = prices[token.contractAddress.toLowerCase()] || {
          price: 0,
          change24h: 0,
        };
        const value = token.balanceFormatted * priceData.price;

        dashboardTokens.push({
          contractAddress: token.contractAddress,
          symbol: meta?.symbol || "UNKNOWN",
          name: meta?.name || "Unknown",
          decimals: meta?.decimals || 18,
          imageUrl: meta?.imageUrl || "",
          balance: token.balanceFormatted,
          price: priceData.price,
          value: value,
          change24h: priceData.change24h,
        });

        totalValue += value;
      }

      console.log(
        `✅ Dashboard initialized with ${
          dashboardTokens.length
        } tokens, total value: $${totalValue.toFixed(2)}`
      );

      return {
        tokens: dashboardTokens,
        totalValue,
        metadata,
      };
    } catch (error) {
      console.error("❌ Error initializing dashboard:", error);
      throw error;
    }
  }

  // Refresh dashboard
  async refreshDashboard(
    walletAddress: string,
    storedMetadata: TokenMetadata[]
  ): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
  }> {
    console.log("🔄 Refreshing dashboard for:", walletAddress);

    try {
      // Get current token balances
      const currentBalances = await this.getWalletTokens(walletAddress);

      // For any new tokens not in metadata, fetch their metadata
      const newTokenAddresses = currentBalances
        .map((b) => b.contractAddress.toLowerCase())
        .filter(
          (addr) =>
            !storedMetadata.find(
              (m) => m.contractAddress.toLowerCase() === addr
            )
        );

      const newMetadata: TokenMetadata[] = [];
      if (newTokenAddresses.length > 0) {
        console.log(
          `📋 Found ${newTokenAddresses.length} new tokens, fetching metadata...`
        );
        for (const addr of newTokenAddresses) {
          const meta = await this.getTokenMetadataWithFallback(addr);
          newMetadata.push(meta);
        }
      }

      // Combine stored and new metadata
      const allMetadata = [...storedMetadata, ...newMetadata];
      const metadataMap = new Map(
        allMetadata.map((m) => [m.contractAddress.toLowerCase(), m])
      );

      // Batch fetch current prices for all tokens
      const addresses = currentBalances.map((t) => t.contractAddress);
      const prices = await this.batchFetchTokenPrices(addresses);

      // Combine and calculate
      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const balance of currentBalances) {
        const meta = metadataMap.get(balance.contractAddress.toLowerCase());
        if (!meta) continue; // Skip if no metadata

        const priceData = prices[balance.contractAddress.toLowerCase()] || {
          price: 0,
          change24h: 0,
        };
        const value = balance.balanceFormatted * priceData.price;

        dashboardTokens.push({
          contractAddress: balance.contractAddress,
          symbol: meta.symbol,
          name: meta.name,
          decimals: meta.decimals,
          imageUrl: meta.imageUrl,
          balance: balance.balanceFormatted,
          price: priceData.price,
          value: value,
          change24h: priceData.change24h,
        });

        totalValue += value;
      }

      console.log(
        `✅ Dashboard refreshed: ${
          dashboardTokens.length
        } tokens, $${totalValue.toFixed(2)}`
      );

      return {
        tokens: dashboardTokens,
        totalValue,
      };
    } catch (error) {
      console.error("❌ Error refreshing dashboard:", error);
      throw error;
    }
  }

  // Add token to dashboard
  async addTokenToDashboard(
    contractAddress: string,
    walletAddress: string
  ): Promise<{
    token: TokenDashboardData;
    metadata: TokenMetadata;
  }> {
    console.log("➕ Adding token to dashboard:", contractAddress);

    try {
      contractAddress = contractAddress.toLowerCase();

      // Get metadata
      const metadata = await this.getTokenMetadataWithFallback(contractAddress);

      // Get balance
      let balance = 0;
      try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(
          contractAddress,
          abi,
          this.provider
        );
        const rawBalance = await contract.balanceOf(walletAddress);
        balance = parseFloat(ethers.formatUnits(rawBalance, metadata.decimals));
      } catch (error) {
        console.log("⚠️ Could not fetch balance, assuming 0");
      }

      // Get price
      const prices = await this.batchFetchTokenPrices([contractAddress]);
      const priceData = prices[contractAddress] || { price: 0, change24h: 0 };

      const token: TokenDashboardData = {
        contractAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        imageUrl: metadata.imageUrl,
        balance,
        price: priceData.price,
        value: balance * priceData.price,
        change24h: priceData.change24h,
      };

      console.log(`✅ Token added: ${metadata.symbol} (${metadata.name})`);
      return { token, metadata };
    } catch (error) {
      console.error("❌ Error adding token:", error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();
