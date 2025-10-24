// src/contexts/WalletDataContext.tsx - FIXED: Use correct mainListValue
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAccount, useChainId } from "wagmi";
import { tokenService } from "@/services/tokenService";
import { chains } from "@/components/wallet/WalletProvider";

interface TokenBalance {
  id: string;
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  balanceWei: string;
  value: number;
  change24h: number;
  usdChange24h?: number;
  price: number;
  isNative: boolean;
  logoUrl?: string | null;
  isPopular?: boolean;
  possibleSpam?: boolean;
  verifiedContract?: boolean;
  isUserAdded?: boolean;
  isPreset?: boolean;
}

interface WalletData {
  mainListValue: number;
  totalValue: number; // ✅ ADDED: For reference
  total24hrChange: number;
  chainName: string;
  tokens: TokenBalance[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  cacheValid: boolean;
}

interface WalletDataContextType {
  walletData: WalletData;
  refresh: (force?: boolean) => Promise<void>;
  isRefreshing: boolean;
  clearCache: () => void;
}

const WalletDataContext = createContext<WalletDataContextType | undefined>(
  undefined
);

export const useWalletData = () => {
  const context = useContext(WalletDataContext);
  if (!context) {
    throw new Error("useWalletData must be used within WalletDataProvider");
  }
  return context;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const WalletDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);

  const [walletData, setWalletData] = useState<WalletData>({
    mainListValue: 0,
    totalValue: 0, // ✅ ADDED
    total24hrChange: 0,
    chainName: "",
    tokens: [],
    loading: true,
    error: null,
    lastUpdated: null,
    cacheValid: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const backgroundRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const fetchInProgressRef = useRef(false);
  const prevWalletRef = useRef<string | undefined>(undefined);
  const prevChainRef = useRef<number | undefined>(undefined);

  // Check if cache is still valid
  const isCacheValid = useCallback(() => {
    if (!walletData.lastUpdated) return false;
    const now = Date.now();
    return now - walletData.lastUpdated < CACHE_DURATION;
  }, [walletData.lastUpdated]);

  // Fetch wallet data
  const fetchWalletData = useCallback(
    async (
      showLoading: boolean = true,
      isBackgroundRefresh: boolean = false
    ) => {
      if (!address || !chainId || fetchInProgressRef.current) {
        return;
      }

      fetchInProgressRef.current = true;

      try {
        if (showLoading) {
          setWalletData((prev) => ({ ...prev, loading: true, error: null }));
        }

        console.log(
          `🔄 ${
            isBackgroundRefresh ? "Background" : "Active"
          } fetching wallet data...`
        );

        // Fetch tokens
        const response = await tokenService.getWalletTokens(
          address,
          chainId,
          true
        );

        const tokensWithFlags = response.tokens.map((token, index) => ({
          ...token,
          isPreset: index < response.presetTokenCount,
        }));

        // ✅ CRITICAL FIX: Use mainListValue from response, not totalValue
        console.log("🔍 WalletDataContext - Setting values:");
        console.log("   ├─ mainListValue from API:", response.mainListValue);
        console.log("   ├─ totalValue from API:", response.totalValue);
        console.log("   └─ 24hr change from API:", response.total24hrChange);

        setWalletData({
          mainListValue: response.mainListValue, // ✅ FIXED: Was response.totalValue
          totalValue: response.totalValue, // ✅ ADDED: Keep for reference
          total24hrChange: response.total24hrChange,
          chainName: response.chainName,
          tokens: tokensWithFlags,
          loading: false,
          error: null,
          lastUpdated: Date.now(),
          cacheValid: true,
        });

        console.log(
          `✅ Wallet data ${
            isBackgroundRefresh ? "background" : ""
          } fetched successfully`
        );
        console.log(
          `   ├─ Main List Value set to: $${response.mainListValue.toFixed(3)}`
        );
        console.log(
          `   ├─ Total Value (all tokens): $${response.totalValue.toFixed(3)}`
        );
        console.log(
          `   └─ Difference (hidden): $${(
            response.totalValue - response.mainListValue
          ).toFixed(3)}`
        );
      } catch (error: any) {
        console.error("❌ Error fetching wallet data:", error);
        setWalletData((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to fetch wallet data",
          cacheValid: false,
        }));
      } finally {
        fetchInProgressRef.current = false;
        if (showLoading) {
          setIsRefreshing(false);
        }
      }
    },
    [address, chainId]
  );

  // Refresh function - can be called from components
  const refresh = useCallback(
    async (force: boolean = false) => {
      if (force || !isCacheValid()) {
        setIsRefreshing(true);
        await fetchWalletData(true, false);
      } else {
        console.log("📦 Using cached data (still valid)");
      }
    },
    [fetchWalletData, isCacheValid]
  );

  // Clear cache
  const clearCache = useCallback(() => {
    console.log("🗑️ Clearing wallet data cache");
    setWalletData({
      mainListValue: 0,
      totalValue: 0,
      total24hrChange: 0,
      chainName: "",
      tokens: [],
      loading: true,
      error: null,
      lastUpdated: null,
      cacheValid: false,
    });
  }, []);

  // Initial load and wallet/chain change handling
  useEffect(() => {
    const walletChanged = prevWalletRef.current !== address;
    const chainChanged = prevChainRef.current !== chainId;

    if (walletChanged || chainChanged) {
      console.log("🔄 Wallet or chain changed, clearing cache and fetching...");
      clearCache();

      if (isConnected && address) {
        fetchWalletData(true, false);
      }

      prevWalletRef.current = address;
      prevChainRef.current = chainId;
    } else if (isConnected && address && !walletData.cacheValid) {
      // Initial load
      fetchWalletData(true, false);
    }
  }, [
    address,
    chainId,
    isConnected,
    fetchWalletData,
    clearCache,
    walletData.cacheValid,
  ]);

  // Background refresh - silently update data every 5 minutes
  useEffect(() => {
    if (isConnected && address && walletData.cacheValid) {
      console.log("🔄 Starting background refresh: Every 5 minutes");

      backgroundRefreshRef.current = setInterval(() => {
        console.log("🔄 Background refresh triggered (5 min interval)");
        fetchWalletData(false, true);
      }, BACKGROUND_REFRESH_INTERVAL);
    }

    return () => {
      if (backgroundRefreshRef.current) {
        clearInterval(backgroundRefreshRef.current);
      }
    };
  }, [isConnected, address, walletData.cacheValid, fetchWalletData]);

  // Cleanup on disconnect
  useEffect(() => {
    if (!isConnected || !address) {
      if (backgroundRefreshRef.current) {
        clearInterval(backgroundRefreshRef.current);
      }
      clearCache();
    }
  }, [isConnected, address, clearCache]);

  const value = {
    walletData,
    refresh,
    isRefreshing,
    clearCache,
  };

  return (
    <WalletDataContext.Provider value={value}>
      {children}
    </WalletDataContext.Provider>
  );
};
