// src/hooks/useCoinGecko.ts - COMPLETE WITH LOCALSTORAGE CACHING
"use client";

import { useState, useEffect, useCallback } from "react";

export interface TrendingToken {
  index: number;
  name: string;
  symbol: string;
  price: string;
  change: string;
  changeType: "positive" | "negative";
  marketCap: string;
  rank: string;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  smallUrl?: string | null;
  largeUrl?: string | null;
  bgColor: string;
  icon: string;
  sparklineUrl?: string | null;
  coinId?: string | null;
}

export interface TopGainer {
  index: number;
  name: string;
  symbol: string;
  price: string;
  marketCap: string;
  change: string;
  changeType: "positive" | "negative";
  icon: string;
  bgColor: string;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  smallUrl?: string | null;
  largeUrl?: string | null;
}

export interface CoinGeckoData {
  trendingTokens: TrendingToken[];
  topGainers: TopGainer[];
  lastUpdated: string;
  timestamp?: string;
  count?: {
    trending: number;
    gainers: number;
  };
}

interface UseCoinGeckoReturn {
  data: CoinGeckoData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL_COIN ||
  "https://creative-amazement-production-7acf.up.railway.app";

// ✅ Cache configuration
const CACHE_KEY = "coingecko_trending_cache";
const CACHE_TIMESTAMP_KEY = "coingecko_trending_cache_timestamp";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// ✅ Helper: Get cached data from localStorage
const getCachedData = (): CoinGeckoData | null => {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) {
      console.log("📦 No cache found");
      return null;
    }

    const age = Date.now() - parseInt(timestamp);
    console.log(`📦 Cache age: ${Math.round(age / 1000)}s`);

    // Return cached data regardless of age (we'll refresh in background)
    const parsedData = JSON.parse(cached);
    console.log("✅ Using cached CoinGecko data");
    return parsedData;
  } catch (error) {
    console.error("❌ Error reading cache:", error);
    return null;
  }
};

// ✅ Helper: Check if cache is still valid
const isCacheValid = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;

    const age = Date.now() - parseInt(timestamp);
    const isValid = age < CACHE_DURATION;

    console.log(
      `📦 Cache valid: ${isValid} (age: ${Math.round(age / 1000)}s / ${
        CACHE_DURATION / 1000
      }s)`
    );
    return isValid;
  } catch (error) {
    return false;
  }
};

// ✅ Helper: Save data to localStorage
const setCachedData = (data: CoinGeckoData): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log("✅ CoinGecko data cached to localStorage");
  } catch (error) {
    console.error("❌ Error caching data:", error);
  }
};

export function useCoinGecko(): UseCoinGeckoReturn {
  // ✅ Initialize with cached data immediately (NO LOADING STATE!)
  const [data, setData] = useState<CoinGeckoData | null>(() => {
    const cached = getCachedData();
    if (cached) {
      console.log("🚀 INSTANT LOAD: Using cached data on mount");
    }
    return cached;
  });

  // ✅ Only show loading if we have NO cached data at all
  const [loading, setLoading] = useState(() => {
    const hasCache = getCachedData() !== null;
    console.log(
      `⏳ Initial loading state: ${
        !hasCache ? "LOADING" : "NO LOADING (has cache)"
      }`
    );
    return !hasCache;
  });

  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch function with smart loading control
  const fetchData = useCallback(
    async (showLoading: boolean = false) => {
      try {
        // Only show loading if explicitly requested (manual refresh)
        if (showLoading) {
          console.log("🔄 Showing loading indicator (manual refresh)");
          setLoading(true);
        } else {
          console.log("🔄 Background fetch (no loading indicator)");
        }

        setError(null);

        console.log("🦎 Fetching CoinGecko trending data from API...");

        const response = await fetch(`${API_BASE_URL}/api/coingecko/trending`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to fetch trending data");
        }

        console.log("✅ CoinGecko API fetch successful:", {
          trending: result.data.count?.trending || 0,
          gainers: result.data.count?.gainers || 0,
        });

        // Save to cache
        setCachedData(result.data);

        // Update state
        setData(result.data);
      } catch (err: any) {
        console.error("❌ Error fetching CoinGecko data:", err);

        let errorMessage = "Failed to fetch trending data";

        if (err.name === "AbortError") {
          errorMessage = "Request timeout - please try again";
        } else if (err.message.includes("fetch")) {
          errorMessage = "Network error - please check your connection";
        } else if (err.message) {
          errorMessage = err.message;
        }

        // ✅ Don't show error if we have cached data
        if (!data) {
          console.log("❌ Setting error (no cached data available)");
          setError(errorMessage);
        } else {
          console.log("⚠️ Fetch failed but keeping cached data visible");
        }
      } finally {
        // Always stop loading
        setLoading(false);
      }
    },
    [data]
  );

  // ✅ Initial fetch on mount
  useEffect(() => {
    const hasValidCache = isCacheValid();

    if (hasValidCache) {
      console.log("📦 Cache is valid, fetching fresh data in background...");
      // Fetch in background without showing loading
      fetchData(false);
    } else {
      console.log("🔄 Cache expired or missing, fetching with loading...");
      // Show loading only if no cache exists
      fetchData(!data);
    }
  }, []); // Run only once on mount

  // ✅ Auto-refresh every 1 hour (background only, no loading)
  useEffect(() => {
    console.log("⏰ Setting up auto-refresh: Every 1 hour");

    const interval = setInterval(() => {
      console.log("🔄 Auto-refresh triggered (1 hour interval)");
      fetchData(false); // Background refresh, no loading indicator
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      console.log("🛑 Clearing auto-refresh interval");
      clearInterval(interval);
    };
  }, [fetchData]);

  // ✅ Manual refresh (shows loading)
  const refetch = useCallback(() => {
    console.log("🔄 Manual refresh requested by user");
    fetchData(true); // Show loading for manual refresh
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

// ============================================================
// OTHER HOOKS (Optional - for separate usage)
// ============================================================

export function useTrendingTokens() {
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingTokens = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/coingecko/trending-tokens`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch trending tokens");
      }

      setTrendingTokens(result.data.trendingTokens || []);
    } catch (err: any) {
      console.error("❌ Error fetching trending tokens:", err);
      setError(err.message || "Failed to fetch trending tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingTokens();
    const interval = setInterval(fetchTrendingTokens, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTrendingTokens]);

  return { trendingTokens, loading, error, refetch: fetchTrendingTokens };
}

export function useTopGainers() {
  const [topGainers, setTopGainers] = useState<TopGainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopGainers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/coingecko/top-gainers`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch top gainers");
      }

      setTopGainers(result.data.topGainers || []);
    } catch (err: any) {
      console.error("❌ Error fetching top gainers:", err);
      setError(err.message || "Failed to fetch top gainers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopGainers();
    const interval = setInterval(fetchTopGainers, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTopGainers]);

  return { topGainers, loading, error, refetch: fetchTopGainers };
}
