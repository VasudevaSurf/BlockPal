// src/components/ui/NavigationLoadingIndicator.tsx
"use client";

import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { RefreshCw } from "lucide-react";

export default function NavigationLoadingIndicator() {
  const { isLoading } = useNavigationLoading();

  if (!isLoading) return null;

  return (
    <>
      {/* Top Loading Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-[#E2AF19] animate-pulse">
        <div
          className="h-full bg-[#E2AF19] animate-pulse"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(226, 175, 25, 0.8), transparent)",
            animation: "shimmer 1.5s infinite linear",
          }}
        />
      </div>

      {/* Full Screen Loading Overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-black/90 rounded-2xl p-6 border border-[#2C2C2C] flex flex-col items-center space-y-4">
          <RefreshCw size={32} className="text-[#E2AF19] animate-spin" />
          <div className="text-white font-satoshi text-lg">Loading...</div>
          <div className="text-gray-400 font-satoshi text-sm">
            Please wait while we load the page
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
