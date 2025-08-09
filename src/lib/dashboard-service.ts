// src/lib/dashboard-service.ts
import { ethers } from "ethers";
import axios from "axios";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "tFaWgpOB1QAns76d3CgbT";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-xCH4APq7mHESUuEFzDU5GTSy";
const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Use Pro API if you have a paid key, otherwise use free API
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"; // Change to https://api.coingecko.com/api/v3 for free tier

// Preset top 20 tokens on Ethereum (lowercase for comparison)
const PRESET_TOKENS = [
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // UNI
  "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", // MATIC
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce", // SHIB
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", // AAVE
  "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", // MKR
  "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f", // SNX
  "0xd533a949740bb3306d119cc777fa900ba034cd52", // CRV
  "0xc00e94cb662c3520282e6f5717214004a7f26888", // COMP
  "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e", // YFI
  "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2", // SUSHI
  "0xba100000625a3754423978a60c9317c58a424e3d", // BAL
  "0x4e15361fd6b4bb609fa63c81a2be19d873717870", // FTM
  "0x111111111117dc0aa78b770fa6a738034120c302", // 1INCH
  "0x0d8775f648430679a709e98d2b0cb6250d2887ef", // BAT
].map((addr) => addr.toLowerCase());

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

  constructor() {
    this.provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    // Properly set headers for CoinGecko API
    this.coinGeckoHeaders = {
      accept: "application/json",
      "x-cg-pro-api-key": COINGECKO_API_KEY, // Use x-cg-demo-api-key for free tier
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

      // Add ETH as native token (always include even if balance is 0 for new users)
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
          // Include token even if balance is 0 (for tracking purposes)
          const contractAddress = token.contractAddress.toLowerCase();

          // Get decimals for proper formatting
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

          const balance =
            token.tokenBalance === "0x0"
              ? 0
              : parseFloat(ethers.formatUnits(token.tokenBalance, decimals));

          tokens.push({
            contractAddress,
            balance: token.tokenBalance,
            balanceFormatted: balance,
          });
        }
      }

      console.log(`✅ Found ${tokens.length} tokens (including ETH)`);
      return tokens;
    } catch (error) {
      console.error("❌ Error fetching wallet tokens:", error);
      throw error;
    }
  }

  // Filter tokens against preset list (for new users)
  filterPresetTokens(tokens: TokenBalance[]): TokenBalance[] {
    const presetSet = new Set(PRESET_TOKENS);
    return tokens.filter(
      (token) =>
        token.contractAddress === "native" ||
        presetSet.has(token.contractAddress.toLowerCase())
    );
  }

  // Get token metadata from CoinGecko with proper error handling
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

      // Try CoinGecko API
      const response = await axios.get(
        `${COINGECKO_BASE_URL}/coins/ethereum/contract/${contractAddress}`,
        { headers: this.coinGeckoHeaders }
      );

      if (response.data) {
        return {
          contractAddress,
          symbol: response.data.symbol?.toUpperCase() || "UNKNOWN",
          name: response.data.name || "Unknown Token",
          decimals:
            response.data.detail_platforms?.ethereum?.decimal_place || 18,
          imageUrl: response.data.image?.large || "",
          geckoId: response.data.id,
        };
      }
    } catch (error: any) {
      console.log(
        `⚠️ CoinGecko API error for ${contractAddress}:`,
        error.response?.status
      );
    }
    return null;
  }

  // Fallback: Get metadata from Alchemy
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

  // Fallback: Get metadata from blockchain
  async getTokenMetadataFromBlockchain(
    contractAddress: string
  ): Promise<TokenMetadata | null> {
    try {
      const abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
      ];
      const contract = new ethers.Contract(contractAddress, abi, this.provider);

      const [name, symbol, decimals] = await Promise.all([
        contract.name().catch(() => "Unknown Token"),
        contract.symbol().catch(() => "UNKNOWN"),
        contract.decimals().catch(() => 18),
      ]);

      return {
        contractAddress,
        symbol: symbol.toUpperCase(),
        name,
        decimals,
        imageUrl: "",
      };
    } catch (error) {
      console.log(`⚠️ Blockchain metadata fetch failed for ${contractAddress}`);
    }
    return null;
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

    // Try blockchain
    metadata = await this.getTokenMetadataFromBlockchain(contractAddress);
    if (metadata) {
      console.log(`✅ Got metadata from blockchain for ${contractAddress}`);
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

  // Batch fetch token prices from CoinGecko with proper error handling
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
      const ethIndex = contractAddresses.findIndex((addr) => addr === "native");
      if (ethIndex !== -1) {
        contractAddresses = contractAddresses.filter(
          (addr) => addr !== "native"
        );

        try {
          // Get ETH price
          const ethResponse = await axios.get(
            `${COINGECKO_BASE_URL}/simple/price`,
            {
              params: {
                ids: "ethereum",
                vs_currencies: "usd",
                include_24hr_change: true,
              },
              headers: this.coinGeckoHeaders,
            }
          );

          if (ethResponse.data?.ethereum) {
            prices["native"] = {
              price: ethResponse.data.ethereum.usd || 0,
              change24h: ethResponse.data.ethereum.usd_24h_change || 0,
            };
            console.log("✅ ETH price fetched:", prices["native"].price);
          }
        } catch (error: any) {
          console.log("⚠️ Failed to fetch ETH price, using fallback");
          prices["native"] = { price: 0, change24h: 0 };
        }
      }

      // Batch fetch ERC-20 token prices
      if (contractAddresses.length > 0) {
        try {
          const addresses = contractAddresses.join(",");
          const response = await axios.get(
            `${COINGECKO_BASE_URL}/simple/token_price/ethereum`,
            {
              params: {
                contract_addresses: addresses,
                vs_currencies: "usd",
                include_24hr_change: true,
              },
              headers: this.coinGeckoHeaders,
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
            console.log(
              `✅ Fetched prices for ${
                Object.keys(response.data).length
              } tokens`
            );
          }
        } catch (error: any) {
          console.log(
            "⚠️ Batch price fetch failed, will use 0 for unknown prices"
          );
          // Set price to 0 for tokens that failed
          for (const addr of contractAddresses) {
            if (!prices[addr.toLowerCase()]) {
              prices[addr.toLowerCase()] = { price: 0, change24h: 0 };
            }
          }
        }
      }

      return prices;
    } catch (error) {
      console.error("❌ Error in batch price fetching:", error);
      // Return empty prices as fallback
      for (const addr of contractAddresses) {
        prices[addr.toLowerCase()] = { price: 0, change24h: 0 };
      }
      return prices;
    }
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
      console.log(`📊 Found ${allTokens.length} total tokens`);

      // Step 2: Filter against preset tokens
      const filteredTokens = this.filterPresetTokens(allTokens);
      console.log(`📋 Filtered to ${filteredTokens.length} preset tokens`);

      // Step 3: Get metadata for each token
      const metadata: TokenMetadata[] = [];
      const metadataPromises = filteredTokens.map(async (token) => {
        const tokenMetadata = await this.getTokenMetadataWithFallback(
          token.contractAddress
        );
        return tokenMetadata;
      });

      const metadataResults = await Promise.all(metadataPromises);
      metadata.push(...metadataResults);

      // Step 4: Batch fetch prices
      const addresses = filteredTokens.map((t) => t.contractAddress);
      const prices = await this.batchFetchTokenPrices(addresses);

      // Step 5: Combine data and calculate values
      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const token of filteredTokens) {
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

  // Refresh dashboard (for both new and returning users)
  async refreshDashboard(
    walletAddress: string,
    storedMetadata: TokenMetadata[]
  ): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
  }> {
    console.log("🔄 Refreshing dashboard for:", walletAddress);

    try {
      // Step 1: Get current token balances from Alchemy
      const currentBalances = await this.getWalletTokens(walletAddress);

      // Create a map of stored metadata for quick lookup
      const metadataMap = new Map(
        storedMetadata.map((m) => [m.contractAddress.toLowerCase(), m])
      );

      // Filter to only tokens we have metadata for
      const relevantBalances = currentBalances.filter((b) =>
        metadataMap.has(b.contractAddress.toLowerCase())
      );

      // Step 2: Batch fetch current prices
      const addresses = relevantBalances.map((t) => t.contractAddress);
      const prices = await this.batchFetchTokenPrices(addresses);

      // Step 3: Combine and calculate
      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const balance of relevantBalances) {
        const meta = metadataMap.get(balance.contractAddress.toLowerCase())!;
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

  // Add new token to dashboard
  async addTokenToDashboard(
    contractAddress: string,
    walletAddress: string
  ): Promise<{
    token: TokenDashboardData;
    metadata: TokenMetadata;
  }> {
    console.log("➕ Adding token to dashboard:", contractAddress);

    try {
      // Normalize address
      contractAddress = contractAddress.toLowerCase();

      // Get metadata with fallback chain
      const metadata = await this.getTokenMetadataWithFallback(contractAddress);

      // Get balance (might be 0)
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
