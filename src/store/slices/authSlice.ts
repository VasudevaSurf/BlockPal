import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, User } from "@/types";

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunks for API calls
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      console.log("🔐 Redux: Starting login request");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Important: Include cookies
      });

      const data = await response.json();

      console.log("📥 Redux: Login response received", {
        ok: response.ok,
        status: response.status,
        hasUser: !!data.user,
      });

      if (!response.ok) {
        console.log("❌ Redux: Login failed", data.error);
        return rejectWithValue(data.error || "Login failed");
      }

      console.log("✅ Redux: Login successful", data.user);

      // Verify cookie was set by checking document.cookie
      setTimeout(() => {
        const cookies = document.cookie;
        const hasAuthToken = cookies.includes("auth-token");
        console.log("🍪 Redux: Cookie check after login:", hasAuthToken);
      }, 100);

      return data.user;
    } catch (error) {
      console.error("💥 Redux: Network error", error);
      return rejectWithValue("Network error occurred");
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include", // Important: Include cookies
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Registration failed");
      }

      return data.user;
    } catch (error) {
      return rejectWithValue("Network error occurred");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Logout failed");
      }

      return null;
    } catch (error) {
      return rejectWithValue("Network error occurred");
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

      const data = await response.json();
      console.log("✅ Redux: Auth check successful", data.user);
      return data.user;
    } catch (error) {
      console.error("💥 Redux: Auth check error", error);
      return rejectWithValue("Network error occurred");
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
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Register cases
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
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
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null; // Don't set error for auth check failure
      });
  },
});

export const { clearError, setLoading, setAuthenticated, setUnauthenticated } =
  authSlice.actions;
export default authSlice.reducer;
