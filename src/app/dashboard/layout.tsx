// src/app/dashboard/layout.tsx - UPDATED TO ALWAYS SHOW HEADER
"use client";

import { useSelector } from "react-redux";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { RootState } from "@/store";
import Sidebar from "@/components/dashboard/Sidebar";
import WalletSelector from "@/components/dashboard/WalletSelector";
import GlobalPaymentExecutor from "@/components/payments/GlobalPaymentExecutor";
import NavigationLoadingIndicator from "@/components/ui/NavigationLoadingIndicator";
import GlobalDashboardHeader from "@/components/dashboard/GlobalDashboardHeader";
import { NavigationLoadingProvider } from "@/contexts/NavigationLoadingContext";
import { Menu, X } from "lucide-react";
import PaymentAcknowledgments from "@/components/payments/PaymentAcknowledgments";

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

  return (
    <NavigationLoadingProvider>
      <div className="h-screen bg-[#0F0F0F] flex flex-col lg:flex-row p-2 sm:p-3 lg:p-5 overflow-hidden">
        {/* Navigation Loading Indicator */}
        <NavigationLoadingIndicator />

        {/* Mobile Header - Always show */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-black rounded-[16px] mb-3 border border-[#2C2C2C]">
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

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden min-w-0 min-h-0 flex flex-col">
          {/* Global Header - Always show */}
          <div className="flex-shrink-0 bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] sm:p-4 lg:p-5">
            <GlobalDashboardHeader
              title={isAIChatPage ? "Lumen AI" : "Dashboard"}
              subtitle={
                isAIChatPage
                  ? "Powered by advanced blockchain analysis"
                  : "Welcome back"
              }
            />
          </div>

          {/* Content Area */}
          <div
            className={`flex-1 min-h-0 overflow-hidden ${
              isAIChatPage ? "p-0 mt-0" : ""
            }`}
          >
            {children}
          </div>
        </main>

        {/* Global Payment Executor - Floating Button */}
        <GlobalPaymentExecutor />
        <PaymentAcknowledgments />

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
    </NavigationLoadingProvider>
  );
}
