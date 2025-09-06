// src/store/slices/walletSlice.ts - Frontend-only version
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WalletState, Wallet, Token } from "@/types";

// Mock data for frontend-only functionality
const mockWallets: Wallet[] = [
  {
    id: "wallet1",
    name: "Main Wallet",
    address: "0x742d35Cc6634C0532925a3b8d4Ae7F6eC1e7F5c7",
    balance: 4027.45,
    isActive: true,
  },
  {
    id: "wallet2",
    name: "Trading Wallet",
    address: "0x8ba1f109551bD432803012645Hac136c22C7F6e2",
    balance: 1200.3,
    isActive: false,
  },
];

const mockTokens: Token[] = [
  {
    id: "eth-native",
    symbol: "ETH",
    name: "Ethereum",
    balance: 1.25843,
    value: 4027.45,
    change24h: 2.5,
    icon: "/tokens/eth.png",
    price: 3200.45,
    contractAddress: "native",
    decimals: 18,
  },
  {
    id: "usdt-token",
    symbol: "USDT",
    name: "Tether USD",
    balance: 1000.5,
    value: 1000.5,
    change24h: 0.1,
    icon: "/tokens/usdt.png",
    price: 1.0,
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
  },
  {
    id: "usdc-token",
    symbol: "USDC",
    name: "USD Coin",
    balance: 2500.75,
    value: 2500.75,
    change24h: -0.05,
    icon: "/tokens/usdc.png",
    price: 1.0,
    contractAddress: "0xA0b86a33E6417f5a10c4C9a6bd1a0d7AF0DB58a7",
    decimals: 6,
  },
];

const initialState: WalletState = {
  wallets: mockWallets,
  activeWallet: mockWallets[0], // Set first wallet as active by default
  tokens: mockTokens,
  totalBalance: mockTokens.reduce((sum, token) => sum + token.value, 0),
  loading: false,
  error: null,
};

// Helper to clear wallet-related storage (keep for auth transitions)
const clearWalletStorage = () => {
  if (typeof window !== "undefined") {
    console.log("Clearing wallet storage");
    localStorage.removeItem("activeWalletId");
    sessionStorage.removeItem("walletNameOverrides");
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
    console.log("Wallet storage cleared");
  }
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    // Clear wallet state (useful for auth transitions)
    clearWalletState: (state) => {
      console.log("Clearing wallet state");
      clearWalletStorage();

      // Reset to empty state for logged out users
      state.wallets = [];
      state.activeWallet = null;
      state.tokens = [];
      state.totalBalance = 0;
      state.loading = false;
      state.error = null;

      console.log("Wallet state cleared");
    },

    // Initialize with mock data (for authenticated users)
    initializeMockData: (state) => {
      console.log("Initializing mock wallet data");
      state.wallets = mockWallets;
      state.activeWallet = mockWallets[0];
      state.tokens = mockTokens;
      state.totalBalance = mockTokens.reduce(
        (sum, token) => sum + token.value,
        0
      );
      state.loading = false;
      state.error = null;

      // Store active wallet ID for consistency
      if (typeof window !== "undefined") {
        localStorage.setItem("activeWalletId", mockWallets[0].id);
      }
    },

    setActiveWallet: (state, action: PayloadAction<string>) => {
      console.log("Setting active wallet:", action.payload);
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

        // Store active wallet ID in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("activeWalletId", wallet.id);
        }

        // Update total balance for active wallet
        state.totalBalance = wallet.balance;
        console.log("Active wallet set:", wallet.name, "ID:", wallet.id);

        // In a real app, you'd fetch tokens for this wallet
        // For demo, we'll keep the same tokens
      }
    },

    setTokens: (state, action: PayloadAction<Token[]>) => {
      state.tokens = action.payload;
      state.totalBalance = action.payload.reduce(
        (total, token) => total + token.value,
        0
      );
      console.log("Tokens updated:", action.payload.length);
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

    // Mock wallet creation (for demo purposes)
    addMockWallet: (
      state,
      action: PayloadAction<{ name: string; address: string }>
    ) => {
      const { name, address } = action.payload;
      const newWallet: Wallet = {
        id: `wallet-${Date.now()}`,
        name,
        address,
        balance: 0,
        isActive: false,
      };

      state.wallets.push(newWallet);
      console.log("Mock wallet added:", name);
    },

    // Simulate token price updates
    simulatePriceUpdate: (state) => {
      state.tokens.forEach((token) => {
        // Simulate small price changes (-5% to +5%)
        const priceChange = (Math.random() - 0.5) * 0.1;
        const newPrice = token.price * (1 + priceChange);
        const newValue = token.balance * newPrice;

        token.price = newPrice;
        token.value = newValue;
        token.change24h = priceChange * 100;
      });

      state.totalBalance = state.tokens.reduce(
        (total, token) => total + token.value,
        0
      );

      if (state.activeWallet) {
        state.activeWallet.balance = state.totalBalance;
      }
    },
  },
});

export const {
  clearWalletState,
  initializeMockData,
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
  updateWalletName,
  clearTokens,
  clearActiveWalletPersistence,
  updateWalletBalances,
  updateSingleWalletBalance,
  addMockWallet,
  simulatePriceUpdate,
} = walletSlice.actions;

export default walletSlice.reducer;
