// src/hooks/useWalletTracking.ts - ENHANCED with proper token status tracking
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
  isUserAdded?: boolean;
  isPreset?: boolean;
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
        presetTokens: data.tokens.filter((t) => t.isPreset).length,
        userAddedTokens: data.tokens.filter((t) => t.isUserAdded).length,
      });

      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          // Ensure all tokens have proper flags
          tokens: data.tokens.map((token) => ({
            ...token,
            isPreferred:
              token.isPreferred || token.isNative || token.isUserAdded || false,
            isUserAdded: token.isUserAdded || false,
            isPreset: token.isPreset || false,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Tracking failed: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.success) {
        console.log("✅ Wallet connection tracked successfully:", {
          connectionCount: result.data.connectionCount,
          tokenCount: result.data.tokenCount,
          presetTokens: result.data.presetTokenCount,
          userAddedTokens: result.data.userAddedTokenCount,
          hiddenTokens: result.data.hiddenTokenCount,
          isNewWallet: result.data.isNewWallet,
          totalValue: `$${result.data.totalValue.toFixed(2)}`,
        });

        // Log interesting insights
        if (result.data.isNewWallet) {
          console.log("🎉 New wallet detected! Welcome to Blockpal!");
        } else {
          console.log(`🔄 Connection #${result.data.connectionCount} tracked`);
        }

        if (result.data.userAddedTokens > 0) {
          console.log(
            `✨ User has customized ${result.data.userAddedTokens} tokens in main list`
          );
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to get history: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.success) {
        console.log("📊 Wallet history retrieved:", {
          totalConnections: result.data.totalConnections,
          chainsUsed: result.data.chainsUsed.length,
          connectionsFound: result.data.connections.length,
          analytics: result.data.analytics,
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

  async saveWalletPreferences(
    walletAddress: string,
    chainId: number,
    preferences: {
      userAddedTokens?: string[];
      hiddenTokens?: string[];
      tokenDisplayOrder?: string[];
    }
  ): Promise<boolean> {
    try {
      console.log("💾 Saving wallet preferences:", {
        wallet: walletAddress.slice(0, 10) + "...",
        chainId,
        userAddedCount: preferences.userAddedTokens?.length || 0,
        hiddenCount: preferences.hiddenTokens?.length || 0,
      });

      const response = await fetch("/api/wallet/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          chainId,
          ...preferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to save preferences: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.success) {
        console.log("✅ Wallet preferences saved successfully:", result.data);
        return true;
      } else {
        console.error("❌ Failed to save preferences:", result.error);
        return false;
      }
    } catch (error: any) {
      console.error("❌ Error saving wallet preferences:", error);
      return false;
    }
  }

  async updateTokenPreference(
    walletAddress: string,
    chainId: number,
    tokenAddress: string,
    action: "add_to_main" | "remove_from_main" | "hide_token" | "unhide_token"
  ): Promise<boolean> {
    try {
      console.log(
        `🔄 Updating token preference: ${action} for ${tokenAddress}`
      );

      const response = await fetch("/api/wallet/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          chainId,
          tokenAddress,
          action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to update preference: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.success) {
        console.log(
          `✅ Token preference updated: ${result.message}`,
          result.data
        );
        return true;
      } else {
        console.error("❌ Failed to update token preference:", result.error);
        return false;
      }
    } catch (error: any) {
      console.error("❌ Error updating token preference:", error);
      return false;
    }
  }

  async loadWalletPreferences(
    walletAddress: string,
    chainId: number
  ): Promise<any | null> {
    try {
      const params = new URLSearchParams({
        wallet: walletAddress,
        chain: chainId.toString(),
      });

      const response = await fetch(`/api/wallet/preferences?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("📝 No existing preferences found, will use defaults");
          return null;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to load preferences: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.success) {
        console.log("📊 Wallet preferences loaded:", {
          userAddedTokens: result.data.userAddedTokens?.length || 0,
          hiddenTokens: result.data.hiddenTokens?.length || 0,
          isNew: result.data.isNew || false,
        });
        return result.data;
      } else {
        console.error("❌ Failed to load preferences:", result.error);
        return null;
      }
    } catch (error: any) {
      console.error("❌ Error loading wallet preferences:", error);
      return null;
    }
  }
}

const walletTrackingService = WalletTrackingService.getInstance();

// Hook for tracking wallet connections with enhanced token management
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
      presetTokens: tokens.filter((t) => t.isPreset).length,
      userAddedTokens: tokens.filter((t) => t.isUserAdded).length,
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

  // Save wallet preferences
  const saveWalletPreferences = async (preferences: {
    userAddedTokens?: string[];
    hiddenTokens?: string[];
    tokenDisplayOrder?: string[];
  }) => {
    if (!address || !chainId) return false;
    return walletTrackingService.saveWalletPreferences(
      address,
      chainId,
      preferences
    );
  };

  // Update single token preference
  const updateTokenPreference = async (
    tokenAddress: string,
    action: "add_to_main" | "remove_from_main" | "hide_token" | "unhide_token"
  ) => {
    if (!address || !chainId) return false;
    return walletTrackingService.updateTokenPreference(
      address,
      chainId,
      tokenAddress,
      action
    );
  };

  // Load wallet preferences
  const loadWalletPreferences = async () => {
    if (!address || !chainId) return null;
    return walletTrackingService.loadWalletPreferences(address, chainId);
  };

  return {
    // Core tracking functions
    updateTrackingData,
    trackNow,
    getWalletHistory,

    // Preference management functions
    saveWalletPreferences,
    loadWalletPreferences,
    updateTokenPreference,

    // Wallet state
    isConnected: isConnected && !!address,
    walletAddress: address,
    chainId,
    chainName: currentChain?.name,
    hasTracked: hasTrackedRef.current,
  };
}

// Hook for wallet statistics (enhanced with new features)
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

  const getWalletAnalytics = async (walletAddress?: string) => {
    try {
      const params = new URLSearchParams();
      if (walletAddress) params.append("wallet", walletAddress);

      const response = await fetch(`/api/wallet/analytics?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error("❌ Error getting wallet analytics:", error);
      return null;
    }
  };

  return {
    getGlobalStats,
    getPopularTokens,
    getWalletAnalytics,
  };
}
