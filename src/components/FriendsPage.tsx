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
    <div className="h-full bg-[#0F0F0F] rounded-[20px] p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white font-mayeka">Friends</h1>
        </div>

        <div className="flex items-center space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-4 py-3">
            <div className="w-8 h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-3 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "8px 8px",
                }}
              ></div>
            </div>
            <span className="text-white text-sm font-satoshi mr-2">
              Wallet 1
            </span>
            <div className="w-px h-4 bg-[#2C2C2C] mr-3"></div>
            <span className="text-gray-400 text-sm font-satoshi mr-3">
              0xAD7a4hw64...R8J6153
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 py-3">
            <button className="p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={20} className="text-gray-400" />
            </button>
            <div className="w-px h-4 bg-[#2C2C2C] mx-2"></div>
            <button className="p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={20} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-1 flex flex-col min-h-0">
          {/* Tab Navigation with Add Friend Input */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex">
              <button
                onClick={() => setActiveTab("Friends")}
                className={`px-6 py-2 rounded-lg font-satoshi transition-colors mr-2 ${
                  activeTab === "Friends"
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Friends
              </button>
              <button
                onClick={() => setActiveTab("Requests")}
                className={`px-6 py-2 rounded-lg font-satoshi transition-colors border ${
                  activeTab === "Requests"
                    ? "bg-[#E2AF19] text-black font-medium border-[#E2AF19]"
                    : "text-gray-400 hover:text-white border-[#2C2C2C]"
                }`}
              >
                Requests
              </button>
            </div>

            {/* Username input */}
            <div className="flex items-center">
              <input
                type="text"
                placeholder="@username or address"
                value={newFriendInput}
                onChange={(e) => setNewFriendInput(e.target.value)}
                className="bg-black border border-[#2C2C2C] rounded-lg py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi w-80"
              />
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-shrink-0">
            {activeTab === "Friends" ? (
              <div className="space-y-0">
                {filteredFriends.map((friend, index) => (
                  <div key={friend.id}>
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

                    {/* Divider - show for all except last item */}
                    {index < filteredFriends.length - 1 && (
                      <div className="border-b border-[#2C2C2C] mx-4"></div>
                    )}
                  </div>
                ))}

                {/* Empty State */}
                {filteredFriends.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
                      <Search size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-white text-lg font-satoshi mb-2">
                      No friends found
                    </h3>
                    <p className="text-gray-400 font-satoshi">
                      Add some friends to get started
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Requests Tab Content
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
                  <Bell size={24} className="text-gray-400" />
                </div>
                <h3 className="text-white text-lg font-satoshi mb-2">
                  No friend requests
                </h3>
                <p className="text-gray-400 font-satoshi">
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
      `}</style>
    </div>
  );
}
