// src/hooks/useCoinGecko.ts - Hook to fetch CoinGecko data
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
  process.env.NEXT_PUBLIC_API_URL_COIN || "http://localhost:5002";

export function useCoinGecko(): UseCoinGeckoReturn {
  const [data, setData] = useState<CoinGeckoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🦎 Fetching CoinGecko trending data...");

      const response = await fetch(`${API_BASE_URL}/api/coingecko/trending`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000), // 15 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch trending data");
      }

      console.log("✅ CoinGecko data fetched successfully:", {
        trending: result.data.count?.trending || 0,
        gainers: result.data.count?.gainers || 0,
      });

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

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds (same as terminal app)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing CoinGecko data...");
      fetchData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchData]);

  const refetch = useCallback(() => {
    console.log("🔄 Manual refresh requested");
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

// Hook for only trending tokens (first container)
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
    const interval = setInterval(fetchTrendingTokens, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [fetchTrendingTokens]);

  return { trendingTokens, loading, error, refetch: fetchTrendingTokens };
}

// Hook for only top gainers (second container)
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
    const interval = setInterval(fetchTopGainers, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [fetchTopGainers]);

  return { topGainers, loading, error, refetch: fetchTopGainers };
}
