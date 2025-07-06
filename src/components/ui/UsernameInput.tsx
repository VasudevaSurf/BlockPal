// src/components/ui/UsernameInput.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Search, User, X, CheckCircle } from "lucide-react";
import { useUsernameSearch, UserSuggestion } from "@/hooks/useUsernameSearch";

interface UsernameInputProps {
  value: string;
  onChange: (value: string, suggestion?: UserSuggestion) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  onUserSelect?: (user: UserSuggestion) => void;
}

export default function UsernameInput({
  value,
  onChange,
  placeholder = "@username or 0x... address",
  error,
  className = "",
  disabled = false,
  onUserSelect,
}: UsernameInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { suggestions, loading, searchUsers, clearSuggestions } =
    useUsernameSearch();

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear selected user if input changes
    if (selectedUser) {
      setSelectedUser(null);
    }

    // Search for users if typing username (not address)
    if (newValue.length >= 2 && !newValue.startsWith("0x")) {
      searchUsers(newValue);
      setIsOpen(true);
    } else {
      clearSuggestions();
      setIsOpen(false);
    }
  };

  // Handle user selection from dropdown
  const handleUserSelect = (user: UserSuggestion) => {
    setSelectedUser(user);
    onChange(user.walletAddress, user);
    setIsOpen(false);
    clearSuggestions();

    if (onUserSelect) {
      onUserSelect(user);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Clear selection
  const clearSelection = () => {
    setSelectedUser(null);
    onChange("");
    clearSuggestions();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Check if current value is a valid address
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(value);

  return (
    <div className="relative">
      {/* Input Container */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-2 pointer-events-none">
          {selectedUser ? (
            <User size={16} className="text-green-400" />
          ) : loading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
          ) : (
            <Search size={16} className="text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={selectedUser ? `@${selectedUser.username}` : value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-12 py-3 
            bg-black border border-[#2C2C2C] rounded-lg 
            text-white placeholder-gray-400 
            focus:outline-none focus:border-[#E2AF19] 
            transition-colors font-satoshi
            ${error ? "border-red-500" : ""}
            ${selectedUser ? "text-green-400" : ""}
            ${className}
          `}
          readOnly={!!selectedUser}
        />

        {/* Right Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {selectedUser && (
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-[#2C2C2C] rounded transition-colors"
              disabled={disabled}
            >
              <X size={14} className="text-gray-400 hover:text-white" />
            </button>
          )}

          {isValidAddress && !selectedUser && (
            <CheckCircle size={16} className="text-green-400" />
          )}
        </div>
      </div>

      {/* Selected User Display */}
      {selectedUser && (
        <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-green-400 font-medium text-sm font-satoshi">
                {selectedUser.displayName}
              </div>
              <div className="text-green-400/70 text-xs font-satoshi">
                @{selectedUser.username} •{" "}
                {selectedUser.walletAddress.slice(0, 8)}...
                {selectedUser.walletAddress.slice(-6)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((user, index) => (
            <button
              key={`${user.username}-${index}`}
              onClick={() => handleUserSelect(user)}
              className="w-full flex items-center space-x-3 p-3 hover:bg-[#2C2C2C] transition-colors text-left border-b border-[#2C2C2C] last:border-b-0"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center flex-shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white" />
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm font-satoshi truncate">
                  {user.displayName || user.username}
                </div>
                <div className="text-gray-400 text-xs font-satoshi truncate">
                  @{user.username}
                </div>
                <div className="text-gray-500 text-xs font-mono">
                  {user.walletAddress.slice(0, 10)}...
                  {user.walletAddress.slice(-8)}
                </div>
              </div>

              {/* Select Indicator */}
              <div className="flex-shrink-0">
                <div className="w-6 h-6 border border-gray-400 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-[#E2AF19] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isOpen && loading && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
            <span className="text-gray-400 text-sm font-satoshi">
              Searching users...
            </span>
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen &&
        !loading &&
        suggestions.length === 0 &&
        value.length >= 2 &&
        !value.startsWith("0x") && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg p-4">
            <div className="flex items-center space-x-3">
              <Search size={16} className="text-gray-400" />
              <span className="text-gray-400 text-sm font-satoshi">
                No users found for "{value}"
              </span>
            </div>
          </div>
        )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-red-400 text-sm font-satoshi">{error}</div>
      )}
    </div>
  );
}
