"use client";

import { useState } from "react";
import { SkeletonSwapSection } from "@/components/ui/Skeleton";

export default function SwapSection() {
  const [sellAmount, setSellAmount] = useState("0");
  const [buyAmount, setBuyAmount] = useState("0");
  const [loading, setLoading] = useState(false);

  if (loading) {
    return <SkeletonSwapSection />;
  }

  return (
    <div className="bg-black rounded-[16px] lg:rounded-[20px] border border-[#2C2C2C] h-full flex flex-col p-4 lg:p-6 overflow-hidden">
      {/* Header */}
      <h2 className="text-base lg:text-lg font-semibold text-white mb-4 lg:mb-6 font-satoshi">
        Swap
      </h2>

      {/* Swap Form Container */}
      <div className="relative mb-4 lg:mb-6 flex-shrink-0">
        {/* Sell Section */}
        <div>
          <div className="bg-black border border-[#2C2C2C] rounded-2xl p-3 lg:p-4 w-full h-28 sm:h-32 lg:h-36 overflow-hidden">
            <div className="flex items-center justify-between mb-2 lg:mb-3">
              <span className="text-white text-sm font-satoshi">Sell</span>
              <button className="flex items-center bg-[#0F0F0F] px-2 lg:px-3 py-1.5 lg:py-2 rounded-full text-sm flex-shrink-0">
                <div className="w-3 h-3 lg:w-4 lg:h-4 bg-blue-500 rounded-full flex items-center justify-center mr-1.5 lg:mr-2">
                  <span className="text-white text-xs font-bold">Ξ</span>
                </div>
                <span className="text-white font-satoshi mr-1.5 lg:mr-2 text-xs">
                  ETH
                </span>
                <svg
                  className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 mr-3">
                <input
                  type="text"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  className="bg-transparent text-xl lg:text-2xl font-bold text-white focus:outline-none font-satoshi w-full"
                  placeholder="0"
                  style={{
                    fontSize:
                      typeof window !== "undefined" && window.innerWidth < 640
                        ? "16px"
                        : undefined,
                  }}
                />
                <div className="text-gray-400 text-xs lg:text-sm font-satoshi mt-1">
                  $0
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <span className="text-gray-400 text-xs font-satoshi">
                    0 ETH
                  </span>
                  <button className="text-gray-400 text-xs font-satoshi bg-[#2C2C2C] px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full">
                    Max
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gap between sections */}
        <div className="h-2 lg:h-3"></div>

        {/* Buy Section */}
        <div>
          <div className="bg-black border border-[#2C2C2C] rounded-2xl p-3 lg:p-4 w-full h-28 sm:h-32 lg:h-36 overflow-hidden">
            <div className="flex items-center justify-between mb-2 lg:mb-3">
              <span className="text-white text-sm font-satoshi">Buy</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3">
                <input
                  type="text"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="bg-transparent text-xl lg:text-2xl font-bold text-white focus:outline-none font-satoshi w-full"
                  placeholder="0"
                  style={{
                    fontSize:
                      typeof window !== "undefined" && window.innerWidth < 640
                        ? "16px"
                        : undefined,
                  }}
                />
              </div>
              <div className="flex items-center flex-shrink-0">
                <button className="bg-[#E2AF19] text-black px-2 lg:px-3 py-1.5 lg:py-2 rounded-full font-satoshi font-medium text-xs">
                  Select Token
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overlaid Down Arrow - perfectly centered between the boxes */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 z-10"
          style={{ top: "calc(50% - 12px)" }}
        >
          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-black border border-[#2C2C2C] rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">↓</span>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <button className="w-full bg-[#E2AF19] hover:bg-[#D4A853] text-black font-semibold py-2.5 lg:py-3 rounded-xl transition-colors font-satoshi mb-4 lg:mb-6 flex-shrink-0 text-sm lg:text-base">
        Swap
      </button>

      {/* Blockpal Info Section - Takes remaining space and content at bottom */}
      <div className="flex-1 flex flex-col justify-end min-h-0 overflow-hidden">
        <div className="text-center max-h-full overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-center mb-3 lg:mb-4">
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-[#E2AF19] rounded-full mr-2 flex items-center justify-center">
              <span className="text-black text-xs lg:text-sm font-bold">B</span>
            </div>
            <span className="text-white font-semibold font-satoshi text-base lg:text-lg">
              Blockpal
            </span>
          </div>

          <div className="mb-6 lg:mb-8">
            <p className="text-gray-400 text-xs sm:text-sm font-satoshi leading-relaxed mb-3 lg:mb-4 max-w-sm mx-auto">
              Blockpal is a modern crypto wallet that makes managing your
              digital assets easy and stress-free. Whether you're sending
              tokens, tracking your balance, or planning future payments,
              Blockpal brings everything you need to one streamlined space.
            </p>

            <p className="text-gray-400 text-xs sm:text-sm font-satoshi mb-6 lg:mb-8">
              No complex tools, just a smooth, secure, and simple way to stay in
              control of your crypto.
            </p>
          </div>

          {/* Social icons at the very bottom */}
          <div className="flex justify-center space-x-3 lg:space-x-4 pb-2">
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-700 rounded-full"></div>
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-700 rounded-full"></div>
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-700 rounded-full"></div>
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-700 rounded-full"></div>
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

        /* Mobile specific styles */
        @media (max-width: 640px) {
          input {
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
