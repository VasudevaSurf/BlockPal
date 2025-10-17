// src/components/ui/UniversalSkeleton.tsx - With News Feed Skeleton
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

// AI Chat Skeleton
export function AIChatSkeleton() {
  return (
    <>
      <div className="h-full bg-[#000000] flex flex-col">
        {/* Empty chat area - completely blank */}
        <div className="flex-1"></div>

        {/* Input Area at bottom - matches exact input styling */}
        <div className="flex-shrink-0 p-3 lg:p-4">
          <div className="relative max-w-4xl mx-auto">
            <Skeleton className="w-full h-[44px] lg:h-[48px] rounded-[100px]" />
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

// News Feed Skeleton - Simple and subtle
export function NewsFeedSkeleton() {
  return (
    <>
      <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[14px] p-1.5 sm:p-2 lg:p-2.5 flex flex-col overflow-hidden">
        <div className="flex-1 bg-black rounded-[14px] overflow-hidden flex flex-col">
          {/* News Feed Items */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-[#2C2C2C] p-4"
              >
                <div className="flex gap-6 h-full">
                  {/* Image Skeleton */}
                  <Skeleton className="flex-shrink-0 w-[140px] h-[100px] rounded-[20px]" />

                  {/* Content Skeleton */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    {/* Title */}
                    <div className="space-y-2 mb-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5 mb-3">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>

                    {/* Footer - Author, Date, Tickers */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-2.5 w-20" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-2.5 w-24" />
                        <Skeleton variant="circular" className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
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
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}

// CoinLens Skeleton
export function CoinLensSkeleton() {
  return (
    <>
      <div className="h-full bg-[#000000] rounded-[16px] p-2 sm:p-4 flex flex-col overflow-hidden">
        {/* Token List Table */}
        <div className="flex-1 bg-[#000000] rounded-2xl border border-[#2C2C2C] overflow-hidden flex flex-col">
          {/* Table Header - Desktop Only (No skeleton, renders normally) */}
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr_1.2fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 bg-[#191919] text-gray-400 text-sm font-satoshi font-medium">
            <div className="flex items-center">Token</div>
            <div className="flex items-center justify-center">Price</div>
            <div className="flex items-center justify-center">24h</div>
            <div className="flex items-center justify-center">24h Volume</div>
            <div className="flex items-center justify-center">Market Cap</div>
            <div className="flex items-center justify-center">Liquidity</div>
            <div className="flex items-center justify-center">Buys</div>
            <div className="flex items-center justify-center">Sells</div>
            <div className="flex items-center justify-center">Actions</div>
          </div>

          {/* Table Body - Skeleton Rows */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {/* Desktop View Skeletons */}
            <div className="hidden lg:block space-y-0">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr_1.2fr_0.8fr_0.8fr_0.5fr] gap-4 px-6 py-4 hover:bg-[#1A1A1A] transition-colors"
                >
                  {/* Token */}
                  <div className="flex items-center gap-3">
                    <Skeleton
                      variant="circular"
                      className="w-8 h-8 flex-shrink-0"
                    />
                    <div className="flex flex-col gap-1.5 flex-1">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-3.5 w-20" />
                  </div>

                  {/* 24h Change */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-3.5 w-16" />
                  </div>

                  {/* 24h Volume */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-3.5 w-16" />
                  </div>

                  {/* Market Cap */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-3.5 w-16" />
                  </div>

                  {/* Liquidity */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-3.5 w-16" />
                  </div>

                  {/* Buys */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-3.5 w-12" />
                  </div>

                  {/* Sells */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-3.5 w-12" />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center">
                    <Skeleton variant="circular" className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile View Skeletons */}
            <div className="lg:hidden space-y-0">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="border-b border-[#2C2C2C] hover:bg-[#1A1A1A] transition-colors"
                >
                  <div className="px-2 py-2 flex items-center gap-2">
                    {/* Left Side: Token Info */}
                    <div className="flex items-center gap-1.5 w-[80px] flex-shrink-0">
                      <Skeleton
                        variant="circular"
                        className="w-8 h-8 flex-shrink-0"
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-2.5 w-10" />
                      </div>
                    </div>

                    {/* Right Side: All Values */}
                    <div className="flex-1 min-w-0">
                      {/* First Row */}
                      <div className="flex items-center justify-end gap-2 mb-1.5">
                        <Skeleton className="h-3 w-16" />
                        <div className="flex items-center gap-0.5">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                      </div>

                      {/* Second Row */}
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-0.5">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Skeleton className="h-4 w-10" />
                          <Skeleton className="h-3 w-14" />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Skeleton
                      variant="circular"
                      className="w-3.5 h-3.5 flex-shrink-0"
                    />
                  </div>
                </div>
              ))}
            </div>
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
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}

// Export individual components for use in other contexts
export { Skeleton, SkeletonCard };
