// src/utils/walletHelpers.ts - Helper functions for wallet identification

/**
 * Determines if an address is a Solana address
 * Solana addresses are base58 encoded and typically 32-44 characters
 */
export function isSolanaAddress(address: string): boolean {
  if (!address) return false;

  // Solana addresses are base58 encoded, 32-44 chars, no 0x prefix
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaRegex.test(address) && !address.startsWith("0x");
}

/**
 * Determines if an address is an EVM address
 * EVM addresses start with 0x and are 40 hex characters
 */
export function isEVMAddress(address: string): boolean {
  if (!address) return false;

  const evmRegex = /^0x[a-fA-F0-9]{40}$/;
  return evmRegex.test(address);
}

/**
 * Gets the chain type from chain ID or identifier
 */
export function getChainType(
  chainId: number | string
): "evm" | "solana" | "unknown" {
  if (chainId === "solana" || chainId === "Solana") {
    return "solana";
  }

  if (typeof chainId === "number" || !isNaN(Number(chainId))) {
    return "evm";
  }

  return "unknown";
}

/**
 * Validates wallet address based on chain type
 */
export function validateWalletAddress(
  address: string,
  chainId: number | string
): boolean {
  const chainType = getChainType(chainId);

  if (chainType === "solana") {
    return isSolanaAddress(address);
  } else if (chainType === "evm") {
    return isEVMAddress(address);
  }

  return false;
}

/**
 * Formats wallet address for display
 */
export function formatWalletAddress(
  address: string,
  chainId?: number | string
): string {
  if (!address) return "";

  const chainType = chainId
    ? getChainType(chainId)
    : isEVMAddress(address)
    ? "evm"
    : "solana";

  if (chainType === "solana") {
    // For Solana, show first 4 and last 4 characters
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  } else {
    // For EVM, show first 6 and last 4 characters
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}

/**
 * Normalizes address for storage (lowercase for EVM, original for Solana)
 */
export function normalizeAddress(
  address: string,
  chainId: number | string
): string {
  if (!address) return "";

  const chainType = getChainType(chainId);

  if (chainType === "solana") {
    // Solana addresses are case-sensitive
    return address;
  } else {
    // EVM addresses are case-insensitive
    return address.toLowerCase();
  }
}

/**
 * Gets chain identifier for database storage
 */
export function getChainIdentifier(chainId: number | string): string {
  if (chainId === "solana" || chainId === "Solana") {
    return "solana";
  }

  return chainId.toString();
}
