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

    console.log("🔍 Fetching due payments at:", now.toISOString());

    // Find payments that are due for execution
    const duePayments = await db
      .collection("schedules")
      .find({
        status: "active",
        nextExecutionAt: { $lte: now },
      })
      .toArray();

    console.log(`📊 Found ${duePayments.length} due payments`);

    // Transform the data to match expected format
    const transformedPayments = duePayments.map((payment) => ({
      id: payment._id.toString(),
      scheduleId: payment.scheduleId,
      walletAddress: payment.walletAddress,
      tokenInfo: {
        name: payment.tokenName || payment.tokenSymbol,
        symbol: payment.tokenSymbol,
        contractAddress: payment.contractAddress,
        decimals: payment.decimals || 18,
        isETH:
          payment.contractAddress === "native" || payment.tokenSymbol === "ETH",
      },
      recipient: payment.recipients?.[0] || payment.recipient,
      amount: payment.amounts?.[0] || payment.totalAmount,
      scheduledFor: payment.scheduledFor,
      frequency: payment.frequency || "once",
      status: payment.status,
      nextExecution: payment.nextExecutionAt,
      executionCount: payment.executedCount || 0,
      maxExecutions: payment.maxExecutions || 1,
      description: payment.description,
      createdAt: payment.createdAt,
      lastExecutionAt: payment.lastExecutionAt,
      timezone: payment.timezone,
    }));

    return NextResponse.json({
      success: true,
      duePayments: transformedPayments,
      count: transformedPayments.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching due payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
