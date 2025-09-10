// src/components/wallet/WalletProvider.tsx - TURBOPACK COMPATIBLE VERSION
"use client";

import { useEffect, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";

// Import polyfills first
import "../../utils/polyfills.ts";

import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { mainnet, base, arbitrum, avalanche, bsc, polygon } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// Import additional wallets
import {
  rainbowWallet,
  walletConnectWallet,
  metaMaskWallet,
  coinbaseWallet,
  argentWallet,
  trustWallet,
  ledgerWallet,
  braveWallet,
  safeWallet,
  phantomWallet,
  okxWallet,
  bitgetWallet,
  uniswapWallet,
  zerionWallet,
  rabbyWallet,
  imTokenWallet,
  omniWallet,
  xdefiWallet,
  oneKeyWallet,
  coreWallet,
  tokenPocketWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";

// Your WalletConnect Project ID
const projectId = "ccbe76e1a5fcc580ca233ed69c4d09cb";

// Configure chains with minimal RPC calls and error handling
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, base, arbitrum, avalanche, bsc, polygon],
  [publicProvider()],
  {
    // Reduce batch size and disable certain features to prevent RPC errors
    batch: {
      multicall: {
        batchSize: 256, // Smaller batch size
        wait: 32,
      },
    },
    pollingInterval: 30_000, // Longer polling interval
    stallTimeout: 5_000,
  }
);

export { chains };

// Get default wallets with minimal configuration
const { wallets } = getDefaultWallets({
  appName: "Blockpal",
  projectId: projectId,
  chains,
});

// Add more wallets to the default list
const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: "More Wallets",
    wallets: [
      argentWallet({ projectId, chains }),
      trustWallet({ projectId, chains }),
      ledgerWallet({ projectId, chains }),
      braveWallet({ chains }),
      safeWallet({ chains }),
      phantomWallet({ chains }),
      okxWallet({ projectId, chains }),
      bitgetWallet({ projectId, chains }),
      uniswapWallet({ projectId, chains }),
      zerionWallet({ projectId, chains }),
      rabbyWallet({ chains }),
      imTokenWallet({ projectId, chains }),
      omniWallet({ projectId, chains }),
      xdefiWallet({ chains }),
      oneKeyWallet({ chains }),
      coreWallet({ projectId, chains }),
      tokenPocketWallet({ projectId, chains }),
      injectedWallet({ chains }),
    ],
  },
]);

// Create wagmi config with strict client-side only settings
const wagmiConfig = createConfig({
  autoConnect: false, // Prevent auto-connect to avoid hydration issues
  connectors,
  publicClient,
  webSocketPublicClient,
});

// Query client with aggressive error filtering
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on RPC errors that we know will fail
        const errorMessage = error?.message?.toLowerCase() || "";
        if (
          errorMessage.includes("internal error") ||
          errorMessage.includes("reverse") ||
          errorMessage.includes("ens") ||
          errorMessage.includes("eth_getbalance") ||
          errorMessage.includes("contractfunctionexecutionerror")
        ) {
          return false;
        }
        return failureCount < 2; // Reduced retry attempts
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

// Provider wrapper component with hydration safety
interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure this only runs on the client to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a placeholder during SSR and initial hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  // Only render the full wallet provider after hydration
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          chains={chains}
          theme={darkTheme({
            accentColor: "#E2AF19",
            accentColorForeground: "black",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
          modalSize="wide"
          showRecentTransactions={false} // Disable to prevent additional RPC calls
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
