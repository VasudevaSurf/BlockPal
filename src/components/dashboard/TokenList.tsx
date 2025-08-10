// src/components/dashboard/TokenList.tsx - Updated to use dashboard V2 data
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useDashboardV2 } from "@/hooks/useDashboardV2";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { RefreshCw } from "lucide-react";
import { SkeletonTokenList } from "@/components/ui/Skeleton";

// Token Image Component
const TokenImage = ({
  src,
  alt,
  symbol,
  className = "",
}: {
  src?: string | null;
  alt: string;
  symbol: string;
  className?: string;
}) => {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    // Show fallback with symbol letter
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center`}
        style={{ backgroundColor: "#4A4A4A" }}
      >
        <span className="text-white font-bold text-xs">
          {symbol?.charAt(0) || "?"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} rounded-full object-cover`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

export default function TokenList() {
  const router = useRouter();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);
  const { isLoading: isNavigating, startLoading } = useNavigationLoading();

  // Use the new dashboard hook for data
  const {
    tokens,
    isInitialized,
    isLoading,
    isRefreshing,
    manualRefresh,
    refreshCount,
  } = useDashboardV2();

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
    if (isNavigating || !activeWallet?.address) {
      return;
    }

    let routeContractAddress: string;
    if (
      token.contractAddress === "native" ||
      token.symbol === "ETH" ||
      !token.contractAddress
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
    }
  };

  const handleRefresh = () => {
    console.log("🔄 Refresh button clicked");
    manualRefresh();
  };

  // Show skeleton while loading initial data
  if (!activeWallet || !isInitialized || (isLoading && tokens.length === 0)) {
    return <SkeletonTokenList />;
  }

  // No wallet selected state
  if (!activeWallet) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
            Token Holdings (0)
          </h2>
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

  // Empty tokens state
  if (tokens.length === 0 && isInitialized && !isLoading) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
            Token Holdings (0)
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh token data"
          >
            <RefreshCw
              size={16}
              className={`lg:w-5 lg:h-5 transition-transform ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
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
          Token Holdings ({tokens.length})
        </h2>
        <div className="flex items-center gap-2">
          {refreshCount > 0 && (
            <span className="text-xs text-gray-500 font-satoshi">
              Refreshed {refreshCount}x
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
            title="Refresh token data"
          >
            <RefreshCw
              size={16}
              className={`lg:w-5 lg:h-5 transition-transform ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Grid Layout */}
      <div className="block sm:hidden flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-1 gap-2 pr-1">
          {tokens.map((token, index) => (
            <div
              key={`${token.contractAddress}_${index}`}
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
                    src={token.imageUrl}
                    alt={token.symbol}
                    symbol={token.symbol}
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
          {tokens.map((token, index) => (
            <div
              key={`${token.contractAddress}_${index}`}
              onClick={() => handleTokenClick(token)}
              className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                isNavigating
                  ? "cursor-wait opacity-70"
                  : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
              }`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <TokenImage
                  src={token.imageUrl}
                  alt={token.symbol}
                  symbol={token.symbol}
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
