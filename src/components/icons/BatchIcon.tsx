// src/components/icons/BatchIcon.tsx
import React from "react";

interface BatchIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function BatchIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: BatchIconProps) {
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
        d="M10.0835 3.66977L8.09452 4.58914C5.03151 6.00497 3.5 6.71288 3.5 7.87492C3.5 9.03695 5.03151 9.74486 8.09453 11.1607L10.0835 12.0801C12.0111 12.971 12.975 13.4166 14 13.4166C15.025 13.4166 15.9889 12.971 17.9165 12.0801L19.9054 11.1607C22.9685 9.74486 24.5 9.03695 24.5 7.87492C24.5 6.71288 22.9685 6.00497 19.9054 4.58914L17.9165 3.66977C15.9889 2.77876 15.025 2.33325 14 2.33325C12.975 2.33325 12.0111 2.77876 10.0835 3.66977Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.2527 12.9468C24.4175 13.1786 24.5 13.4203 24.5 13.6861C24.5 14.8315 22.9685 15.5294 19.9054 16.9251L17.9165 17.8314C15.9889 18.7096 15.025 19.1489 14 19.1489C12.975 19.1489 12.0111 18.7096 10.0835 17.8314L8.09453 16.9251C5.03151 15.5294 3.5 14.8315 3.5 13.6861C3.5 13.4203 3.58245 13.1786 3.74733 12.9468"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.7728 18.9771C24.2576 19.3632 24.5 19.7481 24.5 20.2038C24.5 21.3494 22.9685 22.0471 19.9054 23.4428L17.9165 24.3491C15.9889 25.2275 15.025 25.6666 14 25.6666C12.975 25.6666 12.0111 25.2275 10.0835 24.3491L8.09453 23.4428C5.03151 22.0471 3.5 21.3494 3.5 20.2038C3.5 19.7481 3.74241 19.3632 4.22723 18.9771"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
