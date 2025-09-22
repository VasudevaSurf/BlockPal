// src/components/dashboard/Sidebar.tsx - Updated with animated arrow toggle
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

const menuItems = [
  {
    icon: DashboardIcon,
    label: "Portfolio",
    href: "/dashboard",
    comingSoon: false,
  },
  {
    icon: ScheduleIcon,
    label: "LoopX",
    href: "/dashboard/scheduled-payments",
    comingSoon: false,
  },
  {
    icon: BatchIcon,
    label: "Cluster",
    href: "/dashboard/batch-payments",
    comingSoon: false,
  },
  {
    icon: AIIcon,
    label: "Lumen AI",
    href: "/dashboard/ai-chat",
    comingSoon: false,
  },
  {
    icon: FriendsIcon,
    label: "Friends",
    href: "/dashboard/friends",
    comingSoon: false,
  },
  {
    icon: SwapIcon,
    label: "Swap",
    href: "/dashboard/swap",
    comingSoon: false,
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

  // State for sidebar minimization
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
    <div
      className={`relative flex flex-col bg-black border border-[#2C2C2C] h-full overflow-hidden transition-all duration-300 ease-in-out ${
        isMinimized ? "w-16 lg:w-20" : "w-full lg:w-64"
      }`}
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
        <div className="flex items-center justify-between">
          {isMinimized ? (
            /* Mini Logo and arrow when minimized */
            <div className="w-full flex flex-col items-center gap-2">
              {/* <img
                src="/minLogo.png"
                alt="Blockpal Mini"
                className="brightness-110 h-6 lg:h-8"
                style={{
                  width: "auto",
                }}
              /> */}

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
      <div className="flex-1 px-2 lg:px-4 overflow-y-auto relative z-20 scrollbar-hide">
        <nav className="space-y-1 lg:space-y-2 mb-4 lg:mb-6">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.comingSoon && pathname === "/dashboard/coming-soon");

            return (
              <button
                key={item.label}
                onClick={(e) => handleNavigation(item.href, item.comingSoon, e)}
                disabled={isLoading}
                className={`w-full flex items-center rounded-lg text-left transition-all duration-200 font-satoshi text-xs lg:text-sm ${
                  isMinimized
                    ? "px-2 lg:px-3 py-2 lg:py-3 justify-center"
                    : "px-3 lg:px-4 py-2 lg:py-3"
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
                  className={`${isMinimized ? "" : "mr-3"} flex-shrink-0`}
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
            );
          })}
        </nav>
      </div>

      {/* Bottom Section - RainbowKit Connect Wallet Button */}
      <div className="p-2 lg:p-4 flex-shrink-0 relative z-20">
        <WalletConnectButton isMinimized={isMinimized} />
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
    </div>
  );
}
