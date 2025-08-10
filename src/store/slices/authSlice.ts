// src/store/slices/authSlice.ts - FIXED with proper state cleanup
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, User } from "@/types";
import { AppDispatch } from "@/store";

// Import wallet actions for cleanup
import { clearWalletState } from "./walletSlice";
import { resetUIState } from "./uiSlice";

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

// Helper function to clear all app data
const clearAllAppData = () => {
  if (typeof window !== "undefined") {
    console.log("🧹 Clearing all app data from storage");

    // Clear specific keys
    const keysToRemove = [
      "activeWalletId",
      "auth-token",
      "walletNameOverrides",
      "dashboard-user-data-v2",
      "dashboard-user-data",
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear any prefixed keys
    const allLocalKeys = Object.keys(localStorage);
    const allSessionKeys = Object.keys(sessionStorage);

    allLocalKeys.forEach((key) => {
      if (
        key.startsWith("wallet-") ||
        key.startsWith("token-") ||
        key.startsWith("blockpal-") ||
        key.startsWith("dashboard-") ||
        key.startsWith("cache-") ||
        key.startsWith("realtime-")
      ) {
        localStorage.removeItem(key);
      }
    });

    allSessionKeys.forEach((key) => {
      if (
        key.startsWith("wallet") ||
        key.startsWith("token") ||
        key.startsWith("blockpal") ||
        key.startsWith("dashboard") ||
        key.startsWith("cache") ||
        key.startsWith("realtime")
      ) {
        sessionStorage.removeItem(key);
      }
    });

    console.log("✅ Storage cleared");
  }
};

// Async thunks for API calls
export const loginUser = createAsyncThunk<
  User,
  { email: string; password: string; twoFactorCode?: string },
  { dispatch: AppDispatch }
>("auth/loginUser", async (credentials, { rejectWithValue, dispatch }) => {
  try {
    console.log("🔐 Redux: Starting login request");

    // Clear any existing state before login
    dispatch(clearWalletState());
    dispatch(resetUIState());
    clearAllAppData();

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
    });

    let data;
    try {
      data = await safeJsonParse(response);
    } catch (parseError) {
      console.error("❌ Failed to parse login response:", parseError);
      return rejectWithValue("Server returned invalid response");
    }

    if (!response.ok) {
      console.log("❌ Redux: Login failed", data.error);

      if (data.error === "2FA_REQUIRED" || data.requiresTwoFactor) {
        console.log("🔐 Redux: 2FA required");
        return rejectWithValue("2FA_REQUIRED");
      }

      return rejectWithValue(data.error || `Server error: ${response.status}`);
    }

    if (data.requiresTwoFactor && !data.user) {
      console.log("🔐 Redux: 2FA required (success response)");
      return rejectWithValue("2FA_REQUIRED");
    }

    if (!data.user) {
      console.error("❌ Redux: No user data in successful response");
      return rejectWithValue("Authentication failed - no user data");
    }

    console.log("✅ Redux: Login successful", data.user);

    // Clear wallet state after successful login to ensure clean slate
    dispatch(clearWalletState());

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
});

export const registerUser = createAsyncThunk<
  User,
  { name: string; email: string; password: string },
  { dispatch: AppDispatch }
>("auth/registerUser", async (userData, { rejectWithValue, dispatch }) => {
  try {
    console.log("📝 Redux: Starting registration request");

    // Clear any existing state before registration
    dispatch(clearWalletState());
    dispatch(resetUIState());
    clearAllAppData();

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
      return rejectWithValue(data.error || `Server error: ${response.status}`);
    }

    if (!data.user) {
      return rejectWithValue("Registration failed - no user data");
    }

    console.log("✅ Redux: Registration successful");

    // Clear wallet state after successful registration
    dispatch(clearWalletState());

    return data.user;
  } catch (error) {
    console.error("💥 Redux: Network error during registration:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return rejectWithValue(
        "Network connection failed. Please check your internet connection."
      );
    }

    return rejectWithValue("An unexpected error occurred during registration");
  }
});

export const logoutUser = createAsyncThunk<
  null,
  void,
  { dispatch: AppDispatch }
>("auth/logoutUser", async (_, { rejectWithValue, dispatch }) => {
  try {
    console.log("🚪 Redux: Starting logout request");

    // Clear all state immediately
    dispatch(clearWalletState());
    dispatch(resetUIState());
    clearAllAppData();

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      console.warn(
        "⚠️ Redux: Logout API failed, but continuing with local cleanup"
      );
    } else {
      console.log("✅ Redux: Logout API successful");
    }

    // Force clear everything again after API call
    clearAllAppData();

    // Clear any service workers or cached data
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      } catch (error) {
        console.log("Could not clear caches:", error);
      }
    }

    return null;
  } catch (error) {
    console.error("💥 Redux: Network error during logout:", error);

    // Still clear local state even if network fails
    clearAllAppData();

    return null;
  }
});

export const checkAuthStatus = createAsyncThunk<
  User,
  void,
  { dispatch: AppDispatch }
>("auth/checkAuthStatus", async (_, { rejectWithValue, dispatch }) => {
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
      // Clear state if auth check fails
      dispatch(clearWalletState());
      clearAllAppData();
      return rejectWithValue("Not authenticated");
    }

    let data;
    try {
      data = await safeJsonParse(response);
    } catch (parseError) {
      console.error("❌ Failed to parse auth check response:", parseError);
      dispatch(clearWalletState());
      clearAllAppData();
      return rejectWithValue("Server returned invalid response");
    }

    if (!data.user) {
      dispatch(clearWalletState());
      clearAllAppData();
      return rejectWithValue("No user data in auth response");
    }

    console.log("✅ Redux: Auth check successful", data.user);
    return data.user;
  } catch (error) {
    console.error("💥 Redux: Network error during auth check:", error);

    dispatch(clearWalletState());
    clearAllAppData();

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return rejectWithValue("Network connection failed");
    }

    return rejectWithValue("An unexpected error occurred");
  }
});

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
    setAuthenticated: (state, action: PayloadAction<User>) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
      state.loading = false;
    },
    setUnauthenticated: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      state.loading = false;
    },
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
        // Reset to initial state
        Object.assign(state, initialState);
      })
      .addCase(logoutUser.rejected, (state) => {
        console.log("⚠️ Redux: Logout rejected, but clearing state anyway");
        // Even if logout API fails, clear the state
        Object.assign(state, initialState);
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
      .addCase(checkAuthStatus.rejected, (state) => {
        console.log("❌ Redux: Auth status check rejected");
        // Reset to initial state on auth check failure
        Object.assign(state, initialState);
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
