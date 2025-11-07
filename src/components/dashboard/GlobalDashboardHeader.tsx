// src/components/dashboard/GlobalDashboardHeader.tsx - UPDATED with Logout Modal
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  User,
  LogOut,
  ChevronDown,
  ArrowLeft,
  X,
  Search,
  Plus,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus, logoutUser } from "@/store/slices/authSlice";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { chains } from "@/components/wallet/WalletProvider";
import { useUnifiedDashboard } from "@/contexts/UnifiedDashboardContext";
import { clearWalletConnection } from "@/utils/walletCleanup";
import { useDisconnect } from "wagmi";
import LogoutModal from "@/components/modals/LogoutModal";

interface GlobalDashboardHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onSearchChange?: (query: string) => void;
  onAddTokenClick?: () => void;
  searchQuery?: string;
  onNewsSearch?: (query: string) => void;
  onNewsClearSearch?: () => void;
  onNewsAIClick?: () => void;
  newsSearchQuery?: string;
  onMobileMenuToggle?: () => void;
}

// Page title mapping based on pathname
const getPageTitle = (
  pathname: string
): { title: string; subtitle?: string } => {
  if (pathname.startsWith("/dashboard/tokenOverview/")) {
    return {
      title: "Token Overview",
      subtitle: "Detailed token analysis and metrics",
    };
  }

  switch (pathname) {
    case "/dashboard":
      return {
        title: "Portfolio",
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
    case "/dashboard/swap":
      return {
        title: "Swap",
        subtitle: "Make Swap Payments",
      };
    case "/dashboard/coin-lens":
      return {
        title: "CoinLens",
        subtitle: "Analyze Tokens",
      };
    case "/dashboard/news-feed":
      return {
        title: "MarketPulse",
        subtitle: "Latest crypto news and insights",
      };
    default:
      return {
        title: "Dashboard",
        subtitle: "Welcome back",
      };
  }
};

// Chain data with proper image paths
const getChainDisplayData = () => {
  const chainDisplayData: {
    [key: number]: {
      name: string;
      color: string;
      icon: string;
      image?: string;
      fallbackIcon: string;
      useBackground: boolean;
    };
  } = {
    1: {
      name: "Ethereum",
      color: "bg-blue-500",
      icon: "Ξ",
      image: "/chains/Ethereum.png",
      fallbackIcon: "Ξ",
      useBackground: false,
    },
    8453: {
      name: "Base",
      color: "bg-blue-600",
      icon: "B",
      image: "/chains/Base.png",
      fallbackIcon: "B",
      useBackground: false,
    },
    137: {
      name: "Polygon",
      color: "bg-purple-500",
      icon: "◆",
      image: "/chains/Polygon.png",
      fallbackIcon: "◆",
      useBackground: false,
    },
    43114: {
      name: "Avalanche",
      color: "bg-red-500",
      icon: "A",
      image: "/chains/Avalanche.png",
      fallbackIcon: "A",
      useBackground: true,
    },
    42161: {
      name: "Arbitrum",
      color: "bg-blue-400",
      icon: "◉",
      image: "/chains/Arbitrum.png",
      fallbackIcon: "◉",
      useBackground: false,
    },
    56: {
      name: "BSC",
      color: "bg-yellow-500",
      icon: "B",
      image: "/chains/BSC.png",
      fallbackIcon: "B",
      useBackground: true,
    },
    solana: {
      name: "Solana",
      color: "bg-gradient-to-r from-purple-500 to-blue-500",
      icon: "◎",
      image: "/chains/Solana.png",
      fallbackIcon: "◎",
      useBackground: false,
    },
  };

  return chainDisplayData;
};

// Image cache and preload system
const imageCache = new Map<string, boolean>();

const preloadImage = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (imageCache.has(src)) {
      resolve(imageCache.get(src) || false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.set(src, true);
      resolve(true);
    };
    img.onerror = () => {
      imageCache.set(src, false);
      resolve(false);
    };
    img.src = src;
  });
};

// Chain Icon Component
interface ChainIconProps {
  chainData: {
    name: string;
    color: string;
    icon: string;
    image?: string;
    fallbackIcon: string;
    useBackground: boolean;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ChainIcon = ({
  chainData,
  size = "md",
  className = "",
}: ChainIconProps) => {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(
    () => {
      if (chainData.image && imageCache.has(chainData.image)) {
        return imageCache.get(chainData.image) ? "loaded" : "error";
      }
      return "loading";
    }
  );

  const mountedRef = useRef(true);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6 lg:w-7 lg:h-7",
    lg: "w-7 h-7 lg:w-8 lg:h-8",
  };

  useEffect(() => {
    mountedRef.current = true;

    if (chainData.image && imageCache.has(chainData.image)) {
      const cached = imageCache.get(chainData.image);
      setImageState(cached ? "loaded" : "error");
      return;
    }

    if (chainData.image) {
      preloadImage(chainData.image).then((success) => {
        if (mountedRef.current) {
          setImageState(success ? "loaded" : "error");
        }
      });
    } else {
      setImageState("error");
    }

    return () => {
      mountedRef.current = false;
    };
  }, [chainData.image]);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
      style={{
        opacity: imageState === "loading" ? 0 : 1,
        transition: "opacity 0.15s ease-in",
      }}
    >
      {imageState === "loaded" && chainData.image && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className="w-full h-full object-contain p-1"
          draggable={false}
          style={{ userSelect: "none", pointerEvents: "none" }}
        />
      )}

      {imageState === "error" && (
        <div
          className={`${chainData.color} w-full h-full flex items-center justify-center absolute inset-0`}
        >
          <span className="text-white text-xs font-bold font-satoshi">
            {chainData.fallbackIcon}
          </span>
        </div>
      )}
    </div>
  );
};

export default function GlobalDashboardHeader({
  title: propTitle,
  subtitle: propSubtitle,
  children,
  onSearchChange,
  onAddTokenClick,
  searchQuery = "",
  onNewsSearch,
  onNewsClearSearch,
  onNewsAIClick,
  newsSearchQuery = "",
  onMobileMenuToggle,
}: GlobalDashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isAuthenticated,
    loading: authLoading,
    user,
  } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  const { setComponentLoaded } = useUnifiedDashboard();
  const hasReportedRef = useRef(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const currentChain = chains.find((c) => c.id === chainId);
  const { disconnect } = useDisconnect();

  const {
    switchChain,
    isPending: isSwitchingChain,
    error: wagmiSwitchError,
  } = useSwitchChain({
    mutation: {
      onError: (error, variables) => {
        console.error("🚨 Chain switch error details:", {
          error: error.message,
          errorName: error.name,
          errorCode: (error as any).code,
          targetChain: variables.chainId,
          currentChain: chainId,
          stackTrace: error.stack,
          fullError: error,
        });
        setSwitchingChain(null);
        setSwitchError(error.message || "Failed to switch chain");
      },
      onSuccess: (data, variables) => {
        console.log("✅ Chain switched successfully:", {
          newChain: data.name,
          chainId: data.id,
          targetChain: variables.chainId,
          previousChain: chainId,
        });
        setSwitchingChain(null);
        setChainSelectorOpen(false);
        setSwitchError(null);
      },
      onMutate: (variables) => {
        console.log("🔄 Starting chain switch:", {
          targetChain: variables.chainId,
          currentChain: chainId,
        });
        setSwitchError(null);
      },
    },
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chainSelectorOpen, setChainSelectorOpen] = useState(false);
  const [switchingChain, setSwitchingChain] = useState<number | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [localNewsSearch, setLocalNewsSearch] = useState("");
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const authChecked = useRef(false);
  const chainSelectorRef = useRef<HTMLDivElement>(null);

  const isTokenOverviewPage = pathname.startsWith("/dashboard/tokenOverview/");
  const isCoinLensPage = pathname === "/dashboard/coin-lens";
  const isNewsFeedPage = pathname === "/dashboard/news-feed";
  const isPortfolioPage = pathname === "/dashboard";
  const isAIChatPage = pathname === "/dashboard/ai-chat";

  // Hide header completely on mobile for token overview page
  if (
    isTokenOverviewPage &&
    typeof window !== "undefined" &&
    window.innerWidth < 1024
  ) {
    return null;
  }

  const pageInfo = getPageTitle(pathname);
  const displayTitle = propTitle !== "Dashboard" ? propTitle : pageInfo.title;
  const displaySubtitle =
    propSubtitle !== "Welcome back" ? propSubtitle : pageInfo.subtitle;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const chainDisplayData = getChainDisplayData();

    const preloadAllChainImages = async () => {
      const images = Object.values(chainDisplayData)
        .map((data) => data.image)
        .filter(Boolean) as string[];

      console.log("🔄 GlobalDashboardHeader: Preloading chain images");
      await Promise.all(images.map((src) => preloadImage(src)));
      console.log("✅ GlobalDashboardHeader: All chain images preloaded");
    };

    preloadAllChainImages();
  }, []);

  useEffect(() => {
    if (!hasReportedRef.current) {
      console.log("✅ GlobalDashboardHeader: Component mounted and ready");
      setComponentLoaded("globalHeader");
      hasReportedRef.current = true;
    }

    return () => {
      hasReportedRef.current = false;
    };
  }, [setComponentLoaded]);

  useEffect(() => {
    if (!authChecked.current && !isAuthenticated && !authLoading) {
      authChecked.current = true;
      dispatch(checkAuthStatus());
    }
  }, [dispatch, isAuthenticated, authLoading]);

  useEffect(() => {
    return () => {
      setSwitchError(null);
      setSwitchingChain(null);
    };
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setSwitchError(null);
      setSwitchingChain(null);
      setChainSelectorOpen(false);
    }
  }, [isConnected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chainSelectorRef.current &&
        !chainSelectorRef.current.contains(event.target as Node)
      ) {
        setChainSelectorOpen(false);
      }
    };

    if (chainSelectorOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [chainSelectorOpen]);

  useEffect(() => {
    setLocalNewsSearch(newsSearchQuery);
  }, [newsSearchQuery]);

  const handleBackClick = () => {
    router.back();
  };

  const handleProfileClick = () => {
    router.push("/dashboard/profile");
  };

  const handleLogoutClick = () => {
    setLogoutModalOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Close modal immediately and prevent reopening
      setLogoutModalOpen(false);

      // Small delay to let modal close animation complete
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (isConnected && address) {
        console.log("🔌 Silently disconnecting wallet before logout...");
        disconnect();
        clearWalletConnection();
      }

      if (typeof window !== "undefined") {
        localStorage.clear();
      }
      await dispatch(logoutUser());
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      setLogoutModalOpen(false);
      router.push("/auth");
    }
  };

  const handleChainSwitch = async (targetChainId: number) => {
    if (!mounted) {
      console.warn("⚠️ Component not mounted, skipping chain switch");
      setSwitchError("Please wait for the page to load completely");
      return;
    }

    if (!switchChain) {
      console.warn("⚠️ switchChain function not available");
      setSwitchError("Chain switching not supported by current wallet");
      return;
    }

    if (!isConnected || !address) {
      console.log("⚠️ Wallet not connected, cannot switch chain");
      setSwitchError("Please connect your wallet first");
      return;
    }

    if (chainId === targetChainId) {
      console.log("ℹ️ Already on target chain:", targetChainId);
      setChainSelectorOpen(false);
      return;
    }

    if (isSwitchingChain || switchingChain) {
      console.log("⚠️ Chain switch already in progress");
      setSwitchError("Chain switch already in progress");
      return;
    }

    console.log(`🔄 Initiating chain switch to ${targetChainId}`);
    setSwitchingChain(targetChainId);
    setSwitchError(null);

    try {
      switchChain({ chainId: targetChainId });
      console.log(`✅ Chain switch to ${targetChainId} initiated successfully`);
    } catch (error: any) {
      console.error(`❌ Chain switch to ${targetChainId} failed:`, error);

      let userMessage = "Failed to switch chain";

      if (error.message?.includes("timeout")) {
        userMessage = "Chain switch timed out. Please try again.";
      } else if (
        error.message?.includes("rejected") ||
        error.message?.includes("denied")
      ) {
        userMessage = "Chain switch was cancelled by user";
      } else if (error.message?.includes("Unrecognized chain")) {
        userMessage = "This chain is not supported by your wallet";
      } else if (error.message?.includes("does not support")) {
        userMessage = "Your wallet doesn't support this chain";
      } else if (error.code === 4902) {
        userMessage = "Chain not added to wallet. Please add it manually.";
      } else if (error.code === -32603) {
        userMessage = "Wallet internal error. Please try again.";
      } else if (error.message) {
        userMessage = error.message;
      }

      setSwitchError(userMessage);
      setSwitchingChain(null);
    }
  };

  const handleNewsSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localNewsSearch.trim() && onNewsSearch) {
      onNewsSearch(localNewsSearch.trim());
    }
  };

  const chainDisplayData = getChainDisplayData();

  const getCurrentChainDisplay = () => {
    if (mounted && isConnected && chainId && chainDisplayData[chainId]) {
      return chainDisplayData[chainId];
    }

    return (
      chainDisplayData[1] || {
        name: "Ethereum",
        color: "bg-blue-500",
        icon: "Ξ",
        image: "/chains/Ethereum.png",
        fallbackIcon: "Ξ",
        useBackground: true,
      }
    );
  };

  const currentChainDisplay = getCurrentChainDisplay();

  if (!isAuthenticated) {
    return null;
  }

  const showWalletInfo = mounted && isConnected && address;

  return (
    <>
      {/* Global Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-0 flex-shrink-0 gap-3 sm:gap-0 px-1 py-2 lg:px-0 lg:py-0">
        {/* Left section - conditional rendering based on page */}
        <div
          className={`${
            isCoinLensPage || isNewsFeedPage ? "hidden lg:hidden" : "flex-1"
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Icon - Shows on all pages on mobile */}
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors flex-shrink-0"
              title="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="20"
                viewBox="0 0 29 20"
                fill="none"
              >
                <path
                  d="M2 2H27.3521"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
                <path
                  d="M2 10H19"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
                <path
                  d="M2 18H13"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Back button - shows on token overview page */}
            {isTokenOverviewPage && (
              <button
                onClick={handleBackClick}
                className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors flex-shrink-0"
                title="Go back"
              >
                <ArrowLeft size={17} className="text-white" />
              </button>
            )}

            {/* Portfolio Title - Only show on Portfolio page on desktop */}
            {isPortfolioPage && (
              <h1 className="hidden lg:block text-white text-lg lg:text-[25px] font-mayeka font-semibold">
                {displayTitle}
              </h1>
            )}
          </div>
        </div>

        {/* Mobile only: Hamburger + Title for CoinLens */}
        {isCoinLensPage && (
          <div className="flex lg:hidden items-center gap-3 flex-1">
            <button
              onClick={onMobileMenuToggle}
              className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors flex-shrink-0"
              title="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="20"
                viewBox="0 0 29 20"
                fill="none"
              >
                <path
                  d="M2 2H27.3521"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
                <path
                  d="M2 10H19"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
                <path
                  d="M2 18H13"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h1 className="text-white text-lg font-mayeka font-semibold">
              CoinLens
            </h1>
          </div>
        )}

        {/* Mobile only: Hamburger + Title for NewsFeed */}
        {isNewsFeedPage && (
          <div className="flex lg:hidden items-center gap-3 flex-1">
            <button
              onClick={onMobileMenuToggle}
              className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors flex-shrink-0"
              title="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="20"
                viewBox="0 0 29 20"
                fill="none"
              >
                <path
                  d="M2 2H27.3521"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
                <path
                  d="M2 10H19"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
                <path
                  d="M2 18H13"
                  stroke="white"
                  strokeWidth="2.11268"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h1 className="text-white text-lg font-mayeka font-semibold">
              MarketPulse
            </h1>
          </div>
        )}

        {/* CoinLens Search Bar - Desktop Only (Full Width) */}
        {isCoinLensPage && (
          <div className="hidden lg:flex flex-1 relative mr-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tokens or paste address"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-black border border-[#2C2C2C] rounded-xl pl-12 pr-14 py-3 text-gray-300 text-sm font-satoshi placeholder-gray-600 focus:outline-none focus:border-[#E2AF19] transition-colors"
            />
            <button
              onClick={onAddTokenClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#E2AF19] hover:bg-[#D4A853] p-2 rounded-lg transition-colors"
              title="Add Tokens"
            >
              <Plus className="w-4 h-4 text-black" />
            </button>
          </div>
        )}

        {/* News Feed Search Bar - Desktop Only (Full Width) */}
        {isNewsFeedPage && (
          <form
            onSubmit={handleNewsSearchSubmit}
            className="hidden lg:flex flex-1 gap-2 mr-4"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search crypto news..."
                value={localNewsSearch}
                onChange={(e) => setLocalNewsSearch(e.target.value)}
                className="w-full border border-[#2C2C2C] rounded-[10px] px-4 py-3 pl-10 pr-10 text-white text-[14px] placeholder:text-[#666666] focus:outline-none focus:border-[#F7B410] transition-colors bg-black"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              {newsSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalNewsSearch("");
                    onNewsClearSearch?.();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#2C2C2C] rounded-full transition-colors"
                  title="Clear search"
                >
                  <X
                    size={16}
                    className="text-[#666666] hover:text-[#F7B410]"
                  />
                </button>
              )}
            </div>

            {/* AI Button */}
            <button
              type="button"
              onClick={onNewsAIClick}
              className="px-6 py-3 border border-[#2C2C2C] rounded-[10px] text-white text-[14px] font-medium bg-[#F7B410] hover:from-[#D4A853] hover:to-[#E2AF19] transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 29 29"
                fill="none"
              >
                <path
                  d="M8.04157 4.81315C7.3544 4.81295 6.67954 4.99549 6.08616 5.34206C5.49279 5.68862 5.00224 6.18674 4.66481 6.78536C4.32738 7.38398 4.15521 8.06156 4.16594 8.74865C4.17667 9.43573 4.36991 10.1076 4.72587 10.6954C3.84177 10.8662 3.04473 11.3395 2.47159 12.034C1.89844 12.7285 1.58496 13.6009 1.58496 14.5013C1.58496 15.4017 1.89844 16.2741 2.47159 16.9686C3.04473 17.6631 3.84177 18.1364 4.72587 18.3072M8.04157 4.81315C8.04157 3.95672 8.38179 3.13537 8.98737 2.52979C9.59296 1.9242 10.4143 1.58398 11.2707 1.58398C12.1272 1.58398 12.9485 1.9242 13.5541 2.52979C14.1597 3.13537 14.4999 3.95672 14.4999 4.81315M8.04157 4.81315C8.04157 5.86973 8.5492 6.80748 9.33324 7.39648M4.72587 18.3072C4.37024 18.895 4.17726 19.5667 4.16671 20.2536C4.15615 20.9405 4.32838 21.6178 4.66577 22.2163C5.00316 22.8147 5.49358 23.3126 6.08677 23.6591C6.67996 24.0056 7.3546 24.1882 8.04157 24.1882C8.04157 25.0446 8.38179 25.8659 8.98737 26.4715C9.59296 27.0771 10.4143 27.4173 11.2707 27.4173C12.1272 27.4173 12.9485 27.0771 13.5541 26.4715C14.1597 25.8659 14.4999 25.0446 14.4999 24.1882M4.72587 18.3072C5.18942 17.5398 5.90473 16.9569 6.74991 16.6577M14.4999 4.81315V24.1882M14.4999 4.81315C14.4999 3.95672 14.8401 3.13537 15.4457 2.52979C16.0513 1.9242 16.8726 1.58398 17.7291 1.58398C18.5855 1.58398 19.4069 1.9242 20.0124 2.52979C20.618 3.13537 20.9582 3.95672 20.9582 4.81315C21.6452 4.81309 22.3199 4.99567 22.913 5.34216C23.5062 5.68866 23.9966 6.18663 24.334 6.78505C24.6714 7.38346 24.8437 8.06082 24.8331 8.74771C24.8226 9.43461 24.6296 10.1063 24.2739 10.6941M14.4999 24.1882C14.4999 25.0446 14.8401 25.8659 15.4457 26.4715C16.0513 27.0771 16.8726 27.4173 17.7291 27.4173C18.5855 27.4173 19.4069 27.0771 20.0124 26.4715C20.618 25.8659 20.9582 25.0446 20.9582 24.1882M20.9582 24.1882C21.6454 24.1883 22.3203 24.0058 22.9136 23.6592C23.507 23.3127 23.9976 22.8146 24.335 22.2159C24.6724 21.6173 24.8446 20.9397 24.8339 20.2527C24.8231 19.5656 24.6299 18.8937 24.2739 18.3059C25.158 18.1351 25.9551 17.6618 26.5282 16.9673C27.1014 16.2728 27.4149 15.4005 27.4149 14.5C27.4149 13.5996 27.1014 12.7272 26.5282 12.0327C25.9551 11.3382 25.158 10.8649 24.2739 10.6941M20.9582 24.1882C20.9582 23.1316 20.4506 22.1938 19.6666 21.6048M24.2739 10.6941C23.8104 11.4615 23.0951 12.0445 22.2499 12.3436"
                  stroke="black"
                  strokeWidth="1.9375"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-mayeka text-black">Pulse</span>
            </button>
          </form>
        )}

        {/* Hide wallet/notifications/icons on AI Chat page (all screens), and on CoinLens/NewsFeed pages (desktop only) */}
        <div
          className={`flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4 ${
            isNewsFeedPage ? "hidden lg:hidden" : ""
          } ${isAIChatPage ? "hidden" : ""} ${
            isCoinLensPage ? "hidden lg:flex" : ""
          }`}
        >
          {/* Wallet Display */}
          {showWalletInfo && !isCoinLensPage && (
            <div className="relative" ref={chainSelectorRef}>
              <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2.5 lg:px-3 py-1.5 lg:py-2 w-full sm:w-auto sm:min-w-[180px] lg:min-w-[200px] gap-1.5">
                <div className="flex items-center flex-1 min-w-0 bg-[#0F0F0F] rounded-[100px] p-[4px] mr-2">
                  <ChainIcon
                    chainData={currentChainDisplay}
                    size="md"
                    className="mr-2 lg:mr-2.5"
                  />

                  <div className="flex-1 min-w-0">
                    <span className="text-white text-xs sm:text-xs font-satoshi mr-1.5 min-w-0 truncate block">
                      {currentChainDisplay.name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setChainSelectorOpen(!chainSelectorOpen)}
                  className="flex items-center hover:opacity-80 transition-opacity"
                  disabled={!mounted}
                >
                  <span className="text-[#EDEDED] text-xs font-satoshi italic mr-1.5 lg:mr-2 hidden sm:block truncate">
                    {address
                      ? `${address.slice(0, 6)}...${address.slice(-4)}`
                      : ""}
                  </span>

                  <ChevronDown
                    size={12}
                    className={`text-gray-400 lg:w-3 lg:h-3 transition-transform ${
                      chainSelectorOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Chain Selector Dropdown */}
              {chainSelectorOpen && mounted && isConnected && (
                <>
                  <div
                    className="fixed inset-0 z-30 bg-black/20"
                    onClick={() => setChainSelectorOpen(false)}
                  />

                  <div className="absolute top-full right-0 mt-2 w-64 bg-black border border-[#2C2C2C] rounded-[28px] shadow-2xl z-40 overflow-hidden">
                    <div className="flex items-center justify-between p-3">
                      <button
                        onClick={() => setChainSelectorOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <h3 className="text-white font-semibold text-sm font-satoshi absolute left-1/2 transform -translate-x-1/2">
                        Select Chain
                      </h3>
                    </div>

                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                      <div className="p-2 space-y-1">
                        {chains.map((chain) => {
                          const chainDisplay = chainDisplayData[chain.id] || {
                            name: chain.name,
                            color: "bg-gray-500",
                            icon: chain.name.charAt(0),
                            fallbackIcon: chain.name.charAt(0),
                            useBackground: true,
                          };

                          const isCurrentChain = chainId === chain.id;
                          const isSwitching = switchingChain === chain.id;

                          return (
                            <button
                              key={chain.id}
                              onClick={() => handleChainSwitch(chain.id)}
                              disabled={
                                isSwitching || !isConnected || isSwitchingChain
                              }
                              className={`w-full flex items-center justify-between p-2.5 rounded-[8px] transition-all hover:bg-[#1A1A1A] ${
                                !isConnected
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              } ${isSwitching ? "opacity-70" : ""}`}
                            >
                              <div className="flex items-center">
                                <ChainIcon
                                  chainData={chainDisplay}
                                  size="lg"
                                  className="mr-2.5"
                                />

                                <span
                                  className={`text-sm font-satoshi ${
                                    isCurrentChain
                                      ? "text-[#E2AF19]"
                                      : "text-white"
                                  }`}
                                >
                                  {chainDisplay.name}
                                  {isSwitching && (
                                    <span className="ml-2 text-xs">
                                      (Switching...)
                                    </span>
                                  )}
                                </span>
                              </div>

                              <div
                                className={`w-10 h-5 rounded-full transition-colors relative ${
                                  isCurrentChain
                                    ? "bg-[#E2AF19]"
                                    : "bg-[#2C2C2C]"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                                    isCurrentChain
                                      ? "translate-x-5"
                                      : "translate-x-0.5"
                                  }`}
                                >
                                  {isSwitching && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-2.5 h-2.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {switchError && (
                      <div className="p-3 bg-red-900/20 border-t border-red-500/50">
                        <div className="flex items-start">
                          <div className="w-4 h-4 bg-red-500 rounded-full mr-2 mt-0.5 flex-shrink-0">
                            <span className="text-white text-xs flex items-center justify-center w-full h-full">
                              !
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-red-400 text-xs font-satoshi font-medium mb-1">
                              Chain Switch Failed
                            </p>
                            <p className="text-red-300 text-xs font-satoshi">
                              {switchError}
                            </p>
                            <button
                              onClick={() => setSwitchError(null)}
                              className="text-red-400 hover:text-red-300 text-xs font-satoshi underline mt-1"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Icons Container */}
          <div className="flex items-center space-x-2 relative">
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-1.5 lg:px-2 py-1.5 lg:py-2">
              {/* Profile Icon - Show on desktop for Dashboard and CoinLens */}
              {(isPortfolioPage || isCoinLensPage) && (
                <button className="hidden lg:block p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full">
                  <User size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                </button>
              )}

              {/* Divider after Profile */}
              {isCoinLensPage && (
                <div className="hidden lg:block w-px h-2.5 lg:h-3 bg-[#2C2C2C] mx-1 lg:mx-1.5"></div>
              )}

              {/* Notifications Icon - Show on desktop for Dashboard and CoinLens */}
              {isCoinLensPage && (
                <button className="hidden lg:block p-1 lg:p-1.5 transition-colors hover:bg-[#2C2C2C] rounded-full">
                  <Bell size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                </button>
              )}

              {/* Divider before Logout - Show on desktop for Dashboard only */}
              {isPortfolioPage && (
                <div className="hidden lg:block w-px h-2.5 lg:h-3 bg-[#2C2C2C] mx-1 lg:mx-1.5"></div>
              )}

              {/* Logout Icon - Show on mobile for all pages, desktop only for Dashboard */}
              {(isPortfolioPage || !isCoinLensPage) && (
                <button
                  onClick={handleLogoutClick}
                  className={`p-1 lg:p-1.5 transition-colors hover:bg-red-900/20 rounded-full ${
                    isCoinLensPage ? "lg:hidden" : ""
                  }`}
                >
                  <LogOut
                    size={14}
                    className="text-gray-400 hover:text-red-400 lg:w-4 lg:h-4"
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {children}

      {/* Logout Modal */}
      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f0f0f;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2c2c2c;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #404040;
        }
      `}</style>
    </>
  );
}
