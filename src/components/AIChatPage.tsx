// src/components/AIChatPage.tsx - Real AI functionality
"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Send,
  Copy,
  RefreshCw,
  Check,
  Brain,
  Plus,
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
  functionCalls?: string[];
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
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
  const [userId, setUserId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Suggestion chips data
  const suggestionChips = [
    "Analyze BTC",
    "Check ETH security",
    "Compare Bitcoin vs Ethereum",
    "Analyze my wallet",
    "What's trending in DeFi?",
    "Chart analysis for LINK",
    "Token security for SHIB",
    "Portfolio insights",
    "Market sentiment today",
    "Best altcoins 2025",
    "Crypto news summary",
    "Gas fees prediction",
  ];

  // Initialize AI chat system
  useEffect(() => {
    const initializeAI = async () => {
      try {
        // Create or get user
        const response = await fetch("/api/ai/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to create user");

        const userData = await response.json();
        setUserId(userData.userId);

        // Create new conversation
        const convResponse = await fetch("/api/ai/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userData.userId }),
        });

        if (!convResponse.ok) throw new Error("Failed to create conversation");

        const convData = await convResponse.json();
        setConversationId(convData.conversationId);

        setIsInitialized(true);
        console.log("✅ AI chat initialized:", {
          userId: userData.userId,
          conversationId: convData.conversationId,
        });
      } catch (error: any) {
        console.error("❌ Failed to initialize AI chat:", error);
        setError("Failed to initialize AI chat. Some features may not work.");
        setIsInitialized(true); // Still allow basic usage
      } finally {
        setInitialLoading(false);
      }
    };

    initializeAI();
  }, []);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`/api/ai/user?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.conversations) {
            const formattedConversations = data.conversations.map(
              (conv: any) => ({
                id: conv.conversation_id,
                title: conv.title || "New Conversation",
                messages: [],
                lastMessage: conv.title || "",
                timestamp: conv.last_updated || new Date().toISOString(),
                messageCount: conv.message_count || 0,
                createdAt: conv.created_at || new Date().toISOString(),
              })
            );
            setConversations(formattedConversations);
          }
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      }
    };

    if (userId) {
      loadConversations();
    }
  }, [userId]);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle tab change
  useEffect(() => {
    if (activeTab === "history") {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [activeTab]);

  const getRelativeTime = (timestamp: string | Date) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return "Unknown";

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
          const charsToAdd = Math.random() > 0.3 ? 12 : 4;
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
      }, 18);
    });
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = textToSend;
    setInputMessage("");
    setIsTyping(true);

    // Handle clear command
    if (currentInput.toLowerCase().trim() === "clear") {
      setMessages([]);
      setConversationId("");
      setIsTyping(false);
      setSidebarOpen(false);

      // Create new conversation
      if (userId) {
        try {
          const response = await fetch("/api/ai/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          if (response.ok) {
            const data = await response.json();
            setConversationId(data.conversationId);
          }
        } catch (error) {
          console.error("Failed to create new conversation:", error);
        }
      }
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
      console.log("🤖 Sending message to AI:", currentInput);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          conversationId: conversationId || null,
          userId: userId || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📦 AI Response received:", data);

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
          functionCalls: data.functionCalls || [],
          tokens: data.tokens,
        },
      ]);

      await typeMessage(
        data.message || "Sorry, I didn't receive a proper response.",
        aiId
      );
      console.log("✅ AI response completed");
    } catch (error: any) {
      console.error("❌ Error sending message:", error);

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

      let errorMessage =
        "❌ **Error**\n\nSomething went wrong while processing your request.";

      if (error.message.includes("fetch")) {
        errorMessage =
          "🌐 **Connection Error**\n\nUnable to connect to the AI service. Please check your internet connection and try again.";
      } else if (error.message.includes("500")) {
        errorMessage =
          "⚠️ **Server Error**\n\nThe AI service is temporarily unavailable. Please try again in a few moments.";
      } else if (error.message.includes("404")) {
        errorMessage =
          "🔍 **Service Not Found**\n\nThe AI service endpoint was not found. Please contact support.";
      } else {
        errorMessage += `\n\n**Details:** ${error.message}`;
      }

      await typeMessage(errorMessage, errorId);
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
      // Clean content for copying (remove markdown formatting)
      const cleanContent = content
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/\n/g, "\n");

      await navigator.clipboard.writeText(cleanContent);
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

  const handleSessionSelect = async (selectedSessionId: string) => {
    if (selectedSessionId === conversationId) {
      setActiveTab("chat");
      return;
    }

    try {
      const response = await fetch(
        `/api/ai/conversation?conversationId=${selectedSessionId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.conversation && data.conversation.messages) {
          const formattedMessages = data.conversation.messages.map(
            (msg: any) => ({
              id: msg.timestamp + Math.random(),
              type: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              functionCalls: msg.function_calls || [],
            })
          );
          setConversationId(selectedSessionId);
          setMessages(formattedMessages);
          setActiveTab("chat");
        }
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const handleNewChat = async () => {
    setMessages([]);
    setSidebarOpen(false);
    setActiveTab("chat");

    // Create new conversation if we have a user
    if (userId) {
      try {
        const response = await fetch("/api/ai/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        if (response.ok) {
          const data = await response.json();
          setConversationId(data.conversationId);
          console.log("✅ New conversation created:", data.conversationId);
        }
      } catch (error) {
        console.error("Failed to create new conversation:", error);
        setConversationId(Date.now().toString()); // Fallback to local ID
      }
    }
  };

  const deleteConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.filter((conv) => conv.id !== conversationId)
    );

    if (conversationId === conversationId) {
      handleNewChat();
    }
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, "<br>");
  };

  const handleChipClick = (chipText: string) => {
    handleSendMessage(chipText);
  };

  if (initialLoading) return <SkeletonAIChat />;

  const showWelcomeScreen = messages.length === 0;

  return (
    <div className="h-full relative bg-[#0F0F0F] flex">
      {/* Overlay Background */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => {
            setSidebarOpen(false);
            setActiveTab("chat");
          }}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Tabs */}
        <div className="flex-shrink-0 bg-[#0F0F0F] px-4 py-3">
          <div className="flex justify-center">
            <div className="flex bg-black rounded-[16px] p-1 border border-[#2C2C2C]">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-6 py-2 rounded-[12px] text-sm font-satoshi font-medium transition-all ${
                  activeTab === "chat"
                    ? "bg-[#E2AF19] text-black"
                    : "text-white hover:text-[#E2AF19]"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-6 py-2 rounded-[12px] text-sm font-satoshi font-medium transition-all ${
                  activeTab === "history"
                    ? "bg-[#E2AF19] text-black"
                    : "text-white hover:text-[#E2AF19]"
                }`}
              >
                History
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-2 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                <p className="text-yellow-400 text-xs font-satoshi">{error}</p>
              </div>
            </div>
          )}

          {/* Status Indicator */}
          {!error && isInitialized && (
            <div className="mt-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-satoshi">
                  AI Ready
                </span>
                {userId && (
                  <span className="text-gray-500 text-xs">
                    • ID: {userId.slice(-6)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages or Welcome Screen */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          {showWelcomeScreen ? (
            /* Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center -mt-5">
              {/* Lumen AI Logo */}
              <div className="mb-2">
                <img
                  src="/AImiddleImage.png"
                  alt="Lumen AI"
                  className="w-45 h-45 object-contain"
                />
              </div>

              {/* Heading */}
              <h1 className="text-white text-3xl font-satoshi font-bold mb-10 text-center">
                Chat with Lumen AI
              </h1>

              {/* Suggestion Chips */}
              <div className="w-full max-w-2xl mx-auto mb-16">
                <div className="flex flex-wrap justify-center gap-2 px-4">
                  {suggestionChips.map((chip, index) => (
                    <button
                      key={index}
                      onClick={() => handleChipClick(chip)}
                      className="px-3 py-1.5 text-white text-xs font-satoshi rounded-[12px] border border-[#4B3A08] hover:border-[#E2AF19] transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      disabled={isTyping || !isInitialized}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
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
                              Lumen AI is thinking...
                            </span>
                          </div>
                        ) : (
                          <div className="text-[#F9EFD1] text-sm leading-relaxed">
                            <div
                              className="message-content"
                              dangerouslySetInnerHTML={{
                                __html: formatMessage(message.content),
                              }}
                            />
                            {message.typing && (
                              <span className="inline-block w-2 h-4 bg-[#E2AF19] animate-pulse ml-1" />
                            )}

                            {/* Function calls indicator */}
                            {message.functionCalls &&
                              message.functionCalls.length > 0 &&
                              !message.typing && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {message.functionCalls.map((func, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs bg-[#E2AF19]/20 text-[#E2AF19] px-2 py-1 rounded"
                                    >
                                      {func.replace("_", " ")}
                                    </span>
                                  ))}
                                </div>
                              )}

                            {/* Token usage */}
                            {message.tokens && !message.typing && (
                              <div className="mt-2 text-xs text-gray-500">
                                Tokens:{" "}
                                {message.tokens.total ||
                                  (message.tokens.input || 0) +
                                    (message.tokens.output || 0)}
                              </div>
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
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4">
          <div className="relative max-w-2xl mx-auto">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isInitialized
                  ? "Ask about crypto, analyze tokens, check wallet performance..."
                  : "Initializing AI..."
              }
              className="w-full bg-black text-white placeholder-gray-400 resize-none focus:outline-none pr-12 pl-4 py-3 min-h-[48px] max-h-32 text-sm border border-[#2C2C2C] focus:border-[#E2AF19] transition-colors rounded-[100px] disabled:opacity-50"
              rows={1}
              disabled={isTyping || !isInitialized}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isTyping || !isInitialized}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-[#E2AF19] hover:bg-[#D4A853] disabled:opacity-50 text-black rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              {isTyping ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
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
              <span className="text-gray-400 text-xs">
                Lumen AI is working...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Sidebar */}
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
          <div className="flex-1 px-4 pt-4 overflow-y-auto">
            <div className="mb-4">
              <span className="text-gray-300 text-sm font-satoshi font-medium">
                Recent Conversations
              </span>
            </div>

            <div className="space-y-2 pb-20">
              {/* Current Session */}
              {messages.length > 0 && conversationId && (
                <div className="p-3 rounded-xl bg-[#E2AF19]/10 border border-[#E2AF19]/20 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-white text-sm font-medium">
                        Current Chat
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mt-1 truncate">
                    {messages[0]?.content?.substring(0, 60)}...
                  </p>
                </div>
              )}

              {/* Saved Conversations */}
              {conversations
                .filter((conv) => conv.id !== conversationId)
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-3 rounded-xl cursor-pointer group transition-all bg-[#2C2C2C]/20 hover:bg-[#2C2C2C]/40"
                    onClick={() => handleSessionSelect(conversation.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-300 text-sm font-medium line-clamp-1">
                          {conversation.title}
                        </span>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-1">
                          {conversation.lastMessage}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {getRelativeTime(conversation.timestamp)} •{" "}
                          {conversation.messageCount} messages
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Empty State */}
              {conversations.length === 0 && messages.length === 0 && (
                <div className="text-center py-8">
                  <Brain className="text-gray-500 mx-auto mb-3" size={32} />
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Start chatting to see history
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* New Chat Button */}
          <div className="absolute bottom-4 left-4 right-4 bg-gradient-to-b from-transparent to-[#141414] pt-4">
            <button
              onClick={handleNewChat}
              className="w-full bg-[#E2AF19] text-black px-3 py-2 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              disabled={isTyping}
            >
              <Plus size={14} />
              <span>New Chat</span>
            </button>
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
