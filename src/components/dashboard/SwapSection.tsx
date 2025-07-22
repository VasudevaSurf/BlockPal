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
    <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] h-full flex flex-col p-3 lg:p-4 overflow-hidden">
      {/* Header */}
      <h2 className="text-sm lg:text-base font-semibold text-white mb-3 lg:mb-4 font-mayeka-demi-bold-demo">
        Swap
      </h2>

      {/* Swap Form Container */}
      <div className="relative mb-3 lg:mb-4 flex-shrink-0">
        {/* Sell Section */}
        <div>
          <div className="bg-black border border-[#2C2C2C] rounded-xl p-2.5 lg:p-3 w-full h-20 sm:h-24 lg:h-28 overflow-hidden">
            <div className="flex items-center justify-between mb-1.5 lg:mb-2">
              <span className="text-white text-xs font-satoshi">Sell</span>
              <button className="flex items-center bg-[#0F0F0F] px-1.5 lg:px-2 py-1 lg:py-1.5 rounded-full text-xs flex-shrink-0">
                <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-blue-500 rounded-full flex items-center justify-center mr-1 lg:mr-1.5">
                  <span className="text-white text-[8px] font-bold">Ξ</span>
                </div>
                <span className="text-white font-satoshi mr-1 lg:mr-1.5 text-[10px]">
                  ETH
                </span>
                <svg
                  className="w-2 h-2 lg:w-2.5 lg:h-2.5 text-white"
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
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex-1 mr-2">
                <input
                  type="text"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  className="bg-transparent text-base lg:text-lg font-bold text-white focus:outline-none font-mayeka-demi-bold-demo w-full"
                  placeholder="0"
                  style={{
                    fontSize:
                      typeof window !== "undefined" && window.innerWidth < 640
                        ? "14px"
                        : undefined,
                  }}
                />
                <div className="text-gray-400 text-[10px] lg:text-xs font-satoshi mt-0.5">
                  $0
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 lg:gap-1.5">
                  <span className="text-gray-400 text-[10px] font-satoshi">
                    0 ETH
                  </span>
                  <button className="text-gray-400 text-[10px] font-satoshi bg-[#2C2C2C] px-1 lg:px-1.5 py-0.5 rounded-full">
                    Max
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gap between sections */}
        <div className="h-1.5 lg:h-2"></div>

        {/* Buy Section */}
        <div>
          <div className="bg-black border border-[#2C2C2C] rounded-xl p-2.5 lg:p-3 w-full h-20 sm:h-24 lg:h-28 overflow-hidden">
            <div className="flex items-center justify-between mb-1.5 lg:mb-2">
              <span className="text-white text-xs font-satoshi">Buy</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-2">
                <input
                  type="text"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="bg-transparent text-base lg:text-lg font-bold text-white focus:outline-none font-mayeka-demi-bold-demo w-full"
                  placeholder="0"
                  style={{
                    fontSize:
                      typeof window !== "undefined" && window.innerWidth < 640
                        ? "14px"
                        : undefined,
                  }}
                />
              </div>
              <div className="flex items-center flex-shrink-0">
                <button className="bg-[#E2AF19] text-black px-1.5 lg:px-2 py-1 lg:py-1.5 rounded-full font-satoshi font-medium text-[10px]">
                  Select Token
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overlaid Down Arrow - perfectly centered between the boxes */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 z-10"
          style={{ top: "calc(50% - 10px)" }}
        >
          <div className="w-5 h-5 lg:w-6 lg:h-6 bg-black border border-[#2C2C2C] rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">↓</span>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <button className="w-full bg-[#E2AF19] hover:bg-[#D4A853] text-black font-semibold py-2 lg:py-2.5 rounded-lg transition-colors font-satoshi mb-3 lg:mb-4 flex-shrink-0 text-xs lg:text-sm">
        Swap
      </button>

      {/* Blockpal Info Section - Takes remaining space and content at bottom */}
      <div className="flex-1 flex flex-col justify-end min-h-0 overflow-hidden">
        <div className="text-center max-h-full overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-center mb-2 lg:mb-3">
            <div className="w-4 h-4 lg:w-5 lg:h-5 bg-[#E2AF19] rounded-full mr-1.5 flex items-center justify-center">
              <span className="text-black text-[10px] lg:text-xs font-bold">
                B
              </span>
            </div>
            <span className="text-white font-semibold font-satoshi text-sm lg:text-base">
              Blockpal
            </span>
          </div>

          <div className="mb-4 lg:mb-6">
            <p className="text-gray-400 text-[10px] sm:text-xs font-satoshi leading-relaxed mb-2 lg:mb-3 max-w-xs mx-auto">
              Blockpal is a modern crypto wallet that makes managing your
              digital assets easy and stress-free. Whether you're sending
              tokens, tracking your balance, or planning future payments,
              Blockpal brings everything you need to one streamlined space.
            </p>

            <p className="text-gray-400 text-[10px] sm:text-xs font-satoshi mb-4 lg:mb-6">
              No complex tools, just a smooth, secure, and simple way to stay in
              control of your crypto.
            </p>
          </div>

          {/* Social icons at the very bottom */}
          <div className="flex justify-center space-x-2 lg:space-x-3 pb-1">
            <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gray-700 rounded-full"></div>
            <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gray-700 rounded-full"></div>
            <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gray-700 rounded-full"></div>
            <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gray-700 rounded-full"></div>
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
            font-size: 14px !important; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
