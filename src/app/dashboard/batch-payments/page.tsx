"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface BatchPayment {
  id: string;
  tokenInfo: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
    isETH: boolean;
  };
  recipient: string;
  amount: string;
  usdValue: number;
}

interface Transaction {
  id: string;
  username: string;
  token: string;
  amount: number;
  date: string;
  estimatedGas: number;
  hash?: string;
  status: "completed" | "pending" | "failed";
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    username: "@theweb3guy",
    token: "Ethereum",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
    hash: "0x1234567890abcdef",
    status: "completed",
  },
  {
    id: "2",
    username: "0xAD7a4hw64...R8J6153",
    token: "USDT",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
    hash: "0xabcdef1234567890",
    status: "completed",
  },
  {
    id: "3",
    username: "@theweb3guy",
    token: "Ethereum",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
    hash: "0x1234567890abcdef",
    status: "completed",
  },
  {
    id: "4",
    username: "0xAD7a4hw64...R8J6153",
    token: "Solana",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
    hash: "0xabcdef1234567890",
    status: "completed",
  },
  {
    id: "5",
    username: "@theweb3guy",
    token: "Polkadot",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
    hash: "0x1234567890abcdef",
    status: "completed",
  },
  {
    id: "6",
    username: "0xAD7a4hw64...R8J6153",
    token: "XRP",
    amount: 300,
    date: "4/20/2025",
    estimatedGas: 2.34,
    hash: "0xabcdef1234567890",
    status: "completed",
  },
];

const getTokenIcon = (token: string) => {
  const icons: Record<string, { bg: string; symbol: string }> = {
    Ethereum: { bg: "bg-blue-500", symbol: "Ξ" },
    ETH: { bg: "bg-blue-500", symbol: "Ξ" },
    USDT: { bg: "bg-green-500", symbol: "₮" },
    USDC: { bg: "bg-blue-600", symbol: "$" },
    LINK: { bg: "bg-blue-700", symbol: "⛓" },
    DAI: { bg: "bg-yellow-500", symbol: "◈" },
    UNI: { bg: "bg-pink-500", symbol: "🦄" },
    Solana: { bg: "bg-purple-500", symbol: "◎" },
    Polkadot: { bg: "bg-pink-500", symbol: "●" },
    Sui: { bg: "bg-cyan-500", symbol: "~" },
    XRP: { bg: "bg-gray-500", symbol: "✕" },
  };
  return icons[token] || { bg: "bg-gray-500", symbol: "?" };
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
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  // Initialize with first available token
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
      });
    }
  }, [tokens, selectedToken]);

  const addToBatch = () => {
    if (!formData.recipient || !formData.amount || !selectedToken) {
      setError("Please fill in all fields");
      return;
    }

    // Validate recipient address
    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipient)) {
      setError("Invalid recipient address format");
      return;
    }

    // Validate amount
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

    // Check for duplicate recipient with same token
    const duplicate = batchPayments.find(
      (payment) =>
        payment.recipient.toLowerCase() === formData.recipient.toLowerCase() &&
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
      },
      recipient: formData.recipient.toLowerCase(),
      amount: formData.amount,
      usdValue,
    };

    setBatchPayments([...batchPayments, newPayment]);
    setFormData({ recipient: "", amount: "" });
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

  const executeBatch = async () => {
    if (!preview) return;

    setExecuting(true);
    setError("");

    try {
      // Option 1: Retrieve private key from user's stored wallets
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
        // Fallback: Ask user for private key input
        const privateKey = prompt(
          "Please enter your wallet private key to execute the batch transfer:"
        );

        if (!privateKey) {
          setError("Private key is required for transaction execution");
          setExecuting(false);
          return;
        }

        // Execute with manually entered private key
        await executeBatchWithKey(privateKey);
      } else {
        const keyData = await response.json();

        if (keyData.success && keyData.privateKey) {
          // Execute with retrieved private key
          await executeBatchWithKey(keyData.privateKey);
        } else {
          throw new Error("Failed to retrieve wallet credentials");
        }
      }
    } catch (err: any) {
      setError(err.message || "Batch execution failed");
      setExecuting(false);
    }
  };

  const executeBatchWithKey = async (privateKey: string) => {
    try {
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

      setResult(data.result);
      setShowResult(true);
      setBatchPayments([]);
      setShowPreview(false);
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
  };

  const totalAmount = batchPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount),
    0
  );
  const totalGas = batchPayments.reduce((sum, payment) => sum + 2.34, 0);

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Batch Payments
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "6px 6px lg:8px 8px",
                }}
              ></div>
            </div>
            <span className="text-white text-xs sm:text-sm font-satoshi mr-2 min-w-0 truncate">
              {activeWallet?.name || "Wallet 1"}
            </span>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              {activeWallet?.address
                ? `${activeWallet.address.slice(
                    0,
                    11
                  )}...${activeWallet.address.slice(-7)}`
                : "0xAD7a4hw64...R8J6153"}
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4 flex-shrink-0">
          <div className="flex items-start">
            <AlertTriangle
              size={16}
              className="text-red-400 mr-2 mt-0.5 flex-shrink-0"
            />
            <p className="text-red-400 text-sm font-satoshi">{error}</p>
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {/* Batch Payments Form */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Add Payment
          </h2>

          {/* Mobile Form Layout */}
          <div className="space-y-3">
            <div>
              <Input
                type="text"
                placeholder="0x... recipient address"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                className="font-satoshi text-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Token Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                  className="flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 w-full"
                >
                  <div className="flex items-center">
                    {selectedToken && (
                      <>
                        <div
                          className={`w-5 h-5 ${
                            getTokenIcon(selectedToken.symbol).bg
                          } rounded-full flex items-center justify-center mr-2`}
                        >
                          <span className="text-white text-xs font-bold">
                            {getTokenIcon(selectedToken.symbol).symbol}
                          </span>
                        </div>
                        <span className="text-white font-satoshi text-sm">
                          {selectedToken.symbol}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>

                {/* Dropdown */}
                {isTokenDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {tokens.map((token) => {
                      const tokenIcon = getTokenIcon(token.symbol);
                      return (
                        <button
                          key={token.id}
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
                            });
                            setIsTokenDropdownOpen(false);
                          }}
                          className="w-full flex items-center p-3 hover:bg-[#2C2C2C] transition-colors text-left"
                        >
                          <div
                            className={`w-5 h-5 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-2`}
                          >
                            <span className="text-white text-xs font-bold">
                              {tokenIcon.symbol}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-satoshi text-sm">
                              {token.symbol}
                            </div>
                            <div className="text-gray-400 font-satoshi text-xs">
                              Balance: {token.balance.toFixed(4)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <Input
                type="text"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="font-satoshi"
              />
            </div>

            {/* Gas Estimate Display */}
            <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm font-satoshi">
                  Estimated Gas:
                </span>
                <span className="text-white text-sm font-satoshi">$2.34</span>
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={addToBatch}
              disabled={loading}
              className="w-full bg-[#E2AF19] text-black px-4 py-3 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Plus size={16} className="mr-2" />
              Add to Batch
            </button>
          </div>
        </div>

        {/* Batch Summary */}
        {batchPayments.length > 0 && (
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Batch Summary
              </h3>
              <div className="text-sm text-gray-400 font-satoshi">
                {batchPayments.length} payments
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="text-gray-400 text-xs font-satoshi mb-1">
                  Total Amount
                </div>
                <div className="text-white text-lg font-bold font-satoshi">
                  $
                  {batchPayments
                    .reduce((sum, p) => sum + p.usdValue, 0)
                    .toFixed(2)}
                </div>
              </div>
              <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="text-gray-400 text-xs font-satoshi mb-1">
                  Total Gas
                </div>
                <div className="text-white text-lg font-bold font-satoshi">
                  ${totalGas.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetBatch}
                className="flex-1 px-4 py-2 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity"
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
        )}

        {/* Batch Payments List - Mobile Cards */}
        {batchPayments.length > 0 && (
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              Payments Queue ({batchPayments.length})
            </h3>

            <div className="space-y-3">
              {batchPayments.map((payment) => {
                const tokenIcon = getTokenIcon(payment.tokenInfo.symbol);
                return (
                  <div
                    key={payment.id}
                    className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] relative"
                  >
                    <button
                      onClick={() => removeFromBatch(payment.id)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>

                    <div className="flex items-center mb-3 pr-6">
                      <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-white text-sm">
                          {payment.recipient.startsWith("0x")
                            ? "0"
                            : payment.recipient[1]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium font-satoshi truncate">
                          {payment.recipient.slice(0, 10)}...
                          {payment.recipient.slice(-6)}
                        </div>
                        <div className="flex items-center mt-1">
                          <div
                            className={`w-4 h-4 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-1`}
                          >
                            <span className="text-white text-xs font-bold">
                              {tokenIcon.symbol}
                            </span>
                          </div>
                          <span className="text-gray-400 text-sm font-satoshi">
                            {payment.tokenInfo.symbol}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold font-satoshi">
                          {payment.amount} {payment.tokenInfo.symbol}
                        </div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          Gas: $2.34
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction History - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white font-satoshi mb-4">
            Recent Transactions
          </h3>

          <div className="space-y-3">
            {mockTransactions.slice(0, 8).map((transaction) => {
              const tokenIcon = getTokenIcon(transaction.token);
              return (
                <div
                  key={transaction.id}
                  className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                        <span className="text-white text-sm">
                          {transaction.username.startsWith("@")
                            ? transaction.username[1].toUpperCase()
                            : "0"}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm font-satoshi">
                          {transaction.username}
                        </div>
                        <div className="flex items-center mt-1">
                          <div
                            className={`w-4 h-4 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-1`}
                          >
                            <span className="text-white text-xs font-bold">
                              {tokenIcon.symbol}
                            </span>
                          </div>
                          <span className="text-gray-400 text-xs font-satoshi">
                            {transaction.token}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold font-satoshi">
                        ${transaction.amount}
                      </div>
                      <div className="text-gray-400 text-xs font-satoshi">
                        {transaction.date}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-3 pt-2 border-t border-[#2C2C2C]">
                    <button className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                      <ExternalLink size={12} className="mr-1" />
                      Explorer
                    </button>
                    <button className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                      <Hash size={12} className="mr-1" />
                      Hash
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex flex-col gap-6 flex-1 min-h-0">
        {/* Combined Batch Payments Form and List */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-white mb-6 font-satoshi">
            Batch Payments
          </h2>

          {/* Input Row - Desktop Grid */}
          <div className="grid grid-cols-8 gap-3 mb-4">
            <div className="col-span-3">
              <Input
                type="text"
                placeholder="0x... recipient address"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                className="font-satoshi text-gray-400 py-3 text-sm h-full"
              />
            </div>

            {/* Token Selector */}
            <div className="col-span-2 relative">
              <button
                onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                className="w-full h-full flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-left hover:border-[#E2AF19] transition-colors"
              >
                <div className="flex items-center">
                  {selectedToken && (
                    <>
                      <div
                        className={`w-5 h-5 ${
                          getTokenIcon(selectedToken.symbol).bg
                        } rounded-full flex items-center justify-center mr-2`}
                      >
                        <span className="text-white text-xs font-bold">
                          {getTokenIcon(selectedToken.symbol).symbol}
                        </span>
                      </div>
                      <span className="text-white font-satoshi text-sm">
                        {selectedToken.symbol}
                      </span>
                    </>
                  )}
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {/* Desktop Dropdown */}
              {isTokenDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {tokens.map((token) => {
                    const tokenIcon = getTokenIcon(token.symbol);
                    return (
                      <button
                        key={token.id}
                        onClick={() => {
                          setSelectedToken({
                            name: token.name,
                            symbol: token.symbol,
                            contractAddress: token.contractAddress || token.id,
                            decimals: token.decimals || 18,
                            isETH: token.symbol === "ETH",
                            balance: token.balance,
                            price: token.price,
                          });
                          setIsTokenDropdownOpen(false);
                        }}
                        className="w-full flex items-center p-3 hover:bg-[#2C2C2C] transition-colors text-left"
                      >
                        <div
                          className={`w-5 h-5 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-2`}
                        >
                          <span className="text-white text-xs font-bold">
                            {tokenIcon.symbol}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-satoshi text-sm">
                            {token.symbol}
                          </div>
                          <div className="text-gray-400 font-satoshi text-xs">
                            Balance: {token.balance.toFixed(4)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div className="col-span-2">
              <Input
                type="text"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="font-satoshi py-3 text-sm h-full"
              />
            </div>

            {/* Add Button */}
            <div className="col-span-1">
              <button
                onClick={addToBatch}
                disabled={loading}
                className="bg-[#E2AF19] text-black px-1 py-3 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center justify-center w-full h-full text-xs disabled:opacity-50"
              >
                <Plus size={10} className="mr-1" />
                Add
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#2C2C2C] mb-4"></div>

          {/* Table Header */}
          <div className="bg-[#0F0F0F] rounded-lg mb-2">
            <div className="grid grid-cols-4 gap-2 px-3 py-3">
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Username/Address
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Token Name
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Amount
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Est. Gas
              </div>
            </div>
          </div>

          {/* Batch Payments List */}
          <div
            className="overflow-y-auto scrollbar-hide mb-6 flex-1"
            style={{ maxHeight: "300px" }}
          >
            {batchPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 bg-[#2C2C2C] rounded-full flex items-center justify-center mb-4">
                  <Plus size={24} className="text-gray-400" />
                </div>
                <h3 className="text-white text-lg font-satoshi mb-2">
                  No payments in batch
                </h3>
                <p className="text-gray-400 font-satoshi text-center">
                  Add recipients above to start building your batch payment
                </p>
              </div>
            ) : (
              <div>
                {batchPayments.map((payment, index) => {
                  const tokenIcon = getTokenIcon(payment.tokenInfo.symbol);
                  return (
                    <div key={payment.id}>
                      <div className="grid grid-cols-4 gap-2 items-center py-3 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                        <div className="flex items-center min-w-0">
                          <div className="w-6 h-6 bg-gray-600 rounded-full mr-2 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">
                              {payment.recipient.startsWith("0x")
                                ? "0"
                                : payment.recipient[1]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <span className="text-white font-satoshi text-sm truncate">
                            {payment.recipient.slice(0, 10)}...
                            {payment.recipient.slice(-6)}
                          </span>
                        </div>

                        <div className="flex items-center min-w-0">
                          <div
                            className={`w-5 h-5 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                          >
                            <span className="text-white text-xs font-bold">
                              {tokenIcon.symbol}
                            </span>
                          </div>
                          <span className="text-white font-satoshi text-sm truncate">
                            {payment.tokenInfo.symbol}
                          </span>
                        </div>

                        <div className="text-white font-satoshi text-sm">
                          {payment.amount} {payment.tokenInfo.symbol}
                        </div>

                        <div className="text-white font-satoshi text-sm">
                          $2.34
                        </div>
                      </div>

                      {index < batchPayments.length - 1 && (
                        <div className="border-b border-[#2C2C2C] mx-3 my-1"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reset and Transfer Buttons at Bottom */}
          {batchPayments.length > 0 && (
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={resetBatch}
                className="px-4 py-2 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity"
              >
                Reset
              </button>
              <Button
                onClick={createPreview}
                disabled={loading || batchPayments.length < 2}
                className="font-satoshi"
              >
                {loading ? "Loading..." : "Transfer"}
              </Button>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-white font-satoshi mb-6">
            Transaction History
          </h2>

          {/* Table Header */}
          <div className="bg-[#0F0F0F] rounded-lg mb-2">
            <div className="grid grid-cols-5 gap-2 px-3 py-3">
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Username/Address
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Token Name
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Amount
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Date
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-center">
                Actions
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {mockTransactions.map((transaction, index) => {
              const tokenIcon = getTokenIcon(transaction.token);
              return (
                <div key={transaction.id}>
                  <div className="grid grid-cols-5 gap-2 items-center py-2 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                    <div className="flex items-center min-w-0">
                      <div className="w-6 h-6 bg-gray-600 rounded-full mr-2 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">
                          {transaction.username.startsWith("@")
                            ? transaction.username[1].toUpperCase()
                            : "0"}
                        </span>
                      </div>
                      <span className="text-white font-satoshi text-sm truncate">
                        {transaction.username}
                      </span>
                    </div>

                    <div className="flex items-center min-w-0">
                      <div
                        className={`w-5 h-5 ${tokenIcon.bg} rounded-full flex items-center justify-center mr-2 flex-shrink-0`}
                      >
                        <span className="text-white text-xs font-bold">
                          {tokenIcon.symbol}
                        </span>
                      </div>
                      <span className="text-white font-satoshi text-sm truncate">
                        {transaction.token}
                      </span>
                    </div>

                    <div className="text-white font-satoshi text-sm">
                      ${transaction.amount}
                    </div>

                    <div className="text-white font-satoshi text-sm">
                      {transaction.date}
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                          <ExternalLink size={10} className="mr-1" />
                          Explorer
                        </button>
                        <button className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                          <Hash size={10} className="mr-1" />
                          Hash
                        </button>
                      </div>
                    </div>
                  </div>

                  {index < mockTransactions.length - 1 && (
                    <div className="border-b border-[#2C2C2C] mx-3 my-1"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
              <div>
                <h2 className="text-xl font-bold text-white font-mayeka">
                  Batch Transfer Preview
                </h2>
                <p className="text-gray-400 text-sm font-satoshi mt-1">
                  Review your batch transfer details
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Transfer Summary */}
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <h3 className="text-white font-semibold font-satoshi mb-4">
                    Transfer Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Transfer Mode
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {preview.transferMode}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Total Transfers
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {preview.transfers.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Total Value
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        ${preview.totalUSDValue.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Network
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {preview.network}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gas Estimation */}
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <h3 className="text-white font-semibold font-satoshi mb-4">
                    Gas Estimation
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm font-satoshi">
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
                      <span className="text-gray-400 text-sm font-satoshi">
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
                      <span className="text-gray-400 text-sm font-satoshi">
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
                      <span className="text-gray-400 text-sm font-satoshi">
                        Estimated Cost:
                      </span>
                      <span className="text-white font-satoshi">
                        {preview.gasEstimation.gasCostETH} ETH ($
                        {preview.gasEstimation.gasCostUSD})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={16}
                      className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-yellow-400 text-sm font-satoshi font-medium mb-1">
                        Transaction Confirmation Required
                      </p>
                      <p className="text-yellow-400 text-xs font-satoshi">
                        This will execute a real batch transfer on the
                        blockchain. Please verify all details before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#2C2C2C] bg-[#0F0F0F]">
              <div className="flex space-x-3">
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
                      <RefreshCw size={16} className="mr-2 animate-spin" />
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
      )}

      {/* Result Modal */}
      {showResult && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
              <div>
                <h2 className="text-xl font-bold text-white font-mayeka">
                  {result.success
                    ? "Batch Transfer Successful!"
                    : "Batch Transfer Failed"}
                </h2>
                <p className="text-gray-400 text-sm font-satoshi mt-1">
                  {result.success
                    ? "Your batch transfer has been completed"
                    : "Something went wrong"}
                </p>
              </div>
              <button
                onClick={() => setShowResult(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {result.success ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-white" />
                    </div>
                  </div>

                  <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                    <h4 className="text-white font-semibold font-satoshi mb-3">
                      Transaction Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Transaction Hash:</span>
                        <div className="flex items-center">
                          <span className="text-white mr-2 font-mono text-xs">
                            {result.transactionHash?.slice(0, 10)}...
                            {result.transactionHash?.slice(-8)}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(result.transactionHash!, "hash")
                            }
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Gas Used:</span>
                        <span className="text-white">
                          {result.gasUsed?.toLocaleString()} gas
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Transfers:</span>
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
                      <p className="text-green-400 text-xs font-satoshi mt-2">
                        Hash copied!
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X size={32} className="text-white" />
                    </div>
                  </div>

                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-400 text-sm font-satoshi">
                      {result.error}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#2C2C2C] bg-[#0F0F0F]">
              <div className="flex space-x-3">
                {result.success && result.explorerUrl && (
                  <Button
                    variant="secondary"
                    onClick={() => window.open(result.explorerUrl, "_blank")}
                    className="flex-1 font-satoshi"
                  >
                    <ExternalLink size={16} className="mr-2" />
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
