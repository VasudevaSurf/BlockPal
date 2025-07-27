// src/app/api/scheduled-payments/[scheduleId]/mark-failed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { scheduleId } = resolvedParams;
    const body = await request.json();
    const {
      error: errorMessage,
      executorId,
      enhancedAPI,
      errorCategory,
      stringAmountHandling,
    } = body;

    const { db } = await connectToDatabase();
    const now = new Date();

    console.log(
      `❌ Enhanced: Marking schedule ${scheduleId} as failed with error: ${errorMessage}`
    );

    // Update without authentication requirement for internal executor calls
    const updateResult = await db.collection("schedules").updateOne(
      {
        scheduleId,
        status: { $ne: "failed" }, // Only update if not already failed
      },
      {
        $set: {
          status: "failed",
          failedAt: now,
          lastError: errorMessage || "Unknown error during execution",
          updatedAt: now,
          processingBy: null,
          processingStarted: null,
          claimedBy: null,
          claimedAt: null,
          nextExecutionAt: null,
          failedWithSmartContract: enhancedAPI || false,
          failedBy: executorId || "enhanced_executor",
          errorCategory: errorCategory || "execution_error",
          acknowledged: false, // Add acknowledgment flag
          needsAcknowledgment: true, // Force acknowledgment detection
          stringAmountHandling: stringAmountHandling || false,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      console.log(
        `⚠️ Enhanced: Schedule ${scheduleId} not found or already failed`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Schedule not found or already failed",
          scheduleId: scheduleId,
        },
        { status: 404 }
      );
    }

    console.log(
      `✅ Enhanced: Schedule ${scheduleId} marked as failed successfully`
    );

    return NextResponse.json({
      success: true,
      message: "Schedule marked as failed with acknowledgment",
      scheduleId: scheduleId,
      status: "failed",
      enhancedAPI: enhancedAPI || false,
      errorCategory: errorCategory || "execution_error",
      acknowledged: false,
      needsAcknowledgment: true,
    });
  } catch (error) {
    console.error("💥 Enhanced: Error marking schedule as failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
