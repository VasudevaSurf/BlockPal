// src/contexts/NewsFeedLoadingContext.tsx - COMPLETELY FIXED
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

interface NewsFeedLoadingContextType {
  isLoading: boolean;
  setDataReady: () => void;
  resetLoading: () => void;
}

const NewsFeedLoadingContext = createContext<
  NewsFeedLoadingContextType | undefined
>(undefined);

export const useNewsFeedLoading = () => {
  const context = useContext(NewsFeedLoadingContext);
  if (!context) {
    throw new Error(
      "useNewsFeedLoading must be used within NewsFeedLoadingProvider"
    );
  }
  return context;
};

export const NewsFeedLoadingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { address } = useAccount();
  const chainId = useChainId();

  // ✅ Check if we have cached news on initialization
  const initialCacheCheck = useRef(false);
  const [hasInitialCache, setHasInitialCache] = useState(false);

  // Check cache only once on mount
  useEffect(() => {
    if (!initialCacheCheck.current) {
      initialCacheCheck.current = true;

      try {
        const cached = sessionStorage.getItem("newsFeedCache");
        if (cached) {
          const data = JSON.parse(cached);
          const now = Date.now();
          const cacheAge = now - (data.timestamp || 0);
          const isValid = cacheAge < 5 * 60 * 1000; // 5 minutes

          if (isValid && data.news && data.news.length > 0) {
            console.log("✅ NewsFeedContext: Found valid cached news on mount");
            setHasInitialCache(true);
          }
        }
      } catch (e) {
        console.error("Error checking cache:", e);
      }
    }
  }, []);

  // ✅ Start with isLoading=false if we have cached data
  const [isLoading, setIsLoading] = useState(false);
  const [dataReady, setDataReadyState] = useState(false);

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevWalletRef = useRef<string | undefined>(undefined);
  const prevChainRef = useRef<number | undefined>(undefined);

  const setDataReady = useCallback(() => {
    console.log("✅ NewsFeed: Data ready");
    setDataReadyState(true);
  }, []);

  const resetLoading = useCallback(() => {
    console.log("🔄 NewsFeed: Resetting loading state...");
    setIsLoading(true);
    setDataReadyState(false);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // ✅ If we have initial cache, mark as ready immediately
  useEffect(() => {
    if (hasInitialCache && !dataReady) {
      console.log("✅ NewsFeedContext: Using cached data, skipping loader");
      setDataReadyState(true);
      setIsLoading(false);
    }
  }, [hasInitialCache, dataReady]);

  // Hide loader when data is ready
  useEffect(() => {
    if (dataReady && isLoading) {
      console.log("✅ NewsFeed: Hiding loader...");
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [dataReady, isLoading]);

  // Handle wallet/chain changes - ONLY reset if actually changed
  useEffect(() => {
    const walletChanged = prevWalletRef.current !== address;
    const chainChanged = prevChainRef.current !== chainId;

    // Only reset if this is not the initial mount AND something changed
    if (
      prevWalletRef.current !== undefined &&
      (walletChanged || chainChanged)
    ) {
      console.log("🔄 NewsFeed: Wallet or chain changed, resetting...");
      resetLoading();
      setHasInitialCache(false); // Clear cache flag on wallet change
    }

    prevWalletRef.current = address;
    prevChainRef.current = chainId;
  }, [address, chainId, resetLoading]);

  // Safety timeout - force hide loader after 10 seconds
  useEffect(() => {
    if (isLoading && !hasInitialCache) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn("⚠️ NewsFeed: Loading timeout reached, forcing show");
        setIsLoading(false);
      }, 10000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, hasInitialCache]);

  const value = {
    isLoading,
    setDataReady,
    resetLoading,
  };

  return (
    <NewsFeedLoadingContext.Provider value={value}>
      {children}
    </NewsFeedLoadingContext.Provider>
  );
};
