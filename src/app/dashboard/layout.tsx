// src/app/dashboard/layout.tsx - UPDATED: Added mobile sidebar support
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
import {
  UnifiedDashboardProvider,
  useUnifiedDashboard,
} from "@/contexts/UnifiedDashboardContext";
import { WalletDataProvider } from "@/contexts/WalletDataContext";
import { CoinLensLoadingProvider } from "@/contexts/CoinLensLoadingContext";
import { NewsFeedLoadingProvider } from "@/contexts/NewsFeedLoadingContext";
import BlockPalLoader from "@/components/ui/BlockPalLoader";
import StylishMenuIcon from "@/components/icons/StylishMenuIcon";

// CodeLens Context
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

// News Feed Context
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

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { walletSelectorOpen } = useSelector((state: RootState) => state.ui);
  const pathname = usePathname();

  const { isLoading, allComponentsLoaded } = useUnifiedDashboard();

  const [isNewsChatActive, setIsNewsChatActive] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [codeLensSearchQuery, setCodeLensSearchQuery] = useState("");
  const [codeLensAddTokenHandler, setCodeLensAddTokenHandler] = useState<
    () => void
  >(() => () => {});

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

  const isAIChatPage = pathname === "/dashboard/ai-chat";
  const isSwapPage = pathname === "/dashboard/swap";
  const isCodeLensPage = pathname === "/dashboard/coin-lens";
  const isNewsFeedPage = pathname === "/dashboard/news-feed";
  const isDashboardPage = pathname === "/dashboard";

  useEffect(() => {
    const checkNewsChatState = () => {
      const isActive =
        document.body.getAttribute("data-news-chat-active") === "true";
      setIsNewsChatActive(isActive);
    };

    checkNewsChatState();

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

  const handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
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
          <NavigationLoadingIndicator />

          {/* Desktop Sidebar - Always visible on desktop */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                onClick={handleMobileSidebarClose}
              />

              {/* Mobile Sidebar */}
              <div className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
                <Sidebar 
                  isMobile={true} 
                  onItemClick={handleMobileSidebarClose}
                />
              </div>
            </>
          )}

          <main
            className={`flex-1 overflow-hidden min-w-0 min-h-0 flex flex-col relative ${
              isSwapPage || isNewsChatActive
                ? "p-0 pb-0 lg:pb-0"
                : isAIChatPage
                ? "p-0 lg:p-2 lg:px-4 pb-0 lg:pb-2"
                : isDashboardPage
                ? "p-0 lg:p-2 lg:px-4 pb-0 lg:pb-2"
                : "p-2 sm:p-3 lg:p-2 px-2 sm:px-3 lg:px-4 pb-0 lg:pb-2"
            }`}
          >
            {/* Show loader only over main content area when loading */}
            {isLoading && isDashboardPage && (
              <div className="absolute inset-0 z-[9999]">
                <BlockPalLoader loadingText="Loading Dashboard" />
              </div>
            )}

            {/* Main content with fade transition */}
            <div
              className={`flex-1 flex flex-col min-h-0 transition-opacity duration-300 ${
                isDashboardPage
                  ? allComponentsLoaded
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                  : "opacity-100"
              }`}
            >
              {/* Mobile-only header for Dashboard - TWO hamburgers (left for sidebar, right for wallet menu) */}
              {isDashboardPage && (
                <div className="lg:hidden flex items-center justify-between p-4 bg-[#000000] border-b border-[#2C2C2C] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {/* LEFT Hamburger - Opens Sidebar */}
                    <button
                      onClick={handleMobileMenuToggle}
                      className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                      title="Open menu"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="20"
                        viewBox="0 0 29 20"
                        fill="none"
                      >
                        <path
                          d="M2 2H27.3521"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                        <path
                          d="M2 10H19"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                        <path
                          d="M2 18H13"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <h1 className="text-white text-lg font-mayeka font-semibold">
                      Dashboard
                    </h1>
                  </div>
                  
                  {/* RIGHT Hamburger - Opens Mobile Wallet Menu (passed from dashboard page) */}
                  <div id="mobile-wallet-menu-trigger"></div>
                </div>
              )}

              {/* Mobile-only header for AI Chat - hamburger on LEFT */}
              {isAIChatPage && (
                <div className="lg:hidden flex items-center justify-between p-4 bg-[#000000] border-b border-[#2C2C2C] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMobileMenuToggle}
                      className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                      title="Open menu"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="20"
                        viewBox="0 0 29 20"
                        fill="none"
                      >
                        <path
                          d="M2 2H27.3521"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                        <path
                          d="M2 10H19"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                        <path
                          d="M2 18H13"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <h1 className="text-white text-lg font-mayeka font-semibold">
                      Lumen AI
                    </h1>
                  </div>
                </div>
              )}

              {/* Swap page mobile header */}
              {isSwapPage && (
                <div className="lg:hidden flex items-center justify-between p-4 bg-[#000000] border-b border-[#2C2C2C] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMobileMenuToggle}
                      className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                      title="Open menu"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="20"
                        viewBox="0 0 29 20"
                        fill="none"
                      >
                        <path
                          d="M2 2H27.3521"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                        <path
                          d="M2 10H19"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                        <path
                          d="M2 18H13"
                          stroke="white"
                          strokeWidth="2.11268"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <h1 className="text-white text-lg font-mayeka font-semibold">
                      Swap
                    </h1>
                  </div>
                </div>
              )}

              {!isSwapPage && !isNewsChatActive && (
                <div
                  className={`flex-shrink-0 bg-[#000000] rounded-[16px] lg:rounded-[20px] sm:px-4 lg:px-5 sm:py-1 lg:py-2 ${
                    isAIChatPage || isDashboardPage ? "hidden lg:block" : ""
                  }`}
                >
                  <GlobalDashboardHeader
                    title={isAIChatPage ? "Chat with Lumen" : "Dashboard"}
                    subtitle={
                      isAIChatPage
                        ? "Powered by advanced blockchain analysis"
                        : "Welcome back"
                    }
                    onSearchChange={
                      isCodeLensPage ? handleCodeLensSearchChange : undefined
                    }
                    onAddTokenClick={
                      isCodeLensPage ? handleCodeLensAddToken : undefined
                    }
                    searchQuery={
                      isCodeLensPage ? codeLensSearchQuery : undefined
                    }
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
                    onMobileMenuToggle={handleMobileMenuToggle}
                  />
                </div>
              )}

              <div
                className={`flex-1 min-h-0 overflow-hidden ${
                  isAIChatPage || isDashboardPage ? "p-0 mt-0" : ""
                }`}
              >
                {children}
              </div>
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

            .modal-backdrop-blur {
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
            }

            .backdrop-blur-xs {
              backdrop-filter: blur(2px);
              -webkit-backdrop-filter: blur(2px);
            }

            .modal-container {
              z-index: 9999;
            }

            body.modal-open {
              overflow: hidden;
            }
          `}</style>
        </div>
      </NewsFeedContext.Provider>
    </CodeLensContext.Provider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCodeLensPage = pathname === "/dashboard/coin-lens";
  const isNewsFeedPage = pathname === "/dashboard/news-feed";

  return (
    <NavigationLoadingProvider>
      <WalletIntegration>
        <WalletDataProvider>
          <UnifiedDashboardProvider>
            {isCodeLensPage ? (
              <CoinLensLoadingProvider>
                <DashboardLayoutContent>{children}</DashboardLayoutContent>
              </CoinLensLoadingProvider>
            ) : isNewsFeedPage ? (
              <NewsFeedLoadingProvider>
                <DashboardLayoutContent>{children}</DashboardLayoutContent>
              </NewsFeedLoadingProvider>
            ) : (
              <DashboardLayoutContent>{children}</DashboardLayoutContent>
            )}
          </UnifiedDashboardProvider>
        </WalletDataProvider>
      </WalletIntegration>
    </NavigationLoadingProvider>
  );
}