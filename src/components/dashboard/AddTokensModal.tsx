// src/components/dashboard/AddTokensModal.tsx - WEBSOCKET VERSION
"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { coinlesSocketClient } from "@/services/coinlesSocketClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface AddTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToken: (tokenData: any) => void;
}

interface SearchResult {
  poolAddress: string;
  contractAddress: string;
  contractAddressDisplay: string;
  name: string;
  symbol: string;
  price: number;
  logo: string;
  change24h: number;
  liquidity: number;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  poolCount: number;
  displayName: string;
}

const CHAINS = [
  { id: "eth", name: "Ethereum", color: "#627EEA" },
  { id: "base", name: "Base", color: "#0052FF" },
  { id: "polygon", name: "Polygon", color: "#8247E5" },
  { id: "arbitrum", name: "Arbitrum", color: "#28A0F0" },
  { id: "avalanche", name: "Avalanche", color: "#E84142" },
  { id: "bsc", name: "BSC", color: "#F3BA2F" },
];

export default function AddTokensModal({
  isOpen,
  onClose,
  onAddToken,
}: AddTokensModalProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedChain, setSelectedChain] = useState("eth");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Set up search results listener
  useEffect(() => {
    const handleSearchResults = (results: SearchResult[]) => {
      console.log("🔍 Search results received:", results.length);
      setSearchResults(results);
      setLoading(false);
      setHasSearched(true);
    };

    coinlesSocketClient.on("search-results", handleSearchResults);

    return () => {
      coinlesSocketClient.off("search-results", handleSearchResults);
    };
  }, []);

  // Auto-search with debounce
  useEffect(() => {
    if (!isOpen) return;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Reset if query is empty
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    // Debounce search
    setLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedChain, isOpen]);

  const handleSearch = () => {
    if (!searchQuery.trim() || !user?.email) {
      setLoading(false);
      return;
    }

    console.log("🔍 Searching:", { chain: selectedChain, query: searchQuery });
    coinlesSocketClient.searchTokens(selectedChain, searchQuery, user.email);
  };

  const handleAddToken = (result: SearchResult) => {
    const tokenData = {
      chainId: selectedChain,
      contractAddress: result.contractAddress,
      poolAddress: result.poolAddress,
      name: result.name,
      symbol: result.symbol,
      logo: result.logo,
    };

    console.log("➕ Adding token:", tokenData);
    onAddToken(tokenData);

    // Clear search and close after short delay
    setTimeout(() => {
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      onClose();
    }, 500);
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

  const formatPrice = (price: number) => {
    if (price === 0) return "$0.00";
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#0F0F0F] rounded-2xl border border-[#2C2C2C] w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <h2 className="text-xl font-bold text-white font-mayeka">
            Add Token to Watchlist
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Chain Selector */}
        <div className="p-6 border-b border-[#2C2C2C]">
          <label className="block text-sm font-medium text-gray-400 mb-3 font-satoshi">
            Select Chain
          </label>
          <div className="grid grid-cols-3 gap-3">
            {CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`p-3 rounded-xl border-2 transition-all font-satoshi ${
                  selectedChain === chain.id
                    ? "border-[#E2AF19] bg-[#E2AF19]/10"
                    : "border-[#2C2C2C] hover:border-[#E2AF19]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: chain.color }}
                  ></div>
                  <span
                    className={
                      selectedChain === chain.id
                        ? "text-white font-medium"
                        : "text-gray-400"
                    }
                  >
                    {chain.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-[#2C2C2C]">
          <label className="block text-sm font-medium text-gray-400 mb-3 font-satoshi">
            Search Token
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, symbol, or contract address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#191919] border border-[#2C2C2C] rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#E2AF19] transition-colors font-satoshi"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
            </div>
          )}

          {!loading && !hasSearched && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-500 font-satoshi">
                Start typing to search for tokens
              </p>
            </div>
          )}

          {!loading && hasSearched && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-gray-500 font-satoshi">
                No tokens found for "{searchQuery}"
              </p>
              <p className="text-gray-600 text-sm mt-2 font-satoshi">
                Try searching with a different keyword
              </p>
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.contractAddress}_${index}`}
                  className="bg-[#191919] border border-[#2C2C2C] rounded-xl p-4 hover:border-[#E2AF19]/50 transition-all cursor-pointer"
                  onClick={() => handleAddToken(result)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2C2C2C] flex items-center justify-center">
                        {result.logo ? (
                          <img
                            src={result.logo}
                            alt={result.symbol}
                            className="w-10 h-10 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const fallback = document.createElement("span");
                                fallback.className =
                                  "text-white text-sm font-bold";
                                fallback.textContent = result.symbol
                                  .substring(0, 3)
                                  .toUpperCase();
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-white text-sm font-bold">
                            {result.symbol.substring(0, 3).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-medium font-satoshi">
                          {result.displayName || result.name}
                        </div>
                        <div className="text-gray-500 text-sm font-satoshi">
                          {result.symbol} • {result.contractAddressDisplay}
                          {result.poolCount > 1 && (
                            <span className="text-[#E2AF19] ml-2">
                              • {formatNumber(result.liquidity)} liquidity
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium font-satoshi">
                        {formatPrice(result.price)}
                      </div>
                      <div
                        className={`text-sm font-satoshi ${
                          result.change24h >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {result.change24h >= 0 ? "+" : ""}
                        {result.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
