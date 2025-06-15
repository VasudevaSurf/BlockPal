"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
} from "lucide-react";
import { RootState } from "@/store";

export default function TokenOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const { tokens } = useSelector((state: RootState) => state.wallet);
  const [currentToken, setCurrentToken] = useState<any>(null);

  useEffect(() => {
    if (params.tokenId) {
      const token = tokens.find((t) => t.id === params.tokenId);
      setCurrentToken(token);
    }
  }, [params.tokenId, tokens]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Address copied to clipboard");
    } catch (err) {
      console.error("Failed to copy: ", err);
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
    };
    return letters[symbol] || symbol.charAt(0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // Sample transactions
  const transactions = [
    {
      type: "Send",
      amount: `-0.01 ${currentToken?.symbol}`,
      value: "$300",
      date: "4/20/2025",
    },
    {
      type: "Receive",
      amount: `+0.0096 ${currentToken?.symbol}`,
      value: "$300",
      date: "4/20/2025",
    },
    {
      type: "Send",
      amount: `-0.01 ${currentToken?.symbol}`,
      value: "$300",
      date: "4/20/2025",
    },
    {
      type: "Receive",
      amount: `+0.0096 ${currentToken?.symbol}`,
      value: "$300",
      date: "4/20/2025",
    },
    {
      type: "Send",
      amount: `-0.01 ${currentToken?.symbol}`,
      value: "$300",
      date: "4/20/2025",
    },
    {
      type: "Receive",
      amount: `+0.0096 ${currentToken?.symbol}`,
      value: "$300",
      date: "4/20/2025",
    },
  ];

  if (!currentToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Token Overview
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
              Wallet 1
            </span>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              0xAD7a4hw64...R8J6153
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
            <div
              className={`w-10 h-10 ${getTokenIcon(
                currentToken.symbol
              )} rounded-full mr-3 flex items-center justify-center`}
            >
              <span className="text-white text-lg font-bold">
                {getTokenLetter(currentToken.symbol)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mayeka">
                {currentToken.name}
              </h2>
            </div>
          </div>

          {/* Price Information */}
          <div className="mb-4">
            <div className="text-2xl sm:text-3xl font-bold text-white font-satoshi mb-2">
              {formatCurrency(currentToken.price)}
            </div>
            <div className="flex items-center">
              {currentToken.change24h >= 0 ? (
                <TrendingUp size={16} className="text-green-400 mr-1" />
              ) : (
                <TrendingDown size={16} className="text-red-400 mr-1" />
              )}
              <span
                className={`text-sm font-satoshi ${
                  currentToken.change24h >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {formatPercentage(currentToken.change24h)}
              </span>
            </div>
          </div>

          {/* Contract Address */}
          <div className="mb-4">
            <div className="text-gray-400 text-sm font-satoshi mb-1">
              Contract Address
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-satoshi">
                0x9e7D4hw64...SrAY95EW
              </span>
              <button
                onClick={() => copyToClipboard("0x9e7D4hw64SrAY95EW")}
                className="hover:text-white transition-colors"
              >
                <Copy size={14} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm flex items-center">
              <ExternalLink size={14} className="mr-1" />
              WEBSITE
            </button>
            <button className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm flex items-center">
              <FileText size={14} className="mr-1" />
              DOCS
            </button>
            <button className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi text-sm flex items-center">
              <ExternalLink size={14} className="mr-1" />
              EXPLORER
            </button>
          </div>
        </div>

        {/* Chart Area - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Price Chart
          </h3>
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
                      currentToken.change24h >= 0
                        ? "rgba(34, 197, 94, 0.3)"
                        : "rgba(239, 68, 68, 0.3)"
                    }
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      currentToken.change24h >= 0
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
                d={
                  currentToken.change24h >= 0
                    ? "M 0 135 Q 50 120 100 105 T 200 90 T 300 75 T 400 60"
                    : "M 0 90 Q 50 105 100 120 T 200 127 T 300 131 T 400 135"
                }
                fill="url(#priceGradientMobile)"
                stroke={currentToken.change24h >= 0 ? "#22C55E" : "#EF4444"}
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Chart Info - Mobile */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-[#2C2C2C] px-3 py-2 rounded-lg">
              <span className="text-white font-satoshi text-xs">
                MARKET CAP
              </span>
              <div className="text-gray-400 text-xs font-satoshi">$338.17B</div>
            </div>
            <div className="bg-[#2C2C2C] px-3 py-2 rounded-lg">
              <span className="text-white font-satoshi text-xs">
                24H VOLUME
              </span>
              <div className="text-gray-400 text-xs font-satoshi">$338.17B</div>
            </div>
          </div>
        </div>

        {/* Portfolio Section - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 ${getTokenIcon(
                  currentToken.symbol
                )} rounded-full mr-3 flex items-center justify-center`}
              >
                <span className="text-white text-sm font-bold">
                  {getTokenLetter(currentToken.symbol)}
                </span>
              </div>
              <span className="text-white font-semibold font-satoshi">
                Portfolio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-satoshi">
                0xAD7a4hw64...R8J6153
              </span>
              <button
                onClick={() => copyToClipboard("0xAD7a4hw64R8J6153")}
                className="hover:text-white transition-colors"
              >
                <Copy size={14} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-white mb-1 font-satoshi">
                {formatCurrency(currentToken.value)}
              </div>
              <div
                className={`text-sm font-satoshi ${
                  currentToken.change24h >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {formatPercentage(currentToken.change24h)} (65.72%)
              </div>
            </div>
            {currentToken.symbol === "ETH" && (
              <img
                src="/currencyMain.png"
                alt="Currency"
                className="w-12 h-12"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button className="flex-1 bg-[#E2AF19] text-black font-semibold py-3 rounded-xl hover:bg-[#D4A853] transition-colors font-satoshi">
              Swap
            </button>
            <button className="bg-[#4B3A08] text-[#E2AF19] p-3 rounded-xl hover:bg-[#5A4509] transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* About Token - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
            About {currentToken.name}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed font-satoshi">
            {currentToken.symbol === "ETH" ? (
              <>
                Ethereum is a global, open-source platform for decentralized
                applications. In other words, the vision is to create a world
                computer that anyone can build applications in a decentralized
                manner; while all states and data are distributed and publicly
                accessible.
              </>
            ) : (
              <>
                {currentToken.name} is a cryptocurrency token that provides
                various utilities and features within its ecosystem. It enables
                users to participate in the network's governance, facilitate
                transactions, and access various decentralized applications and
                services.
              </>
            )}
          </p>
        </div>

        {/* Transaction History - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Recent Transactions
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
            {transactions.slice(0, 6).map((tx, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C]"
              >
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center ${
                      tx.type === "Send" ? "bg-red-500" : "bg-green-500"
                    }`}
                  >
                    <span className="text-white text-sm">
                      {tx.type === "Send" ? "↗" : "↙"}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm font-satoshi">
                      {tx.type}
                    </div>
                    <div className="text-gray-400 text-xs font-satoshi">
                      {tx.date}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-medium font-satoshi ${
                      tx.type === "Send" ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {tx.amount}
                  </div>
                  <div className="text-gray-400 text-xs font-satoshi">
                    {tx.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex gap-6 flex-1 min-h-0">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 max-h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
            {/* Combined Token Info and Price Chart */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-shrink-0">
              {/* Token Header with Back Button */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex flex-col">
                  <div className="flex items-center mb-4">
                    <button
                      onClick={() => router.back()}
                      className="mr-4 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                    >
                      <ArrowLeft size={20} className="text-white" />
                    </button>
                    <div
                      className={`w-10 h-10 ${getTokenIcon(
                        currentToken.symbol
                      )} rounded-full mr-4 flex items-center justify-center`}
                    >
                      <span className="text-white text-lg font-bold">
                        {getTokenLetter(currentToken.symbol)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white font-mayeka">
                        {currentToken.name}
                      </h2>
                    </div>
                  </div>

                  {/* Price Information */}
                  <div className="flex items-center space-x-6">
                    <div className="text-4xl font-bold text-white font-satoshi">
                      {formatCurrency(currentToken.price)}
                    </div>
                    <div
                      className={`text-lg font-satoshi ${
                        currentToken.change24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {currentToken.change24h >= 0 ? "▲" : "▼"}{" "}
                      {formatPercentage(currentToken.change24h)}
                    </div>
                  </div>
                </div>

                {/* Token Contract Address Section */}
                <div className="text-right">
                  <div className="text-white text-sm font-satoshi mb-1">
                    Token Contract Address
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm font-satoshi">
                      0x9e7D4hw64...SrAY95EW
                    </span>
                    <button
                      onClick={() => copyToClipboard("0x9e7D4hw64SrAY95EW")}
                      className="hover:text-white transition-colors"
                    >
                      <Copy size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="relative h-64 mb-8">
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
                          currentToken.change24h >= 0
                            ? "rgba(34, 197, 94, 0.3)"
                            : "rgba(239, 68, 68, 0.3)"
                        }
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          currentToken.change24h >= 0
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
                    d={
                      currentToken.change24h >= 0
                        ? "M 0 180 Q 100 160 200 140 T 400 120 T 600 100 T 800 80"
                        : "M 0 120 Q 100 140 200 160 T 400 170 T 600 175 T 800 180"
                    }
                    fill="url(#priceGradient)"
                    stroke={currentToken.change24h >= 0 ? "#22C55E" : "#EF4444"}
                    strokeWidth="2"
                  />

                  <path
                    d={
                      currentToken.change24h >= 0
                        ? "M 0 180 Q 100 160 200 140 T 400 120 T 600 100 T 800 80"
                        : "M 0 120 Q 100 140 200 160 T 400 170 T 600 175 T 800 180"
                    }
                    fill="none"
                    stroke={currentToken.change24h >= 0 ? "#22C55E" : "#EF4444"}
                    strokeWidth="3"
                  />
                </svg>
              </div>

              {/* Chart Info */}
              <div className="flex items-center justify-between w-full text-sm my-6">
                <div className="bg-[#2C2C2C] px-3 py-2 rounded-full">
                  <span className="text-white font-satoshi">FDV</span>
                  <span className="text-gray-400 ml-2 font-satoshi">
                    $301.2B
                  </span>
                </div>
                <div className="bg-[#2C2C2C] px-3 py-2 rounded-full">
                  <span className="text-white font-satoshi">MARKET CAP</span>
                  <span className="text-gray-400 ml-2 font-satoshi">
                    $338.17B
                  </span>
                </div>
                <div className="bg-[#2C2C2C] px-3 py-2 rounded-full">
                  <span className="text-white font-satoshi">24H VOLUME</span>
                  <span className="text-gray-400 ml-2 font-satoshi">
                    $338.17B
                  </span>
                </div>
                <div className="bg-[#2C2C2C] px-3 py-2 rounded-full">
                  <button className="flex items-center text-white hover:text-gray-300 font-satoshi">
                    <span className="mr-1">EXPLORER</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* About Token */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-shrink-0">
              {/* Action Buttons at Top */}
              <div className="flex items-center space-x-4 mb-6">
                <button className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi">
                  <ExternalLink size={16} className="inline mr-2" />
                  WEBSITE
                </button>
                <button className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi">
                  <FileText size={16} className="inline mr-2" />
                  WHITEPAPER
                </button>
                <button className="bg-[#0F0F0F] text-white px-4 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi">
                  <FileText size={16} className="inline mr-2" />
                  0xAD7a4hw64...R8J6153
                </button>
                <button
                  onClick={() => copyToClipboard("0xAD7a4hw64R8J6153")}
                  className="hover:text-white transition-colors"
                >
                  <Copy size={16} className="text-gray-400" />
                </button>
                <div className="flex space-x-2">
                  <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                  <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
                About {currentToken.name}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed font-satoshi">
                {currentToken.symbol === "ETH" ? (
                  <>
                    Ethereum is a global, open-source platform for decentralized
                    applications. In other words, the vision is to create a
                    world computer that anyone can build applications in a
                    decentralized manner; while all states and data are
                    distributed and publicly accessible. Ethereum supports smart
                    contracts in which developers can write code in order to
                    program digital value. Examples of decentralized apps
                    (dapps) that are built on Ethereum includes tokens,
                    non-fungible tokens, decentralized finance apps, lending
                    protocol, decentralized exchanges, and much more.
                  </>
                ) : (
                  <>
                    {currentToken.name} is a cryptocurrency token that provides
                    various utilities and features within its ecosystem. It
                    enables users to participate in the network's governance,
                    facilitate transactions, and access various decentralized
                    applications and services. The token plays a crucial role in
                    maintaining the network's security and incentivizing
                    participation from users and validators.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Portfolio */}
        <div className="w-[400px] flex-shrink-0 h-full">
          <div className="bg-black rounded-[20px] border border-[#2C2C2C] h-full flex flex-col p-6">
            {/* Portfolio Header */}
            <div className="flex items-center mb-6">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 ${getTokenIcon(
                    currentToken.symbol
                  )} rounded-full mr-3 flex items-center justify-center`}
                >
                  <span className="text-white text-sm font-bold">
                    {getTokenLetter(currentToken.symbol)}
                  </span>
                </div>
                <span className="text-white font-semibold font-satoshi">
                  Portfolio
                </span>
              </div>
            </div>

            {/* Portfolio Token Info Box */}
            <div className="bg-[#000000] rounded-[16px] border border-[#2C2C2C] p-4 mb-6">
              {/* Token ID and Copy */}
              <div className="flex items-center gap-2 mb-4">
                <div className="text-white text-sm font-satoshi">
                  0xAD7a4hw64...R8J6153
                </div>
                <button
                  onClick={() => copyToClipboard("0xAD7a4hw64R8J6153")}
                  className="hover:text-white transition-colors"
                >
                  <Copy size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Currency Icon and Portfolio Value */}
              <div className="mb-4">
                <div className="flex items-start">
                  {currentToken.symbol === "ETH" && (
                    <img
                      src="/currencyMain.png"
                      alt="Currency"
                      className="w-14.5 h-14.5 mr-3 flex-shrink-0"
                    />
                  )}
                  <div className="flex flex-col">
                    <div className="text-3xl font-bold text-white mb-1 font-satoshi">
                      {formatCurrency(currentToken.value)}
                    </div>
                    <div
                      className={`text-sm font-satoshi ${
                        currentToken.change24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatPercentage(currentToken.change24h)} (65.72%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 bg-[#E2AF19] text-black font-semibold py-3 rounded-xl hover:bg-[#D4A853] transition-colors font-satoshi">
                  Swap
                </button>
                <button className="bg-[#4B3A08] text-[#E2AF19] p-3 rounded-xl hover:bg-[#5A4509] transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#2C2C2C] mb-6"></div>

            {/* Transaction History */}
            <div className="flex-1 min-h-0 flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4 font-satoshi flex-shrink-0">
                Transaction History
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                {transactions.map((tx, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 hover:bg-[#1A1A1A] rounded-lg transition-colors flex-shrink-0"
                  >
                    <div className="flex items-center min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center flex-shrink-0 ${
                          tx.type === "Send" ? "bg-red-500" : "bg-green-500"
                        }`}
                      >
                        <span className="text-white text-sm">
                          {tx.type === "Send" ? "↗" : "↙"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-medium text-sm font-satoshi">
                          {tx.type}
                        </div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          {tx.date}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div
                        className={`text-sm font-medium font-satoshi ${
                          tx.type === "Send" ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {tx.amount}
                      </div>
                      <div className="text-gray-400 text-xs font-satoshi">
                        {tx.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
