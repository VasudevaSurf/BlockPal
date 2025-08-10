// src/hooks/useDashboardV2.ts - Enhanced dashboard hook with proper workflow
import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { setTokens, setTotalBalance } from "@/store/slices/walletSlice";

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
  isNewUser: boolean;
  refreshCount: number;
}

const REFRESH_INTERVAL = 30000; // 30 seconds as specified

export function useDashboardV2() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [state, setState] = useState<DashboardState>({
    tokens: [],
    totalValue: 0,
    isLoading: false,
    isRefreshing: false,
    isInitialized: false,
    error: null,
    lastRefresh: null,
    isNewUser: false,
    refreshCount: 0,
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);
  const currentWalletRef = useRef<string | null>(null);
  const isComponentMounted = useRef(true);

  // Initialize dashboard (Phase 1 for new user, Phase 2 for returning user)
  const initializeDashboard = useCallback(
    async (walletAddress: string) => {
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

        if (!isComponentMounted.current) return;

        // Update Redux store
        const reduxTokens = data.tokens.map((token: DashboardToken) => ({
          id: token.contractAddress,
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          value: token.value,
          change24h: token.change24h,
          icon: token.imageUrl,
          price: token.price,
          contractAddress: token.contractAddress,
          decimals: token.decimals,
        }));

        dispatch(setTokens(reduxTokens));
        dispatch(setTotalBalance(data.totalValue));

        setState({
          tokens: data.tokens || [],
          totalValue: data.totalValue || 0,
          isLoading: false,
          isRefreshing: false,
          isInitialized: true,
          error: null,
          lastRefresh: new Date(),
          isNewUser: data.isNewUser,
          refreshCount: 0,
        });

        const userType = data.isNewUser ? "NEW USER" : "RETURNING USER";
        console.log(
          `✅ Dashboard initialized [${userType}]: ${
            data.tokens.length
          } tokens, $${data.totalValue.toFixed(2)}`
        );

        // API call breakdown logging
        if (data.isNewUser) {
          console.log("📊 API Calls (New User):");
          console.log("  1x Alchemy token balance call");
          console.log(
            `  ${data.metadata?.length || 0}x CoinGecko metadata calls`
          );
          console.log("  1x CoinGecko batch price call");
        } else {
          console.log("📊 API Calls (Returning User):");
          console.log("  1x Alchemy token balance call");
          console.log("  1x CoinGecko batch price call");
        }
      } catch (error) {
        console.error("❌ Dashboard initialization error:", error);
        if (isComponentMounted.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Failed to initialize dashboard",
          }));
        }
      } finally {
        initializingRef.current = false;
      }
    },
    [dispatch]
  );

  // Refresh dashboard (Automatic refresh workflow)
  const refreshDashboard = useCallback(
    async (walletAddress: string, isAutomatic: boolean = false) => {
      if (!state.isInitialized) {
        console.log("⚠️ Dashboard not initialized, skipping refresh");
        return;
      }

      setState((prev) => ({ ...prev, isRefreshing: true, error: null }));

      try {
        const refreshType = isAutomatic
          ? "⏰ AUTO-REFRESH"
          : "🔄 MANUAL REFRESH";
        console.log(`${refreshType} for wallet:`, walletAddress);

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

        if (!isComponentMounted.current) return;

        // Update Redux store
        const reduxTokens = data.tokens.map((token: DashboardToken) => ({
          id: token.contractAddress,
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          value: token.value,
          change24h: token.change24h,
          icon: token.imageUrl,
          price: token.price,
          contractAddress: token.contractAddress,
          decimals: token.decimals,
        }));

        dispatch(setTokens(reduxTokens));
        dispatch(setTotalBalance(data.totalValue));

        setState((prev) => ({
          ...prev,
          tokens: data.tokens || [],
          totalValue: data.totalValue || 0,
          isRefreshing: false,
          lastRefresh: new Date(),
          refreshCount: prev.refreshCount + 1,
        }));

        console.log(
          `✅ Dashboard refreshed (#${state.refreshCount + 1}): ${
            data.tokens.length
          } tokens, $${data.totalValue.toFixed(2)}`
        );

        // API call breakdown for refresh
        console.log("📊 API Calls (Refresh):");
        console.log("  1x Alchemy token balance call");
        console.log("  1x CoinGecko batch price call");
      } catch (error) {
        console.error("❌ Dashboard refresh error:", error);
        if (isComponentMounted.current) {
          setState((prev) => ({
            ...prev,
            isRefreshing: false,
            error: "Failed to refresh dashboard",
          }));
        }
      }
    },
    [state.isInitialized, state.refreshCount, dispatch]
  );

  // Add token to dashboard (Phase 3)
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
      console.log("📊 API Calls (Add Token):");
      console.log("  1x CoinGecko/Alchemy metadata call");
      console.log("  1x Alchemy token balance call");
      console.log("  1x CoinGecko batch price call");

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
      refreshDashboard(activeWallet.address, false);
    }
  }, [activeWallet, refreshDashboard]);

  // Setup auto-refresh (30 seconds interval)
  useEffect(() => {
    if (activeWallet?.address && state.isInitialized) {
      console.log("⏰ Setting up auto-refresh every 30 seconds");

      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up new interval
      refreshIntervalRef.current = setInterval(() => {
        if (isComponentMounted.current) {
          console.log("⏰ Auto-refresh triggered");
          refreshDashboard(activeWallet.address, true);
        }
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
          isNewUser: false,
          refreshCount: 0,
        });

        // Initialize for new wallet
        initializeDashboard(activeWallet.address);
      }
    }
  }, [activeWallet?.address, initializeDashboard]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

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
          refreshDashboard(activeWallet.address, true);
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
    isNewUser: state.isNewUser,
    refreshCount: state.refreshCount,

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
