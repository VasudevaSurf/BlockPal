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

function Speedometer({ value = 52 }: { value: number }) {
  const angle = 180 - (value / 100) * 180;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-[100%] h-20">
        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient
              id="meterGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(255, 86, 86, 1)" />
              <stop offset="20%" stopColor="rgba(255, 136, 136, 1)" />
              <stop offset="40%" stopColor="rgba(254, 225, 20, 1)" />
              <stop offset="60%" stopColor="rgba(209, 216, 15, 1)" />
              <stop offset="80%" stopColor="rgba(132, 189, 50, 1)" />
              <stop offset="100%" stopColor="rgba(48, 173, 67, 1)" />
            </linearGradient>
            <radialGradient id="innerGradient" cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="#FFB74D" />
              <stop offset="30%" stopColor="#FF9800" />
              <stop offset="60%" stopColor="#F57C00" />
              <stop offset="100%" stopColor="#E65100" />
            </radialGradient>
          </defs>

          {/* Outer colored arc border with cuts */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#meterGradient)"
            strokeWidth="10"
            strokeLinecap="butt"
            strokeDasharray="38 5"
          />

          {/* Inner filled gradient background - with proper clipping */}
          <defs>
            <clipPath id="gaugeClip">
              <path d="M 30 100 A 70 70 0 0 1 170 100 L 100 100 Z" />
            </clipPath>
          </defs>
          <path
            d="M 30 100 A 70 70 0 0 1 170 100 L 100 100 Z"
            fill="url(#innerGradient)"
            clipPath="url(#gaugeClip)"
          />

          {[0, 20, 40, 60, 80, 100].map((tick) => {
            const tickAngle = (tick / 100) * 180;
            const radians = (tickAngle * Math.PI) / 180;
            const innerRadius = 52;
            const outerRadius = 60;
            const x1 = 100 - Math.cos(radians) * innerRadius;
            const y1 = 100 - Math.sin(radians) * innerRadius;
            const x2 = 100 - Math.cos(radians) * outerRadius;
            const y2 = 100 - Math.sin(radians) * outerRadius;

            // Adjust y offset for 0 and 100 to move them up
            const yOffset = tick === 0 || tick === 100 ? -2 : 4;

            return (
              <g key={tick}>
                <text
                  x={100 - Math.cos(radians) * 60}
                  y={100 - Math.sin(radians) * 60 + yOffset}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="10"
                  fontWeight="600"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <text
            x="15"
            y="70"
            fill="#999999"
            fontSize="9"
            fontWeight="600"
            transform="rotate(-90 15 85)"
            textAnchor="middle"
          >
            FEAR
          </text>
          <text
            x="185"
            y="70"
            fill="#999999"
            fontSize="9"
            fontWeight="600"
            transform="rotate(90 185 85)"
            textAnchor="middle"
          >
            GREEDY
          </text>
          <text
            x="100"
            y="5"
            fill="#999999"
            fontSize="9"
            fontWeight="600"
            textAnchor="middle"
          >
            NEUTRAL
          </text>

          <circle cx="100" cy="100" r="8" fill="#2C2C2C" />

          <g
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: "100px 100px",
              transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <path d="M 100 92 L 96 88 L 100 25 L 104 88 Z" fill="white" />
          </g>

          <circle cx="100" cy="100" r="6" fill="white" />
        </svg>
      </div>

      <div className="mt-2">
        <div
          className="text-black text-[10px] font-bold px-3 py-1 rounded"
          style={{ backgroundColor: "rgba(48, 173, 67, 1)" }}
        >
          100
        </div>
      </div>

      <div className="text-white text-sm font-mayeka mt-2 tracking-wide">
        Sentiment Meter
      </div>
    </div>
  );
}

export default function TokenSidebar() {
  return (
    <div className="flex-1 bg-black rounded-[14px] p-2 overflow-hidden flex flex-col space-y-2">
      {/* Price Chart Section */}
      <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-2 pb-1.5 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#F7931A] flex items-center justify-center">
              <span className="text-white text-sm font-bold">₿</span>
            </div>
            <div>
              <h3 className="text-white text-[13px] font-semibold leading-tight">
                Bitcoin
              </h3>
              <p className="text-[#999999] text-[10px] leading-tight">BTC</p>
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
        <div className="h-[100px] -mx-2 mr-2">
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
                <linearGradient
                  id="innerGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#D1D80F" />
                  <stop offset="100%" stopColor="#3D3D3D" />
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
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        {/* Sentiment Meter */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-2 flex flex-col items-center justify-center">
          <Speedometer value={52} />
        </div>

        {/* Sentiment History */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-2 flex flex-col justify-center">
          <div className="space-y-1.5">
            <div className="flex flex-col">
              <p className="text-[#666666] text-[9px] leading-none">
                2 hrs ago
              </p>
              <div className="flex items-center gap-3">
                <p className="text-white text-[13px] font-satoshi flex-shrink-0 leading-none">
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
                <p className="text-[#F7B410] text-[13px] font-satoshi flex-shrink-0 leading-none">
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
                <p className="text-[#F7B410] text-[13px] font-satoshi flex-shrink-0 leading-none">
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
                <p className="text-white text-[13px] font-satoshi flex-shrink-0 leading-none">
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
      <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-2 space-y-2 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {/* Ethereum */}
        <div className="relative rounded-[16px] overflow-hidden">
          {/* Glacier effect border - subtle with reduced opacity */}
          <div
            className="absolute inset-0 rounded-[16px]"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.25) 0%,
                rgba(255, 255, 255, 0.1) 20%,
                rgba(200, 220, 255, 0.15) 40%,
                rgba(255, 255, 255, 0.08) 60%,
                rgba(200, 220, 255, 0.12) 80%,
                rgba(255, 255, 255, 0.22) 100%)`,
              padding: "1px",
            }}
          />

          {/* Corner highlights - reduced opacity */}
          <div
            className="absolute top-0 left-0 w-6 h-6 rounded-tl-[16px]"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-0 right-0 w-6 h-6 rounded-tr-[16px]"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-6 h-6 rounded-bl-[16px]"
            style={{
              background:
                "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-6 h-6 rounded-br-[16px]"
            style={{
              background:
                "radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />

          {/* Inner container with black background and glacier glass effect */}
          <div
            className="relative flex items-center justify-between gap-4 rounded-[15px] p-2 m-[1px] bg-black"
            style={{
              backdropFilter: "blur(20px)",
              boxShadow: `
                inset 0 1px 1px rgba(255, 255, 255, 0.1),
                inset 0 -1px 1px rgba(0, 0, 0, 0.3),
                0 4px 12px rgba(255, 255, 255, 0.08),
                0 2px 6px rgba(255, 255, 255, 0.05)
              `,
            }}
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <img
                src="/Ethereum.png"
                alt="Ethereum"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <h4 className="text-white text-[12px] font-semibold">
                  Ethereum
                </h4>
                <p className="text-[#999999] text-[10px]">ETH</p>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 min-w-[160px]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[#666666] text-[9px]">0</span>
                <span className="text-[#2ECC71] text-[11px] font-bold">50</span>
                <span className="text-[#666666] text-[9px]">100</span>
              </div>
              <div className="h-3 bg-[#2C2C2C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2ECC71] rounded-full"
                  style={{ width: "50%" }}
                />
              </div>
              <div className="text-center">
                <span className="text-[#2ECC71] text-[11px] font-satoshi">
                  Neutral
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bitcoin 1 */}
        <div className="relative rounded-[16px] overflow-hidden">
          {/* Glacier effect border - subtle with reduced opacity */}
          <div
            className="absolute inset-0 rounded-[16px]"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.25) 0%,
                rgba(255, 255, 255, 0.1) 20%,
                rgba(200, 220, 255, 0.15) 40%,
                rgba(255, 255, 255, 0.08) 60%,
                rgba(200, 220, 255, 0.12) 80%,
                rgba(255, 255, 255, 0.22) 100%)`,
              padding: "1px",
            }}
          />

          {/* Corner highlights - reduced opacity */}
          <div
            className="absolute top-0 left-0 w-6 h-6 rounded-tl-[16px]"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-0 right-0 w-6 h-6 rounded-tr-[16px]"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-6 h-6 rounded-bl-[16px]"
            style={{
              background:
                "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-6 h-6 rounded-br-[16px]"
            style={{
              background:
                "radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />

          {/* Inner container with black background and glacier glass effect */}
          <div
            className="relative flex items-center justify-between gap-4 rounded-[15px] p-2 m-[1px] bg-black"
            style={{
              backdropFilter: "blur(20px)",
              boxShadow: `
                inset 0 1px 1px rgba(255, 255, 255, 0.1),
                inset 0 -1px 1px rgba(0, 0, 0, 0.3),
                0 4px 12px rgba(255, 255, 255, 0.08),
                0 2px 6px rgba(255, 255, 255, 0.05)
              `,
            }}
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <img
                src="/Bitcoin.png"
                alt="Ethereum"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <h4 className="text-white text-[12px] font-semibold">
                  Ethereum
                </h4>
                <p className="text-[#999999] text-[10px]">ETH</p>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 min-w-[160px]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[#666666] text-[9px]">0</span>
                <span className="text-[#F7B410] text-[11px] font-bold">80</span>
                <span className="text-[#666666] text-[9px]">100</span>
              </div>
              <div className="h-3 bg-[#2C2C2C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F7B410] rounded-full"
                  style={{ width: "80%" }}
                />
              </div>
              <div className="text-center">
                <span className="text-[#E74C3C] text-[11px] font-satoshi">
                  Greedy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bitcoin 2 (Solana representation) */}
        <div className="relative rounded-[16px] overflow-hidden">
          {/* Glacier effect border - subtle with reduced opacity */}
          <div
            className="absolute inset-0 rounded-[16px]"
            style={{
              background: `linear-gradient(135deg, 
                rgba(255, 255, 255, 0.25) 0%,
                rgba(255, 255, 255, 0.1) 20%,
                rgba(200, 220, 255, 0.15) 40%,
                rgba(255, 255, 255, 0.08) 60%,
                rgba(200, 220, 255, 0.12) 80%,
                rgba(255, 255, 255, 0.22) 100%)`,
              padding: "1px",
            }}
          />

          {/* Corner highlights - reduced opacity */}
          <div
            className="absolute top-0 left-0 w-6 h-6 rounded-tl-[16px]"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-0 right-0 w-6 h-6 rounded-tr-[16px]"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-6 h-6 rounded-bl-[16px]"
            style={{
              background:
                "radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-6 h-6 rounded-br-[16px]"
            style={{
              background:
                "radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
            }}
          />

          {/* Inner container with black background and glacier glass effect */}
          <div
            className="relative flex items-center justify-between gap-4 rounded-[15px] p-2 m-[1px] bg-black"
            style={{
              backdropFilter: "blur(20px)",
              boxShadow: `
                inset 0 1px 1px rgba(255, 255, 255, 0.1),
                inset 0 -1px 1px rgba(0, 0, 0, 0.3),
                0 4px 12px rgba(255, 255, 255, 0.08),
                0 2px 6px rgba(255, 255, 255, 0.05)
              `,
            }}
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <img
                src="/Solona.png"
                alt="Ethereum"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <h4 className="text-white text-[12px] font-semibold">
                  Bitcoin
                </h4>
                <p className="text-[#999999] text-[10px]">BTC</p>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 min-w-[160px]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[#666666] text-[9px]">0</span>
                <span className="text-[#E74C3C] text-[11px] font-bold">
                  100
                </span>
                <span className="text-[#E74C3C] text-[9px]">100</span>
              </div>
              <div className="h-3 bg-[#2C2C2C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E74C3C] rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="text-center">
                <span className="text-[#E74C3C] text-[11px] font-satoshi">
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
