// src/components/dashboard/WalletIntegration.tsx - UPDATED with tracking
"use client";

import { useEffect, useState } from "react";
import { useWalletIntegration } from "@/hooks/useWalletIntegration";
import { useWalletTracking } from "@/hooks/useWalletTracking";

interface WalletIntegrationProps {
  children: React.ReactNode;
}

export default function WalletIntegration({
  children,
}: WalletIntegrationProps) {
  const [mounted, setMounted] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const {
    isConnected,
    isConnecting,
    address,
    chain,
    balance,
    balanceSymbol,
    isInitialized,
  } = useWalletIntegration();

  const { getWalletHistory, walletAddress, chainName, hasTracked } =
    useWalletTracking();

  // Ensure component is mounted before accessing wallet state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Log wallet state and show welcome message for new connections
  useEffect(() => {
    if (mounted && isConnected && address && !hasShownWelcome) {
      console.log("🎯 Wallet Integration Active:", {
        address: address.slice(0, 10) + "...",
        network: chain?.name,
        balance: `${balance} ${balanceSymbol}`,
        initialized: isInitialized,
      });

      // Check if this is a returning user
      checkWalletHistory();
      setHasShownWelcome(true);
    }
  }, [
    mounted,
    isConnected,
    address,
    chain,
    balance,
    balanceSymbol,
    isInitialized,
    hasShownWelcome,
  ]);

  const checkWalletHistory = async () => {
    if (!address || !chain?.id) return;

    try {
      const history = await getWalletHistory(false); // Don't include tokens for welcome check

      if (history && history.totalConnections > 1) {
        console.log("👋 Welcome back!", {
          totalConnections: history.totalConnections,
          chainsUsed: history.chainsUsed,
          firstConnection: new Date(
            history.firstConnection
          ).toLocaleDateString(),
          lastConnection: new Date(history.lastConnection).toLocaleDateString(),
        });

        // Show a subtle welcome back notification (optional)
        showWelcomeBackNotification(history);
      } else {
        console.log("🎉 New user detected! First time connecting this wallet.");
        showNewUserWelcome();
      }
    } catch (error) {
      console.log("📝 No wallet history found - treating as new user");
      showNewUserWelcome();
    }
  };

  const showWelcomeBackNotification = (history: any) => {
    // Optional: You can add a toast notification here
    // For now, just log the welcome back message
    console.log(
      `🔄 Connection #${history.totalConnections} - Last seen ${getTimeSince(
        history.lastConnection
      )}`
    );
  };

  const showNewUserWelcome = () => {
    // Optional: You can add a welcome modal or tour here
    console.log(
      "✨ Welcome to Blockpal! We hope you enjoy managing your crypto portfolio."
    );
  };

  const getTimeSince = (dateString: string): string => {
    const now = new Date().getTime();
    const past = new Date(dateString).getTime();
    const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));

    if (diffInHours < 1) return "less than an hour ago";
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30)
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;

    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  };

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
          <p className="text-white font-satoshi">Loading</p>
          {hasTracked && (
            <p className="text-gray-400 font-satoshi text-sm mt-2">
              Syncing your preferences...
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
