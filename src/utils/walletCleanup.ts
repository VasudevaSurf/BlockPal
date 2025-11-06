// src/utils/walletCleanup.ts - ENHANCED with cookie clearing
"use client";

/**
 * Clears all wallet connection data from browser storage
 */
// src/utils/walletCleanup.ts - UPDATED FOR REOWN APPKIT
export const clearWalletConnection = () => {
  if (typeof window === "undefined") return;

  try {
    // Clear Reown AppKit storage
    localStorage.removeItem("wagmi.store");
    localStorage.removeItem("wagmi.cache");
    localStorage.removeItem("wagmi.recentConnectorId");
    localStorage.removeItem("reown.wallet");
    localStorage.removeItem("@w3m/connected_wallet_image_url");
    localStorage.removeItem("@w3m/connected_connector");

    // Clear Solana adapter storage
    localStorage.removeItem("solana.wallet");
    localStorage.removeItem("solanaAdapter.cache");

    // Clear any AppKit-specific keys
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.startsWith("@appkit") ||
        key.startsWith("@w3m") ||
        key.startsWith("wc@2")
      ) {
        localStorage.removeItem(key);
      }
    });

    console.log("✅ Cleared Reown AppKit wallet storage");
  } catch (error) {
    console.error("❌ Error clearing wallet storage:", error);
  }
};

export const performCompleteCleanup = () => {
  clearWalletConnection();

  // Additional cleanup if needed
  if (typeof window !== "undefined") {
    // Clear any session storage
    sessionStorage.clear();

    console.log("✅ Complete wallet cleanup performed");
  }
};

/**
 * Clears all Blockpal-specific data
 */
export function clearBlockpalData() {
  if (typeof window === "undefined") return;

  console.log("🧹 Clearing Blockpal-specific data");

  const blockpalKeys = [
    "activeWalletId",
    "auth-token",
    "dashboard-user-data",
    "dashboard-user-data-v2",
    "wallet-cache",
    "token-cache",
    "price-cache",
    "walletNameOverrides",
    "tempWalletData",
    "dashboardState",
    "coingecko_trending_cache",
    "coingecko_trending_cache_timestamp",
  ];

  blockpalKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key}:`, error);
    }
  });

  try {
    const allLocalKeys = Object.keys(localStorage);
    allLocalKeys.forEach((key) => {
      if (
        key.startsWith("wallet-") ||
        key.startsWith("token-") ||
        key.startsWith("blockpal-") ||
        key.startsWith("dashboard-") ||
        key.startsWith("cache-") ||
        key.startsWith("realtime-") ||
        key.startsWith("user-")
      ) {
        localStorage.removeItem(key);
      }
    });

    const allSessionKeys = Object.keys(sessionStorage);
    allSessionKeys.forEach((key) => {
      if (
        key.startsWith("wallet-") ||
        key.startsWith("token-") ||
        key.startsWith("blockpal-") ||
        key.startsWith("dashboard-") ||
        key.startsWith("cache-") ||
        key.startsWith("temp-") ||
        key.startsWith("realtime-")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Failed to clear Blockpal data:", error);
  }

  console.log("✅ Blockpal data cleared");
}

/**
 * ✅ NEW: Clear auth cookie
 */
export function clearAuthCookie() {
  if (typeof document === "undefined") return;

  document.cookie =
    "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie =
    "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" +
    window.location.hostname;

  console.log("🍪 Auth cookie cleared");
}
