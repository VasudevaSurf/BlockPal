// src/components/dashboard/AddTokensModal.tsx - UPDATED WITH SWAP TOKEN SELECTOR UI
import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { coinlesService, TokenSearchResult } from "@/services/coinlesService";

interface AddTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToken: (token: any) => void;
}

// Chain data configuration
const getChainDisplayData = () => {
  const chainDisplayData: {
    [key: string]: {
      name: string;
      color: string;
      icon: string;
      image?: string;
      fallbackIcon: string;
      useBackground: boolean;
    };
  } = {
    eth: {
      name: "Ethereum",
      color: "bg-blue-500",
      icon: "Ξ",
      image: "/chains/Ethereum.png",
      fallbackIcon: "Ξ",
      useBackground: true,
    },
    base: {
      name: "Base",
      color: "bg-blue-600",
      icon: "B",
      image: "/chains/Base.png",
      fallbackIcon: "B",
      useBackground: false,
    },
    polygon: {
      name: "Polygon",
      color: "bg-purple-500",
      icon: "◆",
      image: "/chains/Polygon.png",
      fallbackIcon: "◆",
      useBackground: false,
    },
    arbitrum: {
      name: "Arbitrum",
      color: "bg-blue-400",
      icon: "◉",
      image: "/chains/Arbitrum.png",
      fallbackIcon: "◉",
      useBackground: false,
    },
    avalanche: {
      name: "Avalanche",
      color: "bg-red-500",
      icon: "A",
      image: "/chains/Avalanche.png",
      fallbackIcon: "A",
      useBackground: true,
    },
    bsc: {
      name: "BSC",
      color: "bg-yellow-500",
      icon: "B",
      image: "/chains/BSC.png",
      fallbackIcon: "B",
      useBackground: true,
    },
  };

  return chainDisplayData;
};

// Chain Icon Component
interface ChainIconProps {
  chainData: {
    name: string;
    color: string;
    icon: string;
    image?: string;
    fallbackIcon: string;
    useBackground: boolean;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ChainIcon: React.FC<ChainIconProps> = ({
  chainData,
  size = "md",
  className = "",
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-8 h-8",
  };

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [chainData.image]);

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
    >
      {(!imageLoaded || imageError) && (
        <div className="absolute inset-0 bg-[#2C2C2C] rounded-full" />
      )}

      {chainData.image && !imageError && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          } p-1 relative z-10`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
      )}

      {imageError && (
        <div
          className={`${chainData.color} w-full h-full flex items-center justify-center absolute inset-0`}
        >
          <span className="text-white text-xs font-bold font-satoshi">
            {chainData.fallbackIcon}
          </span>
        </div>
      )}
    </div>
  );
};

// Token Image Component
const TokenImage = ({
  src,
  alt,
  symbol,
  name,
  className = "",
}: {
  src?: string | null;
  alt: string;
  symbol: string;
  name?: string;
  className?: string;
}) => {
  const [hasError, setHasError] = useState(false);

  const getFirstLetter = () => {
    const text = symbol || name || "?";
    return text.charAt(0).toUpperCase();
  };

  if (!src || hasError) {
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center`}
        style={{ backgroundColor: "#4A4A4A" }}
        title={name || symbol}
      >
        <span className="text-white font-bold text-xs">{getFirstLetter()}</span>
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

const CHAINS = [
  { id: "eth", label: "Ethereum" },
  { id: "base", label: "Base" },
  { id: "polygon", label: "Polygon" },
  { id: "arbitrum", label: "Arbitrum" },
  { id: "avalanche", label: "Avalanche" },
  { id: "bsc", label: "BSC" },
];

export default function AddTokensModal({
  isOpen,
  onClose,
  onAddToken,
}: AddTokensModalProps) {
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedChain, setSelectedChain] = useState("eth");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] =
    useState<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const chainDisplayData = getChainDisplayData();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedTokens(new Set());
      setSelectedChain("eth");
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

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clear search when chain changes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [selectedChain]);

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
  }, [searchQuery, selectedChain]);

  const handleSearch = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      console.log("Searching for:", query, "on chain:", selectedChain);

      const results = await coinlesService.searchTokens(selectedChain, query);

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

    const searchToAdd = searchResults.filter((token) =>
      selectedTokens.has(`${token.contractAddress}_${token.poolAddress}`)
    );

    console.log("Adding tokens:", {
      search: searchToAdd.length,
    });

    for (const token of searchToAdd) {
      const tokenData = {
        chainId: selectedChain,
        contractAddress: token.contractAddress,
        poolAddress: token.poolAddress,
        name: token.name,
        symbol: token.symbol,
      };
      await onAddToken(tokenData);
    }

    onClose();
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return "$0.000";
    if (value < 0.001) return "< $0.001";
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(3)}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal positioned in center of screen */}
        <div
          className="h-[550px] mx-4 w-full max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main container */}
          <div className="bg-[#000] rounded-[20px] h-full flex overflow-hidden">
            {/* Left Side - Chains */}
            <div className="w-1/3 p-5">
              {/* Main heading */}
              <div className="mb-8">
                <h2 className="text-white font-mayeka text-xl">Add Tokens</h2>
              </div>

              <div className="flex items-center justify-between mb-4">
                {/* Networks section with gradient border */}
                <div className="relative p-[2px] rounded-[12px] w-full">
                  <div
                    className="absolute inset-0 rounded-[12px]"
                    style={{
                      background: `linear-gradient(135deg, 
                        #E2AF19 0%, 
                        #E2AF19 10%,
                        #2C2C2C 25%, 
                        #2C2C2C 75%, 
                        #E2AF19 90%,
                        #E2AF19 100%)`,
                    }}
                  />
                  <div className="relative bg-[#000] rounded-[10px] p-4">
                    <div className="mb-4">
                      <div className="bg-[#0F0F0F] p-2 px-3 rounded-[14px] inline-block">
                        <h3 className="text-white font-mayeka text-[16px]">
                          Select Chain
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {CHAINS.map((chain) => {
                        const chainDisplay = chainDisplayData[chain.id] || {
                          name: chain.label,
                          color: "bg-gray-500",
                          icon: chain.label.charAt(0),
                          fallbackIcon: chain.label.charAt(0),
                          useBackground: true,
                        };

                        const isSelected = selectedChain === chain.id;

                        return (
                          <button
                            key={chain.id}
                            onClick={() => setSelectedChain(chain.id)}
                            className={`w-full p-3 rounded-[10px] transition-all duration-200 text-left ${
                              isSelected ? "bg-[#71570C]" : "hover:bg-[#1A1A1A]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <ChainIcon chainData={chainDisplay} size="md" />
                              <span
                                className={`text-sm font-satoshi font-medium ${
                                  isSelected ? "text-white" : "text-white"
                                }`}
                              >
                                {chainDisplay.name}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Tokens */}
            <div className="flex flex-col bg-[#000] p-5 flex-1">
              {/* Header with close button */}
              <div className="flex justify-between items-center mb-5">
                <div className="flex-1" />
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg ml-auto"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-5">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  {searchLoading ? (
                    <Loader2 size={16} className="text-gray-400 animate-spin" />
                  ) : (
                    <Search size={16} className="text-gray-400" />
                  )}
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search name, symbol, or paste address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0F0F0F] rounded-[15px] pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-mayeka"
                />
              </div>

              {/* Dynamic Heading */}
              <div className="mb-4">
                <h4 className="text-[#939393] font-satoshi font-medium text-base">
                  {searchQuery ? "Search Results" : "Search tokens to add"}
                </h4>
              </div>

              {/* Token List */}
              <div className="flex-1 overflow-y-auto">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19]"></div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                      <span className="text-gray-400 text-lg">
                        {searchQuery ? "🔍" : "💭"}
                      </span>
                    </div>
                    <p className="text-gray-400 font-satoshi">
                      {searchQuery
                        ? "No tokens found"
                        : "Start typing to search"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((token, index) => {
                      const tokenKey = `${token.contractAddress}_${token.poolAddress}`;
                      const isSelected = selectedTokens.has(tokenKey);

                      return (
                        <button
                          key={`${tokenKey}_${index}`}
                          onClick={() => toggleTokenSelection(tokenKey)}
                          className="w-full flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[#1A1A1A] text-left"
                        >
                          <div className="flex items-center min-w-0 flex-1">
                            <TokenImage
                              src={token.logo}
                              alt={token.symbol}
                              symbol={token.symbol}
                              name={token.name}
                              className="w-10 h-10 mr-3 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-medium font-satoshi text-sm">
                                {token.name}
                              </div>
                              <div className="text-gray-400 text-xs font-satoshi">
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

                            <div
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
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Tokens Button */}
              <div className="mt-3 flex-shrink-0 flex items-center gap-4">
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
