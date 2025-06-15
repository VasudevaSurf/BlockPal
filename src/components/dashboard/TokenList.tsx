"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/store";

export default function TokenList() {
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

  return (
    <div className="bg-black rounded-lg p-6 border border-[#2C2C2C]">
      <h2 className="text-lg font-semibold text-white mb-6 font-satoshi">
        Token Holdings
      </h2>

      <div className="space-y-3">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="flex items-center justify-between p-3 bg-[#1A1A1A] hover:bg-[#2C2C2C] rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center">
              <div
                className={`w-10 h-10 ${getTokenIcon(
                  token.symbol
                )} rounded-full flex items-center justify-center mr-3`}
              >
                <span className="text-white text-sm font-medium">
                  {getTokenLetter(token.symbol)}
                </span>
              </div>
              <div>
                <div className="text-white font-medium font-satoshi">
                  {token.name}
                </div>
                <div className="text-gray-400 text-sm font-satoshi">
                  {token.balance.toFixed(4)} {token.symbol}
                </div>
              </div>
            </div>

            <div className="text-right">
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
        ))}
      </div>
    </div>
  );
}
