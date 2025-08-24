// src/store/slices/walletSlice.ts - UPDATED FOR WALLET-FIRST AUTH
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { WalletState, Wallet, Token } from "@/types";

const initialState: WalletState = {
  wallets: [],
  activeWallet: null,
  tokens: [],
  totalBalance: 0,
  loading: false,
  error: null,
};

// Track pending requests to prevent duplicates
const pendingRequests = new Set<string>();

// Helper to clear wallet-related storage (but preserve primary wallet data)
const clearWalletStorage = () => {
  if (typeof window !== "undefined") {
    console.log("🧹 Clearing wallet storage (preserving primary wallet)");

    // Clear dashboard data but keep primary wallet info
    localStorage.removeItem("dashboard-user-data");
    localStorage.removeItem("dashboard-user-data-v2");
    sessionStorage.removeItem("walletNameOverrides");

    // Clear any cached wallet data (but not primary wallet credentials)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("token-") ||
          key.startsWith("dashboard-") ||
          key.startsWith("realtime-")) &&
        // DON'T remove primary wallet data
        !key.includes("primaryWallet") &&
        !key.includes("walletPrivateKey") &&
        !key.includes("walletMnemonic")
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log("✅ Wallet storage cleared (primary wallet preserved)");
  }
};

// Get primary wallet from localStorage
const getPrimaryWalletFromStorage = (): {
  address: string;
  privateKey: string;
  mnemonic?: string;
} | null => {
  if (typeof window === "undefined") return null;

  try {
    const primaryWallet = localStorage.getItem("primaryWallet");
    const privateKey = localStorage.getItem("walletPrivateKey");
    const mnemonic = localStorage.getItem("walletMnemonic");

    if (!primaryWallet || !privateKey) return null;

    const walletInfo = JSON.parse(primaryWallet);
    return {
      address: walletInfo.address,
      privateKey,
      mnemonic: mnemonic || undefined,
    };
  } catch (error) {
    console.error("Error reading primary wallet from storage:", error);
    return null;
  }
};

// Async thunks for wallet operations
export const initializePrimaryWallet = createAsyncThunk(
  "wallet/initializePrimaryWallet",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🎯 Initializing primary wallet from localStorage");

      const walletData = getPrimaryWalletFromStorage();
      if (!walletData) {
        return rejectWithValue("No primary wallet found in storage");
      }

      // Create the primary wallet object
      const primaryWallet: Wallet = {
        id: "primary",
        name: "Primary Wallet",
        address: walletData.address,
        balance: 0,
        isActive: true,
      };

      console.log("✅ Primary wallet initialized:", {
        address: walletData.address.slice(0, 10) + "...",
        hasPrivateKey: !!walletData.privateKey,
        hasMnemonic: !!walletData.mnemonic,
      });

      return { wallet: primaryWallet, walletData };
    } catch (error) {
      console.error("❌ Error initializing primary wallet:", error);
      return rejectWithValue("Failed to initialize primary wallet");
    }
  }
);

export const fetchWalletTokens = createAsyncThunk(
  "wallet/fetchWalletTokens",
  async (walletAddress: string, { rejectWithValue, getState }) => {
    const requestKey = `fetchWalletTokens:${walletAddress}`;

    // Check if user is authenticated
    const state = getState() as any;
    if (!state.auth.isAuthenticated) {
      console.log("⚠️ Not authenticated, skipping token fetch");
      return { tokens: [], walletAddress };
    }

    if (pendingRequests.has(requestKey)) {
      console.log(
        `🔄 fetchWalletTokens for ${walletAddress} already pending, skipping...`
      );
      return rejectWithValue("Request already pending");
    }

    try {
      pendingRequests.add(requestKey);
      console.log("📡 Fetching tokens for wallet:", walletAddress);

      const response = await fetch(
        `/api/wallets/tokens?walletAddress=${walletAddress}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.log("⚠️ Unauthorized, returning empty tokens");
          return { tokens: [], walletAddress };
        }
        return rejectWithValue("Failed to fetch wallet tokens");
      }

      const data = await response.json();
      console.log("✅ Tokens fetched successfully:", data.tokens?.length || 0);
      return { tokens: data.tokens || [], walletAddress };
    } catch (error) {
      console.error("❌ Error fetching wallet tokens:", error);
      return rejectWithValue("Network error occurred");
    } finally {
      pendingRequests.delete(requestKey);
    }
  }
);

export const updateWalletBalance = createAsyncThunk(
  "wallet/updateWalletBalance",
  async (walletAddress: string, { rejectWithValue }) => {
    const requestKey = `updateWalletBalance:${walletAddress}`;

    if (pendingRequests.has(requestKey)) {
      console.log(
        `🔄 updateWalletBalance for ${walletAddress} already pending, skipping...`
      );
      return rejectWithValue("Request already pending");
    }

    try {
      pendingRequests.add(requestKey);
      console.log("📡 Updating balance for wallet:", walletAddress);

      const response = await fetch(
        `/api/wallets/balance?walletAddress=${walletAddress}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.log(
          "ℹ️ Balance endpoint not available, using default balance of 0"
        );
        return { walletAddress, balance: 0 };
      }

      const data = await response.json();
      console.log("✅ Balance updated successfully:", data.balance);
      return { walletAddress, balance: data.balance };
    } catch (error) {
      console.error("❌ Error updating wallet balance:", error);
      return { walletAddress, balance: 0 };
    } finally {
      pendingRequests.delete(requestKey);
    }
  }
);

// Set active wallet in database (for compatibility with existing components)
export const setActiveWalletInDB = createAsyncThunk(
  "wallet/setActiveWalletInDB",
  async (walletId: string, { rejectWithValue }) => {
    try {
      console.log("🎯 Setting active wallet in DB (wallet-first):", walletId);

      // In wallet-first auth, we don't need to store active wallet in DB
      // since there's only one primary wallet per user
      // But we keep this for compatibility with existing components

      return { activeWalletId: walletId, success: true };
    } catch (error) {
      console.error("❌ Error setting active wallet in DB:", error);
      return rejectWithValue("Network error occurred");
    }
  }
);

// Get active wallet from database (for compatibility)
export const getActiveWalletFromDB = createAsyncThunk(
  "wallet/getActiveWalletFromDB",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🔍 Getting active wallet from DB (wallet-first)");

      // In wallet-first auth, we just return the primary wallet as active
      const walletData = getPrimaryWalletFromStorage();
      if (!walletData) {
        return rejectWithValue("No primary wallet found");
      }

      return {
        activeWalletId: "primary",
        activeWallet: {
          id: "primary",
          address: walletData.address,
        },
      };
    } catch (error) {
      console.error("❌ Error getting active wallet from DB:", error);
      return rejectWithValue("Network error occurred");
    }
  }
);

// Fetch wallets (for compatibility - returns primary wallet)
export const fetchWallets = createAsyncThunk(
  "wallet/fetchWallets",
  async (_, { rejectWithValue, getState }) => {
    const requestKey = "fetchWallets";

    // Check if user is authenticated before fetching
    const state = getState() as any;
    if (!state.auth.isAuthenticated) {
      console.log("⚠️ Not authenticated, skipping wallet fetch");
      return [];
    }

    if (pendingRequests.has(requestKey)) {
      console.log("🔄 fetchWallets already pending, skipping...");
      return rejectWithValue("Request already pending");
    }

    try {
      pendingRequests.add(requestKey);
      console.log("📡 Fetching wallets (wallet-first)...");

      const walletData = getPrimaryWalletFromStorage();
      if (!walletData) {
        console.log("⚠️ No primary wallet found in storage");
        return [];
      }

      // Return primary wallet as the only wallet
      const primaryWallet = {
        _id: "primary",
        id: "primary",
        walletName: "Primary Wallet",
        name: "Primary Wallet",
        walletAddress: walletData.address,
        address: walletData.address,
        isDefault: true,
      };

      console.log(
        "✅ Primary wallet fetched:",
        walletData.address.slice(0, 10) + "..."
      );
      return [primaryWallet];
    } catch (error) {
      console.error("❌ Error fetching wallets:", error);
      return rejectWithValue("Network error occurred");
    } finally {
      pendingRequests.delete(requestKey);
    }
  }
);

// Get wallet credentials from localStorage
export const getWalletCredentials = createAsyncThunk(
  "wallet/getWalletCredentials",
  async (_, { rejectWithValue }) => {
    try {
      const walletData = getPrimaryWalletFromStorage();
      if (!walletData) {
        return rejectWithValue("No wallet credentials found");
      }

      return {
        address: walletData.address,
        privateKey: walletData.privateKey,
        mnemonic: walletData.mnemonic,
      };
    } catch (error) {
      console.error("❌ Error getting wallet credentials:", error);
      return rejectWithValue("Failed to get wallet credentials");
    }
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    // Clear wallet state completely (for logout)
    clearWalletState: (state) => {
      console.log("🧹 Clearing wallet state");

      // Clear all pending requests
      pendingRequests.clear();

      // Clear storage (but preserve primary wallet for re-auth)
      clearWalletStorage();

      // Reset to initial state
      Object.assign(state, initialState);

      console.log("✅ Wallet state cleared");
    },

    // Set the primary wallet as active
    setPrimaryWalletActive: (state, action: PayloadAction<Wallet>) => {
      console.log(
        "🎯 Setting primary wallet as active:",
        action.payload.address
      );

      state.wallets = [action.payload];
      state.activeWallet = action.payload;
      state.tokens = []; // Clear tokens to trigger fresh fetch

      console.log("✅ Primary wallet set as active");
    },

    // Set active wallet (for compatibility with existing components)
    setActiveWallet: (state, action: PayloadAction<string>) => {
      console.log("🎯 Setting active wallet locally:", action.payload);

      if (action.payload === "primary" && state.wallets.length > 0) {
        const primaryWallet = state.wallets[0];
        primaryWallet.isActive = true;
        state.activeWallet = primaryWallet;
        state.tokens = []; // Clear tokens to trigger fresh fetch
        console.log("✅ Primary wallet set as active (compatibility mode)");
      }
    },

    setTokens: (state, action: PayloadAction<Token[]>) => {
      state.tokens = action.payload;
      state.totalBalance = action.payload.reduce(
        (total, token) => total + token.value,
        0
      );
      console.log("📊 Tokens updated:", action.payload.length);
    },

    setTotalBalance: (state, action: PayloadAction<number>) => {
      state.totalBalance = action.payload;
      if (state.activeWallet) {
        state.activeWallet.balance = action.payload;
      }
    },

    updateToken: (state, action: PayloadAction<Token>) => {
      const tokenIndex = state.tokens.findIndex(
        (t) => t.id === action.payload.id
      );
      if (tokenIndex !== -1) {
        state.tokens[tokenIndex] = action.payload;
      } else {
        state.tokens.push(action.payload);
      }

      state.totalBalance = state.tokens.reduce(
        (total, token) => total + token.value,
        0
      );
    },

    updateTokens: (state, action: PayloadAction<Token[]>) => {
      action.payload.forEach((updatedToken) => {
        const tokenIndex = state.tokens.findIndex(
          (t) => t.id === updatedToken.id
        );
        if (tokenIndex !== -1) {
          state.tokens[tokenIndex] = updatedToken;
        } else {
          state.tokens.push(updatedToken);
        }
      });

      state.totalBalance = state.tokens.reduce(
        (total, token) => total + token.value,
        0
      );
    },

    clearError: (state) => {
      state.error = null;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    updateTokenBalance: (
      state,
      action: PayloadAction<{ tokenId: string; balance: number; value: number }>
    ) => {
      const { tokenId, balance, value } = action.payload;
      const token = state.tokens.find((t) => t.id === tokenId);
      if (token) {
        token.balance = balance;
        token.value = value;

        state.totalBalance = state.tokens.reduce(
          (total, token) => total + token.value,
          0
        );
      }
    },

    addToken: (state, action: PayloadAction<Token>) => {
      const existingToken = state.tokens.find(
        (t) => t.id === action.payload.id
      );
      if (!existingToken) {
        state.tokens.push(action.payload);

        state.totalBalance = state.tokens.reduce(
          (total, token) => total + token.value,
          0
        );
      }
    },

    removeToken: (state, action: PayloadAction<string>) => {
      state.tokens = state.tokens.filter((t) => t.id !== action.payload);

      state.totalBalance = state.tokens.reduce(
        (total, token) => total + token.value,
        0
      );
    },

    clearTokens: (state) => {
      state.tokens = [];
      state.totalBalance = 0;
    },

    setRealtimeData: (
      state,
      action: PayloadAction<{
        tokens: Token[];
        totalBalance: number;
        walletBalance: number;
      }>
    ) => {
      const { tokens, totalBalance, walletBalance } = action.payload;
      state.tokens = tokens;
      state.totalBalance = totalBalance;

      if (state.activeWallet) {
        state.activeWallet.balance = walletBalance;
      }
    },

    updatePortfolioValue: (state, action: PayloadAction<number>) => {
      state.totalBalance = action.payload;
      if (state.activeWallet) {
        state.activeWallet.balance = action.payload;
      }
    },

    // Logout and clear all wallet data including localStorage
    logoutAndClearWallet: (state) => {
      console.log("🚪 Logging out and clearing all wallet data");

      // Clear all pending requests
      pendingRequests.clear();

      // Clear ALL localStorage including wallet credentials
      if (typeof window !== "undefined") {
        localStorage.removeItem("primaryWallet");
        localStorage.removeItem("walletPrivateKey");
        localStorage.removeItem("walletMnemonic");
        localStorage.clear();
        sessionStorage.clear();
      }

      // Reset to initial state
      Object.assign(state, initialState);

      console.log("✅ Complete wallet logout and cleanup completed");
    },
  },

  extraReducers: (builder) => {
    // Initialize primary wallet
    builder
      .addCase(initializePrimaryWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializePrimaryWallet.fulfilled, (state, action) => {
        state.loading = false;
        const { wallet } = action.payload;

        state.wallets = [wallet];
        state.activeWallet = wallet;
        state.error = null;

        console.log("✅ Primary wallet initialized in state");
      })
      .addCase(initializePrimaryWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error(
          "❌ Failed to initialize primary wallet:",
          action.payload
        );
      });

    // Handle setActiveWalletInDB (compatibility)
    builder
      .addCase(setActiveWalletInDB.fulfilled, (state, action) => {
        console.log("✅ Active wallet set in DB (compatibility mode)");
      })
      .addCase(setActiveWalletInDB.rejected, (state, action) => {
        console.warn("⚠️ Failed to set active wallet in DB:", action.payload);
      });

    // Handle getActiveWalletFromDB (compatibility)
    builder
      .addCase(getActiveWalletFromDB.fulfilled, (state, action) => {
        const { activeWalletId } = action.payload;
        console.log(
          "✅ Active wallet from DB (compatibility):",
          activeWalletId
        );
      })
      .addCase(getActiveWalletFromDB.rejected, (state, action) => {
        console.warn("⚠️ Failed to get active wallet from DB:", action.payload);
      });

    // Fetch wallets (compatibility - returns primary wallet)
    builder
      .addCase(fetchWallets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWallets.fulfilled, (state, action) => {
        state.loading = false;

        if (
          action.payload &&
          Array.isArray(action.payload) &&
          action.payload.length > 0
        ) {
          state.wallets = action.payload.map((wallet: any) => ({
            id: wallet._id?.toString() || wallet.id,
            name: wallet.walletName || wallet.name,
            address: wallet.walletAddress || wallet.address,
            balance: 0,
            isActive: true, // Primary wallet is always active
          }));

          // Set the first (and only) wallet as active
          if (state.wallets.length > 0) {
            state.activeWallet = state.wallets[0];
          }

          console.log("✅ Primary wallet loaded:", state.wallets.length);
        } else {
          // If no wallets, ensure state is clean
          state.wallets = [];
          state.activeWallet = null;
        }

        state.error = null;
      })
      .addCase(fetchWallets.rejected, (state, action) => {
        state.loading = false;
        if (action.payload !== "Request already pending") {
          state.error = action.payload as string;
        }
      });

    // Fetch wallet tokens
    builder
      .addCase(fetchWalletTokens.pending, (state) => {
        if (state.tokens.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchWalletTokens.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload && action.payload.tokens) {
          state.tokens = action.payload.tokens.map((token: any) => ({
            id: token.contractAddress || `${token.symbol}-${Date.now()}`,
            symbol: token.symbol,
            name: token.name,
            balance: token.balance || 0,
            value: token.value || 0,
            change24h: token.change24h || 0,
            icon: token.logoUrl || "/icons/default-token.svg",
            price: token.price || 0,
            contractAddress: token.contractAddress,
            decimals: token.decimals || 18,
          }));

          state.totalBalance = state.tokens.reduce(
            (total, token) => total + token.value,
            0
          );

          console.log(
            "📊 Tokens loaded:",
            state.tokens.length,
            "Total value:",
            state.totalBalance
          );
        } else {
          state.tokens = [];
          state.totalBalance = 0;
        }

        state.error = null;
      })
      .addCase(fetchWalletTokens.rejected, (state, action) => {
        state.loading = false;
        if (action.payload !== "Request already pending") {
          state.error = action.payload as string;
        }
      });

    // Update wallet balance
    builder.addCase(updateWalletBalance.fulfilled, (state, action) => {
      const { walletAddress, balance } = action.payload;
      const wallet = state.wallets.find((w) => w.address === walletAddress);
      if (wallet) {
        wallet.balance = balance;
        if (wallet.isActive && state.tokens.length === 0) {
          state.totalBalance = balance;
        }
      }
    });

    // Get wallet credentials
    builder
      .addCase(getWalletCredentials.fulfilled, (state, action) => {
        // Credentials are returned but not stored in Redux state for security
        console.log("✅ Wallet credentials retrieved from localStorage");
      })
      .addCase(getWalletCredentials.rejected, (state, action) => {
        state.error = action.payload as string;
        console.error("❌ Failed to get wallet credentials:", action.payload);
      });
  },
});

export const {
  clearWalletState,
  setPrimaryWalletActive,
  setActiveWallet,
  setTokens,
  setTotalBalance,
  updateToken,
  updateTokens,
  setRealtimeData,
  updatePortfolioValue,
  clearError,
  setLoading,
  updateTokenBalance,
  addToken,
  removeToken,
  clearTokens,
  logoutAndClearWallet,
} = walletSlice.actions;

export default walletSlice.reducer;
