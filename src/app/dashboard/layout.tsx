"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Sidebar from "@/components/dashboard/Sidebar";
import WalletSelector from "@/components/dashboard/WalletSelector";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { walletSelectorOpen } = useSelector((state: RootState) => state.ui);

  return (
    <div className="h-screen bg-[#0F0F0F] flex p-5 overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-5 overflow-hidden min-w-0 min-h-0">
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

        /* Ensure no scrollbars appear */
        html,
        body {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
