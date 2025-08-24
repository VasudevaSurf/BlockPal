// src/lib/wallet-security.ts - FIXED VERSION
import { ethers } from "ethers";

export interface WalletCredentials {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export class WalletValidator {
  static isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  // ENHANCED: Better private key validation
  static isValidPrivateKey(privateKey: string): boolean {
    try {
      if (!privateKey || typeof privateKey !== "string") {
        return false;
      }

      // Remove whitespace
      const cleanKey = privateKey.trim();

      // Handle both formats: with and without 0x prefix
      let keyToValidate = cleanKey;
      if (cleanKey.startsWith("0x")) {
        keyToValidate = cleanKey.slice(2);
      }

      // Check length (64 characters for hex)
      if (keyToValidate.length !== 64) {
        console.log("❌ Invalid private key length:", keyToValidate.length);
        return false;
      }

      // Check if it's valid hex
      if (!/^[a-fA-F0-9]+$/.test(keyToValidate)) {
        console.log("❌ Invalid private key characters");
        return false;
      }

      // Try to create wallet instance (final validation)
      const wallet = new ethers.Wallet("0x" + keyToValidate);

      // Additional check - make sure the key is not zero
      if (keyToValidate === "0".repeat(64)) {
        console.log("❌ Private key cannot be zero");
        return false;
      }

      console.log("✅ Private key validation passed");
      return true;
    } catch (error) {
      console.log("❌ Private key validation error:", error);
      return false;
    }
  }

  // ENHANCED: Better mnemonic validation
  static isValidMnemonic(mnemonic: string): boolean {
    try {
      if (!mnemonic || typeof mnemonic !== "string") {
        return false;
      }

      const cleanMnemonic = mnemonic.trim().toLowerCase();

      // Check word count (12, 15, 18, 21, or 24 words)
      const words = cleanMnemonic.split(/\s+/);
      if (![12, 15, 18, 21, 24].includes(words.length)) {
        console.log("❌ Invalid mnemonic word count:", words.length);
        return false;
      }

      // Try to validate with ethers
      const mnemonic_obj = ethers.Mnemonic.fromPhrase(cleanMnemonic);

      // Additional check - try to derive a wallet
      const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic_obj);

      console.log("✅ Mnemonic validation passed");
      return true;
    } catch (error) {
      console.log("❌ Mnemonic validation error:", error);
      return false;
    }
  }
}

export class PasswordValidator {
  static isValidPassword(password: string): ValidationResult {
    if (!password) {
      return { valid: false, message: "Password is required" };
    }

    if (password.length < 6) {
      return {
        valid: false,
        message: "Password must be at least 6 characters long",
      };
    }

    if (password.length > 128) {
      return {
        valid: false,
        message: "Password must be less than 128 characters",
      };
    }

    return { valid: true };
  }

  static isValidUsername(username: string): ValidationResult {
    if (!username) {
      return { valid: false, message: "Username is required" };
    }

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
      return {
        valid: false,
        message: "Username must be at least 3 characters long",
      };
    }

    if (cleanUsername.length > 30) {
      return {
        valid: false,
        message: "Username must be less than 30 characters",
      };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return {
        valid: false,
        message:
          "Username can only contain letters, numbers, underscores, and hyphens",
      };
    }

    return { valid: true };
  }
}

export class SecureWalletStorage {
  private static readonly PRIMARY_WALLET_KEY = "primaryWallet";
  private static readonly PRIVATE_KEY_KEY = "walletPrivateKey";
  private static readonly MNEMONIC_KEY = "walletMnemonic";
  private static readonly ADDITIONAL_WALLETS_KEY = "additionalWallets";

  // ENHANCED: Store primary wallet credentials with validation
  static storeWalletCredentials(credentials: WalletCredentials): void {
    if (typeof window === "undefined") return;

    try {
      // Validate before storing
      if (!WalletValidator.isValidAddress(credentials.address)) {
        throw new Error("Invalid wallet address");
      }

      if (!WalletValidator.isValidPrivateKey(credentials.privateKey)) {
        throw new Error("Invalid private key");
      }

      if (
        credentials.mnemonic &&
        !WalletValidator.isValidMnemonic(credentials.mnemonic)
      ) {
        throw new Error("Invalid mnemonic phrase");
      }

      // Store wallet address info
      localStorage.setItem(
        this.PRIMARY_WALLET_KEY,
        JSON.stringify({ address: credentials.address })
      );

      // Store private key (ensure 0x prefix)
      const privateKey = credentials.privateKey.startsWith("0x")
        ? credentials.privateKey
        : "0x" + credentials.privateKey;

      localStorage.setItem(this.PRIVATE_KEY_KEY, privateKey);

      // Store mnemonic if available
      if (credentials.mnemonic) {
        localStorage.setItem(this.MNEMONIC_KEY, credentials.mnemonic.trim());
      }

      console.log("✅ Primary wallet credentials stored securely");
    } catch (error) {
      console.error("❌ Failed to store wallet credentials:", error);
      throw new Error(`Failed to store wallet credentials: ${error.message}`);
    }
  }

  // ENHANCED: Get primary wallet credentials with validation
  static getPrimaryWalletCredentials(): WalletCredentials | null {
    if (typeof window === "undefined") return null;

    try {
      const primaryWallet = localStorage.getItem(this.PRIMARY_WALLET_KEY);
      const privateKey = localStorage.getItem(this.PRIVATE_KEY_KEY);
      const mnemonic = localStorage.getItem(this.MNEMONIC_KEY);

      if (!primaryWallet || !privateKey) {
        console.log("ℹ️ No primary wallet credentials found");
        return null;
      }

      const walletInfo = JSON.parse(primaryWallet);

      // Validate retrieved data
      if (!WalletValidator.isValidAddress(walletInfo.address)) {
        console.error("❌ Stored wallet address is invalid");
        return null;
      }

      if (!WalletValidator.isValidPrivateKey(privateKey)) {
        console.error("❌ Stored private key is invalid");
        return null;
      }

      const credentials: WalletCredentials = {
        address: walletInfo.address,
        privateKey: privateKey,
        mnemonic: mnemonic || undefined,
      };

      // Validate mnemonic if present
      if (
        credentials.mnemonic &&
        !WalletValidator.isValidMnemonic(credentials.mnemonic)
      ) {
        console.warn("⚠️ Stored mnemonic is invalid, removing it");
        credentials.mnemonic = undefined;
      }

      return credentials;
    } catch (error) {
      console.error("❌ Failed to get wallet credentials:", error);
      return null;
    }
  }

  // ENHANCED: Store additional wallet with validation
  static storeAdditionalWallet(wallet: {
    id: string;
    name: string;
    address: string;
    privateKey: string;
    mnemonic?: string;
  }): void {
    if (typeof window === "undefined") return;

    try {
      // Validate input
      if (!wallet.id || !wallet.name || !wallet.address || !wallet.privateKey) {
        throw new Error("Missing required wallet data");
      }

      if (!WalletValidator.isValidAddress(wallet.address)) {
        throw new Error("Invalid wallet address");
      }

      if (!WalletValidator.isValidPrivateKey(wallet.privateKey)) {
        throw new Error("Invalid private key");
      }

      if (
        wallet.mnemonic &&
        !WalletValidator.isValidMnemonic(wallet.mnemonic)
      ) {
        throw new Error("Invalid mnemonic phrase");
      }

      const existing = JSON.parse(
        localStorage.getItem(this.ADDITIONAL_WALLETS_KEY) || "[]"
      );

      // Check for duplicates
      if (
        existing.some(
          (w: any) =>
            w.id === wallet.id ||
            w.address.toLowerCase() === wallet.address.toLowerCase()
        )
      ) {
        throw new Error("Wallet already exists");
      }

      // Ensure private key has 0x prefix
      const privateKey = wallet.privateKey.startsWith("0x")
        ? wallet.privateKey
        : "0x" + wallet.privateKey;

      const newWallet = {
        id: wallet.id,
        name: wallet.name.trim(),
        address: wallet.address,
        privateKey: privateKey,
        mnemonic: wallet.mnemonic?.trim(),
        createdAt: new Date().toISOString(),
        isAdditional: true,
      };

      existing.push(newWallet);
      localStorage.setItem(
        this.ADDITIONAL_WALLETS_KEY,
        JSON.stringify(existing)
      );

      console.log("✅ Additional wallet stored:", wallet.name);
    } catch (error) {
      console.error("❌ Failed to store additional wallet:", error);
      throw new Error(`Failed to store additional wallet: ${error.message}`);
    }
  }

  // ENHANCED: Get additional wallets with validation
  static getAdditionalWallets(): any[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(this.ADDITIONAL_WALLETS_KEY);
      if (!stored) return [];

      const wallets = JSON.parse(stored);

      // Filter out invalid wallets
      const validWallets = wallets.filter((wallet: any) => {
        if (!wallet.address || !wallet.privateKey) {
          console.warn("⚠️ Skipping wallet with missing data:", wallet.id);
          return false;
        }

        if (!WalletValidator.isValidAddress(wallet.address)) {
          console.warn("⚠️ Skipping wallet with invalid address:", wallet.id);
          return false;
        }

        if (!WalletValidator.isValidPrivateKey(wallet.privateKey)) {
          console.warn(
            "⚠️ Skipping wallet with invalid private key:",
            wallet.id
          );
          return false;
        }

        return true;
      });

      // If we filtered out some wallets, save the cleaned list
      if (validWallets.length !== wallets.length) {
        localStorage.setItem(
          this.ADDITIONAL_WALLETS_KEY,
          JSON.stringify(validWallets)
        );
        console.log("🧹 Cleaned up invalid additional wallets");
      }

      return validWallets;
    } catch (error) {
      console.error("❌ Failed to get additional wallets:", error);
      return [];
    }
  }

  static removeAdditionalWallet(walletId: string): void {
    if (typeof window === "undefined") return;

    try {
      const existing = JSON.parse(
        localStorage.getItem(this.ADDITIONAL_WALLETS_KEY) || "[]"
      );

      const filtered = existing.filter((w: any) => w.id !== walletId);
      localStorage.setItem(
        this.ADDITIONAL_WALLETS_KEY,
        JSON.stringify(filtered)
      );

      console.log("✅ Additional wallet removed:", walletId);
    } catch (error) {
      console.error("❌ Failed to remove additional wallet:", error);
    }
  }

  static clearAllWalletData(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(this.PRIMARY_WALLET_KEY);
      localStorage.removeItem(this.PRIVATE_KEY_KEY);
      localStorage.removeItem(this.MNEMONIC_KEY);
      localStorage.removeItem(this.ADDITIONAL_WALLETS_KEY);

      // Clear dashboard and preference data
      localStorage.removeItem("dashboard-user-data");
      localStorage.removeItem("dashboard-user-data-v2");
      localStorage.removeItem("activeWalletId");
      sessionStorage.removeItem("walletNameOverrides");

      // Clear any other wallet-related keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("wallet-") || key.startsWith("blockpal-"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      console.log("✅ All wallet data cleared");
    } catch (error) {
      console.error("❌ Failed to clear wallet data:", error);
    }
  }

  static hasPrimaryWallet(): boolean {
    if (typeof window === "undefined") return false;

    const primaryWallet = localStorage.getItem(this.PRIMARY_WALLET_KEY);
    const privateKey = localStorage.getItem(this.PRIVATE_KEY_KEY);

    return !!(primaryWallet && privateKey);
  }

  // NEW: Validate all stored wallet data
  static validateAllStoredWallets(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check primary wallet
      const primaryCredentials = this.getPrimaryWalletCredentials();
      if (!primaryCredentials) {
        errors.push("No valid primary wallet found");
      }

      // Check additional wallets
      const additionalWallets = this.getAdditionalWallets();
      console.log(`ℹ️ Found ${additionalWallets.length} additional wallets`);

      return {
        valid: errors.length === 0,
        errors: errors,
      };
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return {
        valid: false,
        errors: errors,
      };
    }
  }
}
