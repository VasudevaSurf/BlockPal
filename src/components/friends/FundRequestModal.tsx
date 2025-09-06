// src/components/friends/FundRequestModal.tsx - FRONTEND ONLY VERSION
"use client";

import { useState, useEffect } from "react";
import {
  X,
  Send,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Copy,
  Clock,
  DollarSign,
  User,
  Zap,
  XCircle,
  Ban,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface FundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundRequest: {
    _id: string;
    requestId: string;
    requesterUsername: string;
    recipientUsername: string;
    tokenSymbol: string;
    amount: string;
    message: string;
    status: "pending" | "fulfilled" | "declined" | "expired" | "cancelled";
    requestedAt: string;
    expiresAt: string;
    requesterWalletAddress?: string;
    transactionHash?: string;
    respondedAt?: string;
    fulfilledBy?: string;
  };
  onFulfilled?: () => void;
  onDeclined?: () => void;
}

interface TransferResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
  actualCostETH?: string;
  actualCostUSD?: string;
  actualGasCost?: any;
}

interface RequesterInfo {
  username: string;
  walletAddress: string;
  displayName?: string;
}

// Mock token data
const mockTokens = [
  {
    symbol: "ETH",
    name: "Ethereum",
    contractAddress: "native",
    decimals: 18,
    balance: 2.5,
    balanceFormatted: "2.5000",
    value: 8750.25,
    icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    price: 3500.1,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    balance: 1500.0,
    balanceFormatted: "1500.0000",
    value: 1500.0,
    icon: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    price: 1.0,
  },
];

const mockActiveWallet = {
  address: "0x1234567890123456789012345678901234567890",
  name: "Main Wallet",
};

export default function FundRequestModal({
  isOpen,
  onClose,
  fundRequest,
  onFulfilled,
  onDeclined,
}: FundRequestModalProps) {
  const [step, setStep] = useState<
    "review" | "sending" | "success" | "error" | "completed"
  >("review");
  const [loading, setLoading] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(
    null
  );
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [requesterInfo, setRequesterInfo] = useState<RequesterInfo | null>(
    null
  );
  const [loadingRequester, setLoadingRequester] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(fundRequest.status);

  const isProcessed = [
    "fulfilled",
    "declined",
    "expired",
    "cancelled",
  ].includes(currentStatus);
  const canTakeAction = currentStatus === "pending" && !isExpired();

  function isExpired(): boolean {
    return new Date() > new Date(fundRequest.expiresAt);
  }

  const getTokenInfo = () => {
    const token = mockTokens.find((t) => t.symbol === fundRequest.tokenSymbol);
    return token || null;
  };

  const getTokenIcon = (
    symbol: string,
    contractAddress?: string,
    imageUrl?: string
  ) => {
    const colors: Record<string, string> = {
      ETH: "bg-blue-500",
      ETHEREUM: "bg-blue-500",
      SOL: "bg-purple-500",
      BTC: "bg-orange-500",
      SUI: "bg-cyan-500",
      XRP: "bg-gray-500",
      ADA: "bg-blue-600",
      AVAX: "bg-red-500",
      TON: "bg-blue-400",
      DOT: "bg-pink-500",
      USDT: "bg-green-500",
      USDC: "bg-blue-600",
      YAI: "bg-yellow-500",
      LINK: "bg-blue-700",
    };

    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return colors.ETH || "bg-blue-500";
    }

    return colors[symbol] || "bg-gray-500";
  };

  const getTokenLetter = (symbol: string, contractAddress?: string) => {
    const letters: Record<string, string> = {
      ETH: "Ξ",
      ETHEREUM: "Ξ",
      SOL: "◎",
      BTC: "₿",
      SUI: "~",
      XRP: "✕",
      ADA: "₳",
      AVAX: "A",
      TON: "T",
      DOT: "●",
      USDT: "₮",
      USDC: "$",
      YAI: "Ÿ",
      LINK: "⛓",
    };

    if (
      symbol === "ETH" ||
      contractAddress === "native" ||
      symbol === "ETHEREUM"
    ) {
      return letters.ETH || "Ξ";
    }

    return letters[symbol] || symbol.charAt(0);
  };

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url === "null" || url === "undefined" || url === "") {
      return false;
    }
    return (
      url.startsWith("http") &&
      (url.includes("coingecko") ||
        url.includes("coinbase") ||
        url.includes("cdn"))
    );
  };

  const renderTokenIcon = (
    token: any,
    size: "small" | "medium" | "large" = "medium"
  ) => {
    const sizeClasses = {
      small: "w-5 h-5",
      medium: "w-6 h-6",
      large: "w-8 h-8",
    };

    const tokenSymbol = token?.symbol || fundRequest.tokenSymbol;
    const contractAddress = token?.contractAddress;
    const imageUrl = token?.icon;

    return (
      <>
        {isValidImageUrl(imageUrl) ? (
          <img
            src={imageUrl}
            alt={tokenSymbol}
            className={`${sizeClasses[size]} rounded-full mr-2 flex-shrink-0`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.classList.remove("hidden");
              }
            }}
          />
        ) : null}

        <div
          className={`${sizeClasses[size]} ${getTokenIcon(
            tokenSymbol,
            contractAddress
          )} rounded-full mr-2 flex items-center justify-center flex-shrink-0 ${
            isValidImageUrl(imageUrl) ? "hidden" : ""
          }`}
        >
          <span className="text-white text-xs font-medium">
            {getTokenLetter(tokenSymbol, contractAddress)}
          </span>
        </div>
      </>
    );
  };

  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setTransferResult(null);
      setError("");
      setRequesterInfo(null);
      setCurrentStatus(fundRequest.status);
      setLoading(false);

      if (isProcessed) {
        setStep("completed");
      }

      if (fundRequest.requesterWalletAddress) {
        setRequesterInfo({
          username: fundRequest.requesterUsername,
          walletAddress: fundRequest.requesterWalletAddress,
          displayName: fundRequest.requesterUsername,
        });
      } else {
        // Mock requester info
        setRequesterInfo({
          username: fundRequest.requesterUsername,
          walletAddress: "0x9876543210987654321098765432109876543210",
          displayName: fundRequest.requesterUsername,
        });
      }
    }
  }, [isOpen, fundRequest]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDecline = async () => {
    if (!canTakeAction) {
      setError(`Cannot decline: Fund request is already ${currentStatus}`);
      return;
    }

    try {
      setLoading(true);

      // Simulate API call
      setTimeout(() => {
        setCurrentStatus("declined");
        setStep("completed");
        onDeclined?.();
        setLoading(false);
      }, 1000);
    } catch (error: any) {
      setError("Failed to decline request");
      setLoading(false);
    }
  };

  const handleFulfill = async () => {
    if (!canTakeAction) {
      setError(`Cannot fulfill: Fund request is already ${currentStatus}`);
      return;
    }

    const tokenInfo = getTokenInfo();
    if (!tokenInfo) {
      setError("Token not found in wallet");
      return;
    }

    const userBalance = parseFloat(tokenInfo.balanceFormatted || "0");
    const requestedAmount = parseFloat(fundRequest.amount || "0");

    if (userBalance < requestedAmount) {
      const errorMsg = `Insufficient ${fundRequest.tokenSymbol} balance. You have ${userBalance} ${fundRequest.tokenSymbol} but need ${requestedAmount} ${fundRequest.tokenSymbol}.`;
      setError(errorMsg);
      setStep("error");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setStep("sending");

      // Simulate transfer process
      setTimeout(() => {
        // Mock successful transfer
        const mockResult: TransferResult = {
          success: true,
          transactionHash:
            "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          gasUsed: 21000,
          explorerUrl:
            "https://etherscan.io/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          actualCostUSD: "$2.45",
          actualCostETH: "0.0007 ETH",
        };

        setTransferResult(mockResult);
        setStep("success");
        setCurrentStatus("fulfilled");
        onFulfilled?.();
        setLoading(false);
      }, 3000);
    } catch (error: any) {
      setError("Failed to fulfill request");
      setStep("error");
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (currentStatus) {
      case "fulfilled":
        return {
          icon: <CheckCircle size={20} className="text-green-400" />,
          title: "Fund Request Fulfilled",
          message: "This fund request has been successfully fulfilled",
          color: "text-green-400",
          bgColor: "bg-green-900/20",
          borderColor: "border-green-500/50",
        };
      case "declined":
        return {
          icon: <XCircle size={20} className="text-red-400" />,
          title: "Fund Request Declined",
          message: "This fund request has been declined",
          color: "text-red-400",
          bgColor: "bg-red-900/20",
          borderColor: "border-red-500/50",
        };
      case "expired":
        return {
          icon: <Clock size={20} className="text-yellow-400" />,
          title: "Fund Request Expired",
          message: "This fund request has expired",
          color: "text-yellow-400",
          bgColor: "bg-yellow-900/20",
          borderColor: "border-yellow-500/50",
        };
      case "cancelled":
        return {
          icon: <Ban size={20} className="text-gray-400" />,
          title: "Fund Request Cancelled",
          message: "This fund request has been cancelled",
          color: "text-gray-400",
          bgColor: "bg-gray-900/20",
          borderColor: "border-gray-500/50",
        };
      default:
        return null;
    }
  };

  const tokenInfo = getTokenInfo();
  const hasInsufficientBalance =
    tokenInfo &&
    parseFloat(tokenInfo.balanceFormatted || "0") <
      parseFloat(fundRequest.amount || "0");
  const requesterWalletAddress =
    fundRequest.requesterWalletAddress || requesterInfo?.walletAddress;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-white/10" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
        <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between p-4 border-b border-[#2C2C2C]">
            <div className="flex items-center">
              <div className="flex items-center mr-2.5">
                <DollarSign size={20} className="text-[#E2AF19] mr-1.5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white font-satoshi">
                  Fund Request {step === "sending" && "- Processing"}
                </h3>
                <p className="text-gray-400 text-xs font-satoshi">
                  {step === "review" && !canTakeAction && "Already processed"}
                  {step === "review" &&
                    canTakeAction &&
                    "Review request details"}
                  {step === "sending" && "Processing your transfer..."}
                  {step === "success" && "Transfer completed!"}
                  {step === "error" && "Transfer failed"}
                  {step === "completed" && "Request completed"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4">
            {/* Error state */}
            {step === "error" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Transfer Failed
                  </h4>
                  <p className="text-gray-400 text-xs font-satoshi mb-3">
                    Unable to complete the fund request.
                  </p>
                  {error && (
                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-3">
                      <div className="flex items-start">
                        <AlertTriangle
                          size={14}
                          className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                        />
                        <p className="text-red-400 text-xs font-satoshi text-left">
                          {error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setStep("review");
                      setError("");
                      setLoading(false);
                    }}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Completed state */}
            {(step === "completed" || isProcessed) && (
              <div className="space-y-4">
                {(() => {
                  const statusDisplay = getStatusDisplay();
                  if (!statusDisplay) return null;

                  return (
                    <div className="text-center">
                      <div
                        className={`w-12 h-12 ${statusDisplay.bgColor} rounded-full flex items-center justify-center mx-auto mb-3 border ${statusDisplay.borderColor}`}
                      >
                        {statusDisplay.icon}
                      </div>
                      <h4
                        className={`${statusDisplay.color} font-semibold font-satoshi mb-1.5`}
                      >
                        {statusDisplay.title}
                      </h4>
                      <p className="text-gray-400 text-xs font-satoshi">
                        {statusDisplay.message}
                      </p>
                    </div>
                  );
                })()}

                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-satoshi">
                        Amount:
                      </span>
                      <div className="flex items-center">
                        {renderTokenIcon(tokenInfo, "small")}
                        <span className="text-white font-semibold font-satoshi">
                          {fundRequest.amount} {fundRequest.tokenSymbol}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-satoshi">
                        Requester:
                      </span>
                      <span className="text-white font-semibold font-satoshi">
                        @{fundRequest.requesterUsername}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-satoshi">
                        Status:
                      </span>
                      <span
                        className={`font-semibold font-satoshi ${
                          getStatusDisplay()?.color || "text-white"
                        }`}
                      >
                        {currentStatus.charAt(0).toUpperCase() +
                          currentStatus.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button onClick={onClose} className="w-full">
                  Close
                </Button>
              </div>
            )}

            {/* Review state */}
            {step === "review" && canTakeAction && (
              <div className="space-y-4">
                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-2.5">
                      <User size={16} className="text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold font-satoshi">
                        @{fundRequest.requesterUsername}
                      </div>
                      <div className="text-gray-400 text-xs font-satoshi">
                        is requesting funds
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-satoshi">
                        Amount:
                      </span>
                      <div className="flex items-center">
                        {renderTokenIcon(tokenInfo, "small")}
                        <span className="text-white font-semibold font-satoshi">
                          {fundRequest.amount} {fundRequest.tokenSymbol}
                        </span>
                      </div>
                    </div>

                    {fundRequest.message && (
                      <div>
                        <span className="text-gray-400 text-xs font-satoshi">
                          Message:
                        </span>
                        <p className="text-white text-xs font-satoshi mt-0.5 bg-[#1A1A1A] p-2 rounded border border-[#2C2C2C]">
                          "{fundRequest.message}"
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-satoshi">
                        Requested:
                      </span>
                      <span className="text-white text-xs font-satoshi">
                        {new Date(fundRequest.requestedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-satoshi">
                        Expires:
                      </span>
                      <span
                        className={`text-xs font-satoshi ${
                          isExpired() ? "text-red-400" : "text-white"
                        }`}
                      >
                        {new Date(fundRequest.expiresAt).toLocaleDateString()}
                        {isExpired() && " (Expired)"}
                      </span>
                    </div>

                    {/* Transfer details section */}
                    <div className="bg-[#1A1A1A] rounded-lg p-2.5 border border-[#2C2C2C]">
                      <div className="text-xs font-satoshi mb-1.5">
                        <span className="text-[#E2AF19] font-medium">
                          Transfer Details:
                        </span>
                      </div>

                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-xs font-satoshi">
                          From (You):
                        </span>
                        <div className="flex items-center">
                          <span className="text-white text-xs font-satoshi font-mono mr-1.5">
                            {mockActiveWallet.address.slice(0, 8)}...
                            {mockActiveWallet.address.slice(-6)}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                mockActiveWallet.address,
                                "sender"
                              )
                            }
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>

                      {requesterWalletAddress && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs font-satoshi">
                            To (Requester):
                          </span>
                          <div className="flex items-center">
                            <span className="text-white text-xs font-satoshi font-mono mr-1.5">
                              {requesterWalletAddress.slice(0, 8)}...
                              {requesterWalletAddress.slice(-6)}
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  requesterWalletAddress,
                                  "recipient"
                                )
                              }
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>
                      )}

                      {copied === "sender" && (
                        <p className="text-green-400 text-xs font-satoshi mt-1">
                          Your wallet address copied!
                        </p>
                      )}
                      {copied === "recipient" && (
                        <p className="text-green-400 text-xs font-satoshi mt-1">
                          Requester's wallet address copied!
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Balance check section */}
                {tokenInfo && (
                  <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center">
                        {renderTokenIcon(tokenInfo, "small")}
                        <span className="text-gray-400 text-xs font-satoshi">
                          Your {fundRequest.tokenSymbol} Balance:
                        </span>
                      </div>
                      <span className="text-white font-semibold font-satoshi">
                        {tokenInfo.balanceFormatted || "0"}{" "}
                        {fundRequest.tokenSymbol}
                      </span>
                    </div>

                    {hasInsufficientBalance && (
                      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2.5 mt-2">
                        <div className="flex items-start">
                          <AlertTriangle
                            size={14}
                            className="text-red-400 mr-1.5 mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <p className="text-red-400 text-xs font-satoshi font-medium mb-1">
                              Insufficient Balance
                            </p>
                            <p className="text-red-400 text-xs font-satoshi">
                              You need{" "}
                              {parseFloat(fundRequest.amount) -
                                parseFloat(
                                  tokenInfo.balanceFormatted || "0"
                                )}{" "}
                              more {fundRequest.tokenSymbol} to fulfill this
                              request.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2.5">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={14}
                        className="text-red-400 mr-1.5 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-red-400 text-xs font-satoshi">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-3">
                  <Button
                    variant="secondary"
                    onClick={handleDecline}
                    disabled={loading || !canTakeAction}
                    className="flex-1"
                  >
                    {loading ? "Processing..." : "Decline"}
                  </Button>
                  <Button
                    onClick={handleFulfill}
                    disabled={
                      loading ||
                      !canTakeAction ||
                      !tokenInfo ||
                      hasInsufficientBalance
                    }
                    className="flex-1"
                  >
                    {loading
                      ? "Processing..."
                      : hasInsufficientBalance
                      ? "Insufficient Balance"
                      : `Send ${fundRequest.tokenSymbol}`}
                  </Button>
                </div>
              </div>
            )}

            {/* Sending state */}
            {step === "sending" && (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E2AF19] mx-auto mb-3"></div>
                <h4 className="text-white font-semibold font-satoshi mb-1.5">
                  Processing Transfer
                </h4>
                <div className="flex items-center justify-center mb-1.5">
                  <p className="text-gray-400 text-xs font-satoshi">
                    Sending {fundRequest.amount} {fundRequest.tokenSymbol} to @
                    {fundRequest.requesterUsername}...
                  </p>
                </div>
                <p className="text-gray-500 text-xs font-satoshi">
                  Please wait while we process your transaction
                </p>
              </div>
            )}

            {/* Success state */}
            {step === "success" && transferResult && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-green-400" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Transfer Successful!
                  </h4>
                  <div className="flex items-center justify-center mb-1.5">
                    {renderTokenIcon(tokenInfo, "small")}
                    <p className="text-gray-400 text-xs font-satoshi">
                      You've successfully sent {fundRequest.amount}{" "}
                      {fundRequest.tokenSymbol} to @
                      {fundRequest.requesterUsername}
                    </p>
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-2.5">
                  <div className="flex items-center mb-1.5">
                    <Zap size={14} className="text-green-400 mr-1.5" />
                    <span className="text-green-400 text-xs font-satoshi font-medium">
                      Transfer Completed
                    </span>
                  </div>
                  <p className="text-green-400 text-xs font-satoshi">
                    The fund request has been fulfilled successfully.
                  </p>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-satoshi">
                        Transaction Hash:
                      </span>
                      <div className="flex items-center">
                        <span className="text-white text-xs font-satoshi font-mono mr-1.5">
                          {transferResult.transactionHash?.slice(0, 8)}...
                          {transferResult.transactionHash?.slice(-6)}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              transferResult.transactionHash!,
                              "hash"
                            )
                          }
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>

                    {transferResult.gasUsed && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Gas Used:
                        </span>
                        <span className="text-white text-xs font-satoshi">
                          {transferResult.gasUsed.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {transferResult.actualCostUSD && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Transaction Fee:
                        </span>
                        <span className="text-white text-xs font-satoshi">
                          {transferResult.actualCostUSD}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {copied === "hash" && (
                  <p className="text-green-400 text-xs font-satoshi mt-1.5">
                    Transaction hash copied!
                  </p>
                )}

                <div className="flex gap-2">
                  {transferResult.explorerUrl && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        window.open(transferResult.explorerUrl, "_blank")
                      }
                      className="flex-1"
                    >
                      <ExternalLink size={14} className="mr-1.5" />
                      View on Explorer
                    </Button>
                  )}
                  <Button onClick={onClose} className="flex-1">
                    Done
                  </Button>
                </div>
              </div>
            )}

            {/* Non-actionable review state */}
            {step === "review" && !canTakeAction && (
              <div className="space-y-4">
                {(() => {
                  const statusDisplay = getStatusDisplay();
                  if (!statusDisplay) return null;

                  return (
                    <div
                      className={`${statusDisplay.bgColor} border ${statusDisplay.borderColor} rounded-lg p-3`}
                    >
                      <div className="flex items-start">
                        {statusDisplay.icon}
                        <div className="ml-2.5">
                          <p
                            className={`${statusDisplay.color} text-xs font-satoshi font-medium mb-0.5`}
                          >
                            {statusDisplay.title}
                          </p>
                          <p
                            className={`${statusDisplay.color} text-xs font-satoshi`}
                          >
                            {statusDisplay.message}. No further action can be
                            taken on this request.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <Button onClick={onClose} className="w-full">
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
