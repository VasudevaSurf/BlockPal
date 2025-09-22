// src/contexts/WalletDataContext.tsx - Shared context for wallet data loading
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAccount, useChainId } from "wagmi";
import { tokenService } from "@/services/tokenService";

interface WalletDataState {
  isInitialLoading: boolean;
  hasLoadedOnce: boolean;
  mainListValue: number;
  total24hrChange: number;
  chainName: string;
  tokenCount: number;
  presetTokenCount: number;
  hiddenTokenCount: number;
  error: string | null;
}

interface WalletDataContextType {
  walletData: WalletDataState;
  fetchWalletData: () => Promise<void>;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

const initialState: WalletDataState = {
  isInitialLoading: false,
  hasLoadedOnce: false,
  mainListValue: 0,
  total24hrChange: 0,
  chainName: "",
  tokenCount: 0,
  presetTokenCount: 0,
  hiddenTokenCount: 0,
  error: null,
};

const WalletDataContext = createContext<WalletDataContextType | null>(null);

export const useWalletData = () => {
  const context = useContext(WalletDataContext);
  if (!context) {
    throw new Error("useWalletData must be used within WalletDataProvider");
  }
  return context;
};

export function WalletDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [walletData, setWalletData] = useState<WalletDataState>(initialState);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastWalletRef = useRef<string | null>(null);
  const lastChainRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);

  // Load user preferences helper
  const loadUserPreferences = async (
    walletAddress: string,
    chainId: number
  ) => {
    try {
      const response = await fetch(
        `/api/wallet/preferences?wallet=${walletAddress}&chain=${chainId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to load preferences: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error: any) {
      console.warn("⚠️ Could not load user preferences:", error.message);
      return null;
    }
  };

  // Main fetch function
  const fetchWalletData = useCallback(async () => {
    if (!address || !chainId || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      // Only show loading skeleton on initial load
      if (!walletData.hasLoadedOnce) {
        setWalletData((prev) => ({
          ...prev,
          isInitialLoading: true,
          error: null,
        }));
      }

      console.log(`📊 Fetching wallet data for ${address} on chain ${chainId}`);

      // Fetch ALL tokens
      const response = await tokenService.getWalletTokens(
        address,
        chainId,
        true
      );

      // Load user preferences
      const userPreferences = await loadUserPreferences(address, chainId);

      // Calculate main list value
      let calculatedMainListValue = 0;
      let calculatedMainList24hrChange = 0;
      let mainListTokenCount = 0;

      response.tokens.forEach((token, index) => {
        const isPresetToken = index < response.presetTokenCount;
        const isUserAddedToken =
          userPreferences?.userAddedTokens?.includes(token.contractAddress) ||
          false;

        if (isPresetToken || isUserAddedToken) {
          calculatedMainListValue += token.value || 0;
          calculatedMainList24hrChange += token.usdChange24h || 0;
          mainListTokenCount++;
        }
      });

      // Update state with fetched data
      setWalletData({
        isInitialLoading: false,
        hasLoadedOnce: true,
        mainListValue: calculatedMainListValue,
        total24hrChange: calculatedMainList24hrChange,
        chainName: response.chainName,
        tokenCount: mainListTokenCount,
        presetTokenCount: response.presetTokenCount,
        hiddenTokenCount: response.hiddenTokenCount,
        error: null,
      });

      console.log(
        `✅ Wallet data loaded - Main List Value: ${tokenService.formatCurrency(
          calculatedMainListValue
        )}`
      );
    } catch (err: any) {
      console.error("❌ Error fetching wallet data:", err);
      setWalletData((prev) => ({
        ...prev,
        isInitialLoading: false,
        error: err.message || "Failed to load wallet data",
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [address, chainId, walletData.hasLoadedOnce]);

  // Refresh function
  const refresh = useCallback(async () => {
    if (!address || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await tokenService.refreshWalletTokens(address);
      await fetchWalletData();
    } catch (err: any) {
      console.error("❌ Error refreshing wallet data:", err);
      setWalletData((prev) => ({
        ...prev,
        error: "Failed to refresh wallet data",
      }));
    } finally {
      setIsRefreshing(false);
    }
  }, [address, isRefreshing, fetchWalletData]);

  // Handle wallet connection changes
  useEffect(() => {
    const hasWalletChanged =
      lastWalletRef.current !== address || lastChainRef.current !== chainId;

    if (isConnected && address && chainId && hasWalletChanged) {
      lastWalletRef.current = address;
      lastChainRef.current = chainId;

      // Fetch data for new wallet/chain
      fetchWalletData();
    } else if (!isConnected || !address) {
      // Reset when disconnected
      lastWalletRef.current = null;
      lastChainRef.current = null;
      setWalletData(initialState);
    }
  }, [isConnected, address, chainId, fetchWalletData]);

  return (
    <WalletDataContext.Provider
      value={{
        walletData,
        fetchWalletData,
        isRefreshing,
        refresh,
      }}
    >
      {children}
    </WalletDataContext.Provider>
  );
}
