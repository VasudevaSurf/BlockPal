// src/components/FriendsPage.tsx - FIXED: Token dropdown showing only USDC, USDT, ETH
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  DollarSign,
  Clock,
  AlertCircle,
  Check,
  X,
  Bell,
  HelpCircle,
  Copy,
  CheckCircle,
  XCircle,
  Ban,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FundRequestModal from "@/components/friends/FundRequestModal";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import EnhancedFriendsSearch from "@/components/friends/EnhancedFriendsSearch";
import { SkeletonFriendsPage } from "@/components/ui/Skeleton";
import FriendsIcon from "./icons/FriendsIcon";

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  gmail?: string;
  walletAddress?: string;
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

interface SentRequest {
  _id: string;
  requesterUsername: string;
  receiverUsername: string;
  status: "pending";
  requestedAt: string;
  receiverData?: User;
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

// FIXED: Only show these three tokens
const ALLOWED_TOKENS = [
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    contractAddress: "native",
    decimals: 18,
    icon: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    icon: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether USD",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    icon: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
  },
];

// Helper function to parse user-friendly error messages
const parseErrorMessage = (error: string): string => {
  if (error.includes("insufficient funds")) {
    return "Insufficient funds for this request. Please check your wallet balance.";
  }
  if (error.includes("gas")) {
    return "Not enough ETH to pay for transaction fees.";
  }
  if (error.includes("execution reverted")) {
    return "Transaction failed. Please check token balances and try again.";
  }
  if (error.includes("nonce too low")) {
    return "Network issue detected. Please try again.";
  }
  if (error.includes("network error") || error.includes("timeout")) {
    return "Network connection error. Please check your internet and try again.";
  }
  if (error.includes("user denied") || error.includes("user rejected")) {
    return "Transaction was cancelled.";
  }
  if (error.includes("cannot send to yourself") || error.includes("self")) {
    return "You cannot send requests to yourself.";
  }

  // For any other technical errors, return a generic user-friendly message
  return "Request failed. Please try again or contact support if the issue persists.";
};

export default function FriendsPage() {
  const { activeWallet, tokens } = useSelector(
    (state: RootState) => state.wallet
  );

  // FIXED: Get current user from auth state
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUsername = user?.username;

  const [activeTab, setActiveTab] = useState<
    "Friends" | "Requests" | "FundRequests"
  >("Friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Fund request modal states
  const [showFundRequestModal, setShowFundRequestModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedFundRequest, setSelectedFundRequest] =
    useState<FundRequest | null>(null);
  const [fundRequestData, setFundRequestData] = useState({
    tokenSymbol: "ETH",
    amount: "",
    message: "",
  });

  // Token dropdown state for fund request modal
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);

  // Remove friend confirmation modal state
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);

  // Track copied state for clipboard actions
  const [copied, setCopied] = useState<string | null>(null);

  // FIXED: Get available tokens with user balances
  const getAvailableTokensWithBalances = () => {
    return ALLOWED_TOKENS.map((allowedToken) => {
      // Find the user's token that matches this allowed token
      const userToken = tokens.find(
        (t) => t.symbol.toUpperCase() === allowedToken.symbol.toUpperCase()
      );

      return {
        ...allowedToken,
        balance: userToken?.balance || "0",
        balanceFormatted: userToken?.balanceFormatted || "0",
        hasBalance: userToken
          ? parseFloat(userToken.balanceFormatted || "0") > 0
          : false,
      };
    });
  };

  // Copy to clipboard helper
  const copyToClipboard = (value: string, key: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  // Enhanced token utilities (same as TokenList)
  const getTokenIcon = (symbol: string, contractAddress?: string) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
      USDC: "bg-blue-600",
      USDT: "bg-green-500",
    };

    return colors[symbol.toUpperCase()] || "bg-gray-500";
  };

  const getTokenLetter = (symbol: string, contractAddress?: string) => {
    const letters: Record<string, string> = {
      ETH: "Ξ",
      USDC: "$",
      USDT: "₮",
    };

    return letters[symbol.toUpperCase()] || symbol.charAt(0);
  };

  // FIXED: Enhanced token rendering for fund request modal
  const renderTokenOption = (token: any, isSelected: boolean = false) => {
    const symbol = token?.symbol || "ETH";
    const balance = token?.balanceFormatted || "0";
    const hasBalance = token?.hasBalance || false;

    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          {/* Token Icon/Image */}
          <div className="relative w-5 h-5 mr-2 flex-shrink-0">
            <img
              src={token.icon}
              alt={symbol}
              className="w-5 h-5 rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.parentElement?.querySelector(
                  ".fallback-icon"
                ) as HTMLElement;
                if (fallback) {
                  fallback.style.display = "flex";
                }
              }}
            />
            <div
              className={`fallback-icon absolute inset-0 ${getTokenIcon(
                symbol
              )} rounded-full flex items-center justify-center hidden`}
            >
              <span className="text-white text-xs font-medium">
                {getTokenLetter(symbol)}
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <span className="text-white font-satoshi mr-2">{symbol}</span>
            <span
              className={`text-xs font-satoshi ${
                hasBalance ? "text-green-400" : "text-gray-400"
              }`}
            >
              ({balance})
            </span>
          </div>
        </div>

        {isSelected && (
          <ChevronDown
            size={14}
            className="text-gray-400 pointer-events-none"
          />
        )}
      </div>
    );
  };

  // Click outside handler for token dropdown
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

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (activeTab === "Friends") {
        await loadFriends();
        await loadSentRequests();
      } else if (activeTab === "Requests") {
        await loadFriendRequests();
      } else if (activeTab === "FundRequests") {
        await loadFundRequests();
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
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

  // Load initial data
  useEffect(() => {
    loadInitialData();
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (!initialLoading) {
      if (activeTab === "Friends") {
        loadFriends();
        loadSentRequests();
      } else if (activeTab === "Requests") {
        loadFriendRequests();
      } else if (activeTab === "FundRequests") {
        loadFundRequests();
      }
    }
  }, [activeTab, initialLoading]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends?type=friends", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      } else {
        setError("Failed to load friends");
      }
    } catch (error) {
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
      } else {
        setError("Failed to load friend requests");
      }
    } catch (error) {
      setError("Failed to load friend requests");
    } finally {
      setLoading(false);
    }
  };

  const loadSentRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends?type=sent-requests", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSentRequests(data.sentRequests || []);
      } else {
        setError("Failed to load sent requests");
      }
    } catch (error) {
      setError("Failed to load sent requests");
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
        const requests = data.fundRequests || [];

        const validatedRequests = requests.map((request: FundRequest) => {
          const isExpired = new Date() > new Date(request.expiresAt);
          if (isExpired && request.status === "pending") {
            return { ...request, status: "expired" as const };
          }
          return request;
        });

        setFundRequests(validatedRequests);
      } else {
        setError("Failed to load fund requests");
      }
    } catch (error) {
      setError("Failed to load fund requests");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Enhanced friend request validation
  const sendFriendRequest = async (username: string) => {
    try {
      // FIXED: Check if trying to send request to self
      if (username === currentUsername) {
        setError("You cannot send a friend request to yourself.");
        return;
      }

      setLoading(true);
      setError("");
      setSuccessMessage("");

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
        // Refresh sent requests to update search suggestions
        loadSentRequests();
        // Show success message
        setSuccessMessage(`Friend request sent to @${username}!`);
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(
          parseErrorMessage(data.error || "Failed to send friend request")
        );
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
      setError("");
      setSuccessMessage("");

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
        loadSentRequests();
        if (action === "accept") {
          loadFriends();
          setSuccessMessage(`You are now friends with @${username}!`);
        } else {
          setSuccessMessage(`Friend request from @${username} declined.`);
        }
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(`Failed to ${action} friend request`);
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      setError(`Failed to ${action} friend request`);
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (username: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

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
        setShowRemoveConfirmation(false);
        setFriendToRemove(null);
        // Show success message
        setSuccessMessage(`@${username} has been removed from your friends.`);
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError("Failed to remove friend");
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      setError("Failed to remove friend");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = (friend: Friend) => {
    setFriendToRemove(friend);
    setShowRemoveConfirmation(true);
  };

  // FIXED: Enhanced fund request validation
  const openFundRequestModal = (friend: Friend) => {
    // FIXED: Check if trying to request funds from self
    if (friend.username === currentUsername) {
      setError("You cannot request funds from yourself.");
      return;
    }

    setSelectedFriend(friend);
    setShowFundRequestModal(true);

    // Set default to ETH
    setFundRequestData({
      tokenSymbol: "ETH",
      amount: "",
      message: "",
    });
  };

  // FIXED: Enhanced fund request validation
  const sendFundRequest = async () => {
    if (
      !selectedFriend ||
      !fundRequestData.amount ||
      !activeWallet?.address ||
      !currentUsername
    ) {
      setError("Missing required information or no active wallet selected");
      return;
    }

    // FIXED: Additional check to prevent self fund requests
    if (selectedFriend.username === currentUsername) {
      setError("You cannot request funds from yourself.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/friends/fund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUsername: selectedFriend.username,
          tokenSymbol: fundRequestData.tokenSymbol,
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
          tokenSymbol: "ETH",
          amount: "",
          message: "",
        });
        // Show success message
        setSuccessMessage(
          `Fund request for ${fundRequestData.amount} ${fundRequestData.tokenSymbol} sent to @${selectedFriend.username}!`
        );
        // Auto-hide success message after 4 seconds (longer for fund requests)
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setError(
          parseErrorMessage(data.error || "Failed to send fund request")
        );
      }
    } catch (error: any) {
      setError(
        parseErrorMessage(error.message || "Failed to send fund request")
      );
    } finally {
      setLoading(false);
    }
  };

  // Fund request status display
  const getFundRequestStatusInfo = (request: FundRequest) => {
    const isExpired = new Date() > new Date(request.expiresAt);

    switch (request.status) {
      case "pending":
        if (isExpired) {
          return {
            icon: <Clock size={14} className="text-yellow-400" />,
            label: "Expired",
            color: "text-yellow-400",
            bgColor: "bg-yellow-500/20",
            canAction: false,
          };
        }
        return {
          icon: <Clock size={14} className="text-blue-400" />,
          label: "Pending",
          color: "text-blue-400",
          bgColor: "bg-blue-500/20",
          canAction: true,
        };
      case "fulfilled":
        return {
          icon: <CheckCircle size={14} className="text-green-400" />,
          label: "Fulfilled",
          color: "text-green-400",
          bgColor: "bg-green-500/20",
          canAction: false,
        };
      case "declined":
        return {
          icon: <XCircle size={14} className="text-red-400" />,
          label: "Declined",
          color: "text-red-400",
          bgColor: "bg-red-500/20",
          canAction: false,
        };
      case "expired":
        return {
          icon: <Clock size={14} className="text-yellow-400" />,
          label: "Expired",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/20",
          canAction: false,
        };
      case "cancelled":
        return {
          icon: <Ban size={14} className="text-gray-400" />,
          label: "Cancelled",
          color: "text-gray-400",
          bgColor: "bg-gray-500/20",
          canAction: false,
        };
      default:
        return {
          icon: <AlertCircle size={14} className="text-gray-400" />,
          label: "Unknown",
          color: "text-gray-400",
          bgColor: "bg-gray-500/20",
          canAction: false,
        };
    }
  };

  const handleFundRequestClick = (request: FundRequest) => {
    const statusInfo = getFundRequestStatusInfo(request);

    if (!statusInfo.canAction) {
      if (request.status === "fulfilled" && request.transactionHash) {
        window.open(
          `https://etherscan.io/tx/${request.transactionHash}`,
          "_blank"
        );
        return;
      } else {
        return;
      }
    }

    setSelectedFundRequest(request);
  };

  // Show skeleton when initially loading
  if (initialLoading) {
    return <SkeletonFriendsPage />;
  }

  return (
    <>
      {/* ADDED: Backdrop for all modals and dropdowns */}
      {(showFundRequestModal ||
        selectedFundRequest ||
        showNotifications ||
        showTokenDropdown ||
        showRemoveConfirmation) && (
        <div className="fixed inset-0 z-30 bg-white/10" />
      )}

      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2 sm:p-2.5 lg:p-3 flex flex-col overflow-hidden">
        {/* Success Message Display */}
        {successMessage && (
          <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-2 mb-3 flex-shrink-0">
            <div className="flex items-start">
              <CheckCircle
                size={14}
                className="text-green-400 mr-2 mt-0.5 flex-shrink-0"
              />
              <p className="text-green-400 text-sm font-satoshi">
                {successMessage}
              </p>
              <button
                onClick={() => setSuccessMessage("")}
                className="ml-auto text-green-400 hover:text-green-300"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2 mb-3 flex-shrink-0">
            <div className="flex items-start">
              <AlertCircle
                size={14}
                className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
              />
              <p className="text-red-400 text-sm font-satoshi">{error}</p>
              <button
                onClick={() => setError("")}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] p-3 lg:p-4 flex-1 flex flex-col min-h-0">
            {/* Tab Navigation with Enhanced Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-3 lg:mb-4 gap-3">
              {/* Tab Buttons */}
              <div className="flex">
                <button
                  onClick={() => setActiveTab("Friends")}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg font-satoshi transition-colors mr-2 text-sm ${
                    activeTab === "Friends"
                      ? "bg-[#E2AF19] text-black font-medium"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Friends
                </button>
                <button
                  onClick={() => setActiveTab("Requests")}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg font-satoshi transition-colors border mr-2 text-sm ${
                    activeTab === "Requests"
                      ? "bg-[#E2AF19] text-black font-medium border-[#E2AF19]"
                      : "text-gray-400 hover:text-white border-[#2C2C2C]"
                  }`}
                >
                  Requests
                </button>
                <button
                  onClick={() => setActiveTab("FundRequests")}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg font-satoshi transition-colors border text-sm ${
                    activeTab === "FundRequests"
                      ? "bg-[#E2AF19] text-black font-medium border-[#E2AF19]"
                      : "text-gray-400 hover:text-white border-[#2C2C2C]"
                  }`}
                >
                  Fund Requests
                </button>
              </div>

              {/* Enhanced Search Component - Only show for Friends tab */}
              {activeTab === "Friends" && (
                <div className="w-full lg:w-80">
                  <EnhancedFriendsSearch
                    friends={friends}
                    friendRequests={friendRequests}
                    sentRequests={sentRequests}
                    onSendFriendRequest={sendFriendRequest}
                    loading={loading}
                    currentUsername={currentUsername}
                  />
                </div>
              )}
            </div>

            {/* Content based on active tab */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col">
              {activeTab === "Friends" && (
                <div className="space-y-0 flex-1 flex flex-col">
                  {loading && friends.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19] mx-auto mb-2"></div>
                      <p className="text-gray-400 font-satoshi">
                        Loading friends...
                      </p>
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                        <FriendsIcon
                          size={18}
                          className="text-gray-400 lg:w-5 lg:h-5"
                        />
                      </div>
                      <p className="text-gray-400 font-satoshi text-sm">
                        Search for friends using the search box above
                      </p>
                    </div>
                  ) : (
                    friends.map((friend, index) => (
                      <div key={friend._id}>
                        {/* Mobile Card Layout */}
                        <div className="block lg:hidden">
                          <div className="bg-[#0F0F0F] rounded-lg p-3 mb-2 border border-[#2C2C2C]">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white text-xs font-medium">
                                  {friend.displayName?.[0]?.toUpperCase() ||
                                    friend.username[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="text-white font-satoshi text-sm">
                                  {friend.displayName || friend.username}
                                </div>
                                <div className="text-gray-400 text-xs font-satoshi">
                                  @{friend.username}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-1.5">
                              <button
                                onClick={() => openFundRequestModal(friend)}
                                className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-sm flex-1 flex items-center justify-center"
                              >
                                Request Funds
                              </button>
                              <button
                                onClick={() => handleRemoveFriend(friend)}
                                className="bg-transparent border border-red-500 text-red-500 px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-red-500 hover:text-white transition-colors text-sm flex-1"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Row Layout */}
                        <div className="hidden lg:block">
                          <div className="flex items-center justify-between py-2 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-2">
                                <span className="text-white text-sm font-medium">
                                  {friend.displayName?.[0]?.toUpperCase() ||
                                    friend.username[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <span className="text-white font-satoshi text-sm">
                                  {friend.displayName || friend.username}
                                </span>
                                <div className="text-gray-400 text-xs font-satoshi">
                                  @{friend.username}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openFundRequestModal(friend)}
                                className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-sm flex items-center"
                              >
                                Request Funds
                              </button>
                              <button
                                onClick={() => handleRemoveFriend(friend)}
                                className="bg-transparent border border-red-500 text-red-500 px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-red-500 hover:text-white transition-colors text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {index < friends.length - 1 && (
                            <div className="border-b border-[#2C2C2C] mx-3"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "Requests" && (
                <div className="space-y-2 flex-1 flex flex-col">
                  {loading && friendRequests.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19] mx-auto mb-2"></div>
                      <p className="text-gray-400 font-satoshi">
                        Loading requests...
                      </p>
                    </div>
                  ) : friendRequests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                        <Bell
                          size={18}
                          className="text-gray-400 lg:w-5 lg:h-5"
                        />
                      </div>
                      <h3 className="text-white text-sm lg:text-base font-satoshi mb-2">
                        No friend requests
                      </h3>
                      <p className="text-gray-400 font-satoshi text-sm">
                        Friend requests will appear here
                      </p>
                    </div>
                  ) : (
                    friendRequests.map((request) => (
                      <div
                        key={request._id}
                        className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-2">
                              <span className="text-white text-sm font-medium">
                                {request.requesterData?.displayName?.[0]?.toUpperCase() ||
                                  request.requesterData?.username[0]?.toUpperCase() ||
                                  "?"}
                              </span>
                            </div>
                            <div>
                              <div className="text-white font-satoshi text-sm">
                                {request.requesterData?.displayName ||
                                  request.requesterData?.username}
                              </div>
                              <div className="text-gray-400 text-xs font-satoshi">
                                @{request.requesterUsername}
                              </div>
                              <div className="text-gray-400 text-xs font-satoshi">
                                {new Date(
                                  request.requestedAt
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-1.5">
                            <button
                              onClick={() =>
                                handleFriendRequest(
                                  request.requesterUsername,
                                  "accept"
                                )
                              }
                              disabled={loading}
                              className="bg-green-600 text-white px-2.5 py-1 rounded-lg font-satoshi font-medium hover:bg-green-700 transition-colors text-sm flex items-center"
                            >
                              <Check size={12} className="mr-1" />
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
                              className="bg-red-600 text-white px-2.5 py-1 rounded-lg font-satoshi font-medium hover:bg-red-700 transition-colors text-sm flex items-center"
                            >
                              <X size={12} className="mr-1" />
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
                <div className="space-y-0 flex-1 flex flex-col">
                  {loading && fundRequests.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19] mx-auto mb-2"></div>
                      <p className="text-gray-400 font-satoshi">
                        Loading fund requests...
                      </p>
                    </div>
                  ) : fundRequests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-3">
                        <DollarSign
                          size={18}
                          className="text-gray-400 lg:w-5 lg:h-5"
                        />
                      </div>
                      <h3 className="text-white text-sm lg:text-base font-satoshi mb-2">
                        No fund requests
                      </h3>
                      <p className="text-gray-400 font-satoshi text-sm">
                        Fund requests from friends will appear here
                      </p>
                    </div>
                  ) : (
                    fundRequests.map((request, index) => {
                      const statusInfo = getFundRequestStatusInfo(request);
                      return (
                        <div key={request._id}>
                          {/* Fund request cards remain the same... */}
                          <div className="block lg:hidden">
                            <div
                              className={`bg-[#0F0F0F] rounded-lg p-3 mb-2 border border-[#2C2C2C] transition-all ${
                                statusInfo.canAction
                                  ? "cursor-pointer hover:bg-[#1A1A1A] hover:border-[#E2AF19]"
                                  : "opacity-75"
                              }`}
                              onClick={() =>
                                statusInfo.canAction &&
                                handleFundRequestClick(request)
                              }
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-2">
                                    <span className="text-white text-sm font-medium">
                                      {request.requesterUsername[0]?.toUpperCase() ||
                                        "?"}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-white font-satoshi text-sm">
                                      @{request.requesterUsername}
                                    </div>
                                    <div className="text-gray-400 text-xs font-satoshi">
                                      {new Date(
                                        request.requestedAt
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`px-2 py-0.5 rounded-full ${statusInfo.bgColor} flex items-center`}
                                >
                                  {statusInfo.icon}
                                  <span
                                    className={`ml-1 text-xs font-satoshi font-medium ${statusInfo.color}`}
                                  >
                                    {statusInfo.label}
                                  </span>
                                </div>
                              </div>

                              <div className="mb-2">
                                <div className="text-[#E2AF19] font-bold text-base">
                                  {request.amount} {request.tokenSymbol}
                                </div>
                                {request.message && (
                                  <div className="text-gray-400 text-sm font-satoshi mt-1">
                                    "{request.message}"
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-[#2C2C2C]">
                                <div className="flex items-center text-gray-400 text-xs font-satoshi">
                                  <Clock size={10} className="mr-1" />
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

                                {statusInfo.canAction ? (
                                  <div className="text-[#E2AF19] text-xs font-satoshi">
                                    Tap to respond
                                  </div>
                                ) : request.status === "fulfilled" &&
                                  request.transactionHash ? (
                                  <div className="text-green-400 text-xs font-satoshi flex items-center">
                                    <ExternalLink size={10} className="mr-1" />
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

                              {request.status === "fulfilled" &&
                                request.transactionHash && (
                                  <div className="mt-2 p-2 bg-green-900/20 border border-green-500/50 rounded">
                                    <div className="flex items-center justify-between">
                                      <span className="text-green-400 text-xs font-satoshi">
                                        Tx:{" "}
                                        {request.transactionHash.slice(0, 10)}
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
                                        <Copy size={10} />
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
                              className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
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
                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-white text-sm font-medium">
                                    {request.requesterUsername[0]?.toUpperCase() ||
                                      "?"}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <span className="text-white font-satoshi text-sm">
                                    @{request.requesterUsername}
                                  </span>
                                  <div className="text-gray-400 text-xs font-satoshi">
                                    {new Date(
                                      request.requestedAt
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-3">
                                <div className="text-[#E2AF19] font-bold font-satoshi text-sm">
                                  {request.amount} {request.tokenSymbol}
                                </div>

                                <div
                                  className={`px-2 py-0.5 rounded-full ${statusInfo.bgColor} flex items-center`}
                                >
                                  {statusInfo.icon}
                                  <span
                                    className={`ml-1.5 text-sm font-satoshi font-medium ${statusInfo.color}`}
                                  >
                                    {statusInfo.label}
                                  </span>
                                </div>

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
                                    <ExternalLink size={12} className="mr-1" />
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
                              <div className="border-b border-[#2C2C2C] mx-3"></div>
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

        {/* Fund Request Modal - FIXED with only ETH, USDC, USDT */}
        {showFundRequestModal && selectedFriend && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md p-4">
              {/* Header with back button and centered title */}
              <div className="flex items-center mb-4">
                <button
                  onClick={() => {
                    setShowFundRequestModal(false);
                    setSelectedFriend(null);
                    setShowTokenDropdown(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors mr-3"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 className="flex-1 text-center text-base font-semibold text-white font-satoshi">
                  Request Funds
                </h3>
                {/* Invisible spacer to center the title */}
                <div className="w-4"></div>
              </div>

              <div className="mb-3">
                {/* Warning if no active wallet */}
                {!activeWallet && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2 mb-3">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={14}
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

              <div className="space-y-3">
                {/* FIXED: Token Dropdown with only allowed tokens */}
                <div className="relative" data-token-dropdown>
                  <button
                    type="button"
                    onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                    className="w-full bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg px-2.5 py-2.5 text-white font-satoshi text-left flex items-center justify-between hover:border-[#E2AF19] transition-colors focus:outline-none focus:border-[#E2AF19]"
                  >
                    {(() => {
                      const availableTokens = getAvailableTokensWithBalances();
                      const selectedToken =
                        availableTokens.find(
                          (t) => t.symbol === fundRequestData.tokenSymbol
                        ) || availableTokens[0];
                      return renderTokenOption(selectedToken, true);
                    })()}
                  </button>

                  {showTokenDropdown && (
                    <div className="absolute top-full left-0 right-0 z-[60] mt-1.5 bg-black border border-[#2C2C2C] rounded-lg shadow-2xl overflow-hidden">
                      {/* FIXED: Show only allowed tokens */}
                      {getAvailableTokensWithBalances().map((token) => (
                        <button
                          key={token.symbol}
                          type="button"
                          onClick={() => {
                            setFundRequestData({
                              ...fundRequestData,
                              tokenSymbol: token.symbol,
                            });
                            setShowTokenDropdown(false);
                          }}
                          className="w-full flex items-center px-2.5 py-2.5 hover:bg-[#2C2C2C] transition-colors text-left border-b border-[#2C2C2C] last:border-b-0"
                        >
                          {renderTokenOption(token)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <input
                  type="text"
                  placeholder="Amount (e.g., 0.5)"
                  value={fundRequestData.amount}
                  onChange={(e) =>
                    setFundRequestData({
                      ...fundRequestData,
                      amount: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi transition-colors"
                />

                {/* Message Input */}
                <textarea
                  placeholder="Message (optional) - What's this request for?"
                  value={fundRequestData.message}
                  onChange={(e) =>
                    setFundRequestData({
                      ...fundRequestData,
                      message: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi resize-none transition-colors"
                  rows={2}
                />

                {/* Send Button */}
                <div className="pt-3">
                  <button
                    onClick={sendFundRequest}
                    disabled={
                      loading || !fundRequestData.amount || !activeWallet
                    }
                    className="w-full px-3 py-2.5 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending..." : "Send Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rest of the modals remain the same... */}
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

        {/* Remove Friend Confirmation Modal */}
        {showRemoveConfirmation && friendToRemove && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-sm p-4">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => {
                    setShowRemoveConfirmation(false);
                    setFriendToRemove(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors mr-3"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 className="flex-1 text-center text-base font-semibold text-white font-satoshi">
                  Delete Confirmation
                </h3>
                <div className="w-4"></div>
              </div>

              <div className="text-center mb-4">
                <p className="text-gray-300 font-satoshi text-sm mb-1">
                  Are you sure you want to delete
                </p>
                <p className="text-white font-satoshi text-sm">
                  @{friendToRemove.username}?
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRemoveConfirmation(false);
                    setFriendToRemove(null);
                  }}
                  className="flex-1 px-3 py-2 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeFriend(friendToRemove.username)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-satoshi font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
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

          @media (max-width: 640px) {
            input {
              font-size: 16px;
            }
          }
        `}</style>
      </div>
    </>
  );
}
