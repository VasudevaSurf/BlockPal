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
    const { action } = body;

    const { db } = await connectToDatabase();

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

      // Get current schedule
      const schedule = await db.collection("schedules").findOne({ scheduleId });

      if (!schedule) {
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }

      const newExecutionCount = (schedule.executedCount || 0) + 1;
      const updateData: any = {
        executedCount: newExecutionCount,
        lastExecutionAt: new Date(executedAt),
        updatedAt: new Date(),
      };

      // Calculate next execution for recurring payments
      if (schedule.frequency && schedule.frequency !== "once") {
        const nextExecution = calculateNextExecution(
          new Date(executedAt),
          schedule.frequency
        );

        // Check if we've reached max executions
        const maxExecutions = schedule.maxExecutions || 999999;
        if (
          newExecutionCount >= maxExecutions ||
          nextExecution.getFullYear() > new Date().getFullYear() + 50
        ) {
          updateData.status = "completed";
          updateData.completedAt = new Date();
        } else {
          updateData.nextExecutionAt = nextExecution;
        }
      } else {
        // One-time payment completed
        updateData.status = "completed";
        updateData.completedAt = new Date();
      }

      await db
        .collection("schedules")
        .updateOne({ scheduleId }, { $set: updateData });

      // Store execution record
      const executionRecord = {
        scheduleId,
        username: schedule.username,
        walletAddress: schedule.walletAddress,
        transactionHash,
        gasUsed,
        blockNumber,
        actualCostETH,
        actualCostUSD,
        executedAt: new Date(executedAt),
        status: "completed",
        tokenSymbol: schedule.tokenSymbol,
        contractAddress: schedule.contractAddress,
        recipient: schedule.recipients?.[0] || schedule.recipient,
        amount: schedule.amounts?.[0] || schedule.totalAmount,
        executionCount: newExecutionCount,
        createdAt: new Date(),
      };

      await db.collection("executed_transactions").insertOne(executionRecord);

      console.log(`✅ Schedule ${scheduleId} updated after execution`);

      return NextResponse.json({
        success: true,
        message: "Schedule updated successfully",
        nextStatus: updateData.status,
        nextExecution: updateData.nextExecutionAt,
      });
    } else if (action === "mark_failed") {
      // Mark schedule as failed
      const { error: errorMessage } = body;

      const retryCount = await db
        .collection("schedules")
        .findOne({ scheduleId })
        .then((doc) => (doc?.retryCount || 0) + 1);

      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        await db.collection("schedules").updateOne(
          { scheduleId },
          {
            $set: {
              status: "failed",
              failedAt: new Date(),
              lastError: errorMessage,
              retryCount,
              updatedAt: new Date(),
            },
          }
        );

        console.log(
          `❌ Schedule ${scheduleId} marked as failed after ${retryCount} retries`
        );
      } else {
        // Retry later (add 5 minutes to next execution)
        const nextRetry = new Date(Date.now() + 5 * 60 * 1000);
        await db.collection("schedules").updateOne(
          { scheduleId },
          {
            $set: {
              nextExecutionAt: nextRetry,
              retryCount,
              lastError: errorMessage,
              updatedAt: new Date(),
            },
          }
        );

        console.log(
          `⏰ Schedule ${scheduleId} will retry in 5 minutes (attempt ${retryCount}/${maxRetries})`
        );
      }

      return NextResponse.json({
        success: true,
        message:
          retryCount >= maxRetries
            ? "Schedule marked as failed"
            : "Schedule scheduled for retry",
        willRetry: retryCount < maxRetries,
        nextRetry:
          retryCount < maxRetries ? new Date(Date.now() + 5 * 60 * 1000) : null,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating schedule:", error);
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
