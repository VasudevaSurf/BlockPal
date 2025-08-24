// src/components/auth/LogoutHandler.tsx - WALLET-FIRST AUTH LOGOUT
"use client";

import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { logoutUser } from "@/store/slices/authSlice";
import { SecureWalletStorage } from "@/lib/wallet-security";
import { LogOut } from "lucide-react";

interface LogoutHandlerProps {
  onLogoutStart?: () => void;
  onLogoutComplete?: () => void;
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export default function LogoutHandler({
  onLogoutStart,
  onLogoutComplete,
  className = "",
  showIcon = true,
  children,
}: LogoutHandlerProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const handleLogout = async () => {
    try {
      console.log("🚪 Starting wallet-based logout process");

      // Notify parent component
      if (onLogoutStart) {
        onLogoutStart();
      }

      // Clear all wallet credentials from localStorage
      SecureWalletStorage.clearWalletCredentials();

      // Dispatch logout action (this will also clear Redux state)
      await dispatch(logoutUser());

      // Clear any remaining browser data
      if (typeof window !== "undefined") {
        // Clear all localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();

        // Clear any cached data
        if ("caches" in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map((cacheName) => caches.delete(cacheName))
            );
          } catch (error) {
            console.warn("Could not clear browser caches:", error);
          }
        }
      }

      console.log("✅ Wallet-based logout completed");

      // Notify parent component
      if (onLogoutComplete) {
        onLogoutComplete();
      }

      // Redirect to auth page
      router.push("/auth");
    } catch (error) {
      console.error("❌ Error during logout:", error);

      // Even if logout fails, clear everything locally and redirect
      SecureWalletStorage.clearWalletCredentials();
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }

      if (onLogoutComplete) {
        onLogoutComplete();
      }

      router.push("/auth");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center transition-colors ${className}`}
      title="Sign out and clear wallet data"
    >
      {showIcon && <LogOut size={16} className="mr-2" />}
      {children || "Sign Out"}
    </button>
  );
}

// Export a simple logout function for use in other components
export const performLogout = async (router: any, dispatch: AppDispatch) => {
  try {
    console.log("🚪 Performing programmatic logout");

    // Clear wallet credentials
    SecureWalletStorage.clearWalletCredentials();

    // Dispatch logout action
    await dispatch(logoutUser());

    // Clear browser data
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }

    // Redirect
    router.push("/auth");
  } catch (error) {
    console.error("❌ Error in programmatic logout:", error);
    router.push("/auth");
  }
};

// Simple logout button component
export const LogoutButton = ({ className = "" }: { className?: string }) => (
  <LogoutHandler
    className={`text-gray-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-900/20 ${className}`}
    showIcon={true}
  >
    Sign Out
  </LogoutHandler>
);

// Logout menu item component
export const LogoutMenuItem = ({ onClick }: { onClick?: () => void }) => (
  <LogoutHandler
    className="w-full text-left px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
    showIcon={true}
    onLogoutStart={onClick}
  >
    Sign Out & Clear Wallet
  </LogoutHandler>
);
