// src/components/wallet/WalletRefreshButton.tsx
"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RefreshCw } from "lucide-react";
import { AppDispatch, RootState } from "@/store";
import {
  fetchWalletTokens,
  updateWalletBalance,
} from "@/store/slices/walletSlice";

export default function WalletRefreshButton() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeWallet, loading } = useSelector(
    (state: RootState) => state.wallet
  );
  const [syncing, setSyncing] = useState(false);

  const handleRefresh = async () => {
    if (!activeWallet?.address || syncing) return;

    setSyncing(true);
    try {
      // Sync wallet tokens from blockchain
      const response = await fetch("/api/wallets/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      if (response.ok) {
        // Refresh the local data
        dispatch(fetchWalletTokens(activeWallet.address));
        dispatch(updateWalletBalance(activeWallet.address));
        console.log("✅ Wallet synced successfully");
      } else {
        console.error("❌ Failed to sync wallet");
      }
    } catch (error) {
      console.error("❌ Error syncing wallet:", error);
    } finally {
      setSyncing(false);
    }
  };

  if (!activeWallet) return null;

  return (
    <button
      onClick={handleRefresh}
      disabled={syncing || loading}
      className="p-2 text-gray-400 hover:text-white hover:bg-[#2C2C2C] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Refresh wallet data from blockchain"
    >
      <RefreshCw
        size={16}
        className={`lg:w-5 lg:h-5 ${syncing ? "animate-spin" : ""}`}
      />
    </button>
  );
}
