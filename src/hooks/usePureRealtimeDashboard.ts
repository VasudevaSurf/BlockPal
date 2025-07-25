// src/hooks/usePureRealtimeDashboard.ts - FIXED VERSION
import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  setTokens,
  setTotalBalance,
  batchUpdateFromRealtimeService,
} from "@/store/slices/walletSlice";
import {
  pureRealtimeBlockchainService,
  BlockchainData,
  BalanceChange,
} from "@/lib/pure-realtime-blockchain-service";

export interface PureRealtimeDashboardState {
  data: BlockchainData | null;
  isMonitoring: boolean;
  lastUpdated: string | null; // FIXED: Use string instead of Date
  totalValueChange: number;
  hasRecentChanges: boolean;
  recentChanges: BalanceChange[];
  status: {
    isMonitoring: boolean;
    lastBlock: number;
    changeCount: number;
    errorCount: number;
    apiCallsPerMinute: number;
    dataAge: number | null;
  };
}

export interface RealtimeNotification {
  id: string;
  type:
    | "funds_received"
    | "funds_sent"
    | "new_token"
    | "token_removed"
    | "error";
  title: string;
  message: string;
  amount?: number;
  token?: string;
  timestamp: string; // FIXED: Use string instead of Date
  isRead: boolean;
  priority: "low" | "medium" | "high";
}

export function usePureRealtimeDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [dashboardState, setDashboardState] =
    useState<PureRealtimeDashboardState>({
      data: null,
      isMonitoring: false,
      lastUpdated: null,
      totalValueChange: 0,
      hasRecentChanges: false,
      recentChanges: [],
      status: {
        isMonitoring: false,
        lastBlock: 0,
        changeCount: 0,
        errorCount: 0,
        apiCallsPerMinute: 0,
        dataAge: null,
      },
    });

  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    []
  );
  const notificationIdCounter = useRef(0);
  const previousTotalValue = useRef<number>(0);

  // Setup blockchain service listeners
  useEffect(() => {
    const handleDataLoaded = (event: any) => {
      const { data, isInitial } = event;

      console.log("📊 Blockchain data loaded:", {
        totalValue: data.totalValue.toFixed(4),
        tokenCount: data.tokens.length,
        isInitial,
        ethBalance: data.ethBalance,
      });

      // FIXED: Convert tokens to proper format for Redux
      const formattedTokens = data.tokens.map((token: any) => ({
        id:
          token.contractAddress === "native"
            ? "native-eth"
            : token.contractAddress || `${token.symbol}-${Date.now()}`,
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        value: token.value,
        price: token.price,
        change24h: token.change24h,
        logoUrl: token.logoUrl,
        contractAddress: token.contractAddress,
        decimals: token.decimals,
      }));

      // FIXED: Include ETH as a token if it has balance
      const ethBalance = parseFloat(data.ethBalance || "0");
      if (ethBalance > 0) {
        const ethToken = {
          id: "native-eth",
          symbol: "ETH",
          name: "Ethereum",
          balance: ethBalance,
          value: ethBalance * (data.ethPriceUSD || 0),
          price: data.ethPriceUSD || 0,
          change24h: 0, // You might want to get this from the API
          logoUrl:
            "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
          contractAddress: "native",
          decimals: 18,
        };

        // Check if ETH token already exists in the list
        const ethTokenExists = formattedTokens.some(
          (token: any) =>
            token.contractAddress === "native" || token.symbol === "ETH"
        );

        if (!ethTokenExists) {
          formattedTokens.unshift(ethToken); // Add ETH as first token
        }
      }

      // FIXED: Calculate total value including ETH
      const totalValue = formattedTokens.reduce(
        (sum: number, token: any) => sum + (token.value || 0),
        0
      );

      console.log("📊 Formatted tokens:", {
        count: formattedTokens.length,
        totalValue: totalValue.toFixed(4),
        ethIncluded: formattedTokens.some((t: any) => t.symbol === "ETH"),
      });

      // Update Redux store
      dispatch(
        batchUpdateFromRealtimeService({
          tokens: formattedTokens,
          totalBalance: totalValue,
          activeWalletBalance: totalValue,
          timestamp: new Date(data.lastUpdated).toISOString(), // FIXED: Convert to string
        })
      );

      // Update local state
      setDashboardState((prev) => ({
        ...prev,
        data,
        lastUpdated: data.lastUpdated.toISOString(), // FIXED: Convert to string
        totalValueChange: 0, // Reset on initial load
        hasRecentChanges: false,
        status: pureRealtimeBlockchainService.getStatus(),
      }));

      previousTotalValue.current = totalValue;
    };

    const handleDataUpdated = (event: any) => {
      const { data, previousData, changes, changeCount } = event;

      console.log("🔄 Blockchain data updated:", {
        totalValue: data.totalValue.toFixed(4),
        previousValue: previousData.totalValue.toFixed(4),
        changeCount,
        tokensCount: data.tokens.length,
      });

      // FIXED: Same token formatting as in handleDataLoaded
      const formattedTokens = data.tokens.map((token: any) => ({
        id:
          token.contractAddress === "native"
            ? "native-eth"
            : token.contractAddress || `${token.symbol}-${Date.now()}`,
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        value: token.value,
        price: token.price,
        change24h: token.change24h,
        logoUrl: token.logoUrl,
        contractAddress: token.contractAddress,
        decimals: token.decimals,
      }));

      // FIXED: Include ETH token
      const ethBalance = parseFloat(data.ethBalance || "0");
      if (ethBalance > 0) {
        const ethToken = {
          id: "native-eth",
          symbol: "ETH",
          name: "Ethereum",
          balance: ethBalance,
          value: ethBalance * (data.ethPriceUSD || 0),
          price: data.ethPriceUSD || 0,
          change24h: 0,
          logoUrl:
            "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
          contractAddress: "native",
          decimals: 18,
        };

        const ethTokenExists = formattedTokens.some(
          (token: any) =>
            token.contractAddress === "native" || token.symbol === "ETH"
        );

        if (!ethTokenExists) {
          formattedTokens.unshift(ethToken);
        }
      }

      const totalValue = formattedTokens.reduce(
        (sum: number, token: any) => sum + (token.value || 0),
        0
      );

      const valueChange = totalValue - previousTotalValue.current;

      // Update Redux store
      dispatch(
        batchUpdateFromRealtimeService({
          tokens: formattedTokens,
          totalBalance: totalValue,
          activeWalletBalance: totalValue,
          timestamp: new Date(data.lastUpdated).toISOString(), // FIXED: Convert to string
        })
      );

      // Update local state
      setDashboardState((prev) => ({
        ...prev,
        data,
        lastUpdated: data.lastUpdated.toISOString(), // FIXED: Convert to string
        totalValueChange: valueChange,
        hasRecentChanges: true,
        recentChanges: changes.slice(0, 10), // Keep last 10 changes
        status: pureRealtimeBlockchainService.getStatus(),
      }));

      previousTotalValue.current = totalValue;

      // Clear "recent changes" flag after a few seconds
      setTimeout(() => {
        setDashboardState((prev) => ({ ...prev, hasRecentChanges: false }));
      }, 5000);
    };

    const handleDataRefreshed = (event: any) => {
      const { data } = event;

      // FIXED: Same formatting for refresh
      const formattedTokens = data.tokens.map((token: any) => ({
        id:
          token.contractAddress === "native"
            ? "native-eth"
            : token.contractAddress || `${token.symbol}-${Date.now()}`,
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        value: token.value,
        price: token.price,
        change24h: token.change24h,
        logoUrl: token.logoUrl,
        contractAddress: token.contractAddress,
        decimals: token.decimals,
      }));

      // Include ETH
      const ethBalance = parseFloat(data.ethBalance || "0");
      if (ethBalance > 0) {
        const ethToken = {
          id: "native-eth",
          symbol: "ETH",
          name: "Ethereum",
          balance: ethBalance,
          value: ethBalance * (data.ethPriceUSD || 0),
          price: data.ethPriceUSD || 0,
          change24h: 0,
          logoUrl:
            "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
          contractAddress: "native",
          decimals: 18,
        };

        const ethTokenExists = formattedTokens.some(
          (token: any) =>
            token.contractAddress === "native" || token.symbol === "ETH"
        );

        if (!ethTokenExists) {
          formattedTokens.unshift(ethToken);
        }
      }

      const totalValue = formattedTokens.reduce(
        (sum: number, token: any) => sum + (token.value || 0),
        0
      );

      // Update Redux store for refresh
      dispatch(
        batchUpdateFromRealtimeService({
          tokens: formattedTokens,
          totalBalance: totalValue,
          activeWalletBalance: totalValue,
          timestamp: data.lastUpdated.toISOString(),
        })
      );

      // Update status without triggering change notifications
      setDashboardState((prev) => ({
        ...prev,
        data,
        lastUpdated: data.lastUpdated.toISOString(),
        status: pureRealtimeBlockchainService.getStatus(),
      }));
    };

    const handleFundsReceived = (event: any) => {
      const { amount, token, data } = event;

      console.log("💰 Funds received:", { amount, token });

      addNotification({
        type: "funds_received",
        title: "Funds Received! 💰",
        message: `Received ${amount.toFixed(6)} ${token}`,
        amount,
        token,
        timestamp: new Date().toISOString(), // FIXED: Convert to string
        priority: "high",
      });
    };

    const handleFundsSent = (event: any) => {
      const { amount, token, data } = event;

      console.log("📤 Funds sent:", { amount, token });

      addNotification({
        type: "funds_sent",
        title: "Funds Sent 📤",
        message: `Sent ${amount.toFixed(6)} ${token}`,
        amount,
        token,
        timestamp: new Date().toISOString(), // FIXED: Convert to string
        priority: "medium",
      });
    };

    const handleNewTokenDetected = (event: any) => {
      const { token, data } = event;

      console.log("🆕 New token detected:", token);

      addNotification({
        type: "new_token",
        title: "New Token Detected! 🆕",
        message: `${token} appeared in your wallet`,
        token,
        timestamp: new Date().toISOString(), // FIXED: Convert to string
        priority: "medium",
      });
    };

    const handleTokenRemoved = (event: any) => {
      const { token, data } = event;

      console.log("🗑️ Token removed:", token);

      addNotification({
        type: "token_removed",
        title: "Token Removed 🗑️",
        message: `${token} was removed from your wallet`,
        token,
        timestamp: new Date().toISOString(), // FIXED: Convert to string
        priority: "low",
      });
    };

    const handleScanError = (event: any) => {
      const { error, errorCount } = event;

      console.error("❌ Blockchain scan error:", error);

      if (errorCount <= 3) {
        // Only show first few errors
        addNotification({
          type: "error",
          title: "Connection Issue ⚠️",
          message: "Temporarily unable to update data",
          timestamp: new Date().toISOString(), // FIXED: Convert to string
          priority: "low",
        });
      }
    };

    const handleMonitoringStarted = (event: any) => {
      const { walletAddress } = event;

      console.log("🚀 Monitoring started for:", walletAddress);

      setDashboardState((prev) => ({
        ...prev,
        isMonitoring: true,
        status: pureRealtimeBlockchainService.getStatus(),
      }));
    };

    const handleMonitoringStopped = () => {
      console.log("🛑 Monitoring stopped");

      setDashboardState((prev) => ({
        ...prev,
        isMonitoring: false,
        data: null,
        lastUpdated: null,
        totalValueChange: 0,
        hasRecentChanges: false,
        recentChanges: [],
      }));
    };

    const handlePricesUpdated = (event: any) => {
      const { data } = event;

      console.log("💰 Token prices updated");

      // FIXED: Format tokens for price updates too
      const formattedTokens = data.tokens.map((token: any) => ({
        id:
          token.contractAddress === "native"
            ? "native-eth"
            : token.contractAddress || `${token.symbol}-${Date.now()}`,
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        value: token.value,
        price: token.price,
        change24h: token.change24h,
        logoUrl: token.logoUrl,
        contractAddress: token.contractAddress,
        decimals: token.decimals,
      }));

      // Include ETH
      const ethBalance = parseFloat(data.ethBalance || "0");
      if (ethBalance > 0) {
        const ethToken = {
          id: "native-eth",
          symbol: "ETH",
          name: "Ethereum",
          balance: ethBalance,
          value: ethBalance * (data.ethPriceUSD || 0),
          price: data.ethPriceUSD || 0,
          change24h: 0,
          logoUrl:
            "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
          contractAddress: "native",
          decimals: 18,
        };

        const ethTokenExists = formattedTokens.some(
          (token: any) =>
            token.contractAddress === "native" || token.symbol === "ETH"
        );

        if (!ethTokenExists) {
          formattedTokens.unshift(ethToken);
        }
      }

      const totalValue = formattedTokens.reduce(
        (sum: number, token: any) => sum + (token.value || 0),
        0
      );

      // Update Redux store with new prices
      dispatch(
        batchUpdateFromRealtimeService({
          tokens: formattedTokens,
          totalBalance: totalValue,
          activeWalletBalance: totalValue,
          timestamp: data.lastUpdated.toISOString(),
        })
      );

      setDashboardState((prev) => ({
        ...prev,
        data,
        lastUpdated: data.lastUpdated.toISOString(),
        status: pureRealtimeBlockchainService.getStatus(),
      }));
    };

    // Register all event listeners
    pureRealtimeBlockchainService.on("data_loaded", handleDataLoaded);
    pureRealtimeBlockchainService.on("data_updated", handleDataUpdated);
    pureRealtimeBlockchainService.on("data_refreshed", handleDataRefreshed);
    pureRealtimeBlockchainService.on("funds_received", handleFundsReceived);
    pureRealtimeBlockchainService.on("funds_sent", handleFundsSent);
    pureRealtimeBlockchainService.on(
      "new_token_detected",
      handleNewTokenDetected
    );
    pureRealtimeBlockchainService.on("token_removed", handleTokenRemoved);
    pureRealtimeBlockchainService.on("scan_error", handleScanError);
    pureRealtimeBlockchainService.on(
      "monitoring_started",
      handleMonitoringStarted
    );
    pureRealtimeBlockchainService.on(
      "monitoring_stopped",
      handleMonitoringStopped
    );
    pureRealtimeBlockchainService.on("prices_updated", handlePricesUpdated);

    return () => {
      // Cleanup listeners
      pureRealtimeBlockchainService.off("data_loaded", handleDataLoaded);
      pureRealtimeBlockchainService.off("data_updated", handleDataUpdated);
      pureRealtimeBlockchainService.off("data_refreshed", handleDataRefreshed);
      pureRealtimeBlockchainService.off("funds_received", handleFundsReceived);
      pureRealtimeBlockchainService.off("funds_sent", handleFundsSent);
      pureRealtimeBlockchainService.off(
        "new_token_detected",
        handleNewTokenDetected
      );
      pureRealtimeBlockchainService.off("token_removed", handleTokenRemoved);
      pureRealtimeBlockchainService.off("scan_error", handleScanError);
      pureRealtimeBlockchainService.off(
        "monitoring_started",
        handleMonitoringStarted
      );
      pureRealtimeBlockchainService.off(
        "monitoring_stopped",
        handleMonitoringStopped
      );
      pureRealtimeBlockchainService.off("prices_updated", handlePricesUpdated);
    };
  }, [dispatch]);

  // Start monitoring when active wallet changes
  useEffect(() => {
    if (activeWallet?.address) {
      console.log(
        "🚀 Starting pure blockchain monitoring for:",
        activeWallet.address
      );
      pureRealtimeBlockchainService.startMonitoring(activeWallet.address);
    } else {
      console.log("🛑 No active wallet, stopping monitoring");
      pureRealtimeBlockchainService.stopMonitoring();
    }

    // Don't stop monitoring on unmount - let it continue in background
    return () => {
      // pureRealtimeBlockchainService.stopMonitoring();
    };
  }, [activeWallet?.address]);

  // Update status periodically
  useEffect(() => {
    if (!dashboardState.isMonitoring) return;

    const statusInterval = setInterval(() => {
      setDashboardState((prev) => ({
        ...prev,
        status: pureRealtimeBlockchainService.getStatus(),
      }));
    }, 3000); // Update every 3 seconds

    return () => clearInterval(statusInterval);
  }, [dashboardState.isMonitoring]);

  // Helper function to add notifications
  const addNotification = useCallback(
    (notification: Omit<RealtimeNotification, "id" | "isRead">) => {
      const id = `notification-${notificationIdCounter.current++}`;
      const newNotification: RealtimeNotification = {
        ...notification,
        id,
        isRead: false,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev].slice(0, 15); // Keep last 15
        return updated;
      });

      // Auto-remove notification based on priority
      const autoRemoveTime =
        notification.priority === "high"
          ? 12000
          : notification.priority === "medium"
          ? 8000
          : 6000;

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, autoRemoveTime);
    },
    []
  );

  // Manual refresh
  const refreshDashboard = useCallback(async () => {
    if (!activeWallet?.address) return;

    try {
      console.log("🔄 Manual dashboard refresh");
      await pureRealtimeBlockchainService.forceRefresh();
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
      addNotification({
        type: "error",
        title: "Refresh Failed ❌",
        message: "Could not refresh dashboard data",
        timestamp: new Date().toISOString(),
        priority: "medium",
      });
    }
  }, [activeWallet?.address, addNotification]);

  // Update service configuration
  const updateConfig = useCallback((config: any) => {
    pureRealtimeBlockchainService.updateConfig(config);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  // Get time since last update
  const getTimeSinceUpdate = useCallback(() => {
    if (!dashboardState.lastUpdated) return null;
    const lastUpdateTime = new Date(dashboardState.lastUpdated).getTime();
    const timeSince = Date.now() - lastUpdateTime;

    if (timeSince < 1000) return "Just now";
    if (timeSince < 60000) return `${Math.floor(timeSince / 1000)}s ago`;
    if (timeSince < 3600000) return `${Math.floor(timeSince / 60000)}m ago`;
    return `${Math.floor(timeSince / 3600000)}h ago`;
  }, [dashboardState.lastUpdated]);

  // Check if data is stale
  const isDataStale = useCallback(() => {
    return (dashboardState.status.dataAge || 0) > 30000; // 30 seconds
  }, [dashboardState.status.dataAge]);

  return {
    // Pure blockchain state
    data: dashboardState.data,
    isMonitoring: dashboardState.isMonitoring,
    lastUpdated: dashboardState.lastUpdated
      ? new Date(dashboardState.lastUpdated)
      : null,
    totalValueChange: dashboardState.totalValueChange,
    hasRecentChanges: dashboardState.hasRecentChanges,
    recentChanges: dashboardState.recentChanges,
    status: dashboardState.status,

    // Notifications
    notifications,
    unreadNotificationCount: notifications.filter((n) => !n.isRead).length,
    highPriorityNotifications: notifications.filter(
      (n) => n.priority === "high" && !n.isRead
    ),

    // Actions
    refreshDashboard,
    updateConfig,
    clearNotifications,
    markNotificationAsRead,
    removeNotification,

    // Utilities
    getTimeSinceUpdate,
    isDataStale: isDataStale(),
    isConnected:
      dashboardState.isMonitoring && dashboardState.status.errorCount < 5,

    // Service status
    isActive: pureRealtimeBlockchainService.isCurrentlyMonitoring(),
    changeHistory: pureRealtimeBlockchainService.getChangeHistory(),
  };
}
