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
import { useToast } from "@/contexts/ToastContext";

export default function TokenOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const { showToast } = useToast();

  const chainId = params.chainId as string;
  const contractAddress = params.contractAddress as string;
  const poolAddress = searchParams.get("pool");

  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "chart" | "pal">("info");

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

  const copyToClipboard = async (
    text: string,
    label: string = "Contract address"
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", `${label} copied to clipboard`, 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast("error", "Failed to copy. Please try again.", 3000);
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

  const formatPrice = (price: number): string => {
    if (!price || isNaN(price)) return "N/A";

    const integerPart = Math.floor(Math.abs(price));

    if (integerPart > 0) {
      return `$${price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })}`;
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

        /* Hide global header on mobile for token overview */
        @media (max-width: 1024px) {
          .token-overview-page + * {
            padding-top: 0 !important;
          }
        }
      `}</style>

      <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[14px] p-0 lg:p-2.5 flex flex-col overflow-hidden token-overview-page">
        {/* Mobile Header with Back Button - Only on Mobile */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#2C2C2C] bg-black flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-white text-lg font-mayeka font-semibold">
            Token Overview
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
          >
            {/* <RefreshCw
              className={`w-5 h-5 text-white ${
                refreshing ? "animate-spin" : ""
              }`}
            /> */}
          </button>
        </div>

        {/* Mobile Content - Tab Based */}
        <div className="lg:hidden flex-1 overflow-y-auto pb-20">
          {/* Info Tab */}
          {activeTab === "info" && (
            <div className="p-4 space-y-4">
              {/* Token Header */}
              <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2C2C2C] mr-3">
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
                      <h2 className="text-xl font-bold text-white font-mayeka">
                        {metadata.name}
                      </h2>
                      <p className="text-gray-400 text-sm font-satoshi">
                        {metadata.symbol}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Price Section */}
                <div className="mb-3">
                  <div className="text-3xl font-bold text-white mb-2 font-satoshi">
                    {formatPrice(marketData.price || 0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-base font-satoshi ${
                        (marketData.change24h || 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatPercentage(marketData.change24h || 0)}
                    </div>
                    <div className="text-gray-400 text-sm font-satoshi">
                      24h
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                {(metadata.socials?.twitter || metadata.websites?.[0]) && (
                  <div className="flex gap-2 mb-3">
                    {metadata.socials?.twitter && (
                      <a
                        href={metadata.socials.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-[#0F0F0F] rounded-lg hover:bg-[#1A1A1A] transition-colors"
                      >
                        <Twitter size={18} className="text-white" />
                      </a>
                    )}
                    {metadata.websites?.[0] && (
                      <a
                        href={metadata.websites[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-[#0F0F0F] rounded-lg hover:bg-[#1A1A1A] transition-colors"
                      >
                        <Globe size={18} className="text-white" />
                      </a>
                    )}
                  </div>
                )}

                {/* Time Period Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "5M", value: priceChangeData.m5 || 0 },
                    { label: "1H", value: priceChangeData.h1 || 0 },
                    { label: "6H", value: priceChangeData.h6 || 0 },
                    { label: "24H", value: priceChangeData.h24 || 0 },
                  ].map((period) => (
                    <div
                      key={period.label}
                      className="rounded-lg border border-[#2C2C2C] p-2 text-center"
                    >
                      <div className="text-gray-400 text-xs font-satoshi mb-1">
                        {period.label}
                      </div>
                      <div
                        className={`text-sm font-semibold font-satoshi ${
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
              </div>

              {/* Contract Address */}
              <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-2">
                    <div className="text-gray-400 text-xs font-satoshi mb-1">
                      Contract Address
                    </div>
                    <code className="text-gray-300 font-mono text-sm break-all">
                      {contractAddress}
                    </code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(contractAddress)}
                    className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors flex-shrink-0"
                  >
                    <Copy size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-xs font-satoshi mb-1">
                      24h Volume
                    </div>
                    <div className="text-white text-base font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.volume24h || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-satoshi mb-1">
                      Liquidity
                    </div>
                    <div className="text-white text-base font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.liquidity || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-satoshi mb-1">
                      Market Cap
                    </div>
                    <div className="text-white text-base font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.marketCap || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-satoshi mb-1">
                      FDV
                    </div>
                    <div className="text-white text-base font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.fdv || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-satoshi mb-1">
                      Holders
                    </div>
                    <div className="text-white text-base font-semibold font-satoshi">
                      {formatLargeNumber(metadata.holders || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-satoshi mb-1">
                      Age
                    </div>
                    <div className="text-white text-base font-semibold font-satoshi">
                      {metadata.createdAt
                        ? new Date(metadata.createdAt).toLocaleDateString()
                        : "Unknown"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Buy/Sell Section */}
              <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-3">
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-green-400 text-sm font-satoshi">
                      BUYS
                    </span>
                    <span className="text-red-400 text-sm font-satoshi">
                      SELLS
                    </span>
                  </div>
                  <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
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
                    <div className="text-sm font-satoshi text-[#26AA5E]">
                      {transactions.buys24h || 0}
                    </div>
                    <div className="text-sm font-satoshi text-[#F44336]">
                      {transactions.sells24h || 0}
                    </div>
                  </div>
                </div>

                <div className="bg-[#0F0F0F] p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Transactions
                    </span>
                    <span className="text-white text-sm font-semibold font-satoshi">
                      {transactions.totalTx24h || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Volume
                    </span>
                    <span className="text-white text-sm font-semibold font-satoshi">
                      ${formatLargeNumber(marketData.volume24h || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Net Buys
                    </span>
                    <span
                      className={`text-sm font-semibold font-satoshi ${
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
          )}

          {/* Chart Tab */}
          {activeTab === "chart" && (
            <div className="h-full p-4 flex flex-col">
              {/* Token Header - Mobile Chart Tab Only */}
              <div className="mb-3 flex items-center gap-3 bg-black rounded-[11px] p-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2C2C2C] border-2 border-[#00D9B3]/20">
                  {metadata.logo ? (
                    <img
                      src={metadata.logo}
                      alt={metadata.symbol}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <span className="text-[#00D9B3] text-base font-bold">
                      {(metadata.symbol || "?").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-white text-base font-semibold font-satoshi mb-1">
                    {metadata.name} ({metadata.symbol})
                  </div>
                  <div className="text-[#00D9B3] text-lg font-medium font-satoshi">
                    {formatPrice(marketData.price || 0)}
                  </div>
                </div>
              </div>

              {/* Chart Container */}
              <div className="flex-1 bg-black rounded-[11px] border border-[#2C2C2C] p-3 min-h-0">
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
            </div>
          )}

          {/* PAL Score Tab */}
          {activeTab === "pal" && (
            <div className="p-4">
              <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white text-lg font-semibold font-mayeka">
                    PAL Score
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="text-[#F39C12] text-2xl font-bold font-mayeka">
                      {Math.round(metadata.palScore || 0)}
                    </span>
                    <span className="text-[#4CAF50] text-2xl font-bold font-mayeka">
                      /100
                    </span>
                  </div>
                </div>

                {/* Gauge */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-4">
                    <svg width="200" height="200" viewBox="0 0 100 100">
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
                      width="200"
                      height="200"
                      viewBox="0 0 100 100"
                      className="absolute inset-0 transform -rotate-90"
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
                      <div
                        className={`text-4xl font-bold font-satoshi ${
                          (metadata.palScore || 0) < 30
                            ? "text-[#E74C3C]"
                            : (metadata.palScore || 0) < 60
                            ? "text-[#F39C12]"
                            : "text-[#2ECC71]"
                        }`}
                      >
                        {Math.round(metadata.palScore || 0)}
                      </div>
                      <div className="text-gray-400 text-xs font-satoshi text-center">
                        {(metadata.palScore || 0) < 30
                          ? "HIGH RISK"
                          : (metadata.palScore || 0) < 60
                          ? "MEDIUM"
                          : "LOW RISK"}
                      </div>
                    </div>
                  </div>

                  <div className="w-full px-4 mb-2">
                    <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${metadata.palScore || 0}%`,
                          background: `linear-gradient(90deg, #E74C3C 0%, #F39C12 50%, #2ECC71 100%)`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Scores */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-base font-satoshi">
                      Pool Score
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[#F39C12] text-xl font-bold font-satoshi">
                        {Math.round(metadata.poolScore || 0)}
                      </span>
                      <span className="text-[#4CAF50] text-sm font-satoshi">
                        / 100
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-base font-satoshi">
                      Token Score
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[#F39C12] text-xl font-bold font-satoshi">
                        {Math.round(metadata.tokenScore || 0)}
                      </span>
                      <span className="text-[#4CAF50] text-sm font-satoshi">
                        /100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="rounded-lg border border-[#2C2C2C] p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[#F39C12] text-base font-semibold font-satoshi">
                      {metadata.riskLevel || "Unknown"}
                    </div>
                    <div className="text-white text-sm font-satoshi mt-1">
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
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0F0F0F] border-t border-[#2C2C2C] z-50 safe-area-bottom">
          <nav className="flex items-center justify-around px-4 py-3">
            <button
              onClick={() => setActiveTab("info")}
              className={`flex flex-col items-center justify-center min-w-[80px] py-2 px-3 rounded-lg transition-all ${
                activeTab === "info" ? "bg-[#E2AF19]" : ""
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`mb-1 ${
                  activeTab === "info" ? "text-black" : "text-white"
                }`}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span
                className={`text-xs font-satoshi ${
                  activeTab === "info" ? "text-black font-medium" : "text-white"
                }`}
              >
                Info
              </span>
            </button>

            <button
              onClick={() => setActiveTab("chart")}
              className={`flex flex-col items-center justify-center min-w-[80px] py-2 px-3 rounded-lg transition-all ${
                activeTab === "chart" ? "bg-[#E2AF19]" : ""
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`mb-1 ${
                  activeTab === "chart" ? "text-black" : "text-white"
                }`}
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span
                className={`text-xs font-satoshi ${
                  activeTab === "chart"
                    ? "text-black font-medium"
                    : "text-white"
                }`}
              >
                Chart
              </span>
            </button>

            <button
              onClick={() => setActiveTab("pal")}
              className={`flex flex-col items-center justify-center min-w-[80px] py-2 px-3 rounded-lg transition-all ${
                activeTab === "pal" ? "bg-[#E2AF19]" : ""
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`mb-1 ${
                  activeTab === "pal" ? "text-black" : "text-white"
                }`}
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span
                className={`text-xs font-satoshi ${
                  activeTab === "pal" ? "text-black font-medium" : "text-white"
                }`}
              >
                PAL Score
              </span>
            </button>
          </nav>
        </div>

        {/* Desktop Layout - FIXED HEIGHT */}
        <div className="hidden lg:flex gap-3 flex-1 min-h-0 max-h-full overflow-hidden">
          {/* LEFT COLUMN - Chart Section */}
          <div className="flex-[0_0_70%] flex flex-col gap-3 min-w-0 max-h-full">
            {/* Main Chart Section */}
            <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#2C2C2C] mr-2">
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

              <div className="flex items-end justify-between mb-3 flex-shrink-0">
                <div className="flex-1">
                  <div className="flex flex-row items-center gap-[10px] text-xl lg:text-2xl font-bold text-white mb-1 font-satoshi">
                    {formatPrice(marketData.price || 0)}
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

          {/* RIGHT COLUMN - FIXED: Now properly fills height */}
          <div className="w-full flex-1 max-h-full flex flex-col gap-3 min-h-0">
            {/* Token Info Card - FIXED: flex-1 to fill available space */}
            <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex flex-col justify-between space-y-1.5 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2C2C2C] flex-shrink-0">
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

              <div className="mb-1 flex-shrink-0">
                <div className="flex flex-row items-center justify-start text-xl font-bold text-white mb-0.5 font-satoshi gap-1">
                  {formatPrice(marketData.price || 0)}
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

            {/* PAL Score Card - FIXED: Now has natural height */}
            <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-2 flex flex-col pt-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-white text-sm font-semibold font-mayeka whitespace-nowrap">
                  PAL Score
                </h3>
                <div className="flex-1 h-[1.5px] bg-white mx-6"></div>
                <div className="flex items-center gap-0.5">
                  <span className="text-[#F39C12] text-lg font-bold font-mayeka">
                    {Math.round(metadata.palScore || 0)}
                  </span>
                  <span className="text-[#4CAF50] text-lg font-bold font-mayeka">
                    /100
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-1">
                <div
                  className="flex-shrink-0 bg-gradient-to-br from-[#0F0F0F] to-[#1a1a1a] rounded-2xl p-1 flex flex-col items-center justify-center relative overflow-hidden"
                  style={{ width: "110px" }}
                >
                  <div className="relative w-full flex flex-col items-center justify-center z-10">
                    <div className="relative mb-0.5">
                      <svg
                        width="70"
                        height="70"
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
                        width="70"
                        height="70"
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
                        <div className="relative px-2 py-1 rounded-lg flex items-center justify-center flex-col">
                          <div
                            className={`text-lg font-bold font-satoshi ${
                              (metadata.palScore || 0) < 30
                                ? "text-[#E74C3C]"
                                : (metadata.palScore || 0) < 60
                                ? "text-[#F39C12]"
                                : "text-[#2ECC71]"
                            }`}
                          >
                            {Math.round(metadata.palScore || 0)}
                          </div>
                          <div className="text-gray-400 text-[6px] font-satoshi text-center leading-tight">
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

                <div className="flex-1 flex flex-col justify-start gap-2 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-[11px] font-satoshi">
                        Pool Score
                      </span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[#F39C12] text-sm font-bold font-satoshi">
                          {Math.round(metadata.poolScore || 0)}
                        </span>
                        <span className="text-[#4CAF50] text-[10px] font-satoshi">
                          / 100
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-[11px] font-satoshi">
                        Token Score
                      </span>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[#F39C12] text-sm font-bold font-satoshi">
                          {Math.round(metadata.tokenScore || 0)}
                        </span>
                        <span className="text-[#4CAF50] text-[10px] font-satoshi">
                          /100
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#2C2C2C] p-1.5 flex items-center justify-between">
                    <div>
                      <div className="text-[#F39C12] text-[11px] font-semibold font-satoshi">
                        {metadata.riskLevel || "Unknown"}
                      </div>
                      <div className="text-white text-[9px] font-satoshi mt-0.5">
                        {metadata.isHoneypot
                          ? "Honeypot Detected"
                          : metadata.cautionNotes?.[0] || "No warnings"}
                      </div>
                    </div>
                    <div className="scale-[0.65]">
                      <WarningIcon />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}
