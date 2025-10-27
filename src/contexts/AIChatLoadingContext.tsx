// src/contexts/AIChatLoadingContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface AIChatLoadingContextType {
  isLoading: boolean;
  setDataReady: () => void;
  resetLoading: () => void;
}

const AIChatLoadingContext = createContext<
  AIChatLoadingContextType | undefined
>(undefined);

export const useAIChatLoading = () => {
  const context = useContext(AIChatLoadingContext);
  if (!context) {
    throw new Error(
      "useAIChatLoading must be used within AIChatLoadingProvider"
    );
  }
  return context;
};

export const AIChatLoadingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  // ✅ Check if we have cached user data
  const checkCache = useCallback(() => {
    if (typeof window === "undefined" || !user?.id) return false;
    try {
      const cached = sessionStorage.getItem(`ai_chat_init_${user.id}`);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        const cacheAge = now - (data.timestamp || 0);
        // Cache valid for 10 minutes
        return cacheAge < 10 * 60 * 1000 && data.initialized === true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [user?.id]);

  // ✅ Start with isLoading=false if we have cached initialization
  const [isLoading, setIsLoading] = useState(() => !checkCache());
  const [dataReady, setDataReadyState] = useState(() => checkCache());

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevUserRef = useRef<string | undefined>(undefined);

  const setDataReady = useCallback(() => {
    console.log("✅ AI Chat: Data ready");

    // Cache the initialization state
    if (typeof window !== "undefined" && user?.id) {
      try {
        sessionStorage.setItem(
          `ai_chat_init_${user.id}`,
          JSON.stringify({ initialized: true, timestamp: Date.now() })
        );
        console.log("💾 AI Chat: Cached initialization state");
      } catch (e) {
        console.error("❌ Failed to cache AI chat state:", e);
      }
    }

    setDataReadyState(true);
  }, [user?.id]);

  const resetLoading = useCallback(() => {
    console.log("🔄 AI Chat: Resetting loading state...");
    setIsLoading(true);
    setDataReadyState(false);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // ✅ Check cache on mount
  useEffect(() => {
    if (checkCache()) {
      console.log("✅ AI Chat Context: Using cached state, skipping loader");
      setIsLoading(false);
      setDataReadyState(true);
    }
  }, [checkCache]);

  // Hide loader when data is ready
  useEffect(() => {
    if (dataReady && isLoading) {
      console.log("✅ AI Chat: Hiding loader...");
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [dataReady, isLoading]);

  // Handle user changes - ONLY reset if user actually changed
  useEffect(() => {
    const userChanged = prevUserRef.current !== user?.id;

    if (userChanged && prevUserRef.current !== undefined) {
      console.log("🔄 AI Chat: User changed, resetting...");
      resetLoading();
    }

    prevUserRef.current = user?.id;
  }, [user?.id, resetLoading]);

  // Safety timeout - force hide loader after 10 seconds
  useEffect(() => {
    if (isLoading && !checkCache()) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn("⚠️ AI Chat: Loading timeout reached, forcing show");
        setIsLoading(false);
      }, 10000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, checkCache]);

  const value = {
    isLoading,
    setDataReady,
    resetLoading,
  };

  return (
    <AIChatLoadingContext.Provider value={value}>
      {children}
    </AIChatLoadingContext.Provider>
  );
};
