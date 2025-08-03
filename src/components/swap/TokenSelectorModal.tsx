"use client";

import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import Input from "@/components/ui/Input";

interface Token {
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  value: number;
  logoUrl?: string;
  price: number;
}

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  tokens: Token[];
  title: string;
  showBalances: boolean;
  allowCustomToken?: boolean;
  showCommonTokens?: boolean;
}

// Common tokens for easy selection
const COMMON_TOKENS = [
  {
    symbol: "USDC",
    name: "USD Coin",
    contractAddress: "0xA0b86a33E6441f8d72b52C4AB1E0c3d8e9b4b3a5",
    decimals: 6,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
    balance: 0,
    value: 0,
    price: 1,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/325/large/Tether.png",
    balance: 0,
    value: 0,
    price: 1,
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png",
    balance: 0,
    value: 0,
    price: 45000,
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png",
    balance: 0,
    value: 0,
    price: 1,
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    contractAddress: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    balance: 0,
    value: 0,
    price: 15,
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    decimals: 18,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    balance: 0,
    value: 0,
    price: 8,
  },
];

export default function TokenSelectorModal({
  isOpen,
  onClose,
  onSelect,
  tokens,
  title,
  showBalances,
  allowCustomToken = false,
  showCommonTokens = false,
}: TokenSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customToken, setCustomToken] = useState<Token | null>(null);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customError, setCustomError] = useState("");
  const [activeTab, setActiveTab] = useState<"my_tokens" | "common">(
    showBalances && !showCommonTokens
      ? "my_tokens"
      : showCommonTokens
      ? "common"
      : "my_tokens"
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Check if search query is a valid Ethereum address
  const isValidAddress = (address: string): boolean => {
    return (
      address.length === 42 &&
      address.startsWith("0x") &&
      /^[0-9a-fA-F]+$/.test(address.slice(2))
    );
  };

  // Handle custom token lookup for contract addresses
  const handleCustomTokenLookup = async (address: string) => {
    if (!isValidAddress(address)) return;

    setLoadingCustom(true);
    setCustomError("");
    setCustomToken(null);

    try {
      const response = await fetch("/api/swap/token-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress: address.trim() }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch token info");
      }

      setCustomToken({
        symbol: data.symbol,
        name: data.name,
        contractAddress: address.trim(),
        decimals: data.decimals,
        balance: 0,
        value: 0,
        logoUrl: data.logoUrl,
        price: data.price || 0,
      });
    } catch (error: any) {
      setCustomError(error.message);
    } finally {
      setLoadingCustom(false);
    }
  };

  // Auto-detect custom token when user types contract address
  useEffect(() => {
    if (allowCustomToken && isValidAddress(searchQuery)) {
      handleCustomTokenLookup(searchQuery);
    } else {
      setCustomToken(null);
      setCustomError("");
    }
  }, [searchQuery, allowCustomToken]);

  // Create a unified token list with proper deduplication
  const getTokenList = () => {
    // Always deduplicate, even for user tokens, as the input might have duplicates
    const tokenMap = new Map<string, Token>();

    // Add user tokens first (they take priority)
    tokens.forEach((token) => {
      const key = (token.contractAddress || "native").toLowerCase();
      if (!tokenMap.has(key)) {
        tokenMap.set(key, token);
      }
    });

    // If not showing balances, also add common tokens
    if (!showBalances) {
      COMMON_TOKENS.forEach((token) => {
        const key = token.contractAddress.toLowerCase();
        if (!tokenMap.has(key)) {
          tokenMap.set(key, token);
        }
      });
    }

    return Array.from(tokenMap.values());
  };

  // Filter tokens based on search query (excluding custom token detection)
  const filteredTokens = getTokenList().filter((token) => {
    // Don't show tokens if we're searching for a contract address
    if (isValidAddress(searchQuery)) return false;

    return (
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Reset search when tab changes
  useEffect(() => {
    setSearchQuery("");
    setCustomToken(null);
    setCustomError("");
  }, [activeTab]);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setCustomToken(null);
      setCustomError("");
    } else {
      // Set initial loading when modal opens
      setIsInitialLoading(true);
      // Simulate minimum loading time for better UX
      setTimeout(() => {
        setIsInitialLoading(false);
      }, 300);
    }
  }, [isOpen]);

  // Handle image loading
  const handleImageLoad = (contractAddress: string) => {
    setLoadedImages((prev) => new Set(prev).add(contractAddress));
  };

  // Token Item Skeleton
  const TokenSkeleton = () => (
    <div className="w-full flex items-center p-4 animate-pulse">
      <div className="w-10 h-10 bg-gray-700 rounded-full mr-3"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-700 rounded w-16 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-24"></div>
      </div>
      {showBalances && (
        <div className="text-right">
          <div className="h-4 bg-gray-700 rounded w-20 mb-1"></div>
          <div className="h-3 bg-gray-700 rounded w-16"></div>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <h3 className="text-lg font-bold text-white font-mayeka">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#2C2C2C]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                allowCustomToken
                  ? "Search tokens or paste contract address..."
                  : "Search tokens..."
              }
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading state for custom token */}
        {loadingCustom && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19]"></div>
            <span className="text-gray-400 text-sm font-satoshi ml-2">
              Looking up token...
            </span>
          </div>
        )}

        {/* Custom token error */}
        {customError && (
          <div className="p-4">
            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm font-satoshi">{customError}</p>
            </div>
          </div>
        )}

        {/* Custom token result */}
        {customToken && (
          <div className="p-4">
            <div
              onClick={() => onSelect(customToken)}
              className="flex items-center p-4 rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors cursor-pointer bg-[#0F0F0F]"
            >
              {customToken.logoUrl ? (
                <div className="relative w-10 h-10 mr-3">
                  {!loadedImages.has(customToken.contractAddress) && (
                    <div className="absolute inset-0 bg-gray-700 rounded-full animate-pulse"></div>
                  )}
                  <img
                    src={customToken.logoUrl}
                    alt={customToken.symbol}
                    className={`w-10 h-10 rounded-full transition-opacity duration-300 ${
                      loadedImages.has(customToken.contractAddress)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                    onLoad={() => handleImageLoad(customToken.contractAddress)}
                    onError={() => handleImageLoad(customToken.contractAddress)}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gray-700 rounded-full mr-3 animate-pulse"></div>
              )}
              <div className="flex-1">
                <div className="text-white font-semibold font-satoshi">
                  {customToken.symbol}
                </div>
                <div className="text-gray-400 text-sm font-satoshi">
                  {customToken.name}
                </div>
                <div className="text-gray-400 text-xs font-satoshi font-mono">
                  {customToken.contractAddress.slice(0, 10)}...
                  {customToken.contractAddress.slice(-8)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Token List */}
        {!loadingCustom && !customToken && (
          <div className="overflow-y-auto max-h-96 scrollbar-hide">
            {isInitialLoading ? (
              // Show skeleton loaders while initial loading
              <>
                {[...Array(6)].map((_, index) => (
                  <TokenSkeleton key={`skeleton-${index}`} />
                ))}
              </>
            ) : (
              <>
                {filteredTokens.map((token) => (
                  <button
                    key={`token-${token.contractAddress}`}
                    onClick={() => onSelect(token)}
                    className="w-full flex items-center p-4 hover:bg-[#1A1A1A] transition-colors text-left"
                  >
                    {token.logoUrl ? (
                      <div className="relative w-10 h-10 mr-3">
                        {!loadedImages.has(token.contractAddress) && (
                          <div className="absolute inset-0 bg-gray-700 rounded-full animate-pulse"></div>
                        )}
                        <img
                          src={token.logoUrl}
                          alt={token.symbol}
                          className={`w-10 h-10 rounded-full transition-opacity duration-300 ${
                            loadedImages.has(token.contractAddress)
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                          onLoad={() => handleImageLoad(token.contractAddress)}
                          onError={() => handleImageLoad(token.contractAddress)}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-700 rounded-full mr-3 animate-pulse"></div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-semibold font-satoshi">
                        {token.symbol}
                      </div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        {token.name}
                      </div>
                    </div>
                    {/* Only show balances for user's tokens when showBalances is true */}
                    {showBalances && (
                      <div className="text-right">
                        <div className="text-white font-satoshi">
                          {token.balance.toFixed(6)}
                        </div>
                        <div className="text-gray-400 text-sm font-satoshi">
                          ${token.value.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </button>
                ))}

                {/* No results message */}
                {filteredTokens.length === 0 &&
                  !isValidAddress(searchQuery) && (
                    <div className="p-8 text-center">
                      <p className="text-gray-400 font-satoshi">
                        {searchQuery
                          ? "No tokens found matching your search"
                          : "No tokens available"}
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>
        )}
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
    </div>
  );
}
