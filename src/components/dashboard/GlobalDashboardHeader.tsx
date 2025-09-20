// src/components/dashboard/GlobalDashboardHeader.tsx - UPDATED with chain images
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { Bell, User, LogOut, ChevronDown, ArrowLeft, X } from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { checkAuthStatus, logoutUser } from "@/store/slices/authSlice";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { chains } from "@/components/wallet/WalletProvider";

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
    case "/dashboard/swap":
      return {
        title: "Swap",
        subtitle: "Make Swap Payments",
      };
    default:
      return {
        title: "Dashboard",
        subtitle: "Welcome back",
      };
  }
};

// UPDATED: Chain data with proper image paths and conditional background colors
const getChainDisplayData = () => {
  const chainDisplayData: {
    [key: number]: {
      name: string;
      color: string;
      icon: string;
      image?: string;
      fallbackIcon: string;
      useBackground: boolean; // New property to control background usage
    };
  } = {
    1: {
      name: "Ethereum",
      color: "bg-blue-500",
      icon: "Ξ",
      image: "/chains/Ethereum.png",
      fallbackIcon: "Ξ",
      useBackground: true, // Ethereum keeps background
    },
    8453: {
      name: "Base",
      color: "bg-blue-600",
      icon: "B",
      image: "/chains/Base.png",
      fallbackIcon: "B",
      useBackground: false, // Base no background
    },
    137: {
      name: "Polygon",
      color: "bg-purple-500",
      icon: "◆",
      image: "/chains/Polygon.png",
      fallbackIcon: "◆",
      useBackground: false, // Polygon no background
    },
    43114: {
      name: "Avalanche",
      color: "bg-red-500",
      icon: "A",
      image: "/chains/Avalanche.png",
      fallbackIcon: "A",
      useBackground: true, // Avalanche keeps background
    },
    42161: {
      name: "Arbitrum",
      color: "bg-blue-400",
      icon: "◉",
      image: "/chains/Arbitrum.png",
      fallbackIcon: "◉",
      useBackground: false, // Arbitrum no background
    },
    56: {
      name: "BSC",
      color: "bg-yellow-500",
      icon: "B",
      image: "/chains/BSC.png",
      fallbackIcon: "B",
      useBackground: true, // BSC keeps background
    },
  };

  return chainDisplayData;
};

// Chain Icon Component with image support and conditional background
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
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6 lg:w-7 lg:h-7",
    lg: "w-7 h-7",
  };

  const iconSizes = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
  };

  // Reset image error state when chainData changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [chainData.image]);

  const handleImageError = () => {
    console.warn(`Failed to load chain image: ${chainData.image}`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Determine if we should show background
  const shouldShowBackground =
    !chainData.image || imageError || !imageLoaded || chainData.useBackground;
  const backgroundClass = shouldShowBackground ? chainData.color : "";

  return (
    <div
      className={`${sizeClasses[size]} ${backgroundClass} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
    >
      {/* Chain Image */}
      {chainData.image && !imageError && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          } ${!chainData.useBackground && imageLoaded ? "p-0" : "p-1"}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
      )}

      {/* Fallback Icon - only show when needed */}
      {(!chainData.image || imageError || !imageLoaded) && (
        <span
          className={`text-white ${iconSizes[size]} font-bold font-satoshi absolute inset-0 flex items-center justify-center`}
        >
          {chainData.fallbackIcon}
        </span>
      )}
    </div>
  );
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

  // Wallet integration
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
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

  // Mock wallet data for UI (keep existing mock data)
  const [selectedWallet] = useState({
    name: "Ethereum",
    address: "0xAD7a4hw64...R8J6153",
    balance: 2500.0,
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chainSelectorOpen, setChainSelectorOpen] = useState(false);
  const [switchingChain, setSwitchingChain] = useState<number | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const authChecked = useRef(false);
  const chainSelectorRef = useRef<HTMLDivElement>(null);

  // Check if we're on a token overview page
  const isTokenOverviewPage = pathname.startsWith("/dashboard/token/");

  // Get page-specific title and subtitle
  const pageInfo = getPageTitle(pathname);
  const displayTitle = propTitle !== "Dashboard" ? propTitle : pageInfo.title;
  const displaySubtitle =
    propSubtitle !== "Welcome back" ? propSubtitle : pageInfo.subtitle;

  // Ensure component is mounted before accessing wallet state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth check effect - only run once
  useEffect(() => {
    if (!authChecked.current && !isAuthenticated && !authLoading) {
      authChecked.current = true;
      dispatch(checkAuthStatus());
    }
  }, [dispatch, isAuthenticated, authLoading]);

  // Clear error when component unmounts or auth changes
  useEffect(() => {
    return () => {
      setSwitchError(null);
      setSwitchingChain(null);
    };
  }, []);

  // Clear error when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setSwitchError(null);
      setSwitchingChain(null);
    }
  }, [isConnected]);

  // Close chain selector when clicking outside
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

  // Handle chain switch with wagmi v2
  const handleChainSwitch = async (targetChainId: number) => {
    // Don't proceed if not mounted to avoid hydration issues
    if (!mounted) {
      console.warn("⚠️ Component not mounted, skipping chain switch");
      setSwitchError("Please wait for the page to load completely");
      return;
    }

    // Check if switchChain is available
    if (!switchChain) {
      console.warn("⚠️ switchChain function not available");
      setSwitchError("Chain switching not supported by current wallet");
      return;
    }

    // Check if wallet is connected
    if (!isConnected || !address) {
      console.log("⚠️ Wallet not connected, cannot switch chain");
      setSwitchError("Please connect your wallet first");
      return;
    }

    // Don't switch if already on the target chain
    if (chainId === targetChainId) {
      console.log("ℹ️ Already on target chain:", targetChainId);
      setChainSelectorOpen(false);
      return;
    }

    // Don't allow multiple simultaneous switches
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

      // Handle specific error types
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

  // UPDATED: Get chain display data with proper fallbacks
  const chainDisplayData = getChainDisplayData();
  const currentChain =
    mounted && isConnected ? chains.find((c) => c.id === chainId) : null;

  // Get display data for current chain with proper fallback
  const getCurrentChainDisplay = () => {
    if (mounted && isConnected && chainId && chainDisplayData[chainId]) {
      return chainDisplayData[chainId];
    }

    // Fallback to first chain in display data
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

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render wallet-dependent parts until mounted
  const showWalletInfo = mounted && isConnected;

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
          {/* Wallet Display with Chain Selector */}
          <div className="relative" ref={chainSelectorRef}>
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2.5 lg:px-3 py-1.5 lg:py-2 w-full sm:w-auto sm:min-w-[180px] lg:min-w-[200px] gap-1.5">
              <div className="flex items-center flex-1 min-w-0 bg-[#0F0F0F] rounded-[100px] p-[4px] mr-2">
                {/* Chain Icon - UPDATED with image support */}
                <ChainIcon
                  chainData={currentChainDisplay}
                  size="md"
                  className="mr-2 lg:mr-2.5"
                />

                <div className="flex-1 min-w-0">
                  <span className="text-white text-xs sm:text-xs font-satoshi mr-1.5 min-w-0 truncate block">
                    {showWalletInfo
                      ? currentChainDisplay.name
                      : selectedWallet.name}
                  </span>
                </div>
              </div>

              {/* Address and Dropdown Button */}
              <button
                onClick={() => setChainSelectorOpen(!chainSelectorOpen)}
                className="flex items-center hover:opacity-80 transition-opacity"
                disabled={!mounted}
              >
                <span className="text-[#EDEDED] text-xs font-satoshi italic mr-1.5 lg:mr-2 hidden sm:block truncate">
                  {showWalletInfo && address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : selectedWallet.address}
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
            {chainSelectorOpen && mounted && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-30 bg-black/20"
                  onClick={() => setChainSelectorOpen(false)}
                />

                {/* Dropdown */}
                <div className="absolute top-full right-0 mt-2 w-64 bg-black border border-[#2C2C2C] rounded-[28px] shadow-2xl z-40 overflow-hidden">
                  {/* Header */}
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
                    {/* <button
                      onClick={() => setChainSelectorOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded"
                    >
                      <X size={14} />
                    </button> */}
                  </div>

                  {/* Chain List - UPDATED with images */}
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

                        const isCurrentChain =
                          showWalletInfo && chainId === chain.id;
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
                              {/* Chain Icon with Image */}
                              <ChainIcon
                                chainData={chainDisplay}
                                size="lg"
                                className="mr-2.5"
                              />

                              {/* Chain Name */}
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

                            {/* Toggle Switch */}
                            <div
                              className={`w-10 h-5 rounded-full transition-colors relative ${
                                isCurrentChain ? "bg-[#E2AF19]" : "bg-[#2C2C2C]"
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

                  {/* Footer Note */}
                  {!isConnected && (
                    <div className="p-3 bg-[#0F0F0F]">
                      <p className="text-gray-400 text-xs font-satoshi text-center">
                        Connect your wallet to switch chains
                      </p>
                    </div>
                  )}

                  {/* Error Display */}
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

      {/* Custom Scrollbar Styles */}
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
