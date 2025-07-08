// src/components/icons/UserIcon.tsx
import React from "react";

interface UserIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export default function UserIcon({
  size = 24,
  className = "",
  color = "#6E6E6E",
}: UserIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 14"
      fill="none"
      className={className}
    >
      {/* Round head */}
      <circle
        cx="8"
        cy="2"
        r="2.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Original body shape with gap */}
      <path
        d="M10 7H6C3.23858 7 1 9.2386 1 12C1 13.1046 1.89543 14 3 14H13C14.1046 14 15 13.1046 15 12C15 9.2386 12.7614 7 10 7Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
