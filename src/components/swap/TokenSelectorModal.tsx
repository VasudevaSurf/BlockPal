// src/components/swap/TokenSelectorModal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { chains } from "@/components/wallet/WalletProvider";
import { tokenService } from "@/services/tokenService";
import { swapService } from "@/services/swapService";

// Chain data with proper PNG image paths
const getChainDisplayData = () => {
  const chainDisplayData: {
    [key: number]: {
      name: string;
      color: string;
      icon: string;
      image?: string;
      fallbackIcon: string;
      useBackground: boolean;
    };
  } = {
    1: {
      name: "Ethereum",
      color: "bg-blue-500",
      icon: "Ξ",
      image: "/chains/ethereum.png",
      fallbackIcon: "Ξ",
      useBackground: true,
    },
    8453: {
      name: "Base",
      color: "bg-blue-600",
      icon: "B",
      image: "/chains/base.png",
      fallbackIcon: "B",
      useBackground: false,
    },
    137: {
      name: "Polygon",
      color: "bg-purple-500",
      icon: "◆",
      image: "/chains/polygon.png",
      fallbackIcon: "◆",
      useBackground: false,
    },
    43114: {
      name: "Avalanche",
      color: "bg-red-500",
      icon: "A",
      image: "/chains/avalanche.png",
      fallbackIcon: "A",
      useBackground: true,
    },
    42161: {
      name: "Arbitrum",
      color: "bg-blue-400",
      icon: "◉",
      image: "/chains/arbitrum.png",
      fallbackIcon: "◉",
      useBackground: false,
    },
    56: {
      name: "BSC",
      color: "bg-yellow-500",
      icon: "B",
      image: "/chains/bsc.png",
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
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSizes = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
  };

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [chainData.image]);

  const handleImageError = () => {
    console.log(`Failed to load image: ${chainData.image}`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log(`Successfully loaded image: ${chainData.image}`);
    setImageLoaded(true);
  };

  const shouldShowBackground =
    !chainData.image || imageError || !imageLoaded || chainData.useBackground;
  const backgroundClass = shouldShowBackground ? chainData.color : "";

  return (
    <div
      className={`${sizeClasses[size]} ${backgroundClass} rounded-full flex items-center justify-center relative flex-shrink-0 overflow-hidden ${className}`}
      title={chainData.name}
    >
      {chainData.image && !imageError && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          } ${!chainData.useBackground && imageLoaded ? "p-0" : "p-1"}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
      )}

      {(!chainData.image || imageError || !imageLoaded) && (
        <span
          className={`text-white ${iconSizes[size]} font-bold font-satoshi absolute inset-0 flex items-center justify-center`}
        >
          {chainData.fallbackIcon}
        </span>
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
  const [hasError, setHasError] = React.useState(false);

  const getFirstWord = () => {
    const text = name || symbol || "?";
    const firstWord = text.split(/[\s\-_]+/)[0];

    if (firstWord.length > 6) {
      return firstWord.substring(0, 6);
    }

    return firstWord;
  };

  if (!src || hasError) {
    const firstWord = getFirstWord();

    return (
      <div
        className={`${className} rounded-full flex items-center justify-center`}
        style={{ backgroundColor: "#4A4A4A" }}
        title={name || symbol}
      >
        <span className="text-white font-bold text-xs text-center px-1">
          {firstWord}
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
    />
  );
};

interface TokenBalance {
  id: string;
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  balanceWei: string;
  value: number;
  change24h: number;
  price: number;
  isNative: boolean;
  logoUrl?: string | null;
  isPopular?: boolean;
  possibleSpam?: boolean;
  verifiedContract?: boolean;
}

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenSelect: (token: any) => void;
  selectedToken?: any | null;
  showChainSelector?: boolean;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  isOpen,
  onClose,
  onTokenSelect,
  selectedToken,
  showChainSelector = true,
}) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [selectedChain, setSelectedChain] = useState(chainId);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chainDisplayData = getChainDisplayData();
  const currentChain = chains.find((c) => c.id === selectedChain);
  const currentChainDisplay =
    chainDisplayData[selectedChain] || chainDisplayData[1];

  // IMPORTANT FIX: Sync selectedChain with actual chainId changes
  useEffect(() => {
    setSelectedChain(chainId);
  }, [chainId]);

  // Clear search and tokens when chain changes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(""); // Clear search when chain changes
      setTokens([]); // Clear tokens to force reload
    }
  }, [selectedChain]);

  // Load tokens when modal opens or dependencies change
  useEffect(() => {
    if (isOpen) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(
        () => {
          loadTokens();
        },
        searchQuery ? 300 : 0
      );

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }
  }, [isOpen, selectedChain, searchQuery, isConnected, address]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset search when modal closes
      setSearchQuery("");
    }
  }, [isOpen]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const loadTokens = async () => {
    setLoading(true);
    try {
      let fetchedTokens = [];

      if (searchQuery.trim()) {
        // When there's a search query, search ALL tokens via 1inch API
        console.log(
          `🔍 Searching all tokens for: ${searchQuery} on chain ${selectedChain}`
        );

        const searchResults = await swapService.searchTokens(
          selectedChain,
          searchQuery
        );
        fetchedTokens = searchResults.map((token) => ({
          id: token.address,
          symbol: token.symbol,
          name: token.name,
          contractAddress: token.address,
          decimals: token.decimals,
          balance: 0,
          value: 0,
          logoUrl: token.logoURI,
          isNative:
            token.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        }));

        // If user is connected, also get their balances for these tokens
        if (isConnected && address && fetchedTokens.length > 0) {
          try {
            const walletResponse = await tokenService.getWalletTokens(
              address,
              selectedChain,
              true
            );

            // Merge balance data with search results
            const walletTokensMap = new Map(
              walletResponse.tokens.map((t) => [
                t.contractAddress.toLowerCase(),
                t,
              ])
            );

            fetchedTokens = fetchedTokens.map((token) => {
              const walletToken = walletTokensMap.get(
                token.contractAddress.toLowerCase()
              );
              if (walletToken) {
                return {
                  ...token,
                  balance: walletToken.balance,
                  value: walletToken.value,
                };
              }
              return token;
            });

            // Sort to show tokens with balance first
            fetchedTokens.sort((a, b) => {
              if (a.balance > 0 && b.balance === 0) return -1;
              if (a.balance === 0 && b.balance > 0) return 1;
              return b.value - a.value;
            });
          } catch (error) {
            console.warn("Could not fetch wallet balances for search results");
          }
        }
      } else {
        // No search query - show user's wallet tokens if connected, otherwise show popular tokens
        if (isConnected && address) {
          console.log(`📦 Loading wallet tokens for chain ${selectedChain}`);
          const response = await tokenService.getWalletTokens(
            address,
            selectedChain,
            true
          );
          fetchedTokens = response.tokens || [];
        } else {
          // Show popular tokens from 1inch when not connected
          console.log(`📦 Loading popular tokens for chain ${selectedChain}`);
          const popularTokens = await swapService.searchTokens(selectedChain);
          fetchedTokens = popularTokens.slice(0, 20).map((token) => ({
            id: token.address,
            symbol: token.symbol,
            name: token.name,
            contractAddress: token.address,
            decimals: token.decimals,
            balance: 0,
            value: 0,
            logoUrl: token.logoURI,
            isNative:
              token.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          }));
        }
      }

      setTokens(fetchedTokens);
      console.log(
        `✅ Loaded ${fetchedTokens.length} tokens for chain ${selectedChain}`
      );
    } catch (error) {
      console.error("Error loading tokens:", error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (token: any) => {
    // Convert to expected format for swap
    const formattedToken = {
      address: token.contractAddress || token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoUrl || token.logoURI,
      balance: token.balance,
      value: token.value,
    };
    onTokenSelect(formattedToken);
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

  const formatTokenAmount = (amount: number, decimals: number = 6) => {
    if (amount === 0) return "0";
    if (amount < 0.000001) return amount.toExponential(2);

    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }

    return amount.toFixed(Math.min(decimals, 8));
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
          className={`h-[550px] mx-4 ${
            showChainSelector ? "w-full max-w-4xl" : "w-full max-w-2xl"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main container */}
          <div className="bg-[#000] rounded-[20px] h-full flex overflow-hidden">
            {/* Left Side - Chains */}
            {showChainSelector && (
              <div className="w-1/3 p-5">
                {/* Main heading for the entire left section */}
                <div className="mb-8">
                  <h2 className="text-white font-mayeka text-xl">
                    Select a Token
                  </h2>
                </div>

                <div className="flex items-center justify-between mb-4">
                  {/* Networks section with gradient border */}
                  <div className="relative p-[2px] rounded-[12px] w-full ">
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
                            Supported Chains
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {chains.map((chain) => {
                          const chainDisplay = chainDisplayData[chain.id] || {
                            name: chain.name,
                            color: "bg-gray-500",
                            icon: chain.name.charAt(0),
                            fallbackIcon: chain.name.charAt(0),
                            useBackground: true,
                          };

                          const isSelected = selectedChain === chain.id;

                          return (
                            <button
                              key={chain.id}
                              onClick={() => setSelectedChain(chain.id)}
                              className={`w-full p-3 rounded-[10px] transition-all duration-200 text-left ${
                                isSelected
                                  ? "bg-[#71570C]"
                                  : " hover:bg-[#1A1A1A]"
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
            )}

            {/* Right Side - Tokens */}
            <div
              className={`flex flex-col bg-[#000] p-5 ${
                showChainSelector ? "flex-1" : "w-full"
              }`}
            >
              {/* Header with title and close button */}
              <div className="flex justify-between items-center mb-5">
                {/* Show title only when chain selector is hidden */}
                {!showChainSelector && (
                  <h2 className="text-white font-mayeka text-xl">
                    Select a Token
                  </h2>
                )}
                {/* Close Button */}
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
                  <Search size={16} className="text-gray-400" />
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
                  {searchQuery
                    ? "Search Results"
                    : isConnected
                    ? "Your Tokens"
                    : "Popular Tokens"}
                </h4>
              </div>

              {/* Token List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19]"></div>
                  </div>
                ) : tokens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                      <span className="text-gray-400 text-lg">🪙</span>
                    </div>
                    <p className="text-gray-400 font-satoshi">
                      {searchQuery
                        ? "No tokens found. Try a different search."
                        : "No tokens available"}
                    </p>
                    {!isConnected && !searchQuery && (
                      <p className="text-gray-500 text-sm mt-2">
                        Connect wallet to see your tokens
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tokens.map((token, index) => (
                      <button
                        key={`${
                          token.contractAddress || token.address
                        }_${index}`}
                        onClick={() => handleTokenSelect(token)}
                        className="w-full flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[#1A1A1A] text-left"
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          <TokenImage
                            src={token.logoUrl || token.logoURI}
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

                        <div className="text-right flex-shrink-0">
                          {token.balance > 0 ? (
                            <>
                              <div className="text-white font-medium font-satoshi text-sm">
                                {formatTokenAmount(token.balance, 4)}
                              </div>
                              <div className="text-gray-400 text-xs font-satoshi">
                                {formatCurrency(token.value)}
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-400 text-xs font-satoshi">
                              {searchQuery && isConnected
                                ? "No balance"
                                : token.isNative
                                ? "Native"
                                : "ERC-20"}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TokenSelector;
