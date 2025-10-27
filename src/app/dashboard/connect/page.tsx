"use client";

import Image from "next/image";

export default function ComingSoonPage() {
  return (
    <div className="h-full bg-[#000000] rounded-[12px] lg:rounded-[16px] p-4 flex items-center justify-center relative overflow-hidden">
      {/* Subtle gradient effect */}
      <div className="absolute inset-0 opacity-10" />

      {/* Content */}
      <div className="text-center relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <Image
            src="/BlockPal.png"
            alt="BlockPal"
            width={120}
            height={120}
            className="w-16 h-16 lg:w-20 lg:h-20 brightness-110 object-contain"
            priority
          />
        </div>

        {/* Coming Soon Text */}
        <h1 className="text-[24px] lg:text-[35px] font-mayeka-demi-bold-demo font-bold mb-3 lg:mb-10 text-center bg-gradient-to-r from-[#F5E4B2] to-[#E2AF19] bg-clip-text text-transparent px-4">
          Coming Soon
        </h1>
      </div>
    </div>
  );
}
