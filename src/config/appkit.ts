// src/config/appkit.ts - WITH DEBUGGING
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import {
  mainnet,
  base,
  polygon,
  arbitrum,
  avalanche,
  bsc,
} from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/react";
import { QueryClient } from "@tanstack/react-query";
import { cookieStorage, createStorage } from "wagmi";

// ✅ Define Solana network manually
const solanaNetwork: AppKitNetwork = {
  id: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  name: "Solana",
  nativeCurrency: {
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
  },
  rpcUrls: {
    default: {
      http: ["https://api.mainnet-beta.solana.com"],
    },
    public: {
      http: ["https://api.mainnet-beta.solana.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Solscan",
      url: "https://solscan.io",
    },
  },
  chainNamespace: "solana" as const,
};

// ✅ Get projectId with debugging
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

console.log("🔍 Environment check:", {
  projectId: projectId ? "✅ Found" : "❌ Missing",
  projectIdValue: projectId?.substring(0, 10) + "...",
  allEnvVars: Object.keys(process.env).filter((key) => key.includes("PROJECT")),
});

if (!projectId) {
  console.error("❌ NEXT_PUBLIC_PROJECT_ID is not set!");
  console.error("Available env vars:", Object.keys(process.env));
  throw new Error(
    "NEXT_PUBLIC_PROJECT_ID is not set. Please add it to your .env.local file and restart the dev server."
  );
}

// Setup query client
export const queryClient = new QueryClient();

// Metadata for your dApp
const metadata = {
  name: "BlockPal",
  description: "Multi-chain wallet and token management platform",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://blockpal.io",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// All networks configuration (EVM + Solana)
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  base,
  polygon,
  arbitrum,
  avalanche,
  bsc,
  solanaNetwork,
];

// Create Wagmi Adapter for EVM chains
export const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, base, polygon, arbitrum, avalanche, bsc],
  projectId,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

// Create Solana Adapter
export const solanaAdapter = new SolanaAdapter();

// Create AppKit instance
createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
    history: false,
  },
  themeMode: "dark",
  allWallets: "SHOW",
});

// Export chains for compatibility with existing code
export const chains = [mainnet, base, polygon, arbitrum, avalanche, bsc];

// Export Solana network separately
export const solana = solanaNetwork;
