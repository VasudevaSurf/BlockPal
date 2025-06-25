import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { scheduledPaymentService } from "@/lib/scheduled-payment-service";

// This endpoint would be called by a cron job or background service
// to execute scheduled payments that are due
export async function POST(request: NextRequest) {
  try {
    // Verify this is called from an authorized source (cron job, internal service)
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.CRON_SECRET || "your-cron-secret";

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Find all active scheduled payments that are due for execution
    const now = new Date();
    const duePayments = await db
      .collection("schedules")
      .find({
        status: "active",
        nextExecutionAt: { $lte: now },
      })
      .toArray();

    console.log(`🔍 Found ${duePayments.length} payments due for execution`);

    const executionResults = [];

    for (const payment of duePayments) {
      try {
        console.log(`⚡ Executing payment: ${payment.scheduleId}`);

        // Retrieve encrypted private key (you'd need to implement proper decryption)
        // For now, using the test private key
        const testPrivateKey =
          "c1fcde81f943602b92f11121d426b8b499f2f52a24468894ad058ec5f9931b23";

        // Transform payment data to match expected format
        const scheduleData = {
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
          timezone: payment.timezone,
          status: payment.status,
          nextExecution: payment.nextExecutionAt,
          executionCount: payment.executedCount || 0,
          maxExecutions: payment.maxExecutions || 1,
          description: payment.description,
          createdAt: payment.createdAt,
          lastExecutionAt: payment.lastExecutionAt,
        };

        // Execute the payment
        const executionResult =
          await scheduledPaymentService.executeScheduledPayment(
            scheduleData,
            testPrivateKey
          );

        if (executionResult.success) {
          console.log(
            `✅ Payment executed successfully: ${payment.scheduleId}`
          );

          // Update the schedule in database
          const updateData: any = {
            executedCount: (payment.executedCount || 0) + 1,
            lastExecutionAt: executionResult.executedAt,
            updatedAt: new Date(),
          };

          // Calculate next execution for recurring payments
          if (payment.frequency && payment.frequency !== "once") {
            const nextExecution =
              scheduledPaymentService.calculateNextExecution(
                executionResult.executedAt,
                payment.frequency
              );

            // Check if we've reached max executions or if it's far in the future (indicating completion)
            const maxExecutions = payment.maxExecutions || 999999;
            if (
              updateData.executedCount >= maxExecutions ||
              nextExecution.getFullYear() > new Date().getFullYear() + 50
            ) {
              updateData.status = "completed";
              updateData.completedAt = new Date();
            } else {
              updateData.nextExecutionAt = nextExecution;
            }
          } else {
            // One-time payment completed
            updateData.status = "completed";
            updateData.completedAt = new Date();
          }

          await db
            .collection("schedules")
            .updateOne({ _id: payment._id }, { $set: updateData });

          // Store execution record
          const executionRecord = {
            scheduleId: payment.scheduleId,
            username: payment.username,
            walletAddress: payment.walletAddress,
            transactionHash: executionResult.transactionHash,
            gasUsed: executionResult.gasUsed,
            blockNumber: executionResult.blockNumber,
            actualCostETH: executionResult.actualCostETH,
            actualCostUSD: executionResult.actualCostUSD,
            executedAt: executionResult.executedAt,
            status: "completed",
            tokenSymbol: payment.tokenSymbol,
            contractAddress: payment.contractAddress,
            recipient: scheduleData.recipient,
            amount: scheduleData.amount,
            executionCount: updateData.executedCount,
          };

          await db
            .collection("executed_transactions")
            .insertOne(executionRecord);

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: true,
            transactionHash: executionResult.transactionHash,
            executedAt: executionResult.executedAt,
          });
        } else {
          console.error(
            `❌ Payment execution failed: ${payment.scheduleId}`,
            executionResult.error
          );

          // Mark as failed after a certain number of retries
          const retryCount = (payment.retryCount || 0) + 1;
          const maxRetries = 3;

          if (retryCount >= maxRetries) {
            await db.collection("schedules").updateOne(
              { _id: payment._id },
              {
                $set: {
                  status: "failed",
                  failedAt: new Date(),
                  lastError: executionResult.error,
                  retryCount,
                },
              }
            );
          } else {
            // Retry later (add 5 minutes to next execution)
            const nextRetry = new Date(now.getTime() + 5 * 60 * 1000);
            await db.collection("schedules").updateOne(
              { _id: payment._id },
              {
                $set: {
                  nextExecutionAt: nextRetry,
                  retryCount,
                  lastError: executionResult.error,
                  updatedAt: new Date(),
                },
              }
            );
          }

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: false,
            error: executionResult.error,
            retryCount,
          });
        }
      } catch (error: any) {
        console.error(
          `💥 Critical error executing payment ${payment.scheduleId}:`,
          error
        );

        await db.collection("schedules").updateOne(
          { _id: payment._id },
          {
            $set: {
              status: "failed",
              failedAt: new Date(),
              lastError: error.message,
              updatedAt: new Date(),
            },
          }
        );

        executionResults.push({
          scheduleId: payment.scheduleId,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(
      `📊 Execution summary: ${executionResults.length} payments processed`
    );
    const successCount = executionResults.filter((r) => r.success).length;
    const failureCount = executionResults.length - successCount;

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: executionResults.length,
        successful: successCount,
        failed: failureCount,
      },
      results: executionResults,
    });
  } catch (error) {
    console.error("💥 Scheduled payments executor error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check endpoint for the executor service
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();

    // Get statistics about scheduled payments
    const stats = await Promise.all([
      db.collection("schedules").countDocuments({ status: "active" }),
      db.collection("schedules").countDocuments({ status: "completed" }),
      db.collection("schedules").countDocuments({ status: "failed" }),
      db.collection("schedules").countDocuments({ status: "cancelled" }),
    ]);

    const now = new Date();
    const dueCount = await db.collection("schedules").countDocuments({
      status: "active",
      nextExecutionAt: { $lte: now },
    });

    const upcomingCount = await db.collection("schedules").countDocuments({
      status: "active",
      nextExecutionAt: {
        $gt: now,
        $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Next 24 hours
      },
    });

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      statistics: {
        active: stats[0],
        completed: stats[1],
        failed: stats[2],
        cancelled: stats[3],
        dueNow: dueCount,
        upcomingNext24h: upcomingCount,
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Database connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
