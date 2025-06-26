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

    console.log("🔍 Fetching due payments at:", now.toISOString());

    // ULTRA-STRICT QUERY: Only get payments that are definitely ready for execution
    const duePayments = await db
      .collection("schedules")
      .find({
        // Must be active
        status: "active",

        // Must be due for execution
        nextExecutionAt: { $lte: now },

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
      .sort({ nextExecutionAt: 1 })
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
      if (payment.executedCount >= (payment.maxExecutions || 1)) {
        skipReasons.push("execution count exceeded");
        skipPayment = true;
      }

      // Check 2: For recurring payments, verify next execution time is actually due
      if (payment.frequency && payment.frequency !== "once") {
        const nextExec = new Date(payment.nextExecutionAt);
        if (nextExec > now) {
          skipReasons.push("not yet due for execution");
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
      if (payment.frequency === "once" && payment.executedCount > 0) {
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

    // Transform the data to match expected format
    const transformedPayments = safeDuePayments.map((payment) => {
      const transformed = {
        id: payment._id.toString(),
        scheduleId: payment.scheduleId,
        walletAddress: payment.walletAddress,
        tokenInfo: {
          name: payment.tokenName || payment.tokenSymbol,
          symbol: payment.tokenSymbol,
          contractAddress: payment.contractAddress,
          decimals: payment.decimals || 18,
          isETH:
            payment.contractAddress === "native" ||
            payment.tokenSymbol === "ETH",
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
        processingBy: payment.processingBy,
        processingStarted: payment.processingStarted,
        updatedAt: payment.updatedAt,
      };

      console.log(
        `✅ Ready for execution: ${transformed.scheduleId} - ${
          transformed.amount
        } ${transformed.tokenInfo.symbol} to ${transformed.recipient.slice(
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
      duePayments: uniquePayments,
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
