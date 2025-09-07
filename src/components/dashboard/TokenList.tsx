"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { RefreshCw, Plus, X } from "lucide-react";
import { SkeletonTokenList } from "@/components/ui/Skeleton";
import AddTokenModal from "@/components/dashboard/AddTokenModal";

// Mock token data for UI
const mockTokens = [
  {
    contractAddress: "native",
    symbol: "ETH",
    name: "Ethereum",
    balance: 2.5,
    value: 8750.25,
    change24h: 5.2,
    imageUrl:
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  },
  {
    contractAddress: "0xa0b86a33e6d3d1ab0cbb4a9b8c8f5d7f8b8e1234",
    symbol: "USDT",
    name: "Tether USD",
    balance: 1500.0,
    value: 1500.0,
    change24h: 0.1,
    imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  },
  {
    contractAddress: "0xb0c5a33e6d3d1ab0cbb4a9b8c8f5d7f8b8e5678",
    symbol: "UNI",
    name: "Uniswap",
    balance: 25.8,
    value: 387.0,
    change24h: -2.3,
    imageUrl:
      "https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png",
  },
];

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
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading: isNavigating, startLoading } = useNavigationLoading();
  const [addTokenModalOpen, setAddTokenModalOpen] = useState(false);
  const [removingToken, setRemovingToken] = useState<string | null>(null);
  const [tokens, setTokens] = useState(mockTokens);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    try {
      const url = `/dashboard/token/${encodeURIComponent(
        token.contractAddress
      )}`;
      startLoading();
      setTimeout(() => {
        router.push(url);
      }, 100);
    } catch (error) {
      console.error("❌ Navigation error:", error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleAddToken = (contractAddress: string) => {
    // Mock adding token to list
    const newToken = {
      contractAddress,
      symbol: "NEW",
      name: "New Token",
      balance: 0,
      value: 0,
      change24h: 0,
      imageUrl: null,
    };
    setTokens([...tokens, newToken]);
    setAddTokenModalOpen(false);
  };

  const handleRemoveToken = async (
    e: React.MouseEvent,
    contractAddress: string
  ) => {
    e.stopPropagation();

    if (removingToken) return;

    setRemovingToken(contractAddress);
    try {
      // Mock removal
      setTimeout(() => {
        setTokens(tokens.filter((t) => t.contractAddress !== contractAddress));
        setRemovingToken(null);
      }, 500);
    } catch (error) {
      console.error("Failed to remove token:", error);
      setRemovingToken(null);
    }
  };

  if (!user) {
    return <SkeletonTokenList />;
  }

  return (
    <>
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo flex-shrink-0">
            Token Holdings ({tokens.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddTokenModalOpen(true)}
              className="p-1.5 text-[#E2AF19] hover:bg-[#2C2C2C] rounded-lg transition-colors"
              title="Add token"
            >
              <Plus size={16} className="lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>

        {/* Token List */}
        {tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 lg:py-8">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
              <span className="text-gray-400 text-base lg:text-lg">🪙</span>
            </div>
            <h3 className="text-white text-sm lg:text-base font-satoshi mb-1">
              No tokens found
            </h3>
            <p className="text-gray-400 font-satoshi text-xs lg:text-sm mb-3">
              Add tokens to track your portfolio
            </p>
            <button
              onClick={() => setAddTokenModalOpen(true)}
              className="px-3 py-1.5 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi text-sm"
            >
              Add Your First Token
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Grid Layout */}
            <div className="block sm:hidden flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 gap-2 pr-1">
                {tokens.map((token, index) => (
                  <div
                    key={`${token.contractAddress}_${index}`}
                    onClick={() => handleTokenClick(token)}
                    className={`bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C] transition-colors relative group ${
                      isNavigating || removingToken === token.contractAddress
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                    }`}
                  >
                    {/* Remove button */}
                    {token.contractAddress !== "native" && (
                      <button
                        onClick={(e) =>
                          handleRemoveToken(e, token.contractAddress)
                        }
                        disabled={removingToken === token.contractAddress}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1 hover:bg-[#2C2C2C] rounded"
                      >
                        <X size={14} />
                      </button>
                    )}

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
                            token.change24h >= 0
                              ? "text-green-400"
                              : "text-red-400"
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

            {/* Desktop List Layout */}
            <div className="hidden sm:block flex-1 overflow-y-auto scrollbar-hide">
              <div className="space-y-2 pr-1">
                {tokens.map((token, index) => (
                  <div
                    key={`${token.contractAddress}_${index}`}
                    onClick={() => handleTokenClick(token)}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors relative group ${
                      isNavigating || removingToken === token.contractAddress
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
                    }`}
                  >
                    {/* Remove button */}
                    {token.contractAddress !== "native" && (
                      <button
                        onClick={(e) =>
                          handleRemoveToken(e, token.contractAddress)
                        }
                        disabled={removingToken === token.contractAddress}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1 hover:bg-[#2C2C2C] rounded z-10"
                      >
                        <X size={14} />
                      </button>
                    )}

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

                    <div className="text-right flex-shrink-0 pr-8">
                      <div className="text-white font-medium font-satoshi text-sm">
                        {formatCurrency(token.value)}
                      </div>
                      <div
                        className={`text-xs font-satoshi ${
                          token.change24h >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercentage(token.change24h)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

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

      {/* Add Token Modal */}
      <AddTokenModal
        isOpen={addTokenModalOpen}
        onClose={() => setAddTokenModalOpen(false)}
        onAddToken={handleAddToken}
      />
    </>
  );
}
