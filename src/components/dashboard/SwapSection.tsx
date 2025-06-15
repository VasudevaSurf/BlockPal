"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function SwapSection() {
  const [sellToken, setSellToken] = useState("ETH");
  const [buyToken, setBuyToken] = useState("");
  const [sellAmount, setSellAmount] = useState("0");
  const [buyAmount, setBuyAmount] = useState("0");

  return (
    <div
      className="bg-black rounded-[20px] border border-[#2C2C2C] h-full flex flex-col overflow-hidden"
      style={{ width: "500px" }}
    >
      <h2 className="text-lg font-semibold text-white mb-6 font-satoshi flex-shrink-0">
        Swap
      </h2>

      {/* Swap Form */}
      <div className="flex-1 flex flex-col overflow-hidden px-6 pt-6">
        {/* Sell Section */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-satoshi">Sell</span>
          </div>
          <div className="bg-[#1A1A1A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <button className="flex items-center bg-[#2C2C2C] hover:bg-[#3A3A3A] px-3 py-2 rounded-lg transition-colors">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-medium">E</span>
                </div>
                <span className="text-white font-satoshi mr-2">ETH</span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              <div className="text-right">
                <div className="text-gray-400 text-xs font-satoshi">0 ETH</div>
                <div className="text-gray-400 text-xs font-satoshi">Max</div>
              </div>
            </div>
            <input
              type="text"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="w-full bg-transparent text-4xl font-bold text-white placeholder-gray-500 focus:outline-none font-satoshi"
              placeholder="0"
            />
          </div>
        </div>

        {/* Swap Direction Arrow */}
        <div className="flex justify-center mb-4">
          <div className="w-8 h-8 bg-[#1A1A1A] rounded-full flex items-center justify-center">
            <span className="text-white">↓</span>
          </div>
        </div>

        {/* Buy Section */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-satoshi">Buy</span>
          </div>
          <div className="bg-[#1A1A1A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <button className="flex items-center bg-[#2C2C2C] hover:bg-[#3A3A3A] px-3 py-2 rounded-lg transition-colors">
                <span className="text-white font-satoshi mr-2">
                  Select Token
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>
            <input
              type="text"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              className="w-full bg-transparent text-4xl font-bold text-white placeholder-gray-500 focus:outline-none font-satoshi"
              placeholder="0"
            />
          </div>
        </div>

        {/* Swap Button */}
        <button className="w-full bg-[#E2AF19] hover:bg-[#D4A853] text-black font-semibold py-3 rounded-lg transition-colors font-satoshi mb-6 flex-shrink-0">
          Swap
        </button>

        {/* Blockpal Info - Scrollable section */}
        <div className="border-t border-[#2C2C2C] flex-1 overflow-y-auto scrollbar-hide px-0">
          <div className="pt-6">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 bg-[#E2AF19] rounded-full mr-2"></div>
              <span className="text-white font-semibold font-satoshi">
                Blockpal
              </span>
            </div>
            <p className="text-gray-400 text-sm font-satoshi leading-relaxed mb-3">
              Blockpal is a modern crypto wallet that makes managing your
              digital assets easy and stress-free. Whether you're sending
              tokens, tracking your balance, or planning future payments,
              Blockpal brings everything you need to one streamlined space.
            </p>
            <p className="text-gray-400 text-sm font-satoshi mb-4">
              No complex tools, just a smooth, secure, and simple way to stay in
              control of your crypto.
            </p>

            <div className="flex justify-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            </div>
          </div>
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
