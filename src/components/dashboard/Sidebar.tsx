// src/components/dashboard/Sidebar.tsx - Updated with properly aligned chain selector
"use client";

import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, User, X, ArrowLeft } from "lucide-react";
import { RootState } from "@/store";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { chains } from "@/components/wallet/WalletProvider";
import DashboardIcon from "@/components/icons/DashboardIcon";
import AIIcon from "@/components/icons/AIIcon";
import SwapIcon from "../icons/SwapIcon";
import UsersIcon from "../icons/UsersIcon";
import WalletConnectButton from "@/components/wallet/WalletConnectButton";

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
  {
    icon: User,
    label: "Profile",
    href: "/dashboard/profile",
    comingSoon: false,
  },
];

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
  };

  return chainDisplayData;
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

  const shouldShowBackground =
    !chainData.image || imageError || !imageLoaded || chainData.useBackground;
  const backgroundClass = shouldShowBackground ? chainData.color : "";

  return (
    <div
      className={`${sizeClasses[size]} ${backgroundClass} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
    >
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

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, startLoading } = useNavigationLoading();

  // Wallet integration
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain({
    mutation: {
      onError: (error) => {
        console.error("🚨 Chain switch error:", error);
        setSwitchingChain(null);
        setSwitchError(error.message || "Failed to switch chain");
      },
      onSuccess: (data) => {
        console.log("✅ Chain switched successfully:", data.name);
        setSwitchingChain(null);
        setChainSelectorOpen(false);
        setSwitchError(null);
      },
    },
  });

  // State for sidebar minimization
  const [isMinimized, setIsMinimized] = useState(false);
  const [chainSelectorOpen, setChainSelectorOpen] = useState(false);
  const [switchingChain, setSwitchingChain] = useState<number | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const walletContainerRef = useRef<HTMLDivElement>(null);
  const chainSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chainSelectorRef.current &&
        !chainSelectorRef.current.contains(event.target as Node) &&
        walletContainerRef.current &&
        !walletContainerRef.current.contains(event.target as Node)
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

  const handleNavigation = (
    href: string,
    comingSoon: boolean,
    event?: React.MouseEvent
  ) => {
    if (isLoading) {
      event?.preventDefault();
      return;
    }

    if (comingSoon) {
      event?.preventDefault();
      startLoading();
      setTimeout(() => {
        router.push("/dashboard/coming-soon");
        onItemClick?.();
      }, 100);
      return;
    }

    if (pathname === href) {
      onItemClick?.();
      return;
    }

    startLoading();
    setTimeout(() => {
      router.push(href);
      onItemClick?.();
    }, 100);
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    setChainSelectorOpen(false); // Close chain selector when minimizing
  };

  const handleChainSwitch = async (targetChainId: number) => {
    if (!mounted) {
      setSwitchError("Please wait for the page to load completely");
      return;
    }

    if (!switchChain) {
      setSwitchError("Chain switching not supported by current wallet");
      return;
    }

    if (!isConnected || !address) {
      setSwitchError("Please connect your wallet first");
      return;
    }

    if (chainId === targetChainId) {
      setChainSelectorOpen(false);
      return;
    }

    if (isSwitchingChain || switchingChain) {
      setSwitchError("Chain switch already in progress");
      return;
    }

    console.log(`🔄 Initiating chain switch to ${targetChainId}`);
    setSwitchingChain(targetChainId);
    setSwitchError(null);

    try {
      switchChain({ chainId: targetChainId });
    } catch (error: any) {
      console.error(`❌ Chain switch failed:`, error);
      setSwitchError(error.message || "Failed to switch chain");
      setSwitchingChain(null);
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
        useBackground: false,
      }
    );
  };

  const currentChainDisplay = getCurrentChainDisplay();

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

      {/* Bottom Section - Wallet Connect Button with Chain Selector */}
      <div className="p-2 lg:p-4 flex-shrink-0 relative z-20">
        <div ref={walletContainerRef}>
          <WalletConnectButton
            isMinimized={isMinimized}
            onChainSelectorToggle={() =>
              setChainSelectorOpen(!chainSelectorOpen)
            }
            chainSelectorOpen={chainSelectorOpen}
          />
        </div>

        {/* Chain Selector Modal - Inside Sidebar */}
        {chainSelectorOpen && mounted && isConnected && !isMinimized && (
          <div
            ref={chainSelectorRef}
            className="absolute bottom-full left-2 right-2 mb-2 bg-black border border-[#2C2C2C] rounded-[20px] shadow-2xl overflow-hidden"
            style={{ maxHeight: "320px" }}
          >
            <div className="flex items-center justify-between p-3 border-b border-[#2C2C2C]">
              <button
                onClick={() => setChainSelectorOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded"
              >
                <X size={16} />
              </button>
              <h3 className="text-white font-semibold text-sm font-satoshi absolute left-1/2 transform -translate-x-1/2">
                Select Chain
              </h3>
            </div>

            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
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
                      disabled={isSwitching || isSwitchingChain}
                      className={`w-full flex items-center justify-between p-2.5 rounded-[8px] transition-all hover:bg-[#1A1A1A] ${
                        isSwitching ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-center">
                        <ChainIcon
                          chainData={chainDisplay}
                          size="md"
                          className="mr-2.5"
                        />

                        <span
                          className={`text-sm font-satoshi ${
                            isCurrentChain ? "text-[#E2AF19]" : "text-white"
                          }`}
                        >
                          {chainDisplay.name}
                          {isSwitching && (
                            <span className="ml-2 text-xs">(Switching...)</span>
                          )}
                        </span>
                      </div>

                      <div
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          isCurrentChain ? "bg-[#E2AF19]" : "bg-[#2C2C2C]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                            isCurrentChain ? "translate-x-5" : "translate-x-0.5"
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
        )}

        {/* Chain Selector for Minimized Sidebar */}
        {chainSelectorOpen && mounted && isConnected && isMinimized && (
          <>
            <div
              className="fixed inset-0 z-[100] bg-black/20"
              onClick={() => setChainSelectorOpen(false)}
            />

            <div
              ref={chainSelectorRef}
              className="fixed bottom-24 left-24 w-64 bg-black border border-[#2C2C2C] rounded-[20px] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-[#2C2C2C]">
                <button
                  onClick={() => setChainSelectorOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded"
                >
                  <X size={16} />
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
                        disabled={isSwitching || isSwitchingChain}
                        className={`w-full flex items-center justify-between p-2.5 rounded-[8px] transition-all hover:bg-[#1A1A1A] ${
                          isSwitching ? "opacity-70" : ""
                        }`}
                      >
                        <div className="flex items-center">
                          <ChainIcon
                            chainData={chainDisplay}
                            size="lg"
                            className="mr-2.5"
                          />

                          <span
                            className={`text-sm font-satoshi ${
                              isCurrentChain ? "text-[#E2AF19]" : "text-white"
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

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

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
    </div>
  );
}
