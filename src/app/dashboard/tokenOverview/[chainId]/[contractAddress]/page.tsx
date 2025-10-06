// src/app/dashboard/tokenOverview/[chainId]/[contractAddress]/page.tsx - COMPLETE WITH YOUR DESIGN
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import WarningIcon from "@/components/icons/WarningIcon";

const TIME_PERIODS = [
  { label: "1H", value: "minute?aggregate=1", days: 0.041 },
  { label: "1D", value: "hour?aggregate=1", days: 1 },
  { label: "1W", value: "day?aggregate=7", days: 7 },
  { label: "1M", value: "day?aggregate=30", days: 30 },
];

interface PricePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function TokenOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const chainId = params.chainId as string;
  const contractAddress = params.contractAddress as string;
  const poolAddress = searchParams.get("pool");

  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] =
    useState("hour?aggregate=1");
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [yAxisDomain, setYAxisDomain] = useState<[number, string | number]>([
    0,
    "auto",
  ]);
  const [priceChange, setPriceChange] = useState(0);

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

  useEffect(() => {
    if (tokenInfo && poolAddress) {
      loadChartData(selectedTimeframe);
    }
  }, [selectedTimeframe, tokenInfo, poolAddress]);

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

  const loadChartData = async (timeframe: string) => {
    if (!poolAddress) {
      console.log("No pool address, skipping chart data");
      return;
    }

    try {
      setChartLoading(true);
      console.log("Loading chart data:", { chainId, poolAddress, timeframe });

      const data = await coinlesService.getChartData(
        chainId,
        poolAddress,
        timeframe
      );

      if (data && data.length > 0) {
        setChartData(data);

        // Calculate price change
        const firstPrice = data[0].close;
        const lastPrice = data[data.length - 1].close;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
        setPriceChange(change);

        // Calculate Y-axis domain
        const prices = data.map((item) => item.close);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const padding = (maxPrice - minPrice) * 0.1;
        setYAxisDomain([Math.max(0, minPrice - padding), maxPrice + padding]);

        console.log("Chart data loaded:", data.length, "points");
      }
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setChartLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      await loadTokenData();
      if (poolAddress) {
        await loadChartData(selectedTimeframe);
      }
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
  };

  const formatDateForChart = (timestamp: number, days: number) => {
    const date = new Date(timestamp);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (days <= 1) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (days <= 7) {
      return `${
        monthNames[date.getMonth()]
      } ${date.getDate()} ${date.getHours()}:00`;
    } else {
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    }
  };

  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (active && payload && payload[0] && coordinate) {
      const currentPrice = payload[0].value;
      const dataIndex = payload[0].dataIndex || 0;
      let percentChange = 0;

      if (dataIndex > 0 && chartData.length > 0) {
        const firstPrice = chartData[0].close;
        percentChange = ((currentPrice - firstPrice) / firstPrice) * 100;
      }

      return (
        <div
          style={{
            position: "absolute",
            left: `${coordinate.x + 10}px`,
            top: `${coordinate.y - 50}px`,
            background: "#452008",
            padding: "8px 12px",
            borderRadius: "4px",
            border: "1px solid rgba(247, 180, 16, 0.2)",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <p
            style={{
              color: "#F7B410",
              margin: 0,
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            ${currentPrice.toFixed(6)}
          </p>
          <p
            style={{
              color: percentChange >= 0 ? "#4CAF50" : "#F44336",
              margin: "2px 0",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            {percentChange >= 0 ? "+" : ""}
            {percentChange.toFixed(2)}%
          </p>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              margin: "0",
              fontSize: "10px",
            }}
          >
            {new Date(payload[0].payload.timestamp).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => {
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(6)}`;
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
    return "bg-gradient-to-br from-blue-500 to-purple-600";
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

  const TimePeriodButtons = ({ className = "" }: { className?: string }) => (
    <div className={`flex gap-1 items-center ${className}`}>
      <div
        style={{
          display: "flex",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "20px",
          padding: "2px",
          gap: "2px",
          position: "relative",
        }}
      >
        <div
          className="sliding-background"
          style={{
            position: "absolute",
            top: "2px",
            left: `calc(${
              TIME_PERIODS.findIndex((tf) => tf.value === selectedTimeframe) *
              25
            }% + 2px)`,
            width: "calc(25% - 2px)",
            height: "calc(100% - 4px)",
            background: "#F7B410",
            borderRadius: "18px",
            transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 0,
          }}
        />
        {TIME_PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => handleTimeframeChange(period.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "18px",
              border: "none",
              background: "transparent",
              color:
                selectedTimeframe === period.value
                  ? "#000000"
                  : "rgba(255, 255, 255, 0.6)",
              cursor: "pointer",
              fontWeight: selectedTimeframe === period.value ? "600" : "500",
              fontSize: "11px",
              transition: "color 0.3s ease",
              minWidth: "32px",
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[14px] p-3 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[14px] p-3 flex items-center justify-center">
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

  // Calculate formatted chart data
  const formattedChartData = chartData.map((point, index) => ({
    ...point,
    displayTime: formatDateForChart(
      point.timestamp,
      TIME_PERIODS.find((p) => p.value === selectedTimeframe)?.days || 1
    ),
    index,
  }));

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

      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[14px] p-1.5 sm:p-2 lg:p-2.5 flex flex-col overflow-hidden">
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
              <TimePeriodButtons className="ml-2" />
            </div>
          </div>

          {/* Chart */}
          <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
            <div className="mb-2.5">
              <h3 className="text-base font-semibold text-white font-satoshi">
                Price Chart
              </h3>
            </div>

            {chartLoading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#E2AF19]"></div>
              </div>
            ) : formattedChartData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height={224}>
                  <AreaChart
                    data={formattedChartData}
                    margin={{ top: 2, right: 30, left: -5, bottom: 2 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#F7B410"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#F7B410"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="displayTime"
                      stroke="rgba(255, 255, 255, 0.2)"
                      tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 11 }}
                      tickLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />
                    <YAxis
                      orientation="right"
                      stroke="rgba(255, 255, 255, 0.3)"
                      tickFormatter={formatYAxis}
                      domain={yAxisDomain}
                      tick={{ fill: "rgba(255, 255, 255, 0.5)", fontSize: 8 }}
                      width={28}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "rgba(247, 180, 16, 0.2)",
                        strokeWidth: 1,
                      }}
                      isAnimationActive={false}
                      wrapperStyle={{ outline: "none" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#F7B410"
                      strokeWidth={2}
                      fill="url(#colorGradient)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center">
                <p className="text-gray-500 text-sm">No chart data available</p>
              </div>
            )}
          </div>

          {/* Continue with rest of mobile layout... */}
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

        {/* Desktop Layout - keeping your exact design */}
        <div className="hidden xl:flex gap-3 flex-1 min-h-0">
          <div className="flex-[0_0_60%] flex flex-col gap-3 min-w-0 max-h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
              {/* Main Chart Section */}
              <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3.5 flex-shrink-0">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center">
                    <div
                      className={`w-9 h-9 ${getTokenIcon(
                        metadata.symbol || ""
                      )} rounded-full mr-2.5 flex items-center justify-center`}
                    >
                      {metadata.logo ? (
                        <img
                          src={metadata.logo}
                          alt={metadata.symbol}
                          className="w-9 h-9 rounded-full"
                        />
                      ) : (
                        <span className="text-white text-lg font-bold">
                          {(metadata.symbol || "?").charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-row items-center justify-center space-x-2">
                      <h2 className="text-xl font-bold text-white font-mayeka">
                        {metadata.name}
                      </h2>
                      <p className="text-gray-400 font-satoshi mt-1">
                        {metadata.symbol}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-white text-xs font-satoshi mb-0.5">
                      Contract Address
                    </div>
                    <div className="flex items-center space-x-1.5 mb-2 justify-end">
                      <span className="text-gray-400 text-xs font-satoshi">
                        {`${contractAddress.slice(
                          0,
                          9
                        )}...${contractAddress.slice(-7)}`}
                      </span>
                      <button
                        onClick={() => copyToClipboard(contractAddress)}
                        className="hover:text-white transition-colors"
                      >
                        <Copy size={13} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Price Section */}
                <div className="flex items-end justify-between mb-3.5">
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
                      <div className="text-gray-400 text-sm font-satoshi">
                        24h
                      </div>
                    </div>
                  </div>
                  <TimePeriodButtons className="ml-4" />
                </div>

                {/* Chart */}
                <div className="mb-4">
                  {chartLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
                    </div>
                  ) : formattedChartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={formattedChartData}
                          margin={{ top: 2, right: 40, left: -10, bottom: 10 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#F7B410"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="100%"
                                stopColor="#F7B410"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="displayTime"
                            stroke="rgba(255, 255, 255, 0.2)"
                            tick={{
                              fill: "rgba(255, 255, 255, 0.4)",
                              fontSize: 9,
                            }}
                            tickLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                            interval="preserveStartEnd"
                            minTickGap={50}
                          />
                          <YAxis
                            orientation="right"
                            stroke="rgba(255, 255, 255, 0.3)"
                            tickFormatter={formatYAxis}
                            domain={yAxisDomain}
                            tick={{
                              fill: "rgba(255, 255, 255, 0.5)",
                              fontSize: 10,
                            }}
                            width={35}
                          />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={{
                              stroke: "rgba(247, 180, 16, 0.2)",
                              strokeWidth: 1,
                            }}
                            isAnimationActive={false}
                            wrapperStyle={{ outline: "none" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="close"
                            stroke="#F7B410"
                            strokeWidth={2}
                            fill="url(#colorGradient)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-gray-500">No chart data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* About Section - keeping your exact token distribution design */}
              <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-5.5 flex-shrink-0">
                {/* Social links at top */}
                <div className="flex items-center space-x-2.5 mb-3.5">
                  {metadata.websites && metadata.websites[0] && (
                    <a
                      href={metadata.websites[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                    >
                      <Globe size={11} className="mr-1.5" />
                      Website
                    </a>
                  )}
                  {metadata.socials?.twitter && (
                    <a
                      href={metadata.socials.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                    >
                      <Twitter size={11} className="mr-1.5" />
                      Twitter
                    </a>
                  )}
                </div>

                <h3 className="text-base font-semibold text-white mb-2.5 font-mayeka">
                  About {metadata.name}
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed font-satoshi mb-3">
                  {metadata.description || "No description available."}
                </p>

                {/* Your exact Token Distribution design */}
                <div className="rounded-[30px] border border-[#2C2C2C] p-3">
                  <h4 className="text-sm font-semibold text-white mb-3 font-satoshi">
                    Token Distribution
                  </h4>

                  <div className="flex items-center justify-center gap-[90px]">
                    {/* Left side - Circle Chart */}
                    <div className="flex-shrink-0">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle
                          cx="70"
                          cy="70"
                          r="60"
                          fill="none"
                          stroke="#1a1a1a"
                          strokeWidth="7"
                        />
                        <circle
                          cx="70"
                          cy="70"
                          r="60"
                          fill="none"
                          stroke="#4CAF50"
                          strokeWidth="7"
                          strokeDasharray="81 376.8"
                          strokeDashoffset="-6"
                          strokeLinecap="round"
                          transform="rotate(-80 70 70)"
                        />
                        <circle
                          cx="70"
                          cy="70"
                          r="60"
                          fill="none"
                          stroke="#8BC34A"
                          strokeWidth="7"
                          strokeDasharray="62 376.8"
                          strokeDashoffset="-108"
                          strokeLinecap="round"
                          transform="rotate(-85 70 70)"
                        />
                        <circle
                          cx="70"
                          cy="70"
                          r="60"
                          fill="none"
                          stroke="#FF9800"
                          strokeWidth="7"
                          strokeDasharray="113 376.8"
                          strokeDashoffset="-191"
                          strokeLinecap="round"
                          transform="rotate(-90 70 70)"
                        />
                        <circle
                          cx="70"
                          cy="70"
                          r="60"
                          fill="none"
                          stroke="#F44336"
                          strokeWidth="7"
                          strokeDasharray="62 376.8"
                          strokeDashoffset="-325"
                          strokeLinecap="round"
                          transform="rotate(-90 70 70)"
                        />
                        <text
                          x="70"
                          y="60"
                          textAnchor="middle"
                          className="fill-gray-400 text-[10px] font-satoshi"
                        >
                          Total Supply
                        </text>
                        <text
                          x="70"
                          y="76"
                          textAnchor="middle"
                          className="fill-white text-[13px] font-bold font-satoshi"
                        >
                          {formatLargeNumber(1000000000)}
                        </text>
                        <text
                          x="70"
                          y="89"
                          textAnchor="middle"
                          className="fill-gray-400 text-[9px] font-satoshi"
                        >
                          {metadata.symbol || "Token"}
                        </text>
                      </svg>
                    </div>

                    {/* Right side - Total Count of Holders */}
                    <div
                      className="bg-black rounded-[20px] border border-[#2C2C2C] p-3 flex flex-col in-w-[320px] items-start justify-baseline gap-[20px]"
                      style={{ height: "120px" }}
                    >
                      <h5 className="text-[11px] font-semibold text-white font-satoshi">
                        TOTAL COUNT OF HOLDERS
                      </h5>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#4CAF50] flex-shrink-0"></div>
                          <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                            Top 10%:{" "}
                            {metadata.holderDistribution?.top_10 || "0"}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#81C784] flex-shrink-0"></div>
                          <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                            Top 10% - 30%:{" "}
                            {metadata.holderDistribution?.["11_30"] || "0"}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#FF9800] flex-shrink-0"></div>
                          <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                            Top 30% - 60%:{" "}
                            {metadata.holderDistribution?.["31_50"] || "0"}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#F44336] flex-shrink-0"></div>
                          <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                            Top 60% - 70%:{" "}
                            {metadata.holderDistribution?.rest || "0"}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - keeping your exact design with PAL score */}
          <div className="w-full flex-1 h-full flex flex-col gap-3">
            <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex flex-col overflow-y-auto space-y-1 scrollbar-hide">
              {/* Header with token info */}
              <div className="flex items-center gap-3 mb-3">
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
                    <span className="text-white text-lg font-bold">
                      {(metadata.symbol || "?").charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-base font-satoshi">
                    {metadata.name}
                    <span className="text-[#939393] font-bold text-base font-satoshi">
                      /
                    </span>
                    <span className="text-[#939393] font-satoshi text-[10px]">
                      {metadata.symbol}
                    </span>
                  </h3>
                  <p className="text-gray-400 text-xs font-satoshi">
                    {metadata.name} price
                  </p>
                </div>
              </div>

              {/* Price and Balance */}
              <div className="mb-3">
                <div className="flex flex-row items-center justify-start text-2xl font-bold text-white mb-1 font-satoshi gap-1">
                  {formatCurrency(marketData.price || 0)}
                  <div
                    className={`text-sm font-satoshi ${
                      priceChange >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {priceChange >= 0 ? "↑" : "↓"}(
                    {Math.abs(priceChange).toFixed(2)}%)
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-2 mb-3">
                {metadata.socials?.twitter && (
                  <a
                    href={metadata.socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] flex items-center justify-center hover:bg-[#2C2C2C] transition-colors"
                  >
                    <Twitter size={14} className="text-white" />
                  </a>
                )}
                {metadata.websites && metadata.websites[0] && (
                  <a
                    href={metadata.websites[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] flex items-center justify-center hover:bg-[#2C2C2C] transition-colors"
                  >
                    <Globe size={14} className="text-white" />
                  </a>
                )}
              </div>

              {/* Time Period Buttons showing real price changes */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: "5M", value: priceChangeData.m5 || 0 },
                  { label: "1H", value: priceChangeData.h1 || 0 },
                  { label: "6H", value: priceChangeData.h6 || 0 },
                  { label: "24H", value: priceChangeData.h24 || 0 },
                ].map((period) => (
                  <div
                    key={period.label}
                    className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2 text-center"
                  >
                    <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                      {period.label}
                    </div>
                    <div
                      className={`text-xs font-semibold font-satoshi ${
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
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    24h Vol
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    ${formatLargeNumber(marketData.volume24h || 0)}
                  </div>
                </div>
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    Liquidity
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    ${formatLargeNumber(marketData.liquidity || 0)}
                  </div>
                </div>
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    Holders
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    {formatLargeNumber(metadata.holders || 0)}
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    Age
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    {metadata.createdAt
                      ? new Date(metadata.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </div>
                </div>
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    FDV
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    ${formatLargeNumber(marketData.fdv || 0)}
                  </div>
                </div>
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    Market Cap
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    ${formatLargeNumber(marketData.marketCap || 0)}
                  </div>
                </div>
              </div>

              {/* Buy/Sell Section with real transaction data */}
              <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-3 mb-3">
                <div className="flex gap-3">
                  {/* Left Side - Buys/Sells */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-green-400 text-xs font-semibold font-satoshi">
                        BUYS
                      </span>
                      <span className="text-red-400 text-xs font-semibold font-satoshi">
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
                      <div className="text-[10px] font-satoshi text-[#26AA5E]">
                        {transactions.buys24h || 0}
                      </div>
                      <div className="text-[10px] font-satoshi text-[#F44336]">
                        {transactions.sells24h || 0}
                      </div>
                    </div>
                  </div>

                  <div className="w-px bg-[#2C2C2C]"></div>

                  {/* Right Side - 24hrs Volume */}
                  <div className="flex-1">
                    <div className="text-center mb-2">
                      <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                        24hrs Volume
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          TNX
                        </span>
                        <div className="flex-1 mx-2 border-b border-dashed border-[#2C2C2C]"></div>
                        <span className="text-white text-sm font-semibold font-satoshi">
                          {transactions.totalTx24h || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          VOL
                        </span>
                        <div className="flex-1 mx-2 border-b border-dashed border-[#2C2C2C]"></div>
                        <span className="text-white text-sm font-semibold font-satoshi">
                          ${formatLargeNumber(marketData.volume24h || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          NET BUYS
                        </span>
                        <div className="flex-1 mx-2 border-b border-dashed border-[#2C2C2C]"></div>
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
              </div>
            </div>

            {/* Bottom Section - PAL Score Card - Your exact design */}
            <div className="h-[240px] bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-lg font-semibold font-mayeka whitespace-nowrap">
                  PAL Score
                </h3>
                <div className="flex-1 h-[2px] bg-white mx-15"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[#4CAF50] text-2xl font-bold font-mayeka">
                    {Math.round(metadata.palScore || 0)}
                  </span>
                  <span className="text-[#F39C12] text-2xl font-bold font-mayeka">
                    /100
                  </span>
                </div>
              </div>

              <div className="flex gap-4 flex-1">
                <div
                  className="flex-shrink-0 bg-[#0F0F0F] rounded-2xl p-3 flex flex-col items-center justify-center"
                  style={{ width: "180px" }}
                >
                  <svg width="190" height="110" viewBox="0 0 192 130">
                    <circle cx="55" cy="28" r="1" fill="#4A4A4A" />
                    <circle cx="24" cy="58" r="1" fill="#4A4A4A" />
                    <circle cx="125" cy="29" r="1" fill="#4A4A4A" />
                    <circle cx="155" cy="57" r="1" fill="#4A4A4A" />
                    <path
                      d="M 25 100 A 65 65 0 0 1 155 100"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M 25 100 A 65 65 0 ${
                        (metadata.palScore || 0) > 50 ? "1" : "0"
                      } 1 ${25 + ((metadata.palScore || 0) / 100) * 130} ${
                        100 -
                        Math.sin(((metadata.palScore || 0) / 100) * Math.PI) *
                          65
                      }`}
                      fill="none"
                      stroke="#2ECC71"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                    <text
                      x="6"
                      y="102"
                      className="fill-[#F39C12] text-[10px] font-satoshi font-semibold"
                    >
                      0
                    </text>
                    <text
                      x="85"
                      y="18"
                      textAnchor="middle"
                      className="fill-[#F39C12] text-[10px] font-satoshi font-semibold"
                    >
                      50
                    </text>
                    <text
                      x="169"
                      y="102"
                      className="fill-[#E74C3C] text-[10px] font-satoshi font-semibold"
                    >
                      100
                    </text>
                    <text
                      x="90"
                      y="85"
                      textAnchor="middle"
                      className="fill-[#2ECC71] text-[36px] font-bold font-satoshi"
                    >
                      {((metadata.palScore || 0) / 100).toFixed(1)}
                    </text>
                    <text
                      x="90"
                      y="102"
                      textAnchor="middle"
                      className="fill-[#2ECC71] text-[12px] font-satoshi"
                    >
                      {(metadata.palScore || 0) < 30
                        ? "High"
                        : (metadata.palScore || 0) < 60
                        ? "Medium"
                        : "Low"}
                    </text>
                  </svg>
                  <div className="text-gray-400 text-[9px] font-satoshi mt-0">
                    BLOCKPAL APP RISK
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-5">
                  <div className="">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-satoshi">
                        Pool Score
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[#4CAF50] text-lg font-bold font-satoshi">
                          {Math.round(metadata.poolScore || 0)}
                        </span>
                        <span className="text-gray-400 text-sm font-satoshi">
                          / 100
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-satoshi">
                        Token Score
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[#F39C12] text-lg font-bold font-satoshi">
                          {Math.round(metadata.tokenScore || 0)}
                        </span>
                        <span className="text-gray-400 text-sm font-satoshi">
                          /100
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#2C2C2C] p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[#F39C12] text-sm font-semibold font-satoshi">
                        {metadata.riskLevel || "Unknown"}
                      </div>
                      <div className="text-white text-xs font-satoshi mt-0.5">
                        {metadata.isHoneypot
                          ? "Honeypot Detected"
                          : metadata.cautionNotes?.[0] || "No warnings"}
                      </div>
                    </div>
                    <WarningIcon />
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
