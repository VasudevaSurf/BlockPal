import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { scheduledPaymentService } from "@/lib/scheduled-payment-service";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const walletAddress = searchParams.get("walletAddress");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log(
      `🔍 Fetching scheduled payments - Status: ${status}, Wallet: ${walletAddress}, Limit: ${limit}, Offset: ${offset}`
    );

    const { db } = await connectToDatabase();

    // Build query
    const query: any = { username: decoded.username };

    if (walletAddress) {
      query.walletAddress = walletAddress;
    }

    // Handle status filtering
    if (status !== "all") {
      if (status === "completed") {
        query.$or = [
          { status: "completed" },
          { status: "failed" },
          { manuallyCompleted: true },
        ];
      } else {
        query.status = status;
      }
    }

    console.log(`📋 Query being used:`, JSON.stringify(query, null, 2));

    // Get total count for pagination
    const totalCount = await db.collection("schedules").countDocuments(query);

    // Fetch scheduled payments with proper sorting
    let sortOrder: any = { createdAt: -1 };

    if (status === "completed") {
      sortOrder = {
        completedAt: -1,
        lastExecutionAt: -1,
        createdAt: -1,
      };
    }

    const scheduledPayments = await db
      .collection("schedules")
      .find(query)
      .sort(sortOrder)
      .skip(offset)
      .limit(limit)
      .toArray();

    console.log(
      `📊 Found ${scheduledPayments.length} payments (Total: ${totalCount})`
    );

    // Enhanced transformation to include more details
    const formattedPayments = scheduledPayments.map((payment) => {
      let displayStatus = payment.status;
      if (payment.manuallyCompleted) {
        displayStatus = "completed (manual)";
      }
      if (payment.fixedStuckProcessing) {
        displayStatus = payment.status + " (auto-fixed)";
      }

      return {
        id: payment._id.toString(),
        scheduleId: payment.scheduleId,
        walletAddress: payment.walletAddress,
        tokenSymbol: payment.tokenSymbol,
        tokenName: payment.tokenName || payment.tokenSymbol,
        contractAddress: payment.contractAddress,
        recipient: payment.recipients?.[0] || payment.recipient,
        amount: payment.amounts?.[0] || payment.totalAmount,
        totalAmount: payment.totalAmount,
        frequency: payment.frequency || "once",
        status: payment.status,
        displayStatus: displayStatus,
        scheduledFor: payment.scheduledFor || payment.nextExecutionAt,
        nextExecution: payment.nextExecutionAt,
        executionCount: payment.executedCount || 0,
        maxExecutions: payment.maxExecutions || 1,
        description: payment.description,
        createdAt: payment.createdAt,
        lastExecutionAt: payment.lastExecutionAt,
        completedAt: payment.completedAt,
        failedAt: payment.failedAt,
        cancelledAt: payment.cancelledAt,
        timezone: payment.timezone,
        estimatedGas: payment.estimatedGas,
        gasCostETH: payment.gasCostETH,
        gasCostUSD: payment.gasCostUSD,

        // Execution details
        lastTransactionHash: payment.lastTransactionHash,
        lastGasUsed: payment.lastGasUsed,
        lastBlockNumber: payment.lastBlockNumber,
        lastActualCostETH: payment.lastActualCostETH,
        lastActualCostUSD: payment.lastActualCostUSD,

        // Processing/completion metadata
        processingBy: payment.processingBy,
        processingStarted: payment.processingStarted,
        manuallyCompleted: payment.manuallyCompleted,
        manualCompletionAt: payment.manualCompletionAt,
        fixedStuckProcessing: payment.fixedStuckProcessing,
        fixedAt: payment.fixedAt,

        // Error information
        lastError: payment.lastError,
        retryCount: payment.retryCount || 0,
      };
    });

    // Add some statistics
    const stats = {
      total: totalCount,
      returned: formattedPayments.length,
      hasMore: offset + formattedPayments.length < totalCount,
      offset: offset,
      limit: limit,
    };

    // If showing completed payments, also get execution records for additional context
    if (status === "completed" && formattedPayments.length > 0) {
      const scheduleIds = formattedPayments.map((p) => p.scheduleId);

      const executionRecords = await db
        .collection("executed_transactions")
        .find({
          scheduleId: { $in: scheduleIds },
          username: decoded.username,
        })
        .sort({ executedAt: -1 })
        .toArray();

      console.log(
        `📊 Found ${executionRecords.length} execution records for completed payments`
      );

      // Attach execution records to payments
      formattedPayments.forEach((payment) => {
        const records = executionRecords.filter(
          (record) => record.scheduleId === payment.scheduleId
        );
        payment.executionRecords = records.map((record) => ({
          transactionHash: record.transactionHash,
          executedAt: record.executedAt,
          gasUsed: record.gasUsed,
          blockNumber: record.blockNumber,
          actualCostETH: record.actualCostETH,
          actualCostUSD: record.actualCostUSD,
          executionCount: record.executionCount,
          isManualCompletion: record.isManualCompletion,
        }));
      });
    }

    console.log(`✅ Returning ${formattedPayments.length} formatted payments`);

    return NextResponse.json({
      scheduledPayments: formattedPayments,
      count: formattedPayments.length,
      stats: stats,
      status: status,
      walletAddress: walletAddress,
    });
  } catch (error) {
    console.error("💥 Get scheduled payments error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
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

    const body = await request.json();
    const { action } = body;

    if (action === "preview") {
      return handlePreview(body, decoded);
    } else if (action === "create") {
      return handleCreate(body, decoded);
    } else if (action === "approve") {
      return handleApprove(body, decoded);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Scheduled payments API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePreview(body: any, decoded: any) {
  const {
    tokenInfo,
    fromAddress,
    recipient,
    amount,
    scheduledFor,
    frequency,
    timezone,
  } = body;

  try {
    // Validate input
    const validation = scheduledPaymentService.validateScheduledPayment({
      recipient,
      amount,
      scheduledFor: new Date(scheduledFor),
      frequency,
      tokenInfo,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    // Create preview
    const preview = await scheduledPaymentService.createScheduledPaymentPreview(
      tokenInfo,
      fromAddress,
      recipient,
      amount,
      new Date(scheduledFor),
      frequency
    );

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error: any) {
    console.error("Preview creation error:", error);
    return NextResponse.json(
      { error: "Failed to create preview: " + error.message },
      { status: 500 }
    );
  }
}

async function handleCreate(body: any, decoded: any) {
  const {
    tokenInfo,
    fromAddress,
    recipient,
    amount,
    scheduledFor,
    frequency,
    timezone,
    description,
    privateKey,
  } = body;

  try {
    // Validate input
    const validation = scheduledPaymentService.validateScheduledPayment({
      recipient,
      amount,
      scheduledFor: new Date(scheduledFor),
      frequency,
      tokenInfo,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get user's wallet to verify ownership
    const wallet = await db.collection("wallets").findOne({
      walletAddress: fromAddress,
      username: decoded.username,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found or unauthorized" },
        { status: 403 }
      );
    }

    // Generate schedule ID
    const timestamp = Math.floor(new Date(scheduledFor).getTime() / 1000);
    const scheduleId = scheduledPaymentService.generateScheduleId(
      tokenInfo.symbol,
      timestamp
    );

    // Calculate next execution
    const scheduledDate = new Date(scheduledFor);
    const nextExecution =
      frequency === "once"
        ? scheduledDate
        : scheduledPaymentService.calculateNextExecution(
            scheduledDate,
            frequency
          );

    // Create database record
    const scheduledPayment = {
      scheduleId,
      username: decoded.username,
      walletAddress: fromAddress,
      tokenSymbol: tokenInfo.symbol,
      tokenName: tokenInfo.name,
      contractAddress: tokenInfo.contractAddress,
      decimals: tokenInfo.decimals,
      recipient,
      recipients: [recipient],
      amount,
      amounts: [amount],
      totalAmount: amount,
      frequency,
      timezone,
      description,
      status: "active",
      scheduledFor: scheduledDate,
      nextExecutionAt: nextExecution,
      executedCount: 0,
      maxExecutions: frequency === "once" ? 1 : 999999,
      createdAt: new Date(),
      lastExecutionAt: null,
      estimatedGas: "70000",
      gasCostETH: "0.0014",
      gasCostUSD: "2.80",
    };

    const result = await db.collection("schedules").insertOne(scheduledPayment);

    console.log(`📅 Scheduled payment created: ${scheduleId}`);
    console.log(`⏰ Next execution: ${nextExecution.toISOString()}`);

    return NextResponse.json({
      success: true,
      scheduleId,
      databaseId: result.insertedId.toString(),
      scheduledFor: scheduledDate,
      nextExecution,
      message: "Scheduled payment created successfully",
    });
  } catch (error: any) {
    console.error("Schedule creation error:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled payment: " + error.message },
      { status: 500 }
    );
  }
}

async function handleApprove(body: any, decoded: any) {
  const { tokenAddress, amount, decimals, privateKey } = body;

  if (!privateKey) {
    return NextResponse.json(
      { error: "Private key required for approval" },
      { status: 400 }
    );
  }

  try {
    const result = await scheduledPaymentService.approveTokenForScheduling(
      tokenAddress,
      amount,
      decimals,
      privateKey
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash,
        message: "Token approval successful",
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Approval error:", error);
    return NextResponse.json(
      { error: "Token approval failed: " + error.message },
      { status: 500 }
    );
  }
}
