// src/components/icons/LightningIcon.tsx
import React from "react";

interface LightningIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function LightningIcon({
  size = 24,
  className = "",
  color = "currentColor",
  filled = true,
}: LightningIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 25 24"
      fill="none"
      className={className}
    >
      <path
        d="M18.1322 10.7199H15.0422V3.5199C15.0422 1.8399 14.1322 1.4999 13.0222 2.7599L12.2222 3.6699L5.45218 11.3699C4.52218 12.4199 4.91218 13.2799 6.31218 13.2799H9.40218V20.4799C9.40218 22.1599 10.3122 22.4999 11.4222 21.2399L12.2222 20.3299L18.9922 12.6299C19.9222 11.5799 19.5322 10.7199 18.1322 10.7199Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth={filled ? "0" : "1.5"}
      />
    </svg>
  );
}
