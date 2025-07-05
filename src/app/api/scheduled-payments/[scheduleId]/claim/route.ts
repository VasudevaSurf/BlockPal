// src/app/api/scheduled-payments/[scheduleId]/claim/route.ts
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
    const { executorId, claimedAt } = await request.json();

    if (!executorId) {
      return NextResponse.json(
        { error: "Executor ID required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log(
      `🔒 Enhanced: Attempting to claim payment ${scheduleId} for executor ${executorId}`
    );

    // Enhanced claiming with smart contract considerations
    const result = await db.collection("schedules").findOneAndUpdate(
      {
        scheduleId,
        status: "active",
        smartContractEnabled: true, // Only smart contract payments
        $and: [
          // Payment must not be failed
          { status: { $ne: "failed" } },
          // Claiming conditions
          {
            $or: [
              { claimedBy: { $exists: false } },
              { claimedBy: null },
              {
                claimedAt: {
                  $lt: new Date(now.getTime() - 60000), // 1 minute timeout
                },
              },
            ],
          },
          // Must be due for execution
          { nextExecutionAt: { $lte: now } },
          // Must have sufficient gas buffer for smart contract
          {
            $or: [
              { gasBuffer: { $gte: 150000 } }, // Minimum gas for smart contract
              { gasBuffer: { $exists: false } }, // Default assumed sufficient
            ],
          },
        ],
      },
      {
        $set: {
          claimedBy: executorId,
          claimedAt: new Date(claimedAt),
          updatedAt: now,
          claimMethod: "smart_contract",
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (result) {
      console.log(
        `✅ Enhanced: Payment ${scheduleId} successfully claimed by executor ${executorId} for smart contract execution`
      );

      return NextResponse.json({
        success: true,
        message: "Payment claimed successfully for smart contract execution",
        claimedBy: executorId,
        claimedAt: new Date(claimedAt),
        contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
        enhancedAPI: true,
      });
    } else {
      console.log(
        `❌ Enhanced: Payment ${scheduleId} could not be claimed by executor ${executorId}`
      );

      const currentSchedule = await db
        .collection("schedules")
        .findOne({ scheduleId });

      let reason = "Payment not available for smart contract claiming";
      if (currentSchedule) {
        if (currentSchedule.status === "failed") {
          reason = "Payment has permanently failed and cannot be executed";
        } else if (currentSchedule.status === "completed") {
          reason = "Payment has already been completed";
        } else if (currentSchedule.status === "cancelled") {
          reason = "Payment has been cancelled";
        } else if (currentSchedule.status !== "active") {
          reason = `Payment status is ${currentSchedule.status}`;
        } else if (!currentSchedule.smartContractEnabled) {
          reason = "Payment is not enabled for smart contract execution";
        } else if (
          currentSchedule.claimedBy &&
          currentSchedule.claimedBy !== executorId
        ) {
          reason = `Payment already claimed by executor ${currentSchedule.claimedBy}`;
        } else if (currentSchedule.nextExecutionAt > now) {
          reason = "Payment not yet due for execution";
        }
      } else {
        reason = "Payment not found";
      }

      return NextResponse.json(
        {
          success: false,
          error: reason,
          alreadyClaimed: !!currentSchedule?.claimedBy,
          claimedBy: currentSchedule?.claimedBy || null,
          currentStatus: currentSchedule?.status || "not_found",
          smartContractEnabled: currentSchedule?.smartContractEnabled || false,
        },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("💥 Enhanced: Error claiming payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
