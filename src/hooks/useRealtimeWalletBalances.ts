// src/hooks/useRealtimeWalletBalances.ts - Real-time wallet balance hook
import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  realtimeWalletService,
  WalletBalanceUpdate,
} from "@/lib/realtime-wallet-service";

export interface RealtimeWalletBalance {
  id: string;
  name: string;
  address: string;
  balance: number;
  tokenCount: number;
  isActive: boolean;
  lastUpdated?: Date;
  changeAmount?: number; // Recent change in balance
  isIncreasing?: boolean; // Whether balance recently increased
  tokens?: Array<{
    symbol: string;
    balance: number;
    value: number;
    change24h: number;
    price: number;
  }>;
}

export interface RealtimeBalanceNotification {
  type: "balance_change" | "new_token" | "token_removed";
  walletId: string;
  walletName: string;
  message: string;
  amount?: number;
  timestamp: Date;
}

export function useRealtimeWalletBalances() {
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );
  const [realtimeBalances, setRealtimeBalances] = useState<
    RealtimeWalletBalance[]
  >([]);
  const [notifications, setNotifications] = useState<
    RealtimeBalanceNotification[]
  >([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const prevBalancesRef = useRef<Map<string, number>>(new Map());

  // Initialize real-time monitoring when wallets are available
  useEffect(() => {
    if (wallets.length > 0) {
      console.log(
        "🔄 Initializing real-time monitoring for",
        wallets.length,
        "wallets"
      );

      // Start monitoring
      realtimeWalletService.startMonitoring(wallets);
      setIsMonitoring(true);

      // Set up event listeners
      const handleBalanceUpdate = (event: any) => {
        const { walletId, update, changeAmount } = event;

        setRealtimeBalances((prev) => {
          const newBalances = prev.map((wallet) => {
            if (wallet.id === walletId) {
              // Check for significant changes to show notifications
              const prevBalance = prevBalancesRef.current.get(walletId) || 0;
              const hasSignificantChange =
                Math.abs(update.balance - prevBalance) > 0.01; // $0.01 threshold

              if (hasSignificantChange && prevBalance > 0) {
                addNotification({
                  type: "balance_change",
                  walletId,
                  walletName: wallet.name,
                  message:
                    changeAmount > 0
                      ? `Received $${Math.abs(changeAmount).toFixed(2)}`
                      : `Sent $${Math.abs(changeAmount).toFixed(2)}`,
                  amount: changeAmount,
                  timestamp: new Date(),
                });
              }

              // Update previous balance reference
              prevBalancesRef.current.set(walletId, update.balance);

              return {
                ...wallet,
                balance: update.balance,
                tokenCount: update.tokenCount,
                lastUpdated: update.lastUpdated,
                changeAmount,
                isIncreasing: changeAmount > 0,
                tokens: update.tokens,
              };
            }
            return wallet;
          });

          // If wallet not found, add it
          const existingWallet = newBalances.find((w) => w.id === walletId);
          if (!existingWallet) {
            const walletInfo = wallets.find((w) => w.id === walletId);
            if (walletInfo) {
              newBalances.push({
                id: walletId,
                name: walletInfo.name,
                address: walletInfo.address,
                balance: update.balance,
                tokenCount: update.tokenCount,
                isActive: activeWallet?.id === walletId,
                lastUpdated: update.lastUpdated,
                changeAmount,
                isIncreasing: changeAmount > 0,
                tokens: update.tokens,
              });
            }
          }

          return newBalances;
        });

        setLastUpdateTime(new Date());
      };

      const handleTokenCountChange = (event: any) => {
        const { walletId, previousCount, newCount } = event;
        const walletInfo = wallets.find((w) => w.id === walletId);

        if (walletInfo) {
          const message =
            newCount > previousCount ? `New token detected!` : `Token removed`;

          addNotification({
            type: newCount > previousCount ? "new_token" : "token_removed",
            walletId,
            walletName: walletInfo.name,
            message,
            timestamp: new Date(),
          });
        }
      };

      // Register event listeners
      realtimeWalletService.on("balance_updated", handleBalanceUpdate);
      realtimeWalletService.on("token_count_changed", handleTokenCountChange);

      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up real-time monitoring");
        realtimeWalletService.removeListener(
          "balance_updated",
          handleBalanceUpdate
        );
        realtimeWalletService.removeListener(
          "token_count_changed",
          handleTokenCountChange
        );
        realtimeWalletService.stopMonitoring();
        setIsMonitoring(false);
      };
    }
  }, [wallets, activeWallet]);

  // Initialize balances from current wallet data
  useEffect(() => {
    if (wallets.length > 0 && realtimeBalances.length === 0) {
      const initialBalances: RealtimeWalletBalance[] = wallets.map(
        (wallet) => ({
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          balance: wallet.balance || 0,
          tokenCount: 0,
          isActive: activeWallet?.id === wallet.id,
        })
      );

      setRealtimeBalances(initialBalances);

      // Initialize previous balances reference
      wallets.forEach((wallet) => {
        prevBalancesRef.current.set(wallet.id, wallet.balance || 0);
      });
    }
  }, [wallets, activeWallet]);

  // Helper function to add notifications
  const addNotification = useCallback(
    (notification: RealtimeBalanceNotification) => {
      setNotifications((prev) => {
        const newNotifications = [notification, ...prev].slice(0, 10); // Keep only last 10
        return newNotifications;
      });

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.timestamp !== notification.timestamp)
        );
      }, 5000);
    },
    []
  );

  // Manual refresh function
  const refreshWallet = useCallback(async (walletId: string) => {
    try {
      await realtimeWalletService.refreshWallet(walletId);
    } catch (error) {
      console.error("❌ Error refreshing wallet:", error);
    }
  }, []);

  // Refresh all wallets
  const refreshAllWallets = useCallback(async () => {
    try {
      const promises = wallets.map((wallet) =>
        realtimeWalletService.refreshWallet(wallet.id)
      );
      await Promise.all(promises);
    } catch (error) {
      console.error("❌ Error refreshing all wallets:", error);
    }
  }, [wallets]);

  // Get active wallet balance
  const activeWalletBalance =
    realtimeBalances.find((w) => w.isActive)?.balance || 0;

  // Get total balance across all wallets
  const totalBalance = realtimeBalances.reduce(
    (sum, wallet) => sum + wallet.balance,
    0
  );

  // Get service status
  const getMonitoringStatus = useCallback(() => {
    return realtimeWalletService.getStatus();
  }, []);

  // Change polling interval
  const updatePollInterval = useCallback((interval: number) => {
    realtimeWalletService.updatePollInterval(interval);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Mark notification as read (remove it)
  const dismissNotification = useCallback((timestamp: Date) => {
    setNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
  }, []);

  return {
    // Balance data
    realtimeBalances,
    activeWalletBalance,
    totalBalance,

    // Monitoring status
    isMonitoring,
    lastUpdateTime,

    // Notifications
    notifications,

    // Actions
    refreshWallet,
    refreshAllWallets,
    clearNotifications,
    dismissNotification,

    // Settings
    updatePollInterval,
    getMonitoringStatus,
  };
}
