// src/components/ChatSidebar.tsx - BACKEND REMOVED, UI PRESERVED
"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  MessageSquare,
  Clock,
  Trash2,
  Search,
  History,
  Archive,
  AlertTriangle,
} from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  lastActivity: Date;
  messageCount: number;
  createdAt: Date;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  currentUser: string;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  activeSessionId,
  onSessionSelect,
  onNewChat,
  currentUser,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadMockSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = sessions.filter(
        (session) =>
          session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSessions(filtered);
    } else {
      setFilteredSessions(sessions);
    }
  }, [searchQuery, sessions]);

  // MODIFIED: Load mock sessions instead of API call
  const loadMockSessions = async () => {
    setLoading(true);
    try {
      console.log("📋 Loading mock chat sessions...");

      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Try to load from localStorage first
      const savedSessions = localStorage.getItem("demo-chat-sessions");
      let mockSessions: ChatSession[] = [];

      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions);
          mockSessions = parsed.map((session: any) => ({
            ...session,
            lastActivity: new Date(session.lastActivity),
            createdAt: new Date(session.createdAt),
          }));
          console.log("✅ Loaded saved demo sessions:", mockSessions.length);
        } catch (error) {
          console.warn("⚠️ Error parsing saved sessions, using defaults");
        }
      }

      // If no saved sessions, create some demo ones
      if (mockSessions.length === 0) {
        const now = new Date();
        mockSessions = [
          {
            id: "demo-1",
            title: "Crypto Portfolio Analysis",
            lastMessage: "Can you analyze my wallet performance?",
            lastActivity: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            messageCount: 8,
            createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          },
          {
            id: "demo-2",
            title: "DeFi Strategy Discussion",
            lastMessage: "What's the best yield farming strategy?",
            lastActivity: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
            messageCount: 12,
            createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
          {
            id: "demo-3",
            title: "Smart Contract Help",
            lastMessage: "Review this contract for security issues",
            lastActivity: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            messageCount: 15,
            createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            id: "demo-4",
            title: "Market Trends Q&A",
            lastMessage: "Explain the recent Bitcoin price movement",
            lastActivity: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
            messageCount: 6,
            createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        ];

        // Save demo sessions to localStorage
        localStorage.setItem(
          "demo-chat-sessions",
          JSON.stringify(mockSessions)
        );
        console.log("✅ Created and saved demo sessions");
      }

      setSessions(mockSessions);
    } catch (error) {
      console.error("❌ Error loading mock sessions:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // MODIFIED: Mock session deletion (local only)
  const deleteSession = async (sessionId: string) => {
    try {
      console.log("🗑️ Deleting demo session:", sessionId);

      // Remove from local state
      const updatedSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(updatedSessions);

      // Update localStorage
      localStorage.setItem(
        "demo-chat-sessions",
        JSON.stringify(updatedSessions)
      );

      // If deleting current session, start new chat
      if (sessionId === activeSessionId) {
        onNewChat();
      }

      console.log("✅ Demo session deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting demo session:", error);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const groupSessionsByTime = (sessions: ChatSession[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      today: sessions.filter((s) => new Date(s.lastActivity) >= today),
      yesterday: sessions.filter(
        (s) =>
          new Date(s.lastActivity) >= yesterday &&
          new Date(s.lastActivity) < today
      ),
      lastWeek: sessions.filter(
        (s) =>
          new Date(s.lastActivity) >= lastWeek &&
          new Date(s.lastActivity) < yesterday
      ),
      older: sessions.filter((s) => new Date(s.lastActivity) < lastWeek),
    };

    return groups;
  };

  if (!isOpen) return null;

  const groupedSessions = groupSessionsByTime(filteredSessions);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-[#1a1a1a] border-r border-[#2c2c2c] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0`}
      >
        {/* Demo Mode Banner */}
        <div className="bg-yellow-900/20 border-b border-yellow-500/30 px-4 py-2">
          <div className="flex items-center">
            <AlertTriangle size={14} className="text-yellow-400 mr-2" />
            <span className="text-yellow-400 text-xs font-satoshi">
              Demo Mode: Local sessions only
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="p-4 border-b border-[#2c2c2c]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-satoshi font-bold text-white">
              Chat History
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#2c2c2c] rounded-lg transition-colors lg:hidden"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 p-3 bg-[#E2AF19] text-black rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi font-medium"
          >
            <Plus size={16} />
            New Demo Chat
          </button>

          {/* Search */}
          <div className="mt-3 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search demo conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f0f0f] text-white placeholder-gray-400 pl-10 pr-4 py-2 rounded-lg border border-[#2c2c2c] focus:border-[#E2AF19] focus:outline-none text-sm font-satoshi"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19]"></div>
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-satoshi">
                {searchQuery
                  ? "No matching demo conversations"
                  : "No demo conversations yet"}
              </p>
              <p className="text-xs mt-1">
                {searchQuery
                  ? "Try different keywords"
                  : "Start a new chat to begin"}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {/* Today */}
              {groupedSessions.today.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-satoshi font-medium text-gray-400 uppercase tracking-wide px-2 mb-2">
                    Today
                  </h3>
                  {groupedSessions.today.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => onSessionSelect(session.id)}
                      onDelete={() => deleteSession(session.id)}
                    />
                  ))}
                </div>
              )}

              {/* Yesterday */}
              {groupedSessions.yesterday.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-satoshi font-medium text-gray-400 uppercase tracking-wide px-2 mb-2">
                    Yesterday
                  </h3>
                  {groupedSessions.yesterday.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => onSessionSelect(session.id)}
                      onDelete={() => deleteSession(session.id)}
                    />
                  ))}
                </div>
              )}

              {/* Last Week */}
              {groupedSessions.lastWeek.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-satoshi font-medium text-gray-400 uppercase tracking-wide px-2 mb-2">
                    Last 7 Days
                  </h3>
                  {groupedSessions.lastWeek.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => onSessionSelect(session.id)}
                      onDelete={() => deleteSession(session.id)}
                    />
                  ))}
                </div>
              )}

              {/* Older */}
              {groupedSessions.older.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-satoshi font-medium text-gray-400 uppercase tracking-wide px-2 mb-2">
                    Older
                  </h3>
                  {groupedSessions.older.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={() => onSessionSelect(session.id)}
                      onDelete={() => deleteSession(session.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2c2c2c]">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-satoshi">
            <History size={12} />
            <span>{sessions.length} demo conversations</span>
          </div>
        </div>
      </div>
    </>
  );
}

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: SessionItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`group relative mb-1 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
        isActive ? "bg-[#E2AF19] text-black" : "hover:bg-[#2c2c2c] text-white"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-satoshi font-medium mb-1 truncate ${
              isActive ? "text-black" : "text-white"
            }`}
          >
            {session.title}
          </h4>
          <p
            className={`text-xs mb-2 truncate ${
              isActive ? "text-black opacity-70" : "text-gray-400"
            }`}
          >
            {session.lastMessage}
          </p>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${
                isActive ? "text-black opacity-60" : "text-gray-500"
              }`}
            >
              {formatTimeAgo(session.lastActivity)}
            </span>
            <span
              className={`text-xs ${
                isActive ? "text-black opacity-60" : "text-gray-500"
              }`}
            >
              {session.messageCount} msgs
            </span>
          </div>
        </div>

        {/* Delete Button */}
        {showActions && !isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="ml-2 p-1 hover:bg-red-500 hover:bg-opacity-20 rounded transition-colors"
          >
            <Trash2 size={12} className="text-red-400 hover:text-red-300" />
          </button>
        )}
      </div>
    </div>
  );

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return new Date(date).toLocaleDateString();
  }
}
