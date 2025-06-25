// Manual Complete Specific Payment API
// src/app/api/scheduled-payments/[scheduleId]/complete/route.ts (NEW FILE)

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scheduleId } = params;
    const body = await request.json();
    const { transactionHash, forceComplete = false, executedAt } = body;

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log(`🔧 Manual completion request for ${scheduleId}`);

    // Get the current payment
    const currentPayment = await db.collection("schedules").findOne({
      scheduleId,
      username: decoded.username,
    });

    if (!currentPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    console.log(`📋 Current payment status: ${currentPayment.status}`);

    // For your specific case, let's complete this payment
    if (currentPayment.status === "processing" || forceComplete) {
      // Determine final status based on frequency
      let finalStatus = "completed";
      let nextExecutionAt = null;
      let completedAt = new Date(executedAt || now);

      const newExecutionCount = (currentPayment.executedCount || 0) + 1;

      if (currentPayment.frequency && currentPayment.frequency !== "once") {
        // Recurring payment
        const nextExecution = calculateNextExecution(
          completedAt,
          currentPayment.frequency
        );

        const maxExecutions = currentPayment.maxExecutions || 999999;
        if (newExecutionCount >= maxExecutions) {
          finalStatus = "completed";
          completedAt = completedAt;
        } else {
          finalStatus = "active";
          nextExecutionAt = nextExecution;
          completedAt = null;
        }
      }

      // Update the payment
      const updateData: any = {
        status: finalStatus,
        executedCount: newExecutionCount,
        lastExecutionAt: completedAt,
        updatedAt: now,
        // Clear processing data
        processingBy: null,
        processingStarted: null,
        // Add manual completion marker
        manuallyCompleted: true,
        manualCompletionBy: decoded.username,
        manualCompletionAt: now,
      };

      if (transactionHash) {
        updateData.lastTransactionHash = transactionHash;
      }

      if (nextExecutionAt) {
        updateData.nextExecutionAt = nextExecutionAt;
      }

      if (completedAt && finalStatus === "completed") {
        updateData.completedAt = completedAt;
      }

      const updateResult = await db
        .collection("schedules")
        .updateOne(
          { scheduleId, username: decoded.username },
          { $set: updateData }
        );

      if (updateResult.modifiedCount > 0) {
        console.log(
          `✅ Payment ${scheduleId} manually completed - Status: ${finalStatus}`
        );

        // Create execution record if transaction hash provided
        if (transactionHash) {
          const executionRecord = {
            _id: `${scheduleId}_manual_${Date.now()}`,
            scheduleId,
            username: currentPayment.username,
            walletAddress: currentPayment.walletAddress,
            transactionHash,
            executedAt: completedAt,
            status: "completed",
            tokenSymbol: currentPayment.tokenSymbol,
            contractAddress: currentPayment.contractAddress,
            recipient: currentPayment.recipient,
            amount: currentPayment.amount,
            executionCount: newExecutionCount,
            isManualCompletion: true,
            createdAt: now,
          };

          await db
            .collection("executed_transactions")
            .updateOne(
              { _id: executionRecord._id },
              { $setOnInsert: executionRecord },
              { upsert: true }
            );
        }

        return NextResponse.json({
          success: true,
          message: `Payment manually completed`,
          finalStatus,
          executionCount: newExecutionCount,
          nextExecution: nextExecutionAt,
          transactionHash,
        });
      } else {
        return NextResponse.json(
          { error: "Failed to update payment" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: `Payment is not in processing status (current: ${currentPayment.status})`,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("💥 Error manually completing payment:", error);
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
