"use client";

import { useState } from "react";
import { ArrowDownUp, Clock, CheckCircle, History, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SwapIcon from "@/components/icons/SwapIcon";
import LightningIcon from "@/components/icons/LightningIcon";
import FilterIcon from "@/components/icons/FilterIcon";

// History data moved outside component to prevent recreation
const historyData = [
  {
    id: 1,
    type: "sell",
    token: "Ethereum",
    symbol: "ETH",
    amount: "-0.01",
    value: "ETH",
    date: "August 20, 2025",
    status: "completed",
    color: "from-gray-600 to-gray-400",
  },
  {
    id: 2,
    type: "buy",
    token: "Bitcoin",
    symbol: "BTC",
    amount: "+0.31",
    value: "BTC",
    date: "August 20, 2025",
    status: "completed",
    color: "from-orange-500 to-orange-600",
  },
  {
    id: 3,
    type: "buy",
    token: "Solana",
    symbol: "SOL",
    amount: "+0.1",
    value: "SOL",
    date: "June 20, 2025",
    status: "completed",
    color: "from-purple-500 to-purple-600",
  },
  {
    id: 4,
    type: "sell",
    token: "Base",
    symbol: "ETH",
    amount: "-0.01",
    value: "ETH",
    date: "September 9, 2025",
    status: "completed",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: 5,
    type: "buy",
    token: "Solana",
    symbol: "SOL",
    amount: "+0.1",
    value: "SOL",
    date: "August 3, 2025",
    status: "completed",
    color: "from-purple-500 to-purple-600",
  },
];

export default function SwapPage() {
  const [activeTab, setActiveTab] = useState("swap");

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-4 flex flex-col overflow-hidden relative">
      <div className="flex justify-center mb-4">
        <div className="relative inline-flex py-[6px] px-[6px] gap-[6px] border border-[#4B3A08] rounded-[12px]">
          <motion.div
            className="absolute h-[calc(100%-12px)] w-[calc(50%-3px)] bg-[#E2AF19] rounded-[13px] top-[6px] left-[6px]"
            initial={false}
            animate={activeTab}
            variants={{
              swap: { x: 0 },
              history: { x: "100%" },
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          />

          {/* Tab Buttons */}
          <button
            onClick={() => setActiveTab("swap")}
            className={`relative z-10 px-6 py-2.5 font-medium text-sm rounded-[13px] transition-colors duration-200 ${
              activeTab === "swap"
                ? "text-black"
                : "text-white hover:text-gray-300"
            }`}
          >
            Swap
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`relative z-10 px-6 py-2.5 font-medium text-sm rounded-[13px] transition-colors duration-200 ${
              activeTab === "history"
                ? "text-black"
                : "text-white hover:text-gray-300"
            }`}
          >
            History
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-xl mx-auto px-4">
          {/* Container with gradient border */}
          <div className="relative p-[3px] rounded-[30px]">
            {/* Gradient border background with subtle fade */}
            <div
              className="absolute inset-0 rounded-[30px]"
              style={{
                background: `linear-gradient(135deg, 
                  #E2AF19 0%, 
                  #E2AF19 3%,
                  #2C2C2C 10%, 
                  #2C2C2C 90%, 
                  #E2AF19 97%,
                  #E2AF19 100%)`,
              }}
            />

            <div
              className="relative bg-[#0F0F0F] rounded-[26px] py-6 px-16"
              style={{
                boxShadow: "0 4px 4px 0 rgba(0, 0, 0, 0.25)",
              }}
            >
              <div className="flex flex-row items-center justify-between mb-4">
                <button className="flex items-center gap-1 hover:opacity-80 transition-opacity min-w-fit justify-center">
                  <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">E</span>
                  </div>
                  <span className="text-white text-base font-satoshi">
                    Ethereum
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-gray-400"
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
                {/* Slippage Settings */}
                <div className="flex justify-end items-center gap-2 text-xs bg-[rgba(255,255,255,0.03)] p-2 rounded-[20px]">
                  <span className="text-[#977511] font-satoshi">
                    Slippage %
                  </span>
                  <button className="text-[#fff] hover:text-[#D4A853] transition-colors font-satoshi">
                    Auto
                  </button>
                  <button className="text-gray-500 hover:text-gray-300 transition-colors flex flex-row items-center justify-center font-satoshi">
                    Custom
                    <FilterIcon size={12} className="mt-[2px] ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Swap Box */}
              <div
                className="bg-[#191919] p-5"
                style={{ borderRadius: "26.066px" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-[#E2AF19] text-base font-mayeka mb-2">
                      Swap
                    </h2>

                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        defaultValue="0.684"
                        className="bg-transparent text-white text-3xl font-satoshi outline-none w-full"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <button className="flex items-center gap-1 hover:opacity-80 transition-opacity min-w-fit p-[6px] bg-[rgba(255,255,255,0.03)] rounded-[25px]">
                    <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">E</span>
                    </div>
                    <span className="text-white text-base font-satoshi">
                      ETH
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-gray-400"
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#939393] font-satoshi">
                        Available:
                      </span>
                      <span className="text-[#FFFFFF] font-satoshi">
                        {" "}
                        8.04 ETH
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#FFFFFF] font-satoshi">
                        8.04 ETH
                      </span>
                      <button className="text-xs bg-[#000] hover:bg-[#3C3C3C] text-white px-2 py-1 rounded-md transition-colors">
                        MAX
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center relative -my-[22px] z-10">
                <button className="bg-[#E2AF19] p-3 rounded-full hover:bg-[#D4A853] transition-colors group border-4 border-[#0F0F0F]">
                  <SwapIcon className="text-black w-5 h-5" />
                </button>
              </div>

              {/* Get Box */}
              <div
                className="bg-[#191919] p-5 mb-2"
                style={{ borderRadius: "26.066px" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-[#E2AF19] text-base font-mayeka mb-2">
                      GET
                    </h2>

                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        defaultValue="0.684"
                        className="bg-transparent text-white text-3xl font-satoshi outline-none w-full"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <button className="flex items-center gap-1 hover:opacity-80 transition-opacity min-w-fit p-[6px] bg-[rgba(255,255,255,0.03)] rounded-[25px]">
                    <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">E</span>
                    </div>
                    <span className="text-white text-base font-satoshi">
                      ETH
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-gray-400"
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#939393] font-satoshi">
                        Estimated Fee:
                      </span>
                      <span className="text-[#FFFFFF] font-satoshi"> $0</span>
                    </div>
                    <span className="text-gray-500 font-satoshi flex items-center gap-4">
                      <span className="text-[#FFFFFF] font-satoshi">
                        $200.04
                      </span>
                      <div className="flex flex-row items-center bg-[rgba(255,255,255,0.02)] p-[4px] rounded-[15px]">
                        <LightningIcon size={15} />
                        Fast
                      </div>
                    </span>
                  </div>
                </div>
              </div>

              {/* Connect Wallet Button */}
              <button className="w-full bg-[#E2AF19] hover:bg-[#D4A853] text-black font-mayeka-bold-demo py-3.5 rounded-[20px] transition-all text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                CONNECT WALLET
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History Overlay */}
      <AnimatePresence>
        {activeTab === "history" && (
          <>
            {/* Background Overlay with minimal fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/10 z-20"
              onClick={() => setActiveTab("swap")}
            />

            {/* History Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 50 }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute top-1/2 left-1/2 transform -translate-y-1/2 z-30 ml-[150px]"
            >
              {/* Container with gradient border matching swap box */}
              <div className="relative p-[3px] rounded-[30px] w-[400px]">
                {/* Gradient border background */}
                <div
                  className="absolute inset-0 rounded-[30px]"
                  style={{
                    background: `linear-gradient(135deg, 
                      #E2AF19 0%, 
                      #E2AF19 3%,
                      #2C2C2C 10%, 
                      #2C2C2C 90%, 
                      #E2AF19 97%,
                      #E2AF19 100%)`,
                  }}
                />

                <div
                  className="relative bg-[#0F0F0F] rounded-[26px] p-6 max-h-[80vh] overflow-hidden flex flex-col"
                  style={{
                    boxShadow: "0 4px 4px 0 rgba(0, 0, 0, 0.25)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium text-xl">
                      Swap History
                    </h3>
                    <button
                      onClick={() => setActiveTab("swap")}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* History List */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {historyData.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#191919] rounded-xl p-4 hover:bg-[#252525] transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Token Icon */}
                            <div
                              className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center`}
                            >
                              <span className="text-white text-xs font-bold">
                                {item.symbol[0]}
                              </span>
                            </div>

                            {/* Transaction Details */}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">
                                  {item.type === "sell" ? "Sell" : "Buy"} Token
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-white font-medium">
                                  {item.token}
                                </span>
                                <span className="text-gray-400 text-sm">
                                  {item.symbol}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Side Info */}
                          <div className="text-right">
                            <div className="text-gray-400 text-xs mb-1">
                              {item.date}
                            </div>
                            <div
                              className={`font-medium ${
                                item.type === "sell"
                                  ? "text-red-400"
                                  : "text-green-400"
                              }`}
                            >
                              {item.amount} {item.value}
                            </div>
                            {item.status === "completed" && (
                              <div className="inline-flex items-center gap-1 bg-[#E2AF19]/10 text-[#E2AF19] text-xs px-2 py-1 rounded mt-1">
                                <CheckCircle size={10} />
                                <span>Completed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
