import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

// Test user data
const testUser = {
  id: "test-user-1",
  name: "Test User",
  email: "test@example.com",
  displayName: "Test User",
  username: "testuser",
};

interface User {
  id: string;
  name: string;
  email: string;
  displayName: string;
  username: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Check auth status
export const checkAuthStatus = createAsyncThunk(
  "auth/checkStatus",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🔍 Checking auth status...", { isTestMode });

      // In test mode, immediately return test user
      if (isTestMode) {
        console.log("🧪 Test mode: Returning test user");
        return { user: testUser };
      }

      // In production, check with server
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Auth check failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Auth check successful:", data);

      return data;
    } catch (error: any) {
      console.error("❌ Auth check failed:", error);
      return rejectWithValue(error.message || "Authentication failed");
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  "auth/login",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      console.log("🔐 Attempting login...", {
        email: credentials.email,
        isTestMode,
      });

      // In test mode, immediately return success
      if (isTestMode) {
        console.log("🧪 Test mode: Auto-login successful");
        return { user: testUser };
      }

      // In production, authenticate with server
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      console.log("✅ Login successful:", data);

      return data;
    } catch (error: any) {
      console.error("❌ Login failed:", error);
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

// Register user
export const registerUser = createAsyncThunk(
  "auth/register",
  async (
    userData: { name: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      console.log("📝 Attempting registration...", {
        email: userData.email,
        isTestMode,
      });

      // In test mode, immediately return success
      if (isTestMode) {
        console.log("🧪 Test mode: Auto-registration successful");
        return { user: testUser };
      }

      // In production, register with server
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }

      const data = await response.json();
      console.log("✅ Registration successful:", data);

      return data;
    } catch (error: any) {
      console.error("❌ Registration failed:", error);
      return rejectWithValue(error.message || "Registration failed");
    }
  }
);

// Logout user
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🚪 Attempting logout...", { isTestMode });

      // In test mode, just clear local state
      if (isTestMode) {
        console.log("🧪 Test mode: Logout successful");
        return { success: true };
      }

      // In production, logout from server
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      console.log("✅ Logout successful");
      return { success: true };
    } catch (error: any) {
      console.error("❌ Logout failed:", error);
      return rejectWithValue(error.message || "Logout failed");
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
    setAuthenticated: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setAuthenticated } = authSlice.actions;
export default authSlice.reducer;
