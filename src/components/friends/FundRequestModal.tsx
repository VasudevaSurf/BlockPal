// src/components/friends/FundRequestModal.tsx - FIXED VERSION
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
    status: "pending" | "fulfilled" | "declined" | "expired";
    requestedAt: string;
    expiresAt: string;
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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setTransferResult(null);
      setError("");
      setRequesterInfo(null);
      // Fetch requester wallet address
      fetchRequesterInfo();
    }
  }, [isOpen]);

  const fetchRequesterInfo = async () => {
    try {
      setLoadingRequester(true);
      console.log(
        "🔍 Fetching requester info for:",
        fundRequest.requesterUsername
      );

      // Call your API to get user wallet address by username
      const response = await fetch(
        `/api/users/by-username/${fundRequest.requesterUsername}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const userData = await response.json();
        setRequesterInfo({
          username: userData.username,
          walletAddress: userData.walletAddress,
          displayName: userData.displayName,
        });
        console.log("✅ Requester info fetched:", userData.walletAddress);
      } else {
        // Fallback: try to find the wallet address from friends or other sources
        console.warn("⚠️ Could not fetch user info, trying friends API...");
        await fetchRequesterFromFriends();
      }
    } catch (error) {
      console.error("❌ Error fetching requester info:", error);
      setError("Could not find requester's wallet address");
    } finally {
      setLoadingRequester(false);
    }
  };

  const fetchRequesterFromFriends = async () => {
    try {
      // Try to get wallet address from friends list
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
          console.log(
            "✅ Found requester wallet from friends:",
            friend.walletAddress
          );
        } else {
          setError(
            "Could not find requester's wallet address. They may need to add their wallet to their profile."
          );
        }
      }
    } catch (error) {
      console.error("❌ Error fetching from friends:", error);
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

  const getTokenInfo = () => {
    // Find the token in user's wallet
    const token = tokens.find((t) => t.symbol === fundRequest.tokenSymbol);
    return token || null;
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
    const tokenInfo = getTokenInfo();
    if (!tokenInfo || !activeWallet) {
      setError("Token not found in wallet or no active wallet");
      return;
    }

    if (!requesterInfo?.walletAddress) {
      setError("Could not determine requester's wallet address");
      return;
    }

    // Check if user has enough balance
    if (
      parseFloat(tokenInfo.balanceFormatted) < parseFloat(fundRequest.amount)
    ) {
      setError(`Insufficient ${fundRequest.tokenSymbol} balance`);
      return;
    }

    try {
      setLoading(true);
      setStep("sending");

      console.log("🚀 Starting fund request fulfillment:", {
        tokenSymbol: fundRequest.tokenSymbol,
        amount: fundRequest.amount,
        requesterWallet: requesterInfo.walletAddress,
        senderWallet: activeWallet.address,
      });

      // First, get the private key
      const keyResponse = await fetch("/api/wallets/private-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      if (!keyResponse.ok) {
        const keyError = await keyResponse.json();
        throw new Error(
          keyError.error || "Failed to retrieve wallet credentials"
        );
      }

      const keyData = await keyResponse.json();

      if (!keyData.success || !keyData.privateKey) {
        throw new Error("Private key not found in response");
      }

      console.log("✅ Private key retrieved successfully");

      // Execute the transfer
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
            isETH: tokenInfo.contractAddress === "native",
          },
          recipientAddress: requesterInfo.walletAddress, // FIXED: Use actual wallet address
          amount: fundRequest.amount,
          fromAddress: activeWallet.address,
          privateKey: keyData.privateKey,
          useStoredKey: true,
        }),
        credentials: "include",
      });

      const transferData = await transferResponse.json();

      console.log("📡 Transfer response:", {
        success: transferData.success,
        hasResult: !!transferData.result,
        error: transferData.error,
      });

      if (transferData.success && transferData.result) {
        setTransferResult(transferData.result);
        setStep("success");

        console.log("✅ Transfer successful, updating fund request status...");

        // Update the fund request status
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
          console.log("✅ Fund request status updated");
          onFulfilled?.();
        } else {
          console.warn("⚠️ Failed to update fund request status");
        }
      } else {
        console.error("❌ Transfer failed:", transferData.error);
        setError(transferData.error || "Transfer failed");
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
  const tokenInfo = getTokenInfo();
  const hasInsufficientBalance =
    tokenInfo &&
    parseFloat(tokenInfo.balanceFormatted) < parseFloat(fundRequest.amount);

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
                Fund Request
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

                  {/* FIXED: Show requester wallet address */}
                  {loadingRequester && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Recipient Wallet:
                      </span>
                      <span className="text-gray-400 text-sm font-satoshi">
                        Loading...
                      </span>
                    </div>
                  )}

                  {requesterInfo?.walletAddress && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Recipient Wallet:
                      </span>
                      <div className="flex items-center">
                        <span className="text-white text-sm font-satoshi font-mono mr-2">
                          {requesterInfo.walletAddress.slice(0, 8)}...
                          {requesterInfo.walletAddress.slice(-6)}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              requesterInfo.walletAddress,
                              "wallet"
                            )
                          }
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Token Balance Check */}
              {tokenInfo && (
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm font-satoshi">
                      Your {fundRequest.tokenSymbol} Balance:
                    </span>
                    <span className="text-white font-semibold font-satoshi">
                      {tokenInfo.balanceFormatted} {fundRequest.tokenSymbol}
                    </span>
                  </div>

                  {hasInsufficientBalance && (
                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mt-3">
                      <div className="flex items-start">
                        <AlertTriangle
                          size={16}
                          className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                        />
                        <p className="text-red-400 text-sm font-satoshi">
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
                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={16}
                      className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-yellow-400 text-sm font-satoshi">
                      You don't have any {fundRequest.tokenSymbol} in your
                      wallet.
                    </p>
                  </div>
                </div>
              )}

              {/* Address Resolution Error */}
              {!loadingRequester && !requesterInfo?.walletAddress && (
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
                    isExpired ||
                    !tokenInfo ||
                    hasInsufficientBalance ||
                    loadingRequester ||
                    !requesterInfo?.walletAddress
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

                  {transferResult.actualCostUSD && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Transaction Fee:
                      </span>
                      <span className="text-white text-sm font-satoshi">
                        {transferResult.actualCostUSD}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {transferResult.transactionHash && (
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
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                )}
              </div>

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
  );
}
