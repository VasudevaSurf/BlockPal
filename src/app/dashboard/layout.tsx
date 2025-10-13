// src/app/dashboard/layout.tsx - UPDATED to remove padding when news chat is active
"use client";

import { useSelector } from "react-redux";
import { useState, createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { RootState } from "@/store";
import Sidebar from "@/components/dashboard/Sidebar";
import WalletSelector from "@/components/dashboard/WalletSelector";
import NavigationLoadingIndicator from "@/components/ui/NavigationLoadingIndicator";
import GlobalDashboardHeader from "@/components/dashboard/GlobalDashboardHeader";
import WalletIntegration from "@/components/dashboard/WalletIntegration";
import { NavigationLoadingProvider } from "@/contexts/NavigationLoadingContext";
import { Menu, X } from "lucide-react";

// Create context for CodeLens search
interface CodeLensContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddTokenClick: () => void;
  setOnAddTokenClick: (fn: () => void) => void;
}

const CodeLensContext = createContext<CodeLensContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
  onAddTokenClick: () => {},
  setOnAddTokenClick: () => {},
});

export const useCodeLensContext = () => useContext(CodeLensContext);

// Create context for News Feed
interface NewsFeedContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (query: string) => void;
  setOnSearch: (fn: (query: string) => void) => void;
  onClearSearch: () => void;
  setOnClearSearch: (fn: () => void) => void;
  onAIClick: () => void;
  setOnAIClick: (fn: () => void) => void;
}

const NewsFeedContext = createContext<NewsFeedContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
  onSearch: () => {},
  setOnSearch: () => {},
  onClearSearch: () => {},
  setOnClearSearch: () => {},
  onAIClick: () => {},
  setOnAIClick: () => {},
});

export const useNewsFeedContext = () => useContext(NewsFeedContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { walletSelectorOpen } = useSelector((state: RootState) => state.ui);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // State to track if news chat is active (to hide header)
  const [isNewsChatActive, setIsNewsChatActive] = useState(false);

  // CodeLens search state
  const [codeLensSearchQuery, setCodeLensSearchQuery] = useState("");
  const [codeLensAddTokenHandler, setCodeLensAddTokenHandler] = useState<
    () => void
  >(() => () => {});

  // News Feed state
  const [newsFeedSearchQuery, setNewsFeedSearchQuery] = useState("");
  const [newsFeedSearchHandler, setNewsFeedSearchHandler] = useState<
    (query: string) => void
  >(() => () => {});
  const [newsFeedClearHandler, setNewsFeedClearHandler] = useState<() => void>(
    () => () => {}
  );
  const [newsFeedAIHandler, setNewsFeedAIHandler] = useState<() => void>(
    () => () => {}
  );

  // Check if we're on AI chat page for special styling
  const isAIChatPage = pathname === "/dashboard/ai-chat";
  // Check if we're on Swap page to show the effect and hide header
  const isSwapPage = pathname === "/dashboard/swap";
  // Check if we're on CodeLens page
  const isCodeLensPage = pathname === "/dashboard/code-lens";
  // Check if we're on News Feed page
  const isNewsFeedPage = pathname === "/dashboard/news-feed";

  // Listen for news chat active state from body attribute
  useEffect(() => {
    const checkNewsChatState = () => {
      const isActive =
        document.body.getAttribute("data-news-chat-active") === "true";
      setIsNewsChatActive(isActive);
    };

    // Check immediately
    checkNewsChatState();

    // Set up a MutationObserver to watch for changes
    const observer = new MutationObserver(checkNewsChatState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-news-chat-active"],
    });

    return () => observer.disconnect();
  }, []);

  const handleCodeLensSearchChange = (query: string) => {
    setCodeLensSearchQuery(query);
  };

  const handleCodeLensAddToken = () => {
    codeLensAddTokenHandler();
  };

  const handleNewsFeedSearch = (query: string) => {
    newsFeedSearchHandler(query);
  };

  const handleNewsFeedClearSearch = () => {
    newsFeedClearHandler();
  };

  const handleNewsFeedAIClick = () => {
    newsFeedAIHandler();
  };

  return (
    <NavigationLoadingProvider>
      <WalletIntegration>
        <CodeLensContext.Provider
          value={{
            searchQuery: codeLensSearchQuery,
            setSearchQuery: setCodeLensSearchQuery,
            onAddTokenClick: codeLensAddTokenHandler,
            setOnAddTokenClick: setCodeLensAddTokenHandler,
          }}
        >
          <NewsFeedContext.Provider
            value={{
              searchQuery: newsFeedSearchQuery,
              setSearchQuery: setNewsFeedSearchQuery,
              onSearch: newsFeedSearchHandler,
              setOnSearch: setNewsFeedSearchHandler,
              onClearSearch: newsFeedClearHandler,
              setOnClearSearch: setNewsFeedClearHandler,
              onAIClick: newsFeedAIHandler,
              setOnAIClick: setNewsFeedAIHandler,
            }}
          >
            <div className="h-screen bg-[#000000] flex flex-col lg:flex-row overflow-hidden relative">
              {/* Navigation Loading Indicator */}
              <NavigationLoadingIndicator />

              {/* Mobile Header - Always show unless news chat is active */}
              {!isNewsChatActive && (
                <div className="lg:hidden flex items-center justify-between p-4 bg-black border-b border-[#2C2C2C]">
                  <div className="flex items-center">
                    <img
                      src="/blockName.png"
                      alt="Blockpal"
                      className="h-6 brightness-110"
                    />
                    {isAIChatPage && (
                      <div className="ml-3 flex items-center space-x-2">
                        <div className="w-1 h-4 bg-[#E2AF19] rounded-full"></div>
                        <span className="text-[#E2AF19] text-sm font-satoshi font-medium">
                          AI Chat
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 text-white hover:bg-[#2C2C2C] rounded-lg transition-colors"
                  >
                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>
                </div>
              )}

              {/* Mobile Sidebar Overlay */}
              {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50">
                  <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw]">
                    <Sidebar onItemClick={() => setMobileMenuOpen(false)} />
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full flex-1"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                </div>
              )}

              {/* Desktop Sidebar - No padding/margin */}
              <div className="hidden lg:block lg:h-full">
                <Sidebar />
              </div>

              {/* Main Content - FIXED: Remove padding when news chat is active */}
              <main
                className={`flex-1 overflow-hidden min-w-0 min-h-0 flex flex-col ${
                  isSwapPage || isNewsChatActive ? "p-0" : "p-2 sm:p-3 lg:p-2 px-2 sm:px-3 lg:px-4"
                }`}
              >
                {/* Global Header - Hide on swap page AND when news chat is active */}
                {!isSwapPage && !isNewsChatActive && (
                  <div className="flex-shrink-0 bg-[#000000] rounded-[16px] lg:rounded-[20px] sm:px-4 lg:px-5 sm:py-1 lg:py-2">
                    <GlobalDashboardHeader
                      title={isAIChatPage ? "Chat with Lumen" : "Dashboard"}
                      subtitle={
                        isAIChatPage
                          ? "Powered by advanced blockchain analysis"
                          : "Welcome back"
                      }
                      // CodeLens props
                      onSearchChange={
                        isCodeLensPage ? handleCodeLensSearchChange : undefined
                      }
                      onAddTokenClick={
                        isCodeLensPage ? handleCodeLensAddToken : undefined
                      }
                      searchQuery={
                        isCodeLensPage ? codeLensSearchQuery : undefined
                      }
                      // News Feed props
                      onNewsSearch={
                        isNewsFeedPage ? handleNewsFeedSearch : undefined
                      }
                      onNewsClearSearch={
                        isNewsFeedPage ? handleNewsFeedClearSearch : undefined
                      }
                      onNewsAIClick={
                        isNewsFeedPage ? handleNewsFeedAIClick : undefined
                      }
                      newsSearchQuery={
                        isNewsFeedPage ? newsFeedSearchQuery : undefined
                      }
                    />
                  </div>
                )}

                {/* Content Area */}
                <div
                  className={`flex-1 min-h-0 overflow-hidden ${
                    isAIChatPage ? "p-0 mt-0" : ""
                  }`}
                >
                  {children}
                </div>
              </main>

              {walletSelectorOpen && <WalletSelector />}

              <style jsx global>{`
                .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }

                @media (max-width: 1024px) {
                  html,
                  body {
                    overflow-x: hidden;
                  }
                }

                @media (min-width: 1024px) {
                  html,
                  body {
                    overflow: hidden;
                  }
                }

                /* Modal backdrop styles for subtle blurred background */
                .modal-backdrop-blur {
                  backdrop-filter: blur(4px);
                  -webkit-backdrop-filter: blur(4px);
                }

                /* Custom backdrop blur utilities */
                .backdrop-blur-xs {
                  backdrop-filter: blur(2px);
                  -webkit-backdrop-filter: blur(2px);
                }

                /* Ensure modals appear above everything */
                .modal-container {
                  z-index: 9999;
                }

                /* Prevent body scroll when modals are open */
                body.modal-open {
                  overflow: hidden;
                }
              `}</style>
            </div>
          </NewsFeedContext.Provider>
        </CodeLensContext.Provider>
      </WalletIntegration>
    </NavigationLoadingProvider>
  );
}