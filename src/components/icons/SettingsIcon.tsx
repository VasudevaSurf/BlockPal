// src/components/icons/SettingsIcon.tsx
import React from "react";

interface SettingsIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function SettingsIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: SettingsIconProps) {
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
        d="M18.0833 14.0001C18.0833 16.2552 16.2551 18.0834 14 18.0834C11.7448 18.0834 9.91663 16.2552 9.91663 14.0001C9.91663 11.7449 11.7448 9.91675 14 9.91675C16.2551 9.91675 18.0833 11.7449 18.0833 14.0001Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
      />
      <path
        d="M24.2557 10.6773C25.1964 12.2988 25.6667 13.1094 25.6667 14C25.6667 14.8906 25.1964 15.7012 24.2557 17.3227L22.0114 21.1911C21.0745 22.806 20.6061 23.6136 19.8356 24.0568C19.0652 24.5 18.1303 24.5 16.2602 24.5H11.7399C9.86983 24.5 8.93484 24.5 8.16446 24.0568C7.39407 23.6136 6.9256 22.806 5.98867 21.1911L3.74436 17.3227C2.8037 15.7012 2.33337 14.8906 2.33337 14C2.33337 13.1094 2.8037 12.2988 3.74436 10.6773L5.98867 6.80891C6.9256 5.19395 7.39407 4.38648 8.16446 3.94324C8.93484 3.5 9.86983 3.5 11.7399 3.5H16.2602C18.1303 3.5 19.0652 3.5 19.8356 3.94324C20.6061 4.38648 21.0745 5.19396 22.0114 6.80892L24.2557 10.6773Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
      />
    </svg>
  );
}
