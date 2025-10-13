// src/components/swap/TokenSelectorModal.tsx - WITH CONTRACT ADDRESS DISPLAY
"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Search, ChevronDown, ChevronUp } from "lucide-react";
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
    console.log(`Failed to load image: ${chainData.image}`);
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    console.log(`Successfully loaded image: ${chainData.image}`);
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
  const [hasError, setHasError] = React.useState(false);

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
  const [mainListTokens, setMainListTokens] = useState<any[]>([]);
  const [additionalTokens, setAdditionalTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for showing additional tokens
  const [showAdditionalTokens, setShowAdditionalTokens] = useState(false);

  // Track preset token count for filtering
  const [presetTokenCount, setPresetTokenCount] = useState(0);
  const [userAddedTokens, setUserAddedTokens] = useState<string[]>([]);

  const chainDisplayData = getChainDisplayData();

  useEffect(() => {
    setSelectedChain(chainId);
  }, [chainId]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setMainListTokens([]);
      setAdditionalTokens([]);
      setShowAdditionalTokens(false);
    }
  }, [selectedChain]);

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

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // NEW: Format contract address (0x123...abc)
  const formatContractAddress = (address: string): string => {
    if (!address || address === "native") return "Native";
    if (address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
      return "Native";

    // Format as 0xabc...xyz
    if (address.length > 10) {
      return `${address.slice(0, 5)}...${address.slice(-3)}`;
    }
    return address;
  };

  // Load user preferences to get user-added tokens
  const loadUserPreferences = async () => {
    if (!address || !isConnected) return { userAddedTokens: [] };

    try {
      const response = await fetch(
        `/api/wallet/preferences?wallet=${address}&chain=${selectedChain}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { userAddedTokens: [] };
        }
        throw new Error("Failed to load preferences");
      }

      const data = await response.json();
      return {
        userAddedTokens: data.data?.userAddedTokens || [],
      };
    } catch (error) {
      console.warn("Could not load user preferences:", error);
      return { userAddedTokens: [] };
    }
  };

  // Split tokens into main list and additional
  const splitTokens = (
    allTokens: any[],
    presetCount: number,
    userAdded: string[]
  ) => {
    console.log("🔍 Splitting tokens:", {
      totalTokens: allTokens.length,
      presetCount,
      userAddedCount: userAdded.length,
    });

    // Get preset tokens (first N tokens)
    const presetTokens = allTokens.slice(0, presetCount);

    // Get user-added tokens from the remaining tokens
    const remainingTokens = allTokens.slice(presetCount);
    const userAddedFromRemaining = remainingTokens.filter((token) =>
      userAdded.some(
        (addr) => addr.toLowerCase() === token.contractAddress.toLowerCase()
      )
    );

    // Main list = preset + user-added
    const mainList = [...presetTokens, ...userAddedFromRemaining];

    // Additional = everything else (not in main list)
    const additional = remainingTokens.filter(
      (token) =>
        !userAdded.some(
          (addr) => addr.toLowerCase() === token.contractAddress.toLowerCase()
        )
    );

    console.log("✅ Split tokens:", {
      mainList: mainList.length,
      additional: additional.length,
    });

    return { mainList, additional };
  };

  const loadTokens = async () => {
    setLoading(true);
    try {
      let fetchedTokens = [];

      if (searchQuery.trim()) {
        console.log(
          `🔍 Searching all tokens for: ${searchQuery} on chain ${selectedChain}`
        );

        const searchResults = await swapService.searchTokens(
          selectedChain,
          searchQuery
        );

        fetchedTokens = searchResults.map((token: any) => ({
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

        // When searching, show all results (no split)
        if (isConnected && address) {
          try {
            const walletResponse = await tokenService.getWalletTokens(
              address,
              selectedChain,
              true
            );

            const preferences = await loadUserPreferences();
            setUserAddedTokens(preferences.userAddedTokens);
            setPresetTokenCount(walletResponse.presetTokenCount);

            const walletTokensMap = new Map(
              walletResponse.tokens.map((t: any) => [
                t.contractAddress.toLowerCase(),
                t,
              ])
            );

            fetchedTokens = fetchedTokens.map((token: any) => {
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

            fetchedTokens.sort((a: any, b: any) => {
              if (a.balance > 0 && b.balance === 0) return -1;
              if (a.balance === 0 && b.balance > 0) return 1;
              return b.value - a.value;
            });
          } catch (error) {
            console.warn("Could not fetch wallet balances for search results");
          }
        }

        // During search, show all in main list
        setMainListTokens(fetchedTokens);
        setAdditionalTokens([]);
      } else {
        // No search query - load and split tokens
        if (isConnected && address) {
          console.log(
            `📦 Loading wallet tokens for chain ${selectedChain} (with split)`
          );

          const response = await tokenService.getWalletTokens(
            address,
            selectedChain,
            true
          );

          const preferences = await loadUserPreferences();
          setUserAddedTokens(preferences.userAddedTokens);
          setPresetTokenCount(response.presetTokenCount);

          const allTokens = response.tokens || [];
          const { mainList, additional } = splitTokens(
            allTokens,
            response.presetTokenCount,
            preferences.userAddedTokens
          );

          setMainListTokens(mainList);
          setAdditionalTokens(additional);

          console.log(
            `✅ Loaded ${mainList.length} main list tokens and ${additional.length} additional tokens`
          );
        } else {
          console.log(`📦 Loading popular tokens for chain ${selectedChain}`);
          const popularTokens = await swapService.searchTokens(selectedChain);
          fetchedTokens = popularTokens.slice(0, 20).map((token: any) => ({
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

          setMainListTokens(fetchedTokens);
          setAdditionalTokens([]);
        }
      }

      console.log(`✅ Displaying tokens for chain ${selectedChain}`);
    } catch (error) {
      console.error("Error loading tokens:", error);
      setMainListTokens([]);
      setAdditionalTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSelect = (token: any) => {
    const formattedToken = {
      address:
        token.contractAddress === "native"
          ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          : token.contractAddress || token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoUrl || token.logoURI,
      balance: token.balance,
      value: token.value,
    };

    console.log("Token selected in TokenSelector:", formattedToken);
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

  const renderTokenButton = (token: any, index: number) => (
    <button
      key={`${token.contractAddress || token.address}_${index}`}
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
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-satoshi">
              {token.symbol}
            </span>
            <span className="text-gray-500 text-[10px] font-satoshi font-mono">
              {formatContractAddress(token.contractAddress || token.address)}
            </span>
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
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/10 z-40" onClick={onClose} />

      {/* Modal Container */}
      <div
        className="absolute inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className={`h-[550px] ${
            showChainSelector ? "w-full max-w-4xl" : "w-full max-w-2xl"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#000] rounded-[20px] h-full flex overflow-hidden">
            {/* Left Side - Chains */}
            {showChainSelector && (
              <div className="w-1/3 p-5">
                <div className="mb-8">
                  <h2 className="text-white font-mayeka text-xl">
                    Select a Token
                  </h2>
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
                            Supported Chains
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-1">
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
                                  : "hover:bg-[#1A1A1A]"
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
              <div className="flex justify-between items-center mb-5">
                {!showChainSelector && (
                  <h2 className="text-white font-mayeka text-xl">
                    Select a Token
                  </h2>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg ml-auto"
                >
                  <X size={20} />
                </button>
              </div>

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

              {/* <div className="mb-4">
                <h4 className="text-[#939393] font-satoshi font-medium text-base">
                  {searchQuery
                    ? "Search Results"
                    : isConnected
                    ? "Your Main List Tokens"
                    : "Popular Tokens"}
                </h4>
                {isConnected && !searchQuery && (
                  <p className="text-gray-500 text-xs font-satoshi mt-1">
                    Showing {mainListTokens.length} tokens ({presetTokenCount}{" "}
                    preset + {userAddedTokens.length} user-added)
                  </p>
                )}
              </div> */}

              <div className="flex-1 overflow-y-auto relative min-h-[400px]">
                {loading ? (
                  // FIXED: Centered loading spinner with absolute positioning
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
                      <p className="text-gray-400 text-sm font-satoshi">
                        Loading tokens...
                      </p>
                    </div>
                  </div>
                ) : mainListTokens.length === 0 &&
                  additionalTokens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center absolute inset-0">
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
                    {/* Main List Tokens */}
                    {mainListTokens.map((token, index) =>
                      renderTokenButton(token, index)
                    )}

                    {/* Divider with Expand Button */}
                    {additionalTokens.length > 0 && !searchQuery && (
                      <div className="py-2">
                        <button
                          onClick={() =>
                            setShowAdditionalTokens(!showAdditionalTokens)
                          }
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                        >
                          <div className="flex-1 h-px bg-[#2C2C2C]"></div>
                          <div className="flex items-center gap-2 px-3">
                            <span className="text-gray-400 text-xs font-satoshi">
                              {showAdditionalTokens ? "Hide" : "Show"}{" "}
                              Additional Tokens ({additionalTokens.length})
                            </span>
                            {showAdditionalTokens ? (
                              <ChevronUp size={16} className="text-gray-400" />
                            ) : (
                              <ChevronDown
                                size={16}
                                className="text-gray-400"
                              />
                            )}
                          </div>
                          <div className="flex-1 h-px bg-[#2C2C2C]"></div>
                        </button>
                      </div>
                    )}

                    {/* Additional Tokens - Expandable */}
                    {showAdditionalTokens && additionalTokens.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {additionalTokens.map((token, index) =>
                          renderTokenButton(token, index)
                        )}
                      </div>
                    )}
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
