// src/lib/app-cleanup-service.ts
/**
 * Service to handle cleanup when switching users or logging out
 * Ensures no data leakage between user sessions
 */

import { store } from "@/store";
import { clearWalletState } from "@/store/slices/walletSlice";
import { resetUIState } from "@/store/slices/uiSlice";

class AppCleanupService {
  private static instance: AppCleanupService;
  private currentUserId: string | null = null;

  private constructor() {}

  static getInstance(): AppCleanupService {
    if (!AppCleanupService.instance) {
      AppCleanupService.instance = new AppCleanupService();
    }
    return AppCleanupService.instance;
  }

  /**
   * Set the current user and detect if user has changed
   */
  setCurrentUser(userId: string | null) {
    const previousUserId = this.currentUserId;
    this.currentUserId = userId;

    // If user changed (including logout), perform cleanup
    if (previousUserId && previousUserId !== userId) {
      console.log("👤 User changed, performing cleanup", {
        previousUser: previousUserId,
        newUser: userId,
      });
      this.performFullCleanup();
    }
  }

  /**
   * Perform full cleanup of all app state and storage
   */
  performFullCleanup() {
    console.log("🧹 Starting full app cleanup");

    // 1. Clear Redux state
    this.clearReduxState();

    // 2. Clear browser storage
    this.clearBrowserStorage();

    // 3. Clear service caches
    // this.clearServiceCaches();

    // 4. Stop any running intervals/timers
    this.stopBackgroundProcesses();

    // 5. Clear any in-memory caches
    this.clearMemoryCaches();

    console.log("✅ Full app cleanup completed");
  }

  /**
   * Clear Redux state
   */
  private clearReduxState() {
    console.log("🗑️ Clearing Redux state");

    // Dispatch cleanup actions
    store.dispatch(clearWalletState());
    store.dispatch(resetUIState());
  }

  /**
   * Clear browser storage (localStorage, sessionStorage, IndexedDB)
   */
  private clearBrowserStorage() {
    console.log("🗑️ Clearing browser storage");

    if (typeof window === "undefined") return;

    // Clear localStorage
    const localStorageKeys = [
      "activeWalletId",
      "auth-token",
      "dashboard-user-data",
      "dashboard-user-data-v2",
      "wallet-cache",
      "token-cache",
      "price-cache",
    ];

    localStorageKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear prefixed localStorage keys
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

    // Clear sessionStorage
    const sessionStorageKeys = [
      "walletNameOverrides",
      "tempWalletData",
      "dashboardState",
    ];

    sessionStorageKeys.forEach((key) => {
      sessionStorage.removeItem(key);
    });

    // Clear prefixed sessionStorage keys
    const allSessionKeys = Object.keys(sessionStorage);
    allSessionKeys.forEach((key) => {
      if (
        key.includes("wallet") ||
        key.includes("token") ||
        key.includes("dashboard") ||
        key.includes("cache") ||
        key.includes("temp")
      ) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear IndexedDB if exists
    this.clearIndexedDB();
  }

  /**
   * Clear IndexedDB databases
   */
  private async clearIndexedDB() {
    if (typeof window === "undefined" || !window.indexedDB) return;

    try {
      // Get all database names (if supported)
      const databases = await indexedDB.databases?.();
      if (databases) {
        for (const db of databases) {
          if (db.name && db.name.includes("blockpal")) {
            await indexedDB.deleteDatabase(db.name);
            console.log(`🗑️ Deleted IndexedDB: ${db.name}`);
          }
        }
      }
    } catch (error) {
      console.warn("Could not clear IndexedDB:", error);
    }
  }

  /**
   * Clear service caches
   */
  // private clearServiceCaches() {
  //   console.log("🗑️ Clearing service caches");

  //   // Clear dashboard service cache
  //   if (dashboardServiceV2) {
  //     // Clear all wallet data from dashboard service
  //     const walletsToClean = Array.from(
  //       { length: 10 },
  //       (_, i) => `0x${i.toString(16).padStart(40, "0")}`
  //     );

  //     walletsToClean.forEach((wallet) => {
  //       try {
  //         dashboardServiceV2.clearUserData(wallet);
  //       } catch (error) {
  //         // Ignore errors for non-existent wallets
  //       }
  //     });
  //   }

  //   // Clear browser caches if available
  //   this.clearBrowserCaches();
  // }

  /**
   * Clear browser caches (Service Worker, Cache API)
   */
  private async clearBrowserCaches() {
    if (typeof window === "undefined") return;

    // Clear Cache API
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            console.log(`🗑️ Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      } catch (error) {
        console.warn("Could not clear browser caches:", error);
      }
    }

    // Unregister service workers
    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => {
            console.log(`🗑️ Unregistering service worker`);
            return registration.unregister();
          })
        );
      } catch (error) {
        console.warn("Could not unregister service workers:", error);
      }
    }
  }

  /**
   * Stop background processes (intervals, timers, etc.)
   */
  private stopBackgroundProcesses() {
    console.log("⏹️ Stopping background processes");

    // Clear any global intervals/timeouts
    if (typeof window !== "undefined") {
      // Store original functions
      const originalSetInterval = window.setInterval;
      const originalSetTimeout = window.setTimeout;

      // Clear high-numbered intervals/timeouts (likely app-created)
      for (let i = 1; i < 10000; i++) {
        try {
          clearInterval(i);
          clearTimeout(i);
        } catch (e) {
          // Ignore errors
        }
      }
    }
  }

  /**
   * Clear in-memory caches
   */
  private clearMemoryCaches() {
    console.log("🗑️ Clearing memory caches");

    // Clear any global variables that might hold user data
    if (typeof window !== "undefined") {
      // Clear any custom properties on window
      const windowKeys = Object.keys(window);
      windowKeys.forEach((key) => {
        if (
          key.startsWith("__blockpal") ||
          key.startsWith("__wallet") ||
          key.startsWith("__cache")
        ) {
          try {
            delete (window as any)[key];
          } catch (e) {
            // Ignore errors
          }
        }
      });
    }
  }

  /**
   * Perform cleanup on logout
   */
  onLogout() {
    console.log("🚪 Performing logout cleanup");
    this.currentUserId = null;
    this.performFullCleanup();
  }

  /**
   * Perform cleanup on login (to ensure clean state)
   */
  onLogin(userId: string) {
    console.log("🔐 Performing login cleanup");

    // If there was a previous user, clean up first
    if (this.currentUserId && this.currentUserId !== userId) {
      this.performFullCleanup();
    }

    this.currentUserId = userId;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Verify no data leakage
   */
  verifyCleanState(): boolean {
    if (typeof window === "undefined") return true;

    const checks = {
      localStorage:
        Object.keys(localStorage).filter(
          (key) =>
            key.includes("wallet") ||
            key.includes("token") ||
            key.includes("dashboard")
        ).length === 0,
      sessionStorage:
        Object.keys(sessionStorage).filter(
          (key) =>
            key.includes("wallet") ||
            key.includes("token") ||
            key.includes("dashboard")
        ).length === 0,
      reduxState: store.getState().wallet.wallets.length === 0,
    };

    const isClean = Object.values(checks).every((check) => check === true);

    if (!isClean) {
      console.warn("⚠️ State not fully cleaned:", checks);
    }

    return isClean;
  }
}

// Export singleton instance
export const appCleanupService = AppCleanupService.getInstance();
