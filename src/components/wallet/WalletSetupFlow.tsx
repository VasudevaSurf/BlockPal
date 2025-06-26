// src/components/wallet/WalletSetupFlow.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Wallet,
  Download,
  Plus,
  AlertTriangle,
  CheckCircle,
  Copy,
} from "lucide-react";
import { AppDispatch, RootState } from "@/store";
import { createWallet, fetchWallets } from "@/store/slices/walletSlice";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ethers } from "ethers";

type SetupStep = "choice" | "import" | "import-method" | "create" | "success";

interface WalletData {
  address: string;
  privateKey: string;
  mnemonic?: string;
  name: string;
}

export default function WalletSetupFlow() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { wallets, loading } = useSelector((state: RootState) => state.wallet);
  const { user } = useSelector((state: RootState) => state.auth);

  const [currentStep, setCurrentStep] = useState<SetupStep>("choice");
  const [importMethod, setImportMethod] = useState<"privateKey" | "mnemonic">(
    "privateKey"
  );
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [formData, setFormData] = useState({
    privateKey: "",
    mnemonic: "",
    walletName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string>("");

  // Check if user already has wallets
  const hasExistingWallets = wallets.length > 0;

  const validatePrivateKey = (privateKey: string): boolean => {
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
  };

  const validateMnemonic = (mnemonic: string): boolean => {
    try {
      ethers.Mnemonic.fromPhrase(mnemonic);
      return true;
    } catch {
      return false;
    }
  };

  const handleCreateWallet = async () => {
    try {
      // Create random wallet using ethers
      const wallet = ethers.Wallet.createRandom();

      const newWalletData: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || "",
        name: formData.walletName || `Wallet ${wallets.length + 1}`,
      };

      setWalletData(newWalletData);
      setCurrentStep("success");

      // Save to database
      await dispatch(
        createWallet({
          walletAddress: newWalletData.address,
          walletName: newWalletData.name,
          privateKey: newWalletData.privateKey,
          mnemonic: newWalletData.mnemonic,
        })
      );

      // Refresh wallets list
      dispatch(fetchWallets());
    } catch (error) {
      console.error("Error creating wallet:", error);
      setErrors({ general: "Failed to create wallet. Please try again." });
    }
  };

  const handleImportWallet = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.walletName.trim()) {
      newErrors.walletName = "Wallet name is required";
    }

    if (importMethod === "privateKey") {
      if (!formData.privateKey.trim()) {
        newErrors.privateKey = "Private key is required";
      } else if (!validatePrivateKey(formData.privateKey)) {
        newErrors.privateKey = "Invalid private key format";
      }
    } else {
      if (!formData.mnemonic.trim()) {
        newErrors.mnemonic = "Recovery phrase is required";
      } else if (!validateMnemonic(formData.mnemonic)) {
        newErrors.mnemonic = "Invalid recovery phrase";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      let wallet: ethers.HDNodeWallet | ethers.Wallet;
      let mnemonic: string | undefined;

      if (importMethod === "privateKey") {
        const formattedKey = formData.privateKey.startsWith("0x")
          ? formData.privateKey
          : "0x" + formData.privateKey;
        wallet = new ethers.Wallet(formattedKey);
      } else {
        wallet = ethers.Wallet.fromPhrase(formData.mnemonic);
        mnemonic = formData.mnemonic;
      }

      const importedWalletData: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: mnemonic,
        name: formData.walletName,
      };

      setWalletData(importedWalletData);
      setCurrentStep("success");

      // Save to database
      await dispatch(
        createWallet({
          walletAddress: importedWalletData.address,
          walletName: importedWalletData.name,
          privateKey: importedWalletData.privateKey,
          mnemonic: importedWalletData.mnemonic,
        })
      );

      // Refresh wallets list
      dispatch(fetchWallets());
    } catch (error) {
      console.error("Error importing wallet:", error);
      setErrors({
        general: "Failed to import wallet. Please check your credentials.",
      });
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center">
          {currentStep !== "choice" && (
            <button
              onClick={() => {
                if (currentStep === "import-method") setCurrentStep("import");
                else if (currentStep === "import" || currentStep === "create")
                  setCurrentStep("choice");
                else if (currentStep === "success") setCurrentStep("choice");
              }}
              className="mr-4 p-2 hover:bg-[#2C2C2C] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
              {currentStep === "choice" && "Wallet Setup"}
              {currentStep === "import" && "Import Wallet"}
              {currentStep === "import-method" && "Import Method"}
              {currentStep === "create" && "Create New Wallet"}
              {currentStep === "success" && "Wallet Created Successfully"}
            </h1>
            <p className="text-gray-400 text-sm font-satoshi mt-1">
              {currentStep === "choice" && hasExistingWallets
                ? "Add another wallet to your account"
                : "Set up your first wallet to get started"}
            </p>
          </div>
        </div>

        {/* Skip button for existing users */}
        {hasExistingWallets && currentStep === "choice" && (
          <Button variant="secondary" onClick={handleSkip}>
            Skip for now
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Step 1: Choice */}
          {currentStep === "choice" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={32} className="text-black" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2 font-satoshi">
                  📱 WALLET SETUP
                </h2>
                <p className="text-gray-400 font-satoshi">
                  Choose how you'd like to set up your wallet
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setCurrentStep("import")}
                  className="w-full p-6 bg-black border border-[#2C2C2C] rounded-xl hover:border-[#E2AF19] transition-colors text-left"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                      <Download size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold font-satoshi">
                        1. Import existing wallet
                      </h3>
                      <p className="text-gray-400 text-sm font-satoshi">
                        Use your private key or recovery phrase
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentStep("create")}
                  className="w-full p-6 bg-black border border-[#2C2C2C] rounded-xl hover:border-[#E2AF19] transition-colors text-left"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                      <Plus size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold font-satoshi">
                        2. Create new wallet
                      </h3>
                      <p className="text-gray-400 text-sm font-satoshi">
                        Generate a brand new wallet
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Import Options */}
          {currentStep === "import" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-white mb-2 font-satoshi">
                  📥 IMPORT WALLET
                </h2>
                <p className="text-gray-400 font-satoshi">
                  Choose your import method
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    setImportMethod("privateKey");
                    setCurrentStep("import-method");
                  }}
                  className="w-full p-6 bg-black border border-[#2C2C2C] rounded-xl hover:border-[#E2AF19] transition-colors text-left"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-white font-bold">🔑</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold font-satoshi">
                        1. Import with Private Key
                      </h3>
                      <p className="text-gray-400 text-sm font-satoshi">
                        Use your wallet's private key
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setImportMethod("mnemonic");
                    setCurrentStep("import-method");
                  }}
                  className="w-full p-6 bg-black border border-[#2C2C2C] rounded-xl hover:border-[#E2AF19] transition-colors text-left"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-white font-bold">📝</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold font-satoshi">
                        2. Import with Recovery Phrase
                      </h3>
                      <p className="text-gray-400 text-sm font-satoshi">
                        Use your 12/24 word seed phrase
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Import Method Form */}
          {currentStep === "import-method" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-white mb-2 font-satoshi">
                  {importMethod === "privateKey"
                    ? "Import with Private Key"
                    : "Import with Recovery Phrase"}
                </h2>
              </div>

              {errors.general && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-satoshi">
                    {errors.general}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Wallet name"
                  value={formData.walletName}
                  onChange={(e) => {
                    setFormData({ ...formData, walletName: e.target.value });
                    if (errors.walletName)
                      setErrors({ ...errors, walletName: "" });
                  }}
                  error={errors.walletName}
                  className="font-satoshi"
                />

                {importMethod === "privateKey" ? (
                  <Input
                    type="password"
                    placeholder="Enter your private key"
                    value={formData.privateKey}
                    onChange={(e) => {
                      setFormData({ ...formData, privateKey: e.target.value });
                      if (errors.privateKey)
                        setErrors({ ...errors, privateKey: "" });
                    }}
                    error={errors.privateKey}
                    className="font-satoshi"
                  />
                ) : (
                  <div>
                    <textarea
                      placeholder="Enter your recovery phrase (12/24 words)"
                      value={formData.mnemonic}
                      onChange={(e) => {
                        setFormData({ ...formData, mnemonic: e.target.value });
                        if (errors.mnemonic)
                          setErrors({ ...errors, mnemonic: "" });
                      }}
                      className="w-full p-3 bg-black border border-[#2C2C2C] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi resize-none"
                      rows={3}
                    />
                    {errors.mnemonic && (
                      <p className="mt-2 text-sm text-red-500">
                        {errors.mnemonic}
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={16}
                      className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-yellow-400 text-sm font-satoshi font-medium mb-1">
                        Security Warning
                      </p>
                      <p className="text-yellow-400 text-xs font-satoshi">
                        Never share your private key or recovery phrase. Make
                        sure your credentials are 64 characters (private key) or
                        valid 12/24 words (recovery phrase).
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleImportWallet}
                  disabled={loading}
                  className="w-full font-satoshi"
                >
                  {loading ? "Importing..." : "Import Wallet"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Create Wallet Form */}
          {currentStep === "create" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-white mb-2 font-satoshi">
                  🔑 CREATING NEW WALLET
                </h2>
                <p className="text-gray-400 font-satoshi">
                  Give your new wallet a name
                </p>
              </div>

              {errors.general && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-satoshi">
                    {errors.general}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder={`Wallet ${wallets.length + 1}`}
                  value={formData.walletName}
                  onChange={(e) =>
                    setFormData({ ...formData, walletName: e.target.value })
                  }
                  className="font-satoshi"
                />

                <Button
                  onClick={handleCreateWallet}
                  disabled={loading}
                  className="w-full font-satoshi"
                >
                  {loading ? "Creating..." : "Create Wallet"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === "success" && walletData && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2 font-satoshi">
                  ✅ Wallet {walletData.mnemonic ? "created" : "imported"}{" "}
                  successfully!
                </h2>
                <p className="text-gray-400 font-satoshi">
                  Save your credentials securely
                </p>
              </div>

              <div className="space-y-4">
                {/* Wallet Address */}
                <div className="bg-black border border-[#2C2C2C] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm font-satoshi">
                      📍 Wallet Address:
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(walletData.address, "address")
                      }
                      className="text-[#E2AF19] hover:opacity-80 transition-opacity"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="text-white font-satoshi text-sm break-all">
                    {walletData.address}
                  </p>
                  {copied === "address" && (
                    <p className="text-green-400 text-xs font-satoshi mt-1">
                      Copied!
                    </p>
                  )}
                </div>

                {/* Private Key */}
                <div className="bg-black border border-[#2C2C2C] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm font-satoshi">
                      🔑 Private Key:
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(walletData.privateKey, "privateKey")
                      }
                      className="text-[#E2AF19] hover:opacity-80 transition-opacity"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="text-white font-satoshi text-sm break-all">
                    {walletData.privateKey}
                  </p>
                  {copied === "privateKey" && (
                    <p className="text-green-400 text-xs font-satoshi mt-1">
                      Copied!
                    </p>
                  )}
                </div>

                {/* Recovery Phrase (if available) */}
                {walletData.mnemonic && (
                  <div className="bg-black border border-[#2C2C2C] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm font-satoshi">
                        📝 Recovery Phrase:
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(walletData.mnemonic!, "mnemonic")
                        }
                        className="text-[#E2AF19] hover:opacity-80 transition-opacity"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <p className="text-white font-satoshi text-sm">
                      {walletData.mnemonic}
                    </p>
                    {copied === "mnemonic" && (
                      <p className="text-green-400 text-xs font-satoshi mt-1">
                        Copied!
                      </p>
                    )}
                  </div>
                )}

                {/* Security Warning */}
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={16}
                      className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-red-400 text-sm font-satoshi font-medium mb-1">
                        ⚠️ IMPORTANT: Save your credentials securely!
                      </p>
                      <p className="text-red-400 text-xs font-satoshi">
                        Store your private key and recovery phrase in a safe
                        place. You'll need them to recover your wallet.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleFinish} className="w-full font-satoshi">
                  Continue to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
