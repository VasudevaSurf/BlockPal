// src/app/dashboard/code-lens/page.tsx - COMPLETE WEBSOCKET VERSION
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

  // Set the add token handler for the layout
  useEffect(() => {
    setOnAddTokenClick(() => () => setAddTokensModalOpen(true));
  }, [setOnAddTokenClick]);

  // Connect to WebSocket and load user's watchlist
  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    console.log("🔌 Connecting to CoinLes WebSocket...");

    // Connect to WebSocket
    coinlesSocketClient.connect(user.email);

    // Set up event listeners
    const handleWatchlist = (data: any[]) => {
      console.log("📋 Received watchlist:", data.length, "tokens");
      const transformedTokens = transformWatchlistData(data);
      setTokens(transformedTokens);
      setFilteredTokens(transformedTokens);
      setLoading(false);
      setConnected(true);
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
      setAddTokensModalOpen(false);
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

    // Register event listeners
    coinlesSocketClient.on("watchlist", handleWatchlist);
    coinlesSocketClient.on("token-update", handleTokenUpdate);
    coinlesSocketClient.on("token-added", handleTokenAdded);
    coinlesSocketClient.on("token-removed", handleTokenRemoved);
    coinlesSocketClient.on("error", handleError);
    coinlesSocketClient.on("connect", handleConnect);
    coinlesSocketClient.on("disconnect", handleDisconnect);

    // Cleanup on unmount
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

  // Handle search query changes
  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, tokens]);

  // Transform watchlist data from WebSocket to frontend format
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

  // Transform single token
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

  const formatNumber = (num: number) => {
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
      const tokenInfo = `${token.name} (${token.symbol})\nContract: ${
        token.contractAddress
      }\nPrice: $${token.price.toLocaleString()}\nMarket Cap: ${formatNumber(
        token.marketCap
      )}`;
      navigator.clipboard.writeText(tokenInfo);
      console.log("Copied token info:", tokenInfo);
    }
  };

  const handleRemove = async () => {
    const token = filteredTokens.find((t) => t.id === activeMenuTokenId);
    if (token && user?.email) {
      try {
        // Emit remove token event via WebSocket
        coinlesSocketClient.removeToken(
          user.email,
          token.chainId,
          token.contractAddress
        );

        // Optimistically update UI
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
      // Emit add token event via WebSocket
      coinlesSocketClient.addToken(user.email, {
        chainId: tokenData.chainId,
        contractAddress: tokenData.contractAddress,
        poolAddress: tokenData.poolAddress,
        tokenName: tokenData.name,
        tokenSymbol: tokenData.symbol,
      });

      // UI will be updated via 'token-added' event
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
            filteredTokens.map((token) => (
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
                            fallback.className = "text-white text-xs font-bold";
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
                  $
                  {token.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                </div>

                {/* 24h Change */}
                <div
                  className={`flex items-center justify-center font-satoshi font-medium text-sm ${
                    token.change24h > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {token.change24h > 0 ? "▲" : "▼"}{" "}
                  {Math.abs(token.change24h).toFixed(2)}%
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
                <div className="flex items-center justify-center text-green-500 font-satoshi text-sm">
                  {token.buys24h}
                </div>

                {/* Sells */}
                <div className="flex items-center justify-center text-red-500 font-satoshi text-sm">
                  {token.sells24h}
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
            ))
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
