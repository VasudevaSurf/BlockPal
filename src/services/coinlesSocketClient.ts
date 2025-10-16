// src/services/coinlesSocketClient.ts - COMPLETE WEBSOCKET CLIENT
import { io, Socket } from "socket.io-client";

class CoinlesSocketClient {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private currentEmail: string | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  connect(email: string) {
    if (this.socket && this.connected) {
      console.log("✅ Already connected to CoinLes WebSocket");
      return;
    }

    this.currentEmail = email;

    // Store email in localStorage for persistence
    if (typeof window !== "undefined" && email) {
      localStorage.setItem("coinlesUserEmail", email);
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_COINLES_WS_URL || "http://localhost:3001";
    console.log("🔌 Connecting to CoinLes WebSocket:", socketUrl);

    this.socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("✅ Connected to CoinLes WebSocket server");
      this.connected = true;

      // Trigger connect callback
      this.triggerCallback("connect", { connected: true });

      // Auto-register with stored email
      if (email) {
        console.log("📝 Registering user:", email);
        this.socket!.emit("register", { email });
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from CoinLes WebSocket:", reason);
      this.connected = false;

      // Trigger disconnect callback
      this.triggerCallback("disconnect", { reason });
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(
        "🔄 Reconnected to CoinLes WebSocket after",
        attemptNumber,
        "attempts"
      );

      // Re-register after reconnection
      if (this.currentEmail) {
        console.log(
          "📝 Re-registering user after reconnection:",
          this.currentEmail
        );
        this.socket!.emit("register", { email: this.currentEmail });
      }
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Reconnection attempt", attemptNumber);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error.message);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed after all attempts");
      this.triggerCallback("error", {
        message: "Failed to reconnect to server. Please refresh the page.",
      });
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error.message);
      this.triggerCallback("error", {
        message: "Failed to connect to server. Please check your connection.",
      });
    });

    // Set up event listeners for CoinLes specific events
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    // Watchlist events
    this.socket.on("watchlist", (data) => {
      console.log("📋 Received watchlist:", data?.length || 0, "tokens");
      this.triggerCallback("watchlist", data);
    });

    // Token updates (real-time)
    this.socket.on("token-update", (data) => {
      console.log(
        "🔄 Received token update:",
        data.chainId,
        data.contractAddress
      );
      this.triggerCallback("token-update", data);
    });

    // Search results
    this.socket.on("search-results", (data) => {
      console.log("🔍 Received search results:", data?.length || 0, "tokens");
      this.triggerCallback("search-results", data);
    });

    // Token added
    this.socket.on("token-added", (data) => {
      console.log("✅ Token added:", data);
      this.triggerCallback("token-added", data);
    });

    // Token removed
    this.socket.on("token-removed", (data) => {
      console.log("🗑️ Token removed:", data);
      this.triggerCallback("token-removed", data);
    });

    // Token details (for detail page)
    this.socket.on("token-details", (data) => {
      console.log("📊 Received token details");
      this.triggerCallback("token-details", data);
    });

    // Chart data
    this.socket.on("chart-data", (data) => {
      console.log("📈 Received chart data:", data?.length || 0, "points");
      this.triggerCallback("chart-data", data);
    });

    // Error handling
    this.socket.on("error", (data) => {
      console.error("❌ Server error:", data);
      this.triggerCallback("error", data);
    });
  }

  on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private triggerCallback(event: string, data: any) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event)!.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  emit(event: string, data: any) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("⚠️ Socket not connected, cannot emit:", event);
      // Attempt to reconnect
      this.reconnect();
    }
  }

  // Reconnect with stored email
  reconnect() {
    if (typeof window === "undefined") return;

    const email = localStorage.getItem("coinlesUserEmail");
    if (email && !this.connected) {
      console.log("🔄 Attempting to reconnect with email:", email);
      this.connect(email);
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Get current user email
  getCurrentEmail(): string | null {
    return (
      this.currentEmail ||
      (typeof window !== "undefined"
        ? localStorage.getItem("coinlesUserEmail")
        : null)
    );
  }

  // ========== CODELENS SPECIFIC METHODS ==========

  searchTokens(chain: string, query: string, email: string) {
    console.log("🔍 Searching tokens:", { chain, query });
    this.emit("search", { chain, query, email });
  }

  addToken(email: string, token: any) {
    console.log("➕ Adding token:", token.tokenSymbol);
    this.emit("add-token", { email, token });
  }

  removeToken(email: string, chainId: string, contractAddress: string) {
    console.log("🗑️ Removing token:", chainId, contractAddress);
    this.emit("remove-token", { email, chainId, contractAddress });
  }

  getTokenDetails(
    network: string,
    contractAddress: string,
    poolAddress: string
  ) {
    console.log("📊 Getting token details:", network, contractAddress);
    this.emit("get-token-details", { network, contractAddress, poolAddress });
  }

  getChartData(network: string, poolAddress: string, timeframe: string) {
    console.log("📈 Getting chart data:", network, poolAddress, timeframe);
    this.emit("get-chart-data", { network, poolAddress, timeframe });
  }

  pageChange(email: string, page: string, token: any = null) {
    console.log("📄 Page change:", page);
    this.emit("page-change", { email, page, token });
  }

  // Enhanced disconnect that clears stored data
  disconnect() {
    if (this.socket) {
      console.log("👋 Disconnecting from CoinLes WebSocket");
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentEmail = null;
      this.callbacks.clear();

      if (typeof window !== "undefined") {
        localStorage.removeItem("coinlesUserEmail");
      }
    }
  }

  // Force reconnect (useful for debugging)
  forceReconnect() {
    console.log("🔄 Force reconnecting...");
    this.disconnect();
    setTimeout(() => {
      this.reconnect();
    }, 1000);
  }
}

// Create singleton instance
export const coinlesSocketClient = new CoinlesSocketClient();

// Auto-reconnect on window focus (optional but useful)
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    if (!coinlesSocketClient.isConnected()) {
      console.log("👀 Window focused, checking connection...");
      coinlesSocketClient.reconnect();
    }
  });

  // Handle page visibility changes
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !coinlesSocketClient.isConnected()) {
      console.log("👀 Page visible, checking connection...");
      coinlesSocketClient.reconnect();
    }
  });
}
