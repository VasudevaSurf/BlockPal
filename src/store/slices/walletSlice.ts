// src/store/slices/walletSlice.ts (FIXED - Token Contract Address Mapping)
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

// Async thunks for API calls
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
    { rejectWithValue }
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

      return data.wallet;
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
        // Balance endpoint might not exist, return default
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
      // Don't reject, just return default balance
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
    setActiveWallet: (state, action: PayloadAction<string>) => {
      console.log("🎯 Setting active wallet:", action.payload);
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

        // Store active wallet ID in localStorage for persistence
        if (typeof window !== "undefined") {
          localStorage.setItem("activeWalletId", wallet.id);
        }

        // Calculate total balance for active wallet
        state.totalBalance = wallet.balance;
        console.log("✅ Active wallet set:", wallet.name, "ID:", wallet.id);

        // Clear tokens when switching wallets to trigger fresh fetch
        state.tokens = [];
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
    // Add action to clear tokens when switching wallets
    clearTokens: (state) => {
      state.tokens = [];
    },
    // Add action to clear active wallet ID from localStorage
    clearActiveWalletPersistence: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeWalletId");
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

        if (action.payload && Array.isArray(action.payload)) {
          state.wallets = action.payload.map((wallet: any) => ({
            id: wallet._id?.toString() || wallet.id,
            name: wallet.walletName || wallet.name,
            address: wallet.walletAddress || wallet.address,
            balance: 0, // Will be updated separately
            isActive: wallet.isDefault || false,
          }));

          // Try to restore previously active wallet from localStorage
          let activeWalletSet = false;
          if (typeof window !== "undefined") {
            const savedActiveWalletId = localStorage.getItem("activeWalletId");
            if (savedActiveWalletId) {
              const savedWallet = state.wallets.find(
                (w) => w.id === savedActiveWalletId
              );
              if (savedWallet) {
                // Reset all wallets to inactive first
                state.wallets.forEach((w) => (w.isActive = false));
                // Set saved wallet as active
                savedWallet.isActive = true;
                state.activeWallet = savedWallet;
                activeWalletSet = true;
                console.log(
                  "✅ Restored active wallet from localStorage:",
                  savedWallet.name
                );
              }
            }
          }

          // If no saved wallet or saved wallet not found, use default logic
          if (!activeWalletSet) {
            const activeWallet = state.wallets.find((w) => w.isActive);
            if (
              activeWallet &&
              (!state.activeWallet || state.activeWallet.id !== activeWallet.id)
            ) {
              state.activeWallet = activeWallet;
              // Save to localStorage
              if (typeof window !== "undefined") {
                localStorage.setItem("activeWalletId", activeWallet.id);
              }
            } else if (state.wallets.length > 0 && !state.activeWallet) {
              state.wallets[0].isActive = true;
              state.activeWallet = state.wallets[0];
              // Save to localStorage
              if (typeof window !== "undefined") {
                localStorage.setItem("activeWalletId", state.wallets[0].id);
              }
            }
          }
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
      // Fetch wallet tokens cases
      .addCase(fetchWalletTokens.pending, (state) => {
        // Don't set loading if we already have tokens to prevent UI flicker
        if (state.tokens.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchWalletTokens.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload && action.payload.tokens) {
          // FIXED: Use real tokens from API response with proper contract addresses
          state.tokens = action.payload.tokens.map((token: any) => ({
            id: token.contractAddress || `${token.symbol}-${Date.now()}`, // Use contract address as ID
            symbol: token.symbol,
            name: token.name,
            balance: token.balance || 0,
            value: token.value || 0,
            change24h: token.change24h || 0,
            icon: token.logoUrl || "/icons/default-token.svg",
            price: token.price || 0,
            contractAddress: token.contractAddress, // CRITICAL: Include contract address
            decimals: token.decimals || 18,
          }));

          // Update total balance
          state.totalBalance = state.tokens.reduce(
            (total, token) => total + token.value,
            0
          );

          console.log(
            "📊 Tokens loaded:",
            state.tokens.length,
            "Total value:",
            state.totalBalance,
            "Tokens with contract addresses:",
            state.tokens.map((t) => ({
              symbol: t.symbol,
              contractAddress: t.contractAddress,
            }))
          );
        } else {
          // No tokens returned from API
          state.tokens = [];
          state.totalBalance = 0;
          console.log("📊 No tokens found for wallet");
        }

        state.error = null;
      })
      .addCase(fetchWalletTokens.rejected, (state, action) => {
        state.loading = false;
        if (action.payload !== "Request already pending") {
          state.error = action.payload as string;
        }
      })
      // Update wallet balance cases
      .addCase(updateWalletBalance.fulfilled, (state, action) => {
        const { walletAddress, balance } = action.payload;
        const wallet = state.wallets.find((w) => w.address === walletAddress);
        if (wallet) {
          wallet.balance = balance;
          if (wallet.isActive && state.tokens.length === 0) {
            // If no tokens, use wallet balance as total balance
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
} = walletSlice.actions;

export default walletSlice.reducer;
