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
import { useSelector } from "react-redux"; // ✅ ADD
import { RootState } from "@/store"; // ✅ ADD
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

  const user = useSelector((state: RootState) => state.auth.user);
  const userEmail = user?.email || user?.gmail || null;

  useEffect(() => {
    console.log("📧 WalletDataContext - User Email Check:", {
      hasUser: !!user,
      email: userEmail,
      userObject: user,
    });
  }, [user, userEmail]);

  const [walletData, setWalletData] = useState<WalletData>({
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
        console.log("⏭️ Skipping fetch - already in progress or missing data");
        return;
      }

      fetchInProgressRef.current = true;

      try {
        if (showLoading) {
          setWalletData((prev) => ({ ...prev, loading: true, error: null }));
        }

        console.log("\n🔄 ═══════════════════════════════════════");
        console.log(
          `🔄 ${
            isBackgroundRefresh ? "Background" : "Active"
          } fetching wallet data...`
        );
        console.log(`   ├─ Wallet: ${address.slice(0, 10)}...`);
        console.log(`   ├─ Chain: ${chainId}`);
        console.log(`   ├─ User Email: ${userEmail || "❌ NOT AVAILABLE"}`);
        console.log(`   └─ Show Loading: ${showLoading}`);

        // ✅ CRITICAL FIX: Pass userEmail to tokenService
        const response = await tokenService.getWalletTokens(
          address,
          chainId,
          true,
          userEmail || undefined
        );

        console.log("\n📦 ═══ API RESPONSE RECEIVED ═══");
        console.log("   ├─ Total tokens in response:", response.tokens.length);
        console.log("   ├─ Preset token count:", response.presetTokenCount);
        console.log("   ├─ Hidden token count:", response.hiddenTokenCount);
        console.log("   ├─ mainListValue:", response.mainListValue);
        console.log("   ├─ totalValue:", response.totalValue);
        console.log("   └─ total24hrChange:", response.total24hrChange);

        console.log("\n📋 ═══ RAW TOKEN DATA FROM API ═══");
        response.tokens.forEach((token, index) => {
          console.log(`   ${index + 1}. ${token.symbol}:`);
          console.log(`      ├─ contractAddress: ${token.contractAddress}`);
          console.log(`      ├─ value: ${token.value.toFixed(3)}`);
          console.log(`      ├─ isPreset (from API): ${token.isPreset}`);
          console.log(`      ├─ isUserAdded (from API): ${token.isUserAdded}`);
          console.log(
            `      └─ Will be in main list: ${
              index < response.presetTokenCount ? "YES" : "NO"
            }`
          );
        });

        const tokensWithFlags = response.tokens.map((token, index) => ({
          ...token,
          isPreset: index < response.presetTokenCount,
        }));

        console.log("\n🏷️ ═══ TOKEN FLAGS ASSIGNMENT ═══");
        console.log(`   Processing ${tokensWithFlags.length} tokens:`);
        tokensWithFlags.forEach((token, index) => {
          console.log(
            `   ${index + 1}. ${token.symbol} (${token.contractAddress.slice(
              0,
              10
            )}...)`
          );
          console.log(`      ├─ isPreset: ${token.isPreset}`);
          console.log(`      ├─ isUserAdded: ${token.isUserAdded || false}`);
          console.log(`      ├─ Value: ${token.value.toFixed(3)}`);
          console.log(
            `      └─ Position: ${
              index < response.presetTokenCount ? "MAIN LIST" : "HIDDEN"
            }`
          );
        });

        const mainListTokens = tokensWithFlags.slice(
          0,
          response.presetTokenCount
        );
        const verificationMainListValue = mainListTokens.reduce(
          (sum, t) => sum + t.value,
          0
        );

        console.log("\n🔍 ═══ VERIFICATION BEFORE STATE UPDATE ═══");
        console.log(
          "   Main List Tokens (first",
          response.presetTokenCount,
          "):"
        );
        mainListTokens.forEach((token, index) => {
          console.log(
            `      ${index + 1}. ${token.symbol}: ${token.value.toFixed(3)}`
          );
        });
        console.log("   ├─ API mainListValue:", response.mainListValue);
        console.log(
          "   ├─ Calculated from tokens:",
          verificationMainListValue.toFixed(3)
        );
        console.log(
          "   └─ Match:",
          Math.abs(response.mainListValue - verificationMainListValue) < 0.01
            ? "✅ YES"
            : "❌ NO"
        );

        console.log("\n💾 ═══ SETTING STATE ═══");
        console.log("   Setting mainListValue to:", response.mainListValue);
        console.log("   Setting totalValue to:", response.totalValue);
        console.log("   Setting total24hrChange to:", response.total24hrChange);

        setWalletData({
          mainListValue: response.mainListValue,
          totalValue: response.totalValue,
          total24hrChange: response.total24hrChange,
          chainName: response.chainName,
          tokens: tokensWithFlags,
          loading: false,
          error: null,
          lastUpdated: Date.now(),
          cacheValid: true,
        });

        console.log("\n✅ ═══ STATE UPDATE COMPLETE ═══");
        console.log(
          `✅ Wallet data ${
            isBackgroundRefresh ? "background" : ""
          } fetched successfully`
        );
        console.log(
          `   ├─ Main List Value set to: ${response.mainListValue.toFixed(3)}`
        );
        console.log(
          `   ├─ Total Value (all tokens): ${response.totalValue.toFixed(3)}`
        );
        console.log(
          `   ├─ Difference (hidden): ${(
            response.totalValue - response.mainListValue
          ).toFixed(3)}`
        );
        console.log(`   └─ Tokens with flags: ${tokensWithFlags.length}`);
        console.log("═══════════════════════════════════════\n");
      } catch (error: any) {
        console.error("\n❌ ═══ ERROR FETCHING WALLET DATA ═══");
        console.error("   Error:", error.message);
        console.error("   Stack:", error.stack);
        console.error("═══════════════════════════════════════\n");

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
    [address, chainId, userEmail] // ✅ CRITICAL: Add userEmail to dependencies
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
