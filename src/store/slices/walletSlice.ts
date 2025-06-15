import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WalletState, Wallet, Token } from "@/types";

const initialState: WalletState = {
  wallets: [
    {
      id: "1",
      name: "Wallet 1",
      address: "0xA57643dhw64...R8J6153",
      balance: 5326.85,
      isActive: true,
    },
    {
      id: "2",
      name: "Wallet 2",
      address: "0x8aFp230...5GJR0ETy",
      balance: 2150.42,
      isActive: false,
    },
    {
      id: "3",
      name: "Wallet 3",
      address: "0x9e7b4wdr...ScAY9SEW",
      balance: 890.15,
      isActive: false,
    },
  ],
  activeWallet: null,
  tokens: [
    {
      id: "eth",
      symbol: "ETH",
      name: "Ethereum",
      balance: 0.0095,
      value: 132.91,
      change24h: 2.69,
      icon: "/icons/ethereum.svg",
      price: 4325.6,
    },
    {
      id: "sol",
      symbol: "SOL",
      name: "Solana",
      balance: 0.0094,
      value: 132.91,
      change24h: -1.25,
      icon: "/icons/solana.svg",
      price: 4325.6,
    },
    {
      id: "btc",
      symbol: "BTC",
      name: "Bitcoin",
      balance: 0.0093,
      value: 132.91,
      change24h: 5.12,
      icon: "/icons/bitcoin.svg",
      price: 4325.6,
    },
    {
      id: "sui",
      symbol: "SUI",
      name: "Sui",
      balance: 0.0094,
      value: 132.91,
      change24h: -2.15,
      icon: "/icons/sui.svg",
      price: 4325.6,
    },
    {
      id: "xrp",
      symbol: "XRP",
      name: "XRP",
      balance: 0.0093,
      value: 132.91,
      change24h: 1.84,
      icon: "/icons/xrp.svg",
      price: 4325.6,
    },
    {
      id: "ada",
      symbol: "ADA",
      name: "Cardano",
      balance: 0.0093,
      value: 132.91,
      change24h: 0.95,
      icon: "/icons/cardano.svg",
      price: 4325.6,
    },
    {
      id: "avax",
      symbol: "AVAX",
      name: "Avalanche",
      balance: 0.0093,
      value: 132.91,
      change24h: -1.47,
      icon: "/icons/avalanche.svg",
      price: 4325.6,
    },
    {
      id: "ton",
      symbol: "TON",
      name: "Toncoin",
      balance: 0.0093,
      value: 132.91,
      change24h: 3.21,
      icon: "/icons/toncoin.svg",
      price: 4325.6,
    },
    {
      id: "dot",
      symbol: "DOT",
      name: "Polkadot",
      balance: 0.0093,
      value: 132.91,
      change24h: -0.68,
      icon: "/icons/polkadot.svg",
      price: 4325.6,
    },
  ],
  totalBalance: 5326.85,
  loading: false,
};

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    setActiveWallet: (state, action: PayloadAction<string>) => {
      const wallet = state.wallets.find((w) => w.id === action.payload);
      if (wallet) {
        state.wallets.forEach((w) => (w.isActive = false));
        wallet.isActive = true;
        state.activeWallet = wallet;
        state.totalBalance = wallet.balance;
      }
    },
    addWallet: (state, action: PayloadAction<Omit<Wallet, "id">>) => {
      const newWallet: Wallet = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.wallets.push(newWallet);
    },
    updateTokenBalances: (state, action: PayloadAction<Token[]>) => {
      state.tokens = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setActiveWallet, addWallet, updateTokenBalances, setLoading } =
  walletSlice.actions;

export default walletSlice.reducer;
