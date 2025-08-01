// src/components/swap/TokenSelectorModal.tsx
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
}: TokenSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customToken, setCustomToken] = useState<Token | null>(null);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customError, setCustomError] = useState("");
  const [activeTab, setActiveTab] = useState<"my_tokens" | "common">(
    showBalances ? "my_tokens" : "common"
  );

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

  // Combine user tokens with common tokens and filter
  const allTokens = showBalances ? tokens : [...tokens, ...COMMON_TOKENS];

  // Filter tokens based on search query (excluding custom token detection)
  const filteredTokens = allTokens.filter((token) => {
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

        {/* Tabs - Only show if we have user tokens */}
        {showBalances && (
          <div className="flex border-b border-[#2C2C2C]">
            <button
              onClick={() => setActiveTab("my_tokens")}
              className={`flex-1 px-4 py-3 text-sm font-satoshi transition-colors ${
                activeTab === "my_tokens"
                  ? "text-[#E2AF19] border-b-2 border-[#E2AF19]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              My Tokens
            </button>
            <button
              onClick={() => setActiveTab("common")}
              className={`flex-1 px-4 py-3 text-sm font-satoshi transition-colors ${
                activeTab === "common"
                  ? "text-[#E2AF19] border-b-2 border-[#E2AF19]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Common
            </button>
          </div>
        )}

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
                <img
                  src={customToken.logoUrl}
                  alt={customToken.symbol}
                  className="w-10 h-10 rounded-full mr-3"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {customToken.symbol.charAt(0)}
                  </span>
                </div>
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
            {(activeTab === "my_tokens"
              ? tokens
              : activeTab === "common"
              ? COMMON_TOKENS
              : filteredTokens
            )
              .filter(
                (token) =>
                  token.symbol
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  token.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((token) => (
                <button
                  key={token.contractAddress}
                  onClick={() => onSelect(token)}
                  className="w-full flex items-center p-4 hover:bg-[#1A1A1A] transition-colors text-left"
                >
                  {token.logoUrl ? (
                    <img
                      src={token.logoUrl}
                      alt={token.symbol}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {token.symbol.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-white font-semibold font-satoshi">
                      {token.symbol}
                    </div>
                    <div className="text-gray-400 text-sm font-satoshi">
                      {token.name}
                    </div>
                  </div>
                  {/* Only show balances for user's tokens */}
                  {showBalances && activeTab === "my_tokens" && (
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
            {(activeTab === "my_tokens"
              ? tokens
              : activeTab === "common"
              ? COMMON_TOKENS
              : filteredTokens
            ).filter(
              (token) =>
                token.symbol
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                token.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 &&
              !isValidAddress(searchQuery) && (
                <div className="p-8 text-center">
                  <p className="text-gray-400 font-satoshi">
                    {searchQuery
                      ? "No tokens found matching your search"
                      : "No tokens available"}
                  </p>
                </div>
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
