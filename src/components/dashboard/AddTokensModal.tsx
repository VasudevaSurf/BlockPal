import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";

interface Token {
  id: number;
  name: string;
  symbol: string;
  change24h: number;
  icon: string;
}

interface AddTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToken: (token: Token) => void;
}

// Custom SVG Icons
const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M15.7099 15.1798L12.6099 13.3298C12.0699 13.0098 11.6299 12.2398 11.6299 11.6098V7.50977"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrendingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM18 16.5C18 16.88 17.62 17.14 17.28 16.99L13.17 15.18C12.45 14.86 11.54 14.86 10.82 15.18L6.71 16.99C6.37 17.14 5.99 16.88 5.99 16.5V11.5C5.99 7.97 7.46 6.5 10.99 6.5H17.99V16.5H18Z"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TopGainersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M16.5 9.5L12.3 13.7L10.7 11.3L7.5 14.5"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.5 9.5H16.5V11.5"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TopLosersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <g clipPath="url(#clip0_1230_8187)">
      <path
        d="M16.5 14.5L12.3 10.3L10.7 12.7L7.5 9.5"
        stroke="#B7B7B7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 14.5H16.5V12.5"
        stroke="#B7B7B7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
        stroke="#B7B7B7"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_1230_8187">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const RecentlyAddedIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M15.59 12.26C18.4232 12.26 20.72 9.96323 20.72 7.13C20.72 4.29678 18.4232 2 15.59 2C12.7567 2 10.46 4.29678 10.46 7.13C10.46 9.96323 12.7567 12.26 15.59 12.26Z"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeMiterlimit="10"
    />
    <path
      d="M6.35977 19.4393C8.06081 19.4393 9.43979 18.0603 9.43979 16.3593C9.43979 14.6583 8.06081 13.2793 6.35977 13.2793C4.65873 13.2793 3.27979 14.6583 3.27979 16.3593C3.27979 18.0603 4.65873 19.4393 6.35977 19.4393Z"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeMiterlimit="10"
    />
    <path
      d="M16.6201 22.0009C18.0339 22.0009 19.1801 20.8547 19.1801 19.4409C19.1801 18.027 18.0339 16.8809 16.6201 16.8809C15.2062 16.8809 14.0601 18.027 14.0601 19.4409C14.0601 20.8547 15.2062 22.0009 16.6201 22.0009Z"
      stroke="#B7B7B7"
      strokeWidth="1.5"
      strokeMiterlimit="10"
    />
  </svg>
);

const TABS = [
  { id: "recent", label: "Recently Searched", icon: ClockIcon },
  { id: "trending", label: "Trending", icon: TrendingIcon },
  { id: "gainers", label: "Top Gainers", icon: TopGainersIcon },
  { id: "losers", label: "Top Losers", icon: TopLosersIcon },
  { id: "added", label: "Recently Added", icon: RecentlyAddedIcon },
];

// Mock data for different tabs
const MOCK_TOKENS: { [key: string]: Token[] } = {
  recent: [],
  trending: [
    { id: 1, name: "Ethereum", symbol: "ETH", change24h: -1.06, icon: "Ξ" },
    { id: 2, name: "Polkadot", symbol: "DOT", change24h: 3.6, icon: "⬤" },
    { id: 3, name: "Avantis", symbol: "AVNT", change24h: 1.6, icon: "A" },
    { id: 4, name: "Linea", symbol: "LINEA", change24h: 1.6, icon: "L" },
    { id: 5, name: "Aster", symbol: "ASTER", change24h: -1.06, icon: "✦" },
    { id: 6, name: "Solana", symbol: "SOL", change24h: 1.6, icon: "◎" },
  ],
  gainers: [
    { id: 13, name: "Polkadot", symbol: "DOT", change24h: 5.6, icon: "⬤" },
    { id: 14, name: "Avantis", symbol: "AVNT", change24h: 4.2, icon: "A" },
    { id: 15, name: "Linea", symbol: "LINEA", change24h: 3.8, icon: "L" },
  ],
  losers: [
    { id: 16, name: "Ethereum", symbol: "ETH", change24h: -3.06, icon: "Ξ" },
    { id: 17, name: "Aster", symbol: "ASTER", change24h: -2.5, icon: "✦" },
  ],
  added: [],
};

// Search results mock data
const SEARCH_RESULTS: Token[] = [
  { id: 7, name: "Solana", symbol: "SOL", change24h: 1.6, icon: "◎" },
  { id: 8, name: "Linea", symbol: "LINEA", change24h: 1.6, icon: "L" },
  { id: 9, name: "Aster", symbol: "ASTER", change24h: -1.06, icon: "✦" },
];

// Recently added tokens
const RECENTLY_ADDED: Token[] = [
  { id: 10, name: "Ethereum", symbol: "ETH", change24h: -1.06, icon: "Ξ" },
  { id: 11, name: "Polkadot", symbol: "DOT", change24h: 3.6, icon: "⬤" },
  { id: 12, name: "Avantis", symbol: "AVNT", change24h: 1.6, icon: "A" },
];

export default function AddTokensModal({
  isOpen,
  onClose,
  onAddToken,
}: AddTokensModalProps) {
  const [activeTab, setActiveTab] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<Set<number>>(new Set());

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedTokens(new Set());
      setActiveTab("trending");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasSearchResults = searchQuery.trim().length > 0;

  // Get tokens to display based on active tab or search
  const tokensToDisplay = hasSearchResults
    ? SEARCH_RESULTS.filter(
        (token) =>
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MOCK_TOKENS[activeTab] || [];

  const toggleTokenSelection = (tokenId: number) => {
    const newSelected = new Set(selectedTokens);
    if (newSelected.has(tokenId)) {
      newSelected.delete(tokenId);
    } else {
      newSelected.add(tokenId);
    }
    setSelectedTokens(newSelected);
  };

  const handleAddTokens = () => {
    // Handle adding selected tokens
    const tokensToAdd = tokensToDisplay.filter((token) =>
      selectedTokens.has(token.id)
    );
    console.log("Adding tokens:", tokensToAdd);
    tokensToAdd.forEach((token) => onAddToken(token));
    onClose();
  };

  const getColorForSymbol = (symbol: string) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-pink-500 to-pink-600",
      "from-orange-500 to-orange-600",
      "from-yellow-500 to-yellow-600",
      "from-green-500 to-green-600",
      "from-purple-500 to-purple-600",
    ];
    const index = symbol.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-white/10 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div
          className="bg-[#0F0F0F] rounded-[28px] w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl scale-[1.05]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-6 pb-4 flex-shrink-0">
            <h2 className="text-white font-mayeka text-xl">Add Tokens</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Bar - Full Width */}
          <div className="px-8 pb-4 flex-shrink-0">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search tokens or paste address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#000] rounded-[12px] pl-10 pr-3 py-3 text-white text-xs placeholder-gray-400 focus:outline-none border border-[#2C2C2C] focus:border-[#E2AF19] font-satoshi transition-colors"
              />
            </div>
          </div>

          {/* Tab Badges */}
          <div className="px-8 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] transition-all border text-[11px] ${
                      isActive
                        ? "bg-[#281E01] text-[#E2AF19]"
                        : "bg-transparent text-white border-transparent"
                    }`}
                  >
                    <Icon />
                    <span className="font-mayeka font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Two Boxes Side by Side */}
          <div className="flex-1 px-8 pb-4 overflow-hidden flex flex-col min-h-0">
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Left Box - Trending/Active Tab */}
              <div className="flex-1 relative p-[2px] rounded-[16px] min-h-0">
                {/* Gradient Border */}
                <div
                  className="absolute inset-0 rounded-[16px]"
                  style={{
                    background: `linear-gradient(135deg, 
                      #E2AF19 0%, 
                      #E2AF19 10%,
                      #2C2C2C 25%, 
                      #2C2C2C 75%, 
                      #E2AF19 90%,
                      #E2AF19 100%)`,
                  }}
                />
                {/* Content */}
                <div className="relative bg-black rounded-[14px] h-full p-3 flex flex-col overflow-hidden">
                  <div className="mb-2 flex-shrink-0">
                    <h3 className="text-white font-satoshi font-medium text-xs">
                      {TABS.find((t) => t.id === activeTab)?.label}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide pr-1">
                    {tokensToDisplay.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-2">
                          <span className="text-xl">🔍</span>
                        </div>
                        <p className="text-gray-400 font-satoshi text-[10px]">
                          No tokens available
                        </p>
                      </div>
                    ) : (
                      tokensToDisplay.map((token) => {
                        const isSelected = selectedTokens.has(token.id);

                        return (
                          <div
                            key={token.id}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full bg-gradient-to-br ${getColorForSymbol(
                                  token.symbol
                                )} flex items-center justify-center flex-shrink-0`}
                              >
                                <span className="text-white text-[10px] font-bold">
                                  {token.icon}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-satoshi font-medium text-[11px]">
                                  {token.name}
                                </div>
                                <div className="text-gray-400 font-satoshi text-[9px]">
                                  {token.symbol}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div
                                className={`font-satoshi text-[10px] font-medium ${
                                  token.change24h > 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {token.change24h > 0 ? "▲" : "▼"}{" "}
                                {Math.abs(token.change24h)}%
                              </div>

                              <button
                                onClick={() => toggleTokenSelection(token.id)}
                                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-[#E2AF19]"
                                    : "bg-[#2C2C2C] hover:bg-[#3C3C3C]"
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isSelected ? "bg-black" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Box - Search Results & Recently Added */}
              <div className="flex-1 relative p-[2px] rounded-[16px] min-h-0">
                {/* Gradient Border */}
                <div
                  className="absolute inset-0 rounded-[16px]"
                  style={{
                    background: `linear-gradient(135deg, 
                      #E2AF19 0%, 
                      #E2AF19 10%,
                      #2C2C2C 25%, 
                      #2C2C2C 75%, 
                      #E2AF19 90%,
                      #E2AF19 100%)`,
                  }}
                />
                {/* Content */}
                <div className="relative bg-black rounded-[14px] h-full p-3 flex flex-col overflow-hidden">
                  {/* Search Results Section */}
                  <div className="flex-shrink-0 mb-2">
                    <h3 className="text-white font-satoshi font-medium text-xs mb-2">
                      Search Results
                    </h3>
                    <div className="space-y-1">
                      {SEARCH_RESULTS.map((token) => (
                        <div
                          key={token.id}
                          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full bg-gradient-to-br ${getColorForSymbol(
                                token.symbol
                              )} flex items-center justify-center flex-shrink-0`}
                            >
                              <span className="text-white text-[10px] font-bold">
                                {token.icon}
                              </span>
                            </div>
                            <div>
                              <div className="text-white font-satoshi font-medium text-[11px]">
                                {token.name}
                              </div>
                              <div className="text-gray-400 font-satoshi text-[9px]">
                                {token.symbol}
                              </div>
                            </div>
                          </div>

                          <button className="p-0.5 bg-transparent hover:bg-[#2C2C2C] rounded-md transition-colors">
                            <X
                              size={12}
                              className="text-gray-400 hover:text-white"
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#2C2C2C] my-2 flex-shrink-0"></div>

                  {/* Recently Added Section */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <h3 className="text-white font-satoshi font-medium text-xs mb-2 flex-shrink-0">
                      Recently Added
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide pr-1">
                      {RECENTLY_ADDED.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-2">
                            <span className="text-xl">📋</span>
                          </div>
                          <p className="text-gray-400 font-satoshi text-[10px]">
                            No recently added tokens
                          </p>
                        </div>
                      ) : (
                        RECENTLY_ADDED.map((token) => (
                          <div
                            key={token.id}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full bg-gradient-to-br ${getColorForSymbol(
                                  token.symbol
                                )} flex items-center justify-center flex-shrink-0`}
                              >
                                <span className="text-white text-[10px] font-bold">
                                  {token.icon}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-satoshi font-medium text-[11px]">
                                  {token.name}
                                </div>
                                <div className="text-gray-400 font-satoshi text-[9px]">
                                  {token.symbol}
                                </div>
                              </div>
                            </div>

                            <button className="p-0.5 bg-transparent hover:bg-[#2C2C2C] rounded-md transition-colors">
                              <X
                                size={12}
                                className="text-gray-400 hover:text-white"
                              />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Tokens Button and Counter - Outside and below the boxes */}
            <div className="flex gap-4 mt-3 flex-shrink-0 items-center">
              <div className="flex-1">
                <div className="text-gray-400 font-satoshi text-[10px]">
                  {selectedTokens.size}{" "}
                  {selectedTokens.size === 1 ? "Token" : "Tokens"} Selected
                </div>
              </div>
              <div className="flex-1">
                <button
                  onClick={handleAddTokens}
                  disabled={selectedTokens.size === 0}
                  className="w-full py-2 bg-[#E2AF19] text-black rounded-[10px] font-satoshi font-medium text-xs hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#E2AF19]"
                >
                  Add Tokens
                </button>
              </div>
            </div>
          </div>

          {/* Footer - Empty for spacing */}
          <div className="px-8 pb-6 flex-shrink-0"></div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
