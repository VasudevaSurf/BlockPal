// src/utils/clearAuthCookie.ts - Utility to clear auth cookie from client side
"use client";

export function clearAuthCookie() {
  if (typeof document === "undefined") return;

  // Clear the auth-token cookie
  document.cookie =
    "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie =
    "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" +
    window.location.hostname;

  console.log("🍪 Auth cookie cleared");
}
