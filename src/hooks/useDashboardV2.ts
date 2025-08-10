// src/hooks/useDashboardV2.ts - FIXED VERSION with proper empty wallet handling
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

const REFRESH_INTERVAL = 30000; // 30 seconds

export function useDashboardV2() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [state, setState] = useState<DashboardState>({
    tokens: [],
    totalValue: 0,
    isLoading: true, // Start with loading true
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
  const isMounted = useRef(true);

  // Initialize dashboard
  const initializeDashboard = useCallback(
    async (walletAddress: string) => {
      // Prevent duplicate initialization
      if (initializingRef.current) {
        console.log("⏳ Dashboard initialization already in progress");
        return;
      }

      initializingRef.current = true;

      // Only set loading if not already initialized
      if (!state.isInitialized) {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));
      }

      try {
        console.log("🚀 Initializing dashboard for wallet:", walletAddress);

        const response = await fetch("/api/dashboard/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to initialize dashboard");
        }

        const data = await response.json();
        console.log("📊 Dashboard API response received:", {
          tokensCount: data.tokens?.length || 0,
          totalValue: data.totalValue,
          isNewUser: data.isNewUser,
        });

        if (!isMounted.current) {
          console.log("⚠️ Component unmounted, skipping state update");
          return;
        }

        // Ensure tokens is an array
        const tokensArray = Array.isArray(data.tokens) ? data.tokens : [];

        // Map tokens to the correct format
        const formattedTokens: DashboardToken[] = tokensArray.map(
          (token: any) => ({
            contractAddress: token.contractAddress || "unknown",
            symbol: token.symbol || "UNKNOWN",
            name: token.name || "Unknown Token",
            decimals: typeof token.decimals === "number" ? token.decimals : 18,
            imageUrl: token.imageUrl || token.logoUrl || token.image || "",
            balance: typeof token.balance === "number" ? token.balance : 0,
            price: typeof token.price === "number" ? token.price : 0,
            value: typeof token.value === "number" ? token.value : 0,
            change24h:
              typeof token.change24h === "number" ? token.change24h : 0,
          })
        );

        console.log("✅ Formatted tokens:", formattedTokens.length, "tokens");

        // Update Redux store
        const reduxTokens = formattedTokens.map((token) => ({
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
        dispatch(setTotalBalance(data.totalValue || 0));

        // Update local state - CRITICAL: Set isInitialized to true even with 0 tokens
        setState({
          tokens: formattedTokens,
          totalValue: data.totalValue || 0,
          isLoading: false,
          isRefreshing: false,
          isInitialized: true, // Always set to true after successful init
          error: null,
          lastRefresh: new Date(),
          isNewUser: data.isNewUser || false,
          refreshCount: 0,
        });

        const userType = data.isNewUser ? "NEW USER" : "RETURNING USER";
        console.log(
          `✅ Dashboard initialized [${userType}]: ${
            formattedTokens.length
          } tokens, $${(data.totalValue || 0).toFixed(2)}`
        );
      } catch (error: any) {
        console.error("❌ Dashboard initialization error:", error);
        if (isMounted.current) {
          // FIXED: Even on error, if it's a new wallet with no tokens, mark as initialized
          if (
            error.message?.includes("No tokens found") ||
            error.message?.includes("empty wallet")
          ) {
            setState({
              tokens: [],
              totalValue: 0,
              isLoading: false,
              isRefreshing: false,
              isInitialized: true, // Mark as initialized even with empty wallet
              error: null,
              lastRefresh: new Date(),
              isNewUser: true,
              refreshCount: 0,
            });
            console.log("✅ Dashboard initialized with empty wallet");
          } else {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              isInitialized: false,
              error: error.message || "Failed to initialize dashboard",
            }));
          }
        }
      } finally {
        initializingRef.current = false;
      }
    },
    [dispatch, state.isInitialized]
  );

  // Refresh dashboard
  const refreshDashboard = useCallback(
    async (walletAddress: string, isAutomatic: boolean = false) => {
      // Don't refresh if not initialized
      if (!state.isInitialized) {
        console.log("⚠️ Dashboard not initialized, skipping refresh");
        return;
      }

      setState((prev) => ({ ...prev, isRefreshing: true, error: null }));

      try {
        const refreshType = isAutomatic
          ? "⏰ AUTO-REFRESH"
          : "🔄 MANUAL REFRESH";

        const response = await fetch("/api/dashboard/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // If dashboard not initialized error, reinitialize
          if (errorData.error?.includes("not initialized")) {
            console.log(
              "📊 Dashboard not initialized on server, reinitializing..."
            );
            setState((prev) => ({ ...prev, isRefreshing: false }));
            await initializeDashboard(walletAddress);
            return;
          }

          throw new Error(errorData.error || "Failed to refresh dashboard");
        }

        const data = await response.json();

        if (!isMounted.current) return;

        // Ensure tokens is an array
        const tokensArray = Array.isArray(data.tokens) ? data.tokens : [];

        // Map tokens properly
        const formattedTokens: DashboardToken[] = tokensArray.map(
          (token: any) => ({
            contractAddress: token.contractAddress || "unknown",
            symbol: token.symbol || "UNKNOWN",
            name: token.name || "Unknown Token",
            decimals: typeof token.decimals === "number" ? token.decimals : 18,
            imageUrl: token.imageUrl || token.logoUrl || token.image || "",
            balance: typeof token.balance === "number" ? token.balance : 0,
            price: typeof token.price === "number" ? token.price : 0,
            value: typeof token.value === "number" ? token.value : 0,
            change24h:
              typeof token.change24h === "number" ? token.change24h : 0,
          })
        );

        // Update Redux store
        const reduxTokens = formattedTokens.map((token) => ({
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
        dispatch(setTotalBalance(data.totalValue || 0));

        setState((prev) => ({
          ...prev,
          tokens: formattedTokens,
          totalValue: data.totalValue || 0,
          isRefreshing: false,
          lastRefresh: new Date(),
          refreshCount: prev.refreshCount + 1,
          error: null,
        }));

        console.log(
          `✅ Dashboard refreshed (#${state.refreshCount + 1}): ${
            formattedTokens.length
          } tokens, $${(data.totalValue || 0).toFixed(2)}`
        );
      } catch (error: any) {
        console.error("❌ Dashboard refresh error:", error);
        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            isRefreshing: false,
            error: error.message || "Failed to refresh dashboard",
          }));
        }
      }
    },
    [state.isInitialized, state.refreshCount, dispatch, initializeDashboard]
  );

  // Add token
  const addToken = useCallback(
    async (contractAddress: string) => {
      if (!activeWallet?.address) {
        throw new Error("No active wallet");
      }

      console.log("➕ Adding token to dashboard:", contractAddress);

      try {
        const response = await fetch("/api/dashboard/add-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractAddress,
            walletAddress: activeWallet.address,
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to add token");
        }

        // Format the new token
        const formattedToken: DashboardToken = {
          contractAddress: data.token.contractAddress,
          symbol: data.token.symbol || "UNKNOWN",
          name: data.token.name || "Unknown Token",
          decimals: data.token.decimals || 18,
          imageUrl: data.token.imageUrl || data.token.logoUrl || "",
          balance: data.token.balance || 0,
          price: data.token.price || 0,
          value: data.token.value || 0,
          change24h: data.token.change24h || 0,
        };

        // Add token to state
        setState((prev) => ({
          ...prev,
          tokens: [...prev.tokens, formattedToken],
          totalValue: prev.totalValue + formattedToken.value,
        }));

        console.log(`✅ Token added: ${data.token.symbol}`);
        return formattedToken;
      } catch (error: any) {
        console.error("❌ Error adding token:", error);
        throw error;
      }
    },
    [activeWallet]
  );

  // Remove token
  const removeToken = useCallback(
    async (contractAddress: string) => {
      if (!activeWallet?.address) {
        throw new Error("No active wallet");
      }

      console.log("➖ Removing token from dashboard:", contractAddress);

      try {
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
      } catch (error: any) {
        console.error("❌ Error removing token:", error);
        throw error;
      }
    },
    [activeWallet]
  );

  // Manual refresh
  const manualRefresh = useCallback(() => {
    if (activeWallet?.address) {
      if (!state.isInitialized) {
        console.log("🔄 Manual refresh triggered - initializing first");
        initializeDashboard(activeWallet.address);
      } else {
        refreshDashboard(activeWallet.address, false);
      }
    }
  }, [
    activeWallet,
    refreshDashboard,
    initializeDashboard,
    state.isInitialized,
  ]);

  // Handle wallet changes
  useEffect(() => {
    if (!activeWallet?.address) {
      console.log("⚠️ No active wallet");
      return;
    }

    // Check if wallet changed
    if (currentWalletRef.current !== activeWallet.address) {
      console.log("👛 Wallet changed or initial load, initializing dashboard");
      currentWalletRef.current = activeWallet.address;

      // Reset state for new wallet
      setState({
        tokens: [],
        totalValue: 0,
        isLoading: true,
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
  }, [activeWallet?.address, initializeDashboard]);

  // Setup auto-refresh
  useEffect(() => {
    if (activeWallet?.address && state.isInitialized && !state.error) {
      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up new interval
      refreshIntervalRef.current = setInterval(() => {
        if (isMounted.current && activeWallet?.address) {
          refreshDashboard(activeWallet.address, true);
        }
      }, REFRESH_INTERVAL);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [
    activeWallet?.address,
    state.isInitialized,
    state.error,
    refreshDashboard,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeWallet?.address && state.isInitialized) {
        const timeSinceLastRefresh = state.lastRefresh
          ? Date.now() - state.lastRefresh.getTime()
          : Infinity;

        if (timeSinceLastRefresh > REFRESH_INTERVAL) {
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
