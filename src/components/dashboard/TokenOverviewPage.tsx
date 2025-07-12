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
  Activity,
  MoreHorizontal,
  QrCode,
} from "lucide-react";
import { RootState } from "@/store";
import SimpleTransferModal from "@/components/transfer/SimpleTransferModal";
import TransactionHistory from "@/components/transactions/TransactionHistory";
import UserQRCodeModal from "@/components/profile/UserQRCodeModal"; // Add this import
import { SkeletonTokenOverview } from "@/components/ui/Skeleton";

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

// Time period configuration
const TIME_PERIODS = [
  { label: "1H", value: "1H", days: 1, interval: "hourly" },
  { label: "1D", value: "1D", days: 1, interval: "hourly" },
  { label: "1W", value: "1W", days: 7, interval: "daily" },
  { label: "1M", value: "1M", days: 30, interval: "daily" },
  { label: "1Y", value: "1Y", days: 365, interval: "daily" },
];

export default function TokenOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");
  const [copied, setCopied] = useState<string>("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false); // Add QR modal state
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    price: number;
    date: string;
  } | null>(null);

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
      await new Promise((resolve) => setTimeout(resolve, 1000));

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

  const fetchChartData = async (period: string) => {
    if (!tokenInfo?.priceData?.id) return;

    try {
      setChartLoading(true);

      // Get the period configuration
      const periodConfig = TIME_PERIODS.find((p) => p.value === period);
      if (!periodConfig) return;

      const response = await fetch(
        `/api/tokens/chart?tokenId=${tokenInfo.priceData.id}&days=${periodConfig.days}&interval=${periodConfig.interval}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setChartData(data.chartData);
      } else {
        console.error("Failed to fetch chart data");
        // Fallback: create mock data for demo
        createMockChartData(period);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
      // Fallback: create mock data for demo
      createMockChartData(period);
    } finally {
      setChartLoading(false);
    }
  };

  // Create mock data for demonstration
  const createMockChartData = (period: string) => {
    const basePrice = tokenInfo?.priceData?.current_price || 2400;
    const prices = [];
    const now = Date.now();
    let dataPoints = 24;
    let timeInterval = 60 * 60 * 1000; // 1 hour

    switch (period) {
      case "1H":
        dataPoints = 60;
        timeInterval = 60 * 1000; // 1 minute
        break;
      case "1D":
        dataPoints = 24;
        timeInterval = 60 * 60 * 1000; // 1 hour
        break;
      case "1W":
        dataPoints = 7;
        timeInterval = 24 * 60 * 60 * 1000; // 1 day
        break;
      case "1M":
        dataPoints = 30;
        timeInterval = 24 * 60 * 60 * 1000; // 1 day
        break;
      case "1Y":
        dataPoints = 12;
        timeInterval = 30 * 24 * 60 * 60 * 1000; // 1 month
        break;
    }

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = (now - (dataPoints - i - 1) * timeInterval) / 1000;
      const date = new Date(timestamp * 1000);
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const price = basePrice * (1 + variation * (i / dataPoints));

      prices.push({
        timestamp,
        price,
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
      });
    }

    setChartData({
      prices,
      timeframe: dataPoints,
    });
  };

  // Generate X-axis labels based on time period
  const generateXAxisLabels = (
    prices: Array<{ timestamp: number; date: string; time: string }>,
    period: string,
    chartWidth: number = 800
  ) => {
    if (!prices || prices.length === 0) return [];

    const labels = [];
    const totalPoints = prices.length;

    // Fixed number of labels to prevent overlapping
    const maxLabels = 4; // Always show exactly 4 labels to prevent overlap
    const skipInterval = Math.max(1, Math.floor(totalPoints / (maxLabels - 1)));

    // Generate labels at evenly spaced intervals
    for (let i = 0; i < totalPoints; i += skipInterval) {
      // Ensure we don't exceed array bounds
      const index = Math.min(i, totalPoints - 1);
      const point = prices[index];
      const date = new Date(point.timestamp * 1000);
      let label = "";

      switch (period) {
        case "1H":
          label = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          break;
        case "1D":
          label = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          break;
        case "1W":
          label = date.toLocaleDateString([], { weekday: "short" });
          break;
        case "1M":
          label = date.toLocaleDateString([], {
            month: "short",
            day: "numeric",
          });
          break;
        case "1Y":
          label = date.toLocaleDateString([], {
            month: "short",
            year: "2-digit",
          });
          break;
        default:
          label = date.toLocaleDateString();
      }

      const x = (index / (totalPoints - 1)) * chartWidth;
      labels.push({ x, label, index });
    }

    // Always include the last point if not already included
    if (
      labels.length > 0 &&
      labels[labels.length - 1].index !== totalPoints - 1
    ) {
      const lastPoint = prices[totalPoints - 1];
      const lastDate = new Date(lastPoint.timestamp * 1000);
      let lastLabel = "";

      switch (period) {
        case "1H":
          lastLabel = lastDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          break;
        case "1D":
          lastLabel = lastDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          break;
        case "1W":
          lastLabel = lastDate.toLocaleDateString([], { weekday: "short" });
          break;
        case "1M":
          lastLabel = lastDate.toLocaleDateString([], {
            month: "short",
            day: "numeric",
          });
          break;
        case "1Y":
          lastLabel = lastDate.toLocaleDateString([], {
            month: "short",
            year: "2-digit",
          });
          break;
        default:
          lastLabel = lastDate.toLocaleDateString();
      }

      labels.push({ x: chartWidth, label: lastLabel, index: totalPoints - 1 });
    }

    return labels;
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

  // Add random token background function
  const getRandomTokenBg = (symbol: string) => {
    const backgrounds = [
      "bg-blue-500/20",
      "bg-purple-500/20",
      "bg-green-500/20",
      "bg-yellow-500/20",
      "bg-red-500/20",
      "bg-cyan-500/20",
      "bg-pink-500/20",
      "bg-orange-500/20",
      "bg-indigo-500/20",
      "bg-teal-500/20",
    ];

    // Use symbol to get consistent color for same token
    const index =
      symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      backgrounds.length;
    return backgrounds[index];
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

  // Enhanced chart path generation with interactive features
  const generateInteractiveChart = (
    prices: Array<{ price: number; date: string; time: string }>,
    width = 800, // Back to original size
    height = 240, // Back to original size
    isMobile = false
  ) => {
    if (!prices || prices.length === 0)
      return { path: "", points: [], yAxisValues: [], xAxisLabels: [] };

    const minPrice = Math.min(...prices.map((p) => p.price));
    const maxPrice = Math.max(...prices.map((p) => p.price));
    const priceRange = maxPrice - minPrice || 1;

    // Add padding to top and bottom (15% of range)
    const paddingRatio = 0.15;
    const paddedRange = priceRange * (1 + 2 * paddingRatio);
    const paddedMin = minPrice - priceRange * paddingRatio;
    const paddedMax = maxPrice + priceRange * paddingRatio;

    // Generate Y-axis values (5 evenly spaced values)
    const yAxisValues = [];
    for (let i = 0; i < 5; i++) {
      const value = paddedMin + (paddedRange * i) / 4;
      const y = height - (i * height) / 4;
      yAxisValues.push({ value, y });
    }

    // Generate X-axis labels
    const xAxisLabels = generateXAxisLabels(
      prices.map((p, i) => ({
        timestamp: Date.now() / 1000 - (prices.length - i - 1) * 3600, // Mock timestamp
        date: p.date,
        time: p.time,
      })),
      selectedTimeframe,
      width
    );

    const points = prices.map((point, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((point.price - paddedMin) / paddedRange) * height;
      return {
        x,
        y,
        price: point.price,
        date: point.date,
        time: point.time,
      };
    });

    const pathPoints = points.map((p) => `${p.x},${p.y}`);
    const path = `M ${pathPoints.join(" L ")}`;

    // Create filled area path
    const areaPath = `${path} L ${width},${height} L 0,${height} Z`;

    return { path, areaPath, points, yAxisValues, xAxisLabels };
  };

  // Handle mouse movement on chart
  const handleChartMouseMove = (
    event: React.MouseEvent<SVGSVGElement>,
    points: Array<{
      x: number;
      y: number;
      price: number;
      date: string;
      time: string;
    }>,
    svgRect: DOMRect
  ) => {
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;
    const scaledMouseX =
      (mouseX / svgRect.width) * event.currentTarget.viewBox.baseVal.width;
    const scaledMouseY =
      (mouseY / svgRect.height) * event.currentTarget.viewBox.baseVal.height;

    // Find closest point on the line
    const closestPoint = points.reduce((prev, curr) => {
      return Math.abs(curr.x - scaledMouseX) < Math.abs(prev.x - scaledMouseX)
        ? curr
        : prev;
    });

    // Check if mouse is close enough to the line point (within 20px radius)
    const distance = Math.sqrt(
      Math.pow(scaledMouseX - closestPoint.x, 2) +
        Math.pow(scaledMouseY - closestPoint.y, 2)
    );

    if (distance <= 25) {
      setHoveredPoint(closestPoint);
    } else {
      setHoveredPoint(null);
    }
  };

  // Handle time period change
  const handleTimeframeChange = (period: string) => {
    setSelectedTimeframe(period);
    setChartLoading(true);
  };

  // Time Period Buttons Component
  const TimePeriodButtons = ({ className = "" }: { className?: string }) => (
    <div className={`flex gap-1 ${className}`}>
      {TIME_PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => handleTimeframeChange(period.value)}
          className={`px-2 py-1 rounded-md text-xs font-satoshi transition-colors ${
            selectedTimeframe === period.value
              ? "bg-[#E2AF19] text-black font-semibold"
              : "bg-[#2C2C2C] text-white hover:bg-[#3C3C3C]"
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );

  // Enhanced Chart Component
  const EnhancedChart = ({
    width = 800, // Back to original
    height = 240, // Back to original
    className = "",
    showXAxisLabels = true,
  }: {
    width?: number;
    height?: number;
    className?: string;
    showXAxisLabels?: boolean;
  }) => {
    if (chartLoading) {
      return (
        <div className={`h-80 flex items-center justify-center ${className}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19]"></div>
        </div>
      );
    }

    if (!chartData || chartData.prices.length === 0) {
      return (
        <div className={`h-80 flex items-center justify-center ${className}`}>
          <p className="text-gray-400 font-satoshi">No chart data available</p>
        </div>
      );
    }

    const { path, areaPath, points, yAxisValues, xAxisLabels } =
      generateInteractiveChart(chartData.prices, width, height);

    return (
      <div className={`relative ${className}`}>
        <div className="relative h-80 mb-6 flex">
          {/* Y-axis labels */}
          <div className="w-20 flex flex-col justify-between py-2 pr-3">
            {yAxisValues.map((yAxis, index) => (
              <div
                key={index}
                className="text-sm text-gray-400 font-satoshi text-right"
              >
                ${yAxis.value.toFixed(2)}
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col relative">
            {/* Hover Price Display positioned relative to chart area */}
            {hoveredPoint && (
              <div
                className="absolute bg-black bg-opacity-95 border border-[#2C2C2C] rounded-lg p-3 z-20 pointer-events-none shadow-lg"
                style={{
                  left: `${hoveredPoint.x + 20}px`,
                  top: `${Math.max(hoveredPoint.y - 70, 10)}px`,
                  transform:
                    hoveredPoint.x > width - 150
                      ? "translateX(-100%)"
                      : "translateX(0)",
                  marginLeft: hoveredPoint.x > width - 150 ? "-20px" : "0",
                }}
              >
                <div className="text-white font-semibold text-lg whitespace-nowrap">
                  {formatCurrency(hoveredPoint.price)}
                </div>
                <div className="text-gray-400 text-xs whitespace-nowrap">
                  {hoveredPoint.date} {hoveredPoint.time}
                </div>
              </div>
            )}

            <svg
              className="w-full flex-1 cursor-crosshair"
              viewBox={`0 0 ${width} ${height}`}
              onMouseMove={(e) => {
                const svgRect = e.currentTarget.getBoundingClientRect();
                handleChartMouseMove(e, points, svgRect);
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
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
                      tokenInfo?.priceData?.price_change_percentage_24h >= 0
                        ? "rgba(34, 197, 94, 0.4)"
                        : "rgba(239, 68, 68, 0.4)"
                    }
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      tokenInfo?.priceData?.price_change_percentage_24h >= 0
                        ? "rgba(34, 197, 94, 0.0)"
                        : "rgba(239, 68, 68, 0.0)"
                    }
                  />
                </linearGradient>
              </defs>

              {/* Enhanced Grid lines */}
              {[0, height / 4, height / 2, (3 * height) / 4, height].map(
                (y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="#2C2C2C"
                    strokeWidth="0.5"
                    opacity="0.6"
                  />
                )
              )}
              {xAxisLabels.map((label) => (
                <line
                  key={label.x}
                  x1={label.x}
                  y1="0"
                  x2={label.x}
                  y2={height}
                  stroke="#2C2C2C"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              ))}

              {/* Filled area */}
              <path d={areaPath} fill="url(#priceGradient)" />

              {/* Price line with increased stroke width for better hover detection */}
              <path
                d={path}
                fill="none"
                stroke={
                  tokenInfo?.priceData?.price_change_percentage_24h >= 0
                    ? "#22C55E"
                    : "#EF4444"
                }
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Invisible wider line for easier hover detection */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: "stroke" }}
              />

              {/* Hover effects */}
              {hoveredPoint && (
                <>
                  {/* Vertical line */}
                  <line
                    x1={hoveredPoint.x}
                    y1="0"
                    x2={hoveredPoint.x}
                    y2={height}
                    stroke="#E2AF19"
                    strokeWidth="1.5"
                    strokeDasharray="6,6"
                  />
                  {/* Hover dot */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="6"
                    fill="#E2AF19"
                    stroke="#000"
                    strokeWidth="2"
                  />
                </>
              )}
            </svg>

            {/* X-axis labels - Hidden when showXAxisLabels is false */}
            {showXAxisLabels && (
              <div className="relative h-8 mt-2">
                {xAxisLabels.map((label, index) => (
                  <div
                    key={index}
                    className="absolute text-xs text-gray-400 font-satoshi transform -translate-x-1/2 whitespace-nowrap"
                    style={{
                      left: `${(label.x / width) * 100}%`,
                      top: "0px",
                    }}
                  >
                    {label.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // FIXED: Proper token filter for transaction history
  const getTokenFilterForTransactions = () => {
    if (!tokenInfo) return undefined;

    // For ETH (native token), use "ETH" as the filter instead of contract address
    if (tokenInfo.contractAddress === "native" || tokenInfo.symbol === "ETH") {
      return "ETH"; // This will filter for ETH transactions specifically
    }

    // For ERC20 tokens, use the contract address
    return tokenInfo.contractAddress;
  };

  // FIXED: Get transaction type filter
  const getTransactionTypeFilter = () => {
    if (!tokenInfo) return undefined;

    // For ETH, filter by ETH transaction types
    if (tokenInfo.contractAddress === "native" || tokenInfo.symbol === "ETH") {
      return "simple_eth"; // This will show only ETH transactions
    }

    // For ERC20 tokens, filter by ERC20 transaction types
    return "simple_erc20"; // This will show only ERC20 transactions
  };

  if (loading) {
    return <SkeletonTokenOverview />;
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
    <>
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-2 sm:p-3 lg:p-4 flex flex-col overflow-hidden">
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
                <div
                  className={`w-10 h-10 ${getRandomTokenBg(
                    tokenInfo.symbol
                  )} rounded-full mr-3 flex items-center justify-center p-1`}
                >
                  <img
                    src={tokenInfo.priceData.image}
                    alt={tokenInfo.symbol}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                </div>
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

            {/* Price Information with Time Period Buttons - Mobile */}
            {tokenInfo.priceData && (
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                  <div className="text-2xl sm:text-3xl font-bold text-white font-satoshi">
                    {formatCurrency(tokenInfo.priceData.current_price)}
                  </div>
                  <TimePeriodButtons className="flex-shrink-0" />
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
              </div>
            )}
          </div>

          {/* Enhanced Price Chart - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            {/* Contract Address - Mobile */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Price Chart
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-satoshi">
                  {tokenInfo.contractAddress === "native"
                    ? "Native Token"
                    : `${tokenInfo.contractAddress.slice(
                        0,
                        6
                      )}...${tokenInfo.contractAddress.slice(-4)}`}
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

            <EnhancedChart
              width={400}
              height={200}
              className="h-60"
              showXAxisLabels={false}
            />
          </div>

          {/* Portfolio Section - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-white font-semibold font-mayeka-demi-bold-demo">
                  {tokenInfo.name}
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
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className={`font-satoshi ${
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
                  </div>
                  <div className="text-gray-400 font-satoshi">
                    {tokenBalance.toFixed(6)} {tokenInfo.symbol}
                  </div>
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
              <button
                onClick={() => setQrModalOpen(true)}
                className="bg-[#4B3A08] text-[#E2AF19] p-3 rounded-xl hover:bg-[#5A4509] transition-colors"
              >
                <QrCode size={16} />
              </button>
            </div>
          </div>

          {/* About Token and Links - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            {/* Official Links at Top - Mobile */}
            {tokenInfo.priceData && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {tokenInfo.priceData.homepage && (
                  <a
                    href={tokenInfo.priceData.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                  >
                    <Globe size={14} className="mr-2" />
                    Website
                  </a>
                )}
                {tokenInfo.priceData.whitepaper && (
                  <a
                    href={tokenInfo.priceData.whitepaper}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                  >
                    <FileText size={14} className="mr-2" />
                    Whitepaper
                  </a>
                )}
                {tokenInfo.priceData.twitter_screen_name && (
                  <a
                    href={`https://twitter.com/${tokenInfo.priceData.twitter_screen_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                  >
                    <Twitter size={14} className="mr-2" />
                    Twitter
                  </a>
                )}
                {tokenInfo.priceData.telegram_channel && (
                  <a
                    href={`https://t.me/${tokenInfo.priceData.telegram_channel}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                  >
                    <MessageCircle size={14} className="mr-2" />
                    Telegram
                  </a>
                )}
                {tokenInfo.priceData.blockchain_site && (
                  <a
                    href={tokenInfo.priceData.blockchain_site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Explorer
                  </a>
                )}
              </div>
            )}

            {/* About Section - Mobile */}
            <h3 className="text-lg font-semibold text-white mb-3 font-mayeka-demi-bold-demo">
              About {tokenInfo.name}
            </h3>
            {tokenInfo.priceData?.description ? (
              <p className="text-gray-400 text-sm leading-relaxed font-satoshi mb-4">
                {tokenInfo.priceData.description}
              </p>
            ) : (
              <p className="text-gray-400 text-sm leading-relaxed font-satoshi mb-4">
                {tokenInfo.symbol === "ETH" ? (
                  <>
                    Ethereum is a global, open-source platform for decentralized
                    applications. In other words, the vision is to create a
                    world computer that anyone can build applications in a
                    decentralized manner; while all states and data are
                    distributed and publicly accessible.
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

          {/* Transaction History - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <div className="max-h-64 overflow-y-auto">
              <TransactionHistory
                walletAddress={walletAddress}
                tokenFilter={getTokenFilterForTransactions()}
                transactionTypeFilter={getTransactionTypeFilter()}
                limit={20}
                showFilter={false}
                compact={true}
                className="min-h-0"
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-6 flex-1 min-h-0">
          {/* Left Column - Main Info - MAIN SECTION */}
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
                        <div
                          className={`w-12 h-12 ${getRandomTokenBg(
                            tokenInfo.symbol
                          )} rounded-full mr-4 flex items-center justify-center p-1`}
                        >
                          <img
                            src={tokenInfo.priceData.image}
                            alt={tokenInfo.symbol}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
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

                    {/* Price Information - Desktop */}
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

                  {/* Contract Address - Desktop */}
                  <div className="text-right">
                    <div className="text-white text-sm font-satoshi mb-1">
                      Contract Address
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
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
                            copyToClipboard(
                              tokenInfo.contractAddress,
                              "contract"
                            )
                          }
                          className="hover:text-white transition-colors"
                        >
                          <Copy size={16} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                    {/* Time Period Buttons below contract address */}
                    <TimePeriodButtons />
                  </div>
                </div>

                {/* Enhanced Chart Section - Desktop */}
                <div className="mb-6">
                  <EnhancedChart
                    width={800}
                    height={240}
                    showXAxisLabels={false}
                  />
                </div>

                {/* Market Stats - Desktop */}
                {tokenInfo.priceData && (
                  <div className="flex items-center justify-between w-full text-sm my-6">
                    <div className="bg-[#2C2C2C] px-4 py-3 rounded-full">
                      <span className="text-white font-satoshi">FDV</span>
                      <span className="text-gray-400 ml-2 font-satoshi">
                        {formatLargeNumber(tokenInfo.priceData.market_cap * 2)}
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
                    <div
                      className="bg-[#2C2C2C] px-4 py-3 rounded-full cursor-pointer hover:bg-[#3C3C3C] transition-colors"
                      onClick={() => {
                        if (tokenInfo.priceData?.blockchain_site) {
                          window.open(
                            tokenInfo.priceData.blockchain_site,
                            "_blank"
                          );
                        }
                      }}
                    >
                      <span className="text-white font-satoshi flex items-center">
                        EXPLORER
                        <ExternalLink size={14} className="ml-2" />
                      </span>
                    </div>
                  </div>
                )}
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
                        className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                      >
                        <Globe size={14} className="mr-2" />
                        Website
                      </a>
                    )}
                    {tokenInfo.priceData.whitepaper && (
                      <a
                        href={tokenInfo.priceData.whitepaper}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                      >
                        <FileText size={14} className="mr-2" />
                        Whitepaper
                      </a>
                    )}
                    {tokenInfo.priceData.twitter_screen_name && (
                      <a
                        href={`https://twitter.com/${tokenInfo.priceData.twitter_screen_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                      >
                        <Twitter size={14} className="mr-2" />
                        Twitter
                      </a>
                    )}
                    {tokenInfo.priceData.telegram_channel && (
                      <a
                        href={`https://t.me/${tokenInfo.priceData.telegram_channel}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                      >
                        <MessageCircle size={14} className="mr-2" />
                        Telegram
                      </a>
                    )}
                    {tokenInfo.priceData.blockchain_site && (
                      <a
                        href={tokenInfo.priceData.blockchain_site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-sm"
                      >
                        <ExternalLink size={14} className="mr-2" />
                        Explorer
                      </a>
                    )}
                  </div>
                )}

                {/* About Section */}
                <h3 className="text-lg font-semibold text-white mb-4 font-mayeka-demi-bold-demo">
                  About {tokenInfo.name}
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
                        decentralized applications. In other words, the vision
                        is to create a world computer that anyone can build
                        applications in a decentralized manner; while all states
                        and data are distributed and publicly accessible.
                      </>
                    ) : (
                      <>
                        {tokenInfo.name} is a cryptocurrency token that provides
                        various utilities and features within its ecosystem. It
                        enables users to participate in the network's
                        governance, facilitate transactions, and access various
                        decentralized applications and services.
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Portfolio Section */}
          <div className="w-[480px] flex-shrink-0 h-full">
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] h-full flex flex-col p-6">
              {/* Portfolio Header */}
              <div className="flex items-center mb-6">
                <span className="text-white font-semibold font-mayeka-demi-bold-demo">
                  {tokenInfo.name}
                </span>
              </div>

              {/* Portfolio Value */}
              <div className="bg-[#000000] rounded-[16px] border border-[#2C2C2C] p-6 mb-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="text-white font-satoshi">
                    {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(walletAddress!, "wallet")}
                    className="hover:text-white transition-colors"
                  >
                    <Copy size={16} className="text-gray-400" />
                  </button>
                </div>

                {/* Token Banner Image and Value in same row */}
                <div className="flex items-center gap-6 mb-6">
                  {/* Token Banner Image */}
                  <div className="flex-shrink-0">
                    <div
                      className={`${getRandomTokenBg(
                        tokenInfo.symbol
                      )} rounded-lg p-2 border border-[#2C2C2C]`}
                    >
                      {tokenInfo.priceData?.image ? (
                        <img
                          src={tokenInfo.priceData.image}
                          alt={tokenInfo.symbol}
                          className="rounded-md object-cover"
                          style={{
                            width: "70px",
                            height: "65px",
                            transform: "rotate(0deg)",
                            opacity: 1,
                          }}
                        />
                      ) : (
                        <img
                          src="/tokenIconBanner.png"
                          alt="Token Banner"
                          className="rounded-md"
                          style={{
                            width: "70px",
                            height: "65px",
                            transform: "rotate(0deg)",
                            opacity: 1,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Value and percentage */}
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-white mb-2 font-satoshi">
                      {formatCurrency(tokenValue)}
                    </div>
                    {/* Percentage and token amount in same row */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`font-satoshi ${
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
                      </div>
                      <div className="text-gray-400 font-satoshi">
                        {tokenBalance.toFixed(6)} {tokenInfo.symbol}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setTransferModalOpen(true)}
                    className="flex-1 bg-[#E2AF19] text-black font-semibold py-3 rounded-xl hover:bg-[#D4A853] transition-colors font-satoshi flex items-center justify-center"
                  >
                    Send
                    <Send fill="#000000" size={16} className="ml-2" />
                  </button>
                  <button
                    onClick={() => setQrModalOpen(true)}
                    className="flex-1 bg-[#E2AF19] text-black py-3 rounded-xl hover:bg-[#E2AF19] transition-colors font-satoshi flex items-center justify-center"
                  >
                    Receive
                    <QrCode size={16} className="ml-2" />
                  </button>
                </div>
              </div>

              {/* Transaction History - Desktop with proper filtering */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                  <TransactionHistory
                    walletAddress={walletAddress}
                    tokenFilter={getTokenFilterForTransactions()}
                    transactionTypeFilter={getTransactionTypeFilter()}
                    limit={50}
                    showFilter={false}
                    compact={true}
                    className="flex-1 min-h-0"
                  />
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

      {/* QR Code Modal */}
      <UserQRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </>
  );
}
