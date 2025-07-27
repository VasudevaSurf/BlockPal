// src/components/transfer/SimpleTransferModal.tsx - ENHANCED ERROR HANDLING
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  X,
  ArrowLeft,
  Send,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  User,
  Contact,
  AlertCircle,
  Wifi,
  Clock,
  DollarSign,
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
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    congestionLevel: string;
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

interface ApiError {
  success: false;
  error: string;
  errorType: string;
  details?: string;
  timestamp?: string;
}

// Custom Profile Icon Component
const ProfileIcon = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="19"
    viewBox="0 0 30 31"
    fill="none"
    className={className}
  >
    <path
      d="M21 12.5C21 14.0913 20.3679 15.6174 19.2426 16.7426C18.1174 17.8679 16.5913 18.5 15 18.5C13.4087 18.5 11.8826 17.8679 10.7574 16.7426C9.63214 15.6174 9 14.0913 9 12.5C9 10.9087 9.63214 9.38258 10.7574 8.25736C11.8826 7.13214 13.4087 6.5 15 6.5C16.5913 6.5 18.1174 7.13214 19.2426 8.25736C20.3679 9.38258 21 10.9087 21 12.5Z"
      fill="#6E6E6E"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.388 30.488C6.38775 30.167 0 23.579 0 15.5C0 7.2155 6.7155 0.5 15 0.5C23.2845 0.5 30 7.2155 30 15.5C30 23.7845 23.2845 30.5 15 30.5H14.7945C14.6585 30.5 14.523 30.496 14.388 30.488ZM5.3745 24.965C5.26235 24.6429 5.22417 24.2997 5.26281 23.9609C5.30145 23.622 5.4159 23.2963 5.59768 23.0077C5.77946 22.7191 6.0239 22.4752 6.31284 22.2941C6.60179 22.1129 6.92782 21.9992 7.26675 21.9613C13.1138 21.314 16.9222 21.3725 22.7407 21.9748C23.0801 22.0101 23.407 22.1224 23.6964 22.3032C23.9858 22.4839 24.2301 22.7283 24.4108 23.0178C24.5915 23.3072 24.7037 23.6341 24.739 23.9735C24.7742 24.3129 24.7316 24.6558 24.6143 24.9762C27.1081 22.4533 28.5046 19.0475 28.5 15.5C28.5 8.04425 22.4557 2 15 2C7.54425 2 1.5 8.04425 1.5 15.5C1.5 19.187 2.97825 22.529 5.3745 24.965Z"
      fill="#6E6E6E"
    />
  </svg>
);

// Enhanced Error Display Component
const ErrorDisplay = ({
  error,
  onRetry,
  onClose,
}: {
  error: ApiError | { message: string; type?: string };
  onRetry?: () => void;
  onClose?: () => void;
}) => {
  const errorInfo =
    "errorType" in error
      ? error
      : { error: error.message, errorType: error.type || "unknown" };

  const getErrorIcon = () => {
    switch (errorInfo.errorType) {
      case "insufficient_balance":
      case "insufficient_funds":
        return <DollarSign size={20} className="text-yellow-400" />;
      case "network_error":
      case "timeout_error":
        return <Wifi size={20} className="text-blue-400" />;
      case "gas_error":
      case "gas_estimation_error":
        return <Clock size={20} className="text-orange-400" />;
      case "invalid_address":
      case "invalid_amount":
        return <AlertTriangle size={20} className="text-red-400" />;
      default:
        return <AlertCircle size={20} className="text-red-400" />;
    }
  };

  const getErrorColor = () => {
    switch (errorInfo.errorType) {
      case "insufficient_balance":
      case "insufficient_funds":
        return "border-yellow-500/50 bg-yellow-900/20";
      case "network_error":
      case "timeout_error":
        return "border-blue-500/50 bg-blue-900/20";
      case "gas_error":
      case "gas_estimation_error":
        return "border-orange-500/50 bg-orange-900/20";
      default:
        return "border-red-500/50 bg-red-900/20";
    }
  };

  const getErrorTitle = () => {
    switch (errorInfo.errorType) {
      case "insufficient_balance":
      case "insufficient_funds":
        return "Insufficient Balance";
      case "network_error":
      case "timeout_error":
        return "Connection Issue";
      case "gas_error":
      case "gas_estimation_error":
        return "Network Fee Issue";
      case "invalid_address":
        return "Invalid Address";
      case "invalid_amount":
        return "Invalid Amount";
      default:
        return "Transaction Error";
    }
  };

  const getActionButtons = () => {
    switch (errorInfo.errorType) {
      case "network_error":
      case "timeout_error":
      case "gas_estimation_error":
        return (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 bg-[#E2AF19] text-black font-semibold py-2 px-3 rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi text-sm"
              >
                Try Again
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 bg-[#2C2C2C] text-white rounded-lg hover:bg-[#3C3C3C] transition-colors font-satoshi text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        );
      case "insufficient_balance":
      case "insufficient_funds":
        return (
          <div className="mt-3">
            {onClose && (
              <button
                onClick={onClose}
                className="w-full bg-[#2C2C2C] text-white font-semibold py-2 rounded-lg hover:bg-[#3C3C3C] transition-colors font-satoshi text-sm"
              >
                Close
              </button>
            )}
          </div>
        );
      default:
        return (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 bg-[#E2AF19] text-black font-semibold py-2 px-3 rounded-lg hover:bg-[#D4A853] transition-colors font-satoshi text-sm"
              >
                Try Again
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 bg-[#2C2C2C] text-white rounded-lg hover:bg-[#3C3C3C] transition-colors font-satoshi text-sm"
              >
                Close
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getErrorColor()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getErrorIcon()}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold font-satoshi text-sm mb-1">
            {getErrorTitle()}
          </h4>
          <p className="text-gray-300 text-xs font-satoshi leading-relaxed mb-1">
            {errorInfo.error}
          </p>
          {errorInfo.details && (
            <p className="text-gray-400 text-xs font-satoshi leading-relaxed">
              {errorInfo.details}
            </p>
          )}
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
};

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
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState("");

  // Selected user state for username input
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);

  // Percentage buttons state
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(
    null
  );

  // Gas estimation state
  const [gasEstimation, setGasEstimation] = useState<{
    gasCostUSD: string;
    gasCostETH: string;
    estimatedGas: string;
  } | null>(null);
  const [gasLoading, setGasLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setFormData({ recipientAddress: "", amount: "" });
      setSelectedUser(null);
      setPreview(null);
      setTransactionResult(null);
      setErrors({});
      setApiError(null);
      setIsLoading(false);
      setCopied("");
      setSelectedPercentage(null);
      setGasEstimation(null);
      setGasLoading(false);
    }
  }, [isOpen]);

  // Enhanced API error handler
  const handleApiError = async (response: Response) => {
    try {
      const errorData = await response.json();

      // Check if it's our enhanced error format
      if (errorData.errorType && errorData.error) {
        setApiError(errorData as ApiError);
      } else {
        // Fallback for other error formats
        setApiError({
          success: false,
          error:
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`,
          errorType: "api_error",
          details: errorData.details || "An unexpected error occurred",
        });
      }
    } catch (parseError) {
      // If we can't parse the error response
      setApiError({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        errorType: "api_error",
        details: "Unable to get error details from server",
      });
    }
  };

  // Debounced gas estimation effect
  useEffect(() => {
    const fetchGasEstimation = async () => {
      if (
        !formData.amount ||
        !formData.recipientAddress ||
        !walletAddress ||
        parseFloat(formData.amount) <= 0 ||
        parseFloat(formData.amount) > parseFloat(tokenInfo.balance)
      ) {
        setGasEstimation(null);
        return;
      }

      const recipientAddress = selectedUser
        ? selectedUser.walletAddress
        : formData.recipientAddress;

      if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
        setGasEstimation(null);
        return;
      }

      try {
        setGasLoading(true);

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

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.preview?.gasEstimation) {
            setGasEstimation({
              gasCostUSD: data.preview.gasEstimation.gasCostUSD,
              gasCostETH: data.preview.gasEstimation.gasCostETH,
              estimatedGas: data.preview.gasEstimation.estimatedGas,
            });
          }
        }
      } catch (error) {
        console.log("Gas estimation failed:", error);
      } finally {
        setGasLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchGasEstimation, 800);
    return () => clearTimeout(timeoutId);
  }, [
    formData.amount,
    formData.recipientAddress,
    selectedUser,
    walletAddress,
    tokenInfo,
  ]);

  // Handle username/address input change
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

    if (errors.recipientAddress) {
      setErrors({ ...errors, recipientAddress: "" });
    }

    if (apiError) {
      setApiError(null);
    }
  };

  // Handle user selection from dropdown
  const handleUserSelect = (user: UserSuggestion) => {
    setSelectedUser(user);
    setFormData({ ...formData, recipientAddress: user.walletAddress });
    console.log("✅ User selected from dropdown:", user);
  };

  // Handle percentage selection
  const handlePercentageSelect = (percentage: number) => {
    const balance = parseFloat(tokenInfo.balance);
    const amount = ((balance * percentage) / 100).toString();
    setFormData({ ...formData, amount });
    setSelectedPercentage(percentage);
    if (errors.amount) {
      setErrors({ ...errors, amount: "" });
    }
    if (apiError) {
      setApiError(null);
    }
  };

  // Handle amount change
  const handleAmountChange = (value: string) => {
    setFormData({ ...formData, amount: value });
    setSelectedPercentage(null);
    if (errors.amount) {
      setErrors({ ...errors, amount: "" });
    }
    if (apiError) {
      setApiError(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipientAddress.trim()) {
      newErrors.recipientAddress = "Recipient address is required";
    } else if (selectedUser) {
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
      if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipientAddress)) {
        newErrors.recipientAddress =
          "Invalid recipient address format. Please enter a valid address or select a user";
      } else if (
        formData.recipientAddress.toLowerCase() === walletAddress.toLowerCase()
      ) {
        newErrors.recipientAddress = "Cannot send to yourself";
      }
    }

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

    if (!walletAddress) {
      setErrors({ general: "Wallet address not available" });
      return;
    }

    if (!activeWallet?.address) {
      setErrors({ general: "No active wallet found" });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setApiError(null);

    try {
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
        await handleApiError(response);
        return;
      }

      const data = await response.json();
      console.log("📡 Preview response data:", data);

      if (!data.success) {
        setApiError({
          success: false,
          error: data.error || "Failed to create preview",
          errorType: data.errorType || "preview_error",
          details: data.details,
        });
        return;
      }

      setPreview(data.preview);
      setStep("preview");
      console.log("✅ Preview created successfully");
    } catch (error: any) {
      console.error("❌ Preview creation error:", error);
      setApiError({
        success: false,
        error: "Network error",
        errorType: "network_error",
        details:
          "Unable to connect to the server. Please check your internet connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRandomTokenBg = (symbol: string) => {
    const backgrounds = [
      "bg-blue-500/20",
      "bg-purple-500/20",
      "bg-green-500/20",
      "bg-yellow-500/20",
      "bg-red-500/20",
      "bg-cyan-500/20",
      "bg-pink-500/20",
      "bg-orange-500/20",
      "bg-indigo-500/20",
      "bg-teal-500/20",
    ];

    const index =
      symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      backgrounds.length;
    return backgrounds[index];
  };

  const handleExecuteTransfer = async () => {
    console.log("🚀 Executing transfer...");

    if (!preview || !activeWallet) {
      setApiError({
        success: false,
        error: "Missing preview or wallet information",
        errorType: "execution_error",
      });
      return;
    }

    if (!walletAddress) {
      setApiError({
        success: false,
        error: "Wallet address not available",
        errorType: "wallet_error",
      });
      return;
    }

    setStep("processing");
    setIsLoading(true);
    setErrors({});
    setApiError(null);

    try {
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
          useStoredKey: true,
        }),
        credentials: "include",
      });

      console.log("📡 Execution response status:", response.status);

      if (!response.ok) {
        await handleApiError(response);
        setStep("error");
        return;
      }

      const data = await response.json();
      console.log("📡 Execution response data:", data);

      if (!data.success) {
        setApiError({
          success: false,
          error: data.error || "Transfer execution failed",
          errorType: data.errorType || "execution_error",
          details: data.details,
        });
        setStep("error");
        return;
      }

      setTransactionResult(data.result);
      setStep("success");
      console.log("✅ Transfer executed successfully");

      if (onTransactionComplete) {
        onTransactionComplete();
      }
    } catch (error: any) {
      console.error("❌ Transfer execution error:", error);
      setApiError({
        success: false,
        error: "Network error",
        errorType: "network_error",
        details:
          "Unable to connect to the server. Please check your internet connection and try again.",
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

  const handleRetry = () => {
    setApiError(null);
    setStep("form");
  };

  const getTokenIcon = (symbol: string) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
      USDC: "bg-blue-600",
      LINK: "bg-blue-700",
      DAI: "bg-yellow-500",
      UNI: "bg-pink-500",
      BTC: "bg-orange-500",
      USDT: "bg-green-500",
      BNB: "bg-yellow-600",
    };
    return colors[symbol] || "bg-purple-500";
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

  if (!isOpen) return null;

  return (
    <>
      {/* FIXED: Stronger fade effect to match other modals */}
      <div className="fixed inset-0 z-40 bg-white/10" onClick={handleClose} />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
        <div className="bg-black border rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-hidden">
          {/* Header matching the image design */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-base font-semibold text-white font-mayeka-demi-bold-demo">
              Send
            </h2>
            {/* Token icon in header */}
            <div
              className={`w-6 h-6 ${getRandomTokenBg(
                tokenInfo.symbol
              )} rounded-lg flex items-center justify-center p-0.5`}
            >
              {tokenInfo.priceData?.image ? (
                <img
                  src={tokenInfo.priceData.image}
                  alt={tokenInfo.symbol}
                  className="w-5 h-5 rounded-md object-cover"
                />
              ) : (
                <span className="text-black text-sm font-bold">
                  {getTokenLetter(tokenInfo.symbol)}
                </span>
              )}
            </div>
          </div>
          {/* Content */}
          <div className="p-3 sm:p-4 max-h-[calc(90vh-80px)] overflow-y-auto scrollbar-hide">
            {/* Form Step */}
            {step === "form" && (
              <div className="space-y-4">
                {/* Enhanced API Error Display */}
                {apiError && (
                  <ErrorDisplay
                    error={apiError}
                    onRetry={handleRetry}
                    onClose={handleClose}
                  />
                )}

                {/* Recipient Box */}
                <div className="bg-black border border-[#2C2C2C] rounded-lg p-3">
                  {/* Recipient heading */}
                  <div className="text-white text-sm font-satoshi mb-2">
                    Recipient
                  </div>

                  {/* Input row with user icon and placeholder */}
                  <div className="flex items-center mb-2">
                    {/* User icon */}
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                      {selectedUser ? (
                        selectedUser.avatar ? (
                          <img
                            src={selectedUser.avatar}
                            alt={selectedUser.username}
                            className="w-6 h-6 rounded-lg object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback =
                                target.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.classList.remove("hidden");
                              }
                            }}
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {selectedUser.username?.[0]?.toUpperCase() ||
                                selectedUser.displayName?.[0]?.toUpperCase() ||
                                "U"}
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="w-6 h-6 bg-[#E2AF19] rounded-lg flex items-center justify-center">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="text-black"
                          >
                            <path
                              d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M16 10h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle cx="16" cy="14" r="1" fill="currentColor" />
                          </svg>
                        </div>
                      )}

                      {selectedUser?.avatar && (
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center hidden">
                          <span className="text-white text-xs font-bold">
                            {selectedUser.username?.[0]?.toUpperCase() ||
                              selectedUser.displayName?.[0]?.toUpperCase() ||
                              "U"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Username input */}
                    <div className="flex-1 relative min-w-0">
                      <UsernameInput
                        value={formData.recipientAddress}
                        onChange={handleRecipientChange}
                        onUserSelect={handleUserSelect}
                        placeholder="Paste address / username"
                        error=""
                        className="w-full bg-transparent border-none text-white placeholder-gray-400 font-satoshi text-sm sm:text-base focus:outline-none"
                      />
                    </div>

                    {/* Profile icon */}
                    <div className="flex-shrink-0">
                      <ProfileIcon />
                    </div>
                  </div>

                  {/* Address display below */}
                  <div className="text-xs text-gray-400 font-satoshi break-all">
                    {selectedUser
                      ? selectedUser.walletAddress
                      : formData.recipientAddress ||
                        "0x9e700000000000000000000000000000000000000"}
                  </div>
                </div>

                {/* Error for recipient */}
                {errors.recipientAddress && (
                  <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-satoshi">
                      {errors.recipientAddress}
                    </p>
                  </div>
                )}

                {/* Asset Box */}
                <div className="bg-black border border-[#2C2C2C] rounded-lg p-3">
                  {/* Asset heading with percentage buttons */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white text-sm font-satoshi">Asset</div>

                    {/* Percentage buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePercentageSelect(25)}
                        className={`px-1.5 py-0.5 text-xs font-satoshi transition-colors ${
                          selectedPercentage === 25
                            ? "text-[#E2AF19] font-medium"
                            : "text-[#E2AF19] hover:opacity-80"
                        }`}
                      >
                        25%
                      </button>
                      <button
                        onClick={() => handlePercentageSelect(50)}
                        className={`px-1.5 py-0.5 text-xs font-satoshi transition-colors ${
                          selectedPercentage === 50
                            ? "text-[#E2AF19] font-medium"
                            : "text-[#E2AF19] hover:opacity-80"
                        }`}
                      >
                        50%
                      </button>
                      <button
                        onClick={() => handlePercentageSelect(75)}
                        className={`px-1.5 py-0.5 text-xs font-satoshi transition-colors ${
                          selectedPercentage === 75
                            ? "text-[#E2AF19] font-medium"
                            : "text-[#E2AF19] hover:opacity-80"
                        }`}
                      >
                        75%
                      </button>
                      <button
                        onClick={() => handlePercentageSelect(100)}
                        className={`px-1.5 py-0.5 text-xs font-satoshi transition-colors ${
                          selectedPercentage === 100
                            ? "text-[#E2AF19] font-medium"
                            : "text-[#E2AF19] hover:opacity-80"
                        }`}
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Token row with amount input */}
                  <div className="flex items-center justify-between mb-2 gap-2">
                    {/* Token info */}
                    <div className="flex items-center min-w-0 flex-shrink">
                      {tokenInfo.priceData?.image ? (
                        <div
                          className={`w-8 h-8 ${getRandomTokenBg(
                            tokenInfo.symbol
                          )} rounded-full mr-2 p-0.5 flex items-center justify-center flex-shrink-0`}
                        >
                          <img
                            src={tokenInfo.priceData.image}
                            alt={tokenInfo.symbol}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback = target.parentElement
                                ?.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.classList.remove("hidden");
                              }
                            }}
                          />
                        </div>
                      ) : null}

                      <div
                        className={`w-8 h-8 ${getTokenIcon(
                          tokenInfo.symbol
                        )} rounded-full mr-2 flex items-center justify-center flex-shrink-0 ${
                          tokenInfo.priceData?.image ? "hidden" : ""
                        }`}
                      >
                        <span className="text-white text-sm font-bold">
                          {getTokenLetter(tokenInfo.symbol)}
                        </span>
                      </div>

                      {/* Token name with proper truncation */}
                      <div className="text-white font-satoshi text-sm truncate">
                        {tokenInfo.name}
                      </div>
                    </div>

                    {/* Amount input */}
                    <div className="flex items-center flex-shrink-0">
                      <input
                        type="text"
                        placeholder="0"
                        value={formData.amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="bg-transparent text-white text-base sm:text-xl font-bold font-satoshi placeholder-gray-500 focus:outline-none text-right mr-2 w-12 sm:w-20"
                      />
                      <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">○</span>
                      </div>
                    </div>
                  </div>

                  {/* Balance row */}
                  <div className="text-gray-400 text-sm font-satoshi">
                    Balance: {parseFloat(tokenInfo.balance).toFixed(4)}
                  </div>
                </div>

                {/* Error for amount */}
                {errors.amount && (
                  <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-satoshi">
                      {errors.amount}
                    </p>
                  </div>
                )}

                {/* Network Fee - Dynamic */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white font-satoshi">Network Fee</span>
                  <span className="text-[#E2AF19] font-satoshi">
                    {gasLoading
                      ? "Calculating..."
                      : gasEstimation
                      ? `Fast ~ ${gasEstimation.gasCostUSD}`
                      : "Fast ~ <$0.03"}
                  </span>
                </div>

                {/* Error display for general errors */}
                {errors.general && (
                  <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-satoshi">
                      {errors.general}
                    </p>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={handleCreatePreview}
                  disabled={
                    isLoading ||
                    !walletAddress ||
                    !formData.recipientAddress ||
                    !formData.amount
                  }
                  className="w-full bg-[#E2AF19] text-black font-semibold py-3 rounded-lg hover:bg-[#D4A853] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-satoshi"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw
                        size={14}
                        className="inline mr-2 animate-spin"
                      />
                      Creating Preview...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            )}

            {/* Preview Step */}
            {step === "preview" && preview && (
              <div className="space-y-4">
                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                  <h3 className="text-white font-semibold font-satoshi mb-3">
                    Transfer Details
                  </h3>

                  <div className="space-y-2 text-sm">
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
                    {preview.valueUSD &&
                      preview.valueUSD !== "Not available" && (
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

                <div className="flex space-x-2">
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
                        <RefreshCw size={14} className="mr-2 animate-spin" />
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
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <RefreshCw size={24} className="text-black animate-spin" />
                </div>
                <h3 className="text-white text-base font-semibold font-satoshi mb-1.5">
                  Processing Transaction
                </h3>
                <p className="text-gray-400 font-satoshi">
                  Please wait while your transfer is being processed on the
                  blockchain...
                </p>
                <div className="mt-3 text-xs text-gray-500 font-satoshi">
                  This may take a few moments. Do not close this window.
                </div>
              </div>
            )}

            {/* Success Step */}
            {step === "success" && transactionResult && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-white" />
                  </div>
                  <h3 className="text-white text-base font-semibold font-satoshi mb-1.5">
                    Transfer Successful!
                  </h3>
                  <p className="text-gray-400 font-satoshi">
                    Your transfer has been completed successfully
                  </p>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                  <h4 className="text-white font-semibold font-satoshi mb-2">
                    Transaction Details
                  </h4>

                  <div className="space-y-2 text-sm">
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
                          <Copy size={12} />
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

                <div className="flex space-x-2">
                  {transactionResult.explorerUrl && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        window.open(transactionResult.explorerUrl, "_blank")
                      }
                      className="flex-1 font-satoshi"
                    >
                      <ExternalLink size={14} className="mr-2" />
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
            {step === "error" && apiError && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <X size={24} className="text-white" />
                  </div>
                  <h3 className="text-white text-base font-semibold font-satoshi mb-1.5">
                    Transfer Failed
                  </h3>
                </div>

                {/* Enhanced Error Display */}
                <ErrorDisplay
                  error={apiError}
                  onRetry={() => {
                    setApiError(null);
                    setStep("form");
                  }}
                  onClose={handleClose}
                />
              </div>
            )}

            {/* Legacy Error Step for backwards compatibility */}
            {step === "error" && transactionResult && !apiError && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <X size={24} className="text-white" />
                  </div>
                  <h3 className="text-white text-base font-semibold font-satoshi mb-1.5">
                    Transfer Failed
                  </h3>
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2.5 text-left">
                    <p className="text-red-400 text-sm font-satoshi">
                      {transactionResult.error}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2">
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
    </>
  );
}
