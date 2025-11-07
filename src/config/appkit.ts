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

// ============================================
// PROJECT ID VALIDATION
// ============================================
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  console.error("❌ NEXT_PUBLIC_PROJECT_ID is missing!");
  console.error("📝 Get your project ID at: https://cloud.reown.com");
  throw new Error(
    "NEXT_PUBLIC_PROJECT_ID is required. Please add it to your .env.local file."
  );
}

console.log("✅ Project ID loaded:", projectId.slice(0, 8) + "...");

// ============================================
// QUERY CLIENT
// ============================================
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ============================================
// DAPP METADATA
// ============================================
const metadata = {
  name: "BlockPal",
  description: "Multi-chain wallet and token management platform",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://blockpal.io",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// ============================================
// NETWORKS CONFIGURATION
// ============================================
// ✅ EVM chains ONLY (for existing app compatibility)
export const chains = [mainnet, base, polygon, arbitrum, avalanche, bsc];

// ✅ All networks including Solana (for AppKit)
const allNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  ...chains,
  solana, // ✅ Using official Solana network
];

// ============================================
// ADAPTERS CONFIGURATION
// ============================================
// Wagmi Adapter for EVM chains with secure cookie storage
export const wagmiAdapter = new WagmiAdapter({
  networks: chains,
  projectId,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

// Solana Adapter for Solana network
export const solanaAdapter = new SolanaAdapter();

// ============================================
// APPKIT INITIALIZATION
// ============================================
const appKit = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks: allNetworks, // ✅ Use allNetworks here
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

// ============================================
// EXPORTS
// ============================================
// Export EVM chains for existing components (TokenSelector, etc.)
export { mainnet, base, polygon, arbitrum, avalanche, bsc };

// Export Solana separately for Solana-specific features
export { solana };

// Export all networks for components that need both
export const allChains = allNetworks;

// Export AppKit instance
export { appKit };

// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Get chain by ID (supports both numeric and string IDs)
 */
export function getChainById(chainId: number | string): AppKitNetwork | undefined {
  return allNetworks.find((chain) => {
    // Handle numeric chain IDs (EVM)
    if (typeof chainId === "number") {
      return chain.id === chainId;
    }
    // Handle string chain IDs (Solana format: "solana:5eykt4UsFv8...")
    return chain.id === chainId || chain.id === `solana:${chainId}`;
  });
}

/**
 * Check if a chain ID is Solana
 */
export function isSolanaChain(chainId: number | string): boolean {
  if (typeof chainId === "string") {
    return chainId.startsWith("solana:") || chainId === "solana";
  }
  return false;
}

/**
 * Get chain name safely
 */
export function getChainName(chainId: number | string): string {
  const chain = getChainById(chainId);
  return chain?.name || "Unknown Chain";
}

// ============================================
// DEBUG LOGGING
// ============================================
if (process.env.NODE_ENV === "development") {
  console.log("🎨 AppKit Theme: dark");
  console.log("🔗 EVM Chains (for app):", chains.map((c) => ({ id: c.id, name: c.name })));
  console.log("🔗 All Networks (for AppKit):", allNetworks.map((n) => ({ 
    id: n.id, 
    name: n.name,
    namespace: n.chainNamespace 
  })));
  console.log("✅ AppKit initialized successfully");
}