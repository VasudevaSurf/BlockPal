"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Bell,
  HelpCircle,
  Search,
  UserPlus,
  Check,
  X,
  DollarSign,
  Clock,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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
  status: "pending" | "fulfilled" | "declined" | "expired";
  requestedAt: string;
  expiresAt: string;
}

export default function FriendsPage() {
  const { activeWallet, tokens } = useSelector(
    (state: RootState) => state.wallet
  );

  const [activeTab, setActiveTab] = useState<
    "Friends" | "Requests" | "FundRequests"
  >("Friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fund request modal
  const [showFundRequestModal, setShowFundRequestModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [fundRequestData, setFundRequestData] = useState({
    tokenSymbol: "ETH",
    amount: "",
    message: "",
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

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

  // Load initial data
  useEffect(() => {
    if (activeTab === "Friends") {
      loadFriends();
    } else if (activeTab === "Requests") {
      loadFriendRequests();
    } else if (activeTab === "FundRequests") {
      loadFundRequests();
    }
  }, [activeTab]);

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
      }
    } catch (error) {
      console.error("Error searching users:", error);
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
        // Show success message
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
    setFundRequestData({
      tokenSymbol: tokens.length > 0 ? tokens[0].symbol : "ETH",
      amount: "",
      message: "",
    });
  };

  const sendFundRequest = async () => {
    if (!selectedFriend || !fundRequestData.amount) return;

    try {
      setLoading(true);
      const response = await fetch("/api/friends/fund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUsername: selectedFriend.username,
          tokenSymbol: fundRequestData.tokenSymbol,
          amount: fundRequestData.amount,
          message: fundRequestData.message,
        }),
        credentials: "include",
      });

      if (response.ok) {
        setShowFundRequestModal(false);
        setSelectedFriend(null);
        // Show success message
      } else {
        const data = await response.json();
        setError(data.error || "Failed to send fund request");
      }
    } catch (error) {
      setError("Failed to send fund request");
    } finally {
      setLoading(false);
    }
  };

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
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
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
                    <p className="text-gray-400 font-satoshi text-sm lg:text-base">
                      Search for friends by username above
                    </p>
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
                      className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]"
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
                            className={`px-2 py-1 rounded-full text-xs font-satoshi ${
                              request.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : request.status === "fulfilled"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fund Request Modal */}
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
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token
                </label>
                <div className="relative">
                  <select
                    value={fundRequestData.tokenSymbol}
                    onChange={(e) =>
                      setFundRequestData({
                        ...fundRequestData,
                        tokenSymbol: e.target.value,
                      })
                    }
                    className="w-full bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-white font-satoshi appearance-none pr-10"
                  >
                    <option value="ETH">ETH</option>
                    {tokens.map((token) => (
                      <option key={token.id} value={token.symbol}>
                        {token.symbol}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
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
                  }}
                  className="flex-1 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendFundRequest}
                  disabled={loading || !fundRequestData.amount}
                  className="flex-1 px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Request"}
                </button>
              </div>
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
