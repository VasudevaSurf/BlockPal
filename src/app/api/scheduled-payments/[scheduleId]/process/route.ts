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
