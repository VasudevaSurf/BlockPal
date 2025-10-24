// src/components/dashboard/MobileBottomNav.tsx - BOTTOM NAV WITHOUT OVERLAYING CONTENT
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import DashboardIcon from "@/components/icons/DashboardIcon";
import SwapIcon from "@/components/icons/SwapIcon";
import CoinLensIcon from "@/components/icons/CoinLensIcon";
import AII1con from "@/components/icons/AII1con";
import NewsFeedIcon from "@/components/icons/NewsFeedIcon";

const navItems = [
  {
    icon: DashboardIcon,
    label: "Portfolio",
    href: "/dashboard",
  },
  {
    icon: SwapIcon,
    label: "Swap",
    href: "/dashboard/swap",
  },
  {
    icon: CoinLensIcon,
    label: "CoinLens",
    href: "/dashboard/coin-lens",
  },
  {
    icon: AII1con,
    label: "Lumen",
    href: "/dashboard/ai-chat",
  },
  {
    icon: NewsFeedIcon,
    label: "Pulse",
    href: "/dashboard/news-feed",
  },
];

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, startLoading } = useNavigationLoading();

  const handleNavigation = (href: string) => {
    if (isLoading || pathname === href) return;

    startLoading();
    setTimeout(() => {
      router.push(href);
    }, 100);
  };

  return (
    <nav className="lg:hidden bg-[#0F0F0F] border-t border-[#2C2C2C] flex-shrink-0">
      <div className="flex items-center justify-around px-2 py-2.5 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              disabled={isLoading}
              className={`flex flex-col items-center justify-center min-w-[60px] py-1.5 px-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-[#E2AF19] text-black"
                  : "text-[#EDEDED] active:bg-[#2C2C2C]"
              } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <item.icon size={20} className="mb-0.5" filled={isActive} />
              <span
                className={`text-[10px] font-satoshi font-medium ${
                  isActive ? "text-black" : "text-[#EDEDED]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
