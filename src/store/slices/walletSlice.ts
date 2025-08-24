// src/store/slices/walletSlice.ts - FIXED FOR PROPER WALLET SWITCHING
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { WalletState, Wallet, Token } from "@/types";
import { SecureWalletStorage } from "@/lib/wallet-security";

const initialState: WalletState = {
  wallets: [],
  activeWallet: null,
  tokens: [],
  totalBalance: 0,
  loading: false,
  error: null,
};

const pendingRequests = new Set<string>();

const clearWalletStorage = () => {
  if (typeof window !== "undefined") {
    console.log("🧹 Clearing wallet storage (preserving primary wallet)");

    localStorage.removeItem("dashboard-user-data");
    localStorage.removeItem("dashboard-user-data-v2");
    sessionStorage.removeItem("walletNameOverrides");

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("token-") ||
          key.startsWith("dashboard-") ||
          key.startsWith("realtime-")) &&
        !key.includes("primaryWallet") &&
        !key.includes("walletPrivateKey") &&
        !key.includes("walletMnemonic") &&
        !key.includes("additionalWallets")
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log("✅ Wallet storage cleared");
  }
};

// ENHANCED: Load all wallets with proper formatting
const loadAllWallets = (): Wallet[] => {
  const wallets: Wallet[] = [];

  // Get primary wallet
  const primaryCredentials = SecureWalletStorage.getPrimaryWalletCredentials();
  if (primaryCredentials) {
    wallets.push({
      id: "primary",
      name: "Primary Wallet",
      address: primaryCredentials.address,
      balance: 0,
      isActive: false, // Will be set by active wallet logic
    });
  }

  // Get additional wallets
  const additionalWallets = SecureWalletStorage.getAdditionalWallets();
  additionalWallets.forEach((wallet) => {
    wallets.push({
      id: wallet.id,
      name: wallet.name,
      address: wallet.address,
      balance: 0,
      isActive: false,
    });
  });

  console.log(
    `📂 Loaded ${wallets.length} wallets (1 primary + ${additionalWallets.length} additional)`
  );
  return wallets;
};

const getWalletCredentials = (walletId: string) => {
  if (walletId === "primary") {
    return SecureWalletStorage.getPrimaryWalletCredentials();
  } else {
    const additionalWallets = SecureWalletStorage.getAdditionalWallets();
    const wallet = additionalWallets.find((w) => w.id === walletId);
    return wallet
      ? {
          address: wallet.address,
          privateKey: wallet.privateKey,
          mnemonic: wallet.mnemonic,
        }
      : null;
  }
};

export const initializePrimaryWallet = createAsyncThunk(
  "wallet/initializePrimaryWallet",
  async (_, { rejectWithValue }) => {
    try {
      console.log("🎯 Initializing wallet system...");

      const allWallets = loadAllWallets();
      if (allWallets.length === 0) {
        return rejectWithValue("No wallets found in storage");
      }

      // Set active wallet based on stored preference or default to primary
      const storedActiveId =
        typeof window !== "undefined"
          ? localStorage.getItem("activeWalletId")
          : null;

      let activeWallet: Wallet;

      if (storedActiveId) {
        const preferredWallet = allWallets.find((w) => w.id === storedActiveId);
        if (preferredWallet) {
          activeWallet = preferredWallet;
          console.log("✅ Using stored active wallet:", preferredWallet.name);
        } else {
          activeWallet = allWallets[0];
          console.log("⚠️ Stored wallet not found, using first available");
        }
      } else {
        activeWallet = allWallets[0];
        console.log("✅ No stored preference, using first wallet");
      }

      // Mark active wallet
      activeWallet.isActive = true;

      console.log("✅ Wallet system initialized:", {
        active: activeWallet.address.slice(0, 10) + "...",
        total: allWallets.length,
      });

      return { wallets: allWallets, activeWallet };
    } catch (error) {
      console.error("❌ Error initializing wallet system:", error);
      return rejectWithValue("Failed to initialize wallet system");
    }
  }
);

export const fetchWalletTokens = createAsyncThunk(
  "wallet/fetchWalletTokens",
  async (walletAddress: string, { rejectWithValue, getState }) => {
    const requestKey = `fetchWalletTokens:${walletAddress}`;

    const state = getState() as any;
    if (!state.auth.isAuthenticated) {
      console.log("⚠️ Not authenticated, skipping token fetch");
      return { tokens: [], walletAddress };
    }

    if (pendingRequests.has(requestKey)) {
      console.log(
        `🔄 Token fetch already pending for ${walletAddress.slice(0, 10)}...`
      );
      return rejectWithValue("Request already pending");
    }

    try {
      pendingRequests.add(requestKey);
      console.log(
        "📡 Fetching tokens for wallet:",
        walletAddress.slice(0, 10) + "..."
      );

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
        throw new Error("Failed to fetch wallet tokens");
      }

      const data = await response.json();
      console.log("✅ Tokens fetched:", data.tokens?.length || 0, "tokens");
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
      return rejectWithValue("Request already pending");
    }

    try {
      pendingRequests.add(requestKey);
      console.log(
        "📡 Updating balance for wallet:",
        walletAddress.slice(0, 10) + "..."
      );

      const response = await fetch(
        `/api/wallets/balance?walletAddress=${walletAddress}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        return { walletAddress, balance: 0 };
      }

      const data = await response.json();
      console.log("✅ Balance updated:", data.balance);
      return { walletAddress, balance: data.balance };
    } catch (error) {
      console.error("❌ Error updating wallet balance:", error);
      return { walletAddress, balance: 0 };
    } finally {
      pendingRequests.delete(requestKey);
    }
  }
);

export const setActiveWalletInDB = createAsyncThunk(
  "wallet/setActiveWalletInDB",
  async (walletId: string, { rejectWithValue }) => {
    try {
      console.log("🎯 Setting active wallet preference:", walletId);

      // Store in localStorage for wallet-first auth
      if (typeof window !== "undefined") {
        localStorage.setItem("activeWalletId", walletId);
      }

      return { activeWalletId: walletId, success: true };
    } catch (error) {
      console.error("❌ Error setting active wallet:", error);
      return rejectWithValue("Failed to set active wallet");
    }
  }
);

export const getActiveWalletFromDB = createAsyncThunk(
  "wallet/getActiveWalletFromDB",
  async (_, { rejectWithValue }) => {
    try {
      const activeWalletId =
        typeof window !== "undefined"
          ? localStorage.getItem("activeWalletId") || "primary"
          : "primary";

      return {
        activeWalletId,
        activeWallet: { id: activeWalletId },
      };
    } catch (error) {
      console.error("❌ Error getting active wallet:", error);
      return rejectWithValue("Failed to get active wallet");
    }
  }
);

export const fetchWallets = createAsyncThunk(
  "wallet/fetchWallets",
  async (_, { rejectWithValue, getState }) => {
    const requestKey = "fetchWallets";

    const state = getState() as any;
    if (!state.auth.isAuthenticated) {
      console.log("⚠️ Not authenticated, skipping wallet fetch");
      return [];
    }

    if (pendingRequests.has(requestKey)) {
      return rejectWithValue("Request already pending");
    }

    try {
      pendingRequests.add(requestKey);
      console.log("📡 Fetching all wallets from storage...");

      const allWallets = loadAllWallets();

      const formattedWallets = allWallets.map((wallet) => ({
        _id: wallet.id,
        id: wallet.id,
        walletName: wallet.name,
        name: wallet.name,
        walletAddress: wallet.address,
        address: wallet.address,
        isDefault: wallet.id === "primary",
        isPrimary: wallet.id === "primary",
      }));

      console.log("✅ Wallets loaded:", formattedWallets.length);
      return formattedWallets;
    } catch (error) {
      console.error("❌ Error fetching wallets:", error);
      return rejectWithValue("Failed to fetch wallets");
    } finally {
      pendingRequests.delete(requestKey);
    }
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    clearWalletState: (state) => {
      console.log("🧹 Clearing wallet state");
      pendingRequests.clear();
      clearWalletStorage();
      Object.assign(state, initialState);
    },

    setPrimaryWalletActive: (state, action: PayloadAction<Wallet>) => {
      console.log(
        "🎯 Setting primary wallet as active:",
        action.payload.address.slice(0, 10) + "..."
      );
      state.wallets = [action.payload];
      state.activeWallet = action.payload;
      state.tokens = [];
    },

    // FIXED: Enhanced setActiveWallet with proper wallet switching
    setActiveWallet: (state, action: PayloadAction<string>) => {
      const walletId = action.payload;
      console.log("🎯 Setting active wallet:", walletId);

      // First, try to find wallet in current state
      let wallet = state.wallets.find((w) => w.id === walletId);

      // If not found, reload all wallets from storage
      if (!wallet) {
        console.log("🔄 Wallet not in state, reloading from storage...");
        const allWallets = loadAllWallets();
        state.wallets = allWallets;
        wallet = allWallets.find((w) => w.id === walletId);
      }

      if (wallet) {
        // Update all wallets to be inactive
        state.wallets.forEach((w) => (w.isActive = false));

        // Set selected wallet as active
        wallet.isActive = true;
        state.activeWallet = wallet;
        state.tokens = []; // Clear tokens to trigger fresh fetch
        state.totalBalance = 0; // Reset balance

        // Store active wallet preference
        if (typeof window !== "undefined") {
          localStorage.setItem("activeWalletId", walletId);
        }

        console.log("✅ Active wallet updated:", {
          id: walletId,
          name: wallet.name,
          address: wallet.address.slice(0, 10) + "...",
        });

        // Emit wallet change event for other components
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("activeWalletChanged", {
              detail: { walletId, wallet },
            })
          );
        }
      } else {
        console.error("❌ Wallet not found:", walletId);
        state.error = "Wallet not found";
      }
    },

    // ENHANCED: Refresh wallet list with better state management
    refreshWalletList: (state) => {
      console.log("🔄 Refreshing wallet list from localStorage");

      const allWallets = loadAllWallets();
      const currentActiveId = state.activeWallet?.id;

      // Update wallets array
      state.wallets = allWallets;

      // Restore active wallet or set default
      if (currentActiveId) {
        const activeWallet = allWallets.find((w) => w.id === currentActiveId);
        if (activeWallet) {
          activeWallet.isActive = true;
          state.activeWallet = activeWallet;
        } else {
          // If current active wallet is gone, set first wallet as active
          if (allWallets.length > 0) {
            allWallets[0].isActive = true;
            state.activeWallet = allWallets[0];
          }
        }
      } else if (allWallets.length > 0) {
        allWallets[0].isActive = true;
        state.activeWallet = allWallets[0];
      }

      console.log("✅ Wallet list refreshed:", allWallets.length, "wallets");
    },

    setTokens: (state, action: PayloadAction<Token[]>) => {
      state.tokens = action.payload;
      state.totalBalance = action.payload.reduce(
        (total, token) => total + token.value,
        0
      );
    },

    setTotalBalance: (state, action: PayloadAction<number>) => {
      state.totalBalance = action.payload;
      if (state.activeWallet) {
        state.activeWallet.balance = action.payload;
      }
    },

    // Other reducers remain the same...
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

    clearError: (state) => {
      state.error = null;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    clearTokens: (state) => {
      state.tokens = [];
      state.totalBalance = 0;
    },

    logoutAndClearWallet: (state) => {
      console.log("🚪 Logging out and clearing all wallet data");
      pendingRequests.clear();
      SecureWalletStorage.clearAllWalletData();
      Object.assign(state, initialState);
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
        const { wallets, activeWallet } = action.payload;

        state.wallets = wallets;
        state.activeWallet = activeWallet;
        state.error = null;

        console.log("✅ Wallet system initialized in Redux state");
      })
      .addCase(initializePrimaryWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch wallets
    builder
      .addCase(fetchWallets.fulfilled, (state, action) => {
        state.loading = false;

        if (Array.isArray(action.payload) && action.payload.length > 0) {
          // Convert API format to internal format
          const formattedWallets = action.payload.map((wallet: any) => ({
            id: wallet.id,
            name: wallet.name,
            address: wallet.address,
            balance: 0,
            isActive: wallet.isDefault || wallet.isPrimary || false,
          }));

          state.wallets = formattedWallets;

          // Set active wallet based on preference
          const activeWalletId =
            typeof window !== "undefined"
              ? localStorage.getItem("activeWalletId")
              : null;

          if (activeWalletId) {
            const preferredWallet = formattedWallets.find(
              (w) => w.id === activeWalletId
            );
            if (preferredWallet) {
              formattedWallets.forEach((w) => (w.isActive = false));
              preferredWallet.isActive = true;
              state.activeWallet = preferredWallet;
            }
          } else if (formattedWallets.length > 0) {
            formattedWallets[0].isActive = true;
            state.activeWallet = formattedWallets[0];
          }
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
      .addCase(fetchWalletTokens.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload && action.payload.tokens) {
          const formattedTokens = action.payload.tokens.map((token: any) => ({
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

          state.tokens = formattedTokens;
          state.totalBalance = formattedTokens.reduce(
            (total, token) => total + token.value,
            0
          );

          // Update active wallet balance
          if (state.activeWallet) {
            state.activeWallet.balance = state.totalBalance;
          }

          console.log(
            "📊 Tokens loaded:",
            formattedTokens.length,
            "Total:",
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
  },
});

export const {
  clearWalletState,
  setPrimaryWalletActive,
  setActiveWallet,
  refreshWalletList,
  setTokens,
  setTotalBalance,
  updateToken,
  clearError,
  setLoading,
  clearTokens,
  logoutAndClearWallet,
} = walletSlice.actions;

export default walletSlice.reducer;
