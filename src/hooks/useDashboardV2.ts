// src/hooks/useDashboardV2.ts - FIXED with better error handling and retry logic
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
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function useDashboardV2() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [state, setState] = useState<DashboardState>({
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

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);
  const currentWalletRef = useRef<string | null>(null);
  const isMounted = useRef(true);
  const retryCount = useRef(0);

  // Initialize dashboard with retry logic
  const initializeDashboard = useCallback(
    async (walletAddress: string, attempt: number = 1) => {
      // Prevent duplicate initialization
      if (initializingRef.current && attempt === 1) {
        console.log("⏳ Dashboard initialization already in progress");
        return;
      }

      // Verify authentication and wallet
      if (!isAuthenticated || !walletAddress) {
        console.log("⚠️ Not authenticated or no wallet address");
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Authentication required",
        }));
        return;
      }

      if (attempt === 1) {
        initializingRef.current = true;
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));
      }

      try {
        console.log(
          `🚀 Initializing dashboard for wallet: ${walletAddress} (attempt ${attempt})`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch("/api/dashboard/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
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

        // Map tokens to the correct format with better error handling
        const formattedTokens: DashboardToken[] = tokensArray.map(
          (token: any) => {
            try {
              return {
                contractAddress: token.contractAddress || "unknown",
                symbol: token.symbol || "UNKNOWN",
                name: token.name || "Unknown Token",
                decimals:
                  typeof token.decimals === "number" ? token.decimals : 18,
                imageUrl: token.imageUrl || token.logoUrl || token.image || "",
                balance: typeof token.balance === "number" ? token.balance : 0,
                price: typeof token.price === "number" ? token.price : 0,
                value: typeof token.value === "number" ? token.value : 0,
                change24h:
                  typeof token.change24h === "number" ? token.change24h : 0,
              };
            } catch (tokenError) {
              console.warn("⚠️ Error formatting token:", token, tokenError);
              return {
                contractAddress: "error",
                symbol: "ERROR",
                name: "Error Token",
                decimals: 18,
                imageUrl: "",
                balance: 0,
                price: 0,
                value: 0,
                change24h: 0,
              };
            }
          }
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

        // Reset retry count on success
        retryCount.current = 0;

        const userType = data.isNewUser ? "NEW USER" : "RETURNING USER";
        console.log(
          `✅ Dashboard initialized [${userType}]: ${
            formattedTokens.length
          } tokens, $${(data.totalValue || 0).toFixed(2)}`
        );
      } catch (error: any) {
        console.error("❌ Dashboard initialization error:", error);

        if (!isMounted.current) {
          return;
        }

        // Handle specific error types
        if (error.name === "AbortError") {
          console.error("⏰ Dashboard initialization timed out");
        }

        // Retry logic
        if (
          attempt < MAX_RETRIES &&
          !error.message?.includes("Authentication required")
        ) {
          console.log(
            `🔄 Retrying dashboard initialization (${
              attempt + 1
            }/${MAX_RETRIES})`
          );
          setTimeout(() => {
            initializeDashboard(walletAddress, attempt + 1);
          }, RETRY_DELAY * attempt);
          return;
        }

        // Handle different error scenarios
        if (
          error.message?.includes("No tokens found") ||
          error.message?.includes("empty wallet") ||
          error.message?.includes("not initialized")
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
      } finally {
        if (attempt === 1) {
          initializingRef.current = false;
        }
      }
    },
    [dispatch, isAuthenticated]
  );

  // Refresh dashboard with retry logic
  const refreshDashboard = useCallback(
    async (
      walletAddress: string,
      isAutomatic: boolean = false,
      attempt: number = 1
    ) => {
      // Don't refresh if not initialized
      if (!state.isInitialized && !isAutomatic) {
        console.log("⚠️ Dashboard not initialized, skipping refresh");
        return;
      }

      // Verify authentication
      if (!isAuthenticated) {
        console.log("⚠️ Not authenticated, skipping refresh");
        return;
      }

      if (attempt === 1) {
        setState((prev) => ({ ...prev, isRefreshing: true, error: null }));
      }

      try {
        const refreshType = isAutomatic
          ? "⏰ AUTO-REFRESH"
          : "🔄 MANUAL REFRESH";
        console.log(`${refreshType} (attempt ${attempt})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const response = await fetch("/api/dashboard/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

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

          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted.current) return;

        // Ensure tokens is an array
        const tokensArray = Array.isArray(data.tokens) ? data.tokens : [];

        // Map tokens properly with error handling
        const formattedTokens: DashboardToken[] = tokensArray.map(
          (token: any) => {
            try {
              return {
                contractAddress: token.contractAddress || "unknown",
                symbol: token.symbol || "UNKNOWN",
                name: token.name || "Unknown Token",
                decimals:
                  typeof token.decimals === "number" ? token.decimals : 18,
                imageUrl: token.imageUrl || token.logoUrl || token.image || "",
                balance: typeof token.balance === "number" ? token.balance : 0,
                price: typeof token.price === "number" ? token.price : 0,
                value: typeof token.value === "number" ? token.value : 0,
                change24h:
                  typeof token.change24h === "number" ? token.change24h : 0,
              };
            } catch (tokenError) {
              console.warn(
                "⚠️ Error formatting token during refresh:",
                token,
                tokenError
              );
              return {
                contractAddress: "error",
                symbol: "ERROR",
                name: "Error Token",
                decimals: 18,
                imageUrl: "",
                balance: 0,
                price: 0,
                value: 0,
                change24h: 0,
              };
            }
          }
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

        // Reset retry count on success
        retryCount.current = 0;

        console.log(
          `✅ Dashboard refreshed (#${state.refreshCount + 1}): ${
            formattedTokens.length
          } tokens, $${(data.totalValue || 0).toFixed(2)}`
        );
      } catch (error: any) {
        console.error("❌ Dashboard refresh error:", error);

        if (!isMounted.current) return;

        // Handle timeout
        if (error.name === "AbortError") {
          console.error("⏰ Dashboard refresh timed out");
        }

        // Retry logic for refresh
        if (
          attempt < MAX_RETRIES &&
          isAutomatic &&
          !error.message?.includes("Authentication required")
        ) {
          console.log(
            `🔄 Retrying dashboard refresh (${attempt + 1}/${MAX_RETRIES})`
          );
          setTimeout(() => {
            refreshDashboard(walletAddress, isAutomatic, attempt + 1);
          }, RETRY_DELAY * attempt);
          return;
        }

        setState((prev) => ({
          ...prev,
          isRefreshing: false,
          error: isAutomatic
            ? null
            : error.message || "Failed to refresh dashboard",
        }));
      }
    },
    [
      state.isInitialized,
      state.refreshCount,
      dispatch,
      initializeDashboard,
      isAuthenticated,
    ]
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
    if (!activeWallet?.address || !isAuthenticated) {
      console.log("⚠️ No active wallet or not authenticated");
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
  }, [activeWallet?.address, isAuthenticated, initializeDashboard]);

  // Setup auto-refresh
  useEffect(() => {
    if (activeWallet?.address && state.isInitialized && !state.error) {
      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up new interval
      refreshIntervalRef.current = setInterval(() => {
        if (isMounted.current && activeWallet?.address && isAuthenticated) {
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
    isAuthenticated,
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
      if (
        !document.hidden &&
        activeWallet?.address &&
        state.isInitialized &&
        isAuthenticated
      ) {
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
    isAuthenticated,
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
