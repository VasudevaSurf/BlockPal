"use client";

import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

export default function TokenList() {
  const router = useRouter();
  const { tokens } = useSelector((state: RootState) => state.wallet);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
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
    };

    return colors[symbol] || "bg-gray-500";
  };

  const getTokenLetter = (symbol: string) => {
    const letters: Record<string, string> = {
      ETH: "E",
      SOL: "S",
      BTC: "B",
      SUI: "S",
      XRP: "X",
      ADA: "C",
      AVAX: "A",
      TON: "T",
      DOT: "P",
    };

    return letters[symbol] || symbol.charAt(0);
  };

  const handleTokenClick = (tokenId: string) => {
    router.push(`/dashboard/token/${tokenId}`);
  };

  return (
    <div className="bg-black rounded-[16px] lg:rounded-[20px] p-4 lg:p-6 border border-[#2C2C2C] flex flex-col h-full overflow-hidden">
      <h2 className="text-base lg:text-lg font-semibold text-white mb-4 lg:mb-6 font-satoshi flex-shrink-0">
        Token Holdings
      </h2>

      {/* Mobile Grid Layout */}
      <div className="block sm:hidden flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-1 gap-3 pr-2">
          {tokens.map((token) => (
            <div
              key={token.id}
              onClick={() => handleTokenClick(token.id)}
              className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] cursor-pointer hover:bg-[#1A1A1A] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 ${getTokenIcon(
                      token.symbol
                    )} rounded-full flex items-center justify-center mr-3 flex-shrink-0`}
                  >
                    <span className="text-white text-sm font-medium">
                      {getTokenLetter(token.symbol)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-medium font-satoshi">
                      {token.name}
                    </div>
                    <div className="text-gray-400 text-sm font-satoshi">
                      {token.balance.toFixed(4)} {token.symbol}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-white font-medium font-satoshi">
                    {formatCurrency(token.value)}
                  </div>
                  <div
                    className={`text-sm font-satoshi ${
                      token.change24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatPercentage(token.change24h)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tablet/Desktop List Layout */}
      <div className="hidden sm:block flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-3 pr-2">
          {tokens.map((token) => (
            <div
              key={token.id}
              onClick={() => handleTokenClick(token.id)}
              className="flex items-center justify-between p-3 hover:bg-[#1A1A1A] rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center min-w-0 flex-1">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${getTokenIcon(
                    token.symbol
                  )} rounded-full flex items-center justify-center mr-3 flex-shrink-0`}
                >
                  <span className="text-white text-sm font-medium">
                    {getTokenLetter(token.symbol)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium font-satoshi text-sm sm:text-base">
                    {token.name}
                  </div>
                  <div className="text-gray-400 text-xs sm:text-sm font-satoshi">
                    {token.balance.toFixed(4)} {token.symbol}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-white font-medium font-satoshi text-sm sm:text-base">
                  {formatCurrency(token.value)}
                </div>
                <div
                  className={`text-xs sm:text-sm font-satoshi ${
                    token.change24h >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatPercentage(token.change24h)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
