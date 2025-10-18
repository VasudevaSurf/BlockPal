// src/components/ui/Skeleton.tsx - Compact Version
import React from "react";
import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "rounded" | "circular";
  width?: string | number;
  height?: string | number;
  children?: React.ReactNode;
}

export function Skeleton({
  className,
  variant = "default",
  width,
  height,
  children,
}: SkeletonProps) {
  const baseStyles = "animate-pulse bg-[#2C2C2C]";

  const variantStyles = {
    default: "rounded",
    rounded: "rounded-lg",
    circular: "rounded-full",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={clsx(baseStyles, variantStyles[variant], className)}
      style={style}
    >
      {children}
    </div>
  );
}

// Card Skeleton Components
export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] p-3 lg:p-4">
      {children}
    </div>
  );
}

// Token List Skeleton (NO SCROLLING INDICATORS)
export function SkeletonTokenList() {
  return (
    <SkeletonCard>
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <Skeleton className="h-4 lg:h-5 w-32" />
        <Skeleton variant="circular" className="w-5 h-5" />
      </div>

      {/* Mobile Grid Layout Skeleton */}
      <div className="block sm:hidden">
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C]"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center">
                  <Skeleton variant="circular" className="w-6 h-6 mr-2.5" />
                  <div>
                    <Skeleton className="h-3 w-16 mb-0.5" />
                    <Skeleton className="h-2.5 w-12" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-3 w-12 mb-0.5" />
                  <Skeleton className="h-2.5 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop List Layout Skeleton */}
      <div className="hidden sm:block">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-lg"
            >
              <div className="flex items-center min-w-0 flex-1">
                <Skeleton
                  variant="circular"
                  className="w-6 h-6 sm:w-8 sm:h-8 mr-2.5"
                />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-20 mb-0.5" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-3 w-16 mb-0.5" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonCard>
  );
}

// Wallet Balance Skeleton (NO SCROLLING INDICATORS)
export function SkeletonWalletBalance() {
  return (
    <SkeletonCard>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
        <Skeleton className="h-4 lg:h-5 w-24" />
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton variant="rounded" className="h-5 w-10" />
        </div>
      </div>

      <div>
        <Skeleton className="h-6 sm:h-8 lg:h-10 w-40 mb-1.5" />
        <div className="flex items-center">
          <Skeleton className="h-3 w-12 mr-1.5" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </SkeletonCard>
  );
}

// Swap Section Skeleton (NO SCROLLING INDICATORS)
export function SkeletonSwapSection() {
  return (
    <SkeletonCard>
      <Skeleton className="h-4 lg:h-5 w-12 mb-3 lg:mb-4" />

      {/* Swap Form Skeleton */}
      <div className="relative mb-3 lg:mb-4">
        {/* Sell Section */}
        <div className="bg-black border border-[#2C2C2C] rounded-xl p-2.5 lg:p-3 h-24 sm:h-28 lg:h-32 mb-1.5">
          <div className="flex items-center justify-between mb-1.5 lg:mb-2">
            <Skeleton className="h-3 w-6" />
            <div className="flex items-center bg-[#0F0F0F] px-1.5 lg:px-2.5 py-1 lg:py-1.5 rounded-full">
              <Skeleton
                variant="circular"
                className="w-2.5 h-2.5 lg:w-3 lg:h-3 mr-1 lg:mr-1.5"
              />
              <Skeleton className="h-2.5 w-6 mr-1 lg:mr-1.5" />
              <Skeleton className="w-2 h-2 lg:w-2.5 lg:h-2.5" />
            </div>
          </div>
          <div className="flex items-start justify-between mb-1.5">
            <Skeleton className="h-5 lg:h-6 w-16" />
            <div className="text-right">
              <Skeleton className="h-3 w-10 mb-0.5" />
              <Skeleton variant="rounded" className="h-4 w-6" />
            </div>
          </div>
        </div>

        {/* Buy Section */}
        <div className="bg-black border border-[#2C2C2C] rounded-xl p-2.5 lg:p-3 h-24 sm:h-28 lg:h-32">
          <Skeleton className="h-3 w-6 mb-1.5 lg:mb-2" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 lg:h-6 w-16" />
            <Skeleton variant="rounded" className="h-6 w-20" />
          </div>
        </div>

        {/* Arrow Button */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 z-10"
          style={{ top: "calc(50% - 10px)" }}
        >
          <Skeleton className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg" />
        </div>
      </div>

      {/* Swap Button */}
      <Skeleton variant="rounded" className="w-full h-8 lg:h-10 mb-3 lg:mb-4" />

      {/* Info Section */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-2 lg:mb-3">
          <Skeleton
            variant="circular"
            className="w-4 h-4 lg:w-5 lg:h-5 mr-1.5"
          />
          <Skeleton className="h-4 lg:h-5 w-16" />
        </div>

        <div className="space-y-1.5 mb-4 lg:mb-6">
          <Skeleton className="h-3 w-full max-w-sm mx-auto" />
          <Skeleton className="h-3 w-3/4 mx-auto" />
          <Skeleton className="h-3 w-5/6 mx-auto" />
          <Skeleton className="h-3 w-2/3 mx-auto" />
        </div>

        {/* Social icons */}
        <div className="flex justify-center space-x-2 lg:space-x-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant="circular"
              className="w-4 h-4 lg:w-5 lg:h-5"
            />
          ))}
        </div>
      </div>
    </SkeletonCard>
  );
}

// AI Chat Skeleton (NO SCROLLING INDICATORS)
// Simple AI Chat Skeleton - Just input area
export function SkeletonAIChat() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] flex flex-col">
      {/* Empty chat area */}
      <div className="flex-1"></div>

      {/* Input Area at bottom */}
      <div className="p-2 sm:p-3 lg:p-4 flex-shrink-0">
        <div className="relative">
          {/* Input skeleton */}
          <Skeleton className="w-full h-10 sm:h-12 rounded-full" />
          {/* Send button skeleton */}
          <Skeleton
            variant="circular"
            className="absolute right-1 sm:right-1.5 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-[#E2AF19]/20"
          />
        </div>

        {/* Status indicator skeleton */}
        <div className="flex items-center justify-center mt-1.5">
          <div className="flex space-x-1 mr-2">
            <Skeleton variant="circular" className="w-1.5 h-1.5" />
            <Skeleton variant="circular" className="w-1.5 h-1.5" />
            <Skeleton variant="circular" className="w-1.5 h-1.5" />
          </div>
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
    </div>
  );
}

// Friends Page Skeleton (NO SCROLLING INDICATORS)
export function SkeletonFriendsPage() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2.5 sm:p-3 lg:p-4 flex flex-col">
      <div className="flex-1 flex flex-col min-h-0">
        <SkeletonCard>
          {/* Tab Navigation Skeleton */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-3 lg:mb-4 gap-3">
            <div className="flex">
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  className="h-8 w-20 mr-1.5"
                />
              ))}
            </div>

            {/* Search Input Skeleton */}
            <div className="relative flex-1 lg:max-w-md">
              <Skeleton className="w-full h-8 rounded-lg" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                {/* Mobile Card Layout */}
                <div className="block lg:hidden">
                  <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                    <div className="flex items-center mb-2">
                      <Skeleton variant="circular" className="w-8 h-8 mr-2.5" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-20 mb-0.5" />
                        <Skeleton className="h-2.5 w-12" />
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Skeleton variant="rounded" className="flex-1 h-8" />
                      <Skeleton variant="rounded" className="flex-1 h-8" />
                    </div>
                  </div>
                </div>

                {/* Desktop Row Layout */}
                <div className="hidden lg:block">
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg">
                    <div className="flex items-center">
                      <Skeleton variant="circular" className="w-8 h-8 mr-2.5" />
                      <div>
                        <Skeleton className="h-3 w-20 mb-0.5" />
                        <Skeleton className="h-2.5 w-12" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Skeleton variant="rounded" className="h-6 w-20" />
                      <Skeleton variant="rounded" className="h-6 w-12" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

// Scheduled Payments Skeleton (NO SCROLLING INDICATORS)
export function SkeletonScheduledPayments() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2.5 sm:p-3 lg:p-4 flex flex-col">
      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-3 flex-1 min-h-0">
        {/* Schedule Payment Form - Mobile */}
        <SkeletonCard>
          <Skeleton className="h-5 w-28 mb-3" />

          <div className="space-y-3">
            <Skeleton className="w-full h-10 rounded-lg" />

            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>

            <Skeleton className="w-full h-10 rounded-lg" />
            <Skeleton className="w-full h-10 rounded-lg" />

            <div className="flex gap-2">
              <Skeleton variant="rounded" className="flex-1 h-10" />
              <Skeleton variant="rounded" className="flex-1 h-10" />
            </div>
          </div>
        </SkeletonCard>

        {/* Scheduled Payments List */}
        <SkeletonCard>
          <div className="flex justify-between items-center mb-3">
            <Skeleton className="h-5 w-32" />
            <div className="flex space-x-1.5">
              <Skeleton variant="rounded" className="h-6 w-16" />
              <Skeleton variant="rounded" className="h-6 w-20" />
            </div>
          </div>

          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Skeleton variant="circular" className="w-6 h-6 mr-2.5" />
                    <div>
                      <Skeleton className="h-3 w-20 mb-0.5" />
                      <Skeleton className="h-2.5 w-12" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-3 w-16 mb-0.5" />
                    <Skeleton className="h-2.5 w-12" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex space-x-1.5">
                    <Skeleton variant="rounded" className="h-5 w-12" />
                    <Skeleton variant="rounded" className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-2.5 w-20" />
                </div>

                <div className="flex justify-center space-x-2 pt-2 border-t border-[#2C2C2C]">
                  <Skeleton variant="rounded" className="h-6 w-12" />
                  <Skeleton variant="rounded" className="h-6 w-12" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex flex-col gap-4 flex-1 min-h-0">
        {/* Desktop Form */}
        <SkeletonCard>
          <Skeleton className="h-5 w-28 mb-4" />

          {/* Form Row */}
          <div className="grid grid-cols-12 gap-3 mb-4">
            <Skeleton className="col-span-3 h-10 rounded-lg" />
            <Skeleton className="col-span-2 h-10 rounded-lg" />
            <Skeleton className="col-span-2 h-10 rounded-lg" />
            <Skeleton className="col-span-2 h-10 rounded-lg" />
            <Skeleton className="col-span-2 h-10 rounded-lg" />
            <Skeleton className="col-span-1 h-10 rounded-lg" />
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-40 rounded-lg" />
            </div>

            <div className="flex items-center space-x-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
          </div>

          <Skeleton className="w-full h-10 rounded-lg mb-4" />

          <div className="flex justify-end space-x-2">
            <Skeleton variant="rounded" className="h-8 w-12" />
            <Skeleton variant="rounded" className="h-8 w-20" />
          </div>
        </SkeletonCard>

        {/* Desktop Transaction History */}
        <SkeletonCard>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center space-x-2">
              <Skeleton variant="rounded" className="h-8 w-16" />
              <Skeleton variant="rounded" className="h-8 w-20" />
            </div>
          </div>

          {/* Table Header */}
          <div className="bg-[#0F0F0F] rounded-lg mb-1.5">
            <div className="grid grid-cols-5 gap-2 px-2.5 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="space-y-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-2 items-center py-1.5 px-2.5 rounded-lg"
              >
                <div className="flex items-center">
                  <Skeleton variant="circular" className="w-5 h-5 mr-1.5" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex items-center">
                  <Skeleton variant="circular" className="w-4 h-4 mr-1.5" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton variant="rounded" className="h-5 w-12" />
                <div>
                  <Skeleton className="h-3 w-20 mb-0.5" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

// Transaction History Skeleton (NO SCROLLING INDICATORS)
export function SkeletonTransactionHistory() {
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <Skeleton className="h-4 lg:h-5 w-32" />
        <Skeleton variant="circular" className="w-3 h-3" />
      </div>

      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 px-2.5 rounded-lg"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center mb-0.5">
                <Skeleton variant="circular" className="w-1.5 h-1.5 mr-1.5" />
                <Skeleton className="h-3 w-12" />
                <Skeleton variant="rounded" className="h-4 w-10 ml-1.5" />
              </div>

              <div className="flex items-center mb-0.5">
                <Skeleton variant="circular" className="w-3 h-3 mr-1.5" />
                <Skeleton className="h-2.5 w-10" />
              </div>

              <Skeleton className="h-2.5 w-28" />

              <div className="flex items-center mt-0.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton variant="circular" className="w-2.5 h-2.5 ml-1.5" />
              </div>
            </div>

            <div className="text-right flex-shrink-0 ml-3">
              <Skeleton className="h-3 w-16 mb-0.5" />
              <Skeleton className="h-2.5 w-12 mb-0.5" />
              <div className="flex items-center justify-end space-x-0.5">
                <Skeleton variant="circular" className="w-2.5 h-2.5" />
                <Skeleton variant="circular" className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Token Overview Skeleton (NO SCROLLING INDICATORS)
export function SkeletonTokenOverview() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2.5 sm:p-3 lg:p-4 flex flex-col">
      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-3 flex-1 min-h-0">
        {/* Token Header */}
        <SkeletonCard>
          <div className="flex items-center mb-3">
            <Skeleton variant="circular" className="w-6 h-6 mr-2.5" />
            <Skeleton variant="circular" className="w-8 h-8 mr-2.5" />
            <div>
              <Skeleton className="h-5 w-28 mb-0.5" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>

          <div className="space-y-2 mb-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>

          <div className="mb-3">
            <Skeleton className="h-6 w-28 mb-1.5" />
            <div className="flex items-center mb-1.5">
              <Skeleton variant="circular" className="w-3 h-3 mr-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-2.5 w-32 mb-0.5" />
            <Skeleton className="h-2.5 w-30" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" className="h-6 w-16" />
            ))}
          </div>
        </SkeletonCard>

        {/* Price Chart - Mobile */}
        <SkeletonCard>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton variant="circular" className="w-3 h-3" />
          </div>

          <div className="flex space-x-1.5 mb-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" className="h-6 w-10" />
            ))}
          </div>

          <Skeleton className="h-40 w-full rounded-lg mb-3" />

          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28 mb-1.5" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Portfolio Section - Mobile */}
        <SkeletonCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Skeleton variant="circular" className="w-6 h-6 mr-2.5" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton variant="circular" className="w-3 h-3" />
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <Skeleton className="h-6 w-28 mb-0.5" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>

          <div className="flex gap-2">
            <Skeleton variant="rounded" className="flex-1 h-10" />
            <Skeleton variant="rounded" className="h-10 w-10" />
          </div>
        </SkeletonCard>

        {/* Transaction History - Mobile */}
        <SkeletonCard>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton variant="circular" className="w-3 h-3" />
          </div>
          <SkeletonTransactionHistory />
        </SkeletonCard>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex gap-4 flex-1 min-h-0">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 max-h-full">
          <div className="flex-1 space-y-4">
            {/* Token Header and Chart - Desktop */}
            <SkeletonCard>
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center mb-3">
                    <Skeleton variant="circular" className="w-6 h-6 mr-3" />
                    <Skeleton variant="circular" className="w-10 h-10 mr-3" />
                    <div>
                      <Skeleton className="h-6 w-32 mb-0.5" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>

                <div className="text-right">
                  <Skeleton className="h-3 w-28 mb-0.5" />
                  <div className="flex items-center space-x-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton variant="circular" className="w-3 h-3" />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-20" />
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      {[1, 2, 3].map((i) => (
                        <Skeleton
                          key={i}
                          variant="rounded"
                          className="h-6 w-10"
                        />
                      ))}
                    </div>
                    <Skeleton variant="circular" className="w-3 h-3" />
                  </div>
                </div>

                <Skeleton className="h-56 w-full rounded-lg mb-4" />

                <div className="flex items-center justify-between w-full">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} variant="rounded" className="h-10 w-28" />
                  ))}
                </div>
              </div>
            </SkeletonCard>

            {/* About Token and Links - Desktop */}
            <SkeletonCard>
              <div className="flex items-center space-x-3 mb-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} variant="rounded" className="h-8 w-20" />
                ))}
              </div>

              <Skeleton className="h-5 w-28 mb-3" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </SkeletonCard>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-[360px] flex-shrink-0 h-full">
          <SkeletonCard>
            <div className="flex items-center mb-4">
              <Skeleton variant="circular" className="w-6 h-6 mr-2.5" />
              <Skeleton className="h-4 w-16" />
            </div>

            <div className="bg-[#0F0F0F] rounded-[12px] border border-[#2C2C2C] p-3 mb-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton variant="circular" className="w-3 h-3" />
              </div>

              <div className="mb-3">
                <Skeleton className="h-8 w-28 mb-0.5" />
                <Skeleton className="h-3 w-32" />
              </div>

              <div className="flex gap-2">
                <Skeleton variant="rounded" className="flex-1 h-10" />
                <Skeleton variant="rounded" className="h-10 w-10" />
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <Skeleton className="h-5 w-28" />
                <Skeleton variant="circular" className="w-3 h-3" />
              </div>

              <div className="flex-1">
                <SkeletonTransactionHistory />
              </div>
            </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}
