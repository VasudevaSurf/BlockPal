// src/components/dashboard/Sidebar.tsx - UPDATED VERSION (Profile option removed)
"use client";

import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
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

// REMOVED: otherItems array (no longer needed since profile is moved to header)

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
                } ${isLoading ? "pointer-events-none" : ""}`}
              >
                <item.icon
                  size={16}
                  className="mr-3 flex-shrink-0"
                  filled={isActive}
                />
                <span className={isActive ? "font-medium" : ""}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section - Only website link now */}
      <div className="p-2 lg:p-4 flex-shrink-0 relative z-20">
        <div className="space-y-1 lg:space-y-2">
          {/* Go to Website Button */}
          <button
            onClick={() => {
              window.open(
                "https://blockpal.tech",
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
        </div>
      </div>
    </div>
  );
}
