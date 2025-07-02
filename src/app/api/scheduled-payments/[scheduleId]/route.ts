import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { scheduleId } = resolvedParams;
    const body = await request.json();
    const { action, executorId } = body;

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log(
      `🔄 Processing action '${action}' for schedule ${scheduleId} by executor ${executorId}`
    );

    if (action === "update_after_execution") {
      const {
        transactionHash,
        gasUsed,
        blockNumber,
        actualCostETH,
        actualCostUSD,
        executedAt,
        enhancedAPI,
      } = body;

      console.log(
        `📝 Updating schedule ${scheduleId} after successful enhanced execution`
      );

      const currentSchedule = await db.collection("schedules").findOne({
        scheduleId,
        $or: [
          { processingBy: executorId },
          { status: "processing" },
          { status: "active" },
        ],
      });

      if (!currentSchedule) {
        console.log(`❌ Schedule ${scheduleId} not found`);
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }

      console.log(
        `📋 Found schedule ${scheduleId} with status: ${currentSchedule.status}, processingBy: ${currentSchedule.processingBy}`
      );

      const newExecutionCount = (currentSchedule.executionCount || 0) + 1;
      let finalStatus = "completed";
      let nextExecutionAt = null;
      let completedAt = new Date(executedAt);

      // For recurring payments, calculate next execution
      if (currentSchedule.frequency && currentSchedule.frequency !== "once") {
        const nextExecution = calculateNextExecution(
          new Date(executedAt),
          currentSchedule.frequency
        );

        const maxExecutions = currentSchedule.maxExecutions || 999999;
        if (
          newExecutionCount >= maxExecutions ||
          nextExecution.getFullYear() > new Date().getFullYear() + 50
        ) {
          finalStatus = "completed";
          completedAt = new Date(executedAt);
          console.log(
            `🏁 Recurring schedule ${scheduleId} completed after ${newExecutionCount} executions (Enhanced API)`
          );
        } else {
          finalStatus = "active";
          nextExecutionAt = nextExecution;
          completedAt = null;
          console.log(
            `🔄 Recurring schedule ${scheduleId} next execution: ${nextExecution.toISOString()} (Enhanced API)`
          );
        }
      } else {
        finalStatus = "completed";
        completedAt = new Date(executedAt);
        console.log(
          `🏁 One-time schedule ${scheduleId} completed (Enhanced API)`
        );
      }

      const updateData: any = {
        status: finalStatus,
        executionCount: newExecutionCount,
        lastExecutionAt: new Date(executedAt),
        updatedAt: now,
        processingBy: null,
        processingStarted: null,
        lastTransactionHash: transactionHash,
        lastGasUsed: parseInt(gasUsed) || 0,
        lastBlockNumber: parseInt(blockNumber) || 0,
        lastActualCostETH: parseFloat(actualCostETH) || 0,
        lastActualCostUSD: parseFloat(actualCostUSD) || 0,
        lastExecutedWithEnhancedAPI: enhancedAPI || false,
        lastExecutorId: executorId,
      };

      if (nextExecutionAt) {
        updateData.nextExecutionAt = nextExecutionAt;
      }

      if (completedAt) {
        updateData.completedAt = completedAt;
      }

      console.log(
        `💾 Updating schedule ${scheduleId} to status: ${finalStatus} (Enhanced API)`
      );

      const updateResult = await db.collection("schedules").updateOne(
        {
          scheduleId,
          $or: [
            { processingBy: executorId },
            { status: "processing" },
            {
              status: "active",
              $or: [
                { processingBy: { $exists: false } },
                { processingBy: null },
                { processingBy: executorId },
              ],
            },
          ],
        },
        { $set: updateData }
      );

      if (updateResult.matchedCount === 0) {
        console.log(
          `⚠️ No documents matched for update of ${scheduleId}. Attempting broader update...`
        );

        const broaderUpdate = await db
          .collection("schedules")
          .updateOne({ scheduleId }, { $set: updateData });

        if (broaderUpdate.matchedCount === 0) {
          console.log(`❌ Schedule ${scheduleId} not found for any update`);
          return NextResponse.json(
            { error: "Schedule not found for update" },
            { status: 404 }
          );
        } else {
          console.log(
            `✅ Broader update successful for ${scheduleId} (Enhanced API)`
          );
        }
      } else {
        console.log(
          `✅ Primary update successful for ${scheduleId} (Enhanced API)`
        );
      }

      console.log(
        `✅ Schedule ${scheduleId} updated successfully - Status: ${finalStatus} (Enhanced API)`
      );

      const executionRecordId = `${scheduleId}_exec_${newExecutionCount}_${Date.now()}`;
      const executionRecord = {
        _id: executionRecordId,
        scheduleId,
        username: currentSchedule.username,
        walletAddress: currentSchedule.walletAddress,
        transactionHash,
        gasUsed: parseInt(gasUsed) || 0,
        blockNumber: parseInt(blockNumber) || 0,
        actualCostETH: parseFloat(actualCostETH) || 0,
        actualCostUSD: parseFloat(actualCostUSD) || 0,
        executedAt: new Date(executedAt),
        status: "completed",
        tokenSymbol: currentSchedule.tokenSymbol,
        contractAddress: currentSchedule.contractAddress,
        recipient: currentSchedule.recipient,
        amount: currentSchedule.amount,
        executionCount: newExecutionCount,
        executorId: executorId,
        enhancedAPI: enhancedAPI || false,
        createdAt: now,
      };

      try {
        await db
          .collection("executed_transactions")
          .updateOne(
            { _id: executionRecordId },
            { $setOnInsert: executionRecord },
            { upsert: true }
          );
        console.log(
          `✅ Execution record stored for schedule ${scheduleId} (Enhanced API)`
        );
      } catch (recordError) {
        console.error(
          `⚠️ Failed to store execution record for ${scheduleId}:`,
          recordError
        );
      }

      return NextResponse.json({
        success: true,
        message: "Schedule updated successfully with Enhanced API",
        nextStatus: finalStatus,
        nextExecution: nextExecutionAt,
        executionCount: newExecutionCount,
        transactionHash: transactionHash,
        updateMethod: updateResult.matchedCount > 0 ? "primary" : "broader",
        enhancedAPI: true,
      });
    } else if (action === "mark_failed") {
      // FIXED: Mark schedule as failed permanently (NO RETRY)
      const { error: errorMessage, enhancedAPI } = body;

      console.log(
        `❌ Marking schedule ${scheduleId} as permanently failed: ${errorMessage} (Enhanced API: ${enhancedAPI})`
      );

      const currentSchedule = await db.collection("schedules").findOne({
        scheduleId,
        $or: [
          { processingBy: executorId },
          { processingBy: { $exists: false } },
          { processingBy: null },
          { status: "processing" },
          { status: "active" },
        ],
      });

      if (!currentSchedule) {
        console.log(`❌ Schedule ${scheduleId} not found for failure marking`);
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }

      // PERMANENT FAILURE - NO RETRY
      await db.collection("schedules").updateOne(
        { scheduleId },
        {
          $set: {
            status: "failed",
            failedAt: now,
            lastError: errorMessage,
            updatedAt: now,
            processingBy: null,
            processingStarted: null,
            failedWithEnhancedAPI: enhancedAPI || false,
            lastExecutorId: executorId,
          },
        }
      );

      console.log(
        `❌ Schedule ${scheduleId} marked as permanently failed (Enhanced API)`
      );

      return NextResponse.json({
        success: true,
        message: "Schedule marked as permanently failed",
        willRetry: false,
        nextRetry: null,
        retryCount: 0,
        enhancedAPI: enhancedAPI || false,
      });
    } else if (action === "cancel") {
      const result = await db.collection("schedules").updateOne(
        {
          scheduleId,
          username: decoded.username,
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
            processingBy: null,
            processingStarted: null,
            cancelledBy: executorId || "user",
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "Scheduled payment not found" },
          { status: 404 }
        );
      }

      console.log(`✅ Schedule ${scheduleId} cancelled successfully`);

      return NextResponse.json({
        success: true,
        message: "Scheduled payment cancelled successfully",
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("💥 Error updating schedule:", error);
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
