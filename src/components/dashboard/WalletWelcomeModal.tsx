import React, { useState } from "react";
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
  | "wallet-created";

export default function WalletWelcomeModal({
  isOpen,
  onClose,
  userName = "User",
  onWalletCreated,
}: WalletWelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Recovery phrase states
  const [phraseWords, setPhraseWords] = useState<string[]>(
    new Array(12).fill("")
  );
  const [phraseLength, setPhraseLength] = useState(12);

  // Private key states
  const [privateKey, setPrivateKey] = useState("");
  const [walletName, setWalletName] = useState("");

  // New wallet creation states
  const [newWalletName, setNewWalletName] = useState("");
  const [generatedWallet, setGeneratedWallet] = useState<{
    address: string;
    privateKey: string;
    mnemonic: string;
  } | null>(null);

  if (!isOpen) return null;

  const resetModal = () => {
    setCurrentStep("welcome");
    setPhraseWords(new Array(12).fill(""));
    setPhraseLength(12);
    setPrivateKey("");
    setWalletName("");
    setNewWalletName("");
    setGeneratedWallet(null);
    setError("");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

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

  // Generate a new wallet using ethers.js (client-side)
  const generateNewWallet = async () => {
    if (!newWalletName.trim()) {
      setError("Please enter a wallet name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Import ethers dynamically
      const { ethers } = await import("ethers");

      // Generate a random wallet
      const wallet = ethers.Wallet.createRandom();

      setGeneratedWallet({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || "",
      });

      // Continue to wallet creation step for confirmation
      setCurrentStep("wallet-created");
    } catch (err: any) {
      console.error("Wallet generation error:", err);
      setError("Failed to generate wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Import wallet using recovery phrase
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
      // Import ethers dynamically
      const { ethers } = await import("ethers");

      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(recoveryPhrase);

      // Use the existing /api/wallets endpoint
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: wallet.address,
          walletName: `Imported Wallet ${Date.now()}`,
          privateKey: wallet.privateKey,
          mnemonic: recoveryPhrase,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import wallet");
      }

      setCurrentStep("wallet-created");
      onWalletCreated();
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

  // Import wallet using private key
  const handleImportWithPrivateKey = async () => {
    if (!privateKey.trim() || !walletName.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Import ethers dynamically
      const { ethers } = await import("ethers");

      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey.trim());

      // Use the existing /api/wallets endpoint
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: wallet.address,
          walletName: walletName.trim(),
          privateKey: wallet.privateKey,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import wallet");
      }

      setCurrentStep("wallet-created");
      onWalletCreated();
    } catch (err: any) {
      console.error("Import error:", err);
      setError(
        err.message || "Failed to import wallet. Please check your private key."
      );
    } finally {
      setLoading(false);
    }
  };

  // Save the generated wallet to database
  const handleSaveGeneratedWallet = async () => {
    if (!generatedWallet) return;

    setLoading(true);
    setError("");

    try {
      // Use the existing /api/wallets endpoint
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: generatedWallet.address,
          walletName: newWalletName.trim(),
          privateKey: generatedWallet.privateKey,
          mnemonic: generatedWallet.mnemonic,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save wallet");
      }

      onWalletCreated();
      handleClose();
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save wallet");
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white font-mayeka mb-2">
          Welcome {userName}
        </h2>
        <p className="text-gray-400 font-satoshi">
          Select a method to add your wallet
        </p>
      </div>

      <div className="space-y-4">
        <Button
          onClick={() => setCurrentStep("create-wallet")}
          variant="secondary"
          className="w-full flex items-center justify-center"
          size="lg"
        >
          <div className="w-6 h-6 border border-white rounded-full flex items-center justify-center mr-2">
            <Plus size={14} className="text-white" />
          </div>
          Create a new wallet
        </Button>
        <Button
          onClick={() => setCurrentStep("import-options")}
          className="w-full flex items-center justify-center"
          size="lg"
        >
          <Download size={20} className="mr-2" />
          Import existing wallet
        </Button>
      </div>
    </div>
  );

  const renderCreateWallet = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentStep("welcome")}
          className="mr-3 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h2 className="text-xl font-bold text-white font-mayeka">
          Create new wallet
        </h2>
        <div className="w-8"></div>
      </div>

      <div className="space-y-4">
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
        <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  const renderImportOptions = () => (
    <div>
      <div className="flex items-center justify-between mb-8 px-4 py-0">
        <button
          onClick={() => setCurrentStep("welcome")}
          className="p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h2 className="text-xl font-bold text-white font-satoshi">
          Import existing wallet
        </h2>
        <div className="w-8"></div>
      </div>

      <div className="grid grid-cols-2 gap-6 px-0">
        <button
          onClick={() => setCurrentStep("import-recovery-phrase")}
          className="flex flex-col items-center p-6 bg-[#0F0F0F] rounded-xl hover:bg-[#1A1A1A] transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-[#4B3A08] rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 25 24"
              fill="none"
            >
              <path
                d="M15.75 2.5V4C15.75 5.41421 15.75 6.12132 16.1893 6.56066C16.6287 7 17.3358 7 18.75 7H20.25"
                stroke="#E2AF19"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.75 16V8C4.75 5.17157 4.75 3.75736 5.62868 2.87868C6.50736 2 7.92157 2 10.75 2H14.9216C15.3303 2 15.5347 2 15.7185 2.07612C15.9022 2.15224 16.0468 2.29676 16.3358 2.58579L20.1642 6.41421C20.4532 6.70324 20.5978 6.84776 20.6739 7.03153C20.75 7.2153 20.75 7.41968 20.75 7.82843V16C20.75 18.8284 20.75 20.2426 19.8713 21.1213C18.9926 22 17.5784 22 14.75 22H10.75C7.92157 22 6.50736 22 5.62868 21.1213C4.75 20.2426 4.75 18.8284 4.75 16Z"
                stroke="#E2AF19"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.75 11H16.75M8.75 14H16.75M8.75 17H12.9208"
                stroke="#E2AF19"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-white font-medium font-satoshi text-center">
            Recovery Phrase
          </div>
        </button>

        <button
          onClick={() => setCurrentStep("import-private-key")}
          className="flex flex-col items-center p-6 bg-[#0F0F0F] rounded-xl hover:bg-[#1A1A1A] transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-[#4B3A08] rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Download size={16} className="text-[#E2AF19]" />
          </div>
          <div className="text-white font-medium font-satoshi text-center">
            Private Key
          </div>
        </button>
      </div>
    </div>
  );

  const renderImportRecoveryPhrase = () => (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => setCurrentStep("import-options")}
          className="mr-3 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h2 className="text-xl font-bold text-white font-satoshi text-center flex-1">
          Import with recovery phrase
        </h2>
        <div className="w-10"></div>
      </div>

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2 font-mayeka">
          Enter Your Recovery Phrase
        </h3>
        <p className="text-gray-400 text-sm font-satoshi">
          Typically 12 (sometimes 18, 24) words.
        </p>
      </div>

      {/* Unified container with background for controls and input grid */}
      <div className="bg-[#0F0F0F] rounded-lg p-4 mb-6">
        {/* Controls section */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex bg-[#2C2C2C] rounded-lg p-1 space-x-1">
            {[12, 18, 24].map((length) => (
              <button
                key={length}
                onClick={() => handlePhraseLength(length)}
                className={`px-3 py-1.5 rounded-md font-satoshi text-sm transition-colors ${
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
            className="bg-[#2C2C2C] text-white px-4 py-2 rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
          >
            Paste
          </button>
        </div>

        {/* Input grid */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: phraseLength }).map((_, index) => (
            <div key={index} className="relative">
              <input
                type="text"
                placeholder=""
                value={phraseWords[index] || ""}
                onChange={(e) => handlePhraseWordChange(index, e.target.value)}
                className="w-full px-3 py-3 pl-8 bg-black border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E2AF19] font-satoshi"
              />
              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-satoshi">
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
        <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  const renderImportPrivateKey = () => (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => setCurrentStep("import-options")}
          className="mr-3 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h2 className="text-xl font-bold text-white font-satoshi text-center flex-1">
          Import with private key
        </h2>
        <div className="w-10"></div>
      </div>

      <div className="space-y-4">
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
            className="w-full h-32 px-3 py-3 border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:border-[#E2AF19] resize-none font-satoshi"
            style={{ fontSize: "16px" }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setPrivateKey(text);
                } catch (err) {
                  setError("Failed to paste from clipboard");
                }
              }}
              className="bg-[#2C2C2C] text-white px-3 py-1.5 rounded-lg text-sm font-satoshi hover:bg-[#3C3C3C] transition-colors"
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
        <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm font-satoshi">{error}</p>
        </div>
      )}
    </div>
  );

  const renderWalletCreated = () => (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-white text-2xl">✓</span>
      </div>
      <h2 className="text-2xl font-bold text-white font-mayeka mb-2">
        Wallet Setup Complete! 🎉
      </h2>
      <p className="text-gray-400 font-satoshi mb-6">
        Your wallet has been successfully set up and is ready to use.
      </p>

      {/* Show generated wallet details if this was a new wallet */}
      {generatedWallet && (
        <div className="bg-[#0F0F0F] rounded-lg p-4 mb-6 text-left">
          <h3 className="text-white font-semibold mb-3 font-satoshi">
            ⚠️ Save Your Wallet Details
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-gray-400 font-satoshi">Address:</label>
              <div className="text-white font-mono text-xs mt-1 break-all">
                {generatedWallet.address}
              </div>
            </div>
            <div>
              <label className="text-gray-400 font-satoshi">Private Key:</label>
              <div className="text-white font-mono text-xs mt-1 break-all">
                {generatedWallet.privateKey}
              </div>
            </div>
            {generatedWallet.mnemonic && (
              <div>
                <label className="text-gray-400 font-satoshi">
                  Recovery Phrase:
                </label>
                <div className="text-white font-mono text-xs mt-1 break-all">
                  {generatedWallet.mnemonic}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-400 text-xs font-satoshi">
              ⚠️ Save these details in a secure place. You'll need them to
              recover your wallet.
            </p>
          </div>
        </div>
      )}

      {generatedWallet ? (
        <div className="space-y-3">
          <Button
            onClick={handleSaveGeneratedWallet}
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save & Continue"}
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
          Start Using Blockpal
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
    "wallet-created": renderWalletCreated,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* UPDATED: Subtle whitish fade overlay with visible dashboard background */}
      <div className="absolute inset-0 bg-white/10" />

      <div className="relative bg-black/95 border border-[#2C2C2C] rounded-[20px] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {stepComponents[currentStep]()}
        </div>
      </div>
    </div>
  );
}
