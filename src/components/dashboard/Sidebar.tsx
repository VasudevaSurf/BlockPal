// src/components/dashboard/Sidebar.tsx - Responsive with mobile bottom nav
"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import {
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import WalletConnectButton from "@/components/wallet/WalletConnectButton";
import SwapIcon from "../icons/SwapIcon";
import UsersIcon from "../icons/UsersIcon";

const menuItems = [
  {
    icon: DashboardIcon,
    label: "Portfolio",
    href: "/dashboard",
    comingSoon: false,
  },
  {
    icon: AIIcon,
    label: "Lumen",
    href: "/dashboard/ai-chat",
    comingSoon: false,
  },
  {
    icon: SwapIcon,
    label: "Swap",
    href: "/dashboard/swap",
    comingSoon: false,
  },
  {
    icon: SwapIcon,
    label: "CodeLens",
    href: "/dashboard/code-lens",
    comingSoon: false,
  },
  {
    icon: UsersIcon,
    label: "NewsFeed",
    href: "/dashboard/news-feed",
    comingSoon: false,
  },
];

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  // Add padding bottom for mobile content to avoid bottom nav overlap
  if (typeof window !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--mobile-bottom-nav-height", "80px");
  }
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSelector((state: RootState) => state.auth);
  const { wallets } = useSelector((state: RootState) => state.wallet);
  const { isLoading, startLoading } = useNavigationLoading();

  // State for sidebar minimization (desktop only)
  const [isMinimized, setIsMinimized] = useState(false);

  // Check if user has wallets
  const hasWallets = wallets && wallets.length > 0;

  const handleNavigation = (
    href: string,
    comingSoon: boolean,
    event?: React.MouseEvent
  ) => {
    // Prevent navigation if already loading
    if (isLoading) {
      event?.preventDefault();
      return;
    }

    // Navigate to coming soon page for coming soon items
    if (comingSoon) {
      event?.preventDefault();
      startLoading();
      setTimeout(() => {
        router.push("/dashboard/coming-soon");
        onItemClick?.();
      }, 100);
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

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div
        className={`hidden lg:flex relative flex-col bg-[#0F0F0F] border-r border-[#FFFFFF40] h-full overflow-hidden transition-all duration-300 ease-in-out ${
          isMinimized ? "w-16 lg:w-20" : "w-full lg:w-64"
        }`}
      >
        {/* Logo Section */}
        <div className="p-3 lg:p-6 flex-shrink-0 relative z-20">
          <div className="flex items-center justify-between">
            {isMinimized ? (
              /* Mini Logo and arrow when minimized */
              <div className="w-full flex flex-col items-center gap-2">
                {/* Arrow button when minimized */}
                <button
                  onClick={toggleMinimized}
                  className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-all duration-300 text-gray-400 hover:text-white group"
                  title="Expand sidebar"
                >
                  <ChevronRight
                    size={18}
                    className="lg:w-5 lg:h-5 transition-all duration-300 group-hover:translate-x-0.5"
                  />
                </button>
              </div>
            ) : (
              /* Full logo and arrow when expanded */
              <>
                <img
                  src="/blockName.png"
                  alt="Blockpal"
                  className="brightness-110 h-5 lg:h-6"
                  style={{
                    width: "auto",
                  }}
                />

                {/* Arrow Toggle Button */}
                <button
                  onClick={toggleMinimized}
                  className="p-1.5 lg:p-2 hover:bg-[#2C2C2C] rounded-lg transition-all duration-300 text-gray-400 hover:text-white group"
                  title="Minimize sidebar"
                >
                  <ChevronLeft
                    size={18}
                    className="lg:w-5 lg:h-5 transition-all duration-300 group-hover:-translate-x-0.5"
                  />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto relative z-20 scrollbar-hide">
          <nav
            className={`space-y-1 lg:space-y-2 mb-4 lg:mb-6 ${
              isMinimized ? "px-2" : "px-2 lg:px-4"
            }`}
          >
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.comingSoon && pathname === "/dashboard/coming-soon");

              return (
                <div
                  key={item.label}
                  className="nav-item-wrapper -mr-2 lg:-mr-4"
                >
                  <button
                    onClick={(e) =>
                      handleNavigation(item.href, item.comingSoon, e)
                    }
                    disabled={isLoading}
                    className={`w-full flex items-center text-left transition-all duration-200 font-satoshi text-xs lg:text-sm ${
                      isMinimized
                        ? "pl-[18px] lg:pl-[22px] pr-4 lg:pr-6 py-2 lg:py-3 rounded-l-lg"
                        : "px-3 lg:px-4 py-2 lg:py-3 rounded-l-lg"
                    } ${
                      isActive && !item.comingSoon
                        ? "bg-[#E2AF19] text-black font-medium"
                        : item.comingSoon
                        ? "text-gray-400 hover:bg-[#1C1C1C] cursor-pointer"
                        : "text-[#EDEDED] hover:bg-[#2C2C2C] hover:text-white"
                    } ${isLoading ? "pointer-events-none" : ""}`}
                    title={isMinimized ? item.label : undefined}
                  >
                    <item.icon
                      size={16}
                      className={`${
                        isMinimized ? "" : "mr-3"
                      } flex-shrink-0 lg:w-5 lg:h-5`}
                      filled={isActive && !item.comingSoon}
                    />
                    {!isMinimized && (
                      <span
                        className={
                          isActive && !item.comingSoon ? "font-medium" : ""
                        }
                      >
                        {item.label}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section - RainbowKit Connect Wallet Button */}
        <div className="p-2 lg:p-4 flex-shrink-0 relative z-20">
          <WalletConnectButton isMinimized={isMinimized} />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F0F] border-t border-[#FFFFFF40] safe-area-bottom">
        <nav className="flex items-center justify-around px-2 py-3">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.comingSoon && pathname === "/dashboard/coming-soon");

            return (
              <button
                key={item.label}
                onClick={(e) => handleNavigation(item.href, item.comingSoon, e)}
                disabled={isLoading}
                className={`flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-lg transition-all duration-200 ${
                  isLoading ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <item.icon
                  size={20}
                  className={`mb-1 ${
                    isActive && !item.comingSoon
                      ? "text-[#E2AF19]"
                      : item.comingSoon
                      ? "text-gray-400"
                      : "text-[#EDEDED]"
                  }`}
                  filled={isActive && !item.comingSoon}
                />
                <span
                  className={`text-[10px] font-satoshi ${
                    isActive && !item.comingSoon
                      ? "text-[#E2AF19] font-medium"
                      : item.comingSoon
                      ? "text-gray-400"
                      : "text-[#EDEDED]"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Safe area for notched devices */
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        /* Optional: Add a subtle pulse animation to the arrow when minimized */
        @keyframes pulse-arrow {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(2px);
          }
        }

        .animate-pulse-arrow {
          animation: pulse-arrow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
