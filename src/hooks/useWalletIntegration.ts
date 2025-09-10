// src/hooks/useWalletIntegration.ts - SAFER VERSION
"use client";

import { useAccount, useBalance, useNetwork } from "wagmi";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  setActiveWallet,
  updateWalletBalances,
  initializeMockData,
  clearWalletState,
} from "@/store/slices/walletSlice";

export function useWalletIntegration() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const { chain } = useNetwork();

  // More conservative balance fetching with extensive error handling
  const {
    data: balance,
    error: balanceError,
    isLoading: balanceLoading,
  } = useBalance({
    address,
    enabled: false, // Start disabled to prevent immediate RPC calls
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 60 * 1000, // 1 minute
  });

  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [balanceFetchEnabled, setBalanceFetchEnabled] = useState(false);

  // Ensure we're mounted before doing anything
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle balance errors with detailed logging but no user-facing errors
  useEffect(() => {
    if (balanceError) {
      const errorMessage = balanceError.message.toLowerCase();

      // Log different types of errors differently
      if (errorMessage.includes("internal error")) {
        console.warn("🔇 RPC Internal Error (ignored):", balanceError.message);
      } else if (
        errorMessage.includes("reverse") ||
        errorMessage.includes("ens")
      ) {
        console.warn(
          "🔇 ENS Resolution Error (ignored):",
          balanceError.message
        );
      } else {
        console.warn("⚠️ Balance fetch error:", balanceError.message);
      }
    }
  }, [balanceError]);

  // Handle wallet connection/disconnection only after mounting
  useEffect(() => {
    if (!mounted) return;

    console.log("🔄 Wallet state changed:", {
      isConnected,
      isConnecting,
      isDisconnected,
      address: address?.slice(0, 10) + "...",
      chain: chain?.name,
      mounted,
    });

    if (isConnected && address && !isInitialized) {
      console.log("✅ Wallet connected, setting up integration");

      // Create a wallet object from connected wallet
      const connectedWallet = {
        id: "connected-wallet",
        name: `${chain?.name || "Ethereum"} Wallet`,
        address: address,
        balance: 0, // Start with 0, will update when balance loads
        isActive: true,
      };

      // Initialize with connected wallet data
      dispatch(initializeMockData());

      // Set the connected wallet as active
      dispatch(setActiveWallet("connected-wallet"));

      setIsInitialized(true);

      // Enable balance fetching after a delay to prevent immediate RPC calls
      setTimeout(() => {
        setBalanceFetchEnabled(true);
      }, 2000);
    } else if (isDisconnected && isInitialized) {
      console.log("🚪 Wallet disconnected, clearing wallet state");

      // Clear wallet state when disconnected
      dispatch(clearWalletState());
      setIsInitialized(false);
      setBalanceFetchEnabled(false);
    }
  }, [
    mounted,
    isConnected,
    isDisconnected,
    address,
    chain,
    dispatch,
    isInitialized,
  ]);

  // Update balance when it changes (with extensive error handling)
  useEffect(() => {
    if (
      mounted &&
      isConnected &&
      address &&
      balance &&
      isInitialized &&
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
    dispatch,
    isInitialized,
    balanceError,
    balanceFetchEnabled,
  ]);

  // Return safe values, ensuring no hydration mismatches
  return {
    isConnected: mounted ? isConnected : false,
    isConnecting: mounted ? isConnecting : false,
    address: mounted ? address : undefined,
    chain: mounted ? chain : undefined,
    balance:
      mounted && balance && !balanceError ? parseFloat(balance.formatted) : 0,
    balanceSymbol: mounted && balance?.symbol ? balance.symbol : "ETH",
    isInitialized: mounted ? isInitialized : false,
    hasBalanceError: mounted ? !!balanceError : false,
    balanceLoading: mounted ? balanceLoading : false,
    mounted,
  };
}

// Hook for wallet actions
export function useWalletActions() {
  const dispatch = useDispatch();

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
