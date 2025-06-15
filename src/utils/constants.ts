export const APP_NAME = "Blockpal";

export const ROUTES = {
  HOME: "/",
  AUTH: "/auth",
  DASHBOARD: "/dashboard",
} as const;

export const STORAGE_KEYS = {
  USER: "blockpal_user",
  THEME: "blockpal_theme",
  WALLETS: "blockpal_wallets",
} as const;

export const CRYPTO_SYMBOLS = {
  ETHEREUM: "ETH",
  BITCOIN: "BTC",
  SOLANA: "SOL",
  CARDANO: "ADA",
  XRP: "XRP",
  POLKADOT: "DOT",
  AVALANCHE: "AVAX",
  SUI: "SUI",
  TONCOIN: "TON",
} as const;

export const TOKEN_COLORS = {
  ETH: "#627EEA",
  BTC: "#F7931A",
  SOL: "#9945FF",
  ADA: "#0033AD",
  XRP: "#23292F",
  DOT: "#E6007A",
  AVAX: "#E84142",
  SUI: "#4DA2FF",
  TON: "#0088CC",
} as const;
