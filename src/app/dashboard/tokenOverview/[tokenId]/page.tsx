// src/app/dashboard/tokenOverview/[tokenId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Copy,
  ExternalLink,
  FileText,
  Send,
  Globe,
  Twitter,
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

// Mock token data - matches code-lens tokens
const mockTokens = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    contractAddress: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    balance: "1.25843",
    price: 4478.78,
    change24h: -1.06,
    volume24h: 8478788,
    marketCap: 12478088345,
    description:
      "Ethereum is a global, open-source platform for decentralized applications. In other words, the vision is to create a world computer that anyone can build applications in a decentralized manner; while all states and data are distributed and publicly accessible. Ethereum supports smart contracts in which developers can write code in order to program digital value.",
    homepage: "https://ethereum.org",
    whitepaper: "https://ethereum.org/whitepaper/",
    blockchain_site: "https://etherscan.io",
    twitter: "ethereum",
  },
  {
    id: 2,
    name: "Polkadot",
    symbol: "DOT",
    contractAddress: "0x0000000000000000000000000000000000000001",
    decimals: 10,
    balance: "478.78",
    price: 478.78,
    change24h: -1.06,
    volume24h: 8478788,
    marketCap: 78088345,
    description:
      "Polkadot is a next-generation blockchain protocol connecting multiple specialized blockchains into one unified network.",
    homepage: "https://polkadot.network",
    blockchain_site: "https://polkascan.io",
    twitter: "Polkadot",
  },
  {
    id: 3,
    name: "Cardano",
    symbol: "CAR",
    contractAddress: "0x0000000000000000000000000000000000000002",
    decimals: 6,
    balance: "8.7",
    price: 8.7,
    change24h: 1.06,
    volume24h: 76788,
    marketCap: 8088345,
    description:
      "Cardano is a blockchain platform for changemakers, innovators, and visionaries, with the tools and technologies required to create possibility for the many.",
    homepage: "https://cardano.org",
    blockchain_site: "https://cardanoscan.io",
    twitter: "Cardano",
  },
  {
    id: 4,
    name: "Dodge",
    symbol: "DOG",
    contractAddress: "0x0000000000000000000000000000000000000003",
    decimals: 8,
    balance: "0.378",
    price: 0.378,
    change24h: -1.06,
    volume24h: 478788,
    marketCap: 128345,
    description:
      "Dodge is a cryptocurrency that started as a joke but has grown into a legitimate digital currency with a strong community.",
    homepage: "https://dogecoin.com",
    blockchain_site: "https://dogechain.info",
    twitter: "dogecoin",
  },
  {
    id: 5,
    name: "Avalanche",
    symbol: "AVAX",
    contractAddress: "0x0000000000000000000000000000000000000004",
    decimals: 18,
    balance: "8.78",
    price: 8.78,
    change24h: -1.06,
    volume24h: 8478788,
    marketCap: 12478088345,
    description:
      "Avalanche is a layer one blockchain that functions as a platform for decentralized applications and custom blockchain networks.",
    homepage: "https://avax.network",
    blockchain_site: "https://snowtrace.io",
    twitter: "avalancheavax",
  },
  {
    id: 6,
    name: "Solana",
    symbol: "SOL",
    contractAddress: "0x0000000000000000000000000000000000000005",
    decimals: 9,
    balance: "201.7",
    price: 201.7,
    change24h: 1.06,
    volume24h: 8478788,
    marketCap: 9478088345,
    description:
      "Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale.",
    homepage: "https://solana.com",
    blockchain_site: "https://solscan.io",
    twitter: "solana",
  },
  {
    id: 7,
    name: "SUI",
    symbol: "SUI",
    contractAddress: "0x0000000000000000000000000000000000000006",
    decimals: 9,
    balance: "9.02",
    price: 9.02,
    change24h: 1.06,
    volume24h: 8478788,
    marketCap: 12478345,
    description:
      "Sui is a layer-1 blockchain designed to make digital asset ownership fast, private, secure, and accessible to everyone.",
    homepage: "https://sui.io",
    blockchain_site: "https://suiscan.xyz",
    twitter: "SuiNetwork",
  },
];

const TIME_PERIODS = [
  { label: "1H", value: "0.041", days: 0.041 },
  { label: "1D", value: "1", days: 1 },
  { label: "1W", value: "7", days: 7 },
  { label: "1Y", value: "365", days: 365 },
];

interface PricePoint {
  time: Date;
  displayTime: string;
  price: number;
  fullDate: string;
  index: number;
}

export default function TokenOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const tokenId = params.tokenId as string;

  const [tokenInfo, setTokenInfo] = useState<any>(null);
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
  const [yAxisDomain, setYAxisDomain] = useState<[number, string | number]>([
    0,
    "auto",
  ]);
  const [priceChange, setPriceChange] = useState(0);
  const [copied, setCopied] = useState<string>("");
  const [qrModalOpen, setQrModalOpen] = useState(false);

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

  // Generate mock chart data
  const generateMockChartData = (days: string) => {
    if (!tokenInfo) return;

    setChartLoading(true);

    setTimeout(() => {
      try {
        const daysNum = parseFloat(days);
        const basePrice = tokenInfo.price;
        const dataPoints =
          daysNum <= 1 ? 24 : daysNum <= 7 ? daysNum * 24 : daysNum;

        const mockData: PricePoint[] = [];
        const now = Date.now();
        const intervalMs = (daysNum * 24 * 60 * 60 * 1000) / dataPoints;

        for (let i = 0; i < dataPoints; i++) {
          const timestamp = now - (dataPoints - i - 1) * intervalMs;
          const date = new Date(timestamp);

          const volatility = 0.03;
          const randomChange = (Math.random() - 0.5) * volatility;
          const trendFactor = Math.sin((i / dataPoints) * Math.PI * 2) * 0.02;
          const price = basePrice * (1 + randomChange + trendFactor);

          mockData.push({
            time: date,
            displayTime: formatDateForChart(date, daysNum),
            price: Math.max(0, price),
            fullDate: date.toLocaleString(),
            index: i,
          });
        }

        setPriceData(mockData);

        if (mockData.length > 0) {
          const firstPrice = mockData[0].price;
          const lastPrice = mockData[mockData.length - 1].price;
          const change = ((lastPrice - firstPrice) / firstPrice) * 100;
          setPriceChange(change);
        }

        const prices = mockData.map((item: PricePoint) => item.price);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);

        const padding = (maxPrice - minPrice) * 0.1;
        setYAxisDomain([Math.max(0, minPrice - padding), maxPrice + padding]);

        const highIndex = mockData.findIndex(
          (item: PricePoint) => item.price === maxPrice
        );
        const lowIndex = mockData.findIndex(
          (item: PricePoint) => item.price === minPrice
        );

        setAllTimeHigh({ index: highIndex, price: maxPrice });
        setAllTimeLow({ index: lowIndex, price: minPrice });
      } catch (error) {
        console.error("Error generating mock chart data:", error);
      } finally {
        setChartLoading(false);
      }
    }, 500);
  };

  useEffect(() => {
    // Find token by ID
    const token = mockTokens.find((t) => t.id.toString() === tokenId);

    if (token) {
      setTokenInfo(token);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    if (tokenInfo) {
      generateMockChartData(selectedTimeframe);
    }
  }, [tokenInfo, selectedTimeframe]);

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
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
      DOT: "bg-pink-500",
      CAR: "bg-blue-600",
      DOG: "bg-orange-500",
      AVAX: "bg-red-500",
      SUI: "bg-cyan-500",
    };
    return colors[symbol] || "bg-gray-500";
  };

  const getTokenLetter = (symbol: string) => {
    const letters: Record<string, string> = {
      ETH: "Ξ",
      SOL: "◎",
      DOT: "●",
      CAR: "₳",
      DOG: "Ð",
      AVAX: "A",
      SUI: "~",
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

  const tokenBalance = parseFloat(tokenInfo.balance);
  const tokenValue = tokenBalance * tokenInfo.price;

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
                    tokenInfo.symbol
                  )} rounded-full mr-2.5 flex items-center justify-center`}
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

            {/* Price Section */}
            <div className="flex items-end justify-between">
              <div className="flex-1">
                <div className="text-2xl lg:text-3xl font-bold text-white mb-1 font-satoshi">
                  ${tokenInfo.price.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`text-sm font-satoshi ${
                      tokenInfo.change24h >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatPercentage(tokenInfo.change24h)}
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
                          fontSize: 11,
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
                        fill="url(#colorGradient)"
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
              <span className="text-white font-semibold font-mayeka">
                {tokenInfo.name}
              </span>
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
              <button className="flex-1 bg-[#E2AF19] text-black font-semibold py-2 rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi">
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

          {/* About Section - Mobile */}
          <div className="bg-black rounded-[11px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
            <h3 className="text-base font-semibold text-white mb-2.5 font-mayeka">
              About {tokenInfo.name}
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed font-satoshi mb-3">
              {tokenInfo.description}
            </p>

            {/* Token Distribution Section - Mobile */}
            <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-3 mb-3">
              <h4 className="text-sm font-semibold text-white mb-3 font-satoshi">
                Token Distribution
              </h4>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Left side - Circle Chart */}
                <div className="flex-shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#1a1a1a"
                      strokeWidth="6"
                    />
                    {/* Green segment (Top 10%) - 25% of circle - starts with gap from top */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#4CAF50"
                      strokeWidth="6"
                      strokeDasharray="70 326.7"
                      strokeDashoffset="-5"
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    {/* Light Green segment (Top 10% - 30%) - 20% of circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#8BC34A"
                      strokeWidth="6"
                      strokeDasharray="54 326.7"
                      strokeDashoffset="-93"
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    {/* Orange segment (Top 30% - 60%) - 35% of circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#FF9800"
                      strokeWidth="6"
                      strokeDasharray="98 326.7"
                      strokeDashoffset="-165"
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    {/* Red segment (Top 60% - 70%) - 20% of circle - ends with gap before top */}
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#F44336"
                      strokeWidth="6"
                      strokeDasharray="54 326.7"
                      strokeDashoffset="-281"
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />

                    {/* Center text */}
                    <text
                      x="60"
                      y="52"
                      textAnchor="middle"
                      className="fill-gray-400 text-[9px] font-satoshi"
                    >
                      Total Supply
                    </text>
                    <text
                      x="60"
                      y="65"
                      textAnchor="middle"
                      className="fill-white text-[12px] font-bold font-satoshi"
                    >
                      1,000,000,000
                    </text>
                    <text
                      x="60"
                      y="76"
                      textAnchor="middle"
                      className="fill-gray-400 text-[8px] font-satoshi"
                    >
                      BlackPal
                    </text>
                  </svg>
                </div>

                {/* Right side - Total Count of Holders */}
                <div
                  className="w-full sm:w-auto bg-black rounded-lg border border-[#2C2C2C] p-3 flex flex-col min-w-[280px]"
                  style={{ height: "120px" }}
                >
                  <h5 className="text-[11px] font-semibold text-white mb-2.5 font-satoshi text-left">
                    TOTAL COUNT OF HOLDERS
                  </h5>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#4CAF50] flex-shrink-0"></div>
                      <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                        Top 10%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#81C784] flex-shrink-0"></div>
                      <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                        Top 10% - 30%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#FF9800] flex-shrink-0"></div>
                      <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                        Top 30% - 60%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F44336] flex-shrink-0"></div>
                      <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                        Top 60% - 70%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {tokenInfo.homepage && (
                <a
                  href={tokenInfo.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                >
                  <Globe size={11} className="mr-1.5" />
                  Website
                </a>
              )}
              {tokenInfo.whitepaper && (
                <a
                  href={tokenInfo.whitepaper}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                >
                  <FileText size={11} className="mr-1.5" />
                  Whitepaper
                </a>
              )}
              {tokenInfo.twitter && (
                <a
                  href={`https://twitter.com/${tokenInfo.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                >
                  <Twitter size={11} className="mr-1.5" />
                  Twitter
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-3 flex-1 min-h-0">
          <div className="flex-[0_0_60%] flex flex-col gap-3 min-w-0 max-h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
              {/* Main Chart Section */}
              <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3.5 flex-shrink-0">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center">
                    <div
                      className={`w-9 h-9 ${getTokenIcon(
                        tokenInfo.symbol
                      )} rounded-full mr-2.5 flex items-center justify-center`}
                    >
                      <span className="text-white text-lg font-bold">
                        {getTokenLetter(tokenInfo.symbol)}
                      </span>
                    </div>
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
                        {`${tokenInfo.contractAddress.slice(
                          0,
                          9
                        )}...${tokenInfo.contractAddress.slice(-7)}`}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(tokenInfo.contractAddress, "contract")
                        }
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
                      ${tokenInfo.price.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-sm font-satoshi ${
                          tokenInfo.change24h >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercentage(tokenInfo.change24h)}
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
                              fill="url(#colorGradient)"
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* About Section - Desktop */}
              <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-5.5 flex-shrink-0">
                <div className="flex items-center space-x-2.5 mb-3.5">
                  {tokenInfo.homepage && (
                    <a
                      href={tokenInfo.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                    >
                      <Globe size={11} className="mr-1.5" />
                      Website
                    </a>
                  )}
                  {tokenInfo.whitepaper && (
                    <a
                      href={tokenInfo.whitepaper}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#0F0F0F] text-white px-2.5 py-1.5 rounded-lg border border-[#2C2C2C] hover:bg-[#2C2C2C] transition-colors font-satoshi flex items-center text-xs"
                    >
                      <FileText size={11} className="mr-1.5" />
                      Whitepaper
                    </a>
                  )}
                  {tokenInfo.twitter && (
                    <a
                      href={`https://twitter.com/${tokenInfo.twitter}`}
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
                  About {tokenInfo.name}
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed font-satoshi mb-3">
                  {tokenInfo.description}
                </p>

                {/* Token Distribution Section - Desktop */}
                <div className=" rounded-[30px] border border-[#2C2C2C] p-3">
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
                        {/* Green segment (Top 10%) - 25% of circle - starts with gap from top */}
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
                        {/* Light Green segment (Top 10% - 30%) - 20% of circle */}
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
                        {/* Orange segment (Top 30% - 60%) - 35% of circle */}
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
                        {/* Red segment (Top 60% - 70%) - 20% of circle - ends with gap before top */}
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

                        {/* Center text */}
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
                          1,000,000,000
                        </text>
                        <text
                          x="70"
                          y="89"
                          textAnchor="middle"
                          className="fill-gray-400 text-[9px] font-satoshi"
                        >
                          BlackPal
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
                            Top 10%
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#81C784] flex-shrink-0"></div>
                          <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                            Top 10% - 30%
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#FF9800] flex-shrink-0"></div>
                          <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                            Top 30% - 60%
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#F44336] flex-shrink-0"></div>
                          <span className="text-[10px] text-gray-300 font-satoshi whitespace-nowrap">
                            Top 60% - 70%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full flex-1 h-full flex flex-col gap-3">
            <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex flex-col overflow-y-auto space-y-1 scrollbar-hide">
              {/* Header with token info */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 ${getTokenIcon(
                    tokenInfo.symbol
                  )} rounded-full flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white text-lg font-bold">
                    {getTokenLetter(tokenInfo.symbol)}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-base font-satoshi">
                    {tokenInfo.name} /{tokenInfo.symbol}
                  </h3>
                  <p className="text-gray-400 text-xs font-satoshi">
                    {tokenInfo.name} price
                  </p>
                </div>
              </div>

              {/* Price and Balance */}
              <div className="mb-3">
                <div className="text-2xl font-bold text-white mb-1 font-satoshi">
                  ${tokenInfo.price.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`text-sm font-satoshi ${
                      priceChange >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {priceChange >= 0 ? "↑" : "↓"}(
                    {Math.abs(priceChange).toFixed(2)}%)
                  </div>
                  <div className="text-gray-400 text-xs font-satoshi">
                    {tokenBalance.toFixed(4)} {tokenInfo.symbol}
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-2 mb-3">
                {tokenInfo.twitter && (
                  <a
                    href={`https://twitter.com/${tokenInfo.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] flex items-center justify-center hover:bg-[#2C2C2C] transition-colors"
                  >
                    <Twitter size={14} className="text-white" />
                  </a>
                )}
                {tokenInfo.homepage && (
                  <a
                    href={tokenInfo.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] flex items-center justify-center hover:bg-[#2C2C2C] transition-colors"
                  >
                    <Globe size={14} className="text-white" />
                  </a>
                )}
                {tokenInfo.blockchain_site && (
                  <a
                    href={tokenInfo.blockchain_site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] flex items-center justify-center hover:bg-[#2C2C2C] transition-colors"
                  >
                    <ExternalLink size={14} className="text-white" />
                  </a>
                )}
              </div>

              {/* Time Period Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: "5M", value: 0, change: "0%" },
                  { label: "1H", value: -1.52, change: "-1.52%" },
                  { label: "6H", value: 12.9, change: "+12.90%" },
                  { label: "24H", value: -36.57, change: "-36.57%" },
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
                      {period.change}
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
                    ${formatLargeNumber(tokenInfo.volume24h)}
                  </div>
                </div>
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    Liquidity
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    ${formatLargeNumber(tokenInfo.volume24h * 3)}
                  </div>
                </div>
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    Holders
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    502
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
                    1 month
                  </div>
                </div>
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    FDV
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    ${formatLargeNumber(tokenInfo.marketCap * 0.7)}
                  </div>
                </div>
                <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-2">
                  <div className="text-gray-400 text-[10px] font-satoshi mb-1">
                    Market Cap
                  </div>
                  <div className="text-white text-sm font-semibold font-satoshi">
                    ${formatLargeNumber(tokenInfo.marketCap)}
                  </div>
                </div>
              </div>

              {/* Buy/Sell Section */}
              <div className="bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] p-3 mb-3">
                <div className="flex gap-3">
                  {/* Left Side - Buys/Sells */}
                  <div className="flex-1">
                    {/* Labels at top */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-green-400 text-xs font-semibold font-satoshi">
                        BUYS
                      </span>
                      <span className="text-red-400 text-xs font-semibold font-satoshi">
                        SELLS
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute left-0 top-0 h-full bg-green-500 rounded-l-full"
                        style={{ width: "77%" }}
                      ></div>
                      <div
                        className="absolute right-0 top-0 h-full bg-red-500 rounded-r-full"
                        style={{ width: "23%" }}
                      ></div>
                    </div>

                    {/* Numbers at bottom */}
                    <div className="flex justify-between items-center">
                      <div className=" text-[10px] font-satoshi text-[#26AA5E]">
                        74
                      </div>
                      <div className="text-[10px] font-satoshi text-[#26AA5E]">
                        22
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider */}
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
                          96
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          VOL
                        </span>
                        <div className="flex-1 mx-2 border-b border-dashed border-[#2C2C2C]"></div>
                        <span className="text-white text-sm font-semibold font-satoshi">
                          $55.2K
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          NET BUYS
                        </span>
                        <div className="flex-1 mx-2 border-b border-dashed border-[#2C2C2C]"></div>
                        <span className="text-green-400 text-sm font-semibold font-satoshi">
                          +$1.7K
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
            </div>

            {/* Bottom Section - PAL Score Card */}
            <div className="h-[240px] bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex flex-col">
              {/* Header with line in middle */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-lg font-semibold font-mayeka whitespace-nowrap">
                  PAL Score
                </h3>
                <div className="flex-1 h-[2px] bg-white mx-15"></div>
                <div className="flex items-center gap-1">
                  <span className="text-[#4CAF50] text-2xl font-bold font-mayeka">
                    61
                  </span>
                  <span className="text-[#F39C12] text-2xl font-bold font-mayeka">
                    /100
                  </span>
                </div>
              </div>

              <div className="flex gap-4 flex-1">
                {/* Left side - Speedometer with gray background */}
                <div
                  className="flex-shrink-0 bg-[#0F0F0F] rounded-2xl p-3 flex flex-col items-center justify-center"
                  style={{ width: "180px" }}
                >
                  <svg width="190" height="110" viewBox="0 0 192 130">
                    {/* Dots around the speedometer - more spread out */}
                    <circle cx="55" cy="28" r="1" fill="#4A4A4A" />
                    <circle cx="24" cy="58" r="1" fill="#4A4A4A" />
                    <circle cx="125" cy="29" r="1" fill="#4A4A4A" />
                    <circle cx="155" cy="57" r="1" fill="#4A4A4A" />

                    {/* Background arc - BLACK unfilled - larger radius */}
                    <path
                      d="M 25 100 A 65 65 0 0 1 155 100"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />

                    {/* Inner thin curve with #2C2C2C - positioned outside the main arc */}
                    {/* <path
                      d="M 22 105 A 72 72 0 0 1 162 105"
                      fill="none"
                      stroke="#2C2C2C"
                      strokeWidth="2"
                      strokeLinecap="round"
                    /> */}

                    {/* Active arc - GREEN filled (#2ECC71) - showing 0.8 score */}
                    <path
                      d="M 25 100 A 65 65 0 0 1 75 35"
                      fill="none"
                      stroke="#2ECC71"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />

                    {/* Score markers - repositioned to avoid overlap */}
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

                    {/* Center score display - positioned inside the larger arc */}
                    <text
                      x="90"
                      y="85"
                      textAnchor="middle"
                      className="fill-[#2ECC71] text-[36px] font-bold font-satoshi"
                    >
                      0.8
                    </text>
                    <text
                      x="90"
                      y="102"
                      textAnchor="middle"
                      className="fill-[#2ECC71] text-[12px] font-satoshi"
                    >
                      Low
                    </text>
                  </svg>

                  <div className="text-gray-400 text-[9px] font-satoshi mt-0">
                    BLOCKPAL APP RISK
                  </div>
                </div>

                {/* Right side - Scores and Risk */}
                <div className="flex-1 flex flex-col justify-center gap-5">
                  {/* Scores */}
                  <div className="">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-satoshi">
                        Pool Score
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[#4CAF50] text-lg font-bold font-satoshi">
                          80
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
                          40
                        </span>
                        <span className="text-gray-400 text-sm font-satoshi">
                          /100
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Warning */}
                  <div className="rounded-lg border border-[#2C2C2C] p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[#F39C12] text-sm font-semibold font-satoshi">
                        Caution
                      </div>
                      <div className="text-white text-xs font-satoshi mt-0.5">
                        Moderate Risk
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
