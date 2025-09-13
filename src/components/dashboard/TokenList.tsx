// src/components/dashboard/TokenList.tsx - UPDATED FOR WAGMI V2
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useAccount, useChainId } from "wagmi"; // UPDATED: useChainId instead of useNetwork
import { RootState } from "@/store";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { RefreshCw, Plus, X, AlertCircle } from "lucide-react";
import { SkeletonTokenList } from "@/components/ui/Skeleton";
import AddTokenModal from "@/components/dashboard/AddTokenModal";
import { tokenService, TokenBalance } from "@/services/tokenService";
import { chains } from "@/components/wallet/WalletProvider";

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

  // Wallet integration - UPDATED for wagmi v2
  const { address, isConnected } = useAccount();
  const chainId = useChainId(); // UPDATED: useChainId instead of useNetwork

  // Get current chain data
  const currentChain = chains.find((c) => c.id === chainId);

  // Component state
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addTokenModalOpen, setAddTokenModalOpen] = useState(false);
  const [removingToken, setRemovingToken] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);

  // Fetch tokens when wallet or chain changes
  useEffect(() => {
    if (isConnected && address && chainId) {
      fetchTokens();
    } else {
      // Fallback to mock data when not connected
      setTokens([]);
      setTotalValue(0);
      setLoading(false);
    }
  }, [isConnected, address, chainId]);

  // Fetch tokens from API
  const fetchTokens = async () => {
    if (!address || !chainId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log(`📡 Fetching tokens for ${address} on chain ${chainId}`);

      const response = await tokenService.getWalletTokens(address, chainId);

      setTokens(response.tokens);
      setTotalValue(response.totalValue);

      console.log(
        `✅ Loaded ${
          response.tokens.length
        } tokens, total value: $${response.totalValue.toFixed(2)}`
      );
    } catch (err: any) {
      console.error("❌ Error fetching tokens:", err);
      setError(err.message || "Failed to load tokens");

      // Fallback to empty state on error
      setTokens([]);
      setTotalValue(0);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!address) return;

    setIsRefreshing(true);
    try {
      // Clear cache and refetch
      await tokenService.refreshWalletTokens(address);
      await fetchTokens();
    } catch (err: any) {
      console.error("❌ Error refreshing tokens:", err);
      setError("Failed to refresh tokens");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle token click
  const handleTokenClick = (token: TokenBalance) => {
    if (isNavigating) return;

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

  // Handle add token (placeholder)
  const handleAddToken = (contractAddress: string) => {
    console.log("➕ Add token:", contractAddress);
    // You can implement custom token adding logic here
    setAddTokenModalOpen(false);
  };

  // Handle remove token
  const handleRemoveToken = async (
    e: React.MouseEvent,
    contractAddress: string
  ) => {
    e.stopPropagation();

    if (removingToken || contractAddress === "native") return;

    setRemovingToken(contractAddress);
    try {
      // For now, just remove from local state
      // In a full implementation, you might want to save user preferences
      setTimeout(() => {
        setTokens(tokens.filter((t) => t.contractAddress !== contractAddress));
        setRemovingToken(null);
      }, 500);
    } catch (error) {
      console.error("Failed to remove token:", error);
      setRemovingToken(null);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return tokenService.formatCurrency(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return tokenService.formatPercentage(value);
  };

  // Show loading state
  if (loading) {
    return <SkeletonTokenList />;
  }

  // Show wallet not connected state
  if (!isConnected || !address) {
    return (
      <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-2">
          <h2 className="text-sm lg:text-base font-semibold text-white font-mayeka-demi-bold-demo">
            Token Holdings
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-6 lg:py-8 flex-1">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
            <span className="text-gray-400 text-base lg:text-lg">🔌</span>
          </div>
          <h3 className="text-white text-sm lg:text-base font-satoshi mb-1">
            Connect your wallet
          </h3>
          <p className="text-gray-400 font-satoshi text-xs lg:text-sm">
            Connect your wallet to see your token holdings
          </p>
        </div>
      </div>
    );
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
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50"
              title="Refresh tokens"
            >
              <RefreshCw
                size={16}
                className={`lg:w-5 lg:h-5 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
            <button
              onClick={() => setAddTokenModalOpen(true)}
              className="p-1.5 text-[#E2AF19] hover:bg-[#2C2C2C] rounded-lg transition-colors"
              title="Add token"
            >
              <Plus size={16} className="lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle size={14} className="text-red-400 mr-2 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-satoshi">{error}</p>
                <button
                  onClick={() => fetchTokens()}
                  className="text-red-400 underline text-xs mt-1 font-satoshi"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chain info */}
        {currentChain && (
          <div className="mb-3 p-2 bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-white text-sm font-satoshi">
                  {currentChain.name}
                </span>
              </div>
              <div className="text-gray-400 text-xs font-satoshi">
                Total: {formatCurrency(totalValue)}
              </div>
            </div>
          </div>
        )}

        {/* Token List */}
        {tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 lg:py-8 flex-1">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
              <span className="text-gray-400 text-base lg:text-lg">🪙</span>
            </div>
            <h3 className="text-white text-sm lg:text-base font-satoshi mb-1">
              No tokens found
            </h3>
            <p className="text-gray-400 font-satoshi text-xs lg:text-sm mb-3">
              No token holdings found on {currentChain?.name}
            </p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi text-sm disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
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
                    {!token.isNative && (
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
                          src={token.logoUrl}
                          alt={token.symbol}
                          symbol={token.symbol}
                          className="w-8 h-8 mr-2.5 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-white font-medium font-satoshi text-sm">
                            {token.name}
                          </div>
                          <div className="text-gray-400 text-xs font-satoshi">
                            {tokenService.formatTokenAmount(token.balance, 4)}{" "}
                            {token.symbol}
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
                    {!token.isNative && (
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
                        src={token.logoUrl}
                        alt={token.symbol}
                        symbol={token.symbol}
                        className="w-10 h-10 mr-2.5 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium font-satoshi text-sm sm:text-sm flex items-center">
                          {token.name}
                          {token.isNative && (
                            <span className="ml-2 text-xs bg-[#E2AF19] text-black px-1.5 py-0.5 rounded">
                              Native
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          {tokenService.formatTokenAmount(token.balance, 4)}{" "}
                          {token.symbol}
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
