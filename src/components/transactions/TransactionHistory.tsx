// src/components/transactions/TransactionHistory.tsx - UPDATED WITH VENN DIAGRAM TOKEN ICONS
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

const getTokenBackgroundColor = (symbol: string, contractAddress?: string) => {
  const colors: Record<string, string> = {
    ETH: "bg-gradient-to-br from-blue-500/20 to-blue-600/30",
    ETHEREUM: "bg-gradient-to-br from-blue-500/20 to-blue-600/30",
    SOL: "bg-gradient-to-br from-purple-500/20 to-purple-600/30",
    BTC: "bg-gradient-to-br from-orange-500/20 to-orange-600/30",
    SUI: "bg-gradient-to-br from-cyan-500/20 to-cyan-600/30",
    XRP: "bg-gradient-to-br from-gray-500/20 to-gray-600/30",
    ADA: "bg-gradient-to-br from-blue-600/20 to-blue-700/30",
    AVAX: "bg-gradient-to-br from-red-500/20 to-red-600/30",
    TON: "bg-gradient-to-br from-blue-400/20 to-blue-500/30",
    DOT: "bg-gradient-to-br from-pink-500/20 to-pink-600/30",
    USDT: "bg-gradient-to-br from-green-500/20 to-green-600/30",
    USDC: "bg-gradient-to-br from-blue-600/20 to-blue-700/30",
    YAI: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/30",
    LINK: "bg-gradient-to-br from-blue-700/20 to-blue-800/30",
    DAI: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/30",
    UNI: "bg-gradient-to-br from-pink-500/20 to-pink-600/30",
    Solana: "bg-gradient-to-br from-purple-500/20 to-purple-600/30",
    Polkadot: "bg-gradient-to-br from-pink-500/20 to-pink-600/30",
    Sui: "bg-gradient-to-br from-cyan-500/20 to-cyan-600/30",
  };

  // Special handling for ETH/native token
  if (
    symbol === "ETH" ||
    contractAddress === "native" ||
    symbol === "ETHEREUM"
  ) {
    return colors.ETH || "bg-gradient-to-br from-blue-500/20 to-blue-600/30";
  }

  return colors[symbol] || "bg-gradient-to-br from-gray-500/20 to-gray-600/30";
};

const getTokenIconUrl = (symbol: string, contractAddress?: string) => {
  // Token icon URLs from CoinGecko or other sources
  const tokenIcons: Record<string, string> = {
    ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    ETHEREUM:
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    USDC: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
    DAI: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
    UNI: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
    BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
    SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
    Solana: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
    DOT: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
    Polkadot:
      "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
    SUI: "https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png",
    Sui: "https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png",
    XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
    ADA: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
    AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
    TON: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
    YAI: "https://assets.coingecko.com/coins/images/28969/small/yai.png",
  };

  // First try to get from our registry
  if (tokenIcons[symbol]) {
    return tokenIcons[symbol];
  }

  // For unknown tokens, return null so we show the fallback
  return null;
};

const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || url === "null" || url === "undefined" || url === "") {
    return false;
  }
  return (
    url.startsWith("http") &&
    (url.includes("coingecko") ||
      url.includes("coinbase") ||
      url.includes("cdn") ||
      url.includes("assets"))
  );
};

const TokenIcon = ({
  token,
  size = "w-3 h-3",
}: {
  token: any;
  size?: string;
}) => {
  const [imageError, setImageError] = useState(false);

  // Get icon URL from our registry or transaction data
  const iconUrl =
    getTokenIconUrl(token.symbol, token.contractAddress) ||
    token.icon ||
    token.logoUrl;
  const hasValidImage = !imageError && isValidImageUrl(iconUrl);

  if (hasValidImage) {
    return (
      <img
        src={iconUrl}
        alt={token.symbol}
        className={`${size} rounded-full object-cover`}
        onError={() => {
          setImageError(true);
        }}
      />
    );
  }

  return (
    <span className="text-white text-xs font-medium">
      {getTokenLetter(token.symbol, token.contractAddress)}
    </span>
  );
};

const getTokenLetter = (symbol: string, contractAddress?: string) => {
  const letters: Record<string, string> = {
    ETH: "Ξ",
    ETHEREUM: "Ξ",
    SOL: "◎",
    BTC: "₿",
    SUI: "~",
    XRP: "✕",
    ADA: "₳",
    AVAX: "A",
    TON: "T",
    DOT: "●",
    USDT: "₮",
    USDC: "$",
    YAI: "Ÿ",
    LINK: "⛓",
    DAI: "◈",
    UNI: "🦄",
    Solana: "◎",
    Polkadot: "●",
    Sui: "~",
  };

  if (
    symbol === "ETH" ||
    contractAddress === "native" ||
    symbol === "ETHEREUM"
  ) {
    return letters.ETH || "Ξ";
  }

  return letters[symbol] || symbol.charAt(0);
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
            <span className="text-gray-400 text-sm font-satoshi">
              Loading transactions...
            </span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar size={20} className="text-gray-400" />
            </div>
            <h3 className="text-white text-base font-satoshi mb-1.5">
              No transactions found
            </h3>
            <p className="text-gray-400 text-sm font-satoshi text-center">
              {tokenFilter || transactionTypeFilter
                ? "Try adjusting your filters"
                : "Your transactions will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {transactions.map((tx, index) => {
              const txInfo = getBatchTransactionInfo(tx);
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
                    <div className="flex items-center space-x-3">
                      {/* Direction Icon */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          direction === "sent"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {direction === "sent" ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownLeft size={16} />
                        )}
                      </div>

                      {/* Token Info */}
                      <div className="flex items-center space-x-2.5">
                        {txInfo.displaySymbol === "MIXED" ? (
                          <div className="w-7 h-7 relative">
                            {/* Venn diagram display for 2 tokens */}
                            {tx.transfers && tx.transfers.length >= 2 && (
                              <>
                                {/* First token circle - positioned slightly left */}
                                <div className="absolute top-0 left-0 w-5 h-5 rounded-full border border-white/20">
                                  <div
                                    className={`w-full h-full ${getTokenBackgroundColor(
                                      tx.transfers[0].tokenSymbol,
                                      tx.transfers[0].contractAddress
                                    )} rounded-full flex items-center justify-center border border-white/10`}
                                  >
                                    <TokenIcon
                                      token={{
                                        symbol: tx.transfers[0].tokenSymbol,
                                        contractAddress:
                                          tx.transfers[0].contractAddress,
                                        icon:
                                          tx.transfers[0].icon ||
                                          tx.transfers[0].logoUrl,
                                      }}
                                      size="w-3 h-3"
                                    />
                                  </div>
                                </div>

                                {/* Second token circle - positioned slightly right, overlapping */}
                                <div className="absolute top-0 right-0 w-5 h-5 rounded-full border border-white/20">
                                  <div
                                    className={`w-full h-full ${getTokenBackgroundColor(
                                      tx.transfers[1].tokenSymbol,
                                      tx.transfers[1].contractAddress
                                    )} rounded-full flex items-center justify-center border border-white/10`}
                                  >
                                    <TokenIcon
                                      token={{
                                        symbol: tx.transfers[1].tokenSymbol,
                                        contractAddress:
                                          tx.transfers[1].contractAddress,
                                        icon:
                                          tx.transfers[1].icon ||
                                          tx.transfers[1].logoUrl,
                                      }}
                                      size="w-3 h-3"
                                    />
                                  </div>
                                </div>

                                {/* Additional tokens indicator */}
                                {tx.transfers.length > 2 && (
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-black/80 rounded-full border border-white/20 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold leading-none">
                                      +{tx.transfers.length - 2}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`w-7 h-7 ${getTokenBackgroundColor(
                              txInfo.displaySymbol,
                              tx.contractAddress
                            )} rounded-full flex items-center justify-center`}
                          >
                            <TokenIcon
                              token={{
                                symbol: txInfo.displaySymbol,
                                contractAddress: tx.contractAddress,
                                icon: tx.icon || tx.logoUrl,
                              }}
                              size="w-5 h-5"
                            />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium font-satoshi text-sm">
                              {direction === "sent" ? "Sent" : "Received"}
                            </span>

                            {/* Transaction Type Badges */}
                            {tx.type?.includes("scheduled") && (
                              <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full font-satoshi flex items-center">
                                <Clock size={10} className="mr-1" />
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
                    <div className="flex items-center space-x-3">
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
                      <div className="flex items-center space-x-1">
                        {hash && (
                          <>
                            <button
                              onClick={() =>
                                window.open(
                                  `https://etherscan.io/tx/${hash}`,
                                  "_blank"
                                )
                              }
                              className="p-2 text-gray-400 hover:text-[#E2AF19] hover:bg-[#2C2C2C] rounded-lg transition-colors"
                              title="View on Etherscan"
                            >
                              <ExternalLink size={14} />
                            </button>

                            <button
                              onClick={() =>
                                copyToClipboard(hash, `hash-${index}`)
                              }
                              className="p-2 text-gray-400 hover:text-[#E2AF19] hover:bg-[#2C2C2C] rounded-lg transition-colors"
                              title="Copy transaction hash"
                            >
                              {copied === `hash-${index}` ? (
                                <span className="text-green-400 text-xs">
                                  ✓
                                </span>
                              ) : (
                                <Copy size={14} />
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
                              className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors"
                              title={
                                isExpanded
                                  ? "Collapse details"
                                  : "Expand details"
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details for Batch Transactions */}
                  {txInfo.isBatch && isExpanded && tx.transfers && (
                    <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
                      <div className="space-y-2">
                        <div className="text-gray-400 text-xs font-satoshi mb-2">
                          Transfer Details:
                        </div>

                        {tx.transfers.map((transfer, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2 px-3 bg-[#2C2C2C]/30 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-5 h-5 ${getTokenBackgroundColor(
                                  transfer.tokenSymbol,
                                  transfer.contractAddress
                                )} rounded-full flex items-center justify-center`}
                              >
                                <TokenIcon
                                  token={{
                                    symbol: transfer.tokenSymbol,
                                    contractAddress: transfer.contractAddress,
                                    icon: transfer.icon || transfer.logoUrl,
                                  }}
                                  size="w-3 h-3"
                                />
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
                    <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
                      <div className="flex items-center space-x-2">
                        <Hash size={12} className="text-gray-400" />
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
