"use client";

import { useState } from "react";
import {
  Bell,
  HelpCircle,
  ExternalLink,
  Hash,
  Plus,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface BatchPayment {
  id: string;
  username: string;
  token: string;
  amount: number;
  estimatedGas: number;
}

interface Transaction {
  id: string;
  username: string;
  token: string;
  amount: number;
  date: string;
  estimatedGas: number;
}

const mockBatchPayments: BatchPayment[] = [
  {
    id: "1",
    username: "@theweb3guy",
    token: "USDT",
    amount: 120,
    estimatedGas: 2.34,
  },
  {
    id: "2",
    username: "@theweb3guy",
    token: "USDT",
    amount: 120,
    estimatedGas: 2.34,
  },
  {
    id: "3",
    username: "@theweb3guy",
    token: "USDT",
    amount: 120,
    estimatedGas: 2.34,
  },
  {
    id: "4",
    username: "0xAD7a4hw64...R8J6153",
    token: "USDT",
    amount: 150,
    estimatedGas: 2.34,
  },
  {
    id: "5",
    username: "@cryptodev",
    token: "USDT",
    amount: 200,
    estimatedGas: 2.34,
  },
  {
    id: "6",
    username: "0x8aFp230...5GJR0ETy",
    token: "USDT",
    amount: 75,
    estimatedGas: 2.34,
  },
];

const mockTransactions: Transaction[] = [
  {
    id: "1",
    username: "@theweb3guy",
    token: "Ethereum",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
  },
  {
    id: "2",
    username: "0xAD7a4hw64...R8J6153",
    token: "USDT",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
  },
  {
    id: "3",
    username: "@theweb3guy",
    token: "Ethereum",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
  },
  {
    id: "4",
    username: "0xAD7a4hw64...R8J6153",
    token: "Solana",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
  },
  {
    id: "5",
    username: "@theweb3guy",
    token: "Polkadot",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
  },
  {
    id: "6",
    username: "0xAD7a4hw64...R8J6153",
    token: "XRP",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
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

export default function BatchPaymentsPage() {
  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
  });
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [batchPayments, setBatchPayments] =
    useState<BatchPayment[]>(mockBatchPayments);

  const addToBatch = () => {
    if (formData.recipient && formData.amount) {
      const newPayment: BatchPayment = {
        id: Date.now().toString(),
        username: formData.recipient,
        token: selectedToken,
        amount: parseFloat(formData.amount),
        estimatedGas: 2.34,
      };
      setBatchPayments([...batchPayments, newPayment]);
      setFormData({ recipient: "", amount: "" });
    }
  };

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[20px] p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white font-mayeka">
            Batch Payments
          </h1>
        </div>

        <div className="flex items-center space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-4 py-3">
            <div className="w-8 h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-3 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "8px 8px",
                }}
              ></div>
            </div>
            <span className="text-white text-sm font-satoshi mr-2">
              Wallet 1
            </span>
            <div className="w-px h-4 bg-[#2C2C2C] mr-3"></div>
            <span className="text-gray-400 text-sm font-satoshi mr-3">
              0xAD7a4hw64...R8J6153
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 py-3">
            <button className="p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={20} className="text-gray-400" />
            </button>
            <div className="w-px h-4 bg-[#2C2C2C] mx-2"></div>
            <button className="p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={20} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        {/* Combined Batch Payments Form and List */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Batch Payments
          </h2>

          {/* Input Row with Add Button at end - Reduced size */}
          <div className="flex gap-3 mb-4">
            <div className="flex-[2]">
              <Input
                type="text"
                placeholder="@username or address"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                className="font-satoshi text-gray-400 py-2 text-sm"
              />
            </div>

            {/* USDT Token Selector */}
            <div className="flex-1">
              <button className="w-full flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-2 text-left">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-xs font-bold">₮</span>
                  </div>
                  <span className="text-white font-satoshi text-sm">USDT</span>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </div>

            {/* Amount Input */}
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="font-satoshi py-2 text-sm"
              />
            </div>

            {/* Est. Gas Display */}
            <div className="flex-1">
              <div className="flex items-center px-3 py-2 bg-black border border-[#2C2C2C] rounded-lg h-full">
                <span className="text-white font-satoshi text-sm">$2.340</span>
              </div>
            </div>

            {/* Add Button */}
            <div className="flex-shrink-0">
              <button
                onClick={addToBatch}
                className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center justify-center h-full text-sm"
              >
                <Plus size={14} className="mr-1" />
                Add
              </button>
            </div>
          </div>

          {/* Smaller Divider */}
          <div className="border-t border-[#2C2C2C] mb-4"></div>

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
                Est. Gas
              </div>
              <div></div>
            </div>
          </div>

          {/* Batch Payments List - Adjusted for better visibility */}
          <div
            className="overflow-y-auto scrollbar-hide mb-6"
            style={{ maxHeight: "160px" }}
          >
            <div>
              {batchPayments.map((payment, index) => {
                const tokenIcon = getTokenIcon(payment.token);
                return (
                  <div key={payment.id}>
                    <div className="grid grid-cols-5 gap-2 items-center py-3 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                      <div className="flex items-center min-w-0">
                        <div className="w-6 h-6 bg-gray-600 rounded-full mr-2 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs">
                            {payment.username.startsWith("@")
                              ? payment.username[1].toUpperCase()
                              : "0"}
                          </span>
                        </div>
                        <span className="text-white font-satoshi text-sm truncate">
                          {payment.username}
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
                          {payment.token}
                        </span>
                      </div>

                      <div className="text-white font-satoshi text-sm">
                        ${payment.amount}
                      </div>

                      <div className="text-white font-satoshi text-sm">
                        ${payment.estimatedGas}
                      </div>

                      <div></div>
                    </div>

                    {/* Divider */}
                    {index < batchPayments.length - 1 && (
                      <div className="border-b border-[#2C2C2C] mx-3 my-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset and Transfer Buttons at Bottom */}
          <div className="flex justify-end space-x-3">
            <button className="px-4 py-2 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity">
              Reset
            </button>
            <Button className="font-satoshi">Transfer</Button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-white font-satoshi mb-6">
            Transaction History
          </h2>

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
                Edit
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div>
              {mockTransactions.map((transaction, index) => {
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
                        <div className="flex items-center justify-center space-x-2">
                          <button className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                            <span className="mr-1">Explorer</span>
                            <ExternalLink size={10} />
                          </button>
                          <button className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                            <span className="mr-1">Hash</span>
                            <Hash size={10} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    {index < mockTransactions.length - 1 && (
                      <div className="border-b border-[#2C2C2C] mx-3 my-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
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
      `}</style>
    </div>
  );
}
