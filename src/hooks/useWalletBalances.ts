// src/hooks/useWalletBalances.ts - Hook to manage wallet balances
import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  walletBalanceService,
  WalletBalanceInfo,
} from "@/lib/wallet-balance-service";

export interface WalletWithBalance {
  id: string;
  name: string;
  address: string;
  balance: number;
  tokenCount: number;
  isActive: boolean;
}

export function useWalletBalances() {
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );
  const [walletsWithBalances, setWalletsWithBalances] = useState<
    WalletWithBalance[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to load all wallet balances
  const loadWalletBalances = useCallback(async () => {
    if (wallets.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      console.log("🔄 useWalletBalances: Loading balances for all wallets...");

      const balanceInfos = await walletBalanceService.fetchAllWalletBalances(
        wallets
      );

      // Merge wallet info with balance data
      const walletsWithBalanceData: WalletWithBalance[] = wallets.map(
        (wallet) => {
          const balanceInfo = balanceInfos.find(
            (info) =>
              info.walletId === wallet.id || info.address === wallet.address
          );

          return {
            id: wallet.id,
            name: wallet.name,
            address: wallet.address,
            balance: balanceInfo?.balance || 0,
            tokenCount: balanceInfo?.tokenCount || 0,
            isActive: activeWallet?.id === wallet.id,
          };
        }
      );

      setWalletsWithBalances(walletsWithBalanceData);
      console.log(
        "✅ useWalletBalances: All wallet balances loaded",
        walletsWithBalanceData
      );
    } catch (err) {
      console.error(
        "❌ useWalletBalances: Error loading wallet balances:",
        err
      );
      setError(
        err instanceof Error ? err.message : "Failed to load wallet balances"
      );

      // Fallback to wallets without balance data
      setWalletsWithBalances(
        wallets.map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          balance: 0,
          tokenCount: 0,
          isActive: activeWallet?.id === wallet.id,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [wallets, activeWallet]);

  // Load balances when wallets change
  useEffect(() => {
    if (wallets.length > 0) {
      loadWalletBalances();
    }
  }, [loadWalletBalances]);

  // Function to refresh a single wallet balance
  const refreshWalletBalance = useCallback(
    async (walletId: string) => {
      const wallet = wallets.find((w) => w.id === walletId);
      if (!wallet) return;

      try {
        const balanceInfo = await walletBalanceService.fetchWalletBalance(
          wallet.address
        );
        if (balanceInfo) {
          setWalletsWithBalances((prev) =>
            prev.map((w) =>
              w.id === walletId
                ? {
                    ...w,
                    balance: balanceInfo.balance,
                    tokenCount: balanceInfo.tokenCount,
                  }
                : w
            )
          );
        }
      } catch (err) {
        console.error(
          `❌ Error refreshing balance for wallet ${walletId}:`,
          err
        );
      }
    },
    [wallets]
  );

  // Function to manually refresh all balances
  const refreshAllBalances = useCallback(() => {
    walletBalanceService.clearCache();
    loadWalletBalances();
  }, [loadWalletBalances]);

  // Get balance for active wallet
  const activeWalletBalance =
    walletsWithBalances.find((w) => w.isActive)?.balance || 0;

  // Get total balance across all wallets
  const totalBalance = walletsWithBalances.reduce(
    (sum, wallet) => sum + wallet.balance,
    0
  );

  return {
    walletsWithBalances,
    loading,
    error,
    activeWalletBalance,
    totalBalance,
    refreshWalletBalance,
    refreshAllBalances,
    loadWalletBalances,
  };
}
