// src/components/FriendsPage.tsx - ENHANCED with Fixed Token Dropdown
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
  CheckCircle,
  XCircle,
  Ban,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
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
  amount: string;
  message: string;
  status: "pending" | "fulfilled" | "declined" | "expired" | "cancelled";
  requestedAt: string;
  expiresAt: string;
  respondedAt?: string;
  transactionHash?: string;
  fulfilledBy?: string;
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
  const [fundRequestData, setFundRequestData] = useState({
    tokenSymbol: "ETH",
    amount: "",
    message: "",
  });

  // ADDED: Token dropdown state
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);

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

  // ENHANCED: Token image utilities (same as TokenList)
  const getTokenIcon = (symbol: string, contractAddress?: string) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
      ETHEREUM: "bg-blue-500",
      SOL: "bg-purple-500",
      BTC: "bg-orange-500",
      SUI: "bg-cyan-500",
      XRP: "bg-gray-500",
      ADA: "bg-blue-600",
      AVAX: "bg-red-500",
      TON: "bg-blue-400",
      DOT: "bg-pink-500",
      USDT: "bg-green-500",
      USDC: "bg-blue-600",
      YAI: "bg-yellow-500",
      LINK: "bg-blue-700",
    };

    // Special handling for ETH/native token
    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return colors.ETH || "bg-blue-500";
    }

    return colors[symbol] || "bg-gray-500";
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
    };

    // Special handling for ETH/native token
    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return letters.ETH || "Ξ";
    }

    return letters[symbol] || symbol.charAt(0);
  };

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url === "null" || url === "undefined" || url === "") {
      return false;
    }
    return (
      url.startsWith("http") &&
      (url.includes("coingecko") ||
        url.includes("coinbase") ||
        url.includes("cdn"))
    );
  };

  // ENHANCED: Render token with real images
  const renderTokenOption = (token: any, isSelected: boolean = false) => {
    const symbol = token?.symbol || "ETH";
    const contractAddress = token?.contractAddress;
    const imageUrl = token?.icon;

    return (
      <div
        className={`flex items-center ${isSelected ? "justify-between" : ""}`}
      >
        {/* Real token image */}
        {isValidImageUrl(imageUrl) ? (
          <img
            src={imageUrl}
            alt={symbol}
            className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
            onError={(e) => {
              console.log(`❌ Image load failed for ${symbol}: ${imageUrl}`);
              // Fallback to colored circle if image fails
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.classList.remove("hidden");
              }
            }}
          />
        ) : null}

        {/* Fallback colored circle */}
        <div
          className={`w-5 h-5 ${getTokenIcon(
            symbol,
            contractAddress
          )} rounded-full mr-2 flex items-center justify-center flex-shrink-0 ${
            isValidImageUrl(imageUrl) ? "hidden" : ""
          }`}
        >
          <span className="text-white text-xs font-medium">
            {getTokenLetter(symbol, contractAddress)}
          </span>
        </div>

        <span className="text-white font-satoshi">{symbol}</span>

        {isSelected && (
          <ChevronDown
            size={16}
            className="text-gray-400 pointer-events-none ml-auto"
          />
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

  // ADDED: Click outside handler for token dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector("[data-token-dropdown]");
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setShowTokenDropdown(false);
      }
    };

    if (showTokenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTokenDropdown]);

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

  // STRICT: Enhanced fund requests loading with status validation
  const loadFundRequests = async () => {
    try {
      setLoading(true);
      console.log("🔄 Loading fund requests with strict status checking...");

      const response = await fetch("/api/friends/fund-request?type=received", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const requests = data.fundRequests || [];

        // STRICT: Filter and validate statuses
        const validatedRequests = requests.map((request: FundRequest) => {
          // Check if expired
          const isExpired = new Date() > new Date(request.expiresAt);
          if (isExpired && request.status === "pending") {
            // Mark as expired in memory (API should handle this too)
            return { ...request, status: "expired" as const };
          }
          return request;
        });

        setFundRequests(validatedRequests);
        console.log("✅ Fund requests loaded with validation:", {
          total: validatedRequests.length,
          pending: validatedRequests.filter((r) => r.status === "pending")
            .length,
          fulfilled: validatedRequests.filter((r) => r.status === "fulfilled")
            .length,
          declined: validatedRequests.filter((r) => r.status === "declined")
            .length,
          expired: validatedRequests.filter((r) => r.status === "expired")
            .length,
        });
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
        // Show success message or toast here
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

  const openFundRequestModal = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowFundRequestModal(true);
    // ENHANCED: Set default to ETH or first available token with image
    const defaultToken =
      tokens.find((token) => token.symbol === "ETH") ||
      tokens.find((token) => isValidImageUrl(token.icon)) ||
      tokens[0];
    setFundRequestData({
      tokenSymbol: defaultToken?.symbol || "ETH",
      amount: "",
      message: "",
    });
  };

  const sendFundRequest = async () => {
    if (
      !selectedFriend ||
      !fundRequestData.amount ||
      !activeWallet?.address ||
      !currentUser
    ) {
      setError("Missing required information or no active wallet selected");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // FIXED: Use currentUser.username instead of decoded.username
      console.log("💰 Sending fund request:", {
        from: currentUser.username, // Current user (requester)
        to: selectedFriend.username, // Friend (who will send)
        amount: fundRequestData.amount,
        token: fundRequestData.tokenSymbol,
        requesterWallet: activeWallet.address, // Current user's active wallet
      });

      const response = await fetch("/api/friends/fund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUsername: selectedFriend.username, // Friend who will send funds
          tokenSymbol: fundRequestData.tokenSymbol,
          amount: fundRequestData.amount,
          message: fundRequestData.message,
          requesterWalletAddress: activeWallet.address, // FIXED: Use current user's active wallet
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setShowFundRequestModal(false);
        setSelectedFriend(null);
        setFundRequestData({
          tokenSymbol: tokens.length > 0 ? tokens[0].symbol : "ETH",
          amount: "",
          message: "",
        });

        // Show success message
        console.log("✅ Fund request sent successfully");

        // You could add a toast notification here
        // toast.success("Fund request sent successfully!");
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

  // STRICT: Enhanced fund request status display
  const getFundRequestStatusInfo = (request: FundRequest) => {
    const isExpired = new Date() > new Date(request.expiresAt);

    switch (request.status) {
      case "pending":
        if (isExpired) {
          return {
            icon: <Clock size={16} className="text-yellow-400" />,
            label: "Expired",
            color: "text-yellow-400",
            bgColor: "bg-yellow-500/20",
            canAction: false,
          };
        }
        return {
          icon: <Clock size={16} className="text-blue-400" />,
          label: "Pending",
          color: "text-blue-400",
          bgColor: "bg-blue-500/20",
          canAction: true,
        };
      case "fulfilled":
        return {
          icon: <CheckCircle size={16} className="text-green-400" />,
          label: "Fulfilled",
          color: "text-green-400",
          bgColor: "bg-green-500/20",
          canAction: false,
        };
      case "declined":
        return {
          icon: <XCircle size={16} className="text-red-400" />,
          label: "Declined",
          color: "text-red-400",
          bgColor: "bg-red-500/20",
          canAction: false,
        };
      case "expired":
        return {
          icon: <Clock size={16} className="text-yellow-400" />,
          label: "Expired",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/20",
          canAction: false,
        };
      case "cancelled":
        return {
          icon: <Ban size={16} className="text-gray-400" />,
          label: "Cancelled",
          color: "text-gray-400",
          bgColor: "bg-gray-500/20",
          canAction: false,
        };
      default:
        return {
          icon: <AlertCircle size={16} className="text-gray-400" />,
          label: "Unknown",
          color: "text-gray-400",
          bgColor: "bg-gray-500/20",
          canAction: false,
        };
    }
  };

  // STRICT: Enhanced fund request click handler
  const handleFundRequestClick = (request: FundRequest) => {
    const statusInfo = getFundRequestStatusInfo(request);

    console.log("🔔 Fund request clicked:", {
      requestId: request.requestId,
      status: request.status,
      canAction: statusInfo.canAction,
      hasTransactionHash: !!request.transactionHash,
    });

    if (!statusInfo.canAction) {
      // STRICT: For processed requests, show different behavior based on status
      if (request.status === "fulfilled" && request.transactionHash) {
        // Open transaction explorer for fulfilled requests
        window.open(
          `https://etherscan.io/tx/${request.transactionHash}`,
          "_blank"
        );
        return;
      } else {
        // For other processed statuses, show info modal or just ignore
        console.log(`ℹ️ Request is ${request.status} - no action available`);
        // Could show a toast here: "This request has been {status}"
        return;
      }
    }

    // Only open modal for pending requests
    setSelectedFundRequest(request);
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
              <div className="space-y-0">
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
                  fundRequests.map((request, index) => {
                    const statusInfo = getFundRequestStatusInfo(request);
                    return (
                      <div key={request._id}>
                        {/* Mobile Card Layout */}
                        <div className="block lg:hidden">
                          <div
                            className={`bg-[#0F0F0F] rounded-lg p-4 mb-3 border border-[#2C2C2C] transition-all ${
                              statusInfo.canAction
                                ? "cursor-pointer hover:bg-[#1A1A1A] hover:border-[#E2AF19]"
                                : "opacity-75"
                            }`}
                            onClick={() =>
                              statusInfo.canAction &&
                              handleFundRequestClick(request)
                            }
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-white text-sm font-medium">
                                    {request.requesterUsername[0]?.toUpperCase() ||
                                      "?"}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-white font-satoshi">
                                    @{request.requesterUsername}
                                  </div>
                                  <div className="text-gray-400 text-xs font-satoshi">
                                    {new Date(
                                      request.requestedAt
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>

                              {/* STRICT: Status indicator */}
                              <div
                                className={`px-2 py-1 rounded-full ${statusInfo.bgColor} flex items-center`}
                              >
                                {statusInfo.icon}
                                <span
                                  className={`ml-1 text-xs font-satoshi font-medium ${statusInfo.color}`}
                                >
                                  {statusInfo.label}
                                </span>
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="text-[#E2AF19] font-bold text-lg">
                                {request.amount} {request.tokenSymbol}
                              </div>
                              {request.message && (
                                <div className="text-gray-400 text-sm font-satoshi mt-1">
                                  "{request.message}"
                                </div>
                              )}
                            </div>

                            {/* STRICT: Different actions based on status */}
                            <div className="flex items-center justify-between pt-3 border-t border-[#2C2C2C]">
                              <div className="flex items-center text-gray-400 text-xs font-satoshi">
                                <Clock size={12} className="mr-1" />
                                {statusInfo.canAction ? (
                                  <>
                                    Expires{" "}
                                    {new Date(
                                      request.expiresAt
                                    ).toLocaleDateString()}
                                  </>
                                ) : (
                                  <>
                                    {request.respondedAt
                                      ? `Responded ${new Date(
                                          request.respondedAt
                                        ).toLocaleDateString()}`
                                      : `${statusInfo.label} ${new Date(
                                          request.requestedAt
                                        ).toLocaleDateString()}`}
                                  </>
                                )}
                              </div>

                              {/* STRICT: Action indicators */}
                              {statusInfo.canAction ? (
                                <div className="text-[#E2AF19] text-xs font-satoshi">
                                  Tap to respond
                                </div>
                              ) : request.status === "fulfilled" &&
                                request.transactionHash ? (
                                <div className="text-green-400 text-xs font-satoshi flex items-center">
                                  <ExternalLink size={12} className="mr-1" />
                                  View Transaction
                                </div>
                              ) : (
                                <div
                                  className={`text-xs font-satoshi ${statusInfo.color}`}
                                >
                                  {statusInfo.label}
                                </div>
                              )}
                            </div>

                            {/* Transaction hash for fulfilled requests */}
                            {request.status === "fulfilled" &&
                              request.transactionHash && (
                                <div className="mt-2 p-2 bg-green-900/20 border border-green-500/50 rounded">
                                  <div className="flex items-center justify-between">
                                    <span className="text-green-400 text-xs font-satoshi">
                                      Tx: {request.transactionHash.slice(0, 10)}
                                      ...{request.transactionHash.slice(-8)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(
                                          request.transactionHash!,
                                          `tx-${request._id}`
                                        );
                                      }}
                                      className="text-green-400 hover:text-green-300 transition-colors"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                  {copied === `tx-${request._id}` && (
                                    <p className="text-green-400 text-xs font-satoshi mt-1">
                                      Transaction hash copied!
                                    </p>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Desktop Row Layout */}
                        <div className="hidden lg:block">
                          <div
                            className={`flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
                              statusInfo.canAction
                                ? "cursor-pointer hover:bg-[#1A1A1A]"
                                : "opacity-75"
                            }`}
                            onClick={() =>
                              statusInfo.canAction &&
                              handleFundRequestClick(request)
                            }
                          >
                            <div className="flex items-center flex-1">
                              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                <span className="text-white text-sm font-medium">
                                  {request.requesterUsername[0]?.toUpperCase() ||
                                    "?"}
                                </span>
                              </div>
                              <div className="flex-1">
                                <span className="text-white font-satoshi">
                                  @{request.requesterUsername}
                                </span>
                                <div className="text-gray-400 text-sm font-satoshi">
                                  {new Date(
                                    request.requestedAt
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              <div className="text-[#E2AF19] font-bold font-satoshi">
                                {request.amount} {request.tokenSymbol}
                              </div>

                              {/* STRICT: Status display */}
                              <div
                                className={`px-3 py-1 rounded-full ${statusInfo.bgColor} flex items-center`}
                              >
                                {statusInfo.icon}
                                <span
                                  className={`ml-2 text-sm font-satoshi font-medium ${statusInfo.color}`}
                                >
                                  {statusInfo.label}
                                </span>
                              </div>

                              {/* STRICT: Action indicators */}
                              {statusInfo.canAction ? (
                                <div className="text-[#E2AF19] text-sm font-satoshi">
                                  Click to respond
                                </div>
                              ) : request.status === "fulfilled" &&
                                request.transactionHash ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(
                                      `https://etherscan.io/tx/${request.transactionHash}`,
                                      "_blank"
                                    );
                                  }}
                                  className="text-green-400 text-sm font-satoshi hover:opacity-80 transition-opacity flex items-center"
                                >
                                  <ExternalLink size={14} className="mr-1" />
                                  Explorer
                                </button>
                              ) : (
                                <div
                                  className={`text-sm font-satoshi ${statusInfo.color}`}
                                >
                                  {request.respondedAt
                                    ? new Date(
                                        request.respondedAt
                                      ).toLocaleDateString()
                                    : "—"}
                                </div>
                              )}
                            </div>
                          </div>

                          {index < fundRequests.length - 1 && (
                            <div className="border-b border-[#2C2C2C] mx-4"></div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ENHANCED: Fund Request Modal with Fixed Token Dropdown */}
      {showFundRequestModal && selectedFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Request Funds
              </h3>
              <button
                onClick={() => {
                  setShowFundRequestModal(false);
                  setSelectedFriend(null);
                  setShowTokenDropdown(false); // ADDED: Reset dropdown state
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

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

              {/* FIXED: Clear explanation of fund request flow */}
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
                    will send {fundRequestData.tokenSymbol} from their wallet to
                    your currently selected wallet.
                  </p>
                </div>
              </div>

              {/* Current Active Wallet Display */}
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
                    <AlertTriangle
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
              {/* FIXED: Token Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token
                </label>
                <div className="relative" data-token-dropdown>
                  {/* Custom Select Button */}
                  <button
                    type="button"
                    onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                    className="w-full bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-white font-satoshi text-left flex items-center justify-between hover:border-[#E2AF19] transition-colors focus:outline-none focus:border-[#E2AF19]"
                  >
                    <div className="flex items-center">
                      {(() => {
                        const selectedToken = tokens.find(
                          (t) => t.symbol === fundRequestData.tokenSymbol
                        ) || {
                          symbol: "ETH",
                          icon: null,
                          contractAddress: "native",
                        };
                        return (
                          <>
                            {/* Real token image */}
                            {isValidImageUrl(selectedToken.icon) ? (
                              <img
                                src={selectedToken.icon}
                                alt={selectedToken.symbol}
                                className="w-6 h-6 rounded-full mr-3 flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const fallback =
                                    target.nextElementSibling as HTMLElement;
                                  if (fallback) {
                                    fallback.classList.remove("hidden");
                                  }
                                }}
                              />
                            ) : null}

                            {/* Fallback colored circle */}
                            <div
                              className={`w-6 h-6 ${getTokenIcon(
                                selectedToken.symbol,
                                selectedToken.contractAddress
                              )} rounded-full mr-3 flex items-center justify-center flex-shrink-0 ${
                                isValidImageUrl(selectedToken.icon)
                                  ? "hidden"
                                  : ""
                              }`}
                            >
                              <span className="text-white text-xs font-medium">
                                {getTokenLetter(
                                  selectedToken.symbol,
                                  selectedToken.contractAddress
                                )}
                              </span>
                            </div>

                            <span className="text-white font-satoshi">
                              {selectedToken.symbol}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${
                        showTokenDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Custom Dropdown Menu */}
                  {showTokenDropdown && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {/* ETH Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setFundRequestData({
                            ...fundRequestData,
                            tokenSymbol: "ETH",
                          });
                          setShowTokenDropdown(false);
                        }}
                        className="w-full flex items-center px-3 py-3 hover:bg-[#2C2C2C] transition-colors text-left border-b border-[#2C2C2C] last:border-b-0"
                      >
                        <div className="w-6 h-6 bg-blue-500 rounded-full mr-3 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            Ξ
                          </span>
                        </div>
                        <span className="text-white font-satoshi">ETH</span>
                      </button>

                      {/* Other Token Options */}
                      {tokens.map((token) => (
                        <button
                          key={token.id}
                          type="button"
                          onClick={() => {
                            setFundRequestData({
                              ...fundRequestData,
                              tokenSymbol: token.symbol,
                            });
                            setShowTokenDropdown(false);
                          }}
                          className="w-full flex items-center px-3 py-3 hover:bg-[#2C2C2C] transition-colors text-left border-b border-[#2C2C2C] last:border-b-0"
                        >
                          {/* Real token image */}
                          {isValidImageUrl(token.icon) ? (
                            <img
                              src={token.icon}
                              alt={token.symbol}
                              className="w-6 h-6 rounded-full mr-3 flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const fallback =
                                  target.nextElementSibling as HTMLElement;
                                if (fallback) {
                                  fallback.classList.remove("hidden");
                                }
                              }}
                            />
                          ) : null}

                          {/* Fallback colored circle */}
                          <div
                            className={`w-6 h-6 ${getTokenIcon(
                              token.symbol,
                              token.contractAddress
                            )} rounded-full mr-3 flex items-center justify-center flex-shrink-0 ${
                              isValidImageUrl(token.icon) ? "hidden" : ""
                            }`}
                          >
                            <span className="text-white text-xs font-medium">
                              {getTokenLetter(
                                token.symbol,
                                token.contractAddress
                              )}
                            </span>
                          </div>

                          <span className="text-white font-satoshi">
                            {token.symbol}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowFundRequestModal(false);
                    setSelectedFriend(null);
                    setShowTokenDropdown(false); // ADDED: Reset dropdown state
                  }}
                  className="flex-1 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendFundRequest}
                  disabled={loading || !fundRequestData.amount || !activeWallet}
                  className="flex-1 px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund Request Detail Modal - STRICT: Only opens for pending requests */}
      {selectedFundRequest && (
        <FundRequestModal
          isOpen={!!selectedFundRequest}
          onClose={() => setSelectedFundRequest(null)}
          fundRequest={selectedFundRequest}
          onFulfilled={() => {
            setSelectedFundRequest(null);
            loadFundRequests(); // Refresh the list
          }}
          onDeclined={() => {
            setSelectedFundRequest(null);
            loadFundRequests(); // Refresh the list
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

        select {
          background-image: none;
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
