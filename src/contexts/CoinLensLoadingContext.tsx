// src/contexts/CoinLensLoadingContext.tsx - FIXED WITH CACHE CHECK
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
import { coinlesSocketClient } from "@/services/coinlesSocketClient";

interface CoinLensLoadingContextType {
  isLoading: boolean;
  setDataReady: () => void;
  resetLoading: () => void;
}

const CoinLensLoadingContext = createContext<
  CoinLensLoadingContextType | undefined
>(undefined);

export const useCoinLensLoading = () => {
  const context = useContext(CoinLensLoadingContext);
  if (!context) {
    throw new Error(
      "useCoinLensLoading must be used within CoinLensLoadingProvider"
    );
  }
  return context;
};

export const CoinLensLoadingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // ✅ Check if we already have cached data from WebSocket
  const hasCachedData = coinlesSocketClient.isConnected();

  // ✅ Start with isLoading=false if we have cached data
  const [isLoading, setIsLoading] = useState(!hasCachedData);
  const [dataReady, setDataReadyState] = useState(hasCachedData);

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevWalletRef = useRef<string | undefined>(undefined);
  const prevChainRef = useRef<number | undefined>(undefined);

  const setDataReady = useCallback(() => {
    console.log("✅ CoinLens: Data ready");
    setDataReadyState(true);
  }, []);

  const resetLoading = useCallback(() => {
    console.log("🔄 CoinLens: Resetting loading state...");
    setIsLoading(true);
    setDataReadyState(false);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // ✅ Check for cached data on mount
  useEffect(() => {
    if (hasCachedData) {
      console.log("✅ CoinLens: Using cached WebSocket data, skipping loader");
      setIsLoading(false);
      setDataReadyState(true);
    }
  }, [hasCachedData]);

  // Hide loader when data is ready
  useEffect(() => {
    if (dataReady && isLoading) {
      console.log("✅ CoinLens: Hiding loader...");
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [dataReady, isLoading]);

  // Handle wallet/chain changes - ONLY reset if actually changed
  useEffect(() => {
    const walletChanged = prevWalletRef.current !== address;
    const chainChanged = prevChainRef.current !== chainId;

    // Only reset if wallet or chain actually changed (not just initial mount)
    if (
      (walletChanged || chainChanged) &&
      prevWalletRef.current !== undefined
    ) {
      console.log("🔄 CoinLens: Wallet or chain changed, resetting...");
      resetLoading();
    }

    prevWalletRef.current = address;
    prevChainRef.current = chainId;
  }, [address, chainId, resetLoading]);

  // Safety timeout - force hide loader after 10 seconds
  useEffect(() => {
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn("⚠️ CoinLens: Loading timeout reached, forcing show");
        setIsLoading(false);
      }, 10000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading]);

  const value = {
    isLoading,
    setDataReady,
    resetLoading,
  };

  return (
    <CoinLensLoadingContext.Provider value={value}>
      {children}
    </CoinLensLoadingContext.Provider>
  );
};
