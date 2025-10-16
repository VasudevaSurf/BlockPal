// src/app/dashboard/code-lens/page.tsx - TREAT 0 AS NA
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MoreVertical } from "lucide-react";
import TokenActionsMenu from "@/components/dashboard/TokenActionsMenu";
import AddTokensModal from "@/components/dashboard/AddTokensModal";
import { coinlesSocketClient } from "@/services/coinlesSocketClient";
import { useCodeLensContext } from "../layout";

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

export default function CodeLens() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { searchQuery, setSearchQuery, setOnAddTokenClick } =
    useCodeLensContext();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [activeMenuTokenId, setActiveMenuTokenId] = useState<string | null>(
    null
  );
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [addTokensModalOpen, setAddTokensModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const watchlistReceivedRef = useRef(false);

  useEffect(() => {
    setOnAddTokenClick(() => () => setAddTokensModalOpen(true));
  }, [setOnAddTokenClick]);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
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
      setLoading(false);
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
      setLoading(false);
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
      setLoading(false);
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

  // NEW: Check if value is valid (not 0, null, undefined, or NaN)
  const isValidValue = (value: any): boolean => {
    return (
      value !== null && value !== undefined && !isNaN(value) && value !== 0
    );
  };

  // NEW: Format number - show N/A if 0 or invalid
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

  // NEW: Format price - show N/A if 0 or invalid
  const formatPrice = (price: number): string => {
    if (!isValidValue(price)) {
      return "N/A";
    }
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })}`;
  };

  // NEW: Format change - show N/A if 0 or invalid (but allow negative values)
  const formatChange = (
    change: number
  ): { display: string; isPositive: boolean | null } => {
    // For change24h, we need to check if it's exactly 0, not just falsy
    // Allow negative values to show
    if (change === null || change === undefined || isNaN(change)) {
      return { display: "N/A", isPositive: null };
    }
    // If change is 0, it could mean no change or no data
    // Typically APIs send 0 when there's no data, so treat it as N/A
    if (change === 0) {
      return { display: "N/A", isPositive: null };
    }
    const isPositive = change >= 0;
    return {
      display: `${isPositive ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%`,
      isPositive,
    };
  };

  // NEW: Format count - show N/A if 0 or invalid
  const formatCount = (count: number): string => {
    if (!isValidValue(count)) {
      return "N/A";
    }
    return count.toString();
  };

  const handleMoreClick = (tokenId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const button = buttonRefs.current[tokenId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.top,
        left: rect.left - 200 - 8,
      });
      setActiveMenuTokenId(tokenId);
    }
  };

  const handleCopy = () => {
    const token = filteredTokens.find((t) => t.id === activeMenuTokenId);
    if (token) {
      // Copy only the contract address
      navigator.clipboard.writeText(token.contractAddress);
      console.log("Copied contract address:", token.contractAddress);
    }
  };

  const handleRemove = async () => {
    const token = filteredTokens.find((t) => t.id === activeMenuTokenId);
    if (token && user?.email) {
      try {
        coinlesSocketClient.removeToken(
          user.email,
          token.chainId,
          token.contractAddress
        );

        const newTokens = tokens.filter((t) => t.id !== activeMenuTokenId);
        setTokens(newTokens);

        const newFilteredTokens = filteredTokens.filter(
          (t) => t.id !== activeMenuTokenId
        );
        setFilteredTokens(newFilteredTokens);

        console.log("Removed token:", token.name);
        setActiveMenuTokenId(null);
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
    console.log("Navigating to token:", {
      chainId: token.chainId,
      contractAddress: token.contractAddress,
      poolAddress: token.poolAddress,
    });

    router.push(
      `/dashboard/tokenOverview/${token.chainId}/${token.contractAddress}?pool=${token.poolAddress}`
    );
  };

  if (loading) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#000000] rounded-[16px] p-4 flex flex-col overflow-hidden relative">
      {/* Connection Status Indicator */}
      {!connected && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs z-50">
          Disconnected
        </div>
      )}

      {/* Token List Table */}
      <div className="flex-1 bg-[#000000] rounded-2xl border border-[#2C2C2C] overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr_1.2fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 bg-[#191919] text-gray-400 text-sm font-satoshi font-medium">
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
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {filteredTokens.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 font-satoshi">
                {searchQuery
                  ? "No tokens found"
                  : "No tokens in watchlist. Click + to add tokens."}
              </p>
            </div>
          ) : (
            filteredTokens.map((token) => {
              const changeData = formatChange(token.change24h);

              return (
                <div
                  key={token.id}
                  onClick={() => handleTokenClick(token)}
                  className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr_1.2fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                >
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

                  {/* Price - Shows N/A if 0 */}
                  <div className="flex items-center justify-center text-white font-satoshi font-medium text-sm">
                    {formatPrice(token.price)}
                  </div>

                  {/* 24h Change - Shows N/A if 0 */}
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

                  {/* 24h Volume - Shows N/A if 0 */}
                  <div className="flex items-center justify-center text-white font-satoshi text-sm">
                    {formatNumber(token.volume24h)}
                  </div>

                  {/* Market Cap - Shows N/A if 0 */}
                  <div className="flex items-center justify-center text-white font-satoshi text-sm">
                    {formatNumber(token.marketCap)}
                  </div>

                  {/* Liquidity - Shows N/A if 0 */}
                  <div className="flex items-center justify-center text-white font-satoshi text-sm">
                    {formatNumber(token.liquidity)}
                  </div>

                  {/* Buys - Shows N/A if 0 */}
                  <div
                    className={`flex items-center justify-center font-satoshi text-sm ${
                      isValidValue(token.buys24h)
                        ? "text-green-500"
                        : "text-gray-400"
                    }`}
                  >
                    {formatCount(token.buys24h)}
                  </div>

                  {/* Sells - Shows N/A if 0 */}
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
                  <div className="flex items-center justify-center">
                    <button
                      ref={(el) => {
                        buttonRefs.current[token.id] = el;
                      }}
                      onClick={(e) => handleMoreClick(token.id, e)}
                      className="p-1 hover:bg-[#2C2C2C] rounded transition-colors"
                      title="More actions"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Token Actions Menu */}
      <TokenActionsMenu
        isOpen={activeMenuTokenId !== null}
        onClose={() => setActiveMenuTokenId(null)}
        position={menuPosition}
        onCopy={handleCopy}
        onRemove={handleRemove}
      />

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
