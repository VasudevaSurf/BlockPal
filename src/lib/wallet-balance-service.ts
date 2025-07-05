// src/lib/wallet-balance-service.ts - Service to fetch all wallet balances
export interface WalletBalanceInfo {
  walletId: string;
  address: string;
  balance: number;
  tokenCount: number;
}

export class WalletBalanceService {
  // Cache to store wallet balances to avoid repeated API calls
  private balanceCache = new Map<string, WalletBalanceInfo>();
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  // Fetch balance for a single wallet
  async fetchWalletBalance(
    walletAddress: string
  ): Promise<WalletBalanceInfo | null> {
    try {
      console.log(`📡 Fetching balance for wallet: ${walletAddress}`);

      const response = await fetch(
        `/api/wallets/tokens?walletAddress=${walletAddress}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        const balanceInfo: WalletBalanceInfo = {
          walletId: walletAddress, // Using address as ID temporarily
          address: walletAddress,
          balance: data.totalValue || 0,
          tokenCount: data.tokens?.length || 0,
        };

        // Cache the result
        this.balanceCache.set(walletAddress, balanceInfo);

        console.log(
          `✅ Balance fetched: ${walletAddress} = $${balanceInfo.balance.toFixed(
            2
          )}`
        );
        return balanceInfo;
      } else {
        console.error(`❌ Failed to fetch balance for ${walletAddress}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error fetching balance for ${walletAddress}:`, error);
      return null;
    }
  }

  // Fetch balances for multiple wallets
  async fetchAllWalletBalances(
    wallets: Array<{ id: string; address: string; name: string }>
  ): Promise<WalletBalanceInfo[]> {
    const now = Date.now();

    // Check if we have recent cached data
    if (
      now - this.lastFetchTime < this.CACHE_DURATION &&
      this.balanceCache.size > 0
    ) {
      console.log("📋 Using cached wallet balances");
      return Array.from(this.balanceCache.values()).filter((info) =>
        wallets.some((w) => w.address === info.address)
      );
    }

    console.log(`🔄 Fetching balances for ${wallets.length} wallets...`);

    try {
      // Fetch all balances in parallel
      const balancePromises = wallets.map(async (wallet) => {
        const balanceInfo = await this.fetchWalletBalance(wallet.address);
        return balanceInfo ? { ...balanceInfo, walletId: wallet.id } : null;
      });

      const results = await Promise.all(balancePromises);
      const validResults = results.filter(
        (result): result is WalletBalanceInfo => result !== null
      );

      this.lastFetchTime = now;
      console.log(
        `✅ Fetched ${validResults.length} wallet balances successfully`
      );

      return validResults;
    } catch (error) {
      console.error("❌ Error fetching wallet balances:", error);
      return [];
    }
  }

  // Get cached balance for a wallet
  getCachedBalance(walletAddress: string): WalletBalanceInfo | null {
    return this.balanceCache.get(walletAddress) || null;
  }

  // Clear cache
  clearCache(): void {
    this.balanceCache.clear();
    this.lastFetchTime = 0;
  }

  // Check if cache is valid
  isCacheValid(): boolean {
    const now = Date.now();
    return now - this.lastFetchTime < this.CACHE_DURATION;
  }
}

// Export singleton instance
export const walletBalanceService = new WalletBalanceService();
