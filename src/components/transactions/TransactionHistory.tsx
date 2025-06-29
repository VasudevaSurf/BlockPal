// src/components/transactions/TransactionHistory.tsx
"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  ExternalLink,
  Hash,
  Copy,
  Calendar,
  Clock,
} from "lucide-react";

interface Transaction {
  _id?: string;
  id?: string;
  transactionHash?: string;
  hash?: string;
  direction?: "sent" | "received";
  type?: string;
  tokenSymbol?: string;
  token?: string;
  amount?: string | number;
  amountFormatted?: string;
  valueUSD?: number;
  batchSize?: number;
  timestamp?: string;
  date?: string;
  status?: string;
  username?: string;
}

interface TransactionHistoryProps {
  walletAddress?: string;
  contractAddress?: string;
  limit?: number;
  title?: string;
  showRefresh?: boolean;
  className?: string;
}

const getTokenIcon = (token: string) => {
  const icons: Record<string, { bg: string; symbol: string }> = {
    Ethereum: { bg: "bg-blue-500", symbol: "Ξ" },
    ETH: { bg: "bg-blue-500", symbol: "Ξ" },
    USDT: { bg: "bg-green-500", symbol: "₮" },
    USDC: { bg: "bg-blue-600", symbol: "$" },
    LINK: { bg: "bg-blue-700", symbol: "⛓" },
    DAI: { bg: "bg-yellow-500", symbol: "◈" },
    UNI: { bg: "bg-pink-500", symbol: "🦄" },
    Solana: { bg: "bg-purple-500", symbol: "◎" },
    Polkadot: { bg: "bg-pink-500", symbol: "●" },
    Sui: { bg: "bg-cyan-500", symbol: "~" },
    XRP: { bg: "bg-gray-500", symbol: "✕" },
  };
  return icons[token] || { bg: "bg-gray-500", symbol: "?" };
};

export default function TransactionHistory({
  walletAddress,
  contractAddress,
  limit = 20,
  title = "Transaction History",
  showRefresh = true,
  className = "",
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    fetchTransactions();
  }, [walletAddress, contractAddress]);

  const fetchTransactions = async () => {
    if (!walletAddress && !contractAddress) return;

    try {
      setLoading(true);

      let url = "/api/transactions";
      const params = new URLSearchParams();

      if (contractAddress) {
        url = "/api/transactions/token";
        params.append("contractAddress", contractAddress);
      }

      if (walletAddress) {
        params.append("walletAddress", walletAddress);
      }

      params.append("limit", limit.toString());

      const response = await fetch(`${url}?${params.toString()}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        console.log(
          "✅ Transaction history fetched:",
          data.transactions?.length || 0
        );
      } else {
        console.error("❌ Failed to fetch transaction history");
      }
    } catch (error) {
      console.error("❌ Error fetching transaction history:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString();
    } catch {
      return "";
    }
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white font-satoshi">
          {title}
        </h3>
        {showRefresh && (
          <button
            onClick={fetchTransactions}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={16} className="animate-spin text-gray-400 mr-2" />
            <span className="text-gray-400 text-sm">
              Loading transactions...
            </span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar size={20} className="text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm font-satoshi">
              No transactions found
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, index) => {
              const tokenIcon = getTokenIcon(tx.tokenSymbol || tx.token || "");
              const hash = tx.transactionHash || tx.hash;

              return (
                <div
                  key={tx._id || tx.id || index}
                  className="flex items-center justify-between py-3 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center mb-1">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          tx.direction === "sent"
                            ? "bg-red-400"
                            : "bg-green-400"
                        }`}
                      />
                      <div className="text-white font-medium text-sm font-satoshi">
                        {tx.direction === "sent" ? "Sent" : "Received"}
                      </div>
                      {tx.batchSize && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          Batch ({tx.batchSize})
                        </span>
                      )}
                      {tx.type?.includes("scheduled") && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                          Scheduled
                        </span>
                      )}
                    </div>

                    <div className="flex items-center mb-1">
                      <div
                        className={`w-4 h-4 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                      >
                        <span className="text-white text-xs font-bold">
                          {tokenIcon.symbol}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm font-satoshi">
                        {tx.tokenSymbol || tx.token}
                      </span>
                    </div>

                    <div className="text-gray-400 text-xs font-satoshi">
                      {tx.timestamp
                        ? `${formatDate(tx.timestamp)} at ${formatTime(
                            tx.timestamp
                          )}`
                        : tx.date}
                    </div>

                    {hash && (
                      <div className="flex items-center mt-1">
                        <span className="text-gray-400 text-xs font-mono">
                          {hash.slice(0, 10)}...{hash.slice(-6)}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(hash, `tx-hash-${index}`)
                          }
                          className="ml-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                        {copied === `tx-hash-${index}` && (
                          <span className="ml-2 text-green-400 text-xs">
                            Copied!
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-white font-medium text-sm font-satoshi">
                      {tx.batchSize
                        ? tx.amountFormatted ||
                          `$${tx.valueUSD?.toFixed(2) || "0.00"}`
                        : typeof tx.amount === "string"
                        ? tx.amount
                        : `$${tx.amount || tx.valueUSD?.toFixed(2) || "0"}`}
                    </div>

                    {tx.valueUSD && !tx.batchSize && (
                      <div className="text-gray-400 text-xs font-satoshi">
                        ${tx.valueUSD.toFixed(2)}
                      </div>
                    )}

                    {hash && (
                      <div className="flex items-center justify-end mt-1 space-x-1">
                        <button
                          onClick={() =>
                            window.open(
                              `https://etherscan.io/tx/${hash}`,
                              "_blank"
                            )
                          }
                          className="text-[#E2AF19] hover:opacity-80 transition-opacity"
                          title="View on Etherscan"
                        >
                          <ExternalLink size={12} />
                        </button>
                        <button
                          onClick={() => copyToClipboard(hash, `hash-${index}`)}
                          className="text-[#E2AF19] hover:opacity-80 transition-opacity"
                          title="Copy hash"
                        >
                          <Hash size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
