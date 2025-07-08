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
  Zap,
  Shield,
} from "lucide-react";
import { RootState } from "@/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import UsernameInput from "@/components/ui/UsernameInput";
import { UserSuggestion } from "@/hooks/useUsernameSearch";
import { SkeletonScheduledPayments } from "@/components/ui/Skeleton";
import { DateTimePicker } from "@/components/ui/DateTimePicker";

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
  lastTransactionHash?: string;
  timezone?: string;
  estimatedGas?: string;
  gasCostETH?: string;
  gasCostUSD?: string;
  smartContract?: boolean;
  enhancedAPI?: boolean;
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
  taxETH: string;
  taxUSD: string;
  totalCostETH: string;
  totalCostUSD: string;
  approvalRequired: boolean;
  smartContractOptimized: boolean;
}

// Token icon helper functions
const getTokenIconColor = (symbol: string) => {
  const colors: Record<string, string> = {
    Ethereum: "bg-blue-500",
    ETH: "bg-blue-500",
    USDT: "bg-green-500",
    USDC: "bg-blue-600",
    LINK: "bg-blue-700",
    DAI: "bg-yellow-500",
    UNI: "bg-pink-500",
    Solana: "bg-purple-500",
    Polkadot: "bg-pink-500",
    Sui: "bg-cyan-500",
    XRP: "bg-gray-500",
    WBTC: "bg-orange-500",
    AAVE: "bg-purple-600",
    MATIC: "bg-purple-700",
    CRV: "bg-red-500",
    COMP: "bg-green-600",
  };
  return colors[symbol] || "bg-gray-500";
};

const getTokenLetter = (symbol: string) => {
  const letters: Record<string, string> = {
    Ethereum: "Ξ",
    ETH: "Ξ",
    USDT: "₮",
    USDC: "$",
    LINK: "⛓",
    DAI: "◈",
    UNI: "🦄",
    Solana: "◎",
    Polkadot: "●",
    Sui: "~",
    XRP: "✕",
    WBTC: "₿",
    AAVE: "👻",
    MATIC: "◆",
    CRV: "🌊",
    COMP: "🧠",
  };
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
      url.includes("cdn") ||
      url.includes("assets"))
  );
};

const TokenIcon = ({
  token,
  size = "w-5 h-5",
}: {
  token: any;
  size?: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const showImage = !imageError && isValidImageUrl(token.icon);

  return (
    <div className="relative flex-shrink-0">
      {showImage ? (
        <>
          <img
            src={token.icon}
            alt={token.symbol}
            className={`${size} rounded-full`}
            onError={(e) => {
              console.log(
                `❌ Image load failed for ${token.symbol}: ${token.icon}`
              );
              setImageError(true);
            }}
          />
          <div
            className={`${size} ${getTokenIconColor(
              token.symbol
            )} rounded-full flex items-center justify-center absolute top-0 left-0 ${
              imageError ? "block" : "hidden"
            }`}
          >
            <span className="text-white text-xs font-medium">
              {getTokenLetter(token.symbol)}
            </span>
          </div>
        </>
      ) : (
        <div
          className={`${size} ${getTokenIconColor(
            token.symbol
          )} rounded-full flex items-center justify-center`}
        >
          <span className="text-white text-xs font-medium">
            {getTokenLetter(token.symbol)}
          </span>
        </div>
      )}
    </div>
  );
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
  const [selectedTimezone, setSelectedTimezone] = useState(timezones[1]);
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
  const [initialLoading, setInitialLoading] = useState(true);

  // Selected user state for username input
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".token-dropdown") && isTokenDropdownOpen) {
        setIsTokenDropdownOpen(false);
      }
      if (!target.closest(".timezone-dropdown") && isTimezoneDropdownOpen) {
        setIsTimezoneDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTokenDropdownOpen, isTimezoneDropdownOpen]);

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
        icon: firstToken.icon,
      });
    }
  }, [tokens, selectedToken]);

  // Fetch scheduled payments
  useEffect(() => {
    if (activeWallet?.address) {
      fetchScheduledPayments();
    }
  }, [activeWallet?.address, activeTab]);

  useEffect(() => {
    if (activeWallet?.address) {
      loadInitialData();
    }
  }, [activeWallet?.address]);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

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

  // Handle username/address input change
  const handleRecipientChange = (
    value: string,
    suggestion?: UserSuggestion
  ) => {
    setFormData({ ...formData, recipient: value });

    if (suggestion) {
      setSelectedUser(suggestion);
      console.log("✅ User selected for scheduled payment:", suggestion);
    } else {
      setSelectedUser(null);
    }

    // Clear error when user types
    if (error) {
      setError("");
    }
  };

  // Handle user selection from dropdown
  const handleUserSelect = (user: UserSuggestion) => {
    setSelectedUser(user);
    setFormData({ ...formData, recipient: user.walletAddress });
    console.log("✅ User selected from dropdown:", user);
  };

  const handleDeletePayment = async (scheduleId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this scheduled payment? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/scheduled-payments/${scheduleId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Payment deleted successfully");
        fetchScheduledPayments();
      } else {
        setError(data.error || "Failed to delete payment");
      }
    } catch (error: any) {
      console.error("❌ Error deleting payment:", error);
      setError("Failed to delete payment");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled payment?")) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/scheduled-payments/${scheduleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
          status: "cancelled",
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Payment cancelled successfully");
        fetchScheduledPayments();
      } else {
        setError(data.error || "Failed to cancel payment");
      }
    } catch (error: any) {
      console.error("❌ Error cancelling payment:", error);
      setError("Failed to cancel payment");
    } finally {
      setLoading(false);
    }
  };

  const openExplorer = (payment: ScheduledPayment) => {
    if (payment.lastTransactionHash) {
      const explorerUrl = `https://etherscan.io/tx/${payment.lastTransactionHash}`;
      window.open(explorerUrl, "_blank");
    } else {
      const explorerUrl = `https://etherscan.io/address/${payment.walletAddress}`;
      window.open(explorerUrl, "_blank");
    }
  };

  const copyTransactionHash = async (payment: ScheduledPayment) => {
    if (payment.lastTransactionHash) {
      try {
        await navigator.clipboard.writeText(payment.lastTransactionHash);
        setCopied(`hash-${payment.id}`);
        setTimeout(() => setCopied(""), 2000);
      } catch (err) {
        console.error("Failed to copy transaction hash:", err);
        setError("Failed to copy transaction hash");
      }
    } else {
      try {
        await navigator.clipboard.writeText(payment.scheduleId);
        setCopied(`schedule-${payment.id}`);
        setTimeout(() => setCopied(""), 2000);
      } catch (err) {
        console.error("Failed to copy schedule ID:", err);
        setError("Failed to copy schedule ID");
      }
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

    // Enhanced validation for username/address
    if (selectedUser) {
      // User selected from dropdown - use their wallet address
      if (
        !selectedUser.walletAddress ||
        !/^0x[a-fA-F0-9]{40}$/.test(selectedUser.walletAddress)
      ) {
        setError("Selected user has an invalid wallet address");
        return false;
      }
    } else {
      // Direct address input - validate format
      if (!/^0x[a-fA-F0-9]{40}$/.test(formData.recipient)) {
        setError(
          "Invalid recipient address format. Please enter a valid address or select a user"
        );
        return false;
      }
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

    const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);
    if (scheduledDateTime <= new Date()) {
      setError("Scheduled time must be in the future");
      return false;
    }

    return true;
  };

  const handleCreatePreview = async () => {
    console.log("🚀 Creating smart contract scheduled payment preview...");

    if (!validateForm() || !selectedToken || !activeWallet?.address) {
      console.log("❌ Validation failed");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);
      const frequency = recurringEnabled ? recurringFrequency : "once";

      // Use selected user's wallet address if available, otherwise use direct input
      const recipientAddress = selectedUser
        ? selectedUser.walletAddress
        : formData.recipient;

      const requestBody = {
        action: "preview",
        tokenInfo: selectedToken,
        fromAddress: activeWallet.address,
        recipient: recipientAddress,
        amount: formData.amount,
        scheduledFor: scheduledDateTime.toISOString(),
        frequency,
        timezone: selectedTimezone.tz,
      };

      console.log("📡 Sending smart contract preview request:", {
        ...requestBody,
        selectedUser: selectedUser
          ? `@${selectedUser.username}`
          : "Direct address",
      });

      const response = await fetch("/api/scheduled-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create preview");
      }

      setPreview(data.preview);
      setShowPreview(true);
      console.log("✅ Smart contract preview created successfully");
    } catch (err: any) {
      console.error("❌ Preview error:", err);
      setError(err.message || "Failed to create preview");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScheduledPayment = async () => {
    console.log("🚀 Creating smart contract scheduled payment...");

    if (!preview || !activeWallet?.address) return;

    setCreating(true);
    setError("");

    try {
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);
      const frequency = recurringEnabled ? recurringFrequency : "once";

      // Use selected user's wallet address if available
      const recipientAddress = selectedUser
        ? selectedUser.walletAddress
        : formData.recipient;

      const createBody = {
        action: "create",
        tokenInfo: selectedToken,
        fromAddress: activeWallet.address,
        recipient: recipientAddress,
        amount: formData.amount,
        scheduledFor: scheduledDateTime.toISOString(),
        frequency,
        timezone: selectedTimezone.tz,
        description: formData.description,
      };

      console.log("📡 Sending smart contract create request:", {
        ...createBody,
        selectedUser: selectedUser
          ? `@${selectedUser.username}`
          : "Direct address",
      });

      const response = await fetch("/api/scheduled-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
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
      setSelectedUser(null);
      setRecurringEnabled(false);

      console.log("✅ Smart contract scheduled payment created successfully");

      fetchScheduledPayments();
    } catch (err: any) {
      console.error("❌ Create error:", err);
      setError(err.message || "Failed to create scheduled payment");
    } finally {
      setCreating(false);
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

  const renderMobileActionButtons = (payment: ScheduledPayment) => {
    if (activeTab === "active") {
      return (
        <>
          <button
            onClick={() => handleCancelPayment(payment.scheduleId)}
            disabled={loading}
            className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center disabled:opacity-50"
          >
            <Pause size={12} className="mr-1" />
            {loading ? "..." : "Cancel"}
          </button>
          <button
            onClick={() => handleDeletePayment(payment.scheduleId)}
            disabled={loading}
            className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center disabled:opacity-50"
          >
            <Trash2 size={12} className="mr-1" />
            {loading ? "..." : "Delete"}
          </button>
        </>
      );
    } else {
      return (
        <>
          <button
            onClick={() => openExplorer(payment)}
            className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center"
          >
            <ExternalLink size={12} className="mr-1" />
            Explorer
          </button>
          <button
            onClick={() => copyTransactionHash(payment)}
            className="text-[#E2AF19] text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center"
          >
            <Hash size={12} className="mr-1" />
            {copied === `hash-${payment.id}` ||
            copied === `schedule-${payment.id}`
              ? "Copied!"
              : payment.lastTransactionHash
              ? "Hash"
              : "ID"}
          </button>
        </>
      );
    }
  };

  const renderDesktopActionButtons = (payment: ScheduledPayment) => {
    if (activeTab === "active") {
      return (
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => handleCancelPayment(payment.scheduleId)}
            disabled={loading}
            className="bg-red-600 text-white px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center disabled:opacity-50"
            title="Cancel"
          >
            <Pause size={10} />
          </button>
          <button
            onClick={() => handleDeletePayment(payment.scheduleId)}
            disabled={loading}
            className="bg-gray-600 text-white px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={10} />
          </button>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => openExplorer(payment)}
            className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center"
            title={
              payment.lastTransactionHash ? "View Transaction" : "View Address"
            }
          >
            <ExternalLink size={10} className="mr-1" />
            Explorer
          </button>
          <button
            onClick={() => copyTransactionHash(payment)}
            className="text-[#E2AF19] px-2 py-1 rounded-md text-xs font-satoshi font-medium hover:opacity-90 transition-opacity flex items-center"
            title={
              payment.lastTransactionHash
                ? "Copy Transaction Hash"
                : "Copy Schedule ID"
            }
          >
            <Hash size={10} className="mr-1" />
            {copied === `hash-${payment.id}` ||
            copied === `schedule-${payment.id}`
              ? "Copied!"
              : payment.lastTransactionHash
              ? "Hash"
              : "ID"}
          </button>
        </div>
      );
    }
  };

  const getTokenBackgroundColor = (
    symbol: string,
    contractAddress?: string
  ) => {
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

    return (
      colors[symbol] || "bg-gradient-to-br from-gray-500/20 to-gray-600/30"
    );
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

  if (initialLoading) {
    return <SkeletonScheduledPayments />;
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-2 sm:p-3 lg:p-4 flex flex-col overflow-hidden">
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
          <h2 className="text-lg font-semibold text-white mb-4 font-mayeka-demi-bold-demo">
            Schedule Payment
          </h2>

          <div className="space-y-4">
            {/* Username/Address Input - Full width (larger) */}
            <div>
              <UsernameInput
                value={formData.recipient}
                onChange={handleRecipientChange}
                onUserSelect={handleUserSelect}
                placeholder="@username or address"
                className="font-satoshi text-gray-400"
              />
            </div>

            {/* Token, Amount, and Timezone Row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Token Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                  className="flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 w-full"
                >
                  <div className="flex items-center">
                    {selectedToken && (
                      <>
                        <TokenIcon token={selectedToken} size="w-5 h-5" />
                        <span className="text-white font-satoshi text-sm ml-2">
                          {selectedToken.symbol}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>

                {/* Token Dropdown */}
                {isTokenDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {tokens.map((token) => (
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
                            icon: token.icon,
                          });
                          setIsTokenDropdownOpen(false);
                        }}
                        className="w-full flex items-center p-3 hover:bg-[#2C2C2C] transition-colors text-left"
                      >
                        <TokenIcon token={token} size="w-5 h-5" />
                        <div className="flex-1 ml-2">
                          <div className="text-white font-satoshi text-sm">
                            {token.symbol}
                          </div>
                          <div className="text-gray-400 font-satoshi text-xs">
                            Balance: {token.balance.toFixed(4)}
                          </div>
                        </div>
                      </button>
                    ))}
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

              {/* Timezone Selector */}
              <div className="relative">
                <button
                  onClick={() =>
                    setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)
                  }
                  className="flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 w-full"
                >
                  <span className="text-white font-satoshi text-sm truncate">
                    {selectedTimezone.tz}
                  </span>
                  <ChevronDown
                    size={16}
                    className="text-gray-400 flex-shrink-0"
                  />
                </button>

                {isTimezoneDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-xl max-h-48 overflow-y-auto">
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

            {/* Mobile Layout - Date and Time Row */}
            <div className="xl:hidden space-y-4">
              {/* Date Time Picker - Full width on mobile */}
              <div>
                <DateTimePicker
                  dateValue={formData.date}
                  timeValue={formData.time}
                  onDateChange={(value) =>
                    setFormData({ ...formData, date: value })
                  }
                  onTimeChange={(value) =>
                    setFormData({ ...formData, time: value })
                  }
                  placeholder="Select date & time"
                  className="font-satoshi"
                />
              </div>

              {/* Recurring Toggle - Next line on mobile */}
              <div className="flex items-center">
                <Repeat size={16} className="text-gray-400 mr-2" />
                <span className="text-white font-satoshi text-sm mr-3">
                  Enable recurring payments
                </span>
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
                  setSelectedUser(null);
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
                {loading ? "Loading..." : "Create Schedule"}
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
                const paymentToken = tokens.find(
                  (t) =>
                    t.symbol === payment.tokenSymbol ||
                    t.contractAddress === payment.contractAddress
                ) || {
                  symbol: payment.tokenSymbol,
                  name: payment.tokenName,
                  icon: null,
                };

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
                            <TokenIcon token={paymentToken} size="w-4 h-4" />
                            <span className="text-gray-400 text-xs font-satoshi ml-1">
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
                      {renderMobileActionButtons(payment)}
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
          <h2 className="text-lg font-semibold text-white mb-6 font-mayeka-demi-bold-demo">
            Schedule Payment
          </h2>

          {/* Form Row 1 - Username/Address (spans 6 columns) */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Username/Address Input - Takes up 6 columns (double width) */}
            <div className="col-span-6">
              <UsernameInput
                value={formData.recipient}
                onChange={handleRecipientChange}
                onUserSelect={handleUserSelect}
                placeholder="@username or address"
                className="font-satoshi text-gray-400"
              />
            </div>

            {/* Token Selector */}
            <div className="col-span-2 relative token-dropdown">
              <button
                onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                className="w-full h-full flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-left hover:border-[#E2AF19] transition-colors"
              >
                <div className="flex items-center">
                  {selectedToken && (
                    <>
                      <div
                        className={`w-6 h-6 ${getTokenBackgroundColor(
                          selectedToken.symbol,
                          selectedToken.contractAddress
                        )} rounded-full flex items-center justify-center`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center">
                          <TokenIcon token={selectedToken} size="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-white font-satoshi text-sm ml-2">
                        {selectedToken.symbol}
                      </span>
                    </>
                  )}
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {/* Token dropdown */}
              {isTokenDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {tokens.map((token) => (
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
                          icon: token.icon,
                        });
                        setIsTokenDropdownOpen(false);
                      }}
                      className="w-full flex items-center p-3 hover:bg-[#2C2C2C] transition-colors text-left"
                    >
                      <div
                        className={`w-6 h-6 ${getTokenBackgroundColor(
                          token.symbol,
                          token.contractAddress
                        )} rounded-full flex items-center justify-center`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center">
                          <TokenIcon token={token} size="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex-1 ml-2">
                        <div className="text-white font-satoshi text-sm">
                          {token.symbol}
                        </div>
                        <div className="text-gray-400 font-satoshi text-xs">
                          Balance: {token.balance.toFixed(4)}
                        </div>
                      </div>
                    </button>
                  ))}
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

            {/* Timezone Selector */}
            <div className="col-span-2 relative timezone-dropdown">
              <button
                onClick={() =>
                  setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)
                }
                className="w-full h-full flex items-center justify-between bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-left hover:border-[#E2AF19] transition-colors"
              >
                <span className="text-white font-satoshi text-sm truncate">
                  {selectedTimezone.tz}
                </span>
                <ChevronDown
                  size={14}
                  className="text-gray-400 ml-2 flex-shrink-0"
                />
              </button>

              {isTimezoneDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-black border border-[#2C2C2C] rounded-lg shadow-xl max-h-48 overflow-y-auto">
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

          {/* Desktop Layout - Form Row 2 - Date with Time and Recurring Toggle */}
          <div className="hidden xl:grid xl:grid-cols-12 xl:gap-4 xl:mb-4">
            {/* Date with Time Input - Takes up 3 columns (reduced from 4) */}
            <div className="col-span-3">
              <DateTimePicker
                dateValue={formData.date}
                timeValue={formData.time}
                onDateChange={(value) =>
                  setFormData({ ...formData, date: value })
                }
                onTimeChange={(value) =>
                  setFormData({ ...formData, time: value })
                }
                placeholder="Select date & time"
                className="font-satoshi"
              />
            </div>

            {/* Spacer - Takes up 4 columns (increased from 3) */}
            <div className="col-span-4"></div>

            {/* Recurring Toggle - Takes up 5 columns at the end */}
            <div className="col-span-5 flex items-center justify-end">
              <div className="flex items-center">
                <Repeat size={16} className="text-gray-400 mr-2" />
                <span className="text-white font-satoshi text-sm mr-3">
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
            </div>
          </div>

          {/* Frequency Selector (only shows when recurring is enabled) */}
          {recurringEnabled && (
            <div className="mb-6">
              <select
                value={recurringFrequency}
                onChange={(e) => setRecurringFrequency(e.target.value)}
                className="bg-black border border-[#2C2C2C] rounded-lg px-3 py-3 text-white font-satoshi text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

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
                setSelectedUser(null);
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
              {loading ? "Loading..." : "Transfer"}
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
                const paymentToken = tokens.find(
                  (t) =>
                    t.symbol === payment.tokenSymbol ||
                    t.contractAddress === payment.contractAddress
                ) || {
                  symbol: payment.tokenSymbol,
                  name: payment.tokenName,
                  icon: null,
                };

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
                        <TokenIcon token={paymentToken} size="w-5 h-5" />
                        <span className="text-white font-satoshi text-sm truncate ml-2">
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
                        {renderDesktopActionButtons(payment)}
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

      {/* Updated Preview Modal with Description Input */}
      {showPreview && preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-white font-mayeka">
                    Smart Contract Payment Preview
                  </h2>
                  <div className="flex items-center bg-gradient-to-r from-blue-500 to-purple-600 px-2 py-1 rounded-full">
                    <Zap size={12} className="text-white mr-1" />
                    <span className="text-white text-xs">Enhanced</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm font-satoshi">
                  Review your smart contract scheduled payment details
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
                {/* Description Input Field */}
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <h3 className="text-white font-semibold font-satoshi mb-3">
                    Payment Description
                  </h3>
                  <Input
                    type="text"
                    placeholder="Add a description for this payment (optional)"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="font-satoshi w-full"
                  />
                  <p className="text-gray-400 text-xs font-satoshi mt-2">
                    This description will help you identify this payment in your
                    transaction history.
                  </p>
                </div>

                {/* Smart Contract Features */}
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Shield size={16} className="text-blue-400 mr-2" />
                    <h3 className="text-blue-400 font-semibold font-satoshi">
                      Smart Contract Benefits
                    </h3>
                  </div>
                  <ul className="text-blue-400 text-sm font-satoshi space-y-1">
                    <li>• Automatic tax calculation and deduction (0.5%)</li>
                    <li>• Gas optimized execution</li>
                    <li>• Enhanced security with smart contract</li>
                    <li>• Transparent and auditable transactions</li>
                  </ul>
                </div>

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
                        {selectedUser
                          ? `@${selectedUser.username}`
                          : `${preview.recipient.slice(
                              0,
                              10
                            )}...${preview.recipient.slice(-6)}`}
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
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Timezone
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {selectedTimezone.tz}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm font-satoshi">
                        Scheduled For
                      </div>
                      <div className="text-white font-bold font-satoshi">
                        {formatDateTime(preview.scheduledFor)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown with Tax */}
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <h3 className="text-white font-semibold font-satoshi mb-4">
                    Cost Breakdown
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
                        Gas Cost:
                      </span>
                      <span className="text-white font-satoshi">
                        {preview.gasCostETH} ETH (${preview.gasCostUSD})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Smart Contract Tax (0.5%):
                      </span>
                      <span className="text-yellow-400 font-satoshi">
                        {preview.taxETH} ETH (${preview.taxUSD})
                      </span>
                    </div>
                    <div className="border-t border-[#2C2C2C] pt-2">
                      <div className="flex justify-between">
                        <span className="text-white font-semibold font-satoshi">
                          Total Cost:
                        </span>
                        <span className="text-white font-bold font-satoshi">
                          {preview.totalCostETH} ETH (${preview.totalCostUSD})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Info */}
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle
                      size={16}
                      className="text-green-400 mr-2 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-green-400 text-sm font-satoshi font-medium mb-1">
                        Smart Contract Powered
                      </p>
                      <p className="text-green-400 text-xs font-satoshi">
                        This payment will be executed through our audited smart
                        contract with automatic tax handling and optimized gas
                        usage.
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
                    <>
                      <Zap size={16} className="mr-2" />
                      Create Smart Contract Schedule
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Result Modal */}
      {showResult && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-mayeka">
                  Payment Scheduled!
                </h2>
                <div className="flex items-center bg-gradient-to-r from-green-500 to-emerald-600 px-2 py-1 rounded-full">
                  <CheckCircle size={12} className="text-white mr-1" />
                  <span className="text-white text-xs">Success</span>
                </div>
              </div>
              <button
                onClick={() => setShowResult(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle size={16} className="text-green-400 mr-2" />
                    <span className="text-green-400 font-semibold font-satoshi">
                      Smart Contract Scheduled Payment Created
                    </span>
                  </div>
                  <p className="text-green-400 text-sm font-satoshi">
                    Your payment has been successfully scheduled with our smart
                    contract system.
                  </p>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C]">
                  <h3 className="text-white font-semibold font-satoshi mb-3">
                    Schedule Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Schedule ID:
                      </span>
                      <div className="flex items-center">
                        <span className="text-white font-mono text-sm">
                          {result.scheduleId?.slice(0, 12)}...
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(result.scheduleId, "scheduleId")
                          }
                          className="ml-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                        {copied === "scheduleId" && (
                          <span className="ml-2 text-green-400 text-xs">
                            Copied!
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Next Execution:
                      </span>
                      <span className="text-white text-sm">
                        {formatDateTime(result.nextExecution)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm font-satoshi">
                        Smart Contract:
                      </span>
                      <span className="text-blue-400 text-sm">
                        {result.contractAddress?.slice(0, 12)}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Zap size={16} className="text-blue-400 mr-2" />
                    <span className="text-blue-400 font-semibold font-satoshi">
                      Enhanced Features Enabled
                    </span>
                  </div>
                  <ul className="text-blue-400 text-sm font-satoshi space-y-1">
                    <li>• Gas optimization for lower fees</li>
                    <li>• Automatic tax calculation</li>
                    <li>• Smart contract security</li>
                    <li>• Real-time execution monitoring</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#2C2C2C] bg-[#0F0F0F]">
              <Button
                onClick={() => setShowResult(false)}
                className="w-full font-satoshi"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Custom select styling for time picker dropdowns */
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }

        /* Custom scrollbar for select dropdowns */
        select::-webkit-scrollbar {
          width: 6px;
        }

        select::-webkit-scrollbar-track {
          background: #2c2c2c;
          border-radius: 3px;
        }

        select::-webkit-scrollbar-thumb {
          background: #4c4c4c;
          border-radius: 3px;
        }

        select::-webkit-scrollbar-thumb:hover {
          background: #e2af19;
        }
      `}</style>
    </div>
  );
}
