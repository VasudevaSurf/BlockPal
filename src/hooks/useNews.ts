// src/hooks/useNews.ts - FIXED: Load cache immediately
"use client";

import { useState, useEffect, useCallback } from "react";

export interface NewsArticle {
  news_url: string;
  image_url: string | null;
  title: string;
  text: string;
  source_name: string;
  date: string;
  sentiment: string;
  tickers: string[];
}

export interface TrendingHeadline {
  headline_id: string;
  headline: string;
  text: string;
  sentiment: string;
  date: string;
  tickers: string[];
}

interface UseNewsReturn {
  news: NewsArticle[];
  trending: TrendingHeadline[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchMore: () => void;
  search: (query: string) => void;
  clearSearch: () => void;
  searchQuery: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://creative-amazement-production-7acf.up.railway.app";

export function useNews(): UseNewsReturn {
  // ✅ Load cached news immediately on initialization
  const getCachedNews = () => {
    if (typeof window === "undefined") return [];
    try {
      const cached = sessionStorage.getItem("newsFeedCache");
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        const cacheAge = now - (data.timestamp || 0);
        if (cacheAge < 5 * 60 * 1000 && data.news) {
          console.log(
            "✅ useNews: Loading cached news on init:",
            data.news.length
          );
          return data.news;
        }
      }
    } catch (e) {
      console.error("Error loading cached news:", e);
    }
    return [];
  };

  const [news, setNews] = useState<NewsArticle[]>(() => getCachedNews());
  const [trending, setTrending] = useState<TrendingHeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchNews = useCallback(async (pageNum: number, query: string = "") => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = query
        ? `/api/news/search?q=${encodeURIComponent(
            query
          )}&page=${pageNum}&limit=20`
        : `/api/news?page=${pageNum}&limit=20`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
        throw new Error(result.message || "Failed to fetch news");
      }

      const freshNews = result.data.news;

      if (pageNum === 1) {
        console.log("📰 Setting fresh news:", freshNews.length);
        setNews(freshNews);

        // ✅ Update cache with fresh data
        try {
          sessionStorage.setItem(
            "newsFeedCache",
            JSON.stringify({
              news: freshNews,
              timestamp: Date.now(),
            })
          );
          console.log("✅ Cache updated with fresh news");
        } catch (e) {
          console.error("Error updating cache:", e);
        }
      } else {
        setNews((prev) => {
          const updated = [...prev, ...freshNews];

          // ✅ Update cache with paginated data
          try {
            sessionStorage.setItem(
              "newsFeedCache",
              JSON.stringify({
                news: updated,
                timestamp: Date.now(),
              })
            );
          } catch (e) {
            console.error("Error updating cache:", e);
          }

          return updated;
        });
      }

      setHasMore(result.data.hasMore);
    } catch (err: any) {
      console.error("❌ Error fetching news:", err);
      setError(err.message || "Failed to fetch news");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrending = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/news/trending?limit=10`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setTrending(result.data.headlines || []);
      }
    } catch (err: any) {
      console.error("❌ Error fetching trending:", err);
    }
  }, []);

  const fetchMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNews(nextPage, searchQuery);
    }
  }, [loading, hasMore, page, searchQuery, fetchNews]);

  const search = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setPage(1);
      setNews([]);
      setHasMore(true);
      fetchNews(1, query);
    },
    [fetchNews]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setPage(1);
    setNews([]);
    setHasMore(true);
    fetchNews(1, "");
  }, [fetchNews]);

  // ✅ Initial load - only fetch if no cache
  useEffect(() => {
    const hasCachedNews = news.length > 0;

    if (!hasCachedNews) {
      console.log("📰 useNews: No cache, fetching fresh news");
      fetchNews(1);
      fetchTrending();
    } else {
      console.log("📰 useNews: Using cached news, fetching in background");
      // Fetch fresh data in background without showing loading
      fetchNews(1);
      fetchTrending();
    }

    // ✅ Auto-refresh news every 5 minutes (in background)
    const newsRefreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing news in background...");
      fetchNews(1);
    }, 5 * 60 * 1000); // 5 minutes

    // Refresh trending every hour
    const trendingInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing trending headlines...");
      fetchTrending();
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      clearInterval(newsRefreshInterval);
      clearInterval(trendingInterval);
    };
  }, []); // Only run once on mount

  return {
    news,
    trending,
    loading,
    error,
    hasMore,
    fetchMore,
    search,
    clearSearch,
    searchQuery,
  };
}
