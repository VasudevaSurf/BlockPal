// src/components/dashboard/GlobalDashboardHeader.tsx - COMPACT VERSION
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
import SettingsIcon from "../icons/SettingsIcon";

interface GlobalDashboardHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
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
        title: "Manage Payments",
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
        title: "AI Chat",
        subtitle: "Powered by GoPlus Security & CoinGecko APIs",
      };
    case "/dashboard/friends":
      return {
        title: "Friends",
        subtitle: "Connect with friends and request funds",
      };
    case "/dashboard/profile":
      return {
        title: "User Profile",
        subtitle: "Manage your account settings and preferences",
      };
    default:
      if (pathname.startsWith("/dashboard/token/")) {
        return {
          title: "Token Overview",
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
    notifications: realtimeNotifications = [],
    refreshDashboard,
    status,
    isDataStale,
    getTimeSinceUpdate,
  } = useRealtimeDashboard();

  // Wallet switcher state and ref
  const [walletSwitcherOpen, setWalletSwitcherOpen] = useState(false);
  const walletButtonRef = useRef<HTMLButtonElement>(null);
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
      const timeToNextUpdate = 10000 - (timeSinceLastUpdate % 10000);
      setNextUpdateCountdown(Math.ceil(timeToNextUpdate / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, lastUpdated]);

  // Fetch database notifications periodically
  useEffect(() => {
    if (isAuthenticated && user && !notificationsFetched.current) {
      fetchDatabaseNotifications();
      notificationsFetched.current = true;

      const interval = setInterval(() => {
        fetchDatabaseNotifications();
      }, 30000);

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
    const realtimeUnreadCount = realtimeNotifications.length;
    const databaseUnreadCount = databaseNotifications.filter(
      (n) => !n.isRead
    ).length;
    return realtimeUnreadCount + databaseUnreadCount;
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
    dispatch(setActiveWallet(walletId));

    try {
      await dispatch(setActiveWalletInDB(walletId));
    } catch (error) {
      console.error("❌ Failed to sync active wallet with database:", error);
    }
  };

  // FIXED: Handle wallet button click with proper toggle
  const handleWalletButtonClick = () => {
    console.log("🎯 Wallet button clicked, current state:", walletSwitcherOpen);
    setWalletSwitcherOpen(!walletSwitcherOpen);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-0 flex-shrink-0 gap-3 sm:gap-0">
        <div>
          <div className="flex items-center">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white font-mayeka">
              {displayTitle}
            </h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
          {/* Wallet Selector with Real-time Data */}
          {wallets.length > 0 && (
            <button
              ref={walletButtonRef}
              onClick={handleWalletButtonClick}
              className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2.5 lg:px-3 py-1.5 lg:py-2 w-full sm:w-auto hover:border-[#E2AF19] transition-colors group"
            >
              <div
                className={`w-5 h-5 lg:w-6 lg:h-6 ${getWalletColor()} rounded-full mr-2 lg:mr-2.5 flex items-center justify-center relative flex-shrink-0`}
              >
                <div
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                   linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                    backgroundSize: "4px 4px lg:6px 6px",
                  }}
                ></div>
                {/* Real-time pulse indicator */}
                {isMonitoring && (
                  <div
                    className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse ${
                      isDataStale ? "bg-yellow-400" : "bg-green-400"
                    }`}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-white text-xs sm:text-xs font-satoshi mr-1.5 min-w-0 truncate group-hover:text-[#E2AF19] transition-colors block">
                  {activeWalletData.name}
                </span>
              </div>

              <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mr-1.5 lg:mr-2 hidden sm:block"></div>

              <span className="text-gray-400 text-xs font-satoshi italic mr-1.5 lg:mr-2 hidden sm:block truncate">
                {activeWalletData.address
                  ? `${activeWalletData.address.slice(
                      0,
                      8
                    )}...${activeWalletData.address.slice(-6)}`
                  : "Loading..."}
              </span>

              <ChevronDown
                size={12}
                className={`text-gray-400 group-hover:text-[#E2AF19] transition-all lg:w-3 lg:h-3 ${
                  walletSwitcherOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          )}

          {/* Action Icons Container */}
          <div className="flex items-center space-x-2 relative">
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-1.5 lg:px-2 py-1.5 lg:py-2">
              {/* Notification Bell with UNIFIED count */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full relative"
              >
                <Bell size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-satoshi">
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

              <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mx-1 lg:mx-1.5"></div>

              <button className="p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full">
                <SettingsIcon
                  size={14}
                  className="text-gray-400 lg:w-4 lg:h-4"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Status Dropdown */}
      {showRealtimeStatus && (
        <div className="absolute top-12 right-3 z-50 bg-black/95 backdrop-blur-sm border border-[#2C2C2C] rounded-lg p-3 w-64 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-xs font-satoshi">
              Real-time Dashboard Status
            </h3>
            <button
              onClick={() => setShowRealtimeStatus(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-1.5 text-[10px]">
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

          <div className="mt-2 pt-2 border-t border-[#2C2C2C] flex items-center justify-between">
            <div className="flex items-center">
              {isMonitoring ? (
                <Wifi
                  size={12}
                  className="text-green-400 animate-pulse mr-1.5"
                />
              ) : (
                <WifiOff size={12} className="text-gray-400 mr-1.5" />
              )}
              <span
                className={`text-[10px] font-satoshi ${
                  isMonitoring ? "text-green-400" : "text-gray-400"
                }`}
              >
                {isMonitoring ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>

            <button
              onClick={refreshDashboard}
              className="bg-[#E2AF19] text-black px-2 py-1 rounded-lg text-[10px] font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
            >
              Force Refresh
            </button>
          </div>
        </div>
      )}

      {/* Page-specific content below header */}
      {children}

      {/* Wallet Switcher Dropdown */}
      {wallets.length > 0 && (
        <RealtimeWalletSwitcher
          isOpen={walletSwitcherOpen}
          onClose={() => setWalletSwitcherOpen(false)}
          onWalletSelect={handleWalletSelect}
          triggerRef={walletButtonRef}
        />
      )}
    </>
  );
}
