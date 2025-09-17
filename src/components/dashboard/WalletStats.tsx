// src/components/dashboard/WalletStats.tsx - Optional analytics component
"use client";

import React, { useState, useEffect } from "react";
import { useWalletTracking, useWalletStats } from "@/hooks/useWalletTracking";
import { useAccount, useChainId } from "wagmi";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Coins,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";

interface WalletStatsProps {
  className?: string;
}

interface ConnectionHistory {
  connectionCount: number;
  tokenCount: number;
  totalValue: number;
  preferredTokenCount: number;
  hiddenTokenCount: number;
  lastConnected: string;
  chainName: string;
}

export default function WalletStats({ className = "" }: WalletStatsProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { getWalletHistory } = useWalletTracking();
  const { getGlobalStats, getPopularTokens } = useWalletStats();

  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletHistory, setWalletHistory] = useState<any>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [popularTokens, setPopularTokens] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected && address) {
      loadWalletStats();
    }
  }, [isConnected, address, chainId]);

  const loadWalletStats = async () => {
    if (!address) return;

    setLoading(true);
    try {
      // Load wallet history
      const history = await getWalletHistory(true); // Include token details
      setWalletHistory(history);

      // Load global stats (optional)
      const stats = await getGlobalStats();
      setGlobalStats(stats);

      // Load popular tokens for this chain
      const popular = await getPopularTokens(chainId, 5);
      setPopularTokens(popular?.tokens || []);

      console.log("📊 Wallet stats loaded:", {
        hasHistory: !!history,
        hasGlobalStats: !!stats,
        popularTokensCount: popularTokens.length,
      });
    } catch (error) {
      console.error("❌ Error loading wallet stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected || !address) {
    return null;
  }

  // Don't render if no data
  if (!walletHistory && !loading) {
    return null;
  }

  return (
    <div
      className={`bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#E2AF19]" />
          <h3 className="text-sm font-semibold text-white font-satoshi">
            Wallet Insights
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19]"></div>
        </div>
      )}

      {walletHistory && (
        <>
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <div className="bg-[#0F0F0F] rounded-lg p-2">
              <div className="text-gray-400 text-xs font-satoshi">
                Connections
              </div>
              <div className="text-white text-sm font-medium font-satoshi">
                {walletHistory.totalConnections}
              </div>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-2">
              <div className="text-gray-400 text-xs font-satoshi">Chains</div>
              <div className="text-white text-sm font-medium font-satoshi">
                {walletHistory.chainsUsed.length}
              </div>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-2">
              <div className="text-gray-400 text-xs font-satoshi">
                First Used
              </div>
              <div className="text-white text-xs font-medium font-satoshi">
                {new Date(walletHistory.firstConnection).toLocaleDateString()}
              </div>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-2">
              <div className="text-gray-400 text-xs font-satoshi">
                Last Active
              </div>
              <div className="text-white text-xs font-medium font-satoshi">
                {getTimeSince(walletHistory.lastConnection)}
              </div>
            </div>
          </div>

          {/* Expanded Stats */}
          {isExpanded && (
            <div className="space-y-3">
              {/* Connection History */}
              <div>
                <h4 className="text-sm font-medium text-white font-satoshi mb-2 flex items-center">
                  <Clock size={14} className="mr-2 text-[#E2AF19]" />
                  Recent Activity
                </h4>
                <div className="space-y-2">
                  {walletHistory.connections
                    .slice(0, 3)
                    .map((conn: ConnectionHistory, index: number) => (
                      <div key={index} className="bg-[#0F0F0F] rounded-lg p-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-white text-xs font-medium font-satoshi">
                              {conn.chainName}
                            </div>
                            <div className="text-gray-400 text-xs font-satoshi">
                              {conn.tokenCount} tokens • $
                              {conn.totalValue.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-400 text-xs font-satoshi">
                              {new Date(
                                conn.lastConnected
                              ).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <Eye size={10} className="text-green-400" />
                              <span className="text-green-400">
                                {conn.preferredTokenCount}
                              </span>
                              <EyeOff
                                size={10}
                                className="text-gray-500 ml-1"
                              />
                              <span className="text-gray-500">
                                {conn.hiddenTokenCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Popular Tokens */}
              {popularTokens.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white font-satoshi mb-2 flex items-center">
                    <Coins size={14} className="mr-2 text-[#E2AF19]" />
                    Popular on {chainId === 1 ? "Ethereum" : "This Chain"}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {popularTokens
                      .slice(0, 4)
                      .map((token: any, index: number) => (
                        <div
                          key={index}
                          className="bg-[#0F0F0F] rounded-lg p-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#4A4A4A] rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-xs">
                                {token.symbol?.charAt(0) || "?"}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-white text-xs font-medium font-satoshi truncate">
                                {token.symbol}
                              </div>
                              <div className="text-gray-400 text-xs font-satoshi">
                                {token.holderCount} holders
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Global Stats */}
              {globalStats && (
                <div>
                  <h4 className="text-sm font-medium text-white font-satoshi mb-2 flex items-center">
                    <TrendingUp size={14} className="mr-2 text-[#E2AF19]" />
                    Network Activity
                  </h4>
                  <div className="bg-[#0F0F0F] rounded-lg p-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Today's Connections
                        </div>
                        <div className="text-white text-sm font-medium font-satoshi">
                          {globalStats.totalConnections || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Active Wallets
                        </div>
                        <div className="text-white text-sm font-medium font-satoshi">
                          {globalStats.uniqueWallets?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper function
function getTimeSince(dateString: string): string {
  const now = new Date().getTime();
  const past = new Date(dateString).getTime();
  const diffInMinutes = Math.floor((now - past) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo ago`;
}
