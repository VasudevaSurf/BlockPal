// src/components/wallet/WalletProvider.tsx - UPDATED FOR WAGMI V2
"use client";

import { useEffect, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";

// Import polyfills first
import "../../utils/polyfills.ts";

import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, base, arbitrum, avalanche, bsc, polygon } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { http } from "wagmi";

// Your WalletConnect Project ID
const projectId = "ccbe76e1a5fcc580ca233ed69c4d09cb";

// WAGMI V2: Use getDefaultConfig with http transports
const config = getDefaultConfig({
  appName: "Blockpal",
  projectId: projectId,
  chains: [mainnet, base, arbitrum, avalanche, bsc, polygon],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [avalanche.id]: http(),
    [bsc.id]: http(),
    [polygon.id]: http(),
  },
  ssr: false, // Important for Next.js
});

export { config };
export const chains = [mainnet, base, arbitrum, avalanche, bsc, polygon];

console.log(
  "🔗 Configured chains for wagmi v2:",
  chains.map((c) => ({ id: c.id, name: c.name }))
);

// Query client for @tanstack/react-query v5
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
          errorMessage.includes("contractfunctionexecutionerror") ||
          errorMessage.includes("switchchain") ||
          errorMessage.includes("defaultchain")
        ) {
          console.warn("🔇 Suppressing retries for error:", errorMessage);
          return false;
        }
        return failureCount < 2;
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
  const [error, setError] = useState<string | null>(null);

  // Ensure this only runs on the client to prevent hydration mismatches
  useEffect(() => {
    try {
      setMounted(true);
      console.log("🔗 WalletProvider mounted successfully with wagmi v2");
    } catch (err: any) {
      console.error("❌ Error mounting WalletProvider:", err);
      setError("Failed to initialize wallet provider");
    }
  }, []);

  // Show error state if provider failed to initialize
  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">Wallet Provider Error</div>
          <div className="text-gray-400 text-sm mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#E2AF19",
            accentColorForeground: "black",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
          modalSize="wide"
          showRecentTransactions={false} // Keep disabled for performance
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
