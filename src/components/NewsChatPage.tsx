// src/components/NewsChatPage.tsx - FIXED VERSION with proper URL rendering
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  processing?: boolean;
  typing?: boolean;
  functionCalls?: string[];
}

export default function NewsChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
    setError(null);

    // Handle clear command
    if (currentInput.toLowerCase().trim() === "clear") {
      setMessages([]);
      setConversationId("");
      setIsTyping(false);
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
      console.log("🤖 Sending message to News AI:", currentInput);

      const response = await fetch("/api/news-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: currentInput,
          conversationId: conversationId || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📦 News AI Response received:", data);

      // Set conversation ID if this is a new conversation
      if (data.conversationId && !conversationId) {
        console.log("📝 Setting conversation ID:", data.conversationId);
        setConversationId(data.conversationId);
      }

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
        },
      ]);

      await typeMessage(
        data.message || "Sorry, I didn't receive a proper response.",
        aiId
      );
      console.log("✅ News AI response completed");
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
      } else if (error.message.includes("401")) {
        errorMessage =
          "🔒 **Authentication Error**\n\nPlease log in to use the News AI chat.";
      } else {
        errorMessage += `\n\n**Details:** ${error.message}`;
      }

      await typeMessage(errorMessage, errorId);
      setError(error.message);
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

  // IMPROVED: Format message content with proper markdown link rendering
  const formatMessageContent = (content: string) => {
    // First convert markdown bold and italic
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

    // Convert markdown links [text](url) to clickable HTML links
    formatted = formatted.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="news-link">$1</a>'
    );

    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  };

  const showWelcomeScreen = messages.length === 0;

  return (
    <div className="h-full relative bg-[#0F0F0F] flex">
      {/* Overlay Background */}
      <div
        className="fixed bottom-0 right-0 w-[1600px] h-[1600px] bg-no-repeat bg-contain bg-bottom-right pointer-events-none z-0"
        style={{
          backgroundImage: "url(/aiChatGrade.png)",
          backgroundPosition: "bottom right",
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          {showWelcomeScreen ? (
            /* Welcome Screen */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="mb-4">
                  <img
                    src="/AImiddleImage.png"
                    alt="News AI"
                    className="w-32 h-32 object-contain mx-auto"
                  />
                </div>
                <h1 className="text-white text-[24px] font-mayeka font-bold mb-2">
                  News AI Chat
                </h1>
                <p className="text-[#999999] text-[14px] font-satoshi">
                  Ask questions about crypto news and market insights
                </p>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="py-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex flex-col space-y-2">
                  {message.type === "assistant" ? (
                    <div className="flex flex-col items-start space-y-2">
                      <div className="max-w-4xl bg-black/40 backdrop-blur-md p-4 rounded-xl border border-[#F9EFD1]/30">
                        {message.processing && !message.content ? (
                          <div className="flex items-center space-x-2">
                            <RefreshCw
                              size={16}
                              className="text-[#E2AF19] animate-spin"
                            />
                            <span className="text-[#F9EFD1] text-sm font-satoshi">
                              Analyzing news...
                            </span>
                          </div>
                        ) : (
                          <div className="text-[#F9EFD1] text-sm leading-relaxed font-satoshi">
                            <div
                              className="message-content"
                              dangerouslySetInnerHTML={{
                                __html: formatMessageContent(message.content),
                              }}
                            />
                            {message.typing && (
                              <span className="inline-block w-2 h-4 bg-[#E2AF19] animate-pulse ml-1" />
                            )}

                            {message.functionCalls &&
                              message.functionCalls.length > 0 &&
                              !message.typing && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {message.functionCalls.map((func, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs bg-[#E2AF19]/20 text-[#E2AF19] px-2 py-1 rounded"
                                    >
                                      📰 {func.replace("_", " ")}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="bg-[#F9EFD1] text-black p-4 max-w-2xl rounded-xl rounded-tr-none">
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
          <div className="relative max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about crypto news..."
              className="w-full bg-black text-white placeholder-gray-400 resize-none focus:outline-none pr-36 pl-4 py-3 min-h-[48px] max-h-32 text-sm border border-[#71570C] focus:border-[#E2AF19] transition-colors rounded-[100px] disabled:opacity-50"
              rows={1}
              disabled={isTyping}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {/* Attachment Icon */}
              <button
                className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50"
                disabled={isTyping}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="20"
                  viewBox="0 0 22 24"
                  fill="none"
                >
                  <path
                    d="M1.6013e-06 12.0617C-0.000352729 12.2597 0.0581042 12.4534 0.167961 12.6182C0.277818 12.783 0.434128 12.9114 0.617075 12.9873C0.800022 13.0631 1.00137 13.0829 1.19558 13.0442C1.3898 13.0054 1.56814 12.9099 1.708 12.7697L10.898 3.57569C11.8358 2.63788 13.1077 2.11103 14.434 2.11103C15.0907 2.11103 15.741 2.24037 16.3477 2.49168C16.9544 2.74299 17.5056 3.11133 17.97 3.57569C18.4344 4.04004 18.8027 4.59131 19.054 5.19802C19.3053 5.80472 19.4347 6.45499 19.4347 7.11169C19.4347 7.76838 19.3053 8.41865 19.054 9.02535C18.8027 9.63206 18.4344 10.1833 17.97 10.6477L7.364 21.2537C6.9868 21.618 6.48159 21.8196 5.9572 21.815C5.43281 21.8105 4.93118 21.6001 4.56036 21.2293C4.18955 20.8585 3.97921 20.3569 3.97465 19.8325C3.9701 19.3081 4.17169 18.8029 4.536 18.4257L15.142 7.81969C15.235 7.72671 15.3087 7.61633 15.359 7.49485C15.4094 7.37337 15.4353 7.24317 15.4353 7.11169C15.4353 6.9802 15.4094 6.85 15.359 6.72852C15.3087 6.60704 15.235 6.49666 15.142 6.40369C15.049 6.31071 14.9386 6.23696 14.8172 6.18664C14.6957 6.13632 14.5655 6.11042 14.434 6.11042C14.3025 6.11042 14.1723 6.13632 14.0508 6.18664C13.9294 6.23696 13.819 6.31071 13.726 6.40369L3.12 17.0117C2.73796 17.3807 2.43323 17.8221 2.2236 18.3101C2.01396 18.7981 1.90362 19.323 1.899 19.8541C1.89438 20.3852 1.99559 20.9119 2.19672 21.4035C2.39784 21.8951 2.69485 22.3417 3.07042 22.7173C3.44599 23.0928 3.8926 23.3898 4.38419 23.591C4.87577 23.7921 5.40249 23.8933 5.93361 23.8887C6.46472 23.8841 6.9896 23.7737 7.47762 23.5641C7.96564 23.3545 8.40701 23.0497 8.776 22.6677L19.382 12.0617C20.6948 10.7489 21.4324 8.9683 21.4324 7.11169C21.4324 5.25507 20.6948 3.47451 19.382 2.16169C18.0692 0.848864 16.2886 0.111328 14.432 0.111328C12.5754 0.111328 10.7948 0.848864 9.482 2.16169L0.294002 11.3537C0.201198 11.4467 0.127642 11.5571 0.0775382 11.6786C0.0274348 11.8001 -0.000233093 11.9303 1.6013e-06 12.0617Z"
                    fill="#939393"
                  />
                </svg>
              </button>

              {/* Microphone Icon */}
              <button
                className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50"
                disabled={isTyping}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 31 30"
                  fill="none"
                >
                  <path
                    d="M15.4324 20.3125C12.1574 20.3125 9.49487 17.65 9.49487 14.375V7.5C9.49487 4.225 12.1574 1.5625 15.4324 1.5625C18.7074 1.5625 21.3699 4.225 21.3699 7.5V14.375C21.3699 17.65 18.7074 20.3125 15.4324 20.3125ZM15.4324 3.4375C13.1949 3.4375 11.3699 5.2625 11.3699 7.5V14.375C11.3699 16.6125 13.1949 18.4375 15.4324 18.4375C17.6699 18.4375 19.4949 16.6125 19.4949 14.375V7.5C19.4949 5.2625 17.6699 3.4375 15.4324 3.4375Z"
                    fill="#939393"
                  />
                  <path
                    d="M15.4324 24.6875C9.64487 24.6875 4.93237 19.975 4.93237 14.1875V12.0625C4.93237 11.55 5.35737 11.125 5.86987 11.125C6.38237 11.125 6.80737 11.55 6.80737 12.0625V14.1875C6.80737 18.9375 10.6824 22.8125 15.4324 22.8125C20.1824 22.8125 24.0574 18.9375 24.0574 14.1875V12.0625C24.0574 11.55 24.4824 11.125 24.9949 11.125C25.5074 11.125 25.9324 11.55 25.9324 12.0625V14.1875C25.9324 19.975 21.2199 24.6875 15.4324 24.6875Z"
                    fill="#939393"
                  />
                  <path
                    d="M17.1698 8.97539C17.0698 8.97539 16.9573 8.96289 16.8448 8.92539C15.9323 8.58789 14.9323 8.58789 14.0198 8.92539C13.5323 9.10039 12.9948 8.85039 12.8198 8.36289C12.6448 7.87539 12.8948 7.33789 13.3823 7.16289C14.7073 6.68789 16.1698 6.68789 17.4948 7.16289C17.9823 7.33789 18.2323 7.87539 18.0573 8.36289C17.9073 8.73789 17.5448 8.97539 17.1698 8.97539Z"
                    fill="#939393"
                  />
                  <path
                    d="M16.4323 11.6254C16.3448 11.6254 16.2698 11.6129 16.1823 11.5879C15.6823 11.4504 15.1698 11.4504 14.6698 11.5879C14.1698 11.7254 13.6573 11.4254 13.5198 10.9254C13.3823 10.4379 13.6823 9.92539 14.1823 9.78789C14.9948 9.56289 15.8698 9.56289 16.6823 9.78789C17.1823 9.92539 17.4823 10.4379 17.3448 10.9379C17.2323 11.3504 16.8448 11.6254 16.4323 11.6254Z"
                    fill="#939393"
                  />
                  <path
                    d="M15.4324 28.4375C14.9199 28.4375 14.4949 28.0125 14.4949 27.5V23.75C14.4949 23.2375 14.9199 22.8125 15.4324 22.8125C15.9449 22.8125 16.3699 23.2375 16.3699 23.75V27.5C16.3699 28.0125 15.9449 28.4375 15.4324 28.4375Z"
                    fill="#939393"
                  />
                </svg>
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-[#E2AF19] hover:bg-[#D4A853] disabled:opacity-50 text-black rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 49 48"
                  fill="none"
                >
                  <path
                    d="M30.5024 22.3204C30.3124 22.3204 30.1224 22.2504 29.9724 22.1004L24.4324 16.5604L18.8924 22.1004C18.6024 22.3904 18.1224 22.3904 17.8324 22.1004C17.5424 21.8104 17.5424 21.3304 17.8324 21.0404L23.9024 14.9704C24.1924 14.6804 24.6724 14.6804 24.9624 14.9704L31.0324 21.0404C31.3224 21.3304 31.3224 21.8104 31.0324 22.1004C30.8924 22.2504 30.6924 22.3204 30.5024 22.3204Z"
                    fill="black"
                  />
                  <path
                    d="M24.4324 33.2499C24.0224 33.2499 23.6824 32.9099 23.6824 32.4999V15.6699C23.6824 15.2599 24.0224 14.9199 24.4324 14.9199C24.8424 14.9199 25.1824 15.2599 25.1824 15.6699V32.4999C25.1824 32.9099 24.8424 33.2499 24.4324 33.2499Z"
                    fill="black"
                  />
                </svg>
              </button>
            </div>
          </div>
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
        /* Style for clickable news links */
        .message-content .news-link {
          color: #e2af19;
          text-decoration: underline;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .message-content .news-link:hover {
          color: #f7b410;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
