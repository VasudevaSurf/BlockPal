// src/components/dashboard/WalletWelcomeModal.tsx - FIXED FOR ADDITIONAL WALLETS
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { createWalletUser, verifyWalletUser } from "@/store/slices/authSlice";
import {
  SecureWalletStorage,
  WalletValidator,
  PasswordValidator,
} from "@/lib/wallet-security";
import {
  X,
  Key,
  Plus,
  ArrowLeft,
  Copy,
  Download,
  Eye,
  EyeOff,
  ChevronRight,
  Lock,
  User,
  Mail,
  AlertCircle,
  CheckCircle,
  Wallet,
} from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { ethers } from "ethers";

interface WalletWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onWalletCreated: () => void;
  onWalletExists?: (walletData: any) => void;
  isAdditionalWallet?: boolean; // NEW: Flag to indicate this is for adding additional wallets
}

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

type Step =
  | "welcome"
  | "import-options"
  | "import-recovery-phrase"
  | "import-private-key"
  | "create-wallet"
  | "wallet-created"
  | "existing-wallet-login"
  | "register-credentials"
  | "additional-wallet-created"; // NEW: Step for additional wallet creation

export default function WalletWelcomeModal({
  isOpen,
  onClose,
  userName = "User",
  onWalletCreated,
  onWalletExists,
  isAdditionalWallet = false, // NEW: Default to false
}: WalletWelcomeModalProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const modalRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Wallet creation/import states
  const [phraseWords, setPhraseWords] = useState<string[]>(
    new Array(12).fill("")
  );
  const [phraseLength, setPhraseLength] = useState(12);
  const [privateKey, setPrivateKey] = useState("");
  const [walletName, setWalletName] = useState("");
  const [newWalletName, setNewWalletName] = useState("");

  // Generated wallet data
  const [generatedWallet, setGeneratedWallet] = useState<WalletData | null>(
    null
  );

  // Registration states
  const [registrationData, setRegistrationData] = useState<CredentialsData>({
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Existing user login states
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [existingWalletData, setExistingWalletData] =
    useState<WalletData | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const resetModal = () => {
    setCurrentStep("welcome");
    setPhraseWords(new Array(12).fill(""));
    setPhraseLength(12);
    setPrivateKey("");
    setWalletName("");
    setNewWalletName("");
    setGeneratedWallet(null);
    setRegistrationData({
      username: "",
      password: "",
      confirmPassword: "",
    });
    setLoginData({
      username: "",
      password: "",
    });
    setExistingWalletData(null);
    setError("");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Check if wallet exists in database as primary wallet (only for first wallet)
  const checkWalletExists = async (walletAddress: string) => {
    if (isAdditionalWallet) {
      // For additional wallets, we don't need to check if it's a primary wallet
      // We just need to validate the wallet
      return { exists: false };
    }

    try {
      const response = await fetch("/api/auth/check-primary-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error checking wallet:", error);
      return { exists: false };
    }
  };

  // Generate new wallet
  const generateNewWallet = async () => {
    if (!newWalletName.trim()) {
      setError("Please enter a wallet name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Generating new wallet...");
      const wallet = ethers.Wallet.createRandom();

      const walletData: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || "",
      };

      setGeneratedWallet(walletData);

      // For additional wallets, go directly to creation step
      if (isAdditionalWallet) {
        setCurrentStep("additional-wallet-created");
      } else {
        setCurrentStep("wallet-created");
      }

      console.log("✅ Wallet generated successfully");
    } catch (err: any) {
      console.error("Wallet generation error:", err);
      setError("Failed to generate wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle import with recovery phrase
  const handleImportWithRecovery = async () => {
    const filledWords = phraseWords.filter((word) => word.trim() !== "");

    if (filledWords.length !== phraseLength) {
      setError(`Please enter all ${phraseLength} words`);
      return;
    }

    const recoveryPhrase = filledWords.join(" ");

    // Validate mnemonic
    if (!WalletValidator.isValidMnemonic(recoveryPhrase)) {
      setError(
        "Invalid recovery phrase. Please check your words and try again."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Importing wallet from recovery phrase...");
      const wallet = ethers.Wallet.fromPhrase(recoveryPhrase);

      const walletData: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: recoveryPhrase,
      };

      // For additional wallets, go directly to creation
      if (isAdditionalWallet) {
        setGeneratedWallet(walletData);
        setCurrentStep("additional-wallet-created");
        return;
      }

      // Check if wallet exists as primary wallet
      const checkResult = await checkWalletExists(wallet.address);

      if (checkResult.exists) {
        console.log("🔍 Existing primary wallet detected");
        setExistingWalletData(walletData);
        setLoginData({
          username: checkResult.username,
          password: "",
        });
        setCurrentStep("existing-wallet-login");
      } else {
        console.log("🆕 New wallet, proceeding to registration");
        setGeneratedWallet(walletData);
        setCurrentStep("register-credentials");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setError("Failed to import wallet. Please check your recovery phrase.");
    } finally {
      setLoading(false);
    }
  };

  // Handle import with private key
  const handleImportWithPrivateKey = async () => {
    if (!privateKey.trim() || !walletName.trim()) {
      setError("Please fill in all fields");
      return;
    }

    // Validate private key
    if (!WalletValidator.isValidPrivateKey(privateKey.trim())) {
      setError("Invalid private key format. Please check and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Importing wallet from private key...");
      const wallet = new ethers.Wallet(privateKey.trim());

      const walletData: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
      };

      // For additional wallets, go directly to creation
      if (isAdditionalWallet) {
        setGeneratedWallet(walletData);
        setCurrentStep("additional-wallet-created");
        return;
      }

      // Check if wallet exists as primary wallet
      const checkResult = await checkWalletExists(wallet.address);

      if (checkResult.exists) {
        console.log("🔍 Existing primary wallet detected");
        setExistingWalletData(walletData);
        setLoginData({
          username: checkResult.username,
          password: "",
        });
        setCurrentStep("existing-wallet-login");
      } else {
        console.log("🆕 New wallet, proceeding to registration");
        setGeneratedWallet(walletData);
        setCurrentStep("register-credentials");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setError("Failed to import wallet. Please check your private key.");
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle additional wallet creation
  const handleAdditionalWalletCreation = async () => {
    if (!generatedWallet) {
      setError("No wallet data available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("➕ Creating additional wallet...");

      // Store wallet in localStorage with unique identifier
      const additionalWallets = JSON.parse(
        localStorage.getItem("additionalWallets") || "[]"
      );

      const newAdditionalWallet = {
        id: `wallet-${Date.now()}`,
        name: newWalletName || walletName || "Additional Wallet",
        address: generatedWallet.address,
        privateKey: generatedWallet.privateKey,
        mnemonic: generatedWallet.mnemonic,
        createdAt: new Date().toISOString(),
        isAdditional: true,
      };

      additionalWallets.push(newAdditionalWallet);
      localStorage.setItem(
        "additionalWallets",
        JSON.stringify(additionalWallets)
      );

      console.log("✅ Additional wallet stored in localStorage");

      // Notify parent component
      onWalletCreated();
      handleClose();
    } catch (error: any) {
      console.error("❌ Additional wallet creation error:", error);
      setError("Failed to create additional wallet");
    } finally {
      setLoading(false);
    }
  };

  // Handle user registration (for primary wallet only)
  const handleRegisterUser = async () => {
    const { username, password, confirmPassword } = registrationData;

    // Validate username
    const usernameValidation = PasswordValidator.isValidUsername(username);
    if (!usernameValidation.valid) {
      setError(usernameValidation.message || "Invalid username");
      return;
    }

    // Validate password
    const passwordValidation = PasswordValidator.isValidPassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message || "Invalid password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!generatedWallet) {
      setError("No wallet data available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("📝 Creating new wallet-based user...");

      // Dispatch user creation action
      const result = await dispatch(
        createWalletUser({
          username: username.trim(),
          password: password,
          walletAddress: generatedWallet.address,
        })
      );

      if (createWalletUser.fulfilled.match(result)) {
        console.log("✅ User created successfully");

        // Store wallet credentials in localStorage
        SecureWalletStorage.storeWalletCredentials(generatedWallet);

        // Success
        onWalletCreated();
        handleClose();
      } else {
        const errorMessage =
          (result.payload as string) || "Failed to create account";
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error("❌ Registration error:", error);
      setError(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  // Handle existing user login (for primary wallet only)
  const handleExistingUserLogin = async () => {
    if (!loginData.password) {
      setError("Please enter your password");
      return;
    }

    if (!existingWalletData) {
      setError("No wallet data available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Verifying existing wallet user...");

      const result = await dispatch(
        verifyWalletUser({
          walletAddress: existingWalletData.address,
          password: loginData.password,
        })
      );

      if (verifyWalletUser.fulfilled.match(result)) {
        console.log("✅ User verification successful");

        // Store wallet credentials in localStorage
        SecureWalletStorage.storeWalletCredentials(existingWalletData);

        // Success
        onWalletCreated();
        handleClose();
      } else {
        const errorMessage = (result.payload as string) || "Invalid password";
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      setError(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle save generated wallet (for primary wallet)
  const handleSaveGeneratedWallet = () => {
    if (!generatedWallet) return;
    setCurrentStep("register-credentials");
  };

  // Helper functions for form inputs
  const handlePhraseWordChange = (index: number, value: string) => {
    const newWords = [...phraseWords];
    newWords[index] = value.trim().toLowerCase();
    setPhraseWords(newWords);
  };

  const handlePhraseLength = (length: number) => {
    setPhraseLength(length);
    setPhraseWords(new Array(length).fill(""));
  };

  const handlePastePhrase = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const words = text.trim().split(/\s+/);

      if (words.length === 12 || words.length === 18 || words.length === 24) {
        setPhraseLength(words.length);
        const newWords = new Array(words.length).fill("");
        words.forEach((word, index) => {
          if (index < words.length) {
            newWords[index] = word.toLowerCase();
          }
        });
        setPhraseWords(newWords);
      } else {
        setError(
          "Invalid recovery phrase length. Please enter 12, 18, or 24 words."
        );
      }
    } catch (err) {
      setError("Failed to paste from clipboard");
    }
  };

  // Render functions for each step
  const renderWelcome = () => (
    <div className="text-center">
      <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-6">
        <Wallet size={32} className="text-black" />
      </div>

      <h2 className="text-xl font-bold text-white font-mayeka mb-1.5">
        {isAdditionalWallet ? "Add Another Wallet" : "Welcome to Blockpal"}
      </h2>
      <p className="text-gray-400 font-satoshi mb-6">
        {isAdditionalWallet
          ? "Import an existing wallet or create a new one"
          : "Choose how you'd like to get started"}
      </p>

      <div className="space-y-3">
        <Button
          onClick={() => setCurrentStep("create-wallet")}
          variant="secondary"
          className="w-full flex items-center justify-center"
          size="lg"
        >
          <div className="w-5 h-5 border border-white rounded-full flex items-center justify-center mr-1.5">
            <Plus size={12} className="text-white" />
          </div>
          Create a new wallet
        </Button>
        <Button
          onClick={() => setCurrentStep("import-options")}
          className="w-full flex items-center justify-center"
          size="lg"
        >
          <Download size={16} className="mr-1.5" />
          Import existing wallet
        </Button>
      </div>

      {error && (
        <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-2.5">
          <p className="text-red-400 text-xs font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  // NEW: Render additional wallet created step
  const renderAdditionalWalletCreated = () => (
    <div className="text-center">
      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
        <CheckCircle size={24} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-white font-mayeka mb-1.5">
        Wallet Ready!
      </h2>
      <p className="text-gray-400 font-satoshi mb-4">
        Your additional wallet has been created successfully.
      </p>

      {generatedWallet && (
        <div className="bg-[#0F0F0F] rounded-lg p-3 mb-4 text-left">
          <h3 className="text-white font-semibold mb-2 font-satoshi">
            Wallet Information
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <label className="text-gray-400 font-satoshi">Address:</label>
              <div className="text-white font-mono text-xs mt-0.5 break-all">
                {generatedWallet.address}
              </div>
            </div>
          </div>

          <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/50 rounded-lg">
            <p className="text-blue-400 text-xs font-satoshi">
              💾 This wallet will be stored securely in your browser alongside
              your primary wallet.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Input
          type="text"
          placeholder="Enter wallet name (optional)"
          value={newWalletName}
          onChange={(e) => setNewWalletName(e.target.value)}
          className="font-satoshi"
        />

        <Button
          onClick={handleAdditionalWalletCreation}
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading ? "Adding Wallet..." : "Add Wallet"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-2.5">
          <p className="text-red-400 text-xs font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  // ... (keep all other existing render functions: renderCreateWallet, renderImportOptions, etc.)
  // Just modify them to check for isAdditionalWallet where needed

  // Render create wallet step
  const renderCreateWallet = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentStep("welcome")}
          className="mr-2 p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-lg font-bold text-white font-mayeka">
          Create new wallet
        </h2>
        <div className="w-6"></div>
      </div>

      <div className="space-y-3">
        <Input
          label="Wallet name"
          placeholder="Enter wallet name"
          value={newWalletName}
          onChange={(e) => setNewWalletName(e.target.value)}
        />

        <Button
          onClick={generateNewWallet}
          disabled={loading || !newWalletName.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? "Generating..." : "Generate Wallet"}
        </Button>
      </div>

      {error && (
        <div className="mt-3 bg-red-900/20 border border-red-500/50 rounded-lg p-2.5">
          <p className="text-red-400 text-xs font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  // Render import options step
  const renderImportOptions = () => (
    <div>
      <div className="flex items-center justify-between mb-6 px-3 py-0">
        <button
          onClick={() => setCurrentStep("welcome")}
          className="p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-lg font-bold text-white font-satoshi">
          Import existing wallet
        </h2>
        <div className="w-6"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-0">
        <button
          onClick={() => setCurrentStep("import-recovery-phrase")}
          className="flex flex-col items-center p-4 bg-[#0F0F0F] rounded-lg hover:bg-[#1A1A1A] transition-all duration-200 group"
        >
          <div className="w-10 h-10 bg-[#4B3A08] rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Key size={14} className="text-[#E2AF19]" />
          </div>
          <div className="text-white font-medium font-satoshi text-center text-sm">
            Recovery Phrase
          </div>
        </button>

        <button
          onClick={() => setCurrentStep("import-private-key")}
          className="flex flex-col items-center p-4 bg-[#0F0F0F] rounded-lg hover:bg-[#1A1A1A] transition-all duration-200 group"
        >
          <div className="w-10 h-10 bg-[#4B3A08] rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Download size={14} className="text-[#E2AF19]" />
          </div>
          <div className="text-white font-medium font-satoshi text-center text-sm">
            Private Key
          </div>
        </button>
      </div>
    </div>
  );

  // Render import recovery phrase step
  const renderImportRecoveryPhrase = () => (
    <div>
      <div className="flex items-center mb-4">
        <button
          onClick={() => setCurrentStep("import-options")}
          className="mr-2 p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-lg font-bold text-white font-satoshi text-center flex-1">
          Import with recovery phrase
        </h2>
        <div className="w-8"></div>
      </div>

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-white mb-1.5 font-mayeka">
          Enter Your Recovery Phrase
        </h3>
        <p className="text-gray-400 text-xs font-satoshi">
          Typically 12 (sometimes 18, 24) words.
        </p>
      </div>

      <div className="bg-[#0F0F0F] rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex bg-[#2C2C2C] rounded-lg p-0.5 space-x-0.5">
            {[12, 18, 24].map((length) => (
              <button
                key={length}
                onClick={() => handlePhraseLength(length)}
                className={`px-2.5 py-1 rounded-md font-satoshi text-xs transition-colors ${
                  phraseLength === length
                    ? "bg-[#494949] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {length}
              </button>
            ))}
          </div>
          <button
            onClick={handlePastePhrase}
            className="bg-[#2C2C2C] text-white px-3 py-1.5 rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors text-xs"
          >
            Paste
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: phraseLength }).map((_, index) => (
            <div key={index} className="relative">
              <input
                type="text"
                placeholder=""
                value={phraseWords[index] || ""}
                onChange={(e) => handlePhraseWordChange(index, e.target.value)}
                className="w-full px-2.5 py-2.5 pl-6 bg-black border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E2AF19] font-satoshi text-xs"
              />
              <span className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-satoshi">
                {index + 1}.
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleImportWithRecovery}
        disabled={
          loading || phraseWords.filter((w) => w.trim()).length !== phraseLength
        }
        className="w-full"
        size="lg"
      >
        {loading ? "Importing..." : "Import Wallet"}
      </Button>

      {error && (
        <div className="mt-3 bg-red-900/20 border border-red-500/50 rounded-lg p-2.5">
          <p className="text-red-400 text-xs font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  // Render import private key step
  const renderImportPrivateKey = () => (
    <div>
      <div className="flex items-center mb-4">
        <button
          onClick={() => setCurrentStep("import-options")}
          className="mr-2 p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-lg font-bold text-white font-satoshi text-center flex-1">
          Import with private key
        </h2>
        <div className="w-8"></div>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Enter wallet name"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
        />

        <div>
          <textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="Enter your private key (0x...)"
            className="w-full h-24 px-2.5 py-2.5 border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:border-[#E2AF19] resize-none font-satoshi text-xs bg-black"
            style={{ fontSize: "14px" }}
          />
          <div className="flex justify-end mt-1.5">
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setPrivateKey(text);
                } catch (err) {
                  setError("Failed to paste from clipboard");
                }
              }}
              className="bg-[#2C2C2C] text-white px-2.5 py-1 rounded-lg text-xs font-satoshi hover:bg-[#3C3C3C] transition-colors"
            >
              Paste
            </button>
          </div>
        </div>

        <Button
          onClick={handleImportWithPrivateKey}
          disabled={loading || !privateKey.trim() || !walletName.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? "Importing..." : "Import"}
        </Button>
      </div>

      {error && (
        <div className="mt-3 bg-red-900/20 border border-red-500/50 rounded-lg p-2.5">
          <p className="text-red-400 text-xs font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  // Render existing wallet login step
  const renderExistingWalletLogin = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentStep("welcome")}
          className="mr-2 p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-lg font-bold text-white font-mayeka">
          Welcome Back!
        </h2>
        <div className="w-6"></div>
      </div>

      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <Lock size={24} className="text-[#E2AF19]" />
        </div>
        <h3 className="text-white font-semibold font-satoshi mb-1">
          Wallet Already Exists
        </h3>
        <p className="text-gray-400 text-xs font-satoshi">
          This wallet belongs to <strong>{loginData.username}</strong>
        </p>
        <p className="text-gray-500 text-xs font-satoshi mt-1">
          Enter your password to continue
        </p>
      </div>

      {error && (
        <div className="mb-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle
              size={14}
              className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
            />
            <p className="text-red-400 text-xs font-satoshi">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Input
          type="text"
          placeholder="Username"
          value={loginData.username}
          disabled
          className="font-satoshi bg-gray-800/50"
        />

        <Input
          type="password"
          placeholder="Enter your password"
          value={loginData.password}
          onChange={(e) => {
            setLoginData((prev) => ({ ...prev, password: e.target.value }));
            setError("");
          }}
          className="font-satoshi"
          autoFocus
          disabled={loading}
        />

        <Button
          onClick={handleExistingUserLogin}
          disabled={loading || !loginData.password}
          className="w-full"
          size="lg"
        >
          {loading ? "Signing In..." : "Sign In"}
        </Button>
      </div>

      <div className="mt-4 p-2.5 bg-blue-900/20 border border-blue-500/50 rounded-lg">
        <p className="text-blue-400 text-xs font-satoshi">
          Your wallet will be automatically restored after login.
        </p>
      </div>
    </div>
  );

  // Render register credentials step
  const renderRegisterCredentials = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentStep("welcome")}
          className="mr-2 p-1.5 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-lg font-bold text-white font-mayeka">
          Create Account
        </h2>
        <div className="w-6"></div>
      </div>

      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <User size={24} className="text-[#E2AF19]" />
        </div>
        <h3 className="text-white font-semibold font-satoshi mb-1">
          Almost Done!
        </h3>
        <p className="text-gray-400 text-xs font-satoshi">
          Set up your account to secure your wallet
        </p>
        {generatedWallet && (
          <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/50 rounded-lg">
            <p className="text-blue-400 text-xs font-satoshi">
              Wallet: {generatedWallet.address?.slice(0, 8)}...
              {generatedWallet.address?.slice(-6)}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle
              size={14}
              className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
            />
            <p className="text-red-400 text-xs font-satoshi">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Input
          type="text"
          placeholder="Choose a username"
          value={registrationData.username}
          onChange={(e) => {
            setRegistrationData((prev) => ({
              ...prev,
              username: e.target.value,
            }));
            setError("");
          }}
          className="font-satoshi"
          disabled={loading}
          autoFocus
        />

        <Input
          type="password"
          placeholder="Create password (min 6 characters)"
          value={registrationData.password}
          onChange={(e) => {
            setRegistrationData((prev) => ({
              ...prev,
              password: e.target.value,
            }));
            setError("");
          }}
          className="font-satoshi"
          disabled={loading}
        />

        <Input
          type="password"
          placeholder="Confirm password"
          value={registrationData.confirmPassword}
          onChange={(e) => {
            setRegistrationData((prev) => ({
              ...prev,
              confirmPassword: e.target.value,
            }));
            setError("");
          }}
          className="font-satoshi"
          disabled={loading}
        />

        <Button
          onClick={handleRegisterUser}
          disabled={
            loading ||
            !registrationData.username ||
            !registrationData.password ||
            !registrationData.confirmPassword
          }
          className="w-full"
          size="lg"
        >
          {loading ? "Creating Account..." : "Complete Setup"}
        </Button>
      </div>

      <div className="mt-4 p-2.5 bg-green-900/20 border border-green-500/50 rounded-lg">
        <p className="text-green-400 text-xs font-satoshi">
          🔒 Your private keys are stored securely in your browser. We never
          store passwords - only secure verification tokens.
        </p>
      </div>
    </div>
  );

  // Render wallet created step
  const renderWalletCreated = () => (
    <div className="text-center">
      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
        <CheckCircle size={24} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-white font-mayeka mb-1.5">
        Wallet Ready!
      </h2>
      <p className="text-gray-400 font-satoshi mb-4">
        Your wallet has been generated successfully. Please save your
        credentials securely.
      </p>

      {generatedWallet && (
        <div className="bg-[#0F0F0F] rounded-lg p-3 mb-4 text-left">
          <h3 className="text-white font-semibold mb-2 font-satoshi">
            ⚠️ Important: Save These Credentials
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <label className="text-gray-400 font-satoshi">Address:</label>
              <div className="text-white font-mono text-xs mt-0.5 break-all">
                {generatedWallet.address}
              </div>
            </div>
            <div>
              <label className="text-gray-400 font-satoshi">Private Key:</label>
              <div className="text-white font-mono text-xs mt-0.5 break-all">
                {generatedWallet.privateKey}
              </div>
            </div>
            {generatedWallet.mnemonic && (
              <div>
                <label className="text-gray-400 font-satoshi">
                  Recovery Phrase:
                </label>
                <div className="text-white font-mono text-xs mt-0.5 break-all">
                  {generatedWallet.mnemonic}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 p-2 bg-amber-900/20 border border-amber-500/50 rounded-lg">
            <p className="text-amber-400 text-xs font-satoshi">
              💾 These credentials are stored securely in your browser. Back
              them up safely!
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={handleSaveGeneratedWallet}
        className="w-full"
        size="lg"
        disabled={loading}
      >
        Continue to Account Setup
      </Button>
    </div>
  );

  const stepComponents = {
    welcome: renderWelcome,
    "create-wallet": renderCreateWallet,
    "import-options": renderImportOptions,
    "import-recovery-phrase": renderImportRecoveryPhrase,
    "import-private-key": renderImportPrivateKey,
    "existing-wallet-login": renderExistingWalletLogin,
    "register-credentials": renderRegisterCredentials,
    "wallet-created": renderWalletCreated,
    "additional-wallet-created": renderAdditionalWalletCreated,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-white/10" />

      <div
        ref={modalRef}
        className="relative bg-black/95 border border-[#2C2C2C] rounded-[16px] w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl"
      >
        <div className="p-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
          {stepComponents[currentStep]?.() || renderWelcome()}
        </div>
      </div>
    </div>
  );
}
