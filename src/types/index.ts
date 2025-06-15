export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Wallet {
  id: string;
  name: string;
  address: string;
  balance: number;
  isActive: boolean;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  value: number;
  change24h: number;
  icon: string;
  price: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface WalletState {
  wallets: Wallet[];
  activeWallet: Wallet | null;
  tokens: Token[];
  totalBalance: number;
  loading: boolean;
}

export interface UIState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  walletSelectorOpen: boolean;
}
