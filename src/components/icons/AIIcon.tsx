// src/components/icons/AIIcon.tsx
import React from "react";

interface AIIconProps {
  size?: number;
  className?: string;
  color?: string;
  filled?: boolean;
}

export default function AIIcon({
  size = 28,
  className = "",
  color = "currentColor",
  filled = false,
}: AIIconProps) {
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
        d="M16.5324 24.3723C21.4125 24.048 25.2999 20.1055 25.6198 15.1561C25.6823 14.1876 25.6823 13.1845 25.6198 12.2159C25.2999 7.26652 21.4125 3.32407 16.5324 2.99966C14.8674 2.88899 13.1292 2.88923 11.4676 2.99966C6.58745 3.32407 2.70014 7.26652 2.38028 12.2159C2.31768 13.1845 2.31768 14.1876 2.38028 15.1561C2.49678 16.9587 3.294 18.6278 4.23256 20.0371C4.77751 21.0238 4.41786 22.2552 3.85024 23.3308C3.44097 24.1064 3.23634 24.4942 3.40064 24.7744C3.56496 25.0545 3.93197 25.0635 4.666 25.0813C6.11761 25.1167 7.09646 24.7051 7.87346 24.1321C8.31413 23.8072 8.53448 23.6447 8.68634 23.626C8.8382 23.6073 9.13706 23.7304 9.73468 23.9766C10.2718 24.1978 10.8954 24.3343 11.4676 24.3723C13.1292 24.4828 14.8674 24.483 16.5324 24.3723Z"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 17.5L10.8989 11.0534C11.009 10.7229 11.3183 10.5 11.6667 10.5C12.015 10.5 12.3243 10.7229 12.4345 11.0534L14.5833 17.5M18.0833 10.5V17.5M9.91667 15.1667H13.4167"
        stroke={filled ? "none" : color}
        fill={filled ? color : "none"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
