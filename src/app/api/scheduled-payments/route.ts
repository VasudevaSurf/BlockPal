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

    const { db } = await connectToDatabase();

    // Build query
    const query: any = { username: decoded.username };

    if (walletAddress) {
      query.walletAddress = walletAddress;
    }

    if (status !== "all") {
      query.status = status;
    }

    // Fetch scheduled payments
    const scheduledPayments = await db
      .collection("schedules")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Transform to frontend format
    const formattedPayments = scheduledPayments.map((payment) => ({
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
      scheduledFor: payment.scheduledFor || payment.nextExecutionAt,
      nextExecution: payment.nextExecutionAt,
      executionCount: payment.executedCount || 0,
      maxExecutions: payment.maxExecutions || 1,
      description: payment.description,
      createdAt: payment.createdAt,
      lastExecutionAt: payment.lastExecutionAt,
      timezone: payment.timezone,
      estimatedGas: payment.estimatedGas,
      gasCostETH: payment.gasCostETH,
      gasCostUSD: payment.gasCostUSD,
    }));

    return NextResponse.json({
      scheduledPayments: formattedPayments,
      count: formattedPayments.length,
    });
  } catch (error) {
    console.error("Get scheduled payments error:", error);
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
      maxExecutions: frequency === "once" ? 1 : 999999, // Essentially unlimited for recurring
      createdAt: new Date(),
      lastExecutionAt: null,
      estimatedGas: "70000",
      gasCostETH: "0.0014",
      gasCostUSD: "2.80",
    };

    const result = await db.collection("schedules").insertOne(scheduledPayment);

    // Schedule the job (implement your scheduling logic here)
    // This could be handled by a background service or cron job
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

// src/app/api/scheduled-payments/[scheduleId]/route.ts
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
    const { action, status } = await request.json();

    const { db } = await connectToDatabase();

    if (action === "cancel") {
      const result = await db.collection("schedules").updateOne(
        {
          scheduleId,
          username: decoded.username,
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "Scheduled payment not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Scheduled payment cancelled successfully",
      });
    } else if (action === "execute") {
      // Execute scheduled payment immediately
      const schedule = await db.collection("schedules").findOne({
        scheduleId,
        username: decoded.username,
      });

      if (!schedule) {
        return NextResponse.json(
          { error: "Scheduled payment not found" },
          { status: 404 }
        );
      }

      if (schedule.status !== "active") {
        return NextResponse.json(
          { error: "Scheduled payment is not active" },
          { status: 400 }
        );
      }

      // Execute payment (you would need the private key for this)
      // This is a placeholder - in production, you'd handle this securely
      return NextResponse.json({
        success: true,
        message: "Manual execution initiated",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update scheduled payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { db } = await connectToDatabase();

    const result = await db.collection("schedules").deleteOne({
      scheduleId,
      username: decoded.username,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Scheduled payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Scheduled payment deleted successfully",
    });
  } catch (error) {
    console.error("Delete scheduled payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
