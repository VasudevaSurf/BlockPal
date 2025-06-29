// src/components/FriendsPage.tsx - FIXED VERSION (Complete Fund Request Fix)
"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Search,
  UserPlus,
  Check,
  X,
  DollarSign,
  Clock,
  AlertCircle,
  ChevronDown,
  Bell,
  HelpCircle,
  Copy,
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FundRequestModal from "@/components/friends/FundRequestModal";
import NotificationCenter from "@/components/notifications/NotificationCenter";

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  gmail?: string;
}

interface Friend extends User {
  // Friends have the same structure as User
}

interface FriendRequest {
  _id: string;
  requesterUsername: string;
  receiverUsername: string;
  status: "pending" | "accepted" | "declined";
  requestedAt: string;
  requesterData: User;
}

interface FundRequest {
  _id: string;
  requestId: string;
  requesterUsername: string;
  recipientUsername: string;
  tokenSymbol: string;
  tokenName?: string;
  contractAddress?: string;
  decimals?: number;
  amount: string;
  message: string;
  status: "pending" | "fulfilled" | "declined" | "expired";
  requestedAt: string;
  expiresAt: string;
  requesterWalletAddress?: string;
  transactionHash?: string;
}

// FIXED: Enhanced token info interface
interface EnhancedTokenInfo {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string;
  decimals: number;
  balance: number;
  price: number;
  image?: string;
  isETH: boolean;
}

export default function FriendsPage() {
  const { activeWallet, tokens } = useSelector(
    (state: RootState) => state.wallet
  );

  // FIXED: Add current user state to track the logged-in user
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(
    null
  );

  const [activeTab, setActiveTab] = useState<
    "Friends" | "Requests" | "FundRequests"
  >("Friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Fund request modal
  const [showFundRequestModal, setShowFundRequestModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedFundRequest, setSelectedFundRequest] =
    useState<FundRequest | null>(null);

  // FIXED: Enhanced fund request data with proper token info
  const [fundRequestData, setFundRequestData] = useState({
    selectedToken: null as EnhancedTokenInfo | null,
    amount: "",
    message: "",
  });

  // Track copied state for clipboard actions
  const [copied, setCopied] = useState<string | null>(null);

  // Copy to clipboard helper
  const copyToClipboard = (value: string, key: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // FIXED: Enhanced token processing with deduplication and proper formatting
  const processTokensForDropdown = (): EnhancedTokenInfo[] => {
    if (!tokens || tokens.length === 0) return [];

    const processedTokens: EnhancedTokenInfo[] = [];
    const seenTokens = new Set<string>();

    // Process each token with enhanced information
    tokens.forEach((token) => {
      // Create unique identifier to prevent duplicates
      const tokenKey = `${token.symbol}-${
        token.contractAddress || "native"
      }`.toLowerCase();

      if (seenTokens.has(tokenKey)) {
        return; // Skip duplicates
      }
      seenTokens.add(tokenKey);

      const isETH =
        token.symbol === "ETH" ||
        token.contractAddress === "native" ||
        !token.contractAddress;

      // Enhanced token with proper image and formatting
      const enhancedToken: EnhancedTokenInfo = {
        id: token.id,
        name: token.name || token.symbol,
        symbol: token.symbol,
        contractAddress: isETH ? "native" : token.contractAddress || "native",
        decimals: token.decimals || 18,
        balance:
          typeof token.balance === "number"
            ? token.balance
            : parseFloat(token.balance?.toString() || "0"),
        price:
          typeof token.price === "number"
            ? token.price
            : parseFloat(token.price?.toString() || "0"),
        image: token.image || getTokenImageUrl(token.symbol),
        isETH,
      };

      processedTokens.push(enhancedToken);
    });

    // Sort tokens: ETH first, then by balance value (highest first)
    return processedTokens.sort((a, b) => {
      if (a.isETH && !b.isETH) return -1;
      if (!a.isETH && b.isETH) return 1;

      const aValue = a.balance * a.price;
      const bValue = b.balance * b.price;
      return bValue - aValue;
    });
  };

  // FIXED: Enhanced token image URL helper
  const getTokenImageUrl = (symbol: string): string => {
    const tokenImages: Record<string, string> = {
      ETH: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
      USDT: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png",
      USDC: "https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
      DAI: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png",
      UNI: "https://coin-images.coingecko.com/coins/images/12504/large/uni.jpg",
      LINK: "https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
      WETH: "https://coin-images.coingecko.com/coins/images/2518/large/weth.png",
      BTC: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
      MATIC:
        "https://coin-images.coingecko.com/coins/images/4713/large/matic-token-icon.png",
      AAVE: "https://coin-images.coingecko.com/coins/images/12645/large/AAVE.png",
    };

    return (
      tokenImages[symbol?.toUpperCase()] ||
      `https://via.placeholder.com/32/666/fff?text=${symbol?.charAt(0) || "?"}`
    );
  };

  // FIXED: Enhanced token display component
  const TokenDisplayCard = ({
    token,
    isSelected = false,
    onClick,
  }: {
    token: EnhancedTokenInfo;
    isSelected?: boolean;
    onClick?: () => void;
  }) => {
    const tokenValue = token.balance * token.price;

    return (
      <div
        onClick={onClick}
        className={`flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer ${
          isSelected
            ? "bg-[#E2AF19] text-black border-[#E2AF19]"
            : "bg-[#1A1A1A] hover:bg-[#2C2C2C] border-[#2C2C2C] text-white hover:border-[#E2AF19]"
        } border`}
      >
        {/* Token Image */}
        <div className="relative mr-3">
          <img
            src={token.image}
            alt={token.symbol}
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://via.placeholder.com/32/666/fff?text=${token.symbol.charAt(
                0
              )}`;
            }}
          />
          {token.isETH && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
          )}
        </div>

        {/* Token Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`font-semibold font-satoshi ${
                isSelected ? "text-black" : "text-white"
              }`}
            >
              {token.symbol}
            </span>
            <span
              className={`text-sm font-satoshi ${
                isSelected ? "text-black/70" : "text-gray-400"
              }`}
            >
              {token.balance.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`text-sm font-satoshi ${
                isSelected ? "text-black/70" : "text-gray-400"
              }`}
            >
              {token.name}
            </span>
            <span
              className={`text-sm font-satoshi ${
                isSelected ? "text-black/70" : "text-gray-400"
              }`}
            >
              ${tokenValue.toFixed(2)}
            </span>
          </div>

          {token.price > 0 && (
            <div
              className={`text-xs font-satoshi mt-1 ${
                isSelected ? "text-black/60" : "text-gray-500"
              }`}
            >
              ${token.price.toFixed(6)} per {token.symbol}
            </div>
          )}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="ml-2">
            <Check size={16} className="text-black" />
          </div>
        )}
      </div>
    );
  };

  // Auto-search for user suggestions
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.trim() && !isWalletAddress(searchQuery)) {
      searchTimeout.current = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FIXED: Load current user and initial data
  useEffect(() => {
    loadCurrentUser();
    loadInitialData();
    fetchUnreadCount();

    // Set up polling for unread count
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (!initialLoading) {
      if (activeTab === "Friends") {
        loadFriends();
      } else if (activeTab === "Requests") {
        loadFriendRequests();
      } else if (activeTab === "FundRequests") {
        loadFundRequests();
      }
    }
  }, [activeTab, initialLoading]);

  // FIXED: Add function to get current user info
  const loadCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser({ username: userData.username });
        console.log("✅ Current user loaded:", userData.username);
      } else {
        console.error("Failed to load current user");
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      setError("");

      // Load the default tab data first
      if (activeTab === "Friends") {
        await loadFriends();
      } else if (activeTab === "Requests") {
        await loadFriendRequests();
      } else if (activeTab === "FundRequests") {
        await loadFundRequests();
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("Failed to load data. Please refresh the page.");
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications?unreadOnly=true", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const isWalletAddress = (input: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(input);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/friends?type=suggestions&query=${encodeURIComponent(query)}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } else {
        console.error("Search failed:", response.status);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends?type=friends", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        console.log("✅ Friends loaded:", data.friends?.length || 0);
      } else {
        console.error("Load friends failed:", response.status);
        setError("Failed to load friends");
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      setError("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends?type=requests", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.requests || []);
        console.log("✅ Friend requests loaded:", data.requests?.length || 0);
      } else {
        console.error("Load friend requests failed:", response.status);
        setError("Failed to load friend requests");
      }
    } catch (error) {
      console.error("Error loading friend requests:", error);
      setError("Failed to load friend requests");
    } finally {
      setLoading(false);
    }
  };

  const loadFundRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends/fund-request?type=received", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setFundRequests(data.fundRequests || []);
        console.log("✅ Fund requests loaded:", data.fundRequests?.length || 0);
      } else {
        console.error("Load fund requests failed:", response.status);
        setError("Failed to load fund requests");
      }
    } catch (error) {
      console.error("Error loading fund requests:", error);
      setError("Failed to load fund requests");
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (username: string) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_request",
          targetUsername: username,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setSearchQuery("");
        setSuggestions([]);
        setShowSuggestions(false);
        console.log("✅ Friend request sent successfully");
      } else {
        setError(data.error || "Failed to send friend request");
      }
    } catch (error) {
      setError("Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async (
    username: string,
    action: "accept" | "decline"
  ) => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "accept" ? "accept_request" : "decline_request",
          targetUsername: username,
        }),
        credentials: "include",
      });

      if (response.ok) {
        loadFriendRequests();
        if (action === "accept") {
          loadFriends(); // Refresh friends list
        }
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (username: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_friend",
          targetUsername: username,
        }),
        credentials: "include",
      });

      if (response.ok) {
        loadFriends();
      }
    } catch (error) {
      console.error("Error removing friend:", error);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Enhanced fund request modal opening
  const openFundRequestModal = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowFundRequestModal(true);

    // Get processed tokens and set first one as default
    const availableTokens = processTokensForDropdown();
    setFundRequestData({
      selectedToken: availableTokens.length > 0 ? availableTokens[0] : null,
      amount: "",
      message: "",
    });
  };

  // FIXED: Enhanced fund request sending with proper token data
  const sendFundRequest = async () => {
    if (
      !selectedFriend ||
      !fundRequestData.selectedToken ||
      !fundRequestData.amount ||
      !activeWallet?.address ||
      !currentUser
    ) {
      setError("Missing required information or no token/wallet selected");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("💰 Sending fund request:", {
        from: currentUser.username,
        to: selectedFriend.username,
        amount: fundRequestData.amount,
        token: fundRequestData.selectedToken.symbol,
        contractAddress: fundRequestData.selectedToken.contractAddress,
        requesterWallet: activeWallet.address,
      });

      const response = await fetch("/api/friends/fund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUsername: selectedFriend.username,
          tokenSymbol: fundRequestData.selectedToken.symbol,
          tokenName: fundRequestData.selectedToken.name,
          contractAddress: fundRequestData.selectedToken.contractAddress,
          decimals: fundRequestData.selectedToken.decimals,
          amount: fundRequestData.amount,
          message: fundRequestData.message,
          requesterWalletAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setShowFundRequestModal(false);
        setSelectedFriend(null);
        setFundRequestData({
          selectedToken: null,
          amount: "",
          message: "",
        });

        console.log("✅ Fund request sent successfully");
        // Show success message or refresh data
      } else {
        setError(data.error || "Failed to send fund request");
      }
    } catch (error: any) {
      console.error("❌ Error sending fund request:", error);
      setError("Failed to send fund request");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Check if fund request can be processed (not already fulfilled)
  const canProcessFundRequest = (fundRequest: FundRequest): boolean => {
    return (
      fundRequest.status === "pending" &&
      new Date() <= new Date(fundRequest.expiresAt)
    );
  };

  // Show initial loading state
  if (initialLoading) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
              Friends
            </h1>
            <p className="text-gray-400 text-sm font-satoshi mt-1">
              Connect with friends and request funds
            </p>
          </div>
        </div>

        {/* Loading state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19] mx-auto mb-4"></div>
            <p className="text-gray-400 font-satoshi">
              Loading your friends...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Friends
          </h1>
          <p className="text-gray-400 text-sm font-satoshi mt-1">
            Connect with friends and request funds
          </p>
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
              {activeWallet?.name || "Wallet 1"}
            </span>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              {activeWallet?.address
                ? `${activeWallet.address.slice(
                    0,
                    6
                  )}...${activeWallet.address.slice(-4)}`
                : "No wallet"}
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
            <button
              onClick={() => setShowNotifications(true)}
              className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full relative"
            >
              <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </div>
              )}
            </button>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4 flex-shrink-0">
          <div className="flex items-start">
            <AlertCircle
              size={16}
              className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
            />
            <p className="text-red-400 text-sm font-satoshi">{error}</p>
            <button
              onClick={() => setError("")}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-black rounded-[16px] lg:rounded-[20px] border border-[#2C2C2C] p-4 lg:p-6 flex-1 flex flex-col min-h-0">
          {/* Tab Navigation with Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 gap-4">
            {/* Tab Buttons */}
            <div className="flex">
              <button
                onClick={() => setActiveTab("Friends")}
                className={`px-4 lg:px-6 py-2 rounded-lg font-satoshi transition-colors mr-2 text-sm lg:text-base ${
                  activeTab === "Friends"
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Friends ({friends.length})
              </button>
              <button
                onClick={() => setActiveTab("Requests")}
                className={`px-4 lg:px-6 py-2 rounded-lg font-satoshi transition-colors border mr-2 text-sm lg:text-base ${
                  activeTab === "Requests"
                    ? "bg-[#E2AF19] text-black font-medium border-[#E2AF19]"
                    : "text-gray-400 hover:text-white border-[#2C2C2C]"
                }`}
              >
                Requests ({friendRequests.length})
              </button>
              <button
                onClick={() => setActiveTab("FundRequests")}
                className={`px-4 lg:px-6 py-2 rounded-lg font-satoshi transition-colors border text-sm lg:text-base ${
                  activeTab === "FundRequests"
                    ? "bg-[#E2AF19] text-black font-medium border-[#E2AF19]"
                    : "text-gray-400 hover:text-white border-[#2C2C2C]"
                }`}
              >
                Fund Requests ({fundRequests.length})
              </button>
            </div>

            {/* Search Input with Auto-suggestions */}
            {activeTab === "Friends" && (
              <div className="relative" ref={searchRef}>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder={
                        isWalletAddress(searchQuery)
                          ? "Wallet address detected"
                          : "@username or display name"
                      }
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setError("");
                      }}
                      className="font-satoshi pr-10"
                      style={{ fontSize: "16px" }}
                    />
                    <Search
                      size={16}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                  </div>

                  {searchQuery && isWalletAddress(searchQuery) && (
                    <Button
                      onClick={() => sendFriendRequest(searchQuery)}
                      disabled={loading}
                      className="whitespace-nowrap text-sm lg:text-base"
                    >
                      {loading ? "Adding..." : "Add Friend"}
                    </Button>
                  )}
                </div>

                {/* Auto-suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {suggestions.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-3 hover:bg-[#2C2C2C] transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.displayName?.[0]?.toUpperCase() ||
                                user.username[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-white font-satoshi text-sm">
                              {user.displayName || user.username}
                            </div>
                            <div className="text-gray-400 font-satoshi text-xs">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => sendFriendRequest(user.username)}
                          disabled={loading}
                          className="bg-[#E2AF19] text-black px-3 py-1 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-xs flex items-center"
                        >
                          <UserPlus size={12} className="mr-1" />
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content based on active tab */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTab === "Friends" && (
              <div className="space-y-0">
                {loading && friends.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19] mx-auto mb-2"></div>
                    <p className="text-gray-400 font-satoshi">
                      Loading friends...
                    </p>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8 lg:py-12">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
                      <UserPlus
                        size={20}
                        className="text-gray-400 lg:w-6 lg:h-6"
                      />
                    </div>
                    <h3 className="text-white text-base lg:text-lg font-satoshi mb-2">
                      No friends yet
                    </h3>
                    <p className="text-gray-400 font-satoshi text-sm lg:text-base mb-4">
                      Search for friends by username above
                    </p>
                    <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 max-w-sm">
                      <p className="text-blue-400 text-sm font-satoshi">
                        💡 <strong>Tip:</strong> You can search by username or
                        paste a wallet address to send a friend request!
                      </p>
                    </div>
                  </div>
                ) : (
                  friends.map((friend, index) => (
                    <div key={friend._id}>
                      {/* Mobile Card Layout */}
                      <div className="block lg:hidden">
                        <div className="bg-[#0F0F0F] rounded-lg p-4 mb-3 border border-[#2C2C2C]">
                          <div className="flex items-center mb-3">
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white text-sm font-medium">
                                {friend.displayName?.[0]?.toUpperCase() ||
                                  friend.username[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-satoshi">
                                {friend.displayName || friend.username}
                              </div>
                              <div className="text-gray-400 text-xs font-satoshi">
                                @{friend.username}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => openFundRequestModal(friend)}
                              className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-sm flex-1 flex items-center justify-center"
                            >
                              <DollarSign size={14} className="mr-1" />
                              Request Funds
                            </button>
                            <button
                              onClick={() => removeFriend(friend.username)}
                              className="bg-transparent border border-red-500 text-red-500 px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-red-500 hover:text-white transition-colors text-sm flex-1"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Row Layout */}
                      <div className="hidden lg:block">
                        <div className="flex items-center justify-between py-3 px-4 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                              <span className="text-white text-sm font-medium">
                                {friend.displayName?.[0]?.toUpperCase() ||
                                  friend.username[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-white font-satoshi">
                                {friend.displayName || friend.username}
                              </span>
                              <div className="text-gray-400 text-sm font-satoshi">
                                @{friend.username}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => openFundRequestModal(friend)}
                              className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-sm flex items-center"
                            >
                              <DollarSign size={14} className="mr-1" />
                              Request Funds
                            </button>
                            <button
                              onClick={() => removeFriend(friend.username)}
                              className="bg-transparent border border-red-500 text-red-500 px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-red-500 hover:text-white transition-colors text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {index < friends.length - 1 && (
                          <div className="border-b border-[#2C2C2C] mx-4"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "Requests" && (
              <div className="space-y-3">
                {loading && friendRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19] mx-auto mb-2"></div>
                    <p className="text-gray-400 font-satoshi">
                      Loading requests...
                    </p>
                  </div>
                ) : friendRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8 lg:py-12">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
                      <Bell size={20} className="text-gray-400 lg:w-6 lg:h-6" />
                    </div>
                    <h3 className="text-white text-base lg:text-lg font-satoshi mb-2">
                      No friend requests
                    </h3>
                    <p className="text-gray-400 font-satoshi text-sm lg:text-base">
                      Friend requests will appear here
                    </p>
                  </div>
                ) : (
                  friendRequests.map((request) => (
                    <div
                      key={request._id}
                      className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white text-sm font-medium">
                              {request.requesterData?.displayName?.[0]?.toUpperCase() ||
                                request.requesterData?.username[0]?.toUpperCase() ||
                                "?"}
                            </span>
                          </div>
                          <div>
                            <div className="text-white font-satoshi">
                              {request.requesterData?.displayName ||
                                request.requesterData?.username}
                            </div>
                            <div className="text-gray-400 text-sm font-satoshi">
                              @{request.requesterUsername}
                            </div>
                            <div className="text-gray-400 text-xs font-satoshi">
                              {new Date(
                                request.requestedAt
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleFriendRequest(
                                request.requesterUsername,
                                "accept"
                              )
                            }
                            disabled={loading}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-green-700 transition-colors text-sm flex items-center"
                          >
                            <Check size={14} className="mr-1" />
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              handleFriendRequest(
                                request.requesterUsername,
                                "decline"
                              )
                            }
                            disabled={loading}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-red-700 transition-colors text-sm flex items-center"
                          >
                            <X size={14} className="mr-1" />
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "FundRequests" && (
              <div className="space-y-3">
                {loading && fundRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2AF19] mx-auto mb-2"></div>
                    <p className="text-gray-400 font-satoshi">
                      Loading fund requests...
                    </p>
                  </div>
                ) : fundRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8 lg:py-12">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
                      <DollarSign
                        size={20}
                        className="text-gray-400 lg:w-6 lg:h-6"
                      />
                    </div>
                    <h3 className="text-white text-base lg:text-lg font-satoshi mb-2">
                      No fund requests
                    </h3>
                    <p className="text-gray-400 font-satoshi text-sm lg:text-base">
                      Fund requests from friends will appear here
                    </p>
                  </div>
                ) : (
                  fundRequests.map((request) => (
                    <div
                      key={request._id}
                      className={`bg-[#0F0F0F] rounded-lg p-4 border transition-colors ${
                        canProcessFundRequest(request)
                          ? "border-[#2C2C2C] cursor-pointer hover:bg-[#1A1A1A] hover:border-[#E2AF19]"
                          : "border-gray-600 opacity-60"
                      }`}
                      onClick={() => {
                        if (canProcessFundRequest(request)) {
                          setSelectedFundRequest(request);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-white font-satoshi">
                            Fund Request from @{request.requesterUsername}
                          </div>
                          <div className="text-[#E2AF19] font-bold text-lg">
                            {request.amount} {request.tokenSymbol}
                          </div>
                          {request.message && (
                            <div className="text-gray-400 text-sm font-satoshi mt-1">
                              "{request.message}"
                            </div>
                          )}
                          <div className="flex items-center text-gray-400 text-xs font-satoshi mt-2">
                            <Clock size={12} className="mr-1" />
                            Requested{" "}
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-satoshi text-center ${
                              request.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : request.status === "fulfilled"
                                ? "bg-green-500/20 text-green-400"
                                : request.status === "declined"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </span>

                          {/* FIXED: Show action availability */}
                          {!canProcessFundRequest(request) && (
                            <span className="text-xs text-gray-500 font-satoshi text-center">
                              {request.status === "fulfilled" && "✅ Completed"}
                              {request.status === "declined" && "❌ Declined"}
                              {request.status === "expired" && "⏰ Expired"}
                              {request.status === "pending" &&
                                new Date() > new Date(request.expiresAt) &&
                                "⏰ Expired"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* FIXED: Show transaction hash for fulfilled requests */}
                      {request.status === "fulfilled" &&
                        request.transactionHash && (
                          <div className="mt-3 p-2 bg-green-900/20 border border-green-500/50 rounded">
                            <div className="flex items-center justify-between">
                              <span className="text-green-400 text-xs font-satoshi">
                                Transaction Hash:
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(
                                    request.transactionHash!,
                                    "txHash"
                                  );
                                }}
                                className="text-green-400 text-xs font-satoshi font-mono hover:text-green-300 transition-colors"
                              >
                                {request.transactionHash.slice(0, 10)}...
                                {request.transactionHash.slice(-8)}
                              </button>
                            </div>
                            {copied === "txHash" && (
                              <p className="text-green-400 text-xs font-satoshi mt-1">
                                Transaction hash copied!
                              </p>
                            )}
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FIXED: Enhanced Fund Request Modal */}
      {showFundRequestModal && selectedFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Request Funds
              </h3>
              <button
                onClick={() => {
                  setShowFundRequestModal(false);
                  setSelectedFriend(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-medium">
                      {selectedFriend.displayName?.[0]?.toUpperCase() ||
                        selectedFriend.username[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-satoshi">
                      {selectedFriend.displayName || selectedFriend.username}
                    </div>
                    <div className="text-gray-400 text-sm font-satoshi">
                      @{selectedFriend.username}
                    </div>
                  </div>
                </div>

                {/* Fund Request Flow Explanation */}
                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] mb-4">
                  <div className="text-sm font-satoshi mb-3">
                    <span className="text-[#E2AF19] font-medium">
                      💰 Fund Request Flow:
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-satoshi">
                        You're asking:
                      </span>
                      <span className="text-white font-satoshi">
                        @{selectedFriend.username}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-satoshi">
                        To send funds to:
                      </span>
                      <span className="text-white font-satoshi font-mono text-xs">
                        {activeWallet?.address
                          ? `${activeWallet.address.slice(
                              0,
                              8
                            )}...${activeWallet.address.slice(-6)}`
                          : "Your wallet"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/50 rounded">
                    <p className="text-blue-400 text-xs font-satoshi">
                      ℹ️ {selectedFriend.displayName || selectedFriend.username}{" "}
                      will send the requested token from their wallet to your
                      currently selected wallet.
                    </p>
                  </div>
                </div>

                {/* Active Wallet Display */}
                {activeWallet && (
                  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-green-400 text-sm font-satoshi font-medium">
                          ✅ Active Wallet Selected
                        </div>
                        <div className="text-green-400 text-xs font-satoshi">
                          Funds will be sent to: {activeWallet.name}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(activeWallet.address, "wallet")
                        }
                        className="text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    {copied === "wallet" && (
                      <p className="text-green-400 text-xs font-satoshi mt-1">
                        Wallet address copied!
                      </p>
                    )}
                  </div>
                )}

                {/* Warning if no active wallet */}
                {!activeWallet && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4">
                    <div className="flex items-start">
                      <AlertCircle
                        size={16}
                        className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-red-400 text-sm font-satoshi font-medium">
                          No Active Wallet Selected
                        </p>
                        <p className="text-red-400 text-xs font-satoshi">
                          Please select an active wallet to receive funds.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* FIXED: Enhanced Token Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Token to Request
                  </label>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {processTokensForDropdown().map((token) => (
                      <TokenDisplayCard
                        key={`${token.symbol}-${token.contractAddress}`}
                        token={token}
                        isSelected={
                          fundRequestData.selectedToken?.id === token.id
                        }
                        onClick={() =>
                          setFundRequestData({
                            ...fundRequestData,
                            selectedToken: token,
                          })
                        }
                      />
                    ))}
                  </div>

                  {processTokensForDropdown().length === 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                      <p className="text-yellow-400 text-sm font-satoshi">
                        ⚠️ No tokens available. Please ensure your wallet has
                        some tokens.
                      </p>
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <Input
                  type="text"
                  label="Amount"
                  placeholder="0.0"
                  value={fundRequestData.amount}
                  onChange={(e) =>
                    setFundRequestData({
                      ...fundRequestData,
                      amount: e.target.value,
                    })
                  }
                  className="font-satoshi"
                />

                {/* Message Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    placeholder="What's this request for?"
                    value={fundRequestData.message}
                    onChange={(e) =>
                      setFundRequestData({
                        ...fundRequestData,
                        message: e.target.value,
                      })
                    }
                    className="w-full p-3 bg-black border border-[#2C2C2C] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi resize-none"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowFundRequestModal(false);
                      setSelectedFriend(null);
                    }}
                    className="flex-1 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendFundRequest}
                    disabled={
                      loading ||
                      !fundRequestData.amount ||
                      !activeWallet ||
                      !fundRequestData.selectedToken
                    }
                    className="flex-1 px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending..." : "Send Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund Request Detail Modal */}
      {selectedFundRequest && (
        <FundRequestModal
          isOpen={!!selectedFundRequest}
          onClose={() => setSelectedFundRequest(null)}
          fundRequest={selectedFundRequest}
          onFulfilled={() => {
            setSelectedFundRequest(null);
            loadFundRequests();
          }}
          onDeclined={() => {
            setSelectedFundRequest(null);
            loadFundRequests();
          }}
        />
      )}

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Mobile specific adjustments */
        @media (max-width: 640px) {
          input {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
