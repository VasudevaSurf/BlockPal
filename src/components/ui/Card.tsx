import React from "react";
import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass";
}

export default function Card({
  children,
  className,
  variant = "default",
}: CardProps) {
  const baseStyles = "rounded-lg p-6";

  const cardStyle = {
    backgroundColor: variant === "glass" ? "rgba(26, 26, 26, 0.8)" : "#1A1A1A",
    border: "1px solid #2A2A2A",
    backdropFilter: variant === "glass" ? "blur(10px)" : "none",
  };

  return (
    <div className={clsx(baseStyles, className)} style={cardStyle}>
      {children}
    </div>
  );
}
