// src/hooks/useWalletIntegration.ts - Enhanced with database persistence
"use client";

import { useAccount, useBalance, useChainId } from "wagmi";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  setActiveWallet,
  updateWalletBalances,
  clearWalletState,
  setWalletConnected,
  setWalletDisconnected,
  loadStoredWallets,
  setLoading,
} from "@/store/slices/walletSlice";
import { chains } from "@/components/wallet/WalletProvider";

// API functions for wallet persistence
const walletAPI = {
  async connectWallet(
    walletAddress: string,
    chainId: number,
    walletType?: string
  ) {
    const response = await fetch("/api/wallet/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ walletAddress, chainId, walletType }),
    });
    return response.json();
  },

  async disconnectWallet(walletAddress?: string) {
    const response = await fetch("/api/wallet/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ walletAddress }),
    });
    return response.json();
  },

  async getConnectedWallets() {
    const response = await fetch("/api/wallet/connect", {
      credentials: "include",
    });
    return response.json();
  },

  async checkConnectionStatus() {
    const response = await fetch("/api/wallet/disconnect", {
      credentials: "include",
    });
    return response.json();
  },
};

export function useWalletIntegration() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);

  const {
    data: balance,
    error: balanceError,
    isLoading: balanceLoading,
  } = useBalance({
    address,
    enabled: false, // Start disabled
    query: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 60 * 1000,
    },
  });

  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const walletState = useSelector((state: RootState) => state.wallet);

  const [mounted, setMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [balanceFetchEnabled, setBalanceFetchEnabled] = useState(false);
  const [autoConnectionAttempted, setAutoConnectionAttempted] = useState(false);

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-load stored wallet connections when user is authenticated
  useEffect(() => {
    if (
      mounted &&
      isAuthenticated &&
      !autoConnectionAttempted &&
      !walletState.loading
    ) {
      loadStoredWalletConnections();
      setAutoConnectionAttempted(true);
    }
  }, [mounted, isAuthenticated, autoConnectionAttempted, walletState.loading]);

  // Handle wallet connection changes
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;

    if (isConnected && address && chainId) {
      handleWalletConnected(address, chainId);
    } else if (isDisconnected && walletState.activeWallet) {
      handleWalletDisconnected();
    }
  }, [mounted, isAuthenticated, isConnected, isDisconnected, address, chainId]);

  // Update balance when it changes
  useEffect(() => {
    if (
      mounted &&
      isConnected &&
      address &&
      balance &&
      !balanceError &&
      balanceFetchEnabled
    ) {
      console.log("💰 Balance updated:", balance.formatted, balance.symbol);

      try {
        const balanceValue = parseFloat(balance.formatted);
        if (!isNaN(balanceValue)) {
          dispatch(
            updateWalletBalances([
              {
                walletId: "connected-wallet",
                balance: balanceValue,
                tokenCount: 1,
              },
            ])
          );
        }
      } catch (error) {
        console.warn("⚠️ Error processing balance update:", error);
      }
    }
  }, [
    mounted,
    balance,
    isConnected,
    address,
    balanceError,
    balanceFetchEnabled,
  ]);

  // Load stored wallet connections from database
  const loadStoredWalletConnections = async () => {
    try {
      dispatch(setLoading(true));
      console.log("📱 Loading stored wallet connections...");

      const result = await walletAPI.getConnectedWallets();

      if (result.success && result.data) {
        const { wallets, activeWallet } = result.data;

        console.log(
          `📱 Found ${wallets.length} stored wallet(s), active: ${
            activeWallet ? activeWallet.walletAddress : "none"
          }`
        );

        if (wallets.length > 0) {
          dispatch(loadStoredWallets({ wallets, activeWallet }));

          if (activeWallet && !isConnected) {
            console.log(
              `🔄 Auto-restoring connection to: ${activeWallet.walletAddress}`
            );
            // The wallet will be activated when user manually connects
            // We just show it as the preferred wallet
          }
        }
      }
    } catch (error) {
      console.error("❌ Error loading stored wallets:", error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Handle wallet connected
  const handleWalletConnected = async (
    walletAddress: string,
    chainId: number
  ) => {
    try {
      console.log("🔗 Wallet connected:", walletAddress, "on chain", chainId);

      // Store connection in database
      const result = await walletAPI.connectWallet(
        walletAddress,
        chainId,
        "wagmi"
      );

      if (result.success) {
        console.log("✅ Wallet connection stored in database");

        // Update Redux state
        const walletData = {
          id: "connected-wallet",
          name: `${currentChain?.name || "Ethereum"} Wallet`,
          address: walletAddress,
          chainId,
          balance: 0,
          isActive: true,
        };

        dispatch(setWalletConnected(walletData));
        setIsInitialized(true);

        // Enable balance fetching after delay
        setTimeout(() => {
          setBalanceFetchEnabled(true);
        }, 2000);
      } else {
        console.error("❌ Failed to store wallet connection:", result.error);
      }
    } catch (error) {
      console.error("❌ Error handling wallet connection:", error);
    }
  };

  // Handle wallet disconnected
  const handleWalletDisconnected = async () => {
    try {
      console.log("🔌 Wallet disconnected");

      if (walletState.activeWallet) {
        // Remove connection from database
        const result = await walletAPI.disconnectWallet(
          walletState.activeWallet.address
        );

        if (result.success) {
          console.log("✅ Wallet disconnection stored in database");
        }
      }

      // Update Redux state
      dispatch(setWalletDisconnected());
      setIsInitialized(false);
      setBalanceFetchEnabled(false);
    } catch (error) {
      console.error("❌ Error handling wallet disconnection:", error);
    }
  };

  // Manual connect function
  const connectWallet = () => {
    console.log("🔗 Manual connect wallet action triggered");
    // This will be handled by wagmi connect button
  };

  // Manual disconnect function
  const disconnectWallet = async () => {
    console.log("🔌 Manual disconnect wallet action triggered");

    try {
      if (walletState.activeWallet) {
        await walletAPI.disconnectWallet(walletState.activeWallet.address);
      }
      dispatch(clearWalletState());
    } catch (error) {
      console.error("❌ Error in manual disconnect:", error);
    }
  };

  // Switch wallet function
  const switchWallet = (walletId: string) => {
    console.log("🔄 Switching to wallet:", walletId);
    dispatch(setActiveWallet(walletId));
  };

  // Refresh wallet data
  const refreshWalletData = async () => {
    if (walletState.activeWallet) {
      console.log("🔄 Refreshing wallet data...");
      await loadStoredWalletConnections();
    }
  };

  // Return safe values, ensuring no hydration mismatches
  return {
    // Connection status
    isConnected: mounted ? isConnected : false,
    isConnecting: mounted ? isConnecting : false,
    isInitialized: mounted ? isInitialized : false,

    // Wallet data
    address: mounted ? address : undefined,
    chain: mounted ? currentChain : undefined,
    chainId: mounted ? chainId : undefined,

    // Balance data
    balance:
      mounted && balance && !balanceError ? parseFloat(balance.formatted) : 0,
    balanceSymbol: mounted && balance?.symbol ? balance.symbol : "ETH",
    balanceLoading: mounted ? balanceLoading : false,
    hasBalanceError: mounted ? !!balanceError : false,

    // State
    mounted,
    walletState,

    // Actions
    connectWallet,
    disconnectWallet,
    switchWallet,
    refreshWalletData,
    loadStoredWalletConnections,
  };
}

// Hook for wallet actions (kept for compatibility)
export function useWalletActions() {
  const dispatch = useDispatch<AppDispatch>();

  const connectWallet = () => {
    console.log("🔗 Connect wallet action triggered");
  };

  const disconnectWallet = () => {
    console.log("🔌 Disconnect wallet action triggered");
    dispatch(clearWalletState());
  };

  const switchWallet = (walletId: string) => {
    console.log("🔄 Switching to wallet:", walletId);
    dispatch(setActiveWallet(walletId));
  };

  return {
    connectWallet,
    disconnectWallet,
    switchWallet,
  };
}
