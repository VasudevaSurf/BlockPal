// src/hooks/useWalletIntegration.ts - REOWN APPKIT VERSION
"use client";

import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  setActiveWallet,
  updateWalletBalances,
  initializeMockData,
  clearWalletState,
} from "@/store/slices/walletSlice";
import { chains } from "@/components/wallet/WalletProvider";

export function useWalletIntegration() {
  const { address, isConnected, caipAddress } = useAppKitAccount();
  const { caipNetwork, chainId: appKitChainId } = useAppKitNetwork();

  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ✅ FIXED: Get chain ID properly from caipNetwork
  // caipNetwork.id is a number for EVM chains and 'solana:mainnet' for Solana
  const chainId = caipNetwork?.id || appKitChainId;

  const currentChain = chains.find((c) => c.id === chainId);

  // Ensure we're mounted before doing anything
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle wallet connection/disconnection only after mounting
  useEffect(() => {
    if (!mounted) return;

    console.log("🔄 Wallet state changed:", {
      isConnected,
      address: address?.slice(0, 10) + "...",
      chainName: currentChain?.name || caipNetwork?.name,
      chainId,
      mounted,
    });

    if (isConnected && address && !isInitialized) {
      console.log("✅ Wallet connected, setting up integration");

      // Create a wallet object from connected wallet
      const connectedWallet = {
        id: "connected-wallet",
        name: `${currentChain?.name || caipNetwork?.name || "Wallet"}`,
        address: address,
        balance: 0, // Start with 0, will update when balance loads
        isActive: true,
      };

      // Initialize with connected wallet data
      dispatch(initializeMockData());

      // Set the connected wallet as active
      dispatch(setActiveWallet("connected-wallet"));

      setIsInitialized(true);
    } else if (!isConnected && isInitialized) {
      console.log("🚪 Wallet disconnected, clearing wallet state");

      // Clear wallet state when disconnected
      dispatch(clearWalletState());
      setIsInitialized(false);
    }
  }, [
    mounted,
    isConnected,
    address,
    currentChain,
    caipNetwork,
    chainId,
    dispatch,
    isInitialized,
  ]);

  useEffect(() => {
    if (caipNetwork) {
      console.log("🔍 Debug - caipNetwork:", {
        id: caipNetwork.id,
        idType: typeof caipNetwork.id,
        name: caipNetwork.name,
        fullNetwork: caipNetwork,
      });
    }
  }, [caipNetwork]);

  // Return safe values, ensuring no hydration mismatches
  return {
    isConnected: mounted ? isConnected : false,
    address: mounted ? address : undefined,
    chain: mounted ? currentChain : undefined,
    chainId: mounted ? chainId : undefined,
    chainName: mounted ? currentChain?.name || caipNetwork?.name : undefined,
    balance: 0, // Will be updated by token service
    balanceSymbol:
      currentChain?.name === "Ethereum"
        ? "ETH"
        : currentChain?.name?.substring(0, 4).toUpperCase() || "TOKEN",
    isInitialized: mounted ? isInitialized : false,
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
