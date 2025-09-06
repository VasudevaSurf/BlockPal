"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { Bell, User, LogOut, ChevronDown, ArrowLeft } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus, logoutUser } from "@/store/slices/authSlice";

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
        title: "LoopX",
        subtitle: "Automated payments with smart contract security",
      };
    case "/dashboard/batch-payments":
      return {
        title: "Cluster",
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
  const dispatch = useDispatch<AppDispatch>();

  // Mock wallet data for UI
  const [selectedWallet] = useState({
    name: "Main Wallet",
    address: "0x1234...5678",
    balance: 2500.0,
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const authChecked = useRef(false);

  // Check if we're on a token overview page
  const isTokenOverviewPage = pathname.startsWith("/dashboard/token/");

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

  // Handle back button click
  const handleBackClick = () => {
    router.back();
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    router.push("/dashboard/profile");
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear any local storage
      if (typeof window !== "undefined") {
        localStorage.clear();
      }

      // Dispatch logout action
      await dispatch(logoutUser());
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth");
    }
  };

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
            {/* Back button - only show on specific pages */}
            {isTokenOverviewPage && (
              <button
                onClick={handleBackClick}
                className="mr-2.5 p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                title="Go back"
              >
                <ArrowLeft size={17} className="text-white" />
              </button>
            )}
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white font-mayeka">
              {displayTitle}
            </h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
          {/* Wallet Display (Static for UI) */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2.5 lg:px-3 py-1.5 lg:py-2 w-full sm:w-auto sm:min-w-[180px] lg:min-w-[200px]">
            <div className="w-6 h-6 lg:w-7 lg:h-7 bg-gradient-to-br from-gray-600/80 to-gray-700/90 rounded-full mr-2 lg:mr-2.5 flex items-center justify-center relative flex-shrink-0">
              <span className="text-white text-xs font-bold font-satoshi">
                MW
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-white text-xs sm:text-xs font-satoshi mr-1.5 min-w-0 truncate block">
                {selectedWallet.name}
              </span>
            </div>

            <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mr-1.5 lg:mr-2 hidden sm:block"></div>

            <span className="text-gray-400 text-xs font-satoshi italic mr-1.5 lg:mr-2 hidden sm:block truncate">
              {selectedWallet.address}
            </span>

            <ChevronDown size={12} className="text-gray-400 lg:w-3 lg:h-3" />
          </div>

          {/* Action Icons Container */}
          <div className="flex items-center space-x-2 relative">
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-1.5 lg:px-2 py-1.5 lg:py-2">
              {/* Notification Bell */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full relative"
              >
                <Bell size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-satoshi">
                  3
                </span>
              </button>

              <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mx-1 lg:mx-1.5"></div>

              {/* Profile Icon */}
              <button
                onClick={handleProfileClick}
                className="p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full"
                title="User Profile"
              >
                <User size={14} className="text-gray-400 lg:w-4 lg:h-4" />
              </button>

              <div className="w-px h-2.5 lg:h-3 bg-[#2C2C2C] mx-1 lg:mx-1.5"></div>

              {/* Logout Icon */}
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
    </>
  );
}
