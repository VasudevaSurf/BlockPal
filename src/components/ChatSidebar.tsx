// src/components/ChatSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  Brain,
  Search,
  X,
} from "lucide-react";

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  lastMessage: string;
  lastActivity: Date;
  messageCount: number;
  isActive?: boolean;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId: string | null;
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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-chat/sessions", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-chat/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const generateTitle = (lastMessage: string) => {
    if (!lastMessage) return "New Conversation";

    // Extract meaningful title from first user message
    const cleaned = lastMessage
      .replace(/^(hi|hello|hey|analyze|check|tell me about)/i, "")
      .trim();

    if (cleaned.length > 30) {
      return cleaned.substring(0, 30) + "...";
    }

    return cleaned || "New Conversation";
  };

  const filteredSessions = sessions.filter(
    (session) =>
      session.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      generateTitle(session.lastMessage)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-[#0F0F0F] border-r border-[#2C2C2C] flex flex-col lg:relative lg:w-80">
        {/* Header */}
        <div className="p-4 border-b border-[#2C2C2C]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Brain className="text-[#E2AF19]" size={20} />
              <h2 className="text-lg font-satoshi font-bold text-white">
                AI Conversations
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#2C2C2C] rounded lg:hidden"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full bg-[#E2AF19] hover:bg-[#D4A853] text-black px-4 py-2 rounded-lg font-satoshi font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Plus size={16} />
            <span>New Conversation</span>
          </button>

          {/* Search */}
          <div className="relative mt-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2C2C2C] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19]"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[#1a1a1a] rounded-lg p-3 animate-pulse"
                >
                  <div className="h-4 bg-[#2C2C2C] rounded mb-2" />
                  <div className="h-3 bg-[#2C2C2C] rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              {searchTerm ? "No conversations found" : "No conversations yet"}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSessionSelect(session.id);
                    onClose();
                  }}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                    activeSessionId === session.id
                      ? "bg-[#E2AF19]/10 border border-[#E2AF19]/30"
                      : "bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <MessageSquare
                          size={14}
                          className="text-[#E2AF19] flex-shrink-0"
                        />
                        <h3 className="text-sm font-satoshi font-medium text-white truncate">
                          {generateTitle(session.lastMessage)}
                        </h3>
                      </div>

                      <p className="text-xs text-gray-400 truncate mb-2">
                        {session.lastMessage || "No messages yet"}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock size={10} />
                          <span>
                            {formatRelativeTime(session.lastActivity)}
                          </span>
                        </div>
                        <span>{session.messageCount} messages</span>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2C2C2C]">
          <div className="text-xs text-gray-500 text-center">
            {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
