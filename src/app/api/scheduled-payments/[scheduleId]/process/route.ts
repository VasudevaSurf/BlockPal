// src/app/api/scheduled-payments/[scheduleId]/process/route.ts (NEW FILE)
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

    // ATOMIC OPERATION: Mark as processing only if it's available
    const result = await db.collection("schedules").findOneAndUpdate(
      {
        scheduleId,
        status: "active",
        $or: [
          { processingBy: { $exists: false } }, // Not being processed
          { processingBy: null }, // Explicitly null
          {
            processingStarted: {
              $lt: new Date(now.getTime() - 120000), // Processing started more than 2 minutes ago (stale)
            },
          },
        ],
        nextExecutionAt: { $lte: now }, // Still due for execution
        // Additional safety: avoid payments that were just executed
        $or: [
          { lastExecutionAt: { $exists: false } }, // Never executed
          { lastExecutionAt: null }, // Explicitly null
          {
            lastExecutionAt: {
              $lt: new Date(now.getTime() - 60000), // Last execution was more than 1 minute ago
            },
          },
        ],
      },
      {
        $set: {
          processingBy: executorId,
          processingStarted: new Date(processingStarted),
          status: "processing", // Change status to processing
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
      // Payment was not available for processing
      console.log(
        `❌ Payment ${scheduleId} could not be marked as processing by executor ${executorId}`
      );

      // Check the current status
      const currentSchedule = await db
        .collection("schedules")
        .findOne({ scheduleId });

      let reason = "Payment not available for processing";
      if (currentSchedule) {
        if (currentSchedule.status === "processing") {
          reason = `Payment already being processed by executor ${currentSchedule.processingBy}`;
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
        { status: 409 } // Conflict
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
