// src/components/transfer/SimpleTransferModal.tsx - UPDATED WITH USERNAME SEARCH
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  X,
  ArrowDown,
  Send,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import UsernameInput from "@/components/ui/UsernameInput";
import { UserSuggestion } from "@/hooks/useUsernameSearch";

interface SimpleTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenInfo: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
    balance: string;
    priceData?: {
      current_price?: number;
      image?: string;
    };
  };
  walletAddress: string;
  onTransactionComplete?: () => void;
}

interface TransferPreview {
  network: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenPrice?: number;
  valueUSD?: string;
  gasEstimation: {
    gasPrice: string;
    estimatedGas: string;
    gasCostETH: string;
    gasCostUSD: string;
  };
}

interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
  actualCostETH?: string;
  actualCostUSD?: string;
}

export default function SimpleTransferModal({
  isOpen,
  onClose,
  tokenInfo,
  walletAddress,
  onTransactionComplete,
}: SimpleTransferModalProps) {
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [step, setStep] = useState<
    "form" | "preview" | "processing" | "success" | "error"
  >("form");
  const [formData, setFormData] = useState({
    recipientAddress: "",
    amount: "",
  });
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [transactionResult, setTransactionResult] =
    useState<TransactionResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState("");

  // NEW: Selected user state for username input
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setFormData({ recipientAddress: "", amount: "" });
      setSelectedUser(null); // NEW: Reset selected user
      setPreview(null);
      setTransactionResult(null);
      setErrors({});
      setIsLoading(false);
      setCopied("");
    }
  }, [isOpen]);

  // NEW: Handle username/address input change
  const handleRecipientChange = (
    value: string,
    suggestion?: UserSuggestion
  ) => {
    setFormData({ ...formData, recipientAddress: value });

    if (suggestion) {
      setSelectedUser(suggestion);
      console.log("✅ User selected for simple transfer:", suggestion);
    } else {
      setSelectedUser(null);
    }

    // Clear error when user types
    if (errors.recipientAddress) {
      setErrors({ ...errors, recipientAddress: "" });
    }
  };

  // NEW: Handle user selection from dropdown
  const handleUserSelect = (user: UserSuggestion) => {
    setSelectedUser(user);
    setFormData({ ...formData, recipientAddress: user.walletAddress });
    console.log("✅ User selected from dropdown:", user);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // NEW: Enhanced validation for username/address
    if (!formData.recipientAddress.trim()) {
      newErrors.recipientAddress = "Recipient address is required";
    } else if (selectedUser) {
      // User selected from dropdown - use their wallet address
      if (
        !selectedUser.walletAddress ||
        !/^0x[a-fA-F0-9]{40}$/.test(selectedUser.walletAddress)
      ) {
        newErrors.recipientAddress =
          "Selected user has an invalid wallet address";
      } else if (
        selectedUser.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      ) {
        newErrors.recipientAddress = "Cannot send to yourself";
      }
    } else {
      // Direct address input - validate format
      if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipientAddress)) {
        newErrors.recipientAddress =
          "Invalid recipient address format. Please enter a valid address or select a user";
      } else if (
        formData.recipientAddress.toLowerCase() === walletAddress.toLowerCase()
      ) {
        newErrors.recipientAddress = "Cannot send to yourself";
      }
    }

    // Validate amount
    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = "Invalid amount";
      } else if (amount > parseFloat(tokenInfo.balance)) {
        newErrors.amount = `Insufficient balance. Available: ${tokenInfo.balance} ${tokenInfo.symbol}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreatePreview = async () => {
    console.log("📊 Creating transfer preview...");

    if (!validateForm()) {
      console.log("❌ Form validation failed");
      return;
    }

    // Validate required parameters
    if (!walletAddress) {
      setErrors({ general: "Wallet address not available" });
      return;
    }

    if (!activeWallet?.address) {
      setErrors({ general: "No active wallet found" });
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      // NEW: Use selected user's wallet address if available, otherwise use direct input
      const recipientAddress = selectedUser
        ? selectedUser.walletAddress
        : formData.recipientAddress;

      console.log("📡 Sending preview request with:", {
        tokenInfo,
        recipientAddress: recipientAddress,
        selectedUser: selectedUser
          ? `@${selectedUser.username}`
          : "Direct address",
        amount: formData.amount,
        fromAddress: walletAddress,
        tokenPrice: tokenInfo.priceData?.current_price,
      });

      const response = await fetch("/api/transfer/simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "preview",
          tokenInfo: {
            ...tokenInfo,
            isETH:
              tokenInfo.contractAddress === "native" ||
              tokenInfo.symbol === "ETH",
          },
          recipientAddress: recipientAddress,
          amount: formData.amount,
          fromAddress: walletAddress,
          tokenPrice: tokenInfo.priceData?.current_price,
        }),
        credentials: "include",
      });

      console.log("📡 Preview response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Preview response error:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📡 Preview response data:", data);

      if (!data.success) {
        throw new Error(data.error || "Failed to create preview");
      }

      setPreview(data.preview);
      setStep("preview");
      console.log("✅ Preview created successfully");
    } catch (error: any) {
      console.error("❌ Preview creation error:", error);
      setErrors({
        general: error.message || "Failed to create transfer preview",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteTransfer = async () => {
    console.log("🚀 Executing transfer...");

    if (!preview || !activeWallet) {
      setErrors({ general: "Missing preview or wallet information" });
      return;
    }

    // Validate required parameters
    if (!walletAddress) {
      setErrors({ general: "Wallet address not available" });
      return;
    }

    setStep("processing");
    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      // NEW: Use selected user's wallet address if available
      const recipientAddress = selectedUser
        ? selectedUser.walletAddress
        : formData.recipientAddress;

      console.log("📡 Sending execution request with:", {
        tokenInfo,
        recipientAddress: recipientAddress,
        selectedUser: selectedUser
          ? `@${selectedUser.username}`
          : "Direct address",
        amount: formData.amount,
        fromAddress: walletAddress,
        tokenPrice: tokenInfo.priceData?.current_price,
      });

      const response = await fetch("/api/transfer/simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "execute",
          tokenInfo: {
            ...tokenInfo,
            isETH:
              tokenInfo.contractAddress === "native" ||
              tokenInfo.symbol === "ETH",
          },
          recipientAddress: recipientAddress,
          amount: formData.amount,
          fromAddress: walletAddress,
          tokenPrice: tokenInfo.priceData?.current_price,
          useStoredKey: true, // Use stored private key
        }),
        credentials: "include",
      });

      console.log("📡 Execution response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Execution response error:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📡 Execution response data:", data);

      if (!data.success) {
        throw new Error(data.error || "Transfer execution failed");
      }

      setTransactionResult(data.result);
      setStep("success");
      console.log("✅ Transfer executed successfully");

      // Call the completion callback if provided
      if (onTransactionComplete) {
        onTransactionComplete();
      }
    } catch (error: any) {
      console.error("❌ Transfer execution error:", error);
      setTransactionResult({
        success: false,
        error: error.message || "Transaction failed. Please try again.",
      });
      setStep("error");
    } finally {
      setIsLoading(false);
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

  const handleClose = () => {
    setStep("form");
    onClose();
  };

  const getTokenIcon = (symbol: string) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
      USDC: "bg-blue-600",
      LINK: "bg-blue-700",
      DAI: "bg-yellow-500",
      UNI: "bg-pink-500",
    };
    return colors[symbol] || "bg-gray-500";
  };

  const getTokenLetter = (symbol: string) => {
    const letters: Record<string, string> = {
      ETH: "Ξ",
      USDC: "$",
      LINK: "⛓",
      DAI: "◈",
      UNI: "🦄",
    };
    return letters[symbol] || symbol.charAt(0);
  };

  // NEW: Helper function to get recipient display info
  const getRecipientDisplayInfo = () => {
    if (selectedUser) {
      return {
        name: `@${selectedUser.username}`,
        displayName: selectedUser.displayName || selectedUser.username,
        address: selectedUser.walletAddress,
        isUser: true,
      };
    } else {
      return {
        name: formData.recipientAddress
          ? `${formData.recipientAddress.slice(
              0,
              10
            )}...${formData.recipientAddress.slice(-6)}`
          : "",
        displayName: null,
        address: formData.recipientAddress,
        isUser: false,
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <div>
            <h2 className="text-xl font-bold text-white font-mayeka">
              {step === "form" && "Send Token"}
              {step === "preview" && "Transfer Preview"}
              {step === "processing" && "Processing Transfer"}
              {step === "success" && "Transfer Successful"}
              {step === "error" && "Transfer Failed"}
            </h2>
            <p className="text-gray-400 text-sm font-satoshi mt-1">
              {step === "form" && `Send ${tokenInfo.symbol} to another wallet`}
              {step === "preview" && "Review your transfer details"}
              {step === "processing" &&
                "Please wait while we process your transfer"}
              {step === "success" && "Your transfer has been completed"}
              {step === "error" && "Something went wrong"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Form Step */}
          {step === "form" && (
            <div className="space-y-6">
              {/* Token Info */}
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <div className="flex items-center mb-3">
                  {tokenInfo.priceData?.image ? (
                    <img
                      src={tokenInfo.priceData.image}
                      alt={tokenInfo.symbol}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 ${getTokenIcon(
                        tokenInfo.symbol
                      )} rounded-full mr-3 flex items-center justify-center`}
                    >
                      <span className="text-white text-lg font-bold">
                        {getTokenLetter(tokenInfo.symbol)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-semibold font-satoshi">
                      {tokenInfo.name}
                    </h3>
                    <p className="text-gray-400 text-sm font-satoshi">
                      Balance: {parseFloat(tokenInfo.balance).toFixed(6)}{" "}
                      {tokenInfo.symbol}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* NEW: Username/Address Input */}
                <div>
                  <UsernameInput
                    value={formData.recipientAddress}
                    onChange={handleRecipientChange}
                    onUserSelect={handleUserSelect}
                    placeholder="@username or 0x... address"
                    error={errors.recipientAddress}
                    className="font-satoshi"
                  />
                </div>

                <Input
                  type="text"
                  placeholder={`Amount in ${tokenInfo.symbol}`}
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value });
                    if (errors.amount) {
                      setErrors({ ...errors, amount: "" });
                    }
                  }}
                  error={errors.amount}
                  className="font-satoshi"
                />

                <button
                  onClick={() =>
                    setFormData({ ...formData, amount: tokenInfo.balance })
                  }
                  className="text-[#E2AF19] text-sm font-satoshi hover:opacity-80 transition-opacity"
                >
                  Use Max Balance
                </button>
              </div>

              {errors.general && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-satoshi">
                    {errors.general}
                  </p>
                </div>
              )}

              {/* Info Note */}
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle
                    size={16}
                    className="text-blue-400 mr-2 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-blue-400 text-sm font-satoshi font-medium mb-1">
                      Mainnet Transfer
                    </p>
                    <p className="text-blue-400 text-xs font-satoshi">
                      This is a real mainnet transaction. Please verify all
                      details before proceeding. Current balance:{" "}
                      {parseFloat(tokenInfo.balance).toFixed(6)}{" "}
                      {tokenInfo.symbol}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreatePreview}
                disabled={isLoading || !walletAddress}
                className="w-full font-satoshi"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                    Creating Preview...
                  </>
                ) : (
                  "Review Transfer"
                )}
              </Button>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && preview && (
            <div className="space-y-6">
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <h3 className="text-white font-semibold font-satoshi mb-4">
                  Transfer Details
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-white">{preview.network}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token:</span>
                    <span className="text-white">
                      {preview.tokenName} ({preview.tokenSymbol})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white">
                      {preview.fromAddress.slice(0, 8)}...
                      {preview.fromAddress.slice(-6)}
                    </span>
                  </div>
                  {/* NEW: Enhanced recipient display */}
                  <div className="flex justify-between">
                    <span className="text-gray-400">To:</span>
                    <div className="text-right">
                      {selectedUser ? (
                        <div>
                          <span className="text-green-400 font-medium">
                            @{selectedUser.username}
                          </span>
                          {selectedUser.displayName && (
                            <div className="text-gray-400 text-xs">
                              {selectedUser.displayName}
                            </div>
                          )}
                          <div className="text-white text-xs">
                            {selectedUser.walletAddress.slice(0, 8)}...
                            {selectedUser.walletAddress.slice(-6)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-white">
                          {preview.toAddress.slice(0, 8)}...
                          {preview.toAddress.slice(-6)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white">
                      {preview.amount} {preview.tokenSymbol}
                    </span>
                  </div>
                  {preview.valueUSD && preview.valueUSD !== "Not available" && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Value:</span>
                      <span className="text-white">{preview.valueUSD}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. Gas:</span>
                    <span className="text-white">
                      {preview.gasEstimation.estimatedGas} gas
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Cost:</span>
                    <span className="text-white">
                      {preview.gasEstimation.gasCostETH} ETH (≈
                      {preview.gasEstimation.gasCostUSD})
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle
                    size={16}
                    className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-yellow-400 text-sm font-satoshi">
                    This is a real mainnet transaction with actual value. Please
                    verify all details before proceeding.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setStep("form")}
                  className="flex-1 font-satoshi"
                >
                  Back
                </Button>
                <Button
                  onClick={handleExecuteTransfer}
                  disabled={isLoading}
                  className="flex-1 font-satoshi"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Send Transfer"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <RefreshCw size={32} className="text-black animate-spin" />
              </div>
              <h3 className="text-white text-lg font-semibold font-satoshi mb-2">
                Processing Transaction
              </h3>
              <p className="text-gray-400 font-satoshi">
                Please wait while your transfer is being processed on the
                blockchain...
              </p>
              <div className="mt-4 text-xs text-gray-500 font-satoshi">
                This may take a few moments. Do not close this window.
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && transactionResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h3 className="text-white text-lg font-semibold font-satoshi mb-2">
                  Transfer Successful!
                </h3>
                <p className="text-gray-400 font-satoshi">
                  Your transfer has been completed successfully
                </p>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <h4 className="text-white font-semibold font-satoshi mb-3">
                  Transaction Details
                </h4>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Transaction Hash:</span>
                    <div className="flex items-center">
                      <span className="text-white mr-2">
                        {transactionResult.transactionHash?.slice(0, 8)}...
                        {transactionResult.transactionHash?.slice(-6)}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            transactionResult.transactionHash!,
                            "hash"
                          )
                        }
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  {transactionResult.gasUsed && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gas Used:</span>
                      <span className="text-white">
                        {transactionResult.gasUsed?.toLocaleString()} gas
                      </span>
                    </div>
                  )}
                  {transactionResult.blockNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Block Number:</span>
                      <span className="text-white">
                        {transactionResult.blockNumber?.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {transactionResult.actualCostETH && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Actual Cost:</span>
                      <span className="text-white">
                        {transactionResult.actualCostETH} ETH
                        {transactionResult.actualCostUSD &&
                          ` (${transactionResult.actualCostUSD})`}
                      </span>
                    </div>
                  )}
                </div>

                {copied === "hash" && (
                  <p className="text-green-400 text-xs font-satoshi mt-2">
                    Hash copied!
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                {transactionResult.explorerUrl && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      window.open(transactionResult.explorerUrl, "_blank")
                    }
                    className="flex-1 font-satoshi"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    View on Explorer
                  </Button>
                )}
                <Button onClick={handleClose} className="flex-1 font-satoshi">
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && transactionResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={32} className="text-white" />
                </div>
                <h3 className="text-white text-lg font-semibold font-satoshi mb-2">
                  Transfer Failed
                </h3>
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-left">
                  <p className="text-red-400 text-sm font-satoshi">
                    {transactionResult.error}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setStep("form")}
                  className="flex-1 font-satoshi"
                >
                  Try Again
                </Button>
                <Button onClick={handleClose} className="flex-1 font-satoshi">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
