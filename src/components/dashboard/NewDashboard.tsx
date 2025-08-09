// src/components/dashboard/NewDashboard.tsx
"use client";

import React, { useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import {
  RefreshCw,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";

// Add Token Modal Component
const AddTokenModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (address: string) => Promise<void>;
}> = ({ isOpen, onClose, onAdd }) => {
  const [contractAddress, setContractAddress] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!contractAddress.trim()) {
      setError("Please enter a contract address");
      return;
    }

    if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) {
      setError("Invalid contract address format");
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      await onAdd(contractAddress);
      setContractAddress("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add token");
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-black border border-[#2C2C2C] rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Add Token</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Contract Address
            </label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg text-white focus:outline-none focus:border-[#E2AF19]"
              disabled={isAdding}
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
            <p className="text-yellow-400 text-sm">
              ℹ️ You can add any ERC-20 token, even if you don't have a balance.
              The token will appear in your dashboard with real-time price
              updates.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-[#2C2C2C] text-white rounded-lg hover:bg-[#3C3C3C] transition-colors"
              disabled={isAdding}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors disabled:opacity-50"
              disabled={isAdding}
            >
              {isAdding ? "Adding..." : "Add Token"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Token Card Component
const TokenCard: React.FC<{
  token: any;
  onRemove?: (address: string) => void;
}> = ({ token, onRemove }) => {
  const isPositive = token.change24h >= 0;

  return (
    <div className="bg-black border border-[#2C2C2C] rounded-xl p-4 hover:border-[#E2AF19] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          {token.imageUrl ? (
            <img
              src={token.imageUrl}
              alt={token.symbol}
              className="w-10 h-10 rounded-full mr-3"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-[#2C2C2C] rounded-full mr-3 flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {token.symbol.slice(0, 2)}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-white font-semibold">{token.symbol}</h3>
            <p className="text-gray-400 text-sm">{token.name}</p>
          </div>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(token.contractAddress)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Balance</span>
          <span className="text-white text-sm">
            {token.balance.toFixed(6)} {token.symbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Price</span>
          <span className="text-white text-sm">${token.price.toFixed(6)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">Value</span>
          <span className="text-white font-semibold">
            ${token.value.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">24h Change</span>
          <span
            className={`text-sm font-semibold ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {token.change24h.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function NewDashboard() {
  const {
    tokens,
    totalValue,
    isLoading,
    isRefreshing,
    isInitialized,
    error,
    lastRefresh,
    addToken,
    removeToken,
    manualRefresh,
    portfolioStats,
    activeWallet,
  } = useDashboard();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tokens based on search
  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (isLoading && !isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19] mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={manualRefresh}
            className="px-4 py-2 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-xl p-6 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Portfolio Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-white">
              ${totalValue.toFixed(2)}
            </div>
            <div
              className={`flex items-center ${
                portfolioStats.totalChange24h >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {portfolioStats.totalChange24h >= 0 ? (
                <TrendingUp size={20} className="mr-1" />
              ) : (
                <TrendingDown size={20} className="mr-1" />
              )}
              <span className="font-semibold">
                {portfolioStats.totalChange24h >= 0 ? "+" : ""}$
                {Math.abs(portfolioStats.totalChange24h).toFixed(2)} (
                {portfolioStats.totalChangePercentage.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <div className="flex items-center text-gray-400 text-sm">
              <Clock size={14} className="mr-1" />
              Last updated: {new Date(lastRefresh).toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={manualRefresh}
            disabled={isRefreshing}
            className="p-2 bg-black border border-[#2C2C2C] rounded-lg hover:border-[#E2AF19] transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={`text-white ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Add Token
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-black border border-[#2C2C2C] rounded-lg p-3">
          <p className="text-gray-400 text-sm mb-1">Total Tokens</p>
          <p className="text-white text-xl font-bold">
            {portfolioStats.tokenCount}
          </p>
        </div>
        <div className="bg-black border border-[#2C2C2C] rounded-lg p-3">
          <p className="text-gray-400 text-sm mb-1">Top Gainer</p>
          {portfolioStats.topGainers[0] ? (
            <div>
              <p className="text-white font-bold">
                {portfolioStats.topGainers[0].symbol}
              </p>
              <p className="text-green-400 text-sm">
                +{portfolioStats.topGainers[0].change24h.toFixed(2)}%
              </p>
            </div>
          ) : (
            <p className="text-gray-500">-</p>
          )}
        </div>
        <div className="bg-black border border-[#2C2C2C] rounded-lg p-3">
          <p className="text-gray-400 text-sm mb-1">Top Loser</p>
          {portfolioStats.topLosers[0] ? (
            <div>
              <p className="text-white font-bold">
                {portfolioStats.topLosers[0].symbol}
              </p>
              <p className="text-red-400 text-sm">
                {portfolioStats.topLosers[0].change24h.toFixed(2)}%
              </p>
            </div>
          ) : (
            <p className="text-gray-500">-</p>
          )}
        </div>
        <div className="bg-black border border-[#2C2C2C] rounded-lg p-3">
          <p className="text-gray-400 text-sm mb-1">Active Wallet</p>
          <p className="text-white text-xs font-mono">
            {activeWallet
              ? `${activeWallet.slice(0, 6)}...${activeWallet.slice(-4)}`
              : "-"}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tokens..."
          className="w-full pl-10 pr-4 py-2 bg-black border border-[#2C2C2C] rounded-lg text-white focus:outline-none focus:border-[#E2AF19]"
        />
      </div>

      {/* Token Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredTokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTokens.map((token) => (
              <TokenCard
                key={token.contractAddress}
                token={token}
                onRemove={removeToken}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">
              {searchQuery
                ? "No tokens found matching your search"
                : "No tokens in your dashboard yet"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors"
              >
                Add Your First Token
              </button>
            )}
          </div>
        )}
      </div>

      {/* Refresh Status */}
      {isRefreshing && (
        <div className="absolute bottom-4 right-4 bg-black border border-[#2C2C2C] rounded-lg px-4 py-2 flex items-center">
          <RefreshCw size={14} className="animate-spin text-[#E2AF19] mr-2" />
          <span className="text-white text-sm">Refreshing prices...</span>
        </div>
      )}

      {/* Add Token Modal */}
      <AddTokenModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addToken}
      />
    </div>
  );
}
