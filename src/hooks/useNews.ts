// src/hooks/useNews.ts
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://amusing-freedom-production-92a5.up.railway.app";

export function useNews(): UseNewsReturn {
  const [news, setNews] = useState<NewsArticle[]>([]);
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
        ? `/api/news/search?q=${encodeURIComponent(query)}&page=${pageNum}&limit=20`
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

      if (pageNum === 1) {
        setNews(result.data.news);
      } else {
        setNews((prev) => [...prev, ...result.data.news]);
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
      const response = await fetch(`${API_BASE_URL}/api/news/trending?limit=10`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

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

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
    setNews([]);
    setHasMore(true);
    fetchNews(1, query);
  }, [fetchNews]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setPage(1);
    setNews([]);
    setHasMore(true);
    fetchNews(1, "");
  }, [fetchNews]);

  // Initial load
  useEffect(() => {
    fetchNews(1);
    fetchTrending();

    // Refresh trending every hour
    const interval = setInterval(fetchTrending, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews, fetchTrending]);

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