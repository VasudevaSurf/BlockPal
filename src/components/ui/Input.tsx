import React from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  icon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">{icon}</div>
          </div>
        )}
        <input
          className={clsx(
            "block w-full rounded-lg py-3 px-4 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 sm:text-sm sm:leading-6 bg-black border",
            icon && "pl-10",
            error
              ? "border-red-500 focus:border-red-500"
              : "border-[#2C2C2C] focus:border-[#E2AF19]",
            "focus:ring-[#E2AF19] focus:ring-opacity-50",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
