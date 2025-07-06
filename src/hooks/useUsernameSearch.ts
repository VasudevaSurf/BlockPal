// src/hooks/useUsernameSearch.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";

export interface UserSuggestion {
  username: string;
  displayName?: string;
  avatar?: string;
  walletAddress: string;
}

export const useUsernameSearch = () => {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // If it looks like an address (starts with 0x and 40+ chars), don't search
      if (/^0x[a-fA-F0-9]{40,}$/.test(searchTerm)) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchTerm)}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to search users");
        }

        const data = await response.json();
        setSuggestions(data.users || []);
      } catch (err: any) {
        console.error("Username search error:", err);
        setError(err.message || "Failed to search users");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const searchUsers = useCallback(
    (searchTerm: string) => {
      setLoading(true);
      debouncedSearch(searchTerm);
    },
    [debouncedSearch]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setLoading(false);
    setError("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return {
    suggestions,
    loading,
    error,
    searchUsers,
    clearSuggestions,
  };
};
