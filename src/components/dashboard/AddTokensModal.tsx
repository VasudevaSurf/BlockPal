// src/components/dashboard/AddTokensModal.tsx - COMPLETE WITH COINLES INTEGRATION
import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { coinlesService, TokenSearchResult } from "@/services/coinlesService";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface AddTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToken: (token: any) => void;
}

const CHAINS = [
  { id: "eth", name: "Ethereum" },
  { id: "base", name: "Base" },
  { id: "polygon", name: "Polygon" },
  { id: "arbitrum", name: "Arbitrum" },
  { id: "avalanche", name: "Avalanche" },
  { id: "bsc", name: "BSC" },
];

export default function AddTokensModal({
  isOpen,
  onClose,
  onAddToken,
}: AddTokensModalProps) {
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedChain, setSelectedChain] = useState("eth");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<TokenSearchResult[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedTokens(new Set());
      setSearchResults([]);
    }
  }, [isOpen]);

  // Auto-search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 1) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedChain]);

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return;

    setIsSearching(true);
    try {
      const results = await coinlesService.searchTokens(
        selectedChain,
        searchQuery
      );
      setSearchResults(results);

      // Save search to history
      if (user?.email && results.length > 0) {
        await coinlesService.addRecentSearch(user.email, {
          chainId: selectedChain,
          query: searchQuery,
          results: results.slice(0, 3).map((r) => ({
            contractAddress: r.contractAddress,
            name: r.name,
            symbol: r.symbol,
          })),
        });
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleTokenSelection = (tokenAddress: string) => {
    const newSelected = new Set(selectedTokens);
    if (newSelected.has(tokenAddress)) {
      newSelected.delete(tokenAddress);
    } else {
      newSelected.add(tokenAddress);
    }
    setSelectedTokens(newSelected);
  };

  const handleAddTokens = () => {
    const tokensToAdd = searchResults.filter((token) =>
      selectedTokens.has(token.contractAddress)
    );

    tokensToAdd.forEach((token) => {
      onAddToken({
        chainId: selectedChain,
        contractAddress: token.contractAddress,
        poolAddress: token.poolAddress,
        name: token.name,
        symbol: token.symbol,
        price: token.price,
        change24h: token.change24h,
        volume24h: token.volume24h,
        liquidity: token.liquidity,
        buys24h: token.buys24h,
        sells24h: token.sells24h,
        logo: token.logo,
      });
    });

    // Add to recently added
    setRecentlyAdded((prev) =>
      [...tokensToAdd.slice(0, 10), ...prev].slice(0, 10)
    );

    onClose();
  };

  const removeFromRecentlyAdded = (contractAddress: string) => {
    setRecentlyAdded((prev) =>
      prev.filter((token) => token.contractAddress !== contractAddress)
    );
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-white/10 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div
          className="bg-[#0F0F0F] rounded-[28px] w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
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

          {/* Chain Selector */}
          <div className="px-8 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              {CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => setSelectedChain(chain.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-satoshi transition-all ${
                    selectedChain === chain.id
                      ? "bg-[#E2AF19] text-black"
                      : "bg-black text-gray-400 hover:text-white border border-[#2C2C2C]"
                  }`}
                >
                  {chain.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-8 pb-4 flex-shrink-0">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search tokens or paste address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black rounded-xl pl-10 pr-3 py-3 text-white text-sm placeholder-gray-400 focus:outline-none border border-[#2C2C2C] focus:border-[#E2AF19] font-satoshi transition-colors"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 px-8 pb-4 overflow-hidden flex gap-4 min-h-0">
            {/* Search Results */}
            <div className="flex-1 bg-black rounded-2xl border border-[#2C2C2C] p-4 overflow-hidden flex flex-col">
              <h3 className="text-white font-satoshi font-medium text-sm mb-3">
                {isSearching
                  ? "Searching..."
                  : `Search Results (${searchResults.length})`}
              </h3>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-2">
                      <span className="text-xl">🔍</span>
                    </div>
                    <p className="text-gray-400 font-satoshi text-xs">
                      {searchQuery.length < 2
                        ? "Enter at least 2 characters to search"
                        : "No tokens found"}
                    </p>
                  </div>
                ) : (
                  searchResults.map((token) => {
                    const isSelected = selectedTokens.has(
                      token.contractAddress
                    );

                    return (
                      <div
                        key={token.contractAddress}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1A1A1A] transition-colors mb-1"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${getColorForSymbol(
                              token.symbol
                            )} flex items-center justify-center`}
                          >
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
                          <div>
                            <div className="text-white font-satoshi font-medium text-xs">
                              {token.displayName || token.name}
                            </div>
                            <div className="text-gray-400 font-satoshi text-[10px]">
                              {token.symbol} • ${token.price.toFixed(6)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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
                            onClick={() =>
                              toggleTokenSelection(token.contractAddress)
                            }
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

            {/* Recently Added */}
            <div className="flex-1 bg-black rounded-2xl border border-[#2C2C2C] p-4 overflow-hidden flex flex-col">
              <h3 className="text-white font-satoshi font-medium text-sm mb-3">
                Recently Added ({recentlyAdded.length})
              </h3>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {recentlyAdded.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-2">
                      <span className="text-xl">📋</span>
                    </div>
                    <p className="text-gray-400 font-satoshi text-xs">
                      No recently added tokens
                    </p>
                  </div>
                ) : (
                  recentlyAdded.map((token) => (
                    <div
                      key={token.contractAddress}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1A1A1A] transition-colors mb-1"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${getColorForSymbol(
                            token.symbol
                          )} flex items-center justify-center`}
                        >
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
                        <div>
                          <div className="text-white font-satoshi font-medium text-xs">
                            {token.name}
                          </div>
                          <div className="text-gray-400 font-satoshi text-[10px]">
                            {token.symbol}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          removeFromRecentlyAdded(token.contractAddress)
                        }
                        className="p-1 hover:bg-[#2C2C2C] rounded transition-colors"
                      >
                        <X
                          size={12}
                          className="text-gray-400 hover:text-white"
                        />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 flex items-center justify-between flex-shrink-0">
            <div className="text-gray-400 font-satoshi text-xs">
              {selectedTokens.size}{" "}
              {selectedTokens.size === 1 ? "Token" : "Tokens"} Selected
            </div>
            <button
              onClick={handleAddTokens}
              disabled={selectedTokens.size === 0}
              className="px-6 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium text-sm hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#E2AF19]"
            >
              Add Tokens
            </button>
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
