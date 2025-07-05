// src/components/ui/Skeleton.tsx
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
    <div className="bg-black rounded-[16px] lg:rounded-[20px] border border-[#2C2C2C] p-4 lg:p-6">
      {children}
    </div>
  );
}

// Header Skeleton
export function SkeletonHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
      <div>
        <Skeleton className="h-6 sm:h-8 lg:h-10 w-48 sm:w-64 lg:w-80 mb-2" />
        <Skeleton className="h-4 w-32 sm:w-48" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
        {/* Wallet Selector Skeleton */}
        <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto">
          <Skeleton
            variant="circular"
            className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3"
          />
          <Skeleton className="h-4 w-16 mr-2" />
          <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
          <Skeleton className="h-4 w-20 lg:w-24 hidden sm:block" />
        </div>

        {/* Icons Container Skeleton */}
        <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
          <Skeleton variant="circular" className="w-6 h-6 lg:w-8 lg:h-8" />
          <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>
          <Skeleton variant="circular" className="w-6 h-6 lg:w-8 lg:h-8" />
        </div>
      </div>
    </div>
  );
}

// Token List Skeleton
export function SkeletonTokenList() {
  return (
    <SkeletonCard>
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <Skeleton className="h-5 lg:h-6 w-40" />
        <Skeleton variant="circular" className="w-6 h-6" />
      </div>

      {/* Mobile Grid Layout Skeleton */}
      <div className="block sm:hidden">
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Skeleton variant="circular" className="w-8 h-8 mr-3" />
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop List Layout Skeleton */}
      <div className="hidden sm:block">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg"
            >
              <div className="flex items-center min-w-0 flex-1">
                <Skeleton
                  variant="circular"
                  className="w-8 h-8 sm:w-10 sm:h-10 mr-3"
                />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonCard>
  );
}

// Wallet Balance Skeleton
export function SkeletonWalletBalance() {
  return (
    <SkeletonCard>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-0">
        <Skeleton className="h-5 lg:h-6 w-32" />
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton variant="rounded" className="h-6 w-12" />
        </div>
      </div>

      <div>
        <Skeleton className="h-8 sm:h-10 lg:h-12 w-48 mb-2" />
        <div className="flex items-center">
          <Skeleton className="h-4 w-16 mr-2" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </SkeletonCard>
  );
}

// Swap Section Skeleton
export function SkeletonSwapSection() {
  return (
    <SkeletonCard>
      <Skeleton className="h-5 lg:h-6 w-16 mb-4 lg:mb-6" />

      {/* Swap Form Skeleton */}
      <div className="relative mb-4 lg:mb-6">
        {/* Sell Section */}
        <div className="bg-black border border-[#2C2C2C] rounded-2xl p-3 lg:p-4 h-28 sm:h-32 lg:h-36 mb-2">
          <div className="flex items-center justify-between mb-2 lg:mb-3">
            <Skeleton className="h-4 w-8" />
            <div className="flex items-center bg-[#0F0F0F] px-2 lg:px-3 py-1.5 lg:py-2 rounded-full">
              <Skeleton
                variant="circular"
                className="w-3 h-3 lg:w-4 lg:h-4 mr-1.5 lg:mr-2"
              />
              <Skeleton className="h-3 w-8 mr-1.5 lg:mr-2" />
              <Skeleton className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
            </div>
          </div>
          <div className="flex items-start justify-between mb-2">
            <Skeleton className="h-6 lg:h-8 w-20" />
            <div className="text-right">
              <Skeleton className="h-4 w-12 mb-1" />
              <Skeleton variant="rounded" className="h-5 w-8" />
            </div>
          </div>
        </div>

        {/* Buy Section */}
        <div className="bg-black border border-[#2C2C2C] rounded-2xl p-3 lg:p-4 h-28 sm:h-32 lg:h-36">
          <Skeleton className="h-4 w-8 mb-2 lg:mb-3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 lg:h-8 w-20" />
            <Skeleton variant="rounded" className="h-8 w-24" />
          </div>
        </div>

        {/* Arrow Button */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 z-10"
          style={{ top: "calc(50% - 12px)" }}
        >
          <Skeleton className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg" />
        </div>
      </div>

      {/* Swap Button */}
      <Skeleton
        variant="rounded"
        className="w-full h-10 lg:h-12 mb-4 lg:mb-6"
      />

      {/* Info Section */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-3 lg:mb-4">
          <Skeleton variant="circular" className="w-5 h-5 lg:w-6 lg:h-6 mr-2" />
          <Skeleton className="h-5 lg:h-6 w-20" />
        </div>

        <div className="space-y-2 mb-6 lg:mb-8">
          <Skeleton className="h-4 w-full max-w-sm mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>

        {/* Social icons */}
        <div className="flex justify-center space-x-3 lg:space-x-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant="circular"
              className="w-5 h-5 lg:w-6 lg:h-6"
            />
          ))}
        </div>
      </div>
    </SkeletonCard>
  );
}

// AI Chat Skeleton
export function SkeletonAIChat() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      <SkeletonHeader />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Quick Suggestions Skeleton */}
        <div className="mb-4 flex-shrink-0">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rounded" className="h-8 w-32" />
            ))}
          </div>
        </div>

        {/* Messages Area Skeleton */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6 space-y-4 lg:space-y-6 flex flex-col pb-4">
          {/* Welcome Message */}
          <div className="flex flex-col items-start space-y-2">
            <div className="max-w-full sm:max-w-4xl bg-black p-3 lg:p-4 rounded-2xl border border-[#2C2C2C]">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton variant="rounded" className="h-6 w-16" />
          </div>
        </div>

        {/* Input Area Skeleton */}
        <div className="p-3 sm:p-4 lg:p-6 flex-shrink-0">
          <div className="relative">
            <Skeleton className="w-full h-12 sm:h-14 rounded-full" />
            <Skeleton
              variant="circular"
              className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Friends Page Skeleton
export function SkeletonFriendsPage() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      <SkeletonHeader />

      <div className="flex-1 flex flex-col min-h-0">
        <SkeletonCard>
          {/* Tab Navigation Skeleton */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 gap-4">
            <div className="flex">
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  className="h-10 w-24 mr-2"
                />
              ))}
            </div>

            {/* Search Input Skeleton */}
            <div className="relative flex-1 lg:max-w-md">
              <Skeleton className="w-full h-10 rounded-lg" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                {/* Mobile Card Layout */}
                <div className="block lg:hidden">
                  <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                    <div className="flex items-center mb-3">
                      <Skeleton variant="circular" className="w-10 h-10 mr-3" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton variant="rounded" className="flex-1 h-10" />
                      <Skeleton variant="rounded" className="flex-1 h-10" />
                    </div>
                  </div>
                </div>

                {/* Desktop Row Layout */}
                <div className="hidden lg:block">
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg">
                    <div className="flex items-center">
                      <Skeleton variant="circular" className="w-10 h-10 mr-3" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Skeleton variant="rounded" className="h-8 w-24" />
                      <Skeleton variant="rounded" className="h-8 w-16" />
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

// Scheduled Payments Skeleton
export function SkeletonScheduledPayments() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      <SkeletonHeader />

      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0">
        {/* Schedule Payment Form - Mobile */}
        <SkeletonCard>
          <Skeleton className="h-6 w-32 mb-4" />

          <div className="space-y-4">
            <Skeleton className="w-full h-12 rounded-lg" />

            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>

            <Skeleton className="w-full h-12 rounded-lg" />
            <Skeleton className="w-full h-12 rounded-lg" />

            <div className="flex gap-3">
              <Skeleton variant="rounded" className="flex-1 h-12" />
              <Skeleton variant="rounded" className="flex-1 h-12" />
            </div>
          </div>
        </SkeletonCard>

        {/* Scheduled Payments List */}
        <SkeletonCard>
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-40" />
            <div className="flex space-x-2">
              <Skeleton variant="rounded" className="h-8 w-20" />
              <Skeleton variant="rounded" className="h-8 w-24" />
            </div>
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Skeleton variant="circular" className="w-8 h-8 mr-3" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex space-x-2">
                    <Skeleton variant="rounded" className="h-6 w-16" />
                    <Skeleton variant="rounded" className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>

                <div className="flex justify-center space-x-3 pt-3 border-t border-[#2C2C2C]">
                  <Skeleton variant="rounded" className="h-8 w-16" />
                  <Skeleton variant="rounded" className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex flex-col gap-6 flex-1 min-h-0">
        {/* Desktop Form */}
        <SkeletonCard>
          <Skeleton className="h-6 w-32 mb-6" />

          {/* Form Row */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            <Skeleton className="col-span-3 h-12 rounded-lg" />
            <Skeleton className="col-span-2 h-12 rounded-lg" />
            <Skeleton className="col-span-2 h-12 rounded-lg" />
            <Skeleton className="col-span-2 h-12 rounded-lg" />
            <Skeleton className="col-span-2 h-12 rounded-lg" />
            <Skeleton className="col-span-1 h-12 rounded-lg" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-48 rounded-lg" />
            </div>

            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>

          <Skeleton className="w-full h-12 rounded-lg mb-6" />

          <div className="flex justify-end space-x-3">
            <Skeleton variant="rounded" className="h-10 w-16" />
            <Skeleton variant="rounded" className="h-10 w-24" />
          </div>
        </SkeletonCard>

        {/* Desktop Transaction History */}
        <SkeletonCard>
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-40" />
            <div className="flex items-center space-x-3">
              <Skeleton variant="rounded" className="h-10 w-20" />
              <Skeleton variant="rounded" className="h-10 w-24" />
            </div>
          </div>

          {/* Table Header */}
          <div className="bg-[#0F0F0F] rounded-lg mb-2">
            <div className="grid grid-cols-6 gap-2 px-3 py-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-16" />
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-2 items-center py-2 px-3 rounded-lg"
              >
                <div className="flex items-center">
                  <Skeleton variant="circular" className="w-6 h-6 mr-2" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center">
                  <Skeleton variant="circular" className="w-5 h-5 mr-2" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton variant="rounded" className="h-6 w-16" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex items-center justify-center space-x-1">
                  <Skeleton variant="rounded" className="h-6 w-8" />
                  <Skeleton variant="rounded" className="h-6 w-8" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

// Transaction History Skeleton
export function SkeletonTransactionHistory() {
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <Skeleton className="h-5 lg:h-6 w-40" />
        <Skeleton variant="circular" className="w-4 h-4" />
      </div>

      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between py-3 px-3 rounded-lg"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center mb-1">
                <Skeleton variant="circular" className="w-2 h-2 mr-2" />
                <Skeleton className="h-4 w-16" />
                <Skeleton variant="rounded" className="h-5 w-12 ml-2" />
              </div>

              <div className="flex items-center mb-1">
                <Skeleton variant="circular" className="w-4 h-4 mr-2" />
                <Skeleton className="h-3 w-12" />
              </div>

              <Skeleton className="h-3 w-32" />

              <div className="flex items-center mt-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton variant="circular" className="w-3 h-3 ml-2" />
              </div>
            </div>

            <div className="text-right flex-shrink-0 ml-4">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-16 mb-1" />
              <div className="flex items-center justify-end space-x-1">
                <Skeleton variant="circular" className="w-3 h-3" />
                <Skeleton variant="circular" className="w-3 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Token Overview Skeleton
export function SkeletonTokenOverview() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      <SkeletonHeader />

      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0 overflow-y-auto">
        {/* Token Header */}
        <SkeletonCard>
          <div className="flex items-center mb-4">
            <Skeleton variant="circular" className="w-8 h-8 mr-3" />
            <Skeleton variant="circular" className="w-10 h-10 mr-3" />
            <div>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>

          <div className="mb-4">
            <Skeleton className="h-8 w-32 mb-2" />
            <div className="flex items-center mb-2">
              <Skeleton variant="circular" className="w-4 h-4 mr-1" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-3 w-40 mb-1" />
            <Skeleton className="h-3 w-36" />
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" className="h-8 w-20" />
            ))}
          </div>
        </SkeletonCard>

        {/* Price Chart - Mobile */}
        <SkeletonCard>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton variant="circular" className="w-4 h-4" />
          </div>

          <div className="flex space-x-2 mb-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" className="h-8 w-12" />
            ))}
          </div>

          <Skeleton className="h-48 w-full rounded-lg mb-4" />

          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mb-2" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Portfolio Section - Mobile */}
        <SkeletonCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Skeleton variant="circular" className="w-8 h-8 mr-3" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton variant="circular" className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          <div className="flex gap-3">
            <Skeleton variant="rounded" className="flex-1 h-12" />
            <Skeleton variant="rounded" className="h-12 w-12" />
          </div>
        </SkeletonCard>

        {/* Transaction History - Mobile */}
        <SkeletonCard>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton variant="circular" className="w-4 h-4" />
          </div>
          <SkeletonTransactionHistory />
        </SkeletonCard>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex gap-6 flex-1 min-h-0">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 max-h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Token Header and Chart - Desktop */}
            <SkeletonCard>
              <div className="flex items-start justify-between mb-6">
                <div className="flex flex-col">
                  <div className="flex items-center mb-4">
                    <Skeleton variant="circular" className="w-8 h-8 mr-4" />
                    <Skeleton variant="circular" className="w-12 h-12 mr-4" />
                    <div>
                      <Skeleton className="h-8 w-40 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <Skeleton className="h-12 w-48" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>

                <div className="text-right">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton variant="circular" className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-24" />
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton
                          key={i}
                          variant="rounded"
                          className="h-8 w-12"
                        />
                      ))}
                    </div>
                    <Skeleton variant="circular" className="w-4 h-4" />
                  </div>
                </div>

                <Skeleton className="h-64 w-full rounded-lg mb-6" />

                <div className="flex items-center justify-between w-full">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} variant="rounded" className="h-12 w-32" />
                  ))}
                </div>
              </div>
            </SkeletonCard>

            {/* About Token and Links - Desktop */}
            <SkeletonCard>
              <div className="flex items-center space-x-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} variant="rounded" className="h-10 w-24" />
                ))}
              </div>

              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </SkeletonCard>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-[400px] flex-shrink-0 h-full">
          <SkeletonCard>
            <div className="flex items-center mb-6">
              <Skeleton variant="circular" className="w-8 h-8 mr-3" />
              <Skeleton className="h-5 w-20" />
            </div>

            <div className="bg-[#0F0F0F] rounded-[16px] border border-[#2C2C2C] p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton variant="circular" className="w-4 h-4" />
              </div>

              <div className="mb-4">
                <Skeleton className="h-10 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </div>

              <div className="flex gap-3">
                <Skeleton variant="rounded" className="flex-1 h-12" />
                <Skeleton variant="rounded" className="h-12 w-12" />
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <Skeleton className="h-6 w-32" />
                <Skeleton variant="circular" className="w-4 h-4" />
              </div>

              <div className="flex-1 overflow-y-auto">
                <SkeletonTransactionHistory />
              </div>
            </div>
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}
