// src/contexts/UnifiedDashboardContext.tsx - UPDATED WITHOUT PATHNAME RESET
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

interface ComponentLoadingState {
  walletBalance: boolean;
  tokenList: boolean;
  swapSection: boolean;
  globalHeader: boolean;
}

interface ComponentDataState {
  walletBalance: boolean;
  tokenList: boolean;
  swapSection: boolean;
}

interface UnifiedDashboardContextType {
  isLoading: boolean;
  componentStates: ComponentLoadingState;
  setComponentLoaded: (component: keyof ComponentLoadingState) => void;
  setComponentDataReady: (component: keyof ComponentDataState) => void;
  resetDashboard: () => void;
  allComponentsLoaded: boolean;
}

const UnifiedDashboardContext = createContext<
  UnifiedDashboardContextType | undefined
>(undefined);

export const useUnifiedDashboard = () => {
  const context = useContext(UnifiedDashboardContext);
  if (!context) {
    throw new Error(
      "useUnifiedDashboard must be used within UnifiedDashboardProvider"
    );
  }
  return context;
};

export const UnifiedDashboardProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [componentStates, setComponentStates] = useState<ComponentLoadingState>(
    {
      walletBalance: true,
      tokenList: true,
      swapSection: true,
      globalHeader: true,
    }
  );

  const [componentDataStates, setComponentDataStates] =
    useState<ComponentDataState>({
      walletBalance: true,
      tokenList: true,
      swapSection: true,
    });

  const [isLoading, setIsLoading] = useState(true);
  const [allComponentsLoaded, setAllComponentsLoaded] = useState(false);

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevWalletRef = useRef<string | undefined>(undefined);
  const prevChainRef = useRef<number | undefined>(undefined);
  const initialLoadDoneRef = useRef(false);

  const setComponentLoaded = useCallback(
    (component: keyof ComponentLoadingState) => {
      console.log(`✅ Component mounted: ${component}`);
      setComponentStates((prev) => ({
        ...prev,
        [component]: false,
      }));
    },
    []
  );

  const setComponentDataReady = useCallback(
    (component: keyof ComponentDataState) => {
      console.log(`✅ Component data ready: ${component}`);
      setComponentDataStates((prev) => ({
        ...prev,
        [component]: false,
      }));
    },
    []
  );

  const resetDashboard = useCallback(() => {
    console.log("🔄 Resetting dashboard state...");
    setComponentStates({
      walletBalance: true,
      tokenList: true,
      swapSection: true,
      globalHeader: true,
    });
    setComponentDataStates({
      walletBalance: true,
      tokenList: true,
      swapSection: true,
    });
    setIsLoading(true);
    setAllComponentsLoaded(false);
    initialLoadDoneRef.current = false;

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Check if all components are loaded AND their data is ready
  useEffect(() => {
    const allComponentsMounted = Object.values(componentStates).every(
      (state) => state === false
    );
    const allDataReady = Object.values(componentDataStates).every(
      (state) => state === false
    );

    if (allComponentsMounted && allDataReady && isLoading) {
      console.log("✅ All components loaded with data! Hiding loader...");

      setTimeout(() => {
        setAllComponentsLoaded(true);
        setIsLoading(false);
        initialLoadDoneRef.current = true;
      }, 300);
    }
  }, [componentStates, componentDataStates, isLoading]);

  // ONLY reset on wallet/chain changes, NOT on pathname changes
  useEffect(() => {
    const walletChanged = prevWalletRef.current !== address;
    const chainChanged = prevChainRef.current !== chainId;

    if (walletChanged || chainChanged) {
      console.log("🔄 Wallet or chain changed, resetting dashboard...");
      resetDashboard();

      prevWalletRef.current = address;
      prevChainRef.current = chainId;
    }
  }, [address, chainId, resetDashboard]);

  // Safety timeout - force hide loader after 15 seconds
  useEffect(() => {
    if (isLoading && isConnected && address) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn("⚠️ Loading timeout reached, forcing components to show");
        setIsLoading(false);
        setAllComponentsLoaded(true);
        initialLoadDoneRef.current = true;
      }, 15000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, isConnected, address]);

  // If wallet disconnects, show content immediately
  useEffect(() => {
    if (!isConnected || !address) {
      console.log("🔌 Wallet disconnected, showing content immediately");
      setIsLoading(false);
      setAllComponentsLoaded(true);
      initialLoadDoneRef.current = true;
    }
  }, [isConnected, address]);

  const value = {
    isLoading,
    componentStates,
    setComponentLoaded,
    setComponentDataReady,
    resetDashboard,
    allComponentsLoaded,
  };

  return (
    <UnifiedDashboardContext.Provider value={value}>
      {children}
    </UnifiedDashboardContext.Provider>
  );
};
