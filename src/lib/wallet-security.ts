// src/lib/wallet-security.ts - Wallet security utilities
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

  static isValidMnemonic(mnemonic: string): boolean {
    try {
      ethers.Mnemonic.fromPhrase(mnemonic.trim());
      return true;
    } catch {
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

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
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

  // Store primary wallet credentials
  static storeWalletCredentials(credentials: WalletCredentials): void {
    if (typeof window === "undefined") return;

    try {
      // Store wallet address info
      localStorage.setItem(
        this.PRIMARY_WALLET_KEY,
        JSON.stringify({ address: credentials.address })
      );

      // Store private key
      localStorage.setItem(this.PRIVATE_KEY_KEY, credentials.privateKey);

      // Store mnemonic if available
      if (credentials.mnemonic) {
        localStorage.setItem(this.MNEMONIC_KEY, credentials.mnemonic);
      }

      console.log("✅ Wallet credentials stored securely in localStorage");
    } catch (error) {
      console.error("❌ Failed to store wallet credentials:", error);
      throw new Error("Failed to store wallet credentials");
    }
  }

  // Get primary wallet credentials
  static getPrimaryWalletCredentials(): WalletCredentials | null {
    if (typeof window === "undefined") return null;

    try {
      const primaryWallet = localStorage.getItem(this.PRIMARY_WALLET_KEY);
      const privateKey = localStorage.getItem(this.PRIVATE_KEY_KEY);
      const mnemonic = localStorage.getItem(this.MNEMONIC_KEY);

      if (!primaryWallet || !privateKey) {
        return null;
      }

      const walletInfo = JSON.parse(primaryWallet);
      return {
        address: walletInfo.address,
        privateKey,
        mnemonic: mnemonic || undefined,
      };
    } catch (error) {
      console.error("❌ Failed to get wallet credentials:", error);
      return null;
    }
  }

  // Store additional wallet
  static storeAdditionalWallet(wallet: {
    id: string;
    name: string;
    address: string;
    privateKey: string;
    mnemonic?: string;
  }): void {
    if (typeof window === "undefined") return;

    try {
      const existing = JSON.parse(
        localStorage.getItem(this.ADDITIONAL_WALLETS_KEY) || "[]"
      );

      const newWallet = {
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
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
      throw new Error("Failed to store additional wallet");
    }
  }

  // Get additional wallets
  static getAdditionalWallets(): any[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(this.ADDITIONAL_WALLETS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("❌ Failed to get additional wallets:", error);
      return [];
    }
  }

  // Remove additional wallet
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

  // Clear all wallet data (for logout)
  static clearAllWalletData(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(this.PRIMARY_WALLET_KEY);
      localStorage.removeItem(this.PRIVATE_KEY_KEY);
      localStorage.removeItem(this.MNEMONIC_KEY);
      localStorage.removeItem(this.ADDITIONAL_WALLETS_KEY);

      // Clear any dashboard data
      localStorage.removeItem("dashboard-user-data");
      localStorage.removeItem("dashboard-user-data-v2");
      sessionStorage.removeItem("walletNameOverrides");

      console.log("✅ All wallet data cleared");
    } catch (error) {
      console.error("❌ Failed to clear wallet data:", error);
    }
  }

  // Check if primary wallet exists
  static hasPrimaryWallet(): boolean {
    if (typeof window === "undefined") return false;

    const primaryWallet = localStorage.getItem(this.PRIMARY_WALLET_KEY);
    const privateKey = localStorage.getItem(this.PRIVATE_KEY_KEY);

    return !!(primaryWallet && privateKey);
  }
}
