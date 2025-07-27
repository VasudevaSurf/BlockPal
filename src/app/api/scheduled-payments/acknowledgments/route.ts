// src/app/api/scheduled-payments/acknowledgments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000); // Extended to 12 hours

    // Get ONLY the most recent payment that needs acknowledgment
    const recentPayments = await db
      .collection("schedules")
      .find({
        username: decoded.username,
        $or: [
          // ONLY most recent completed payment
          {
            status: "completed",
            $or: [
              { completedAt: { $gte: twelveHoursAgo } },
              { lastExecutionAt: { $gte: twelveHoursAgo } },
            ],
            acknowledged: { $ne: true },
          },
          // ONLY most recent failed payment
          {
            status: "failed",
            $or: [
              { failedAt: { $gte: twelveHoursAgo } },
              { updatedAt: { $gte: twelveHoursAgo } },
            ],
            acknowledged: { $ne: true },
          },
          // ONLY most recent cancelled payment
          {
            status: "cancelled",
            $or: [
              { cancelledAt: { $gte: twelveHoursAgo } },
              { updatedAt: { $gte: twelveHoursAgo } },
            ],
            acknowledged: { $ne: true },
          },
          // Any payment explicitly marked as needing acknowledgment (but only recent)
          {
            needsAcknowledgment: true,
            acknowledged: { $ne: true },
            status: { $in: ["failed", "completed", "cancelled"] },
            updatedAt: { $gte: new Date(now.getTime() - 30 * 60 * 1000) }, // Only last 30 minutes
          },
        ],
      })
      .sort({ updatedAt: -1 }) // Most recent first
      .limit(1) // ONLY show the most recent one
      .toArray();

    console.log("🔍 Most recent acknowledgment found:", recentPayments.length);
    if (recentPayments.length > 0) {
      console.log("📋 Latest payment:", {
        id: recentPayments[0].scheduleId,
        status: recentPayments[0].status,
        acknowledged: recentPayments[0].acknowledged,
        needsAcknowledgment: recentPayments[0].needsAcknowledgment,
        updatedAt: recentPayments[0].updatedAt,
        failedAt: recentPayments[0].failedAt,
        lastError: recentPayments[0].lastError,
      });
    }

    const acknowledgments = recentPayments.map((payment) => ({
      id: payment._id.toString(),
      scheduleId: payment.scheduleId,
      tokenSymbol: payment.tokenSymbol,
      amount: payment.amount,
      recipient: payment.recipient,
      status: payment.status,
      message: getAcknowledgmentMessage(payment),
      timestamp:
        payment.completedAt ||
        payment.failedAt ||
        payment.processingStarted ||
        payment.updatedAt,
      transactionHash: payment.lastTransactionHash,
      errorReason: payment.lastError,
      type: getAcknowledgmentType(payment),
    }));

    return NextResponse.json({
      success: true,
      acknowledgments,
      count: acknowledgments.length,
    });
  } catch (error) {
    console.error("Error fetching acknowledgments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scheduleId, action } = await request.json();

    if (action === "acknowledge") {
      const { db } = await connectToDatabase();

      await db.collection("schedules").updateOne(
        {
          scheduleId,
          username: decoded.username,
        },
        {
          $set: {
            acknowledged: true,
            acknowledgedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: "Payment acknowledged",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error acknowledging payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getAcknowledgmentMessage(payment: any): string {
  switch (payment.status) {
    case "completed":
      return `Payment of ${payment.amount} ${payment.tokenSymbol} completed successfully`;
    case "failed":
      // Simplify error messages for better UX
      let errorMsg = payment.lastError || "Unknown error";
      if (errorMsg.includes("insufficient funds")) {
        return `Payment failed: Insufficient ETH for gas fees`;
      } else if (errorMsg.includes("allowance")) {
        return `Payment failed: Token approval insufficient`;
      } else if (errorMsg.includes("balance")) {
        return `Payment failed: Insufficient token balance`;
      } else {
        return `Payment failed: ${errorMsg.substring(0, 80)}...`;
      }
    case "cancelled":
      return `Payment of ${payment.amount} ${payment.tokenSymbol} was cancelled`;
    default:
      return "Payment status updated";
  }
}

function getAcknowledgmentType(payment: any): "success" | "error" | "warning" {
  switch (payment.status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "cancelled":
      return "warning";
    default:
      return "warning";
  }
}
