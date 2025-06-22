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
  status?: "active" | "inactive";
  isDefault?: boolean;
  createdAt?: Date;
  lastUsedAt?: Date;
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
  isFavorite?: boolean;
  isHidden?: boolean;
  lastUpdated?: Date;
}

export interface Transaction {
  id: string;
  transactionHash?: string;
  senderUsername?: string;
  senderWallet?: string;
  receiverUsername?: string;
  receiverWallet?: string;
  type:
    | "simple_eth"
    | "simple_erc20"
    | "batch_eth"
    | "batch_erc20"
    | "batch_mixed";
  category: "regular" | "scheduled" | "friend" | "fund_request";
  direction: "sent" | "received";
  tokenSymbol: string;
  contractAddress?: string;
  amount: string;
  amountFormatted?: string;
  valueUSD?: number;
  batchSize?: number;
  isFriendTransaction?: boolean;
  gasUsed?: string;
  gasFeeETH?: string;
  status: "pending" | "confirmed" | "failed";
  explorerLink?: string;
  timestamp: Date;
  confirmedAt?: Date;
}

export interface Friend {
  id: string;
  requesterUsername: string;
  receiverUsername: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  requestedAt: Date;
  respondedAt?: Date;
}

export interface FundRequest {
  id: string;
  requestId: string;
  requesterUsername: string;
  recipientUsername: string;
  tokenSymbol: string;
  contractAddress: string;
  amount: string;
  message?: string;
  status: "pending" | "fulfilled" | "declined" | "expired";
  transactionHash?: string;
  requestedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
}

export interface Notification {
  id: string;
  username: string;
  type: "payment" | "friend_request" | "fund_request" | "system";
  title: string;
  message: string;
  isRead: boolean;
  relatedData?: any;
  createdAt: Date;
  readAt?: Date;
}

export interface Schedule {
  id: string;
  scheduleId: string;
  username: string;
  walletAddress: string;
  tokenSymbol: string;
  contractAddress: string;
  recipients: string[];
  amounts: string[];
  totalAmount: string;
  frequency: "once" | "daily" | "weekly" | "monthly";
  nextExecutionAt: Date;
  maxExecutions: number;
  executedCount: number;
  status: "active" | "completed" | "cancelled" | "failed";
  description?: string;
  createdAt: Date;
  lastExecutionAt?: Date;
}

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

export interface TokenPrice {
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
}

export interface WalletTokenResponse {
  contractAddress: string;
  tokenBalance: string;
}

export interface CryptoServiceConfig {
  alchemyApiKey: string;
  coingeckoApiKey: string;
  network: string;
  chainId: number;
  rpcUrl: string;
}
