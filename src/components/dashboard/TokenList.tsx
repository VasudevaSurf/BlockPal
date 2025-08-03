// Now I need to create a simple update for the GlobalDashboardHeader to emit wallet switching events.
// This will be handled in the next step by updating the existing header component.

// Enhanced wallet// src/components/dashboard/TokenList.tsx - ENHANCED VERSION with better image loading
"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef, useState, useCallback } from "react";
import { RootState, AppDispatch } from "@/store";
import { fetchWalletTokens } from "@/store/slices/walletSlice";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import WalletRefreshButton from "@/components/wallet/WalletRefreshButton";
import { RefreshCw } from "lucide-react";
import { SkeletonTokenList } from "@/components/ui/Skeleton";

// Initialize localStorage cache for token images
const TOKEN_IMAGE_CACHE_KEY = "walletTokenImageCache";

// Load image cache from localStorage
const loadImageCache = (): Map<string, string> => {
  const cache = new Map<string, string>();
  try {
    const stored = localStorage.getItem(TOKEN_IMAGE_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([key, value]) => {
        if (typeof value === "string" && value !== "error") {
          cache.set(key, value);
        }
      });
      console.log(`📦 Loaded ${cache.size} token images from localStorage`);
    }
  } catch (error) {
    console.error("Failed to load image cache:", error);
  }
  return cache;
};

// Save image cache to localStorage
const saveImageCache = (cache: Map<string, string>) => {
  try {
    const toStore: Record<string, string> = {};
    cache.forEach((value, key) => {
      if (value !== "error") {
        toStore[key] = value;
      }
    });
    localStorage.setItem(TOKEN_IMAGE_CACHE_KEY, JSON.stringify(toStore));
    console.log(
      `💾 Saved ${Object.keys(toStore).length} token images to localStorage`
    );
  } catch (error) {
    console.error("Failed to save image cache:", error);
  }
};

// Global image cache that persists across sessions
const imageCache = loadImageCache();

// ENHANCED: Token Image Component with dark grey background instead of letters
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
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate cache key
  const cacheKey =
    contractAddress && contractAddress !== "native"
      ? contractAddress.toLowerCase()
      : `${symbol.toUpperCase()}_native`;

  // Load image from cache or source
  useEffect(() => {
    // First priority: Check persistent cache
    const cachedImage = imageCache.get(cacheKey);

    console.log(`🖼️ TokenImage for ${symbol}:`, {
      cacheKey,
      providedSrc: src,
      cachedSrc: cachedImage,
      hasCached: imageCache.has(cacheKey),
    });

    if (cachedImage && cachedImage !== "error") {
      console.log(`✅ Using cached image for ${symbol}: ${cachedImage}`);
      setImageSrc(cachedImage);
      setIsLoading(false);
      setHasError(false);
      if (onLoad) onLoad();
      return;
    }

    // If we marked this as error in cache, show fallback
    if (cachedImage === "error") {
      console.log(`❌ Cached error for ${symbol}`);
      setIsLoading(false);
      setHasError(true);
      if (onLoad) onLoad();
      return;
    }

    // Try to load provided image URL
    if (src && src !== "null" && src !== "undefined" && src !== "") {
      console.log(`🔄 Attempting to load new image for ${symbol}: ${src}`);
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
    } else {
      console.log(`⚠️ No valid image URL for ${symbol}`);
      setIsLoading(false);
      setHasError(true);
      if (onLoad) onLoad();
    }
  }, [src, cacheKey, symbol]);

  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully for ${symbol}: ${imageSrc}`);
    setIsLoading(false);
    setHasError(false);

    // Save to persistent cache
    if (imageSrc && imageSrc !== "error") {
      imageCache.set(cacheKey, imageSrc);
      saveImageCache(imageCache);
      console.log(`💾 Saved ${symbol} image to cache with key: ${cacheKey}`);
    }

    if (onLoad) {
      onLoad();
    }
  };

  const handleImageError = () => {
    console.log(`❌ Image failed to load for ${symbol}: ${imageSrc}`);
    setIsLoading(false);
    setHasError(true);

    // Mark as error in cache
    imageCache.set(cacheKey, "error");
    saveImageCache(imageCache);

    if (onLoad) {
      onLoad();
    }
  };

  const shouldShowImage = imageSrc && !hasError;

  return (
    <div className={`relative ${className}`}>
      {/* CHANGED: Dark grey background instead of letters */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center transition-opacity duration-200 ${
          shouldShowImage && !isLoading ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundColor: "#4A4A4A" }} // Dark grey background
      >
        {/* Removed the letters/icon concept completely */}
      </div>

      {imageSrc && imageSrc !== "error" && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`w-full h-full rounded-full object-cover absolute inset-0 ${
            isLoading || hasError ? "opacity-0" : "opacity-100"
          } transition-opacity duration-200`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      )}
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
    imagesLoaded: false,
    hasRealData: false, // NEW: Track if we have actual data
  });

  // Track image loading completion
  const [imageLoadingStates, setImageLoadingStates] = useState<
    Record<string, boolean>
  >({});
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  // NEW: Track wallet switching
  const [isWalletSwitching, setIsWalletSwitching] = useState(false);
  const previousWalletId = useRef<string | null>(null);

  // Use refs to prevent duplicate API calls
  const tokensLoaded = useRef<string | null>(null);

  // Listen for wallet switching events
  useEffect(() => {
    const handleWalletSwitchStart = () => {
      console.log("🔄 TokenList - Wallet switch started");
      setIsWalletSwitching(true);
      setTokenLoadingState({
        isInitialLoad: true,
        hasAttemptedLoad: false,
        tokensLoaded: false,
        imagesLoaded: false,
        hasRealData: false,
      });
      setImageLoadingStates({});
      setAllImagesLoaded(false);
    };

    const handleWalletSwitchComplete = () => {
      console.log("✅ TokenList - Wallet switch completed");
      setTimeout(() => {
        setIsWalletSwitching(false);
      }, 500);
    };

    window.addEventListener("walletSwitchStart", handleWalletSwitchStart);
    window.addEventListener("walletSwitchComplete", handleWalletSwitchComplete);

    return () => {
      window.removeEventListener("walletSwitchStart", handleWalletSwitchStart);
      window.removeEventListener(
        "walletSwitchComplete",
        handleWalletSwitchComplete
      );
    };
  }, []);

  // Process tokens to include cached images
  const processedTokens = React.useMemo(() => {
    return tokens.map((token) => {
      const cacheKey =
        token.contractAddress && token.contractAddress !== "native"
          ? token.contractAddress.toLowerCase()
          : `${token.symbol.toUpperCase()}_native`;

      const cachedImage = imageCache.get(cacheKey);

      // If we have a cached image and the token doesn't have a valid icon, use cached
      if (
        cachedImage &&
        cachedImage !== "error" &&
        (!token.icon ||
          token.icon === "null" ||
          token.icon === "undefined" ||
          token.icon === "")
      ) {
        console.log(`🎨 Applying cached image to ${token.symbol}`);
        return { ...token, icon: cachedImage };
      }

      return token;
    });
  }, [tokens]);

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
        imagesLoaded: false,
        hasRealData: false, // Reset real data flag
      }));

      // Reset image loading states but don't clear cache
      setImageLoadingStates({});
      setAllImagesLoaded(false);

      dispatch(fetchWalletTokens(activeWallet.address)).then(() => {
        setTokenLoadingState((prev) => ({
          ...prev,
          tokensLoaded: true,
          isInitialLoad: false,
          hasRealData: true, // Mark as having real data
        }));
      });
    } else if (tokens.length > 0 && !tokenLoadingState.tokensLoaded) {
      // If we already have tokens, mark as loaded
      setTokenLoadingState((prev) => ({
        ...prev,
        tokensLoaded: true,
        isInitialLoad: false,
        hasAttemptedLoad: true,
        hasRealData: true,
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
        hasRealData: false,
      });
      // Don't clear image cache on wallet switch
      setImageLoadingStates({});
      setAllImagesLoaded(false);
    }
  }, [activeWallet?.address]);

  // Create a unique key for each token
  const getUniqueTokenKey = (token: any, index: number): string => {
    const baseKey =
      token.contractAddress && token.contractAddress !== "native"
        ? `${token.contractAddress}_${index}`
        : `${token.symbol}_native_${index}`;

    return baseKey;
  };

  // Track when all images are loaded
  useEffect(() => {
    if (processedTokens.length > 0 && tokenLoadingState.tokensLoaded) {
      const totalTokens = processedTokens.length;
      const loadedImages =
        Object.values(imageLoadingStates).filter(Boolean).length;

      console.log(`🖼️ Image loading progress: ${loadedImages}/${totalTokens}`);

      if (loadedImages === totalTokens && !allImagesLoaded) {
        setAllImagesLoaded(true);
        setTokenLoadingState((prev) => ({ ...prev, imagesLoaded: true }));
        console.log("✅ All token images loaded - navigation enabled");
      }
    }
  }, [
    imageLoadingStates,
    processedTokens.length,
    tokenLoadingState.tokensLoaded,
    allImagesLoaded,
  ]);

  // Initialize image loading states when tokens are available
  useEffect(() => {
    if (processedTokens.length > 0 && tokenLoadingState.tokensLoaded) {
      // Initialize all tokens as not loaded, but allow immediate display
      const initialStates: Record<string, boolean> = {};
      processedTokens.forEach((token, index) => {
        const uniqueKey = getUniqueTokenKey(token, index);
        if (!(uniqueKey in imageLoadingStates)) {
          initialStates[uniqueKey] = false;
        }
      });

      if (Object.keys(initialStates).length > 0) {
        setImageLoadingStates((prev) => ({ ...prev, ...initialStates }));
      }

      // Set a timeout to enable navigation after a reasonable time even if some images fail
      const timeout = setTimeout(() => {
        if (!allImagesLoaded) {
          console.log("⏰ Enabling navigation after timeout");
          setAllImagesLoaded(true);
          setTokenLoadingState((prev) => ({ ...prev, imagesLoaded: true }));
        }
      }, 1000); // Reduced to 1 second for better UX

      return () => clearTimeout(timeout);
    }
  }, [processedTokens.length, tokenLoadingState.tokensLoaded, allImagesLoaded]);

  // Handle individual image load completion
  const handleImageLoad = useCallback((uniqueKey: string) => {
    setImageLoadingStates((prev) => {
      if (prev[uniqueKey] === true) return prev;
      return {
        ...prev,
        [uniqueKey]: true,
      };
    });
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

  const handleTokenClick = (token: any) => {
    if (isNavigating) {
      console.log("🚫 Navigation blocked - already navigating");
      return;
    }

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

  // Better duplicate removal
  const getDisplayTokens = () => {
    const tokenMap = new Map();

    processedTokens.forEach((token, index) => {
      // Create a unique identifier for each token
      let key;
      if (
        token.contractAddress &&
        token.contractAddress !== "native" &&
        token.contractAddress !== ""
      ) {
        key = token.contractAddress.toLowerCase();
      } else if (token.symbol === "ETH" || token.contractAddress === "native") {
        key = "eth_native";
      } else {
        key = `${token.symbol}_${
          token.contractAddress || "no_contract"
        }_${index}`;
      }

      // Only add if not already in map (keeps first occurrence)
      if (!tokenMap.has(key)) {
        tokenMap.set(key, { ...token, uniqueIndex: index });
      }
    });

    return Array.from(tokenMap.values());
  };

  const displayTokens = getDisplayTokens();

  // DEBUG: Log token data including icons
  useEffect(() => {
    if (processedTokens.length > 0) {
      console.log("📊 Token Data Debug:");
      console.log("Raw tokens count:", tokens.length);
      console.log("Processed tokens count:", processedTokens.length);
      console.log("Display tokens count:", displayTokens.length);

      console.log("🗄️ Cache contents:");
      imageCache.forEach((value, key) => {
        console.log(`  ${key}: ${value.substring(0, 50)}...`);
      });

      displayTokens.forEach((token, index) => {
        console.log(
          `  [${index}] ${token.symbol}: contract="${
            token.contractAddress
          }", icon="${token.icon?.substring(0, 50)}..."`
        );
      });
    }
  }, [processedTokens, displayTokens]);

  // ENHANCED: Better skeleton conditions including wallet switching
  const shouldShowSkeleton =
    isWalletSwitching || // NEW: Show skeleton during wallet switching
    tokenLoadingState.isInitialLoad ||
    (loading && tokens.length === 0) ||
    (!tokenLoadingState.hasAttemptedLoad && activeWallet?.address) ||
    !tokenLoadingState.hasRealData || // NEW: Show skeleton until we have real data
    isNavigating;

  if (shouldShowSkeleton) {
    console.log("🔄 TokenList - Showing skeleton", {
      isWalletSwitching,
      isInitialLoad: tokenLoadingState.isInitialLoad,
      loading,
      tokensLength: tokens.length,
      hasAttemptedLoad: tokenLoadingState.hasAttemptedLoad,
      activeWallet: !!activeWallet?.address,
      hasRealData: tokenLoadingState.hasRealData,
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
          {/* Hidden refresh button - keeps background functionality */}
          <WalletRefreshButton
            autoRefreshInterval={10000}
            showLastUpdated={false}
            isHidden={true}
          />
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
    tokenLoadingState.hasRealData &&
    !loading &&
    !isNavigating
  ) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
            Token Holdings (0)
          </h2>
          {/* Hidden refresh button - keeps background functionality */}
          <WalletRefreshButton
            autoRefreshInterval={10000}
            showLastUpdated={false}
            isHidden={true}
          />
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
          Token Holdings ({displayTokens.length})
        </h2>
        {/* Hidden refresh button - keeps background functionality */}
        <WalletRefreshButton
          autoRefreshInterval={10000}
          showLastUpdated={false}
          isHidden={true}
        />
      </div>

      {/* Mobile Grid Layout */}
      <div className="block sm:hidden flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-1 gap-2 pr-1">
          {displayTokens.map((token) => {
            const uniqueKey = getUniqueTokenKey(token, token.uniqueIndex || 0);
            return (
              <div
                key={uniqueKey}
                onClick={() => handleTokenClick(token)}
                className={`bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C] transition-colors ${
                  isNavigating
                    ? "cursor-wait opacity-70"
                    : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center">
                    <TokenImage
                      src={token.icon}
                      alt={token.symbol}
                      symbol={token.symbol}
                      contractAddress={token.contractAddress}
                      onLoad={() => handleImageLoad(uniqueKey)}
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
            );
          })}
        </div>
      </div>

      {/* Tablet/Desktop List Layout */}
      <div className="hidden sm:block flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-2 pr-1">
          {displayTokens.map((token) => {
            const uniqueKey = getUniqueTokenKey(token, token.uniqueIndex || 0);
            return (
              <div
                key={uniqueKey}
                onClick={() => handleTokenClick(token)}
                className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                  isNavigating
                    ? "cursor-wait opacity-70"
                    : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                }`}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <TokenImage
                    src={token.icon}
                    alt={token.symbol}
                    symbol={token.symbol}
                    contractAddress={token.contractAddress}
                    onLoad={() => handleImageLoad(uniqueKey)}
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
            );
          })}
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

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
