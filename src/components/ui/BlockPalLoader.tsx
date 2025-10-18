"use client";

import React from "react";

const BlockPalLoader = () => {
  return (
    <div className="absolute inset-0 bg-[#000000] flex items-center justify-center z-[9999]">
      <div className="flex flex-col items-center justify-center gap-8">
        {/* Logo */}
        <div className="relative">
          <img
            src="/BlockPal.png"
            alt="BlockPal"
            className="h-16 w-auto object-contain brightness-110"
            style={{ width: "auto" }}
          />
        </div>

        {/* Sliding Line Loader */}
        <div className="relative w-64 h-1 bg-[#2C2C2C] rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E2AF19] to-transparent w-1/3 animate-slide rounded-full"></div>
        </div>

        {/* Loading Text */}
        <div className="flex items-center gap-2">
          <span className="text-white text-lg font-mayeka">Loading</span>
          <div className="flex gap-1">
            <span
              className="animate-bounce-dot"
              style={{ animationDelay: "0ms" }}
            >
              .
            </span>
            <span
              className="animate-bounce-dot"
              style={{ animationDelay: "150ms" }}
            >
              .
            </span>
            <span
              className="animate-bounce-dot"
              style={{ animationDelay: "300ms" }}
            >
              .
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        .animate-slide {
          animation: slide 1.5s ease-in-out infinite;
        }

        @keyframes bounce-dot {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-bounce-dot {
          display: inline-block;
          animation: bounce-dot 1s ease-in-out infinite;
          color: #e2af19;
          font-size: 1.5rem;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default BlockPalLoader;
