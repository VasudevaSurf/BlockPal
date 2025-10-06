// src/components/icons/UsersIcon.tsx
import React from "react";

interface UsersIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function UsersIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: UsersIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
    >
      <path
        d="M17.5 9.33398C17.5 11.267 15.933 12.834 14 12.834C12.0669 12.834 10.5 11.267 10.5 9.33398C10.5 7.40099 12.0669 5.83398 14 5.83398C15.933 5.83398 17.5 7.40099 17.5 9.33398Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.6667 4.66602C20.5996 4.66602 22.1667 6.23302 22.1667 8.16602C22.1667 9.59295 21.3127 10.8205 20.088 11.3654"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 16.334H12C9.23855 16.334 6.99997 18.5726 6.99997 21.334C6.99997 22.4386 7.8954 23.334 8.99997 23.334H19C20.1046 23.334 21 22.4386 21 21.334C21 18.5726 18.7614 16.334 16 16.334Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.6667 15.166C23.4281 15.166 25.6667 17.4046 25.6667 20.166C25.6667 21.2706 24.7713 22.166 23.6667 22.166"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.33333 4.66602C7.40034 4.66602 5.83333 6.23302 5.83333 8.16602C5.83333 9.59295 6.68725 10.8205 7.91196 11.3654"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.33334 22.166C3.22876 22.166 2.33333 21.2706 2.33333 20.166C2.33333 17.4046 4.57191 15.166 7.33333 15.166"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
