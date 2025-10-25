// src/components/icons/StylishMenuIcon.tsx - Unique stylish hamburger menu icon
import React from "react";

interface StylishMenuIconProps {
  size?: number;
  className?: string;
}

export default function StylishMenuIcon({
  size = 24,
  className = "",
}: StylishMenuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top line with rounded end */}
      <path
        d="M4 6H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Middle line - shorter with gradient effect */}
      <path
        d="M4 12H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Bottom line - shortest */}
      <path
        d="M4 18H12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {/* Decorative dot */}
      <circle
        cx="19"
        cy="12"
        r="1.5"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  );
}

// Alternative Design 1: Modern Gradient Bars
export function StylishMenuIconGradient({
  size = 24,
  className = "",
}: StylishMenuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="menuGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E2AF19" />
          <stop offset="100%" stopColor="#F7B410" />
        </linearGradient>
      </defs>
      <path
        d="M3 6H21"
        stroke="url(#menuGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M3 12H18"
        stroke="url(#menuGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M3 18H15"
        stroke="url(#menuGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Alternative Design 2: Minimal Dots
export function StylishMenuIconDots({
  size = 24,
  className = "",
}: StylishMenuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top row */}
      <circle cx="6" cy="6" r="2" fill="currentColor" />
      <circle cx="12" cy="6" r="2" fill="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
      {/* Middle row */}
      <circle cx="6" cy="12" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="18" cy="12" r="2" fill="currentColor" opacity="0.7" />
      {/* Bottom row */}
      <circle cx="6" cy="18" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="12" cy="18" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="18" cy="18" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// Alternative Design 3: Sleek Modern
export function StylishMenuIconModern({
  size = 24,
  className = "",
}: StylishMenuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top bar */}
      <rect
        x="3"
        y="5"
        width="18"
        height="2"
        rx="1"
        fill="currentColor"
      />
      {/* Middle bar - with offset */}
      <rect
        x="3"
        y="11"
        width="14"
        height="2"
        rx="1"
        fill="currentColor"
        opacity="0.8"
      />
      {/* Bottom bar - shorter */}
      <rect
        x="3"
        y="17"
        width="10"
        height="2"
        rx="1"
        fill="currentColor"
        opacity="0.6"
      />
      {/* Accent square */}
      <rect
        x="19"
        y="11"
        width="2"
        height="2"
        rx="0.5"
        fill="#E2AF19"
      />
    </svg>
  );
}