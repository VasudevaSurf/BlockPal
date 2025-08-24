import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";

interface WalletWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onWalletCreated: () => void;
}

type Step =
  | "welcome"
  | "import-options"
  | "import-recovery-phrase"
  | "import-private-key"
  | "create-wallet"
  | "wallet-created"
  | "existing-wallet-login"
  | "register-credentials";

export default function WalletWelcomeModal({
  isOpen,
  onClose,
  userName = "User",
  onWalletCreated,
}: WalletWelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Wallet creation/import states
  const [phraseWords, setPhraseWords] = useState<string[]>(
    new Array(12).fill("")
  );
  const [phraseLength, setPhraseLength] = useState(12);
  const [privateKey, setPrivateKey] = useState("");
  const [walletName, setWalletName] = useState("");
  const [newWalletName, setNewWalletName] = useState("");

  // Generated wallet data
  const [generatedWallet, setGeneratedWallet] = useState<{
    address: string;
    privateKey: string;
    mnemonic: string;
  } | null>(null);

  // Registration states
  const [registrationData, setRegistrationData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Existing user login states
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [existingWalletData, setExistingWalletData] = useState<{
    address: string;
    privateKey: string;
    mnemonic?: string;
    username: string;
  } | null>(null);

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

  // Check if wallet exists in database
  const checkWalletExists = async (walletAddress: string) => {
    try {
      const response = await fetch("/api/wallets/check-exists", {
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
      const { ethers } = await import("ethers");
      const wallet = ethers.Wallet.createRandom();

      setGeneratedWallet({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || "",
      });

      setCurrentStep("wallet-created");
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
    setLoading(true);
    setError("");

    try {
      const { ethers } = await import("ethers");
      const wallet = ethers.Wallet.fromPhrase(recoveryPhrase);

      // Check if wallet exists
      const checkResult = await checkWalletExists(wallet.address);

      if (checkResult.exists) {
        // Wallet exists, go to login flow
        setExistingWalletData({
          address: wallet.address,
          privateKey: wallet.privateKey,
          mnemonic: recoveryPhrase,
          username: checkResult.username,
        });
        setLoginData({
          username: checkResult.username,
          password: "",
        });
        setCurrentStep("existing-wallet-login");
      } else {
        // New wallet, proceed to save it
        await saveNewWallet({
          address: wallet.address,
          privateKey: wallet.privateKey,
          mnemonic: recoveryPhrase,
          name: `Imported Wallet ${Date.now()}`,
        });
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setError(
        err.message ||
          "Failed to import wallet. Please check your recovery phrase."
      );
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

    setLoading(true);
    setError("");

    try {
      const { ethers } = await import("ethers");
      const wallet = new ethers.Wallet(privateKey.trim());

      // Check if wallet exists
      const checkResult = await checkWalletExists(wallet.address);

      if (checkResult.exists) {
        // Wallet exists, go to login flow
        setExistingWalletData({
          address: wallet.address,
          privateKey: wallet.privateKey,
          username: checkResult.username,
        });
        setLoginData({
          username: checkResult.username,
          password: "",
        });
        setCurrentStep("existing-wallet-login");
      } else {
        // New wallet, proceed to save it
        await saveNewWallet({
          address: wallet.address,
          privateKey: wallet.privateKey,
          name: walletName.trim(),
        });
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setError(
        err.message || "Failed to import wallet. Please check your private key."
      );
    } finally {
      setLoading(false);
    }
  };

  // Save new wallet (goes to registration if user doesn't exist)
  const saveNewWallet = async (walletData: {
    address: string;
    privateKey: string;
    mnemonic?: string;
    name: string;
  }) => {
    try {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletData.address,
          walletName: walletData.name,
          privateKey: walletData.privateKey,
          mnemonic: walletData.mnemonic,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || data.error?.includes("Unauthorized")) {
          // No user logged in, go to registration
          setGeneratedWallet({
            address: walletData.address,
            privateKey: walletData.privateKey,
            mnemonic: walletData.mnemonic || "",
          });
          setNewWalletName(walletData.name);
          setCurrentStep("register-credentials");
          return;
        }
        throw new Error(data.error || "Failed to save wallet");
      }

      // Success - wallet saved
      setCurrentStep("wallet-created");
      onWalletCreated();
    } catch (error: any) {
      throw error;
    }
  };

  // Handle registration for new user
  const handleRegisterUser = async () => {
    if (registrationData.password !== registrationData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!registrationData.username.trim() || !registrationData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Register user first
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: registrationData.username,
          password: registrationData.password,
        }),
        credentials: "include",
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerData.error || "Failed to create account");
      }

      // Now save the wallet
      const walletData = generatedWallet || {
        address: existingWalletData?.address || "",
        privateKey: existingWalletData?.privateKey || "",
        mnemonic: existingWalletData?.mnemonic,
      };

      const walletResponse = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletData.address,
          walletName: newWalletName || "My Wallet",
          privateKey: walletData.privateKey,
          mnemonic: walletData.mnemonic,
        }),
        credentials: "include",
      });

      if (!walletResponse.ok) {
        const error = await walletResponse.json();
        throw new Error(error.error || "Failed to save wallet");
      }

      onWalletCreated();
      handleClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle login for existing user
  const handleExistingUserLogin = async () => {
    if (!loginData.password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Login user
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginData.username,
          password: loginData.password,
        }),
        credentials: "include",
      });

      const loginDataResult = await loginResponse.json();

      if (!loginResponse.ok) {
        if (loginDataResult.error === "2FA_REQUIRED") {
          setError(
            "2FA authentication required. Please login through the main login form."
          );
          return;
        }
        throw new Error(loginDataResult.error || "Invalid password");
      }

      // Successfully logged in
      onWalletCreated();
      handleClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle save generated wallet
  const handleSaveGeneratedWallet = async () => {
    if (!generatedWallet) return;

    await saveNewWallet({
      address: generatedWallet.address,
      privateKey: generatedWallet.privateKey,
      mnemonic: generatedWallet.mnemonic,
      name: newWalletName.trim(),
    });
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
  const renderWelcomeStep = () => (
    <div className="text-center">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white font-mayeka mb-1.5">
          Welcome to Blockpal
        </h2>
        <p className="text-gray-400 font-satoshi">
          Choose how you'd like to get started
        </p>
      </div>

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
    </div>
  );

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
            placeholder="Enter your private key"
            className="w-full h-24 px-2.5 py-2.5 border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:border-[#E2AF19] resize-none font-satoshi text-xs"
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
          placeholder="Create password"
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
            loading || !registrationData.username || !registrationData.password
          }
          className="w-full"
          size="lg"
        >
          {loading ? "Creating Account..." : "Complete Setup"}
        </Button>
      </div>

      <div className="mt-4 p-2.5 bg-green-900/20 border border-green-500/50 rounded-lg">
        <p className="text-green-400 text-xs font-satoshi">
          Your wallet will be saved securely after account creation.
        </p>
      </div>
    </div>
  );

  const renderWalletCreated = () => (
    <div className="text-center">
      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
        <CheckCircle size={24} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-white font-mayeka mb-1.5">
        Welcome to Blockpal!
      </h2>
      <p className="text-gray-400 font-satoshi mb-4">
        Your wallet has been successfully set up and is ready to use.
      </p>

      {generatedWallet && (
        <div className="bg-[#0F0F0F] rounded-lg p-3 mb-4 text-left">
          <h3 className="text-white font-semibold mb-2 font-satoshi">
            ⚠️ Save Your Wallet Details
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
        </div>
      )}

      {generatedWallet ? (
        <div className="space-y-2">
          <Button
            onClick={handleSaveGeneratedWallet}
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? "Saving..." : "Continue to Dashboard"}
          </Button>
          <Button
            onClick={() => setCurrentStep("create-wallet")}
            variant="secondary"
            className="w-full"
            size="lg"
          >
            Generate New Wallet
          </Button>
        </div>
      ) : (
        <Button onClick={handleClose} className="w-full" size="lg">
          Continue to Dashboard
        </Button>
      )}
    </div>
  );

  const stepComponents = {
    welcome: renderWelcomeStep,
    "create-wallet": renderCreateWallet,
    "import-options": renderImportOptions,
    "import-recovery-phrase": renderImportRecoveryPhrase,
    "import-private-key": renderImportPrivateKey,
    "existing-wallet-login": renderExistingWalletLogin,
    "register-credentials": renderRegisterCredentials,
    "wallet-created": renderWalletCreated,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-white/10" />

      <div
        ref={modalRef}
        className="relative bg-black/95 border border-[#2C2C2C] rounded-[16px] w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl"
      >
        <div className="p-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
          {stepComponents[currentStep]()}
        </div>
      </div>
    </div>
  );
}
