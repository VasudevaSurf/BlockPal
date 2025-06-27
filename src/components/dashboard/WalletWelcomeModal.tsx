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
  | "select-network"
  | "wallet-created";

const networks = [
  { id: "ethereum", name: "Ethereum", icon: "🔷" },
  { id: "solana", name: "Solana", icon: "🟣" },
  { id: "bitcoin", name: "Bitcoin", icon: "🟠" },
  { id: "sui", name: "SUI", icon: "🔵" },
  { id: "xrp", name: "XRP", icon: "⚫" },
  { id: "cardano", name: "Cardano", icon: "🔵" },
  { id: "avalanche", name: "Avalanche", icon: "🔴" },
  { id: "toncoin", name: "Toncoin", icon: "🔷" },
];

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

  // Network selection
  const [selectedNetwork, setSelectedNetwork] = useState("");

  if (!isOpen) return null;

  const resetModal = () => {
    setCurrentStep("welcome");
    setPhraseWords(new Array(12).fill(""));
    setPhraseLength(12);
    setPrivateKey("");
    setWalletName("");
    setSelectedNetwork("");
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
      const response = await fetch("/api/wallets/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "mnemonic",
          mnemonic: recoveryPhrase,
          name: `Wallet ${Date.now()}`,
          network: selectedNetwork || "ethereum",
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
      setError(err.message || "Failed to import wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleImportWithPrivateKey = async () => {
    if (!privateKey.trim() || !walletName.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/wallets/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "privateKey",
          privateKey: privateKey.trim(),
          name: walletName.trim(),
          network: selectedNetwork || "ethereum",
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
      setError(err.message || "Failed to import wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewWallet = async () => {
    if (!selectedNetwork) {
      setError("Please select a network");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/wallets/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${
            selectedNetwork.charAt(0).toUpperCase() + selectedNetwork.slice(1)
          } Wallet`,
          network: selectedNetwork,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create wallet");
      }

      setCurrentStep("wallet-created");
      onWalletCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create wallet");
    } finally {
      setLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-black text-2xl font-bold">B</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-mayeka mb-2">
          Welcome {userName}! 👋
        </h2>
        <p className="text-gray-400 font-satoshi">
          Select a method to add your wallet
        </p>
      </div>

      <div className="space-y-4">
        <Button
          onClick={() => setCurrentStep("select-network")}
          className="w-full"
          size="lg"
        >
          Create a new wallet
        </Button>

        <Button
          onClick={() => setCurrentStep("import-options")}
          variant="secondary"
          className="w-full"
          size="lg"
        >
          Import the existing wallet
        </Button>
      </div>
    </div>
  );

  const renderImportOptions = () => (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => setCurrentStep("welcome")}
          className="mr-3 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h2 className="text-xl font-bold text-white font-mayeka">
          Import existing wallet
        </h2>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => setCurrentStep("import-recovery-phrase")}
          className="w-full bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg p-4 hover:bg-[#1A1A1A] transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[#E2AF19] rounded-lg flex items-center justify-center mr-3">
                <Key size={20} className="text-black" />
              </div>
              <div>
                <div className="text-white font-medium font-satoshi">
                  Recovery Phrase
                </div>
                <div className="text-gray-400 text-sm font-satoshi">
                  Use your recovery phrase
                </div>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </button>

        <button
          onClick={() => setCurrentStep("import-private-key")}
          className="w-full bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg p-4 hover:bg-[#1A1A1A] transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[#E2AF19] rounded-lg flex items-center justify-center mr-3">
                <Key size={20} className="text-black" />
              </div>
              <div>
                <div className="text-white font-medium font-satoshi">
                  Private Key
                </div>
                <div className="text-gray-400 text-sm font-satoshi">
                  Use your private key
                </div>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
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
        <h2 className="text-xl font-bold text-white font-mayeka">
          Import wallet using recovery phrase
        </h2>
      </div>

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2 font-mayeka">
          Enter Your Recovery Phrase
        </h3>
        <p className="text-gray-400 text-sm font-satoshi">
          Typically 12 (sometimes 18, 24) words.
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          {[12, 18, 24].map((length) => (
            <button
              key={length}
              onClick={() => handlePhraseLength(length)}
              className={`px-4 py-2 rounded-lg font-satoshi transition-colors ${
                phraseLength === length
                  ? "bg-[#E2AF19] text-black"
                  : "bg-[#2C2C2C] text-gray-400 hover:text-white"
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

      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: phraseLength }).map((_, index) => (
          <div key={index} className="relative">
            <input
              type="text"
              placeholder={`${index + 1}.`}
              value={phraseWords[index] || ""}
              onChange={(e) => handlePhraseWordChange(index, e.target.value)}
              className="w-full px-3 py-3 bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E2AF19] font-satoshi"
            />
            <span className="absolute left-2 top-1 text-xs text-gray-500">
              {index + 1}.
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={handleImportWithRecovery}
        disabled={
          loading || phraseWords.filter((w) => w.trim()).length !== phraseLength
        }
        className="w-full"
        size="lg"
      >
        {loading ? "Importing..." : "Import"}
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
        <h2 className="text-xl font-bold text-white font-mayeka">
          Import wallet using private key
        </h2>
      </div>

      <div className="space-y-4">
        <Input
          label="Wallet name"
          placeholder="Enter wallet name"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Private key
          </label>
          <div className="relative">
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Enter your private key"
              className="w-full h-32 px-3 py-3 pr-16 bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:border-[#E2AF19] resize-none font-satoshi"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setPrivateKey(text);
                } catch (err) {
                  setError("Failed to paste from clipboard");
                }
              }}
              className="absolute bottom-3 right-3 bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg text-sm font-satoshi hover:bg-[#D4A853] transition-colors"
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

  const renderSelectNetwork = () => (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => setCurrentStep("welcome")}
          className="mr-3 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h2 className="text-xl font-bold text-white font-mayeka">
          Select network
        </h2>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search network"
          className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi"
        />
      </div>

      <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
        {networks.map((network) => (
          <button
            key={network.id}
            onClick={() => setSelectedNetwork(network.id)}
            className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
              selectedNetwork === network.id
                ? "bg-[#E2AF19] text-black"
                : "bg-[#0F0F0F] border border-[#2C2C2C] text-white hover:bg-[#1A1A1A]"
            }`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">{network.icon}</span>
              <span className="font-satoshi font-medium">{network.name}</span>
            </div>
            <ChevronRight
              size={20}
              className={
                selectedNetwork === network.id ? "text-black" : "text-gray-400"
              }
            />
          </button>
        ))}
      </div>

      <Button
        onClick={handleCreateNewWallet}
        disabled={loading || !selectedNetwork}
        className="w-full"
        size="lg"
      >
        {loading ? "Creating..." : "Create Wallet"}
      </Button>

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

      <Button onClick={handleClose} className="w-full" size="lg">
        Start Using Blockpal
      </Button>
    </div>
  );

  const stepComponents = {
    welcome: renderWelcomeStep,
    "import-options": renderImportOptions,
    "import-recovery-phrase": renderImportRecoveryPhrase,
    "import-private-key": renderImportPrivateKey,
    "select-network": renderSelectNetwork,
    "wallet-created": renderWalletCreated,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        {currentStep !== "welcome" && currentStep !== "wallet-created" && (
          <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
            <div className="w-6" />
            <div className="text-center">
              <div className="w-8 h-8 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto">
                <span className="text-black text-lg font-bold">B</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {stepComponents[currentStep]()}
        </div>
      </div>
    </div>
  );
}
