// src/components/dashboard/AddTokensModal.tsx - OPTIMIZED MOBILE VERSION
import { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { coinlesSocketClient } from "@/services/coinlesSocketClient";
import {
  getPopularTokensForChain,
  PopularToken,
} from "@/services/popularTokensService";
import { useToast } from "@/contexts/ToastContext";

interface AddTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToken: (token: any) => void;
  existingTokens?: Array<{
    chainId: string;
    contractAddress: string;
  }>;
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

// ✅ FIXED: Add image cache and preload function (same as TokenSelectorModal)
const imageCache = new Map<string, boolean>();

const preloadImage = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (imageCache.has(src)) {
      resolve(imageCache.get(src) || false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.set(src, true);
      resolve(true);
    };
    img.onerror = () => {
      imageCache.set(src, false);
      resolve(false);
    };
    img.src = src;
  });
};

// ✅ FIXED: Chain Icon Component with proper preloading (same as TokenSelectorModal)
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
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(
    () => {
      // Check cache on initial render
      if (chainData.image && imageCache.has(chainData.image)) {
        return imageCache.get(chainData.image) ? "loaded" : "error";
      }
      return "loading";
    }
  );

  const mountedRef = useRef(true);

  const sizeClasses = {
    sm: "w-4 h-4 lg:w-5 lg:h-5",
    md: "w-6 h-6 lg:w-7 lg:h-7",
    lg: "w-7 h-7 lg:w-8 lg:h-8",
  };

  useEffect(() => {
    mountedRef.current = true;

    // Check cache first
    if (chainData.image && imageCache.has(chainData.image)) {
      const cached = imageCache.get(chainData.image);
      setImageState(cached ? "loaded" : "error");
      return;
    }

    // Preload image if not cached
    if (chainData.image) {
      preloadImage(chainData.image).then((success) => {
        if (mountedRef.current) {
          setImageState(success ? "loaded" : "error");
        }
      });
    } else {
      setImageState("error");
    }

    return () => {
      mountedRef.current = false;
    };
  }, [chainData.image]);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
      style={{
        // Hide completely during loading to prevent flickering
        opacity: imageState === "loading" ? 0 : 1,
        transition: "opacity 0.15s ease-in",
      }}
    >
      {/* Show image when loaded */}
      {imageState === "loaded" && chainData.image && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className="w-full h-full object-contain p-1"
          draggable={false}
          style={{ userSelect: "none", pointerEvents: "none" }}
        />
      )}

      {/* Show fallback only on error */}
      {imageState === "error" && (
        <div
          className={`${chainData.color} w-full h-full flex items-center justify-center absolute inset-0`}
        >
          <span className="text-white text-[10px] lg:text-xs font-bold font-satoshi">
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
    const text = name || symbol || "?";
    const firstWord = text.split(/[\s\-_]+/)[0];
    return firstWord.length > 6 ? firstWord.substring(0, 6) : firstWord;
  };

  if (!src || hasError) {
    const firstWord = getFirstLetter();
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center bg-[#4A4A4A]`}
        title={name || symbol}
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        <span
          className="text-white font-bold text-xs text-center px-1"
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {firstWord.charAt(0)}
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
      draggable={false}
      style={{ userSelect: "none", pointerEvents: "none" }}
      onDragStart={(e) => e.preventDefault()}
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
  existingTokens = [],
}: AddTokensModalProps) {
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedChain, setSelectedChain] = useState("eth");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [popularTokens, setPopularTokens] = useState<PopularToken[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingTokens, setAddingTokens] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] =
    useState<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const chainDisplayData = getChainDisplayData();

  const { showToast } = useToast();

  // ✅ FIXED: Preload all chain images on mount (same as TokenSelectorModal)
  useEffect(() => {
    const preloadAllChainImages = async () => {
      const images = Object.values(chainDisplayData)
        .map((data) => data.image)
        .filter(Boolean) as string[];

      console.log("🔄 AddTokensModal: Preloading chain images");
      await Promise.all(images.map((src) => preloadImage(src)));
      console.log("✅ AddTokensModal: All chain images preloaded");
    };

    preloadAllChainImages();
  }, []);

  // Helper function to check if token already exists
  const isTokenAlreadyAdded = (
    contractAddress: string,
    chainId: string
  ): boolean => {
    return existingTokens.some(
      (token) =>
        token.contractAddress.toLowerCase() === contractAddress.toLowerCase() &&
        token.chainId.toLowerCase() === chainId.toLowerCase()
    );
  };

  // Set up WebSocket listener for search results
  useEffect(() => {
    const handleSearchResults = (results: SearchResult[]) => {
      console.log("🔍 WebSocket search results received:", results.length);
      setSearchResults(results);
      setSearchLoading(false);
    };

    coinlesSocketClient.on("search-results", handleSearchResults);

    return () => {
      coinlesSocketClient.off("search-results", handleSearchResults);
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedTokens(new Set());
      setSelectedChain("eth");
      setSearchResults([]);
      setSearchLoading(false);
      setAddingTokens(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !addingTokens) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [isOpen, onClose, addingTokens]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Load popular tokens when chain changes
  useEffect(() => {
    if (isOpen && !searchQuery) {
      const tokens = getPopularTokensForChain(selectedChain);
      setPopularTokens(tokens);
      console.log(
        `Loaded ${tokens.length} popular tokens for ${selectedChain}`
      );
    }
  }, [selectedChain, isOpen, searchQuery]);

  // Clear search when chain changes
  useEffect(() => {
    if (isOpen) {
      console.log(`🔄 Chain changed to: ${selectedChain}`);

      setSearchQuery("");
      setSearchResults([]);
      setSearchLoading(false);

      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        setSearchDebounceTimer(null);
      }

      const tokens = getPopularTokensForChain(selectedChain);
      setPopularTokens(tokens);

      console.log(
        `✅ Chain switch complete - showing ${tokens.length} popular tokens`
      );
    }
  }, [selectedChain, isOpen]);

  // Debounced search with WebSocket
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setSearchLoading(false);
      const tokens = getPopularTokensForChain(selectedChain);
      setPopularTokens(tokens);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(searchQuery.trim());
    }, 500);

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchQuery, selectedChain]);

  const handleSearch = async (query: string) => {
    if (!query || query.trim().length === 0 || !user?.email) {
      setSearchResults([]);
      const tokens = getPopularTokensForChain(selectedChain);
      setPopularTokens(tokens);
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);
      setPopularTokens([]);

      console.log(
        `🔍 Searching via WebSocket: "${query}" on chain: ${selectedChain}`
      );

      coinlesSocketClient.searchTokens(selectedChain, query, user.email);
    } catch (error) {
      console.error(`❌ Error searching tokens on ${selectedChain}:`, error);
      setSearchResults([]);
      setSearchLoading(false);
    }
  };

  const toggleTokenSelection = (tokenKey: string, contractAddress: string) => {
    if (isTokenAlreadyAdded(contractAddress, selectedChain)) {
      console.log("Token already in watchlist, cannot select");
      return;
    }

    const newSelected = new Set(selectedTokens);
    if (newSelected.has(tokenKey)) {
      newSelected.delete(tokenKey);
    } else {
      newSelected.add(tokenKey);
    }
    setSelectedTokens(newSelected);
  };

  const handleAddTokens = async () => {
    if (!user?.email || addingTokens) {
      console.error("No user email found or already adding");
      return;
    }

    const searchToAdd = searchResults.filter((token) =>
      selectedTokens.has(`${token.contractAddress}_${token.poolAddress}`)
    );

    const popularToAdd = popularTokens.filter((token) =>
      selectedTokens.has(`popular_${token.address}`)
    );

    console.log("Adding tokens:", {
      search: searchToAdd.length,
      popular: popularToAdd.length,
    });

    try {
      setAddingTokens(true);

      for (const token of searchToAdd) {
        const tokenData = {
          chainId: selectedChain,
          contractAddress: token.contractAddress,
          poolAddress: token.poolAddress,
          name: token.name,
          symbol: token.symbol,
          logo: token.logo,
        };
        await onAddToken(tokenData);
      }

      for (const token of popularToAdd) {
        try {
          const searchPromise = new Promise<SearchResult[]>((resolve) => {
            const handleResults = (results: SearchResult[]) => {
              coinlesSocketClient.off("search-results", handleResults);
              resolve(results);
            };
            coinlesSocketClient.on("search-results", handleResults);
          });

          coinlesSocketClient.searchTokens(
            selectedChain,
            token.address,
            user.email
          );

          const results = await searchPromise;

          if (results && results.length > 0) {
            const foundToken =
              results.find(
                (r) =>
                  r.contractAddress.toLowerCase() ===
                  token.address.toLowerCase()
              ) || results[0];

            const tokenData = {
              chainId: selectedChain,
              contractAddress: foundToken.contractAddress,
              poolAddress: foundToken.poolAddress,
              name: foundToken.name,
              symbol: foundToken.symbol,
              logo: foundToken.logo || token.logoURI,
            };
            await onAddToken(tokenData);
          }
        } catch (error) {
          console.error(`Error adding popular token ${token.symbol}:`, error);
        }
      }

      onClose();
    } catch (error) {
      console.error("Error adding tokens:", error);
    } finally {
      setAddingTokens(false);
    }
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

  const displayTokens = searchQuery ? searchResults : [];
  const showPopular = !searchQuery && popularTokens.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed lg:absolute inset-0 bg-white/10 z-40"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed lg:absolute inset-0 z-50 flex items-center justify-center p-2 lg:p-4"
        onClick={onClose}
        style={{
          paddingBottom: "calc(80px + 0.5rem)", // Account for bottom nav + padding on mobile
        }}
      >
        <div
          className="h-[75vh] lg:h-[550px] w-full max-w-[95vw] lg:max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main container */}
          <div className="bg-[#000] rounded-[16px] lg:rounded-[20px] h-full flex flex-col lg:flex-row overflow-hidden border border-[#2C2C2C]">
            {/* Desktop Left Side - Chains */}
            <div className="hidden lg:block lg:w-1/3 p-5">
              <div className="mb-8">
                <h2 className="text-white font-mayeka text-xl">Add Tokens</h2>
              </div>

              <div className="flex items-center justify-between mb-4">
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
                            disabled={addingTokens}
                            className={`w-full p-3 rounded-[10px] transition-all duration-200 text-left ${
                              isSelected ? "bg-[#71570C]" : "hover:bg-[#1A1A1A]"
                            } ${
                              addingTokens
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <ChainIcon chainData={chainDisplay} size="md" />
                              <span className="text-sm font-satoshi font-medium text-white">
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

            {/* Mobile & Desktop Right Side - Content */}
            <div className="flex flex-col bg-[#000] flex-1 min-h-0">
              {/* Mobile Header */}
              <div className="lg:hidden flex items-center justify-between p-2.5 border-b border-[#2C2C2C] flex-shrink-0">
                <h2 className="text-white font-mayeka text-base">Add Tokens</h2>
                <button
                  onClick={onClose}
                  disabled={addingTokens}
                  className={`text-gray-400 hover:text-white transition-colors p-1 ${
                    addingTokens ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:flex justify-end items-center p-5 pb-0 flex-shrink-0">
                <button
                  onClick={onClose}
                  disabled={addingTokens}
                  className={`text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg ${
                    addingTokens ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col p-2.5 lg:p-5 lg:pt-0 min-h-0">
                {/* Mobile Chain Selector */}
                <div className="lg:hidden mb-3 flex-shrink-0">
                  <div className="relative p-[2px] rounded-[12px]">
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
                    <div className="relative bg-[#000] rounded-[10px] p-2">
                      <div className="mb-2">
                        <h3 className="text-white font-mayeka text-xs">
                          Select Chain
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {CHAINS.map((chain) => {
                          const chainDisplay = chainDisplayData[chain.id];
                          const isSelected = selectedChain === chain.id;

                          return (
                            <button
                              key={chain.id}
                              onClick={() => setSelectedChain(chain.id)}
                              disabled={addingTokens}
                              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[10px] transition-all ${
                                isSelected
                                  ? "bg-[#71570C]"
                                  : "bg-[#0F0F0F] hover:bg-[#1A1A1A]"
                              } ${
                                addingTokens
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <ChainIcon chainData={chainDisplay} size="sm" />
                              <span className="text-[10px] font-satoshi font-medium text-white truncate">
                                {chainDisplay.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-2 lg:mb-5 flex-shrink-0">
                  <div className="absolute left-2.5 lg:left-3 top-1/2 transform -translate-y-1/2">
                    {searchLoading ? (
                      <Loader2
                        size={14}
                        className="lg:w-4 lg:h-4 text-gray-400 animate-spin"
                      />
                    ) : (
                      <Search
                        size={14}
                        className="lg:w-4 lg:h-4 text-gray-400"
                      />
                    )}
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search name, symbol, or paste address"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={addingTokens}
                    className={`w-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[15px] pl-8 lg:pl-10 pr-3 lg:pr-4 py-2 lg:py-3 text-sm lg:text-base text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-mayeka ${
                      addingTokens ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                {/* Dynamic Heading */}
                <div className="mb-2 lg:mb-4 flex-shrink-0">
                  <h4 className="text-[#939393] font-satoshi font-medium text-xs lg:text-base">
                    {searchQuery
                      ? "Search Results"
                      : `Popular ${
                          chainDisplayData[selectedChain]?.name || ""
                        } Tokens`}
                  </h4>
                </div>

                {/* Token List */}
                <div className="flex-1 overflow-y-auto relative min-h-0">
                  {searchLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-[#E2AF19]"></div>
                        <p className="text-gray-400 text-xs lg:text-sm font-satoshi">
                          Loading tokens...
                        </p>
                      </div>
                    </div>
                  ) : showPopular ? (
                    <div className="space-y-1.5 lg:space-y-2">
                      {popularTokens.map((token, index) => {
                        const tokenKey = `popular_${token.address}`;
                        const isSelected = selectedTokens.has(tokenKey);
                        const alreadyAdded = isTokenAlreadyAdded(
                          token.address,
                          selectedChain
                        );

                        return (
                          <button
                            key={`${tokenKey}_${index}`}
                            onClick={() =>
                              toggleTokenSelection(tokenKey, token.address)
                            }
                            disabled={addingTokens || alreadyAdded}
                            className={`w-full flex items-center justify-between p-2 lg:p-3 rounded-lg transition-colors text-left ${
                              alreadyAdded
                                ? "bg-[#1A1A1A] opacity-60 cursor-not-allowed"
                                : addingTokens
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-[#1A1A1A]"
                            }`}
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              <TokenImage
                                src={token.logoURI}
                                alt={token.symbol}
                                symbol={token.symbol}
                                name={token.name}
                                className="w-8 h-8 lg:w-10 lg:h-10 mr-2 lg:mr-3 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-medium font-satoshi text-xs lg:text-sm flex items-center gap-2">
                                  {token.name}
                                </div>
                                <div className="text-gray-400 text-[10px] lg:text-xs font-satoshi">
                                  {token.symbol}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {alreadyAdded ? (
                                <CheckCircle2
                                  size={14}
                                  className="lg:w-4 lg:h-4 text-green-400"
                                />
                              ) : (
                                <div
                                  className={`w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "bg-[#E2AF19]"
                                      : "bg-[#2C2C2C] hover:bg-[#3C3C3C]"
                                  }`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${
                                      isSelected ? "bg-black" : ""
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : displayTokens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center absolute inset-0">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                        <span className="text-gray-400 text-base lg:text-lg">
                          {searchQuery ? "🔍" : "💭"}
                        </span>
                      </div>
                      <p className="text-gray-400 font-satoshi text-sm lg:text-base">
                        {searchQuery
                          ? "No tokens found"
                          : "Start typing to search"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 lg:space-y-2">
                      {displayTokens.map((token, index) => {
                        const tokenKey = `${token.contractAddress}_${token.poolAddress}`;
                        const isSelected = selectedTokens.has(tokenKey);
                        const alreadyAdded = isTokenAlreadyAdded(
                          token.contractAddress,
                          selectedChain
                        );

                        return (
                          <button
                            key={`${tokenKey}_${index}`}
                            onClick={() =>
                              toggleTokenSelection(
                                tokenKey,
                                token.contractAddress
                              )
                            }
                            disabled={addingTokens || alreadyAdded}
                            className={`w-full flex items-center justify-between p-2 lg:p-3 rounded-lg transition-colors text-left ${
                              alreadyAdded
                                ? "bg-[#1A1A1A] opacity-60 cursor-not-allowed"
                                : addingTokens
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-[#1A1A1A]"
                            }`}
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              <TokenImage
                                src={token.logo}
                                alt={token.symbol}
                                symbol={token.symbol}
                                name={token.name}
                                className="w-8 h-8 lg:w-10 lg:h-10 mr-2 lg:mr-3 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-medium font-satoshi text-xs lg:text-sm flex items-center gap-2">
                                  {token.name}
                                  {alreadyAdded && (
                                    <span className="text-[9px] lg:text-[10px] bg-green-500/20 text-green-400 px-1.5 lg:px-2 py-0.5 rounded-full font-satoshi">
                                      Already Added
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-400 text-[10px] lg:text-xs font-satoshi">
                                  {token.symbol}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
                              {!alreadyAdded && (
                                <div className="text-right">
                                  <div className="text-white font-medium font-satoshi text-xs lg:text-sm">
                                    {formatCurrency(token.price)}
                                  </div>
                                  <div
                                    className={`font-satoshi text-[9px] lg:text-[10px] font-medium ${
                                      token.change24h > 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    }`}
                                  >
                                    {token.change24h > 0 ? "▲" : "▼"}{" "}
                                    {Math.abs(token.change24h).toFixed(2)}%
                                  </div>
                                </div>
                              )}

                              {alreadyAdded ? (
                                <CheckCircle2
                                  size={14}
                                  className="lg:w-4 lg:h-4 text-green-400"
                                />
                              ) : (
                                <div
                                  className={`w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "bg-[#E2AF19]"
                                      : "bg-[#2C2C2C] hover:bg-[#3C3C3C]"
                                  }`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${
                                      isSelected ? "bg-black" : ""
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add Tokens Button */}
                <div className="mt-2.5 lg:mt-3 flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                  <div className="sm:flex-1 text-center sm:text-left">
                    <div className="text-gray-400 font-satoshi text-[10px] lg:text-xs">
                      {selectedTokens.size}{" "}
                      {selectedTokens.size === 1 ? "Token" : "Tokens"} Selected
                    </div>
                  </div>
                  <div className="sm:flex-1">
                    <button
                      onClick={handleAddTokens}
                      disabled={selectedTokens.size === 0 || addingTokens}
                      className={`w-full py-2 lg:py-2.5 rounded-[10px] font-satoshi font-medium text-xs lg:text-sm transition-all flex items-center justify-center gap-2 ${
                        selectedTokens.size === 0 || addingTokens
                          ? "bg-[#E2AF19] opacity-50 cursor-not-allowed"
                          : "bg-[#E2AF19] hover:bg-[#D4A853]"
                      } text-black`}
                    >
                      {addingTokens ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <span>Add Tokens</span>
                      )}
                    </button>
                  </div>
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
