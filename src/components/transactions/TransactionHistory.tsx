// src/components/transactions/TransactionHistory.tsx - FIXED: Batch transaction display
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
  totalTransfers?: number; // FIXED: Add totalTransfers for batch
  totalValueUSD?: number; // FIXED: Add totalValueUSD for batch
  timestamp?: string;
  date?: string;
  status?: string;
  username?: string;
  contractAddress?: string;
  senderWallet?: string;
  receiverWallet?: string;
  // FIXED: Add transfers array for batch transactions
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
  return icons[token] || { bg: "bg-gray-500", symbol: "?" };
};

// FIXED: Helper function to extract batch transaction info
const getBatchTransactionInfo = (tx: Transaction) => {
  if (tx.type === "batch" || tx.category === "batch_transfer" || tx.transfers) {
    // Count unique tokens in the batch
    const uniqueTokens = new Set(tx.transfers?.map((t) => t.tokenSymbol) || []);
    const tokenCount = uniqueTokens.size;
    const transferCount = tx.totalTransfers || tx.transfers?.length || 0;
    const totalValue =
      tx.totalValueUSD ||
      tx.transfers?.reduce((sum, t) => sum + t.usdValue, 0) ||
      0;

    if (tokenCount === 1) {
      // Single token batch
      const tokenSymbol = Array.from(uniqueTokens)[0] || "Unknown";
      return {
        isBatch: true,
        displaySymbol: tokenSymbol,
        displayAmount: `${transferCount} transfers`,
        displayValue: totalValue,
        batchInfo: `${transferCount} ${tokenSymbol} transfers`,
      };
    } else if (tokenCount > 1) {
      // Multi-token batch
      return {
        isBatch: true,
        displaySymbol: "MIXED",
        displayAmount: `${transferCount} transfers`,
        displayValue: totalValue,
        batchInfo: `${transferCount} transfers (${tokenCount} tokens)`,
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

      // Simulate API call
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

      console.log(`🔍 Fetching transactions: ${url}?${params.toString()}`);

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
        console.log(
          `✅ Transaction history fetched: ${
            fetchedTransactions.length
          } transactions for ${tokenFilter || "all tokens"}`
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

  if (initialLoading && transactions.length === 0) {
    return (
      <div className={`flex flex-col min-h-0 ${className}`}>
        <SkeletonTransactionHistory />
      </div>
    );
  }

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

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
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

      {(tokenFilter || transactionTypeFilter) && !compact && (
        <div className="mb-4 text-sm text-gray-400 font-satoshi">
          Showing {tokenFilter || "all"} transactions
          {transactionTypeFilter && ` (${transactionTypeFilter})`}
        </div>
      )}

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
              No {tokenFilter ? `${tokenFilter} ` : ""}transactions found
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, index) => {
              // FIXED: Use the helper function to get transaction info
              const txInfo = getBatchTransactionInfo(tx);
              const tokenIcon = getTokenIcon(txInfo.displaySymbol);
              const hash = tx.transactionHash || tx.hash;
              const direction = getTransactionDirection(tx);

              return (
                <div
                  key={tx._id || tx.id || index}
                  className="flex items-center justify-between py-3 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center mb-1">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          direction === "sent" ? "bg-red-400" : "bg-green-400"
                        }`}
                      />
                      <div className="text-white font-medium text-sm font-satoshi">
                        {direction === "sent" ? "Sent" : "Received"}
                      </div>

                      {/* FIXED: Better batch indicators */}
                      {txInfo.isBatch && (
                        <div className="flex items-center ml-2 space-x-1">
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full flex items-center">
                            <Users size={10} className="mr-1" />
                            Batch
                          </span>
                          {tx.transferMode && (
                            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                              {tx.transferMode}
                            </span>
                          )}
                        </div>
                      )}

                      {tx.type?.includes("scheduled") && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                          Scheduled
                        </span>
                      )}
                    </div>

                    <div className="flex items-center mb-1">
                      {/* FIXED: Special icon for mixed token batches */}
                      {txInfo.displaySymbol === "MIXED" ? (
                        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            M
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`w-4 h-4 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                        >
                          <span className="text-white text-xs font-bold">
                            {tokenIcon.symbol}
                          </span>
                        </div>
                      )}

                      <span className="text-gray-400 text-sm font-satoshi">
                        {txInfo.batchInfo || txInfo.displaySymbol}
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

                    {/* FIXED: Show transfer details for batch transactions */}
                    {txInfo.isBatch &&
                      tx.transfers &&
                      tx.transfers.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          <div className="space-y-1">
                            {tx.transfers.slice(0, 3).map((transfer, i) => (
                              <div
                                key={i}
                                className="flex items-center space-x-2"
                              >
                                <span>→</span>
                                <span>{transfer.recipient.slice(0, 8)}...</span>
                                <span>
                                  {transfer.amount} {transfer.tokenSymbol}
                                </span>
                              </div>
                            ))}
                            {tx.transfers.length > 3 && (
                              <div className="text-gray-500">
                                +{tx.transfers.length - 3} more transfers
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-white font-medium text-sm font-satoshi">
                      {txInfo.isBatch
                        ? // FIXED: Show total value for batch transactions
                          `$${txInfo.displayValue.toFixed(2)}`
                        : // Regular transaction display
                          `${txInfo.displayAmount} ${txInfo.displaySymbol}`}
                    </div>

                    {!txInfo.isBatch && txInfo.displayValue > 0 && (
                      <div className="text-gray-400 text-xs font-satoshi">
                        ${txInfo.displayValue.toFixed(2)}
                      </div>
                    )}

                    {txInfo.isBatch && (
                      <div className="text-gray-400 text-xs font-satoshi">
                        {txInfo.displayAmount}
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
