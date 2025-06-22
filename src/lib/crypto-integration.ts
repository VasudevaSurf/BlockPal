// src/lib/crypto-integration.ts
import { ethers } from "ethers";
import axios from "axios";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

// ERC-20 Token ABI (minimal)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balanceFormatted?: string;
  priceUSD?: number;
  valueUSD?: number;
  change24h?: number;
  logoUrl?: string;
}

export interface PortfolioSummary {
  totalValueUSD: number;
  totalValueETH: number;
  ethPriceUSD: number;
  ethBalance: number;
  ethValueUSD: number;
  tokens: TokenBalance[];
}

export class CryptoIntegrationService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );
  }

  // Validation functions
  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  isValidPrivateKey(privateKey: string): boolean {
    try {
      const cleanKey = privateKey.startsWith("0x")
        ? privateKey.slice(2)
        : privateKey;

      if (cleanKey.length !== 64) return false;
      if (!/^[a-fA-F0-9]+$/.test(cleanKey)) return false;

      new ethers.Wallet(
        privateKey.startsWith("0x") ? privateKey : "0x" + privateKey
      );
      return true;
    } catch {
      return false;
    }
  }

  isValidMnemonic(mnemonic: string): boolean {
    try {
      ethers.Mnemonic.fromPhrase(mnemonic);
      return true;
    } catch {
      return false;
    }
  }

  // Create new wallet
  createWallet(): { address: string; privateKey: string; mnemonic: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || "",
    };
  }

  // Import wallet from private key
  importFromPrivateKey(privateKey: string): {
    address: string;
    privateKey: string;
  } {
    const formattedKey = privateKey.startsWith("0x")
      ? privateKey
      : "0x" + privateKey;
    const wallet = new ethers.Wallet(formattedKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  }

  // Import wallet from mnemonic
  importFromMnemonic(mnemonic: string): {
    address: string;
    privateKey: string;
    mnemonic: string;
  } {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: mnemonic,
    };
  }

  // Get ETH balance
  async getETHBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting ETH balance:", error);
      return "0";
    }
  }

  // Get wallet tokens using Alchemy API
  async getWalletTokens(address: string): Promise<TokenBalance[]> {
    try {
      const response = await axios.post(
        `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        {
          id: 1,
          jsonrpc: "2.0",
          method: "alchemy_getTokenBalances",
          params: [address],
        }
      );

      if (response.data.result && response.data.result.tokenBalances) {
        const tokens = response.data.result.tokenBalances.filter(
          (token: any) => parseInt(token.tokenBalance, 16) > 0
        );

        // Enrich with metadata
        const enrichedTokens = await Promise.all(
          tokens.map(async (token: any) => {
            try {
              const contract = new ethers.Contract(
                token.contractAddress,
                ERC20_ABI,
                this.provider
              );

              const [name, symbol, decimals] = await Promise.all([
                contract.name().catch(() => "Unknown"),
                contract.symbol().catch(() => "UNKNOWN"),
                contract.decimals().catch(() => 18),
              ]);

              const balanceFormatted = ethers.formatUnits(
                token.tokenBalance,
                decimals
              );

              // Get price data
              const priceData = await this.getTokenPriceByContract(
                token.contractAddress
              );

              return {
                contractAddress: token.contractAddress,
                tokenBalance: token.tokenBalance,
                name,
                symbol,
                decimals,
                balanceFormatted,
                priceUSD: priceData?.current_price || 0,
                valueUSD:
                  parseFloat(balanceFormatted) *
                  (priceData?.current_price || 0),
                change24h: priceData?.price_change_percentage_24h || 0,
                logoUrl: priceData?.image,
              };
            } catch (error) {
              console.error(
                `Error enriching token ${token.contractAddress}:`,
                error
              );
              return {
                contractAddress: token.contractAddress,
                tokenBalance: token.tokenBalance,
                name: "Unknown",
                symbol: "UNKNOWN",
                decimals: 18,
                balanceFormatted: "0",
                priceUSD: 0,
                valueUSD: 0,
                change24h: 0,
              };
            }
          })
        );

        return enrichedTokens;
      }

      return [];
    } catch (error) {
      console.error("Error fetching wallet tokens:", error);
      return [];
    }
  }

  // Calculate portfolio value
  async calculatePortfolioValue(address: string): Promise<PortfolioSummary> {
    try {
      // Get ETH balance and price
      const ethBalance = await this.getETHBalance(address);
      const ethBalanceFloat = parseFloat(ethBalance);

      const ethPrice = await this.getTokenPrice("ethereum");
      const ethPriceUSD = ethPrice?.current_price || 0;
      const ethValueUSD = ethBalanceFloat * ethPriceUSD;

      // Get ERC-20 tokens
      const tokens = await this.getWalletTokens(address);

      // Calculate total token value
      const totalTokenValueUSD = tokens.reduce(
        (sum, token) => sum + (token.valueUSD || 0),
        0
      );

      // Calculate totals
      const totalValueUSD = ethValueUSD + totalTokenValueUSD;
      const totalValueETH = ethPriceUSD > 0 ? totalValueUSD / ethPriceUSD : 0;

      return {
        totalValueUSD,
        totalValueETH,
        ethPriceUSD,
        ethBalance: ethBalanceFloat,
        ethValueUSD,
        tokens,
      };
    } catch (error) {
      console.error("Error calculating portfolio value:", error);
      return {
        totalValueUSD: 0,
        totalValueETH: 0,
        ethPriceUSD: 0,
        ethBalance: 0,
        ethValueUSD: 0,
        tokens: [],
      };
    }
  }

  // Get token price from CoinGecko
  async getTokenPrice(tokenId: string) {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${tokenId}`,
        {
          headers: {
            "X-CG-Demo-API-Key": COINGECKO_API_KEY,
          },
        }
      );

      return {
        current_price: response.data.market_data.current_price.usd,
        price_change_percentage_24h:
          response.data.market_data.price_change_percentage_24h,
        market_cap: response.data.market_data.market_cap.usd,
        total_volume: response.data.market_data.total_volume.usd,
        description: response.data.description.en,
        image: response.data.image.large || response.data.image.small,
        homepage: response.data.links?.homepage?.[0] || null,
        official_forum_url:
          response.data.links?.official_forum_url?.[0] || null,
        blockchain_site: response.data.links?.blockchain_site?.[0] || null,
        telegram_channel:
          response.data.links?.telegram_channel_identifier || null,
        twitter_screen_name: response.data.links?.twitter_screen_name || null,
        subreddit_url: response.data.links?.subreddit_url || null,
        whitepaper: response.data.links?.whitepaper || null,
      };
    } catch (error) {
      console.error(`Could not fetch price for ${tokenId}:`, error);
      return null;
    }
  }

  // Get token price by contract address
  async getTokenPriceByContract(contractAddress: string) {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/ethereum/contract/${contractAddress}`,
        {
          headers: {
            "X-CG-Demo-API-Key": COINGECKO_API_KEY,
          },
        }
      );

      return {
        id: response.data.id,
        current_price: response.data.market_data.current_price.usd,
        price_change_percentage_24h:
          response.data.market_data.price_change_percentage_24h,
        market_cap: response.data.market_data.market_cap.usd,
        total_volume: response.data.market_data.total_volume.usd,
        description: response.data.description.en,
        image: response.data.image.large || response.data.image.small,
        homepage: response.data.links?.homepage?.[0] || null,
        official_forum_url:
          response.data.links?.official_forum_url?.[0] || null,
        blockchain_site: response.data.links?.blockchain_site?.[0] || null,
        telegram_channel:
          response.data.links?.telegram_channel_identifier || null,
        twitter_screen_name: response.data.links?.twitter_screen_name || null,
        subreddit_url: response.data.links?.subreddit_url || null,
        whitepaper: response.data.links?.whitepaper || null,
      };
    } catch (error) {
      console.error(`Price data not available for ${contractAddress}:`, error);
      return null;
    }
  }

  // Get price chart data
  async getPriceChart(tokenId: string, days: number = 7) {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart`,
        {
          params: {
            vs_currency: "usd",
            days: days,
          },
          headers: {
            "X-CG-Demo-API-Key": COINGECKO_API_KEY,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching price chart for ${tokenId}:`, error);
      return null;
    }
  }

  // Get detailed token information
  async getTokenInfo(contractAddress: string, walletAddress: string) {
    try {
      const contract = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        this.provider
      );

      // Get basic token info
      const [name, symbol, decimals] = await Promise.all([
        contract.name().catch(() => "Unknown"),
        contract.symbol().catch(() => "UNKNOWN"),
        contract.decimals().catch(() => 18),
      ]);

      // Get user balance
      const balance = await contract.balanceOf(walletAddress);
      const balanceFormatted = ethers.formatUnits(balance, decimals);

      // Get price and market data
      const tokenData = await this.getTokenPriceByContract(contractAddress);

      return {
        name,
        symbol,
        contractAddress,
        decimals,
        balance: balanceFormatted,
        priceData: tokenData,
      };
    } catch (error) {
      console.error("Error loading token information:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const cryptoService = new CryptoIntegrationService();
