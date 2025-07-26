// src/components/AIChatPage.tsx - Improved with Sidebar
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
  Settings,
  MoreVertical,
} from "lucide-react";
import { RootState } from "@/store";
import { SkeletonAIChat } from "@/components/ui/Skeleton";
import ChatSidebar from "./ChatSidebar";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  processing?: boolean;
  typing?: boolean;
  metadata?: {
    utility?: string;
    intent?: string;
    entities?: any;
  };
}

export default function AIChatPage() {
  const { activeWallet } = useSelector((state: RootState) => state.wallet);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [showWelcome, setShowWelcome] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    const timer = setTimeout(() => {
      setInitialLoading(false);
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            type: "assistant",
            content: `🤖 **Welcome to BlockPal AI Enhanced!**

I'm your advanced crypto assistant with smart context and persistent memory. I can help you with:

• **Wallet Analysis** - Deep portfolio insights
• **Transaction Analysis** - Complete breakdown & gas optimization  
• **Token Research** - Real-time pricing & market data
• **Smart Contracts** - Generation & security auditing
• **Market Trends** - Hot tokens & opportunities

**💡 Pro Tips:**
- I remember our conversation across sessions
- Use natural references like "the sender" or "that wallet"
- Ask "help" anytime for feature guide
- Previous conversations are saved in the sidebar

What would you like to explore today?`,
            timestamp: new Date(),
          },
        ]);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Enhanced typing animation
  const typeMessage = (fullText: string, messageId: string) => {
    return new Promise<void>((resolve) => {
      let currentText = "";
      let currentIndex = 0;

      const typeInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          const charsToAdd =
            Math.random() > 0.3 ? (Math.random() > 0.6 ? 8 : 5) : 3;
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
      }, 8 + Math.random() * 12);
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
    setShowWelcome(false);

    // Add processing message
    const processingMessageId = (Date.now() + 1).toString();
    const processingMessage: Message = {
      id: processingMessageId,
      type: "assistant",
      content: "",
      timestamp: new Date(),
      processing: true,
      typing: true,
    };

    setMessages((prev) => [...prev, processingMessage]);

    try {
      // Handle special commands
      if (currentInput.toLowerCase().trim() === "clear") {
        setMessages([]);
        setSessionId("");
        setShowWelcome(true);
        setIsTyping(false);
        return;
      }

      if (currentInput.toLowerCase().trim() === "help") {
        setMessages((prev) => prev.filter((msg) => !msg.processing));

        const helpMessageId = (Date.now() + 2).toString();
        const helpMessage: Message = {
          id: helpMessageId,
          type: "assistant",
          content: "",
          timestamp: new Date(),
          typing: true,
        };

        setMessages((prev) => [...prev, helpMessage]);

        const helpText = `🔷 **BlockPal AI - Complete Feature Guide**

**🔍 ANALYSIS COMMANDS:**
• \`analyze wallet 0x...\` - Complete portfolio analysis with insights
• \`check transaction 0x...\` - Transaction breakdown with gas analysis
• \`audit contract 0x...\` - Security analysis & honeypot detection
• \`token info SYMBOL\` - Price, market data & project insights

**⚡ CREATION & TOOLS:**
• \`create ERC20 token\` - Generate smart contracts with explanations
• \`gas prices\` - Current network fees & optimization tips
• \`trending tokens\` - Hot cryptocurrencies & market trends
• \`compare TOKEN1 vs TOKEN2\` - Side-by-side analysis

**🧠 SMART FEATURES:**
• **Context Memory** - I remember addresses & transactions you mention
• **Natural References** - Say "the sender", "that wallet", "this token"
• **Session Persistence** - Conversations saved across browser sessions
• **Entity Tracking** - Automatic tracking of wallets, contracts, tokens

**💡 EXAMPLE CONVERSATIONS:**
\`\`\`
You: "analyze wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f2bd6e"
AI: [Provides complete analysis]
You: "what about the largest token holder?"
AI: [Analyzes the largest holder automatically]
You: "is it safe?"
AI: [Security assessment of the holder's wallet]
\`\`\`

**🎯 QUICK COMMANDS:**
• \`clear\` - Reset conversation
• \`help\` - Show this guide
• \`sidebar\` - Toggle conversation history

Ready to dive in? Try any command above!`;

        await typeMessage(helpText, helpMessageId);
        setIsTyping(false);
        return;
      }

      // Call the enhanced AI API
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          sessionId: sessionId,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Update session ID
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      // Remove processing message and add AI response
      setMessages((prev) => prev.filter((msg) => !msg.processing));

      const aiResponseId = (Date.now() + 2).toString();
      const aiMessage: Message = {
        id: aiResponseId,
        type: "assistant",
        content: "",
        timestamp: new Date(),
        typing: true,
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, aiMessage]);
      await typeMessage(data.response, aiResponseId);
    } catch (error) {
      console.error("AI Chat error:", error);

      setMessages((prev) => prev.filter((msg) => !msg.processing));

      const errorMessageId = (Date.now() + 2).toString();
      const errorMessage: Message = {
        id: errorMessageId,
        type: "assistant",
        content: "",
        timestamp: new Date(),
        typing: true,
      };

      setMessages((prev) => [...prev, errorMessage]);

      const errorText = `❌ I encountered an error: ${error.message}\n\nPlease try again or rephrase your question.`;
      await typeMessage(errorText, errorMessageId);
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

  const copyCodeBlock = async (code: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedItems((prev) => new Set(prev).add(blockId));
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(blockId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code");
    }
  };

  const handleSessionSelect = async (selectedSessionId: string) => {
    try {
      const response = await fetch(
        `/api/ai-chat/sessions/${selectedSessionId}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSessionId(selectedSessionId);
        setMessages(data.messages || []);
        setShowWelcome(false);
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId("");
    setShowWelcome(true);

    // Add welcome message for new chat
    setTimeout(() => {
      setMessages([
        {
          id: "welcome-new",
          type: "assistant",
          content: `🤖 **New Conversation Started!**

Ready to assist with your crypto needs. What would you like to explore?

💡 **Quick starts:**
• "analyze wallet 0x..." for portfolio insights
• "what's trending" for market updates  
• "help" for complete feature guide`,
          timestamp: new Date(),
        },
      ]);
    }, 100);
  };

  const formatMessage = (content: string, messageId: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockCounter = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textPart = content.slice(lastIndex, match.index);
        parts.push({ type: "text", content: textPart });
      }

      const language = match[1] || "text";
      const code = match[2];
      const blockId = `${messageId}-code-${blockCounter++}`;

      parts.push({ type: "code", language, content: code, blockId });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: "text", content: content.slice(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: "text", content: content });
    }

    return parts.map((part, index) => {
      if (part.type === "code") {
        return (
          <div key={index} className="relative my-3">
            <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#2c2c2c] rounded-t-lg px-3 py-2">
              <span className="text-xs text-gray-400 font-mono font-medium">
                {part.language}
              </span>
              <button
                onClick={() => copyCodeBlock(part.content, part.blockId)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#2c2c2c]"
              >
                {copiedItems.has(part.blockId) ? (
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
            </div>
            <pre className="bg-[#1a1a1a] border border-[#2c2c2c] border-t-0 rounded-b-lg p-4 overflow-x-auto">
              <code className="text-sm font-mono text-gray-200 leading-relaxed">
                {part.content}
              </code>
            </pre>
          </div>
        );
      } else {
        let formatted = part.content
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
          .replace(/\n/g, "<br>");

        return (
          <div key={index} dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      }
    });
  };

  if (initialLoading) {
    return <SkeletonAIChat />;
  }

  return (
    <div className="h-full flex bg-[#0F0F0F]">
      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeSessionId={sessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        currentUser="user" // You can get this from your auth state
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col rounded-[12px] lg:rounded-[16px] overflow-hidden">
        {/* Header */}
        <div className="p-3 lg:p-4 border-b border-[#2C2C2C] bg-gradient-to-r from-[#1a1a1a] to-[#0F0F0F]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors lg:hidden"
              >
                <Menu size={16} className="text-gray-400" />
              </button>

              <div className="hidden lg:block">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                >
                  <Menu size={16} className="text-gray-400" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <Brain className="text-[#E2AF19]" size={20} />
                <div>
                  <h1 className="text-lg font-satoshi font-bold text-white">
                    BlockPal AI
                  </h1>
                  {sessionId && (
                    <p className="text-xs text-gray-400 font-mono">
                      Session: {sessionId.slice(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleNewChat}
                className="px-3 py-1.5 bg-[#E2AF19] text-black text-sm font-satoshi font-medium rounded-lg hover:bg-[#D4A853] transition-colors"
              >
                New Chat
              </button>

              <button className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 lg:px-4 flex flex-col justify-end scrollbar-hide">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col space-y-2">
                {message.type === "assistant" ? (
                  <div className="flex flex-col items-start space-y-2">
                    <div className="max-w-full lg:max-w-4xl bg-black p-3 lg:p-4 rounded-xl border border-[#2C2C2C]">
                      {message.processing && !message.content ? (
                        <div className="flex items-center space-x-2">
                          <RefreshCw
                            size={16}
                            className="text-[#E2AF19] animate-spin"
                          />
                          <span className="text-[#F9EFD1] text-sm font-satoshi">
                            🧠 Enhanced AI processing your request...
                          </span>
                        </div>
                      ) : (
                        <div className="text-[#F9EFD1] text-sm leading-relaxed font-satoshi message-content">
                          {formatMessage(message.content, message.id)}
                          {message.typing && (
                            <span className="inline-block w-2 h-4 bg-[#E2AF19] animate-pulse ml-1"></span>
                          )}
                        </div>
                      )}
                    </div>

                    {message.metadata?.utility && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Utility:</span>
                        <span className="bg-[#2C2C2C] px-2 py-1 rounded text-[#E2AF19]">
                          {message.metadata.utility}
                        </span>
                      </div>
                    )}

                    {!message.processing &&
                      !message.typing &&
                      message.content && (
                        <button
                          onClick={() =>
                            copyMessage(message.content, message.id)
                          }
                          className="bg-[#E2AF19] text-black px-3 py-1 rounded-lg text-xs font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center gap-1.5"
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
                    <div className="bg-[#E2AF19] text-black p-3 lg:p-4 max-w-full lg:max-w-2xl rounded-xl">
                      <p className="text-sm font-satoshi">{message.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-3 lg:p-4 flex-shrink-0">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about crypto analysis, smart contracts, security audits, or market trends..."
              className="w-full bg-black text-white placeholder-gray-400 resize-none font-satoshi focus:outline-none pr-12 pl-4 py-3 min-h-[52px] max-h-32 text-sm border border-[#2C2C2C] focus:border-[#E2AF19] transition-colors rounded-2xl"
              rows={1}
              disabled={isTyping}
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                fontSize:
                  typeof window !== "undefined" && window.innerWidth < 640
                    ? "16px"
                    : undefined,
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#E2AF19] hover:bg-[#D4A853] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-full transition-colors w-10 h-10 flex items-center justify-center"
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
                <div className="w-2 h-2 bg-[#E2AF19] rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-[#E2AF19] rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-[#E2AF19] rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span className="text-gray-400 text-xs font-satoshi">
                Enhanced AI thinking...
              </span>
            </div>
          )}
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

        textarea::-webkit-scrollbar {
          display: none;
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
          font-family: "Courier New", monospace;
          font-size: 0.9em;
        }

        .animate-bounce {
          animation: bounce 1.4s infinite;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px);
          }
        }

        @media (max-width: 640px) {
          textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
