// src/contexts/NavigationLoadingContext.tsx
"use client";

import React, { createContext, useContext, useRef } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface NavigationLoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export const useNavigationLoading = () => {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error(
      "useNavigationLoading must be used within NavigationLoadingProvider"
    );
  }
  return context;
};

interface NavigationLoadingProviderProps {
  children: React.ReactNode;
}

export const NavigationLoadingProvider: React.FC<
  NavigationLoadingProviderProps
> = ({ children }) => {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const previousPath = useRef(pathname);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Auto-stop loading when pathname changes
  useEffect(() => {
    if (previousPath.current !== pathname) {
      setIsLoading(false);
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
        loadingTimeout.current = null;
      }
      previousPath.current = pathname;
    }
  }, [pathname]);

  const startLoading = () => {
    // Clear any existing timeout
    if (loadingTimeout.current) {
      clearTimeout(loadingTimeout.current);
    }

    setIsLoading(true);

    // Auto-stop loading after 10 seconds as a safety measure
    loadingTimeout.current = setTimeout(() => {
      setIsLoading(false);
      loadingTimeout.current = null;
    }, 10000);
  };

  const stopLoading = () => {
    setIsLoading(false);
    if (loadingTimeout.current) {
      clearTimeout(loadingTimeout.current);
      loadingTimeout.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
    };
  }, []);

  const value = {
    isLoading,
    startLoading,
    stopLoading,
  };

  return (
    <NavigationLoadingContext.Provider value={value}>
      {children}
    </NavigationLoadingContext.Provider>
  );
};
