// src/lib/dashboard-service-v2.ts - FIXED VERSION without default tokens
import { ethers } from "ethers";
import axios from "axios";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "tFaWgpOB1QAns76d3CgbT";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-xCH4APq7mHESUuEFzDU5GTSy";
const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Preset tokens for checking (not for showing by default)
const PRESET_TOKENS = [
  "native", // ETH
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
  "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
  "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", // MATIC
  "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", // SHIB
  "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", // AAVE
];

interface TokenMetadata {
  contractAddress: string;
  geckoId?: string;
  symbol: string;
  name: string;
  decimals: number;
  imageUrl: string;
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

export class DashboardServiceV2 {
  private provider: ethers.JsonRpcProvider;
  private userDataCache: Map<string, any> = new Map();

  constructor() {
    this.provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    this.loadUserDataFromStorage();
  }

  private loadUserDataFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("dashboard-user-data-v2");
        if (stored) {
          const data = JSON.parse(stored);
          Object.entries(data).forEach(([wallet, userData]) => {
            this.userDataCache.set(wallet.toLowerCase(), userData);
          });
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    }
  }

  private saveUserDataToStorage() {
    if (typeof window !== "undefined") {
      try {
        const data: Record<string, any> = {};
        this.userDataCache.forEach((value, key) => {
          data[key] = value;
        });
        localStorage.setItem("dashboard-user-data-v2", JSON.stringify(data));
      } catch (error) {
        console.error("Error saving user data:", error);
      }
    }
  }

  isReturningUser(walletAddress: string): boolean {
    const userData = this.userDataCache.get(walletAddress.toLowerCase());
    return !!(
      userData &&
      userData.metadata &&
      Object.keys(userData.metadata).length > 0
    );
  }

  async initializeNewUser(walletAddress: string): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
    metadata: TokenMetadata[];
    isNewUser: boolean;
  }> {
    console.log(
      "🆕 PHASE 1: Initializing new user dashboard for:",
      walletAddress
    );

    try {
      // Step 1: Get all token balances including ETH
      const tokenBalances = await this.getTokenBalancesFromAlchemy(
        walletAddress
      );
      console.log(`📊 Found ${tokenBalances.length} tokens total`);

      // FIXED: Only show tokens that have actual balance > 0
      const tokensWithBalance = tokenBalances.filter(
        (token) => token.balanceFormatted > 0.000001 // Filter out dust amounts
      );

      console.log(`✅ Found ${tokensWithBalance.length} tokens with balance`);

      // If no tokens with balance, return empty dashboard
      if (tokensWithBalance.length === 0) {
        console.log(
          "📭 No tokens with balance found, returning empty dashboard"
        );
        return {
          tokens: [],
          totalValue: 0,
          metadata: [],
          isNewUser: true,
        };
      }

      // Step 2: Get metadata for tokens with balance
      const metadata: TokenMetadata[] = [];
      for (const token of tokensWithBalance) {
        const tokenMetadata = await this.getTokenMetadataFromCoinGecko(
          token.contractAddress
        );
        if (tokenMetadata) {
          metadata.push(tokenMetadata);
        }
      }

      // Store metadata only for tokens with balance
      const userData = {
        walletAddress: walletAddress.toLowerCase(),
        metadata: {},
        lastUpdated: new Date().toISOString(),
      };

      metadata.forEach((meta) => {
        userData.metadata[meta.contractAddress.toLowerCase()] = meta;
      });

      this.userDataCache.set(walletAddress.toLowerCase(), userData);
      this.saveUserDataToStorage();

      // Step 3: Get prices and calculate values
      const prices = await this.batchFetchTokenPrices(
        metadata.map((m) => m.contractAddress)
      );

      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const meta of metadata) {
        const balance = tokensWithBalance.find(
          (b) =>
            b.contractAddress.toLowerCase() ===
            meta.contractAddress.toLowerCase()
        );
        const priceData = prices[meta.contractAddress.toLowerCase()];

        if (balance && priceData) {
          const value = balance.balanceFormatted * priceData.price;

          // Only add tokens with actual value
          if (value > 0.01) {
            // Filter out tokens worth less than $0.01
            dashboardTokens.push({
              contractAddress: meta.contractAddress,
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
        }
      }

      console.log(
        `✅ Dashboard initialized with ${
          dashboardTokens.length
        } tokens, $${totalValue.toFixed(2)}`
      );

      return {
        tokens: dashboardTokens,
        totalValue,
        metadata,
        isNewUser: true,
      };
    } catch (error) {
      console.error("❌ Error initializing new user:", error);
      // Return empty data rather than throwing
      return {
        tokens: [],
        totalValue: 0,
        metadata: [],
        isNewUser: true,
      };
    }
  }

  async loadReturningUser(walletAddress: string): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
    isNewUser: boolean;
  }> {
    console.log(
      "👤 PHASE 2: Loading returning user dashboard for:",
      walletAddress
    );

    try {
      const userData = this.userDataCache.get(walletAddress.toLowerCase());

      if (
        !userData ||
        !userData.metadata ||
        Object.keys(userData.metadata).length === 0
      ) {
        console.log("⚠️ No stored data found, treating as new user");
        return this.initializeNewUser(walletAddress);
      }

      const metadata = Object.values(userData.metadata) as TokenMetadata[];

      // Get current balances
      const tokenBalances = await this.getTokenBalancesFromAlchemy(
        walletAddress
      );

      // FIXED: Only get prices for tokens that have balance
      const tokensWithBalance = [];
      for (const meta of metadata) {
        const balance = tokenBalances.find(
          (b) =>
            b.contractAddress.toLowerCase() ===
            meta.contractAddress.toLowerCase()
        );
        if (balance && balance.balanceFormatted > 0.000001) {
          tokensWithBalance.push(meta);
        }
      }

      // If no tokens with balance, return empty
      if (tokensWithBalance.length === 0) {
        console.log("📭 Returning user has no tokens with balance");
        return {
          tokens: [],
          totalValue: 0,
          isNewUser: false,
        };
      }

      const prices = await this.batchFetchTokenPrices(
        tokensWithBalance.map((m) => m.contractAddress)
      );

      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const meta of tokensWithBalance) {
        const balance = tokenBalances.find(
          (b) =>
            b.contractAddress.toLowerCase() ===
            meta.contractAddress.toLowerCase()
        );
        const priceData = prices[meta.contractAddress.toLowerCase()];

        if (balance && priceData) {
          const value = balance.balanceFormatted * priceData.price;

          // Only show tokens with value > $0.01
          if (value > 0.01) {
            dashboardTokens.push({
              contractAddress: meta.contractAddress,
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
        }
      }

      console.log(
        `✅ Returning user loaded with ${
          dashboardTokens.length
        } tokens, $${totalValue.toFixed(2)}`
      );

      return {
        tokens: dashboardTokens,
        totalValue,
        isNewUser: false,
      };
    } catch (error) {
      console.error("❌ Error loading returning user:", error);
      return {
        tokens: [],
        totalValue: 0,
        isNewUser: false,
      };
    }
  }

  async refreshDashboard(walletAddress: string): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
  }> {
    console.log("🔄 REFRESH: Updating dashboard for:", walletAddress);

    try {
      const userData = this.userDataCache.get(walletAddress.toLowerCase());

      // If no metadata, get current tokens
      if (
        !userData ||
        !userData.metadata ||
        Object.keys(userData.metadata).length === 0
      ) {
        // Get actual tokens with balance
        const tokenBalances = await this.getTokenBalancesFromAlchemy(
          walletAddress
        );
        const tokensWithBalance = tokenBalances.filter(
          (token) => token.balanceFormatted > 0.000001
        );

        if (tokensWithBalance.length === 0) {
          return { tokens: [], totalValue: 0 };
        }

        // Get metadata for tokens with balance
        const metadata: TokenMetadata[] = [];
        for (const token of tokensWithBalance) {
          const tokenMetadata = await this.getTokenMetadataFromCoinGecko(
            token.contractAddress
          );
          if (tokenMetadata) {
            metadata.push(tokenMetadata);
          }
        }

        // Update cache
        const newUserData = {
          walletAddress: walletAddress.toLowerCase(),
          metadata: {},
          lastUpdated: new Date().toISOString(),
        };

        metadata.forEach((meta) => {
          newUserData.metadata[meta.contractAddress.toLowerCase()] = meta;
        });

        this.userDataCache.set(walletAddress.toLowerCase(), newUserData);
        this.saveUserDataToStorage();

        // Continue with refresh using new metadata
        userData.metadata = newUserData.metadata;
      }

      const metadata = Object.values(userData.metadata) as TokenMetadata[];
      const tokenBalances = await this.getTokenBalancesFromAlchemy(
        walletAddress
      );

      // FIXED: Only process tokens with actual balance
      const tokensWithBalance = [];
      for (const meta of metadata) {
        const balance = tokenBalances.find(
          (b) =>
            b.contractAddress.toLowerCase() ===
            meta.contractAddress.toLowerCase()
        );
        if (balance && balance.balanceFormatted > 0.000001) {
          tokensWithBalance.push({ meta, balance });
        }
      }

      if (tokensWithBalance.length === 0) {
        return { tokens: [], totalValue: 0 };
      }

      const prices = await this.batchFetchTokenPrices(
        tokensWithBalance.map((t) => t.meta.contractAddress)
      );

      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const { meta, balance } of tokensWithBalance) {
        const priceData = prices[meta.contractAddress.toLowerCase()];

        if (balance && priceData) {
          const value = balance.balanceFormatted * priceData.price;

          if (value > 0.01) {
            // Only show tokens worth more than $0.01
            dashboardTokens.push({
              contractAddress: meta.contractAddress,
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
        }
      }

      return { tokens: dashboardTokens, totalValue };
    } catch (error) {
      console.error("❌ Error refreshing dashboard:", error);
      return { tokens: [], totalValue: 0 };
    }
  }

  async addTokenToDashboard(
    contractAddress: string,
    walletAddress: string
  ): Promise<{
    token: TokenDashboardData;
    metadata: TokenMetadata;
  }> {
    console.log("➕ PHASE 3: Adding new token to dashboard:", contractAddress);

    try {
      contractAddress = contractAddress.toLowerCase();

      // Get metadata
      let metadata = await this.getTokenMetadataFromCoinGecko(contractAddress);
      if (!metadata) {
        metadata = await this.getTokenMetadataFromAlchemy(contractAddress);
      }
      if (!metadata) {
        throw new Error("Could not fetch token metadata");
      }

      // Store in user data
      const userData = this.userDataCache.get(walletAddress.toLowerCase()) || {
        walletAddress: walletAddress.toLowerCase(),
        metadata: {},
        lastUpdated: new Date().toISOString(),
      };

      userData.metadata[contractAddress] = metadata;
      this.userDataCache.set(walletAddress.toLowerCase(), userData);
      this.saveUserDataToStorage();

      // Get balance and price
      const balances = await this.getTokenBalancesFromAlchemy(walletAddress);
      const balance = balances.find(
        (b) => b.contractAddress.toLowerCase() === contractAddress
      ) || { contractAddress, balance: "0", balanceFormatted: 0 };

      const prices = await this.batchFetchTokenPrices([contractAddress]);
      const priceData = prices[contractAddress] || { price: 0, change24h: 0 };

      const token: TokenDashboardData = {
        contractAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        imageUrl: metadata.imageUrl,
        balance: balance.balanceFormatted,
        price: priceData.price,
        value: balance.balanceFormatted * priceData.price,
        change24h: priceData.change24h,
      };

      console.log(`✅ Token added: ${metadata.symbol}`);
      return { token, metadata };
    } catch (error) {
      console.error("❌ Error adding token:", error);
      throw error;
    }
  }

  private async getTokenBalancesFromAlchemy(
    walletAddress: string
  ): Promise<TokenBalance[]> {
    try {
      const balances: TokenBalance[] = [];

      // Get ETH balance
      const ethBalance = await this.provider.getBalance(walletAddress);
      const ethBalanceFormatted = parseFloat(ethers.formatEther(ethBalance));

      // Only add ETH if it has balance
      if (ethBalanceFormatted > 0) {
        balances.push({
          contractAddress: "native",
          balance: ethBalance.toString(),
          balanceFormatted: ethBalanceFormatted,
        });
      }

      // Get ERC-20 balances
      const response = await axios.post(ALCHEMY_URL, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [walletAddress],
        id: 1,
      });

      if (response.data.result?.tokenBalances) {
        for (const token of response.data.result.tokenBalances) {
          if (token.tokenBalance === "0x0" || token.tokenBalance === "0x")
            continue;

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
            console.log(`Using default decimals for ${token.contractAddress}`);
          }

          const balanceFormatted = parseFloat(
            ethers.formatUnits(token.tokenBalance, decimals)
          );

          // Only add if balance is greater than dust
          if (balanceFormatted > 0.000001) {
            balances.push({
              contractAddress: token.contractAddress.toLowerCase(),
              balance: token.tokenBalance,
              balanceFormatted: balanceFormatted,
            });
          }
        }
      }

      return balances;
    } catch (error) {
      console.error("Error fetching token balances:", error);
      return [];
    }
  }

  private async getTokenMetadataFromCoinGecko(
    contractAddress: string
  ): Promise<TokenMetadata | null> {
    try {
      if (contractAddress === "native") {
        return {
          contractAddress: "native",
          geckoId: "ethereum",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          imageUrl:
            "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
        };
      }

      const response = await axios.get(
        `${COINGECKO_BASE_URL}/coins/ethereum/contract/${contractAddress}`,
        {
          headers: { "x-cg-demo-api-key": COINGECKO_API_KEY },
          timeout: 5000,
        }
      );

      if (response.data) {
        return {
          contractAddress: contractAddress.toLowerCase(),
          geckoId: response.data.id,
          symbol: response.data.symbol?.toUpperCase() || "UNKNOWN",
          name: response.data.name || "Unknown Token",
          decimals:
            response.data.detail_platforms?.ethereum?.decimal_place || 18,
          imageUrl:
            response.data.image?.large || response.data.image?.small || "",
        };
      }

      return null;
    } catch (error) {
      console.log(`CoinGecko metadata not found for ${contractAddress}`);
      return null;
    }
  }

  private async getTokenMetadataFromAlchemy(
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
          contractAddress: contractAddress.toLowerCase(),
          symbol: metadata.symbol || "UNKNOWN",
          name: metadata.name || "Unknown Token",
          decimals: metadata.decimals || 18,
          imageUrl: metadata.logo || "",
        };
      }

      return null;
    } catch (error) {
      console.log(`Alchemy metadata fetch failed for ${contractAddress}`);
      return null;
    }
  }

  private async batchFetchTokenPrices(
    contractAddresses: string[]
  ): Promise<Record<string, { price: number; change24h: number }>> {
    const prices: Record<string, { price: number; change24h: number }> = {};

    try {
      // Handle ETH
      if (contractAddresses.includes("native")) {
        const ethResponse = await axios.get(
          `${COINGECKO_BASE_URL}/simple/price`,
          {
            params: {
              ids: "ethereum",
              vs_currencies: "usd",
              include_24hr_change: true,
            },
            headers: { "x-cg-demo-api-key": COINGECKO_API_KEY },
          }
        );

        if (ethResponse.data?.ethereum) {
          prices["native"] = {
            price: ethResponse.data.ethereum.usd || 0,
            change24h: ethResponse.data.ethereum.usd_24h_change || 0,
          };
        }
      }

      // Get ERC-20 prices
      const erc20Addresses = contractAddresses.filter(
        (addr) => addr !== "native" && addr !== "ETH"
      );

      if (erc20Addresses.length > 0) {
        const addressesString = erc20Addresses.join(",");
        const response = await axios.get(
          `${COINGECKO_BASE_URL}/simple/token_price/ethereum`,
          {
            params: {
              contract_addresses: addressesString,
              vs_currencies: "usd",
              include_24hr_change: true,
            },
            headers: { "x-cg-demo-api-key": COINGECKO_API_KEY },
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
      }

      // Fill in zeros for missing prices
      for (const addr of contractAddresses) {
        if (!prices[addr.toLowerCase()]) {
          prices[addr.toLowerCase()] = { price: 0, change24h: 0 };
        }
      }

      return prices;
    } catch (error) {
      console.error("Error batch fetching prices:", error);
      for (const addr of contractAddresses) {
        prices[addr.toLowerCase()] = { price: 0, change24h: 0 };
      }
      return prices;
    }
  }

  removeTokenFromDashboard(
    contractAddress: string,
    walletAddress: string
  ): void {
    const userData = this.userDataCache.get(walletAddress.toLowerCase());
    if (userData && userData.metadata) {
      delete userData.metadata[contractAddress.toLowerCase()];
      this.saveUserDataToStorage();
      console.log(`✅ Token ${contractAddress} removed from dashboard`);
    }
  }

  clearUserData(walletAddress: string): void {
    this.userDataCache.delete(walletAddress.toLowerCase());
    this.saveUserDataToStorage();
    console.log(`🗑️ Cleared all data for wallet ${walletAddress}`);
  }
}

export const dashboardServiceV2 = new DashboardServiceV2();
