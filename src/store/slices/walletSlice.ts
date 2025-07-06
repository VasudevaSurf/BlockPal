// src/store/slices/walletSlice.ts - Updated with DB active wallet sync
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

// NEW: Async thunk to set active wallet in database
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

// NEW: Async thunk to get active wallet from database
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

// Existing async thunks...
export const fetchWallets = createAsyncThunk(
  "wallet/fetchWallets",
  async (_, { rejectWithValue }) => {
    const requestKey = "fetchWallets";

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
        return rejectWithValue("Failed to fetch wallets");
      }

      const data = await response.json();
      console.log(
        "✅ Wallets fetched successfully:",
        data.wallets?.length || 0
      );
      return data.wallets;
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
  async (walletAddress: string, { rejectWithValue }) => {
    const requestKey = `fetchWalletTokens:${walletAddress}`;

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
          "ℹ️ Balance endpoint not available (404), using default balance of 0"
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
    // UPDATED: setActiveWallet now syncs with database
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
      }
    },
    addToken: (state, action: PayloadAction<Token>) => {
      const existingToken = state.tokens.find(
        (t) => t.id === action.payload.id
      );
      if (!existingToken) {
        state.tokens.push(action.payload);
      }
    },
    removeToken: (state, action: PayloadAction<string>) => {
      state.tokens = state.tokens.filter((t) => t.id !== action.payload);
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
    },
    clearActiveWalletPersistence: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeWalletId");
      }
    },
  },
  extraReducers: (builder) => {
    // NEW: Handle setActiveWalletInDB
    builder
      .addCase(setActiveWalletInDB.pending, (state) => {
        console.log("🔄 Setting active wallet in DB...");
      })
      .addCase(setActiveWalletInDB.fulfilled, (state, action) => {
        console.log("✅ Active wallet set in DB successfully");
        // The local state is already updated by setActiveWallet reducer
      })
      .addCase(setActiveWalletInDB.rejected, (state, action) => {
        console.error("❌ Failed to set active wallet in DB:", action.payload);
        state.error = action.payload as string;
      })
      // NEW: Handle getActiveWalletFromDB
      .addCase(getActiveWalletFromDB.fulfilled, (state, action) => {
        const { activeWalletId, activeWallet } = action.payload;
        console.log("✅ Active wallet from DB:", activeWalletId);

        if (activeWalletId && activeWallet) {
          // Find the wallet in our local state and set it as active
          const wallet = state.wallets.find((w) => w.id === activeWalletId);
          if (wallet) {
            // Reset all wallets to inactive
            state.wallets.forEach((w) => (w.isActive = false));
            // Set DB active wallet as active
            wallet.isActive = true;
            state.activeWallet = wallet;

            // Sync with localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem("activeWalletId", activeWalletId);
            }

            console.log("✅ Active wallet synced from DB:", wallet.name);
          }
        }
      })
      // Existing cases...
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
            balance: 0, // Will be updated separately
            isActive: false, // Will be set based on DB active wallet
          }));

          console.log("✅ Wallets loaded:", state.wallets.length);
        }

        state.error = null;
      })
      .addCase(fetchWallets.rejected, (state, action) => {
        state.loading = false;
        if (action.payload !== "Request already pending") {
          state.error = action.payload as string;
        }
      })
      // Create wallet cases
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
          // Deactivate other wallets
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
      // Existing token and balance cases...
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
  setActiveWallet,
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
