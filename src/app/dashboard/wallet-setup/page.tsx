// src/app/dashboard/wallet-setup/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import WalletSetupFlow from "@/components/wallet/WalletSetupFlow";

export default function WalletSetup() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  return <WalletSetupFlow />;
}
