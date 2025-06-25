// src/app/api/scheduled-payments/[scheduleId]/route.ts (IMPROVED VERSION)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function PATCH(
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
    const { action, executorId } = body;

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log(
      `🔄 Processing action '${action}' for schedule ${scheduleId} by executor ${executorId}`
    );

    if (action === "update_after_execution") {
      // Update schedule after successful execution
      const {
        transactionHash,
        gasUsed,
        blockNumber,
        actualCostETH,
        actualCostUSD,
        executedAt,
      } = body;

      console.log(
        `📝 Updating schedule ${scheduleId} after successful execution`
      );

      // STEP 1: Get the current schedule with flexible matching
      const currentSchedule = await db.collection("schedules").findOne({
        scheduleId,
        $or: [
          { processingBy: executorId }, // Being processed by this executor
          { status: "processing" }, // In processing state
          { status: "active" }, // Still active (backup)
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

      // STEP 2: Calculate new execution count and next execution
      const newExecutionCount = (currentSchedule.executedCount || 0) + 1;
      let finalStatus = "completed";
      let nextExecutionAt = null;
      let completedAt = new Date(executedAt);

      // For recurring payments, calculate next execution
      if (currentSchedule.frequency && currentSchedule.frequency !== "once") {
        const nextExecution = calculateNextExecution(
          new Date(executedAt),
          currentSchedule.frequency
        );

        // Check if we've reached max executions
        const maxExecutions = currentSchedule.maxExecutions || 999999;
        if (
          newExecutionCount >= maxExecutions ||
          nextExecution.getFullYear() > new Date().getFullYear() + 50
        ) {
          finalStatus = "completed";
          completedAt = new Date(executedAt);
          console.log(
            `🏁 Recurring schedule ${scheduleId} completed after ${newExecutionCount} executions`
          );
        } else {
          finalStatus = "active";
          nextExecutionAt = nextExecution;
          completedAt = null;
          console.log(
            `🔄 Recurring schedule ${scheduleId} next execution: ${nextExecution.toISOString()}`
          );
        }
      } else {
        // One-time payment completed
        finalStatus = "completed";
        completedAt = new Date(executedAt);
        console.log(`🏁 One-time schedule ${scheduleId} completed`);
      }

      // STEP 3: Prepare update data
      const updateData: any = {
        status: finalStatus,
        executedCount: newExecutionCount,
        lastExecutionAt: new Date(executedAt),
        updatedAt: now,
        // Clear processing data
        processingBy: null,
        processingStarted: null,
        // Add execution details
        lastTransactionHash: transactionHash,
        lastGasUsed: gasUsed,
        lastBlockNumber: blockNumber,
        lastActualCostETH: actualCostETH,
        lastActualCostUSD: actualCostUSD,
      };

      if (nextExecutionAt) {
        updateData.nextExecutionAt = nextExecutionAt;
      }

      if (completedAt) {
        updateData.completedAt = completedAt;
      }

      // STEP 4: Perform the update with flexible matching
      console.log(
        `💾 Updating schedule ${scheduleId} to status: ${finalStatus}`
      );

      const updateResult = await db.collection("schedules").updateOne(
        {
          scheduleId,
          // More flexible matching - any of these conditions
          $or: [
            { processingBy: executorId }, // Being processed by this executor
            { status: "processing" }, // In processing state
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

        // Try a broader update if the specific one failed
        const broaderUpdate = await db.collection("schedules").updateOne(
          { scheduleId }, // Just match by schedule ID
          { $set: updateData }
        );

        if (broaderUpdate.matchedCount === 0) {
          console.log(`❌ Schedule ${scheduleId} not found for any update`);
          return NextResponse.json(
            { error: "Schedule not found for update" },
            { status: 404 }
          );
        } else {
          console.log(`✅ Broader update successful for ${scheduleId}`);
        }
      } else {
        console.log(`✅ Primary update successful for ${scheduleId}`);
      }

      console.log(
        `✅ Schedule ${scheduleId} updated successfully - Status: ${finalStatus}`
      );

      // STEP 5: Store execution record with unique ID
      const executionRecordId = `${scheduleId}_exec_${newExecutionCount}_${Date.now()}`;
      const executionRecord = {
        _id: executionRecordId,
        scheduleId,
        username: currentSchedule.username,
        walletAddress: currentSchedule.walletAddress,
        transactionHash,
        gasUsed,
        blockNumber,
        actualCostETH,
        actualCostUSD,
        executedAt: new Date(executedAt),
        status: "completed",
        tokenSymbol: currentSchedule.tokenSymbol,
        contractAddress: currentSchedule.contractAddress,
        recipient: currentSchedule.recipients?.[0] || currentSchedule.recipient,
        amount: currentSchedule.amounts?.[0] || currentSchedule.totalAmount,
        executionCount: newExecutionCount,
        executorId: executorId,
        createdAt: now,
      };

      // Store execution record
      try {
        await db
          .collection("executed_transactions")
          .updateOne(
            { _id: executionRecordId },
            { $setOnInsert: executionRecord },
            { upsert: true }
          );
        console.log(`✅ Execution record stored for schedule ${scheduleId}`);
      } catch (recordError) {
        console.error(
          `⚠️ Failed to store execution record for ${scheduleId}:`,
          recordError
        );
        // Don't fail the whole operation for this
      }

      return NextResponse.json({
        success: true,
        message: "Schedule updated successfully",
        nextStatus: finalStatus,
        nextExecution: nextExecutionAt,
        executionCount: newExecutionCount,
        transactionHash: transactionHash,
        updateMethod: updateResult.matchedCount > 0 ? "primary" : "broader",
      });
    } else if (action === "mark_failed") {
      // Mark schedule as failed
      const { error: errorMessage } = body;

      console.log(
        `❌ Marking schedule ${scheduleId} as failed: ${errorMessage}`
      );

      // Get current schedule with flexible matching
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

      const retryCount = (currentSchedule.retryCount || 0) + 1;
      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        // FINAL FAILURE
        await db.collection("schedules").updateOne(
          { scheduleId },
          {
            $set: {
              status: "failed",
              failedAt: now,
              lastError: errorMessage,
              retryCount,
              updatedAt: now,
              // Clear processing data
              processingBy: null,
              processingStarted: null,
            },
          }
        );

        console.log(
          `❌ Schedule ${scheduleId} marked as permanently failed after ${retryCount} retries`
        );
      } else {
        // RETRY
        const nextRetry = new Date(now.getTime() + 5 * 60 * 1000);
        await db.collection("schedules").updateOne(
          { scheduleId },
          {
            $set: {
              status: "active",
              nextExecutionAt: nextRetry,
              retryCount,
              lastError: errorMessage,
              updatedAt: now,
              // Clear processing data for retry
              processingBy: null,
              processingStarted: null,
            },
          }
        );

        console.log(
          `⏰ Schedule ${scheduleId} scheduled for retry in 5 minutes (attempt ${retryCount}/${maxRetries})`
        );
      }

      return NextResponse.json({
        success: true,
        message:
          retryCount >= maxRetries
            ? "Schedule marked as permanently failed"
            : "Schedule scheduled for retry",
        willRetry: retryCount < maxRetries,
        nextRetry:
          retryCount < maxRetries
            ? new Date(now.getTime() + 5 * 60 * 1000)
            : null,
        retryCount,
      });
    } else if (action === "cancel") {
      // Cancel schedule
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
            // Clear any processing data
            processingBy: null,
            processingStarted: null,
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
      // For "once", return a far future date to indicate completion
      nextExecution.setFullYear(nextExecution.getFullYear() + 100);
      break;
  }

  return nextExecution;
}
