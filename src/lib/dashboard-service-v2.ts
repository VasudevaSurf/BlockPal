// src/lib/dashboard-service-v2.ts - Complete rewrite with proper workflow
import { ethers } from "ethers";
import axios from "axios";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "tFaWgpOB1QAns76d3CgbT";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-xCH4APq7mHESUuEFzDU5GTSy";
const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Preset top 20 tokens on Ethereum (matching your dashboard.js)
const PRESET_TOKENS = [
  "ETH", // Native Ethereum
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
  "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
  "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", // MATIC
  "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", // SHIB
  "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", // AAVE
  "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", // MKR
  "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F", // SNX
  "0xD533a949740bb3306d119CC777fa900bA034cd52", // CRV
  "0xc00e94Cb662C3520282E6f5717214004A7f26888", // COMP
  "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e", // YFI
  "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", // SUSHI
  "0xba100000625a3754423978a60c9317c58a424e3D", // BAL
  "0x4E15361FD6b4BB609Fa63C81A2be19d873717870", // FTM
  "0x111111111117dC0aa78b770fA6A738034120C302", // 1INCH
  "0x0D8775F648430679A709E98d2b0Cb6250d2887EF", // BAT
];

interface TokenMetadata {
  contractAddress: string;
  geckoId: string;
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

interface UserDashboardData {
  walletAddress: string;
  tokens: Record<string, TokenMetadata>;
  lastUpdated?: Date;
}

export class DashboardServiceV2 {
  private provider: ethers.JsonRpcProvider;

  // Cache for user data (simulating database storage)
  private userDataCache: Map<string, UserDashboardData> = new Map();

  constructor() {
    this.provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    this.loadUserDataFromStorage();
  }

  // Load user data from localStorage (simulating database)
  private loadUserDataFromStorage() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dashboard-user-data");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          Object.entries(data).forEach(([wallet, userData]) => {
            this.userDataCache.set(wallet, userData as UserDashboardData);
          });
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    }
  }

  // Save user data to localStorage (simulating database)
  private saveUserDataToStorage() {
    if (typeof window !== "undefined") {
      const data: Record<string, UserDashboardData> = {};
      this.userDataCache.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem("dashboard-user-data", JSON.stringify(data));
    }
  }

  // Check if user is returning (has stored data)
  isReturningUser(walletAddress: string): boolean {
    const userData = this.userDataCache.get(walletAddress.toLowerCase());
    return !!(userData && Object.keys(userData.tokens).length > 0);
  }

  // PHASE 1: Initialize new user
  async initializeNewUser(walletAddress: string): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
    metadata: TokenMetadata[];
  }> {
    console.log(
      "🆕 PHASE 1: Initializing new user dashboard for:",
      walletAddress
    );

    try {
      // Step 1: Get all token balances from Alchemy
      console.log("📡 Step 1: Fetching token balances from Alchemy...");
      const tokenBalances = await this.getTokenBalancesFromAlchemy(
        walletAddress
      );

      // Filter to only include preset tokens that user holds
      const userTokenAddresses = tokenBalances.map((t) =>
        t.contractAddress.toLowerCase()
      );
      const commonTokens = PRESET_TOKENS.filter((preset) => {
        if (preset === "ETH") return true; // Always include ETH
        return userTokenAddresses.includes(preset.toLowerCase());
      });

      console.log(`✅ Found ${commonTokens.length} preset tokens in wallet`);

      // Step 2: Get metadata for each token from CoinGecko
      console.log(
        "🪙 Step 2: Fetching metadata for each token from CoinGecko..."
      );
      const metadata: TokenMetadata[] = [];

      for (const tokenAddress of commonTokens) {
        const tokenMetadata = await this.getTokenMetadataFromCoinGecko(
          tokenAddress
        );
        if (tokenMetadata) {
          metadata.push(tokenMetadata);
        }
      }

      // Store metadata in user data (simulating database)
      const userData: UserDashboardData = {
        walletAddress: walletAddress.toLowerCase(),
        tokens: {},
        lastUpdated: new Date(),
      };

      metadata.forEach((meta) => {
        userData.tokens[meta.contractAddress.toLowerCase()] = meta;
      });

      this.userDataCache.set(walletAddress.toLowerCase(), userData);
      this.saveUserDataToStorage();

      console.log(`💾 Stored metadata for ${metadata.length} tokens`);

      // Step 3: Batch fetch prices and calculate values
      console.log("💰 Step 3: Batch fetching token prices from CoinGecko...");
      const prices = await this.batchFetchTokenPrices(
        metadata.map((m) => m.contractAddress)
      );

      // Combine all data
      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const meta of metadata) {
        const balance = tokenBalances.find(
          (b) =>
            b.contractAddress.toLowerCase() ===
            meta.contractAddress.toLowerCase()
        );
        const priceData = prices[meta.contractAddress.toLowerCase()];

        if (balance && priceData) {
          const value = balance.balanceFormatted * priceData.price;

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

      console.log(
        `✅ New user initialized with ${
          dashboardTokens.length
        } tokens, total value: $${totalValue.toFixed(2)}`
      );

      return {
        tokens: dashboardTokens,
        totalValue,
        metadata,
      };
    } catch (error) {
      console.error("❌ Error initializing new user:", error);
      throw error;
    }
  }

  // PHASE 2: Load returning user dashboard
  async loadReturningUser(walletAddress: string): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
  }> {
    console.log(
      "👤 PHASE 2: Loading returning user dashboard for:",
      walletAddress
    );

    try {
      // Step 1: Get stored metadata from cache (simulating database)
      console.log("📋 Step 1: Loading stored metadata...");
      const userData = this.userDataCache.get(walletAddress.toLowerCase());

      if (!userData || Object.keys(userData.tokens).length === 0) {
        console.log("⚠️ No stored data found, treating as new user");
        return this.initializeNewUser(walletAddress);
      }

      const metadata = Object.values(userData.tokens);
      console.log(`✅ Loaded metadata for ${metadata.length} tokens`);

      // Step 2: Get current token balances from Alchemy
      console.log("📡 Step 2: Fetching current token balances from Alchemy...");
      const tokenBalances = await this.getTokenBalancesFromAlchemy(
        walletAddress
      );

      // Step 3: Batch fetch current prices
      console.log("💰 Step 3: Batch fetching current token prices...");
      const prices = await this.batchFetchTokenPrices(
        metadata.map((m) => m.contractAddress)
      );

      // Combine data
      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const meta of metadata) {
        const balance = tokenBalances.find(
          (b) =>
            b.contractAddress.toLowerCase() ===
            meta.contractAddress.toLowerCase()
        );
        const priceData = prices[meta.contractAddress.toLowerCase()];

        if (balance && priceData) {
          const value = balance.balanceFormatted * priceData.price;

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

      console.log(
        `✅ Returning user loaded with ${
          dashboardTokens.length
        } tokens, total value: $${totalValue.toFixed(2)}`
      );

      return {
        tokens: dashboardTokens,
        totalValue,
      };
    } catch (error) {
      console.error("❌ Error loading returning user:", error);
      throw error;
    }
  }

  // AUTOMATIC REFRESH (every 30 seconds)
  async refreshDashboard(walletAddress: string): Promise<{
    tokens: TokenDashboardData[];
    totalValue: number;
  }> {
    console.log("🔄 REFRESH: Updating dashboard for:", walletAddress);

    try {
      const userData = this.userDataCache.get(walletAddress.toLowerCase());

      if (!userData || Object.keys(userData.tokens).length === 0) {
        console.log("⚠️ No stored data, cannot refresh");
        return { tokens: [], totalValue: 0 };
      }

      const metadata = Object.values(userData.tokens);

      // Step 1: Get updated token balances
      console.log("📡 Step 1: Fetching updated token balances...");
      const tokenBalances = await this.getTokenBalancesFromAlchemy(
        walletAddress
      );

      // Step 2: Batch fetch current prices
      console.log("💰 Step 2: Fetching updated token prices...");
      const prices = await this.batchFetchTokenPrices(
        metadata.map((m) => m.contractAddress)
      );

      // Calculate updated values
      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const meta of metadata) {
        const balance = tokenBalances.find(
          (b) =>
            b.contractAddress.toLowerCase() ===
            meta.contractAddress.toLowerCase()
        );
        const priceData = prices[meta.contractAddress.toLowerCase()];

        if (balance && priceData) {
          const value = balance.balanceFormatted * priceData.price;

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

  // PHASE 3: Add new token to dashboard
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

      // Get metadata (CoinGecko first, then Alchemy as fallback)
      console.log("🔍 Fetching token metadata...");
      let metadata = await this.getTokenMetadataFromCoinGecko(contractAddress);

      if (!metadata) {
        console.log("⚠️ CoinGecko failed, trying Alchemy fallback...");
        metadata = await this.getTokenMetadataFromAlchemy(contractAddress);
      }

      if (!metadata) {
        throw new Error("Could not fetch token metadata from any source");
      }

      // Store in user data
      const userData = this.userDataCache.get(walletAddress.toLowerCase()) || {
        walletAddress: walletAddress.toLowerCase(),
        tokens: {},
        lastUpdated: new Date(),
      };

      userData.tokens[contractAddress] = metadata;
      this.userDataCache.set(walletAddress.toLowerCase(), userData);
      this.saveUserDataToStorage();

      // Get balance
      console.log("💰 Fetching token balance...");
      const balances = await this.getTokenBalancesFromAlchemy(walletAddress);
      const balance = balances.find(
        (b) => b.contractAddress.toLowerCase() === contractAddress
      );

      // Get price
      console.log("📈 Fetching token price...");
      const prices = await this.batchFetchTokenPrices([contractAddress]);
      const priceData = prices[contractAddress];

      const token: TokenDashboardData = {
        contractAddress,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        imageUrl: metadata.imageUrl,
        balance: balance?.balanceFormatted || 0,
        price: priceData?.price || 0,
        value: (balance?.balanceFormatted || 0) * (priceData?.price || 0),
        change24h: priceData?.change24h || 0,
      };

      console.log(`✅ Token added: ${metadata.symbol} (${metadata.name})`);

      return { token, metadata };
    } catch (error) {
      console.error("❌ Error adding token:", error);
      throw error;
    }
  }

  // Get token balances from Alchemy
  private async getTokenBalancesFromAlchemy(
    walletAddress: string
  ): Promise<TokenBalance[]> {
    try {
      const balances: TokenBalance[] = [];

      // Get ETH balance
      const ethBalance = await this.provider.getBalance(walletAddress);
      balances.push({
        contractAddress: "native",
        balance: ethBalance.toString(),
        balanceFormatted: parseFloat(ethers.formatEther(ethBalance)),
      });

      // Get ERC-20 token balances
      const response = await axios.post(ALCHEMY_URL, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [walletAddress],
        id: 1,
      });

      if (response.data.result?.tokenBalances) {
        for (const token of response.data.result.tokenBalances) {
          if (token.tokenBalance === "0x0" || token.tokenBalance === "0x") {
            continue;
          }

          // Get decimals
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

          balances.push({
            contractAddress: token.contractAddress.toLowerCase(),
            balance: token.tokenBalance,
            balanceFormatted: parseFloat(
              ethers.formatUnits(token.tokenBalance, decimals)
            ),
          });
        }
      }

      return balances;
    } catch (error) {
      console.error("Error fetching token balances:", error);
      throw error;
    }
  }

  // Get token metadata from CoinGecko
  private async getTokenMetadataFromCoinGecko(
    contractAddress: string
  ): Promise<TokenMetadata | null> {
    try {
      if (contractAddress === "ETH" || contractAddress === "native") {
        // Special handling for ETH
        const response = await axios.get(
          `${COINGECKO_BASE_URL}/coins/ethereum`,
          {
            headers: { "x-cg-demo-api-key": COINGECKO_API_KEY },
          }
        );

        return {
          contractAddress: "native",
          geckoId: "ethereum",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          imageUrl: response.data.image?.large || "",
        };
      }

      // For ERC-20 tokens
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

  // Fallback: Get token metadata from Alchemy
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
          geckoId: `unknown-${contractAddress}`,
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

  // Batch fetch token prices from CoinGecko
  private async batchFetchTokenPrices(
    contractAddresses: string[]
  ): Promise<Record<string, { price: number; change24h: number }>> {
    const prices: Record<string, { price: number; change24h: number }> = {};

    try {
      // Handle ETH separately
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

      // Get ERC-20 token prices
      const erc20Addresses = contractAddresses
        .filter((addr) => addr !== "native" && addr !== "ETH")
        .join(",");

      if (erc20Addresses) {
        const response = await axios.get(
          `${COINGECKO_BASE_URL}/simple/token_price/ethereum`,
          {
            params: {
              contract_addresses: erc20Addresses,
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

      // Fill in zeros for any missing prices
      for (const addr of contractAddresses) {
        if (!prices[addr.toLowerCase()]) {
          prices[addr.toLowerCase()] = { price: 0, change24h: 0 };
        }
      }

      return prices;
    } catch (error) {
      console.error("Error batch fetching prices:", error);
      // Return zeros as fallback
      for (const addr of contractAddresses) {
        prices[addr.toLowerCase()] = { price: 0, change24h: 0 };
      }
      return prices;
    }
  }

  // Remove a token from dashboard
  async removeTokenFromDashboard(
    contractAddress: string,
    walletAddress: string
  ): Promise<void> {
    const userData = this.userDataCache.get(walletAddress.toLowerCase());
    if (userData) {
      delete userData.tokens[contractAddress.toLowerCase()];
      this.saveUserDataToStorage();
      console.log(`✅ Token ${contractAddress} removed from dashboard`);
    }
  }

  // Clear all user data for a wallet
  clearUserData(walletAddress: string): void {
    this.userDataCache.delete(walletAddress.toLowerCase());
    this.saveUserDataToStorage();
    console.log(`🗑️ Cleared all data for wallet ${walletAddress}`);
  }
}

// Export singleton instance
export const dashboardServiceV2 = new DashboardServiceV2();
