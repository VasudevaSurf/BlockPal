// src/components/ui/UsernameInput.tsx - Compact Version with backdrop for suggestions and NO SCROLL INDICATORS
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, User, Wallet } from "lucide-react";
import { useUsernameSearch, UserSuggestion } from "@/hooks/useUsernameSearch";

interface UsernameInputProps {
  value: string;
  onChange: (value: string, suggestion?: UserSuggestion) => void;
  onUserSelect?: (user: UserSuggestion) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export default function UsernameInput({
  value,
  onChange,
  onUserSelect,
  placeholder = "Username or address",
  error,
  className = "",
  disabled = false,
}: UsernameInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { suggestions, loading, searchUsers } = useUsernameSearch();

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    if (newValue.length >= 2 && !newValue.startsWith("0x")) {
      searchUsers(newValue);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: UserSuggestion) => {
    onChange(suggestion.walletAddress, suggestion);
    if (onUserSelect) {
      onUserSelect(suggestion);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(
          selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if input looks like an address
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(value);

  return (
    <div className="relative">
      {/* ADDED: Backdrop for suggestions dropdown */}
      {showSuggestions &&
        (suggestions.length > 0 ||
          (!loading && value.length >= 2 && !isAddress)) && (
          <div
            className="fixed inset-0 z-30 bg-white/10"
            onClick={() => setShowSuggestions(false)}
          />
        )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (
              value.length >= 2 &&
              !value.startsWith("0x") &&
              suggestions.length > 0
            ) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-black border border-[#2C2C2C] rounded-lg px-2.5 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] transition-colors pl-8 text-xs ${
            error ? "border-red-500" : ""
          } ${className}`}
        />

        {/* Icon */}
        <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2">
          {isAddress ? (
            <Wallet size={14} className="text-gray-400" />
          ) : (
            <Search size={14} className="text-gray-400" />
          )}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#E2AF19]"></div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-xs mt-1 font-satoshi">{error}</p>
      )}

      {/* Suggestions dropdown - REMOVED SCROLLBAR */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-40 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-40 overflow-y-auto scrollbar-hide"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.username}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`w-full flex items-center p-2.5 hover:bg-[#2C2C2C] transition-colors text-left ${
                index === selectedIndex ? "bg-[#2C2C2C]" : ""
              }`}
            >
              {/* Avatar */}
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mr-2.5 flex items-center justify-center flex-shrink-0">
                {suggestion.avatar ? (
                  <img
                    src={suggestion.avatar}
                    alt={suggestion.username}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <User size={12} className="text-white" />
                )}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium font-satoshi truncate text-xs">
                  @{suggestion.username}
                </div>
                {suggestion.displayName && (
                  <div className="text-gray-400 text-xs font-satoshi truncate">
                    {suggestion.displayName}
                  </div>
                )}
              </div>

              {/* Active wallet indicator */}
              <div className="flex items-center text-green-400">
                <Wallet size={12} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions &&
        !loading &&
        suggestions.length === 0 &&
        value.length >= 2 &&
        !isAddress && (
          <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg p-2.5">
            <div className="text-gray-400 text-xs font-satoshi text-center">
              No users found matching "{value}"
            </div>
          </div>
        )}

      {/* CSS to hide scrollbar */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
