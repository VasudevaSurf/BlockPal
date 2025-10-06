// src/app/dashboard/tokenOverview/[tokenId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Copy,
  ExternalLink,
  FileText,
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

export default function NewsFeed() {
  const params = useParams();
  const tokenId = params.tokenId as string;

  // Default to first token if tokenId not found
  const tokenInfo =
    mockTokens.find((t) => t.id.toString() === tokenId) || mockTokens[0];

  const [priceData, setPriceData] = useState<PricePoint[]>([]);
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
        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-3 flex-1 min-h-0">
          <div className="flex-[0_0_60%] flex flex-col gap-3 min-w-0 max-h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
              <div className="bg-black rounded-[14px] border border-[#2C2C2C] p-3.5 flex-shrink-0"></div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full flex-1 h-full flex flex-col gap-3">
            <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] p-3 flex flex-col overflow-y-auto space-y-1 scrollbar-hide"></div>
          </div>
        </div>
      </div>
    </>
  );
}
