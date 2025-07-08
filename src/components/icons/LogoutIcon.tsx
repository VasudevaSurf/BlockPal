// src/components/icons/LogoutIcon.tsx
import React from "react";

interface LogoutIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export default function LogoutIcon({
  size = 28,
  className = "",
  color = "#E74C3C",
}: LogoutIconProps) {
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
        d="M17.5 20.5625C17.4141 22.723 15.6136 24.5576 13.2015 24.4986C12.6404 24.4848 11.9468 24.2893 10.5596 23.898C7.22121 22.9563 4.32314 21.3737 3.62782 17.8284C3.5 17.1768 3.5 16.4435 3.5 14.9768V13.0231C3.5 11.5565 3.5 10.8232 3.62782 10.1715C4.32314 6.62626 7.22121 5.04368 10.5596 4.10203C11.9468 3.71074 12.6404 3.51511 13.2015 3.50139C15.6136 3.44238 17.4141 5.27691 17.5 7.43751"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M24.5 14.0002H11.6667M24.5 14.0002C24.5 13.1833 22.1733 11.6569 21.5833 11.0835M24.5 14.0002C24.5 14.8171 22.1733 16.3434 21.5833 16.9168"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
