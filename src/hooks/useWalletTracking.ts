// src/hooks/useWalletTracking.ts - Hook to track wallet connections and token status
"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId } from "wagmi";
import { chains } from "@/components/wallet/WalletProvider";

interface TokenData {
  contractAddress: string;
  symbol: string;
  name: string;
  balance: number;
  value: number;
  price: number;
  change24h: number;
  isNative: boolean;
  isPreferred: boolean;
}

interface WalletTrackingData {
  walletAddress: string;
  chainId: number;
  chainName: string;
  totalValue: number;
  total24hrChange: number;
  tokens: TokenData[];
}

class WalletTrackingService {
  private static instance: WalletTrackingService;
  private baseURL: string;
  private isTracking: boolean = false;

  constructor() {
    this.baseURL = "/api/wallet/tracking";
  }

  static getInstance(): WalletTrackingService {
    if (!WalletTrackingService.instance) {
      WalletTrackingService.instance = new WalletTrackingService();
    }
    return WalletTrackingService.instance;
  }

  async trackWalletConnection(data: WalletTrackingData): Promise<boolean> {
    if (this.isTracking) {
      console.log("⏳ Tracking already in progress, skipping...");
      return false;
    }

    try {
      this.isTracking = true;
      console.log("📊 Tracking wallet connection:", {
        wallet: data.walletAddress.slice(0, 10) + "...",
        chain: data.chainName,
        tokens: data.tokens.length,
        value: `$${data.totalValue.toFixed(2)}`,
      });

      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Tracking failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("✅ Wallet connection tracked successfully:", {
          connectionCount: result.data.connectionCount,
          tokenCount: result.data.tokenCount,
          preferredTokens: result.data.preferredTokenCount,
          hiddenTokens: result.data.hiddenTokenCount,
          isNewWallet: result.data.isNewWallet,
        });

        // Log interesting stats for new wallets
        if (result.data.isNewWallet) {
          console.log("🎉 New wallet connected! Welcome to Blockpal!");
        }

        return true;
      } else {
        console.error("❌ Tracking failed:", result.error);
        return false;
      }
    } catch (error: any) {
      console.error("❌ Error tracking wallet connection:", error);
      return false;
    } finally {
      this.isTracking = false;
    }
  }

  async getWalletHistory(
    walletAddress: string,
    chainId?: number,
    includeTokens: boolean = false
  ): Promise<any | null> {
    try {
      const params = new URLSearchParams({
        wallet: walletAddress,
        includeTokens: includeTokens.toString(),
      });

      if (chainId) {
        params.append("chain", chainId.toString());
      }

      const response = await fetch(`${this.baseURL}?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("📝 No wallet history found");
          return null;
        }
        throw new Error(`Failed to get history: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("📊 Wallet history retrieved:", {
          totalConnections: result.data.totalConnections,
          chainsUsed: result.data.chainsUsed,
          connectionsFound: result.data.connections.length,
        });
        return result.data;
      } else {
        console.error("❌ Failed to get wallet history:", result.error);
        return null;
      }
    } catch (error: any) {
      console.error("❌ Error getting wallet history:", error);
      return null;
    }
  }
}

const walletTrackingService = WalletTrackingService.getInstance();

// Hook for tracking wallet connections
export function useWalletTracking() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const trackingDataRef = useRef<WalletTrackingData | null>(null);
  const hasTrackedRef = useRef<boolean>(false);

  // Get current chain data
  const currentChain = chains.find((c) => c.id === chainId);

  // Reset tracking flag when wallet changes
  useEffect(() => {
    hasTrackedRef.current = false;
    trackingDataRef.current = null;
  }, [address, chainId]);

  // Function to update tracking data (called from TokenList component)
  const updateTrackingData = (
    totalValue: number,
    total24hrChange: number,
    tokens: TokenData[]
  ) => {
    if (!address || !chainId || !isConnected) {
      console.log("⚠️ Cannot update tracking data - wallet not connected");
      return;
    }

    trackingDataRef.current = {
      walletAddress: address,
      chainId,
      chainName: currentChain?.name || "Unknown Chain",
      totalValue,
      total24hrChange,
      tokens,
    };

    console.log("📝 Tracking data updated:", {
      wallet: address.slice(0, 10) + "...",
      chain: currentChain?.name,
      tokens: tokens.length,
      value: `$${totalValue.toFixed(2)}`,
    });
  };

  // Function to manually trigger tracking
  const trackNow = async (): Promise<boolean> => {
    if (!trackingDataRef.current || hasTrackedRef.current) {
      console.log("⚠️ No tracking data available or already tracked");
      return false;
    }

    const success = await walletTrackingService.trackWalletConnection(
      trackingDataRef.current
    );

    if (success) {
      hasTrackedRef.current = true;
    }

    return success;
  };

  // Auto-track when data is available (with debounce)
  useEffect(() => {
    if (!trackingDataRef.current || hasTrackedRef.current) return;

    // Debounce tracking to avoid excessive calls
    const timeoutId = setTimeout(() => {
      if (trackingDataRef.current && !hasTrackedRef.current) {
        trackNow();
      }
    }, 2000); // Wait 2 seconds before tracking

    return () => clearTimeout(timeoutId);
  }, [trackingDataRef.current]);

  // Get wallet history
  const getWalletHistory = async (includeTokens: boolean = false) => {
    if (!address) return null;
    return walletTrackingService.getWalletHistory(
      address,
      chainId,
      includeTokens
    );
  };

  return {
    updateTrackingData,
    trackNow,
    getWalletHistory,
    isConnected: isConnected && !!address,
    walletAddress: address,
    chainId,
    chainName: currentChain?.name,
    hasTracked: hasTrackedRef.current,
  };
}

// Hook for wallet statistics (optional - for analytics)
export function useWalletStats() {
  const getGlobalStats = async (date?: string) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append("date", date);

      const response = await fetch(`/api/wallet/stats?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error("❌ Error getting wallet stats:", error);
      return null;
    }
  };

  const getPopularTokens = async (chainId?: number, limit: number = 10) => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });
      if (chainId) params.append("chain", chainId.toString());

      const response = await fetch(`/api/wallet/popular-tokens?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to get popular tokens: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error("❌ Error getting popular tokens:", error);
      return null;
    }
  };

  return {
    getGlobalStats,
    getPopularTokens,
  };
}
