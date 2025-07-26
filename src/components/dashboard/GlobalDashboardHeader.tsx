// src/components/dashboard/GlobalDashboardHeader.tsx - UPDATED VERSION (Profile and Logout icons in header)
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  User,
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
  fetchWalletTokens,
  updateWalletBalance,
  clearTokens,
} from "@/store/slices/walletSlice";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import RealtimeWalletSwitcher from "@/components/wallet/RealtimeWalletSwitcher";
import NotificationPanel from "@/components/notifications/NotificationPanel";

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

  // Active wallet sync effect
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

  // NEW: Handle profile navigation
  const handleProfileClick = () => {
    router.push("/dashboard/profile");
  };

  // NEW: Handle logout
  const handleLogout = async () => {
    try {
      // Clear any local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeWalletId");
        localStorage.removeItem("auth-token");

        // Clear any other cached data
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (
            key.startsWith("wallet-") ||
            key.startsWith("token-") ||
            key.startsWith("blockpal-")
          ) {
            localStorage.removeItem(key);
          }
        });
      }

      // Dispatch logout action
      await dispatch(logoutUser());
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth");
    }
  };

  // Enhanced wallet selection with proper data loading
  const handleWalletSelect = async (walletId: string) => {
    console.log("🎯 Header - Wallet selected:", walletId);

    // Find the selected wallet
    const selectedWallet = wallets.find((w) => w.id === walletId);
    if (!selectedWallet) {
      console.error("❌ Selected wallet not found");
      return;
    }

    try {
      // Step 1: Clear existing tokens to show loading state
      dispatch(clearTokens());
      console.log("🧹 Cleared existing tokens");

      // Step 2: Set active wallet locally first
      dispatch(setActiveWallet(walletId));
      console.log("🎯 Set active wallet locally");

      // Step 3: Sync with database
      await dispatch(setActiveWalletInDB(walletId));
      console.log("💾 Synced with database");

      // Step 4: Load fresh data for the new wallet
      console.log("📡 Loading fresh data for:", selectedWallet.address);

      const [tokensResult, balanceResult] = await Promise.all([
        dispatch(fetchWalletTokens(selectedWallet.address)),
        dispatch(updateWalletBalance(selectedWallet.address)),
      ]);

      const tokensSuccess =
        tokensResult.type === "wallet/fetchWalletTokens/fulfilled";
      const balanceSuccess =
        balanceResult.type === "wallet/updateWalletBalance/fulfilled";

      if (tokensSuccess && balanceSuccess) {
        console.log("✅ Wallet data loaded successfully");
      } else {
        console.warn("⚠️ Some wallet data may not have loaded properly");
      }

      // Force refresh dashboard if available
      if (refreshDashboard) {
        setTimeout(() => {
          refreshDashboard();
        }, 500);
      }
    } catch (error) {
      console.error("❌ Failed to switch wallet:", error);
    }
  };

  // Handle wallet button click
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

  // Generate letters from wallet name
  const getWalletLetters = (walletName: string): string => {
    if (!walletName || typeof walletName !== "string") {
      return "W"; // Default fallback
    }

    const words = walletName.trim().split(/\s+/);

    if (words.length >= 2) {
      // If 2 or more words, take first letter of each of the first two words
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      // If one word with 2+ characters, take first 2 letters
      return words[0].substring(0, 2).toUpperCase();
    } else if (words.length === 1 && words[0].length === 1) {
      // If one word with 1 character, just use that character
      return words[0].toUpperCase();
    } else {
      // Fallback
      return "W";
    }
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
      {/* Global Header */}
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
                <span className="text-white text-xs font-bold font-satoshi">
                  {getWalletLetters(activeWalletData.name)}
                </span>

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
              {/* Notification Bell */}
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

              {/* Notification Panel */}
              {notificationsOpen && (
                <NotificationPanel
                  isOpen={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                />
              )}

              <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mx-1 lg:mx-1.5"></div>

              {/* NEW: Profile Icon */}
              <button
                onClick={handleProfileClick}
                className="p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full"
                title="User Profile"
              >
                <User size={14} className="text-gray-400 lg:w-4 lg:h-4" />
              </button>

              <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mx-1 lg:mx-1.5"></div>

              {/* NEW: Logout Icon */}
              <button
                onClick={handleLogout}
                className="p-1 lg:p-1.5 transition-colors hover:bg-red-900/20 rounded-full"
                title="Logout"
              >
                <LogOut
                  size={14}
                  className="text-gray-400 hover:text-red-400 lg:w-4 lg:h-4 transition-colors"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

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
