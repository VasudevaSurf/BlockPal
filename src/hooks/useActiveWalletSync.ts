// src/hooks/useActiveWalletSync.ts - Hook for managing active wallet synchronization
import { useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  setActiveWallet,
  setActiveWalletInDB,
  getActiveWalletFromDB,
} from "@/store/slices/walletSlice";

export interface UseActiveWalletSyncOptions {
  autoSync?: boolean; // Whether to automatically sync on mount
  syncOnWalletChange?: boolean; // Whether to sync when wallets array changes
}

export const useActiveWalletSync = (
  options: UseActiveWalletSyncOptions = {}
) => {
  const { autoSync = true, syncOnWalletChange = true } = options;

  const dispatch = useDispatch<AppDispatch>();
  const { wallets, activeWallet, loading } = useSelector(
    (state: RootState) => state.wallet
  );
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  // Function to sync active wallet from database
  const syncFromDatabase = useCallback(async () => {
    if (!isAuthenticated || !user || wallets.length === 0) {
      return false;
    }

    try {
      console.log("🔄 Syncing active wallet from database...");
      const result = await dispatch(getActiveWalletFromDB());

      if (result.type === "wallet/getActiveWalletFromDB/fulfilled") {
        const { activeWalletId } = result.payload as any;

        if (activeWalletId) {
          // Check if the wallet exists in our current wallets
          const walletExists = wallets.find((w) => w.id === activeWalletId);
          if (walletExists) {
            dispatch(setActiveWallet(activeWalletId));
            console.log("✅ Active wallet synced from DB:", activeWalletId);
            return true;
          } else {
            console.warn(
              "⚠️ Active wallet from DB not found in current wallets"
            );
          }
        }
      }

      // Fallback: if no active wallet in DB or sync failed, set first wallet
      if (wallets.length > 0 && !activeWallet) {
        const firstWallet = wallets[0];
        await setActiveWalletAndSync(firstWallet.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Failed to sync active wallet from database:", error);
      return false;
    }
  }, [dispatch, isAuthenticated, user, wallets, activeWallet]);

  // Function to set active wallet locally and sync to database
  const setActiveWalletAndSync = useCallback(
    async (walletId: string) => {
      try {
        console.log("🎯 Setting active wallet and syncing to DB:", walletId);

        // Set locally first for immediate UI response
        dispatch(setActiveWallet(walletId));

        // Then sync with database
        await dispatch(setActiveWalletInDB(walletId));

        console.log("✅ Active wallet set and synced to DB successfully");
        return true;
      } catch (error) {
        console.error("❌ Failed to sync active wallet to database:", error);
        // Local state is still updated, so UI remains consistent
        return false;
      }
    },
    [dispatch]
  );

  // Function to get the current active wallet status
  const getActiveWalletStatus = useCallback(() => {
    return {
      hasActiveWallet: !!activeWallet,
      activeWalletId: activeWallet?.id || null,
      activeWalletName: activeWallet?.name || null,
      activeWalletAddress: activeWallet?.address || null,
      totalWallets: wallets.length,
      isSynced: true, // Assuming sync is working if no errors
    };
  }, [activeWallet, wallets.length]);

  // Auto sync effect
  useEffect(() => {
    if (
      autoSync &&
      isAuthenticated &&
      user &&
      wallets.length > 0 &&
      !activeWallet
    ) {
      syncFromDatabase();
    }
  }, [
    autoSync,
    isAuthenticated,
    user,
    wallets.length,
    activeWallet,
    syncFromDatabase,
  ]);

  // Sync on wallet changes effect
  useEffect(() => {
    if (syncOnWalletChange && isAuthenticated && user && wallets.length > 0) {
      // If we have wallets but no active wallet, sync from DB
      if (!activeWallet) {
        syncFromDatabase();
      }
    }
  }, [
    syncOnWalletChange,
    isAuthenticated,
    user,
    wallets.length,
    activeWallet,
    syncFromDatabase,
  ]);

  // Cleanup effect - clear localStorage on unmount if needed
  useEffect(() => {
    return () => {
      // Optional: Clear localStorage when component unmounts
      // if (typeof window !== "undefined") {
      //   localStorage.removeItem("activeWalletId");
      // }
    };
  }, []);

  return {
    // State
    activeWallet,
    wallets,
    loading,
    isAuthenticated,

    // Actions
    setActiveWalletAndSync,
    syncFromDatabase,

    // Utilities
    getActiveWalletStatus,

    // Computed values
    hasActiveWallet: !!activeWallet,
    totalWallets: wallets.length,
  };
};
