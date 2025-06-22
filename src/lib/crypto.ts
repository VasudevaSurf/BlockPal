import { ethers } from "ethers";
import axios from "axios";

const ALCHEMY_API_KEY =
  process.env.ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const COINGECKO_API_KEY =
  process.env.COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

export class CryptoService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );
  }

  async getWalletBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      throw error;
    }
  }

  async getWalletTokens(address: string) {
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
        return response.data.result.tokenBalances.filter(
          (token: any) => parseInt(token.tokenBalance, 16) > 0
        );
      }

      return [];
    } catch (error) {
      console.error("Error getting wallet tokens:", error);
      throw error;
    }
  }

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
      };
    } catch (error) {
      console.error("Error getting token price:", error);
      return null;
    }
  }

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
        current_price: response.data.market_data.current_price.usd,
        price_change_percentage_24h:
          response.data.market_data.price_change_percentage_24h,
        market_cap: response.data.market_data.market_cap.usd,
        total_volume: response.data.market_data.total_volume.usd,
      };
    } catch (error) {
      console.error("Error getting token price by contract:", error);
      return null;
    }
  }

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
}
