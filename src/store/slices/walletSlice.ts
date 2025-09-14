// src/store/slices/walletSlice.ts - Enhanced with database persistence
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WalletState, Wallet, Token } from "@/types";

// Enhanced wallet interface for database persistence
interface StoredWallet {
  id: string;
  walletAddress: string;
  chainId: number;
  walletType: string;
  isActive: boolean;
  connectedAt?: string;
  lastConnected?: string;
}

interface WalletConnectionPayload {
  id: string;
  name: string;
  address: string;
  chainId: number;
  balance: number;
  isActive: boolean;
}

interface LoadStoredWalletsPayload {
  wallets: StoredWallet[];
  activeWallet: StoredWallet | null;
}

// Mock tokens for demo
const mockTokens: Token[] = [
  {
    id: "eth-native",
    symbol: "ETH",
    name: "Ethereum",
    balance: 0,
    value: 0,
    change24h: 0,
    icon: "/tokens/eth.png",
    price: 3200,
    contractAddress: "native",
    decimals: 18,
  },
];

const initialState: WalletState = {
  wallets: [],
  activeWallet: null,
  tokens: [],
  totalBalance: 0,
  loading: false,
  error: null,
};

// Helper to clear wallet-related storage
const clearWalletStorage = () => {
  if (typeof window !== "undefined") {
    console.log("🧹 Clearing wallet storage");
    localStorage.removeItem("activeWalletId");
    localStorage.removeItem("walletNameOverrides");
    localStorage.removeItem("dashboard-user-data");
    localStorage.removeItem("dashboard-user-data-v2");

    // Clear wallet-prefixed items
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
    console.log("✅ Wallet storage cleared");
  }
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Clear all wallet state (for auth transitions)
    clearWalletState: (state) => {
      console.log("🧹 Clearing wallet state");
      clearWalletStorage();

      // Reset to empty state
      state.wallets = [];
      state.activeWallet = null;
      state.tokens = [];
      state.totalBalance = 0;
      state.loading = false;
      state.error = null;

      console.log("✅ Wallet state cleared");
    },

    // Load stored wallets from database
    loadStoredWallets: (
      state,
      action: PayloadAction<LoadStoredWalletsPayload>
    ) => {
      const { wallets, activeWallet } = action.payload;

      console.log("📱 Loading stored wallets into Redux:", {
        walletsCount: wallets.length,
        activeWallet: activeWallet?.walletAddress,
      });

      // Convert stored wallets to app format
      state.wallets = wallets.map((wallet) => ({
        id: wallet.id,
        name: `Wallet (${wallet.walletAddress.slice(
          0,
          6
        )}...${wallet.walletAddress.slice(-4)})`,
        address: wallet.walletAddress,
        balance: 0, // Will be updated when connected
        isActive: wallet.isActive,
      }));

      // Set active wallet if exists
      if (activeWallet) {
        state.activeWallet = {
          id: activeWallet.id,
          name: `Wallet (${activeWallet.walletAddress.slice(
            0,
            6
          )}...${activeWallet.walletAddress.slice(-4)})`,
          address: activeWallet.walletAddress,
          balance: 0,
          isActive: true,
        };

        // Store active wallet ID for consistency
        if (typeof window !== "undefined") {
          localStorage.setItem("activeWalletId", activeWallet.id);
        }
      }

      state.error = null;
      console.log("✅ Stored wallets loaded into Redux");
    },

    // Set wallet as connected (when wagmi connects)
    setWalletConnected: (
      state,
      action: PayloadAction<WalletConnectionPayload>
    ) => {
      const wallet = action.payload;

      console.log("🔗 Setting wallet as connected:", wallet.address);

      // Update or add wallet
      const existingIndex = state.wallets.findIndex(
        (w) => w.address === wallet.address
      );

      if (existingIndex >= 0) {
        // Update existing wallet
        state.wallets[existingIndex] = {
          ...state.wallets[existingIndex],
          balance: wallet.balance,
          isActive: true,
        };
        state.activeWallet = state.wallets[existingIndex];
      } else {
        // Add new wallet
        const newWallet: Wallet = {
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          balance: wallet.balance,
          isActive: true,
        };

        state.wallets.push(newWallet);
        state.activeWallet = newWallet;
      }

      // Deactivate other wallets
      state.wallets.forEach((w) => {
        if (w.address !== wallet.address) {
          w.isActive = false;
        }
      });

      // Initialize tokens for connected wallet
      state.tokens = mockTokens;
      state.totalBalance = wallet.balance;
      state.error = null;

      // Store active wallet ID
      if (typeof window !== "undefined") {
        localStorage.setItem("activeWalletId", wallet.id);
      }

      console.log("✅ Wallet set as connected");
    },

    // Set wallet as disconnected
    setWalletDisconnected: (state) => {
      console.log("🔌 Setting wallet as disconnected");

      if (state.activeWallet) {
        // Find and deactivate the wallet
        const wallet = state.wallets.find(
          (w) => w.id === state.activeWallet?.id
        );
        if (wallet) {
          wallet.isActive = false;
        }
      }

      // Clear active state but keep wallets in list
      state.activeWallet = null;
      state.tokens = [];
      state.totalBalance = 0;

      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeWalletId");
      }

      console.log("✅ Wallet set as disconnected");
    },

    // Set active wallet
    setActiveWallet: (state, action: PayloadAction<string>) => {
      console.log("🎯 Setting active wallet:", action.payload);

      const wallet = state.wallets.find((w) => w.id === action.payload);
      if (wallet) {
        // Deactivate all wallets
        state.wallets.forEach((w) => (w.isActive = false));

        // Activate selected wallet
        wallet.isActive = true;
        state.activeWallet = wallet;
        state.totalBalance = wallet.balance;

        // Store active wallet ID
        if (typeof window !== "undefined") {
          localStorage.setItem("activeWalletId", wallet.id);
        }

        console.log("✅ Active wallet set:", wallet.name);
      }
    },

    // Update wallet balances
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
            state.activeWallet = wallet;
          }
        }
      });
    },

    // Set tokens
    setTokens: (state, action: PayloadAction<Token[]>) => {
      state.tokens = action.payload;
      state.totalBalance = action.payload.reduce(
        (total, token) => total + token.value,
        0
      );
      console.log("🪙 Tokens updated:", action.payload.length);
    },

    // Update single token
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

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Update total balance
    setTotalBalance: (state, action: PayloadAction<number>) => {
      state.totalBalance = action.payload;
      if (state.activeWallet) {
        state.activeWallet.balance = action.payload;
      }
    },

    // Add new wallet (for manual wallet addition)
    addWallet: (state, action: PayloadAction<Omit<Wallet, "id">>) => {
      const newWallet: Wallet = {
        ...action.payload,
        id: `wallet-${Date.now()}`,
        isActive: false,
      };

      state.wallets.push(newWallet);
      console.log("➕ Wallet added:", newWallet.name);
    },

    // Remove wallet
    removeWallet: (state, action: PayloadAction<string>) => {
      const walletId = action.payload;

      // If removing active wallet, clear active state
      if (state.activeWallet?.id === walletId) {
        state.activeWallet = null;
        state.totalBalance = 0;
        state.tokens = [];
      }

      // Remove from wallets array
      state.wallets = state.wallets.filter((w) => w.id !== walletId);

      console.log("🗑️ Wallet removed:", walletId);
    },

    // Update wallet name
    updateWalletName: (
      state,
      action: PayloadAction<{ walletId: string; name: string }>
    ) => {
      const { walletId, name } = action.payload;
      const wallet = state.wallets.find((w) => w.id === walletId);
      if (wallet) {
        wallet.name = name;
        if (state.activeWallet?.id === walletId) {
          state.activeWallet.name = name;
        }
      }
    },

    // Initialize with mock data (for demo purposes)
    initializeMockData: (state) => {
      console.log("🎭 Initializing mock data");

      const mockWallets: Wallet[] = [
        {
          id: "demo-wallet-1",
          name: "Demo Wallet",
          address: "0x742d35Cc6634C0532925a3b8d4Ae7F6eC1e7F5c7",
          balance: 1.25,
          isActive: true,
        },
      ];

      state.wallets = mockWallets;
      state.activeWallet = mockWallets[0];
      state.tokens = mockTokens;
      state.totalBalance = mockWallets[0].balance;
      state.loading = false;
      state.error = null;

      // Store active wallet ID
      if (typeof window !== "undefined") {
        localStorage.setItem("activeWalletId", mockWallets[0].id);
      }

      console.log("✅ Mock data initialized");
    },
  },
});

export const {
  setLoading,
  clearWalletState,
  loadStoredWallets,
  setWalletConnected,
  setWalletDisconnected,
  setActiveWallet,
  updateWalletBalances,
  setTokens,
  updateToken,
  setError,
  clearError,
  setTotalBalance,
  addWallet,
  removeWallet,
  updateWalletName,
  initializeMockData,
} = walletSlice.actions;

export default walletSlice.reducer;
