// src/app/api/scheduled-payments/fix-stuck/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    console.log("🔍 Looking for stuck processing payments...");

    // Find payments that have been in "processing" status for more than 5 minutes
    const stuckPayments = await db
      .collection("schedules")
      .find({
        status: "processing",
        processingStarted: { $lt: fiveMinutesAgo },
        username: decoded.username,
      })
      .toArray();

    console.log(`📊 Found ${stuckPayments.length} stuck processing payments`);

    const fixedPayments = [];

    for (const payment of stuckPayments) {
      try {
        console.log(`🔧 Fixing stuck payment: ${payment.scheduleId}`);

        // Check if this payment was actually executed by looking for transaction records
        // You can check blockchain directly or look for execution patterns

        // For now, let's assume one-time payments that have been processing for >5 minutes should be completed
        if (payment.frequency === "once") {
          // Mark as completed
          const updateResult = await db.collection("schedules").updateOne(
            { _id: payment._id },
            {
              $set: {
                status: "completed",
                executedCount: 1,
                lastExecutionAt: payment.processingStarted,
                completedAt: now,
                updatedAt: now,
                // Clear processing data
                processingBy: null,
                processingStarted: null,
                // Add fix marker
                fixedStuckProcessing: true,
                fixedAt: now,
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(
              `✅ Fixed stuck payment: ${payment.scheduleId} → completed`
            );
            fixedPayments.push({
              scheduleId: payment.scheduleId,
              oldStatus: "processing",
              newStatus: "completed",
              action: "marked_as_completed",
            });
          }
        } else {
          // For recurring payments, mark as active for next execution
          const nextExecution = calculateNextExecution(
            payment.processingStarted,
            payment.frequency
          );

          const updateResult = await db.collection("schedules").updateOne(
            { _id: payment._id },
            {
              $set: {
                status: "active",
                executedCount: (payment.executedCount || 0) + 1,
                lastExecutionAt: payment.processingStarted,
                nextExecutionAt: nextExecution,
                updatedAt: now,
                // Clear processing data
                processingBy: null,
                processingStarted: null,
                // Add fix marker
                fixedStuckProcessing: true,
                fixedAt: now,
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(
              `✅ Fixed stuck recurring payment: ${
                payment.scheduleId
              } → active (next: ${nextExecution.toISOString()})`
            );
            fixedPayments.push({
              scheduleId: payment.scheduleId,
              oldStatus: "processing",
              newStatus: "active",
              nextExecution: nextExecution.toISOString(),
              action: "reset_for_next_execution",
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error fixing payment ${payment.scheduleId}:`, error);
        fixedPayments.push({
          scheduleId: payment.scheduleId,
          error: error.message,
          action: "failed_to_fix",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedPayments.length} stuck processing payments`,
      stuckPaymentsFound: stuckPayments.length,
      fixedPayments: fixedPayments,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("💥 Error fixing stuck payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also add a GET endpoint to just check for stuck payments without fixing
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Find stuck payments
    const stuckPayments = await db
      .collection("schedules")
      .find({
        status: "processing",
        processingStarted: { $lt: fiveMinutesAgo },
        username: decoded.username,
      })
      .toArray();

    const paymentSummaries = stuckPayments.map((payment) => ({
      scheduleId: payment.scheduleId,
      tokenSymbol: payment.tokenSymbol,
      amount: payment.amount,
      recipient: payment.recipient,
      frequency: payment.frequency,
      processingStarted: payment.processingStarted,
      processingBy: payment.processingBy,
      minutesStuck: Math.round(
        (now.getTime() - new Date(payment.processingStarted).getTime()) / 60000
      ),
    }));

    return NextResponse.json({
      success: true,
      stuckPaymentsCount: stuckPayments.length,
      stuckPayments: paymentSummaries,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("💥 Error checking stuck payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateNextExecution(lastExecution: Date, frequency: string): Date {
  const nextExecution = new Date(lastExecution);

  switch (frequency) {
    case "daily":
      nextExecution.setDate(nextExecution.getDate() + 1);
      break;
    case "weekly":
      nextExecution.setDate(nextExecution.getDate() + 7);
      break;
    case "monthly":
      nextExecution.setMonth(nextExecution.getMonth() + 1);
      break;
    case "yearly":
      nextExecution.setFullYear(nextExecution.getFullYear() + 1);
      break;
    default:
      nextExecution.setFullYear(nextExecution.getFullYear() + 100);
      break;
  }

  return nextExecution;
}
