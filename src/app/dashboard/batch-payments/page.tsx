"use client";

import { useState } from "react";
import {
  Bell,
  HelpCircle,
  ExternalLink,
  Hash,
  Plus,
  ChevronDown,
  X,
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

  const removeFromBatch = (id: string) => {
    setBatchPayments(batchPayments.filter((payment) => payment.id !== id));
  };

  const totalAmount = batchPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const totalGas = batchPayments.reduce(
    (sum, payment) => sum + payment.estimatedGas,
    0
  );

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Batch Payments
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
        {/* Batch Payments Form */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Add Payment
          </h2>

          {/* Mobile Form Layout */}
          <div className="space-y-3">
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

            <div className="grid grid-cols-2 gap-3">
              {/* Token Selector */}
              <button className="flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-xs font-bold">₮</span>
                  </div>
                  <span className="text-white font-satoshi text-sm">USDT</span>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Amount Input */}
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

            {/* Gas Estimate Display */}
            <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm font-satoshi">
                  Estimated Gas:
                </span>
                <span className="text-white text-sm font-satoshi">$2.34</span>
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={addToBatch}
              className="w-full bg-[#E2AF19] text-black px-4 py-3 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center justify-center"
            >
              <Plus size={16} className="mr-2" />
              Add to Batch
            </button>
          </div>
        </div>

        {/* Batch Summary */}
        {batchPayments.length > 0 && (
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Batch Summary
              </h3>
              <div className="text-sm text-gray-400 font-satoshi">
                {batchPayments.length} payments
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="text-gray-400 text-xs font-satoshi mb-1">
                  Total Amount
                </div>
                <div className="text-white text-lg font-bold font-satoshi">
                  ${totalAmount}
                </div>
              </div>
              <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="text-gray-400 text-xs font-satoshi mb-1">
                  Total Gas
                </div>
                <div className="text-white text-lg font-bold font-satoshi">
                  ${totalGas.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBatchPayments([])}
                className="flex-1 px-4 py-2 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity"
              >
                Reset
              </button>
              <Button className="flex-1 font-satoshi">Execute Batch</Button>
            </div>
          </div>
        )}

        {/* Batch Payments List - Mobile Cards */}
        {batchPayments.length > 0 && (
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              Payments Queue ({batchPayments.length})
            </h3>

            <div className="space-y-3">
              {batchPayments.map((payment) => {
                const tokenIcon = getTokenIcon(payment.token);
                return (
                  <div
                    key={payment.id}
                    className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] relative"
                  >
                    <button
                      onClick={() => removeFromBatch(payment.id)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>

                    <div className="flex items-center mb-3 pr-6">
                      <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-white text-sm">
                          {payment.username.startsWith("@")
                            ? payment.username[1].toUpperCase()
                            : "0"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium font-satoshi truncate">
                          {payment.username}
                        </div>
                        <div className="flex items-center mt-1">
                          <div
                            className={`w-4 h-4 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-1`}
                          >
                            <span className="text-white text-xs font-bold">
                              {tokenIcon.symbol}
                            </span>
                          </div>
                          <span className="text-gray-400 text-sm font-satoshi">
                            {payment.token}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold font-satoshi">
                          ${payment.amount}
                        </div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Gas: ${payment.estimatedGas}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction History - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white font-satoshi mb-4">
            Recent Transactions
          </h3>

          <div className="space-y-3">
            {mockTransactions.slice(0, 8).map((transaction) => {
              const tokenIcon = getTokenIcon(transaction.token);
              return (
                <div
                  key={transaction.id}
                  className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]"
                >
                  <div className="flex items-center justify-between mb-2">
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

                  <div className="flex justify-center space-x-3 pt-2 border-t border-[#2C2C2C]">
                    <button className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                      <ExternalLink size={12} className="mr-1" />
                      Explorer
                    </button>
                    <button className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                      <Hash size={12} className="mr-1" />
                      Hash
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex flex-col gap-6 flex-1 min-h-0">
        {/* Combined Batch Payments Form and List */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-white mb-6 font-satoshi">
            Batch Payments
          </h2>

          {/* Input Row - Desktop Grid */}
          <div className="grid grid-cols-8 gap-3 mb-4">
            <div className="col-span-3">
              <Input
                type="text"
                placeholder="@username or address"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                className="font-satoshi text-gray-400 py-3 text-sm h-full"
              />
            </div>

            {/* USDT Token Selector */}
            <div className="col-span-2">
              <button className="w-full h-full flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-left">
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
            <div className="col-span-2">
              <Input
                type="text"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="font-satoshi py-3 text-sm h-full"
              />
            </div>

            {/* Add Button - Even smaller */}
            <div className="col-span-1">
              <button
                onClick={addToBatch}
                className="bg-[#E2AF19] text-black px-1 py-3 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center justify-center w-full h-full text-xs"
              >
                <Plus size={10} className="mr-1" />
                Add
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#2C2C2C] mb-4"></div>

          {/* Table Header */}
          <div className="bg-[#0F0F0F] rounded-lg mb-2">
            <div className="grid grid-cols-4 gap-2 px-3 py-3">
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
            </div>
          </div>

          {/* Batch Payments List */}
          <div
            className="overflow-y-auto scrollbar-hide mb-6 flex-1"
            style={{ maxHeight: "300px" }}
          >
            {batchPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
                  <Plus size={24} className="text-gray-400" />
                </div>
                <h3 className="text-white text-lg font-satoshi mb-2">
                  No payments in batch
                </h3>
                <p className="text-gray-400 font-satoshi text-center">
                  Add recipients above to start building your batch payment
                </p>
              </div>
            ) : (
              <div>
                {batchPayments.map((payment, index) => {
                  const tokenIcon = getTokenIcon(payment.token);
                  return (
                    <div key={payment.id}>
                      <div className="grid grid-cols-4 gap-2 items-center py-3 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors">
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
                      </div>

                      {index < batchPayments.length - 1 && (
                        <div className="border-b border-[#2C2C2C] mx-3 my-1"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reset and Transfer Buttons at Bottom */}
          {batchPayments.length > 0 && (
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setBatchPayments([])}
                className="px-4 py-2 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity"
              >
                Reset
              </button>
              <Button className="font-satoshi">Transfer</Button>
            </div>
          )}
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
                Actions
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
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
                          <ExternalLink size={10} className="mr-1" />
                          Explorer
                        </button>
                        <button className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                          <Hash size={10} className="mr-1" />
                          Hash
                        </button>
                      </div>
                    </div>
                  </div>

                  {index < mockTransactions.length - 1 && (
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
      `}</style>
    </div>
  );
}
