// src/store/slices/walletSlice.ts - FIXED with proper state cleanup
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

// Helper to clear wallet-related storage
const clearWalletStorage = () => {
  if (typeof window !== "undefined") {
    console.log("🧹 Clearing wallet storage");

    // Clear wallet-specific items
    localStorage.removeItem("activeWalletId");
    sessionStorage.removeItem("walletNameOverrides");

    // Clear dashboard data
    localStorage.removeItem("dashboard-user-data");
    localStorage.removeItem("dashboard-user-data-v2");

    // Clear any wallet-prefixed items
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("wallet-") ||
          key.startsWith("token-") ||
          key.startsWith("dashboard-") ||
          key.startsWith("realtime-"))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Clear session storage
    const sessionKeysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.includes("wallet") ||
          key.includes("token") ||
          key.includes("dashboard"))
      ) {
        sessionKeysToRemove.push(key);
      }
    }

    sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

    console.log("✅ Wallet storage cleared");
  }
};

// Async thunks...
export const setActiveWalletInDB = createAsyncThunk(
  "wallet/setActiveWalletInDB",
  async (walletId: string, { rejectWithValue }) => {
    try {
      console.log("🎯 Setting active wallet in DB:", walletId);

      const response = await fetch("/api/profile/active-wallet", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletId }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.error || "Failed to set active wallet");
      }

      const data = await response.json();
      console.log("✅ Active wallet set in DB:", data.activeWallet);
      return data;
    } catch (error) {
      console.error("❌ Error setting active wallet in DB:", error);
      return rejectWithValue("Network error occurred");
    }
  }
);

export const getActiveWalletFromDB = createAsyncThunk(
  "wallet/getActiveWalletFromDB",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🔍 Getting active wallet from DB");

      const response = await fetch("/api/profile/active-wallet", {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to get active wallet");
      }

      const data = await response.json();
      console.log("✅ Active wallet from DB:", data.activeWallet);
      return data;
    } catch (error) {
      console.error("❌ Error getting active wallet from DB:", error);
      return rejectWithValue("Network error occurred");
    }
  }
);

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
      console.log("📡 Fetching wallets...");

      const response = await fetch("/api/wallets", {
        credentials: "include",
      });

      if (!response.ok) {
        // If unauthorized, return empty array instead of rejecting
        if (response.status === 401) {
          console.log("⚠️ Unauthorized, returning empty wallets");
          return [];
        }
        return rejectWithValue("Failed to fetch wallets");
      }

      const data = await response.json();
      console.log(
        "✅ Wallets fetched successfully:",
        data.wallets?.length || 0
      );
      return data.wallets || [];
    } catch (error) {
      console.error("❌ Error fetching wallets:", error);
      return rejectWithValue("Network error occurred");
    } finally {
      pendingRequests.delete(requestKey);
    }
  }
);

export const createWallet = createAsyncThunk(
  "wallet/createWallet",
  async (
    walletData: {
      walletAddress: string;
      walletName: string;
      privateKey: string;
      mnemonic?: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(walletData),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to create wallet");
      }

      const newWallet = data.wallet;

      // If this is the first wallet or marked as default, set it as active in DB
      if (newWallet.isDefault) {
        await dispatch(setActiveWalletInDB(newWallet._id || newWallet.id));
      }

      return newWallet;
    } catch (error) {
      return rejectWithValue("Network error occurred");
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

export const refreshTokenPrices = createAsyncThunk(
  "wallet/refreshTokenPrices",
  async (_, { rejectWithValue }) => {
    const requestKey = "refreshTokenPrices";

    if (pendingRequests.has(requestKey)) {
      console.log("🔄 refreshTokenPrices already pending, skipping...");
      return rejectWithValue("Request already pending");
    }

    try {
      pendingRequests.add(requestKey);
      const response = await fetch("/api/tokens/prices", {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue("Failed to refresh token prices");
      }

      const data = await response.json();
      return data.prices;
    } catch (error) {
      return rejectWithValue("Network error occurred");
    } finally {
      pendingRequests.delete(requestKey);
    }
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    // NEW: Clear wallet state completely
    clearWalletState: (state) => {
      console.log("🧹 Clearing wallet state");

      // Clear all pending requests
      pendingRequests.clear();

      // Clear storage
      clearWalletStorage();

      // Reset to initial state
      Object.assign(state, initialState);

      console.log("✅ Wallet state cleared");
    },

    setActiveWallet: (state, action: PayloadAction<string>) => {
      console.log("🎯 Setting active wallet locally:", action.payload);
      const wallet = state.wallets.find((w) => w.id === action.payload);
      if (
        wallet &&
        (!state.activeWallet || state.activeWallet.id !== wallet.id)
      ) {
        // Reset all wallets to inactive
        state.wallets.forEach((w) => (w.isActive = false));
        // Set selected wallet as active
        wallet.isActive = true;
        state.activeWallet = wallet;

        // Store active wallet ID in localStorage for offline access
        if (typeof window !== "undefined") {
          localStorage.setItem("activeWalletId", wallet.id);
        }

        // Calculate total balance for active wallet
        state.totalBalance = wallet.balance;
        console.log(
          "✅ Active wallet set locally:",
          wallet.name,
          "ID:",
          wallet.id
        );

        // Clear tokens when switching wallets to trigger fresh fetch
        state.tokens = [];
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

    updateWalletBalances: (
      state,
      action: PayloadAction<
        { walletId: string; balance: number; tokenCount: number }[]
      >
    ) => {
      action.payload.forEach(({ walletId, balance, tokenCount }) => {
        const wallet = state.wallets.find((w) => w.id === walletId);
        if (wallet) {
          wallet.balance = balance;
          if (wallet.isActive) {
            state.totalBalance = balance;
          }
        }
      });
    },

    updateSingleWalletBalance: (
      state,
      action: PayloadAction<{ walletId: string; balance: number }>
    ) => {
      const { walletId, balance } = action.payload;
      const wallet = state.wallets.find((w) => w.id === walletId);
      if (wallet) {
        wallet.balance = balance;
        if (wallet.isActive) {
          state.totalBalance = balance;
        }
      }
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

    updateWalletName: (
      state,
      action: PayloadAction<{ walletId: string; name: string }>
    ) => {
      const { walletId, name } = action.payload;
      const wallet = state.wallets.find((w) => w.id === walletId);
      if (wallet) {
        wallet.name = name;
      }
    },

    clearTokens: (state) => {
      state.tokens = [];
      state.totalBalance = 0;
    },

    clearActiveWalletPersistence: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeWalletId");
      }
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

    batchUpdateFromRealtimeService: (
      state,
      action: PayloadAction<{
        tokens?: Token[];
        totalBalance?: number;
        activeWalletBalance?: number;
        timestamp: Date;
      }>
    ) => {
      const { tokens, totalBalance, activeWalletBalance, timestamp } =
        action.payload;

      if (tokens) {
        state.tokens = tokens;
      }

      if (totalBalance !== undefined) {
        state.totalBalance = totalBalance;
      }

      if (activeWalletBalance !== undefined && state.activeWallet) {
        state.activeWallet.balance = activeWalletBalance;
      }

      console.log("📊 Batch update from real-time service:", {
        tokensCount: tokens?.length,
        totalBalance,
        timestamp: timestamp.toISOString(),
      });
    },
  },

  extraReducers: (builder) => {
    // Handle setActiveWalletInDB
    builder
      .addCase(setActiveWalletInDB.pending, (state) => {
        console.log("🔄 Setting active wallet in DB...");
      })
      .addCase(setActiveWalletInDB.fulfilled, (state, action) => {
        console.log("✅ Active wallet set in DB successfully");
      })
      .addCase(setActiveWalletInDB.rejected, (state, action) => {
        console.error("❌ Failed to set active wallet in DB:", action.payload);
        state.error = action.payload as string;
      })
      // Handle getActiveWalletFromDB
      .addCase(getActiveWalletFromDB.fulfilled, (state, action) => {
        const { activeWalletId, activeWallet } = action.payload;
        console.log("✅ Active wallet from DB:", activeWalletId);

        if (activeWalletId && activeWallet) {
          const wallet = state.wallets.find((w) => w.id === activeWalletId);
          if (wallet) {
            state.wallets.forEach((w) => (w.isActive = false));
            wallet.isActive = true;
            state.activeWallet = wallet;

            if (typeof window !== "undefined") {
              localStorage.setItem("activeWalletId", activeWalletId);
            }

            console.log("✅ Active wallet synced from DB:", wallet.name);
          }
        }
      })
      // Fetch wallets
      .addCase(fetchWallets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWallets.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload && Array.isArray(action.payload)) {
          state.wallets = action.payload.map((wallet: any) => ({
            id: wallet._id?.toString() || wallet.id,
            name: wallet.walletName || wallet.name,
            address: wallet.walletAddress || wallet.address,
            balance: 0,
            isActive: false,
          }));

          console.log("✅ Wallets loaded:", state.wallets.length);
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
      })
      // Create wallet
      .addCase(createWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWallet.fulfilled, (state, action) => {
        state.loading = false;
        const newWallet: Wallet = {
          id: action.payload._id?.toString() || action.payload.id,
          name: action.payload.walletName || action.payload.name,
          address: action.payload.walletAddress || action.payload.address,
          balance: 0,
          isActive: action.payload.isDefault || false,
        };

        if (newWallet.isActive) {
          state.wallets.forEach((w) => (w.isActive = false));
          state.activeWallet = newWallet;
        }

        state.wallets.push(newWallet);
        state.error = null;
      })
      .addCase(createWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch wallet tokens
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
      })
      // Update wallet balance
      .addCase(updateWalletBalance.fulfilled, (state, action) => {
        const { walletAddress, balance } = action.payload;
        const wallet = state.wallets.find((w) => w.address === walletAddress);
        if (wallet) {
          wallet.balance = balance;
          if (wallet.isActive && state.tokens.length === 0) {
            state.totalBalance = balance;
          }
        }
      })
      // Refresh token prices
      .addCase(refreshTokenPrices.fulfilled, (state, action) => {
        const prices = action.payload;
        state.tokens.forEach((token) => {
          const priceData = prices[token.symbol.toLowerCase()];
          if (priceData) {
            token.price = priceData.current_price;
            token.change24h = priceData.price_change_percentage_24h;
            token.value = token.balance * priceData.current_price;
          }
        });

        state.totalBalance = state.tokens.reduce(
          (total, token) => total + token.value,
          0
        );
      });
  },
});

export const {
  clearWalletState,
  setActiveWallet,
  setTokens,
  setTotalBalance,
  updateToken,
  updateTokens,
  setRealtimeData,
  updatePortfolioValue,
  batchUpdateFromRealtimeService,
  clearError,
  setLoading,
  updateTokenBalance,
  addToken,
  removeToken,
  updateWalletName,
  clearTokens,
  clearActiveWalletPersistence,
  updateWalletBalances,
  updateSingleWalletBalance,
} = walletSlice.actions;

export default walletSlice.reducer;
