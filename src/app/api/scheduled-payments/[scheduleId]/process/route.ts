// src/app/api/scheduled-payments/[scheduleId]/process/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(
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
    const { executorId, processingStarted } = await request.json();

    if (!executorId) {
      return NextResponse.json(
        { error: "Executor ID required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log(
      `🔒 Enhanced: Attempting to mark payment ${scheduleId} as processing by executor ${executorId} for smart contract execution`
    );

    // Enhanced processing check for smart contract payments
    const result = await db.collection("schedules").findOneAndUpdate(
      {
        scheduleId,
        status: "active",
        smartContractEnabled: true, // Only smart contract enabled payments
        $and: [
          // Payment must not be failed
          { status: { $ne: "failed" } },
          // Processing conditions
          {
            $or: [
              { processingBy: { $exists: false } },
              { processingBy: null },
              {
                processingStarted: {
                  $lt: new Date(now.getTime() - 180000), // 3 minute timeout for smart contract
                },
              },
            ],
          },
          // Must be due for execution
          { nextExecutionAt: { $lte: now } },
          // Must not have been executed recently
          {
            $or: [
              { lastExecutionAt: { $exists: false } },
              { lastExecutionAt: null },
              {
                lastExecutionAt: {
                  $lt: new Date(now.getTime() - 90000), // 1.5 minutes for smart contract
                },
              },
            ],
          },
          // Smart contract specific checks
          {
            $or: [
              { tokenSymbol: "ETH" }, // ETH payments always supported
              {
                $and: [
                  {
                    tokenSymbol: {
                      $in: ["USDT", "USDC", "DAI", "LINK", "UNI"],
                    },
                  }, // Supported ERC20 tokens
                  { contractAddress: { $ne: null } },
                  { contractAddress: { $ne: "" } },
                ],
              },
            ],
          },
        ],
      },
      {
        $set: {
          processingBy: executorId,
          processingStarted: new Date(processingStarted),
          status: "processing",
          updatedAt: now,
          processingMethod: "smart_contract",
          contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (result) {
      console.log(
        `✅ Enhanced: Payment ${scheduleId} successfully marked as processing by executor ${executorId} for smart contract execution`
      );

      return NextResponse.json({
        success: true,
        message: "Payment marked as processing for smart contract execution",
        processingBy: executorId,
        processingStarted: new Date(processingStarted),
        status: "processing",
        smartContractEnabled: true,
        contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
        enhancedAPI: true,
        gasOptimization: "Smart contract gas optimization enabled",
        taxHandling: "Automatic 0.5% tax calculation and deduction",
      });
    } else {
      console.log(
        `❌ Enhanced: Payment ${scheduleId} could not be marked as processing by executor ${executorId}`
      );

      const currentSchedule = await db
        .collection("schedules")
        .findOne({ scheduleId });

      let reason = "Payment not available for smart contract processing";
      if (currentSchedule) {
        if (currentSchedule.status === "failed") {
          reason = "Payment has permanently failed and cannot be processed";
        } else if (currentSchedule.status === "processing") {
          reason = `Payment already being processed by executor ${currentSchedule.processingBy}`;
        } else if (currentSchedule.status === "completed") {
          reason = "Payment has already been completed";
        } else if (currentSchedule.status === "cancelled") {
          reason = "Payment has been cancelled";
        } else if (!currentSchedule.smartContractEnabled) {
          reason = "Payment is not enabled for smart contract execution";
        } else if (currentSchedule.status !== "active") {
          reason = `Payment status is ${currentSchedule.status}`;
        } else if (currentSchedule.nextExecutionAt > now) {
          reason = "Payment not yet due for execution";
        } else if (
          currentSchedule.lastExecutionAt &&
          now.getTime() - new Date(currentSchedule.lastExecutionAt).getTime() <
            90000
        ) {
          reason = "Payment was executed recently";
        } else if (
          !["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"].includes(
            currentSchedule.tokenSymbol
          )
        ) {
          reason = `Token ${currentSchedule.tokenSymbol} not supported for smart contract execution`;
        }
      } else {
        reason = "Payment not found";
      }

      return NextResponse.json(
        {
          success: false,
          error: reason,
          alreadyProcessing: currentSchedule?.status === "processing",
          processingBy: currentSchedule?.processingBy || null,
          currentStatus: currentSchedule?.status || "not_found",
          smartContractEnabled: currentSchedule?.smartContractEnabled || false,
          supportedTokens: ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"],
          enhancedAPI: true,
        },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("💥 Enhanced: Error marking payment as processing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const {
      action,
      error: errorMessage,
      executorId,
      enhancedAPI,
      errorCategory,
    } = body;

    const { db } = await connectToDatabase();
    const now = new Date();

    if (action === "mark_failed") {
      console.log(
        `❌ Enhanced: Marking schedule ${scheduleId} as failed with error: ${errorMessage}`
      );

      const updateResult = await db.collection("schedules").updateOne(
        {
          scheduleId,
          status: { $ne: "failed" }, // Only update if not already failed
        },
        {
          $set: {
            status: "failed",
            failedAt: now,
            lastError: errorMessage || "Unknown error during execution",
            updatedAt: now,
            processingBy: null,
            processingStarted: null,
            claimedBy: null,
            claimedAt: null,
            nextExecutionAt: null,
            failedWithSmartContract: enhancedAPI || false,
            failedBy: executorId || "unknown",
            errorCategory: errorCategory || "unknown",
            acknowledged: false, // Add acknowledgment flag
          },
        }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { error: "Schedule not found or already failed" },
          { status: 404 }
        );
      }

      console.log(
        `✅ Enhanced: Schedule ${scheduleId} marked as failed successfully`
      );

      return NextResponse.json({
        success: true,
        message: "Schedule marked as failed",
        scheduleId: scheduleId,
        status: "failed",
        enhancedAPI: enhancedAPI || false,
        errorCategory: errorCategory || "unknown",
      });
    } else if (action === "update_after_execution") {
      // Handle successful execution updates
      const {
        transactionHash,
        gasUsed,
        blockNumber,
        actualCostETH,
        actualCostUSD,
        executedAt,
        taxPaidETH,
        contractAddress,
      } = body;

      console.log(
        `✅ Enhanced: Updating schedule ${scheduleId} after successful execution`
      );

      // Find current schedule to determine next status
      const currentSchedule = await db
        .collection("schedules")
        .findOne({ scheduleId });

      if (!currentSchedule) {
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }

      const newExecutionCount = (currentSchedule.executedCount || 0) + 1;
      let finalStatus = "completed";
      let nextExecutionAt = null;

      // Calculate next execution for recurring payments
      if (currentSchedule.frequency && currentSchedule.frequency !== "once") {
        const nextExecution = calculateNextExecution(
          new Date(executedAt),
          currentSchedule.frequency
        );

        const maxExecutions = currentSchedule.maxExecutions || 999999;
        if (newExecutionCount < maxExecutions) {
          finalStatus = "active";
          nextExecutionAt = nextExecution;
        }
      }

      const updateData: any = {
        status: finalStatus,
        executedCount: newExecutionCount,
        lastExecutionAt: new Date(executedAt),
        updatedAt: now,
        processingBy: null,
        processingStarted: null,
        claimedBy: null,
        claimedAt: null,
        lastTransactionHash: transactionHash,
        lastGasUsed: gasUsed || 0,
        lastBlockNumber: blockNumber || 0,
        lastActualCostETH: actualCostETH || "0",
        lastActualCostUSD: actualCostUSD || "0",
        smartContractExecution: true,
        contractAddress:
          contractAddress || "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
        taxPaidETH: taxPaidETH || "0",
        enhancedAPI: true,
        acknowledged: false, // Add acknowledgment flag
      };

      if (nextExecutionAt) {
        updateData.nextExecutionAt = nextExecutionAt;
      } else {
        updateData.completedAt = new Date(executedAt);
      }

      const updateResult = await db.collection("schedules").updateOne(
        {
          scheduleId,
          status: { $ne: "failed" },
        },
        { $set: updateData }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { error: "Schedule not found or is failed" },
          { status: 404 }
        );
      }

      console.log(
        `✅ Enhanced: Schedule ${scheduleId} updated after execution`
      );

      return NextResponse.json({
        success: true,
        message: "Schedule updated after execution",
        scheduleId: scheduleId,
        finalStatus: finalStatus,
        nextExecution: nextExecutionAt,
        executionCount: newExecutionCount,
        transactionHash: transactionHash,
        enhancedAPI: true,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("💥 Enhanced: Error in process PATCH:", error);
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
