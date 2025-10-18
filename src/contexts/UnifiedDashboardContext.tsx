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
import { usePathname } from "next/navigation";

interface ComponentLoadingState {
  walletBalance: boolean;
  tokenList: boolean;
  swapSection: boolean;
  globalHeader: boolean;
}

interface UnifiedDashboardContextType {
  isLoading: boolean;
  componentStates: ComponentLoadingState;
  setComponentLoaded: (component: keyof ComponentLoadingState) => void;
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
  const pathname = usePathname();

  const [componentStates, setComponentStates] = useState<ComponentLoadingState>(
    {
      walletBalance: true,
      tokenList: true,
      swapSection: true,
      globalHeader: true,
    }
  );

  const [isLoading, setIsLoading] = useState(true);
  const [allComponentsLoaded, setAllComponentsLoaded] = useState(false);

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevWalletRef = useRef<string | undefined>(undefined);
  const prevChainRef = useRef<number | undefined>(undefined);
  const prevPathnameRef = useRef<string | undefined>(undefined);

  const setComponentLoaded = useCallback(
    (component: keyof ComponentLoadingState) => {
      console.log(`✅ Component loaded: ${component}`);
      setComponentStates((prev) => ({
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
    setIsLoading(true);
    setAllComponentsLoaded(false);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Check if all components are loaded
  useEffect(() => {
    const allLoaded = Object.values(componentStates).every(
      (state) => state === false
    );

    if (allLoaded && isLoading) {
      console.log("✅ All components loaded! Hiding loader...");

      setTimeout(() => {
        setAllComponentsLoaded(true);
        setIsLoading(false);
      }, 300);
    }
  }, [componentStates, isLoading]);

  // Handle wallet/chain changes
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

  // CRITICAL: Handle route changes - Reset when navigating to dashboard
  useEffect(() => {
    const isDashboardPage = pathname === "/dashboard";
    const pathnameChanged = prevPathnameRef.current !== pathname;

    if (pathnameChanged && isDashboardPage) {
      console.log("🔄 Navigated to dashboard, resetting loading state...");
      resetDashboard();
    }

    prevPathnameRef.current = pathname;
  }, [pathname, resetDashboard]);

  // Safety timeout - force hide loader after 15 seconds
  useEffect(() => {
    if (isLoading && isConnected && address) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn("⚠️ Loading timeout reached, forcing components to show");
        setIsLoading(false);
        setAllComponentsLoaded(true);
      }, 15000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, isConnected, address]);

  // If wallet disconnects, reset immediately
  useEffect(() => {
    if (!isConnected || !address) {
      setIsLoading(false);
      setAllComponentsLoaded(true);
    }
  }, [isConnected, address]);

  const value = {
    isLoading,
    componentStates,
    setComponentLoaded,
    resetDashboard,
    allComponentsLoaded,
  };

  return (
    <UnifiedDashboardContext.Provider value={value}>
      {children}
    </UnifiedDashboardContext.Provider>
  );
};
