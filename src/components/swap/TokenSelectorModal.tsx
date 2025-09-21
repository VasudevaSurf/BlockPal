// src/components/swap/TokenSelector.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { chains } from "@/components/wallet/WalletProvider";
import { tokenService } from "@/services/tokenService";

// Chain data with proper image paths and conditional background colors
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
    setImageError(true);
  };

  const handleImageLoad = () => {
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
  onTokenSelect: (token: TokenBalance) => void;
  selectedToken?: TokenBalance | null;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  isOpen,
  onClose,
  onTokenSelect,
  selectedToken,
}) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [selectedChain, setSelectedChain] = useState(chainId);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const chainDisplayData = getChainDisplayData();
  const currentChain = chains.find((c) => c.id === selectedChain);
  const currentChainDisplay =
    chainDisplayData[selectedChain] || chainDisplayData[1];

  // Load tokens when chain changes
  useEffect(() => {
    if (isOpen && isConnected && address) {
      loadTokens();
    }
  }, [isOpen, selectedChain, isConnected, address]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const loadTokens = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const response = await tokenService.getWalletTokens(
        address,
        selectedChain,
        true
      );
      setTokens(response.tokens || []);
    } catch (error) {
      console.error("Error loading tokens:", error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter tokens based on search
  const filteredTokens = tokens.filter((token) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.contractAddress.toLowerCase().includes(query)
    );
  });

  const handleTokenSelect = (token: TokenBalance) => {
    onTokenSelect(token);
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
      <div className="fixed inset-0 bg-white/10 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl h-[600px] relative">
          {/* Container with gradient border */}
          <div className="relative p-[3px] rounded-[30px] h-full">
            {/* Gradient border background */}
            <div
              className="absolute inset-0 rounded-[30px]"
              style={{
                background: `linear-gradient(135deg, 
                  #E2AF19 0%, 
                  #E2AF19 3%,
                  #2C2C2C 10%, 
                  #2C2C2C 90%, 
                  #E2AF19 97%,
                  #E2AF19 100%)`,
              }}
            />

            <div
              className="relative bg-[#0F0F0F] rounded-[26px] h-full flex"
              style={{
                boxShadow: "0 4px 4px 0 rgba(0, 0, 0, 0.25)",
              }}
            >
              {/* Left Side - Chains */}
              <div className="w-1/3 p-6 border-r border-[#2C2C2C]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-mayeka text-lg">Networks</h3>
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
                            : "border border-[#2C2C2C] hover:bg-[#1A1A1A]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ChainIcon chainData={chainDisplay} size="md" />
                          <span
                            className={`text-base font-satoshi font-medium ${
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

              {/* Right Side - Tokens */}
              <div className="flex-1 p-6 flex flex-col">
                {/* Header with Close Button */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-mayeka text-lg">
                    Select Token
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search tokens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#191919] border border-[#2C2C2C] rounded-[15px] pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi"
                  />
                </div>

                {/* Your Tokens Heading */}
                <div className="mb-4">
                  <h4 className="text-white font-satoshi font-medium text-base">
                    Your Tokens
                  </h4>
                </div>

                {/* Token List */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19]"></div>
                    </div>
                  ) : filteredTokens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                        <span className="text-gray-400 text-lg">🪙</span>
                      </div>
                      <p className="text-gray-400 font-satoshi">
                        {searchQuery
                          ? "No tokens found"
                          : "No tokens available"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTokens.map((token, index) => (
                        <button
                          key={`${token.contractAddress}_${index}`}
                          onClick={() => handleTokenSelect(token)}
                          className="w-full flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-[#1A1A1A] text-left"
                        >
                          <div className="flex items-center min-w-0 flex-1">
                            <TokenImage
                              src={token.logoUrl}
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
                            <div className="text-white font-medium font-satoshi text-sm">
                              {formatTokenAmount(token.balance, 4)}
                            </div>
                            <div className="text-gray-400 text-xs font-satoshi">
                              {formatCurrency(token.value)}
                            </div>
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
      </div>
    </>
  );
};

export default TokenSelector;
