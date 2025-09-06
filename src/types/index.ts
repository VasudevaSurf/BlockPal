// src/types/index.ts - Frontend-only version with auth types

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  currency?: string;
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
  contractAddress?: string;
  decimals?: number;
  logoUrl?: string;
}

// Keep auth-related interfaces
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface WalletState {
  wallets: Wallet[];
  activeWallet: Wallet | null;
  tokens: Token[];
  totalBalance: number;
  loading: boolean;
  error: string | null;
}

export interface UIState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  walletSelectorOpen: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Frontend-only demo types
export interface MockTokenPrice {
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
}

export interface DemoConfig {
  enablePriceSimulation: boolean;
  simulationInterval: number;
  maxPriceChange: number;
}
