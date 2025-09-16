// src/components/ChatSidebar.tsx - Small New Chat button at bottom
"use client";

import { useState, useEffect } from "react";
import { X, Plus, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";

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

  useEffect(() => {
    if (isOpen) {
      loadMockSessions();
    }
  }, [isOpen]);

  // Load mock sessions
  const loadMockSessions = async () => {
    setLoading(true);
    try {
      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 300));

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
        } catch (error) {
          console.warn("Error parsing saved sessions, using defaults");
        }
      }

      // If no saved sessions, create some demo ones
      if (mockSessions.length === 0) {
        const now = new Date();
        mockSessions = [
          {
            id: "demo-1",
            title: "Best lending protocols",
            lastMessage: "What are the best lending protocols currently?",
            lastActivity: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
            messageCount: 5,
            createdAt: new Date(now.getTime() - 30 * 60 * 1000),
          },
          {
            id: "demo-2",
            title: "API crypto price data",
            lastMessage: "How to get real-time crypto prices via API?",
            lastActivity: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            messageCount: 8,
            createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          },
          {
            id: "demo-3",
            title: "Required DOC for project",
            lastMessage: "What documentation is required for the project?",
            lastActivity: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
            messageCount: 3,
            createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          },
          {
            id: "demo-4",
            title: "Introducing digital assets",
            lastMessage: "How to introduce digital assets to beginners?",
            lastActivity: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
            messageCount: 12,
            createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
          },
          {
            id: "demo-5",
            title: "Lending and staking protocols",
            lastMessage: "Compare lending vs staking protocols",
            lastActivity: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 8 hours ago
            messageCount: 7,
            createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
          },
          {
            id: "demo-6",
            title: "Cryptography from its highest modal",
            lastMessage: "Explain cryptography fundamentals",
            lastActivity: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
            messageCount: 15,
            createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
          },
          {
            id: "demo-7",
            title: "Unstaking from liquidity pools",
            lastMessage: "How to unstake from liquidity pools safely?",
            lastActivity: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
            messageCount: 9,
            createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        ];

        // Save demo sessions to localStorage
        localStorage.setItem(
          "demo-chat-sessions",
          JSON.stringify(mockSessions)
        );
      }

      setSessions(mockSessions);
    } catch (error) {
      console.error("Error loading mock sessions:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const deleteSession = async (sessionId: string) => {
    try {
      const updatedSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(updatedSessions);

      localStorage.setItem(
        "demo-chat-sessions",
        JSON.stringify(updatedSessions)
      );

      if (sessionId === activeSessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#1a1a1a] border-r border-[#2c2c2c] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-satoshi text-gray-400 uppercase tracking-wide">
              Recents
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#2c2c2c] rounded-lg transition-colors lg:hidden"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Sessions List - With bottom padding for button */}
        <div className="flex-1 overflow-y-auto px-4 pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E2AF19]"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-satoshi">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
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

        {/* Small New Chat Button - Fixed at bottom */}
        <div className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] pt-4">
          <button
            onClick={onNewChat}
            className="w-full bg-[#E2AF19] text-black px-3 py-2 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            New Chat
          </button>
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
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group relative rounded-lg p-3 cursor-pointer transition-all duration-200 ${
        isActive ? "bg-[#2c2c2c]" : "hover:bg-[#2c2c2c]/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-satoshi text-white truncate">
            {session.title}
          </h4>
        </div>

        {/* More options menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#3c3c3c] rounded transition-all"
          >
            <MoreHorizontal size={14} className="text-gray-400" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 bg-[#2c2c2c] border border-[#3c3c3c] rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Star functionality would go here
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#3c3c3c] flex items-center gap-2"
              >
                ⭐ Star
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Rename functionality would go here
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#3c3c3c] flex items-center gap-2"
              >
                ✏️ Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#3c3c3c] flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
}
