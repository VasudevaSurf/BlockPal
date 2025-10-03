import { useEffect, useRef } from "react";
import { Copy, Minus, X } from "lucide-react";

interface TokenActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  onCopy: () => void;
  onRemove: () => void;
}

export default function TokenActionsMenu({
  isOpen,
  onClose,
  position,
  onCopy,
  onRemove,
}: TokenActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-black rounded-xl w-[200px] shadow-2xl border border-[#2C2C2C] overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Close Button - Top Left Corner */}
        <div className="absolute top-0 left-0 z-10">
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" strokeWidth={2} />
          </button>
        </div>

        {/* Button Container */}
        <div className="pt-10 p-3 space-y-2">
          {/* Copy Button */}
          <button
            onClick={() => {
              onCopy();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-2 px-8 py-2 bg-[#E2AF19] rounded-lg hover:bg-[#D4A853] transition-colors"
          >
            <span className="text-black font-satoshi text-sm font-medium">
              Copy
            </span>
            <Copy className="w-4 h-4 text-black" strokeWidth={2} />
          </button>

          {/* Remove Button */}
          <button
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="w-full flex items-center justify-between gap-2 px-8 py-2 bg-transparent border border-[#E74C3C] rounded-lg hover:bg-[#E74C3C]/10 transition-colors"
          >
            <span className="text-[#E74C3C] font-satoshi text-sm font-medium">
              Remove
            </span>
            <Minus className="w-4 h-4 text-[#E74C3C]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}
