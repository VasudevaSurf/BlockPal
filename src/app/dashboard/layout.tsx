"use client";

import { useSelector } from "react-redux";
import { useState } from "react";
import { RootState } from "@/store";
import Sidebar from "@/components/dashboard/Sidebar";
import WalletSelector from "@/components/dashboard/WalletSelector";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { walletSelectorOpen } = useSelector((state: RootState) => state.ui);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen bg-[#0F0F0F] flex flex-col lg:flex-row p-2 sm:p-3 lg:p-5 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-black rounded-[16px] mb-3 border border-[#2C2C2C]">
        <div className="flex items-center">
          <img
            src="/blockName.png"
            alt="Blockpal"
            className="h-6 brightness-110"
          />
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
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
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
      <main className="flex-1 lg:ml-5 overflow-hidden min-w-0 min-h-0">
        {children}
      </main>

      {walletSelectorOpen && <WalletSelector />}

      <style jsx global>{`
        /* Hide scrollbars globally for this layout */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Ensure proper mobile behavior */
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
      `}</style>
    </div>
  );
}
