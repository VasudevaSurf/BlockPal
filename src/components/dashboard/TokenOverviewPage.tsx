"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
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
import UserQRCodeModal from "@/components/profile/UserQRCodeModal";
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

const TIME_PERIODS = [
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
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Perfect cursor tracking states
  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [priceData, setPriceData] = useState<{
    price: number;
    date: string;
    time: string;
    y: number;
  } | null>(null);

  // Force clear tooltip function
  const forceClearTooltip = () => {
    setCursorPosition(null);
    setPriceData(null);
  };

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

      const periodConfig = TIME_PERIODS.find((p) => p.value === period);
      if (!periodConfig) {
        createMockChartData(period);
        return;
      }

      const response = await fetch(
        `/api/tokens/chart?tokenId=${tokenInfo.priceData.id}&days=${periodConfig.days}&interval=${periodConfig.interval}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setChartData(data.chartData);
      } else {
        console.error("Failed to fetch chart data");
        createMockChartData(period);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
      createMockChartData(period);
    } finally {
      setChartLoading(false);
    }
  };

  const createMockChartData = (period: string) => {
    const basePrice = tokenInfo?.priceData?.current_price || 2400;
    const prices = [];
    const now = Date.now();
    let dataPoints = 24;
    let timeInterval = 60 * 60 * 1000;

    switch (period) {
      case "1D":
        dataPoints = 24; // 24 hours
        timeInterval = 60 * 60 * 1000; // 1 hour intervals
        break;
      case "1W":
        dataPoints = 7; // 7 days
        timeInterval = 24 * 60 * 60 * 1000; // 1 day intervals
        break;
      case "1M":
        dataPoints = 30; // 30 days
        timeInterval = 24 * 60 * 60 * 1000; // 1 day intervals
        break;
      case "1Y":
        dataPoints = 12; // 12 months
        timeInterval = 30 * 24 * 60 * 60 * 1000; // ~1 month intervals
        break;
      default:
        dataPoints = 24;
        timeInterval = 60 * 60 * 1000;
        break;
    }

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = (now - (dataPoints - i - 1) * timeInterval) / 1000;
      const date = new Date(timestamp * 1000);

      // Create realistic price movements based on timeframe
      let volatility = 0.02;
      switch (period) {
        case "1D":
          volatility = 0.015;
          break;
        case "1W":
          volatility = 0.03;
          break;
        case "1M":
          volatility = 0.05;
          break;
        case "1Y":
          volatility = 0.08;
          break;
      }

      const trend = Math.sin(i * 0.1) * 0.001;
      const randomWalk = (Math.random() - 0.5) * volatility;

      const priceChange = i === 0 ? 0 : trend + randomWalk;
      const price =
        i === 0 ? basePrice : prices[i - 1].price * (1 + priceChange);

      prices.push({
        timestamp,
        price: Math.max(0, price),
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
      });
    }

    setChartData({
      prices,
      timeframe: dataPoints,
    });
  };

  const generateXAxisLabels = (
    prices: Array<{ timestamp: number; date: string; time: string }>,
    period: string,
    chartWidth: number = 600
  ) => {
    if (!prices || prices.length === 0) return [];

    const labels = [];
    const totalPoints = prices.length;
    const maxLabels = 4;
    const skipInterval = Math.max(1, Math.floor(totalPoints / (maxLabels - 1)));

    for (let i = 0; i < totalPoints; i += skipInterval) {
      const index = Math.min(i, totalPoints - 1);
      const point = prices[index];
      const date = new Date(point.timestamp * 1000);
      let label = "";

      switch (period) {
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

    if (
      labels.length > 0 &&
      labels[labels.length - 1].index !== totalPoints - 1
    ) {
      const lastPoint = prices[totalPoints - 1];
      const lastDate = new Date(lastPoint.timestamp * 1000);
      let lastLabel = "";

      switch (period) {
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
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return `${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // Improved Y-axis generation following the 7-step strategy
  const generateYAxisValues = (
    prices,
    height,
    chartMin,
    chartMax,
    paddedRange
  ) => {
    if (!prices || prices.length === 0) return [];

    // Step 1: Find the actual price range
    const minPrice = Math.min(...prices.map((p) => p.price));
    const maxPrice = Math.max(...prices.map((p) => p.price));
    const priceRange = maxPrice - minPrice || 1;

    // Step 2: Decide how many horizontal lines to show (5 is optimal)
    const targetLines = 5;

    // Step 3: Calculate a nice "step" between each price line
    const calculateNiceStep = (range, targetSteps) => {
      const rawStep = range / (targetSteps - 1);

      // Find the magnitude (power of 10)
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));

      // Normalize to get a number between 1-10
      const normalized = rawStep / magnitude;

      // Choose nice round numbers: 1, 2, 5, or 10
      let niceNormalized;
      if (normalized <= 1) niceNormalized = 1;
      else if (normalized <= 2) niceNormalized = 2;
      else if (normalized <= 5) niceNormalized = 5;
      else niceNormalized = 10;

      return niceNormalized * magnitude;
    };

    const step = calculateNiceStep(priceRange, targetLines);

    // Step 4: Pick a starting price for the top line (round up maxPrice to nearest step)
    const topPrice = Math.ceil(maxPrice / step) * step;

    // Step 5: Create the list of price labels by subtracting the step
    const yAxisValues = [];
    let currentPrice = topPrice;

    // Generate labels from top to bottom
    while (currentPrice >= minPrice - step) {
      // Step 6 & 7: Calculate Y position and add to array
      const normalizedValue = (currentPrice - chartMin) / paddedRange;
      const y = height - normalizedValue * height;

      // Only include values that are within reasonable chart bounds
      if (y >= -10 && y <= height + 10) {
        yAxisValues.push({
          value: currentPrice,
          y: Math.max(0, Math.min(height, y)), // Clamp to chart bounds
        });
      }

      currentPrice -= step;
    }

    return yAxisValues;
  };

  // Improved formatting function for Y-axis labels
  const formatYAxisValue = (value) => {
    // Handle very small values (crypto tokens)
    if (Math.abs(value) < 0.001) {
      return value.toFixed(6).replace(/\.?0+$/, "");
    }
    // Small values
    else if (Math.abs(value) < 1) {
      return value.toFixed(4).replace(/\.?0+$/, "");
    }
    // Medium values - show appropriate decimals
    else if (Math.abs(value) < 100) {
      // For values like 1.5, 2.0, 45.25 etc
      const decimals = value % 1 === 0 ? 0 : 2;
      return value.toFixed(decimals);
    }
    // Larger values - minimal decimals
    else if (Math.abs(value) < 10000) {
      const decimals = value % 1 === 0 ? 0 : 1;
      return value.toFixed(decimals);
    }
    // Very large values - use K/M notation
    else if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    }

    return Math.round(value).toLocaleString();
  };

  const generateInteractiveChart = (
    prices: Array<{ price: number; date: string; time: string }>,
    width = 600,
    height = 170,
    isMobile = false
  ) => {
    if (!prices || prices.length === 0)
      return {
        path: "",
        areaPath: "",
        points: [],
        yAxisValues: [],
        xAxisLabels: [],
      };

    const minPrice = Math.min(...prices.map((p) => p.price));
    const maxPrice = Math.max(...prices.map((p) => p.price));
    const priceRange = maxPrice - minPrice || 1;

    // Add padding to prevent chart from touching edges
    const paddingPercent = 0.05; // 5% padding on top and bottom
    const paddedRange = priceRange * (1 + 2 * paddingPercent);
    const chartMin = minPrice - priceRange * paddingPercent;
    const chartMax = maxPrice + priceRange * paddingPercent;

    // Use the improved Y-axis generation
    const yAxisValues = generateYAxisValues(
      prices,
      height,
      chartMin,
      chartMax,
      paddedRange
    );

    const xAxisLabels = generateXAxisLabels(
      prices.map((p, i) => ({
        timestamp: Date.now() / 1000 - (prices.length - i - 1) * 3600,
        date: p.date,
        time: p.time,
      })),
      selectedTimeframe,
      width
    );

    // Map chart points using the same coordinate system as Y-axis
    const points = prices.map((point, index) => {
      const x = (index / (prices.length - 1)) * width;
      // Use the same transformation as Y-axis calculation
      const normalizedValue = (point.price - chartMin) / paddedRange;
      const y = height - normalizedValue * height;

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
    const areaPath = `${path} L ${width},${height} L 0,${height} Z`;

    return { path, areaPath, points, yAxisValues, xAxisLabels };
  };

  // Perfect cursor tracking implementation
  const handleChartMouseMove = (
    event: React.MouseEvent<SVGSVGElement>,
    points: Array<{
      x: number;
      y: number;
      price: number;
      date: string;
      time: string;
    }>
  ) => {
    const svgElement = event.currentTarget;
    const rect = svgElement.getBoundingClientRect();

    // Get mouse coordinates relative to SVG
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert to SVG coordinate system
    const viewBox = svgElement.viewBox.baseVal;
    const svgX = (mouseX / rect.width) * viewBox.width;
    const svgY = (mouseY / rect.height) * viewBox.height;

    // Check if mouse is within chart bounds
    const isWithinBounds =
      mouseX >= 0 &&
      mouseX <= rect.width &&
      mouseY >= 0 &&
      mouseY <= rect.height;

    if (isWithinBounds && points && points.length > 0) {
      // Update cursor position
      setCursorPosition({ x: svgX, y: svgY });

      // Find the closest data point
      const progress = Math.max(0, Math.min(1, svgX / viewBox.width));
      const exactIndex = progress * (points.length - 1);
      const index = Math.round(exactIndex);

      // Get the point at this index
      const point = points[Math.max(0, Math.min(points.length - 1, index))];

      if (point) {
        setPriceData({
          price: point.price,
          date: point.date,
          time: point.time,
          y: point.y,
        });
      }
    } else {
      // Clear states when outside bounds
      setCursorPosition(null);
      setPriceData(null);
    }
  };

  const handleMouseLeave = () => {
    // Immediately clear all states when mouse leaves
    forceClearTooltip();
  };

  const handleMouseEnter = () => {
    // Clear states when entering to ensure clean start
    forceClearTooltip();
  };

  const handleTimeframeChange = (period: string) => {
    setSelectedTimeframe(period);
    setChartLoading(true);
  };

  const TimePeriodButtons = ({ className = "" }: { className?: string }) => (
    <div className={`flex gap-1 ${className}`}>
      {TIME_PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => handleTimeframeChange(period.value)}
          className={`px-1.5 py-0.5 rounded-md text-xs font-satoshi transition-colors ${
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

  const EnhancedChart = ({
    width = 550,
    height = 170,
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
        <div className={`h-48 flex items-center justify-center ${className}`}>
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#E2AF19]"></div>
        </div>
      );
    }

    if (!chartData || chartData.prices.length === 0) {
      return (
        <div className={`h-48 flex items-center justify-center ${className}`}>
          <p className="text-gray-400 font-satoshi text-sm">
            No chart data available
          </p>
        </div>
      );
    }

    const { path, areaPath, points, yAxisValues, xAxisLabels } =
      generateInteractiveChart(chartData.prices, width, height);

    const gradientId = "goldGradient-stable";

    return (
      <div className={`relative ${className}`}>
        <div className="relative h-48 mb-3 flex">
          <div
            className="flex-1 flex flex-col relative"
            onMouseLeave={handleMouseLeave}
          >
            {/* Price Tooltip */}
            {priceData && cursorPosition && (
              <div
                className="absolute bg-black bg-opacity-95 border border-[#2C2C2C] rounded-lg p-2 z-20 pointer-events-none shadow-lg"
                style={{
                  left:
                    cursorPosition.x > width - 140
                      ? Math.max(5, cursorPosition.x - 140)
                      : Math.max(5, cursorPosition.x + 15),
                  top: Math.max(
                    5,
                    Math.min(height - 70, cursorPosition.y - 35)
                  ),
                }}
              >
                <div className="text-white font-semibold text-sm whitespace-nowrap">
                  {formatCurrency(priceData.price)}
                </div>
                <div className="text-gray-400 text-xs whitespace-nowrap">
                  {priceData.date} {priceData.time}
                </div>
              </div>
            )}

            <svg
              className="w-full flex-1 cursor-crosshair"
              viewBox={`0 0 ${width} ${height}`}
              onMouseMove={(e) => handleChartMouseMove(e, points)}
              onMouseLeave={handleMouseLeave}
              onMouseEnter={handleMouseEnter}
              style={{ overflow: "visible" }}
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#FFD700" stopOpacity="0.7" />
                  <stop offset="20%" stopColor="#FFD700" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#FFED4E" stopOpacity="0.5" />
                  <stop offset="60%" stopColor="#FFED4E" stopOpacity="0.4" />
                  <stop offset="80%" stopColor="#FFF59D" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FFF59D" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width={width} height={height} fill="#000000" />
              <rect x="0" y="0" width={width} height={height} fill="#050505" />
              <path d={areaPath} fill={`url(#${gradientId})`} opacity="1" />
              <path d={areaPath} fill="#FFD700" opacity="0.08" />
              <path
                d={path}
                fill="none"
                stroke="#FFD700"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Crosshair */}
              {cursorPosition && (
                <g>
                  <line
                    x1={cursorPosition.x}
                    y1={0}
                    x2={cursorPosition.x}
                    y2={height}
                    stroke="#FFD700"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    opacity="0.9"
                  />

                  {priceData && (
                    <>
                      <line
                        x1={0}
                        y1={priceData.y}
                        x2={width}
                        y2={priceData.y}
                        stroke="#FFD700"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                        opacity="0.9"
                      />
                      <circle
                        cx={cursorPosition.x}
                        cy={priceData.y}
                        r="5"
                        fill="#FFD700"
                        stroke="#000"
                        strokeWidth="2"
                        opacity="1"
                      />
                    </>
                  )}
                </g>
              )}
            </svg>

            {showXAxisLabels && (
              <div className="relative h-5 mt-1.5">
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

          {/* Fixed Y-axis labels container */}
          <div
            className="w-10 sm:w-12 md:w-14 relative pl-1 sm:pl-1.5 md:pl-2 flex-shrink-0"
            style={{ height: `${height}px` }}
          >
            {yAxisValues.map((yAxis, index) => {
              const formattedValue = formatYAxisValue(yAxis.value);

              return (
                <div
                  key={index}
                  className="absolute text-[10px] sm:text-xs text-gray-400 font-satoshi text-left whitespace-nowrap"
                  style={{
                    top: `${yAxis.y}px`,
                    transform: "translateY(-50%)",
                  }}
                >
                  ${formattedValue}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const getTokenFilterForTransactions = () => {
    if (!tokenInfo) return undefined;

    if (tokenInfo.contractAddress === "native" || tokenInfo.symbol === "ETH") {
      return "ETH";
    }

    return tokenInfo.contractAddress;
  };

  const getTransactionTypeFilter = () => {
    if (!tokenInfo) return undefined;

    if (tokenInfo.contractAddress === "native" || tokenInfo.symbol === "ETH") {
      return "simple_eth";
    }

    return "simple_erc20";
  };

  if (loading) {
    return <SkeletonTokenOverview />;
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

  const tokenBalance = parseFloat(tokenInfo.balance);
  const tokenValue = tokenBalance * (tokenInfo.priceData?.current_price || 0);

  return (
    <>
      <div
        className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[14px] p-1.5 sm:p-2 lg:p-2.5 flex flex-col overflow-hidden"
        onMouseMove={(e) => {
          // Global mouse tracking - clear tooltip if not over chart
          const target = e.target as HTMLElement;
          const isOverChart = target.closest(".chart-container");
          if (!isOverChart && (cursorPosition || priceData)) {
            forceClearTooltip();
          }
        }}
      >
        <div
          className="flex flex-col xl:hidden gap-2.5 flex-1 min-h-0 overflow-y-auto scrollbar-hide"
          onMouseEnter={forceClearTooltip}
        >
          <div
            className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0"
            onMouseEnter={forceClearTooltip}
          >
            <div className="flex items-center mb-2.5">
              {tokenInfo.priceData?.image ? (
                <div
                  className={`w-7 h-7 rounded-full mr-2.5 flex items-center justify-center p-0.5`}
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
                className={`w-7 h-7 ${getTokenIcon(
                  tokenInfo.symbol
                )} rounded-full mr-2.5 flex items-center justify-center ${
                  tokenInfo.priceData?.image ? "hidden" : ""
                }`}
              >
                <span className="text-white text-sm font-bold">
                  {getTokenLetter(tokenInfo.symbol)}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-mayeka">
                  {tokenInfo.name}
                </h2>
                <p className="text-gray-400 text-xs font-satoshi">
                  {tokenInfo.symbol}
                </p>
              </div>
            </div>

            {tokenInfo.priceData && (
              <div className="mb-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className="text-xl sm:text-2xl font-bold text-white font-satoshi">
                      {formatCurrency(tokenInfo.priceData.current_price)}
                    </div>
                    <div className="flex items-center">
                      {tokenInfo.priceData.price_change_percentage_24h >= 0 ? (
                        <TrendingUp size={13} className="text-green-400 mr-1" />
                      ) : (
                        <TrendingDown size={13} className="text-red-400 mr-1" />
                      )}
                      <span
                        className={`text-xs font-satoshi ${
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
                  <TimePeriodButtons className="flex-shrink-0" />
                </div>
              </div>
            )}
          </div>

          <div
            className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0"
            onMouseEnter={forceClearTooltip}
          >
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="text-base font-semibold text-white font-satoshi">
                Price Chart
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-satoshi">
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
                    <Copy size={11} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <EnhancedChart
              width={290}
              height={150}
              className="h-44"
              showXAxisLabels={false}
            />
          </div>

          <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center">
                <span className="text-white font-semibold font-mayeka-demi-bold-demo">
                  {tokenInfo.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-satoshi">
                  {walletAddress?.slice(0, 7)}...{walletAddress?.slice(-5)}
                </span>
                <button
                  onClick={() => copyToClipboard(walletAddress!, "wallet")}
                  className="hover:text-white transition-colors"
                >
                  <Copy size={11} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2.5">
              <div>
                <div className="text-xl font-bold text-white mb-0.5 font-satoshi">
                  {formatCurrency(tokenValue)}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
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

            <div className="flex gap-2">
              <button
                onClick={() => setTransferModalOpen(true)}
                className="flex-1 bg-[#E2AF19] text-black font-semibold py-2 rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi"
              >
                Send {tokenInfo.symbol}
              </button>
              <button
                onClick={() => setQrModalOpen(true)}
                className="bg-[#4B3A08] text-[#E2AF19] p-2 rounded-lg hover:bg-[#5A4509] transition-colors"
              >
                <QrCode size={13} />
              </button>
            </div>
          </div>

          <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
            {tokenInfo.priceData && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {tokenInfo.priceData.homepage && (
                  <a
                    href={tokenInfo.priceData.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                  >
                    <Globe size={11} className="mr-1.5" />
                    Website
                  </a>
                )}
                {tokenInfo.priceData.whitepaper && (
                  <a
                    href={tokenInfo.priceData.whitepaper}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                  >
                    <FileText size={11} className="mr-1.5" />
                    Whitepaper
                  </a>
                )}
                {tokenInfo.priceData.twitter_screen_name && (
                  <a
                    href={`https://twitter.com/${tokenInfo.priceData.twitter_screen_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                  >
                    <Twitter size={11} className="mr-1.5" />
                    Twitter
                  </a>
                )}
                {tokenInfo.priceData.telegram_channel && (
                  <a
                    href={`https://t.me/${tokenInfo.priceData.telegram_channel}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                  >
                    <MessageCircle size={11} className="mr-1.5" />
                    Telegram
                  </a>
                )}
                {tokenInfo.priceData.blockchain_site && (
                  <a
                    href={tokenInfo.priceData.blockchain_site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                  >
                    <ExternalLink size={11} className="mr-1.5" />
                    Explorer
                  </a>
                )}
              </div>
            )}

            <h3 className="text-base font-semibold text-white mb-2 font-mayeka-demi-bold-demo">
              About {tokenInfo.name}
            </h3>
            {tokenInfo.priceData?.description ? (
              <p className="text-gray-400 text-xs leading-relaxed font-satoshi mb-2.5">
                {tokenInfo.priceData.description}
              </p>
            ) : (
              <p className="text-gray-400 text-xs leading-relaxed font-satoshi mb-2.5">
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

          <div
            className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0"
            onMouseEnter={forceClearTooltip}
          >
            <div className="max-h-44 overflow-y-auto scrollbar-hide">
              <TransactionHistory
                walletAddress={walletAddress}
                tokenFilter={getTokenFilterForTransactions()}
                transactionTypeFilter={getTransactionTypeFilter()}
                limit={20}
                showFilter={false}
                compact={true}
                className="min-h-0"
                isTokenOverview={true}
              />
            </div>
          </div>
        </div>

        <div
          className="hidden xl:flex gap-3 flex-1 min-h-0"
          onMouseEnter={forceClearTooltip}
        >
          <div className="flex-1 flex flex-col gap-3 min-w-0 max-h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
              <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3.5 flex-shrink-0">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center">
                    {tokenInfo.priceData?.image ? (
                      <div
                        className={`w-9 h-9
                         rounded-full mr-2.5 flex items-center justify-center p-0.5`}
                      >
                        <img
                          src={tokenInfo.priceData.image}
                          alt={tokenInfo.symbol}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-9 h-9 ${getTokenIcon(
                          tokenInfo.symbol
                        )} rounded-full mr-2.5 flex items-center justify-center`}
                      >
                        <span className="text-white text-lg font-bold">
                          {getTokenLetter(tokenInfo.symbol)}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-row items-center justify-center space-x-2">
                      <h2 className="text-xl font-bold text-white font-mayeka">
                        {tokenInfo.name}
                      </h2>
                      <p className="text-gray-400 font-satoshi mt-1">
                        {tokenInfo.symbol}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-white text-xs font-satoshi mb-0.5">
                      Contract Address
                    </div>
                    <div className="flex items-center space-x-1.5 mb-2 justify-end">
                      <span className="text-gray-400 text-xs font-satoshi">
                        {tokenInfo.contractAddress === "native"
                          ? "Native Token"
                          : `${tokenInfo.contractAddress.slice(
                              0,
                              9
                            )}...${tokenInfo.contractAddress.slice(-7)}`}
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
                          <Copy size={13} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {tokenInfo.priceData && (
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center space-x-3.5">
                      <div className="text-3xl font-bold text-white font-satoshi">
                        {formatCurrency(tokenInfo.priceData.current_price)}
                      </div>
                      <div
                        className={`text-base font-satoshi flex items-center ${
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
                    <TimePeriodButtons />
                  </div>
                )}

                <div className="mb-7">
                  <div className="chart-container">
                    <EnhancedChart
                      width={550}
                      height={170}
                      showXAxisLabels={false}
                    />
                  </div>
                </div>

                {tokenInfo.priceData && (
                  <div className="flex items-center justify-between w-full text-xs mt-13.5">
                    <div className="bg-[#2C2C2C] px-2.5 py-2 rounded-full">
                      <span className="text-white font-satoshi">FDV</span>
                      <span className="text-gray-400 ml-1.5 font-satoshi">
                        {formatLargeNumber(tokenInfo.priceData.market_cap * 2)}
                      </span>
                    </div>
                    <div className="bg-[#2C2C2C] px-2.5 py-2 rounded-full">
                      <span className="text-white font-satoshi">
                        MARKET CAP
                      </span>
                      <span className="text-gray-400 ml-1.5 font-satoshi">
                        {formatLargeNumber(tokenInfo.priceData.market_cap)}
                      </span>
                    </div>
                    <div className="bg-[#2C2C2C] px-2.5 py-2 rounded-full">
                      <span className="text-white font-satoshi">
                        24H VOLUME
                      </span>
                      <span className="text-gray-400 ml-1.5 font-satoshi">
                        {formatLargeNumber(tokenInfo.priceData.total_volume)}
                      </span>
                    </div>
                    <div
                      className="bg-[#2C2C2C] px-2.5 py-2 rounded-full cursor-pointer hover:bg-[#3C3C3C] transition-colors"
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
                        <ExternalLink size={11} className="ml-1.5" />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3.5 flex-shrink-0">
                {tokenInfo.priceData && (
                  <div className="flex items-center space-x-2.5 mb-3.5">
                    {tokenInfo.priceData.homepage && (
                      <a
                        href={tokenInfo.priceData.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                      >
                        <Globe size={11} className="mr-1.5" />
                        Website
                      </a>
                    )}
                    {tokenInfo.priceData.whitepaper && (
                      <a
                        href={tokenInfo.priceData.whitepaper}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                      >
                        <FileText size={11} className="mr-1.5" />
                        Whitepaper
                      </a>
                    )}
                    {tokenInfo.priceData.twitter_screen_name && (
                      <a
                        href={`https://twitter.com/${tokenInfo.priceData.twitter_screen_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                      >
                        <Twitter size={11} className="mr-1.5" />
                        Twitter
                      </a>
                    )}
                    {tokenInfo.priceData.telegram_channel && (
                      <a
                        href={`https://t.me/${tokenInfo.priceData.telegram_channel}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                      >
                        <MessageCircle size={11} className="mr-1.5" />
                        Telegram
                      </a>
                    )}
                    {tokenInfo.priceData.blockchain_site && (
                      <a
                        href={tokenInfo.priceData.blockchain_site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                      >
                        <ExternalLink size={11} className="mr-1.5" />
                        Explorer
                      </a>
                    )}
                  </div>
                )}

                <h3 className="text-base font-semibold text-white mb-2.5 font-mayeka-demi-bold-demo">
                  About {tokenInfo.name}
                </h3>
                {tokenInfo.priceData?.description ? (
                  <p className="text-gray-400 text-xs leading-relaxed font-satoshi">
                    {tokenInfo.priceData.description}
                  </p>
                ) : (
                  <p className="text-gray-400 text-xs leading-relaxed font-satoshi">
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

          <div
            className="w-[390px] flex-shrink-0 h-full"
            onMouseEnter={forceClearTooltip}
          >
            <div className="bg-black rounded-[14px] border border-[#2C2C2C] h-full flex flex-col p-3">
              <div className="flex items-center mb-3">
                <span className="text-white font-semibold font-mayeka-demi-bold-demo">
                  {tokenInfo.name}
                </span>
              </div>

              <div className="bg-[#000000] rounded-[11px] border border-[#2C2C2C] p-3.5 mb-3">
                <div className="flex items-center gap-3.5 mb-3.5">
                  <div className="flex-shrink-0">
                    <div className={`rounded-lg p-1.5`}>
                      {tokenInfo.priceData?.image ? (
                        <img
                          src={tokenInfo.priceData.image}
                          alt={tokenInfo.symbol}
                          className="rounded-md object-cover"
                          style={{
                            width: "52px",
                            height: "48px",
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
                            width: "48px",
                            height: "44px",
                            transform: "rotate(0deg)",
                            opacity: 1,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="text-xl font-bold text-white mb-1 font-satoshi">
                      {tokenBalance.toFixed(6)} {tokenInfo.symbol}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-gray-400 font-satoshi">
                        = {formatCurrency(tokenValue.toFixed(2))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setTransferModalOpen(true)}
                    className="flex-1 bg-[#E2AF19] text-black font-semibold py-2 rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi flex items-center justify-center"
                  >
                    Send
                    <Send fill="#000000" size={13} className="ml-1.5" />
                  </button>
                  <button
                    onClick={() => setQrModalOpen(true)}
                    className="flex-1 bg-[#E2AF19] text-black font-semibold py-2 rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi flex items-center justify-center"
                  >
                    Receive
                    <QrCode size={13} className="ml-1.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-hide">
                  <TransactionHistory
                    walletAddress={walletAddress}
                    tokenFilter={getTokenFilterForTransactions()}
                    transactionTypeFilter={getTransactionTypeFilter()}
                    limit={50}
                    showFilter={false}
                    compact={true}
                    className="flex-1 min-h-0"
                    isTokenOverview={true}
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

      <UserQRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </>
  );
}
