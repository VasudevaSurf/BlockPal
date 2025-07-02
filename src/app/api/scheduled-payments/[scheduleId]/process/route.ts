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
      `🔒 Attempting to mark payment ${scheduleId} as processing by executor ${executorId}`
    );

    // STRICT: Only active payments can be processed - NEVER failed payments
    const result = await db.collection("schedules").findOneAndUpdate(
      {
        scheduleId,
        status: "active", // ONLY active payments
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
                  $lt: new Date(now.getTime() - 120000), // 2 minutes timeout
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
                  $lt: new Date(now.getTime() - 60000),
                },
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
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (result) {
      console.log(
        `✅ Payment ${scheduleId} successfully marked as processing by executor ${executorId}`
      );

      return NextResponse.json({
        success: true,
        message: "Payment marked as processing",
        processingBy: executorId,
        processingStarted: new Date(processingStarted),
        status: "processing",
      });
    } else {
      console.log(
        `❌ Payment ${scheduleId} could not be marked as processing by executor ${executorId}`
      );

      const currentSchedule = await db
        .collection("schedules")
        .findOne({ scheduleId });

      let reason = "Payment not available for processing";
      if (currentSchedule) {
        if (currentSchedule.status === "failed") {
          reason = "Payment has permanently failed and cannot be processed";
        } else if (currentSchedule.status === "processing") {
          reason = `Payment already being processed by executor ${currentSchedule.processingBy}`;
        } else if (currentSchedule.status === "completed") {
          reason = "Payment has already been completed";
        } else if (currentSchedule.status === "cancelled") {
          reason = "Payment has been cancelled";
        } else if (currentSchedule.status !== "active") {
          reason = `Payment status is ${currentSchedule.status}`;
        } else if (currentSchedule.nextExecutionAt > now) {
          reason = "Payment not yet due for execution";
        } else if (
          currentSchedule.lastExecutionAt &&
          now.getTime() - new Date(currentSchedule.lastExecutionAt).getTime() <
            60000
        ) {
          reason = "Payment was executed recently";
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
        },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("💥 Error marking payment as processing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
