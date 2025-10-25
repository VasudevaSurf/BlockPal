// src/components/dashboard/Sidebar.tsx - COMPLETE UPDATED CODE
"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RootState } from "@/store";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import DashboardIcon from "@/components/icons/DashboardIcon";
import AII1con from "@/components/icons/AII1con";
import WalletConnectButton from "@/components/wallet/WalletConnectButton";
import SwapIcon from "../icons/SwapIcon";
import CoinLensIcon from "@/components/icons/CoinLensIcon";
import NewsFeedIcon from "../icons/NewsFeedIcon";

const menuItems = [
  {
    icon: DashboardIcon,
    label: "Portfolio",
    href: "/dashboard",
    comingSoon: false,
  },
  {
    icon: SwapIcon,
    label: "Swap",
    href: "/dashboard/swap",
    comingSoon: false,
  },
  {
    icon: CoinLensIcon,
    label: "CoinLens",
    href: "/dashboard/coin-lens",
    comingSoon: false,
  },
  {
    icon: AII1con,
    label: "Lumen",
    href: "/dashboard/ai-chat",
    comingSoon: false,
  },
  {
    icon: NewsFeedIcon,
    label: "MarketPulse",
    href: "/dashboard/news-feed",
    comingSoon: false,
  },
];

interface SidebarProps {
  onItemClick?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({
  onItemClick,
  isMobile = false,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, startLoading } = useNavigationLoading();

  // State for sidebar minimization (desktop only)
  const [isMinimized, setIsMinimized] = useState(false);

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
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-[#0F0F0F] border-r border-[#FFFFFF40] h-full overflow-hidden transition-all duration-300 ease-in-out ${
          isMobile
            ? "w-64" // Mobile: Always full width, never minimized
            : isMinimized
            ? "w-16 lg:w-20" // Desktop: Minimized width
            : "w-full lg:w-64" // Desktop: Full width
        }`}
      >
        {/* Logo Section */}
        <div
          className={`flex-shrink-0 relative z-20 ${
            isMobile ? "p-6 mt-4" : "p-3 lg:p-6"
          }`}
        >
          <div className="flex items-center justify-between">
            {isMobile ? (
              /* Mobile: Only show full logo, no minimize button */
              <img
                src="/blockName.png"
                alt="Blockpal"
                className="brightness-110 h-6"
                style={{
                  width: "auto",
                }}
              />
            ) : isMinimized ? (
              /* Desktop Minimized: Mini Logo and arrow */
              <div className="w-full flex flex-col items-center gap-2">
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
              /* Desktop Expanded: Full logo and arrow */
              <>
                <img
                  src="/blockName.png"
                  alt="Blockpal"
                  className="brightness-110 h-5 lg:h-6"
                  style={{
                    width: "auto",
                  }}
                />

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
            className={`space-y-2 mb-6 ${
              isMobile ? "px-4 mt-4" : isMinimized ? "px-2" : "px-2 lg:px-4"
            }`}
          >
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.comingSoon && pathname === "/dashboard/coming-soon");

              return (
                <div
                  key={item.label}
                  className={
                    isMobile
                      ? "nav-item-wrapper -mr-4"
                      : "nav-item-wrapper -mr-2 lg:-mr-4"
                  }
                >
                  <button
                    onClick={(e) =>
                      handleNavigation(item.href, item.comingSoon, e)
                    }
                    disabled={isLoading}
                    className={`w-full flex items-center text-left transition-all duration-200 font-satoshi ${
                      isMobile
                        ? "px-4 py-3 text-sm rounded-l-lg" // Mobile: rounded-l-lg for left-side border radius only
                        : isMinimized
                        ? "pl-[18px] lg:pl-[22px] pr-4 lg:pr-6 py-2 lg:py-3 text-xs lg:text-sm rounded-l-lg"
                        : "px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm rounded-l-lg"
                    } ${
                      isActive && !item.comingSoon
                        ? "bg-[#E2AF19] text-black font-medium"
                        : item.comingSoon
                        ? "text-gray-400 hover:bg-[#1C1C1C] cursor-pointer"
                        : "text-[#EDEDED] hover:bg-[#2C2C2C] hover:text-white"
                    } ${isLoading ? "pointer-events-none" : ""}`}
                    title={isMobile || !isMinimized ? undefined : item.label}
                  >
                    <item.icon
                      size={isMobile ? 20 : 16}
                      className={`${
                        isMobile || !isMinimized ? "mr-3" : ""
                      } flex-shrink-0 lg:w-5 lg:h-5`}
                      filled={isActive && !item.comingSoon}
                    />
                    {(isMobile || !isMinimized) && (
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

        {/* Bottom Section - Wallet Connect Button (Desktop Only) */}
        {!isMobile && (
          <div className="p-2 lg:p-4 flex-shrink-0 relative z-20">
            <WalletConnectButton isMinimized={isMinimized} />
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
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
