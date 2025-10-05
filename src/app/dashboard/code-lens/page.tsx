// src/app/dashboard/code-lens/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, SlidersHorizontal, MoreVertical } from "lucide-react";
import TokenActionsMenu from "@/components/dashboard/TokenActionsMenu";
import AddTokensModal from "@/components/dashboard/AddTokensModal";

// Mock token data matching the image
const initialMockTokens = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    price: 4478.78,
    change24h: -1.06,
    volume24h: 8478788,
    marketCap: 12478088345,
    buys: 12,
    sells: 12,
  },
  {
    id: 2,
    name: "Polkadot",
    symbol: "DOT",
    icon: "https://cryptologos.cc/logos/polkadot-new-dot-logo.png",
    price: 478.78,
    change24h: -1.06,
    volume24h: 8478788,
    marketCap: 78088345,
    buys: 12,
    sells: 234,
  },
  {
    id: 3,
    name: "Cardano",
    symbol: "CAR",
    icon: "https://cryptologos.cc/logos/cardano-ada-logo.png",
    price: 8.7,
    change24h: 1.06,
    volume24h: 76788,
    marketCap: 8088345,
    buys: 12,
    sells: 39,
  },
  {
    id: 4,
    name: "Dodge",
    symbol: "DOG",
    icon: "https://cryptologos.cc/logos/dogecoin-doge-logo.png",
    price: 0.378,
    change24h: -1.06,
    volume24h: 478788,
    marketCap: 128345,
    buys: 4,
    sells: 3,
  },
  {
    id: 5,
    name: "Avalanche",
    symbol: "AVAX",
    icon: "https://cryptologos.cc/logos/avalanche-avax-logo.png",
    price: 8.78,
    change24h: -1.06,
    volume24h: 8478788,
    marketCap: 12478088345,
    buys: 12,
    sells: 12,
  },
  {
    id: 6,
    name: "Solana",
    symbol: "SOL",
    icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
    price: 201.7,
    change24h: 1.06,
    volume24h: 8478788,
    marketCap: 9478088345,
    buys: 12,
    sells: 12,
  },
  {
    id: 7,
    name: "SUI",
    symbol: "SUI",
    icon: "https://cryptologos.cc/logos/sui-sui-logo.png",
    price: 9.02,
    change24h: 1.06,
    volume24h: 8478788,
    marketCap: 12478345,
    buys: 12,
    sells: 12,
  },
];

export default function CodeLens() {
  const router = useRouter(); // ← Router hook for navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState(initialMockTokens);
  const [filteredTokens, setFilteredTokens] = useState(initialMockTokens);
  const [activeMenuTokenId, setActiveMenuTokenId] = useState<number | null>(
    null
  );
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [addTokensModalOpen, setAddTokensModalOpen] = useState(false);
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredTokens(tokens);
    } else {
      const filtered = tokens.filter(
        (token) =>
          token.name.toLowerCase().includes(query.toLowerCase()) ||
          token.symbol.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTokens(filtered);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const handleMoreClick = (tokenId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // ← Prevent row click when clicking actions menu
    const button = buttonRefs.current[tokenId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.top,
        left: rect.left - 200 - 8,
      });
      setActiveMenuTokenId(tokenId);
    }
  };

  const handleCopy = () => {
    const token = filteredTokens.find((t) => t.id === activeMenuTokenId);
    if (token) {
      const tokenInfo = `${token.name} (${
        token.symbol
      }) - $${token.price.toLocaleString()}`;
      navigator.clipboard.writeText(tokenInfo);
      console.log("✅ Copied token info:", tokenInfo);
      alert(`Copied: ${tokenInfo}`);
    }
  };

  const handleRemove = () => {
    const token = filteredTokens.find((t) => t.id === activeMenuTokenId);
    if (token) {
      const newTokens = tokens.filter((t) => t.id !== activeMenuTokenId);
      setTokens(newTokens);

      const newFilteredTokens = filteredTokens.filter(
        (t) => t.id !== activeMenuTokenId
      );
      setFilteredTokens(newFilteredTokens);

      console.log("🗑️ Removed token:", token.name);
      alert(`Removed: ${token.name}`);
    }
  };

  const handleAddToken = (token: any) => {
    console.log("➕ Adding token:", token);

    const newToken = {
      id: Date.now(),
      name: token.name,
      symbol: token.symbol,
      icon: "",
      price: Math.random() * 1000,
      change24h: token.change24h,
      volume24h: Math.random() * 10000000,
      marketCap: Math.random() * 10000000000,
      buys: Math.floor(Math.random() * 100),
      sells: Math.floor(Math.random() * 100),
    };

    const updatedTokens = [...tokens, newToken];
    setTokens(updatedTokens);
    setFilteredTokens(updatedTokens);

    alert(`Added: ${token.name}`);
  };

  // ✅ THIS IS THE CLICK HANDLER - Navigates to token overview page
  const handleTokenClick = (tokenId: number) => {
    router.push(`/dashboard/tokenOverview/${tokenId}`);
  };

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] p-4 flex flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search tokens or paste address"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-black border border-[#2C2C2C] rounded-xl pl-12 pr-14 py-3 text-gray-300 text-sm font-satoshi placeholder-gray-600 focus:outline-none focus:border-[#E2AF19] transition-colors"
          />
          <button
            onClick={() => setAddTokensModalOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#E2AF19] hover:bg-[#D4A853] p-2 rounded-lg transition-colors"
            title="Add Tokens"
          >
            <Plus className="w-4 h-4 text-black" />
          </button>
        </div>
        <button
          className="bg-black border border-[#2C2C2C] hover:border-[#E2AF19] p-3 rounded-xl transition-colors"
          title="Filters"
        >
          <SlidersHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Token List Table */}
      <div className="flex-1 bg-[#0F0F0F] rounded-2xl border border-[#2C2C2C] overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.5fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 bg-[#191919] text-gray-400 text-sm font-satoshi font-medium">
          <div className="flex items-center">Token</div>
          <div className="flex items-center justify-center">Price</div>
          <div className="flex items-center justify-center">24h</div>
          <div className="flex items-center justify-center">24h Volume</div>
          <div className="flex items-center justify-center">Market Cap</div>
          <div className="flex items-center justify-center">No of buys</div>
          <div className="flex items-center justify-center">No of sells</div>
          <div className="flex items-center justify-center">Actions</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {filteredTokens.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 font-satoshi">No tokens found</p>
            </div>
          ) : (
            filteredTokens.map((token) => (
              <div
                key={token.id}
                onClick={() => handleTokenClick(token.id)} // ✅ CLICK HANDLER HERE - Entire row is clickable
                className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.5fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer" // ✅ cursor-pointer shows it's clickable
              >
                {/* Token */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {token.symbol.charAt(0)}
                    </span>
                  </div>
                  <div className="flex flex-row items-baseline gap-1.5">
                    <div className="text-white font-satoshi font-medium text-sm">
                      {token.name}
                    </div>
                    <div className="text-gray-500 font-satoshi text-xs">
                      {token.symbol}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-center text-white font-satoshi font-medium text-sm">
                  ${token.price.toLocaleString()}
                </div>

                {/* 24h Change */}
                <div
                  className={`flex items-center justify-center font-satoshi font-medium text-sm ${
                    token.change24h > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {token.change24h > 0 ? "▲" : "▼"} {Math.abs(token.change24h)}%
                </div>

                {/* 24h Volume */}
                <div className="flex items-center justify-center text-white font-satoshi text-sm">
                  ${token.volume24h.toLocaleString()}
                </div>

                {/* Market Cap */}
                <div className="flex items-center justify-center text-white font-satoshi text-sm">
                  {formatNumber(token.marketCap)}
                </div>

                {/* Buys */}
                <div className="flex items-center justify-center text-white font-satoshi text-sm">
                  {token.buys}
                </div>

                {/* Sells */}
                <div className="flex items-center justify-center text-white font-satoshi text-sm">
                  {token.sells}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center">
                  <button
                    ref={(el) => {
                      buttonRefs.current[token.id] = el;
                    }}
                    onClick={(e) => handleMoreClick(token.id, e)} // ✅ stopPropagation prevents row click
                    className="p-1 hover:bg-[#2C2C2C] rounded transition-colors"
                    title="More actions"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Token Actions Menu */}
      <TokenActionsMenu
        isOpen={activeMenuTokenId !== null}
        onClose={() => setActiveMenuTokenId(null)}
        position={menuPosition}
        onCopy={handleCopy}
        onRemove={handleRemove}
      />

      {/* Add Tokens Modal */}
      <AddTokensModal
        isOpen={addTokensModalOpen}
        onClose={() => setAddTokensModalOpen(false)}
        onAddToken={handleAddToken}
      />

      <style jsx global>{`
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
