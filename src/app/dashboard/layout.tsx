// src/app/dashboard/layout.tsx - FIXED padding issue for swap page
"use client";

import { useSelector } from "react-redux";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { RootState } from "@/store";
import Sidebar from "@/components/dashboard/Sidebar";
import WalletSelector from "@/components/dashboard/WalletSelector";
import NavigationLoadingIndicator from "@/components/ui/NavigationLoadingIndicator";
import GlobalDashboardHeader from "@/components/dashboard/GlobalDashboardHeader";
import WalletIntegration from "@/components/dashboard/WalletIntegration";
import { NavigationLoadingProvider } from "@/contexts/NavigationLoadingContext";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { walletSelectorOpen } = useSelector((state: RootState) => state.ui);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Check if we're on AI chat page for special styling
  const isAIChatPage = pathname === "/dashboard/ai-chat";
  // Check if we're on Swap page to show the effect and hide header
  const isSwapPage = pathname === "/dashboard/swap";

  return (
    <NavigationLoadingProvider>
      <WalletIntegration>
        <div className="h-screen bg-[#000000] flex flex-col lg:flex-row overflow-hidden relative">
          {/* Navigation Loading Indicator */}
          <NavigationLoadingIndicator />

          {/* Mobile Header - Always show */}
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

          {/* Main Content - Conditional padding based on page */}
          <main
            className={`flex-1 overflow-hidden min-w-0 min-h-0 flex flex-col ${
              isSwapPage ? "p-0" : "p-2 sm:p-3 lg:p-2 px-2 sm:px-3 lg:px-4"
            }`}
          >
            {/* Global Header - Hide on swap page */}
            {!isSwapPage && (
              <div className="flex-shrink-0 bg-[#000000] rounded-[16px] lg:rounded-[20px] sm:px-4 lg:px-5 sm:py-1 lg:py-2">
                <GlobalDashboardHeader
                  title={isAIChatPage ? "Chat with Lumen" : "Dashboard"}
                  subtitle={
                    isAIChatPage
                      ? "Powered by advanced blockchain analysis"
                      : "Welcome back"
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
      </WalletIntegration>
    </NavigationLoadingProvider>
  );
}
