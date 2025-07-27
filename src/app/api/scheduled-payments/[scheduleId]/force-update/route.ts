// src/app/api/scheduled-payments/[scheduleId]/force-update/route.ts
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
    const body = await request.json();
    const {
      executorId,
      transactionHash,
      gasUsed,
      blockNumber,
      actualCostETH,
      actualCostUSD,
      executedAt,
      forceUpdate,
      contractAddress,
      taxPaid,
    } = body;

    if (!forceUpdate) {
      return NextResponse.json(
        { error: "Force update flag required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log(
      `🔄 Enhanced: Force updating schedule ${scheduleId} by executor ${executorId} with smart contract`
    );

    const currentSchedule = await db.collection("schedules").findOne({
      scheduleId,
    });

    if (!currentSchedule) {
      console.log(`❌ Enhanced: Schedule ${scheduleId} not found`);
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    // STRICT: Do not force update failed payments
    if (currentSchedule.status === "failed") {
      console.log(
        `❌ Enhanced: Cannot force update failed schedule ${scheduleId}`
      );
      return NextResponse.json(
        { error: "Cannot force update a permanently failed payment" },
        { status: 400 }
      );
    }

    console.log(
      `📋 Enhanced: Current schedule status: ${currentSchedule.status}, processingBy: ${currentSchedule.processingBy}`
    );

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

      const maxExecutions = currentSchedule.maxExecutions || 999999;
      if (
        newExecutionCount >= maxExecutions ||
        nextExecution.getFullYear() > new Date().getFullYear() + 50
      ) {
        finalStatus = "completed";
        completedAt = new Date(executedAt);
        console.log(
          `🏁 Enhanced: Recurring schedule ${scheduleId} completed after ${newExecutionCount} executions`
        );
      } else {
        finalStatus = "active";
        nextExecutionAt = nextExecution;
        completedAt = null;
        console.log(
          `🔄 Enhanced: Recurring schedule ${scheduleId} next execution: ${nextExecution.toISOString()}`
        );
      }
    } else {
      finalStatus = "completed";
      completedAt = new Date(executedAt);
      console.log(`🏁 Enhanced: One-time schedule ${scheduleId} completed`);
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
      lastGasUsed: gasUsed,
      lastBlockNumber: blockNumber,
      lastActualCostETH: actualCostETH,
      lastActualCostUSD: actualCostUSD,
      forceUpdatedBy: executorId,
      forceUpdatedAt: now,
      // Smart contract specific fields
      smartContractExecution: true,
      contractAddress:
        contractAddress || "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
      taxPaidETH: taxPaid || "0",
      enhancedAPI: true,
      acknowledged: false, // Add acknowledgment flag
    };

    if (nextExecutionAt) {
      updateData.nextExecutionAt = nextExecutionAt;
    }

    if (completedAt) {
      updateData.completedAt = completedAt;
    }

    // STRICT: Only update if not failed
    const updateResult = await db.collection("schedules").updateOne(
      {
        scheduleId,
        status: { $ne: "failed" }, // Ensure we never update failed payments
      },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      console.log(
        `❌ Enhanced: Force update failed: Schedule ${scheduleId} not found or is failed`
      );
      return NextResponse.json(
        { error: "Schedule not found or has permanently failed" },
        { status: 404 }
      );
    }

    console.log(
      `✅ Enhanced: Force update successful: Schedule ${scheduleId} updated to status: ${finalStatus}`
    );

    // Store execution record with smart contract info
    const executionRecordId = `${scheduleId}_force_exec_${newExecutionCount}_${Date.now()}`;
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
      isForceUpdate: true,
      // Smart contract specific
      smartContractAddress:
        contractAddress || "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
      taxPaidETH: taxPaid || "0",
      enhancedAPI: true,
      executionMethod: "smart_contract",
    };

    await db
      .collection("executed_transactions")
      .updateOne(
        { _id: executionRecordId },
        { $setOnInsert: executionRecord },
        { upsert: true }
      );

    console.log(
      `✅ Enhanced: Execution record stored for schedule ${scheduleId} with smart contract data`
    );

    return NextResponse.json({
      success: true,
      message: "Schedule force updated successfully with smart contract",
      finalStatus: finalStatus,
      nextExecution: nextExecutionAt,
      executionCount: newExecutionCount,
      transactionHash: transactionHash,
      wasForceUpdated: true,
      smartContractEnabled: true,
      contractAddress:
        contractAddress || "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
      enhancedAPI: true,
    });
  } catch (error) {
    console.error("💥 Enhanced: Error in force update:", error);
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
