// src/components/payments/GlobalPaymentExecutor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Play, Pause, Zap } from "lucide-react";
import { RootState } from "@/store";
import { webScheduledPaymentExecutor } from "@/lib/web-scheduled-payment-executor";

export default function GlobalPaymentExecutor() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [executorRunning, setExecutorRunning] = useState(false);
  const [executorStatus, setExecutorStatus] = useState<any>(null);
  const [showStatus, setShowStatus] = useState(false);
  const executorInitialized = useRef(false);

  // Initialize executor when user is authenticated and has wallet
  useEffect(() => {
    console.log("🔧 Global Payment Executor - Initialization check", {
      isAuthenticated,
      hasActiveWallet: !!activeWallet,
      executorInitialized: executorInitialized.current,
    });

    if (isAuthenticated && activeWallet && !executorInitialized.current) {
      console.log("🚀 Initializing global payment executor...");
      initializePaymentExecutor();
      executorInitialized.current = true;
    }

    // Cleanup when user logs out
    if (!isAuthenticated && executorInitialized.current) {
      console.log("🛑 User logged out, stopping executor...");
      webScheduledPaymentExecutor.stop();
      setExecutorRunning(false);
      setExecutorStatus(null);
      executorInitialized.current = false;
    }
  }, [isAuthenticated, activeWallet]);

  // Update executor status periodically
  useEffect(() => {
    if (executorRunning) {
      const statusInterval = setInterval(() => {
        const status = webScheduledPaymentExecutor.getStatus();
        setExecutorStatus(status);
      }, 5000);

      return () => clearInterval(statusInterval);
    }
  }, [executorRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (executorRunning) {
        console.log("🧹 Cleaning up global payment executor...");
        webScheduledPaymentExecutor.stop();
      }
    };
  }, []);

  const initializePaymentExecutor = async () => {
    try {
      if (!activeWallet?.address) {
        console.log("❌ No active wallet found for executor");
        return;
      }

      console.log("🔑 Getting private key for global payment executor...");

      const response = await fetch("/api/wallets/private-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ Private key retrieved, starting global executor...");

        webScheduledPaymentExecutor.setPrivateKey(data.privateKey);
        webScheduledPaymentExecutor.start();

        setExecutorRunning(true);
        setExecutorStatus(webScheduledPaymentExecutor.getStatus());

        console.log("✅ Global payment executor started successfully!");

        // Show notification
        if ("Notification" in window && Notification.permission !== "denied") {
          if (Notification.permission === "granted") {
            new Notification("Auto-Payment System Active", {
              body: "Your scheduled payments will be executed automatically",
              icon: "/favicon.ico",
            });
          } else {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                new Notification("Auto-Payment System Active", {
                  body: "Your scheduled payments will be executed automatically",
                  icon: "/favicon.ico",
                });
              }
            });
          }
        }
      } else {
        console.error("❌ Failed to get private key:", data.error);
      }
    } catch (error) {
      console.error("💥 Error initializing global payment executor:", error);
    }
  };

  const toggleExecutor = () => {
    if (executorRunning) {
      console.log("🛑 Stopping global payment executor...");
      webScheduledPaymentExecutor.stop();
      setExecutorRunning(false);
      setExecutorStatus(null);
    } else {
      console.log("🚀 Starting global payment executor...");
      initializePaymentExecutor();
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated || !activeWallet) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Executor Button */}
      <div className="relative">
        <button
          onClick={() => setShowStatus(!showStatus)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            executorRunning
              ? "bg-green-500 hover:bg-green-600 animate-pulse"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
          title={`Auto-Payment System: ${
            executorRunning ? "Active" : "Inactive"
          }`}
        >
          {executorRunning ? (
            <Zap size={24} className="text-white" />
          ) : (
            <Pause size={24} className="text-white" />
          )}
        </button>

        {/* Status indicator dot */}
        <div
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            executorRunning ? "bg-green-400" : "bg-red-400"
          }`}
        />

        {/* Processing indicator */}
        {executorStatus?.processingPayments?.length > 0 && (
          <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-bounce">
            {executorStatus.processingPayments.length}
          </div>
        )}
      </div>

      {/* Status Panel */}
      {showStatus && (
        <div className="absolute bottom-16 right-0 w-80 bg-black border border-[#2C2C2C] rounded-lg p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold font-satoshi">
              Auto-Payment System
            </h3>
            <button
              onClick={toggleExecutor}
              className={`px-3 py-1 rounded-full text-xs font-satoshi ${
                executorRunning
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {executorRunning ? "Stop" : "Start"}
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span
                className={executorRunning ? "text-green-400" : "text-red-400"}
              >
                {executorRunning ? "Running" : "Stopped"}
              </span>
            </div>

            {executorStatus && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Executor ID:</span>
                  <span className="text-white font-mono text-xs">
                    {executorStatus.executorId?.slice(0, 8)}...
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Network:</span>
                  <span className="text-white">
                    {executorStatus.useTestnet ? "Testnet" : "Mainnet"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Processing:</span>
                  <span className="text-blue-400">
                    {executorStatus.processingPayments?.length || 0} payments
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Executed:</span>
                  <span className="text-green-400">
                    {executorStatus.executedPayments?.length || 0} payments
                  </span>
                </div>

                {executorStatus.nextCheck && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Next Check:</span>
                    <span className="text-white text-xs">
                      {new Date(executorStatus.nextCheck).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Activity */}
          {executorStatus?.processingPayments?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
              <div className="text-xs text-gray-400 mb-2">
                Currently Processing:
              </div>
              {executorStatus.processingPayments
                .slice(0, 3)
                .map((paymentId: string, index: number) => (
                  <div key={index} className="text-xs text-blue-400 font-mono">
                    {paymentId.slice(0, 20)}...
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
