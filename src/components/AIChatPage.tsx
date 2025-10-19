// src/components/AIChatPage.tsx - FIXED MOBILE LAYOUT
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
  X,
  MoreHorizontal,
  Trash2,
  Star,
  Edit3,
} from "lucide-react";
import { RootState } from "@/store";

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
  isStarred?: boolean;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationLoaded, setCurrentConversationLoaded] =
    useState(false);

  // New states for menu functionality
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [loadingConversationId, setLoadingConversationId] = useState<
    string | null
  >(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Mobile history sidebar state
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  // Suggestion chips data with display text and actual query
  const suggestionChips = [
    { display: "Tell me about UNI", query: "Tell me about UNI" },
    { display: "Is BONK safe to invert", query: "Is BONK safe to invert" },
    {
      display: "Do Reploy as honey pot alert",
      query: "Do Reploy as honey pot alert",
    },
    {
      display: "Get market data of 0x51...86CA",
      query: "Get market data of 0x514910771AF9Ca656af840dff83E8264EcF986CA",
    },
    {
      display: "Perform chat analysis for PEPE",
      query: "Perform chat analysis for PEPE",
    },
    {
      display: "What are closest support levels of WBTC",
      query: "What are closest support levels of WBTC",
    },
    {
      display: "Is it right time to buy LINK",
      query: "Is it right time to buy LINK",
    },
    { display: "Compare PEPE and BONK", query: "Compare PEPE and BONK" },
    {
      display: "Analyze this wallet 0xEDe....236F",
      query: "Analyze this wallet 0xEDe9937Bc032d0D403d15E844a67fd4F726B236F",
    },
    {
      display: "List the top trades on 0xEDe....236F",
      query:
        "List the top trades on 0xEDe9937Bc032d0D403d15E844a67fd4F726B236F",
    },
    { display: "Tell me about yourself", query: "Tell me about yourself" },
    { display: "Gas fees prediction", query: "Gas fees prediction" },
  ];

  // Get authenticated user from Redux
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    // Check if browser supports speech recognition
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

          // Only get the final results to avoid duplicates
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            }
          }

          // Only update if we have final transcript
          if (finalTranscript) {
            setInputMessage((prev) => prev + finalTranscript);
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("❌ Speech recognition error:", event.error);
          setIsListening(false);

          if (event.error === "not-allowed") {
            console.log(
              "Microphone access denied. Please allow microphone access."
            );
          } else if (event.error === "no-speech") {
            console.log("No speech detected. Please try again.");
          } else {
            console.log("Voice recognition error. Please try again.");
          }
          setTimeout(() => console.log(null), 3000);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
          console.log("🎤 Voice recognition ended");
          // Focus input after speech recognition ends
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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Check if click is outside all menus
      if (!target.closest(".conversation-menu")) {
        setOpenMenuId(null);
      }
    }

    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openMenuId]);

  // Initialize AI chat - ONLY ONCE
  useEffect(() => {
    let isMounted = true;

    const initializeAI = async () => {
      if (!isAuthenticated || !user) {
        setError("Please log in to use Lumen AI");
        return;
      }

      try {
        console.log("🤖 Initializing Lumen AI for user:", user.id);

        // Load user's conversations
        const response = await fetch("/api/ai/user", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load user data");
        }

        const userData = await response.json();

        if (isMounted) {
          if (userData.conversations && userData.conversations.length > 0) {
            const formattedConversations = userData.conversations.map(
              (conv: any) => ({
                id: conv.conversation_id,
                title: conv.title || "New Conversation",
                messages: [],
                lastMessage: conv.title || "",
                timestamp: conv.last_updated || new Date().toISOString(),
                messageCount: conv.message_count || 0,
                createdAt: conv.created_at || new Date().toISOString(),
                isStarred: conv.isStarred || false,
              })
            );
            setConversations(formattedConversations);
            console.log(
              "📚 Loaded",
              formattedConversations.length,
              "conversations"
            );
          }

          setIsInitialized(true);
          console.log("✅ Lumen AI initialized for user:", user.id);
        }
      } catch (error: any) {
        console.error("❌ Failed to initialize AI chat:", error);
        if (isMounted) {
          setError("Failed to initialize Lumen AI");
        }
      }
    };

    initializeAI();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

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
      setCurrentConversationLoaded(false);
      setIsTyping(false);
      // Focus input after clearing
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
      console.log("🤖 Sending message to AI:", currentInput);

      const response = await fetch("/api/chat", {
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
      console.log("📦 AI Response received:", data);

      // FIXED: Only set conversation ID once per conversation
      if (data.conversationId && !conversationId) {
        console.log("📝 Setting conversation ID:", data.conversationId);
        setConversationId(data.conversationId);
        setCurrentConversationLoaded(true);

        // Add to conversations list only if not already there
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === data.conversationId);
          if (!exists) {
            return [
              {
                id: data.conversationId,
                title:
                  currentInput.substring(0, 50) +
                  (currentInput.length > 50 ? "..." : ""),
                messages: [],
                lastMessage: currentInput,
                timestamp: new Date().toISOString(),
                messageCount: 1,
                createdAt: new Date().toISOString(),
                isStarred: false,
              },
              ...prev,
            ];
          }
          return prev;
        });
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
      // Focus input after response is complete
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

  const copyMessage = async (content: string, messageId: string) => {
    try {
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
      setMobileHistoryOpen(false);
      return;
    }

    setLoadingConversationId(selectedSessionId);

    try {
      const response = await fetch(
        `/api/ai/conversation?conversationId=${selectedSessionId}`,
        { credentials: "include" }
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
          setCurrentConversationLoaded(true);
          setActiveTab("chat");
          setMobileHistoryOpen(false);
        }
      } else {
        throw new Error("Failed to load conversation");
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setError("Failed to load conversation");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoadingConversationId(null);
    }
  };

  const handleNewChat = async () => {
    setMessages([]);
    setConversationId("");
    setCurrentConversationLoaded(false);
    setActiveTab("chat");
    setMobileHistoryOpen(false);
    console.log(
      "🆕 Starting new chat - conversation will be created on first message"
    );
  };

  // Menu action handlers with real API calls
  const toggleStar = async (conversationId: string) => {
    try {
      // Optimistically update UI
      const conversation = conversations.find((c) => c.id === conversationId);
      const newStarredState = !conversation?.isStarred;

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, isStarred: newStarredState }
            : conv
        )
      );

      // Make API call to update star status
      const response = await fetch(`/api/ai/conversation/star`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId,
          isStarred: newStarredState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update star status");
      }

      console.log(
        `⭐ ${
          newStarredState ? "Starred" : "Unstarred"
        } conversation: ${conversationId}`
      );
    } catch (error) {
      console.error("Failed to toggle star:", error);

      // Revert optimistic update on error
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, isStarred: !conv.isStarred }
            : conv
        )
      );

      // Show error to user
      setError("Failed to update star status");
      setTimeout(() => setError(null), 3000);
    } finally {
      setOpenMenuId(null);
    }
  };

  const startRename = (conversationId: string, currentTitle: string) => {
    setEditingId(conversationId);
    setEditingTitle(currentTitle);
    setOpenMenuId(null);
  };

  const handleRename = async (conversationId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      setEditingTitle("");
      return;
    }

    const newTitle = editingTitle.trim();
    const originalTitle = conversations.find(
      (c) => c.id === conversationId
    )?.title;

    // Set loading state
    setRenamingId(conversationId);

    try {
      // Optimistically update UI
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, title: newTitle } : conv
        )
      );

      // Make API call to update title
      const response = await fetch(`/api/ai/conversation/rename`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId,
          title: newTitle,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename conversation");
      }

      console.log(`✏️ Renamed conversation ${conversationId} to: ${newTitle}`);
    } catch (error) {
      console.error("Failed to rename conversation:", error);

      // Revert optimistic update on error
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, title: originalTitle || "New Conversation" }
            : conv
        )
      );

      // Show error to user
      setError("Failed to rename conversation");
      setTimeout(() => setError(null), 3000);
    } finally {
      setRenamingId(null);
      setEditingId(null);
      setEditingTitle("");
    }
  };

  const deleteConversation = async (conversationIdToDelete: string) => {
    // Show confirmation dialog
    if (
      !window.confirm(
        "Are you sure you want to delete this conversation? This action cannot be undone."
      )
    ) {
      setOpenMenuId(null);
      return;
    }

    try {
      // Optimistically update UI
      const conversationToDelete = conversations.find(
        (c) => c.id === conversationIdToDelete
      );
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationIdToDelete)
      );

      // If deleting current conversation, start new chat
      if (conversationIdToDelete === conversationId) {
        handleNewChat();
      }

      // Make API call to delete conversation
      const response = await fetch(`/api/ai/conversation/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId: conversationIdToDelete,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      console.log(`🗑️ Deleted conversation: ${conversationIdToDelete}`);
    } catch (error) {
      console.error("Failed to delete conversation:", error);

      // Revert optimistic update on error - add the conversation back
      if (conversationToDelete) {
        setConversations((prev) => [conversationToDelete, ...prev]);
      }

      // Show error to user
      setError("Failed to delete conversation");
      setTimeout(() => setError(null), 3000);
    } finally {
      setOpenMenuId(null);
    }
  };

  const formatMessage = (content: string) => {
    // First apply basic markdown formatting
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

    // Remove markdown link syntax [text](url) and replace with just the URL
    // This will be processed by the URL button logic below
    formatted = formatted.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, text, url) => {
        // Add protocol if missing
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        return ` ${fullUrl} `;
      }
    );

    // Transform URLs into clickable buttons
    // More strict: Must have protocol OR be a clear domain with TLD
    formatted = formatted.replace(
      /(?:^|\s)((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)(?=\s|$|<br>)/g,
      (match, url, offset) => {
        const leadingSpace = match[0] === " " ? " " : "";

        // Skip if it's part of an email address
        if (formatted[offset - 1] === "@") {
          return match;
        }

        // Add protocol if missing
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;

        try {
          const urlObj = new URL(fullUrl);
          let buttonText = "";

          // Special handling for social media
          if (
            urlObj.hostname.includes("twitter.com") ||
            urlObj.hostname.includes("x.com")
          ) {
            const pathParts = urlObj.pathname.split("/").filter((p) => p);
            buttonText = pathParts[0] ? `@${pathParts[0]}` : "Twitter";
          } else if (
            urlObj.hostname.includes("t.me") ||
            urlObj.hostname.includes("telegram.")
          ) {
            const pathParts = urlObj.pathname.split("/").filter((p) => p);
            buttonText = pathParts[0] ? `@${pathParts[0]}` : "Telegram";
          } else {
            buttonText = urlObj.hostname.replace("www.", "");
          }

          return `${leadingSpace}<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="url-button">${buttonText}</a>`;
        } catch {
          return match;
        }
      }
    );

    // Apply line breaks last
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  };

  const handleChipClick = (chip: { display: string; query: string }) => {
    setInputMessage(chip.query);
    // Focus the input after setting the message
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const showWelcomeScreen = messages.length === 0;
  const sidebarOpen = activeTab === "history";

  return (
    <div className="h-full relative bg-[#000000] flex">
      {/* Overlay Background */}
      <div
        className="fixed bottom-0 right-0 w-[1600px] h-[1600px] bg-no-repeat bg-contain bg-bottom-right pointer-events-none z-0"
        style={{
          backgroundImage: "url(/aiChatGrade.png)",
          backgroundPosition: "bottom right",
        }}
      />

      {/* Overlay for mobile when history sidebar is open */}
      {mobileHistoryOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setMobileHistoryOpen(false)}
        />
      )}

      {/* Desktop overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="hidden lg:block fixed inset-0 bg-black/20 z-30"
          onClick={() => setActiveTab("chat")}
        />
      )}

      {/* Main Chat Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarOpen ? "lg:mr-80" : ""
        }`}
      >
        {/* Mobile Header - Only visible on mobile */}
        <div className="lg:hidden flex-shrink-0 bg-[#000000] px-4 py-3">
          <div className="flex items-center justify-center relative mt-2">
            <button
              onClick={() => setMobileHistoryOpen(!mobileHistoryOpen)}
              className="absolute right-0 p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
              aria-label="Open chat history"
            >
              <div className="flex flex-col gap-[3px]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="29"
                  height="4"
                  viewBox="0 0 29 4"
                  fill="none"
                >
                  <path
                    d="M2 2H27.3521"
                    stroke="white"
                    strokeWidth="2.11268"
                    strokeLinecap="round"
                  />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="3"
                  viewBox="0 0 21 3"
                  fill="none"
                >
                  <path
                    d="M2 1.63379H19"
                    stroke="white"
                    strokeWidth="2.11268"
                    strokeLinecap="round"
                  />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="3"
                  viewBox="0 0 15 3"
                  fill="none"
                >
                  <path
                    d="M2 1.26758H13"
                    stroke="white"
                    strokeWidth="2.11268"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </button>
          </div>

          {/* Error Display - Mobile */}
          {error && (
            <div className="mt-2 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                <p className="text-yellow-400 text-xs font-satoshi">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Top Navigation Tabs */}
        <div className="hidden lg:block flex-shrink-0 bg-[#000000] px-4 py-3">
          <div className="flex justify-center">
            <div className="flex rounded-[16px] p-1 gap-[24px]">
              <button
                onClick={() => setActiveTab("chat")}
                className={`text-[24px] font-mayeka font-medium transition-all ${
                  activeTab === "chat"
                    ? "text-white border-b border-b-[#E7BC3F]"
                    : "text-[#6E6E6E]"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`text-[24px] font-mayeka font-medium transition-all ${
                  activeTab === "history"
                    ? "text-white border-b border-b-[#E7BC3F]"
                    : "text-[#6E6E6E]"
                }`}
              >
                History
              </button>
            </div>
          </div>

          {/* Error Display - Desktop */}
          {error && (
            <div className="mt-2 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                <p className="text-yellow-400 text-xs font-satoshi">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Messages or Welcome Screen - FIXED FOR MOBILE */}
        <div className="flex-1 min-h-0 px-4 pb-4 lg:pb-4 mb-[140px] lg:mb-0 overflow-hidden">
          {showWelcomeScreen ? (
            /* Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center overflow-y-auto scrollbar-hide">
              <h1 className="text-[24px] lg:text-[35px] font-mayeka-demi-bold-demo font-bold mb-3 lg:mb-10 text-center bg-gradient-to-r from-[#F5E4B2] to-[#E2AF19] bg-clip-text text-transparent px-4">
                Chat with Lumen
              </h1>

              {/* Mobile suggestion chips - right below title */}
              <div className="lg:hidden w-full px-3 mt-8">
                <div className="flex flex-wrap justify-center gap-1.5">
                  {suggestionChips.map((chip, index) => (
                    <button
                      key={index}
                      onClick={() => handleChipClick(chip)}
                      className="px-2 py-1 text-white text-[10px] font-satoshi rounded-[10px] border border-[#4B3A08] hover:border-[#E2AF19] transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      disabled={isTyping || !isInitialized}
                    >
                      {chip.display}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop suggestion chips - only visible on desktop */}
              <div className="hidden lg:block w-full max-w-2xl mx-auto mb-10 lg:mb-16">
                <div className="flex flex-wrap justify-center gap-1.5 lg:gap-2 px-2 lg:px-4">
                  {suggestionChips.map((chip, index) => (
                    <button
                      key={index}
                      onClick={() => handleChipClick(chip)}
                      className="px-2 lg:px-3 py-1 lg:py-1.5 text-white text-[10px] lg:text-xs font-satoshi rounded-[10px] lg:rounded-[12px] border border-[#4B3A08] hover:border-[#E2AF19] transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      disabled={isTyping || !isInitialized}
                    >
                      {chip.display}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="h-full overflow-y-auto scrollbar-hide">
              <div className="py-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex flex-col space-y-2">
                    {message.type === "assistant" ? (
                      <div className="flex flex-col items-start space-y-2">
                        {message.processing && !message.content ? (
                          <div className="max-w-4xl bg-black/40 backdrop-blur-md p-3 lg:p-4 rounded-xl">
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
                          </div>
                        ) : (
                          <div className="max-w-4xl bg-black/40 backdrop-blur-md p-3 lg:p-4 rounded-xl border border-[#F9EFD1]/30">
                            <div className="text-[#F9EFD1] text-xs lg:text-sm leading-relaxed font-satoshi">
                              <div
                                className="message-content"
                                dangerouslySetInnerHTML={{
                                  __html: formatMessage(message.content),
                                }}
                              />
                              {message.typing && (
                                <span className="inline-block w-2 h-4 bg-[#E2AF19] animate-pulse ml-1" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <div className="bg-[#F9EFD1] text-black p-3 lg:p-4 max-w-2xl rounded-xl rounded-tr-none">
                          <p className="text-xs lg:text-sm">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input - FIXED ABOVE MOBILE NAV */}
        <div className="flex-shrink-0 p-3 lg:p-4 fixed lg:relative bottom-[80px] lg:bottom-0 left-0 right-0 bg-[#000000] lg:bg-transparent z-10">
          <div className="relative max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isInitialized ? "Type your message" : "Initializing AI..."
              }
              className="w-full bg-black text-white placeholder-gray-400 resize-none focus:outline-none pr-24 lg:pr-36 pl-3 lg:pl-4 py-2.5 lg:py-3 min-h-[44px] lg:min-h-[48px] max-h-32 text-xs lg:text-sm border border-[#71570C] focus:border-[#E2AF19] transition-colors rounded-[100px] disabled:opacity-50"
              rows={1}
              disabled={isTyping || !isInitialized}
            />
            <div className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 lg:gap-2">
              {/* Microphone Icon */}
              <button
                onClick={toggleMicrophone}
                className={`p-1 lg:p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50 ${
                  isListening ? "bg-red-500/20" : ""
                }`}
                disabled={isTyping || !isInitialized}
                title={isListening ? "Stop recording" : "Start voice input"}
              >
                {isListening ? (
                  <div className="relative">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      className="lg:w-[25px] lg:h-[25px]"
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
                    {/* Pulsing animation indicator */}
                    <span className="absolute -top-1 -right-1 flex h-2 w-2 lg:h-3 lg:w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 lg:h-3 lg:w-3 bg-red-500"></span>
                    </span>
                  </div>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    className="lg:w-[25px] lg:h-[25px]"
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
                disabled={!inputMessage.trim() || isTyping || !isInitialized}
                className="bg-[#E2AF19] hover:bg-[#D4A853] disabled:opacity-50 text-black rounded-full w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  className="lg:w-[40px] lg:h-[40px]"
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

      {/* Mobile History Sidebar - Keeping as is */}
      <div
        className={`lg:hidden fixed right-0 top-0 h-full z-40 transform transition-all duration-300 ease-in-out ${
          mobileHistoryOpen
            ? "translate-x-0 w-80 opacity-100"
            : "translate-x-full w-80 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col bg-black/95 backdrop-blur-md border-l border-[#2C2C2C]">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C] flex-shrink-0">
            <h2 className="text-white text-lg font-satoshi font-medium">
              Chat History
            </h2>
            <button
              onClick={() => setMobileHistoryOpen(false)}
              className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Scrollable Chat History */}
          <div className="flex-1 px-6 pt-4 overflow-y-auto scrollbar-hide pb-4 min-h-0">
            <div className="mb-4">
              <span className="text-gray-300 text-sm font-satoshi font-medium">
                Recent
              </span>
            </div>

            <div className="space-y-2">
              {/* Current Session */}
              {messages.length > 0 &&
                conversationId &&
                currentConversationLoaded && (
                  <div className="p-3 rounded-xl bg-[#E2AF19]/10 border border-[#E2AF19]/20 cursor-pointer hover:bg-[#E2AF19]/15 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {(() => {
                          const currentConv = conversations.find(
                            (conv) => conv.id === conversationId
                          );
                          return (
                            <>
                              {currentConv?.isStarred && (
                                <Star
                                  size={12}
                                  className="text-[#E2AF19] fill-current flex-shrink-0"
                                />
                              )}
                              <span className="text-white text-sm font-medium line-clamp-1">
                                {currentConv?.title || "Current Chat"}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

              {/* Saved Conversations */}
              {conversations
                .filter((conv) => conv.id !== conversationId)
                .sort((a, b) => {
                  if (a.isStarred && !b.isStarred) return -1;
                  if (!a.isStarred && b.isStarred) return 1;
                  return (
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                  );
                })
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    className="relative p-2 rounded-xl cursor-pointer group transition-all hover:bg-[#2C2C2C]/30"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex-1 min-w-0 pr-2"
                        onClick={() =>
                          !loadingConversationId &&
                          handleSessionSelect(conversation.id)
                        }
                      >
                        {editingId === conversation.id ? (
                          <div className="flex items-center gap-2 w-full">
                            {renamingId === conversation.id ? (
                              <div className="flex items-center gap-2 w-full">
                                <RefreshCw
                                  size={12}
                                  className="text-[#E2AF19] animate-spin flex-shrink-0"
                                />
                                <span className="text-gray-300 text-sm font-medium">
                                  Saving...
                                </span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) =>
                                  setEditingTitle(e.target.value)
                                }
                                onBlur={() => {
                                  if (!renamingId) {
                                    handleRename(conversation.id);
                                  }
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter" && !renamingId) {
                                    handleRename(conversation.id);
                                  }
                                  if (e.key === "Escape" && !renamingId) {
                                    setEditingId(null);
                                    setEditingTitle("");
                                  }
                                }}
                                disabled={!!renamingId}
                                autoFocus
                                className="w-full bg-[#2C2C2C] text-white text-sm rounded px-2 py-1 outline-none border border-[#E2AF19] disabled:opacity-50"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {loadingConversationId === conversation.id ? (
                              <>
                                <span className="text-gray-300 text-sm font-medium line-clamp-1">
                                  Loading...
                                </span>
                              </>
                            ) : (
                              <>
                                {conversation.isStarred && (
                                  <Star
                                    size={12}
                                    className="text-[#E2AF19] fill-current flex-shrink-0"
                                  />
                                )}
                                <span className="text-gray-300 text-sm font-medium line-clamp-1">
                                  {conversation.title}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Three-dot menu */}
                      <div className="relative conversation-menu">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!loadingConversationId) {
                              setOpenMenuId(
                                openMenuId === conversation.id
                                  ? null
                                  : conversation.id
                              );
                            }
                          }}
                          disabled={!!loadingConversationId}
                          className="p-1 hover:bg-[#2C2C2C] rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
                        >
                          <MoreHorizontal size={16} className="text-gray-400" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === conversation.id &&
                          !loadingConversationId && (
                            <div
                              className="absolute right-0 top-8 bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg shadow-lg min-w-[160px] z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStar(conversation.id);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2C2C2C] transition-colors flex items-center gap-2"
                              >
                                <Star
                                  size={14}
                                  className={
                                    conversation.isStarred
                                      ? "text-[#E2AF19] fill-current"
                                      : "text-gray-400"
                                  }
                                />
                                {conversation.isStarred ? "Unstar" : "Star"}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRename(
                                    conversation.id,
                                    conversation.title
                                  );
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2C2C2C] transition-colors flex items-center gap-2"
                              >
                                <Edit3 size={14} className="text-gray-400" />
                                Rename
                              </button>

                              <div className="border-t border-[#2C2C2C] my-1" />

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConversation(conversation.id);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#2C2C2C] transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={14} className="text-red-400" />
                                Delete
                              </button>
                            </div>
                          )}
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

          {/* New Chat Button - Fixed at bottom above bottom nav */}
          <div className="flex-shrink-0 p-4 border-t border-[#2C2C2C] bg-black/95 pb-24">
            <button
              onClick={handleNewChat}
              className="w-full text-[#E2AF19] px-3 py-1.5 rounded-[300px] border border-[#71570C] text-[18px] font-satoshi font-medium transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              disabled={isTyping}
            >
              <div className="p-1 bg-[#E2AF19] rounded-[100px]">
                <Plus color="#000" size={12} />
              </div>
              <span>New Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Right Sidebar - History */}
      <div
        className={`hidden lg:block fixed lg:absolute right-0 top-0 h-full z-40 transform transition-all duration-300 ease-in-out ${
          sidebarOpen
            ? "translate-x-0 w-80 opacity-100"
            : "translate-x-full lg:translate-x-full w-80 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col bg-black/20 backdrop-blur-md lg:rounded-[30px] border border-[#2C2C2C] lg:m-2 lg:h-[calc(100%-16px)]">
          {/* Close button for desktop */}
          <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
            <h2 className="text-white text-lg font-satoshi font-medium">
              Chat History
            </h2>
            <button
              onClick={() => setActiveTab("chat")}
              className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Scrollable Chat History */}
          <div className="flex-1 px-6 pt-4 overflow-y-auto scrollbar-hide pb-20">
            <div className="mb-4">
              <span className="text-gray-300 text-sm font-satoshi font-medium">
                Recent
              </span>
            </div>

            <div className="space-y-2">
              {/* Current Session - only show if we have messages AND a conversation ID */}
              {messages.length > 0 &&
                conversationId &&
                currentConversationLoaded && (
                  <div className="p-3 rounded-xl bg-[#E2AF19]/10 border border-[#E2AF19]/20 cursor-pointer hover:bg-[#E2AF19]/15 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {(() => {
                          const currentConv = conversations.find(
                            (conv) => conv.id === conversationId
                          );
                          return (
                            <>
                              {currentConv?.isStarred && (
                                <Star
                                  size={12}
                                  className="text-[#E2AF19] fill-current flex-shrink-0"
                                />
                              )}
                              <span className="text-white text-sm font-medium line-clamp-1">
                                {currentConv?.title || "Current Chat"}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

              {/* Saved Conversations - filter out current conversation */}
              {conversations
                .filter((conv) => conv.id !== conversationId)
                .sort((a, b) => {
                  // Starred conversations come first
                  if (a.isStarred && !b.isStarred) return -1;
                  if (!a.isStarred && b.isStarred) return 1;
                  // If both starred or both not starred, sort by timestamp (most recent first)
                  return (
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                  );
                })
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    className="relative p-2 rounded-xl cursor-pointer group transition-all hover:bg-[#2C2C2C]/30"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex-1 min-w-0 pr-2"
                        onClick={() =>
                          !loadingConversationId &&
                          handleSessionSelect(conversation.id)
                        }
                      >
                        {editingId === conversation.id ? (
                          <div className="flex items-center gap-2 w-full">
                            {renamingId === conversation.id ? (
                              <div className="flex items-center gap-2 w-full">
                                <RefreshCw
                                  size={12}
                                  className="text-[#E2AF19] animate-spin flex-shrink-0"
                                />
                                <span className="text-gray-300 text-sm font-medium">
                                  Saving...
                                </span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) =>
                                  setEditingTitle(e.target.value)
                                }
                                onBlur={() => {
                                  if (!renamingId) {
                                    handleRename(conversation.id);
                                  }
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter" && !renamingId) {
                                    handleRename(conversation.id);
                                  }
                                  if (e.key === "Escape" && !renamingId) {
                                    setEditingId(null);
                                    setEditingTitle("");
                                  }
                                }}
                                disabled={!!renamingId}
                                autoFocus
                                className="w-full bg-[#2C2C2C] text-white text-sm rounded px-2 py-1 outline-none border border-[#E2AF19] disabled:opacity-50"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {loadingConversationId === conversation.id ? (
                              <>
                                <span className="text-gray-300 text-sm font-medium line-clamp-1">
                                  Loading...
                                </span>
                              </>
                            ) : (
                              <>
                                {conversation.isStarred && (
                                  <Star
                                    size={12}
                                    className="text-[#E2AF19] fill-current flex-shrink-0"
                                  />
                                )}
                                <span className="text-gray-300 text-sm font-medium line-clamp-1">
                                  {conversation.title}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Three-dot menu */}
                      <div className="relative conversation-menu">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!loadingConversationId) {
                              setOpenMenuId(
                                openMenuId === conversation.id
                                  ? null
                                  : conversation.id
                              );
                            }
                          }}
                          disabled={!!loadingConversationId}
                          className="p-1 hover:bg-[#2C2C2C] rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
                        >
                          <MoreHorizontal size={16} className="text-gray-400" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === conversation.id &&
                          !loadingConversationId && (
                            <div
                              className="absolute right-0 top-8 bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg shadow-lg min-w-[160px] z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStar(conversation.id);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2C2C2C] transition-colors flex items-center gap-2"
                              >
                                <Star
                                  size={14}
                                  className={
                                    conversation.isStarred
                                      ? "text-[#E2AF19] fill-current"
                                      : "text-gray-400"
                                  }
                                />
                                {conversation.isStarred ? "Unstar" : "Star"}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRename(
                                    conversation.id,
                                    conversation.title
                                  );
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2C2C2C] transition-colors flex items-center gap-2"
                              >
                                <Edit3 size={14} className="text-gray-400" />
                                Rename
                              </button>

                              <div className="border-t border-[#2C2C2C] my-1" />

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConversation(conversation.id);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#2C2C2C] transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={14} className="text-red-400" />
                                Delete
                              </button>
                            </div>
                          )}
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

          {/* New Chat Button - Fixed at bottom */}
          <div className="flex-shrink-0 p-4">
            <button
              onClick={handleNewChat}
              className="mx-auto text-[#E2AF19] px-3 py-1.5 rounded-[300px] border border-[#71570C] text-[18px] font-satoshi font-medium transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              disabled={isTyping}
            >
              <div className="p-1 bg-[#E2AF19] rounded-[100px]">
                <Plus color="#000" size={12} />
              </div>
              <span>New Chat</span>
            </button>
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
        .message-content .url-button {
          display: inline-flex;
          align-items: center;
          background: #e2af19;
          color: #000000;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.85em;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
          margin: 2px 4px;
        }
        .message-content .url-button:hover {
          background: #d4a853;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(226, 175, 25, 0.3);
        }
        .message-content .url-button:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
