// src/components/wallet/WalletProvider.tsx - REOWN APPKIT VERSION
"use client";

import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiAdapter, queryClient } from "@/config/appkit";

// Export chains for compatibility
export { chains } from "@/config/appkit";

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
      console.log("🔗 WalletProvider mounted successfully with Reown AppKit");
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
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
