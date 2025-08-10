// src/components/dashboard/TokenOverviewPage.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { RealtimePriceDisplay } from "@/components/realtime/RealtimePriceService";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

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

interface PricePoint {
  time: Date;
  displayTime: string;
  price: number;
  fullDate: string;
  index: number;
}

const TIME_PERIODS = [
  { label: "1D", value: "1", days: 1 },
  { label: "1W", value: "7", days: 7 },
  { label: "1M", value: "30", days: 30 },
  { label: "1Y", value: "365", days: 365 },
];

export default function TokenOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("7");
  const [allTimeHigh, setAllTimeHigh] = useState<{
    index: number;
    price: number;
  } | null>(null);
  const [allTimeLow, setAllTimeLow] = useState<{
    index: number;
    price: number;
  } | null>(null);
  const [yAxisDomain, setYAxisDomain] = useState<[number, string]>([0, "auto"]);
  const [priceChange, setPriceChange] = useState(0);
  const [copied, setCopied] = useState<string>("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const contractAddress = params.tokenId as string;
  const walletAddress = searchParams.get("wallet") || activeWallet?.address;

  const formatDateForChart = (date: Date, days: number) => {
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
    } else if (days <= 90) {
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    } else {
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    }
  };

  // Fetch token info
  const fetchTokenInfo = useCallback(
    async (showLoader = false) => {
      if (!contractAddress || !walletAddress) return;

      try {
        if (showLoader) setLoading(true);

        const timestamp = Date.now();
        const response = await fetch(
          `/api/tokens/${contractAddress}?walletAddress=${walletAddress}&t=${timestamp}`,
          {
            credentials: "include",
            cache: "no-cache",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }
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
    },
    [contractAddress, walletAddress]
  );

  // Fetch chart data from CoinGecko-style API
  const fetchTokenData = async (days: string) => {
    if (!tokenInfo?.priceData?.id) return;

    setChartLoading(true);
    try {
      const daysNum = parseFloat(days);
      let apiUrl;

      if (daysNum === 365) {
        const to = Math.floor(Date.now() / 1000);
        const from = to - 365 * 24 * 60 * 60;
        apiUrl = `/api/tokens/chart/range?tokenId=${tokenInfo.priceData.id}&from=${from}&to=${to}`;
      } else {
        apiUrl = `/api/tokens/chart?tokenId=${tokenInfo.priceData.id}&days=${days}`;
      }

      const response = await fetch(apiUrl, {
        credentials: "include",
        cache: "no-cache",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.chartData && data.chartData.prices) {
          const processedData = data.chartData.prices;

          const formattedData = processedData.map(
            (point: any, index: number) => ({
              time: new Date(point.timestamp * 1000),
              displayTime: formatDateForChart(
                new Date(point.timestamp * 1000),
                daysNum
              ),
              price: parseFloat(point.price),
              fullDate: new Date(point.timestamp * 1000).toLocaleString(),
              index: index,
            })
          );

          setPriceData(formattedData);

          // Calculate price change percentage
          if (formattedData.length > 0) {
            const firstPrice = formattedData[0].price;
            const lastPrice = formattedData[formattedData.length - 1].price;
            const change = ((lastPrice - firstPrice) / firstPrice) * 100;
            setPriceChange(change);
          }

          // Find high and low
          const prices = formattedData.map((item: PricePoint) => item.price);
          const maxPrice = Math.max(...prices);
          const minPrice = Math.min(...prices);

          // Set Y-axis domain with 10% padding
          const padding = (maxPrice - minPrice) * 0.1;
          setYAxisDomain([Math.max(0, minPrice - padding), maxPrice + padding]);

          const highIndex = formattedData.findIndex(
            (item: PricePoint) => item.price === maxPrice
          );
          const lowIndex = formattedData.findIndex(
            (item: PricePoint) => item.price === minPrice
          );

          setAllTimeHigh({ index: highIndex, price: maxPrice });
          setAllTimeLow({ index: lowIndex, price: minPrice });
        }
      }
    } catch (error) {
      console.error("Error fetching token data:", error);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (contractAddress && walletAddress) {
      fetchTokenInfo(true);
    }
  }, [contractAddress, walletAddress, fetchTokenInfo]);

  useEffect(() => {
    if (tokenInfo?.priceData?.id) {
      fetchTokenData(selectedTimeframe);
    }
  }, [tokenInfo?.priceData?.id, selectedTimeframe]);

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    fetchTokenData(timeframe);
  };

  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (active && payload && payload[0] && coordinate) {
      const currentPrice = payload[0].value;
      const dataIndex = payload[0].payload.index;
      let percentChange = 0;

      if (dataIndex > 0 && priceData.length > 0) {
        const firstPrice = priceData[0].price;
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
            {payload[0].payload.fullDate}
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
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return `${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
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

  // Previous style TimePeriodButtons component with animation
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
                {tokenInfo.priceData?.image ? (
                  <div className="w-7 h-7 rounded-full mr-2.5 flex items-center justify-center p-0.5">
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
            </div>

            {/* Real-time Price Section with TimePeriodButtons */}
            <div className="flex items-end justify-between">
              <RealtimePriceDisplay
                tokenAddress={tokenInfo.contractAddress}
                tokenSymbol={tokenInfo.symbol}
                tokenBalance={parseFloat(tokenInfo.balance)}
                fallbackPrice={tokenInfo.priceData?.current_price || 0}
                fallbackChange={
                  tokenInfo.priceData?.price_change_percentage_24h || 0
                }
                showSparkline={false}
                className="flex-1"
              />
              <TimePeriodButtons className="ml-2" />
            </div>
          </div>

          {/* Compact Uniswap-style Chart for Mobile */}
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
            ) : (
              priceData.length > 0 && (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height={224}>
                    <AreaChart
                      data={priceData}
                      margin={{ top: 2, right: 30, left: -5, bottom: 2 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorGradientMobile"
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

                      <XAxis dataKey="displayTime" hide />

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
                        dataKey="price"
                        stroke="#F7B410"
                        strokeWidth={2}
                        fill="url(#colorGradientMobile)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )
            )}
          </div>

          {/* Balance Section */}
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
                      priceChange >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatPercentage(priceChange)}
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

          {/* Token Links - Removed for mobile to save space */}

          {/* Transaction History */}
          <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
            <div className="max-h-44 overflow-y-auto scrollbar-hide">
              <TransactionHistory
                key={refreshKey}
                walletAddress={walletAddress}
                tokenFilter={getTokenFilterForTransactions()}
                transactionTypeFilter={getTransactionTypeFilter()}
                limit={20}
                showFilter={false}
                compact={true}
                className="min-h-0"
                isTokenOverview={true}
                useDatabase={false}
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-3 flex-1 min-h-0">
          <div className="flex-1 flex flex-col gap-3 min-w-0 max-h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
              {/* Main Chart Section */}
              <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3.5 flex-shrink-0">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center">
                    {tokenInfo.priceData?.image ? (
                      <div className="w-9 h-9 rounded-full mr-2.5 flex items-center justify-center p-0.5">
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

                  <div className="flex items-center gap-4">
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
                </div>

                {/* Real-time Price Section with TimePeriodButtons */}
                <div className="flex items-end justify-between mb-3.5">
                  <RealtimePriceDisplay
                    tokenAddress={tokenInfo.contractAddress}
                    tokenSymbol={tokenInfo.symbol}
                    tokenBalance={parseFloat(tokenInfo.balance)}
                    fallbackPrice={tokenInfo.priceData?.current_price || 0}
                    fallbackChange={
                      tokenInfo.priceData?.price_change_percentage_24h || 0
                    }
                    showSparkline={true}
                    className="flex-1"
                  />
                  <TimePeriodButtons className="ml-4" />
                </div>

                {/* Compact Uniswap-style Chart */}
                <div className="mb-4">
                  {chartLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19]"></div>
                    </div>
                  ) : (
                    priceData.length > 0 && (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={priceData}
                            margin={{
                              top: 2,
                              right: 40,
                              left: -10,
                              bottom: 10,
                            }}
                          >
                            <defs>
                              <linearGradient
                                id="colorGradientDesktop"
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

                            {allTimeHigh && (
                              <ReferenceLine
                                y={allTimeHigh.price}
                                stroke="#4CAF50"
                                strokeDasharray="6 4"
                                strokeOpacity={0.3}
                              />
                            )}

                            {allTimeLow && (
                              <ReferenceLine
                                y={allTimeLow.price}
                                stroke="#F44336"
                                strokeDasharray="6 4"
                                strokeOpacity={0.3}
                              />
                            )}

                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke="#F7B410"
                              strokeWidth={2}
                              fill="url(#colorGradientDesktop)"
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  )}
                </div>

                {tokenInfo.priceData && (
                  <div className="flex items-center justify-between w-full text-xs mt-4">
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

              {/* About Section */}
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
                  </div>
                )}

                <h3 className="text-base font-semibold text-white mb-2.5 font-mayeka-demi-bold-demo">
                  About {tokenInfo.name}
                </h3>
                {tokenInfo.priceData?.description ? (
                  <p className="text-gray-400 text-xs leading-relaxed font-satoshi">
                    {tokenInfo.priceData.description.substring(0, 500)}...
                  </p>
                ) : (
                  <p className="text-gray-400 text-xs leading-relaxed font-satoshi">
                    {tokenInfo.symbol === "ETH" ? (
                      <>
                        Ethereum is a global, open-source platform for
                        decentralized applications. It enables users to build
                        applications in a decentralized manner with distributed
                        states and data.
                      </>
                    ) : (
                      <>
                        {tokenInfo.name} is a cryptocurrency token that provides
                        various utilities within its ecosystem for governance,
                        transactions, and decentralized applications.
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-[390px] flex-shrink-0 h-full">
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
                    useDatabase={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
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
