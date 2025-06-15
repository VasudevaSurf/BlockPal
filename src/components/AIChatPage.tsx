"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, HelpCircle, Send, Copy } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Crypto, short for cryptocurrency, is a digital or virtual currency secured by cryptography. It operates on decentralized blockchain technology, enabling peer-to-peer transactions without intermediaries like banks. Popular examples include Bitcoin and Ethereum. Crypto offers transparency, security, and often anonymity, revolutionizing finance, ownership, and the concept of digital assets.",
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
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "I understand you're asking about crypto. Let me help you with that. Cryptocurrency represents a revolutionary approach to digital finance, offering decentralized alternatives to traditional banking systems. Would you like me to explain any specific aspect of cryptocurrency or blockchain technology?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
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

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            AI Chat
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

      {/* Chat Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6 space-y-4 lg:space-y-6 flex flex-col justify-end pb-4">
          {/* Quick Start Suggestion - Responsive */}
          <div className="flex justify-end mb-4 lg:mb-8">
            <button
              className="bg-[#F9EFD1] text-black px-3 lg:px-4 py-2 text-xs sm:text-sm font-satoshi rounded-[16px] hover:bg-[#F5E8C8] transition-colors"
              style={{
                borderRadius: "12px 12px 12px 0px lg:16px 16px 16px 0px",
              }}
            >
              What is crypto?
            </button>
          </div>

          {/* Messages */}
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col space-y-2">
              {message.type === "assistant" ? (
                <div className="flex flex-col items-start space-y-2">
                  {/* Message Content */}
                  <div className="max-w-full sm:max-w-4xl bg-black p-3 lg:p-4 rounded-2xl">
                    <p className="text-[#F9EFD1] text-xs sm:text-sm leading-relaxed font-satoshi">
                      {message.content}
                    </p>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => copyMessage(message.content)}
                    className="bg-[#E2AF19] text-black px-2 lg:px-3 py-1 rounded-md text-xs font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center gap-1"
                  >
                    Copy
                    <Copy size={10} className="lg:w-3 lg:h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="bg-[#F9EFD1] text-black p-3 lg:p-4 max-w-full sm:max-w-2xl rounded-2xl">
                    <p className="text-xs sm:text-sm font-satoshi">
                      {message.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col items-start space-y-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <button className="bg-[#E2AF19] text-black px-2 lg:px-3 py-1 rounded-md text-xs font-satoshi font-medium">
                Copy
              </button>
            </div>
          )}

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
              placeholder="Type your message"
              className="w-full bg-black text-white placeholder-gray-400 resize-none font-satoshi focus:outline-none pr-12 sm:pr-16 pl-4 sm:pl-6 py-3 sm:py-4 min-h-[50px] sm:min-h-[60px] max-h-32 text-sm sm:text-base border border-[#2C2C2C] focus:border-[#E2AF19]"
              rows={1}
              style={{
                borderRadius: "100px",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
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
              <Send size={14} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        textarea::-webkit-scrollbar {
          display: none;
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
          .animate-bounce {
            animation: bounce 1.4s infinite;
          }

          textarea {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
