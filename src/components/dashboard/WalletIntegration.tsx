// src/components/dashboard/WalletIntegration.tsx - HYDRATION-SAFE VERSION
"use client";

import { useEffect, useState } from "react";
import { useWalletIntegration } from "@/hooks/useWalletIntegration";

interface WalletIntegrationProps {
  children: React.ReactNode;
}

export default function WalletIntegration({
  children,
}: WalletIntegrationProps) {
  const [mounted, setMounted] = useState(false);
  const {
    isConnected,
    isConnecting,
    address,
    chain,
    balance,
    balanceSymbol,
    isInitialized,
  } = useWalletIntegration();

  // Ensure component is mounted before accessing wallet state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Log wallet state only after mounting
  useEffect(() => {
    if (mounted && isConnected && address) {
      console.log("🎯 Wallet Integration Active:", {
        address: address.slice(0, 10) + "...",
        network: chain?.name,
        balance: `${balance} ${balanceSymbol}`,
        initialized: isInitialized,
      });
    }
  }, [
    mounted,
    isConnected,
    address,
    chain,
    balance,
    balanceSymbol,
    isInitialized,
  ]);

  // Return children immediately after mounting - no loading states during hydration
  if (!mounted) {
    return <>{children}</>;
  }

  // Show connecting state only after hydration
  if (mounted && isConnecting) {
    return (
      <div className="h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19] mx-auto mb-4"></div>
          <p className="text-white font-satoshi">Connecting to wallet...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
