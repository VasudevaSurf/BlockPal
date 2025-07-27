// src/components/friends/EnhancedFriendsSearch.tsx - COMPACT VERSION
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

  const isWalletAddress = (input: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(input);
  };

  const isCurrentUser = (username: string): boolean => {
    if (!currentUsername) return false;
    return username.toLowerCase() === currentUsername.toLowerCase();
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (isWalletAddress(query)) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (isCurrentUser(query)) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearchLoading(true);

      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`,
        { credentials: "include" }
      );

      let apiUsers: User[] = [];
      if (response.ok) {
        const data = await response.json();
        apiUsers = data.users || [];
      }

      const userRelationships = new Map<string, SearchSuggestion>();

      friends.forEach((friend) => {
        if (
          !isCurrentUser(friend.username) &&
          (friend.username.toLowerCase().includes(query.toLowerCase()) ||
            friend.displayName?.toLowerCase().includes(query.toLowerCase()))
        ) {
          userRelationships.set(friend.username, {
            ...friend,
            relationshipType: "friend",
          });
        }
      });

      friendRequests.forEach((request) => {
        const user = request.requesterData;
        if (
          user &&
          !isCurrentUser(user.username) &&
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

      sentRequests.forEach((request) => {
        const user = request.receiverData;
        if (
          user &&
          !isCurrentUser(user.username) &&
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

      apiUsers.forEach((user) => {
        if (
          !userRelationships.has(user.username) &&
          !isCurrentUser(user.username) &&
          user.username !== currentUsername
        ) {
          userRelationships.set(user.username, {
            ...user,
            relationshipType: "none",
          });
        }
      });

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

      setSuggestions(sortedSuggestions.slice(0, 6));
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Error searching users:", error);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

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
    } else {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleWalletAddressSubmit = async () => {
    if (isWalletAddress(searchQuery)) {
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
          icon: <Check size={12} className="text-green-400" />,
          label: "Friend",
          color: "text-green-400",
          actionDisabled: true,
        };
      case "incoming_request":
        return {
          icon: <Clock size={12} className="text-blue-400" />,
          label: "Sent you request",
          color: "text-blue-400",
          actionDisabled: true,
        };
      case "outgoing_request":
        return {
          icon: <Clock size={12} className="text-orange-400" />,
          label: "Request sent",
          color: "text-orange-400",
          actionDisabled: true,
        };
      case "none":
        return {
          icon: <UserPlus size={12} className="text-[#E2AF19]" />,
          label: "Add Friend",
          color: "text-[#E2AF19]",
          actionDisabled: false,
        };
    }
  };

  const isDropdownOpen =
    showSuggestions ||
    (showSuggestions &&
      suggestions.length === 0 &&
      searchQuery.length >= 2 &&
      !searchLoading &&
      !isWalletAddress(searchQuery) &&
      !isCurrentUser(searchQuery));

  return (
    <>
      {isDropdownOpen && <div className="fixed inset-0 z-10 bg-white/10" />}

      <div className="relative w-full" ref={searchRef}>
        <div className="flex items-center gap-2">
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
              className={`font-satoshi pr-8 ${
                isCurrentUser(searchQuery) ? "border-red-500 text-red-400" : ""
              }`}
              style={{ fontSize: "14px" }}
              onFocus={() => {
                if (suggestions.length > 0 && !isCurrentUser(searchQuery)) {
                  setShowSuggestions(true);
                }
              }}
            />
            <Search
              size={14}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
            />

            {searchLoading && (
              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#E2AF19]"></div>
              </div>
            )}
          </div>

          {searchQuery &&
            isWalletAddress(searchQuery) &&
            !isCurrentUser(searchQuery) && (
              <Button
                onClick={handleWalletAddressSubmit}
                disabled={loading}
                className="whitespace-nowrap text-xs lg:text-sm"
              >
                {loading ? "Adding..." : "Add Friend"}
              </Button>
            )}

          {searchQuery &&
            isWalletAddress(searchQuery) &&
            isCurrentUser(searchQuery) && (
              <div className="text-red-400 text-xs font-satoshi whitespace-nowrap">
                Your wallet
              </div>
            )}
        </div>

        {showSuggestions &&
          suggestions.length > 0 &&
          !isCurrentUser(searchQuery) && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1.5 bg-black border border-[#2C2C2C] rounded-lg shadow-xl max-h-64 overflow-y-auto scrollbar-hide">
              <div className="px-3 py-2 border-b border-[#2C2C2C] bg-[#0F0F0F]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-satoshi">
                    Search Results
                  </span>
                  <span className="text-gray-500 text-xs font-satoshi">
                    {suggestions.length} found
                  </span>
                </div>
              </div>

              <div className="py-1.5">
                {suggestions.map((suggestion, index) => {
                  const relationshipDisplay =
                    getRelationshipDisplay(suggestion);
                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={suggestion._id}
                      className={`flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer ${
                        isSelected ? "bg-[#2C2C2C]" : "hover:bg-[#1A1A1A]"
                      }`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mr-2.5 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {suggestion.displayName?.[0]?.toUpperCase() ||
                              suggestion.username[0]?.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-white font-satoshi text-xs truncate">
                              {suggestion.displayName || suggestion.username}
                            </span>
                            {/* {relationshipDisplay.icon} */}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 font-satoshi text-xs truncate">
                              @{suggestion.username}
                            </span>
                            <span
                              className={`text-xs font-satoshi ${relationshipDisplay.color}`}
                            >
                              {/* {relationshipDisplay.label} */}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 ml-2.5">
                        {!relationshipDisplay.actionDisabled ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionClick(suggestion);
                            }}
                            disabled={loading}
                            className="bg-[#E2AF19] text-black px-2.5 py-1 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-xs flex items-center gap-1 disabled:opacity-50"
                          >
                            <UserPlus size={10} />
                            Add
                          </button>
                        ) : (
                          <div
                            className={`px-2.5 py-1 rounded-lg text-xs font-satoshi ${relationshipDisplay.color} bg-opacity-10 flex items-center gap-1`}
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

              <div className="px-3 py-1.5 border-t border-[#2C2C2C] bg-[#0F0F0F]">
                <div className="flex items-center justify-between text-xs text-gray-500 font-satoshi">
                  <span>Use ↑↓ to navigate, Enter to select</span>
                  <span>ESC to close</span>
                </div>
              </div>
            </div>
          )}

        {showSuggestions &&
          suggestions.length === 0 &&
          searchQuery.length >= 2 &&
          !searchLoading &&
          !isWalletAddress(searchQuery) &&
          !isCurrentUser(searchQuery) && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1.5 bg-black border border-[#2C2C2C] rounded-lg shadow-xl p-3">
              <div className="text-center">
                <div className="text-gray-400 text-xs font-satoshi mb-1.5">
                  No users found for "{searchQuery}"
                </div>
                <div className="text-gray-500 text-xs font-satoshi">
                  Try searching by username or display name
                </div>
              </div>
            </div>
          )}

        {isCurrentUser(searchQuery) && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1.5 bg-red-900/20 border border-red-500/50 rounded-lg shadow-xl p-3">
            <div className="text-center">
              <div className="text-red-400 text-xs font-satoshi mb-1.5">
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
