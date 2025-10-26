// src/app/dashboard/layout.tsx - UPDATED: Added back button and Pulse by Lumen title for News Chat
"use client";

import { useSelector } from "react-redux";
import { useState, createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { ArrowLeft } from "lucide-react";

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
  const router = useRouter();

  const { isLoading, allComponentsLoaded } = useUnifiedDashboard();

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
  const isNewsChatPage = pathname === "/dashboard/news-chat";
  const isSwapPage = pathname === "/dashboard/swap";
  const isCodeLensPage = pathname === "/dashboard/coin-lens";
  const isNewsFeedPage = pathname === "/dashboard/news-feed";
  const isDashboardPage = pathname === "/dashboard";

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

  // Function to open AI Chat history
  const handleAIChatHistoryClick = () => {
    if (typeof window !== "undefined" && (window as any).openAIChatHistory) {
      (window as any).openAIChatHistory();
    }
  };

  // Handle back navigation for News Chat
  const handleNewsChatBack = () => {
    router.back();
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
                className="fixed inset-0 bg-black/60 z-[60] lg:hidden"
                onClick={handleMobileSidebarClose}
              />

              {/* Mobile Sidebar */}
              <div className="fixed inset-y-0 left-0 w-64 z-[70] lg:hidden">
                <Sidebar
                  isMobile={true}
                  onItemClick={handleMobileSidebarClose}
                />
              </div>
            </>
          )}

          <main
            className={`flex-1 overflow-hidden min-w-0 min-h-0 flex flex-col relative ${
              isSwapPage
                ? "p-0 pb-0 lg:pb-0"
                : isAIChatPage || isNewsChatPage
                ? "p-0 lg:p-2 lg:px-4 pb-0 lg:pb-2"
                : isDashboardPage
                ? "p-0 lg:p-2 lg:px-4 pb-0 lg:pb-0"
                : "p-2 sm:p-3 lg:p-2 px-2 sm:px-3 lg:px-4 pb-0 lg:pb-2"
            } ${isSwapPage ? "lg:overflow-auto" : ""}`}
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
              {/* Mobile-only header for Dashboard */}
              {isDashboardPage && (
                <div className="lg:hidden flex items-center justify-between p-4 bg-[#000000] flex-shrink-0">
                  <div className="flex items-center gap-3">
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

                  <div id="mobile-wallet-menu-trigger"></div>
                </div>
              )}

              {/* Mobile-only header for AI Chat */}
              {isAIChatPage && (
                <div className="lg:hidden flex items-center justify-between p-4 bg-[#000000] flex-shrink-0">
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

                  <button
                    onClick={handleAIChatHistoryClick}
                    className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                    title="Chat history"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="25"
                      viewBox="0 0 35 35"
                      fill="none"
                    >
                      <path
                        d="M22.8506 22.0802L18.3415 19.3893C17.556 18.9238 16.916 17.8038 16.916 16.8875V10.9238"
                        stroke="#E2AF19"
                        strokeWidth="1.81818"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.81729 8.72834C3.99911 11.1574 2.9082 14.1829 2.9082 17.4556C2.9082 25.4847 9.42457 32.0011 17.4537 32.0011C25.4827 32.0011 31.9991 25.4847 31.9991 17.4556C31.9991 9.42652 25.4827 2.91016 17.4537 2.91016C15.3737 2.91016 13.3809 3.34652 11.5918 4.14652"
                        stroke="#E2AF19"
                        strokeWidth="1.81818"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Mobile-only header for News Chat - WITH BACK BUTTON */}
              {isNewsChatPage && (
                <div className="lg:hidden flex items-center justify-between p-4 bg-[#000000] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleNewsChatBack}
                      className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                      title="Go back"
                    >
                      <ArrowLeft size={20} className="text-[#E2AF19]" />
                    </button>
                    <div>
                      <h2>
                        <span className="text-[28px] font-mayeka-demi-bold-demo font-bold bg-gradient-to-r from-[#F5E4B2] to-[#E2AF19] bg-clip-text text-transparent">
                          Pulse
                        </span>
                        <span className="text-[12px] font-mayeka-demi-bold-demo font-normal bg-gradient-to-r from-[#F5E4B2] to-[#E2AF19] bg-clip-text text-transparent align-text-bottom ml-1.5">
                          by Lumen
                        </span>
                      </h2>
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop-only header for News Chat - WITH BACK BUTTON */}
              {isNewsChatPage && (
                <div className="hidden lg:flex items-center justify-between p-4 bg-[#000000] flex-shrink-0 rounded-[16px] lg:rounded-[20px]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleNewsChatBack}
                      className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
                      title="Go back"
                    >
                      <ArrowLeft size={20} className="text-[#E2AF19]" />
                    </button>
                    <div>
                      <h2>
                        <span className="text-[35px] font-mayeka-demi-bold-demo font-bold bg-gradient-to-r from-[#F5E4B2] to-[#E2AF19] bg-clip-text text-transparent">
                          Pulse
                        </span>
                        <span className="text-[14px] font-mayeka-demi-bold-demo font-normal bg-gradient-to-r from-[#F5E4B2] to-[#E2AF19] bg-clip-text text-transparent align-text-bottom ml-2">
                          by Lumen
                        </span>
                      </h2>
                    </div>
                  </div>
                </div>
              )}

              {/* Swap page mobile header - Fixed and overlay */}
              {isSwapPage && (
                <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-[#000000]/95 backdrop-blur-md flex-shrink-0 border-b border-[#2C2C2C]/50">
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

              {/* GlobalDashboardHeader - HIDE on News Chat page */}
              {!isSwapPage && !isNewsChatPage && (
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
                  isAIChatPage || isNewsChatPage || isDashboardPage
                    ? "p-0 mt-0"
                    : ""
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
