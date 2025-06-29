// src/components/dashboard/Sidebar.tsx (UPDATED - Added Navigation Loading)
"use client";

import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  MessageCircle,
  Users,
  User,
  ExternalLink,
  Moon,
  RefreshCw,
} from "lucide-react";
import { RootState } from "@/store";
import { toggleTheme } from "@/store/slices/uiSlice";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: Calendar,
    label: "Schedule Payments",
    href: "/dashboard/scheduled-payments",
  },
  {
    icon: CreditCard,
    label: "Batch Payments",
    href: "/dashboard/batch-payments",
  },
  {
    icon: MessageCircle,
    label: "AI Chat",
    href: "/dashboard/ai-chat",
  },
  {
    icon: Users,
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
  const { isLoading, startLoading } = useNavigationLoading();

  const handleNavigation = (href: string, event?: React.MouseEvent) => {
    // Prevent navigation if already loading
    if (isLoading) {
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
      style={{ borderRadius: "20px" }}
    >
      {/* Top Gradient Blur */}
      <div
        className="absolute -top-2 lg:-top-5 -left-2 lg:-left-5 -right-2 lg:-right-5 h-40 lg:h-80 pointer-events-none z-10"
        style={{
          borderRadius: "400px lg:898px",
          background:
            "linear-gradient(180deg, rgba(226, 175, 25, 0.40) 0%, rgba(226, 175, 25, 0.25) 25%, rgba(226, 175, 25, 0.10) 50%, rgba(226, 175, 25, 0.00) 75%)",
          filter: "blur(30px lg:blur(70px))",
        }}
      />

      {/* Bottom Gradient Blur */}
      <div
        className="absolute -bottom-2 lg:-bottom-5 -left-2 lg:-left-5 -right-2 lg:-right-5 h-40 lg:h-80 pointer-events-none z-10"
        style={{
          borderRadius: "400px lg:898px",
          background:
            "linear-gradient(0deg, rgba(226, 175, 25, 0.40) 0%, rgba(226, 175, 25, 0.25) 25%, rgba(226, 175, 25, 0.10) 50%, rgba(226, 175, 25, 0.00) 75%)",
          filter: "blur(30px lg:blur(70px))",
        }}
      />

      {/* Additional Middle Fade Gradient */}
      <div
        className="absolute top-1/3 bottom-1/3 -left-2 lg:-left-5 -right-2 lg:-right-5 pointer-events-none z-15"
        style={{
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.9) 50%, rgba(0, 0, 0, 0.3) 100%)",
          filter: "blur(20px lg:blur(40px))",
        }}
      />

      {/* Logo Section */}
      <div className="p-4 lg:p-6 flex-shrink-0 relative z-20">
        <div className="flex items-center mb-4 lg:mb-8">
          <img
            src="/blockName.png"
            alt="Blockpal"
            className="brightness-110 h-6 lg:h-7"
            style={{
              width: "auto",
            }}
          />
        </div>

        {/* Navigations Section with Lines - Hidden on mobile, shown on lg+ */}
        <div className="mb-4 lg:mb-6 hidden lg:block">
          <div className="flex items-center mb-4">
            <div className="flex-1 h-px bg-[#DCDCDC]"></div>
            <span className="px-4 text-sm font-medium text-gray-300 font-satoshi">
              Navigations
            </span>
            <div className="flex-1 h-px bg-[#DCDCDC]"></div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-3 lg:px-4 overflow-y-auto relative z-20">
        <nav className="space-y-2 lg:space-y-3 mb-6 lg:mb-8">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.label}
                onClick={(e) => handleNavigation(item.href, e)}
                disabled={isLoading}
                className={`w-full flex items-center px-3 lg:px-4 py-3 rounded-xl text-left transition-all duration-200 font-satoshi text-sm lg:text-base ${
                  isActive
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "text-[#EDEDED] hover:bg-[#2C2C2C] hover:text-white"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoading && pathname !== item.href ? (
                  <RefreshCw
                    size={18}
                    className="mr-3 flex-shrink-0 animate-spin"
                  />
                ) : (
                  <item.icon size={18} className="mr-3 flex-shrink-0" />
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
      <div className="p-3 lg:p-4 flex-shrink-0 relative z-20">
        {/* Others Section with Lines - Hidden on mobile */}
        <div className="mb-4 lg:mb-6 hidden lg:block">
          <div className="flex items-center mb-4">
            <div className="flex-1 h-px bg-[#DCDCDC]"></div>
            <span className="px-4 text-sm font-medium text-gray-300 font-satoshi">
              Others
            </span>
            <div className="flex-1 h-px bg-[#DCDCDC]"></div>
          </div>
        </div>

        <div className="space-y-2 lg:space-y-3">
          {/* User Profile Link */}
          {otherItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.label}
                onClick={(e) => handleNavigation(item.href, e)}
                disabled={isLoading}
                className={`w-full flex items-center px-3 lg:px-4 py-3 rounded-xl text-left transition-all duration-200 font-satoshi text-sm lg:text-base ${
                  isActive
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "text-[#EDEDED] hover:bg-[#2C2C2C] hover:text-white"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoading && pathname !== item.href ? (
                  <RefreshCw
                    size={18}
                    className="mr-3 flex-shrink-0 animate-spin"
                  />
                ) : (
                  <item.icon size={18} className="mr-3 flex-shrink-0" />
                )}
                <span className={isActive ? "font-medium" : ""}>
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            className="w-full flex items-center px-3 lg:px-4 py-3 rounded-xl text-gray-300 hover:bg-[#2C2C2C] hover:text-white transition-all duration-200 font-satoshi text-sm lg:text-base"
            disabled={isLoading}
          >
            <ExternalLink size={18} className="mr-3 flex-shrink-0" />
            <span className="truncate">Go to website</span>
            <div className="ml-auto flex-shrink-0">
              <ExternalLink size={14} className="text-gray-400" />
            </div>
          </button>

          <button
            onClick={() => dispatch(toggleTheme())}
            disabled={isLoading}
            className="w-full flex items-center px-3 lg:px-4 py-3 rounded-xl text-gray-300 hover:bg-[#2C2C2C] hover:text-white transition-all duration-200 font-satoshi text-sm lg:text-base"
          >
            <Moon size={18} className="mr-3 flex-shrink-0" />
            <span className="truncate">Dark Mode</span>
            <div className="ml-auto flex-shrink-0">
              <div className="w-8 lg:w-10 h-5 lg:h-6 rounded-full relative bg-[#E2AF19]">
                <div className="w-3 lg:w-4 h-3 lg:h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
