// src/hooks/usePaymentAcknowledgments.ts - ONLY SHOW LATEST ACKNOWLEDGMENT
import { useState, useEffect, useCallback } from "react";

export interface PaymentAcknowledgment {
  id: string;
  scheduleId: string;
  tokenSymbol: string;
  amount: string;
  recipient: string;
  status: "completed" | "failed" | "processing";
  message: string;
  timestamp: string;
  transactionHash?: string;
  errorReason?: string;
  type: "success" | "error" | "warning";
}

export function usePaymentAcknowledgments() {
  const [acknowledgments, setAcknowledgments] = useState<
    PaymentAcknowledgment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Track the last shown acknowledgment to prevent showing old ones
  const [lastShownAckId, setLastShownAckId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastShownAcknowledgmentId") || "";
    }
    return "";
  });

  const fetchAcknowledgments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔍 Fetching LATEST payment acknowledgment...");

      const response = await fetch("/api/scheduled-payments/acknowledgments", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch acknowledgments");
      }

      const data = await response.json();
      const newAcknowledgments = data.acknowledgments || [];

      console.log("📦 Latest acknowledgment received:", {
        count: newAcknowledgments.length,
        data: newAcknowledgments.map((ack: any) => ({
          id: ack.scheduleId,
          status: ack.status,
          type: ack.type,
          message: ack.message,
          timestamp: ack.timestamp,
        })),
      });

      // ONLY show if this is a NEW acknowledgment (different from last shown)
      if (newAcknowledgments.length > 0) {
        const latestAck = newAcknowledgments[0];

        // Check if this is a new acknowledgment we haven't shown before
        if (latestAck.scheduleId !== lastShownAckId) {
          console.log("🆕 NEW acknowledgment detected:", latestAck.scheduleId);
          setAcknowledgments([latestAck]); // Only show the latest one

          // Update the last shown ID
          setLastShownAckId(latestAck.scheduleId);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "lastShownAcknowledgmentId",
              latestAck.scheduleId
            );
          }
        } else {
          console.log("🔄 Same acknowledgment as before, not showing again");
          // Don't show the same acknowledgment again
          setAcknowledgments([]);
        }
      } else {
        console.log("📭 No new acknowledgments to show");
        setAcknowledgments([]);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("❌ Error fetching acknowledgments:", err);
    } finally {
      setLoading(false);
    }
  }, [lastShownAckId]);

  const acknowledgePayment = useCallback(async (scheduleId: string) => {
    try {
      console.log(`🔔 Acknowledging payment: ${scheduleId}`);

      const response = await fetch("/api/scheduled-payments/acknowledgments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduleId,
          action: "acknowledge",
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to acknowledge payment");
      }

      // Remove from local state
      setAcknowledgments((prev) =>
        prev.filter((ack) => ack.scheduleId !== scheduleId)
      );

      console.log(`✅ Payment acknowledged: ${scheduleId}`);
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error("❌ Error acknowledging payment:", err);
      return false;
    }
  }, []);

  const dismissAll = useCallback(async () => {
    console.log(
      `🔔 Dismissing all ${acknowledgments.length} acknowledgments...`
    );

    const promises = acknowledgments.map((ack) =>
      acknowledgePayment(ack.scheduleId)
    );
    await Promise.all(promises);

    console.log("✅ All acknowledgments dismissed");
  }, [acknowledgments, acknowledgePayment]);

  // Trigger immediate check function
  const triggerImmediateCheck = useCallback(() => {
    console.log("⚡ Triggering immediate acknowledgment check...");
    setTimeout(fetchAcknowledgments, 1000);
  }, [fetchAcknowledgments]);

  // Check for new acknowledgments after payment creation
  const checkForNewPaymentAcknowledgments = useCallback(() => {
    console.log("🔄 Checking for NEW payment acknowledgments...");

    // Wait a bit for database to update, then check
    setTimeout(() => {
      fetchAcknowledgments();
    }, 2000);
  }, [fetchAcknowledgments]);

  // Reset last shown ID when user explicitly wants to see new acknowledgments
  const resetLastShown = useCallback(() => {
    console.log("🔄 Resetting last shown acknowledgment ID");
    setLastShownAckId("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("lastShownAcknowledgmentId");
    }
  }, []);

  useEffect(() => {
    fetchAcknowledgments();

    // Poll every 10 seconds for new acknowledgments
    const interval = setInterval(() => {
      console.log("🔄 Polling for NEW acknowledgments...");
      fetchAcknowledgments();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchAcknowledgments]);

  // Add visibility change listener to check when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log(
          "👁️ Tab became visible, checking for NEW acknowledgments..."
        );
        fetchAcknowledgments();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchAcknowledgments]);

  return {
    acknowledgments,
    loading,
    error,
    acknowledgePayment,
    dismissAll,
    refresh: fetchAcknowledgments,
    triggerImmediateCheck,
    checkForNewPaymentAcknowledgments,
    resetLastShown,
    hasAcknowledgments: acknowledgments.length > 0,
  };
}
