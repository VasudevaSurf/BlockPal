// src/app/api/scheduled-payments/[scheduleId]/claim/route.ts (NEW FILE)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(
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
      `🔒 Attempting to claim payment ${scheduleId} for executor ${executorId}`
    );

    // Try to claim the payment atomically using MongoDB's findOneAndUpdate
    // This ensures only one executor can claim a payment at a time
    const result = await db.collection("schedules").findOneAndUpdate(
      {
        scheduleId,
        status: "active",
        $or: [
          { claimedBy: { $exists: false } }, // Not claimed yet
          { claimedBy: null }, // Explicitly null
          {
            claimedAt: {
              $lt: new Date(now.getTime() - 60000), // Claim expired (older than 1 minute)
            },
          },
        ],
        nextExecutionAt: { $lte: now }, // Still due for execution
      },
      {
        $set: {
          claimedBy: executorId,
          claimedAt: new Date(claimedAt),
          updatedAt: now,
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (result) {
      console.log(
        `✅ Payment ${scheduleId} successfully claimed by executor ${executorId}`
      );

      return NextResponse.json({
        success: true,
        message: "Payment claimed successfully",
        claimedBy: executorId,
        claimedAt: new Date(claimedAt),
      });
    } else {
      // Payment was not available for claiming
      console.log(
        `❌ Payment ${scheduleId} could not be claimed by executor ${executorId} - already claimed or not due`
      );

      // Check the current status
      const currentSchedule = await db
        .collection("schedules")
        .findOne({ scheduleId });

      let reason = "Payment not available for claiming";
      if (currentSchedule) {
        if (currentSchedule.status !== "active") {
          reason = `Payment status is ${currentSchedule.status}`;
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
        },
        { status: 409 } // Conflict
      );
    }
  } catch (error) {
    console.error("💥 Error claiming payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
