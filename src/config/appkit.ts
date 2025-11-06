// src/config/appkit.ts
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import {
  mainnet,
  base,
  polygon,
  arbitrum,
  avalanche,
  bsc,
  solana,
} from "@reown/appkit/networks";
import { QueryClient } from "@tanstack/react-query";
import { cookieStorage, createStorage } from "wagmi";

// Get projectId from environment variable
const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
}

// Setup query client
export const queryClient = new QueryClient();

// Metadata for your dApp
const metadata = {
  name: "BlockPal",
  description: "Your Crypto Companion",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://blockpal.app",
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
  solana,
];

// Create Wagmi Adapter for EVM chains with cookie storage (session-based)
const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, base, polygon, arbitrum, avalanche, bsc],
  projectId,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

// Create Solana Adapter
const solanaAdapter = new SolanaAdapter();

// Create AppKit instance
createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks,
  projectId,
  metadata,
  features: {
    // Disable all extra features - only wallet connection
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
    history: false,
  },
  // Dark mode theme
  themeMode: "dark",
  allWallets: "SHOW",
});

// ✅ FIXED: Export everything in one place
export { wagmiAdapter, solanaAdapter };

// Export chains for compatibility with existing code
// ✅ IMPORTANT: Keep chain IDs as they come from @reown/appkit/networks
export const chains = [
  mainnet,
  base,
  polygon,
  arbitrum,
  avalanche,
  bsc,
  solana,
];

console.log(
  "✅ AppKit initialized with chains:",
  chains.map((c) => ({ id: c.id, name: c.name }))
);
