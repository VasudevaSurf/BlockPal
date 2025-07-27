// src/hooks/usePaymentAcknowledgments.ts - FIXED VERSION WITH 8 SECOND MINIMUM DISPLAY
import { useState, useEffect, useCallback, useRef } from "react";

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
  // Add display timing fields
  displayedAt?: number;
  minimumDisplayUntil?: number;
}

export function usePaymentAcknowledgments() {
  const [acknowledgments, setAcknowledgments] = useState<
    PaymentAcknowledgment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Track acknowledgments with their display timing
  const displayTimingRef = useRef<
    Map<
      string,
      {
        displayedAt: number;
        minimumDisplayUntil: number;
        acknowledged: boolean;
      }
    >
  >(new Map());

  // Track the last fetched acknowledgment to prevent showing old ones
  const [lastFetchedAckId, setLastFetchedAckId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastFetchedAcknowledgmentId") || "";
    }
    return "";
  });

  const MINIMUM_DISPLAY_TIME = 8000; // 8 seconds minimum display time

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

      const now = Date.now();

      if (newAcknowledgments.length > 0) {
        const latestAck = newAcknowledgments[0];

        // Check if this is a completely new acknowledgment
        if (latestAck.scheduleId !== lastFetchedAckId) {
          console.log("🆕 NEW acknowledgment detected:", latestAck.scheduleId);

          // Set up timing for the new acknowledgment
          const displayTiming = {
            displayedAt: now,
            minimumDisplayUntil: now + MINIMUM_DISPLAY_TIME,
            acknowledged: false,
          };

          displayTimingRef.current.set(latestAck.scheduleId, displayTiming);

          // Add timing info to the acknowledgment
          const enhancedAck = {
            ...latestAck,
            displayedAt: now,
            minimumDisplayUntil: now + MINIMUM_DISPLAY_TIME,
          };

          setAcknowledgments([enhancedAck]);

          // Update the last fetched ID
          setLastFetchedAckId(latestAck.scheduleId);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "lastFetchedAcknowledgmentId",
              latestAck.scheduleId
            );
          }

          console.log(
            `⏰ Acknowledgment will be displayed until: ${new Date(
              now + MINIMUM_DISPLAY_TIME
            ).toLocaleTimeString()}`
          );
        } else {
          // Same acknowledgment - check if we should still display it
          const timing = displayTimingRef.current.get(latestAck.scheduleId);

          if (timing && !timing.acknowledged) {
            if (now < timing.minimumDisplayUntil) {
              console.log(
                `⏳ Still within minimum display time for: ${
                  latestAck.scheduleId
                } (${Math.round(
                  (timing.minimumDisplayUntil - now) / 1000
                )}s remaining)`
              );

              // Keep showing the acknowledgment with timing info
              const enhancedAck = {
                ...latestAck,
                displayedAt: timing.displayedAt,
                minimumDisplayUntil: timing.minimumDisplayUntil,
              };

              setAcknowledgments([enhancedAck]);
            } else {
              console.log(
                `✅ Minimum display time completed for: ${latestAck.scheduleId}, auto-hiding`
              );
              setAcknowledgments([]);
              displayTimingRef.current.delete(latestAck.scheduleId);
            }
          } else {
            console.log("🔄 Acknowledgment already processed or acknowledged");
            setAcknowledgments([]);
          }
        }
      } else {
        console.log("📭 No acknowledgments from server");

        // Check if we have any acknowledgments that should still be displayed
        const currentAcks = acknowledgments.filter((ack) => {
          const timing = displayTimingRef.current.get(ack.scheduleId);
          if (
            timing &&
            !timing.acknowledged &&
            now < timing.minimumDisplayUntil
          ) {
            console.log(`⏳ Keeping acknowledgment visible: ${ack.scheduleId}`);
            return true;
          }
          return false;
        });

        if (currentAcks.length !== acknowledgments.length) {
          setAcknowledgments(currentAcks);
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error("❌ Error fetching acknowledgments:", err);
    } finally {
      setLoading(false);
    }
  }, [lastFetchedAckId, acknowledgments]);

  const acknowledgePayment = useCallback(async (scheduleId: string) => {
    try {
      console.log(`🔔 Acknowledging payment: ${scheduleId}`);

      // Mark as acknowledged in timing ref
      const timing = displayTimingRef.current.get(scheduleId);
      if (timing) {
        timing.acknowledged = true;
        console.log(`✅ Marked as acknowledged: ${scheduleId}`);
      }

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

      // Remove from local state immediately
      setAcknowledgments((prev) =>
        prev.filter((ack) => ack.scheduleId !== scheduleId)
      );

      // Clean up timing ref
      displayTimingRef.current.delete(scheduleId);

      console.log(`✅ Payment acknowledged and removed: ${scheduleId}`);
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error("❌ Error acknowledging payment:", err);

      // Reset acknowledged flag on error
      const timing = displayTimingRef.current.get(scheduleId);
      if (timing) {
        timing.acknowledged = false;
      }

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

  // Auto-hide acknowledgments after minimum display time
  useEffect(() => {
    if (acknowledgments.length === 0) return;

    const timeouts: NodeJS.Timeout[] = [];

    acknowledgments.forEach((ack) => {
      if (ack.minimumDisplayUntil) {
        const timeUntilHide = ack.minimumDisplayUntil - Date.now();

        if (timeUntilHide > 0) {
          console.log(
            `⏰ Setting auto-hide timer for ${ack.scheduleId}: ${Math.round(
              timeUntilHide / 1000
            )}s`
          );

          const timeout = setTimeout(() => {
            const timing = displayTimingRef.current.get(ack.scheduleId);
            if (timing && !timing.acknowledged) {
              console.log(
                `🕒 Auto-hiding acknowledgment after minimum display time: ${ack.scheduleId}`
              );

              setAcknowledgments((prev) =>
                prev.filter((a) => a.scheduleId !== ack.scheduleId)
              );

              displayTimingRef.current.delete(ack.scheduleId);
            }
          }, timeUntilHide);

          timeouts.push(timeout);
        }
      }
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [acknowledgments]);

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

  // Reset last fetched ID when user explicitly wants to see new acknowledgments
  const resetLastShown = useCallback(() => {
    console.log("🔄 Resetting last fetched acknowledgment ID");
    setLastFetchedAckId("");
    displayTimingRef.current.clear();
    if (typeof window !== "undefined") {
      localStorage.removeItem("lastFetchedAcknowledgmentId");
    }
  }, []);

  useEffect(() => {
    fetchAcknowledgments();

    // Poll every 15 seconds (increased from 10 to reduce flickering)
    const interval = setInterval(() => {
      console.log("🔄 Polling for acknowledgments...");
      fetchAcknowledgments();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchAcknowledgments]);

  // Add visibility change listener to check when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("👁️ Tab became visible, checking for acknowledgments...");
        // Small delay to prevent immediate hiding
        setTimeout(fetchAcknowledgments, 500);
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
