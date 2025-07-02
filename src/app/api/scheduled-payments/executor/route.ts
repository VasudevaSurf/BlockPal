import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { enhancedScheduledPaymentsService } from "@/lib/enhanced-scheduled-payments-service";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.CRON_SECRET || "your-cron-secret";

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const now = new Date();
    // FIXED: Only get active payments (exclude failed)
    const duePayments = await db
      .collection("schedules")
      .find({
        status: "active", // ONLY active payments
        nextExecutionAt: { $lte: now },
      })
      .toArray();

    console.log(`🔍 Found ${duePayments.length} payments due for execution`);

    const executionResults = [];

    for (const payment of duePayments) {
      try {
        console.log(`⚡ Executing payment: ${payment.scheduleId}`);

        const wallet = await db.collection("wallets").findOne({
          walletAddress: payment.walletAddress,
          username: payment.username,
        });

        if (!wallet || !wallet.encryptedPrivateKey) {
          console.error(
            `❌ No wallet or private key found for payment: ${payment.scheduleId}`
          );

          // FIXED: Mark as failed (NO RETRY)
          await db.collection("schedules").updateOne(
            { _id: payment._id },
            {
              $set: {
                status: "failed",
                failedAt: new Date(),
                lastError: "Wallet or private key not found",
                updatedAt: new Date(),
              },
            }
          );

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: false,
            error: "Wallet or private key not found",
          });
          continue;
        }

        const decryptedPrivateKey = Buffer.from(
          wallet.encryptedPrivateKey.encryptedData,
          "base64"
        ).toString();

        const executionResult =
          await enhancedScheduledPaymentsService.executeScheduledPayment(
            {
              name: payment.tokenName || payment.tokenSymbol,
              symbol: payment.tokenSymbol,
              contractAddress: payment.contractAddress,
              decimals: payment.decimals || 18,
              isETH:
                payment.contractAddress === "native" ||
                payment.tokenSymbol === "ETH",
            },
            payment.walletAddress,
            payment.recipient,
            payment.amount,
            decryptedPrivateKey
          );

        if (executionResult.success) {
          console.log(
            `✅ Payment executed successfully: ${payment.scheduleId}`
          );

          const updateData: any = {
            executedCount: (payment.executedCount || 0) + 1,
            lastExecutionAt: new Date(),
            updatedAt: new Date(),
          };

          // Calculate next execution for recurring payments
          if (payment.frequency && payment.frequency !== "once") {
            const nextExecution =
              enhancedScheduledPaymentsService.calculateNextExecution(
                new Date(),
                payment.frequency
              );

            const maxExecutions = payment.maxExecutions || 999999;
            if (
              updateData.executedCount >= maxExecutions ||
              (nextExecution &&
                nextExecution.getFullYear() > new Date().getFullYear() + 50)
            ) {
              updateData.status = "completed";
              updateData.completedAt = new Date();
            } else {
              updateData.nextExecutionAt = nextExecution;
            }
          } else {
            updateData.status = "completed";
            updateData.completedAt = new Date();
          }

          await db
            .collection("schedules")
            .updateOne({ _id: payment._id }, { $set: updateData });

          const executionRecord = {
            scheduleId: payment.scheduleId,
            username: payment.username,
            walletAddress: payment.walletAddress,
            transactionHash: executionResult.transactionHash,
            gasUsed: executionResult.gasUsed,
            blockNumber: executionResult.blockNumber,
            actualCostETH: executionResult.actualCostETH,
            actualCostUSD: executionResult.actualCostUSD,
            executedAt: new Date(),
            status: "completed",
            tokenSymbol: payment.tokenSymbol,
            contractAddress: payment.contractAddress,
            recipient: payment.recipient,
            amount: payment.amount,
            executionCount: updateData.executedCount,
            enhancedAPI: true,
          };

          await db
            .collection("executed_transactions")
            .insertOne(executionRecord);

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: true,
            transactionHash: executionResult.transactionHash,
            executedAt: new Date(),
          });
        } else {
          console.error(
            `❌ Payment execution failed: ${payment.scheduleId}`,
            executionResult.error
          );

          // FIXED: Mark as failed immediately (NO RETRY)
          await db.collection("schedules").updateOne(
            { _id: payment._id },
            {
              $set: {
                status: "failed",
                failedAt: new Date(),
                lastError: executionResult.error,
                updatedAt: new Date(),
              },
            }
          );

          executionResults.push({
            scheduleId: payment.scheduleId,
            success: false,
            error: executionResult.error,
            retryCount: 0,
          });
        }
      } catch (error: any) {
        console.error(
          `💥 Critical error executing payment ${payment.scheduleId}:`,
          error
        );

        // FIXED: Mark as failed immediately (NO RETRY)
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

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();

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
        $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
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
