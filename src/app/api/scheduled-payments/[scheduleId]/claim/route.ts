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
      `🔒 Attempting to claim payment ${scheduleId} for executor ${executorId}`
    );

    // FIXED: Only active payments can be claimed (exclude failed)
    const result = await db.collection("schedules").findOneAndUpdate(
      {
        scheduleId,
        status: "active", // ONLY active payments
        $or: [
          { claimedBy: { $exists: false } },
          { claimedBy: null },
          {
            claimedAt: {
              $lt: new Date(now.getTime() - 60000), // 1 minute timeout
            },
          },
        ],
        nextExecutionAt: { $lte: now },
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
      console.log(
        `❌ Payment ${scheduleId} could not be claimed by executor ${executorId}`
      );

      const currentSchedule = await db
        .collection("schedules")
        .findOne({ scheduleId });

      let reason = "Payment not available for claiming";
      if (currentSchedule) {
        if (currentSchedule.status === "failed") {
          reason = "Payment has failed and cannot be executed";
        } else if (currentSchedule.status !== "active") {
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
        { status: 409 }
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
