// src/components/friends/FundRequestModal.tsx - COMPACT VERSION
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  X,
  Send,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  Clock,
  DollarSign,
  User,
  Zap,
  XCircle,
  Ban,
  ChevronDown,
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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

const parseErrorMessage = (error: string): string => {
  if (error.includes("insufficient funds")) {
    return "Insufficient funds for this transfer. Please check your wallet balance.";
  }
  if (error.includes("gas")) {
    return "Not enough ETH to pay for transaction fees.";
  }
  if (error.includes("execution reverted")) {
    return "Transaction failed. Please check token balances and try again.";
  }
  if (error.includes("nonce too low")) {
    return "Network issue detected. Please try again.";
  }
  if (error.includes("network error") || error.includes("timeout")) {
    return "Network connection error. Please check your internet and try again.";
  }
  if (error.includes("user denied") || error.includes("user rejected")) {
    return "Transaction was cancelled.";
  }

  return "Transfer failed. Please try again or contact support if the issue persists.";
};

export default function FundRequestModal({
  isOpen,
  onClose,
  fundRequest,
  onFulfilled,
  onDeclined,
}: FundRequestModalProps) {
  const { activeWallet, tokens } = useSelector(
    (state: RootState) => state.wallet
  );

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

  const [showTokenDropdown, setShowTokenDropdown] = useState(false);

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
    const token = tokens.find((t) => t.symbol === fundRequest.tokenSymbol);
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
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector("[data-token-dropdown]");
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setShowTokenDropdown(false);
      }
    };

    if (showTokenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTokenDropdown]);

  const fetchCurrentStatus = async () => {
    try {
      const response = await fetch(
        `/api/friends/fund-request/${fundRequest.requestId}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        const latestStatus = data.fundRequest?.status || fundRequest.status;

        setCurrentStatus(latestStatus);

        if (latestStatus !== fundRequest.status) {
          if (latestStatus === "fulfilled" || latestStatus === "declined") {
            setStep("completed");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching current status:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setTransferResult(null);
      setError("");
      setRequesterInfo(null);
      setCurrentStatus(fundRequest.status);
      setShowTokenDropdown(false);

      fetchCurrentStatus();

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
        fetchRequesterInfo();
      }
    }
  }, [isOpen, fundRequest]);

  const fetchRequesterInfo = async () => {
    try {
      setLoadingRequester(true);

      const response = await fetch(
        `/api/users/by-username/${fundRequest.requesterUsername}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const userData = await response.json();

        if (userData.walletAddress) {
          setRequesterInfo({
            username: userData.username,
            walletAddress: userData.walletAddress,
            displayName: userData.displayName,
          });
        } else {
          setError("Requester doesn't have a wallet address configured");
        }
      } else {
        await fetchRequesterFromFriends();
      }
    } catch (error) {
      setError("Could not find requester's wallet address");
    } finally {
      setLoadingRequester(false);
    }
  };

  const fetchRequesterFromFriends = async () => {
    try {
      const response = await fetch("/api/friends?type=friends", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const friend = data.friends?.find(
          (f: any) => f.username === fundRequest.requesterUsername
        );

        if (friend && friend.walletAddress) {
          setRequesterInfo({
            username: friend.username,
            walletAddress: friend.walletAddress,
            displayName: friend.displayName,
          });
        } else {
          setError(
            "Could not find requester's wallet address. They may need to add their wallet to their profile."
          );
        }
      }
    } catch (error) {
      setError("Could not find requester's wallet address");
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

  const handleDecline = async () => {
    await fetchCurrentStatus();

    if (!canTakeAction) {
      setError(`Cannot decline: Fund request is already ${currentStatus}`);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/friends/fund-request/${fundRequest.requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "decline",
          }),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setCurrentStatus("declined");
        setStep("completed");
        onDeclined?.();
      } else {
        if (
          data.error?.includes("already processed") ||
          data.error?.includes("not found")
        ) {
          setError("This fund request has already been processed");
          setCurrentStatus("declined");
          setStep("completed");
        } else {
          setError(
            parseErrorMessage(data.error || "Failed to decline request")
          );
        }
      }
    } catch (error: any) {
      setError(parseErrorMessage(error.message || "Failed to decline request"));
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async () => {
    await fetchCurrentStatus();

    if (!canTakeAction) {
      setError(`Cannot fulfill: Fund request is already ${currentStatus}`);
      return;
    }

    const tokenInfo = getTokenInfo();
    if (!tokenInfo || !activeWallet) {
      setError("Token not found in wallet or no active wallet");
      return;
    }

    let recipientWalletAddress = null;

    if (fundRequest.requesterWalletAddress) {
      recipientWalletAddress = fundRequest.requesterWalletAddress;
    } else if (requesterInfo?.walletAddress) {
      recipientWalletAddress = requesterInfo.walletAddress;
    } else {
      setError("Could not determine requester's wallet address");
      return;
    }

    if (
      parseFloat(tokenInfo.balanceFormatted) < parseFloat(fundRequest.amount)
    ) {
      setError(`Insufficient ${fundRequest.tokenSymbol} balance`);
      return;
    }

    try {
      setLoading(true);
      setStep("sending");

      const transferResponse = await fetch("/api/transfer/simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          tokenInfo: {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            contractAddress: tokenInfo.contractAddress,
            decimals: tokenInfo.decimals,
            isETH:
              tokenInfo.contractAddress === "native" ||
              tokenInfo.symbol === "ETH",
          },
          recipientAddress: recipientWalletAddress,
          amount: fundRequest.amount,
          fromAddress: activeWallet.address,
          useStoredKey: true,
        }),
        credentials: "include",
      });

      const transferData = await transferResponse.json();

      if (transferData.success && transferData.result) {
        setTransferResult(transferData.result);
        setStep("success");

        const updateResponse = await fetch(
          `/api/friends/fund-request/${fundRequest.requestId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "fulfill",
              transactionHash: transferData.result.transactionHash,
            }),
            credentials: "include",
          }
        );

        if (updateResponse.ok) {
          setCurrentStatus("fulfilled");
          onFulfilled?.();
        } else {
          const updateData = await updateResponse.json();
          if (updateData.error?.includes("already processed")) {
            setError("This fund request was already processed by someone else");
            setCurrentStatus("fulfilled");
            setStep("completed");
          }
        }
      } else {
        setError(parseErrorMessage(transferData.error || "Transfer failed"));
        setStep("error");
      }
    } catch (error: any) {
      setError(parseErrorMessage(error.message || "Failed to fulfill request"));
      setStep("error");
    } finally {
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
    parseFloat(tokenInfo.balanceFormatted) < parseFloat(fundRequest.amount);
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
                {step === "sending" && (
                  <Zap size={14} className="text-green-400 animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white font-satoshi">
                  Fund Request {step === "sending" && "(Enhanced API)"}
                </h3>
                <p className="text-gray-400 text-xs font-satoshi">
                  {step === "review" && !canTakeAction && "Already processed"}
                  {step === "review" &&
                    canTakeAction &&
                    "Review request details"}
                  {step === "sending" && "Processing with enhanced API..."}
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
                    {fundRequest.respondedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Responded:
                        </span>
                        <span className="text-white text-xs font-satoshi">
                          {new Date(
                            fundRequest.respondedAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {fundRequest.transactionHash && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Transaction:
                        </span>
                        <button
                          onClick={() =>
                            window.open(
                              `https://etherscan.io/tx/${fundRequest.transactionHash}`,
                              "_blank"
                            )
                          }
                          className="text-[#E2AF19] text-xs font-satoshi hover:opacity-80 transition-opacity flex items-center"
                        >
                          <ExternalLink size={10} className="mr-1" />
                          View on Explorer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Button onClick={onClose} className="w-full">
                  Close
                </Button>
              </div>
            )}

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
                        <p className="text-white text-xs font-satoshi mt-0.5">
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

                    <div className="bg-[#1A1A1A] rounded-lg p-2.5 border border-[#2C2C2C]">
                      <div className="text-xs font-satoshi mb-1.5">
                        <span className="text-[#E2AF19] font-medium">
                          Transfer Details (Enhanced API):
                        </span>
                      </div>

                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-xs font-satoshi">
                          From (You):
                        </span>
                        <div className="flex items-center">
                          <span className="text-white text-xs font-satoshi font-mono mr-1.5">
                            {activeWallet?.address
                              ? `${activeWallet.address.slice(
                                  0,
                                  8
                                )}...${activeWallet.address.slice(-6)}`
                              : "No wallet selected"}
                          </span>
                          {activeWallet?.address && (
                            <button
                              onClick={() =>
                                copyToClipboard(activeWallet.address, "sender")
                              }
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {loadingRequester && !requesterWalletAddress && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs font-satoshi">
                            To (Requester):
                          </span>
                          <span className="text-gray-400 text-xs font-satoshi">
                            Loading...
                          </span>
                        </div>
                      )}

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
                        {tokenInfo.balanceFormatted} {fundRequest.tokenSymbol}
                      </span>
                    </div>

                    {hasInsufficientBalance && (
                      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2.5 mt-2">
                        <div className="flex items-start">
                          <AlertTriangle
                            size={14}
                            className="text-red-400 mr-1.5 mt-0.5 flex-shrink-0"
                          />
                          <p className="text-red-400 text-xs font-satoshi">
                            Insufficient balance. You need{" "}
                            {parseFloat(fundRequest.amount) -
                              parseFloat(tokenInfo.balanceFormatted)}{" "}
                            more {fundRequest.tokenSymbol}.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!tokenInfo && (
                  <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={14}
                        className="text-yellow-400 mr-1.5 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-yellow-400 text-xs font-satoshi">
                        You don't have any {fundRequest.tokenSymbol} in your
                        wallet.
                      </p>
                    </div>
                  </div>
                )}

                {!loadingRequester && !requesterWalletAddress && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={14}
                        className="text-red-400 mr-1.5 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-red-400 text-xs font-satoshi">
                        Could not find wallet address for @
                        {fundRequest.requesterUsername}. They may need to add
                        their wallet to their profile.
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2.5">
                    <p className="text-red-400 text-xs font-satoshi">{error}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-3">
                  <Button
                    variant="secondary"
                    onClick={handleDecline}
                    disabled={loading || !canTakeAction}
                    className="flex-1"
                  >
                    {!canTakeAction ? "Cannot Decline" : "Decline"}
                  </Button>
                  <Button
                    onClick={handleFulfill}
                    disabled={
                      loading ||
                      !canTakeAction ||
                      !tokenInfo ||
                      hasInsufficientBalance ||
                      loadingRequester ||
                      !requesterWalletAddress ||
                      !activeWallet?.address
                    }
                    className="flex-1"
                  >
                    {loading
                      ? "Processing..."
                      : loadingRequester
                      ? "Loading..."
                      : !canTakeAction
                      ? "Cannot Send"
                      : `Send ${fundRequest.tokenSymbol}`}
                  </Button>
                </div>
              </div>
            )}

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

            {step === "sending" && (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E2AF19] mx-auto mb-3"></div>
                <h4 className="text-white font-semibold font-satoshi mb-1.5">
                  Processing Enhanced Transfer
                </h4>
                <div className="flex items-center justify-center mb-1.5">
                  {renderTokenIcon(tokenInfo, "small")}
                  <p className="text-gray-400 text-xs font-satoshi">
                    Sending {fundRequest.amount} {fundRequest.tokenSymbol} to @
                    {fundRequest.requesterUsername} using Enhanced API...
                  </p>
                </div>
              </div>
            )}

            {step === "success" && transferResult && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-green-400" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Enhanced Transfer Successful!
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
                      Enhanced API Transfer Completed
                    </span>
                  </div>
                  <p className="text-green-400 text-xs font-satoshi">
                    This transaction used our optimized API for better gas
                    efficiency and reliability.
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

                    {transferResult.actualGasCost && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Gas Cost (ETH):
                        </span>
                        <span className="text-white text-xs font-satoshi">
                          {transferResult.actualGasCost.actualCostETH} ETH
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

            {step === "error" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <h4 className="text-white font-semibold font-satoshi mb-1.5">
                    Enhanced Transfer Failed
                  </h4>
                  <p className="text-gray-400 text-xs font-satoshi mb-3">
                    We couldn't complete your transfer using the Enhanced API.
                    Please try again.
                  </p>
                  {error && (
                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2.5 mb-3">
                      <p className="text-red-400 text-xs font-satoshi">
                        {error}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setStep("review");
                      setError("");
                    }}
                    className="flex-1"
                  >
                    Try Again
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
