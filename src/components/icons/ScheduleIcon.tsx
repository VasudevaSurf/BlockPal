// src/components/icons/ScheduleIcon.tsx
import React from "react";

interface ScheduleIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function ScheduleIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: ScheduleIconProps) {
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
        d="M16.3333 3.5H5.83333C4.54467 3.5 3.5 4.54467 3.5 5.83333C3.5 7.122 4.54467 8.16667 5.83333 8.16667H21C21 7.0817 21 6.53921 20.8808 6.09413C20.5571 4.88631 19.6136 3.94289 18.4059 3.61926C17.9608 3.5 17.4183 3.5 16.3333 3.5Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 5.83325V17.4999C3.5 20.7997 3.5 22.4496 4.52513 23.4748C5.55025 24.4999 7.20016 24.4999 10.5 24.4999H17.5C20.7998 24.4999 22.4497 24.4999 23.4748 23.4748C24.5 22.4496 24.5 20.7997 24.5 17.4999V15.1666C24.5 11.8668 24.5 10.2168 23.4748 9.19171C22.4497 8.16659 20.7998 8.16659 17.5 8.16659H8.16667"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.5 14H22.1667C21.6242 14 21.3529 14 21.1304 14.0596C20.5265 14.2214 20.0548 14.6931 19.893 15.2971C19.8333 15.5196 19.8333 15.7908 19.8333 16.3333C19.8333 16.8758 19.8333 17.1471 19.893 17.3696C20.0548 17.9735 20.5265 18.4452 21.1304 18.607C21.3529 18.6667 21.6242 18.6667 22.1667 18.6667H24.5"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
