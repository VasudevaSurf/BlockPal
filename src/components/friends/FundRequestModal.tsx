// src/components/friends/FundRequestModal.tsx - ENHANCED VERSION (Complete Token Support)
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
  ShieldAlert,
  AlertCircle as AlertIcon,
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
    tokenName?: string;
    contractAddress?: string;
    decimals?: number;
    amount: string;
    message: string;
    status: "pending" | "fulfilled" | "declined" | "expired" | "failed";
    requestedAt: string;
    expiresAt: string;
    requesterWalletAddress?: string;
    transactionHash?: string;
    fulfilledBy?: string;
    declinedBy?: string;
    error?: string;
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
  token?: {
    symbol: string;
    name: string;
    contractAddress: string;
  };
}

interface RequesterInfo {
  username: string;
  walletAddress: string;
  displayName?: string;
}

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

  const [step, setStep] = useState<"review" | "sending" | "success" | "error">(
    "review"
  );
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

  // FIXED: Enhanced token matching
  const [userHasToken, setUserHasToken] = useState<boolean>(false);
  const [userTokenBalance, setUserTokenBalance] = useState<string>("0");
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setTransferResult(null);
      setError("");
      setRequesterInfo(null);
      setUserHasToken(false);
      setUserTokenBalance("0");
      setTokenInfo(null);

      // Check if we have the wallet address in the fund request
      if (fundRequest.requesterWalletAddress) {
        console.log(
          "✅ Using wallet address from fund request:",
          fundRequest.requesterWalletAddress
        );
        setRequesterInfo({
          username: fundRequest.requesterUsername,
          walletAddress: fundRequest.requesterWalletAddress,
          displayName: fundRequest.requesterUsername,
        });
      } else {
        // Fallback: Fetch requester wallet address if not in fund request
        fetchRequesterInfo();
      }

      // FIXED: Check if user has the requested token
      checkUserTokenBalance();
    }
  }, [isOpen, fundRequest, tokens]);

  // FIXED: Enhanced token balance checking
  const checkUserTokenBalance = () => {
    if (!tokens || tokens.length === 0 || !fundRequest.tokenSymbol) {
      setUserHasToken(false);
      return;
    }

    console.log("🔍 Checking user token balance for:", {
      requestedToken: fundRequest.tokenSymbol,
      requestedContract: fundRequest.contractAddress,
      userTokens: tokens.length,
    });

    // Find matching token with enhanced matching logic
    let matchingToken = null;

    // Method 1: Exact symbol and contract match
    if (fundRequest.contractAddress) {
      matchingToken = tokens.find(
        (token) =>
          token.symbol === fundRequest.tokenSymbol &&
          (token.contractAddress === fundRequest.contractAddress ||
            (token.contractAddress === "native" &&
              fundRequest.contractAddress === "native") ||
            token.id === fundRequest.contractAddress)
      );
    }

    // Method 2: Symbol match for ETH/native tokens
    if (
      !matchingToken &&
      (fundRequest.tokenSymbol === "ETH" ||
        fundRequest.contractAddress === "native")
    ) {
      matchingToken = tokens.find(
        (token) =>
          token.symbol === "ETH" ||
          token.contractAddress === "native" ||
          !token.contractAddress
      );
    }

    // Method 3: Fallback to symbol-only match
    if (!matchingToken) {
      matchingToken = tokens.find(
        (token) => token.symbol === fundRequest.tokenSymbol
      );
    }

    if (matchingToken) {
      const balance =
        typeof matchingToken.balance === "number"
          ? matchingToken.balance
          : parseFloat(matchingToken.balance?.toString() || "0");

      const requestedAmount = parseFloat(fundRequest.amount);

      console.log("✅ Token found:", {
        token: matchingToken.symbol,
        userBalance: balance,
        requestedAmount: requestedAmount,
        hasSufficient: balance >= requestedAmount,
      });

      setUserHasToken(true);
      setUserTokenBalance(balance.toString());
      setTokenInfo(matchingToken);
    } else {
      console.log("❌ Token not found in user wallet");
      setUserHasToken(false);
      setUserTokenBalance("0");
      setTokenInfo(null);
    }
  };

  const fetchRequesterInfo = async () => {
    try {
      setLoadingRequester(true);
      console.log(
        "🔍 Fetching requester info for:",
        fundRequest.requesterUsername
      );

      // Try to get user wallet address by username
      const response = await fetch(
        `/api/users/by-username/${fundRequest.requesterUsername}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const userData = await response.json();
        console.log("✅ Requester user data:", userData);

        if (userData.walletAddress) {
          setRequesterInfo({
            username: userData.username,
            walletAddress: userData.walletAddress,
            displayName: userData.displayName,
          });
          console.log(
            "✅ Requester wallet address found:",
            userData.walletAddress
          );
        } else {
          console.warn("⚠️ No wallet address found for user");
          setError("Requester doesn't have a wallet address configured");
        }
      } else {
        console.warn("⚠️ Could not fetch user info");
        setError("Could not find requester's information");
      }
    } catch (error) {
      console.error("❌ Error fetching requester info:", error);
      setError("Could not find requester's wallet address");
    } finally {
      setLoadingRequester(false);
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

      if (response.ok) {
        onDeclined?.();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to decline request");
      }
    } catch (error) {
      setError("Failed to decline request");
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async () => {
    if (!userHasToken || !tokenInfo || !activeWallet) {
      setError("Required token not found in wallet or no active wallet");
      return;
    }

    // FIXED: Check balance before proceeding
    const userBalance = parseFloat(userTokenBalance);
    const requestedAmount = parseFloat(fundRequest.amount);

    if (userBalance < requestedAmount) {
      setError(
        `Insufficient ${fundRequest.tokenSymbol} balance. Need: ${requestedAmount}, Have: ${userBalance}`
      );
      return;
    }

    // FIXED: Use the wallet address from the fund request first
    let recipientWalletAddress = null;

    if (fundRequest.requesterWalletAddress) {
      recipientWalletAddress = fundRequest.requesterWalletAddress;
      console.log(
        "✅ Using wallet address from fund request:",
        recipientWalletAddress
      );
    } else if (requesterInfo?.walletAddress) {
      recipientWalletAddress = requesterInfo.walletAddress;
      console.log(
        "✅ Using wallet address from user lookup:",
        recipientWalletAddress
      );
    } else {
      setError("Could not determine requester's wallet address");
      return;
    }

    console.log("🚀 Fulfilling fund request:", {
      from: activeWallet.address,
      to: recipientWalletAddress,
      amount: fundRequest.amount,
      token: fundRequest.tokenSymbol,
      contractAddress: fundRequest.contractAddress,
    });

    try {
      setLoading(true);
      setStep("sending");

      // FIXED: Use enhanced service for automatic fulfillment
      const response = await fetch(
        `/api/friends/fund-request/${fundRequest.requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "fulfill",
            useEnhancedService: true, // Use enhanced service for automatic execution
          }),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ Fund request fulfilled successfully:", data);

        setTransferResult({
          success: true,
          transactionHash: data.transactionHash,
          gasUsed: data.gasUsed,
          explorerUrl: data.explorerUrl,
          actualCostETH: data.actualGasCost?.actualCostETH,
          actualCostUSD: data.actualGasCost?.actualCostUSD,
          token: data.token,
        });
        setStep("success");
        onFulfilled?.();
      } else {
        console.error("❌ Fund request fulfillment failed:", data);
        setError(data.error || "Fund request fulfillment failed");
        setStep("error");
      }
    } catch (error: any) {
      console.error("💥 Fund request fulfillment error:", error);
      setError(error.message || "Failed to fulfill request");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const isExpired = new Date() > new Date(fundRequest.expiresAt);
  const canProcess = fundRequest.status === "pending" && !isExpired;
  const hasInsufficientBalance =
    userHasToken &&
    parseFloat(userTokenBalance) < parseFloat(fundRequest.amount);

  // FIXED: Get the correct wallet address to display
  const requesterWalletAddress =
    fundRequest.requesterWalletAddress || requesterInfo?.walletAddress;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <div className="flex items-center">
            <DollarSign size={24} className="text-[#E2AF19] mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Fund Request Details
              </h3>
              <p className="text-gray-400 text-sm font-satoshi">
                {step === "review" && "Review request details"}
                {step === "sending" && "Processing transfer..."}
                {step === "success" && "Transfer completed!"}
                {step === "error" && "Transfer failed"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "review" && (
            <div className="space-y-6">
              {/* FIXED: Status warning for non-pending requests */}
              {!canProcess && (
                <div
                  className={`rounded-lg p-4 border ${
                    fundRequest.status === "fulfilled"
                      ? "bg-green-900/20 border-green-500/50"
                      : fundRequest.status === "declined"
                      ? "bg-red-900/20 border-red-500/50"
                      : fundRequest.status === "expired"
                      ? "bg-yellow-900/20 border-yellow-500/50"
                      : "bg-gray-900/20 border-gray-500/50"
                  }`}
                >
                  <div className="flex items-start">
                    <ShieldAlert
                      size={16}
                      className={`mr-2 mt-0.5 flex-shrink-0 ${
                        fundRequest.status === "fulfilled"
                          ? "text-green-400"
                          : fundRequest.status === "declined"
                          ? "text-red-400"
                          : fundRequest.status === "expired"
                          ? "text-yellow-400"
                          : "text-gray-400"
                      }`}
                    />
                    <div>
                      <p
                        className={`text-sm font-satoshi font-medium ${
                          fundRequest.status === "fulfilled"
                            ? "text-green-400"
                            : fundRequest.status === "declined"
                            ? "text-red-400"
                            : fundRequest.status === "expired"
                            ? "text-yellow-400"
                            : "text-gray-400"
                        }`}
                      >
                        {fundRequest.status === "fulfilled" &&
                          "✅ Request Already Fulfilled"}
                        {fundRequest.status === "declined" &&
                          "❌ Request Was Declined"}
                        {fundRequest.status === "expired" &&
                          "⏰ Request Has Expired"}
                        {fundRequest.status === "failed" && "💥 Request Failed"}
                      </p>
                      {fundRequest.status === "fulfilled" &&
                        fundRequest.transactionHash && (
                          <p className="text-green-400 text-xs font-satoshi mt-1">
                            Transaction:{" "}
                            {fundRequest.transactionHash.slice(0, 20)}...
                          </p>
                        )}
                      {fundRequest.error && (
                        <p className="text-red-400 text-xs font-satoshi mt-1">
                          Error: {fundRequest.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Request Details */}
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                    <User size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold font-satoshi">
                      @{fundRequest.requesterUsername}
                    </div>
                    <div className="text-gray-400 text-sm font-satoshi">
                      is requesting funds
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Token:
                    </span>
                    <div className="flex items-center">
                      {tokenInfo?.image && (
                        <img
                          src={tokenInfo.image}
                          alt={fundRequest.tokenSymbol}
                          className="w-5 h-5 rounded-full mr-2"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      )}
                      <span className="text-white font-semibold font-satoshi">
                        {fundRequest.tokenName || fundRequest.tokenSymbol} (
                        {fundRequest.tokenSymbol})
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Amount:
                    </span>
                    <span className="text-white font-semibold font-satoshi">
                      {fundRequest.amount} {fundRequest.tokenSymbol}
                    </span>
                  </div>

                  {fundRequest.message && (
                    <div>
                      <span className="text-gray-400 text-sm font-satoshi">
                        Message:
                      </span>
                      <p className="text-white text-sm font-satoshi mt-1">
                        "{fundRequest.message}"
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Requested:
                    </span>
                    <span className="text-white text-sm font-satoshi">
                      {new Date(fundRequest.requestedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Expires:
                    </span>
                    <span
                      className={`text-sm font-satoshi ${
                        isExpired ? "text-red-400" : "text-white"
                      }`}
                    >
                      {new Date(fundRequest.expiresAt).toLocaleDateString()}
                      {isExpired && " (Expired)"}
                    </span>
                  </div>

                  {/* FIXED: Show transfer details with correct addresses */}
                  <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2C2C2C]">
                    <div className="text-sm font-satoshi mb-2">
                      <span className="text-[#E2AF19] font-medium">
                        Transfer Details:
                      </span>
                    </div>

                    {/* From (Current User) */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm font-satoshi">
                        From (You):
                      </span>
                      <div className="flex items-center">
                        <span className="text-white text-sm font-satoshi font-mono mr-2">
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
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* To (Requester) */}
                    {loadingRequester && !requesterWalletAddress && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm font-satoshi">
                          To (Requester):
                        </span>
                        <span className="text-gray-400 text-sm font-satoshi">
                          Loading...
                        </span>
                      </div>
                    )}

                    {requesterWalletAddress && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm font-satoshi">
                          To (Requester):
                        </span>
                        <div className="flex items-center">
                          <span className="text-white text-sm font-satoshi font-mono mr-2">
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
                            <Copy size={14} />
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

              {/* FIXED: Enhanced Token Balance Check */}
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm font-satoshi">
                    Your {fundRequest.tokenSymbol} Balance:
                  </span>
                  <span
                    className={`font-semibold font-satoshi ${
                      userHasToken ? "text-white" : "text-red-400"
                    }`}
                  >
                    {userHasToken
                      ? `${userTokenBalance} ${fundRequest.tokenSymbol}`
                      : "Token not found"}
                  </span>
                </div>

                {!userHasToken && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mt-3">
                    <div className="flex items-start">
                      <AlertIcon
                        size={16}
                        className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-red-400 text-sm font-satoshi">
                        You don't have {fundRequest.tokenSymbol} in your wallet.
                        You need to acquire this token first to fulfill this
                        request.
                      </p>
                    </div>
                  </div>
                )}

                {userHasToken && hasInsufficientBalance && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mt-3">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={16}
                        className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-red-400 text-sm font-satoshi">
                        Insufficient balance. You need{" "}
                        {parseFloat(fundRequest.amount) -
                          parseFloat(userTokenBalance)}{" "}
                        more {fundRequest.tokenSymbol}.
                      </p>
                    </div>
                  </div>
                )}

                {userHasToken && !hasInsufficientBalance && (
                  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3 mt-3">
                    <div className="flex items-start">
                      <CheckCircle
                        size={16}
                        className="text-green-400 mr-2 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-green-400 text-sm font-satoshi">
                        ✅ You have sufficient balance to fulfill this request.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Address Resolution Error */}
              {!loadingRequester && !requesterWalletAddress && canProcess && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={16}
                      className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-red-400 text-sm font-satoshi">
                      Could not find wallet address for @
                      {fundRequest.requesterUsername}. They may need to add
                      their wallet to their profile.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm font-satoshi">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              {canProcess && (
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="secondary"
                    onClick={handleDecline}
                    disabled={loading}
                    className="flex-1"
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={handleFulfill}
                    disabled={
                      loading ||
                      !userHasToken ||
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
                      : `Send ${fundRequest.tokenSymbol}`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "sending" && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19] mx-auto mb-4"></div>
              <h4 className="text-white font-semibold font-satoshi mb-2">
                Processing Transfer
              </h4>
              <p className="text-gray-400 text-sm font-satoshi">
                Sending {fundRequest.amount} {fundRequest.tokenSymbol} to @
                {fundRequest.requesterUsername}...
              </p>
            </div>
          )}

          {step === "success" && transferResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Transfer Successful!
                </h4>
                <p className="text-gray-400 text-sm font-satoshi">
                  You've successfully sent {fundRequest.amount}{" "}
                  {fundRequest.tokenSymbol} to @{fundRequest.requesterUsername}
                </p>
              </div>

              {/* Transaction Details */}
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Transaction Hash:
                    </span>
                    <div className="flex items-center">
                      <span className="text-white text-sm font-satoshi font-mono mr-2">
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
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {transferResult.gasUsed && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Gas Used:
                      </span>
                      <span className="text-white text-sm font-satoshi">
                        {transferResult.gasUsed.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {transferResult.blockNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Block Number:
                      </span>
                      <span className="text-white text-sm font-satoshi">
                        {transferResult.blockNumber.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {transferResult.actualCostETH && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Gas Fee (ETH):
                      </span>
                      <span className="text-white text-sm font-satoshi">
                        {transferResult.actualCostETH}
                      </span>
                    </div>
                  )}

                  {transferResult.actualCostUSD && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Gas Fee (USD):
                      </span>
                      <span className="text-white text-sm font-satoshi">
                        {transferResult.actualCostUSD}
                      </span>
                    </div>
                  )}

                  {transferResult.token && (
                    <div className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2C2C2C]">
                      <div className="text-sm font-satoshi mb-1">
                        <span className="text-[#E2AF19] font-medium">
                          Token Transferred:
                        </span>
                      </div>
                      <div className="text-white text-sm font-satoshi">
                        {transferResult.token.name} (
                        {transferResult.token.symbol})
                      </div>
                      <div className="text-gray-400 text-xs font-satoshi font-mono mt-1">
                        {transferResult.token.contractAddress}
                      </div>
                    </div>
                  )}

                  {copied === "hash" && (
                    <p className="text-green-400 text-xs font-satoshi">
                      Transaction hash copied!
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {transferResult.explorerUrl && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      window.open(transferResult.explorerUrl, "_blank")
                    }
                    className="flex-1"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    View on Explorer
                  </Button>
                )}
                {!transferResult.explorerUrl &&
                  transferResult.transactionHash && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        window.open(
                          `https://etherscan.io/tx/${transferResult.transactionHash}`,
                          "_blank"
                        )
                      }
                      className="flex-1"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      View on Etherscan
                    </Button>
                  )}
                <Button onClick={onClose} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} className="text-red-400" />
                </div>
                <h4 className="text-white font-semibold font-satoshi mb-2">
                  Transfer Failed
                </h4>
                <p className="text-gray-400 text-sm font-satoshi mb-4">
                  We couldn't complete your transfer. Please try again.
                </p>
                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={16}
                        className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-red-400 text-sm font-satoshi font-medium mb-1">
                          Error Details:
                        </p>
                        <p className="text-red-400 text-sm font-satoshi">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Troubleshooting Tips */}
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                <div className="text-sm font-satoshi mb-2">
                  <span className="text-[#E2AF19] font-medium">
                    Troubleshooting Tips:
                  </span>
                </div>
                <ul className="text-gray-400 text-sm font-satoshi space-y-1">
                  <li>• Check your wallet balance and network connection</li>
                  <li>• Ensure you have enough ETH for gas fees</li>
                  <li>• Verify the recipient's wallet address is correct</li>
                  <li>• Try refreshing your wallet balances</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
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
                    setTransferResult(null);
                  }}
                  className="flex-1"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
