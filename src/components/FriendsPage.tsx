// src/components/FriendsPage.tsx - BACKEND REMOVED, UI PRESERVED
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

// Demo tokens for UI demonstration
const DEMO_TOKENS = [
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    contractAddress: "native",
    decimals: 18,
    icon: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    balance: "0.00",
    balanceFormatted: "0.00",
    hasBalance: false,
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    icon: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
    balance: "0.00",
    balanceFormatted: "0.00",
    hasBalance: false,
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether USD",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    icon: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    balance: "0.00",
    balanceFormatted: "0.00",
    hasBalance: false,
  },
];

// Helper function to parse user-friendly error messages
const parseErrorMessage = (error: string): string => {
  if (error.includes("demo") || error.includes("disabled")) {
    return "Demo mode: This feature is not available in the demonstration version.";
  }
  return "This feature is disabled in demo mode.";
};

export default function FriendsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUsername = user?.username;

  const [activeTab, setActiveTab] = useState<
    "Friends" | "Requests" | "FundRequests"
  >("Friends");

  // MODIFIED: Use mock data instead of real data
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

  // MODIFIED: Get demo tokens instead of real tokens
  const getAvailableTokensWithBalances = () => {
    return DEMO_TOKENS;
  };

  // Copy to clipboard helper
  const copyToClipboard = (value: string, key: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  // Enhanced token utilities
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

  // Enhanced token rendering for fund request modal
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

  // MODIFIED: Load mock data instead of API calls
  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      console.log("👥 Loading demo friends data...");

      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Load demo data based on active tab
      if (activeTab === "Friends") {
        await loadMockFriends();
        await loadMockSentRequests();
      } else if (activeTab === "Requests") {
        await loadMockFriendRequests();
      } else if (activeTab === "FundRequests") {
        await loadMockFundRequests();
      }

      console.log("✅ Demo friends data loaded");
    } catch (error) {
      console.error("Error loading demo data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  // MODIFIED: Mock unread count
  const fetchMockUnreadCount = async () => {
    try {
      // Demo unread count
      setUnreadCount(0);
    } catch (error) {
      console.error("Error fetching demo unread count:", error);
    }
  };

  // Load initial data
  useEffect(() => {
    loadInitialData();
    fetchMockUnreadCount();

    const interval = setInterval(fetchMockUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (!initialLoading) {
      if (activeTab === "Friends") {
        loadMockFriends();
        loadMockSentRequests();
      } else if (activeTab === "Requests") {
        loadMockFriendRequests();
      } else if (activeTab === "FundRequests") {
        loadMockFundRequests();
      }
    }
  }, [activeTab, initialLoading]);

  // MODIFIED: Load mock friends
  const loadMockFriends = async () => {
    try {
      setLoading(true);
      console.log("👥 Loading mock friends...");

      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Load from localStorage or create demo data
      const savedFriends = localStorage.getItem("demo-friends");
      let mockFriends: Friend[] = [];

      if (savedFriends) {
        try {
          mockFriends = JSON.parse(savedFriends);
        } catch (error) {
          console.warn("Error parsing saved friends, using defaults");
        }
      }

      // If no saved friends, create some demo ones
      if (mockFriends.length === 0) {
        mockFriends = [
          {
            _id: "demo-friend-1",
            username: "alice_crypto",
            displayName: "Alice Johnson",
            gmail: "alice@example.com",
            walletAddress: "0x742d35Cc6bfE32c4E130c2C982e5b46C123456789",
          },
          {
            _id: "demo-friend-2",
            username: "bob_trader",
            displayName: "Bob Smith",
            gmail: "bob@example.com",
            walletAddress: "0x8ba1f109551bD432803012645Hac189451023456",
          },
          {
            _id: "demo-friend-3",
            username: "charlie_defi",
            displayName: "Charlie Brown",
            gmail: "charlie@example.com",
            walletAddress: "0x123456789abcdef123456789abcdef1234567890",
          },
        ];

        localStorage.setItem("demo-friends", JSON.stringify(mockFriends));
      }

      setFriends(mockFriends);
      console.log("✅ Mock friends loaded:", mockFriends.length);
    } catch (error) {
      console.error("Error loading mock friends:", error);
      setError("Failed to load demo friends");
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Load mock friend requests
  const loadMockFriendRequests = async () => {
    try {
      setLoading(true);
      console.log("📨 Loading mock friend requests...");

      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockRequests: FriendRequest[] = [
        {
          _id: "demo-request-1",
          requesterUsername: "eve_hodler",
          receiverUsername: currentUsername || "demo_user",
          status: "pending",
          requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          requesterData: {
            _id: "demo-user-4",
            username: "eve_hodler",
            displayName: "Eve Wilson",
            gmail: "eve@example.com",
          },
        },
        {
          _id: "demo-request-2",
          requesterUsername: "frank_nft",
          receiverUsername: currentUsername || "demo_user",
          status: "pending",
          requestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          requesterData: {
            _id: "demo-user-5",
            username: "frank_nft",
            displayName: "Frank Davis",
            gmail: "frank@example.com",
          },
        },
      ];

      setFriendRequests(mockRequests);
      console.log("✅ Mock friend requests loaded:", mockRequests.length);
    } catch (error) {
      console.error("Error loading mock friend requests:", error);
      setError("Failed to load demo friend requests");
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Load mock sent requests
  const loadMockSentRequests = async () => {
    try {
      setLoading(true);
      console.log("📤 Loading mock sent requests...");

      await new Promise((resolve) => setTimeout(resolve, 300));

      const mockSentRequests: SentRequest[] = [
        {
          _id: "demo-sent-1",
          requesterUsername: currentUsername || "demo_user",
          receiverUsername: "grace_validator",
          status: "pending",
          requestedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          receiverData: {
            _id: "demo-user-6",
            username: "grace_validator",
            displayName: "Grace Lee",
            gmail: "grace@example.com",
          },
        },
      ];

      setSentRequests(mockSentRequests);
      console.log("✅ Mock sent requests loaded:", mockSentRequests.length);
    } catch (error) {
      console.error("Error loading mock sent requests:", error);
      setError("Failed to load demo sent requests");
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Load mock fund requests
  const loadMockFundRequests = async () => {
    try {
      setLoading(true);
      console.log("💰 Loading mock fund requests...");

      await new Promise((resolve) => setTimeout(resolve, 500));

      const now = new Date();
      const mockFundRequests: FundRequest[] = [
        {
          _id: "demo-fund-1",
          requestId: "req_demo_1",
          requesterUsername: "alice_crypto",
          recipientUsername: currentUsername || "demo_user",
          tokenSymbol: "ETH",
          amount: "0.5",
          message: "For gas fees to deploy my NFT collection",
          status: "pending",
          requestedAt: new Date(
            now.getTime() - 2 * 60 * 60 * 1000
          ).toISOString(),
          expiresAt: new Date(
            now.getTime() + 22 * 60 * 60 * 1000
          ).toISOString(),
        },
        {
          _id: "demo-fund-2",
          requestId: "req_demo_2",
          requesterUsername: "bob_trader",
          recipientUsername: currentUsername || "demo_user",
          tokenSymbol: "USDC",
          amount: "100",
          message: "Lunch money for blockchain conference",
          status: "fulfilled",
          requestedAt: new Date(
            now.getTime() - 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          expiresAt: new Date(
            now.getTime() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          respondedAt: new Date(
            now.getTime() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          transactionHash:
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          fulfilledBy: currentUsername || "demo_user",
        },
        {
          _id: "demo-fund-3",
          requestId: "req_demo_3",
          requesterUsername: "charlie_defi",
          recipientUsername: currentUsername || "demo_user",
          tokenSymbol: "USDT",
          amount: "50",
          message: "Help with staking pool entry",
          status: "expired",
          requestedAt: new Date(
            now.getTime() - 10 * 24 * 60 * 60 * 1000
          ).toISOString(),
          expiresAt: new Date(
            now.getTime() - 8 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ];

      setFundRequests(mockFundRequests);
      console.log("✅ Mock fund requests loaded:", mockFundRequests.length);
    } catch (error) {
      console.error("Error loading mock fund requests:", error);
      setError("Failed to load demo fund requests");
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Mock friend request sending
  const sendFriendRequest = async (username: string) => {
    try {
      if (username === currentUsername) {
        setError("You cannot send a friend request to yourself.");
        return;
      }

      setLoading(true);
      setError("");
      setSuccessMessage("");

      console.log("📤 Demo: Sending friend request to", username);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show demo success message
      setSuccessMessage(
        `Demo: Friend request sent to @${username}! (Not actually sent)`
      );
      setTimeout(() => setSuccessMessage(""), 3000);

      console.log("✅ Demo friend request 'sent'");
    } catch (error) {
      setError("Demo mode: Friend request feature disabled");
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Mock friend request handling
  const handleFriendRequest = async (
    username: string,
    action: "accept" | "decline"
  ) => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      console.log(`📝 Demo: ${action}ing friend request from`, username);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Remove from friend requests locally
      setFriendRequests((prev) =>
        prev.filter((req) => req.requesterUsername !== username)
      );

      if (action === "accept") {
        // Add to friends locally
        const newFriend: Friend = {
          _id: `demo-friend-${Date.now()}`,
          username: username,
          displayName: username
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          gmail: `${username}@example.com`,
        };

        setFriends((prev) => {
          const updated = [...prev, newFriend];
          localStorage.setItem("demo-friends", JSON.stringify(updated));
          return updated;
        });

        setSuccessMessage(
          `Demo: You are now friends with @${username}! (Local only)`
        );
      } else {
        setSuccessMessage(
          `Demo: Friend request from @${username} declined. (Local only)`
        );
      }

      setTimeout(() => setSuccessMessage(""), 3000);
      console.log(`✅ Demo friend request ${action}ed`);
    } catch (error) {
      console.error(`Error handling demo friend request:`, error);
      setError(`Demo mode: Failed to ${action} friend request`);
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Mock friend removal
  const removeFriend = async (username: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      console.log("🗑️ Demo: Removing friend", username);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Remove from friends locally
      const updatedFriends = friends.filter(
        (friend) => friend.username !== username
      );
      setFriends(updatedFriends);
      localStorage.setItem("demo-friends", JSON.stringify(updatedFriends));

      setShowRemoveConfirmation(false);
      setFriendToRemove(null);

      setSuccessMessage(
        `Demo: @${username} has been removed from your friends. (Local only)`
      );
      setTimeout(() => setSuccessMessage(""), 3000);

      console.log("✅ Demo friend removed");
    } catch (error) {
      console.error("Error removing demo friend:", error);
      setError("Demo mode: Failed to remove friend");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = (friend: Friend) => {
    setFriendToRemove(friend);
    setShowRemoveConfirmation(true);
  };

  // MODIFIED: Mock fund request opening
  const openFundRequestModal = (friend: Friend) => {
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

  // MODIFIED: Mock fund request sending
  const sendFundRequest = async () => {
    if (!selectedFriend || !fundRequestData.amount || !currentUsername) {
      setError("Missing required information for demo request");
      return;
    }

    if (selectedFriend.username === currentUsername) {
      setError("You cannot request funds from yourself.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      console.log("💰 Demo: Sending fund request", {
        to: selectedFriend.username,
        amount: fundRequestData.amount,
        token: fundRequestData.tokenSymbol,
      });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setShowFundRequestModal(false);
      setSelectedFriend(null);
      setFundRequestData({
        tokenSymbol: "ETH",
        amount: "",
        message: "",
      });

      setSuccessMessage(
        `Demo: Fund request for ${fundRequestData.amount} ${fundRequestData.tokenSymbol} sent to @${selectedFriend.username}! (Not actually sent)`
      );
      setTimeout(() => setSuccessMessage(""), 4000);

      console.log("✅ Demo fund request 'sent'");
    } catch (error: any) {
      setError("Demo mode: Fund request feature disabled");
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
        // Show demo message instead of opening real explorer
        setSuccessMessage(
          "Demo: This would open the transaction in a blockchain explorer"
        );
        setTimeout(() => setSuccessMessage(""), 3000);
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
                  Demo Friends
                </button>
                <button
                  onClick={() => setActiveTab("Requests")}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg font-satoshi transition-colors border mr-2 text-sm ${
                    activeTab === "Requests"
                      ? "bg-[#E2AF19] text-black font-medium border-[#E2AF19]"
                      : "text-gray-400 hover:text-white border-[#2C2C2C]"
                  }`}
                >
                  Demo Requests
                </button>
                <button
                  onClick={() => setActiveTab("FundRequests")}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg font-satoshi transition-colors border text-sm ${
                    activeTab === "FundRequests"
                      ? "bg-[#E2AF19] text-black font-medium border-[#E2AF19]"
                      : "text-gray-400 hover:text-white border-[#2C2C2C]"
                  }`}
                >
                  Demo Fund Requests
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
                        Loading demo friends...
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
                        Demo friends will appear here
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
                                Demo Request
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
                                Demo Request
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
                        Loading demo requests...
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
                        No demo friend requests
                      </h3>
                      <p className="text-gray-400 font-satoshi text-sm">
                        Demo friend requests will appear here
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
                        Loading demo fund requests...
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
                        No demo fund requests
                      </h3>
                      <p className="text-gray-400 font-satoshi text-sm">
                        Demo fund requests will appear here
                      </p>
                    </div>
                  ) : (
                    fundRequests.map((request, index) => {
                      const statusInfo = getFundRequestStatusInfo(request);
                      return (
                        <div key={request._id}>
                          {/* Mobile and Desktop layouts remain the same but with demo data */}
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
                                    Tap for demo response
                                  </div>
                                ) : request.status === "fulfilled" &&
                                  request.transactionHash ? (
                                  <div className="text-green-400 text-xs font-satoshi flex items-center">
                                    <ExternalLink size={10} className="mr-1" />
                                    Demo Transaction
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
                                        Demo Tx:{" "}
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
                                        Demo transaction hash copied!
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
                                    Click for demo
                                  </div>
                                ) : request.status === "fulfilled" &&
                                  request.transactionHash ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSuccessMessage(
                                        "Demo: Would open blockchain explorer"
                                      );
                                      setTimeout(
                                        () => setSuccessMessage(""),
                                        3000
                                      );
                                    }}
                                    className="text-green-400 text-sm font-satoshi hover:opacity-80 transition-opacity flex items-center"
                                  >
                                    <ExternalLink size={12} className="mr-1" />
                                    Demo Explorer
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

        {/* Fund Request Modal - Demo Version */}
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
                  Demo Fund Request
                </h3>
                {/* Invisible spacer to center the title */}
                <div className="w-4"></div>
              </div>

              <div className="mb-3">
                {/* Demo Warning */}
                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-2 mb-3">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={14}
                      className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-yellow-400 text-sm font-satoshi font-medium">
                        Demo Mode Active
                      </p>
                      <p className="text-yellow-400 text-xs font-satoshi">
                        This request will not actually be sent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Token Dropdown with demo tokens */}
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
                  placeholder="Message (optional) - What's this demo request for?"
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
                    disabled={loading || !fundRequestData.amount}
                    className="w-full px-3 py-2.5 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending Demo..." : "Send Demo Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Demo Fund Request Modal */}
        {selectedFundRequest && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md p-4">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setSelectedFundRequest(null)}
                  className="text-gray-400 hover:text-white transition-colors mr-3"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 className="flex-1 text-center text-base font-semibold text-white font-satoshi">
                  Demo Fund Request
                </h3>
                <div className="w-4"></div>
              </div>

              <div className="text-center mb-4">
                <p className="text-gray-300 font-satoshi text-sm mb-1">
                  Demo request from @{selectedFundRequest.requesterUsername}
                </p>
                <p className="text-[#E2AF19] font-bold text-lg">
                  {selectedFundRequest.amount} {selectedFundRequest.tokenSymbol}
                </p>
                {selectedFundRequest.message && (
                  <p className="text-gray-400 text-sm mt-2 italic">
                    "{selectedFundRequest.message}"
                  </p>
                )}
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
                <p className="text-yellow-400 text-sm font-satoshi">
                  <strong>Demo Mode:</strong> Fund request actions are disabled
                  in the demonstration version.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSuccessMessage("Demo: Fund request would be declined");
                    setTimeout(() => setSuccessMessage(""), 3000);
                    setSelectedFundRequest(null);
                  }}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-satoshi font-medium hover:bg-red-700 transition-colors"
                >
                  Demo Decline
                </button>
                <button
                  onClick={() => {
                    setSuccessMessage("Demo: Fund request would be fulfilled");
                    setTimeout(() => setSuccessMessage(""), 3000);
                    setSelectedFundRequest(null);
                  }}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-satoshi font-medium hover:bg-green-700 transition-colors"
                >
                  Demo Fulfill
                </button>
              </div>
            </div>
          </div>
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
