"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { Bell, HelpCircle, Send, Copy, RefreshCw, Trash2 } from "lucide-react";
import { RootState } from "@/store";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  processing?: boolean;
}

export default function AIChatPage() {
  const { activeWallet } = useSelector((state: RootState) => state.wallet);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: `Hello`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Add processing message
    const processingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content:
        "🤖 Assistant: Processing your request...\n🧠 AI analyzing your request...",
      timestamp: new Date(),
      processing: true,
    };

    setMessages((prev) => [...prev, processingMessage]);

    try {
      // Handle clear command locally
      if (currentInput.toLowerCase().trim() === "clear") {
        setMessages([
          {
            id: "welcome-new",
            type: "assistant",
            content:
              "🧹 Session context cleared successfully!\n\nHow can I assist you with your crypto needs?",
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        return;
      }

      // Call the AI API
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: currentInput }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Remove processing message and add AI response
      setMessages((prev) => {
        const withoutProcessing = prev.filter((msg) => !msg.processing);
        const aiResponse: Message = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        return [...withoutProcessing, aiResponse];
      });
    } catch (error) {
      console.error("AI Chat error:", error);

      // Remove processing message and add error message
      setMessages((prev) => {
        const withoutProcessing = prev.filter((msg) => !msg.processing);
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: "assistant",
          content: `❌ I encountered an error: ${error.message}\n\nPlease try again or rephrase your question.`,
          timestamp: new Date(),
        };
        return [...withoutProcessing, errorMessage];
      });
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

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Failed to copy message");
    }
  };

  const clearMessages = () => {
    setMessages([
      {
        id: "welcome-cleared",
        type: "assistant",
        content: `🤖 **Production-Level Crypto AI Assistant** ready!

How can I assist you today with your crypto needs? Try asking about:
- Token prices and analysis
- Security checks for contracts
- Smart contract generation
- DeFi explanations
- Investment guidance`,
        timestamp: new Date(),
      },
    ]);
  };

  const formatMessage = (content: string) => {
    // Convert markdown-style formatting to HTML
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /```solidity\n([\s\S]*?)\n```/g,
        '<pre class="code-block solidity"><code>$1</code></pre>'
      )
      .replace(
        /```(.*?)\n([\s\S]*?)\n```/g,
        '<pre class="code-block"><code>$2</code></pre>'
      )
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, "<br>");

    return formatted;
  };

  // Quick suggestion buttons
  const quickSuggestions = [
    "What is the price of Ethereum today?",
    "Check security 0x...",
    "Create an ERC-20 token",
    "Is Bitcoin a good investment?",
    "Explain DeFi protocols",
  ];

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            🤖 AI Chat Assistant
          </h1>
          <p className="text-gray-400 text-sm font-satoshi mt-1">
            Powered by GoPlus Security & CoinGecko APIs
          </p>
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
              {activeWallet?.name || "Wallet 1"}
            </span>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              {activeWallet?.address
                ? `${activeWallet.address.slice(
                    0,
                    6
                  )}...${activeWallet.address.slice(-4)}`
                : "0xAD7a4hw64...R8J6153"}
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
            <button
              onClick={clearMessages}
              className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full"
              title="Clear conversation"
            >
              <Trash2 size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>
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

      {/* Chat Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Quick Suggestions - Only show if no messages or just welcome */}
        {messages.length <= 1 && (
          <div className="mb-4 flex-shrink-0">
            <p className="text-gray-400 text-sm font-satoshi mb-3">
              💡 Try these examples:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(suggestion)}
                  className="bg-[#1A1A1A] text-gray-300 px-3 py-2 text-xs sm:text-sm font-satoshi rounded-lg hover:bg-[#2C2C2C] transition-colors border border-[#2C2C2C]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6 space-y-4 lg:space-y-6 flex flex-col pb-4 scrollbar-hide">
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col space-y-2">
              {message.type === "assistant" ? (
                <div className="flex flex-col items-start space-y-2">
                  {/* Message Content */}
                  <div className="max-w-full sm:max-w-4xl bg-black p-3 lg:p-4 rounded-2xl border border-[#2C2C2C]">
                    {message.processing ? (
                      <div className="flex items-center space-x-2">
                        <RefreshCw
                          size={16}
                          className="text-[#E2AF19] animate-spin"
                        />
                        <div
                          className="text-[#F9EFD1] text-xs sm:text-sm leading-relaxed font-satoshi"
                          dangerouslySetInnerHTML={{
                            __html: formatMessage(message.content),
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="text-[#F9EFD1] text-xs sm:text-sm leading-relaxed font-satoshi message-content"
                        dangerouslySetInnerHTML={{
                          __html: formatMessage(message.content),
                        }}
                      />
                    )}
                  </div>

                  {/* Copy Button - Only for non-processing messages */}
                  {!message.processing && (
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="bg-[#E2AF19] text-black px-2 lg:px-3 py-1 rounded-md text-xs font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center gap-1"
                    >
                      Copy
                      <Copy size={10} className="lg:w-3 lg:h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="bg-[#E2AF19] text-black p-3 lg:p-4 max-w-full sm:max-w-2xl rounded-2xl">
                    <p className="text-xs sm:text-sm font-satoshi">
                      {message.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Responsive */}
        <div className="p-3 sm:p-4 lg:p-6 flex-shrink-0">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about crypto tokens, security checks, smart contracts, or DeFi..."
              className="w-full bg-black text-white placeholder-gray-400 resize-none font-satoshi focus:outline-none pr-12 sm:pr-16 pl-4 sm:pl-6 py-3 sm:py-4 min-h-[50px] sm:min-h-[60px] max-h-32 text-sm sm:text-base border border-[#2C2C2C] focus:border-[#E2AF19] transition-colors"
              rows={1}
              disabled={isTyping}
              style={{
                borderRadius: "100px",
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
              className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-[#E2AF19] hover:bg-[#D4A853] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-full transition-colors flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
              style={{
                borderRadius: "200px",
              }}
            >
              {isTyping ? (
                <RefreshCw
                  size={14}
                  className="sm:w-[18px] sm:h-[18px] animate-spin"
                />
              ) : (
                <Send size={14} className="sm:w-[18px] sm:h-[18px]" />
              )}
            </button>
          </div>

          {/* Status indicator */}
          {isTyping && (
            <div className="flex items-center justify-center mt-2">
              <div className="flex space-x-1">
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
              <span className="text-gray-400 text-xs font-satoshi ml-2">
                AI is thinking...
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

        .message-content .code-block {
          background: #1a1a1a;
          border: 1px solid #2c2c2c;
          border-radius: 8px;
          padding: 12px;
          margin: 8px 0;
          overflow-x: auto;
          font-family: "Courier New", monospace;
          font-size: 12px;
          line-height: 1.4;
        }

        .message-content .code-block.solidity {
          border-left: 4px solid #e2af19;
        }

        .message-content .inline-code {
          background: #2c2c2c;
          color: #e2af19;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: "Courier New", monospace;
          font-size: 11px;
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

        /* Mobile specific styles */
        @media (max-width: 640px) {
          textarea {
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
