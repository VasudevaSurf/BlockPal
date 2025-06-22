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

// Async thunks for API calls
export const fetchWallets = createAsyncThunk(
  "wallet/fetchWallets",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/wallets");

      if (!response.ok) {
        return rejectWithValue("Failed to fetch wallets");
      }

      const data = await response.json();
      return data.wallets;
    } catch (error) {
      return rejectWithValue("Network error occurred");
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
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(walletData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to create wallet");
      }

      return data.wallet;
    } catch (error) {
      return rejectWithValue("Network error occurred");
    }
  }
);

export const fetchWalletTokens = createAsyncThunk(
  "wallet/fetchWalletTokens",
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/wallets/tokens?walletAddress=${walletAddress}`
      );

      if (!response.ok) {
        return rejectWithValue("Failed to fetch wallet tokens");
      }

      const data = await response.json();
      return data.tokens;
    } catch (error) {
      return rejectWithValue("Network error occurred");
    }
  }
);

export const updateWalletBalance = createAsyncThunk(
  "wallet/updateWalletBalance",
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/wallets/balance?walletAddress=${walletAddress}`
      );

      if (!response.ok) {
        return rejectWithValue("Failed to update wallet balance");
      }

      const data = await response.json();
      return { walletAddress, balance: data.balance };
    } catch (error) {
      return rejectWithValue("Network error occurred");
    }
  }
);

export const refreshTokenPrices = createAsyncThunk(
  "wallet/refreshTokenPrices",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/tokens/prices");

      if (!response.ok) {
        return rejectWithValue("Failed to refresh token prices");
      }

      const data = await response.json();
      return data.prices;
    } catch (error) {
      return rejectWithValue("Network error occurred");
    }
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    setActiveWallet: (state, action: PayloadAction<string>) => {
      const wallet = state.wallets.find((w) => w.id === action.payload);
      if (wallet) {
        // Reset all wallets to inactive
        state.wallets.forEach((w) => (w.isActive = false));
        // Set selected wallet as active
        wallet.isActive = true;
        state.activeWallet = wallet;

        // Calculate total balance for active wallet
        state.totalBalance = wallet.balance;
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
  },
  extraReducers: (builder) => {
    // Fetch wallets cases
    builder
      .addCase(fetchWallets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWallets.fulfilled, (state, action) => {
        state.loading = false;
        state.wallets = action.payload.map((wallet: any) => ({
          id: wallet._id.toString(),
          name: wallet.walletName,
          address: wallet.walletAddress,
          balance: 0, // Will be updated separately
          isActive: wallet.isDefault,
        }));

        // Set active wallet
        const activeWallet = state.wallets.find((w) => w.isActive);
        if (activeWallet) {
          state.activeWallet = activeWallet;
        } else if (state.wallets.length > 0) {
          state.wallets[0].isActive = true;
          state.activeWallet = state.wallets[0];
        }

        state.error = null;
      })
      .addCase(fetchWallets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create wallet cases
      .addCase(createWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWallet.fulfilled, (state, action) => {
        state.loading = false;
        const newWallet: Wallet = {
          id: action.payload._id.toString(),
          name: action.payload.walletName,
          address: action.payload.walletAddress,
          balance: 0,
          isActive: action.payload.isDefault,
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
      // Fetch wallet tokens cases
      .addCase(fetchWalletTokens.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletTokens.fulfilled, (state, action) => {
        state.loading = false;
        state.tokens = action.payload.map((token: any) => ({
          id: token.id || token._id?.toString(),
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          value: token.value || 0,
          change24h: token.change24h || 0,
          icon: token.logoUrl || "/icons/default-token.svg",
          price: token.price || 0,
        }));
        state.error = null;
      })
      .addCase(fetchWalletTokens.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update wallet balance cases
      .addCase(updateWalletBalance.fulfilled, (state, action) => {
        const { walletAddress, balance } = action.payload;
        const wallet = state.wallets.find((w) => w.address === walletAddress);
        if (wallet) {
          wallet.balance = balance;
          if (wallet.isActive) {
            state.totalBalance = balance;
          }
        }
      })
      // Refresh token prices cases
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

        // Recalculate total balance
        if (state.activeWallet) {
          state.totalBalance = state.tokens.reduce(
            (total, token) => total + token.value,
            0
          );
        }
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
} = walletSlice.actions;

export default walletSlice.reducer;
