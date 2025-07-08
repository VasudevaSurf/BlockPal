// src/components/icons/FriendsIcon.tsx
import React from "react";

interface FriendsIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function FriendsIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: FriendsIconProps) {
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
        d="M17.5 9.33325C17.5 11.2662 15.933 12.8333 14 12.8333C12.0669 12.8333 10.5 11.2662 10.5 9.33325C10.5 7.40026 12.0669 5.83325 14 5.83325C15.933 5.83325 17.5 7.40026 17.5 9.33325Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.6667 4.66675C20.5996 4.66675 22.1667 6.23376 22.1667 8.16675C22.1667 9.59369 21.3127 10.8212 20.088 11.3661"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 16.3333H12C9.23855 16.3333 6.99997 18.5719 6.99997 21.3332C6.99997 22.4378 7.8954 23.3333 8.99996 23.3333H19C20.1046 23.3333 21 22.4378 21 21.3332C21 18.5719 18.7614 16.3333 16 16.3333Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.6667 15.1667C23.4281 15.1667 25.6667 17.4053 25.6667 20.1667C25.6667 21.2713 24.7713 22.1667 23.6667 22.1667"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.33334 4.66675C7.40034 4.66675 5.83334 6.23376 5.83334 8.16675C5.83334 9.59369 6.68725 10.8212 7.91196 11.3661"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.33334 22.1667C3.22876 22.1667 2.33333 21.2713 2.33333 20.1667C2.33333 17.4053 4.57191 15.1667 7.33333 15.1667"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
