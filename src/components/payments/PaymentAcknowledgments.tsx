// src/components/payments/PaymentAcknowledgments.tsx - WITH 8 SECOND TIMER
"use client";

import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Bell,
} from "lucide-react";
import { usePaymentAcknowledgments } from "@/hooks/usePaymentAcknowledgments";

export default function PaymentAcknowledgments() {
  const {
    acknowledgments,
    acknowledgePayment,
    dismissAll,
    hasAcknowledgments,
  } = usePaymentAcknowledgments();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<Map<string, number>>(
    new Map()
  );

  // Update countdown timers
  useEffect(() => {
    if (!hasAcknowledgments) return;

    const updateTimers = () => {
      const now = Date.now();
      const newTimeRemaining = new Map<string, number>();

      acknowledgments.forEach((ack) => {
        if (ack.minimumDisplayUntil) {
          const remaining = Math.max(0, ack.minimumDisplayUntil - now);
          newTimeRemaining.set(ack.scheduleId, remaining);
        }
      });

      setTimeRemaining(newTimeRemaining);
    };

    // Update immediately
    updateTimers();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateTimers, 100);

    return () => clearInterval(interval);
  }, [acknowledgments, hasAcknowledgments]);

  const handleAcknowledge = async (scheduleId: string) => {
    const success = await acknowledgePayment(scheduleId);
    if (success) {
      setDismissed((prev) => new Set([...prev, scheduleId]));
    }
  };

  const handleDismissAll = async () => {
    await dismissAll();
    setDismissed(new Set(acknowledgments.map((ack) => ack.scheduleId)));
  };

  const openExplorer = (transactionHash: string) => {
    window.open(`https://etherscan.io/tx/${transactionHash}`, "_blank");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={16} className="text-green-400" />;
      case "error":
        return <AlertTriangle size={16} className="text-red-400" />;
      case "warning":
        return <Clock size={16} className="text-yellow-400" />;
      default:
        return <Bell size={16} className="text-blue-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-900/20 border-green-500/30";
      case "error":
        return "bg-red-900/20 border-red-500/30";
      case "warning":
        return "bg-yellow-900/20 border-yellow-500/30";
      default:
        return "bg-gray-900/20 border-gray-500/30";
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds <= 0) return "Auto-hiding...";
    return `${seconds}s`;
  };

  const getProgressPercentage = (scheduleId: string): number => {
    const ack = acknowledgments.find((a) => a.scheduleId === scheduleId);
    if (!ack?.minimumDisplayUntil || !ack?.displayedAt) return 0;

    const totalTime = ack.minimumDisplayUntil - ack.displayedAt;
    const elapsed = Date.now() - ack.displayedAt;
    return Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
  };

  // Filter out dismissed acknowledgments
  const visibleAcknowledgments = acknowledgments.filter(
    (ack) => !dismissed.has(ack.scheduleId)
  );

  if (!hasAcknowledgments || visibleAcknowledgments.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto scrollbar-hide">
      <div className="space-y-3">
        {visibleAcknowledgments.length > 1 && (
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-3 shadow-lg backdrop-blur-sm">
            <button
              onClick={handleDismissAll}
              className="w-full text-center text-gray-300 hover:text-white text-sm font-satoshi font-medium transition-colors duration-200 flex items-center justify-center"
            >
              <X size={14} className="mr-2" />
              Dismiss All ({visibleAcknowledgments.length})
            </button>
          </div>
        )}

        {visibleAcknowledgments.map((ack) => {
          const remaining = timeRemaining.get(ack.scheduleId) || 0;
          const progressPercentage = getProgressPercentage(ack.scheduleId);

          return (
            <div
              key={ack.id}
              className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 shadow-2xl relative overflow-hidden backdrop-blur-sm"
              style={{
                background: "linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
              }}
            >
              {/* Accent border based on type */}
              <div
                className={`absolute top-0 left-0 w-full h-1 ${
                  ack.type === "success"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : ack.type === "error"
                    ? "bg-gradient-to-r from-red-500 to-rose-500"
                    : "bg-gradient-to-r from-yellow-500 to-amber-500"
                }`}
              />

              {/* Progress bar at the bottom */}
              <div className="absolute bottom-0 left-0 h-0.5 bg-gray-800/50 w-full">
                <div
                  className="h-full bg-gradient-to-r from-[#E2AF19] to-[#F4C430] transition-all duration-100 ease-linear"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div
                    className={`p-1.5 rounded-full ${
                      ack.type === "success"
                        ? "bg-green-500/20"
                        : ack.type === "error"
                        ? "bg-red-500/20"
                        : "bg-yellow-500/20"
                    }`}
                  >
                    {getIcon(ack.type)}
                  </div>
                  <div className="ml-3">
                    <span className="text-white font-satoshi text-sm font-semibold">
                      Payment{" "}
                      {ack.status === "completed"
                        ? "Successful"
                        : ack.status === "failed"
                        ? "Failed"
                        : "Processing"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Countdown timer */}
                  {remaining > 0 && (
                    <div className="flex items-center bg-[#E2AF19]/15 border border-[#E2AF19]/30 px-2 py-1 rounded-lg backdrop-blur-sm">
                      <Clock size={10} className="text-[#E2AF19] mr-1.5" />
                      <span className="text-[#E2AF19] text-xs font-mono font-semibold">
                        {formatTimeRemaining(remaining)}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleAcknowledge(ack.scheduleId)}
                    className="text-gray-400 hover:text-white transition-all duration-200 p-1.5 hover:bg-white/10 rounded-lg"
                    title="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-gray-300 font-satoshi text-sm">
                    <span className="text-white font-semibold">
                      {ack.amount} {ack.tokenSymbol}
                    </span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-gray-300">
                      {ack.recipient.slice(0, 10)}...{ack.recipient.slice(-4)}
                    </span>
                  </div>
                </div>

                <div className="text-gray-400 font-satoshi text-sm leading-relaxed">
                  {ack.message}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-gray-500 font-satoshi text-xs">
                    {new Date(ack.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {ack.transactionHash && (
                    <button
                      onClick={() => openExplorer(ack.transactionHash!)}
                      className="flex items-center text-[#E2AF19] hover:text-[#F4C430] transition-all duration-200 text-xs font-satoshi font-medium bg-[#E2AF19]/10 hover:bg-[#E2AF19]/20 px-2 py-1 rounded-lg border border-[#E2AF19]/20"
                    >
                      <ExternalLink size={10} className="mr-1.5" />
                      View Transaction
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
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
