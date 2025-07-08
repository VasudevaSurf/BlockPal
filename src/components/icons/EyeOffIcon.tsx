// src/components/icons/EyeOffIcon.tsx
import React from "react";

interface EyeOffIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export default function EyeOffIcon({
  size = 24,
  className = "",
  color = "#6E6E6E",
}: EyeOffIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Closed eye curve - inverted downward */}
      <path
        d="M4 12C4 12 7 16 12 16C17 16 20 12 20 12"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Left eyelashes */}
      <path
        d="M6 14L5.5 15.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 15L7.5 16.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 15.5L9.5 17"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Right eyelashes */}
      <path
        d="M14 15.5L14.5 17"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 15L16.5 16.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 14L18.5 15.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
