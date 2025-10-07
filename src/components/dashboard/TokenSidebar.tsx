// src/components/TokenSidebar.tsx
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function TokenSidebar() {
  return (
    <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] p-4 overflow-y-auto scrollbar-hide space-y-4">
      {/* Price Chart Section */}
      <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-3 pb-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#F7931A] flex items-center justify-center">
              <span className="text-white text-base font-bold">₿</span>
            </div>
            <div>
              <h3 className="text-white text-[15px] font-semibold leading-tight">
                Bitcoin
              </h3>
              <p className="text-[#999999] text-[11px] leading-tight">BTC</p>
            </div>
          </div>
          <div className="flex rounded-[30px] border border-[#2C2C2C] bg-[#0F0F0F] p-0.5">
            <button className="px-3 py-1 rounded-[30px] text-[#999999] text-[11px] hover:bg-[#1A1A1A] transition-colors">
              1W
            </button>
            <button className="px-3 py-1 rounded-[30px] text-[#999999] text-[11px] hover:bg-[#1A1A1A] transition-colors">
              1M
            </button>
            <button className="px-3 py-1 rounded-[30px] bg-[#F7B410] text-black text-[11px] font-medium">
              1Y
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[140px] -mx-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[
                { month: "Jan", value: 45000 },
                { month: "Feb", value: 38000 },
                { month: "Mar", value: 42000 },
                { month: "Apr", value: 55000 },
                { month: "May", value: 68000 },
                { month: "Jun", value: 72000 },
                { month: "Jul", value: 75000 },
                { month: "Aug", value: 65000 },
                { month: "Sep", value: 58000 },
                { month: "Oct", value: 52000 },
                { month: "Nov", value: 48000 },
                { month: "Dec", value: 72000 },
              ]}
              margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F7B410" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F7B410" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                stroke="transparent"
                tick={{ fill: "#666666", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                stroke="transparent"
                tick={{ fill: "#666666", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value / 1000}k`}
                domain={[0, 100000]}
                ticks={[10000, 50000, 100000]}
                width={30}
              />
              <defs>
                <pattern
                  id="grid"
                  width="100%"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="100%"
                    y2="0"
                    stroke="#2C2C2C"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                </pattern>
              </defs>
              <ReferenceLine
                y={10000}
                stroke="#2C2C2C"
                strokeDasharray="4 4"
                strokeWidth={0.5}
              />
              <ReferenceLine
                y={50000}
                stroke="#2C2C2C"
                strokeDasharray="4 4"
                strokeWidth={0.5}
              />
              <ReferenceLine
                y={100000}
                stroke="#2C2C2C"
                strokeDasharray="4 4"
                strokeWidth={0.5}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1A1A1A",
                  border: "1px solid #2C2C2C",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "11px",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Price",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#F7B410"
                strokeWidth={2.5}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sentiment Section */}
      <div className="grid grid-cols-2 gap-3">
        {/* Sentiment Meter */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-3 flex flex-col items-center justify-center">
          {/* Speedometer */}
          <div className="relative w-full aspect-square max-w-[140px] mb-2">
            <svg viewBox="0 0 200 120" className="w-full h-full">
              {/* Background arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#2C2C2C"
                strokeWidth="20"
                strokeLinecap="round"
              />

              {/* Fear section (red) */}
              <path
                d="M 20 100 A 80 80 0 0 1 53 45"
                fill="none"
                stroke="#E74C3C"
                strokeWidth="20"
                strokeLinecap="round"
              />

              {/* Neutral section (yellow-green gradient) */}
              <path
                d="M 53 45 A 80 80 0 0 1 147 45"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="20"
                strokeLinecap="round"
              />

              {/* Greed section (green) */}
              <path
                d="M 147 45 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#2ECC71"
                strokeWidth="20"
                strokeLinecap="round"
              />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F7B410" />
                  <stop offset="100%" stopColor="#A8C740" />
                </linearGradient>
              </defs>

              {/* Needle */}
              <g transform="translate(100, 100)">
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-70"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform="rotate(-45)"
                />
                <circle cx="0" cy="0" r="6" fill="white" />
              </g>

              {/* Labels */}
              <text
                x="20"
                y="115"
                fill="#E74C3C"
                fontSize="10"
                fontWeight="bold"
              >
                FEAR
              </text>
              <text x="20" y="125" fill="#E74C3C" fontSize="10">
                100
              </text>

              <text
                x="88"
                y="20"
                fill="#F7B410"
                fontSize="10"
                fontWeight="bold"
              >
                GREEDY
              </text>

              <text
                x="170"
                y="115"
                fill="#2ECC71"
                fontSize="10"
                fontWeight="bold"
                textAnchor="end"
              >
                NEUTRAL
              </text>
              <text
                x="170"
                y="125"
                fill="#2ECC71"
                fontSize="10"
                textAnchor="end"
              >
                0
              </text>
            </svg>
          </div>

          {/* Meter Badge */}
          <div className="bg-[#F7B410] px-2.5 py-0.5 rounded-md mb-2">
            <span className="text-black text-[11px] font-bold">METER</span>
          </div>

          {/* Title */}
          <h3 className="text-white text-[18px] font-bold text-center">
            Sentiment Meter
          </h3>
        </div>

        {/* Sentiment History */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-3 flex flex-col justify-center">
          <div className="space-y-2.5">
            <div className="flex flex-col">
              <p className="text-[#666666] text-[9px] leading-none">
                1 min ago
              </p>
              <div className="flex items-center gap-3">
                <p className="text-white text-[13px] font-medium flex-shrink-0 leading-none">
                  Neutral
                </p>
                <div className="flex-1 h-[1px] bg-[#2C2C2C] relative">
                  <div
                    className="h-full bg-[#999999] absolute top-0 left-0"
                    style={{ width: "52%" }}
                  />
                </div>
                <span className="text-white text-[10px] font-bold bg-[#2C2C2C] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  52
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <p className="text-[#666666] text-[9px] leading-none">
                2 hrs ago
              </p>
              <div className="flex items-center gap-3">
                <p className="text-white text-[13px] font-medium flex-shrink-0 leading-none">
                  Neutral
                </p>
                <div className="flex-1 h-[1px] bg-[#2C2C2C] relative">
                  <div
                    className="h-full bg-[#999999] absolute top-0 left-0"
                    style={{ width: "55%" }}
                  />
                </div>
                <span className="text-white text-[10px] font-bold bg-[#2C2C2C] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  55
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <p className="text-[#666666] text-[9px] leading-none">
                1 week ago
              </p>
              <div className="flex items-center gap-3">
                <p className="text-[#F7B410] text-[13px] font-medium flex-shrink-0 leading-none">
                  Greed
                </p>
                <div className="flex-1 h-[1px] bg-[#2C2C2C] relative">
                  <div
                    className="h-full bg-[#F7B410] absolute top-0 left-0"
                    style={{ width: "65%" }}
                  />
                </div>
                <span className="text-black text-[10px] font-bold bg-[#F7B410] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  65
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <p className="text-[#666666] text-[9px] leading-none">
                1 month ago
              </p>
              <div className="flex items-center gap-3">
                <p className="text-[#F7B410] text-[13px] font-medium flex-shrink-0 leading-none">
                  Greed
                </p>
                <div className="flex-1 h-[1px] bg-[#2C2C2C] relative">
                  <div
                    className="h-full bg-[#F7B410] absolute top-0 left-0"
                    style={{ width: "75%" }}
                  />
                </div>
                <span className="text-black text-[10px] font-bold bg-[#F7B410] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  75
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <p className="text-[#666666] text-[9px] leading-none">
                1 year ago
              </p>
              <div className="flex items-center gap-3">
                <p className="text-white text-[13px] font-medium flex-shrink-0 leading-none">
                  Neutral
                </p>
                <div className="flex-1 h-[1px] bg-[#2C2C2C] relative">
                  <div
                    className="h-full bg-[#E74C3C] absolute top-0 left-0"
                    style={{ width: "95%" }}
                  />
                </div>
                <span className="text-black text-[10px] font-bold bg-[#E74C3C] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  95
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Sentiment Bars Section */}
      <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 space-y-4">
        {/* Ethereum */}
        <div className="relative p-[1px] rounded-[16px] overflow-hidden">
          {/* Animated gradient border - glacier effect */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.15) 0%,
                rgba(255, 255, 255, 0.05) 20%,
                rgba(226, 175, 25, 0.12) 40%,
                rgba(255, 255, 255, 0.03) 60%,
                rgba(226, 175, 25, 0.08) 80%,
                rgba(255, 255, 255, 0.1) 100%)`,
            }}
          />

          {/* Inner container with glass effect */}
          <div
            className="relative flex items-center justify-between gap-4 rounded-[15px] p-3"
            style={{
              background: `linear-gradient(135deg, 
                rgba(15, 15, 15, 0.95) 0%,
                rgba(20, 20, 20, 0.92) 50%,
                rgba(15, 15, 15, 0.95) 100%)`,
              backdropFilter: "blur(2px)",
              boxShadow: `
                inset 0 1px 1px rgba(255, 255, 255, 0.03),
                inset 0 -1px 2px rgba(0, 0, 0, 0.7),
                0 2px 8px rgba(0, 0, 0, 0.5)
              `,
            }}
          >
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#627EEA] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-white text-[14px] font-semibold">
                  Ethereum
                </h4>
                <p className="text-[#999999] text-[11px]">ETH</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[#666666] text-[11px]">0</span>
                <span className="text-[#2ECC71] text-[13px] font-bold">50</span>
                <span className="text-[#666666] text-[11px]">100</span>
              </div>
              <div className="h-4 bg-[#2C2C2C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2ECC71] rounded-full"
                  style={{ width: "50%" }}
                />
              </div>
              <div className="text-center">
                <span className="text-[#2ECC71] text-[13px] font-medium">
                  Neutral
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bitcoin 1 */}
        <div className="relative p-[1px] rounded-[16px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.15) 0%,
                rgba(255, 255, 255, 0.05) 20%,
                rgba(226, 175, 25, 0.12) 40%,
                rgba(255, 255, 255, 0.03) 60%,
                rgba(226, 175, 25, 0.08) 80%,
                rgba(255, 255, 255, 0.1) 100%)`,
            }}
          />

          <div
            className="relative flex items-center justify-between gap-4 rounded-[15px] p-3"
            style={{
              background: `linear-gradient(135deg, 
                rgba(15, 15, 15, 0.95) 0%,
                rgba(20, 20, 20, 0.92) 50%,
                rgba(15, 15, 15, 0.95) 100%)`,
              backdropFilter: "blur(2px)",
              boxShadow: `
                inset 0 1px 1px rgba(255, 255, 255, 0.03),
                inset 0 -1px 2px rgba(0, 0, 0, 0.7),
                0 2px 8px rgba(0, 0, 0, 0.5)
              `,
            }}
          >
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#F7931A] flex items-center justify-center">
                <span className="text-white text-lg font-bold">₿</span>
              </div>
              <div>
                <h4 className="text-white text-[14px] font-semibold">
                  Bitcoin
                </h4>
                <p className="text-[#999999] text-[11px]">BTC</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[#666666] text-[11px]">0</span>
                <span className="text-[#F7B410] text-[13px] font-bold">80</span>
                <span className="text-[#666666] text-[11px]">100</span>
              </div>
              <div className="h-4 bg-[#2C2C2C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F7B410] rounded-full"
                  style={{ width: "80%" }}
                />
              </div>
              <div className="text-center">
                <span className="text-[#F7B410] text-[13px] font-medium">
                  Greedy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bitcoin 2 (Solana representation) */}
        <div className="relative p-[1px] rounded-[16px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.15) 0%,
                rgba(255, 255, 255, 0.05) 20%,
                rgba(226, 175, 25, 0.12) 40%,
                rgba(255, 255, 255, 0.03) 60%,
                rgba(226, 175, 25, 0.08) 80%,
                rgba(255, 255, 255, 0.1) 100%)`,
            }}
          />

          <div
            className="relative flex items-center justify-between gap-4 rounded-[15px] p-3"
            style={{
              background: `linear-gradient(135deg, 
                rgba(15, 15, 15, 0.95) 0%,
                rgba(20, 20, 20, 0.92) 50%,
                rgba(15, 15, 15, 0.95) 100%)`,
              backdropFilter: "blur(2px)",
              boxShadow: `
                inset 0 1px 1px rgba(255, 255, 255, 0.03),
                inset 0 -1px 2px rgba(0, 0, 0, 0.7),
                0 2px 8px rgba(0, 0, 0, 0.5)
              `,
            }}
          >
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00D4FF] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#00D4FF] rounded-full" />
                </div>
              </div>
              <div>
                <h4 className="text-white text-[14px] font-semibold">
                  Bitcoin
                </h4>
                <p className="text-[#999999] text-[11px]">BTC</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[#666666] text-[11px]">0</span>
                <span className="text-[#E74C3C] text-[13px] font-bold">
                  100
                </span>
                <span className="text-[#E74C3C] text-[11px]">100</span>
              </div>
              <div className="h-4 bg-[#2C2C2C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E74C3C] rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="text-center">
                <span className="text-[#E74C3C] text-[13px] font-medium">
                  Greedy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bitcoin 3 */}
        <div className="relative p-[1px] rounded-[16px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.15) 0%,
                rgba(255, 255, 255, 0.05) 20%,
                rgba(226, 175, 25, 0.12) 40%,
                rgba(255, 255, 255, 0.03) 60%,
                rgba(226, 175, 25, 0.08) 80%,
                rgba(255, 255, 255, 0.1) 100%)`,
            }}
          />

          <div
            className="relative flex items-center justify-between gap-4 rounded-[15px] p-3"
            style={{
              background: `linear-gradient(135deg, 
                rgba(15, 15, 15, 0.95) 0%,
                rgba(20, 20, 20, 0.92) 50%,
                rgba(15, 15, 15, 0.95) 100%)`,
              backdropFilter: "blur(2px)",
              boxShadow: `
                inset 0 1px 1px rgba(255, 255, 255, 0.03),
                inset 0 -1px 2px rgba(0, 0, 0, 0.7),
                0 2px 8px rgba(0, 0, 0, 0.5)
              `,
            }}
          >
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#F7931A] flex items-center justify-center">
                <span className="text-white text-lg font-bold">₿</span>
              </div>
              <div>
                <h4 className="text-white text-[14px] font-semibold">
                  Bitcoin
                </h4>
                <p className="text-[#999999] text-[11px]">BTC</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[#666666] text-[11px]">0</span>
                <span className="text-[#F7B410] text-[13px] font-bold">80</span>
                <span className="text-[#666666] text-[11px]">100</span>
              </div>
              <div className="h-4 bg-[#2C2C2C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F7B410] rounded-full"
                  style={{ width: "80%" }}
                />
              </div>
              <div className="text-center">
                <span className="text-[#F7B410] text-[13px] font-medium">
                  Greedy
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
