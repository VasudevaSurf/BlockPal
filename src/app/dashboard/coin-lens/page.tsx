"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MoreVertical, Copy, Minus, X } from "lucide-react";
import AddTokensModal from "@/components/dashboard/AddTokensModal";
import { coinlesSocketClient } from "@/services/coinlesSocketClient";
import { useCodeLensContext } from "../layout";
import { useCoinLensLoading } from "@/contexts/CoinLensLoadingContext";
import BlockPalLoader from "@/components/ui/BlockPalLoader";

interface Token {
  id: string;
  chainId: string;
  contractAddress: string;
  poolAddress: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  buys24h: number;
  sells24h: number;
  logo?: string;
}

function CoinLensContent() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { searchQuery, setSearchQuery, setOnAddTokenClick } =
    useCodeLensContext();
  const { setDataReady } = useCoinLensLoading();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [activeMenuTokenId, setActiveMenuTokenId] = useState<string | null>(
    null
  );
  const [addTokensModalOpen, setAddTokensModalOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  const watchlistReceivedRef = useRef(false);
  const hasReportedDataRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }

      if (target.closest('button[title="More actions"]')) {
        return;
      }

      setActiveMenuTokenId(null);
    };

    if (activeMenuTokenId) {
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [activeMenuTokenId]);

  useEffect(() => {
    setOnAddTokenClick(() => () => setAddTokensModalOpen(true));
  }, [setOnAddTokenClick]);

  // Report data ready when watchlist is received or when connected without tokens
  useEffect(() => {
    if (!hasReportedDataRef.current) {
      // Data is ready when:
      // 1. We have received the watchlist (with or without tokens)
      // 2. OR we're connected and the watchlist request has been processed
      if (watchlistReceivedRef.current || (connected && tokens.length === 0)) {
        console.log("✅ CoinLens: Marking data as ready", {
          tokensCount: tokens.length,
          connected,
          watchlistReceived: watchlistReceivedRef.current,
        });
        setDataReady();
        hasReportedDataRef.current = true;
      }
    }
  }, [tokens.length, connected, setDataReady]);

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    console.log("🔌 Setting up WebSocket connection...");

    const isAlreadyConnected = coinlesSocketClient.isConnected();
    console.log(
      `Connection status: ${isAlreadyConnected ? "Connected" : "Not connected"}`
    );

    coinlesSocketClient.connect(user.email);

    const handleWatchlist = (data: any[]) => {
      console.log("📋 Received watchlist:", data.length, "tokens");
      const transformedTokens = transformWatchlistData(data);
      setTokens(transformedTokens);
      setFilteredTokens(transformedTokens);
      setConnected(true);
      watchlistReceivedRef.current = true;
    };

    const handleTokenUpdate = (update: any) => {
      console.log(
        "🔄 Received token update:",
        update.chainId,
        update.contractAddress
      );
      setTokens((prev) =>
        prev.map((token) => {
          if (
            token.chainId === update.chainId &&
            token.contractAddress === update.contractAddress
          ) {
            return transformSingleToken(update.data);
          }
          return token;
        })
      );
    };

    const handleTokenAdded = (response: any) => {
      console.log("✅ Token added:", response);
      if (response.success && response.tokenData) {
        const newToken = transformSingleToken(response.tokenData);
        setTokens((prev) => [...prev, newToken]);
        setFilteredTokens((prev) => [...prev, newToken]);
      }
    };

    const handleTokenRemoved = (response: any) => {
      console.log("🗑️ Token removed:", response);
    };

    const handleError = (error: any) => {
      console.error("❌ WebSocket error:", error);
    };

    const handleConnect = () => {
      console.log("✅ WebSocket connected");
      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log("❌ WebSocket disconnected");
      setConnected(false);
    };

    coinlesSocketClient.on("watchlist", handleWatchlist);
    coinlesSocketClient.on("token-update", handleTokenUpdate);
    coinlesSocketClient.on("token-added", handleTokenAdded);
    coinlesSocketClient.on("token-removed", handleTokenRemoved);
    coinlesSocketClient.on("error", handleError);
    coinlesSocketClient.on("connect", handleConnect);
    coinlesSocketClient.on("disconnect", handleDisconnect);

    if (isAlreadyConnected && !watchlistReceivedRef.current) {
      console.log("🔄 Already connected, requesting watchlist...");
      setTimeout(() => {
        coinlesSocketClient.emit("register", { email: user.email });
      }, 100);
    } else if (watchlistReceivedRef.current) {
      console.log("✅ Using cached watchlist data");
      setConnected(true);
    }

    return () => {
      coinlesSocketClient.off("watchlist", handleWatchlist);
      coinlesSocketClient.off("token-update", handleTokenUpdate);
      coinlesSocketClient.off("token-added", handleTokenAdded);
      coinlesSocketClient.off("token-removed", handleTokenRemoved);
      coinlesSocketClient.off("error", handleError);
      coinlesSocketClient.off("connect", handleConnect);
      coinlesSocketClient.off("disconnect", handleDisconnect);
    };
  }, [user?.email]);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, tokens]);

  const transformWatchlistData = (data: any[]): Token[] => {
    return data.map((item) => ({
      id: `${item.chainId}_${item.contractAddress}`,
      chainId: item.chainId,
      contractAddress: item.contractAddress,
      poolAddress: item.poolAddress,
      name: item.metadata?.name || item.tokenName || "Unknown",
      symbol: item.metadata?.symbol || item.tokenSymbol || "???",
      price: item.marketData?.price || 0,
      change24h: item.marketData?.change24h || 0,
      volume24h: item.marketData?.volume24h || 0,
      marketCap: item.marketData?.marketCap || 0,
      liquidity: item.marketData?.liquidity || 0,
      buys24h: item.transactions?.buys24h || 0,
      sells24h: item.transactions?.sells24h || 0,
      logo: item.metadata?.logo || "",
    }));
  };

  const transformSingleToken = (data: any): Token => {
    return {
      id: `${data.chainId}_${data.contractAddress}`,
      chainId: data.chainId,
      contractAddress: data.contractAddress,
      poolAddress: data.poolAddress,
      name: data.metadata?.name || "Unknown",
      symbol: data.metadata?.symbol || "???",
      price: data.marketData?.price || 0,
      change24h: data.marketData?.change24h || 0,
      volume24h: data.marketData?.volume24h || 0,
      marketCap: data.marketData?.marketCap || 0,
      liquidity: data.marketData?.liquidity || 0,
      buys24h: data.transactions?.buys24h || 0,
      sells24h: data.transactions?.sells24h || 0,
      logo: data.metadata?.logo || "",
    };
  };

  const handleSearch = (query: string) => {
    if (query.trim() === "") {
      setFilteredTokens(tokens);
    } else {
      const filtered = tokens.filter(
        (token) =>
          token.name.toLowerCase().includes(query.toLowerCase()) ||
          token.symbol.toLowerCase().includes(query.toLowerCase()) ||
          token.contractAddress.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTokens(filtered);
    }
  };

  const isValidValue = (value: any): boolean => {
    return (
      value !== null && value !== undefined && !isNaN(value) && value !== 0
    );
  };

  const formatNumber = (num: number): string => {
    if (!isValidValue(num)) {
      return "N/A";
    }
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const formatPrice = (price: number): string => {
    if (!isValidValue(price)) {
      return "N/A";
    }
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })}`;
  };

  const formatChange = (
    change: number
  ): { display: string; isPositive: boolean | null } => {
    if (change === null || change === undefined || isNaN(change)) {
      return { display: "N/A", isPositive: null };
    }
    if (change === 0) {
      return { display: "N/A", isPositive: null };
    }
    const isPositive = change >= 0;
    return {
      display: `${isPositive ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%`,
      isPositive,
    };
  };

  const formatCount = (count: number): string => {
    if (!isValidValue(count)) {
      return "N/A";
    }
    return count.toString();
  };

  const handleMoreClick = (tokenId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveMenuTokenId(activeMenuTokenId === tokenId ? null : tokenId);
  };

  const handleCopy = (tokenId: string) => {
    const token = filteredTokens.find((t) => t.id === tokenId);
    if (token) {
      navigator.clipboard.writeText(token.contractAddress);
      console.log("Copied contract address:", token.contractAddress);
      setTimeout(() => setActiveMenuTokenId(null), 100);
    }
  };

  const handleRemove = async (tokenId: string) => {
    const token = filteredTokens.find((t) => t.id === tokenId);
    if (token && user?.email) {
      try {
        coinlesSocketClient.removeToken(
          user.email,
          token.chainId,
          token.contractAddress
        );

        const newTokens = tokens.filter((t) => t.id !== tokenId);
        setTokens(newTokens);

        const newFilteredTokens = filteredTokens.filter(
          (t) => t.id !== tokenId
        );
        setFilteredTokens(newFilteredTokens);

        console.log("Removed token:", token.name);
      } catch (error) {
        console.error("Error removing token:", error);
      }
    }
  };

  const handleAddToken = async (tokenData: any) => {
    if (!user?.email) return;

    console.log("Adding token with data:", tokenData);

    try {
      coinlesSocketClient.addToken(user.email, {
        chainId: tokenData.chainId,
        contractAddress: tokenData.contractAddress,
        poolAddress: tokenData.poolAddress,
        tokenName: tokenData.name,
        tokenSymbol: tokenData.symbol,
      });
    } catch (error) {
      console.error("Error adding token:", error);
    }
  };

  const handleTokenClick = (token: Token) => {
    if (activeMenuTokenId) {
      setActiveMenuTokenId(null);
      return;
    }

    console.log("Navigating to token:", {
      chainId: token.chainId,
      contractAddress: token.contractAddress,
      poolAddress: token.poolAddress,
    });

    router.push(
      `/dashboard/tokenOverview/${token.chainId}/${token.contractAddress}?pool=${token.poolAddress}`
    );
  };

  return (
    <div className="h-full bg-[#000000] rounded-[16px] p-2 sm:p-4 flex flex-col overflow-hidden relative">
      {/* Token List Table */}
      <div className="flex-1 bg-[#000000] rounded-2xl border border-[#2C2C2C] overflow-hidden flex flex-col">
        {/* Table Header - Desktop Only */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr_1.2fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 bg-[#191919] text-gray-400 text-sm font-satoshi font-medium">
          <div className="flex items-center">Token</div>
          <div className="flex items-center justify-center">Price</div>
          <div className="flex items-center justify-center">24h</div>
          <div className="flex items-center justify-center">24h Volume</div>
          <div className="flex items-center justify-center">Market Cap</div>
          <div className="flex items-center justify-center">Liquidity</div>
          <div className="flex items-center justify-center">Buys</div>
          <div className="flex items-center justify-center">Sells</div>
          <div className="flex items-center justify-center">Actions</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide relative">
          {filteredTokens.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 font-satoshi text-xs sm:text-sm">
                {searchQuery
                  ? "No tokens found"
                  : "No tokens in watchlist. Click + to add tokens."}
              </p>
            </div>
          ) : (
            filteredTokens.map((token) => {
              const changeData = formatChange(token.change24h);

              return (
                <div key={token.id} onClick={() => handleTokenClick(token)}>
                  {/* Desktop View */}
                  <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr_1.2fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer relative">
                    {/* Token */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#2C2C2C]">
                        {token.logo ? (
                          <img
                            src={token.logo}
                            alt={token.symbol}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const fallback = document.createElement("span");
                                fallback.className =
                                  "text-white text-xs font-bold";
                                fallback.textContent = token.symbol.charAt(0);
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-white text-xs font-bold">
                            {token.symbol.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-row items-baseline gap-1.5">
                        <div className="text-white font-satoshi font-medium text-sm">
                          {token.name}
                        </div>
                        <div className="text-gray-500 font-satoshi text-xs">
                          {token.symbol}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-center text-white font-satoshi font-medium text-sm">
                      {formatPrice(token.price)}
                    </div>

                    {/* 24h Change */}
                    <div
                      className={`flex items-center justify-center font-satoshi font-medium text-sm ${
                        changeData.isPositive === null
                          ? "text-gray-400"
                          : changeData.isPositive
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {changeData.display}
                    </div>

                    {/* 24h Volume */}
                    <div className="flex items-center justify-center text-white font-satoshi text-sm">
                      {formatNumber(token.volume24h)}
                    </div>

                    {/* Market Cap */}
                    <div className="flex items-center justify-center text-white font-satoshi text-sm">
                      {formatNumber(token.marketCap)}
                    </div>

                    {/* Liquidity */}
                    <div className="flex items-center justify-center text-white font-satoshi text-sm">
                      {formatNumber(token.liquidity)}
                    </div>

                    {/* Buys */}
                    <div
                      className={`flex items-center justify-center font-satoshi text-sm ${
                        isValidValue(token.buys24h)
                          ? "text-green-500"
                          : "text-gray-400"
                      }`}
                    >
                      {formatCount(token.buys24h)}
                    </div>

                    {/* Sells */}
                    <div
                      className={`flex items-center justify-center font-satoshi text-sm ${
                        isValidValue(token.sells24h)
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      {formatCount(token.sells24h)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center relative">
                      <button
                        onClick={(e) => handleMoreClick(token.id, e)}
                        className="p-1 hover:bg-[#2C2C2C] rounded transition-colors"
                        title="More actions"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>

                      {/* Inline Menu */}
                      {activeMenuTokenId === token.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-10 top-8 z-50 bg-black rounded-xl w-[200px] shadow-2xl border border-[#2C2C2C] overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Close Button */}
                          <div className="absolute top-0 left-0 z-10">
                            <button
                              onClick={() => setActiveMenuTokenId(null)}
                              className="p-2 hover:bg-[#1A1A1A] transition-colors rounded-tl-xl"
                            >
                              <X
                                className="w-4 h-4 text-gray-400"
                                strokeWidth={2}
                              />
                            </button>
                          </div>

                          {/* Button Container */}
                          <div className="pt-10 p-3 space-y-2">
                            {/* Copy Button */}
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCopy(token.id);
                              }}
                              className="w-full flex items-center justify-between gap-2 px-8 py-2 bg-[#E2AF19] rounded-lg hover:bg-[#D4A853] transition-colors"
                            >
                              <span className="text-black font-satoshi text-sm font-medium">
                                Copy
                              </span>
                              <Copy
                                className="w-4 h-4 text-black"
                                strokeWidth={2}
                              />
                            </button>

                            {/* Remove Button */}
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemove(token.id);
                              }}
                              className="w-full flex items-center justify-between gap-2 px-8 py-2 bg-transparent border border-[#E74C3C] rounded-lg hover:bg-[#E74C3C]/10 transition-colors"
                            >
                              <span className="text-[#E74C3C] font-satoshi text-sm font-medium">
                                Remove
                              </span>
                              <Minus
                                className="w-4 h-4 text-[#E74C3C]"
                                strokeWidth={2}
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="lg:hidden border-b border-[#2C2C2C] hover:bg-[#1A1A1A] transition-colors cursor-pointer relative">
                    <div className="px-2 py-2 flex items-center gap-2">
                      {/* Left Side: Token Info */}
                      <div className="flex items-center gap-1.5 w-[80px] flex-shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#2C2C2C] flex-shrink-0">
                          {token.logo ? (
                            <img
                              src={token.logo}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  const fallback =
                                    document.createElement("span");
                                  fallback.className =
                                    "text-white text-[10px] font-bold";
                                  fallback.textContent = token.symbol.charAt(0);
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-white text-[10px] font-bold">
                              {token.symbol.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="text-white font-satoshi font-medium text-[11px] truncate">
                            {token.symbol}
                          </div>
                          <div className="text-gray-500 font-satoshi text-[9px] truncate">
                            {token.name}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: All Values */}
                      <div className="flex-1 min-w-0">
                        {/* First Row */}
                        <div className="flex items-center justify-end gap-2 mb-1.5">
                          {/* Price */}
                          <div className="flex items-center">
                            <span className="text-white font-satoshi font-bold text-[11px]">
                              {formatPrice(token.price)}
                            </span>
                          </div>

                          {/* 1H Change */}
                          <div className="flex items-center gap-0.5">
                            <span className="text-gray-400 font-satoshi text-[9px] border border-[#2C2C2C] px-1 py-0.5 rounded">
                              1H
                            </span>
                            <span
                              className={`font-satoshi font-medium text-[10px] ${
                                changeData.isPositive === null
                                  ? "text-gray-400"
                                  : changeData.isPositive
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {changeData.display}
                            </span>
                          </div>

                          {/* 24h */}
                          <div className="flex items-center gap-0.5">
                            <span className="text-gray-400 font-satoshi text-[9px] border border-[#2C2C2C] px-1 py-0.5 rounded">
                              24H
                            </span>
                            <span className="text-green-500 font-satoshi text-[10px]">
                              0.3%
                            </span>
                          </div>
                        </div>

                        {/* Second Row */}
                        <div className="flex items-center justify-end gap-2">
                          {/* Liquidity */}
                          <div className="flex items-center gap-0.5">
                            <span className="text-gray-400 font-satoshi text-[9px] border border-[#2C2C2C] px-1 py-0.5 rounded">
                              LIQ
                            </span>
                            <span className="text-white font-satoshi text-[10px]">
                              {formatNumber(token.liquidity)}
                            </span>
                          </div>

                          {/* Volume */}
                          <div className="flex items-center gap-0.5">
                            <span className="text-gray-400 font-satoshi text-[9px] border border-[#2C2C2C] px-1 py-0.5 rounded">
                              VOL
                            </span>
                            <span className="text-white font-satoshi text-[10px]">
                              {formatNumber(token.volume24h)}
                            </span>
                          </div>

                          {/* Market Cap */}
                          <div className="flex items-center gap-0.5">
                            <span className="text-gray-400 font-satoshi text-[9px] border border-[#2C2C2C] px-1 py-0.5 rounded">
                              MCAP
                            </span>
                            <span className="text-white font-satoshi text-[10px]">
                              {formatNumber(token.marketCap)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="relative">
                        <button
                          onClick={(e) => handleMoreClick(token.id, e)}
                          className="p-0.5 hover:bg-[#2C2C2C] rounded transition-colors flex-shrink-0"
                          title="More actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                        </button>

                        {/* Mobile Inline Menu */}
                        {activeMenuTokenId === token.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-8 top-6 z-50 bg-black rounded-xl w-[150px] shadow-2xl border border-[#2C2C2C] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Close Button */}
                            <div className="absolute top-0 left-0 z-10">
                              <button
                                onClick={() => setActiveMenuTokenId(null)}
                                className="p-1.5 hover:bg-[#1A1A1A] transition-colors rounded-tl-xl"
                              >
                                <X
                                  className="w-3 h-3 text-gray-400"
                                  strokeWidth={2}
                                />
                              </button>
                            </div>

                            {/* Button Container */}
                            <div className="pt-8 p-2 space-y-1">
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCopy(token.id);
                                }}
                                className="w-full flex items-center justify-between gap-1 px-3 py-1.5 bg-[#E2AF19] rounded-lg hover:bg-[#D4A853] transition-colors"
                              >
                                <span className="text-black font-satoshi text-xs font-medium">
                                  Copy
                                </span>
                                <Copy
                                  className="w-3 h-3 text-black"
                                  strokeWidth={2}
                                />
                              </button>

                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemove(token.id);
                                }}
                                className="w-full flex items-center justify-between gap-1 px-3 py-1.5 bg-transparent border border-[#E74C3C] rounded-lg hover:bg-[#E74C3C]/10 transition-colors"
                              >
                                <span className="text-[#E74C3C] font-satoshi text-xs font-medium">
                                  Remove
                                </span>
                                <Minus
                                  className="w-3 h-3 text-[#E74C3C]"
                                  strokeWidth={2}
                                />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Tokens Modal */}
      <AddTokensModal
        isOpen={addTokensModalOpen}
        onClose={() => setAddTokensModalOpen(false)}
        onAddToken={handleAddToken}
        existingTokens={tokens.map((token) => ({
          chainId: token.chainId,
          contractAddress: token.contractAddress,
        }))}
      />

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

export default function CoinLens() {
  const { isLoading } = useCoinLensLoading();

  return (
    <>
      {/* Show loader while loading */}
      {isLoading && <BlockPalLoader loadingText="Loading CoinLens" />}

      {/* Show content with fade transition */}
      <div
        className={`h-full transition-opacity duration-300 ${
          isLoading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <CoinLensContent />
      </div>
    </>
  );
}
