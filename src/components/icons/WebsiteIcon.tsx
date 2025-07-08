// src/components/icons/WebsiteIcon.tsx
import React from "react";

interface WebsiteIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function WebsiteIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: WebsiteIconProps) {
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
        d="M14 25.6668C20.4433 25.6668 25.6667 20.4435 25.6667 14.0002C25.6667 7.55684 20.4433 2.3335 14 2.3335C7.55668 2.3335 2.33333 7.55684 2.33333 14.0002C2.33333 20.4435 7.55668 25.6668 14 25.6668Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
      />
      <path
        d="M9.33334 14.0002C9.33334 21.0002 14 25.6668 14 25.6668C14 25.6668 18.6667 21.0002 18.6667 14.0002C18.6667 7.00016 14 2.3335 14 2.3335C14 2.3335 9.33334 7.00016 9.33334 14.0002Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M24.5 17.5H3.5"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.5 10.5H3.5"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
