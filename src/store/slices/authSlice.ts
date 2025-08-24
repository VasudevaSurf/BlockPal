// src/store/slices/authSlice.ts - UPDATED FOR WALLET-FIRST AUTH
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, User } from "@/types";
import { AppDispatch } from "@/store";

// Import wallet actions for cleanup
import { clearWalletState, logoutAndClearWallet } from "./walletSlice";
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

// Helper function to emit logout event for cleanup
const emitLogoutEvent = () => {
  if (typeof window !== "undefined") {
    console.log("🚪 Emitting logout event");
    window.dispatchEvent(new Event("userLogout"));
  }
};

// Check authentication status
export const checkAuthStatus = createAsyncThunk<
  User,
  void,
  { dispatch: AppDispatch }
>("auth/checkAuthStatus", async (_, { rejectWithValue, dispatch }) => {
  try {
    console.log("🔍 Redux: Checking wallet-based auth status");

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
      return rejectWithValue("Not authenticated");
    }

    let data;
    try {
      data = await safeJsonParse(response);
    } catch (parseError) {
      console.error("❌ Failed to parse auth check response:", parseError);
      dispatch(clearWalletState());
      return rejectWithValue("Server returned invalid response");
    }

    if (!data.user) {
      dispatch(clearWalletState());
      return rejectWithValue("No user data in auth response");
    }

    console.log("✅ Redux: Wallet-based auth check successful", data.user);
    return data.user;
  } catch (error) {
    console.error("💥 Redux: Network error during auth check:", error);

    dispatch(clearWalletState());

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return rejectWithValue("Network connection failed");
    }

    return rejectWithValue("An unexpected error occurred");
  }
});

// Logout user and clear all data
export const logoutUser = createAsyncThunk<
  null,
  void,
  { dispatch: AppDispatch }
>("auth/logoutUser", async (_, { rejectWithValue, dispatch }) => {
  try {
    console.log("🚪 Redux: Starting wallet-based logout");

    // Emit logout event first
    emitLogoutEvent();

    // Clear all wallet state and localStorage immediately
    dispatch(logoutAndClearWallet());
    dispatch(resetUIState());

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

    // Ensure everything is cleared after API call
    dispatch(logoutAndClearWallet());

    return null;
  } catch (error) {
    console.error("💥 Redux: Network error during logout:", error);

    // Still clear local state even if network fails
    dispatch(logoutAndClearWallet());

    return null;
  }
});

// Create wallet-based user
export const createWalletUser = createAsyncThunk<
  User,
  { username: string; password: string; walletAddress: string },
  { dispatch: AppDispatch }
>("auth/createWalletUser", async (userData, { rejectWithValue, dispatch }) => {
  try {
    console.log("📝 Redux: Creating wallet-based user");

    // Clear any existing state before creating user
    dispatch(clearWalletState());
    dispatch(resetUIState());

    const response = await fetch("/api/auth/create-wallet-user", {
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
      console.error("❌ Failed to parse create user response:", parseError);
      return rejectWithValue("Server returned invalid response");
    }

    if (!response.ok) {
      return rejectWithValue(data.error || `Server error: ${response.status}`);
    }

    if (!data.user) {
      return rejectWithValue("User creation failed - no user data");
    }

    console.log("✅ Redux: Wallet-based user created successfully");
    return data.user;
  } catch (error) {
    console.error("💥 Redux: Network error during user creation:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return rejectWithValue(
        "Network connection failed. Please check your internet connection."
      );
    }

    return rejectWithValue("An unexpected error occurred during user creation");
  }
});

// Verify wallet user (login)
export const verifyWalletUser = createAsyncThunk<
  User,
  { walletAddress: string; password: string },
  { dispatch: AppDispatch }
>(
  "auth/verifyWalletUser",
  async (credentials, { rejectWithValue, dispatch }) => {
    try {
      console.log("🔐 Redux: Verifying wallet-based user");

      // Clear any existing state before login
      dispatch(clearWalletState());
      dispatch(resetUIState());

      const response = await fetch("/api/auth/verify-wallet-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      console.log("📥 Redux: Verify response received", {
        ok: response.ok,
        status: response.status,
      });

      let data;
      try {
        data = await safeJsonParse(response);
      } catch (parseError) {
        console.error("❌ Failed to parse verify response:", parseError);
        return rejectWithValue("Server returned invalid response");
      }

      if (!response.ok) {
        console.log("❌ Redux: Verification failed", data.error);
        return rejectWithValue(
          data.error || `Server error: ${response.status}`
        );
      }

      if (!data.user) {
        console.error("❌ Redux: No user data in successful response");
        return rejectWithValue("Authentication failed - no user data");
      }

      console.log("✅ Redux: Wallet verification successful", data.user);
      return data.user;
    } catch (error) {
      console.error("💥 Redux: Network error during verification:", error);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        return rejectWithValue(
          "Network connection failed. Please check your internet connection."
        );
      }

      return rejectWithValue(
        "An unexpected error occurred during authentication"
      );
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
    setAuthenticated: (state, action: PayloadAction<User>) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
      state.loading = false;
      console.log(
        "✅ Redux: User set as authenticated",
        action.payload.username
      );
    },
    setUnauthenticated: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      state.loading = false;
      console.log("🚪 Redux: User set as unauthenticated");
    },
    resetAuthState: (state) => {
      console.log("🧹 Redux: Resetting auth state");
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Check auth status cases
    builder
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
        // Reset to initial state on auth check failure
        Object.assign(state, initialState);
      });

    // Create wallet user cases
    builder
      .addCase(createWalletUser.pending, (state) => {
        console.log("🔄 Redux: Wallet user creation pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(createWalletUser.fulfilled, (state, action) => {
        console.log("✅ Redux: Wallet user creation fulfilled", action.payload);
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(createWalletUser.rejected, (state, action) => {
        console.log("❌ Redux: Wallet user creation rejected", action.payload);
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      });

    // Verify wallet user cases
    builder
      .addCase(verifyWalletUser.pending, (state) => {
        console.log("🔄 Redux: Wallet user verification pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyWalletUser.fulfilled, (state, action) => {
        console.log(
          "✅ Redux: Wallet user verification fulfilled",
          action.payload
        );
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(verifyWalletUser.rejected, (state, action) => {
        console.log(
          "❌ Redux: Wallet user verification rejected",
          action.payload
        );
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      });

    // Logout cases
    builder
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
