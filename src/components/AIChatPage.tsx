// src/components/AIChatPage.tsx - BACKEND REMOVED, UI PRESERVED
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
  MessageCircle,
  AlertTriangle,
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
            content: `🤖 **Welcome to BlockPal AI Demo!**\n\nThis is a demo version of our AI chat interface. The AI functionality is currently disabled, but you can explore the UI and see how conversations would work.\n\n**Demo Features:**\n• Chat interface demonstration\n• Message history and persistence\n• Conversation management\n• Copy functionality\n\nType \`demo\` to see a sample AI response, or \`help\` for available demo commands.`,
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
        createdAt: now,
      };

      setConversations((prev) => {
        const existing = prev.findIndex((conv) => conv.id === sessionId);
        if (existing >= 0) {
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
      const hamburger = document.getElementById("chat-hamburger-button");

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
        date = new Date(timestamp);
      } else {
        return "Unknown";
      }

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

  // MODIFIED: Demo responses instead of API calls
  const getDemoResponse = (input: string): string => {
    const lowerInput = input.toLowerCase().trim();

    if (lowerInput === "demo") {
      return `🔷 **Demo AI Response**\n\nThis is a sample AI response showing how the chat interface would work with real AI functionality.\n\n**Features demonstrated:**\n• Markdown formatting with **bold** and *italic* text\n• Code snippets like \`console.log('Hello')\`\n• Structured responses\n• Real-time typing animation\n\nThe actual AI would provide cryptocurrency analysis, market insights, and blockchain information.`;
    }

    if (lowerInput === "help") {
      return `🔷 **BlockPal AI Demo Commands**\n\n**Available Demo Commands:**\n• \`demo\` - Show sample AI response\n• \`help\` - Show this help message\n• \`clear\` - Clear conversation\n• \`features\` - List planned AI features\n• \`status\` - Show system status\n\n**Note:** This is a demo interface. Real AI functionality is disabled.`;
    }

    if (lowerInput === "features") {
      return `🔷 **Planned AI Features**\n\n**Analysis:**\n• Portfolio analysis and insights\n• Transaction history review\n• Token price predictions\n• Risk assessment\n\n**Tools:**\n• Gas price optimization\n• Smart contract analysis\n• Market trend analysis\n• Trading recommendations\n\n**Currently:** Demo mode only - AI backend disabled`;
    }

    if (lowerInput === "status") {
      return `🔷 **System Status**\n\n**✅ Working:**\n• Chat interface\n• Message persistence\n• Conversation history\n• UI interactions\n\n**❌ Disabled:**\n• AI backend processing\n• Real-time analysis\n• External API calls\n• Blockchain data fetching\n\n**Status:** Demo mode active`;
    }

    // Default response for any other input
    const responses = [
      `🤖 **Demo Response**\n\nI received your message: "${input}"\n\nIn the full version, I would provide detailed crypto analysis and insights. For now, try these demo commands: \`demo\`, \`help\`, \`features\`, or \`status\`.`,
      `🔷 **AI Analysis (Demo)**\n\nYour query about "${input}" would normally trigger:\n• Market data lookup\n• Technical analysis\n• Personalized recommendations\n\nCurrently showing demo responses only.`,
      `⚡ **BlockPal AI (Demo Mode)**\n\nProcessing "${input}"...\n\nIn production, this would connect to:\n• Real-time market data\n• Blockchain analytics\n• Portfolio tracking\n\nDemo mode: Try \`help\` for available commands.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  // MODIFIED: Handle demo responses instead of API calls
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

    // Handle clear command
    if (currentInput.toLowerCase().trim() === "clear") {
      setMessages([]);
      setSessionId("");
      setIsTyping(false);
      setSidebarOpen(false);
      return;
    }

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
      console.log("🤖 Processing demo message:", currentInput);

      // Simulate processing delay
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 + Math.random() * 1000)
      );

      // Get demo response
      const demoResponse = getDemoResponse(currentInput);

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

      await typeMessage(demoResponse, aiId);
      console.log("✅ Demo response completed");
    } catch (error) {
      console.error("❌ Error in demo response:", error);

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
        `❌ **Demo Error**\n\nSomething went wrong with the demo response. This would normally show a proper error message.\n\nTry typing \`help\` for available demo commands.`,
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
        content: `🤖 **New Demo Chat Started!**\n\nThis is a fresh conversation in demo mode. The AI backend is disabled, but you can explore the interface.\n\nTry these demo commands:\n• \`demo\` - Sample AI response\n• \`help\` - Available commands\n• \`features\` - Planned AI features`,
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
      {/* Overlay Background */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-white/10 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo Mode Banner */}
        <div className="flex-shrink-0 bg-yellow-900/20 border-b border-yellow-500/30 px-4 py-2">
          <div className="flex items-center justify-center">
            <AlertTriangle size={16} className="text-yellow-400 mr-2" />
            <span className="text-yellow-400 text-sm font-satoshi">
              Demo Mode: AI functionality disabled - UI demonstration only
            </span>
          </div>
        </div>

        {/* Chat Sub-Header - Only for mobile to show hamburger menu */}
        <div className="lg:hidden flex-shrink-0 p-3 border-b border-[#2C2C2C]/30 bg-gradient-to-r from-[#0F0F0F] to-[#1a1a1a]">
          <div className="flex items-center justify-end">
            <button
              id="chat-hamburger-button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <Menu size={20} className="text-[#E2AF19]" />
            </button>
          </div>
        </div>

        {/* Desktop Chat History Button */}
        <div className="hidden lg:flex items-center justify-end px-4 border-b border-[#2C2C2C]/30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
          >
            <Menu size={20} className="text-[#E2AF19]" />
          </button>
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
                            Processing demo response...
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
              placeholder="Try demo commands: 'demo', 'help', 'features', 'status'..."
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
              <span className="text-gray-400 text-xs">Demo AI thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Sidebar - Now on the right */}
      <div
        data-sidebar="true"
        className={`fixed right-0 top-0 h-full z-40 transform transition-all duration-300 ease-in-out bg-gradient-to-b from-[#1a1a1a] to-[#141414] border-l border-[#2C2C2C] ${
          sidebarOpen
            ? "translate-x-0 w-80 opacity-100"
            : "translate-x-full w-80 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#E2AF19]/10 rounded-lg">
                <MessageCircle className="text-[#E2AF19]" size={20} />
              </div>
              <div>
                <span className="text-white font-satoshi font-bold text-lg">
                  Chat History
                </span>
                <p className="text-gray-400 text-xs">Demo conversations</p>
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
              <span>New Demo Chat</span>
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
              {/* Current Session */}
              {messages.length > 0 && sessionId && (
                <div className="p-3 rounded-xl bg-[#E2AF19]/10 border border-[#E2AF19]/20 cursor-pointer">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">
                      Current Demo Chat
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {messages
                      .find((m) => m.type === "user")
                      ?.content?.slice(0, 60) || "New demo conversation"}
                    ...
                  </p>
                  <div className="flex items-center space-x-2 mt-2 text-gray-500 text-xs">
                    <span>{messages.length} messages</span>
                    <span>•</span>
                    <span>Active now</span>
                  </div>
                </div>
              )}

              {/* Saved Conversations */}
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
                          {conversation.title || "Untitled Demo Chat"}
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
                      No demo conversations yet
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
