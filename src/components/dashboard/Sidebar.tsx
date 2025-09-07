// src/components/dashboard/Sidebar.tsx - UPDATED VERSION with Connect Wallet button
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
    icon: DashboardIcon, // You may want to add specific icons for these
    label: "Hiber",
    href: "/dashboard/coming-soon",
    comingSoon: true,
  },
  {
    icon: DashboardIcon, // You may want to add specific icons for these
    label: "Cipher",
    href: "/dashboard/coming-soon",
    comingSoon: true,
  },
  {
    icon: DashboardIcon, // You may want to add specific icons for these
    label: "Anchor",
    href: "/dashboard/coming-soon",
    comingSoon: true,
  },
  {
    icon: DashboardIcon, // You may want to add specific icons for these
    label: "InfluX",
    href: "/dashboard/coming-soon",
    comingSoon: true,
  },
  {
    icon: DashboardIcon, // You may want to add specific icons for these
    label: "Connect",
    href: "/dashboard/coming-soon",
    comingSoon: true,
  },
  {
    icon: FriendsIcon,
    label: "Friends",
    href: "/dashboard/friends",
    comingSoon: false,
  },
];

// Wallet Icon Component
const WalletIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
  >
    <path
      d="M15.1667 11.375H8.16675C7.68841 11.375 7.29175 10.9783 7.29175 10.5C7.29175 10.0217 7.68841 9.625 8.16675 9.625H15.1667C15.6451 9.625 16.0417 10.0217 16.0417 10.5C16.0417 10.9783 15.6451 11.375 15.1667 11.375Z"
      fill="black"
    />
    <path
      d="M22.2133 17.2667C20.4516 17.2667 18.9583 15.96 18.8183 14.28C18.725 13.3117 19.075 12.3667 19.775 11.6784C20.3583 11.0717 21.1866 10.7334 22.0616 10.7334H24.5C25.655 10.7684 26.5416 11.6783 26.5416 12.7983V15.2018C26.5416 16.3218 25.655 17.2317 24.535 17.2667H22.2133ZM24.4649 12.4834H22.0733C21.665 12.4834 21.2917 12.6351 21.0233 12.9151C20.685 13.2417 20.5216 13.685 20.5683 14.1284C20.6266 14.8984 21.3733 15.5167 22.2133 15.5167H24.5C24.6516 15.5167 24.7916 15.3768 24.7916 15.2018V12.7983C24.7916 12.6233 24.6516 12.4951 24.4649 12.4834Z"
      fill="black"
    />
    <path
      d="M18.6666 24.7918H8.16658C4.15325 24.7918 1.45825 22.0968 1.45825 18.0835V9.91683C1.45825 6.3235 3.67489 3.72184 7.11656 3.29017C7.43156 3.2435 7.79325 3.2085 8.16658 3.2085H18.6666C18.9466 3.2085 19.3082 3.22016 19.6816 3.27849C23.1232 3.67516 25.3749 6.2885 25.3749 9.91683V11.6085C25.3749 12.0868 24.9783 12.4835 24.4999 12.4835H22.0732C21.6649 12.4835 21.2916 12.6352 21.0233 12.9152L21.0116 12.9268C20.6849 13.2418 20.5333 13.6735 20.5683 14.1168C20.6266 14.8868 21.3732 15.5051 22.2132 15.5051H24.4999C24.9783 15.5051 25.3749 15.9018 25.3749 16.3801V18.0718C25.3749 22.0968 22.6799 24.7918 18.6666 24.7918ZM8.16658 4.9585C7.88659 4.9585 7.61824 4.98182 7.3499 5.01682C4.78324 5.34348 3.20825 7.21016 3.20825 9.91683V18.0835C3.20825 21.0935 5.15659 23.0418 8.16658 23.0418H18.6666C21.6766 23.0418 23.6249 21.0935 23.6249 18.0835V17.2668H22.2132C20.4516 17.2668 18.9583 15.9602 18.8183 14.2802C18.7249 13.3235 19.0749 12.3669 19.7749 11.6902C20.3816 11.0719 21.1982 10.7335 22.0732 10.7335H23.6249V9.91683C23.6249 7.18683 22.0266 5.30847 19.4366 5.00514C19.1566 4.95847 18.9116 4.9585 18.6666 4.9585H8.16658Z"
      fill="black"
    />
  </svg>
);

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

  const handleConnectWallet = () => {
    // Add your wallet connection logic here
    console.log("Connect wallet clicked");
    // You can dispatch an action to open wallet connection modal
    // or navigate to wallet connection page
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
            const isActive =
              pathname === item.href ||
              (item.comingSoon && pathname === "/dashboard/coming-soon");
            const isDisabled =
              !hasWallets && item.href !== "/dashboard" && !item.comingSoon;

            return (
              <button
                key={item.label}
                onClick={(e) => handleNavigation(item.href, item.comingSoon, e)}
                disabled={isLoading}
                className={`w-full flex items-center px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-all duration-200 font-satoshi text-xs lg:text-sm ${
                  isActive && !item.comingSoon
                    ? "bg-[#E2AF19] text-black font-medium"
                    : item.comingSoon
                    ? "text-gray-400 hover:bg-[#1C1C1C] cursor-pointer"
                    : isDisabled
                    ? "text-gray-500 cursor-not-allowed opacity-50"
                    : "text-[#EDEDED] hover:bg-[#2C2C2C] hover:text-white"
                } ${isLoading ? "pointer-events-none" : ""}`}
              >
                <item.icon
                  size={16}
                  className="mr-3 flex-shrink-0"
                  filled={isActive && !item.comingSoon}
                />
                <span
                  className={isActive && !item.comingSoon ? "font-medium" : ""}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section - Connect Wallet Button */}
      <div className="p-2 lg:p-4 flex-shrink-0 relative z-20">
        <button
          onClick={handleConnectWallet}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-3 py-1.5 rounded-[12px] bg-[#E2AF19] text-black font-medium font-satoshi text-xs transition-all duration-200 hover:bg-[#D4A118] active:bg-[#C69516] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <WalletIcon />
          <span className="ml-2">Connect Wallet</span>
        </button>
      </div>
    </div>
  );
}
