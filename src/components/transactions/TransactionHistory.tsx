// src/components/transactions/TransactionHistory.tsx - REDESIGNED: Clean & readable
"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  ExternalLink,
  Hash,
  Copy,
  Calendar,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SkeletonTransactionHistory } from "@/components/ui/Skeleton";

interface Transaction {
  _id?: string;
  id?: string;
  transactionHash?: string;
  hash?: string;
  direction?: "sent" | "received";
  type?: string;
  category?: string;
  tokenSymbol?: string;
  token?: string;
  amount?: string | number;
  amountFormatted?: string;
  valueUSD?: number;
  batchSize?: number;
  transferMode?: string;
  totalTransfers?: number;
  totalValueUSD?: number;
  timestamp?: string;
  date?: string;
  status?: string;
  username?: string;
  contractAddress?: string;
  senderWallet?: string;
  receiverWallet?: string;
  transfers?: Array<{
    recipient: string;
    tokenSymbol: string;
    contractAddress: string;
    amount: string;
    usdValue: number;
  }>;
}

interface TransactionHistoryProps {
  walletAddress?: string;
  contractAddress?: string;
  tokenFilter?: string;
  transactionTypeFilter?: string;
  limit?: number;
  title?: string;
  showRefresh?: boolean;
  showFilter?: boolean;
  compact?: boolean;
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
  return icons[token] || { bg: "bg-gray-500", symbol: token.charAt(0) };
};

const getBatchTransactionInfo = (tx: Transaction) => {
  if (tx.type === "batch" || tx.category === "batch_transfer" || tx.transfers) {
    const uniqueTokens = new Set(tx.transfers?.map((t) => t.tokenSymbol) || []);
    const tokenCount = uniqueTokens.size;
    const transferCount = tx.totalTransfers || tx.transfers?.length || 0;
    const totalValue =
      tx.totalValueUSD ||
      tx.transfers?.reduce((sum, t) => sum + t.usdValue, 0) ||
      0;

    if (tokenCount === 1) {
      const tokenSymbol = Array.from(uniqueTokens)[0] || "Unknown";
      return {
        isBatch: true,
        displaySymbol: tokenSymbol,
        displayAmount: transferCount.toString(),
        displayValue: totalValue,
        batchInfo: `${transferCount} transfers`,
        tokenCount: 1,
      };
    } else if (tokenCount > 1) {
      return {
        isBatch: true,
        displaySymbol: "MIXED",
        displayAmount: transferCount.toString(),
        displayValue: totalValue,
        batchInfo: `${transferCount} transfers`,
        tokenCount,
      };
    }
  }

  return {
    isBatch: false,
    displaySymbol: tx.tokenSymbol || tx.token || "Unknown",
    displayAmount:
      typeof tx.amount === "string" ? tx.amount : `${tx.amount || "0"}`,
    displayValue: tx.valueUSD || 0,
    batchInfo: null,
    tokenCount: 1,
  };
};

export default function TransactionHistory({
  walletAddress,
  contractAddress,
  tokenFilter,
  transactionTypeFilter,
  limit = 20,
  title = "Transaction History",
  showRefresh = true,
  showFilter = true,
  compact = false,
  className = "",
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchTransactions();
  }, [walletAddress, contractAddress, tokenFilter, transactionTypeFilter]);

  const fetchTransactions = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      if (transactions.length === 0) {
        setInitialLoading(true);
      }

      await new Promise((resolve) => setTimeout(resolve, 800));

      let url = "/api/transactions";
      const params = new URLSearchParams();

      params.append("walletAddress", walletAddress);
      params.append("limit", limit.toString());

      if (contractAddress) {
        url = "/api/transactions/token";
        params.append("contractAddress", contractAddress);
      } else if (tokenFilter) {
        if (tokenFilter === "ETH") {
          params.append("type", "simple_eth");
        } else {
          url = "/api/transactions/token";
          params.append("contractAddress", tokenFilter);
        }
      }

      if (transactionTypeFilter && !contractAddress && tokenFilter !== "ETH") {
        params.append("type", transactionTypeFilter);
      }

      const response = await fetch(`${url}?${params.toString()}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        let fetchedTransactions = data.transactions || [];

        if (tokenFilter) {
          fetchedTransactions = fetchedTransactions.filter(
            (tx: Transaction) => {
              if (tokenFilter === "ETH") {
                return (
                  tx.tokenSymbol === "ETH" ||
                  tx.token === "ETH" ||
                  tx.type === "simple_eth" ||
                  tx.contractAddress === "native" ||
                  (!tx.contractAddress &&
                    (tx.tokenSymbol === "ETH" || tx.token === "ETH"))
                );
              }

              return (
                tx.contractAddress === tokenFilter ||
                tx.tokenSymbol === tokenFilter ||
                tx.token === tokenFilter
              );
            }
          );
        }

        if (transactionTypeFilter) {
          fetchedTransactions = fetchedTransactions.filter(
            (tx: Transaction) => {
              if (transactionTypeFilter === "batch") {
                return (
                  tx.type === "batch" ||
                  tx.category === "batch_transfer" ||
                  tx.batchSize > 0 ||
                  tx.transferMode === "BATCH" ||
                  tx.transferMode === "MIXED" ||
                  tx.transfers?.length > 0
                );
              }

              return tx.type === transactionTypeFilter;
            }
          );
        }

        if (walletAddress) {
          fetchedTransactions = fetchedTransactions.filter(
            (tx: Transaction) =>
              tx.senderWallet?.toLowerCase() === walletAddress.toLowerCase() ||
              tx.receiverWallet?.toLowerCase() === walletAddress.toLowerCase()
          );
        }

        setTransactions(fetchedTransactions);
      }
    } catch (error) {
      console.error("❌ Error fetching transaction history:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
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

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getTransactionDirection = (tx: Transaction): "sent" | "received" => {
    if (tx.direction) return tx.direction;

    if (walletAddress) {
      if (tx.senderWallet?.toLowerCase() === walletAddress.toLowerCase()) {
        return "sent";
      } else if (
        tx.receiverWallet?.toLowerCase() === walletAddress.toLowerCase()
      ) {
        return "received";
      }
    }

    return "sent";
  };

  const toggleExpanded = (txId: string) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(txId)) {
      newExpanded.delete(txId);
    } else {
      newExpanded.add(txId);
    }
    setExpandedTransactions(newExpanded);
  };

  if (initialLoading) {
    return (
      <div className={`flex flex-col min-h-0 ${className}`}>
        <SkeletonTransactionHistory />
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <h3 className="text-base font-semibold text-white font-mayeka-demi-bold-demo">
          {title}
        </h3>
        {/* {showRefresh && (
          <button
            onClick={fetchTransactions}
            className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        )} */}
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            {/* <RefreshCw size={14} className="animate-spin text-gray-400 mr-2" /> */}
            <span className="text-gray-400 text-sm font-satoshi">
              Loading transactions...
            </span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar size={20} className="text-gray-400" />
            </div>
            <h3 className="text-white text-base font-satoshi mb-1.5">
              No transactions found
            </h3>
            <p className="text-gray-400 text-sm font-satoshi">
              {tokenFilter || transactionTypeFilter
                ? "Try adjusting your filters"
                : "Your transactions will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {transactions.map((tx, index) => {
              const txInfo = getBatchTransactionInfo(tx);
              const tokenIcon = getTokenIcon(txInfo.displaySymbol);
              const hash = tx.transactionHash || tx.hash;
              const direction = getTransactionDirection(tx);
              const txId = tx._id || tx.id || `tx-${index}`;
              const isExpanded = expandedTransactions.has(txId);

              return (
                <div
                  key={txId}
                  className="bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg p-2.5 hover:bg-[#1A1A1A] transition-colors"
                >
                  {/* Main Transaction Row */}
                  <div className="flex items-center justify-between">
                    {/* Left Side - Direction & Token */}
                    <div className="flex items-center space-x-2.5">
                      {/* Direction Icon */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          direction === "sent"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {direction === "sent" ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownLeft size={14} />
                        )}
                      </div>

                      {/* Token Info */}
                      <div className="flex items-center space-x-1.5">
                        {txInfo.displaySymbol === "MIXED" ? (
                          <div className="w-5 h-5 bg-[#E2AF19] rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              M
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 ${tokenIcon.bg} rounded-full flex items-center justify-center`}
                          >
                            <span className="text-white text-xs font-bold">
                              {tokenIcon.symbol}
                            </span>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-white font-medium font-satoshi text-sm">
                              {direction === "sent" ? "Sent" : "Received"}
                            </span>

                            {/* Transaction Type Badges */}
                            {tx.type?.includes("scheduled") && (
                              <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded-full font-satoshi flex items-center">
                                <Clock size={8} className="mr-1" />
                                Scheduled
                              </span>
                            )}
                          </div>

                          <div className="text-gray-400 text-xs font-satoshi">
                            {txInfo.isBatch
                              ? `${txInfo.batchInfo} • ${
                                  txInfo.tokenCount
                                } token${txInfo.tokenCount > 1 ? "s" : ""}`
                              : txInfo.displaySymbol}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Amount & Actions */}
                    <div className="flex items-center space-x-2.5">
                      {/* Amount */}
                      <div className="text-right">
                        <div className="text-white font-semibold font-satoshi text-sm">
                          {txInfo.isBatch
                            ? `$${txInfo.displayValue.toFixed(2)}`
                            : `${txInfo.displayAmount} ${txInfo.displaySymbol}`}
                        </div>

                        <div className="text-gray-400 text-xs font-satoshi">
                          {tx.timestamp
                            ? formatDateTime(tx.timestamp)
                            : tx.date}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-0.5">
                        {hash && (
                          <>
                            <button
                              onClick={() =>
                                window.open(
                                  `https://etherscan.io/tx/${hash}`,
                                  "_blank"
                                )
                              }
                              className="p-1.5 text-gray-400 hover:text-[#E2AF19] hover:bg-[#2C2C2C] rounded-lg transition-colors"
                              title="View on Etherscan"
                            >
                              <ExternalLink size={12} />
                            </button>

                            <button
                              onClick={() =>
                                copyToClipboard(hash, `hash-${index}`)
                              }
                              className="p-1.5 text-gray-400 hover:text-[#E2AF19] hover:bg-[#2C2C2C] rounded-lg transition-colors"
                              title="Copy transaction hash"
                            >
                              {copied === `hash-${index}` ? (
                                <span className="text-green-400 text-xs">
                                  ✓
                                </span>
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </>
                        )}

                        {/* Expand Button for Batch Transactions */}
                        {txInfo.isBatch &&
                          tx.transfers &&
                          tx.transfers.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(txId)}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors"
                              title={
                                isExpanded
                                  ? "Collapse details"
                                  : "Expand details"
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details for Batch Transactions */}
                  {txInfo.isBatch && isExpanded && tx.transfers && (
                    <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
                      <div className="space-y-1.5">
                        <div className="text-gray-400 text-xs font-satoshi mb-2">
                          Transfer Details:
                        </div>

                        {tx.transfers.map((transfer, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-1.5 px-2.5 bg-[#2C2C2C]/30 rounded-lg"
                          >
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`w-3.5 h-3.5 ${
                                  getTokenIcon(transfer.tokenSymbol).bg
                                } rounded-full flex items-center justify-center`}
                              >
                                <span className="text-white text-xs">
                                  {getTokenIcon(transfer.tokenSymbol).symbol}
                                </span>
                              </div>
                              <span className="text-gray-300 text-xs font-mono">
                                {transfer.recipient.slice(0, 6)}...
                                {transfer.recipient.slice(-4)}
                              </span>
                            </div>

                            <div className="text-right">
                              <div className="text-white text-xs font-satoshi">
                                {transfer.amount} {transfer.tokenSymbol}
                              </div>
                              <div className="text-gray-400 text-xs font-satoshi">
                                ${transfer.usdValue.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transaction Hash (always visible but clean) */}
                  {hash && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#2C2C2C]">
                      <div className="flex items-center space-x-1.5">
                        <Hash size={10} className="text-gray-400" />
                        <span className="text-gray-400 text-xs font-mono">
                          {hash.slice(0, 14)}...{hash.slice(-14)}
                        </span>
                      </div>
                    </div>
                  )}
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
