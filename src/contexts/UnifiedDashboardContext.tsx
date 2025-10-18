"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';

interface ComponentLoadingState {
  walletBalance: boolean;
  tokenList: boolean;
  swapSection: boolean;
  globalHeader: boolean;
}

interface UnifiedDashboardContextType {
  // Overall loading state
  isLoading: boolean;
  
  // Individual component states
  componentStates: ComponentLoadingState;
  
  // Methods to update component states
  setComponentLoaded: (component: keyof ComponentLoadingState) => void;
  
  // Reset all states
  resetDashboard: () => void;
  
  // Check if all components are loaded
  allComponentsLoaded: boolean;
}

const UnifiedDashboardContext = createContext<UnifiedDashboardContextType | undefined>(undefined);

export const useUnifiedDashboard = () => {
  const context = useContext(UnifiedDashboardContext);
  if (!context) {
    throw new Error('useUnifiedDashboard must be used within UnifiedDashboardProvider');
  }
  return context;
};

export const UnifiedDashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [componentStates, setComponentStates] = useState<ComponentLoadingState>({
    walletBalance: true,
    tokenList: true,
    swapSection: true,
    globalHeader: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [allComponentsLoaded, setAllComponentsLoaded] = useState(false);
  
  // Timeout reference to prevent infinite loading
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track previous wallet/chain to detect changes
  const prevWalletRef = useRef<string | undefined>(undefined);
  const prevChainRef = useRef<number | undefined>(undefined);

  // Method to mark a component as loaded
  const setComponentLoaded = useCallback((component: keyof ComponentLoadingState) => {
    console.log(`✅ Component loaded: ${component}`);
    setComponentStates(prev => ({
      ...prev,
      [component]: false, // false means loaded
    }));
  }, []);

  // Reset dashboard state (when wallet changes)
  const resetDashboard = useCallback(() => {
    console.log('🔄 Resetting dashboard state...');
    setComponentStates({
      walletBalance: true,
      tokenList: true,
      swapSection: true,
      globalHeader: true,
    });
    setIsLoading(true);
    setAllComponentsLoaded(false);
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Check if all components are loaded
  useEffect(() => {
    const allLoaded = Object.values(componentStates).every(state => state === false);
    
    if (allLoaded && isLoading) {
      console.log('✅ All components loaded! Hiding loader...');
      
      // Add a small delay for smooth transition
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
      console.log('🔄 Wallet or chain changed, resetting dashboard...');
      resetDashboard();
      
      prevWalletRef.current = address;
      prevChainRef.current = chainId;
    }
  }, [address, chainId, resetDashboard]);

  // Safety timeout - force hide loader after 15 seconds
  useEffect(() => {
    if (isLoading && isConnected && address) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Loading timeout reached, forcing components to show');
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