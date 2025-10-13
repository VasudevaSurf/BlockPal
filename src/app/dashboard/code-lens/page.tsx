// src/app/dashboard/code-lens/page.tsx - WITH RELATIVE POSITIONING
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MoreVertical } from "lucide-react";
import TokenActionsMenu from "@/components/dashboard/TokenActionsMenu";
import AddTokensModal from "@/components/dashboard/AddTokensModal";
import { coinlesService } from "@/services/coinlesService";
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
  const [refreshing, setRefreshing] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Set the add token handler for the layout
  useEffect(() => {
    setOnAddTokenClick(() => () => setAddTokensModalOpen(true));
  }, [setOnAddTokenClick]);

  // Load user's watchlist on mount
  useEffect(() => {
    if (user?.email) {
      loadUserWatchlist(false);
    }
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user?.email || tokens.length === 0) return;

    const interval = setInterval(() => {
      console.log("Auto-refreshing token data...");
      loadUserWatchlist(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.email, tokens.length]);

  const loadUserWatchlist = async (isRefresh: boolean = false) => {
    if (!user?.email) return;

    try {
      if (!isRefresh) setLoading(true);

      const watchlist = await coinlesService.getUserWatchlist(
        user.email,
        isRefresh
      );

      const transformedTokens: Token[] = watchlist.map((item) => ({
        id: `${item.chainId}_${item.contractAddress}`,
        chainId: item.chainId,
        contractAddress: item.contractAddress,
        poolAddress: item.poolAddress,
        name: item.tokenName,
        symbol: item.tokenSymbol,
        price: item.marketData?.price || 0,
        change24h: item.marketData?.change24h || 0,
        volume24h: item.marketData?.volume24h || 0,
        marketCap: item.marketData?.marketCap || 0,
        liquidity: item.marketData?.liquidity || 0,
        buys24h: item.transactions?.buys24h || 0,
        sells24h: item.transactions?.sells24h || 0,
        logo: item.metadata?.logo || "",
      }));

      setTokens(transformedTokens);
      setFilteredTokens(transformedTokens);

      console.log(`Loaded ${transformedTokens.length} tokens`);
    } catch (error) {
      console.error("Error loading watchlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!user?.email || refreshing) return;

    try {
      setRefreshing(true);
      console.log("Manual refresh triggered");
      await coinlesService.refreshWatchlist(user.email);
      await loadUserWatchlist(true);
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
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

  // Sync search query changes from context
  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, tokens]);

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

          console.log("Removed token:", token.name);
        }
      } catch (error) {
        console.error("Error removing token:", error);
      }
    }
  };

  const handleAddToken = async (tokenData: any) => {
    if (!user?.email) return;

    console.log("Adding token with data:", tokenData);

    try {
      const watchlistToken = {
        chainId: tokenData.chainId,
        contractAddress: tokenData.contractAddress,
        poolAddress: tokenData.poolAddress,
        tokenName: tokenData.name,
        tokenSymbol: tokenData.symbol,
      };

      const result = await coinlesService.addTokenToWatchlist(
        user.email,
        watchlistToken
      );

      if (result.success && result.token) {
        const newToken: Token = {
          id: `${result.token.chainId}_${result.token.contractAddress}`,
          chainId: result.token.chainId,
          contractAddress: result.token.contractAddress,
          poolAddress: result.token.poolAddress,
          name: result.token.tokenName,
          symbol: result.token.tokenSymbol,
          price: result.token.marketData?.price || 0,
          change24h: result.token.marketData?.change24h || 0,
          volume24h: result.token.marketData?.volume24h || 0,
          marketCap: result.token.marketData?.marketCap || 0,
          liquidity: result.token.marketData?.liquidity || 0,
          buys24h: result.token.transactions?.buys24h || 0,
          sells24h: result.token.transactions?.sells24h || 0,
          logo: result.token.metadata?.logo || tokenData.logo || "",
        };

        console.log("New token created with logo:", newToken.logo);

        const updatedTokens = [...tokens, newToken];
        setTokens(updatedTokens);
        setFilteredTokens(updatedTokens);

        console.log("Token added successfully:", newToken.name);
      }
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

      {/* Add Tokens Modal - Now positioned relative to this container */}
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