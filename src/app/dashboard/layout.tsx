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
      <main className="flex-1 ml-5 overflow-hidden">{children}</main>
      {walletSelectorOpen && <WalletSelector />}
    </div>
  );
}
