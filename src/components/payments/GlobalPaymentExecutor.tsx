// src/components/payments/GlobalPaymentExecutor.tsx - UPDATED WITH ENHANCED API
"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Play, Pause, Zap, TrendingUp } from "lucide-react";
import { RootState } from "@/store";
import { enhancedWebScheduledPaymentExecutor } from "@/lib/enhanced-web-scheduled-payment-executor";

export default function GlobalPaymentExecutor() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { activeWallet } = useSelector((state: RootState) => state.wallet);

  const [executorRunning, setExecutorRunning] = useState(false);
  const [executorStatus, setExecutorStatus] = useState<any>(null);
  const [showStatus, setShowStatus] = useState(false);
  const executorInitialized = useRef(false);

  // Initialize enhanced executor when user is authenticated and has wallet
  useEffect(() => {
    console.log("🔧 Enhanced Global Payment Executor - Initialization check", {
      isAuthenticated,
      hasActiveWallet: !!activeWallet,
      executorInitialized: executorInitialized.current,
    });

    if (isAuthenticated && activeWallet && !executorInitialized.current) {
      console.log("🚀 Initializing enhanced global payment executor...");
      initializeEnhancedPaymentExecutor();
      executorInitialized.current = true;
    }

    // Cleanup when user logs out
    if (!isAuthenticated && executorInitialized.current) {
      console.log("🛑 User logged out, stopping enhanced executor...");
      enhancedWebScheduledPaymentExecutor.stop();
      setExecutorRunning(false);
      setExecutorStatus(null);
      executorInitialized.current = false;
    }
  }, [isAuthenticated, activeWallet]);

  // Update executor status periodically
  useEffect(() => {
    if (executorRunning) {
      const statusInterval = setInterval(() => {
        const status = enhancedWebScheduledPaymentExecutor.getStatus();
        setExecutorStatus(status);
      }, 5000);

      return () => clearInterval(statusInterval);
    }
  }, [executorRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (executorRunning) {
        console.log("🧹 Cleaning up enhanced global payment executor...");
        enhancedWebScheduledPaymentExecutor.stop();
      }
    };
  }, []);

  const initializeEnhancedPaymentExecutor = async () => {
    try {
      if (!activeWallet?.address) {
        console.log("❌ No active wallet found for enhanced executor");
        return;
      }

      console.log(
        "🔑 Getting private key for enhanced global payment executor..."
      );

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
        console.log(
          "✅ Private key retrieved, starting enhanced global executor..."
        );

        enhancedWebScheduledPaymentExecutor.setPrivateKey(data.privateKey);
        enhancedWebScheduledPaymentExecutor.start();

        setExecutorRunning(true);
        setExecutorStatus(enhancedWebScheduledPaymentExecutor.getStatus());

        console.log(
          "✅ Enhanced global payment executor started successfully!"
        );

        // Show notification
        if ("Notification" in window && Notification.permission !== "denied") {
          if (Notification.permission === "granted") {
            new Notification("Enhanced Auto-Payment System Active", {
              body: "Your scheduled payments will be executed automatically with 30% lower gas fees",
              icon: "/favicon.ico",
            });
          } else {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                new Notification("Enhanced Auto-Payment System Active", {
                  body: "Your scheduled payments will be executed automatically with 30% lower gas fees",
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
      console.error(
        "💥 Error initializing enhanced global payment executor:",
        error
      );
    }
  };

  const toggleEnhancedExecutor = () => {
    if (executorRunning) {
      console.log("🛑 Stopping enhanced global payment executor...");
      enhancedWebScheduledPaymentExecutor.stop();
      setExecutorRunning(false);
      setExecutorStatus(null);
    } else {
      console.log("🚀 Starting enhanced global payment executor...");
      initializeEnhancedPaymentExecutor();
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated || !activeWallet) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Enhanced Main Executor Button */}
      <div className="relative">
        <button
          onClick={() => setShowStatus(!showStatus)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            executorRunning
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 animate-pulse"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
          title={`Enhanced Auto-Payment System: ${
            executorRunning ? "Active" : "Inactive"
          }`}
        >
          {executorRunning ? (
            <Zap size={24} className="text-white" />
          ) : (
            <Pause size={24} className="text-white" />
          )}
        </button>

        {/* Enhanced Status indicator dot */}
        <div
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            executorRunning ? "bg-emerald-400 animate-pulse" : "bg-red-400"
          }`}
        />

        {/* Processing indicator with enhanced styling */}
        {executorStatus?.processingPayments?.length > 0 && (
          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-bounce">
            {executorStatus.processingPayments.length}
          </div>
        )}

        {/* Enhanced API Badge */}
        {executorRunning && (
          <div className="absolute -bottom-1 -left-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs rounded-full px-1 py-0.5 font-bold">
            API
          </div>
        )}
      </div>

      {/* Enhanced Status Panel */}
      {showStatus && (
        <div className="absolute bottom-16 right-0 w-80 bg-black border border-[#2C2C2C] rounded-lg p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <h3 className="text-white font-semibold font-satoshi mr-2">
                Enhanced Auto-Payment
              </h3>
              <Zap size={16} className="text-yellow-400" />
            </div>
            <button
              onClick={toggleEnhancedExecutor}
              className={`px-3 py-1 rounded-full text-xs font-satoshi ${
                executorRunning
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {executorRunning ? "Stop" : "Start"}
            </button>
          </div>

          {/* Enhanced API Benefits */}
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/50 rounded-lg p-2 mb-3">
            <div className="flex items-center mb-1">
              <TrendingUp size={14} className="text-green-400 mr-2" />
              <span className="text-green-400 text-xs font-satoshi font-medium">
                Enhanced API Benefits
              </span>
            </div>
            <ul className="text-green-400 text-xs font-satoshi space-y-1">
              <li>• ~30% lower gas fees</li>
              <li>• Faster execution</li>
              <li>• Better reliability</li>
            </ul>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span
                className={
                  executorRunning ? "text-emerald-400" : "text-red-400"
                }
              >
                {executorRunning ? "Running (Enhanced)" : "Stopped"}
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
                  <span className="text-gray-400">API Type:</span>
                  <span className="text-yellow-400 font-medium">
                    Enhanced API
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

                <div className="flex justify-between">
                  <span className="text-gray-400">Failed:</span>
                  <span className="text-red-400">
                    {executorStatus.failedPayments?.length || 0} payments
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

          {/* Recent Activity with Enhanced API indication */}
          {executorStatus?.processingPayments?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
              <div className="text-xs text-gray-400 mb-2">
                Currently Processing (Enhanced API):
              </div>
              {executorStatus.processingPayments
                .slice(0, 3)
                .map((paymentId: string, index: number) => (
                  <div
                    key={index}
                    className="text-xs text-blue-400 font-mono flex items-center"
                  >
                    <Zap size={10} className="text-yellow-400 mr-1" />
                    {paymentId.slice(0, 20)}...
                  </div>
                ))}
            </div>
          )}

          {/* Gas Savings Estimate */}
          {executorRunning && executorStatus?.executedPayments?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#2C2C2C]">
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 text-xs font-satoshi">
                    Estimated Gas Savings:
                  </span>
                  <span className="text-yellow-400 text-xs font-bold">
                    ~30%
                  </span>
                </div>
                <div className="text-yellow-400 text-xs font-satoshi">
                  {executorStatus.executedPayments.length} transactions with
                  Enhanced API
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
