// src/components/wallet/WalletSetupFlow.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";

export default function WalletSetupFlow() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleWalletCreated = () => {
    // Redirect to dashboard after wallet is created
    router.push("/dashboard");
  };

  const handleClose = () => {
    // Go back to dashboard
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      {/* Use the same WalletWelcomeModal as the primary interface */}
      <WalletWelcomeModal
        isOpen={true}
        onClose={handleClose}
        userName={user?.displayName || user?.name || "User"}
        onWalletCreated={handleWalletCreated}
      />
    </div>
  );
}
