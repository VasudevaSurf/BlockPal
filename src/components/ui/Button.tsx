import React from "react";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none font-satoshi";

  const variantStyles = {
    primary: "text-black font-semibold hover:opacity-90 bg-[#E2AF19]",
    secondary:
      "text-white border border-[#2C2C2C] hover:border-gray-500 bg-black",
    ghost: "text-white hover:bg-gray-800",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs sm:text-sm",
    md: "px-3 sm:px-4 py-2 text-sm sm:text-base",
    lg: "px-4 sm:px-6 py-2.5 sm:py-3 text-base sm:text-lg",
  };

  const widthStyles = fullWidth ? "w-full" : "";

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        widthStyles,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
