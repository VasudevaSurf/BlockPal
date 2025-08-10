"use client";

export default function ComingSoonPage() {
  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-4 flex items-center justify-center relative overflow-hidden">
      {/* Subtle gradient effect */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background:
            "radial-gradient(circle at center, #E2AF19 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="text-center relative z-10">
        {/* Icon */}
        <div className="w-16 h-16 bg-[#E2AF19]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 bg-[#E2AF19]/20 rounded-full animate-pulse" />
        </div>

        {/* Text */}
        <h1
          className="font-mayeka-bold text-3xl md:text-4xl mb-3"
          style={{
            color: "#E2AF19",
            letterSpacing: "-0.02em",
          }}
        >
          Coming Soon
        </h1>

        <p className="font-satoshi text-sm text-gray-500">
          This feature is under development
        </p>

        {/* Decorative dots */}
        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3].map((dot) => (
            <div
              key={dot}
              className="w-1.5 h-1.5 rounded-full bg-[#E2AF19]/40 animate-pulse"
              style={{
                animationDelay: `${dot * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
