// src/utils/walletCleanup.ts - ENHANCED with cookie clearing
"use client";

/**
 * Clears all wallet connection data from browser storage
 */
export function clearWalletConnection() {
  if (typeof window === "undefined") return;

  console.log("🧹 Clearing wallet connection data");

  const wagmiKeys = [
    "wagmi.store",
    "wagmi.connected",
    "wagmi.wallet",
    "wagmi.recentConnectorId",
    "wagmi.injected.shimDisconnect",
    "wagmi.cache",
    "wagmi.connectedRdns",
  ];

  wagmiKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key}:`, error);
    }
  });

  try {
    const allLocalStorageKeys = Object.keys(localStorage);
    allLocalStorageKeys.forEach((key) => {
      if (
        key.startsWith("wagmi.") ||
        key.startsWith("walletconnect") ||
        key.startsWith("WALLETCONNECT_") ||
        key.startsWith("wc@2:") ||
        key.startsWith("wc@1:") ||
        key.toLowerCase().includes("rainbow")
      ) {
        localStorage.removeItem(key);
      }
    });

    const allSessionStorageKeys = Object.keys(sessionStorage);
    allSessionStorageKeys.forEach((key) => {
      if (
        key.startsWith("wagmi.") ||
        key.startsWith("walletconnect") ||
        key.startsWith("WALLETCONNECT_") ||
        key.startsWith("wc@2:") ||
        key.startsWith("wc@1:")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Failed to clear wallet connection keys:", error);
  }

  console.log("✅ Wallet connection data cleared");
}

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

/**
 * Complete cleanup - clears everything including cookies
 */
export function performCompleteCleanup() {
  console.log("🧹 Performing complete cleanup");
  clearWalletConnection();
  clearBlockpalData();
  clearAuthCookie(); // ✅ NEW
  console.log("✅ Complete cleanup finished");
}
