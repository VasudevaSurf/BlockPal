// src/app/dashboard/code-lens/page.tsx - COMPLETE CODE WITH COINLES INTEGRATION
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Search, Plus, SlidersHorizontal, MoreVertical } from "lucide-react";
import TokenActionsMenu from "@/components/dashboard/TokenActionsMenu";
import AddTokensModal from "@/components/dashboard/AddTokensModal";
import { coinlesService, WatchlistToken } from "@/services/coinlesService";

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

  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [activeMenuTokenId, setActiveMenuTokenId] = useState<string | null>(
    null
  );
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [addTokensModalOpen, setAddTokensModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Load user's watchlist on mount
  useEffect(() => {
    if (user?.email) {
      loadUserWatchlist();
    }
  }, [user]);

  const loadUserWatchlist = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const watchlist = await coinlesService.getUserWatchlist(user.email);

      // Transform watchlist to Token format
      const transformedTokens: Token[] = watchlist.map((item) => ({
        id: `${item.chainId}_${item.contractAddress}`,
        chainId: item.chainId,
        contractAddress: item.contractAddress,
        poolAddress: item.poolAddress,
        name: item.tokenName,
        symbol: item.tokenSymbol,
        price: 0, // Will be updated by real-time data
        change24h: 0,
        volume24h: 0,
        marketCap: 0,
        liquidity: 0,
        buys24h: 0,
        sells24h: 0,
      }));

      setTokens(transformedTokens);
      setFilteredTokens(transformedTokens);
    } catch (error) {
      console.error("Error loading watchlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredTokens(tokens);
    } else {
      const filtered = tokens.filter(
        (token) =>
          token.name.toLowerCase().includes(query.toLowerCase()) ||
          token.symbol.toLowerCase().includes(query.toLowerCase())
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
      const tokenInfo = `${token.name} (${
        token.symbol
      }) - $${token.price.toLocaleString()}`;
      navigator.clipboard.writeText(tokenInfo);
      console.log("✅ Copied token info:", tokenInfo);
    }
  };

  const handleRemove = async () => {
    const token = filteredTokens.find((t) => t.id === activeMenuTokenId);
    if (token && user?.email) {
      try {
        const success = await coinlesService.removeTokenFromWatchlist(
          user.email,
          token.chainId,
          token.contractAddress
        );

        if (success) {
          const newTokens = tokens.filter((t) => t.id !== activeMenuTokenId);
          setTokens(newTokens);

          const newFilteredTokens = filteredTokens.filter(
            (t) => t.id !== activeMenuTokenId
          );
          setFilteredTokens(newFilteredTokens);

          console.log("🗑️ Removed token:", token.name);
        }
      } catch (error) {
        console.error("Error removing token:", error);
      }
    }
  };

  const handleAddToken = async (tokenData: any) => {
    if (!user?.email) return;

    console.log("➕ Adding token:", tokenData);

    try {
      const watchlistToken: WatchlistToken = {
        chainId: tokenData.chainId,
        contractAddress: tokenData.contractAddress,
        poolAddress: tokenData.poolAddress,
        tokenName: tokenData.name,
        tokenSymbol: tokenData.symbol,
      };

      const success = await coinlesService.addTokenToWatchlist(
        user.email,
        watchlistToken
      );

      if (success) {
        const newToken: Token = {
          id: `${tokenData.chainId}_${tokenData.contractAddress}`,
          chainId: tokenData.chainId,
          contractAddress: tokenData.contractAddress,
          poolAddress: tokenData.poolAddress,
          name: tokenData.name,
          symbol: tokenData.symbol,
          price: tokenData.price || 0,
          change24h: tokenData.change24h || 0,
          volume24h: tokenData.volume24h || 0,
          marketCap: 0,
          liquidity: tokenData.liquidity || 0,
          buys24h: tokenData.buys24h || 0,
          sells24h: tokenData.sells24h || 0,
          logo: tokenData.logo,
        };

        const updatedTokens = [...tokens, newToken];
        setTokens(updatedTokens);
        setFilteredTokens(updatedTokens);
      }
    } catch (error) {
      console.error("Error adding token:", error);
    }
  };

  const handleTokenClick = (token: Token) => {
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
    <div className="h-full bg-[#0F0F0F] rounded-[16px] p-4 flex flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search tokens or paste address"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-black border border-[#2C2C2C] rounded-xl pl-12 pr-14 py-3 text-gray-300 text-sm font-satoshi placeholder-gray-600 focus:outline-none focus:border-[#E2AF19] transition-colors"
          />
          <button
            onClick={() => setAddTokensModalOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#E2AF19] hover:bg-[#D4A853] p-2 rounded-lg transition-colors"
            title="Add Tokens"
          >
            <Plus className="w-4 h-4 text-black" />
          </button>
        </div>
        <button
          className="bg-black border border-[#2C2C2C] hover:border-[#E2AF19] p-3 rounded-xl transition-colors"
          title="Filters"
        >
          <SlidersHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Token List Table */}
      <div className="flex-1 bg-[#0F0F0F] rounded-2xl border border-[#2C2C2C] overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.5fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 bg-[#191919] text-gray-400 text-sm font-satoshi font-medium">
          <div className="flex items-center">Token</div>
          <div className="flex items-center justify-center">Price</div>
          <div className="flex items-center justify-center">24h</div>
          <div className="flex items-center justify-center">24h Volume</div>
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
                className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.5fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer"
              >
                {/* Token */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {token.logo ? (
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
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
                  ${token.price.toLocaleString()}
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
