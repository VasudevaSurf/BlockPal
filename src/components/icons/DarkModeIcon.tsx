// src/components/icons/DarkModeIcon.tsx
import React from "react";

interface DarkModeIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function DarkModeIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: DarkModeIconProps) {
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
        d="M25.0833 16.4246C23.6837 17.1719 22.0851 17.5956 20.3876 17.5956C14.874 17.5956 10.4042 13.1259 10.4042 7.61216C10.4042 5.91467 10.8279 4.31613 11.5752 2.9165C6.61226 4.07965 2.91667 8.53416 2.91667 13.8518C2.91667 20.0547 7.94512 25.0832 14.1481 25.0832C19.4657 25.0832 23.9202 21.3876 25.0833 16.4246Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
