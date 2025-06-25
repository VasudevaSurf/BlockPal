"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Calendar,
  ChevronDown,
  Bell,
  HelpCircle,
  Edit,
  ExternalLink,
  Hash,
  Clock,
  Repeat,
  X,
  Send,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface ScheduledPayment {
  id: string;
  scheduleId: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  recipient: string;
  amount: string;
  frequency: string;
  status: "active" | "completed" | "cancelled" | "failed";
  scheduledFor: string;
  nextExecution?: string;
  executionCount: number;
  maxExecutions: number;
  description?: string;
  createdAt: string;
  lastExecutionAt?: string;
  timezone?: string;
  estimatedGas?: string;
  gasCostETH?: string;
  gasCostUSD?: string;
}

interface CreatePaymentData {
  recipient: string;
  amount: string;
  date: string;
  time: string;
  description: string;
}

interface PaymentPreview {
  tokenInfo: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
    isETH: boolean;
  };
  recipient: string;
  amount: string;
  scheduledFor: Date;
  frequency: string;
  nextExecutions: Date[];
  estimatedGas: string;
  gasCostETH: string;
  gasCostUSD: string;
  approvalRequired: boolean;
  currentAllowance?: string;
  requiredAllowance?: string;
}

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

const timezones = [
  { idx: 1, name: "UTC (Coordinated Universal Time)", tz: "UTC" },
  { idx: 2, name: "IST (India Standard Time)", tz: "Asia/Kolkata" },
  { idx: 3, name: "EST (Eastern Standard Time)", tz: "America/New_York" },
  { idx: 4, name: "PST (Pacific Standard Time)", tz: "America/Los_Angeles" },
  { idx: 5, name: "GMT (Greenwich Mean Time)", tz: "GMT" },
  { idx: 6, name: "JST (Japan Standard Time)", tz: "Asia/Tokyo" },
];

export default function ScheduledPaymentsPage() {
  const { activeWallet, tokens } = useSelector(
    (state: RootState) => state.wallet
  );

  const [formData, setFormData] = useState<CreatePaymentData>({
    recipient: "",
    amount: "",
    date: "",
    time: "",
    description: "",
  });
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("weekly");
  const [selectedTimezone, setSelectedTimezone] = useState(timezones[1]); // Default to IST
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);

  // State management
  const [scheduledPayments, setScheduledPayments] = useState<
    ScheduledPayment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [preview, setPreview] = useState<PaymentPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState<string>("");

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

  // Fetch scheduled payments
  useEffect(() => {
    if (activeWallet?.address) {
      fetchScheduledPayments();
    }
  }, [activeWallet?.address, activeTab]);

  const fetchScheduledPayments = async () => {
    if (!activeWallet?.address) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/scheduled-payments?status=${activeTab}&walletAddress=${activeWallet.address}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setScheduledPayments(data.scheduledPayments || []);
      } else {
        setError(data.error || "Failed to fetch scheduled payments");
      }
    } catch (error: any) {
      setError("Failed to fetch scheduled payments");
      console.error("Error fetching scheduled payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (
      !formData.recipient ||
      !formData.amount ||
      !formData.date ||
      !formData.time
    ) {
      setError("Please fill in all required fields");
      return false;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipient)) {
      setError("Invalid recipient address format");
      return false;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Invalid amount");
      return false;
    }

    if (selectedToken && amount > selectedToken.balance) {
      setError(
        `Insufficient balance. Available: ${selectedToken.balance} ${selectedToken.symbol}`
      );
      return false;
    }

    // Validate scheduled time is in future
    const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);
    if (scheduledDateTime <= new Date()) {
      setError("Scheduled time must be in the future");
      return false;
    }

    return true;
  };

  const handleCreatePreview = async () => {
    if (!validateForm() || !selectedToken || !activeWallet?.address) return;

    setLoading(true);
    setError("");

    try {
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);
      const frequency = recurringEnabled ? recurringFrequency : "once";

      const response = await fetch("/api/scheduled-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "preview",
          tokenInfo: selectedToken,
          fromAddress: activeWallet.address,
          recipient: formData.recipient,
          amount: formData.amount,
          scheduledFor: scheduledDateTime.toISOString(),
          frequency,
          timezone: selectedTimezone.tz,
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

  const handleCreateScheduledPayment = async () => {
    if (!preview || !activeWallet?.address) return;

    setCreating(true);
    setError("");

    try {
      // First handle approval if required
      if (preview.approvalRequired) {
        const testPrivateKey =
          "c1fcde81f943602b92f11121d426b8b499f2f52a24468894ad058ec5f9931b23";

        const approvalResponse = await fetch("/api/scheduled-payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "approve",
            tokenAddress: selectedToken.contractAddress,
            amount: formData.amount,
            decimals: selectedToken.decimals,
            privateKey: testPrivateKey,
          }),
          credentials: "include",
        });

        const approvalData = await approvalResponse.json();
        if (!approvalResponse.ok) {
          throw new Error(approvalData.error || "Token approval failed");
        }
      }

      // Create the scheduled payment
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);
      const frequency = recurringEnabled ? recurringFrequency : "once";

      const response = await fetch("/api/scheduled-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          tokenInfo: selectedToken,
          fromAddress: activeWallet.address,
          recipient: formData.recipient,
          amount: formData.amount,
          scheduledFor: scheduledDateTime.toISOString(),
          frequency,
          timezone: selectedTimezone.tz,
          description: formData.description,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create scheduled payment");
      }

      setResult(data);
      setShowResult(true);
      setShowPreview(false);

      // Reset form
      setFormData({
        recipient: "",
        amount: "",
        date: "",
        time: "",
        description: "",
      });
      setRecurringEnabled(false);

      // Refresh the list
      fetchScheduledPayments();
    } catch (err: any) {
      setError(err.message || "Failed to create scheduled payment");
    } finally {
      setCreating(false);
    }
  };

  const handleCancelPayment = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/scheduled-payments/${scheduleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
        }),
        credentials: "include",
      });

      if (response.ok) {
        fetchScheduledPayments();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to cancel payment");
      }
    } catch (error) {
      setError("Failed to cancel payment");
    }
  };

  const handleDeletePayment = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/scheduled-payments/${scheduleId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        fetchScheduledPayments();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete payment");
      }
    } catch (error) {
      setError("Failed to delete payment");
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeUntilExecution = (nextExecution?: string) => {
    if (!nextExecution) return "N/A";

    const now = new Date();
    const execution = new Date(nextExecution);
    const diff = execution.getTime() - now.getTime();

    if (diff <= 0) return "Overdue";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const filteredPayments = scheduledPayments.filter(
    (payment) => payment.status === activeTab
  );

  const activeCount = scheduledPayments.filter(
    (payment) => payment.status === "active"
  ).length;
  const completedCount = scheduledPayments.filter(
    (payment) => payment.status === "completed"
  ).length;

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Scheduled Payments
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

      {/* Test Mode Banner */}
      <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3 mb-4 flex-shrink-0">
        <div className="flex items-center">
          <span className="text-blue-400 text-sm font-satoshi font-medium">
            🧪 SEPOLIA TESTNET - Real Scheduled Payments Enabled
          </span>
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
        {/* Schedule Payment Form - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Schedule Payment
          </h2>

          <div className="space-y-4">
            {/* Recipient */}
            <div>
              <Input
                type="text"
                placeholder="@username or address"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                className="font-satoshi text-gray-400"
              />
              {/* Test addresses for convenience */}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      recipient: "0x2Ef3C895f7A18088B384cA4bc3a19558351B7313",
                    })
                  }
                  className="text-xs bg-[#2C2C2C] text-gray-300 px-2 py-1 rounded font-satoshi hover:bg-[#3C3C3C] transition-colors"
                >
                  Test Wallet 1
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      recipient: "0xCAEAd2fC03e370107b097965971ebeCF19eB5226",
                    })
                  }
                  className="text-xs bg-[#2C2C2C] text-gray-300 px-2 py-1 rounded font-satoshi hover:bg-[#3C3C3C] transition-colors"
                >
                  Test Wallet 2
                </button>
              </div>
            </div>

            {/* Token and Amount Row */}
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

            {/* Date and Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="font-satoshi"
              />
              <Input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="font-satoshi"
              />
            </div>

            {/* Timezone Selector */}
            <div className="relative">
              <button
                onClick={() =>
                  setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)
                }
                className="flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 w-full"
              >
                <span className="text-white font-satoshi text-sm">
                  {selectedTimezone.name}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {isTimezoneDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {timezones.map((timezone) => (
                    <button
                      key={timezone.idx}
                      onClick={() => {
                        setSelectedTimezone(timezone);
                        setIsTimezoneDropdownOpen(false);
                      }}
                      className="w-full flex items-center p-3 hover:bg-[#2C2C2C] transition-colors text-left"
                    >
                      <span className="text-white font-satoshi text-sm">
                        {timezone.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <Input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="font-satoshi"
            />

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
              <div className="flex items-center">
                <Repeat size={16} className="text-gray-400 mr-2" />
                <span className="text-white font-satoshi text-sm">
                  Enable recurring payments
                </span>
              </div>
              <button
                onClick={() => setRecurringEnabled(!recurringEnabled)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  recurringEnabled ? "bg-[#E2AF19]" : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    recurringEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Frequency Selector */}
            {recurringEnabled && (
              <div>
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className="w-full bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-white font-satoshi text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFormData({
                    recipient: "",
                    amount: "",
                    date: "",
                    time: "",
                    description: "",
                  });
                  setRecurringEnabled(false);
                  setError("");
                }}
                className="flex-1 px-4 py-3 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity"
              >
                Reset
              </button>
              <Button
                onClick={handleCreatePreview}
                disabled={loading}
                className="flex-1 font-satoshi"
              >
                {loading ? "Loading..." : "Schedule Payment"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Mobile */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white font-satoshi">
              Scheduled Payments
            </h3>

            {/* Tab Buttons */}
            <div className="flex bg-[#0F0F0F] rounded-lg p-1 border border-[#2C2C2C]">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1.5 rounded-md font-satoshi text-sm transition-colors ${
                  activeTab === "active"
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-3 py-1.5 rounded-md font-satoshi text-sm transition-colors ${
                  activeTab === "completed"
                    ? "bg-[#E2AF19] text-black font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Mobile Transaction Cards */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw
                  size={20}
                  className="animate-spin text-gray-400 mx-auto mb-2"
                />
                <p className="text-gray-400 font-satoshi">Loading...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={24} className="text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 font-satoshi">
                  No {activeTab} scheduled payments found
                </p>
              </div>
            ) : (
              filteredPayments.map((payment) => {
                const tokenIcon = getTokenIcon(payment.tokenSymbol);
                return (
                  <div
                    key={payment.id}
                    className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                          <span className="text-white text-sm">
                            {payment.recipient.startsWith("0x")
                              ? "0"
                              : payment.recipient[1]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm font-satoshi">
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
                            <span className="text-gray-400 text-xs font-satoshi">
                              {payment.tokenSymbol}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-white font-bold font-satoshi">
                          {payment.amount} {payment.tokenSymbol}
                        </div>
                        <div className="text-gray-400 text-xs font-satoshi">
                          {formatDateTime(payment.scheduledFor)}
                        </div>
                      </div>
                    </div>

                    {/* Status and Frequency */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {payment.status === "active" && (
                          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-satoshi font-medium">
                            Active
                          </span>
                        )}
                        {payment.status === "completed" && (
                          <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-satoshi font-medium">
                            Completed
                          </span>
                        )}
                        {payment.frequency && payment.frequency !== "once" && (
                          <span className="bg-[#2C2C2C] text-gray-300 px-2 py-1 rounded-full text-xs font-satoshi flex items-center">
                            <Repeat size={10} className="mr-1" />
                            {payment.frequency}
                          </span>
                        )}
                        {payment.frequency === "once" && (
                          <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-satoshi flex items-center">
                            <Clock size={10} className="mr-1" />
                            One-time
                          </span>
                        )}
                      </div>

                      {payment.status === "active" && payment.nextExecution && (
                        <div className="text-right">
                          <div className="text-yellow-400 text-xs font-satoshi">
                            Next: {getTimeUntilExecution(payment.nextExecution)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-3 pt-3 border-t border-[#2C2C2C]">
                      {activeTab === "active" ? (
                        <>
                          <button
                            onClick={() =>
                              handleCancelPayment(payment.scheduleId)
                            }
                            className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center"
                          >
                            <Pause size={12} className="mr-1" />
                            Cancel
                          </button>
                          <button
                            onClick={() =>
                              handleDeletePayment(payment.scheduleId)
                            }
                            className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center"
                          >
                            <Trash2 size={12} className="mr-1" />
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                            <ExternalLink size={12} className="mr-1" />
                            Explorer
                          </button>
                          <button className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center">
                            <Hash size={12} className="mr-1" />
                            Hash
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex flex-col gap-6 flex-1 min-h-0">
        {/* Schedule Payment Form */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-6 font-satoshi">
            Schedule Payment
          </h2>

          {/* Form Row */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            <div className="col-span-3">
              <Input
                type="text"
                placeholder="@username or address"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                className="font-satoshi text-gray-400"
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
                className="font-satoshi"
              />
            </div>

            {/* Date Input */}
            <div className="col-span-2">
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="font-satoshi"
              />
            </div>

            {/* Time Input */}
            <div className="col-span-2">
              <Input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="font-satoshi"
              />
            </div>

            {/* Schedule Button */}
            <div className="col-span-1">
              <Button
                onClick={handleCreatePreview}
                disabled={loading}
                className="w-full h-full font-satoshi text-xs"
              >
                {loading ? "..." : "Schedule"}
              </Button>
            </div>
          </div>

          {/* Test Addresses Helper */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-gray-400 text-xs font-satoshi">
              Quick test addresses:
            </span>
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  recipient: "0x2Ef3C895f7A18088B384cA4bc3a19558351B7313",
                })
              }
              className="text-[#E2AF19] text-xs font-satoshi hover:opacity-80 transition-opacity"
            >
              Test Wallet 1
            </button>
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  recipient: "0xCAEAd2fC03e370107b097965971ebeCF19eB5226",
                })
              }
              className="text-[#E2AF19] text-xs font-satoshi hover:opacity-80 transition-opacity"
            >
              Test Wallet 2
            </button>
          </div>

          {/* Additional Options Row */}
          <div className="flex items-center justify-between mb-6">
            {/* Timezone Selector */}
            <div className="flex items-center space-x-4">
              <span className="text-white font-satoshi">Timezone:</span>
              <div className="relative">
                <button
                  onClick={() =>
                    setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)
                  }
                  className="flex items-center bg-black border border-[#2C2C2C] rounded-lg px-3 py-2"
                >
                  <span className="text-white font-satoshi text-sm mr-2">
                    {selectedTimezone.name}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {isTimezoneDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {timezones.map((timezone) => (
                      <button
                        key={timezone.idx}
                        onClick={() => {
                          setSelectedTimezone(timezone);
                          setIsTimezoneDropdownOpen(false);
                        }}
                        className="w-full flex items-center p-3 hover:bg-[#2C2C2C] transition-colors text-left"
                      >
                        <span className="text-white font-satoshi text-sm">
                          {timezone.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recurring Options */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-white font-satoshi mr-4">
                  Enable recurring payments
                </span>
                <button
                  onClick={() => setRecurringEnabled(!recurringEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    recurringEnabled ? "bg-[#E2AF19]" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      recurringEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {recurringEnabled && (
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className="bg-black border border-[#2C2C2C] rounded-lg px-3 py-2 text-white font-satoshi"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="font-satoshi w-full"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setFormData({
                  recipient: "",
                  amount: "",
                  date: "",
                  time: "",
                  description: "",
                });
                setRecurringEnabled(false);
                setError("");
              }}
              className="px-4 py-2 bg-[#4B3A08] text-[#E2AF19] rounded-lg font-satoshi hover:opacity-90 transition-opacity"
            >
              Reset
            </button>
            <Button
              onClick={handleCreatePreview}
              disabled={loading}
              className="font-satoshi"
            >
              {loading ? "Loading..." : "Create Schedule"}
            </Button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6 flex-1 flex flex-col min-h-0">
          {/* Header with Radio Options */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white font-satoshi">
              Scheduled Payments
            </h2>

            {/* Radio Options */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-black border border-[#2C2C2C] rounded-lg px-4 py-3">
                <input
                  type="radio"
                  id="active-radio"
                  name="payment-status"
                  checked={activeTab === "active"}
                  onChange={() => setActiveTab("active")}
                  className="h-4 w-4 mr-2"
                  style={{ accentColor: "#E2AF19" }}
                />
                <label
                  htmlFor="active-radio"
                  className="text-white font-satoshi text-sm"
                >
                  Active ({activeCount})
                </label>
              </div>

              <div className="flex items-center bg-black border border-[#2C2C2C] rounded-lg px-4 py-3">
                <input
                  type="radio"
                  id="completed-radio"
                  name="payment-status"
                  checked={activeTab === "completed"}
                  onChange={() => setActiveTab("completed")}
                  className="h-4 w-4 mr-2"
                  style={{ accentColor: "#E2AF19" }}
                />
                <label
                  htmlFor="completed-radio"
                  className="text-white font-satoshi text-sm"
                >
                  Completed ({completedCount})
                </label>
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className="bg-[#0F0F0F] rounded-lg mb-2">
            <div className="grid grid-cols-6 gap-2 px-3 py-3">
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Recipient
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Token
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Amount
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Frequency
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-left">
                Next Execution
              </div>
              <div className="text-gray-400 text-sm font-satoshi text-center">
                Actions
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw
                  size={20}
                  className="animate-spin text-gray-400 mr-2"
                />
                <span className="text-gray-400 font-satoshi">Loading...</span>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Clock size={32} className="text-gray-400 mb-4" />
                <h3 className="text-white text-lg font-satoshi mb-2">
                  No {activeTab} scheduled payments
                </h3>
                <p className="text-gray-400 font-satoshi text-center">
                  {activeTab === "active"
                    ? "Create your first scheduled payment to automate your crypto transfers"
                    : "Completed payments will appear here"}
                </p>
              </div>
            ) : (
              filteredPayments.map((payment, index) => {
                const tokenIcon = getTokenIcon(payment.tokenSymbol);
                return (
                  <div key={payment.id}>
                    <div className="grid grid-cols-6 gap-2 items-center py-2 px-3 hover:bg-[#1A1A1A] rounded-lg transition-colors">
                      <div className="flex items-center min-w-0">
                        <div className="w-6 h-6 bg-gray-600 rounded-full mr-2 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs">
                            {payment.recipient.startsWith("0x")
                              ? "0"
                              : payment.recipient[1]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <span className="text-white font-satoshi text-sm truncate">
                          {payment.recipient.slice(0, 8)}...
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
                          {payment.tokenSymbol}
                        </span>
                      </div>

                      <div className="text-white font-satoshi text-sm">
                        {payment.amount} {payment.tokenSymbol}
                      </div>

                      <div className="flex items-center">
                        {payment.frequency === "once" ? (
                          <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-satoshi flex items-center">
                            <Clock size={10} className="mr-1" />
                            One-time
                          </span>
                        ) : (
                          <span className="bg-[#2C2C2C] text-gray-300 px-2 py-1 rounded-full text-xs font-satoshi flex items-center">
                            <Repeat size={10} className="mr-1" />
                            {payment.frequency}
                          </span>
                        )}
                      </div>

                      <div className="text-white font-satoshi text-sm">
                        {payment.status === "active" &&
                        payment.nextExecution ? (
                          <div>
                            <div className="text-sm">
                              {formatDateTime(payment.nextExecution)}
                            </div>
                            <div className="text-yellow-400 text-xs">
                              {getTimeUntilExecution(payment.nextExecution)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>

                      <div className="text-center">
                        {activeTab === "active" ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() =>
                                handleCancelPayment(payment.scheduleId)
                              }
                              className="bg-red-600 text-white px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center"
                              title="Cancel"
                            >
                              <Pause size={10} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeletePayment(payment.scheduleId)
                              }
                              className="bg-gray-600 text-white px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center"
                              title="Delete"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ) : (
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
                        )}
                      </div>
                    </div>

                    {index < filteredPayments.length - 1 && (
                      <div className="border-b border-[#2C2C2C] mx-3 my-1"></div>
                    )}
                  </div>
                );
              })
            )}
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
                  Scheduled Payment Preview
                </h2>
                <p className="text-gray-400 text-sm font-satoshi mt-1">
                  Review your scheduled payment details
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
                {/* Payment Summary */}
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <h3 className="text-white font-semibold font-satoshi mb-4">
                    Payment Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Token
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {preview.tokenInfo.name} ({preview.tokenInfo.symbol})
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Amount
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {preview.amount} {preview.tokenInfo.symbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Recipient
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {preview.recipient.slice(0, 10)}...
                        {preview.recipient.slice(-6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Frequency
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {preview.frequency === "once"
                          ? "One-time"
                          : preview.frequency}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Details */}
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <h3 className="text-white font-semibold font-satoshi mb-4">
                    Schedule Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm font-satoshi">
                        First Execution:
                      </span>
                      <span className="text-white font-satoshi">
                        {preview.scheduledFor.toLocaleString()}
                      </span>
                    </div>
                    {preview.nextExecutions.length > 1 && (
                      <div>
                        <div className="text-gray-400 text-sm font-satoshi mb-2">
                          Next Executions:
                        </div>
                        <div className="space-y-1">
                          {preview.nextExecutions
                            .slice(1, 4)
                            .map((date, index) => (
                              <div
                                key={index}
                                className="text-white text-sm font-satoshi"
                              >
                                {date.toLocaleString()}
                              </div>
                            ))}
                          {preview.nextExecutions.length > 4 && (
                            <div className="text-gray-400 text-sm font-satoshi">
                              ...and more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                        Estimated Gas:
                      </span>
                      <span className="text-white font-satoshi">
                        {parseInt(preview.estimatedGas).toLocaleString()} gas
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Estimated Cost:
                      </span>
                      <span className="text-white font-satoshi">
                        {preview.gasCostETH} ETH (${preview.gasCostUSD})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Approval Required */}
                {preview.approvalRequired && (
                  <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle
                        size={16}
                        className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-yellow-400 text-sm font-satoshi font-medium mb-1">
                          Token Approval Required
                        </p>
                        <p className="text-yellow-400 text-xs font-satoshi">
                          Current allowance: {preview.currentAllowance}{" "}
                          {preview.tokenInfo.symbol}
                          <br />
                          Required allowance: {preview.requiredAllowance}{" "}
                          {preview.tokenInfo.symbol}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle
                      size={16}
                      className="text-blue-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-blue-400 text-sm font-satoshi font-medium mb-1">
                        🧪 Sepolia Testnet Scheduled Payment
                      </p>
                      <p className="text-blue-400 text-xs font-satoshi">
                        This will create a real scheduled payment on Sepolia
                        testnet. Payments will be executed automatically at the
                        specified times.
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
                  onClick={handleCreateScheduledPayment}
                  disabled={creating}
                  className="flex-1 font-satoshi"
                >
                  {creating ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Schedule"
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
                  Payment Scheduled Successfully!
                </h2>
                <p className="text-gray-400 text-sm font-satoshi mt-1">
                  Your payment has been scheduled
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
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-white" />
                  </div>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <h4 className="text-white font-semibold font-satoshi mb-3">
                    Schedule Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Schedule ID:</span>
                      <div className="flex items-center">
                        <span className="text-white mr-2 font-mono text-xs">
                          {result.scheduleId?.slice(0, 10)}...
                          {result.scheduleId?.slice(-8)}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(result.scheduleId!, "schedule")
                          }
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Scheduled For:</span>
                      <span className="text-white">
                        {result.scheduledFor
                          ? new Date(result.scheduledFor).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Next Execution:</span>
                      <span className="text-white">
                        {result.nextExecution
                          ? new Date(result.nextExecution).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-green-400">Active</span>
                    </div>
                  </div>

                  {copied === "schedule" && (
                    <p className="text-green-400 text-xs font-satoshi mt-2">
                      Schedule ID copied!
                    </p>
                  )}
                </div>

                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle
                      size={16}
                      className="text-blue-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-blue-400 text-sm font-satoshi font-medium mb-1">
                        Payment Scheduled Successfully
                      </p>
                      <p className="text-blue-400 text-xs font-satoshi">
                        Your payment will be executed automatically at the
                        scheduled time. You can view and manage your scheduled
                        payments in the list below.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#2C2C2C] bg-[#0F0F0F]">
              <Button
                onClick={() => {
                  setShowResult(false);
                  setActiveTab("active");
                }}
                className="w-full font-satoshi"
              >
                View Scheduled Payments
              </Button>
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

        /* Custom date input styling */
        input[type="date"] {
          color-scheme: dark;
        }
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }

        input[type="time"] {
          color-scheme: dark;
        }
        
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }

        /* Custom select styling */
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
      `}</style>
    </div>
  );
}
