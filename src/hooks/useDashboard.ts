// src/hooks/useDashboard.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface DashboardToken {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  imageUrl: string;
  balance: number;
  price: number;
  value: number;
  change24h: number;
}

interface DashboardState {
  tokens: DashboardToken[];
  totalValue: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isInitialized: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

const REFRESH_INTERVAL = 30000; // 30 seconds

export function useDashboard() {
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [state, setState] = useState<DashboardState>({
    tokens: [],
    totalValue: 0,
    isLoading: false,
    isRefreshing: false,
    isInitialized: false,
    error: null,
    lastRefresh: null,
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);
  const currentWalletRef = useRef<string | null>(null);

  // Initialize dashboard
  const initializeDashboard = useCallback(async (walletAddress: string) => {
    if (initializingRef.current) {
      console.log("⏳ Dashboard initialization already in progress");
      return;
    }

    initializingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log("🚀 Initializing dashboard for wallet:", walletAddress);

      const response = await fetch("/api/dashboard/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to initialize dashboard");
      }

      const data = await response.json();

      setState({
        tokens: data.tokens || [],
        totalValue: data.totalValue || 0,
        isLoading: false,
        isRefreshing: false,
        isInitialized: true,
        error: null,
        lastRefresh: new Date(),
      });

      console.log(
        `✅ Dashboard initialized: ${
          data.tokens.length
        } tokens, $${data.totalValue.toFixed(2)}`
      );
    } catch (error) {
      console.error("❌ Dashboard initialization error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to initialize dashboard",
      }));
    } finally {
      initializingRef.current = false;
    }
  }, []);

  // Refresh dashboard
  const refreshDashboard = useCallback(
    async (walletAddress: string) => {
      if (!state.isInitialized) {
        console.log("⚠️ Dashboard not initialized, skipping refresh");
        return;
      }

      setState((prev) => ({ ...prev, isRefreshing: true, error: null }));

      try {
        console.log("🔄 Refreshing dashboard for wallet:", walletAddress);

        const response = await fetch("/api/dashboard/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to refresh dashboard");
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          tokens: data.tokens || [],
          totalValue: data.totalValue || 0,
          isRefreshing: false,
          lastRefresh: new Date(),
        }));

        console.log(
          `✅ Dashboard refreshed: ${
            data.tokens.length
          } tokens, $${data.totalValue.toFixed(2)}`
        );
      } catch (error) {
        console.error("❌ Dashboard refresh error:", error);
        setState((prev) => ({
          ...prev,
          isRefreshing: false,
          error: "Failed to refresh dashboard",
        }));
      }
    },
    [state.isInitialized]
  );

  // Add token to dashboard
  const addToken = useCallback(
    async (contractAddress: string) => {
      if (!activeWallet?.address) {
        throw new Error("No active wallet");
      }

      console.log("➕ Adding token to dashboard:", contractAddress);

      const response = await fetch("/api/dashboard/add-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          walletAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add token");
      }

      const data = await response.json();

      // Add token to state
      setState((prev) => {
        const newTokens = [...prev.tokens, data.token];
        const newTotalValue = prev.totalValue + data.token.value;

        return {
          ...prev,
          tokens: newTokens,
          totalValue: newTotalValue,
        };
      });

      console.log(`✅ Token added: ${data.token.symbol}`);
      return data.token;
    },
    [activeWallet]
  );

  // Remove token from dashboard
  const removeToken = useCallback(
    async (contractAddress: string) => {
      if (!activeWallet?.address) {
        throw new Error("No active wallet");
      }

      console.log("➖ Removing token from dashboard:", contractAddress);

      const response = await fetch("/api/dashboard/remove-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          walletAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to remove token");
      }

      // Remove token from state
      setState((prev) => {
        const removedToken = prev.tokens.find(
          (t) => t.contractAddress === contractAddress
        );
        const newTokens = prev.tokens.filter(
          (t) => t.contractAddress !== contractAddress
        );
        const newTotalValue = prev.totalValue - (removedToken?.value || 0);

        return {
          ...prev,
          tokens: newTokens,
          totalValue: newTotalValue,
        };
      });

      console.log(`✅ Token removed`);
    },
    [activeWallet]
  );

  // Manual refresh trigger
  const manualRefresh = useCallback(() => {
    if (activeWallet?.address) {
      refreshDashboard(activeWallet.address);
    }
  }, [activeWallet, refreshDashboard]);

  // Setup auto-refresh
  useEffect(() => {
    if (activeWallet?.address && state.isInitialized) {
      console.log("⏰ Setting up auto-refresh every 30 seconds");

      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up new interval
      refreshIntervalRef.current = setInterval(() => {
        console.log("⏰ Auto-refresh triggered");
        refreshDashboard(activeWallet.address);
      }, REFRESH_INTERVAL);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [activeWallet?.address, state.isInitialized, refreshDashboard]);

  // Handle wallet changes
  useEffect(() => {
    if (activeWallet?.address) {
      // Check if wallet changed
      if (currentWalletRef.current !== activeWallet.address) {
        console.log("👛 Wallet changed, reinitializing dashboard");
        currentWalletRef.current = activeWallet.address;

        // Clear existing data
        setState({
          tokens: [],
          totalValue: 0,
          isLoading: false,
          isRefreshing: false,
          isInitialized: false,
          error: null,
          lastRefresh: null,
        });

        // Initialize for new wallet
        initializeDashboard(activeWallet.address);
      }
    }
  }, [activeWallet?.address, initializeDashboard]);

  // Handle visibility change (pause/resume refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeWallet?.address && state.isInitialized) {
        // Tab became visible - check if we need to refresh
        const timeSinceLastRefresh = state.lastRefresh
          ? Date.now() - state.lastRefresh.getTime()
          : Infinity;

        if (timeSinceLastRefresh > REFRESH_INTERVAL) {
          console.log("👁️ Tab visible - refreshing stale data");
          refreshDashboard(activeWallet.address);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    activeWallet?.address,
    state.isInitialized,
    state.lastRefresh,
    refreshDashboard,
  ]);

  // Calculate portfolio statistics
  const getPortfolioStats = useCallback(() => {
    const totalChange24h = state.tokens.reduce((sum, token) => {
      return sum + token.value * (token.change24h / 100);
    }, 0);

    const topGainers = [...state.tokens]
      .filter((t) => t.change24h > 0)
      .sort((a, b) => b.change24h - a.change24h)
      .slice(0, 3);

    const topLosers = [...state.tokens]
      .filter((t) => t.change24h < 0)
      .sort((a, b) => a.change24h - b.change24h)
      .slice(0, 3);

    return {
      totalChange24h,
      totalChangePercentage:
        state.totalValue > 0 ? (totalChange24h / state.totalValue) * 100 : 0,
      topGainers,
      topLosers,
      tokenCount: state.tokens.length,
    };
  }, [state.tokens, state.totalValue]);

  return {
    // State
    tokens: state.tokens,
    totalValue: state.totalValue,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    isInitialized: state.isInitialized,
    error: state.error,
    lastRefresh: state.lastRefresh,

    // Actions
    addToken,
    removeToken,
    manualRefresh,

    // Stats
    portfolioStats: getPortfolioStats(),

    // Wallet info
    activeWallet: activeWallet?.address,
  };
}
