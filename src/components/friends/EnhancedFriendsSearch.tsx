// src/components/friends/EnhancedFriendsSearch.tsx - FIXED: Better self-user filtering
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, UserPlus, Clock, Check } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  gmail?: string;
  walletAddress?: string;
}

interface Friend extends User {
  status?: "accepted";
}

interface FriendRequest {
  _id: string;
  requesterUsername: string;
  receiverUsername: string;
  status: "pending";
  requestedAt: string;
  requesterData?: User;
  receiverData?: User;
}

interface SentRequest {
  _id: string;
  requesterUsername: string;
  receiverUsername: string;
  status: "pending";
  requestedAt: string;
  receiverData?: User;
}

interface SearchSuggestion extends User {
  relationshipType: "none" | "friend" | "incoming_request" | "outgoing_request";
  relationshipData?: any;
}

interface EnhancedFriendsSearchProps {
  friends: Friend[];
  friendRequests: FriendRequest[];
  sentRequests: SentRequest[];
  onSendFriendRequest: (username: string) => Promise<void>;
  loading: boolean;
  currentUsername?: string;
}

export default function EnhancedFriendsSearch({
  friends,
  friendRequests,
  sentRequests,
  onSendFriendRequest,
  loading,
  currentUsername,
}: EnhancedFriendsSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Check if input looks like a wallet address
  const isWalletAddress = (input: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(input);
  };

  // FIXED: Enhanced validation to prevent self-requests
  const isCurrentUser = (username: string): boolean => {
    if (!currentUsername) return false;
    return username.toLowerCase() === currentUsername.toLowerCase();
  };

  // Enhanced search that includes existing relationships
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Don't search if it's a wallet address
    if (isWalletAddress(query)) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // FIXED: Don't search if query matches current user
    if (isCurrentUser(query)) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearchLoading(true);

      // Search for users from API
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`,
        { credentials: "include" }
      );

      let apiUsers: User[] = [];
      if (response.ok) {
        const data = await response.json();
        apiUsers = data.users || [];
      }

      // Create a map of all known users and their relationships
      const userRelationships = new Map<string, SearchSuggestion>();

      // Add existing friends
      friends.forEach((friend) => {
        if (
          !isCurrentUser(friend.username) && // FIXED: Exclude current user
          (friend.username.toLowerCase().includes(query.toLowerCase()) ||
            friend.displayName?.toLowerCase().includes(query.toLowerCase()))
        ) {
          userRelationships.set(friend.username, {
            ...friend,
            relationshipType: "friend",
          });
        }
      });

      // Add incoming friend requests
      friendRequests.forEach((request) => {
        const user = request.requesterData;
        if (
          user &&
          !isCurrentUser(user.username) && // FIXED: Exclude current user
          (user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.displayName?.toLowerCase().includes(query.toLowerCase()))
        ) {
          userRelationships.set(user.username, {
            ...user,
            relationshipType: "incoming_request",
            relationshipData: request,
          });
        }
      });

      // Add outgoing friend requests (sent by current user)
      sentRequests.forEach((request) => {
        const user = request.receiverData;
        if (
          user &&
          !isCurrentUser(user.username) && // FIXED: Exclude current user
          (user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.displayName?.toLowerCase().includes(query.toLowerCase()))
        ) {
          userRelationships.set(user.username, {
            ...user,
            relationshipType: "outgoing_request",
            relationshipData: request,
          });
        }
      });

      // Add API results (new users) - ENHANCED: Multiple checks for current user
      apiUsers.forEach((user) => {
        if (
          !userRelationships.has(user.username) &&
          !isCurrentUser(user.username) && // FIXED: Exclude current user
          user.username !== currentUsername // FIXED: Double check
        ) {
          userRelationships.set(user.username, {
            ...user,
            relationshipType: "none",
          });
        }
      });

      // Convert to array and sort by relationship type priority
      const sortedSuggestions = Array.from(userRelationships.values()).sort(
        (a, b) => {
          const priority = {
            friend: 1,
            incoming_request: 2,
            outgoing_request: 3,
            none: 4,
          };
          return priority[a.relationshipType] - priority[b.relationshipType];
        }
      );

      setSuggestions(sortedSuggestions.slice(0, 8)); // Limit to 8 results
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Error searching users:", error);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.trim()) {
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
  }, [searchQuery, friends, friendRequests, sentRequests, currentUsername]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleSuggestionClick(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    if (showSuggestions) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showSuggestions, suggestions, selectedIndex]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = async (suggestion: SearchSuggestion) => {
    // FIXED: Final check before sending request
    if (isCurrentUser(suggestion.username)) {
      console.warn(
        "Attempted to send friend request to self:",
        suggestion.username
      );
      return;
    }

    if (suggestion.relationshipType === "none") {
      try {
        await onSendFriendRequest(suggestion.username);
        setSearchQuery("");
        setShowSuggestions(false);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error sending friend request:", error);
      }
    }
    // For other relationship types, just close the suggestions
    else {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // FIXED: Enhanced wallet address validation
  const handleWalletAddressSubmit = async () => {
    if (isWalletAddress(searchQuery)) {
      // FIXED: Check if wallet address belongs to current user
      if (searchQuery.toLowerCase() === currentUsername?.toLowerCase()) {
        console.warn("Attempted to send friend request to own wallet address");
        return;
      }

      try {
        await onSendFriendRequest(searchQuery);
        setSearchQuery("");
      } catch (error) {
        console.error("Error sending friend request to wallet address:", error);
      }
    }
  };

  const getRelationshipDisplay = (suggestion: SearchSuggestion) => {
    switch (suggestion.relationshipType) {
      case "friend":
        return {
          icon: <Check size={14} className="text-green-400" />,
          label: "Friend",
          color: "text-green-400",
          actionDisabled: true,
        };
      case "incoming_request":
        return {
          icon: <Clock size={14} className="text-blue-400" />,
          label: "Sent you request",
          color: "text-blue-400",
          actionDisabled: true,
        };
      case "outgoing_request":
        return {
          icon: <Clock size={14} className="text-orange-400" />,
          label: "Request sent",
          color: "text-orange-400",
          actionDisabled: true,
        };
      case "none":
        return {
          icon: <UserPlus size={14} className="text-[#E2AF19]" />,
          label: "Add Friend",
          color: "text-[#E2AF19]",
          actionDisabled: false,
        };
    }
  };

  // Determine if dropdown is open (suggestions or no results message)
  const isDropdownOpen =
    showSuggestions ||
    (showSuggestions &&
      suggestions.length === 0 &&
      searchQuery.length >= 2 &&
      !searchLoading &&
      !isWalletAddress(searchQuery) &&
      !isCurrentUser(searchQuery)); // FIXED: Don't show "no results" for current user

  return (
    <>
      {/* ADDED: Backdrop for dropdown */}
      {isDropdownOpen && <div className="fixed inset-0 z-10 bg-white/10" />}

      <div className="relative w-full" ref={searchRef}>
        <div className="flex items-center gap-3">
          {/* Enhanced Search Input */}
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder={
                isWalletAddress(searchQuery)
                  ? "Wallet address detected"
                  : isCurrentUser(searchQuery)
                  ? "Cannot add yourself as friend"
                  : "Search by @username or display name"
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className={`font-satoshi pr-10 ${
                isCurrentUser(searchQuery) ? "border-red-500 text-red-400" : ""
              }`}
              style={{ fontSize: "16px" }}
              onFocus={() => {
                if (suggestions.length > 0 && !isCurrentUser(searchQuery)) {
                  setShowSuggestions(true);
                }
              }}
            />
            <Search
              size={16}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />

            {/* Loading indicator */}
            {searchLoading && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#E2AF19]"></div>
              </div>
            )}
          </div>

          {/* Wallet Address Add Button - FIXED: Disable for current user */}
          {searchQuery &&
            isWalletAddress(searchQuery) &&
            !isCurrentUser(searchQuery) && (
              <Button
                onClick={handleWalletAddressSubmit}
                disabled={loading}
                className="whitespace-nowrap text-sm lg:text-base"
              >
                {loading ? "Adding..." : "Add Friend"}
              </Button>
            )}

          {/* FIXED: Show warning for current user wallet */}
          {searchQuery &&
            isWalletAddress(searchQuery) &&
            isCurrentUser(searchQuery) && (
              <div className="text-red-400 text-sm font-satoshi whitespace-nowrap">
                Your wallet
              </div>
            )}
        </div>

        {/* Enhanced Suggestions Dropdown - FIXED: Don't show for current user */}
        {showSuggestions &&
          suggestions.length > 0 &&
          !isCurrentUser(searchQuery) && (
            <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-black border border-[#2C2C2C] rounded-lg shadow-xl max-h-80 overflow-y-auto scrollbar-hide">
              {/* Search Results Header */}
              <div className="px-4 py-3 border-b border-[#2C2C2C] bg-[#0F0F0F]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm font-satoshi">
                    Search Results
                  </span>
                  <span className="text-gray-500 text-xs font-satoshi">
                    {suggestions.length} found
                  </span>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="py-2">
                {suggestions.map((suggestion, index) => {
                  const relationshipDisplay =
                    getRelationshipDisplay(suggestion);
                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={suggestion._id}
                      className={`flex items-center justify-between px-4 py-3 transition-colors cursor-pointer ${
                        isSelected ? "bg-[#2C2C2C]" : "hover:bg-[#1A1A1A]"
                      }`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {/* User Info */}
                      <div className="flex items-center flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mr-3 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-medium">
                            {suggestion.displayName?.[0]?.toUpperCase() ||
                              suggestion.username[0]?.toUpperCase()}
                          </span>
                        </div>

                        {/* User Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-satoshi text-sm truncate">
                              {suggestion.displayName || suggestion.username}
                            </span>
                            {relationshipDisplay.icon}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-satoshi text-xs truncate">
                              @{suggestion.username}
                            </span>
                            <span
                              className={`text-xs font-satoshi ${relationshipDisplay.color}`}
                            >
                              {relationshipDisplay.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex-shrink-0 ml-3">
                        {!relationshipDisplay.actionDisabled ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionClick(suggestion);
                            }}
                            disabled={loading}
                            className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-xs flex items-center gap-1 disabled:opacity-50"
                          >
                            <UserPlus size={12} />
                            Add
                          </button>
                        ) : (
                          <div
                            className={`px-3 py-1.5 rounded-lg text-xs font-satoshi ${relationshipDisplay.color} bg-opacity-10 flex items-center gap-1`}
                            style={{
                              backgroundColor:
                                relationshipDisplay.color.includes("green")
                                  ? "rgba(34, 197, 94, 0.1)"
                                  : relationshipDisplay.color.includes("blue")
                                  ? "rgba(59, 130, 246, 0.1)"
                                  : "rgba(251, 146, 60, 0.1)",
                            }}
                          >
                            {relationshipDisplay.icon}
                            {relationshipDisplay.label}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer with shortcut hints */}
              <div className="px-4 py-2 border-t border-[#2C2C2C] bg-[#0F0F0F]">
                <div className="flex items-center justify-between text-xs text-gray-500 font-satoshi">
                  <span>Use ↑↓ to navigate, Enter to select</span>
                  <span>ESC to close</span>
                </div>
              </div>
            </div>
          )}

        {/* No Results Message - FIXED: Don't show for current user */}
        {showSuggestions &&
          suggestions.length === 0 &&
          searchQuery.length >= 2 &&
          !searchLoading &&
          !isWalletAddress(searchQuery) &&
          !isCurrentUser(searchQuery) && (
            <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-black border border-[#2C2C2C] rounded-lg shadow-xl p-4">
              <div className="text-center">
                <div className="text-gray-400 text-sm font-satoshi mb-2">
                  No users found for "{searchQuery}"
                </div>
                <div className="text-gray-500 text-xs font-satoshi">
                  Try searching by username or display name
                </div>
              </div>
            </div>
          )}

        {/* FIXED: Self-user warning message */}
        {isCurrentUser(searchQuery) && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-red-900/20 border border-red-500/50 rounded-lg shadow-xl p-4">
            <div className="text-center">
              <div className="text-red-400 text-sm font-satoshi mb-2">
                You cannot add yourself as a friend
              </div>
              <div className="text-red-400 text-xs font-satoshi">
                Try searching for other users instead
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
        `}</style>
      </div>
    </>
  );
}
