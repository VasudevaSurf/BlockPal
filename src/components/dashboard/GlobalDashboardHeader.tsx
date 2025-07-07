// src/components/dashboard/GlobalDashboardHeader.tsx - UPDATED WITH UNIFIED NOTIFICATIONS
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Radio,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  X,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus, logoutUser } from "@/store/slices/authSlice";
import {
  fetchWallets,
  setActiveWallet,
  setActiveWalletInDB,
  getActiveWalletFromDB,
} from "@/store/slices/walletSlice";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import RealtimeWalletSwitcher from "@/components/wallet/RealtimeWalletSwitcher";
import NotificationPanel from "@/components/notifications/NotificationPanel";

interface GlobalDashboardHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // For page-specific content
}

// Page title mapping based on pathname
const getPageTitle = (
  pathname: string
): { title: string; subtitle?: string } => {
  switch (pathname) {
    case "/dashboard":
      return {
        title: "Dashboard",
        subtitle: "Welcome back to your crypto portfolio",
      };
    case "/dashboard/scheduled-payments":
      return {
        title: "Scheduled Payments",
        subtitle:
          "Automated payments with smart contract security and automatic tax handling",
      };
    case "/dashboard/batch-payments":
      return {
        title: "Batch Payments",
        subtitle: "Send multiple payments efficiently in a single transaction",
      };
    case "/dashboard/ai-chat":
      return {
        title: "🤖 AI Chat Assistant",
        subtitle: "Powered by GoPlus Security & CoinGecko APIs",
      };
    case "/dashboard/friends":
      return {
        title: "Friends",
        subtitle: "Connect with friends and request funds",
      };
    case "/dashboard/profile":
      return {
        title: "👤 User Profile",
        subtitle: "Manage your account settings and preferences",
      };
    default:
      if (pathname.startsWith("/dashboard/token/")) {
        return {
          title: "📊 TOKEN INFORMATION",
          subtitle: "Detailed token analysis and portfolio insights",
        };
      }
      return {
        title: "Dashboard",
        subtitle: "Welcome back",
      };
  }
};

export default function GlobalDashboardHeader({
  title: propTitle,
  subtitle: propSubtitle,
  children,
}: GlobalDashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isAuthenticated,
    loading: authLoading,
    user,
  } = useSelector((state: RootState) => state.auth);
  const {
    wallets,
    activeWallet,
    loading: walletLoading,
  } = useSelector((state: RootState) => state.wallet);
  const dispatch = useDispatch<AppDispatch>();

  // Real-time dashboard hook
  const {
    data: realtimeData,
    isMonitoring,
    lastUpdated,
    changeAmount,
    hasChanges,
    notifications: realtimeNotifications = [], // Real-time notifications
    refreshDashboard,
    status,
    isDataStale,
    getTimeSinceUpdate,
  } = useRealtimeDashboard();

  // Wallet switcher state
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);
  const [showRealtimeStatus, setShowRealtimeStatus] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState<number>(0);

  // Database notifications state
  const [databaseNotifications, setDatabaseNotifications] = useState<any[]>([]);
  const [dbNotificationsLoading, setDbNotificationsLoading] = useState(false);

  // Use refs to track if we've already made initial calls
  const authChecked = useRef(false);
  const walletsLoaded = useRef(false);
  const activeWalletSynced = useRef(false);
  const notificationsFetched = useRef(false);

  // Calculate countdown to next update
  useEffect(() => {
    if (!isMonitoring || !lastUpdated) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdated.getTime();
      const timeToNextUpdate = 10000 - (timeSinceLastUpdate % 10000); // 10 second interval
      setNextUpdateCountdown(Math.ceil(timeToNextUpdate / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, lastUpdated]);

  // Fetch database notifications periodically
  useEffect(() => {
    if (isAuthenticated && user && !notificationsFetched.current) {
      fetchDatabaseNotifications();
      notificationsFetched.current = true;

      // Set up periodic refresh for database notifications
      const interval = setInterval(() => {
        fetchDatabaseNotifications();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const fetchDatabaseNotifications = async () => {
    try {
      setDbNotificationsLoading(true);
      const response = await fetch("/api/notifications?limit=20", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDatabaseNotifications(data.notifications || []);
        console.log(
          "📫 Database notifications fetched:",
          data.notifications?.length || 0
        );
      }
    } catch (error) {
      console.error("Error fetching database notifications:", error);
    } finally {
      setDbNotificationsLoading(false);
    }
  };

  // Calculate total unread notification count
  const getTotalUnreadCount = () => {
    // Real-time notifications are always considered "unread" until they auto-dismiss
    const realtimeUnreadCount = realtimeNotifications.length;

    // Database notifications have an isRead property
    const databaseUnreadCount = databaseNotifications.filter(
      (n) => !n.isRead
    ).length;

    const total = realtimeUnreadCount + databaseUnreadCount;

    console.log("📊 Notification count:", {
      realtime: realtimeUnreadCount,
      database: databaseUnreadCount,
      total,
    });

    return total;
  };

  // Get page-specific title and subtitle
  const pageInfo = getPageTitle(pathname);
  const displayTitle = propTitle !== "Dashboard" ? propTitle : pageInfo.title;
  const displaySubtitle =
    propSubtitle !== "Welcome back" ? propSubtitle : pageInfo.subtitle;

  // Auth check effect - only run once
  useEffect(() => {
    if (!authChecked.current && !isAuthenticated && !authLoading) {
      authChecked.current = true;
      dispatch(checkAuthStatus());
    }
  }, [dispatch, isAuthenticated, authLoading]);

  // Wallets loading effect
  useEffect(() => {
    if (isAuthenticated && user && !walletsLoaded.current) {
      walletsLoaded.current = true;
      dispatch(fetchWallets());
    }
  }, [isAuthenticated, user, dispatch]);

  // Active wallet sync effect - sync with database after wallets are loaded
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      wallets.length > 0 &&
      !activeWalletSynced.current
    ) {
      activeWalletSynced.current = true;
      dispatch(getActiveWalletFromDB()).then((result) => {
        if (result.type === "wallet/getActiveWalletFromDB/fulfilled") {
          const { activeWalletId } = result.payload as any;
          if (activeWalletId) {
            dispatch(setActiveWallet(activeWalletId));
          } else if (wallets.length > 0) {
            const firstWallet = wallets[0];
            dispatch(setActiveWallet(firstWallet.id));
            dispatch(setActiveWalletInDB(firstWallet.id));
          }
        } else {
          if (wallets.length > 0 && !activeWallet) {
            const firstWallet = wallets[0];
            dispatch(setActiveWallet(firstWallet.id));
            dispatch(setActiveWalletInDB(firstWallet.id));
          }
        }
      });
    }
  }, [isAuthenticated, user, wallets, activeWallet, dispatch]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser());
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth");
    }
  };

  // Handle wallet selection with DB sync
  const handleWalletSelect = async (walletId: string) => {
    // Set locally first for immediate UI response
    dispatch(setActiveWallet(walletId));

    // Then sync with database
    try {
      await dispatch(setActiveWalletInDB(walletId));
    } catch (error) {
      console.error("❌ Failed to sync active wallet with database:", error);
    }
  };

  // Get wallet color based on activeWallet index in wallets array
  const getWalletColor = () => {
    const colors = [
      "bg-gradient-to-br from-blue-400 to-cyan-400",
      "bg-gradient-to-br from-purple-400 to-pink-400",
      "bg-gradient-to-br from-green-400 to-emerald-400",
      "bg-gradient-to-br from-orange-400 to-red-400",
      "bg-gradient-to-br from-indigo-400 to-purple-400",
    ];

    if (!activeWallet) return colors[0];
    const activeIndex = wallets.findIndex((w) => w.id === activeWallet.id);
    return colors[activeIndex >= 0 ? activeIndex % colors.length : 0];
  };

  // Get active wallet display data with real-time information
  const getActiveWalletDisplayData = () => {
    if (realtimeData && isMonitoring) {
      return {
        name: activeWallet?.name || "Loading...",
        address: activeWallet?.address || "",
        balance: realtimeData.totalValue,
        changeAmount: hasChanges ? changeAmount : undefined,
        hasRealtimeData: true,
      };
    }

    return {
      name: activeWallet?.name || "Loading...",
      address: activeWallet?.address || "",
      balance: activeWallet?.balance || 0,
      changeAmount: undefined,
      hasRealtimeData: false,
    };
  };

  const activeWalletData = getActiveWalletDisplayData();

  // Format time since last update
  const formatTimeSince = () => {
    if (!lastUpdated) return null;
    const timeSince = getTimeSinceUpdate();
    if (!timeSince) return null;

    const seconds = Math.floor(timeSince / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const totalUnreadCount = getTotalUnreadCount();

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Global Header - Fixed across all pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-0 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
              {displayTitle}
            </h1>
          </div>

          {displaySubtitle && (
            <div className="flex items-center">
              <p className="text-gray-400 text-sm font-satoshi mt-1">
                {displaySubtitle}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Wallet Selector with Real-time Data */}
          {wallets.length > 0 && (
            <button
              onClick={() => setWalletSwitcherOpen(true)}
              className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto hover:border-[#E2AF19] transition-colors group"
            >
              <div
                className={`w-6 h-6 lg:w-8 lg:h-8 ${getWalletColor()} rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0`}
              >
                <div
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                   linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                    backgroundSize: "6px 6px lg:8px 8px",
                  }}
                ></div>
                {/* Real-time pulse indicator */}
                {isMonitoring && (
                  <div
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${
                      isDataStale ? "bg-yellow-400" : "bg-green-400"
                    }`}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-white text-xs sm:text-sm font-satoshi mr-2 min-w-0 truncate group-hover:text-[#E2AF19] transition-colors block">
                  {activeWalletData.name}
                </span>

                {/* Real-time balance display */}
                <div className="flex items-center text-xs text-gray-400">
                  <span>${activeWalletData.balance.toFixed(2)}</span>
                  {activeWalletData.changeAmount &&
                    Math.abs(activeWalletData.changeAmount) > 0.01 && (
                      <span
                        className={`ml-1 flex items-center ${
                          activeWalletData.changeAmount > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {activeWalletData.changeAmount > 0 ? (
                          <TrendingUp size={10} />
                        ) : (
                          <TrendingDown size={10} />
                        )}
                        <span className="ml-1">
                          ${Math.abs(activeWalletData.changeAmount).toFixed(2)}
                        </span>
                      </span>
                    )}
                </div>
              </div>

              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>

              <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
                {activeWalletData.address
                  ? `${activeWalletData.address.slice(
                      0,
                      6
                    )}...${activeWalletData.address.slice(-4)}`
                  : "Loading..."}
              </span>

              <ChevronDown
                size={14}
                className="text-gray-400 group-hover:text-[#E2AF19] transition-colors lg:w-4 lg:h-4"
              />
            </button>
          )}

          {/* Action Icons Container */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3 relative">
              {/* Notification Bell with UNIFIED count */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full relative"
              >
                <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-satoshi">
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </span>
                )}
              </button>

              {/* Unified Notification Panel */}
              {notificationsOpen && (
                <NotificationPanel
                  isOpen={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                />
              )}

              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>

              <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
                <HelpCircle size={16} className="text-gray-400 lg:w-5 lg:h-5" />
              </button>

              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>

              <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
                <Settings size={16} className="text-gray-400 lg:w-5 lg:h-5" />
              </button>

              <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>

              <button
                onClick={handleLogout}
                className="p-1.5 lg:p-2 transition-colors hover:bg-red-600 hover:bg-opacity-20 rounded-full group"
                title="Logout"
              >
                <LogOut
                  size={16}
                  className="text-gray-400 lg:w-5 lg:h-5 group-hover:text-red-400 transition-colors"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Status Dropdown */}
      {showRealtimeStatus && (
        <div className="absolute top-16 right-4 z-50 bg-black/95 backdrop-blur-sm border border-[#2C2C2C] rounded-lg p-4 w-80 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm font-satoshi">
              Real-time Dashboard Status
            </h3>
            <button
              onClick={() => setShowRealtimeStatus(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Monitoring Status:</span>
              <span
                className={isMonitoring ? "text-green-400" : "text-red-400"}
              >
                {isMonitoring ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Active Polling:</span>
              <span
                className={
                  status.isPolling ? "text-green-400" : "text-gray-400"
                }
              >
                {status.isPolling ? "Yes" : "No"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Background Refresh:</span>
              <span
                className={
                  status.hasBackgroundRefresh
                    ? "text-green-400"
                    : "text-gray-400"
                }
              >
                {status.hasBackgroundRefresh ? "Active" : "Inactive"}
              </span>
            </div>

            {lastUpdated && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Update:</span>
                <span className="text-white">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            )}

            {status.dataAge && (
              <div className="flex justify-between">
                <span className="text-gray-400">Data Age:</span>
                <span
                  className={`${
                    isDataStale ? "text-yellow-400" : "text-white"
                  }`}
                >
                  {formatTimeSince()}
                </span>
              </div>
            )}

            {realtimeData && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Portfolio Value:</span>
                  <span className="text-white">
                    ${realtimeData.totalValue.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Token Count:</span>
                  <span className="text-white">
                    {realtimeData.tokens.length}
                  </span>
                </div>

                {hasChanges && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recent Change:</span>
                    <span
                      className={
                        changeAmount >= 0 ? "text-green-400" : "text-red-400"
                      }
                    >
                      {changeAmount >= 0 ? "+" : ""}${changeAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </>
            )}

            {status.retryCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Retry Count:</span>
                <span className="text-yellow-400">{status.retryCount}/3</span>
              </div>
            )}
          </div>

          {/* Status indicators */}
          <div className="mt-3 pt-3 border-t border-[#2C2C2C] flex items-center justify-between">
            <div className="flex items-center">
              {isMonitoring ? (
                <Wifi size={14} className="text-green-400 animate-pulse mr-2" />
              ) : (
                <WifiOff size={14} className="text-gray-400 mr-2" />
              )}
              <span
                className={`text-xs font-satoshi ${
                  isMonitoring ? "text-green-400" : "text-gray-400"
                }`}
              >
                {isMonitoring ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>

            <button
              onClick={refreshDashboard}
              className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg text-xs font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
            >
              Force Refresh
            </button>
          </div>
        </div>
      )}

      {/* Page-specific content below header */}
      {children}

      {/* Wallet Switcher Modal */}
      {wallets.length > 0 && (
        <RealtimeWalletSwitcher
          isOpen={walletSwitcherOpen}
          onClose={() => setWalletSwitcherOpen(false)}
          onWalletSelect={handleWalletSelect}
        />
      )}
    </>
  );
}
