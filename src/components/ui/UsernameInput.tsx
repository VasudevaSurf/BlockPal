// src/components/ui/UsernameInput.tsx - UPDATED with better active wallet handling
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
    console.log("🎯 UsernameInput: User selected:", {
      username: suggestion.username,
      displayName: suggestion.displayName,
      walletAddress: suggestion.walletAddress,
      activeWalletId: suggestion.activeWalletId, // This should now be populated
    });

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
          className={`w-full bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] transition-colors pl-10 ${
            error ? "border-red-500" : ""
          } ${className}`}
        />

        {/* Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isAddress ? (
            <Wallet size={16} className="text-gray-400" />
          ) : (
            <Search size={16} className="text-gray-400" />
          )}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#E2AF19]"></div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm mt-1 font-satoshi">{error}</p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.username}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`w-full flex items-center p-3 hover:bg-[#2C2C2C] transition-colors text-left ${
                index === selectedIndex ? "bg-[#2C2C2C]" : ""
              }`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mr-3 flex items-center justify-center flex-shrink-0">
                {suggestion.avatar ? (
                  <img
                    src={suggestion.avatar}
                    alt={suggestion.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User size={16} className="text-white" />
                )}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium font-satoshi truncate">
                  @{suggestion.username}
                </div>
                {suggestion.displayName && (
                  <div className="text-gray-400 text-sm font-satoshi truncate">
                    {suggestion.displayName}
                  </div>
                )}
                {/* UPDATED: Show active wallet address with indicator */}
                <div className="text-gray-500 text-xs font-satoshi truncate flex items-center">
                  <Wallet size={10} className="mr-1 text-green-400" />
                  <span className="text-green-400 mr-1">Active:</span>
                  {suggestion.walletAddress
                    ? `${suggestion.walletAddress.slice(
                        0,
                        8
                      )}...${suggestion.walletAddress.slice(-4)}`
                    : "No wallet"}
                </div>
              </div>

              {/* Active wallet indicator */}
              <div className="flex items-center text-green-400">
                <Wallet size={14} />
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
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg p-3">
            <div className="text-gray-400 text-sm font-satoshi text-center">
              No users found matching "{value}"
            </div>
          </div>
        )}
    </div>
  );
}
