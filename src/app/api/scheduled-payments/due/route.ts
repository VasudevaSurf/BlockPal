// src/app/api/scheduled-payments/due/route.ts
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
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const twoMinutesAgo = new Date(now.getTime() - 120000);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    console.log(
      "🔍 Enhanced executor checking for due payments at:",
      now.toISOString()
    );

    // ULTRA-STRICT QUERY: Only get payments that are definitely ready for execution
    const duePayments = await db
      .collection("schedules")
      .find({
        // Must be active
        status: "active",

        // Must be due for execution (including buffer for upcoming payments)
        $or: [
          { nextExecutionAt: { $lte: fiveMinutesFromNow } },
          { scheduledFor: { $lte: fiveMinutesFromNow } },
        ],

        // Must NOT be currently processing
        $and: [
          {
            $or: [
              { processingBy: { $exists: false } },
              { processingBy: null },
              {
                processingStarted: {
                  $lt: twoMinutesAgo,
                },
              },
            ],
          },

          // Must NOT have been executed recently
          {
            $or: [
              { lastExecutionAt: { $exists: false } },
              { lastExecutionAt: null },
              {
                lastExecutionAt: {
                  $lt: oneMinuteAgo,
                },
              },
            ],
          },

          // Must NOT have been created very recently
          {
            $or: [
              { createdAt: { $exists: false } },
              {
                createdAt: {
                  $lt: new Date(now.getTime() - 30000),
                },
              },
            ],
          },

          // Must NOT have been updated very recently
          {
            $or: [
              { updatedAt: { $exists: false } },
              {
                updatedAt: {
                  $lt: new Date(now.getTime() - 30000),
                },
              },
            ],
          },
        ],
      })
      .sort({ nextExecutionAt: 1, scheduledFor: 1 })
      .limit(10)
      .toArray();

    console.log(
      `📊 Found ${duePayments.length} payments that passed initial filtering`
    );

    // ADDITIONAL SAFETY CHECKS on each payment
    const safeDuePayments = [];

    for (const payment of duePayments) {
      let skipPayment = false;
      const skipReasons = [];

      // Check 1: Verify execution count hasn't exceeded maximum
      if ((payment.executionCount || 0) >= (payment.maxExecutions || 1)) {
        skipReasons.push("execution count exceeded");
        skipPayment = true;
      }

      // Check 2: Determine which execution time to use
      let executionTime = null;
      if (payment.nextExecutionAt) {
        executionTime = new Date(payment.nextExecutionAt);
      } else if (payment.scheduledFor) {
        executionTime = new Date(payment.scheduledFor);
      }

      if (!executionTime) {
        skipReasons.push("no execution time found");
        skipPayment = true;
      } else {
        // Check if it's actually due (within 5 minute buffer)
        const timeDiff = executionTime.getTime() - now.getTime();
        if (timeDiff > 5 * 60 * 1000) {
          skipReasons.push(
            `not yet due (${Math.round(timeDiff / 60000)} minutes early)`
          );
          skipPayment = true;
        }
      }

      // Check 3: Verify payment hasn't been executed in the last 2 minutes
      if (payment.lastExecutionAt) {
        const timeSinceLastExecution =
          now.getTime() - new Date(payment.lastExecutionAt).getTime();
        if (timeSinceLastExecution < 120000) {
          skipReasons.push(
            `executed ${Math.round(timeSinceLastExecution / 1000)}s ago`
          );
          skipPayment = true;
        }
      }

      // Check 4: Verify payment is not in a processing state
      if (payment.status === "processing" || payment.processingBy) {
        skipReasons.push("currently being processed");
        skipPayment = true;
      }

      // Check 5: For one-time payments, ensure they haven't been executed yet
      if (payment.frequency === "once" && (payment.executionCount || 0) > 0) {
        skipReasons.push("one-time payment already executed");
        skipPayment = true;
      }

      if (skipPayment) {
        console.log(
          `⏩ Skipping payment ${payment.scheduleId}: ${skipReasons.join(", ")}`
        );
        continue;
      }

      // Payment passed all safety checks
      safeDuePayments.push(payment);
    }

    console.log(
      `📊 After safety checks: ${safeDuePayments.length} payments ready for execution`
    );

    // Transform the data to match expected format for enhanced executor
    const transformedPayments = safeDuePayments.map((payment) => {
      const transformed = {
        id: payment._id.toString(),
        scheduleId: payment.scheduleId,
        username: payment.username,
        walletAddress: payment.walletAddress,
        tokenSymbol: payment.tokenSymbol,
        tokenName: payment.tokenName,
        contractAddress: payment.contractAddress,
        recipient: payment.recipient,
        amount: payment.amount,
        frequency: payment.frequency || "once",
        status: payment.status,
        scheduledFor: payment.scheduledFor,
        nextExecution: payment.nextExecutionAt || payment.scheduledFor,
        executionCount: payment.executionCount || 0,
        maxExecutions: payment.maxExecutions || 1,
        decimals: payment.decimals || 18,
        description: payment.description,
        createdAt: payment.createdAt,
        lastExecutionAt: payment.lastExecutionAt,
        timezone: payment.timezone,
        processingBy: payment.processingBy,
        processingStarted: payment.processingStarted,
        updatedAt: payment.updatedAt,
        useEnhancedAPI: payment.useEnhancedAPI || false,
      };

      console.log(
        `✅ Ready for execution: ${transformed.scheduleId} - ${
          transformed.amount
        } ${transformed.tokenSymbol} to ${transformed.recipient.slice(
          0,
          10
        )}... (due: ${new Date(
          transformed.nextExecution
        ).toISOString()}, execCount: ${transformed.executionCount}/${
          transformed.maxExecutions
        })`
      );

      return transformed;
    });

    // Final safety check: Ensure no duplicates based on scheduleId
    const uniquePayments = transformedPayments.filter(
      (payment, index, self) =>
        index === self.findIndex((p) => p.scheduleId === payment.scheduleId)
    );

    if (uniquePayments.length !== transformedPayments.length) {
      console.warn(
        `⚠️ Removed ${
          transformedPayments.length - uniquePayments.length
        } duplicate payments`
      );
    }

    console.log(
      `🎯 Final result: ${uniquePayments.length} unique payments ready for execution`
    );

    return NextResponse.json({
      success: true,
      scheduledPayments: uniquePayments,
      count: uniquePayments.length,
      timestamp: now.toISOString(),
      debug: {
        totalFound: duePayments.length,
        afterSafetyChecks: safeDuePayments.length,
        afterDeduplication: uniquePayments.length,
        safetyCheckTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("💥 Error fetching due payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
