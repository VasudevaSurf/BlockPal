// src/components/dashboard/TokenList.tsx - FIXED VERSION (Enhanced Image Loading Management)
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

// Enhanced Image Loading Component
const TokenImage = ({
  src,
  alt,
  symbol,
  contractAddress,
  onLoad,
  className = "",
}: {
  src?: string | null;
  alt: string;
  symbol: string;
  contractAddress?: string;
  onLoad?: () => void;
  className?: string;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Better icon URL validation
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url === "null" || url === "undefined" || url === "") {
      return false;
    }
    return (
      url.startsWith("http") &&
      (url.includes("coingecko") ||
        url.includes("coinbase") ||
        url.includes("cdn"))
    );
  };

  // Enhanced token background colors
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

  // Enhanced icon colors
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

  // Enhanced token letters
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

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) {
      onLoad();
    }
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    if (onLoad) {
      onLoad();
    }
  };

  const shouldShowImage = isValidImageUrl(src) && !hasError;

  return (
    <div className={`relative ${className}`}>
      {/* Background container with gradient */}
      <div
        className={`w-full h-full ${getTokenBackgroundColor(
          symbol,
          contractAddress
        )} rounded-full flex items-center justify-center p-0.5`}
      >
        {/* Show skeleton while loading and we expect an image */}
        {isLoading && shouldShowImage && (
          <div className="w-full h-full bg-gray-600 animate-pulse rounded-full" />
        )}

        {/* Show real image when loaded */}
        {shouldShowImage && (
          <img
            src={src}
            alt={alt}
            className={`w-full h-full rounded-full object-cover ${
              isLoading ? "opacity-0 absolute" : "opacity-100"
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        )}

        {/* Show fallback icon when no valid image or error occurred and not loading */}
        {(!shouldShowImage || hasError) && !isLoading && (
          <div
            className={`w-full h-full ${getTokenIcon(
              symbol,
              contractAddress
            )} rounded-full flex items-center justify-center`}
          >
            <span className="text-white text-xs font-medium">
              {getTokenLetter(symbol, contractAddress)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TokenList() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { tokens, activeWallet, loading } = useSelector(
    (state: RootState) => state.wallet
  );
  const { isLoading: isNavigating, startLoading } = useNavigationLoading();

  // Enhanced loading state management
  const [tokenLoadingState, setTokenLoadingState] = useState({
    isInitialLoad: true,
    hasAttemptedLoad: false,
    tokensLoaded: false,
    imagesLoaded: false, // NEW: Track image loading
  });

  // Track image loading completion
  const [imageLoadingStates, setImageLoadingStates] = useState<
    Record<string, boolean>
  >({});
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  // Use ref to prevent duplicate API calls
  const tokensLoaded = useRef<string | null>(null);

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
        imagesLoaded: false, // Reset image loading state
      }));

      // Reset image loading states
      setImageLoadingStates({});
      setAllImagesLoaded(false);

      dispatch(fetchWalletTokens(activeWallet.address)).then(() => {
        setTokenLoadingState((prev) => ({
          ...prev,
          tokensLoaded: true,
          isInitialLoad: false,
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
        imagesLoaded: false,
      });
      setImageLoadingStates({});
      setAllImagesLoaded(false);
    }
  }, [activeWallet?.address]);

  // NEW: Track when all images are loaded
  useEffect(() => {
    if (tokens.length > 0 && tokenLoadingState.tokensLoaded) {
      const totalTokens = tokens.length;
      const loadedImages =
        Object.values(imageLoadingStates).filter(Boolean).length;

      console.log(`🖼️ Image loading progress: ${loadedImages}/${totalTokens}`);

      if (loadedImages === totalTokens) {
        setAllImagesLoaded(true);
        setTokenLoadingState((prev) => ({ ...prev, imagesLoaded: true }));
        console.log("✅ All token images loaded - navigation enabled");
      }
    }
  }, [imageLoadingStates, tokens.length, tokenLoadingState.tokensLoaded]);

  // NEW: Initialize image loading states when tokens are available
  useEffect(() => {
    if (tokens.length > 0 && tokenLoadingState.tokensLoaded) {
      // Initialize all tokens as not loaded, but allow immediate display
      const initialStates: Record<string, boolean> = {};
      tokens.forEach((token) => {
        if (!(token.id in imageLoadingStates)) {
          initialStates[token.id] = false;
        }
      });

      if (Object.keys(initialStates).length > 0) {
        setImageLoadingStates((prev) => ({ ...prev, ...initialStates }));
      }

      // Set a timeout to enable navigation after a reasonable time even if some images fail
      setTimeout(() => {
        if (!allImagesLoaded) {
          console.log("⏰ Enabling navigation after timeout");
          setAllImagesLoaded(true);
          setTokenLoadingState((prev) => ({ ...prev, imagesLoaded: true }));
        }
      }, 3000); // 3 second timeout
    }
  }, [tokens.length, tokenLoadingState.tokensLoaded]);

  // NEW: Handle individual image load completion
  const handleImageLoad = (tokenId: string) => {
    setImageLoadingStates((prev) => ({
      ...prev,
      [tokenId]: true,
    }));
  };

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

  const handleTokenClick = (token: any) => {
    // SIMPLIFIED: Only prevent navigation if already navigating
    // Allow navigation even if some images are still loading (with timeout fallback)
    if (isNavigating) {
      console.log("🚫 Navigation blocked - already navigating");
      return;
    }

    // Only block if images are actively loading and we haven't hit the timeout
    const isImageLoadingBlocked =
      !allImagesLoaded &&
      tokens.length > 0 &&
      Object.keys(imageLoadingStates).length > 0 &&
      Object.values(imageLoadingStates).every((loaded) => !loaded);

    if (isImageLoadingBlocked) {
      console.log("🚫 Navigation blocked - images still loading", {
        allImagesLoaded,
        imageStates: imageLoadingStates,
      });
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

    // Better ETH/native token detection
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

  // DEBUG: Log token 24h changes
  useEffect(() => {
    if (tokens.length > 0) {
      console.log("📊 Token 24h Changes Debug:");
      tokens.forEach((token) => {
        console.log(
          `  ${token.symbol}: ${token.change24h?.toFixed(2)}% (raw: ${
            token.change24h
          })`
        );
        if (token.symbol === "ETH") {
          console.log(`  🔷 ETH 24h change details:`, {
            change24h: token.change24h,
            type: typeof token.change24h,
            isZero: token.change24h === 0,
            formatted: formatPercentage(token.change24h || 0),
          });
        }
      });
    }
  }, [tokens]);

  const displayTokens = tokens;

  // FIXED: Only show skeleton for major loading states, not image loading
  const shouldShowSkeleton =
    tokenLoadingState.isInitialLoad ||
    (loading && tokens.length === 0) ||
    (!tokenLoadingState.hasAttemptedLoad && activeWallet?.address) ||
    isNavigating ||
    (loading && tokenLoadingState.isInitialLoad);
  // REMOVED: Don't show skeleton while images load - show tokens with skeleton images instead

  if (shouldShowSkeleton) {
    console.log("🔄 TokenList - Showing skeleton", {
      isInitialLoad: tokenLoadingState.isInitialLoad,
      loading,
      tokensLength: tokens.length,
      hasAttemptedLoad: tokenLoadingState.hasAttemptedLoad,
      activeWallet: !!activeWallet?.address,
      isNavigating,
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

  // Only show "no tokens" if we've attempted to load and confirmed no tokens
  if (
    displayTokens.length === 0 &&
    tokenLoadingState.hasAttemptedLoad &&
    tokenLoadingState.tokensLoaded &&
    !loading &&
    !isNavigating
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
              className={`bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C] transition-colors ${
                isNavigating
                  ? "cursor-wait opacity-70"
                  : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center">
                  {/* ENHANCED: Use new TokenImage component */}
                  <TokenImage
                    src={token.icon}
                    alt={token.symbol}
                    symbol={token.symbol}
                    contractAddress={token.contractAddress}
                    onLoad={() => handleImageLoad(token.id)}
                    className="w-8 h-8 mr-2.5 flex-shrink-0"
                  />

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
                  ? "cursor-wait opacity-70"
                  : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
              }`}
            >
              <div className="flex items-center min-w-0 flex-1">
                {/* ENHANCED: Use new TokenImage component */}
                <TokenImage
                  src={token.icon}
                  alt={token.symbol}
                  symbol={token.symbol}
                  contractAddress={token.contractAddress}
                  onLoad={() => handleImageLoad(token.id)}
                  className="w-10 h-10 mr-2.5 flex-shrink-0"
                />

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
