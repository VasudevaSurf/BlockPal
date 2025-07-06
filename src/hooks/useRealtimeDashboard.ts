// src/hooks/useRealtimeDashboard.ts - Hook for real-time dashboard updates
import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  updateWalletBalance,
  fetchWalletTokens,
  setTokens,
  setTotalBalance,
} from "@/store/slices/walletSlice";
import {
  realtimeDashboardService,
  DashboardData,
} from "@/lib/realtime-dashboard-service";

export interface RealtimeDashboardState {
  data: DashboardData | null;
  isMonitoring: boolean;
  lastUpdated: Date | null;
  isVisible: boolean;
  changeAmount: number;
  hasChanges: boolean;
  status: {
    isPolling: boolean;
    hasBackgroundRefresh: boolean;
    dataAge: number | null;
    retryCount: number;
  };
}

export interface RealtimeDashboardNotification {
  type:
    | "portfolio_increased"
    | "portfolio_decreased"
    | "token_count_changed"
    | "fetch_error";
  message: string;
  data?: any;
  timestamp: Date;
}

export function useRealtimeDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [dashboardState, setDashboardState] = useState<RealtimeDashboardState>({
    data: null,
    isMonitoring: false,
    lastUpdated: null,
    isVisible: true,
    changeAmount: 0,
    hasChanges: false,
    status: {
      isPolling: false,
      hasBackgroundRefresh: false,
      dataAge: null,
      retryCount: 0,
    },
  });

  const [notifications, setNotifications] = useState<
    RealtimeDashboardNotification[]
  >([]);
  const previousDataRef = useRef<DashboardData | null>(null);

  // Setup real-time service listeners
  useEffect(() => {
    const handleDashboardUpdate = (event: any) => {
      const { data, previousData, isBackground, changeAmount } = event;

      console.log("📊 Dashboard update received:", {
        totalValue: data.totalValue,
        tokenCount: data.tokens.length,
        changeAmount,
        isBackground,
      });

      // Update Redux store with new data
      dispatch(setTokens(data.tokens));
      dispatch(setTotalBalance(data.totalValue));

      // Update local state
      setDashboardState((prev) => ({
        ...prev,
        data,
        lastUpdated: data.lastUpdated,
        changeAmount: changeAmount || 0,
        hasChanges: !!changeAmount && Math.abs(changeAmount) > 0.01,
        status: realtimeDashboardService.getStatus(),
      }));

      previousDataRef.current = data;
    };

    const handlePortfolioIncrease = (event: any) => {
      const { data, increase } = event;

      addNotification({
        type: "portfolio_increased",
        message: `Portfolio increased by $${increase.toFixed(2)}! 📈`,
        data: { increase, totalValue: data.totalValue },
        timestamp: new Date(),
      });
    };

    const handlePortfolioDecrease = (event: any) => {
      const { data, decrease } = event;

      addNotification({
        type: "portfolio_decreased",
        message: `Portfolio decreased by $${decrease.toFixed(2)} 📉`,
        data: { decrease, totalValue: data.totalValue },
        timestamp: new Date(),
      });
    };

    const handleTokenCountChange = (event: any) => {
      const { data, previousCount, newCount } = event;

      const message =
        newCount > previousCount
          ? `New token detected! You now have ${newCount} tokens 🪙`
          : `Token removed. You now have ${newCount} tokens`;

      addNotification({
        type: "token_count_changed",
        message,
        data: { previousCount, newCount },
        timestamp: new Date(),
      });
    };

    const handleFetchError = (event: any) => {
      const { error, retryCount } = event;

      addNotification({
        type: "fetch_error",
        message: `Failed to update dashboard data (retry ${retryCount}/3) ⚠️`,
        data: { error: error.message },
        timestamp: new Date(),
      });
    };

    // Add event listeners
    realtimeDashboardService.on("dashboard_updated", handleDashboardUpdate);
    realtimeDashboardService.on("portfolio_increased", handlePortfolioIncrease);
    realtimeDashboardService.on("portfolio_decreased", handlePortfolioDecrease);
    realtimeDashboardService.on("token_count_changed", handleTokenCountChange);
    realtimeDashboardService.on("fetch_error", handleFetchError);

    return () => {
      // Cleanup listeners
      realtimeDashboardService.off("dashboard_updated", handleDashboardUpdate);
      realtimeDashboardService.off(
        "portfolio_increased",
        handlePortfolioIncrease
      );
      realtimeDashboardService.off(
        "portfolio_decreased",
        handlePortfolioDecrease
      );
      realtimeDashboardService.off(
        "token_count_changed",
        handleTokenCountChange
      );
      realtimeDashboardService.off("fetch_error", handleFetchError);
    };
  }, [dispatch]);

  // Start monitoring when active wallet changes
  useEffect(() => {
    if (activeWallet?.address) {
      console.log(
        "🚀 Starting real-time dashboard monitoring for:",
        activeWallet.address
      );

      realtimeDashboardService.startMonitoring(activeWallet.address);

      setDashboardState((prev) => ({
        ...prev,
        isMonitoring: true,
        status: realtimeDashboardService.getStatus(),
      }));
    } else {
      console.log("🛑 No active wallet, stopping monitoring");
      realtimeDashboardService.stopMonitoring();

      setDashboardState((prev) => ({
        ...prev,
        isMonitoring: false,
        data: null,
        lastUpdated: null,
        changeAmount: 0,
        hasChanges: false,
      }));
    }

    return () => {
      // Don't stop monitoring on unmount - let it continue in background
      // realtimeDashboardService.stopMonitoring();
    };
  }, [activeWallet?.address]);

  // Update monitoring status periodically
  useEffect(() => {
    const statusInterval = setInterval(() => {
      if (dashboardState.isMonitoring) {
        setDashboardState((prev) => ({
          ...prev,
          status: realtimeDashboardService.getStatus(),
        }));
      }
    }, 5000); // Update status every 5 seconds

    return () => clearInterval(statusInterval);
  }, [dashboardState.isMonitoring]);

  // Helper function to add notifications
  const addNotification = useCallback(
    (notification: RealtimeDashboardNotification) => {
      setNotifications((prev) => {
        const newNotifications = [notification, ...prev].slice(0, 10); // Keep last 10
        return newNotifications;
      });

      // Auto-remove notification after 10 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.timestamp !== notification.timestamp)
        );
      }, 10000);
    },
    []
  );

  // Manual refresh function
  const refreshDashboard = useCallback(async () => {
    if (!activeWallet?.address) return;

    try {
      await realtimeDashboardService.refreshDashboard();
      console.log("✅ Dashboard manually refreshed");
    } catch (error) {
      console.error("❌ Failed to manually refresh dashboard:", error);
      addNotification({
        type: "fetch_error",
        message: "Failed to refresh dashboard manually ⚠️",
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }, [activeWallet?.address, addNotification]);

  // Update configuration
  const updateConfig = useCallback((config: any) => {
    realtimeDashboardService.updateConfig(config);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get time since last update
  const getTimeSinceUpdate = useCallback(() => {
    if (!dashboardState.lastUpdated) return null;
    return Date.now() - dashboardState.lastUpdated.getTime();
  }, [dashboardState.lastUpdated]);

  // Check if data is stale (older than 2 minutes)
  const isDataStale = useCallback(() => {
    const timeSince = getTimeSinceUpdate();
    return timeSince !== null && timeSince > 120000; // 2 minutes
  }, [getTimeSinceUpdate]);

  return {
    // Dashboard state
    data: dashboardState.data,
    isMonitoring: dashboardState.isMonitoring,
    lastUpdated: dashboardState.lastUpdated,
    changeAmount: dashboardState.changeAmount,
    hasChanges: dashboardState.hasChanges,
    status: dashboardState.status,

    // Notifications
    notifications,
    clearNotifications,

    // Actions
    refreshDashboard,
    updateConfig,

    // Utilities
    getTimeSinceUpdate,
    isDataStale: isDataStale(),

    // Service status
    isActive: realtimeDashboardService.isActive(),
  };
}
