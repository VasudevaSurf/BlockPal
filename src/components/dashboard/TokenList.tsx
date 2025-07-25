// src/components/dashboard/TokenList.tsx - ORIGINAL DESIGN with fixed loading
"use client";

import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { RootState, AppDispatch } from "@/store";
import { fetchWalletTokens } from "@/store/slices/walletSlice";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import WalletRefreshButton from "@/components/wallet/WalletRefreshButton";
import { RefreshCw } from "lucide-react";
import { SkeletonTokenList } from "@/components/ui/Skeleton";

export default function TokenList() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { tokens, activeWallet, loading } = useSelector(
    (state: RootState) => state.wallet
  );
  const { isLoading: isNavigating, startLoading } = useNavigationLoading();

  // SIMPLIFIED: Much simpler loading state
  const [tokenLoadingState, setTokenLoadingState] = useState({
    isInitialLoad: true,
    hasAttemptedLoad: false,
    tokensLoaded: false,
    dataStabilized: false,
  });

  // Track when we get meaningful token data
  const [hasTokenData, setHasTokenData] = useState(false);
  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);

  // Use ref to prevent duplicate API calls
  const tokensLoaded = useRef<string | null>(null);

  // SIMPLIFIED: Data stabilization - just wait for tokens then show them
  useEffect(() => {
    const hasMeaningfulTokens = tokens.length > 0;
    
    if (hasMeaningfulTokens && !hasTokenData) {
      console.log("🪙 First tokens received:", tokens.length);
      setHasTokenData(true);
      
      // Clear any existing timer
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
      }
      
      // Wait briefly for data to stabilize, then show tokens
      stabilizationTimer.current = setTimeout(() => {
        console.log("✅ Token data stabilized, showing tokens");
        setTokenLoadingState(prev => ({
          ...prev,
          dataStabilized: true,
          isInitialLoad: false,
        }));
      }, 1000); // Just 1 second delay
    }
    
    // If we lose tokens (wallet switch), reset
    if (!hasMeaningfulTokens && hasTokenData) {
      console.log("🔄 Tokens cleared, resetting state");
      setHasTokenData(false);
      setTokenLoadingState(prev => ({
        ...prev,
        dataStabilized: false,
        isInitialLoad: true,
      }));
    }
  }, [tokens.length, hasTokenData]);

  useEffect(() => {
    console.log("🪙 TokenList - Effect triggered", {
      activeWalletAddress: activeWallet?.address,
      tokensLoadedFor: tokensLoaded.current,
      tokensLength: tokens.length,
      loading,
      shouldFetch:
        activeWallet?.address && tokensLoaded.current !== activeWallet.address,
    });

    // Only fetch tokens if we have an active wallet and haven't already loaded tokens for this wallet
    if (
      activeWallet?.address &&
      tokensLoaded.current !== activeWallet.address
    ) {
      console.log(
        "📡 TokenList - Fetching tokens for wallet:",
        activeWallet.address
      );

      tokensLoaded.current = activeWallet.address;
      setTokenLoadingState((prev) => ({
        ...prev,
        hasAttemptedLoad: true,
        isInitialLoad: true,
        dataStabilized: false,
      }));

      setHasTokenData(false);
      
      // Clear stabilization timer
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
        stabilizationTimer.current = null;
      }

      dispatch(fetchWalletTokens(activeWallet.address)).then(() => {
        setTokenLoadingState((prev) => ({
          ...prev,
          tokensLoaded: true,
        }));
      });
    } else if (tokens.length > 0 && !tokenLoadingState.tokensLoaded) {
      // If we already have tokens, mark as loaded
      setTokenLoadingState((prev) => ({
        ...prev,
        tokensLoaded: true,
        isInitialLoad: false,
        hasAttemptedLoad: true,
      }));
    }
  }, [
    activeWallet?.address,
    dispatch,
    tokens.length,
    tokenLoadingState.tokensLoaded,
  ]);

  // Reset loading state when active wallet changes
  useEffect(() => {
    if (
      activeWallet?.address &&
      tokensLoaded.current !== activeWallet.address
    ) {
      setTokenLoadingState({
        isInitialLoad: true,
        hasAttemptedLoad: false,
        tokensLoaded: false,
        dataStabilized: false,
      });
      setHasTokenData(false);
      
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
        stabilizationTimer.current = null;
      }
    }
  }, [activeWallet?.address]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
      }
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // RESTORED: Original background colors and design
  const getTokenBackgroundColor = (
    symbol: string,
    contractAddress?: string
  ) => {
    const colors: Record<string, string> = {
      ETH: "bg-gradient-to-br from-blue-500/20 to-blue-600/30",
      ETHEREUM: "bg-gradient-to-br from-blue-500/20 to-blue-600/30",
      SOL: "bg-gradient-to-br from-purple-500/20 to-purple-600/30",
      BTC: "bg-gradient-to-br from-orange-500/20 to-orange-600/30",
      SUI: "bg-gradient-to-br from-cyan-500/20 to-cyan-600/30",
      XRP: "bg-gradient-to-br from-gray-500/20 to-gray-600/30",
      ADA: "bg-gradient-to-br from-blue-600/20 to-blue-700/30",
      AVAX: "bg-gradient-to-br from-red-500/20 to-red-600/30",
      TON: "bg-gradient-to-br from-blue-400/20 to-blue-500/30",
      DOT: "bg-gradient-to-br from-pink-500/20 to-pink-600/30",
      USDT: "bg-gradient-to-br from-green-500/20 to-green-600/30",
      USDC: "bg-gradient-to-br from-blue-600/20 to-blue-700/30",
      YAI: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/30",
      LINK: "bg-gradient-to-br from-blue-700/20 to-blue-800/30",
    };

    // Special handling for ETH/native token
    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return colors.ETH || "bg-gradient-to-br from-blue-500/20 to-blue-600/30";
    }

    return (
      colors[symbol] || "bg-gradient-to-br from-gray-500/20 to-gray-600/30"
    );
  };

  // RESTORED: Original icon colors
  const getTokenIcon = (symbol: string, contractAddress?: string) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
      ETHEREUM: "bg-blue-500",
      SOL: "bg-purple-500",
      BTC: "bg-orange-500",
      SUI: "bg-cyan-500",
      XRP: "bg-gray-500",
      ADA: "bg-blue-600",
      AVAX: "bg-red-500",
      TON: "bg-blue-400",
      DOT: "bg-pink-500",
      USDT: "bg-green-500",
      USDC: "bg-blue-600",
      YAI: "bg-yellow-500",
      LINK: "bg-blue-700",
    };

    // Special handling for ETH/native token
    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return colors.ETH || "bg-blue-500";
    }

    return colors[symbol] || "bg-gray-500";
  };

  // RESTORED: Original token letters
  const getTokenLetter = (symbol: string, contractAddress?: string) => {
    const letters: Record<string, string> = {
      ETH: "Ξ",
      ETHEREUM: "Ξ",
      SOL: "◎",
      BTC: "₿",
      SUI: "~",
      XRP: "✕",
      ADA: "₳",
      AVAX: "A",
      TON: "T",
      DOT: "●",
      USDT: "₮",
      USDC: "$",
      YAI: "Ÿ",
      LINK: "⛓",
    };

    // Special handling for ETH/native token
    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return letters.ETH || "Ξ";
    }

    return letters[symbol] || symbol.charAt(0);
  };

  // FIXED: Better icon URL validation and image handling
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url === "null" || url === "undefined" || url === "") {
      return false;
    }
    return (
      url.startsWith("http") &&
      (url.includes("coingecko") ||
        url.includes("coinbase") ||
        url.includes("cryptocompare") ||
        url.includes("assets") ||
        url.includes("cdn") ||
        url.includes("imgur") ||
        url.includes("github"))
    );
  };

  // Enhanced token icon component with proper image loading
  const TokenIcon = ({ token, size = "w-9 h-9", className = "" }: { 
    token: any; 
    size?: string; 
    className?: string; 
  }) => {
    const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    // Get high-quality image URL
    const getImageUrl = (token: any): string | null => {
      // High-quality URLs for popular tokens
      const knownTokens: Record<string, string> = {
        'ETH': 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
        'ETHEREUM': 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
        'USDT': 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
        'USDC': 'https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
        'LINK': 'https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
        'UNI': 'https://coin-images.coingecko.com/coins/images/12504/large/uni.jpg',
        'DAI': 'https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png',
        'WETH': 'https://coin-images.coingecko.com/coins/images/2518/large/weth.png',
        'PEPE': 'https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
        'SHIB': 'https://coin-images.coingecko.com/coins/images/11939/large/shiba.png',
      };

      const symbol = token.symbol?.toUpperCase();
      
      // First try known high-quality URLs
      if (symbol && knownTokens[symbol]) {
        return knownTokens[symbol];
      }

      // Handle ETH/native specially
      if (token.contractAddress === 'native' || symbol === 'ETH') {
        return knownTokens['ETH'];
      }

      // Then try token's own URLs
      const tokenUrls = [
        token.logoUrl,
        token.icon,
        token.image,
        token.logo,
      ].filter(url => isValidImageUrl(url));

      return tokenUrls[0] || null;
    };

    useEffect(() => {
      const imageUrl = getImageUrl(token);
      
      if (!imageUrl) {
        setImageState('error');
        return;
      }

      setImageSrc(imageUrl);
      setImageState('loading');

      // Create new image to test loading
      const img = new Image();
      
      img.onload = () => {
        setImageState('loaded');
      };
      
      img.onerror = () => {
        console.log(`❌ Failed to load image for ${token.symbol}: ${imageUrl}`);
        setImageState('error');
      };
      
      // Set crossOrigin to handle CORS issues
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }, [token.symbol, token.contractAddress, token.logoUrl, token.icon]);

    // Show image if loaded successfully
    if (imageState === 'loaded' && imageSrc) {
      return (
        <div className={`${size} ${className} ${getTokenBackgroundColor(token.symbol, token.contractAddress)} rounded-full flex items-center justify-center p-0.5`}>
          <img
            src={imageSrc}
            alt={token.symbol}
            className={`${size.replace('w-', 'w-').replace('h-', 'h-')} rounded-full object-cover`}
            style={{ width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }}
            onError={() => {
              console.log(`❌ Image error after successful load for ${token.symbol}`);
              setImageState('error');
            }}
          />
        </div>
      );
    }

    // Show fallback icon while loading or on error
    return (
      <div className={`${size} ${className} ${getTokenBackgroundColor(token.symbol, token.contractAddress)} rounded-full flex items-center justify-center p-0.5`}>
        <div className={`${size.replace('w-', 'w-').replace('h-', 'h-')} ${getTokenIcon(token.symbol, token.contractAddress)} rounded-full flex items-center justify-center`}
             style={{ width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }}>
          <span className="text-white font-medium" style={{ fontSize: size.includes('8') ? '0.75rem' : '0.875rem' }}>
            {getTokenLetter(token.symbol, token.contractAddress)}
          </span>
        </div>
      </div>
    );
  };

  const handleTokenClick = (token: any) => {
    // Prevent navigation if already navigating
    if (isNavigating) {
      return;
    }

    // Debug logging
    console.log("🔍 Token clicked:", {
      tokenId: token.id,
      symbol: token.symbol,
      contractAddress: token.contractAddress,
      name: token.name,
      activeWallet: activeWallet?.address,
    });

    if (!activeWallet?.address) {
      console.error("❌ No active wallet found");
      alert("Please select an active wallet first.");
      return;
    }

    // FIXED: Better ETH/native token detection
    let routeContractAddress: string;
    if (
      token.contractAddress === "native" ||
      token.symbol === "ETH" ||
      token.symbol === "ETHEREUM" ||
      !token.contractAddress ||
      token.contractAddress === "undefined" ||
      token.contractAddress === ""
    ) {
      routeContractAddress = "ETH";
      console.log("📍 Routing to ETH (native token)");
    } else {
      routeContractAddress = token.contractAddress;
      console.log("📍 Routing to ERC-20 token:", routeContractAddress);
    }

    try {
      const url = `/dashboard/token/${encodeURIComponent(
        routeContractAddress
      )}?wallet=${encodeURIComponent(activeWallet.address)}`;
      console.log("🔗 Navigating to:", url);

      // Start loading state before navigation
      startLoading();

      // Small delay to ensure loading state is visible
      setTimeout(() => {
        router.push(url);
      }, 100);
    } catch (error) {
      console.error("❌ Navigation error:", error);
      alert("Failed to navigate to token details. Please try again.");
    }
  };

  const displayTokens = tokens;

  // SIMPLIFIED: Show skeleton conditions
  const shouldShowSkeleton =
    tokenLoadingState.isInitialLoad ||
    !tokenLoadingState.dataStabilized ||
    (loading && tokens.length === 0) ||
    (!tokenLoadingState.hasAttemptedLoad && activeWallet?.address);

  // FALLBACK: Force show tokens after 8 seconds
  useEffect(() => {
    if (tokenLoadingState.hasAttemptedLoad && !tokenLoadingState.dataStabilized && tokens.length > 0) {
      const fallbackTimer = setTimeout(() => {
        console.log("⚠️ Forcing token display after timeout");
        setTokenLoadingState(prev => ({
          ...prev,
          dataStabilized: true,
          isInitialLoad: false,
        }));
      }, 8000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [tokenLoadingState.hasAttemptedLoad, tokenLoadingState.dataStabilized, tokens.length]);

  if (shouldShowSkeleton) {
    console.log("🔄 TokenList - Showing skeleton", {
      isInitialLoad: tokenLoadingState.isInitialLoad,
      dataStabilized: tokenLoadingState.dataStabilized,
      hasTokenData,
      loading,
      tokensLength: tokens.length,
      hasAttemptedLoad: tokenLoadingState.hasAttemptedLoad,
      balanceLoaded: tokenLoadingState.tokensLoaded,
    });
    return <SkeletonTokenList />;
  }

  if (!activeWallet) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
            Token Holdings (0)
          </h2>
          <WalletRefreshButton />
        </div>
        <div className="flex flex-col items-center justify-center text-center py-6 lg:py-8">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
            <span className="text-gray-400 text-base lg:text-lg">₿</span>
          </div>
          <h3 className="text-white text-sm lg:text-base font-satoshi mb-1">
            No wallet selected
          </h3>
          <p className="text-gray-400 font-satoshi text-xs lg:text-sm">
            Please select a wallet to view your tokens
          </p>
        </div>
      </div>
    );
  }

  // UPDATED: Only show "no tokens" if we've attempted to load and confirmed no tokens
  if (
    displayTokens.length === 0 &&
    tokenLoadingState.hasAttemptedLoad &&
    tokenLoadingState.tokensLoaded &&
    !loading
  ) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
            Token Holdings (0)
          </h2>
          <WalletRefreshButton />
        </div>
        <div className="flex flex-col items-center justify-center text-center py-6 lg:py-8">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
            <span className="text-gray-400 text-base lg:text-lg">🪙</span>
          </div>
          <h3 className="text-white text-sm lg:text-base font-satoshi mb-1">
            No tokens found
          </h3>
          <p className="text-gray-400 font-satoshi text-xs lg:text-sm mb-3">
            This wallet doesn't have any tokens yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-2">
        <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
          Token Holdings
        </h2>
        <WalletRefreshButton />
      </div>

      {/* Mobile Grid Layout */}
      <div className="block sm:hidden flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-1 gap-2 pr-1">
          {displayTokens.map((token) => (
            <div
              key={token.id}
              onClick={() => handleTokenClick(token)}
              className={`bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C] cursor-pointer transition-colors ${
                isNavigating
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center">
                  {/* Show loading spinner if navigating */}
                  {isNavigating ? (
                    <RefreshCw className="w-7 h-7 text-[#E2AF19] animate-spin mr-2.5 flex-shrink-0" />
                  ) : (
                    <div
                      className={`w-8 h-8 ${getTokenBackgroundColor(
                        token.symbol,
                        token.contractAddress
                      )} rounded-full flex items-center justify-center mr-2.5 flex-shrink-0 p-0.5`}
                    >
                      {/* UPDATED: Better icon handling with background */}
                      {isValidImageUrl(token.icon) ? (
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="w-7 h-7 rounded-full"
                          onError={(e) => {
                            console.log(
                              `❌ Image load failed for ${token.symbol}: ${token.icon}`
                            );
                            // Fallback to colored circle if image fails
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback =
                              target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.classList.remove("hidden");
                            }
                          }}
                        />
                      ) : null}

                      <div
                        className={`w-7 h-7 ${getTokenIcon(
                          token.symbol,
                          token.contractAddress
                        )} rounded-full flex items-center justify-center ${
                          isValidImageUrl(token.icon) ? "hidden" : ""
                        }`}
                      >
                        <span className="text-white text-xs font-medium">
                          {getTokenLetter(token.symbol, token.contractAddress)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-white font-medium font-satoshi text-sm">
                      {token.name}
                    </div>
                    <div className="text-gray-400 text-xs font-satoshi">
                      {token.balance.toFixed(4)} {token.symbol}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-white font-medium font-satoshi text-sm">
                    {formatCurrency(token.value)}
                  </div>
                  <div
                    className={`text-xs font-satoshi ${
                      token.change24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatPercentage(token.change24h)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tablet/Desktop List Layout */}
      <div className="hidden sm:block flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-2 pr-1">
          {displayTokens.map((token) => (
            <div
              key={token.id}
              onClick={() => handleTokenClick(token)}
              className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                isNavigating
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[#1A1A1A] cursor-pointer active:bg-[#2A2A2A]"
              }`}
            >
              <div className="flex items-center min-w-0 flex-1">
                {/* Show loading spinner if navigating */}
                {isNavigating ? (
                  <RefreshCw className="w-9 h-9 text-[#E2AF19] animate-spin mr-2.5 flex-shrink-0" />
                ) : (
                  <div
                    className={`w-10 h-10 ${getTokenBackgroundColor(
                      token.symbol,
                      token.contractAddress
                    )} rounded-full flex items-center justify-center mr-2.5 flex-shrink-0 p-0.5`}
                  >
                    {/* UPDATED: Better icon handling with background */}
                    {isValidImageUrl(token.icon) ? (
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-9 h-9 rounded-full"
                        onError={(e) => {
                          console.log(
                            `❌ Image load failed for ${token.symbol}: ${token.icon}`
                          );
                          // Fallback to colored circle if image fails
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const fallback =
                            target.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.classList.remove("hidden");
                          }
                        }}
                      />
                    ) : null}

                    <div
                      className={`w-9 h-9 ${getTokenIcon(
                        token.symbol,
                        token.contractAddress
                      )} rounded-full flex items-center justify-center ${
                        isValidImageUrl(token.icon) ? "hidden" : ""
                      }`}
                    >
                      <span className="text-white text-sm font-medium">
                        {getTokenLetter(token.symbol, token.contractAddress)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium font-satoshi text-sm sm:text-sm flex items-center">
                    {token.name}
                  </div>
                  <div className="text-gray-400 text-xs font-satoshi">
                    {token.balance.toFixed(4)} {token.symbol}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-white font-medium font-satoshi text-sm">
                  {formatCurrency(token.value)}
                </div>
                <div
                  className={`text-xs font-satoshi ${
                    token.change24h >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatPercentage(token.change24h)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}