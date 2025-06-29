// src/components/dashboard/TokenList.tsx - FIXED VERSION WITH PROPER ICONS
"use client";

import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef } from "react";
import { RootState, AppDispatch } from "@/store";
import { fetchWalletTokens } from "@/store/slices/walletSlice";
import WalletRefreshButton from "@/components/wallet/WalletRefreshButton";

export default function TokenList() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { tokens, activeWallet, loading } = useSelector(
    (state: RootState) => state.wallet
  );

  // Use ref to prevent duplicate API calls
  const tokensLoaded = useRef<string | null>(null);

  useEffect(() => {
    console.log("🪙 TokenList - Effect triggered", {
      activeWalletAddress: activeWallet?.address,
      tokensLoadedFor: tokensLoaded.current,
      tokensLength: tokens.length,
      shouldFetch:
        activeWallet?.address && tokensLoaded.current !== activeWallet.address,
    });

    // Only fetch tokens if we have an active wallet and haven't already loaded tokens for this wallet
    if (
      activeWallet?.address &&
      tokensLoaded.current !== activeWallet.address
    ) {
      console.log(
        "📡 TokenList - Fetching tokens for wallet:",
        activeWallet.address
      );
      tokensLoaded.current = activeWallet.address;
      dispatch(fetchWalletTokens(activeWallet.address));
    }
  }, [activeWallet?.address, dispatch]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // FIXED: Proper ETH icon handling and fallback colors
  const getTokenIcon = (symbol: string, contractAddress?: string) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
      ETHEREUM: "bg-blue-500",
      SOL: "bg-purple-500",
      BTC: "bg-orange-500",
      SUI: "bg-cyan-500",
      XRP: "bg-gray-500",
      ADA: "bg-blue-600",
      AVAX: "bg-red-500",
      TON: "bg-blue-400",
      DOT: "bg-pink-500",
      USDT: "bg-green-500",
      USDC: "bg-blue-600",
      YAI: "bg-yellow-500",
      LINK: "bg-blue-700",
    };

    // Special handling for ETH/native token
    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return colors.ETH || "bg-blue-500";
    }

    return colors[symbol] || "bg-gray-500";
  };

  // FIXED: Proper ETH symbol handling
  const getTokenLetter = (symbol: string, contractAddress?: string) => {
    const letters: Record<string, string> = {
      ETH: "Ξ",
      ETHEREUM: "Ξ",
      SOL: "◎",
      BTC: "₿",
      SUI: "~",
      XRP: "✕",
      ADA: "₳",
      AVAX: "A",
      TON: "T",
      DOT: "●",
      USDT: "₮",
      USDC: "$",
      YAI: "Ÿ",
      LINK: "⛓",
    };

    // Special handling for ETH/native token
    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return letters.ETH || "Ξ";
    }

    return letters[symbol] || symbol.charAt(0);
  };

  // FIXED: Better icon URL validation
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url === "null" || url === "undefined" || url === "") {
      return false;
    }
    return (
      url.startsWith("http") &&
      (url.includes("coingecko") ||
        url.includes("coinbase") ||
        url.includes("cdn"))
    );
  };

  const handleTokenClick = (token: any) => {
    // Debug logging
    console.log("🔍 Token clicked:", {
      tokenId: token.id,
      symbol: token.symbol,
      contractAddress: token.contractAddress,
      name: token.name,
      activeWallet: activeWallet?.address,
    });

    if (!activeWallet?.address) {
      console.error("❌ No active wallet found");
      alert("Please select an active wallet first.");
      return;
    }

    // FIXED: Better ETH/native token detection
    let routeContractAddress: string;
    if (
      token.contractAddress === "native" ||
      token.symbol === "ETH" ||
      token.symbol === "ETHEREUM" ||
      !token.contractAddress ||
      token.contractAddress === "undefined" ||
      token.contractAddress === ""
    ) {
      routeContractAddress = "ETH";
      console.log("📍 Routing to ETH (native token)");
    } else {
      routeContractAddress = token.contractAddress;
      console.log("📍 Routing to ERC-20 token:", routeContractAddress);
    }

    try {
      const url = `/dashboard/token/${encodeURIComponent(
        routeContractAddress
      )}?wallet=${encodeURIComponent(activeWallet.address)}`;
      console.log("🔗 Navigating to:", url);
      router.push(url);
    } catch (error) {
      console.error("❌ Navigation error:", error);
      alert("Failed to navigate to token details. Please try again.");
    }
  };

  // Debug current tokens
  useEffect(() => {
    if (tokens.length > 0) {
      console.log(
        "🔍 Current tokens in TokenList:",
        tokens.map((t) => ({
          symbol: t.symbol,
          balance: t.balance,
          value: t.value,
          icon: t.icon,
          contractAddress: t.contractAddress,
        }))
      );
    }
  }, [tokens]);

  const displayTokens = tokens;

  if (loading && tokens.length === 0) {
    return (
      <div className="bg-black rounded-[16px] lg:rounded-[20px] p-4 lg:p-6 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className="text-base lg:text-lg font-semibold text-white font-satoshi flex-shrink-0">
            Token Holdings ({tokens.length})
          </h2>
          <WalletRefreshButton />
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activeWallet) {
    return (
      <div className="bg-black rounded-[16px] lg:rounded-[20px] p-4 lg:p-6 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className="text-base lg:text-lg font-semibold text-white font-satoshi flex-shrink-0">
            Token Holdings (0)
          </h2>
          <WalletRefreshButton />
        </div>
        <div className="flex flex-col items-center justify-center text-center py-8 lg:py-12">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
            <span className="text-gray-400 text-lg lg:text-xl">₿</span>
          </div>
          <h3 className="text-white text-base lg:text-lg font-satoshi mb-2">
            No wallet selected
          </h3>
          <p className="text-gray-400 font-satoshi text-sm lg:text-base">
            Please select a wallet to view your tokens
          </p>
        </div>
      </div>
    );
  }

  if (displayTokens.length === 0 && !loading) {
    return (
      <div className="bg-black rounded-[16px] lg:rounded-[20px] p-4 lg:p-6 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className="text-base lg:text-lg font-semibold text-white font-satoshi flex-shrink-0">
            Token Holdings (0)
          </h2>
          <WalletRefreshButton />
        </div>
        <div className="flex flex-col items-center justify-center text-center py-8 lg:py-12">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
            <span className="text-gray-400 text-lg lg:text-xl">🪙</span>
          </div>
          <h3 className="text-white text-base lg:text-lg font-satoshi mb-2">
            No tokens found
          </h3>
          <p className="text-gray-400 font-satoshi text-sm lg:text-base mb-4">
            This wallet doesn't have any tokens yet
          </p>
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 max-w-sm">
            <p className="text-blue-400 text-sm font-satoshi">
              💡 <strong>Tip:</strong> Send some tokens to your wallet address:{" "}
              {activeWallet.address.slice(0, 8)}...
              {activeWallet.address.slice(-6)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-[16px] lg:rounded-[20px] p-4 lg:p-6 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h2 className="text-base lg:text-lg font-semibold text-white font-satoshi flex-shrink-0">
          Token Holdings ({displayTokens.length})
        </h2>
        <WalletRefreshButton />
      </div>

      {/* Mobile Grid Layout */}
      <div className="block sm:hidden flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-1 gap-3 pr-2">
          {displayTokens.map((token) => (
            <div
              key={token.id}
              onClick={() => handleTokenClick(token)}
              className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] cursor-pointer hover:bg-[#1A1A1A] transition-colors active:bg-[#2A2A2A]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {/* FIXED: Better icon handling - check API icon first */}
                  {isValidImageUrl(token.icon) ? (
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                      onError={(e) => {
                        console.log(
                          `❌ Image load failed for ${token.symbol}: ${token.icon}`
                        );
                        // Fallback to colored circle if image fails
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback =
                          target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.classList.remove("hidden");
                        }
                      }}
                    />
                  ) : null}

                  <div
                    className={`w-8 h-8 ${getTokenIcon(
                      token.symbol,
                      token.contractAddress
                    )} rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                      isValidImageUrl(token.icon) ? "hidden" : ""
                    }`}
                  >
                    <span className="text-white text-sm font-medium">
                      {getTokenLetter(token.symbol, token.contractAddress)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-white font-medium font-satoshi">
                      {token.name}
                    </div>
                    <div className="text-gray-400 text-sm font-satoshi">
                      {token.balance.toFixed(4)} {token.symbol}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-white font-medium font-satoshi">
                    {formatCurrency(token.value)}
                  </div>
                  <div
                    className={`text-sm font-satoshi ${
                      token.change24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatPercentage(token.change24h)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tablet/Desktop List Layout */}
      <div className="hidden sm:block flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-3 pr-2">
          {displayTokens.map((token) => (
            <div
              key={token.id}
              onClick={() => handleTokenClick(token)}
              className="flex items-center justify-between p-3 hover:bg-[#1A1A1A] rounded-lg transition-colors cursor-pointer active:bg-[#2A2A2A]"
            >
              <div className="flex items-center min-w-0 flex-1">
                {/* FIXED: Better icon handling - check API icon first */}
                {isValidImageUrl(token.icon) ? (
                  <img
                    src={token.icon}
                    alt={token.symbol}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-3 flex-shrink-0"
                    onError={(e) => {
                      console.log(
                        `❌ Image load failed for ${token.symbol}: ${token.icon}`
                      );
                      // Fallback to colored circle if image fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.classList.remove("hidden");
                      }
                    }}
                  />
                ) : null}

                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${getTokenIcon(
                    token.symbol,
                    token.contractAddress
                  )} rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                    isValidImageUrl(token.icon) ? "hidden" : ""
                  }`}
                >
                  <span className="text-white text-sm font-medium">
                    {getTokenLetter(token.symbol, token.contractAddress)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium font-satoshi text-sm sm:text-base flex items-center">
                    {token.name}
                    {/* Debug indicator */}
                    {process.env.NODE_ENV === "development" && (
                      <span className="ml-2 text-xs text-gray-500">
                        {token.contractAddress === "native"
                          ? "(ETH)"
                          : "(ERC20)"}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs sm:text-sm font-satoshi">
                    {token.balance.toFixed(4)} {token.symbol}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-white font-medium font-satoshi text-sm sm:text-base">
                  {formatCurrency(token.value)}
                </div>
                <div
                  className={`text-xs sm:text-sm font-satoshi ${
                    token.change24h >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatPercentage(token.change24h)}
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
}
