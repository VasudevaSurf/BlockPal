// src/components/dashboard/TokenList.tsx - SIMPLE STABLE FIX
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

// Token Image Component with dark grey background
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
    const cachedImage = imageCache.get(cacheKey);

    if (cachedImage && cachedImage !== "error") {
      setImageSrc(cachedImage);
      setIsLoading(false);
      setHasError(false);
      if (onLoad) onLoad();
      return;
    }

    if (cachedImage === "error") {
      setIsLoading(false);
      setHasError(true);
      if (onLoad) onLoad();
      return;
    }

    if (src && src !== "null" && src !== "undefined" && src !== "") {
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
    } else {
      setIsLoading(false);
      setHasError(true);
      if (onLoad) onLoad();
    }
  }, [src, cacheKey, symbol]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);

    if (imageSrc && imageSrc !== "error") {
      imageCache.set(cacheKey, imageSrc);
      saveImageCache(imageCache);
    }

    if (onLoad) {
      onLoad();
    }
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    imageCache.set(cacheKey, "error");
    saveImageCache(imageCache);

    if (onLoad) {
      onLoad();
    }
  };

  const shouldShowImage = imageSrc && !hasError;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`w-full h-full rounded-full flex items-center justify-center transition-opacity duration-200 ${
          shouldShowImage && !isLoading ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundColor: "#4A4A4A" }}
      ></div>

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

  // Simple loading state management
  const [isWalletSwitching, setIsWalletSwitching] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  // Track image loading completion
  const [imageLoadingStates, setImageLoadingStates] = useState<
    Record<string, boolean>
  >({});

  // Track wallet switching
  const previousWalletAddress = useRef<string | null>(null);
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataLoadedForWallet = useRef<string | null>(null);

  // Detect wallet switching
  useEffect(() => {
    const currentWalletAddress = activeWallet?.address;
    const prevAddress = previousWalletAddress.current;

    // If wallet changed, IMMEDIATELY start switching state
    if (
      prevAddress &&
      currentWalletAddress &&
      prevAddress !== currentWalletAddress
    ) {
      console.log(
        "🪙 TokenList - Wallet switching detected - IMMEDIATE skeleton"
      );

      // IMMEDIATELY set switching state and clear data
      setIsWalletSwitching(true);
      setHasInitialData(false);
      dataLoadedForWallet.current = null;
      setImageLoadingStates({});

      // Clear any existing timeout
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }

      // Minimum switching time to prevent flickering (3 seconds for stability)
      switchingTimeoutRef.current = setTimeout(() => {
        console.log("🪙 TokenList - Ending switching state after timeout");
        setIsWalletSwitching(false);
      }, 3000); // Increased to 3 seconds for more stability
    }

    // Always update the previous wallet reference
    previousWalletAddress.current = currentWalletAddress;
  }, [activeWallet?.address]);

  // Load data for current wallet
  useEffect(() => {
    if (
      activeWallet?.address &&
      dataLoadedForWallet.current !== activeWallet.address
    ) {
      console.log(
        "🪙 TokenList - Loading tokens for wallet:",
        activeWallet.address
      );

      dataLoadedForWallet.current = activeWallet.address;

      dispatch(fetchWalletTokens(activeWallet.address))
        .then(() => {
          console.log("🪙 TokenList - Tokens loaded successfully");

          // Only set initial data if we're not switching or if enough time has passed
          setTimeout(() => {
            setHasInitialData(true);
          }, 100); // Small delay to ensure data is stable

          // Don't end switching state here - let the timeout handle it
        })
        .catch((error) => {
          console.error("🪙 TokenList - Error loading tokens:", error);
          // Still mark as having data even if there's an error
          setTimeout(() => {
            setHasInitialData(true);
          }, 100);
        });
    }
  }, [activeWallet?.address, dispatch]);

  // Mark data as loaded when we have tokens
  useEffect(() => {
    if (activeWallet?.address && !hasInitialData) {
      console.log("🪙 TokenList - Tokens detected, marking as loaded");
      setHasInitialData(true);
    }
  }, [tokens.length, activeWallet?.address, hasInitialData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }
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

      if (
        cachedImage &&
        cachedImage !== "error" &&
        (!token.icon ||
          token.icon === "null" ||
          token.icon === "undefined" ||
          token.icon === "")
      ) {
        return { ...token, icon: cachedImage };
      }

      return token;
    });
  }, [tokens]);

  // Create a unique key for each token
  const getUniqueTokenKey = (token: any, index: number): string => {
    const baseKey =
      token.contractAddress && token.contractAddress !== "native"
        ? `${token.contractAddress}_${index}`
        : `${token.symbol}_native_${index}`;
    return baseKey;
  };

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
      return;
    }

    if (!activeWallet?.address) {
      alert("Please select an active wallet first.");
      return;
    }

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
    } else {
      routeContractAddress = token.contractAddress;
    }

    try {
      const url = `/dashboard/token/${encodeURIComponent(
        routeContractAddress
      )}?wallet=${encodeURIComponent(activeWallet.address)}`;

      startLoading();

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

      if (!tokenMap.has(key)) {
        tokenMap.set(key, { ...token, uniqueIndex: index });
      }
    });

    return Array.from(tokenMap.values());
  };

  const displayTokens = getDisplayTokens();

  // Simple skeleton logic: show skeleton if switching OR no wallet OR no initial data OR still loading
  const shouldShowSkeleton =
    isWalletSwitching ||
    !activeWallet ||
    (!hasInitialData && loading) ||
    isNavigating;

  if (shouldShowSkeleton) {
    console.log("🪙 TokenList - Showing skeleton:", {
      isWalletSwitching,
      hasActiveWallet: !!activeWallet,
      hasInitialData,
      loading,
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

  if (displayTokens.length === 0 && hasInitialData) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
            Token Holdings (0)
          </h2>
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
      `}</style>
    </div>
  );
}
