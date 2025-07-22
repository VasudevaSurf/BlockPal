// src/components/AIChatPage.tsx - Fixed WhatsApp-like layout
"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { Send, Copy, RefreshCw, Trash2, Check } from "lucide-react";
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

export default function AIChatPage() {
  const { activeWallet } = useSelector((state: RootState) => state.wallet);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: `Hello! I'm your AI crypto assistant. I can help you with token analysis, security checks, smart contracts, and more. What would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing animation function - Much faster speed
  const typeMessage = (fullText: string, messageId: string) => {
    return new Promise<void>((resolve) => {
      let currentText = "";
      let currentIndex = 0;

      const typeInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          // Add more characters for much faster typing
          const charsToAdd =
            Math.random() > 0.3 ? (Math.random() > 0.6 ? 8 : 5) : 3; // 3-8 characters at once
          currentText += fullText.slice(
            currentIndex,
            currentIndex + charsToAdd
          );
          currentIndex += charsToAdd;

          // Update the message content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: currentText, typing: true }
                : msg
            )
          );
        } else {
          // Typing complete
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
      }, 8 + Math.random() * 12); // Much faster interval: 8-20ms
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

    // Add processing message with typing indicator
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

      // Remove processing message and add AI response with typing effect
      setMessages((prev) => prev.filter((msg) => !msg.processing));

      const aiResponseId = (Date.now() + 2).toString();
      const aiMessage: Message = {
        id: aiResponseId,
        type: "assistant",
        content: "",
        timestamp: new Date(),
        typing: true,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Start typing animation
      await typeMessage(data.response, aiResponseId);
    } catch (error) {
      console.error("AI Chat error:", error);

      // Remove processing message and add error message with typing
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
      // Visual feedback for successful copy
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

  const formatMessage = (content: string, messageId: string) => {
    // Extract code blocks for special handling
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockCounter = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textPart = content.slice(lastIndex, match.index);
        parts.push({
          type: "text",
          content: textPart,
        });
      }

      // Add code block
      const language = match[1] || "text";
      const code = match[2];
      const blockId = `${messageId}-code-${blockCounter++}`;

      parts.push({
        type: "code",
        language,
        content: code,
        blockId,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    // If no code blocks found, treat as text
    if (parts.length === 0) {
      parts.push({
        type: "text",
        content: content,
      });
    }

    return parts.map((part, index) => {
      if (part.type === "code") {
        return (
          <div key={index} className="relative my-2">
            <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#2c2c2c] rounded-t-lg px-3 py-1.5">
              <span className="text-xs text-gray-400 font-mono">
                {part.language}
              </span>
              <button
                onClick={() => copyCodeBlock(part.content, part.blockId)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copiedItems.has(part.blockId) ? (
                  <>
                    <Check size={10} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={10} />
                  </>
                )}
              </button>
            </div>
            <pre className="bg-[#1a1a1a] border border-[#2c2c2c] border-t-0 rounded-b-lg p-3 overflow-x-auto">
              <code className="text-xs font-mono text-gray-200">
                {part.content}
              </code>
            </pre>
          </div>
        );
      } else {
        // Format regular text with markdown-style formatting
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

  // Quick suggestion buttons
  const quickSuggestions = [
    "What is the price of Ethereum today?",
    "Check security 0x...",
    "Create an ERC-20 token",
    "Is Bitcoin a good investment?",
    "Explain DeFi protocols",
  ];

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (initialLoading) {
    return <SkeletonAIChat />;
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] flex flex-col overflow-hidden">
      {/* Chat Container - Normal WhatsApp-like layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Area - Messages stick to bottom like WhatsApp */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-3 lg:px-4 flex flex-col justify-end scrollbar-hide">
          <div className="space-y-2 lg:space-y-3 py-2">
            {/* Messages in normal order */}
            {messages.map((message, index) => (
              <div key={message.id} className="flex flex-col space-y-1">
                {message.type === "assistant" ? (
                  <div className="flex flex-col items-start space-y-1">
                    {/* Message Content */}
                    <div className="max-w-full sm:max-w-4xl bg-black p-2 lg:p-3 rounded-xl border border-[#2C2C2C]">
                      {message.processing && !message.content ? (
                        <div className="flex items-center space-x-2">
                          <RefreshCw
                            size={14}
                            className="text-[#E2AF19] animate-spin"
                          />
                          <span className="text-[#F9EFD1] text-xs font-satoshi">
                            🧠 AI analyzing your request...
                          </span>
                        </div>
                      ) : (
                        <div className="text-[#F9EFD1] text-xs sm:text-sm leading-relaxed font-satoshi message-content">
                          {formatMessage(message.content, message.id)}
                          {message.typing && (
                            <span className="inline-block w-1.5 h-3 bg-[#E2AF19] animate-pulse ml-1"></span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Copy Button - Below message */}
                    {!message.processing &&
                      !message.typing &&
                      message.content && (
                        <button
                          onClick={() =>
                            copyMessage(message.content, message.id)
                          }
                          className="bg-[#E2AF19] text-black px-2 lg:px-2.5 py-0.5 rounded-md text-xs font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center gap-1"
                        >
                          {copiedItems.has(message.id) ? (
                            <>
                              <Check size={8} className="lg:w-2.5 lg:h-2.5" />
                              Copied!
                            </>
                          ) : (
                            <>copy</>
                          )}
                        </button>
                      )}
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="bg-[#F9EFD1] text-black p-2 lg:p-3 max-w-full sm:max-w-2xl rounded-xl">
                      <p className="text-xs sm:text-sm font-satoshi">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Scroll anchor at the bottom */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area at bottom */}
        <div className="p-2 sm:p-3 lg:p-4 flex-shrink-0">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about crypto tokens, security checks, smart contracts, or DeFi..."
              className="w-full bg-black text-white placeholder-gray-400 resize-none font-satoshi focus:outline-none pr-10 sm:pr-12 pl-3 sm:pl-4 py-2 sm:py-3 min-h-[40px] sm:min-h-[50px] max-h-32 text-sm border border-[#2C2C2C] focus:border-[#E2AF19] transition-colors"
              rows={1}
              disabled={isTyping}
              style={{
                borderRadius: "50px",
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
              className="absolute right-1 sm:right-1.5 top-1/2 transform -translate-y-1/2 bg-[#E2AF19] hover:bg-[#D4A853] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-full transition-colors flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
              style={{
                borderRadius: "50px",
              }}
            >
              {isTyping ? (
                <RefreshCw size={12} className="sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Send size={12} className="sm:w-4 sm:h-4" />
              )}
            </button>
          </div>

          {/* Status indicator */}
          {isTyping && (
            <div className="flex items-center justify-center mt-1.5">
              <div className="flex space-x-1 mr-2">
                <div className="w-1.5 h-1.5 bg-[#E2AF19] rounded-full animate-bounce"></div>
                <div
                  className="w-1.5 h-1.5 bg-[#E2AF19] rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-[#E2AF19] rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span className="text-gray-400 text-xs font-satoshi">
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

        .message-content .inline-code {
          background: #2c2c2c;
          color: #e2af19;
          padding: 1px 4px;
          border-radius: 3px;
          font-family: "Courier New", monospace;
          font-size: 10px;
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
            transform: translateY(-4px);
          }
        }

        /* Typing cursor animation */
        @keyframes pulse {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }

        /* Mobile specific styles */
        @media (max-width: 640px) {
          textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
