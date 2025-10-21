"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: Toast["type"], message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

const ToastItem: React.FC<{
  toast: Toast;
  onClose: (id: string) => void;
}> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
        );
      case "error":
        return <AlertCircle size={20} className="text-red-400 flex-shrink-0" />;
      case "info":
        return <Info size={20} className="text-blue-400 flex-shrink-0" />;
      default:
        return <Info size={20} className="text-gray-400 flex-shrink-0" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case "success":
        return "bg-[#0F0F0F]";
      case "error":
        return "bg-[#0F0F0F]";
      case "info":
        return "bg-[#0F0F0F]";
      default:
        return "bg-[#0F0F0F]";
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${getBgColor()} backdrop-blur-sm min-w-[320px] max-w-[400px] shadow-lg transition-all duration-300 ${
        isExiting
          ? "opacity-0 translate-x-8"
          : "opacity-100 translate-x-0 animate-slide-in"
      }`}
    >
      {getIcon()}
      <p className="text-white text-sm font-satoshi flex-1 leading-relaxed">
        {toast.message}
      </p>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: Toast["type"], message: string, duration: number = 3000) => {
      const id = Math.random().toString(36).substring(7);
      const newToast: Toast = { id, type, message, duration };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {toasts.length > 0 && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[9998] pointer-events-none" />
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <ToastItem toast={toast} onClose={hideToast} />
              </div>
            ))}
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(2rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
};
