// src/components/swap/TokenSelectorModal.tsx - WITH SOLANA SUPPORT
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { chains } from "@/components/wallet/WalletProvider";
import { swapService } from "@/services/swapService";
import { useWalletData } from "@/contexts/WalletDataContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

// Chain data with Solana included
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
    1: {
      name: "Ethereum",
      color: "bg-blue-500",
      icon: "Ξ",
      image: "/chains/Ethereum.png",
      fallbackIcon: "Ξ",
      useBackground: true,
    },
    8453: {
      name: "Base",
      color: "bg-blue-600",
      icon: "B",
      image: "/chains/Base.png",
      fallbackIcon: "B",
      useBackground: false,
    },
    137: {
      name: "Polygon",
      color: "bg-purple-500",
      icon: "◆",
      image: "/chains/Polygon.png",
      fallbackIcon: "◆",
      useBackground: false,
    },
    43114: {
      name: "Avalanche",
      color: "bg-red-500",
      icon: "A",
      image: "/chains/Avalanche.png",
      fallbackIcon: "A",
      useBackground: true,
    },
    42161: {
      name: "Arbitrum",
      color: "bg-blue-400",
      icon: "◉",
      image: "/chains/Arbitrum.png",
      fallbackIcon: "◉",
      useBackground: false,
    },
    56: {
      name: "BSC",
      color: "bg-yellow-500",
      icon: "B",
      image: "/chains/BSC.png",
      fallbackIcon: "B",
      useBackground: true,
    },
    solana: {
      name: "Solana",
      color: "bg-gradient-to-r from-purple-500 to-blue-500",
      icon: "◎",
      image: "/chains/Solana.png",
      fallbackIcon: "◎",
      useBackground: false,
    },
  };

  return chainDisplayData;
};

// Combined chains array with Solana
const allChains = [
  ...chains,
  {
    id: "solana",
    name: "Solana",
    nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
  },
];

// Image cache
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
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(
    () => {
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

    if (chainData.image && imageCache.has(chainData.image)) {
      const cached = imageCache.get(chainData.image);
      setImageState(cached ? "loaded" : "error");
      return;
    }

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
        opacity: imageState === "loading" ? 0 : 1,
        transition: "opacity 0.15s ease-in",
      }}
    >
      {imageState === "loaded" && chainData.image && (
        <img
          src={chainData.image}
          alt={chainData.name}
          className="w-full h-full object-contain p-1"
          draggable={false}
        />
      )}

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
        <span className="text-white font-bold text-[10px] lg:text-xs">
          {getFirstLetter()}
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
  // Get current network from AppKit
  const { caipNetwork } = useAppKitNetwork();
  const { address: appKitAddress } = useAppKitAccount();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const wagmiChainId = useChainId();

  // Determine if we're on Solana or EVM
  const isSolana =
    caipNetwork?.name?.toLowerCase() === "solana" ||
    caipNetwork?.id?.toString().includes("solana");

  const address = isSolana ? appKitAddress : wagmiAddress;
  const isConnected = isSolana ? !!appKitAddress : wagmiConnected;

  // Set initial chain based on network
  const [selectedChain, setSelectedChain] = useState<number | string>(
    isSolana ? "solana" : wagmiChainId
  );

  const { walletData } = useWalletData();

  const [externalTokens, setExternalTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showAdditionalTokens, setShowAdditionalTokens] = useState(false);

  const chainDisplayData = getChainDisplayData();

  // Preload all chain images
  useEffect(() => {
    const preloadAllChainImages = async () => {
      const images = Object.values(chainDisplayData)
        .map((data) => data.image)
        .filter(Boolean) as string[];

      await Promise.all(images.map((src) => preloadImage(src)));
    };

    preloadAllChainImages();
  }, []);

  // Update selected chain when network changes
  useEffect(() => {
    if (isSolana) {
      setSelectedChain("solana");
    } else {
      setSelectedChain(wagmiChainId);
    }
  }, [isSolana, wagmiChainId]);

  // Search functionality
  useEffect(() => {
    if (isOpen) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        if (searchQuery) {
          searchExternalTokens();
        } else {
          setExternalTokens([]);
        }
      }, 300);

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }
  }, [isOpen, searchQuery, selectedChain]);

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

  // Search external tokens (Solana or EVM)
  const searchExternalTokens = async () => {
    if (!searchQuery.trim()) {
      setExternalTokens([]);
      return;
    }

    setLoading(true);
    try {
      console.log(
        `🔍 Searching tokens for: ${searchQuery} on chain: ${selectedChain}`
      );

      let searchResults;

      if (selectedChain === "solana") {
        // Use Jupiter search for Solana
        console.log("Using Jupiter search for Solana");
        const response = await fetch(
          `${API_BASE_URL}/api/jupiter/search?query=${encodeURIComponent(
            searchQuery
          )}`
        );
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          searchResults = data.data.map((token: any) => ({
            id: token.address || token.id,
            symbol: token.symbol,
            name: token.name,
            contractAddress: token.address || token.id,
            address: token.address || token.id,
            decimals: token.decimals || 9,
            balance: 0,
            value: 0,
            logoUrl: token.logoURI,
            logoURI: token.logoURI,
            isExternal: true,
          }));
          console.log(`✅ Found ${searchResults.length} Solana tokens`);
        } else {
          searchResults = [];
        }
      } else {
        // Use 1inch search for EVM
        console.log("Using 1inch search for EVM");
        searchResults = await swapService.searchTokens(
          selectedChain as number,
          searchQuery
        );

        searchResults = searchResults.map((token: any) => ({
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
          isExternal: true,
        }));
        console.log(`✅ Found ${searchResults.length} EVM tokens`);
      }

      setExternalTokens(searchResults);
    } catch (error) {
      console.error("Error searching external tokens:", error);
      setExternalTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const formatContractAddress = (address: string): string => {
    if (!address || address === "native") return "Native";
    if (address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
      return "Native";

    if (address.length > 10) {
      return `${address.slice(0, 5)}...${address.slice(-3)}`;
    }
    return address;
  };

  // Get wallet tokens (only for current chain and if connected)
  const { mainTokens, additionalTokens } = useMemo(() => {
    // For Solana, we don't have cached tokens yet, return empty
    if (selectedChain === "solana") {
      console.log("📋 Solana selected - no cached tokens yet");
      return { mainTokens: [], additionalTokens: [] };
    }

    // For EVM, use wallet data if on same chain and connected
    if (
      !isConnected ||
      !address ||
      selectedChain !== wagmiChainId ||
      !walletData.cacheValid
    ) {
      return { mainTokens: [], additionalTokens: [] };
    }

    const allTokens = walletData.tokens.filter((token) => token.balance > 0);

    const main = allTokens.filter((token) => {
      return token.isPreset || token.isUserAdded;
    });

    const additional = allTokens.filter((token) => {
      return !token.isPreset && !token.isUserAdded;
    });

    return { mainTokens: main, additionalTokens: additional };
  }, [
    walletData.tokens,
    walletData.cacheValid,
    isConnected,
    address,
    selectedChain,
    wagmiChainId,
  ]);

  // Filter tokens based on search
  const filteredMainTokens = useMemo(() => {
    if (!searchQuery) return mainTokens;

    const query = searchQuery.toLowerCase();
    return mainTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.contractAddress.toLowerCase().includes(query)
    );
  }, [mainTokens, searchQuery]);

  const filteredAdditionalTokens = useMemo(() => {
    if (!searchQuery) return additionalTokens;

    const query = searchQuery.toLowerCase();
    return additionalTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.contractAddress.toLowerCase().includes(query)
    );
  }, [additionalTokens, searchQuery]);

  // Combined display tokens
  const displayTokens = useMemo(() => {
    if (searchQuery && externalTokens.length > 0) {
      return [
        ...filteredMainTokens,
        ...filteredAdditionalTokens,
        ...externalTokens,
      ];
    }

    return filteredMainTokens;
  }, [
    filteredMainTokens,
    filteredAdditionalTokens,
    externalTokens,
    searchQuery,
  ]);

  const handleTokenSelect = (token: any) => {
    const formattedToken = {
      address:
        token.contractAddress === "native"
          ? selectedChain === "solana"
            ? "So11111111111111111111111111111111111111112" // Wrapped SOL
            : "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          : token.contractAddress || token.address,
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

  const renderTokenButton = (token: any, index: number) => {
    const isExternal = token.isExternal || false;

    return (
      <button
        key={`${token.contractAddress || token.address}_${index}`}
        onClick={() => handleTokenSelect(token)}
        className="w-full flex items-center justify-between p-2 lg:p-3 rounded-lg transition-colors hover:bg-[#1A1A1A] text-left"
      >
        <div className="flex items-center min-w-0 flex-1">
          <TokenImage
            src={token.logoUrl || token.logoURI}
            alt={token.symbol}
            symbol={token.symbol}
            name={token.name}
            className="w-8 h-8 lg:w-10 lg:h-10 mr-2 lg:mr-3 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-white font-medium font-satoshi text-xs lg:text-sm">
              {token.name}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px] lg:text-xs font-satoshi">
                {token.symbol}
              </span>
              <span className="text-gray-500 text-[9px] lg:text-[10px] font-satoshi font-mono">
                {formatContractAddress(token.contractAddress || token.address)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          {token.balance > 0 && !isExternal ? (
            <>
              <div className="text-white font-medium font-satoshi text-xs lg:text-sm">
                {formatTokenAmount(token.balance, 4)}
              </div>
              <div className="text-gray-400 text-[10px] lg:text-xs font-satoshi">
                {formatCurrency(token.value)}
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-[10px] lg:text-xs font-satoshi">
              {isExternal
                ? "Search Result"
                : token.isNative
                ? "Native"
                : selectedChain === "solana"
                ? "SPL Token"
                : "ERC-20"}
            </div>
          )}
        </div>
      </button>
    );
  };

  if (!isOpen) return null;

  const hasWalletTokens = isConnected && mainTokens.length > 0;
  const hasAdditionalTokens = filteredAdditionalTokens.length > 0;

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
          paddingTop: "calc(80px + 0.5rem)",
          paddingBottom: "calc(80px + 0.5rem)",
        }}
      >
        {/* Modal Content */}
        <div
          className={`h-[65vh] lg:h-[550px] ${
            showChainSelector
              ? "w-full max-w-[95vw] lg:max-w-4xl"
              : "w-full max-w-[95vw] lg:max-w-2xl"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#000] rounded-[16px] lg:rounded-[20px] h-full flex flex-col lg:flex-row overflow-hidden border border-[#2C2C2C]">
            {/* Desktop Left Side - Chains */}
            {showChainSelector && (
              <div className="hidden lg:block lg:w-1/3 p-5">
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
                        {allChains.map((chain) => {
                          const chainId =
                            typeof chain.id === "number" ? chain.id : "solana";
                          const chainDisplay = chainDisplayData[chainId] || {
                            name: chain.name,
                            color: "bg-gray-500",
                            icon: chain.name.charAt(0),
                            fallbackIcon: chain.name.charAt(0),
                            useBackground: true,
                          };

                          const isSelected = selectedChain === chainId;

                          return (
                            <button
                              key={chainId}
                              onClick={() => setSelectedChain(chainId)}
                              disabled={chainId === "solana" && !isSolana}
                              className={`w-full p-3 rounded-[10px] transition-all duration-200 text-left ${
                                isSelected
                                  ? "bg-[#71570C]"
                                  : "hover:bg-[#1A1A1A]"
                              } ${
                                chainId === "solana" && !isSolana
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <ChainIcon chainData={chainDisplay} size="md" />
                                <span className="text-sm font-satoshi font-medium text-white">
                                  {chainDisplay.name}
                                  {chainId === "solana" &&
                                    !isSolana &&
                                    " (Switch wallet)"}
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

            {/* Mobile & Desktop Right Side - Tokens */}
            <div
              className={`flex flex-col bg-[#000] ${
                showChainSelector ? "flex-1" : "w-full"
              } min-h-0`}
            >
              {/* Mobile Header */}
              <div className="lg:hidden flex items-center justify-between p-3 border-b border-[#2C2C2C] flex-shrink-0">
                <h2 className="text-white font-mayeka text-lg">
                  Select a Token
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-1.5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:flex justify-between items-center p-5 pb-0 flex-shrink-0">
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

              {/* Content */}
              <div className="flex-1 flex flex-col p-3 lg:p-5 lg:pt-0 min-h-0">
                {/* Mobile Chain Selector */}
                {showChainSelector && (
                  <div className="lg:hidden mb-4 flex-shrink-0">
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
                      <div className="relative bg-[#000] rounded-[10px] p-2.5">
                        <div className="mb-2">
                          <h3 className="text-white font-mayeka text-xs">
                            Supported Chains
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-between">
                          {allChains.map((chain) => {
                            const chainId =
                              typeof chain.id === "number"
                                ? chain.id
                                : "solana";
                            const chainDisplay = chainDisplayData[chainId];
                            const isSelected = selectedChain === chainId;

                            return (
                              <button
                                key={chainId}
                                onClick={() => setSelectedChain(chainId)}
                                disabled={chainId === "solana" && !isSolana}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] transition-all ${
                                  isSelected
                                    ? "bg-[#71570C]"
                                    : "bg-[#0F0F0F] hover:bg-[#1A1A1A]"
                                } ${
                                  chainId === "solana" && !isSolana
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <ChainIcon chainData={chainDisplay} size="md" />
                                <span className="text-[11px] font-satoshi font-medium text-white">
                                  {chainDisplay.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative mb-2.5 lg:mb-5 flex-shrink-0">
                  <div className="absolute left-2.5 lg:left-3 top-1/2 transform -translate-y-1/2">
                    <Search size={14} className="lg:w-4 lg:h-4 text-gray-400" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search name, symbol, or paste address"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[15px] pl-8 lg:pl-10 pr-3 lg:pr-4 py-2 lg:py-3 text-base text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-mayeka"
                    style={{
                      fontSize: "16px",
                    }}
                  />
                </div>

                {/* Token List */}
                <div className="flex-1 overflow-y-auto relative min-h-0">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-[#E2AF19]"></div>
                        <p className="text-gray-400 text-xs lg:text-sm font-satoshi">
                          Searching...
                        </p>
                      </div>
                    </div>
                  ) : displayTokens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center absolute inset-0">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                        <span className="text-gray-400 text-base lg:text-lg">
                          🪙
                        </span>
                      </div>
                      <p className="text-gray-400 font-satoshi text-sm lg:text-base">
                        {searchQuery
                          ? "No tokens found. Try a different search."
                          : !isConnected
                          ? "Connect wallet to see your tokens"
                          : selectedChain === "solana" && !isSolana
                          ? "Switch to Solana wallet to see tokens"
                          : "Search for tokens to trade"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 lg:space-y-2">
                      {/* Wallet Tokens */}
                      {displayTokens.map((token, index) => {
                        if (token.isExternal) return null;
                        return renderTokenButton(token, index);
                      })}

                      {/* Additional Tokens Toggle */}
                      {hasAdditionalTokens && !searchQuery && (
                        <div className="py-2">
                          <button
                            onClick={() =>
                              setShowAdditionalTokens(!showAdditionalTokens)
                            }
                            className="w-full flex items-center justify-center gap-2 py-2 lg:py-3 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                          >
                            <div className="flex-1 h-px bg-[#2C2C2C]"></div>
                            <div className="flex items-center gap-2 px-2 lg:px-3">
                              <span className="text-gray-400 text-[10px] lg:text-xs font-satoshi">
                                {showAdditionalTokens ? "Hide" : "Show"}{" "}
                                Additional Tokens (
                                {filteredAdditionalTokens.length})
                              </span>
                              {showAdditionalTokens ? (
                                <ChevronUp
                                  size={14}
                                  className="lg:w-4 lg:h-4 text-gray-400"
                                />
                              ) : (
                                <ChevronDown
                                  size={14}
                                  className="lg:w-4 lg:h-4 text-gray-400"
                                />
                              )}
                            </div>
                            <div className="flex-1 h-px bg-[#2C2C2C]"></div>
                          </button>
                        </div>
                      )}

                      {/* Additional Tokens List */}
                      {showAdditionalTokens && hasAdditionalTokens && (
                        <div className="space-y-1.5 lg:space-y-2 pt-2">
                          {filteredAdditionalTokens.map((token, index) =>
                            renderTokenButton(token, index)
                          )}
                        </div>
                      )}

                      {/* External Search Results */}
                      {searchQuery && externalTokens.length > 0 && (
                        <>
                          <div className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-[#2C2C2C]"></div>
                              <span className="text-gray-400 text-[10px] lg:text-xs font-satoshi px-2">
                                Search Results ({externalTokens.length})
                              </span>
                              <div className="flex-1 h-px bg-[#2C2C2C]"></div>
                            </div>
                          </div>
                          {externalTokens.map((token, index) =>
                            renderTokenButton(token, index)
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TokenSelector;
