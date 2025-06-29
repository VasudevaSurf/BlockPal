// Enhanced FundRequestModal.tsx - Fixed gas balance validation
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
  Fuel,
  Info,
} from "lucide-react";
import { RootState } from "@/store";
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

interface BalanceCheck {
  tokenBalance: number;
  ethBalance: number;
  estimatedGas: string;
  gasCostETH: string;
  gasCostUSD: string;
  hasToken: boolean;
  hasSufficientToken: boolean;
  hasSufficientGas: boolean;
  canExecute: boolean;
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
  const [transferResult, setTransferResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [balanceCheck, setBalanceCheck] = useState<BalanceCheck | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Enhanced balance checking with gas estimation
  useEffect(() => {
    if (isOpen && activeWallet && fundRequest) {
      checkBalancesWithGas();
    }
  }, [isOpen, activeWallet, fundRequest, tokens]);

  const checkBalancesWithGas = async () => {
    if (!activeWallet || !tokens) return;

    setLoadingBalance(true);
    try {
      console.log("🔍 Checking balances and gas for fund request:", {
        token: fundRequest.tokenSymbol,
        amount: fundRequest.amount,
        contractAddress: fundRequest.contractAddress,
      });

      // FIXED: Use the same balance checking logic as the backend
      const tokenInfo = {
        name: fundRequest.tokenName || fundRequest.tokenSymbol,
        symbol: fundRequest.tokenSymbol,
        contractAddress: fundRequest.contractAddress || "native",
        decimals: fundRequest.decimals || 18,
        isETH:
          fundRequest.tokenSymbol === "ETH" ||
          fundRequest.contractAddress === "native" ||
          !fundRequest.contractAddress,
      };

      // Call the backend balance check API for accuracy
      const balanceResponse = await fetch("/api/transfer/balance-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenInfo,
          walletAddress: activeWallet.address,
          amount: fundRequest.amount,
        }),
        credentials: "include",
      });

      let tokenBalance = 0;
      let hasSufficientToken = false;

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        tokenBalance = parseFloat(balanceData.currentBalance || "0");
        hasSufficientToken = balanceData.sufficient;
        console.log("✅ Backend balance check:", {
          available: balanceData.currentBalance,
          required: fundRequest.amount,
          sufficient: balanceData.sufficient,
        });
      } else {
        // Fallback to frontend token data
        console.warn("Backend balance check failed, using frontend data");
        const userToken = tokens.find((t) => {
          if (tokenInfo.isETH) {
            return t.symbol === "ETH" || t.contractAddress === "native";
          } else {
            return (
              t.symbol === fundRequest.tokenSymbol &&
              (t.contractAddress === fundRequest.contractAddress ||
                t.id === fundRequest.contractAddress)
            );
          }
        });
        tokenBalance = userToken ? parseFloat(userToken.balance.toString()) : 0;
        hasSufficientToken = tokenBalance >= parseFloat(fundRequest.amount);
      }

      // Find user's ETH balance for gas
      const ethToken = tokens.find(
        (t) => t.symbol === "ETH" || t.contractAddress === "native"
      );
      const ethBalance = ethToken ? parseFloat(ethToken.balance.toString()) : 0;

      const requestedAmount = parseFloat(fundRequest.amount);

      // Get gas estimation
      let gasEstimation = {
        estimatedGas: tokenInfo.isETH ? "21000" : "65000",
        gasCostETH: tokenInfo.isETH ? "0.00042" : "0.0013",
        gasCostUSD: tokenInfo.isETH ? "1.47" : "4.55",
      };

      try {
        // Try to get real gas estimation
        const gasResponse = await fetch("/api/transfer/simple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            tokenInfo,
            recipientAddress: fundRequest.requesterWalletAddress,
            amount: fundRequest.amount,
            fromAddress: activeWallet.address,
          }),
          credentials: "include",
        });

        if (gasResponse.ok) {
          const gasData = await gasResponse.json();
          gasEstimation = gasData.preview?.gasEstimation || gasEstimation;
        }
      } catch (error) {
        console.warn("Could not get real gas estimation, using defaults");
      }

      const gasCostETH = parseFloat(gasEstimation.gasCostETH);

      // For ETH transfers, we need amount + gas
      // For ERC20 transfers, we need token amount + ETH for gas
      const hasSufficientGas = tokenInfo.isETH
        ? ethBalance >= requestedAmount + gasCostETH // ETH needs amount + gas
        : ethBalance >= gasCostETH; // ERC20 just needs gas in ETH

      const balanceResult: BalanceCheck = {
        tokenBalance,
        ethBalance,
        estimatedGas: gasEstimation.estimatedGas,
        gasCostETH: gasEstimation.gasCostETH,
        gasCostUSD: gasEstimation.gasCostUSD,
        hasToken: tokenBalance > 0,
        hasSufficientToken,
        hasSufficientGas,
        canExecute: hasSufficientToken && hasSufficientGas,
      };

      console.log("✅ Balance check result:", {
        tokenBalance,
        ethBalance,
        requestedAmount,
        gasCostETH,
        hasSufficientToken,
        hasSufficientGas,
        canExecute: balanceResult.canExecute,
        isETH: tokenInfo.isETH,
      });

      setBalanceCheck(balanceResult);
    } catch (error) {
      console.error("Error checking balances:", error);
    } finally {
      setLoadingBalance(false);
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
          body: JSON.stringify({ action: "decline" }),
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
    if (!balanceCheck?.canExecute) {
      setError("Insufficient balance to fulfill this request");
      return;
    }

    try {
      setLoading(true);
      setStep("sending");

      const response = await fetch(
        `/api/friends/fund-request/${fundRequest.requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "fulfill",
            useEnhancedService: true,
          }),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setTransferResult(data);
        setStep("success");
        onFulfilled?.();
      } else {
        setError(data.error || "Fund request fulfillment failed");
        setStep("error");
      }
    } catch (error: any) {
      setError(error.message || "Failed to fulfill request");
      setStep("error");
    } finally {
      setLoading(false);
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

  const isExpired = new Date() > new Date(fundRequest.expiresAt);
  const canProcess = fundRequest.status === "pending" && !isExpired;

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
              {/* Status warning for non-pending requests */}
              {!canProcess && (
                <div
                  className={`rounded-lg p-4 border ${
                    fundRequest.status === "fulfilled"
                      ? "bg-green-900/20 border-green-500/50"
                      : fundRequest.status === "declined"
                      ? "bg-red-900/20 border-red-500/50"
                      : "bg-yellow-900/20 border-yellow-500/50"
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
                          : "text-yellow-400"
                      }`}
                    />
                    <div>
                      <p
                        className={`text-sm font-satoshi font-medium ${
                          fundRequest.status === "fulfilled"
                            ? "text-green-400"
                            : fundRequest.status === "declined"
                            ? "text-red-400"
                            : "text-yellow-400"
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
                    <span className="text-white font-semibold font-satoshi">
                      {fundRequest.tokenName || fundRequest.tokenSymbol} (
                      {fundRequest.tokenSymbol})
                    </span>
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
                </div>
              </div>

              {/* Enhanced Balance Check Display */}
              {loadingBalance ? (
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <div className="flex items-center">
                    <RefreshCw
                      size={16}
                      className="animate-spin text-[#E2AF19] mr-2"
                    />
                    <span className="text-white font-satoshi">
                      Checking balances...
                    </span>
                  </div>
                </div>
              ) : balanceCheck ? (
                <div className="space-y-4">
                  {/* Token Balance Check */}
                  <div
                    className={`rounded-lg p-4 border ${
                      balanceCheck.hasSufficientToken
                        ? "bg-green-900/20 border-green-500/50"
                        : "bg-red-900/20 border-red-500/50"
                    }`}
                  >
                    <div className="flex items-start">
                      {balanceCheck.hasSufficientToken ? (
                        <CheckCircle
                          size={16}
                          className="text-green-400 mr-2 mt-0.5 flex-shrink-0"
                        />
                      ) : (
                        <AlertIcon
                          size={16}
                          className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <p
                          className={`text-sm font-satoshi font-medium ${
                            balanceCheck.hasSufficientToken
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {fundRequest.tokenSymbol} Balance
                        </p>
                        <p
                          className={`text-xs font-satoshi mt-1 ${
                            balanceCheck.hasSufficientToken
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          Available: {balanceCheck.tokenBalance.toFixed(6)}{" "}
                          {fundRequest.tokenSymbol}
                          <br />
                          Required: {fundRequest.amount}{" "}
                          {fundRequest.tokenSymbol}
                          {balanceCheck.hasSufficientToken
                            ? " ✅ Sufficient"
                            : ` ❌ Need ${(
                                parseFloat(fundRequest.amount) -
                                balanceCheck.tokenBalance
                              ).toFixed(6)} more`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gas Balance Check */}
                  <div
                    className={`rounded-lg p-4 border ${
                      balanceCheck.hasSufficientGas
                        ? "bg-green-900/20 border-green-500/50"
                        : "bg-red-900/20 border-red-500/50"
                    }`}
                  >
                    <div className="flex items-start">
                      {balanceCheck.hasSufficientGas ? (
                        <CheckCircle
                          size={16}
                          className="text-green-400 mr-2 mt-0.5 flex-shrink-0"
                        />
                      ) : (
                        <Fuel
                          size={16}
                          className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <p
                          className={`text-sm font-satoshi font-medium ${
                            balanceCheck.hasSufficientGas
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          Gas Fee (ETH Balance)
                        </p>
                        <p
                          className={`text-xs font-satoshi mt-1 ${
                            balanceCheck.hasSufficientGas
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          Available: {balanceCheck.ethBalance.toFixed(6)} ETH
                          <br />
                          Required: {balanceCheck.gasCostETH} ETH ($
                          {balanceCheck.gasCostUSD})
                          {balanceCheck.hasSufficientGas
                            ? " ✅ Sufficient for gas"
                            : ` ❌ Need ${(
                                parseFloat(balanceCheck.gasCostETH) -
                                balanceCheck.ethBalance
                              ).toFixed(6)} more ETH`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gas Explanation */}
                  <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                    <div className="flex items-start">
                      <Info
                        size={16}
                        className="text-blue-400 mr-2 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-blue-400 text-sm font-satoshi font-medium mb-1">
                          Gas Fee Information
                        </p>
                        <p className="text-blue-400 text-xs font-satoshi">
                          {fundRequest.tokenSymbol === "ETH"
                            ? "For ETH transfers, you need enough ETH to cover both the transfer amount and gas fees."
                            : `For ${fundRequest.tokenSymbol} transfers, you need enough ${fundRequest.tokenSymbol} for the transfer amount plus enough ETH to pay for gas fees.`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

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
                      !balanceCheck?.canExecute ||
                      !activeWallet?.address
                    }
                    className="flex-1"
                  >
                    {loading
                      ? "Processing..."
                      : !balanceCheck?.canExecute
                      ? "Insufficient Balance"
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

              {transferResult.transactionHash && (
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Transaction Hash:
                      </span>
                      <div className="flex items-center">
                        <span className="text-white text-sm font-satoshi font-mono mr-2">
                          {transferResult.transactionHash.slice(0, 8)}...
                          {transferResult.transactionHash.slice(-6)}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              transferResult.transactionHash,
                              "hash"
                            )
                          }
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                    {copied === "hash" && (
                      <p className="text-green-400 text-xs font-satoshi">
                        Hash copied!
                      </p>
                    )}
                  </div>
                </div>
              )}

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
