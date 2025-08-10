// Real-time price service using WebSocket for Next.js/React
import { useEffect, useState, useRef, useCallback } from "react";

// WebSocket connection manager
class PriceWebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting = false;
  private subscribedTokens: Set<string> = new Set();

  constructor(private url: string = "ws://localhost:3001") {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        setTimeout(() => this.connect().then(resolve).catch(reject), 100);
        return;
      }

      this.isConnecting = true;
      console.log("🔌 Connecting to price server...");

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("✅ Connected to price server");
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Re-subscribe to all tokens
          this.subscribedTokens.forEach((token) => {
            this.sendMessage({ type: "subscribe", token });
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error("Failed to parse message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("🔌 Disconnected from price server");
          this.isConnecting = false;
          this.ws = null;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectDelay);
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case "welcome":
        console.log("👋 Welcome message received, client ID:", data.clientId);
        break;

      case "price":
        this.notifyListeners(data.token, data);
        break;

      case "error":
        console.error("Server error:", data.message);
        break;

      default:
        console.log("Unknown message type:", data);
    }
  }

  subscribe(tokenAddress: string, callback: (data: any) => void) {
    // Handle ETH/native token - convert to WETH address
    let normalizedAddress = tokenAddress.toLowerCase();
    if (normalizedAddress === "native" || normalizedAddress === "eth") {
      normalizedAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"; // WETH address
      console.log("🔄 Converting native/ETH to WETH address for price server");
    }

    // Add listener
    if (!this.listeners.has(normalizedAddress)) {
      this.listeners.set(normalizedAddress, new Set());
    }
    this.listeners.get(normalizedAddress)!.add(callback);

    // Track subscription
    if (!this.subscribedTokens.has(normalizedAddress)) {
      this.subscribedTokens.add(normalizedAddress);

      // Send subscribe message if connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: "subscribe", token: normalizedAddress });
      }
    }
  }

  unsubscribe(tokenAddress: string, callback: (data: any) => void) {
    let normalizedAddress = tokenAddress.toLowerCase();
    if (normalizedAddress === "native" || normalizedAddress === "eth") {
      normalizedAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"; // WETH address
    }
    const listeners = this.listeners.get(normalizedAddress);

    if (listeners) {
      listeners.delete(callback);

      // If no more listeners, unsubscribe from server
      if (listeners.size === 0) {
        this.listeners.delete(normalizedAddress);
        this.subscribedTokens.delete(normalizedAddress);

        if (this.ws?.readyState === WebSocket.OPEN) {
          this.sendMessage({ type: "unsubscribe", token: normalizedAddress });
        }
      }
    }
  }

  private notifyListeners(tokenAddress: string, data: any) {
    const normalizedAddress = tokenAddress.toLowerCase();
    const listeners = this.listeners.get(normalizedAddress);

    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in listener callback:", error);
        }
      });
    }
  }

  private sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, message not sent:", message);
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners.clear();
    this.subscribedTokens.clear();
  }
}

// Singleton instance
let priceManager: PriceWebSocketManager | null = null;

// Hook for using real-time prices with fallback support
export function useRealtimePrice(
  tokenAddress: string | null,
  enabled: boolean = true,
  fallbackChange?: number // Add fallback 24hr change parameter
) {
  const [priceData, setPriceData] = useState<{
    price: number;
    symbol: string;
    change: number;
    timestamp: string;
    isConnected: boolean;
    isLoading: boolean;
  }>({
    price: 0,
    symbol: "",
    change: fallbackChange || 0, // Use fallback if provided
    timestamp: new Date().toISOString(),
    isConnected: false,
    isLoading: true,
  });

  const callbackRef = useRef<(data: any) => void>();

  useEffect(() => {
    if (!tokenAddress || !enabled) return;

    // Convert native/ETH to WETH for price server
    let processedAddress = tokenAddress;
    if (
      tokenAddress.toLowerCase() === "native" ||
      tokenAddress.toLowerCase() === "eth"
    ) {
      processedAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"; // WETH
      console.log("📊 Using WETH address for ETH price tracking");
    }

    // Initialize manager if needed
    if (!priceManager) {
      priceManager = new PriceWebSocketManager();
    }

    // Create callback
    callbackRef.current = (data: any) => {
      setPriceData((prev) => ({
        price: data.price || 0,
        symbol: data.symbol || "",
        // If WebSocket doesn't provide change, keep the existing/fallback value
        change:
          data.change !== undefined
            ? data.change
            : fallbackChange || prev.change,
        timestamp: data.timestamp || new Date().toISOString(),
        isConnected: true,
        isLoading: false,
      }));
    };

    // Connect and subscribe
    const setup = async () => {
      try {
        await priceManager!.connect();
        priceManager!.subscribe(processedAddress, callbackRef.current!);
        setPriceData((prev) => ({ ...prev, isConnected: true }));
      } catch (error) {
        console.error("Failed to connect to price server:", error);
        setPriceData((prev) => ({
          ...prev,
          isConnected: false,
          isLoading: false,
        }));
      }
    };

    setup();

    // Cleanup
    return () => {
      if (priceManager && callbackRef.current) {
        priceManager.unsubscribe(processedAddress, callbackRef.current);
      }
    };
  }, [tokenAddress, enabled, fallbackChange]);

  // Update change when fallback changes
  useEffect(() => {
    if (fallbackChange !== undefined) {
      setPriceData((prev) => ({ ...prev, change: fallbackChange }));
    }
  }, [fallbackChange]);

  return priceData;
}

// Component for displaying real-time price with fallback support
export function RealtimePriceDisplay({
  tokenAddress,
  tokenSymbol,
  tokenBalance,
  fallbackPrice,
  fallbackChange,
  className = "",
  showChange = true,
  showTimestamp = false,
  showSparkline = false,
  size = "default",
}: {
  tokenAddress: string;
  tokenSymbol?: string;
  tokenBalance?: number;
  fallbackPrice?: number;
  fallbackChange?: number;
  className?: string;
  showChange?: boolean;
  showTimestamp?: boolean;
  showSparkline?: boolean;
  size?: "small" | "default" | "large";
}) {
  // Convert native/ETH to WETH address for price tracking
  const priceAddress =
    tokenAddress?.toLowerCase() === "native" ||
    tokenAddress?.toLowerCase() === "eth"
      ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" // WETH address
      : tokenAddress;

  const { price, symbol, change, timestamp, isConnected, isLoading } =
    useRealtimePrice(priceAddress, true, fallbackChange);

  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  useEffect(() => {
    if (price > 0) {
      setPriceHistory((prev) => {
        const newHistory = [...prev, price].slice(-20);
        return newHistory;
      });
    }
  }, [price]);

  const formatPrice = (value: number) => {
    if (value < 0.000001) return `$${value.toExponential(2)}`;
    if (value < 0.01) return `$${value.toFixed(8)}`;
    if (value < 1) return `$${value.toFixed(6)}`;
    if (value < 100) return `$${value.toFixed(4)}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatChange = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const sizeClasses = {
    small: "text-sm",
    default: "text-xl",
    large: "text-3xl",
  };

  // Calculate sparkline path
  const calculateSparkline = () => {
    if (priceHistory.length < 2) return "";

    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;
    const width = 50;
    const height = 20;

    const points = priceHistory.map((p, i) => {
      const x = (i / (priceHistory.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-700 rounded w-32"></div>
      </div>
    );
  }

  // Use fallback price if real-time price is not available
  const displayPrice = price > 0 ? price : fallbackPrice || 0;
  // Use the change value from state (which includes fallback)
  const displayChange = change;

  return (
    <div className={`relative ${className}`}>
      {/* Price display */}
      <div className="flex items-center gap-3">
        <div>
          <div
            className={`font-bold text-white ${sizeClasses[size]} font-satoshi`}
          >
            {displayPrice > 0 ? formatPrice(displayPrice) : "--"}
          </div>
          {/* {tokenBalance !== undefined && (
            <div className="text-gray-400 text-xs font-satoshi mt-1">
              {tokenBalance.toFixed(6)} {tokenSymbol || symbol || ""}
              {displayPrice > 0 && tokenBalance > 0 && (
                <span className="ml-2">
                  ≈ ${(displayPrice * tokenBalance).toFixed(2)}
                </span>
              )}
            </div>
          )} */}
        </div>

        {showChange && (
          <div
            className={`flex items-center text-sm font-satoshi ${
              displayChange >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            <span className="mr-1">{displayChange >= 0 ? "↑" : "↓"}</span>
            {formatChange(displayChange)}
          </div>
        )}

        {showSparkline && priceHistory.length > 1 && (
          <div className="ml-auto">
            <svg width="50" height="20" className="overflow-visible">
              <path
                d={calculateSparkline()}
                fill="none"
                stroke={displayChange >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth="1.5"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Symbol and timestamp */}
      {showTimestamp && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-400 text-xs font-satoshi">
            {symbol || tokenSymbol || "Loading..."}
          </span>
          <span className="text-gray-500 text-xs font-satoshi">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// Advanced price ticker with multiple features
export function AdvancedPriceTicker({
  tokenAddress,
  tokenInfo,
  className = "",
}: {
  tokenAddress: string;
  tokenInfo?: {
    name: string;
    symbol: string;
    balance?: string;
    decimals?: number;
    priceChange24h?: number; // Add this for fallback
  };
  className?: string;
}) {
  const { price, symbol, change, timestamp, isConnected } = useRealtimePrice(
    tokenAddress,
    true,
    tokenInfo?.priceChange24h
  );
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [highPrice, setHighPrice] = useState(0);
  const [lowPrice, setLowPrice] = useState(Infinity);

  useEffect(() => {
    if (price > 0) {
      setPriceHistory((prev) => {
        const newHistory = [...prev, price].slice(-20); // Keep last 20 prices
        return newHistory;
      });

      if (price > highPrice) setHighPrice(price);
      if (price < lowPrice) setLowPrice(price);
    }
  }, [price]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const calculateSparkline = () => {
    if (priceHistory.length < 2) return "";

    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;
    const width = 60;
    const height = 20;

    const points = priceHistory.map((p, i) => {
      const x = (i / (priceHistory.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  return (
    <div
      className={`bg-black rounded-lg border border-[#2C2C2C] p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">
            {tokenInfo?.name || symbol || "Token"}
          </h3>
          <span className="text-gray-400 text-sm">
            {tokenInfo?.symbol || symbol}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 text-xs ${
            isConnected ? "text-green-400" : "text-red-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-400" : "bg-red-400"
            } ${isConnected ? "animate-pulse" : ""}`}
          />
          {isConnected ? "Live" : "Disconnected"}
        </div>
      </div>

      {/* Main price */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-white mb-1">
          {price > 0 ? formatCurrency(price) : "--"}
        </div>
        <div
          className={`text-sm font-medium ${
            change >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}% (24h)
        </div>
      </div>

      {/* Mini sparkline */}
      {priceHistory.length > 1 && (
        <div className="mb-4">
          <svg width="60" height="20" className="overflow-visible">
            <path
              d={calculateSparkline()}
              fill="none"
              stroke={change >= 0 ? "#10b981" : "#ef4444"}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      {/* High/Low */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-400">24h High</span>
          <div className="text-white font-medium">
            {highPrice < Infinity ? formatCurrency(highPrice) : "--"}
          </div>
        </div>
        <div>
          <span className="text-gray-400">24h Low</span>
          <div className="text-white font-medium">
            {lowPrice < Infinity ? formatCurrency(lowPrice) : "--"}
          </div>
        </div>
      </div>

      {/* Last update */}
      <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
        <span className="text-gray-500 text-xs">
          Last update: {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export default { useRealtimePrice, RealtimePriceDisplay, AdvancedPriceTicker };
