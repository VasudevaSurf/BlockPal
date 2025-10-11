// src/contexts/DashboardLoadingContext.tsx - COMPLETELY FIXED
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface DashboardLoadingContextType {
  componentLoadingStates: {
    walletBalance: boolean;
    tokenList: boolean;
    swapSection: boolean;
  };
  setComponentLoading: (component: string, isLoading: boolean) => void;
  allComponentsLoaded: boolean;
  resetLoadingStates: () => void;
}

const DashboardLoadingContext = createContext<DashboardLoadingContextType | undefined>(undefined);

export const DashboardLoadingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [componentLoadingStates, setComponentLoadingStates] = useState({
    walletBalance: true,
    tokenList: true,
    swapSection: true,
  });

  const setComponentLoading = useCallback(
    (component: string, isLoading: boolean) => {
      console.log(`📊 ${component} loading state:`, isLoading);
      setComponentLoadingStates((prev) => ({
        ...prev,
        [component]: isLoading,
      }));
    },
    []
  );

  const allComponentsLoaded =
    !componentLoadingStates.walletBalance &&
    !componentLoadingStates.tokenList &&
    !componentLoadingStates.swapSection;

  const resetLoadingStates = useCallback(() => {
    setComponentLoadingStates({
      walletBalance: true,
      tokenList: true,
      swapSection: true,
    });
  }, []);

  console.log("🎯 Dashboard Loading States:", {
    ...componentLoadingStates,
    allLoaded: allComponentsLoaded,
  });

  return (
    <DashboardLoadingContext.Provider
      value={{
        componentLoadingStates,
        setComponentLoading,
        allComponentsLoaded,
        resetLoadingStates,
      }}
    >
      {children}
    </DashboardLoadingContext.Provider>
  );
};

export const useDashboardLoading = () => {
  const context = useContext(DashboardLoadingContext);
  if (context === undefined) {
    throw new Error(
      "useDashboardLoading must be used within a DashboardLoadingProvider"
    );
  }
  return context;
};