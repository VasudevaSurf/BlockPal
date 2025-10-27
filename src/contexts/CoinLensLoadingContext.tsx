// src/contexts/CoinLensLoadingContext.tsx - FIXED: Never show loader on tab switch
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

// ✅ CRITICAL: Track if we've ever loaded data in this session (persists across tab switches)
let hasLoadedOnceInSession = false;

export const CoinLensLoadingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { user } = useSelector((state: RootState) => state.auth);

  // ✅ Check cache helper
  const checkCache = useCallback(() => {
    if (typeof window === "undefined" || !user?.email) return false;
    try {
      const cached = sessionStorage.getItem(`coinlens_tokens_${user.email}`);
      if (cached) {
        const data = JSON.parse(cached);
        return Array.isArray(data) && data.length > 0;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [user?.email]);

  // ✅ FIXED: Only show loader if we've NEVER loaded AND no cache exists
  const [isLoading, setIsLoading] = useState(() => {
    const hasCache = checkCache();
    // If we have cache OR we've loaded before in this session, don't show loader
    if (hasCache || hasLoadedOnceInSession) {
      console.log(
        "⚡ CoinLens: Skipping loader - cache or previous load exists"
      );
      return false;
    }
    console.log("🔄 CoinLens: First load with no cache - showing loader");
    return true;
  });

  const [dataReady, setDataReadyState] = useState(() => {
    return checkCache() || hasLoadedOnceInSession;
  });

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevWalletRef = useRef<string | undefined>(undefined);
  const prevChainRef = useRef<number | undefined>(undefined);
  const prevUserRef = useRef<string | undefined>(undefined);

  const setDataReady = useCallback(() => {
    console.log("✅ CoinLens: Real data ready signal received");
    setDataReadyState(true);
    // Mark that we've loaded successfully at least once
    hasLoadedOnceInSession = true;
  }, []);

  const resetLoading = useCallback(() => {
    console.log("🔄 CoinLens: Reset loading");
    const hasCache = checkCache();

    // Only show loader if no cache exists
    if (!hasCache) {
      setIsLoading(true);
      setDataReadyState(false);
    } else {
      console.log("⚡ Cache exists, skipping loader on reset");
      setIsLoading(false);
      setDataReadyState(true);
    }

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, [checkCache]);

  // ✅ Hide loader when real data is ready
  useEffect(() => {
    if (dataReady && isLoading) {
      console.log("✅ CoinLens: Real data received, hiding loader");
      setTimeout(() => {
        setIsLoading(false);
      }, 200);
    }
  }, [dataReady, isLoading]);

  // ✅ Handle wallet/chain/user changes
  useEffect(() => {
    const userChanged = prevUserRef.current !== user?.email;
    const walletChanged = prevWalletRef.current !== address;
    const chainChanged = prevChainRef.current !== chainId;

    // Reset on any change (except initial mount)
    if (
      prevUserRef.current !== undefined &&
      (userChanged || walletChanged || chainChanged)
    ) {
      console.log("🔄 CoinLens: Context changed", {
        userChanged,
        walletChanged,
        chainChanged,
      });

      // Reset the session flag on user change
      if (userChanged) {
        hasLoadedOnceInSession = false;
      }

      resetLoading();
    }

    prevUserRef.current = user?.email;
    prevWalletRef.current = address;
    prevChainRef.current = chainId;
  }, [user?.email, address, chainId, resetLoading]);

  // ✅ Safety timeout - force hide loader after 10 seconds
  useEffect(() => {
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn("⚠️ CoinLens: Loading timeout reached, forcing show");
        setIsLoading(false);
        hasLoadedOnceInSession = true;
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
