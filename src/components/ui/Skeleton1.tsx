// src/components/ui/Skeleton.tsx - UPDATED with centralized skeleton and correct colors
"use client";

import React from "react";

// Centralized Dashboard Skeleton - matches exact UI structure
export function DashboardSkeleton() {
  return (
    <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[16px] p-1 sm:p-2 lg:p-3 flex flex-col overflow-hidden">
      {/* Mobile Layout Skeleton */}
      <div className="flex xl:hidden flex-col gap-3 lg:gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <SkeletonWalletBalance />
        <SkeletonTokenList />
        <SkeletonSwapSection />
      </div>

      {/* Desktop Layout Skeleton */}
      <div className="hidden xl:flex gap-4 flex-1 min-h-0">
        <div className="flex-1 flex flex-col gap-4 min-w-0 max-w-[68%]">
          <SkeletonWalletBalance />
          <SkeletonTokenList />
        </div>
        <div className="w-[32%] min-w-[360px] max-w-[440px] flex-shrink-0 h-full">
          <SkeletonSwapSection />
        </div>
      </div>
    </div>
  );
}

// Wallet Balance Skeleton
export function SkeletonWalletBalance() {
  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex-shrink-0 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 sm:gap-0">
        <div className="h-4 lg:h-5 w-48 bg-[#1A1A1A] rounded"></div>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-32 bg-[#1A1A1A] rounded"></div>
          <div className="h-6 w-16 bg-[#1A1A1A] rounded-full"></div>
        </div>
      </div>

      {/* Balance Display */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <div className="h-8 lg:h-9 w-40 lg:w-48 bg-[#1A1A1A] rounded mb-2"></div>
            <div className="h-6 w-28 bg-[#1A1A1A] rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Token List Skeleton
export function SkeletonTokenList() {
  return (
    <div className="bg-black rounded-[12px] lg:rounded-[16px] p-3 lg:p-4 border border-[#2C2C2C] flex flex-col flex-1 min-h-0 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="h-4 lg:h-5 w-32 bg-[#1A1A1A] rounded"></div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-[#1A1A1A] rounded-lg"></div>
        </div>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pr-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F0F0F]"
          >
            <div className="flex items-center flex-1 min-w-0">
              <div className="w-10 h-10 bg-[#1A1A1A] rounded-full mr-2.5 flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <div className="h-4 w-24 bg-[#1A1A1A] rounded mb-1.5"></div>
                <div className="h-3 w-20 bg-[#1A1A1A] rounded"></div>
              </div>
            </div>
            <div className="text-right">
              <div className="h-4 w-20 bg-[#1A1A1A] rounded mb-1.5"></div>
              <div className="h-3 w-16 bg-[#1A1A1A] rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Swap Section Skeleton
export function SkeletonSwapSection() {
  return (
    <div className="space-y-3 lg:space-y-4 h-full flex flex-col animate-pulse">
      {/* First Box - Trending Tokens */}
      <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] flex-1 flex flex-col p-2 lg:p-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="h-4 w-32 bg-[#1A1A1A] rounded"></div>
          <div className="h-6 w-40 bg-[#1A1A1A] rounded-xl"></div>
        </div>

        {/* Border */}
        <div className="border-t border-[#2C2C2C] mb-1"></div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1.5"
            >
              <div className="flex items-center gap-2.5 w-24 flex-shrink-0">
                <div className="w-7 h-7 bg-[#1A1A1A] rounded-full"></div>
                <div className="min-w-0 flex-1">
                  <div className="h-3 bg-[#1A1A1A] rounded mb-1"></div>
                  <div className="h-2 bg-[#1A1A1A] rounded"></div>
                </div>
              </div>
              <div className="w-20 h-3 bg-[#1A1A1A] rounded"></div>
              <div className="w-20 h-7 bg-[#1A1A1A] rounded"></div>
              <div className="w-16 h-3 bg-[#1A1A1A] rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Second Box - Top Gainers */}
      <div className="bg-black rounded-[12px] lg:rounded-[16px] border border-[#2C2C2C] flex-1 flex flex-col p-2 lg:p-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="h-8 w-32 bg-[#1A1A1A] rounded-[20px]"></div>
          <div className="h-8 w-40 bg-[#1A1A1A] rounded-[20px]"></div>
        </div>

        {/* Table Header */}
        <div className="flex items-center justify-between py-2 border-b border-[#2C2C2C] mb-2">
          <div className="w-[100px] h-3 bg-[#1A1A1A] rounded"></div>
          <div className="w-[80px] h-3 bg-[#1A1A1A] rounded"></div>
          <div className="w-[100px] h-3 bg-[#1A1A1A] rounded"></div>
          <div className="w-[60px] h-3 bg-[#1A1A1A] rounded"></div>
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1.5"
            >
              <div className="flex items-center gap-2.5 w-[100px]">
                <div className="w-6 h-6 bg-[#1A1A1A] rounded-full"></div>
                <div className="min-w-0 flex-1">
                  <div className="h-3 bg-[#1A1A1A] rounded mb-1"></div>
                  <div className="h-2 bg-[#1A1A1A] rounded"></div>
                </div>
              </div>
              <div className="w-[80px] h-3 bg-[#1A1A1A] rounded"></div>
              <div className="w-[100px] h-3 bg-[#1A1A1A] rounded"></div>
              <div className="w-[60px] h-3 bg-[#1A1A1A] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
