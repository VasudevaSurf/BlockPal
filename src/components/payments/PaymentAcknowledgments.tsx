// src/components/payments/PaymentAcknowledgments.tsx
"use client";

import { useState } from "react";
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
        return <Bell size={16} className="text-gray-400" />;
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

  // Filter out dismissed acknowledgments
  const visibleAcknowledgments = acknowledgments.filter(
    (ack) => !dismissed.has(ack.scheduleId)
  );

  if (!hasAcknowledgments || visibleAcknowledgments.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-h-96 overflow-y-auto scrollbar-hide">
      <div className="space-y-2">
        {visibleAcknowledgments.length > 1 && (
          <div className="bg-black border border-[#2C2C2C] rounded-lg p-2">
            <button
              onClick={handleDismissAll}
              className="w-full text-center text-gray-400 hover:text-white text-xs font-satoshi"
            >
              Dismiss All ({visibleAcknowledgments.length})
            </button>
          </div>
        )}

        {visibleAcknowledgments.map((ack) => (
          <div
            key={ack.id}
            className={`bg-black border rounded-lg p-3 ${getBgColor(
              ack.type
            )} shadow-lg`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                {getIcon(ack.type)}
                <span className="text-white font-satoshi text-xs font-medium ml-2">
                  Payment {ack.status}
                </span>
              </div>
              <button
                onClick={() => handleAcknowledge(ack.scheduleId)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-white font-satoshi text-xs">
                {ack.amount} {ack.tokenSymbol} to {ack.recipient.slice(0, 10)}
                ...
              </div>

              <div className="text-gray-400 font-satoshi text-xs">
                {ack.message}
              </div>

              <div className="text-gray-500 font-satoshi text-xs">
                {new Date(ack.timestamp).toLocaleString()}
              </div>

              {ack.transactionHash && (
                <button
                  onClick={() => openExplorer(ack.transactionHash!)}
                  className="flex items-center text-[#E2AF19] hover:opacity-90 transition-opacity text-xs font-satoshi"
                >
                  <ExternalLink size={10} className="mr-1" />
                  View Transaction
                </button>
              )}
            </div>
          </div>
        ))}
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
