// src/app/dashboard/batch-payments/page.tsx - UPDATED WITH PROCESSING STEP
"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Bell,
  HelpCircle,
  ExternalLink,
  Hash,
  Plus,
  ChevronDown,
  X,
  Send,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  GripHorizontal,
  Trash2,
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import UsernameInput from "@/components/ui/UsernameInput";
import { UserSuggestion } from "@/hooks/useUsernameSearch";
import TransactionHistory from "@/components/transactions/TransactionHistory";

interface BatchPayment {
  id: string;
  tokenInfo: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
    isETH: boolean;
    logoUrl?: string;
  };
  recipient: string;
  amount: string;
  usdValue: number;
  selectedUser?: UserSuggestion | null;
}

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

const getTokenIcon = (symbol: string, contractAddress?: string) => {
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

const getRandomTokenBgColor = (symbol: string) => {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-lime-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-sky-500",
  ];

  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getTokenBackgroundColor = (symbol: string, contractAddress?: string) => {
  const colors: Record<string, string> = {
    ETH: "bg-gradient-to-br from-blue-500/20 to-blue-600/30",
    ETHEREUM: "bg-gradient-to-br from-blue-500/20 to-blue-600/30",
    SOL: "bg-gradient-to-br from-purple-500/20 to-purple-600/30",
    BTC: "bg-gradient-to-br from-orange-500/20 to-orange-600/30",
    SUI: "bg-gradient-to-br from-cyan-500/20 to-cyan-600/30",
    XRP: "bg-gradient-to-br from-gray-500/20 to-gray-600/30",
    ADA: "bg-gradient-to-br from-blue-600/20 to-blue-700/30",
    AVAX: "bg-gradient-to-br from-red-500/20 to-red-600/30",
    TON: "bg-gradient-to-br from-blue-400/20 to-blue-500/30",
    DOT: "bg-gradient-to-br from-pink-500/20 to-pink-600/30",
    USDT: "bg-gradient-to-br from-green-500/20 to-green-600/30",
    USDC: "bg-gradient-to-br from-blue-600/20 to-blue-700/30",
    YAI: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/30",
    LINK: "bg-gradient-to-br from-blue-700/20 to-blue-800/30",
  };

  // Special handling for ETH/native token
  if (
    symbol === "ETH" ||
    contractAddress === "native" ||
    symbol === "ETHEREUM"
  ) {
    return colors.ETH || "bg-gradient-to-br from-blue-500/20 to-blue-600/30";
  }

  return colors[symbol] || "bg-gradient-to-br from-gray-500/20 to-gray-600/30";
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

const TokenIconWithBg = ({
  token,
  size = "w-3 h-3",
}: {
  token: any;
  size?: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const hasValidImage =
    !imageError && isValidImageUrl(token.icon || token.logoUrl);

  return (
    <div
      className={`${size} ${getRandomTokenBgColor(
        token.symbol
      )} rounded-full mr-1.5 flex-shrink-0 relative overflow-hidden shadow-sm border border-white/10 flex items-center justify-center`}
    >
      {hasValidImage ? (
        <img
          src={token.icon || token.logoUrl}
          alt={token.symbol}
          className="w-full h-full object-cover rounded-full"
          onError={() => {
            setImageError(true);
          }}
        />
      ) : (
        <span className="text-white text-xs font-medium">
          {getTokenLetter(token.symbol, token.contractAddress)}
        </span>
      )}
    </div>
  );
};

const TokenIcon = ({
  token,
  size = "w-3 h-3",
}: {
  token: any;
  size?: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const hasValidImage =
    !imageError && isValidImageUrl(token.icon || token.logoUrl);

  if (hasValidImage) {
    return (
      <img
        src={token.icon || token.logoUrl}
        alt={token.symbol}
        className={`${size} rounded-full object-cover`}
        onError={() => {
          setImageError(true);
        }}
      />
    );
  }

  return (
    <span className="text-white text-xs font-medium">
      {getTokenLetter(token.symbol, token.contractAddress)}
    </span>
  );
};

export default function BatchPaymentsPage() {
  const { activeWallet, tokens } = useSelector(
    (state: RootState) => state.wallet
  );

  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
  });
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [batchPayments, setBatchPayments] = useState<BatchPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [preview, setPreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [processing, setProcessing] = useState(false); // NEW: Processing state
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);

  const [batchPanelHeight, setBatchPanelHeight] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tokens.length > 0 && !selectedToken) {
      const firstToken = tokens[0];
      setSelectedToken({
        name: firstToken.name,
        symbol: firstToken.symbol,
        contractAddress: firstToken.contractAddress || firstToken.id,
        decimals: firstToken.decimals || 18,
        isETH: firstToken.symbol === "ETH",
        balance: firstToken.balance,
        price: firstToken.price,
        logoUrl: firstToken.icon || firstToken.logoUrl,
      });
    }
  }, [tokens, selectedToken]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newHeight =
      ((e.clientY - containerRect.top) / containerRect.height) * 100;

    const constrainedHeight = Math.max(20, Math.min(80, newHeight));
    setBatchPanelHeight(constrainedHeight);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleRecipientChange = (
    value: string,
    suggestion?: UserSuggestion
  ) => {
    setFormData({ ...formData, recipient: value });

    if (suggestion) {
      setSelectedUser(suggestion);
    } else {
      setSelectedUser(null);
    }

    if (error) {
      setError("");
    }
  };

  const handleUserSelect = (user: UserSuggestion) => {
    setSelectedUser(user);
    setFormData({ ...formData, recipient: user.walletAddress });
  };

  const addToBatch = () => {
    if (!formData.recipient || !formData.amount || !selectedToken) {
      setError("Please fill in all fields");
      return;
    }

    let finalRecipientAddress = formData.recipient;
    let finalSelectedUser = selectedUser;

    if (selectedUser) {
      if (
        !selectedUser.walletAddress ||
        !/^0x[a-fA-F0-9]{40}$/.test(selectedUser.walletAddress)
      ) {
        setError("Selected user has an invalid wallet address");
        return;
      }
      finalRecipientAddress = selectedUser.walletAddress;
    } else {
      if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipient)) {
        setError(
          "Invalid recipient address format. Please enter a valid address or select a user"
        );
        return;
      }
      finalSelectedUser = null;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Invalid amount");
      return;
    }

    if (amount > selectedToken.balance) {
      setError(
        `Insufficient balance. Available: ${selectedToken.balance} ${selectedToken.symbol}`
      );
      return;
    }

    const duplicate = batchPayments.find(
      (payment) =>
        payment.recipient.toLowerCase() ===
          finalRecipientAddress.toLowerCase() &&
        payment.tokenInfo.contractAddress === selectedToken.contractAddress
    );

    if (duplicate) {
      setError(
        `Transfer to this address for ${selectedToken.symbol} already exists`
      );
      return;
    }

    const usdValue = amount * (selectedToken.price || 0);

    const newPayment: BatchPayment = {
      id: `payment-${Date.now()}`,
      tokenInfo: {
        name: selectedToken.name,
        symbol: selectedToken.symbol,
        contractAddress: selectedToken.contractAddress,
        decimals: selectedToken.decimals,
        isETH: selectedToken.isETH,
        logoUrl: selectedToken.logoUrl,
      },
      recipient: finalRecipientAddress.toLowerCase(),
      amount: formData.amount,
      usdValue,
      selectedUser: finalSelectedUser,
    };

    setBatchPayments([...batchPayments, newPayment]);
    setFormData({ recipient: "", amount: "" });
    setSelectedUser(null);
    setError("");
  };

  const removeFromBatch = (id: string) => {
    setBatchPayments(batchPayments.filter((payment) => payment.id !== id));
  };

  const createPreview = async () => {
    if (batchPayments.length < 2) {
      setError("Minimum 2 transfers required for batch processing");
      return;
    }

    if (!activeWallet?.address) {
      setError("No active wallet found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/transfer/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "preview",
          payments: batchPayments,
          fromAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create preview");
      }

      setPreview(data.preview);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || "Failed to create preview");
    } finally {
      setLoading(false);
    }
  };

  const parseErrorMessage = (error: string): string => {
    if (error.includes("insufficient funds")) {
      return "Insufficient funds for this transaction. Please check your wallet balance and try again.";
    }
    if (error.includes("gas")) {
      return "Not enough ETH to pay for transaction fees. Please add more ETH to your wallet.";
    }
    if (error.includes("execution reverted")) {
      return "Transaction failed. Please check token balances and try again.";
    }
    if (error.includes("nonce too low")) {
      return "Transaction failed due to network issues. Please try again.";
    }
    if (error.includes("replacement transaction underpriced")) {
      return "Transaction is pending. Please wait before sending another transaction.";
    }
    if (error.includes("network error") || error.includes("timeout")) {
      return "Network connection error. Please check your internet and try again.";
    }
    if (error.includes("user denied") || error.includes("user rejected")) {
      return "Transaction was cancelled by user.";
    }

    return "Transaction failed. Please try again or contact support if the issue persists.";
  };

  const executeBatch = async () => {
    if (!preview) return;

    setExecuting(true);
    setError("");

    try {
      const response = await fetch(`/api/wallets/private-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: activeWallet?.address,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const privateKey = prompt(
          "Please enter your wallet private key to execute the batch transfer:"
        );

        if (!privateKey) {
          setShowPreview(false);
          setResult({
            success: false,
            error: "Private key is required for transaction execution",
          });
          setShowResult(true);
          setExecuting(false);
          return;
        }

        await executeBatchWithKey(privateKey);
      } else {
        const keyData = await response.json();

        if (keyData.success && keyData.privateKey) {
          await executeBatchWithKey(keyData.privateKey);
        } else {
          throw new Error("Failed to retrieve wallet credentials");
        }
      }
    } catch (err: any) {
      setShowPreview(false);
      setResult({
        success: false,
        error: parseErrorMessage(err.message || "Transaction failed"),
      });
      setShowResult(true);
      setExecuting(false);
    }
  };

  const executeBatchWithKey = async (privateKey: string) => {
    try {
      // NEW: Show processing modal and hide preview
      setShowPreview(false);
      setProcessing(true);
      setExecuting(false);

      const response = await fetch("/api/transfer/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "execute",
          payments: batchPayments,
          privateKey: privateKey,
          fromAddress: activeWallet?.address,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Batch execution failed");
      }

      // NEW: Hide processing modal and show result
      setProcessing(false);
      setResult(data.result);
      setShowResult(true);
      setBatchPayments([]);
    } catch (err: any) {
      // NEW: Hide processing modal and show error result
      setProcessing(false);
      setResult({
        success: false,
        error: parseErrorMessage(err.message || "Transaction failed"),
      });
      setShowResult(true);
    } finally {
      setExecuting(false);
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

  const resetBatch = () => {
    setBatchPayments([]);
    setPreview(null);
    setShowPreview(false);
    setResult(null);
    setShowResult(false);
    setError("");
    setSelectedUser(null);
  };

  const totalAmount = batchPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount),
    0
  );

  const getRecipientDisplay = (payment: BatchPayment) => {
    if (payment.selectedUser) {
      return {
        name: `@${payment.selectedUser.username}`,
        displayName:
          payment.selectedUser.displayName || payment.selectedUser.username,
        address: payment.recipient,
        isUser: true,
      };
    } else {
      return {
        name: `${payment.recipient.slice(0, 10)}...${payment.recipient.slice(
          -6
        )}`,
        displayName: null,
        address: payment.recipient,
        isUser: false,
      };
    }
  };

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-1.5 sm:p-2 lg:p-2.5 flex flex-col overflow-hidden">
      {isTokenDropdownOpen && (
        <div
          className="fixed inset-0 z-30 bg-white/10"
          onClick={() => setIsTokenDropdownOpen(false)}
        />
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-1.5 mb-2 flex-shrink-0">
          <div className="flex items-start">
            <AlertTriangle
              size={12}
              className="text-red-400 mr-1.5 mt-0.5 flex-shrink-0"
            />
            <p className="text-red-400 text-xs font-satoshi">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:hidden gap-2 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white mb-2 font-satoshi">
            Add Payment
          </h2>

          <div className="space-y-1.5">
            <div>
              <UsernameInput
                value={formData.recipient}
                onChange={handleRecipientChange}
                onUserSelect={handleUserSelect}
                placeholder="@username or 0x... address"
                className="font-satoshi text-gray-400 text-xs h-[36px] px-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="relative">
                <button
                  onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                  className="flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-1.5 py-1.5 w-full h-[36px]"
                >
                  <div className="flex items-center">
                    {selectedToken && (
                      <>
                        <div
                          className={`w-5 h-5 ${getTokenBackgroundColor(
                            selectedToken.symbol,
                            selectedToken.contractAddress
                          )} rounded-full flex items-center justify-center mr-2`}
                        >
                          <TokenIcon token={selectedToken} size="w-3 h-3" />
                        </div>
                        <span className="text-white font-satoshi text-xs">
                          {selectedToken.symbol}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDown size={10} className="text-gray-400" />
                </button>

                {isTokenDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-black border border-[#2C2C2C] rounded-xl shadow-lg max-h-32 overflow-y-auto scrollbar-hide">
                    {tokens.map((token) => (
                      <div
                        key={token.id}
                        className="border border-[#2C2C2C] rounded-xl m-1 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setSelectedToken({
                              name: token.name,
                              symbol: token.symbol,
                              contractAddress:
                                token.contractAddress || token.id,
                              decimals: token.decimals || 18,
                              isETH: token.symbol === "ETH",
                              balance: token.balance,
                              price: token.price,
                              logoUrl: token.icon || token.logoUrl,
                            });
                            setIsTokenDropdownOpen(false);
                          }}
                          className="w-full flex items-center p-2 hover:bg-[#1A1A1A] transition-colors text-left"
                        >
                          <div className="flex items-center flex-1">
                            <div
                              className={`w-6 h-6 ${getTokenBackgroundColor(
                                token.symbol,
                                token.contractAddress
                              )} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                            >
                              <TokenIcon token={token} size="w-4 h-4" />
                            </div>
                            <div className="flex-1 ml-1">
                              <div className="text-white font-satoshi text-xs">
                                {token.symbol}
                              </div>
                              <div className="text-gray-400 font-satoshi text-xs">
                                Balance: {token.balance.toFixed(4)}
                              </div>
                            </div>
                          </div>
                          <div className="w-2.5 h-2.5 border-2 border-[#6E6E6E] rounded-full flex items-center justify-center flex-shrink-0 ml-1.5">
                            {selectedToken?.symbol === token.symbol && (
                              <div className="w-1 h-1 bg-[#E2AF19] rounded-full" />
                            )}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Input
                type="text"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="font-satoshi text-xs h-[36px]"
              />
            </div>

            <button
              onClick={addToBatch}
              disabled={loading}
              className="w-full bg-[#E2AF19] text-black px-1.5 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center justify-center disabled:opacity-50 text-xs h-[36px]"
            >
              <Plus size={10} className="mr-1" />
              Add to Batch
            </button>
          </div>
        </div>

        {batchPayments.length > 0 && (
          <>
            <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-sm font-semibold text-white font-satoshi">
                  Batch Summary
                </h3>
                <div className="text-xs text-gray-400 font-satoshi">
                  {batchPayments.length} payments
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <div className="bg-[#0F0F0F] rounded-lg p-1.5 border border-[#2C2C2C]">
                  <div className="text-gray-400 text-xs font-satoshi mb-0.5">
                    Total Amount
                  </div>
                  <div className="text-white text-sm font-bold font-satoshi">
                    $
                    {batchPayments
                      .reduce((sum, p) => sum + p.usdValue, 0)
                      .toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={resetBatch}
                  className="flex-1 px-1.5 py-1 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity text-xs"
                >
                  Reset
                </button>
                <Button
                  onClick={createPreview}
                  disabled={loading || batchPayments.length < 2}
                  className="flex-1 font-satoshi"
                >
                  {loading ? "Loading..." : "Execute Batch"}
                </Button>
              </div>
            </div>

            <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-2.5 flex-shrink-0">
              <h3 className="text-sm font-semibold text-white mb-1.5 font-satoshi">
                Payments Queue ({batchPayments.length})
              </h3>

              <div className="space-y-1">
                {batchPayments.map((payment) => {
                  const recipientInfo = getRecipientDisplay(payment);

                  return (
                    <div
                      key={payment.id}
                      className="bg-[#0F0F0F] rounded-lg p-1.5 border border-[#2C2C2C] relative"
                    >
                      <button
                        onClick={() => removeFromBatch(payment.id)}
                        className="absolute top-0.5 right-0.5 p-0.5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X size={8} />
                      </button>

                      <div className="flex items-center mb-1 pr-3">
                        <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mr-1.5 flex items-center justify-center shadow-sm border border-white/10">
                          <span className="text-white text-xs font-medium">
                            {recipientInfo.isUser ? "@" : "0"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium font-satoshi truncate text-xs">
                            {recipientInfo.name}
                          </div>
                          {recipientInfo.isUser &&
                            recipientInfo.displayName && (
                              <div className="text-gray-400 text-xs font-satoshi truncate">
                                {recipientInfo.displayName}
                              </div>
                            )}
                          <div className="flex items-center mt-0.5">
                            <div
                              className={`w-5 h-5 ${getTokenBackgroundColor(
                                payment.tokenInfo.symbol,
                                payment.tokenInfo.contractAddress
                              )} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                            >
                              <TokenIcon
                                token={payment.tokenInfo}
                                size="w-3 h-3"
                              />
                            </div>
                            <span className="text-gray-400 text-xs font-satoshi">
                              {payment.tokenInfo.symbol}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-bold font-satoshi text-xs">
                            {payment.amount} {payment.tokenInfo.symbol}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="bg-black rounded-[12px] border border-[#2C2C2C] flex-shrink-0 overflow-hidden">
          <div className="p-1.5 h-full max-h-[250px] flex flex-col">
            <div className="h-full overflow-hidden">
              <TransactionHistory
                walletAddress={activeWallet?.address}
                transactionTypeFilter="batch"
                limit={20}
                title="Transaction History"
                showRefresh={true}
                className="h-full overflow-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="hidden xl:flex flex-col gap-0 flex-1 min-h-0 relative"
        ref={containerRef}
      >
        <div
          className="bg-black rounded-[16px] border border-[#2C2C2C] p-2.5 flex flex-col min-h-0 overflow-hidden"
          style={{ height: `${batchPanelHeight}%` }}
        >
          <div className="grid grid-cols-11 gap-1 mb-1.5 flex-shrink-0">
            <div className="col-span-6">
              <UsernameInput
                value={formData.recipient}
                onChange={handleRecipientChange}
                onUserSelect={handleUserSelect}
                placeholder="@username or address"
                className="font-satoshi text-gray-400 text-xs h-[36px] px-1.5"
              />
            </div>

            <div className="col-span-2 relative">
              <button
                onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                className="w-full h-[36px] flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-1 py-2 text-left hover:border-[#E2AF19] transition-colors"
              >
                <div className="flex items-center min-w-0">
                  {selectedToken && (
                    <>
                      <div
                        className={`w-5 h-5 ${getTokenBackgroundColor(
                          selectedToken.symbol,
                          selectedToken.contractAddress
                        )} rounded-full flex items-center justify-center mr-2`}
                      >
                        <TokenIcon token={selectedToken} size="w-3 h-3" />
                      </div>
                      <span className="text-white font-satoshi text-xs truncate">
                        {selectedToken.symbol}
                      </span>
                    </>
                  )}
                </div>
                <ChevronDown size={6} className="text-gray-400 flex-shrink-0" />
              </button>

              {isTokenDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-black border border-[#2C2C2C] rounded-xl shadow-lg max-h-32 overflow-y-auto scrollbar-hide">
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className="border border-[#2C2C2C] rounded-xl m-1 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setSelectedToken({
                            name: token.name,
                            symbol: token.symbol,
                            contractAddress: token.contractAddress || token.id,
                            decimals: token.decimals || 18,
                            isETH: token.symbol === "ETH",
                            balance: token.balance,
                            price: token.price,
                            logoUrl: token.icon || token.logoUrl,
                          });
                          setIsTokenDropdownOpen(false);
                        }}
                        className="w-full flex items-center p-2 hover:bg-[#1A1A1A] transition-colors text-left"
                      >
                        <div className="flex items-center flex-1">
                          <div
                            className={`w-6 h-6 ${getTokenBackgroundColor(
                              token.symbol,
                              token.contractAddress
                            )} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                          >
                            <TokenIcon token={token} size="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 ml-1">
                            <div className="text-white font-satoshi text-xs truncate">
                              {token.symbol}
                            </div>
                            <div className="text-gray-400 font-satoshi text-xs truncate">
                              Balance: {token.balance.toFixed(4)}
                            </div>
                          </div>
                        </div>
                        <div className="w-2.5 h-2.5 border-2 border-[#6E6E6E] rounded-full flex items-center justify-center flex-shrink-0 ml-1.5">
                          {selectedToken?.symbol === token.symbol && (
                            <div className="w-1 h-1 bg-[#E2AF19] rounded-full" />
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <Input
                type="text"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="font-satoshi text-xs h-[36px] px-1.5"
              />
            </div>

            <div className="col-span-1">
              <button
                onClick={addToBatch}
                disabled={loading}
                className="bg-[#E2AF19] text-black px-0.5 py-2 rounded-lg font-satoshi font-semibold hover:bg-[#D4A853] transition-colors flex items-center justify-center w-full h-[36px] text-xs disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="border-t border-[#2C2C2C] mb-1.5 flex-shrink-0 -mx-2.5"></div>

          <div className="bg-[#0F0F0F] rounded-lg mb-1 flex-shrink-0">
            {/* Updated grid to 4 columns instead of 4 (removed Est. Gas column) */}
            <div className="grid grid-cols-4 gap-1 px-1.5 py-1.5">
              <div className="text-gray-400 text-xs font-satoshi text-left">
                Username/Address
              </div>
              <div className="text-gray-400 text-xs font-satoshi text-left">
                Token Name
              </div>
              <div className="text-gray-400 text-xs font-satoshi text-left">
                Amount
              </div>
              {/* COMMENTED: Est. Gas column */}
              {/* <div className="text-gray-400 text-xs font-satoshi text-left">
                Est. Gas
              </div> */}
              <div className="text-gray-400 text-xs font-satoshi text-center">
                Actions
              </div>
            </div>
          </div>

          <div className="overflow-y-auto scrollbar-hide mb-2 flex-1 min-h-0">
            {batchPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                <div className="w-8 h-8 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-1.5">
                  <Plus size={14} className="text-gray-400" />
                </div>
                <h3 className="text-white text-sm font-satoshi mb-0.5">
                  No payments in batch
                </h3>
                <p className="text-gray-400 font-satoshi text-center text-xs">
                  Add recipients above to start building your batch payment
                </p>
              </div>
            ) : (
              <div>
                {batchPayments.map((payment, index) => {
                  const recipientInfo = getRecipientDisplay(payment);

                  return (
                    <div key={payment.id}>
                      {/* Updated grid to 4 columns instead of 4 (removed Est. Gas column) */}
                      <div className="grid grid-cols-4 gap-1 items-center py-1.5 px-1.5 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                        <div className="flex items-center min-w-0">
                          <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mr-1 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10">
                            <span className="text-white text-xs font-medium">
                              {recipientInfo.isUser ? "@" : "0"}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-white font-satoshi text-xs truncate block">
                              {recipientInfo.name}
                            </span>
                            {recipientInfo.isUser &&
                              recipientInfo.displayName && (
                                <span className="text-gray-400 font-satoshi text-xs truncate block">
                                  {recipientInfo.displayName}
                                </span>
                              )}
                          </div>
                        </div>

                        <div className="flex items-center min-w-0">
                          <div
                            className={`w-5 h-5 ${getTokenBackgroundColor(
                              payment.tokenInfo.symbol,
                              payment.tokenInfo.contractAddress
                            )} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                          >
                            <TokenIcon
                              token={payment.tokenInfo}
                              size="w-3 h-3"
                            />
                          </div>
                          <span className="text-white font-satoshi text-xs truncate">
                            {payment.tokenInfo.symbol}
                          </span>
                        </div>

                        <div className="text-white font-satoshi text-xs">
                          {payment.amount} {payment.tokenInfo.symbol}
                        </div>

                        {/* COMMENTED: Est. Gas column */}
                        {/* <div className="text-white font-satoshi text-xs">
                          ~ 65,000 gas
                        </div> */}

                        {/* Added Actions column with individual remove button */}
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => removeFromBatch(payment.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/10 flex items-center justify-center"
                            title="Remove this payment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {index < batchPayments.length - 1 && (
                        <div className="border-b border-[#2C2C2C] mx-1.5 my-0.5"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {batchPayments.length > 0 && (
            <div className="flex justify-end space-x-1 mt-2 flex-shrink-0">
              <button
                onClick={resetBatch}
                className="px-1.5 py-1 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity text-xs"
              >
                Reset
              </button>
              <Button
                onClick={createPreview}
                disabled={loading || batchPayments.length < 2}
                className="font-satoshi text-xs"
              >
                {loading ? "Loading..." : "Transfer"}
              </Button>
            </div>
          )}
        </div>

        <div
          ref={dragRef}
          onMouseDown={handleMouseDown}
          className={`
            relative z-10 h-1.5 flex items-center justify-center cursor-ns-resize
            transition-colors duration-200 group
            ${isDragging ? "bg-[#E2AF19]/30" : "hover:bg-[#2C2C2C]"}
          `}
        >
          <div
            className={`
            flex items-center justify-center w-10 h-4 rounded-full
            transition-all duration-200
            ${
              isDragging
                ? "bg-[#E2AF19] text-black"
                : "bg-[#2C2C2C] text-gray-400 group-hover:text-white"
            }
          `}
          >
            <GripHorizontal size={12} />
          </div>
        </div>

        <div
          className="bg-black rounded-[16px] border border-[#2C2C2C] flex flex-col min-h-0 overflow-hidden"
          style={{ height: `${100 - batchPanelHeight}%` }}
        >
          <div className="p-2.5 h-full flex flex-col overflow-hidden">
            <div className="h-full overflow-hidden">
              <TransactionHistory
                walletAddress={activeWallet?.address}
                transactionTypeFilter="batch"
                limit={50}
                title="Transaction History"
                showRefresh={true}
                className="h-full overflow-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {showPreview && preview && (
        <>
          <div
            className="fixed inset-0 z-40 bg-white/10"
            onClick={() => setShowPreview(false)}
          />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-2.5">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-[#2C2C2C]">
                <div>
                  <h2 className="text-lg font-bold text-white font-mayeka">
                    Batch Transfer Preview
                  </h2>
                  <p className="text-gray-400 text-xs font-satoshi mt-0.5">
                    Review your batch transfer details
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
                <div className="space-y-3">
                  <div className="bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C]">
                    <h3 className="text-white font-semibold font-satoshi mb-2">
                      Transfer Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Transfer Mode
                        </div>
                        <div className="text-white font-bold font-satoshi">
                          {preview.transferMode}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Total Transfers
                        </div>
                        <div className="text-white font-bold font-satoshi">
                          {preview.transfers.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Total Value
                        </div>
                        <div className="text-white font-bold font-satoshi">
                          ${preview.totalUSDValue.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Network
                        </div>
                        <div className="text-white font-bold font-satoshi">
                          {preview.network}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* <div className="bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C]">
                    <h3 className="text-white font-semibold font-satoshi mb-2">
                      Gas Estimation
                    </h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Batch Gas:
                        </span>
                        <span className="text-white font-satoshi">
                          {parseInt(
                            preview.gasEstimation.batchGas
                          ).toLocaleString()}{" "}
                          gas
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Individual Gas:
                        </span>
                        <span className="text-white font-satoshi">
                          {parseInt(
                            preview.gasEstimation.individualGas
                          ).toLocaleString()}{" "}
                          gas
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Gas Savings:
                        </span>
                        <span className="text-green-400 font-satoshi">
                          {parseInt(
                            preview.gasEstimation.gasSavings
                          ).toLocaleString()}{" "}
                          gas ({preview.gasEstimation.savingsPercent}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-xs font-satoshi">
                          Estimated Cost:
                        </span>
                        <span className="text-white font-satoshi">
                          {preview.gasEstimation.gasCostETH} ETH ($
                          {preview.gasEstimation.gasCostUSD})
                        </span>
                      </div>
                    </div>
                  </div> */}

                  <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-2.5">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={12}
                        className="text-yellow-400 mr-1.5 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-yellow-400 text-xs font-satoshi font-medium mb-0.5">
                          Transaction Confirmation Required
                        </p>
                        <p className="text-yellow-400 text-xs font-satoshi">
                          This will execute a real batch transfer on the
                          blockchain. Please verify all details before
                          proceeding.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-[#2C2C2C] bg-[#0F0F0F]">
                <div className="flex space-x-1.5">
                  <Button
                    variant="secondary"
                    onClick={() => setShowPreview(false)}
                    className="flex-1 font-satoshi"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={executeBatch}
                    disabled={executing}
                    className="flex-1 font-satoshi"
                  >
                    {executing ? (
                      <>
                        <RefreshCw size={12} className="mr-1 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      "Execute Batch"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* NEW: Processing Modal */}
      {processing && (
        <>
          <div className="fixed inset-0 z-50 bg-black/80" />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-2.5">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                {/* Processing Icon - Animated Checkmark */}
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="w-16 h-16 rounded-full border-4 border-[#2C2C2C] flex items-center justify-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded transform rotate-45 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded animate-pulse"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-45">
                        <CheckCircle
                          size={20}
                          className="text-white animate-bounce"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Animated rings */}
                  <div className="absolute inset-0 border-2 border-green-400/30 rounded-full animate-ping"></div>
                  <div
                    className="absolute inset-2 border border-blue-400/30 rounded-full animate-ping"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>

                <h3 className="text-white text-xl font-bold font-mayeka mb-2">
                  Processing
                </h3>
                <p className="text-gray-400 text-sm font-satoshi leading-relaxed">
                  Transaction in progress! Blockchain validation is underway.
                  This may take a few minutes.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {showResult && result && (
        <>
          <div
            className="fixed inset-0 z-40 bg-white/10"
            onClick={() => setShowResult(false)}
          />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-2.5">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-[#2C2C2C]">
                <div>
                  <h2 className="text-lg font-bold text-white font-mayeka">
                    {result.success
                      ? "Batch Transfer Successful!"
                      : "Batch Transfer Failed"}
                  </h2>
                  <p className="text-gray-400 text-xs font-satoshi mt-0.5">
                    {result.success
                      ? "Your batch transfer has been completed"
                      : "Something went wrong"}
                  </p>
                </div>
                <button
                  onClick={() => setShowResult(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {result.success ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle size={20} className="text-white" />
                      </div>
                    </div>

                    <div className="bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C]">
                      <h4 className="text-white font-semibold font-satoshi mb-1.5">
                        Transaction Details
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">
                            Transaction Hash:
                          </span>
                          <div className="flex items-center">
                            <span className="text-white mr-1 font-mono text-xs">
                              {result.transactionHash?.slice(0, 10)}...
                              {result.transactionHash?.slice(-8)}
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(result.transactionHash!, "hash")
                              }
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        </div>
                        {/* <div className="flex justify-between">
                          <span className="text-gray-400">Gas Used:</span>
                          <span className="text-white">
                            {result.gasUsed?.toLocaleString()} gas
                          </span>
                        </div> */}
                        <div className="flex justify-between">
                          <span className="text-gray-400">
                            Total Transfers:
                          </span>
                          <span className="text-white">
                            {result.totalTransfers}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Execution Time:</span>
                          <span className="text-white">
                            {result.executionTimeSeconds}s
                          </span>
                        </div>
                      </div>

                      {copied === "hash" && (
                        <p className="text-green-400 text-xs font-satoshi mt-1">
                          Hash copied!
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <X size={20} className="text-white" />
                      </div>
                    </div>

                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2.5">
                      <p className="text-red-400 text-xs font-satoshi">
                        {result.error}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-[#2C2C2C] bg-[#0F0F0F]">
                <div className="flex space-x-1.5">
                  {result.success && result.explorerUrl && (
                    <Button
                      variant="secondary"
                      onClick={() => window.open(result.explorerUrl, "_blank")}
                      className="flex-1 font-satoshi"
                    >
                      <ExternalLink size={12} className="mr-1" />
                      View on Explorer
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowResult(false)}
                    className="flex-1 font-satoshi"
                  >
                    {result.success ? "Done" : "Close"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
