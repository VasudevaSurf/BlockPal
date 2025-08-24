// src/lib/wallet-security.ts - SECURE WALLET OPERATIONS
import { ethers } from "ethers";

export interface WalletCredentials {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

export interface StoredWalletData {
  address: string;
}

/**
 * Secure localStorage manager for wallet data
 * Handles primary wallet info, private keys, and mnemonics separately
 */
export class SecureWalletStorage {
  private static readonly KEYS = {
    PRIMARY_WALLET: "primaryWallet",
    PRIVATE_KEY: "walletPrivateKey",
    MNEMONIC: "walletMnemonic",
  };

  /**
   * Store wallet credentials securely in localStorage
   * Primary wallet info and credentials are stored separately
   */
  static storeWalletCredentials(credentials: WalletCredentials): void {
    try {
      console.log("🔐 Storing wallet credentials securely");

      // Store primary wallet info (just address)
      const walletInfo: StoredWalletData = {
        address: credentials.address,
      };
      localStorage.setItem(
        this.KEYS.PRIMARY_WALLET,
        JSON.stringify(walletInfo)
      );

      // Store private key separately
      localStorage.setItem(this.KEYS.PRIVATE_KEY, credentials.privateKey);

      // Store mnemonic separately if provided
      if (credentials.mnemonic) {
        localStorage.setItem(this.KEYS.MNEMONIC, credentials.mnemonic);
      }

      console.log("✅ Wallet credentials stored securely:", {
        address: credentials.address.slice(0, 10) + "...",
        hasPrivateKey: !!credentials.privateKey,
        hasMnemonic: !!credentials.mnemonic,
      });
    } catch (error) {
      console.error("❌ Error storing wallet credentials:", error);
      throw new Error("Failed to store wallet credentials");
    }
  }

  /**
   * Retrieve wallet credentials from localStorage
   */
  static getWalletCredentials(): WalletCredentials | null {
    try {
      const walletInfo = localStorage.getItem(this.KEYS.PRIMARY_WALLET);
      const privateKey = localStorage.getItem(this.KEYS.PRIVATE_KEY);
      const mnemonic = localStorage.getItem(this.KEYS.MNEMONIC);

      if (!walletInfo || !privateKey) {
        console.log("📭 No wallet credentials found in storage");
        return null;
      }

      const parsedWalletInfo: StoredWalletData = JSON.parse(walletInfo);

      const credentials: WalletCredentials = {
        address: parsedWalletInfo.address,
        privateKey: privateKey,
        mnemonic: mnemonic || undefined,
      };

      console.log("📋 Retrieved wallet credentials:", {
        address: credentials.address.slice(0, 10) + "...",
        hasPrivateKey: !!credentials.privateKey,
        hasMnemonic: !!credentials.mnemonic,
      });

      return credentials;
    } catch (error) {
      console.error("❌ Error retrieving wallet credentials:", error);
      return null;
    }
  }

  /**
   * Get just the primary wallet info (address only)
   */
  static getPrimaryWalletInfo(): StoredWalletData | null {
    try {
      const walletInfo = localStorage.getItem(this.KEYS.PRIMARY_WALLET);
      if (!walletInfo) return null;

      return JSON.parse(walletInfo);
    } catch (error) {
      console.error("❌ Error getting primary wallet info:", error);
      return null;
    }
  }

  /**
   * Check if wallet credentials exist in storage
   */
  static hasWalletCredentials(): boolean {
    const walletInfo = localStorage.getItem(this.KEYS.PRIMARY_WALLET);
    const privateKey = localStorage.getItem(this.KEYS.PRIVATE_KEY);

    return !!(walletInfo && privateKey);
  }

  /**
   * Clear all wallet credentials from storage
   */
  static clearWalletCredentials(): void {
    console.log("🧹 Clearing all wallet credentials from storage");

    localStorage.removeItem(this.KEYS.PRIMARY_WALLET);
    localStorage.removeItem(this.KEYS.PRIVATE_KEY);
    localStorage.removeItem(this.KEYS.MNEMONIC);

    // Clear any other wallet-related data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("wallet") ||
          key.includes("token") ||
          key.includes("dashboard"))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.log("✅ All wallet credentials cleared");
  }

  /**
   * Validate that stored credentials are valid
   */
  static validateStoredCredentials(): boolean {
    try {
      const credentials = this.getWalletCredentials();
      if (!credentials) return false;

      // Validate address format
      if (!ethers.isAddress(credentials.address)) {
        console.error("❌ Invalid wallet address in storage");
        return false;
      }

      // Validate private key format
      try {
        new ethers.Wallet(credentials.privateKey);
      } catch (error) {
        console.error("❌ Invalid private key in storage");
        return false;
      }

      // Validate mnemonic if present
      if (credentials.mnemonic) {
        try {
          ethers.Mnemonic.fromPhrase(credentials.mnemonic);
        } catch (error) {
          console.error("❌ Invalid mnemonic in storage");
          return false;
        }
      }

      // Ensure private key matches the address
      const wallet = new ethers.Wallet(credentials.privateKey);
      if (wallet.address.toLowerCase() !== credentials.address.toLowerCase()) {
        console.error("❌ Private key doesn't match stored address");
        return false;
      }

      console.log("✅ Stored credentials are valid");
      return true;
    } catch (error) {
      console.error("❌ Error validating stored credentials:", error);
      return false;
    }
  }
}

/**
 * Wallet validation utilities
 */
export class WalletValidator {
  /**
   * Validate wallet address
   */
  static isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate private key
   */
  static isValidPrivateKey(privateKey: string): boolean {
    try {
      const cleanKey = privateKey.startsWith("0x")
        ? privateKey.slice(2)
        : privateKey;

      if (cleanKey.length !== 64) return false;
      if (!/^[a-fA-F0-9]+$/.test(cleanKey)) return false;

      new ethers.Wallet(
        privateKey.startsWith("0x") ? privateKey : "0x" + privateKey
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate mnemonic phrase
   */
  static isValidMnemonic(mnemonic: string): boolean {
    try {
      ethers.Mnemonic.fromPhrase(mnemonic);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate that private key matches address
   */
  static doesPrivateKeyMatchAddress(
    privateKey: string,
    address: string
  ): boolean {
    try {
      const wallet = new ethers.Wallet(privateKey);
      return wallet.address.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  }
}

/**
 * Password security utilities
 */
export class PasswordValidator {
  /**
   * Validate password strength
   */
  static isValidPassword(password: string): {
    valid: boolean;
    message?: string;
  } {
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

    // Check for at least one character that's not a space
    if (!/\S/.test(password)) {
      return { valid: false, message: "Password cannot be only whitespace" };
    }

    return { valid: true };
  }

  /**
   * Validate username
   */
  static isValidUsername(username: string): {
    valid: boolean;
    message?: string;
  } {
    if (username.length < 3) {
      return {
        valid: false,
        message: "Username must be at least 3 characters long",
      };
    }

    if (username.length > 30) {
      return {
        valid: false,
        message: "Username must be less than 30 characters",
      };
    }

    // Allow alphanumeric characters, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return {
        valid: false,
        message:
          "Username can only contain letters, numbers, underscores, and hyphens",
      };
    }

    // Must start with a letter or number
    if (!/^[a-zA-Z0-9]/.test(username)) {
      return {
        valid: false,
        message: "Username must start with a letter or number",
      };
    }

    return { valid: true };
  }
}

/**
 * Browser security utilities
 */
export class BrowserSecurity {
  /**
   * Check if localStorage is available and working
   */
  static isLocalStorageAvailable(): boolean {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, "test");
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if we're in a secure context (HTTPS or localhost)
   */
  static isSecureContext(): boolean {
    if (typeof window === "undefined") return true; // SSR
    return window.isSecureContext;
  }

  /**
   * Warn user about security concerns
   */
  static checkSecurityRequirements(): { secure: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!this.isLocalStorageAvailable()) {
      warnings.push(
        "Local storage is not available. Wallet data cannot be stored."
      );
    }

    if (!this.isSecureContext()) {
      warnings.push(
        "Insecure connection detected. Please use HTTPS for better security."
      );
    }

    if (
      typeof window !== "undefined" &&
      window.location.protocol === "http:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      warnings.push(
        "Using HTTP in production is not recommended for wallet applications."
      );
    }

    return {
      secure: warnings.length === 0,
      warnings,
    };
  }
}

// Export convenience functions
export const secureWalletStorage = SecureWalletStorage;
export const walletValidator = WalletValidator;
export const passwordValidator = PasswordValidator;
export const browserSecurity = BrowserSecurity;
