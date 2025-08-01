export const COMMON_TOKENS = [
  {
    symbol: "USDC",
    name: "USD Coin",
    contractAddress: "0xA0b86a33E6441f8d72b52C4AB1E0c3d8e9b4b3a5",
    decimals: 6,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/325/large/Tether.png",
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png",
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    contractAddress: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    decimals: 18,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/12504/large/uniswap-uni.png",
  },
  {
    symbol: "AAVE",
    name: "Aave",
    contractAddress: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    decimals: 18,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/12645/large/AAVE.png",
  },
  {
    symbol: "CRV",
    name: "Curve DAO Token",
    contractAddress: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    decimals: 18,
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/12124/large/Curve.png",
  },
];

export function formatTokenAmount(
  amount: number,
  decimals: number = 6
): string {
  if (amount === 0) return "0";
  if (amount < 0.000001) return amount.toExponential(2);
  return amount.toFixed(decimals);
}

export function formatUSDValue(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "< $0.01";
  return `$${value.toFixed(2)}`;
}

export function calculateSlippageAmount(
  amount: string,
  slippage: number
): string {
  const amountNum = parseFloat(amount);
  const slippageAmount = amountNum * (slippage / 100);
  return (amountNum - slippageAmount).toFixed(6);
}

export function getTokenIcon(symbol: string): string {
  const iconMap: Record<string, string> = {
    ETH: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
    USDC: "https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
    USDT: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png",
    WBTC: "https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png",
    DAI: "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png",
    LINK: "https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    UNI: "https://coin-images.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    AAVE: "https://coin-images.coingecko.com/coins/images/12645/large/AAVE.png",
    CRV: "https://coin-images.coingecko.com/coins/images/12124/large/Curve.png",
  };

  return iconMap[symbol] || "";
}

// Error handling for swap operations
export class SwapError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "SwapError";
  }
}

export const SWAP_ERROR_CODES = {
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INSUFFICIENT_LIQUIDITY: "INSUFFICIENT_LIQUIDITY",
  SLIPPAGE_TOO_HIGH: "SLIPPAGE_TOO_HIGH",
  GAS_TOO_HIGH: "GAS_TOO_HIGH",
  TOKEN_NOT_FOUND: "TOKEN_NOT_FOUND",
  QUOTE_EXPIRED: "QUOTE_EXPIRED",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
} as const;

// Token validation
export function isValidTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function sanitizeTokenInput(input: string): string {
  return input.trim().toLowerCase();
}

// Gas estimation utilities
export function calculateGasCost(gasLimit: string, gasPrice: string): string {
  const gasBigInt = BigInt(gasLimit) * BigInt(gasPrice);
  return (Number(gasBigInt) / 1e18).toFixed(8);
}

export function formatGasPrice(gasPrice: string): string {
  const gasPriceGwei = Number(gasPrice) / 1e9;
  return gasPriceGwei.toFixed(2);
}
