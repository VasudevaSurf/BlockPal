// src/components/NewsChatPage.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

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
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Suggestion chips for news-related queries
  const suggestionChips = [
    {
      display: "Get the latest news on BTC",
      query: "Get the latest news on BTC?",
    },
    {
      display: "List today's trending news",
      query: "List today's trending news?",
    },
    {
      display: "Any bearish news about SOL",
      query: "Any bearish news about SOL?",
    },
    {
      display: "Summarize the news report",
      query: "Summarize the news report",
    },
    {
      display: "What the market mood today",
      query: "What the market mood today?",
    },
    {
      display: "Which news effecting the ETH price drop",
      query: "Which news effecting the ETH price drop",
    },
  ];

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = "en-US";

        recognitionInstance.onstart = () => {
          setIsListening(true);
          console.log("🎤 Voice recognition started");
        };

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            }
          }

          if (finalTranscript) {
            setInputMessage((prev) => prev + finalTranscript);
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("❌ Speech recognition error:", event.error);
          setIsListening(false);

          if (event.error === "not-allowed") {
            setError(
              "Microphone access denied. Please allow microphone access."
            );
          } else if (event.error === "no-speech") {
            setError("No speech detected. Please try again.");
          } else {
            setError("Voice recognition error. Please try again.");
          }
          setTimeout(() => setError(null), 3000);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
          console.log("🎤 Voice recognition ended");
          if (inputRef.current) {
            inputRef.current.focus();
          }
        };

        setRecognition(recognitionInstance);
      } else {
        console.warn("⚠️ Speech recognition not supported in this browser");
      }
    }
  }, []);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const toggleMicrophone = () => {
    if (!recognition) {
      setError("Voice recognition is not supported in your browser");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        setError("Failed to start voice recognition");
        setTimeout(() => setError(null), 3000);
      }
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
    setError(null);

    // Handle clear command
    if (currentInput.toLowerCase().trim() === "clear") {
      setMessages([]);
      setConversationId("");
      setIsTyping(false);
      if (inputRef.current) {
        inputRef.current.focus();
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
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleChipClick = (chip: { display: string; query: string }) => {
    setInputMessage(chip.query);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const formatMessageContent = (content: string) => {
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

    formatted = formatted.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="news-link">$1</a>'
    );

    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  };

  const showWelcomeScreen = messages.length === 0;

  return (
    <div className="h-full relative bg-[#000000] flex overflow-hidden">
      {/* Background positioned to actual viewport edge using fixed positioning */}
      <div
        className="fixed bottom-0 right-0 w-[1600px] h-[1600px] pointer-events-none z-0"
        style={{
          backgroundImage: "url(/aiChatGrade.png)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          backgroundPosition: "100% 100%",
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          {showWelcomeScreen ? (
            /* Welcome Screen with Suggestion Chips */
            <div className="h-full flex flex-col items-center justify-center -mt-5">
              <h1 className="text-[35px] font-mayeka-demi-bold-demo font-bold mb-10 text-center bg-gradient-to-r from-[#F5E4B2] to-[#E2AF19] bg-clip-text text-transparent">
                News AI Chat
              </h1>

              <div className="w-full max-w-2xl mx-auto mb-16">
                <div className="flex flex-wrap justify-center gap-2 px-4">
                  {suggestionChips.map((chip, index) => (
                    <button
                      key={index}
                      onClick={() => handleChipClick(chip)}
                      className="px-3 py-1.5 text-white text-xs font-satoshi rounded-[12px] border border-[#4B3A08] hover:border-[#E2AF19] transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      disabled={isTyping}
                    >
                      {chip.display}
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
                      <div className="max-w-4xl bg-black/40 backdrop-blur-md p-4 rounded-xl border border-[#F9EFD1]/30">
                        {message.processing && !message.content ? (
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div
                                className="w-1 h-1 bg-[#E2AF19] rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-1 h-1 bg-[#E2AF19] rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-1 h-1 bg-[#E2AF19] rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
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
              {/* Microphone Icon */}
              <button
                onClick={toggleMicrophone}
                className={`p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50 ${
                  isListening ? "bg-red-500/20" : ""
                }`}
                disabled={isTyping}
                title={isListening ? "Stop recording" : "Start voice input"}
              >
                {isListening ? (
                  <div className="relative">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="25"
                      viewBox="0 0 31 30"
                      fill="none"
                    >
                      <path
                        d="M15.4324 20.3125C12.1574 20.3125 9.49487 17.65 9.49487 14.375V7.5C9.49487 4.225 12.1574 1.5625 15.4324 1.5625C18.7074 1.5625 21.3699 4.225 21.3699 7.5V14.375C21.3699 17.65 18.7074 20.3125 15.4324 20.3125ZM15.4324 3.4375C13.1949 3.4375 11.3699 5.2625 11.3699 7.5V14.375C11.3699 16.6125 13.1949 18.4375 15.4324 18.4375C17.6699 18.4375 19.4949 16.6125 19.4949 14.375V7.5C19.4949 5.2625 17.6699 3.4375 15.4324 3.4375Z"
                        fill="#EF4444"
                      />
                      <path
                        d="M15.4324 24.6875C9.64487 24.6875 4.93237 19.975 4.93237 14.1875V12.0625C4.93237 11.55 5.35737 11.125 5.86987 11.125C6.38237 11.125 6.80737 11.55 6.80737 12.0625V14.1875C6.80737 18.9375 10.6824 22.8125 15.4324 22.8125C20.1824 22.8125 24.0574 18.9375 24.0574 14.1875V12.0625C24.0574 11.55 24.4824 11.125 24.9949 11.125C25.5074 11.125 25.9324 11.55 25.9324 12.0625V14.1875C25.9324 19.975 21.2199 24.6875 15.4324 24.6875Z"
                        fill="#EF4444"
                      />
                      <path
                        d="M17.1698 8.97539C17.0698 8.97539 16.9573 8.96289 16.8448 8.92539C15.9323 8.58789 14.9323 8.58789 14.0198 8.92539C13.5323 9.10039 12.9948 8.85039 12.8198 8.36289C12.6448 7.87539 12.8948 7.33789 13.3823 7.16289C14.7073 6.68789 16.1698 6.68789 17.4948 7.16289C17.9823 7.33789 18.2323 7.87539 18.0573 8.36289C17.9073 8.73789 17.5448 8.97539 17.1698 8.97539Z"
                        fill="#EF4444"
                      />
                      <path
                        d="M16.4323 11.6254C16.3448 11.6254 16.2698 11.6129 16.1823 11.5879C15.6823 11.4504 15.1698 11.4504 14.6698 11.5879C14.1698 11.7254 13.6573 11.4254 13.5198 10.9254C13.3823 10.4379 13.6823 9.92539 14.1823 9.78789C14.9948 9.56289 15.8698 9.56289 16.6823 9.78789C17.1823 9.92539 17.4823 10.4379 17.3448 10.9379C17.2323 11.3504 16.8448 11.6254 16.4323 11.6254Z"
                        fill="#EF4444"
                      />
                      <path
                        d="M15.4324 28.4375C14.9199 28.4375 14.4949 28.0125 14.4949 27.5V23.75C14.4949 23.2375 14.9199 22.8125 15.4324 22.8125C15.9449 22.8125 16.3699 23.2375 16.3699 23.75V27.5C16.3699 28.0125 15.9449 28.4375 15.4324 28.4375Z"
                        fill="#EF4444"
                      />
                    </svg>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </div>
                ) : (
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
                )}
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
