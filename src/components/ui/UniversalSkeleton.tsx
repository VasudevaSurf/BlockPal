// src/components/ui/UniversalSkeleton.tsx - With animated shimmer effect
"use client";

import React from "react";

/**
 * Universal Skeleton System
 *
 * This is a centralized skeleton system for the entire dashboard.
 * Features:
 * - Clean black design with consistent borders
 * - Synchronized loading for all components
 * - Animated shimmer effect for visual feedback
 * - Responsive layout matching actual components
 */

// Base skeleton component with animated shimmer effect
interface SkeletonProps {
  className?: string;
  variant?: "default" | "rounded" | "circular";
}

function Skeleton({ className = "", variant = "default" }: SkeletonProps) {
  const variantClasses = {
    default: "rounded",
    rounded: "rounded-lg",
    circular: "rounded-full",
  };

  return (
    <div
      className={`bg-[#1A1A1A] relative overflow-hidden ${variantClasses[variant]} ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[#2C2C2C] to-transparent" />
    </div>
  );
}

// Card wrapper component
function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] p-3 lg:p-4">
      {children}
    </div>
  );
}

// Dashboard Skeleton - Matches exact dashboard layout
export function DashboardSkeleton() {
  return (
    <>
      <div className="h-full bg-[#000000] flex flex-col overflow-hidden">
        {/* Mobile Layout */}
        <div className="flex xl:hidden flex-col gap-3 lg:gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-20 lg:pb-2">
          <WalletBalanceSkeleton />
          <TokenListSkeleton />
        </div>

        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-4 flex-1 min-h-0">
          <div className="flex-1 flex flex-col gap-4 min-w-0 max-w-[68%]">
            <WalletBalanceSkeleton />
            <TokenListSkeleton />
          </div>
          <div className="w-[32%] min-w-[360px] max-w-[440px] flex-shrink-0 h-full">
            <SwapSectionSkeleton />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </>
  );
}

// Wallet Balance Skeleton
export function WalletBalanceSkeleton() {
  return (
    <>
      <SkeletonCard>
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-56" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton variant="rounded" className="h-6 w-16" />
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-44" />
        </div>

        {/* Balance Display */}
        <div className="space-y-2">
          <Skeleton className="h-8 lg:h-9 w-40 lg:w-48 mb-2" />
          <Skeleton className="h-6 w-32 mb-3 lg:mb-0" />

          {/* Mobile Address - Below balance */}
          <div className="lg:hidden flex items-center gap-2 mt-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton variant="rounded" className="h-6 w-16" />
          </div>
        </div>
      </SkeletonCard>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </>
  );
}

// Token List Skeleton
export function TokenListSkeleton() {
  return (
    <SkeletonCard>
      {/* Tabs Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>

      {/* Token List */}
      <div className="space-y-2 pr-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2.5 rounded-lg border border-[#2C2C2C]"
          >
            <div className="flex items-center flex-1 min-w-0">
              <Skeleton
                variant="circular"
                className="w-10 h-10 mr-2.5 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-24 mb-1.5" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-4 w-20 mb-1.5" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

// Swap Section Skeleton
export function SwapSectionSkeleton() {
  return (
    <>
      <div className="space-y-3 lg:space-y-4 h-full flex flex-col">
        {/* Trending Tokens Box */}
        <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] flex-1 flex flex-col p-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-40" />
          </div>

          {/* Divider */}
          <div className="border-t border-[#2C2C2C] mb-3"></div>

          {/* Token List */}
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5"
              >
                <div className="flex items-center gap-2.5 w-28">
                  <Skeleton
                    variant="circular"
                    className="w-7 h-7 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </div>
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-20 h-7" />
                <Skeleton className="w-16 h-3" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Gainers Box */}
        <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] flex-1 flex flex-col p-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-40" />
          </div>

          {/* Table Header */}
          <div className="flex items-center justify-between py-2 border-b border-[#2C2C2C] mb-2">
            <Skeleton className="w-[100px] h-3" />
            <Skeleton className="w-[80px] h-3" />
            <Skeleton className="w-[100px] h-3" />
            <Skeleton className="w-[60px] h-3" />
          </div>

          {/* Token List */}
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5"
              >
                <div className="flex items-center gap-2.5 w-[100px]">
                  <Skeleton
                    variant="circular"
                    className="w-6 h-6 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </div>
                <Skeleton className="w-[80px] h-3" />
                <Skeleton className="w-[100px] h-3" />
                <Skeleton className="w-[60px] h-3" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </>
  );
}

// Export individual components for use in other contexts
export { Skeleton, SkeletonCard };
