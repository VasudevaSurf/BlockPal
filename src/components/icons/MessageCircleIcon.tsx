// src/components/icons/MessageCircleIcon.tsx
import React from "react";

interface MessageCircleIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function MessageCircleIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: MessageCircleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
    >
      {filled ? (
        <>
          <path
            d="M14 2.33398C7.55635 2.33398 2.33333 7.18709 2.33333 13.1673C2.33333 15.5426 3.22061 17.7188 4.69825 19.4513C4.86751 19.6505 4.95881 19.9059 4.95527 20.1688L4.90089 22.6902C4.88963 23.5165 5.73794 24.0811 6.48013 23.7387L9.58333 22.3956C9.81137 22.2941 10.0679 22.2742 10.3092 22.3394C11.4872 22.6449 12.7238 22.8007 14 22.8007C20.4437 22.8007 25.6667 17.9476 25.6667 13.1673C25.6667 7.38709 20.4437 2.33398 14 2.33398Z"
            fill={color}
          />
        </>
      ) : (
        <>
          <path
            d="M14 2.33398C7.55635 2.33398 2.33333 7.18709 2.33333 13.1673C2.33333 15.5426 3.22061 17.7188 4.69825 19.4513C4.86751 19.6505 4.95881 19.9059 4.95527 20.1688L4.90089 22.6902C4.88963 23.5165 5.73794 24.0811 6.48013 23.7387L9.58333 22.3956C9.81137 22.2941 10.0679 22.2742 10.3092 22.3394C11.4872 22.6449 12.7238 22.8007 14 22.8007C20.4437 22.8007 25.6667 17.9476 25.6667 13.1673C25.6667 7.38709 20.4437 2.33398 14 2.33398Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
