// src/components/dashboard/AddTokensModal.tsx - ENHANCED WITH COINGECKO TRENDING + RECENTLY ADDED
import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { coinlesService, TokenSearchResult } from "@/services/coinlesService";
import { useCoinGecko, TrendingToken } from "@/hooks/useCoinGecko";

interface AddTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToken: (token: any) => void;
}

// Custom SVG Icons
const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M15.7099 15.1798L12.6099 13.3298C12.0699 13.0098 11.6299 12.2398 11.6299 11.6098V7.50977"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrendingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM18 16.5C18 16.88 17.62 17.14 17.28 16.99L13.17 15.18C12.45 14.86 11.54 14.86 10.82 15.18L6.71 16.99C6.37 17.14 5.99 16.88 5.99 16.5V11.5C5.99 7.97 7.46 6.5 10.99 6.5H17.99V16.5H18Z"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TopGainersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M16.5 9.5L12.3 13.7L10.7 11.3L7.5 14.5"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.5 9.5H16.5V11.5"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TABS = [
  { id: "trending", label: "Trending", icon: TrendingIcon },
  { id: "eth", label: "Ethereum", icon: TopGainersIcon },
  { id: "bsc", label: "BSC", icon: TopGainersIcon },
  { id: "sol", label: "Solana", icon: TopGainersIcon },
];

const CHAIN_MAPPING: { [key: string]: string } = {
  trending: "eth",
  eth: "eth",
  bsc: "bsc",
  sol: "sol",
};

export default function AddTokensModal({
  isOpen,
  onClose,
  onAddToken,
}: AddTokensModalProps) {
  // Get user from Redux
  const { user } = useSelector((state: RootState) => state.auth);

  // Get real trending tokens from CoinGecko
  const { data: coinGeckoData, loading: coinGeckoLoading } = useCoinGecko();

  const [activeTab, setActiveTab] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<TokenSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] =
    useState<NodeJS.Timeout | null>(null);

  // Get trending tokens from CoinGecko
  const trendingTokens = coinGeckoData?.trendingTokens || [];

  // Load recently added tokens when modal opens
  useEffect(() => {
    if (isOpen && user?.email) {
      loadRecentlyAdded();
    }
  }, [isOpen, user?.email]);

  // Load recently added tokens from user's watchlist
  const loadRecentlyAdded = async () => {
    if (!user?.email) return;

    try {
      const watchlist = await coinlesService.getUserWatchlist(
        user.email,
        false
      );

      // Get last 5 added tokens
      const recent = watchlist
        .sort((a, b) => {
          const dateA = new Date(a.addedAt || 0).getTime();
          const dateB = new Date(b.addedAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5)
        .map((item) => ({
          poolAddress: item.poolAddress,
          contractAddress: item.contractAddress,
          contractAddressDisplay: `${item.contractAddress.substring(
            0,
            6
          )}...${item.contractAddress.substring(
            item.contractAddress.length - 4
          )}`,
          name: item.tokenName,
          symbol: item.tokenSymbol,
          price: item.marketData?.price || 0,
          logo: item.metadata?.logo || "",
          change24h: item.marketData?.change24h || 0,
          liquidity: item.marketData?.liquidity || 0,
          volume24h: item.marketData?.volume24h || 0,
          buys24h: item.transactions?.buys24h || 0,
          sells24h: item.transactions?.sells24h || 0,
          poolCount: 1,
          displayName: item.tokenName,
        }));

      setRecentlyAdded(recent);
    } catch (error) {
      console.error("Error loading recently added tokens:", error);
      setRecentlyAdded([]);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedTokens(new Set());
      setActiveTab("trending");
      setSearchResults([]);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    if (searchQuery.trim().length > 0) {
      const timer = setTimeout(() => {
        handleSearch(searchQuery.trim());
      }, 500);
      setSearchDebounceTimer(timer);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchQuery]);

  // Handle search
  const handleSearch = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const chain = CHAIN_MAPPING[activeTab] || "eth";

      console.log("Searching for:", query, "on chain:", chain);

      const results = await coinlesService.searchTokens(chain, query);

      if (results && results.length > 0) {
        setSearchResults(results);
        console.log("Search results:", results.length, "tokens found");
      } else {
        setSearchResults([]);
        console.log("No search results found");
      }
    } catch (error) {
      console.error("Error searching tokens:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasSearchResults = searchQuery.trim().length > 0;

  const toggleTokenSelection = (tokenKey: string) => {
    const newSelected = new Set(selectedTokens);
    if (newSelected.has(tokenKey)) {
      newSelected.delete(tokenKey);
    } else {
      newSelected.add(tokenKey);
    }
    setSelectedTokens(newSelected);
  };

  const handleAddTokens = async () => {
    if (!user?.email) {
      console.error("No user email found");
      return;
    }

    // Add tokens from trending list
    const trendingToAdd = trendingTokens.filter((token: TrendingToken) => {
      const tokenKey = `trending_${token.symbol}`;
      return selectedTokens.has(tokenKey);
    });

    // Add tokens from search results
    const searchToAdd = searchResults.filter((token) =>
      selectedTokens.has(`${token.contractAddress}_${token.poolAddress}`)
    );

    console.log("Adding tokens:", {
      trending: trendingToAdd.length,
      search: searchToAdd.length,
    });

    // Add trending tokens (with dummy addresses for now)
    for (const token of trendingToAdd) {
      const tokenData = {
        chainId: "eth",
        contractAddress: `0x${token.symbol.toLowerCase().padEnd(40, "0")}`,
        poolAddress: `0x${token.symbol.toLowerCase().padEnd(40, "1")}`,
        name: token.name,
        symbol: token.symbol,
      };
      await onAddToken(tokenData);
    }

    // Add search result tokens
    for (const token of searchToAdd) {
      const tokenData = {
        chainId: CHAIN_MAPPING[activeTab] || "eth",
        contractAddress: token.contractAddress,
        poolAddress: token.poolAddress,
        name: token.name,
        symbol: token.symbol,
      };
      await onAddToken(tokenData);
    }

    onClose();
  };

  const getColorForSymbol = (symbol: string) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-pink-500 to-pink-600",
      "from-orange-500 to-orange-600",
      "from-yellow-500 to-yellow-600",
      "from-green-500 to-green-600",
      "from-purple-500 to-purple-600",
    ];
    const index = symbol.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleRemoveFromRecent = (tokenKey: string) => {
    setRecentlyAdded((prev) =>
      prev.filter((t) => `${t.contractAddress}_${t.poolAddress}` !== tokenKey)
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-white/10 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div
          className="bg-[#0F0F0F] rounded-[28px] w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl scale-[1.05]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-6 pb-4 flex-shrink-0">
            <h2 className="text-white font-mayeka text-xl">Add Tokens</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-8 pb-4 flex-shrink-0">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                {searchLoading ? (
                  <Loader2 size={16} className="text-gray-400 animate-spin" />
                ) : (
                  <Search size={16} className="text-gray-400" />
                )}
              </div>
              <input
                type="text"
                placeholder="Search tokens or paste address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#000] rounded-[12px] pl-10 pr-3 py-3 text-white text-xs placeholder-gray-400 focus:outline-none border border-[#2C2C2C] focus:border-[#E2AF19] font-satoshi transition-colors"
              />
            </div>
          </div>

          {/* Two Boxes Side by Side */}
          <div className="flex-1 px-8 pb-4 overflow-hidden flex flex-col min-h-0">
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Left Box - Search Results (ALWAYS VISIBLE) */}
              <div className="flex-1 relative p-[2px] rounded-[16px] min-h-0">
                <div
                  className="absolute inset-0 rounded-[16px]"
                  style={{
                    background: `linear-gradient(135deg, #E2AF19 0%, #E2AF19 10%, #2C2C2C 25%, #2C2C2C 75%, #E2AF19 90%, #E2AF19 100%)`,
                  }}
                />
                <div className="relative bg-black rounded-[14px] h-full p-3 flex flex-col overflow-hidden">
                  <div className="mb-2 flex-shrink-0">
                    <h3 className="text-white font-satoshi font-medium text-xs">
                      Search Results
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide pr-1">
                    {searchLoading ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-[#E2AF19] animate-spin mb-2" />
                        <p className="text-gray-400 font-satoshi text-[10px]">
                          Searching tokens...
                        </p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-2">
                          <span className="text-xl">
                            {searchQuery ? "🔍" : "💭"}
                          </span>
                        </div>
                        <p className="text-gray-400 font-satoshi text-[10px]">
                          {searchQuery
                            ? "No results found"
                            : "Start typing to search"}
                        </p>
                      </div>
                    ) : (
                      searchResults.map((token) => {
                        const tokenKey = `${token.contractAddress}_${token.poolAddress}`;
                        const isSelected = selectedTokens.has(tokenKey);

                        return (
                          <div
                            key={tokenKey}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-full bg-gradient-to-br ${getColorForSymbol(
                                  token.symbol
                                )} flex items-center justify-center flex-shrink-0`}
                              >
                                {token.logo ? (
                                  <img
                                    src={token.logo}
                                    alt={token.symbol}
                                    className="w-7 h-7 rounded-full"
                                  />
                                ) : (
                                  <span className="text-white text-[10px] font-bold">
                                    {token.symbol.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-satoshi font-medium text-[11px] truncate">
                                  {token.name}
                                </div>
                                <div className="text-gray-400 font-satoshi text-[9px] truncate">
                                  {token.symbol}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div
                                className={`font-satoshi text-[10px] font-medium ${
                                  token.change24h > 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {token.change24h > 0 ? "▲" : "▼"}{" "}
                                {Math.abs(token.change24h).toFixed(2)}%
                              </div>

                              <button
                                onClick={() => toggleTokenSelection(tokenKey)}
                                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-[#E2AF19]"
                                    : "bg-[#2C2C2C] hover:bg-[#3C3C3C]"
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isSelected ? "bg-black" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Box - Trending Tokens & Recently Added */}
              <div className="flex-1 relative p-[2px] rounded-[16px] min-h-0">
                <div
                  className="absolute inset-0 rounded-[16px]"
                  style={{
                    background: `linear-gradient(135deg, #E2AF19 0%, #E2AF19 10%, #2C2C2C 25%, #2C2C2C 75%, #E2AF19 90%, #E2AF19 100%)`,
                  }}
                />
                <div className="relative bg-black rounded-[14px] h-full p-3 flex flex-col overflow-hidden">
                  {/* Trending Tokens Section */}
                  <div className="flex-shrink-0 mb-2">
                    <h3 className="text-white font-satoshi font-medium text-xs mb-2">
                      Trending Tokens
                    </h3>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-hide">
                      {coinGeckoLoading ? (
                        <div className="flex flex-col items-center justify-center py-4">
                          <Loader2 className="w-6 h-6 text-[#E2AF19] animate-spin mb-2" />
                          <p className="text-gray-400 font-satoshi text-[10px]">
                            Loading trending...
                          </p>
                        </div>
                      ) : trendingTokens.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-400 font-satoshi text-[10px]">
                            No trending tokens
                          </p>
                        </div>
                      ) : (
                        trendingTokens.map((token: TrendingToken) => {
                          const tokenKey = `trending_${token.symbol}`;
                          const isSelected = selectedTokens.has(tokenKey);

                          return (
                            <div
                              key={tokenKey}
                              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-full ${token.bgColor} flex items-center justify-center flex-shrink-0`}
                                >
                                  {token.imageUrl ? (
                                    <img
                                      src={token.imageUrl}
                                      alt={token.symbol}
                                      className="w-7 h-7 rounded-full"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <span className="text-white text-[10px] font-bold">
                                      {token.icon}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-white font-satoshi font-medium text-[11px] truncate">
                                    {token.name}
                                  </div>
                                  <div className="text-gray-400 font-satoshi text-[9px] truncate">
                                    {token.symbol}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div
                                  className={`font-satoshi text-[10px] font-medium ${
                                    token.changeType === "positive"
                                      ? "text-green-500"
                                      : "text-red-500"
                                  }`}
                                >
                                  {token.changeType === "positive" ? "▲" : "▼"}{" "}
                                  {token.change
                                    .replace("+", "")
                                    .replace("-", "")}
                                </div>

                                <button
                                  onClick={() => toggleTokenSelection(tokenKey)}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "bg-[#E2AF19]"
                                      : "bg-[#2C2C2C] hover:bg-[#3C3C3C]"
                                  }`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      isSelected ? "bg-black" : ""
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#2C2C2C] my-2 flex-shrink-0"></div>

                  {/* Recently Added Section */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <h3 className="text-white font-satoshi font-medium text-xs mb-2 flex-shrink-0">
                      Recently Added
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide pr-1">
                      {recentlyAdded.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-2">
                            <span className="text-xl">📋</span>
                          </div>
                          <p className="text-gray-400 font-satoshi text-[10px]">
                            No recently added tokens
                          </p>
                        </div>
                      ) : (
                        recentlyAdded.map((token) => {
                          const tokenKey = `${token.contractAddress}_${token.poolAddress}`;
                          return (
                            <div
                              key={tokenKey}
                              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${getColorForSymbol(
                                    token.symbol
                                  )} flex items-center justify-center flex-shrink-0`}
                                >
                                  {token.logo ? (
                                    <img
                                      src={token.logo}
                                      alt={token.symbol}
                                      className="w-7 h-7 rounded-full"
                                    />
                                  ) : (
                                    <span className="text-white text-[10px] font-bold">
                                      {token.symbol.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-white font-satoshi font-medium text-[11px] truncate">
                                    {token.name}
                                  </div>
                                  <div className="text-gray-400 font-satoshi text-[9px] truncate">
                                    {token.symbol}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleRemoveFromRecent(tokenKey)}
                                className="p-0.5 bg-transparent hover:bg-[#2C2C2C] rounded-md transition-colors flex-shrink-0"
                              >
                                <X
                                  size={12}
                                  className="text-gray-400 hover:text-white"
                                />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Tokens Button and Counter */}
            <div className="flex gap-4 mt-3 flex-shrink-0 items-center">
              <div className="flex-1">
                <div className="text-gray-400 font-satoshi text-[10px]">
                  {selectedTokens.size}{" "}
                  {selectedTokens.size === 1 ? "Token" : "Tokens"} Selected
                </div>
              </div>
              <div className="flex-1">
                <button
                  onClick={handleAddTokens}
                  disabled={selectedTokens.size === 0}
                  className="w-full py-2 bg-[#E2AF19] text-black rounded-[10px] font-satoshi font-medium text-xs hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#E2AF19]"
                >
                  Add Tokens
                </button>
              </div>
            </div>
          </div>
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
    </>
  );
}
