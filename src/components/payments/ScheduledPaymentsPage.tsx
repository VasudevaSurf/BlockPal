"use client";

import { useState } from "react";
import {
  Calendar,
  ChevronDown,
  Bell,
  HelpCircle,
  Edit,
  ExternalLink,
  Hash,
  Clock,
  Repeat,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface Transaction {
  id: string;
  username: string;
  token: string;
  amount: number;
  date: string;
  status: "active" | "completed";
  frequency?: string;
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    username: "@theweb3guy",
    token: "Ethereum",
    amount: 300,
    date: "4/20/2025",
    status: "active",
    frequency: "Weekly",
  },
  {
    id: "2",
    username: "0xAD7a4hw64...R8J6153",
    token: "USDT",
    amount: 300,
    date: "4/20/2025",
    status: "completed",
  },
  {
    id: "3",
    username: "@theweb3guy",
    token: "Ethereum",
    amount: 300,
    date: "4/20/2025",
    status: "active",
    frequency: "Monthly",
  },
  {
    id: "4",
    username: "0xAD7a4hw64...R8J6153",
    token: "Solana",
    amount: 300,
    date: "4/20/2025",
    status: "active",
  },
  {
    id: "5",
    username: "@theweb3guy",
    token: "Polkadot",
    amount: 300,
    date: "4/20/2025",
    status: "active",
    frequency: "Daily",
  },
  {
    id: "6",
    username: "0xAD7a4hw64...R8J6153",
    token: "Solana",
    amount: 300,
    date: "4/20/2025",
    status: "active",
  },
  {
    id: "7",
    username: "@theweb3guy",
    token: "Sui",
    amount: 300,
    date: "4/20/2025",
    status: "active",
  },
  {
    id: "8",
    username: "0xAD7a4hw64...R8J6153",
    token: "XRP",
    amount: 300,
    date: "4/20/2025",
    status: "active",
  },
];

const getTokenIcon = (token: string) => {
  const icons: Record<string, { bg: string; symbol: string }> = {
    Ethereum: { bg: "bg-blue-500", symbol: "Ξ" },
    USDT: { bg: "bg-green-500", symbol: "₮" },
    Solana: { bg: "bg-purple-500", symbol: "◎" },
    Polkadot: { bg: "bg-pink-500", symbol: "●" },
    Sui: { bg: "bg-cyan-500", symbol: "~" },
    XRP: { bg: "bg-gray-500", symbol: "✕" },
  };
  return icons[token] || { bg: "bg-gray-500", symbol: "?" };
};

export default function ScheduledPaymentsPage() {
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
    date: "",
  });
  const [selectedToken, setSelectedToken] = useState("USD");
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("weekly");
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const filteredTransactions = mockTransactions.filter(
    (tx) => tx.status === activeTab
  );

  const activeCount = mockTransactions.filter(
    (tx) => tx.status === "active"
  ).length;
  const completedCount = mockTransactions.filter(
    (tx) => tx.status === "completed"
  ).length;

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Scheduled Payments
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "6px 6px lg:8px 8px",
                }}
              ></div>
            </div>
            <span className="text-white text-xs sm:text-sm font-satoshi mr-2 min-w-0 truncate">
              Wallet 1
            </span>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              0xAD7a4hw64...R8J6153
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {/* Schedule Payment Form - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Schedule Payment
          </h2>

          <div className="space-y-4">
            {/* Recipient */}
            <div>
              <Input
                type="text"
                placeholder="@username or address"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                className="font-satoshi text-gray-400"
              />
            </div>

            {/* Token and Amount Row */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  <span className="text-white font-satoshi text-sm">USD</span>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              <Input
                type="text"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="font-satoshi"
              />
            </div>

            {/* Date and Recurring Row */}
            <div className="space-y-3">
              {/* Date Picker */}
              <div className="flex items-center bg-black border border-[#2C2C2C] rounded-lg px-3 py-3">
                <Calendar size={16} className="text-gray-400 mr-2" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="bg-transparent text-white font-satoshi text-sm flex-1 outline-none"
                />
              </div>

              {/* Recurring Toggle */}
              <div className="flex items-center justify-between bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="flex items-center">
                  <Repeat size={16} className="text-gray-400 mr-2" />
                  <span className="text-white font-satoshi text-sm">
                    Enable recurring payments
                  </span>
                </div>
                <button
                  onClick={() => setRecurringEnabled(!recurringEnabled)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    recurringEnabled ? "bg-[#E2AF19]" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      recurringEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Frequency Selector */}
              {recurringEnabled && (
                <div>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value)}
                    className="w-full bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-white font-satoshi text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-3 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity">
                Reset
              </button>
              <Button className="flex-1 font-satoshi">Schedule Payment</Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white font-satoshi">
              Payments
            </h3>

            {/* Tab Buttons */}
            <div className="flex bg-[#0F0F0F] rounded-lg p-1 border border-[#2C2C2C]">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1.5 rounded-md font-satoshi text-sm transition-colors ${
                  activeTab === "active"
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-3 py-1.5 rounded-md font-satoshi text-sm transition-colors ${
                  activeTab === "completed"
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Mobile Transaction Cards */}
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => {
              const tokenIcon = getTokenIcon(transaction.token);
              return (
                <div
                  key={transaction.id}
                  className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-white text-sm">
                          {transaction.username.startsWith("@")
                            ? transaction.username[1].toUpperCase()
                            : "0"}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm font-satoshi">
                          {transaction.username}
                        </div>
                        <div className="flex items-center mt-1">
                          <div
                            className={`w-4 h-4 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-1`}
                          >
                            <span className="text-white text-xs font-bold">
                              {tokenIcon.symbol}
                            </span>
                          </div>
                          <span className="text-gray-400 text-xs font-satoshi">
                            {transaction.token}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-white font-bold font-satoshi">
                        ${transaction.amount}
                      </div>
                      <div className="text-gray-400 text-xs font-satoshi">
                        {transaction.date}
                      </div>
                    </div>
                  </div>

                  {/* Status and Frequency */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {transaction.status === "active" && (
                        <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-satoshi font-medium">
                          Active
                        </span>
                      )}
                      {transaction.frequency && (
                        <span className="bg-[#2C2C2C] text-gray-300 px-2 py-1 rounded-full text-xs font-satoshi flex items-center">
                          <Repeat size={10} className="mr-1" />
                          {transaction.frequency}
                        </span>
                      )}
                    </div>

                    {transaction.status === "active" &&
                      !transaction.frequency && (
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-satoshi flex items-center">
                          <Clock size={10} className="mr-1" />
                          One-time
                        </span>
                      )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-3 pt-3 border-t border-[#2C2C2C]">
                    {activeTab === "active" ? (
                      <button className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                        <Edit size={12} className="mr-1" />
                        Edit
                      </button>
                    ) : (
                      <>
                        <button className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                          <ExternalLink size={12} className="mr-1" />
                          Explorer
                        </button>
                        <button className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                          <Hash size={12} className="mr-1" />
                          Hash
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex flex-col gap-6 flex-1 min-h-0">
        {/* Schedule Payment Form */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-6 font-satoshi">
            Schedule Payment
          </h2>

          {/* Form Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="col-span-2">
              <Input
                type="text"
                placeholder="@username or address"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                className="font-satoshi text-gray-400"
              />
            </div>

            {/* USD Token Selector */}
            <div>
              <button className="w-full flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-4 py-3 text-left">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  <span className="text-white font-satoshi">USD</span>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <Input
                type="text"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="font-satoshi"
              />
            </div>
          </div>

          {/* Date and Recurring Row */}
          <div className="flex items-center justify-between mb-6">
            {/* Date Picker */}
            <div className="flex items-center bg-black border border-[#2C2C2C] rounded-lg px-4 py-3">
              <Calendar size={16} className="text-gray-400 mr-2" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="bg-transparent text-white font-satoshi outline-none"
              />
            </div>

            {/* Recurring Options */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-white font-satoshi mr-4">
                  Enable recurring payments
                </span>
                <button
                  onClick={() => setRecurringEnabled(!recurringEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    recurringEnabled ? "bg-[#E2AF19]" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      recurringEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {recurringEnabled && (
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className="bg-black border border-[#2C2C2C] rounded-lg px-3 py-2 text-white font-satoshi"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button className="px-4 py-2 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity">
              Reset
            </button>
            <Button className="font-satoshi">Transfer</Button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-1 flex flex-col min-h-0">
          {/* Header with Radio Options */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white font-satoshi">
              Scheduled Payments
            </h2>

            {/* Radio Options */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-black border border-[#2C2C2C] rounded-lg px-4 py-3">
                <input
                  type="radio"
                  id="active-radio"
                  name="transaction-status"
                  checked={activeTab === "active"}
                  onChange={() => setActiveTab("active")}
                  className="h-4 w-4 mr-2"
                  style={{ accentColor: "#E2AF19" }}
                />
                <label
                  htmlFor="active-radio"
                  className="text-white font-satoshi text-sm"
                >
                  Active ({activeCount})
                </label>
              </div>

              <div className="flex items-center bg-black border border-[#2C2C2C] rounded-lg px-4 py-3">
                <input
                  type="radio"
                  id="completed-radio"
                  name="transaction-status"
                  checked={activeTab === "completed"}
                  onChange={() => setActiveTab("completed")}
                  className="h-4 w-4 mr-2"
                  style={{ accentColor: "#E2AF19" }}
                />
                <label
                  htmlFor="completed-radio"
                  className="text-white font-satoshi text-sm"
                >
                  Completed ({completedCount})
                </label>
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className="bg-[#0F0F0F] rounded-lg mb-2">
            <div className="grid grid-cols-5 gap-2 px-3 py-3">
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Username/Address
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Token Name
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Amount
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Date
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-center">
                Action
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredTransactions.map((transaction, index) => {
              const tokenIcon = getTokenIcon(transaction.token);
              return (
                <div key={transaction.id}>
                  <div className="grid grid-cols-5 gap-2 items-center py-2 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                    <div className="flex items-center min-w-0">
                      <div className="w-6 h-6 bg-gray-600 rounded-full mr-2 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">
                          {transaction.username.startsWith("@")
                            ? transaction.username[1].toUpperCase()
                            : "0"}
                        </span>
                      </div>
                      <span className="text-white font-satoshi text-sm truncate">
                        {transaction.username}
                      </span>
                    </div>

                    <div className="flex items-center min-w-0">
                      <div
                        className={`w-5 h-5 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                      >
                        <span className="text-white text-xs font-bold">
                          {tokenIcon.symbol}
                        </span>
                      </div>
                      <span className="text-white font-satoshi text-sm truncate">
                        {transaction.token}
                      </span>
                    </div>

                    <div className="text-white font-satoshi text-sm">
                      ${transaction.amount}
                    </div>

                    <div className="text-white font-satoshi text-sm">
                      {transaction.date}
                    </div>

                    <div className="text-center">
                      {activeTab === "active" ? (
                        <button className="bg-[#E2AF19] text-black px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center justify-center mx-auto">
                          <Edit size={12} className="mr-1" />
                          Edit
                        </button>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <button className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                            <ExternalLink size={10} className="mr-1" />
                            Explorer
                          </button>
                          <button className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                            <Hash size={10} className="mr-1" />
                            Hash
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {index < filteredTransactions.length - 1 && (
                    <div className="border-b border-[#2C2C2C] mx-3 my-1"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Custom date input styling */
        input[type="date"] {
          color-scheme: dark;
        }
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }

        /* Custom select styling */
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
      `}</style>
    </div>
  );
}
