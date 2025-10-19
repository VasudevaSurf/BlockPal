// src/app/dashboard/tokenOverview/[chainId]/[contractAddress]/page.tsx - FIXED LAYOUT
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { coinlesService } from "@/services/coinlesService";
import {
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Twitter,
  RefreshCw,
  ArrowLeft,
  QrCode,
} from "lucide-react";
import WarningIcon from "@/components/icons/WarningIcon";
import ChartUI from "@/components/ChartUI";

export default function TokenOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const chainId = params.chainId as string;
  const contractAddress = params.contractAddress as string;
  const poolAddress = searchParams.get("pool");

  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!chainId || !contractAddress) {
      console.error("Missing chainId or contractAddress");
      setLoading(false);
      return;
    }

    console.log("Loading token with params:", {
      chainId,
      contractAddress,
      poolAddress,
    });
    loadTokenData();
  }, [chainId, contractAddress, poolAddress]);

  const loadTokenData = async () => {
    try {
      setLoading(true);
      console.log("Fetching token info from API...");

      const data = await coinlesService.getTokenInfo(
        chainId,
        contractAddress,
        poolAddress || undefined
      );

      if (data) {
        setTokenInfo(data);
        console.log("Token data loaded successfully:", data.metadata?.name);
      } else {
        console.error("No token data returned from API");
      }
    } catch (error) {
      console.error("Error loading token data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      await loadTokenData();
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getTokenIcon = (symbol: string) => {
    return "";
  };

  const formatCurrency = (value: number) => {
    if (!value || isNaN(value)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatLargeNumber = (value: number) => {
    if (!value || isNaN(value)) return "0";
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return `${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    if (typeof value !== "number" || isNaN(value)) return "+0.00%";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[14px] p-3 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div className="h-full bg-[#0000000] rounded-[12px] lg:rounded-[14px] p-3 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-white mb-1.5">
            Token not found
          </h2>
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

  const metadata = tokenInfo.metadata || {};
  const marketData = tokenInfo.marketData || {};
  const transactions = tokenInfo.transactions || {};
  const priceChangeData = marketData.priceChange || {};

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[14px] p-1.5 sm:p-2 lg:p-2.5 flex flex-col overflow-hidden">
        {/* Mobile Layout */}
        <div className="flex flex-col xl:hidden gap-2.5 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {/* Token Header */}
          <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center">
                <div
                  className={`w-7 h-7 ${getTokenIcon(
                    metadata.symbol || ""
                  )} rounded-full mr-2.5 flex items-center justify-center`}
                >
                  {metadata.logo ? (
                    <img
                      src={metadata.logo}
                      alt={metadata.symbol}
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <span className="text-white text-sm font-bold">
                      {(metadata.symbol || "?").charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-mayeka">
                    {metadata.name}
                  </h2>
                  <p className="text-gray-400 text-xs font-satoshi">
                    {metadata.symbol}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 text-white ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            {/* Price Section */}
            <div className="flex items-end justify-between">
              <div className="flex-1">
                <div className="text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
                  {formatCurrency(marketData.price || 0)}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`text-sm font-satoshi ${
                      (marketData.change24h || 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatPercentage(marketData.change24h || 0)}
                  </div>
                  <div className="text-gray-400 text-sm font-satoshi">24h</div>
                </div>
              </div>
            </div>
          </div>

          {/* New Chart Component - Mobile */}
          <div
            className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0"
            style={{ height: "400px" }}
          >
            {poolAddress ? (
              <ChartUI poolAddress={poolAddress} network={chainId} />
            ) : (
              <div className="h-full flex items-center justify-center flex-col gap-3">
                <div className="text-gray-500 text-sm text-center">
                  <p className="mb-2">📊 Chart data not available</p>
                  <p className="text-xs text-gray-600">
                    Pool address required for chart display
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Contract Address */}
          <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 font-satoshi">Contract:</span>
              <code className="text-gray-300 font-mono text-xs flex-1 truncate">
                {contractAddress}
              </code>
              <button
                onClick={() => copyToClipboard(contractAddress)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Copy size={14} />
              </button>
              {copied && (
                <span className="text-green-400 text-xs font-satoshi">✓</span>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout - FIXED */}
        <div className="hidden xl:flex gap-3 flex-1 min-h-0 max-h-full overflow-hidden">
          <div className="flex-[0_0_66%] flex flex-col gap-3 min-w-0 max-h-full">
            {/* Main Chart Section with New Chart UI */}
            <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 ${getTokenIcon(
                      metadata.symbol || ""
                    )} rounded-full mr-2 flex items-center justify-center`}
                  >
                    {metadata.logo ? (
                      <img
                        src={metadata.logo}
                        alt={metadata.symbol}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <span className="text-white text-base font-bold">
                        {(metadata.symbol || "?").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-row items-center justify-center space-x-2">
                    <h2 className="text-lg font-bold text-white font-mayeka">
                      {metadata.name}
                    </h2>
                    <p className="text-gray-400 font-satoshi mt-1 text-sm">
                      {metadata.symbol}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-white text-[10px] font-satoshi mb-0.5">
                    Contract Address
                  </div>
                  <div className="flex items-center space-x-1.5 mb-2 justify-end">
                    <span className="text-gray-400 text-[10px] font-satoshi">
                      {`${contractAddress.slice(
                        0,
                        9
                      )}...${contractAddress.slice(-7)}`}
                    </span>
                    <button
                      onClick={() => copyToClipboard(contractAddress)}
                      className="hover:text-white transition-colors"
                    >
                      <Copy size={12} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Section */}
              <div className="flex items-end justify-between mb-3 flex-shrink-0">
                <div className="flex-1">
                  <div className="flex flex-row items-center gap-[10px] text-xl lg:text-2xl font-bold text-white mb-1 font-satoshi">
                    {formatCurrency(marketData.price || 0)}
                    <div
                      className={`text-xs font-satoshi ${
                        (marketData.change24h || 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      <span className="mr-1">
                        {(marketData.change24h || 0) >= 0 ? "▲" : "▼"}
                      </span>
                      {Math.abs(marketData.change24h || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* New Chart Component - Desktop - TAKES REMAINING SPACE */}
              <div className="flex-1 min-h-0">
                {poolAddress ? (
                  <ChartUI poolAddress={poolAddress} network={chainId} />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">No chart data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Right Section */}
          <div className="w-full flex-1 max-h-full flex flex-col gap-2 overflow-hidden">
            <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex flex-col justify-between space-y-1.5 min-h-0 overflow-y-auto scrollbar-hide">
              {/* Header with token info */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`w-10 h-10 ${getTokenIcon(
                    metadata.symbol || ""
                  )} rounded-full flex items-center justify-center flex-shrink-0`}
                >
                  {metadata.logo ? (
                    <img
                      src={metadata.logo}
                      alt={metadata.symbol}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <span className="text-white text-base font-bold">
                      {(metadata.symbol || "?").charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-[19px] font-satoshi">
                    {metadata.name}
                    <span className="text-[#939393] font-bold text-sm font-satoshi">
                      /
                    </span>
                    <span className="text-[#939393] font-satoshi text-[9px]">
                      {metadata.symbol}
                    </span>
                  </h3>
                  <p className="text-gray-400 text-[10px] font-satoshi">
                    {metadata.name} price
                  </p>
                </div>
              </div>

              {/* Price and Balance */}
              <div className="mb-1 flex-shrink-0">
                <div className="flex flex-row items-center justify-start text-xl font-bold text-white mb-0.5 font-satoshi gap-1">
                  {formatCurrency(marketData.price || 0)}
                  <div
                    className={`text-xs font-satoshi ${
                      (marketData.change24h || 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    <span className="mr-1">
                      {(marketData.change24h || 0) >= 0 ? "▲" : "▼"}
                    </span>
                    {Math.abs(marketData.change24h || 0).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-1.5 mb-2 flex-shrink-0">
                {metadata.socials?.twitter && (
                  <div className="relative">
                    <div className="relative p-[1px] rounded-lg overflow-hidden">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, 
              rgba(255, 255, 255, 0.3) 0%,
              rgba(255, 255, 255, 0.1) 20%,
              rgba(226, 175, 25, 0.2) 40%,
              rgba(255, 255, 255, 0.05) 60%,
              rgba(226, 175, 25, 0.15) 80%,
              rgba(255, 255, 255, 0.2) 100%)`,
                        }}
                      />
                      <a
                        href={metadata.socials.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-7 h-7 rounded-[7px] flex items-center justify-center hover:opacity-80 transition-opacity"
                        style={{
                          background: `linear-gradient(135deg, 
              rgba(25, 25, 25, 0.85) 0%,
              rgba(40, 40, 40, 0.75) 50%,
              rgba(25, 25, 25, 0.85) 100%)`,
                          backdropFilter: "blur(1px)",
                          boxShadow: `
              inset 0 1px 2px rgba(255, 255, 255, 0.05),
              inset 0 -1px 2px rgba(0, 0, 0, 0.5),
              0 2px 8px rgba(0, 0, 0, 0.3)
            `,
                        }}
                      >
                        <Twitter size={12} className="text-white" />
                      </a>
                    </div>
                  </div>
                )}
                {metadata.websites && metadata.websites[0] && (
                  <div className="relative">
                    <div className="relative p-[1px] rounded-lg overflow-hidden">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, 
              rgba(255, 255, 255, 0.3) 0%,
              rgba(255, 255, 255, 0.1) 20%,
              rgba(226, 175, 25, 0.2) 40%,
              rgba(255, 255, 255, 0.05) 60%,
              rgba(226, 175, 25, 0.15) 80%,
              rgba(255, 255, 255, 0.2) 100%)`,
                        }}
                      />
                      <a
                        href={metadata.websites[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-7 h-7 rounded-[7px] flex items-center justify-center hover:opacity-80 transition-opacity"
                        style={{
                          background: `linear-gradient(135deg, 
              rgba(25, 25, 25, 0.85) 0%,
              rgba(40, 40, 40, 0.75) 50%,
              rgba(25, 25, 25, 0.85) 100%)`,
                          backdropFilter: "blur(1px)",
                          boxShadow: `
              inset 0 1px 2px rgba(255, 255, 255, 0.05),
              inset 0 -1px 2px rgba(0, 0, 0, 0.5),
              0 2px 8px rgba(0, 0, 0, 0.3)
            `,
                        }}
                      >
                        <Globe size={12} className="text-white" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Time Period Buttons */}
              <div className="grid grid-cols-4 gap-1.5 mb-2 flex-shrink-0">
                {[
                  { label: "5M", value: priceChangeData.m5 || 0 },
                  { label: "1H", value: priceChangeData.h1 || 0 },
                  { label: "6H", value: priceChangeData.h6 || 0 },
                  { label: "24H", value: priceChangeData.h24 || 0 },
                ].map((period) => (
                  <div
                    key={period.label}
                    className="rounded-lg border border-[#2C2C2C] p-1.5 text-center"
                  >
                    <div className="text-gray-400 text-[9px] font-satoshi mb-0.5">
                      {period.label}
                    </div>
                    <div
                      className={`text-[10px] font-semibold font-satoshi ${
                        period.value > 0
                          ? "text-green-400"
                          : period.value < 0
                          ? "text-red-400"
                          : "text-gray-400"
                      }`}
                    >
                      {formatPercentage(period.value)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats Grid */}
              <div className="rounded-lg border border-[#2C2C2C] p-2 mb-2 flex-shrink-0">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-gray-400 text-[9px] font-satoshi mb-0.5">
                      24h Vol
                    </div>
                    <div className="text-white text-xs font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.volume24h || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[9px] font-satoshi mb-0.5">
                      Liquidity
                    </div>
                    <div className="text-white text-xs font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.liquidity || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[9px] font-satoshi mb-0.5">
                      Holders
                    </div>
                    <div className="text-white text-xs font-semibold font-satoshi">
                      {formatLargeNumber(metadata.holders || 0)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-gray-400 text-[9px] font-satoshi mb-0.5">
                      Age
                    </div>
                    <div className="text-white text-xs font-semibold font-satoshi">
                      {metadata.createdAt
                        ? new Date(metadata.createdAt).toLocaleDateString()
                        : "Unknown"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[9px] font-satoshi mb-0.5">
                      FDV
                    </div>
                    <div className="text-white text-xs font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.fdv || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[9px] font-satoshi mb-0.5">
                      Market Cap
                    </div>
                    <div className="text-white text-xs font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.marketCap || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Buy/Sell Section */}
              <div className="rounded-lg border border-[#2C2C2C] p-2 flex-shrink-0">
                <div className="flex gap-2 items-center justify-center">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-green-400 text-[10px] font-satoshi">
                        BUYS
                      </span>
                      <span className="text-red-400 text-[10px] font-satoshi">
                        SELLS
                      </span>
                    </div>
                    <div className="relative h-1 bg-[#1a1a1a] rounded-full overflow-hidden mb-1.5">
                      {(() => {
                        const buys = transactions.buys24h || 0;
                        const sells = transactions.sells24h || 0;
                        const total = buys + sells || 1;
                        const buysPercent = (buys / total) * 100;
                        return (
                          <>
                            <div
                              className="absolute left-0 top-0 h-full bg-green-500 rounded-l-full"
                              style={{ width: `${buysPercent}%` }}
                            ></div>
                            <div
                              className="absolute right-0 top-0 h-full bg-red-500 rounded-r-full"
                              style={{ width: `${100 - buysPercent}%` }}
                            ></div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[9px] font-satoshi text-[#26AA5E]">
                        {transactions.buys24h || 0}
                      </div>
                      <div className="text-[9px] font-satoshi text-[#F44336]">
                        {transactions.sells24h || 0}
                      </div>
                    </div>
                  </div>

                  <div className="w-px bg-[#2C2C2C]"></div>

                  <div className="flex-1 bg-[#0F0F0F] p-2 rounded-[12px]">
                    <div className="text-center mb-1.5">
                      <div className="text-gray-400 text-[9px] font-satoshi mb-0.5">
                        24hrs Volume
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center">
                        <span className="text-gray-400 text-[10px] font-satoshi w-16">
                          TNX
                        </span>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-12 h-[1px] bg-[#fff]"></div>
                        </div>
                        <span className="text-white text-xs font-semibold font-satoshi w-16 text-right">
                          {transactions.totalTx24h || 0}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400 text-[10px] font-satoshi w-16">
                          VOL
                        </span>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-12 h-[1px] bg-[#fff]"></div>
                        </div>
                        <span className="text-white text-xs font-semibold font-satoshi w-16 text-right">
                          ${formatLargeNumber(marketData.volume24h || 0)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400 text-[10px] font-satoshi w-16">
                          NET BUYS
                        </span>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-12 h-[1px] bg-[#fff]"></div>
                        </div>
                        <span
                          className={`text-xs font-semibold font-satoshi w-16 text-right ${
                            (transactions.netBuys24h || 0) >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {(transactions.netBuys24h || 0) >= 0 ? "+" : ""}
                          {transactions.netBuys24h || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PAL Score Card */}
            <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-2.5 flex flex-col flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-base font-semibold font-mayeka whitespace-nowrap">
                  PAL Score
                </h3>
                <div className="flex-1 h-[1.5px] bg-white mx-10"></div>
                <div className="flex items-center gap-0.5">
                  <span className="text-[#F39C12] text-xl font-bold font-mayeka">
                    {Math.round(metadata.palScore || 0)}
                  </span>
                  <span className="text-[#4CAF50] text-xl font-bold font-mayeka">
                    /100
                  </span>
                </div>
              </div>

              <div className="flex gap-3 flex-1">
                {/* Left Side - Gauge */}
                <div
                  className="flex-shrink-0 bg-gradient-to-br from-[#0F0F0F] to-[#1a1a1a] rounded-2xl p-1.5 flex flex-col items-center justify-center relative overflow-hidden"
                  style={{ width: "140px" }}
                >
                  <div className="relative w-full flex flex-col items-center justify-center z-10">
                    <div className="relative mb-0.5">
                      <svg
                        width="85"
                        height="85"
                        viewBox="0 0 100 100"
                        className="absolute inset-0"
                      >
                        {[...Array(12)].map((_, i) => {
                          const angle = (i * 30 - 90) * (Math.PI / 180);
                          const x1 = 50 + 38 * Math.cos(angle);
                          const y1 = 50 + 38 * Math.sin(angle);
                          const x2 = 50 + 42 * Math.cos(angle);
                          const y2 = 50 + 42 * Math.sin(angle);
                          return (
                            <line
                              key={i}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke={
                                i < Math.floor((metadata.palScore || 0) / 8.33)
                                  ? "#2ECC71"
                                  : "#2a2a2a"
                              }
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          );
                        })}

                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="url(#gradientRing)"
                          strokeWidth="1"
                          opacity="0.3"
                        />

                        <defs>
                          <linearGradient
                            id="gradientRing"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#2ECC71" />
                            <stop offset="50%" stopColor="#F39C12" />
                            <stop offset="100%" stopColor="#E74C3C" />
                          </linearGradient>
                        </defs>
                      </svg>

                      <svg
                        width="85"
                        height="85"
                        viewBox="0 0 100 100"
                        className="transform -rotate-90"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="35"
                          fill="none"
                          stroke="#1a1a1a"
                          strokeWidth="6"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="35"
                          fill="none"
                          stroke={
                            (metadata.palScore || 0) < 30
                              ? "#E74C3C"
                              : (metadata.palScore || 0) < 60
                              ? "#F39C12"
                              : "#2ECC71"
                          }
                          strokeWidth="6"
                          strokeDasharray={`${2 * Math.PI * 35}`}
                          strokeDashoffset={`${
                            2 *
                            Math.PI *
                            35 *
                            (1 - (metadata.palScore || 0) / 100)
                          }`}
                          strokeLinecap="round"
                          style={{
                            transition:
                              "stroke-dashoffset 0.8s ease, stroke 0.3s ease",
                            filter: "drop-shadow(0 0 4px currentColor)",
                          }}
                        />
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative px-2.5 py-1.5 rounded-lg flex items-center justify-center flex-col">
                          <div
                            className={`text-xl font-bold font-satoshi ${
                              (metadata.palScore || 0) < 30
                                ? "text-[#E74C3C]"
                                : (metadata.palScore || 0) < 60
                                ? "text-[#F39C12]"
                                : "text-[#2ECC71]"
                            }`}
                          >
                            {Math.round(metadata.palScore || 0)}
                          </div>
                          <div className="text-gray-400 text-[7px] font-satoshi text-center leading-tight">
                            {(metadata.palScore || 0) < 30
                              ? "HIGH RISK"
                              : (metadata.palScore || 0) < 60
                              ? "MEDIUM"
                              : "LOW RISK"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full px-2 mb-0.5">
                      <div className="flex flex-col items-center">
                        <div className="w-0.5 h-0.5 rounded-full bg-[#E74C3C] mb-0.5"></div>
                        <span className="text-[#E74C3C] text-[6px] font-satoshi font-semibold">
                          0
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-0.5 h-0.5 rounded-full bg-[#F39C12] mb-0.5"></div>
                        <span className="text-[#F39C12] text-[6px] font-satoshi font-semibold">
                          50
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-0.5 h-0.5 rounded-full bg-[#2ECC71] mb-0.5"></div>
                        <span className="text-[#2ECC71] text-[6px] font-satoshi font-semibold">
                          100
                        </span>
                      </div>
                    </div>

                    <div className="w-full px-2 mb-0.5">
                      <div className="relative h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${metadata.palScore || 0}%`,
                            background: `linear-gradient(90deg, 
                  #E74C3C 0%, 
                  #F39C12 50%, 
                  #2ECC71 100%)`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-gray-400 text-[6px] font-satoshi text-center">
                      BLOCKPAL RISK ASSESSMENT
                    </div>
                  </div>
                </div>

                {/* Right Side - Scores */}
                <div className="flex-1 flex flex-col justify-start gap-3 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-satoshi">
                        Pool Score
                      </span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[#F39C12] text-base font-bold font-satoshi">
                          {Math.round(metadata.poolScore || 0)}
                        </span>
                        <span className="text-[#4CAF50] text-xs font-satoshi">
                          / 100
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-satoshi">
                        Token Score
                      </span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[#F39C12] text-base font-bold font-satoshi">
                          {Math.round(metadata.tokenScore || 0)}
                        </span>
                        <span className="text-[#4CAF50] text-xs font-satoshi">
                          /100
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#2C2C2C] p-2 flex items-center justify-between">
                    <div>
                      <div className="text-[#F39C12] text-xs font-semibold font-satoshi">
                        {metadata.riskLevel || "Unknown"}
                      </div>
                      <div className="text-white text-[10px] font-satoshi mt-0.5">
                        {metadata.isHoneypot
                          ? "Honeypot Detected"
                          : metadata.cautionNotes?.[0] || "No warnings"}
                      </div>
                    </div>
                    <div className="scale-75">
                      <WarningIcon />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
