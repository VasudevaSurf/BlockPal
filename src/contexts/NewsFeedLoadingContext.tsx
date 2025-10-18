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
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [isLoading, setIsLoading] = useState(true);
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

  // Hide loader when data is ready
  useEffect(() => {
    if (dataReady && isLoading) {
      console.log("✅ NewsFeed: Hiding loader...");
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [dataReady, isLoading]);

  // Handle wallet/chain changes
  useEffect(() => {
    const walletChanged = prevWalletRef.current !== address;
    const chainChanged = prevChainRef.current !== chainId;

    if (walletChanged || chainChanged) {
      console.log("🔄 NewsFeed: Wallet or chain changed, resetting...");
      resetLoading();

      prevWalletRef.current = address;
      prevChainRef.current = chainId;
    }
  }, [address, chainId, resetLoading]);

  // Safety timeout - force hide loader after 10 seconds
  useEffect(() => {
    if (isLoading) {
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
  }, [isLoading]);

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
