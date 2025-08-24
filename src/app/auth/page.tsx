// src/app/auth/page.tsx - WALLET-FIRST AUTHENTICATION
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { setAuthenticated } from "@/store/slices/authSlice";
import {
  Wallet,
  Key,
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Copy,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ethers } from "ethers";

type AuthStep =
  | "welcome"
  | "wallet-created"
  | "import-wallet"
  | "credentials"
  | "existing-user";

interface WalletData {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

interface CredentialsData {
  username: string;
  password: string;
  confirmPassword: string;
}

export default function AuthPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [currentStep, setCurrentStep] = useState<AuthStep>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  // Wallet data
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [importType, setImportType] = useState<"privateKey" | "mnemonic">(
    "privateKey"
  );
  const [importValue, setImportValue] = useState("");
  const [showImportValue, setShowImportValue] = useState(false);

  // Credentials data
  const [credentials, setCredentials] = useState<CredentialsData>({
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Existing user data
  const [existingUserPassword, setExistingUserPassword] = useState("");

  // Check if there's stored wallet data on mount
  useEffect(() => {
    const storedWallet = localStorage.getItem("primaryWallet");
    if (storedWallet) {
      console.log("Found existing wallet in localStorage");
      // User has a wallet, check if they need to authenticate
      checkExistingWallet();
    }
  }, []);

  const checkExistingWallet = async () => {
    const storedWallet = localStorage.getItem("primaryWallet");
    if (!storedWallet) return;

    try {
      const walletInfo = JSON.parse(storedWallet);

      // Check if this wallet exists in database as primary wallet
      const response = await fetch("/api/auth/check-primary-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletInfo.address }),
      });

      const data = await response.json();

      if (data.exists) {
        // Wallet exists in DB, show password prompt
        setWalletData(walletInfo);
        setCurrentStep("existing-user");
      } else {
        // Wallet not in DB, clear localStorage and start fresh
        localStorage.removeItem("primaryWallet");
        localStorage.removeItem("walletPrivateKey");
        localStorage.removeItem("walletMnemonic");
      }
    } catch (error) {
      console.error("Error checking existing wallet:", error);
      localStorage.clear();
    }
  };

  const handleCreateWallet = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Creating new wallet...");
      const wallet = ethers.Wallet.createRandom();

      const newWalletData: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || "",
      };

      setWalletData(newWalletData);
      setCurrentStep("wallet-created");
    } catch (err) {
      setError("Failed to create wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedFromWalletCreated = async () => {
    if (!walletData) return;

    // Check if this wallet already exists as primary wallet
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/check-primary-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletData.address }),
      });

      const data = await response.json();

      if (data.exists) {
        // Existing user, go to password prompt
        setCurrentStep("existing-user");
      } else {
        // New user, go to credentials creation
        setCurrentStep("credentials");
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
      // If check fails, assume new user
      setCurrentStep("credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (!importValue.trim()) {
      setError("Please enter your private key or recovery phrase");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let wallet: ethers.Wallet;
      let mnemonic = "";

      if (importType === "mnemonic") {
        wallet = ethers.Wallet.fromPhrase(importValue.trim());
        mnemonic = importValue.trim();
      } else {
        wallet = new ethers.Wallet(importValue.trim());
      }

      const importedWalletData: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic,
      };

      // Check if this wallet already exists as primary wallet
      const response = await fetch("/api/auth/check-primary-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet.address }),
      });

      const data = await response.json();

      if (data.exists) {
        // Existing user, go to password prompt
        setWalletData(importedWalletData);
        setCurrentStep("existing-user");
      } else {
        // New user, go to credentials creation
        setWalletData(importedWalletData);
        setCurrentStep("credentials");
      }
    } catch (err) {
      setError(
        "Invalid private key or recovery phrase. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCredentials = async () => {
    if (!credentials.username.trim()) {
      setError("Username is required");
      return;
    }

    if (credentials.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (credentials.password !== credentials.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!walletData) {
      setError("Wallet data missing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create user with wallet-based authentication
      const response = await fetch("/api/auth/create-wallet-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          walletAddress: walletData.address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Store wallet data in localStorage (secure client-side storage)
      localStorage.setItem(
        "primaryWallet",
        JSON.stringify({
          address: walletData.address,
        })
      );
      localStorage.setItem("walletPrivateKey", walletData.privateKey);
      if (walletData.mnemonic) {
        localStorage.setItem("walletMnemonic", walletData.mnemonic);
      }

      // Set user as authenticated in Redux
      dispatch(setAuthenticated(data.user));

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleExistingUserLogin = async () => {
    if (!existingUserPassword.trim()) {
      setError("Password is required");
      return;
    }

    if (!walletData) {
      setError("Wallet data missing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-wallet-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletData.address,
          password: existingUserPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Store wallet data in localStorage
      localStorage.setItem(
        "primaryWallet",
        JSON.stringify({
          address: walletData.address,
        })
      );
      localStorage.setItem("walletPrivateKey", walletData.privateKey);
      if (walletData.mnemonic) {
        localStorage.setItem("walletMnemonic", walletData.mnemonic);
      }

      // Set user as authenticated in Redux
      dispatch(setAuthenticated(data.user));

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const renderWelcome = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-6">
        <Wallet size={40} className="text-black" />
      </div>

      <h1 className="text-2xl font-bold text-white font-mayeka mb-2">
        Welcome to Blockpal
      </h1>
      <p className="text-gray-400 font-satoshi mb-8">
        Get started by creating a new wallet or importing an existing one
      </p>

      <div className="space-y-4">
        <Button
          onClick={handleCreateWallet}
          disabled={loading}
          className="w-full py-3"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <Wallet size={18} className="mr-2" />
              Create New Wallet
            </>
          )}
        </Button>

        <Button
          onClick={() => setCurrentStep("import-wallet")}
          variant="secondary"
          className="w-full py-3"
          size="lg"
          disabled={loading}
        >
          <Key size={18} className="mr-2" />
          Import Existing Wallet
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  const renderWalletCreated = () => (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => {
            setCurrentStep("welcome");
            setWalletData(null);
            setError("");
          }}
          className="mr-3 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#2C2C2C]"
          disabled={loading}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-white font-mayeka">
          Wallet Created Successfully!
        </h2>
      </div>

      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={24} className="text-white" />
        </div>
        <p className="text-gray-400 text-sm font-satoshi">
          Your new wallet has been generated. Please save your credentials
          safely.
        </p>
      </div>

      {/* Wallet Details */}
      <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] mb-6">
        <div className="space-y-4">
          {/* Wallet Address */}
          <div>
            <label className="text-gray-400 text-xs font-satoshi mb-1 block">
              Wallet Address:
            </label>
            <div className="bg-black border border-[#2C2C2C] rounded-lg p-3 flex items-center justify-between">
              <span className="text-white font-mono text-xs break-all mr-2">
                {walletData?.address}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(walletData?.address || "");
                  // Could add a toast notification here
                }}
                className="text-[#E2AF19] hover:opacity-80 transition-opacity flex-shrink-0"
                title="Copy address"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Private Key */}
          <div>
            <label className="text-gray-400 text-xs font-satoshi mb-1 block">
              Private Key:
            </label>
            <div className="bg-black border border-[#2C2C2C] rounded-lg p-3 flex items-center justify-between">
              <span className="text-white font-mono text-xs break-all mr-2">
                {showWalletDetails ? walletData?.privateKey : "•".repeat(64)}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowWalletDetails(!showWalletDetails)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title={showWalletDetails ? "Hide" : "Show"}
                >
                  {showWalletDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(walletData?.privateKey || "");
                  }}
                  className="text-[#E2AF19] hover:opacity-80 transition-opacity"
                  title="Copy private key"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Recovery Phrase */}
          {walletData?.mnemonic && (
            <div>
              <label className="text-gray-400 text-xs font-satoshi mb-1 block">
                Recovery Phrase (12 words):
              </label>
              <div className="bg-black border border-[#2C2C2C] rounded-lg p-3 flex items-center justify-between">
                <span className="text-white font-mono text-xs break-all mr-2">
                  {showWalletDetails
                    ? walletData.mnemonic
                    : "•".repeat(walletData.mnemonic.length)}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(walletData?.mnemonic || "");
                  }}
                  className="text-[#E2AF19] hover:opacity-80 transition-opacity flex-shrink-0"
                  title="Copy recovery phrase"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-6">
        <div className="flex items-start">
          <AlertTriangle
            size={16}
            className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-red-400 text-xs font-satoshi font-semibold mb-1">
              ⚠️ IMPORTANT SECURITY WARNING
            </p>
            <p className="text-red-400 text-xs font-satoshi">
              Save your private key and recovery phrase in a secure location.
              Anyone with access to these can control your wallet. Never share
              them with anyone.
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleProceedFromWalletCreated}
        disabled={loading}
        className="w-full py-3"
        size="lg"
      >
        {loading ? "Checking..." : "Continue"}
      </Button>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  const renderImportWallet = () => (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => {
            setCurrentStep("welcome");
            setError("");
            setImportValue("");
          }}
          className="mr-3 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#2C2C2C]"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-white font-mayeka">
          Import Your Wallet
        </h2>
      </div>

      <div className="space-y-4">
        <div className="flex bg-[#2C2C2C] rounded-lg p-1">
          <button
            onClick={() => setImportType("privateKey")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-satoshi transition-colors ${
              importType === "privateKey"
                ? "bg-[#E2AF19] text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Private Key
          </button>
          <button
            onClick={() => setImportType("mnemonic")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-satoshi transition-colors ${
              importType === "mnemonic"
                ? "bg-[#E2AF19] text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Recovery Phrase
          </button>
        </div>

        <div className="relative">
          <textarea
            value={importValue}
            onChange={(e) => {
              setImportValue(e.target.value);
              setError("");
            }}
            placeholder={
              importType === "privateKey"
                ? "Enter your private key (0x...)"
                : "Enter your 12 or 24 word recovery phrase"
            }
            className="w-full h-32 px-3 py-3 bg-black border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:border-[#E2AF19] resize-none font-satoshi"
            style={{
              WebkitTextSecurity: showImportValue ? "none" : "disc",
              textSecurity: showImportValue ? "none" : "disc",
            }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowImportValue(!showImportValue)}
            className="absolute top-3 right-3 text-gray-400 hover:text-white"
            disabled={loading}
          >
            {showImportValue ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <Button
          onClick={handleImportWallet}
          disabled={loading || !importValue.trim()}
          className="w-full py-3"
          size="lg"
        >
          {loading ? "Importing..." : "Import Wallet"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  const renderCredentials = () => (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => {
            // Go back to wallet created step if we came from there
            if (walletData && walletData.mnemonic) {
              setCurrentStep("wallet-created");
            } else {
              setCurrentStep("welcome");
            }
            setError("");
            setCredentials({ username: "", password: "", confirmPassword: "" });
          }}
          className="mr-3 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#2C2C2C]"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-white font-mayeka">
          Create Your Account
        </h2>
      </div>

      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <User size={24} className="text-[#E2AF19]" />
        </div>
        <p className="text-gray-400 text-sm font-satoshi">
          Create your account credentials to secure your wallet
        </p>
        <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/50 rounded-lg">
          <p className="text-blue-400 text-xs font-satoshi">
            Wallet: {walletData?.address?.slice(0, 8)}...
            {walletData?.address?.slice(-6)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Choose a username"
          value={credentials.username}
          onChange={(e) => {
            setCredentials((prev) => ({ ...prev, username: e.target.value }));
            setError("");
          }}
          disabled={loading}
          autoFocus
        />

        <Input
          type="password"
          placeholder="Create a password"
          value={credentials.password}
          onChange={(e) => {
            setCredentials((prev) => ({ ...prev, password: e.target.value }));
            setError("");
          }}
          disabled={loading}
        />

        <Input
          type="password"
          placeholder="Confirm password"
          value={credentials.confirmPassword}
          onChange={(e) => {
            setCredentials((prev) => ({
              ...prev,
              confirmPassword: e.target.value,
            }));
            setError("");
          }}
          disabled={loading}
        />

        <Button
          onClick={handleCreateCredentials}
          disabled={loading || !credentials.username || !credentials.password}
          className="w-full py-3"
          size="lg"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}

      <div className="mt-6 p-3 bg-green-900/20 border border-green-500/50 rounded-lg">
        <p className="text-green-400 text-xs font-satoshi">
          🔒 Your private keys are stored securely in your browser. Your
          password creates a verification token - we never store passwords
          directly.
        </p>
      </div>
    </div>
  );

  const renderExistingUser = () => (
    <div>
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <Wallet size={24} className="text-[#E2AF19]" />
        </div>
        <h2 className="text-xl font-bold text-white font-mayeka mb-2">
          Welcome Back!
        </h2>
        <p className="text-gray-400 text-sm font-satoshi mb-2">
          Enter your password to access your wallet
        </p>
        <div className="p-2 bg-blue-900/20 border border-blue-500/50 rounded-lg">
          <p className="text-blue-400 text-xs font-satoshi">
            Wallet: {walletData?.address?.slice(0, 8)}...
            {walletData?.address?.slice(-6)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          type="password"
          placeholder="Enter your password"
          value={existingUserPassword}
          onChange={(e) => {
            setExistingUserPassword(e.target.value);
            setError("");
          }}
          disabled={loading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleExistingUserLogin();
            }
          }}
        />

        <Button
          onClick={handleExistingUserLogin}
          disabled={loading || !existingUserPassword.trim()}
          className="w-full py-3"
          size="lg"
        >
          {loading ? "Signing In..." : "Sign In"}
        </Button>

        <button
          onClick={() => {
            localStorage.clear();
            setCurrentStep("welcome");
            setWalletData(null);
            setExistingUserPassword("");
            setError("");
          }}
          className="w-full text-center text-gray-400 hover:text-white text-sm font-satoshi"
          disabled={loading}
        >
          Import Different Wallet
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  const stepComponents = {
    welcome: renderWelcome,
    "wallet-created": renderWalletCreated,
    "import-wallet": renderImportWallet,
    credentials: renderCredentials,
    "existing-user": renderExistingUser,
  };

  return (
    <div className="h-screen flex p-4 overflow-hidden bg-[#0F0F0F]">
      {/* Left side - Auth Flow */}
      <div className="flex-1 flex items-center justify-center bg-[#0F0F0F]">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img
              src="/blockName.png"
              alt="Blockpal"
              className="h-8 brightness-110"
            />
          </div>

          {/* Main Content */}
          <div
            className="p-6 border border-[#2C2C2C] bg-black/95 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide"
            style={{ borderRadius: "18px" }}
          >
            {stepComponents[currentStep]?.() || renderWelcome()}
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex flex-1 bg-[#0F0F0F] pr-0">
        <div className="w-full h-full flex items-center justify-end">
          <div
            className="overflow-hidden"
            style={{
              width: "calc(100% - 20px)",
              height: "calc(100vh - 40px)",
              borderRadius: "24px",
              marginRight: "0px",
            }}
          >
            <img
              src="/blockBanner.png"
              alt="Blockpal Dashboard Preview"
              className="w-full h-full object-cover drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
