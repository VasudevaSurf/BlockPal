"use client";

import { useState, useEffect, useRef } from "react";
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
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import UsernameInput from "@/components/ui/UsernameInput";
import { UserSuggestion } from "@/hooks/useUsernameSearch";
import TransactionHistory from "@/components/transactions/TransactionHistory";

// Mock data - replace backend calls
const mockTokens = [
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    balance: 1.25843,
    price: 3200.45,
    icon: "/tokens/eth.png",
    logoUrl: "/tokens/eth.png",
    contractAddress: "native",
    decimals: 18,
  },
  {
    id: "usdt",
    name: "Tether USD",
    symbol: "USDT",
    balance: 1000.5,
    price: 1.0,
    icon: "/tokens/usdt.png",
    logoUrl: "/tokens/usdt.png",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
  },
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    balance: 2500.75,
    price: 1.0,
    icon: "/tokens/usdc.png",
    logoUrl: "/tokens/usdc.png",
    contractAddress: "0xA0b86a33E6417f5a10c4C9a6bd1a0d7AF0DB58a7",
    decimals: 6,
  },
];

const mockWallet = {
  address: "0x742d35Cc6634C0532925a3b8d4Ae7F6eC1e7F5c7",
  name: "My Wallet",
};

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
    url.startsWith("http") ||
    url.startsWith("/") ||
    url.includes("coingecko") ||
    url.includes("coinbase") ||
    url.includes("cdn")
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
      className={`${size}
       ${getRandomTokenBgColor(
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
        className={`${size} rounded-full object-cover flex-shrink-0`}
        onError={() => {
          setImageError(true);
        }}
      />
    );
  }

  return (
    <div
      className={`${size} ${getTokenIcon(
        token.symbol,
        token.contractAddress
      )} rounded-full flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-white text-xs font-medium">
        {getTokenLetter(token.symbol, token.contractAddress)}
      </span>
    </div>
  );
};

export default function BatchPaymentsPage() {
  // Use mock data instead of Redux store
  const activeWallet = mockWallet;
  const tokens = mockTokens;

  // Filter tokens to only show USDT, USDC, and ETH
  const allowedTokens = tokens.filter((token) => {
    const symbolUpper = token.symbol?.toUpperCase();
    return (
      symbolUpper === "USDT" ||
      symbolUpper === "USDC" ||
      symbolUpper === "ETH" ||
      symbolUpper === "ETHEREUM"
    );
  });

  const [formData, setFormData] = useState({
    recipient: "",
    amount: "",
  });
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [batchPayments, setBatchPayments] = useState<BatchPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<string>("");
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);

  // UI-only states (no backend integration)
  const [showPreview, setShowPreview] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [batchPanelHeight, setBatchPanelHeight] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (allowedTokens.length > 0 && !selectedToken) {
      const ethToken = allowedTokens.find(
        (t) =>
          t.symbol?.toUpperCase() === "ETH" ||
          t.symbol?.toUpperCase() === "ETHEREUM"
      );
      const firstToken = ethToken || allowedTokens[0];

      setSelectedToken({
        name: firstToken.name,
        symbol: firstToken.symbol,
        contractAddress: firstToken.contractAddress || firstToken.id,
        decimals: firstToken.decimals || 18,
        isETH: firstToken.symbol === "ETH" || firstToken.symbol === "ETHEREUM",
        balance: firstToken.balance,
        price: firstToken.price,
        logoUrl: firstToken.icon || firstToken.logoUrl,
      });
    }
  }, [allowedTokens, selectedToken]);

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

  // Mock preview creation - UI only
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

    // Simulate loading
    setTimeout(() => {
      setLoading(false);
      setShowPreview(true);
    }, 1000);
  };

  // Mock batch execution - UI only
  const executeBatch = () => {
    setShowPreview(false);
    setProcessing(true);

    // Simulate processing time
    setTimeout(() => {
      setProcessing(false);

      // Generate mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;

      setResult({
        success: true,
        transactionHash: mockTxHash,
        totalTransfers: batchPayments.length,
        executionTimeSeconds: 12,
        explorerUrl: `https://etherscan.io/tx/${mockTxHash}`,
      });

      setShowResult(true);
      setBatchPayments([]); // Clear batch after "successful" execution
    }, 3000);
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
    setShowPreview(false);
    setResult(null);
    setShowResult(false);
    setError("");
    setSelectedUser(null);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResult(null);
  };

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
        {/* Mobile layout - Add Payment Form */}
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
                        <TokenIcon token={selectedToken} size="w-5 h-5" />
                        <span className="text-white font-satoshi text-xs ml-2">
                          {selectedToken.symbol}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDown size={10} className="text-gray-400" />
                </button>

                {isTokenDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-black border border-[#2C2C2C] rounded-xl shadow-lg max-h-32 overflow-y-auto scrollbar-hide">
                    {allowedTokens.map((token) => (
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
                              isETH:
                                token.symbol === "ETH" ||
                                token.symbol === "ETHEREUM",
                              balance: token.balance,
                              price: token.price,
                              logoUrl: token.icon || token.logoUrl,
                            });
                            setIsTokenDropdownOpen(false);
                          }}
                          className="w-full flex items-center p-2 hover:bg-[#1A1A1A] transition-colors text-left"
                        >
                          <div className="flex items-center flex-1">
                            <TokenIcon token={token} size="w-6 h-6" />
                            <div className="flex-1 ml-2">
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

        {/* Mobile Batch Summary and Queue */}
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

            {/* Mobile Payments Queue */}
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
                            <TokenIcon
                              token={payment.tokenInfo}
                              size="w-5 h-5"
                            />
                            <span className="text-gray-400 text-xs font-satoshi ml-2">
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

        {/* Mobile Mock Transaction History */}
        <div className="bg-black rounded-[12px] border border-[#2C2C2C] flex-shrink-0 overflow-hidden">
          <div className="p-1.5 h-full max-h-[250px] flex flex-col">
            <div className="h-full overflow-hidden">
              <div className="p-4 text-center">
                <div className="text-gray-400 text-sm font-satoshi">
                  Transaction history will appear here after authentication
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div
        className="hidden xl:flex flex-col gap-0 flex-1 min-h-0 relative"
        ref={containerRef}
      >
        {/* Desktop batch interface section */}
        <div
          className="bg-black rounded-[16px] border border-[#2C2C2C] p-2.5 flex flex-col min-h-0 overflow-hidden"
          style={{ height: `${batchPanelHeight}%` }}
        >
          {/* Desktop Form Header */}
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
                      <TokenIcon token={selectedToken} size="w-5 h-5" />
                      <span className="text-white font-satoshi text-xs truncate ml-2">
                        {selectedToken.symbol}
                      </span>
                    </>
                  )}
                </div>
                <ChevronDown size={6} className="text-gray-400 flex-shrink-0" />
              </button>

              {isTokenDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-black border border-[#2C2C2C] rounded-xl shadow-lg max-h-32 overflow-y-auto scrollbar-hide">
                  {allowedTokens.map((token) => (
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
                            isETH:
                              token.symbol === "ETH" ||
                              token.symbol === "ETHEREUM",
                            balance: token.balance,
                            price: token.price,
                            logoUrl: token.icon || token.logoUrl,
                          });
                          setIsTokenDropdownOpen(false);
                        }}
                        className="w-full flex items-center p-2 hover:bg-[#1A1A1A] transition-colors text-left"
                      >
                        <div className="flex items-center flex-1">
                          <TokenIcon token={token} size="w-6 h-6" />
                          <div className="flex-1 min-w-0 ml-2">
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

          {/* Desktop Table Header */}
          <div className="bg-[#0F0F0F] rounded-lg mb-1 flex-shrink-0">
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
              <div className="text-gray-400 text-xs font-satoshi text-center">
                Actions
              </div>
            </div>
          </div>

          {/* Desktop Payments List */}
          <div className="overflow-y-auto scrollbar-hide mb-2 flex-1 min-h-0">
            {batchPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                <div className="w-12 h-12 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-1.5">
                  <Plus size={20} className="text-gray-400" />
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
                          <TokenIcon token={payment.tokenInfo} size="w-5 h-5" />
                          <span className="text-white font-satoshi text-xs truncate ml-2">
                            {payment.tokenInfo.symbol}
                          </span>
                        </div>

                        <div className="text-white font-satoshi text-xs">
                          {payment.amount} {payment.tokenInfo.symbol}
                        </div>

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

          {/* Desktop Action Buttons */}
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

        {/* Resizable divider */}
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

        {/* Desktop Mock Transaction History */}
        <div
          className="bg-black rounded-[16px] border border-[#2C2C2C] flex flex-col min-h-0 overflow-hidden"
          style={{ height: `${100 - batchPanelHeight}%` }}
        >
          <div className="p-2.5 h-full flex flex-col overflow-hidden">
            <div className="h-full overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 text-sm font-satoshi mb-2">
                  Transaction History
                </div>
                <div className="text-gray-500 text-xs font-satoshi">
                  Connect wallet to view transaction history
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal (UI Only) */}
      {showPreview && (
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
                          Batch Transfer
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Total Transfers
                        </div>
                        <div className="text-white font-bold font-satoshi">
                          {batchPayments.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Total Value
                        </div>
                        <div className="text-white font-bold font-satoshi">
                          $
                          {batchPayments
                            .reduce((sum, p) => sum + p.usdValue, 0)
                            .toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Network
                        </div>
                        <div className="text-white font-bold font-satoshi">
                          Ethereum
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-2.5">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={12}
                        className="text-yellow-400 mr-1.5 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-yellow-400 text-xs font-satoshi font-medium mb-0.5">
                          Demo Mode
                        </p>
                        <p className="text-yellow-400 text-xs font-satoshi">
                          This is a frontend demo. No real transactions will be
                          executed.
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
                    className="flex-1 font-satoshi"
                  >
                    Execute Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Processing Modal */}
      {processing && (
        <>
          <div className="fixed inset-0 z-50 bg-black/80" />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-2.5">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="w-16 h-16 rounded-full border-4 border-[#2C2C2C] flex items-center justify-center">
                    <RefreshCw
                      size={24}
                      className="text-[#E2AF19] animate-spin"
                    />
                  </div>
                </div>

                <h3 className="text-white text-xl font-bold font-mayeka mb-2">
                  Processing Demo
                </h3>
                <p className="text-gray-400 text-sm font-satoshi leading-relaxed">
                  Simulating batch transfer processing...
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Result Modal */}
      {showResult && result && (
        <>
          <div
            className="fixed inset-0 z-40 bg-white/10"
            onClick={handleCloseResult}
          />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-2.5">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-[#2C2C2C]">
                <div>
                  <h2 className="text-lg font-bold text-white font-mayeka">
                    Demo Successful!
                  </h2>
                  <p className="text-gray-400 text-xs font-satoshi mt-0.5">
                    Frontend demo completed successfully
                  </p>
                </div>
                <button
                  onClick={handleCloseResult}
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#2C2C2C] rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle size={20} className="text-white" />
                    </div>
                  </div>

                  <div className="bg-[#0F0F0F] rounded-lg p-2.5 border border-[#2C2C2C]">
                    <h4 className="text-white font-semibold font-satoshi mb-1.5">
                      Demo Details
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">
                          Mock Transaction Hash:
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
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Transfers:</span>
                        <span className="text-white">
                          {result.totalTransfers}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Demo Time:</span>
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
              </div>

              <div className="p-3 border-t border-[#2C2C2C] bg-[#0F0F0F]">
                <div className="flex space-x-1.5">
                  <Button
                    variant="secondary"
                    onClick={() => window.open(result.explorerUrl, "_blank")}
                    className="flex-1 font-satoshi"
                  >
                    <ExternalLink size={12} className="mr-1" />
                    View Demo
                  </Button>
                  <Button
                    onClick={handleCloseResult}
                    className="flex-1 font-satoshi"
                  >
                    Done
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
