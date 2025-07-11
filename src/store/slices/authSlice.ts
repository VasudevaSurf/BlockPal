// src/store/slices/authSlice.ts - FIXED with proper error handling
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, User } from "@/types";

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Helper function to safely parse JSON responses
const safeJsonParse = async (response: Response) => {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error("Empty response from server");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("JSON parse error:", error);
    console.error("Raw response:", text);
    throw new Error("Invalid response format from server");
  }
};

// Async thunks for API calls
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (
    credentials: {
      email: string;
      password: string;
      twoFactorCode?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      console.log("🔐 Redux: Starting login request");
      console.log("📧 Email:", credentials.email);
      console.log("🔑 Has 2FA code:", !!credentials.twoFactorCode);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      console.log("📥 Redux: Login response received", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      // Handle different response types
      let data;
      try {
        data = await safeJsonParse(response);
      } catch (parseError) {
        console.error("❌ Failed to parse login response:", parseError);
        return rejectWithValue("Server returned invalid response");
      }

      console.log("📋 Redux: Parsed response data:", {
        hasUser: !!data.user,
        error: data.error,
        requiresTwoFactor: !!data.requiresTwoFactor,
      });

      if (!response.ok) {
        console.log("❌ Redux: Login failed", data.error);

        // Handle 2FA requirement
        if (data.error === "2FA_REQUIRED" || data.requiresTwoFactor) {
          console.log("🔐 Redux: 2FA required");
          return rejectWithValue("2FA_REQUIRED");
        }

        return rejectWithValue(
          data.error || `Server error: ${response.status}`
        );
      }

      // Handle successful response that still requires 2FA
      if (data.requiresTwoFactor && !data.user) {
        console.log("🔐 Redux: 2FA required (success response)");
        return rejectWithValue("2FA_REQUIRED");
      }

      if (!data.user) {
        console.error("❌ Redux: No user data in successful response");
        return rejectWithValue("Authentication failed - no user data");
      }

      console.log("✅ Redux: Login successful", data.user);

      // Verify cookie was set
      setTimeout(() => {
        if (typeof window !== "undefined") {
          const cookies = document.cookie;
          const hasAuthToken = cookies.includes("auth-token");
          console.log("🍪 Redux: Cookie check after login:", hasAuthToken);
        }
      }, 100);

      return data.user;
    } catch (error) {
      console.error("💥 Redux: Network error during login:", error);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        return rejectWithValue(
          "Network connection failed. Please check your internet connection."
        );
      }

      return rejectWithValue("An unexpected error occurred during login");
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (
    userData: { name: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      console.log("📝 Redux: Starting registration request");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include",
      });

      let data;
      try {
        data = await safeJsonParse(response);
      } catch (parseError) {
        console.error("❌ Failed to parse registration response:", parseError);
        return rejectWithValue("Server returned invalid response");
      }

      if (!response.ok) {
        return rejectWithValue(
          data.error || `Server error: ${response.status}`
        );
      }

      if (!data.user) {
        return rejectWithValue("Registration failed - no user data");
      }

      console.log("✅ Redux: Registration successful");
      return data.user;
    } catch (error) {
      console.error("💥 Redux: Network error during registration:", error);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        return rejectWithValue(
          "Network connection failed. Please check your internet connection."
        );
      }

      return rejectWithValue(
        "An unexpected error occurred during registration"
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🚪 Redux: Starting logout request");

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Don't parse response for logout - just check if it succeeded
      if (!response.ok) {
        console.warn(
          "⚠️ Redux: Logout API failed, but continuing with local cleanup"
        );
        // Don't reject - we still want to clear local state
      } else {
        console.log("✅ Redux: Logout API successful");
      }

      // Always clear local storage regardless of API response
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeWalletId");
        localStorage.removeItem("auth-token");

        // Clear any other cached data
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (
            key.startsWith("wallet-") ||
            key.startsWith("token-") ||
            key.startsWith("blockpal-")
          ) {
            localStorage.removeItem(key);
          }
        });
      }

      return null;
    } catch (error) {
      console.error("💥 Redux: Network error during logout:", error);

      // Still clear local state even if network fails
      if (typeof window !== "undefined") {
        localStorage.clear();
      }

      // Don't reject logout - we want to clear state regardless
      return null;
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  "auth/checkAuthStatus",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🔍 Redux: Checking auth status");

      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      console.log("📥 Redux: Auth check response", {
        ok: response.ok,
        status: response.status,
      });

      if (!response.ok) {
        console.log("❌ Redux: Auth check failed");
        return rejectWithValue("Not authenticated");
      }

      let data;
      try {
        data = await safeJsonParse(response);
      } catch (parseError) {
        console.error("❌ Failed to parse auth check response:", parseError);
        return rejectWithValue("Server returned invalid response");
      }

      if (!data.user) {
        return rejectWithValue("No user data in auth response");
      }

      console.log("✅ Redux: Auth check successful", data.user);
      return data.user;
    } catch (error) {
      console.error("💥 Redux: Network error during auth check:", error);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        return rejectWithValue("Network connection failed");
      }

      return rejectWithValue("An unexpected error occurred");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // Add manual authentication setter
    setAuthenticated: (state, action: PayloadAction<User>) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
      state.loading = false;
    },
    // Add manual logout
    setUnauthenticated: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      state.loading = false;
    },
    // Reset auth state completely
    resetAuthState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login cases
    builder
      .addCase(loginUser.pending, (state) => {
        console.log("🔄 Redux: Login pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        console.log("✅ Redux: Login fulfilled", action.payload);
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        console.log("❌ Redux: Login rejected", action.payload);
        state.loading = false;

        // Don't clear authentication state if 2FA is required
        if (action.payload !== "2FA_REQUIRED") {
          state.isAuthenticated = false;
          state.user = null;
        }

        state.error = action.payload as string;
      })
      // Register cases
      .addCase(registerUser.pending, (state) => {
        console.log("🔄 Redux: Registration pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        console.log("✅ Redux: Registration fulfilled", action.payload);
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        console.log("❌ Redux: Registration rejected", action.payload);
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        console.log("🔄 Redux: Logout pending");
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        console.log("✅ Redux: Logout fulfilled");
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        console.log("⚠️ Redux: Logout rejected, but clearing state anyway");
        // Even if logout API fails, clear the state
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null; // Don't show error for logout
      })
      // Check auth status cases
      .addCase(checkAuthStatus.pending, (state) => {
        console.log("🔄 Redux: Auth status check pending");
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        console.log("✅ Redux: Auth status check fulfilled", action.payload);
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        console.log("❌ Redux: Auth status check rejected", action.payload);
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null; // Don't set error for auth check failure
      });
  },
});

export const {
  clearError,
  setLoading,
  setAuthenticated,
  setUnauthenticated,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;
