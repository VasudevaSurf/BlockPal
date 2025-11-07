// src/hooks/useWalletIntegration.ts - UPDATED FOR SOLANA SUPPORT
"use client";

import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useBalance } from "wagmi";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  setActiveWallet,
  updateWalletBalances,
  initializeMockData,
  clearWalletState,
} from "@/store/slices/walletSlice";
import { chains, solana } from "@/components/wallet/WalletProvider";
import { getChainType, isSolanaAddress } from "@/utils/walletHelpers";

export function useWalletIntegration() {
  const { address, isConnected, isConnecting, isDisconnected, isReconnecting } =
    useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();

  // Get chain identifier
  const getChainId = (): number | string => {
    if (!caipNetwork) return 1;

    if (
      caipNetwork.name?.toLowerCase() === "solana" ||
      caipNetwork.id?.toString().includes("solana") ||
      caipNetwork.chainNamespace === "solana"
    ) {
      return "solana";
    }

    return Number(caipNetwork.id) || 1;
  };

  const chainId = getChainId();
  const chainType = getChainType(chainId);
  const isSolana = chainType === "solana";

  // Get current chain data
  const getCurrentChain = () => {
    if (isSolana) {
      return {
        id: "solana",
        name: "Solana",
        nativeCurrency: {
          name: "SOL",
          symbol: "SOL",
          decimals: 9,
        },
      };
    }

    return chains.find((c) => c.id === Number(chainId)) || chains[0];
  };

  const currentChain = getCurrentChain();

  // Only fetch balance for EVM chains
  const {
    data: balance,
    error: balanceError,
    isLoading: balanceLoading,
  } = useBalance({
    address: (isSolana ? undefined : address) as `0x${string}` | undefined,
    enabled: !isSolana && isConnected && !!address,
    query: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 60 * 1000,
    },
  });

  const dispatch = useDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [balanceFetchEnabled, setBalanceFetchEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (balanceError) {
      const errorMessage = balanceError.message.toLowerCase();

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

  useEffect(() => {
    if (!mounted) return;

    console.log("🔄 Wallet state changed:", {
      isConnected,
      isConnecting,
      isDisconnected,
      address: address?.slice(0, 10) + "...",
      chainName: currentChain?.name,
      chainId,
      chainType,
      isSolana,
      mounted,
    });

    if (isConnected && address && !isInitialized) {
      console.log(
        `✅ Wallet connected (${chainType.toUpperCase()}), setting up integration`
      );

      const connectedWallet = {
        id: "connected-wallet",
        name: `${currentChain?.name || "Unknown"} Wallet`,
        address: address,
        balance: 0,
        isActive: true,
      };

      dispatch(initializeMockData());
      dispatch(setActiveWallet("connected-wallet"));
      setIsInitialized(true);

      // Only enable balance fetching for EVM chains
      if (!isSolana) {
        setTimeout(() => {
          setBalanceFetchEnabled(true);
        }, 2000);
      }
    } else if (isDisconnected && isInitialized) {
      console.log("🚪 Wallet disconnected, clearing wallet state");
      dispatch(clearWalletState());
      setIsInitialized(false);
      setBalanceFetchEnabled(false);
    }
  }, [
    mounted,
    isConnected,
    isDisconnected,
    address,
    currentChain,
    chainId,
    chainType,
    isSolana,
    dispatch,
    isInitialized,
  ]);

  // Update balance for EVM chains
  useEffect(() => {
    if (
      mounted &&
      isConnected &&
      address &&
      balance &&
      isInitialized &&
      !balanceError &&
      balanceFetchEnabled &&
      !isSolana
    ) {
      console.log("💰 EVM Balance updated:", balance.formatted, balance.symbol);

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
    isSolana,
  ]);

  return {
    isConnected: mounted ? isConnected : false,
    isConnecting: mounted ? isConnecting : false,
    isReconnecting: mounted ? isReconnecting : false,
    address: mounted ? address : undefined,
    chain: mounted ? currentChain : undefined,
    chainId: mounted ? chainId : undefined,
    chainType: mounted ? chainType : "evm",
    isSolana: mounted ? isSolana : false,
    balance:
      mounted && balance && !balanceError && !isSolana
        ? parseFloat(balance.formatted)
        : 0,
    balanceSymbol:
      mounted && balance?.symbol
        ? balance.symbol
        : currentChain?.nativeCurrency?.symbol || "ETH",
    isInitialized: mounted ? isInitialized : false,
    hasBalanceError: mounted ? !!balanceError : false,
    balanceLoading: mounted ? balanceLoading : false,
    mounted,
  };
}

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
