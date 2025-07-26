// src/components/AIChatPage.tsx - Concise Version with Fixed Conversation Panel
"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Send,
  Copy,
  RefreshCw,
  Check,
  Brain,
  Menu,
  X,
  Plus,
} from "lucide-react";
import { RootState } from "@/store";
import { SkeletonAIChat } from "@/components/ui/Skeleton";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  processing?: boolean;
  typing?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  createdAt: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations and initialize
  useEffect(() => {
    const loadConversations = () => {
      try {
        const saved = localStorage.getItem("ai-chat-conversations");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Ensure all conversations have proper timestamps
          const fixedConversations = parsed.map((conv) => ({
            ...conv,
            timestamp:
              conv.timestamp || conv.createdAt || new Date().toISOString(),
            createdAt:
              conv.createdAt || conv.timestamp || new Date().toISOString(),
          }));
          setConversations(fixedConversations);
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
      }
    };

    loadConversations();

    const timer = setTimeout(() => {
      setInitialLoading(false);
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            type: "assistant",
            content: `🤖 **Welcome to BlockPal AI!**\n\nI'm your crypto assistant. I can help with analysis, smart contracts, and market insights.\n\nWhat would you like to explore today?`,
            timestamp: new Date(),
          },
        ]);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Save conversation
  useEffect(() => {
    if (messages.length > 0 && sessionId) {
      const now = new Date().toISOString();
      const currentConversation: Conversation = {
        id: sessionId,
        title:
          messages.find((m) => m.type === "user")?.content?.slice(0, 50) +
            "..." || "New Chat",
        messages: messages,
        lastMessage:
          messages[messages.length - 1]?.content?.slice(0, 60) + "...",
        timestamp: now,
        messageCount: messages.length,
        createdAt: now, // Ensure createdAt is always set
      };

      setConversations((prev) => {
        const existing = prev.findIndex((conv) => conv.id === sessionId);
        if (existing >= 0) {
          // Keep original createdAt but update timestamp
          const updated = prev.map((conv, i) =>
            i === existing
              ? { ...currentConversation, createdAt: conv.createdAt || now }
              : conv
          );
          localStorage.setItem(
            "ai-chat-conversations",
            JSON.stringify(updated)
          );
          return updated;
        } else {
          // New conversation
          const updated = [currentConversation, ...prev];
          localStorage.setItem(
            "ai-chat-conversations",
            JSON.stringify(updated)
          );
          return updated;
        }
      });
    }
  }, [messages, sessionId]);

  // Auto scroll and close sidebar on outside click
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!sidebarOpen) return;

      const target = event.target as Element;
      const sidebar = document.querySelector('[data-sidebar="true"]');
      const hamburger = document.getElementById("hamburger-button");

      if (
        sidebar &&
        !sidebar.contains(target) &&
        hamburger &&
        !hamburger.contains(target)
      ) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside, true);
    }
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, [sidebarOpen]);

  const getRelativeTime = (timestamp: string | Date) => {
    try {
      let date: Date;

      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === "string") {
        // Handle both ISO strings and timestamps
        date = new Date(timestamp);
      } else {
        return "Unknown";
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Unknown";
      }

      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      // For older dates, show formatted date
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Unknown";
    }
  };

  const typeMessage = (fullText: string, messageId: string) => {
    return new Promise<void>((resolve) => {
      let currentText = "";
      let currentIndex = 0;

      const typeInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          const charsToAdd = Math.random() > 0.3 ? 8 : 3;
          currentText += fullText.slice(
            currentIndex,
            currentIndex + charsToAdd
          );
          currentIndex += charsToAdd;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: currentText, typing: true }
                : msg
            )
          );
        } else {
          clearInterval(typeInterval);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: fullText,
                    typing: false,
                    processing: false,
                  }
                : msg
            )
          );
          resolve();
        }
      }, 12);
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    if (!sessionId) setSessionId(Date.now().toString());

    // Add processing message
    const processingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: processingId,
        type: "assistant",
        content: "",
        timestamp: new Date(),
        processing: true,
        typing: true,
      },
    ]);

    try {
      // Handle special commands
      if (currentInput.toLowerCase().trim() === "clear") {
        setMessages([]);
        setSessionId("");
        setIsTyping(false);
        setSidebarOpen(false);
        return;
      }

      if (currentInput.toLowerCase().trim() === "help") {
        setMessages((prev) => prev.filter((msg) => !msg.processing));
        const helpId = (Date.now() + 2).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: helpId,
            type: "assistant",
            content: "",
            timestamp: new Date(),
            typing: true,
          },
        ]);

        const helpText = `🔷 **BlockPal AI Features**\n\n**Analysis:**\n• \`analyze wallet 0x...\` - Portfolio analysis\n• \`check transaction 0x...\` - Transaction details\n• \`token info SYMBOL\` - Price & market data\n\n**Tools:**\n• \`gas prices\` - Current network fees\n• \`trending tokens\` - Hot cryptocurrencies\n• \`clear\` - Reset conversation\n\nReady to help with your crypto needs!`;

        await typeMessage(helpText, helpId);
        setIsTyping(false);
        return;
      }

      // Call AI API
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          sessionId: sessionId,
        }),
        credentials: "include",
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      setMessages((prev) => prev.filter((msg) => !msg.processing));
      const aiId = (Date.now() + 2).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: aiId,
          type: "assistant",
          content: "",
          timestamp: new Date(),
          typing: true,
        },
      ]);

      await typeMessage(data.response, aiId);
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => !msg.processing));
      const errorId = (Date.now() + 2).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: errorId,
          type: "assistant",
          content: "",
          timestamp: new Date(),
          typing: true,
        },
      ]);

      await typeMessage(
        `❌ Error: ${error.message}\n\nPlease try again.`,
        errorId
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedItems((prev) => new Set(prev).add(messageId));
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy message");
    }
  };

  const handleSessionSelect = (selectedSessionId: string) => {
    if (selectedSessionId === sessionId) {
      setSidebarOpen(false);
      return;
    }

    const conversation = conversations.find(
      (conv) => conv.id === selectedSessionId
    );
    if (conversation) {
      setSessionId(selectedSessionId);
      setMessages(conversation.messages || []);
      setSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: "welcome-new",
        type: "assistant",
        content: `🤖 **New Chat Started!**\n\nReady to help with crypto analysis. What would you like to explore?`,
        timestamp: new Date(),
      },
    ]);
    setSessionId(Date.now().toString());
    setSidebarOpen(false);
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) => {
      const updated = prev.filter((conv) => conv.id !== conversationId);
      localStorage.setItem("ai-chat-conversations", JSON.stringify(updated));
      return updated;
    });

    if (conversationId === sessionId) handleNewChat();
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, "<br>");
  };

  if (initialLoading) return <SkeletonAIChat />;

  return (
    <div className="h-full relative bg-[#0F0F0F] flex">
      {/* Overlay Background - Same as scheduled payments */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-white/10 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversation Sidebar - Starts from AIChatPage */}
      <div
        data-sidebar="true"
        className={`relative z-40 transform transition-all duration-300 ease-in-out bg-gradient-to-b from-[#1a1a1a] to-[#141414] border border-[#2C2C2C] rounded-xl ${
          sidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#E2AF19]/10 rounded-lg">
                <Brain className="text-[#E2AF19]" size={20} />
              </div>
              <div>
                <span className="text-white font-satoshi font-bold text-lg">
                  Chat History
                </span>
                <p className="text-gray-400 text-xs">Your conversations</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-all"
            >
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-b border-[#2C2C2C]">
            <button
              onClick={handleNewChat}
              className="w-full bg-gradient-to-r from-[#E2AF19] to-[#D4A853] text-black p-3 rounded-xl font-satoshi font-medium hover:scale-[1.02] transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 px-4 pb-4 overflow-y-auto">
            <div className="mb-4">
              <span className="text-gray-300 text-sm font-satoshi font-medium">
                Recent ({conversations.length})
              </span>
            </div>

            <div className="space-y-2">
              {/* Current Session - Always show if active */}
              {messages.length > 0 && sessionId && (
                <div className="p-3 rounded-xl bg-[#E2AF19]/10 border border-[#E2AF19]/20 cursor-pointer">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">
                      Current Chat
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {messages
                      .find((m) => m.type === "user")
                      ?.content?.slice(0, 60) || "New conversation"}
                    ...
                  </p>
                  <div className="flex items-center space-x-2 mt-2 text-gray-500 text-xs">
                    <span>{messages.length} messages</span>
                    <span>•</span>
                    <span>Active now</span>
                  </div>
                </div>
              )}

              {/* Saved Conversations - Exclude current session */}
              {conversations
                .filter((conv) => conv.id !== sessionId)
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-3 rounded-xl cursor-pointer group transition-all bg-[#2C2C2C]/20 hover:bg-[#2C2C2C]/40"
                    onClick={() => handleSessionSelect(conversation.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-300 text-sm font-medium line-clamp-1">
                          {conversation.title || "Untitled Chat"}
                        </span>
                        <p className="text-gray-400 text-xs line-clamp-2 mt-1">
                          {conversation.lastMessage || "No messages"}
                        </p>
                        <div className="flex items-center space-x-2 mt-2 text-gray-500 text-xs">
                          <span>{conversation.messageCount} messages</span>
                          <span>•</span>
                          <span>
                            {getRelativeTime(
                              conversation.timestamp || conversation.createdAt
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      >
                        <X size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}

              {/* Empty State */}
              {conversations.filter((conv) => conv.id !== sessionId).length ===
                0 &&
                messages.length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="text-gray-500 mx-auto mb-3" size={32} />
                    <p className="text-gray-500 text-sm">
                      No conversations yet
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      Start chatting to see history
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#2C2C2C]">
          <div className="flex items-center space-x-3">
            <button
              id="hamburger-button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <Menu size={16} className="text-gray-400" />
            </button>
            <div className="flex items-center space-x-2">
              <Brain className="text-[#E2AF19]" size={20} />
              <h1 className="text-lg font-satoshi font-bold text-white">
                BlockPal AI
              </h1>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <div className="py-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col space-y-2">
                {message.type === "assistant" ? (
                  <div className="flex flex-col items-start space-y-2">
                    <div className="max-w-4xl bg-black p-4 rounded-xl border border-[#2C2C2C]">
                      {message.processing && !message.content ? (
                        <div className="flex items-center space-x-2">
                          <RefreshCw
                            size={16}
                            className="text-[#E2AF19] animate-spin"
                          />
                          <span className="text-[#F9EFD1] text-sm">
                            Processing...
                          </span>
                        </div>
                      ) : (
                        <div className="text-[#F9EFD1] text-sm leading-relaxed">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formatMessage(message.content),
                            }}
                          />
                          {message.typing && (
                            <span className="inline-block w-2 h-4 bg-[#E2AF19] animate-pulse ml-1" />
                          )}
                        </div>
                      )}
                    </div>

                    {!message.processing &&
                      !message.typing &&
                      message.content && (
                        <button
                          onClick={() =>
                            copyMessage(message.content, message.id)
                          }
                          className="bg-[#E2AF19] text-black px-3 py-1 rounded-lg text-xs font-medium hover:bg-[#D4A853] transition-colors flex items-center gap-1.5"
                        >
                          {copiedItems.has(message.id) ? (
                            <>
                              <Check size={12} />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              Copy
                            </>
                          )}
                        </button>
                      )}
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="bg-[#E2AF19] text-black p-4 max-w-2xl rounded-xl">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4 border-t border-[#2C2C2C]">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about crypto analysis, smart contracts, or market trends..."
              className="w-full bg-black text-white placeholder-gray-400 resize-none focus:outline-none pr-12 pl-4 py-3 min-h-[52px] max-h-32 text-sm border border-[#2C2C2C] focus:border-[#E2AF19] transition-colors rounded-2xl"
              rows={1}
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#E2AF19] hover:bg-[#D4A853] disabled:opacity-50 text-black rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              {isTyping ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>

          {isTyping && (
            <div className="flex items-center justify-center mt-2">
              <div className="flex space-x-1 mr-2">
                {[0, 0.1, 0.2].map((delay, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-[#E2AF19] rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
              <span className="text-gray-400 text-xs">AI thinking...</span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .message-content strong {
          font-weight: 700;
          color: #ffffff;
        }
        .message-content em {
          font-style: italic;
          color: #e2af19;
        }
        .message-content .inline-code {
          background: #2c2c2c;
          color: #e2af19;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #0f0f0f;
        }
        ::-webkit-scrollbar-thumb {
          background: #2c2c2c;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #404040;
        }
      `}</style>
    </div>
  );
}
