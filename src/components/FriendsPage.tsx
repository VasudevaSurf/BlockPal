"use client";

import { useState } from "react";
import { Bell, HelpCircle, Search } from "lucide-react";

interface Friend {
  id: string;
  username: string;
}

const mockFriends: Friend[] = [
  { id: "1", username: "@theweb3guy" },
  { id: "2", username: "@theweb3guy" },
  { id: "3", username: "@theweb3guy" },
  { id: "4", username: "@theweb3guy" },
  { id: "5", username: "@theweb3guy" },
  { id: "6", username: "@theweb3guy" },
];

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"Friends" | "Requests">("Friends");
  const [friends, setFriends] = useState<Friend[]>(mockFriends);
  const [newFriendInput, setNewFriendInput] = useState("");

  const filteredFriends = friends;

  const handleRequestFunds = (friendId: string) => {
    console.log("Request funds from:", friendId);
  };

  const handleDelete = (friendId: string) => {
    setFriends(friends.filter((friend) => friend.id !== friendId));
  };

  const handleAddFriend = () => {
    if (newFriendInput.trim()) {
      const newFriend: Friend = {
        id: Date.now().toString(),
        username: newFriendInput.startsWith("@")
          ? newFriendInput
          : `@${newFriendInput}`,
      };
      setFriends([...friends, newFriend]);
      setNewFriendInput("");
    }
  };

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Friends
          </h1>
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
              Wallet 1
            </span>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              0xAD7a4hw64...R8J6153
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-black rounded-[16px] lg:rounded-[20px] border border-[#2C2C2C] p-4 lg:p-6 flex-1 flex flex-col min-h-0">
          {/* Tab Navigation with Add Friend Input - Responsive */}
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
                Friends
              </button>
              <button
                onClick={() => setActiveTab("Requests")}
                className={`px-4 lg:px-6 py-2 rounded-lg font-satoshi transition-colors border text-sm lg:text-base ${
                  activeTab === "Requests"
                    ? "bg-[#E2AF19] text-black font-medium border-[#E2AF19]"
                    : "text-gray-400 hover:text-white border-[#2C2C2C]"
                }`}
              >
                Requests
              </button>
            </div>

            {/* Username input with Add Button */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="@username or address"
                value={newFriendInput}
                onChange={(e) => setNewFriendInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddFriend();
                  }
                }}
                className="bg-black border border-[#2C2C2C] rounded-lg py-2 px-3 lg:px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi flex-1 lg:w-80 text-sm lg:text-base"
                style={{ fontSize: "16px" }} // Prevents zoom on iOS
              />
              <button
                onClick={handleAddFriend}
                disabled={!newFriendInput.trim()}
                className="bg-[#E2AF19] text-black px-3 lg:px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-sm lg:text-base whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Friend
              </button>
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTab === "Friends" ? (
              <div className="space-y-0">
                {filteredFriends.map((friend, index) => (
                  <div key={friend.id}>
                    {/* Mobile Card Layout */}
                    <div className="block lg:hidden">
                      <div className="bg-[#0F0F0F] rounded-lg p-4 mb-3 border border-[#2C2C2C]">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white text-sm font-medium">
                              {friend.username[1]?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <span className="text-white font-satoshi flex-1 truncate">
                            {friend.username}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleRequestFunds(friend.id)}
                            className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-sm flex-1"
                          >
                            Request Funds
                          </button>
                          <button
                            onClick={() => handleDelete(friend.id)}
                            className="bg-transparent border border-red-500 text-red-500 px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-red-500 hover:text-white transition-colors text-sm flex-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Row Layout */}
                    <div className="hidden lg:block">
                      <div className="flex items-center justify-between py-3 px-4 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                        {/* Friend Info */}
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white text-sm font-medium">
                              {friend.username[1]?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <span className="text-white font-satoshi">
                            {friend.username}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleRequestFunds(friend.id)}
                            className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors text-sm"
                          >
                            Request Funds
                          </button>
                          <button
                            onClick={() => handleDelete(friend.id)}
                            className="bg-transparent border border-red-500 text-red-500 px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-red-500 hover:text-white transition-colors text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Divider - show for all except last item on desktop */}
                      {index < filteredFriends.length - 1 && (
                        <div className="border-b border-[#2C2C2C] mx-4"></div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {filteredFriends.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center py-8 lg:py-12">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
                      <Search
                        size={20}
                        className="text-gray-400 lg:w-6 lg:h-6"
                      />
                    </div>
                    <h3 className="text-white text-base lg:text-lg font-satoshi mb-2">
                      No friends found
                    </h3>
                    <p className="text-gray-400 font-satoshi text-sm lg:text-base">
                      Add some friends to get started
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Requests Tab Content
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
            )}
          </div>
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
