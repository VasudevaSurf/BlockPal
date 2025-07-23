// src/components/dashboard/Sidebar.tsx - COMPACT VERSION
"use client";

import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { User, ExternalLink, RefreshCw } from "lucide-react";
import { RootState } from "@/store";
import { toggleTheme } from "@/store/slices/uiSlice";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import DashboardIcon from "@/components/icons/DashboardIcon";
import ScheduleIcon from "@/components/icons/ScheduleIcon";
import BatchIcon from "@/components/icons/BatchIcon";
import AIIcon from "@/components/icons/AIIcon";
import FriendsIcon from "@/components/icons/FriendsIcon";
import WebsiteIcon from "@/components/icons/WebsiteIcon";
import DarkModeIcon from "@/components/icons/DarkModeIcon";
import LogoutIcon from "@/components/icons/LogoutIcon";
import { logoutUser } from "@/store/slices/authSlice";

const menuItems = [
  {
    icon: DashboardIcon,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: ScheduleIcon,
    label: "Schedule Payments",
    href: "/dashboard/scheduled-payments",
  },
  {
    icon: BatchIcon,
    label: "Batch Payments",
    href: "/dashboard/batch-payments",
  },
  {
    icon: AIIcon,
    label: "AI Chat",
    href: "/dashboard/ai-chat",
  },
  {
    icon: FriendsIcon,
    label: "Friends",
    href: "/dashboard/friends",
  },
];

const otherItems = [
  {
    icon: User,
    label: "User Profile",
    href: "/dashboard/profile",
  },
];

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSelector((state: RootState) => state.auth);
  const { wallets } = useSelector((state: RootState) => state.wallet);
  const { isLoading, startLoading } = useNavigationLoading();

  // Check if user has wallets
  const hasWallets = wallets && wallets.length > 0;

  const handleNavigation = (href: string, event?: React.MouseEvent) => {
    // Prevent navigation if already loading
    if (isLoading) {
      event?.preventDefault();
      return;
    }

    // Prevent navigation if no wallets (except dashboard)
    if (!hasWallets && href !== "/dashboard") {
      event?.preventDefault();
      return;
    }

    // Don't show loading if we're already on this page
    if (pathname === href) {
      onItemClick?.();
      return;
    }

    // Start loading and navigate
    startLoading();

    // Small delay to ensure loading state is visible
    setTimeout(() => {
      router.push(href);
      onItemClick?.();
    }, 100);
  };

  // FIXED: Proper logout handler with error handling
  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (isLoading) return;

    try {
      console.log("🚪 Starting logout process...");

      // Show loading state
      startLoading();

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
      const result = await dispatch(logoutUser());

      if (logoutUser.fulfilled.match(result)) {
        console.log("✅ Logout successful");
      } else if (logoutUser.rejected.match(result)) {
        console.warn(
          "⚠️ Logout API failed, but continuing with local cleanup:",
          result.payload
        );
      }

      // Always redirect regardless of API response
      console.log("🔄 Redirecting to auth page...");
      router.replace("/auth");

      if (onItemClick) {
        onItemClick();
      }
    } catch (error) {
      console.error("❌ Logout error:", error);

      // Even if logout fails, clear local state and redirect
      try {
        // Manual cleanup
        dispatch({ type: "auth/setUnauthenticated" });
        router.replace("/auth");

        if (onItemClick) {
          onItemClick();
        }
      } catch (redirectError) {
        console.error("❌ Emergency redirect failed:", redirectError);
        // Force page reload as last resort
        window.location.href = "/auth";
      }
    }
  };

  return (
    <div
      className="relative w-full lg:w-64 flex flex-col bg-black border border-[#2C2C2C] h-full overflow-hidden"
      style={{ borderRadius: "16px" }}
    >
      {/* Top Gradient Blur */}
      <div
        className="absolute -top-1 lg:-top-3 -left-1 lg:-left-3 -right-1 lg:-right-3 h-24 lg:h-48 pointer-events-none z-10"
        style={{
          borderRadius: "300px lg:600px",
          background:
            "linear-gradient(180deg, rgba(226, 175, 25, 0.40) 0%, rgba(226, 175, 25, 0.25) 25%, rgba(226, 175, 25, 0.10) 50%, rgba(226, 175, 25, 0.00) 75%)",
          filter: "blur(20px lg:blur(50px)",
        }}
      />

      {/* Bottom Gradient Blur */}
      <div
        className="absolute -bottom-1 lg:-bottom-3 -left-1 lg:-left-3 -right-1 lg:-right-3 h-24 lg:h-48 pointer-events-none z-10"
        style={{
          borderRadius: "300px lg:600px",
          background:
            "linear-gradient(0deg, rgba(226, 175, 25, 0.40) 0%, rgba(226, 175, 25, 0.25) 25%, rgba(226, 175, 25, 0.10) 50%, rgba(226, 175, 25, 0.00) 75%)",
          filter: "blur(20px lg:blur(50px)",
        }}
      />

      {/* Additional Middle Fade Gradient */}
      <div
        className="absolute top-1/3 bottom-1/3 -left-1 lg:-left-3 -right-1 lg:-right-3 pointer-events-none z-15"
        style={{
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.9) 50%, rgba(0, 0, 0, 0.3) 100%)",
          filter: "blur(15px lg:blur(30px)",
        }}
      />

      {/* Logo Section */}
      <div className="p-3 lg:p-6 flex-shrink-0 relative z-20">
        <div className="flex items-center mb-3 lg:mb-6">
          <img
            src="/blockName.png"
            alt="Blockpal"
            className="brightness-110 h-5 lg:h-6"
            style={{
              width: "auto",
            }}
          />
        </div>

        {/* Navigations Section with Lines - Hidden on mobile, shown on lg+ */}
        <div className="mb-3 lg:mb-4 hidden lg:block">
          <div className="flex items-center mb-3">
            <div className="flex-1 h-px bg-[#DCDCDC]"></div>
            <span className="px-3 text-xs font-medium text-gray-300 font-satoshi">
              Navigations
            </span>
            <div className="flex-1 h-px bg-[#DCDCDC]"></div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-2 lg:px-4 overflow-y-auto relative z-20 scrollbar-hide">
        <nav className="space-y-1 lg:space-y-2 mb-4 lg:mb-6">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const isDisabled = !hasWallets && item.href !== "/dashboard";

            return (
              <button
                key={item.label}
                onClick={(e) => handleNavigation(item.href, e)}
                disabled={isLoading || isDisabled}
                className={`w-full flex items-center px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-all duration-200 font-satoshi text-xs lg:text-sm ${
                  isActive
                    ? "bg-[#E2AF19] text-black font-medium"
                    : isDisabled
                    ? "text-gray-500 cursor-not-allowed opacity-50"
                    : "text-[#EDEDED] hover:bg-[#2C2C2C] hover:text-white"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoading && pathname !== item.href ? (
                  <RefreshCw
                    size={16}
                    className="mr-3 flex-shrink-0 animate-spin"
                  />
                ) : (
                  <item.icon
                    size={16}
                    className="mr-3 flex-shrink-0"
                    filled={isActive}
                  />
                )}
                <span className={isActive ? "font-medium" : ""}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Others Section - Fixed at bottom */}
      <div className="p-2 lg:p-4 flex-shrink-0 relative z-20">
        {/* Others Section with Lines - Hidden on mobile */}
        <div className="mb-3 lg:mb-4 hidden lg:block">
          <div className="flex items-center mb-3">
            <div className="flex-1 h-px bg-[#DCDCDC]"></div>
            <span className="px-3 text-xs font-medium text-gray-300 font-satoshi">
              Others
            </span>
            <div className="flex-1 h-px bg-[#DCDCDC]"></div>
          </div>
        </div>

        <div className="space-y-1 lg:space-y-2">
          {/* User Profile Link with Logout */}
          {otherItems.map((item) => {
            const isActive = pathname === item.href;
            const isProfileDisabled = !hasWallets;

            return (
              <div key={item.label} className="w-full flex items-center">
                {/* Profile Button - Can be disabled */}
                <button
                  onClick={(e) =>
                    !isProfileDisabled && handleNavigation(item.href, e)
                  }
                  disabled={isLoading || isProfileDisabled}
                  className={`flex-1 flex items-center px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-all duration-200 font-satoshi text-xs lg:text-sm ${
                    isActive
                      ? "bg-[#E2AF19] text-black font-medium"
                      : isProfileDisabled
                      ? "text-gray-500 cursor-not-allowed opacity-50"
                      : "text-[#EDEDED] hover:bg-[#2C2C2C] hover:text-white"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isLoading && pathname !== item.href ? (
                    <RefreshCw
                      size={16}
                      className="mr-3 flex-shrink-0 animate-spin"
                    />
                  ) : (
                    <item.icon size={16} className="mr-3 flex-shrink-0" />
                  )}
                  <span className={isActive ? "font-medium" : ""}>
                    {item.label}
                  </span>
                </button>

                {/* Logout Button - Always enabled and separate */}
                <button
                  className="ml-1 flex-shrink-0 p-2 rounded hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  onClick={handleLogout}
                  disabled={isLoading}
                  title="Logout"
                >
                  {isLoading ? (
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                      color="#E74C3C"
                    />
                  ) : (
                    <LogoutIcon
                      size={14}
                      className="hover:opacity-80 transition-opacity"
                      color="#E74C3C"
                    />
                  )}
                </button>
              </div>
            );
          })}

          {/* Go to Website Button */}
          <button
            onClick={() => {
              // FIXED: Add https:// protocol to the URL
              window.open(
                "https://blockpal.tech", // ✅ Correct: includes protocol
                "_blank",
                "noopener,noreferrer"
              );
            }}
            className="w-full flex items-center px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-gray-300 hover:bg-[#2C2C2C] hover:text-white transition-all duration-200 font-satoshi text-xs lg:text-sm cursor-pointer"
            disabled={isLoading}
            title="Visit Blockpal website"
          >
            <WebsiteIcon size={16} className="mr-3 flex-shrink-0" />
            <span className="truncate">Go to website</span>
            <div className="ml-auto flex-shrink-0">
              <ExternalLink size={12} className="text-gray-400" />
            </div>
          </button>

          {/* Dark Mode Toggle */}
          {/* <button
            onClick={() => dispatch(toggleTheme())}
            disabled={isLoading}
            className="w-full flex items-center px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-gray-300 hover:bg-[#2C2C2C] hover:text-white transition-all duration-200 font-satoshi text-xs lg:text-sm"
          >
            <DarkModeIcon size={16} className="mr-3 flex-shrink-0" />
            <span className="truncate">Dark Mode</span>
            <div className="ml-auto flex-shrink-0">
              <div className="w-8 lg:w-10 h-5 lg:h-6 rounded-full relative bg-[#E2AF19]">
                <div className="w-3 lg:w-4 h-3 lg:h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
          </button> */}
        </div>
      </div>
    </div>
  );
}
