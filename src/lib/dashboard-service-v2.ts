// src/lib/dashboard-service-v2.ts - FIXED to match dashboard.js approach
import { ethers } from "ethers";
import axios from "axios";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "tFaWgpOB1QAns76d3CgbT";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-xCH4APq7mHESUuEFzDU5GTSy";
const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Preset top tokens to check (same as dashboard.js)
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
      // Step 1: Get ALL token balances to check what user holds
      const allBalances = await this.getAllTokenBalances(walletAddress);
      console.log(`📊 Wallet has ${allBalances.length} tokens total`);

      // Step 2: Filter to only PRESET tokens that user actually holds
      const userHoldingsMap = new Map(
        allBalances.map((b) => [b.contractAddress.toLowerCase(), b])
      );

      const tokensToDisplay = PRESET_TOKENS.filter((token) => {
        if (token === "native") {
          // Always check ETH
          return (
            userHoldingsMap.has("native") &&
            userHoldingsMap.get("native")!.balanceFormatted > 0.000001
          );
        }
        return (
          userHoldingsMap.has(token.toLowerCase()) &&
          userHoldingsMap.get(token.toLowerCase())!.balanceFormatted > 0.000001
        );
      });

      console.log(`✅ User holds ${tokensToDisplay.length} preset tokens`);

      // If no preset tokens with balance, return empty
      if (tokensToDisplay.length === 0) {
        console.log("📭 No preset tokens with balance found");
        return {
          tokens: [],
          totalValue: 0,
          metadata: [],
          isNewUser: true,
        };
      }

      // Step 3: Get metadata only for preset tokens user holds
      const metadata: TokenMetadata[] = [];
      for (const token of tokensToDisplay) {
        const tokenMetadata = await this.getTokenMetadataFromCoinGecko(token);
        if (tokenMetadata) {
          metadata.push(tokenMetadata);
        }
      }

      // Store metadata for future use
      const userData = {
        walletAddress: walletAddress.toLowerCase(),
        metadata: {},
        displayedTokens: tokensToDisplay, // Store which tokens are displayed
        lastUpdated: new Date().toISOString(),
      };

      metadata.forEach((meta) => {
        userData.metadata[meta.contractAddress.toLowerCase()] = meta;
      });

      this.userDataCache.set(walletAddress.toLowerCase(), userData);
      this.saveUserDataToStorage();

      // Step 4: Get prices and calculate values
      const prices = await this.batchFetchTokenPrices(
        metadata.map((m) => m.contractAddress)
      );

      const dashboardTokens: TokenDashboardData[] = [];
      let totalValue = 0;

      for (const meta of metadata) {
        const balance = userHoldingsMap.get(meta.contractAddress.toLowerCase());
        const priceData = prices[meta.contractAddress.toLowerCase()];

        if (balance && priceData) {
          const value = balance.balanceFormatted * priceData.price;

          // Only add tokens with actual value
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
        `✅ Dashboard initialized with ${
          dashboardTokens.length
        } preset tokens, $${totalValue.toFixed(2)}`
      );

      return {
        tokens: dashboardTokens,
        totalValue,
        metadata,
        isNewUser: true,
      };
    } catch (error) {
      console.error("❌ Error initializing new user:", error);
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

      // Get displayed tokens list (only tokens user chose to display)
      const displayedTokens =
        userData.displayedTokens || Object.keys(userData.metadata);
      const metadata = displayedTokens
        .map((token: string) => {
          const key = token === "native" ? "native" : token.toLowerCase();
          return userData.metadata[key];
        })
        .filter(Boolean) as TokenMetadata[];

      // Get current balances for ALL tokens
      const allBalances = await this.getAllTokenBalances(walletAddress);
      const balanceMap = new Map(
        allBalances.map((b) => [b.contractAddress.toLowerCase(), b])
      );

      // Only process displayed tokens that have balance
      const tokensWithBalance = [];
      for (const meta of metadata) {
        const balance = balanceMap.get(meta.contractAddress.toLowerCase());
        if (balance && balance.balanceFormatted > 0.000001) {
          tokensWithBalance.push(meta);
        }
      }

      if (tokensWithBalance.length === 0) {
        console.log("📭 Returning user has no balance in displayed tokens");
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
        const balance = balanceMap.get(meta.contractAddress.toLowerCase());
        const priceData = prices[meta.contractAddress.toLowerCase()];

        if (balance && priceData) {
          const value = balance.balanceFormatted * priceData.price;

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

      if (!userData || !userData.metadata) {
        // If no metadata, initialize as new user
        const result = await this.initializeNewUser(walletAddress);
        return { tokens: result.tokens, totalValue: result.totalValue };
      }

      // Get displayed tokens list
      const displayedTokens =
        userData.displayedTokens || Object.keys(userData.metadata);
      const metadata = displayedTokens
        .map((token: string) => {
          const key = token === "native" ? "native" : token.toLowerCase();
          return userData.metadata[key];
        })
        .filter(Boolean) as TokenMetadata[];

      // Get current balances
      const allBalances = await this.getAllTokenBalances(walletAddress);
      const balanceMap = new Map(
        allBalances.map((b) => [b.contractAddress.toLowerCase(), b])
      );

      // Only process displayed tokens with balance
      const tokensWithBalance = [];
      for (const meta of metadata) {
        const balance = balanceMap.get(meta.contractAddress.toLowerCase());
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
        displayedTokens: [],
        lastUpdated: new Date().toISOString(),
      };

      userData.metadata[contractAddress] = metadata;

      // Add to displayed tokens if not already there
      if (!userData.displayedTokens) {
        userData.displayedTokens = Object.keys(userData.metadata);
      }
      if (!userData.displayedTokens.includes(contractAddress)) {
        userData.displayedTokens.push(contractAddress);
      }

      this.userDataCache.set(walletAddress.toLowerCase(), userData);
      this.saveUserDataToStorage();

      // Get balance and price
      const balances = await this.getAllTokenBalances(walletAddress);
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

  private async getAllTokenBalances(
    walletAddress: string
  ): Promise<TokenBalance[]> {
    try {
      const balances: TokenBalance[] = [];

      // Get ETH balance
      const ethBalance = await this.provider.getBalance(walletAddress);
      const ethBalanceFormatted = parseFloat(ethers.formatEther(ethBalance));

      // Always add ETH
      balances.push({
        contractAddress: "native",
        balance: ethBalance.toString(),
        balanceFormatted: ethBalanceFormatted,
      });

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

          // Add all tokens with balance
          balances.push({
            contractAddress: token.contractAddress.toLowerCase(),
            balance: token.tokenBalance,
            balanceFormatted: balanceFormatted,
          });
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
    if (userData) {
      // Remove from metadata
      if (userData.metadata) {
        delete userData.metadata[contractAddress.toLowerCase()];
      }

      // Remove from displayed tokens
      if (userData.displayedTokens) {
        userData.displayedTokens = userData.displayedTokens.filter(
          (token: string) =>
            token.toLowerCase() !== contractAddress.toLowerCase()
        );
      }

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
