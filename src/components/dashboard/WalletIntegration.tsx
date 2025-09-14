// src/components/dashboard/WalletIntegration.tsx - Enhanced with persistence
"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useWalletIntegration } from "@/hooks/useWalletIntegration";

interface WalletIntegrationProps {
  children: React.ReactNode;
}

export default function WalletIntegration({
  children,
}: WalletIntegrationProps) {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  const {
    isConnected,
    isConnecting,
    address,
    chain,
    balance,
    balanceSymbol,
    isInitialized,
    walletState,
    refreshWalletData,
  } = useWalletIntegration();

  // Ensure component is mounted before accessing wallet state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Log wallet integration status
  useEffect(() => {
    if (mounted && isAuthenticated) {
      console.log("🎯 Wallet Integration Status:", {
        authenticated: isAuthenticated,
        user: user?.username,
        walletConnected: isConnected,
        address: address ? address.slice(0, 10) + "..." : null,
        network: chain?.name,
        balance: `${balance} ${balanceSymbol}`,
        initialized: isInitialized,
        storedWallets: walletState.wallets.length,
        activeWallet:
          walletState.activeWallet?.address?.slice(0, 10) + "..." || null,
        loading: walletState.loading,
      });
    }
  }, [
    mounted,
    isAuthenticated,
    user,
    isConnected,
    address,
    chain,
    balance,
    balanceSymbol,
    isInitialized,
    walletState,
  ]);

  // Show connection status for debugging
  useEffect(() => {
    if (mounted && isAuthenticated && walletState.activeWallet) {
      if (isConnected && address) {
        console.log("✅ Wallet fully integrated:", {
          storedAddress: walletState.activeWallet.address,
          connectedAddress: address,
          matches:
            walletState.activeWallet.address.toLowerCase() ===
            address.toLowerCase(),
          chain: chain?.name,
          balance: `${balance} ${balanceSymbol}`,
        });
      } else if (walletState.activeWallet && !isConnected) {
        console.log("⚠️ Wallet stored but not connected:", {
          storedWallet: walletState.activeWallet.address,
          needsReconnection: true,
        });
      }
    }
  }, [
    mounted,
    isAuthenticated,
    walletState.activeWallet,
    isConnected,
    address,
    chain,
    balance,
    balanceSymbol,
  ]);

  // Return children immediately after mounting to prevent hydration issues
  if (!mounted) {
    return <>{children}</>;
  }

  // Show loading state for wallet operations
  if (mounted && isAuthenticated && walletState.loading) {
    return (
      <div className="h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19] mx-auto mb-4"></div>
          <p className="text-white font-satoshi text-sm">
            Loading wallet data...
          </p>
          <p className="text-gray-400 font-satoshi text-xs mt-1">
            {isConnecting ? "Connecting wallet..." : "Initializing..."}
          </p>
        </div>
      </div>
    );
  }

  // Show connection prompt if user is authenticated but no stored wallet
  if (
    mounted &&
    isAuthenticated &&
    !walletState.loading &&
    walletState.wallets.length === 0 &&
    !isConnected
  ) {
    return (
      <div className="h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-black text-2xl font-bold">₿</span>
          </div>
          <h3 className="text-white text-xl font-satoshi font-semibold mb-2">
            Welcome to Blockpal, {user?.displayName || user?.name || "User"}!
          </h3>
          <p className="text-gray-400 font-satoshi text-sm mb-6">
            Connect your wallet to start managing your crypto portfolio. Your
            wallet connection will be securely saved for future visits.
          </p>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
            <p className="text-blue-400 text-xs font-satoshi">
              💡 <strong>Persistent Connection:</strong> Once connected, your
              wallet will be remembered across sessions so you don't need to
              reconnect every time.
            </p>
          </div>
          <button
            onClick={() => {
              // This will trigger the wallet connection flow
              console.log("🔗 User clicked connect wallet");
            }}
            className="px-6 py-3 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
          >
            Connect Your Wallet
          </button>
        </div>
      </div>
    );
  }

  // Show reconnection prompt if stored wallet but not currently connected
  if (
    mounted &&
    isAuthenticated &&
    walletState.activeWallet &&
    !isConnected &&
    !isConnecting
  ) {
    return (
      <div className="h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-black text-lg font-bold">⚠️</span>
          </div>
          <h3 className="text-white text-lg font-satoshi font-semibold mb-2">
            Reconnect Your Wallet
          </h3>
          <p className="text-gray-400 font-satoshi text-sm mb-4">
            We found your previously connected wallet. Please reconnect to
            continue.
          </p>
          <div className="bg-[#1A1A1A] rounded-lg p-3 mb-4 border border-[#2C2C2C]">
            <p className="text-white text-sm font-satoshi font-medium">
              {walletState.activeWallet.name}
            </p>
            <p className="text-gray-400 text-xs font-satoshi">
              {walletState.activeWallet.address}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refreshWalletData}
              className="flex-1 px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
            >
              Reconnect Wallet
            </button>
            <button
              onClick={() => {
                // Clear stored wallet and start fresh
                window.location.reload();
              }}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-satoshi font-medium hover:bg-gray-700 transition-colors"
            >
              Use Different Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show connecting state
  if (mounted && (isConnecting || (isAuthenticated && walletState.loading))) {
    return (
      <div className="h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19] mx-auto mb-4"></div>
          <p className="text-white font-satoshi">
            {isConnecting ? "Connecting to wallet..." : "Loading..."}
          </p>
          <p className="text-gray-400 font-satoshi text-sm mt-1">
            Please confirm in your wallet if prompted
          </p>
        </div>
      </div>
    );
  }

  // Render children when everything is ready
  return <>{children}</>;
}
