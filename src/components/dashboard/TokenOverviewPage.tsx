// src/components/dashboard/TokenOverviewPage.tsx (ENHANCED WITH CHARTS AND FULL UI)
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  FileText,
  Send,
  Bell,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Globe,
  MessageCircle,
  Twitter,
  BarChart3,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { RootState } from "@/store";
import SimpleTransferModal from "@/components/transfer/SimpleTransferModal";

interface TokenInfo {
  name: string;
  symbol: string;
  contractAddress: string;
  decimals: number;
  balance: string;
  priceData: {
    id: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
    total_volume: number;
    description?: string;
    image?: string;
    homepage?: string;
    whitepaper?: string;
    blockchain_site?: string;
    telegram_channel?: string;
    twitter_screen_name?: string;
    subreddit_url?: string;
    official_forum_url?: string;
  } | null;
}

interface ChartData {
  prices: Array<{
    timestamp: number;
    price: number;
    date: string;
    time: string;
  }>;
  timeframe: number;
}

export default function TokenOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState(7);
  const [copied, setCopied] = useState<string>("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const contractAddress = params.tokenId as string;
  const walletAddress = searchParams.get("wallet") || activeWallet?.address;

  useEffect(() => {
    if (contractAddress && walletAddress) {
      fetchTokenInfo();
    }
  }, [contractAddress, walletAddress]);

  useEffect(() => {
    if (tokenInfo?.priceData?.id) {
      fetchChartData(selectedTimeframe);
    }
  }, [tokenInfo, selectedTimeframe]);

  const fetchTokenInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/tokens/${contractAddress}?walletAddress=${walletAddress}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setTokenInfo(data.tokenInfo);
      } else {
        console.error("Failed to fetch token info");
      }
    } catch (error) {
      console.error("Error fetching token info:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (days: number) => {
    if (!tokenInfo?.priceData?.id) return;

    try {
      setChartLoading(true);
      const response = await fetch(
        `/api/tokens/chart?tokenId=${tokenInfo.priceData.id}&days=${days}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setChartData(data.chartData);
      } else {
        console.error("Failed to fetch chart data");
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setChartLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getTokenIcon = (symbol: string) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
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
    return colors[symbol] || "bg-gray-500";
  };

  const getTokenLetter = (symbol: string) => {
    const letters: Record<string, string> = {
      ETH: "Ξ",
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
    return letters[symbol] || symbol.charAt(0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatLargeNumber = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // Generate SVG path for chart
  const generateChartPath = (
    prices: Array<{ price: number }>,
    width = 800,
    height = 200
  ): string => {
    if (!prices || prices.length === 0) return "";

    const minPrice = Math.min(...prices.map((p) => p.price));
    const maxPrice = Math.max(...prices.map((p) => p.price));
    const priceRange = maxPrice - minPrice || 1;

    const points = prices.map((point, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((point.price - minPrice) / priceRange) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Token not found</h2>
          <button
            onClick={() => router.back()}
            className="text-[#E2AF19] hover:opacity-80"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const tokenBalance = parseFloat(tokenInfo.balance);
  const tokenValue = tokenBalance * (tokenInfo.priceData?.current_price || 0);

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            📊 TOKEN INFORMATION
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "6px 6px lg:8px 8px",
                }}
              ></div>
            </div>
            <span className="text-white text-xs sm:text-sm font-satoshi mr-2 min-w-0 truncate">
              {activeWallet?.name || "Wallet"}
            </span>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : "Loading..."}
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {/* Token Header */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.back()}
              className="mr-3 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            {tokenInfo.priceData?.image ? (
              <img
                src={tokenInfo.priceData.image}
                alt={tokenInfo.symbol}
                className="w-10 h-10 rounded-full mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={`w-10 h-10 ${getTokenIcon(
                tokenInfo.symbol
              )} rounded-full mr-3 flex items-center justify-center ${
                tokenInfo.priceData?.image ? "hidden" : ""
              }`}
            >
              <span className="text-white text-lg font-bold">
                {getTokenLetter(tokenInfo.symbol)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mayeka">
                {tokenInfo.name}
              </h2>
              <p className="text-gray-400 text-sm font-satoshi">
                {tokenInfo.symbol}
              </p>
            </div>
          </div>

          {/* Basic Token Info */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm font-satoshi">
                Token Name:
              </span>
              <span className="text-white font-satoshi">{tokenInfo.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm font-satoshi">
                Token Symbol:
              </span>
              <span className="text-white font-satoshi">
                {tokenInfo.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm font-satoshi">
                Contract Address:
              </span>
              <div className="flex items-center">
                <span className="text-white font-satoshi text-sm mr-2">
                  {tokenInfo.contractAddress === "native"
                    ? "Native Token"
                    : `${tokenInfo.contractAddress.slice(
                        0,
                        8
                      )}...${tokenInfo.contractAddress.slice(-6)}`}
                </span>
                {tokenInfo.contractAddress !== "native" && (
                  <button
                    onClick={() =>
                      copyToClipboard(tokenInfo.contractAddress, "contract")
                    }
                    className="hover:text-white transition-colors"
                  >
                    <Copy size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm font-satoshi">
                Your Holdings:
              </span>
              <span className="text-white font-satoshi">
                {tokenBalance.toFixed(6)} {tokenInfo.symbol}
              </span>
            </div>
          </div>

          {/* Price Information */}
          {tokenInfo.priceData && (
            <div className="mb-4">
              <div className="text-2xl sm:text-3xl font-bold text-white font-satoshi mb-2">
                {formatCurrency(tokenInfo.priceData.current_price)}
              </div>
              <div className="flex items-center">
                {tokenInfo.priceData.price_change_percentage_24h >= 0 ? (
                  <TrendingUp size={16} className="text-green-400 mr-1" />
                ) : (
                  <TrendingDown size={16} className="text-red-400 mr-1" />
                )}
                <span
                  className={`text-sm font-satoshi ${
                    tokenInfo.priceData.price_change_percentage_24h >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatPercentage(
                    tokenInfo.priceData.price_change_percentage_24h
                  )}{" "}
                  (24h)
                </span>
              </div>
              <div className="text-gray-400 text-sm font-satoshi mt-1">
                Market Cap: {formatLargeNumber(tokenInfo.priceData.market_cap)}
              </div>
              <div className="text-gray-400 text-sm font-satoshi">
                24h Volume:{" "}
                {formatLargeNumber(tokenInfo.priceData.total_volume)}
              </div>
            </div>
          )}

          {/* Official Links - Mobile */}
          {tokenInfo.priceData && (
            <div className="flex flex-wrap gap-2">
              {tokenInfo.priceData.homepage && (
                <a
                  href={tokenInfo.priceData.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm flex items-center"
                >
                  <Globe size={14} className="mr-1" />
                  Website
                </a>
              )}
              {tokenInfo.priceData.whitepaper && (
                <a
                  href={tokenInfo.priceData.whitepaper}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm flex items-center"
                >
                  <FileText size={14} className="mr-1" />
                  Docs
                </a>
              )}
              {tokenInfo.priceData.blockchain_site && (
                <a
                  href={tokenInfo.priceData.blockchain_site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm flex items-center"
                >
                  <ExternalLink size={14} className="mr-1" />
                  Explorer
                </a>
              )}
            </div>
          )}
        </div>

        {/* Price Chart - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white font-satoshi">
              📈 Price Chart
            </h3>
            <button
              onClick={() => fetchChartData(selectedTimeframe)}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={chartLoading}
            >
              <RefreshCw
                size={16}
                className={chartLoading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex space-x-2 mb-4">
            {[1, 7, 30].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedTimeframe(days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-satoshi transition-colors ${
                  selectedTimeframe === days
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "bg-[#2C2C2C] text-gray-400 hover:text-white"
                }`}
              >
                {days === 1 ? "24h" : `${days}d`}
              </button>
            ))}
          </div>

          {/* Chart Display */}
          {chartLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
            </div>
          ) : chartData && chartData.prices.length > 0 ? (
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 400 150">
                <defs>
                  <linearGradient
                    id="priceGradientMobile"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      stopColor={
                        tokenInfo.priceData?.price_change_percentage_24h >= 0
                          ? "rgba(34, 197, 94, 0.3)"
                          : "rgba(239, 68, 68, 0.3)"
                      }
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        tokenInfo.priceData?.price_change_percentage_24h >= 0
                          ? "rgba(34, 197, 94, 0.0)"
                          : "rgba(239, 68, 68, 0.0)"
                      }
                    />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 37.5, 75, 112.5, 150].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="400"
                    y2={y}
                    stroke="#2C2C2C"
                    strokeWidth="1"
                  />
                ))}

                {/* Price line */}
                <path
                  d={generateChartPath(chartData.prices, 400, 150)}
                  fill="url(#priceGradientMobile)"
                  stroke={
                    tokenInfo.priceData?.price_change_percentage_24h >= 0
                      ? "#22C55E"
                      : "#EF4444"
                  }
                  strokeWidth="2"
                />
              </svg>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-gray-400 font-satoshi">
                No chart data available
              </p>
            </div>
          )}

          {/* Price History Table */}
          {chartData && chartData.prices.length > 0 && (
            <div className="mt-4">
              <h4 className="text-white font-semibold mb-2 font-satoshi">
                📊 Price History (Last {selectedTimeframe} day
                {selectedTimeframe > 1 ? "s" : ""}):
              </h4>
              <div className="max-h-32 overflow-y-auto">
                {chartData.prices
                  .filter(
                    (_, index) =>
                      index %
                        Math.max(1, Math.floor(chartData.prices.length / 8)) ===
                      0
                  )
                  .slice(-8)
                  .map((point, index) => (
                    <div key={index} className="flex justify-between py-1">
                      <span className="text-gray-400 text-sm font-satoshi">
                        {point.date}:
                      </span>
                      <span className="text-white text-sm font-satoshi">
                        {formatCurrency(point.price)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Section - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {tokenInfo.priceData?.image ? (
                <img
                  src={tokenInfo.priceData.image}
                  alt={tokenInfo.symbol}
                  className="w-8 h-8 rounded-full mr-3"
                />
              ) : (
                <div
                  className={`w-8 h-8 ${getTokenIcon(
                    tokenInfo.symbol
                  )} rounded-full mr-3 flex items-center justify-center`}
                >
                  <span className="text-white text-sm font-bold">
                    {getTokenLetter(tokenInfo.symbol)}
                  </span>
                </div>
              )}
              <span className="text-white font-semibold font-satoshi">
                Portfolio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-satoshi">
                {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
              </span>
              <button
                onClick={() => copyToClipboard(walletAddress!, "wallet")}
                className="hover:text-white transition-colors"
              >
                <Copy size={14} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-white mb-1 font-satoshi">
                {formatCurrency(tokenValue)}
              </div>
              <div
                className={`text-sm font-satoshi ${
                  tokenInfo.priceData?.price_change_percentage_24h >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {tokenInfo.priceData
                  ? formatPercentage(
                      tokenInfo.priceData.price_change_percentage_24h
                    )
                  : "N/A"}
                <span className="text-gray-400 ml-1">
                  ({tokenBalance.toFixed(6)} {tokenInfo.symbol})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setTransferModalOpen(true)}
              className="flex-1 bg-[#E2AF19] text-black font-semibold py-3 rounded-xl hover:bg-[#D4A853] transition-colors font-satoshi"
            >
              Send {tokenInfo.symbol}
            </button>
            <button className="bg-[#4B3A08] text-[#E2AF19] p-3 rounded-xl hover:bg-[#5A4509] transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* About Token - Mobile */}
        {tokenInfo.priceData?.description && (
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              📝 About {tokenInfo.name}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed font-satoshi">
              {tokenInfo.priceData.description.length > 300
                ? `${tokenInfo.priceData.description.substring(0, 300)}...`
                : tokenInfo.priceData.description}
            </p>
          </div>
        )}

        {/* Official Links Section - Mobile */}
        {tokenInfo.priceData && (
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              🔗 Official Links
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {tokenInfo.priceData.homepage && (
                <a
                  href={tokenInfo.priceData.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#0F0F0F] text-white px-3 py-3 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm"
                >
                  <Globe size={16} className="mr-2" />
                  Website
                </a>
              )}
              {tokenInfo.priceData.twitter_screen_name && (
                <a
                  href={`https://twitter.com/${tokenInfo.priceData.twitter_screen_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#0F0F0F] text-white px-3 py-3 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm"
                >
                  <Twitter size={16} className="mr-2" />
                  Twitter
                </a>
              )}
              {tokenInfo.priceData.telegram_channel && (
                <a
                  href={`https://t.me/${tokenInfo.priceData.telegram_channel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#0F0F0F] text-white px-3 py-3 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm"
                >
                  <MessageCircle size={16} className="mr-2" />
                  Telegram
                </a>
              )}
              {tokenInfo.priceData.blockchain_site && (
                <a
                  href={tokenInfo.priceData.blockchain_site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#0F0F0F] text-white px-3 py-3 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Explorer
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout - Similar structure but horizontal */}
      <div className="hidden xl:flex gap-6 flex-1 min-h-0">
        {/* Left Column - Main Info */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 max-h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
            {/* Token Header and Chart - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-shrink-0">
              {/* Back Button and Token Info */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex flex-col">
                  <div className="flex items-center mb-4">
                    <button
                      onClick={() => router.back()}
                      className="mr-4 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                    >
                      <ArrowLeft size={20} className="text-white" />
                    </button>
                    {tokenInfo.priceData?.image ? (
                      <img
                        src={tokenInfo.priceData.image}
                        alt={tokenInfo.symbol}
                        className="w-12 h-12 rounded-full mr-4"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 ${getTokenIcon(
                          tokenInfo.symbol
                        )} rounded-full mr-4 flex items-center justify-center`}
                      >
                        <span className="text-white text-xl font-bold">
                          {getTokenLetter(tokenInfo.symbol)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-white font-mayeka">
                        {tokenInfo.name}
                      </h2>
                      <p className="text-gray-400 font-satoshi">
                        {tokenInfo.symbol}
                      </p>
                    </div>
                  </div>

                  {/* Price Information */}
                  {tokenInfo.priceData && (
                    <div className="flex items-center space-x-6">
                      <div className="text-4xl font-bold text-white font-satoshi">
                        {formatCurrency(tokenInfo.priceData.current_price)}
                      </div>
                      <div
                        className={`text-lg font-satoshi flex items-center ${
                          tokenInfo.priceData.price_change_percentage_24h >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {tokenInfo.priceData.price_change_percentage_24h >= 0
                          ? "▲"
                          : "▼"}{" "}
                        {formatPercentage(
                          tokenInfo.priceData.price_change_percentage_24h
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contract Address */}
                <div className="text-right">
                  <div className="text-white text-sm font-satoshi mb-1">
                    Contract Address
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm font-satoshi">
                      {tokenInfo.contractAddress === "native"
                        ? "Native Token"
                        : `${tokenInfo.contractAddress.slice(
                            0,
                            10
                          )}...${tokenInfo.contractAddress.slice(-8)}`}
                    </span>
                    {tokenInfo.contractAddress !== "native" && (
                      <button
                        onClick={() =>
                          copyToClipboard(tokenInfo.contractAddress, "contract")
                        }
                        className="hover:text-white transition-colors"
                      >
                        <Copy size={16} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Chart Section - Desktop */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white font-satoshi">
                    📈 Price Chart
                  </h3>
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-2">
                      {[1, 7, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => setSelectedTimeframe(days)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-satoshi transition-colors ${
                            selectedTimeframe === days
                              ? "bg-[#E2AF19] text-black font-medium"
                              : "bg-[#2C2C2C] text-gray-400 hover:text-white"
                          }`}
                        >
                          {days === 1 ? "24h" : `${days}d`}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => fetchChartData(selectedTimeframe)}
                      className="text-gray-400 hover:text-white transition-colors"
                      disabled={chartLoading}
                    >
                      <RefreshCw
                        size={16}
                        className={chartLoading ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                </div>

                {/* Chart Display - Desktop */}
                {chartLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19]"></div>
                  </div>
                ) : chartData && chartData.prices.length > 0 ? (
                  <div className="relative h-64 mb-6">
                    <svg className="w-full h-full" viewBox="0 0 800 200">
                      <defs>
                        <linearGradient
                          id="priceGradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor={
                              tokenInfo.priceData
                                ?.price_change_percentage_24h >= 0
                                ? "rgba(34, 197, 94, 0.3)"
                                : "rgba(239, 68, 68, 0.3)"
                            }
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              tokenInfo.priceData
                                ?.price_change_percentage_24h >= 0
                                ? "rgba(34, 197, 94, 0.0)"
                                : "rgba(239, 68, 68, 0.0)"
                            }
                          />
                        </linearGradient>
                      </defs>

                      {/* Grid lines */}
                      {[0, 50, 100, 150, 200].map((y) => (
                        <line
                          key={y}
                          x1="0"
                          y1={y}
                          x2="800"
                          y2={y}
                          stroke="#2C2C2C"
                          strokeWidth="1"
                        />
                      ))}

                      {/* Price line */}
                      <path
                        d={generateChartPath(chartData.prices, 800, 200)}
                        fill="url(#priceGradient)"
                        stroke={
                          tokenInfo.priceData?.price_change_percentage_24h >= 0
                            ? "#22C55E"
                            : "#EF4444"
                        }
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-400 font-satoshi">
                      No chart data available
                    </p>
                  </div>
                )}

                {/* Market Stats - Desktop */}
                {tokenInfo.priceData && (
                  <div className="flex items-center justify-between w-full text-sm my-6">
                    <div className="bg-[#2C2C2C] px-4 py-3 rounded-full">
                      <span className="text-white font-satoshi">
                        YOUR HOLDINGS
                      </span>
                      <span className="text-gray-400 ml-2 font-satoshi">
                        {tokenBalance.toFixed(6)} {tokenInfo.symbol}
                      </span>
                    </div>
                    <div className="bg-[#2C2C2C] px-4 py-3 rounded-full">
                      <span className="text-white font-satoshi">
                        MARKET CAP
                      </span>
                      <span className="text-gray-400 ml-2 font-satoshi">
                        {formatLargeNumber(tokenInfo.priceData.market_cap)}
                      </span>
                    </div>
                    <div className="bg-[#2C2C2C] px-4 py-3 rounded-full">
                      <span className="text-white font-satoshi">
                        24H VOLUME
                      </span>
                      <span className="text-gray-400 ml-2 font-satoshi">
                        {formatLargeNumber(tokenInfo.priceData.total_volume)}
                      </span>
                    </div>
                    <div className="bg-[#2C2C2C] px-4 py-3 rounded-full">
                      <span className="text-white font-satoshi">
                        CURRENT PRICE
                      </span>
                      <span className="text-gray-400 ml-2 font-satoshi">
                        {formatCurrency(tokenInfo.priceData.current_price)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* About Token and Links - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-shrink-0">
              {/* Official Links at Top */}
              {tokenInfo.priceData && (
                <div className="flex items-center space-x-4 mb-6">
                  {tokenInfo.priceData.homepage && (
                    <a
                      href={tokenInfo.priceData.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center"
                    >
                      <Globe size={16} className="mr-2" />
                      Website
                    </a>
                  )}
                  {tokenInfo.priceData.whitepaper && (
                    <a
                      href={tokenInfo.priceData.whitepaper}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center"
                    >
                      <FileText size={16} className="mr-2" />
                      Whitepaper
                    </a>
                  )}
                  {tokenInfo.priceData.twitter_screen_name && (
                    <a
                      href={`https://twitter.com/${tokenInfo.priceData.twitter_screen_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center"
                    >
                      <Twitter size={16} className="mr-2" />
                      Twitter
                    </a>
                  )}
                  {tokenInfo.priceData.telegram_channel && (
                    <a
                      href={`https://t.me/${tokenInfo.priceData.telegram_channel}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center"
                    >
                      <MessageCircle size={16} className="mr-2" />
                      Telegram
                    </a>
                  )}
                  {tokenInfo.priceData.blockchain_site && (
                    <a
                      href={tokenInfo.priceData.blockchain_site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      Explorer
                    </a>
                  )}
                </div>
              )}

              {/* About Section */}
              <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
                📝 About {tokenInfo.name}
              </h3>
              {tokenInfo.priceData?.description ? (
                <p className="text-gray-400 text-sm leading-relaxed font-satoshi">
                  {tokenInfo.priceData.description}
                </p>
              ) : (
                <p className="text-gray-400 text-sm leading-relaxed font-satoshi">
                  {tokenInfo.symbol === "ETH" ? (
                    <>
                      Ethereum is a global, open-source platform for
                      decentralized applications. In other words, the vision is
                      to create a world computer that anyone can build
                      applications in a decentralized manner; while all states
                      and data are distributed and publicly accessible.
                    </>
                  ) : (
                    <>
                      {tokenInfo.name} is a cryptocurrency token that provides
                      various utilities and features within its ecosystem. It
                      enables users to participate in the network's governance,
                      facilitate transactions, and access various decentralized
                      applications and services.
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Portfolio */}
        <div className="w-[400px] flex-shrink-0 h-full">
          <div className="bg-black rounded-[20px] border border-[#2C2C2C] h-full flex flex-col p-6">
            {/* Portfolio Header */}
            <div className="flex items-center mb-6">
              <div className="flex items-center">
                {tokenInfo.priceData?.image ? (
                  <img
                    src={tokenInfo.priceData.image}
                    alt={tokenInfo.symbol}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 ${getTokenIcon(
                      tokenInfo.symbol
                    )} rounded-full mr-3 flex items-center justify-center`}
                  >
                    <span className="text-white text-sm font-bold">
                      {getTokenLetter(tokenInfo.symbol)}
                    </span>
                  </div>
                )}
                <span className="text-white font-semibold font-satoshi">
                  Portfolio
                </span>
              </div>
            </div>

            {/* Portfolio Value */}
            <div className="bg-[#000000] rounded-[16px] border border-[#2C2C2C] p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-white text-sm font-satoshi">
                  {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                </div>
                <button
                  onClick={() => copyToClipboard(walletAddress!, "wallet")}
                  className="hover:text-white transition-colors"
                >
                  <Copy size={16} className="text-gray-400" />
                </button>
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold text-white mb-1 font-satoshi">
                  {formatCurrency(tokenValue)}
                </div>
                <div
                  className={`text-sm font-satoshi ${
                    tokenInfo.priceData?.price_change_percentage_24h >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {tokenInfo.priceData
                    ? formatPercentage(
                        tokenInfo.priceData.price_change_percentage_24h
                      )
                    : "N/A"}
                  <span className="text-gray-400 ml-1">
                    ({tokenBalance.toFixed(6)} {tokenInfo.symbol})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setTransferModalOpen(true)}
                  className="flex-1 bg-[#E2AF19] text-black font-semibold py-3 rounded-xl hover:bg-[#D4A853] transition-colors font-satoshi"
                >
                  Send {tokenInfo.symbol}
                </button>
                <button className="bg-[#4B3A08] text-[#E2AF19] p-3 rounded-xl hover:bg-[#5A4509] transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Price History Table - Desktop */}
            {chartData && chartData.prices.length > 0 && (
              <div className="flex-1 min-h-0 flex flex-col">
                <h3 className="text-lg font-semibold text-white font-satoshi mb-4 flex-shrink-0">
                  📊 Price History
                </h3>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                  {chartData.prices
                    .filter(
                      (_, index) =>
                        index %
                          Math.max(
                            1,
                            Math.floor(chartData.prices.length / 12)
                          ) ===
                        0
                    )
                    .slice(-12)
                    .map((point, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors flex-shrink-0"
                      >
                        <div className="min-w-0">
                          <div className="text-white font-medium text-sm font-satoshi">
                            {point.date}
                          </div>
                          <div className="text-gray-400 text-xs font-satoshi">
                            {point.time}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-white font-medium text-sm font-satoshi">
                            {formatCurrency(point.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SimpleTransfer Modal */}
      {tokenInfo && (
        <SimpleTransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          tokenInfo={{
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            contractAddress: tokenInfo.contractAddress,
            decimals: tokenInfo.decimals,
            balance: tokenInfo.balance,
            priceData: tokenInfo.priceData || undefined,
          }}
          walletAddress={walletAddress || ""}
        />
      )}

      <style>{`
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
