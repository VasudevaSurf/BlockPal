// src/contexts/WalletDataContext.tsx - FIXED: 5 minute refresh interval
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
import { useSelector } from "react-redux";
import { RootState } from "@/store";
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

interface WalletPreferences {
  userEmail: string;
  walletAddress: string;
  chainId: number;
  userAddedTokens: string[];
  lastUpdated: string;
}

interface WalletDataContextType {
  walletData: {
    tokens: TokenBalance[];
    totalValue: number;
    mainListValue: number;
    total24hrChange: number;
    chainName: string;
    loading: boolean;
    error: string | null;
    cacheValid: boolean;
    lastUpdated: string | null;
  };
  refresh: (forceRefresh?: boolean) => Promise<void>;
  isRefreshing: boolean;
  updateTokenCategories: (preferences: WalletPreferences | null) => void;
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

export const WalletDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const authState = useSelector((state: RootState) => state.auth);

  const currentChain = chains.find((c) => c.id === chainId);

  const [walletData, setWalletData] = useState({
    tokens: [] as TokenBalance[],
    totalValue: 0,
    mainListValue: 0,
    total24hrChange: 0,
    chainName: "",
    loading: false,
    error: null as string | null,
    cacheValid: false,
    lastUpdated: null as string | null,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPreferences, setCurrentPreferences] =
    useState<WalletPreferences | null>(null);

  const prevAddressRef = useRef<string | undefined>();
  const prevChainRef = useRef<number | undefined>();
  const isInitialLoadRef = useRef(true);

  // Get user email helper
  const getUserEmail = (): string | null => {
    if (!authState?.user) return null;
    return (
      authState.user.gmail ||
      authState.user.email ||
      authState.user.emailAddress ||
      authState.user.userEmail ||
      null
    );
  };

  const userEmail = getUserEmail();

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!address || !chainId || !userEmail) {
      console.log("Cannot load preferences: missing required data");
      return null;
    }

    try {
      console.log(`Loading preferences for user: ${userEmail}`);
      const response = await fetch(
        `/api/wallet/preferences?wallet=${address}&chain=${chainId}&email=${encodeURIComponent(
          userEmail
        )}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Preferences loaded:", data.data);
        setCurrentPreferences(data.data);
        return data.data;
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
    return null;
  }, [address, chainId, userEmail]);

  // Calculate main list value based on preferences
  const calculateMainListValue = useCallback(
    (tokens: TokenBalance[], preferences: WalletPreferences | null) => {
      if (!tokens || tokens.length === 0)
        return { mainListValue: 0, total24hrChange: 0 };

      console.log("Calculating main list value with preferences:", preferences);
      console.log("User added tokens:", preferences?.userAddedTokens);

      // Identify main list tokens (preset + user-added)
      const mainListTokens = tokens.filter((token) => {
        const isPreset = token.isPreset === true;
        const isUserAdded =
          preferences?.userAddedTokens?.some(
            (addr) => addr.toLowerCase() === token.contractAddress.toLowerCase()
          ) || false;

        if (isUserAdded) {
          console.log(
            `Token ${token.symbol} (${token.contractAddress}) is user-added`
          );
        }

        return isPreset || isUserAdded;
      });

      console.log(
        `Main list has ${mainListTokens.length} tokens (from ${tokens.length} total)`
      );

      // Calculate total value for main list tokens only
      const mainListValue = mainListTokens.reduce(
        (sum, token) => sum + (token.value || 0),
        0
      );

      // Calculate 24hr change for main list tokens only
      const total24hrChange = mainListTokens.reduce(
        (sum, token) => sum + (token.usdChange24h || 0),
        0
      );

      console.log(
        `Main list value: $${mainListValue.toFixed(
          2
        )}, 24hr change: $${total24hrChange.toFixed(2)}`
      );

      return { mainListValue, total24hrChange };
    },
    []
  );

  // Update token categories based on preferences
  const updateTokenCategories = useCallback(
    (preferences: WalletPreferences | null) => {
      console.log("Updating token categories with preferences:", preferences);
      setCurrentPreferences(preferences);

      // Immediately recalculate main list value with new preferences
      setWalletData((prevData) => {
        // Update isUserAdded flag on tokens first
        const updatedTokens = prevData.tokens.map((token) => ({
          ...token,
          isUserAdded:
            preferences?.userAddedTokens?.some(
              (addr) =>
                addr.toLowerCase() === token.contractAddress.toLowerCase()
            ) || false,
        }));

        // Now calculate with updated tokens
        const { mainListValue, total24hrChange } = calculateMainListValue(
          updatedTokens,
          preferences
        );

        console.log(`Updated main list value: $${mainListValue.toFixed(2)}`);
        console.log(
          `User added tokens: ${
            preferences?.userAddedTokens?.join(", ") || "none"
          }`
        );

        return {
          ...prevData,
          tokens: updatedTokens,
          mainListValue,
          total24hrChange,
        };
      });
    },
    [calculateMainListValue]
  );

  // Fetch wallet tokens
  const fetchWalletTokens = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!address || !chainId || !isConnected) {
        console.log("Cannot fetch tokens - wallet not connected");
        setWalletData((prev) => ({
          ...prev,
          tokens: [],
          totalValue: 0,
          mainListValue: 0,
          total24hrChange: 0,
          loading: false,
          error: null,
          cacheValid: false,
        }));
        return;
      }

      console.log(`🔍 Fetching tokens for ${address} on chain ${chainId}`);

      setWalletData((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Load preferences first if not loaded
        let preferences = currentPreferences;
        if (!preferences && userEmail) {
          preferences = await loadPreferences();
        }

        // If force refresh, clear cache first
        if (forceRefresh) {
          console.log("🔄 Force refresh - clearing cache");
          await tokenService.refreshWalletTokens(address);
        }

        // Fetch tokens with showHidden=true to get all tokens
        const result = await tokenService.getWalletTokens(
          address,
          chainId,
          true
        );

        if (result) {
          // Mark tokens as preset or user-added
          const processedTokens = result.tokens.map(
            (token: any, index: number) => ({
              ...token,
              isPreset: index < (result.presetTokenCount || 0),
              isUserAdded:
                preferences?.userAddedTokens?.some(
                  (addr) =>
                    addr.toLowerCase() === token.contractAddress.toLowerCase()
                ) || false,
            })
          );

          // Calculate main list value with current preferences
          const { mainListValue, total24hrChange } = calculateMainListValue(
            processedTokens,
            preferences
          );

          setWalletData({
            tokens: processedTokens,
            totalValue: result.totalValue,
            mainListValue,
            total24hrChange,
            chainName: result.chainName || currentChain?.name || "",
            loading: false,
            error: null,
            cacheValid: true,
            lastUpdated: result.lastUpdated,
          });

          console.log(
            `✅ Fetched ${processedTokens.length} tokens successfully`
          );
          console.log(`💰 Main list value: $${mainListValue.toFixed(2)}`);
        }
      } catch (error: any) {
        console.error("❌ Error fetching tokens:", error);
        setWalletData((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to fetch tokens",
          cacheValid: false,
        }));
      }
    },
    [
      address,
      chainId,
      isConnected,
      currentChain,
      userEmail,
      loadPreferences,
      calculateMainListValue,
      currentPreferences,
    ]
  );

  // Refresh function
  const refresh = useCallback(
    async (forceRefresh: boolean = false) => {
      if (isRefreshing) {
        console.log("⏭️ Already refreshing, skipping...");
        return;
      }

      setIsRefreshing(true);

      try {
        // Reload preferences when refreshing
        if (userEmail) {
          await loadPreferences();
        }
        await fetchWalletTokens(forceRefresh);
      } finally {
        setIsRefreshing(false);
      }
    },
    [fetchWalletTokens, isRefreshing, userEmail, loadPreferences]
  );

  // Initial load and wallet/chain changes
  useEffect(() => {
    const walletChanged = prevAddressRef.current !== address;
    const chainChanged = prevChainRef.current !== chainId;

    if (walletChanged || chainChanged) {
      console.log("🔄 Wallet or chain changed, fetching new data...");
      prevAddressRef.current = address;
      prevChainRef.current = chainId;
      isInitialLoadRef.current = true;

      // Reset preferences when wallet/chain changes
      setCurrentPreferences(null);

      if (isConnected && address) {
        fetchWalletTokens(false);
      } else {
        setWalletData({
          tokens: [],
          totalValue: 0,
          mainListValue: 0,
          total24hrChange: 0,
          chainName: "",
          loading: false,
          error: null,
          cacheValid: false,
          lastUpdated: null,
        });
      }
    }
  }, [address, chainId, isConnected, fetchWalletTokens]);

  // ✅ FIXED: Auto-refresh every 5 MINUTES instead of 30 seconds
  useEffect(() => {
    if (!isConnected || !address) return;

    console.log("⏰ Setting up auto-refresh: Every 5 minutes");

    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing wallet data (5 minute interval)...");
      refresh(false);
    }, 5 * 60 * 1000); // ✅ CHANGED: 30000 → 300000 (5 minutes)

    return () => {
      console.log("🛑 Clearing auto-refresh interval");
      clearInterval(interval);
    };
  }, [isConnected, address, refresh]);

  const value = {
    walletData,
    refresh,
    isRefreshing,
    updateTokenCategories,
  };

  return (
    <WalletDataContext.Provider value={value}>
      {children}
    </WalletDataContext.Provider>
  );
};
